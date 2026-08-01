#!/usr/bin/env node

/**
 * scan-migratemate-cloak.mjs — Authenticated MigrateMate job board scraper,
 * driven via agent-browser (CLI browser automation) attached to a cloakbrowser
 * stealth Chromium instance (anti-bot-detection binary).
 *
 * Flow:
 *   1. Launch a persistent stealth Chromium via cloak-launch.py, exposing a
 *      CDP debug port. The profile dir persists cookies, so you only need to
 *      log in once across runs.
 *   2. Point agent-browser at that CDP port (`agent-browser connect <port>`).
 *   3. Wait for login (prompts you to sign in with Google in the visible
 *      window on first run).
 *   4. Apply the F-1 OPT/CPT visa filter, search target roles, scroll and
 *      scrape job cards, dedupe against scan history, append new leads to
 *      data/pipeline.md.
 *
 * Requires:
 *   - `npm i -g agent-browser && agent-browser install` (Chrome driver)
 *   - cloakbrowser installed in a venv at ~/.venvs/cloakbrowser
 *     (`pip install cloakbrowser` inside that venv; `cloakbrowser install`
 *     to download the stealth Chromium binary)
 *
 * Usage:
 *   node scan-migratemate-cloak.mjs                       # defaults from profile.yml
 *   node scan-migratemate-cloak.mjs --dry-run              # preview, don't write files
 *   node scan-migratemate-cloak.mjs --query "GRC analyst"  # override search term
 *   node scan-migratemate-cloak.mjs --max 300               # stop after N jobs (default 200)
 *   node scan-migratemate-cloak.mjs --no-visa-filter        # skip visa filter step
 *   node scan-migratemate-cloak.mjs --headless               # no visible window (only works once already logged in)
 *   node scan-migratemate-cloak.mjs --port 9333               # CDP port (default 9333)
 */

import { spawn, execFileSync } from 'child_process';
import { readFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import yaml from 'js-yaml';

// ── Config ───────────────────────────────────────────────────────────────────

const PIPELINE_PATH = 'data/pipeline.md';
const HISTORY_PATH  = 'data/scan-history.tsv';
const PROFILE_PATH  = 'config/profile.yml';
const BASE_URL      = 'https://migratemate.co/jobs';

const CLOAK_PYTHON  = join(homedir(), '.venvs', 'cloakbrowser', 'bin', 'python3');
const CLOAK_PROFILE = join(homedir(), '.cloakbrowser', 'profiles', 'migratemate');
const LAUNCHER_PATH = join(process.cwd(), 'cloak-launch.py');

const args = parseArgs(process.argv.slice(2));
const DRY_RUN        = 'dry-run' in args;
const NO_VISA_FILTER = 'no-visa-filter' in args;
const HEADLESS       = 'headless' in args;
const DEBUG          = 'debug' in args;
const MAX_JOBS       = parseInt(args.max ?? '200', 10);
const PORT           = parseInt(args.port ?? '9333', 10);

const profile     = yaml.load(readFileSync(PROFILE_PATH, 'utf8'));
const searchTerms = args.query
  ? [args.query]
  : buildSearchTerms(profile);

// Visa types relevant for STEM OPT holders
const VISA_FILTERS = ['F-1 OPT', 'F-1 CPT'];

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      out[key] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
    }
  }
  return out;
}

function buildSearchTerms(p) {
  const primary = p.target_roles?.primary ?? ['Security Analyst'];
  const security = primary.filter(r => /security|soc|grc|iam|cyber/i.test(r));
  const data     = primary.filter(r => /data/i.test(r));
  const terms = [];
  if (security.length) terms.push(security[0]);
  if (data.length)     terms.push(data[0]);
  return terms.length ? terms : ['Security Analyst'];
}

function loadSeenUrls() {
  if (!existsSync(HISTORY_PATH)) return new Set();
  return new Set(
    readFileSync(HISTORY_PATH, 'utf8')
      .split('\n')
      .slice(1)
      .map(l => l.split('\t')[0])
      .filter(Boolean)
  );
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function waitForEnter(promptText) {
  console.log(promptText);
  return new Promise(resolve => {
    process.stdin.setRawMode?.(false);
    process.stdin.resume();
    process.stdin.once('data', () => {
      process.stdin.pause();
      resolve();
    });
  });
}

// ── agent-browser CLI wrapper ────────────────────────────────────────────────

function ab(argv, { json = false, allowFail = false } = {}) {
  try {
    const out = execFileSync('agent-browser', json ? [...argv, '--json'] : argv, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return json ? JSON.parse(out) : out.trim();
  } catch (err) {
    if (allowFail) return json ? null : '';
    throw new Error(`agent-browser ${argv.join(' ')} failed: ${err.message}`);
  }
}

function abEval(script, { json = true, allowFail = false } = {}) {
  try {
    const out = execFileSync('agent-browser', ['eval', '--stdin', '--json'], {
      encoding: 'utf8',
      input: script,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const parsed = JSON.parse(out);
    return parsed?.data?.result;
  } catch (err) {
    if (allowFail) return undefined;
    throw new Error(`agent-browser eval failed: ${err.message}`);
  }
}

// ── Cloak browser process management ────────────────────────────────────────

function launchCloakBrowser() {
  if (!existsSync(CLOAK_PYTHON)) {
    throw new Error(
      `cloakbrowser venv python not found at ${CLOAK_PYTHON}. ` +
      `Set it up with: python3 -m venv ~/.venvs/cloakbrowser && ~/.venvs/cloakbrowser/bin/pip install cloakbrowser playwright && ~/.venvs/cloakbrowser/bin/cloakbrowser install`
    );
  }
  mkdirSync(CLOAK_PROFILE, { recursive: true });

  const launcherArgs = [
    LAUNCHER_PATH,
    '--port', String(PORT),
    '--profile-dir', CLOAK_PROFILE,
  ];
  if (HEADLESS) launcherArgs.push('--headless');

  const child = spawn(CLOAK_PYTHON, launcherArgs, {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  return new Promise((resolve, reject) => {
    let buf = '';
    const onData = (chunk) => {
      buf += chunk.toString();
      if (buf.includes('CDP_READY')) {
        child.stdout.off('data', onData);
        resolve(child);
      }
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', (chunk) => {
      if (DEBUG) process.stderr.write(`[cloak] ${chunk}`);
    });
    child.on('exit', (code) => {
      if (!buf.includes('CDP_READY')) {
        reject(new Error(`cloak-launch.py exited early (code ${code}) before signaling CDP_READY. stderr enabled with --debug for details.`));
      }
    });
    setTimeout(() => reject(new Error('Timed out waiting for CDP_READY from cloak-launch.py')), 20_000);
  });
}

// ── Login wait ───────────────────────────────────────────────────────────────

async function waitForLogin() {
  const already = ab(['get', 'count', '[data-job-card="true"]'], { allowFail: true });
  if (already && parseInt(already, 10) > 0) return;

  console.log('\n──────────────────────────────────────────────────');
  console.log('  Sign in with Google in the browser window.');
  console.log('  Press Enter here once you are on the jobs page.');
  console.log('──────────────────────────────────────────────────\n');
  await waitForEnter('');

  const url = ab(['get', 'url'], { allowFail: true });
  if (!url || !url.includes('/jobs')) {
    ab(['open', BASE_URL]);
  }

  for (let i = 0; i < 10; i++) {
    const count = ab(['get', 'count', '[data-job-card="true"]'], { allowFail: true });
    if (count && parseInt(count, 10) > 0) return;
    await sleep(2000);
  }
  console.warn('Warning: job cards not detected — scraping anyway.');
}

// ── Filter / search ──────────────────────────────────────────────────────────

function closeFilterPanel() {
  ab(['press', 'Escape'], { allowFail: true });
}

function applySearch(query) {
  closeFilterPanel();
  const filled = ab(['find', 'placeholder', 'Search', 'fill', query], { allowFail: true });
  if (filled === '') {
    // fallback: try a generic search input selector
    ab(['fill', 'input[type="search"]', query], { allowFail: true });
  }
  ab(['press', 'Enter'], { allowFail: true });
  console.log(`  Search: "${query}"`);
}

function applyVisaFilter() {
  if (NO_VISA_FILTER) return;
  try {
    ab(['find', 'text', 'Filters', 'click'], { allowFail: true });
    ab(['find', 'text', 'Visa', 'click'], { allowFail: true });

    for (const visa of VISA_FILTERS) {
      ab(['find', 'text', visa, 'click'], { allowFail: true });
      console.log(`  Visa filter: ${visa} (best-effort)`);
    }

    // "See X Jobs" / "Apply Filters" button
    ab(['find', 'text', 'Jobs', 'click'], { allowFail: true });
  } catch (e) {
    console.warn(`  Visa filter skipped (${e.message}) — add --no-visa-filter to suppress this.`);
  }
}

// ── Job card scraping ────────────────────────────────────────────────────────

const SCRAPE_SCRIPT = `
const cards = document.querySelectorAll('[data-job-card="true"]');
const seen = new Set();
const jobs = [];
for (const card of cards) {
  const jobId = card.getAttribute('data-job-id') || '';
  if (!jobId || seen.has(jobId)) continue;
  seen.add(jobId);
  const url = \`https://migratemate.co/jobs/\${jobId}\`;
  const title = card.getAttribute('data-job-title') || '';
  const company = card.getAttribute('data-company-name') || '';
  const text = card.innerText || '';
  const lines = text.split('\\n').map(l => l.trim()).filter(Boolean);
  const location = lines.find(l => /remote|on-site|hybrid|,\\s+[A-Z]{2}$/i.test(l)) || '';
  const salary = lines.find(l => /\\$[\\d,]+/.test(l)) || '';
  const visas = lines.filter(l => /green card|h-1b|f-1 opt|f-1 cpt|tn\\b|e-3/i.test(l)).join(', ');
  jobs.push({ url, title, company, location, salary, visas });
}
jobs;
`;

function scrapeVisible() {
  const result = abEval(SCRAPE_SCRIPT, { allowFail: true });
  return Array.isArray(result) ? result : [];
}

// ── Main scrape loop ─────────────────────────────────────────────────────────

async function scrape() {
  const seen = loadSeenUrls();
  const allJobs = [];

  console.log('\nLaunching stealth Chromium (cloakbrowser)…');
  const cloakProcess = await launchCloakBrowser();

  try {
    ab(['connect', String(PORT)]);

    console.log('Opening MigrateMate…');
    ab(['open', BASE_URL]);
    await waitForLogin();

    // Apply visa filter once before searching — applying per-query would toggle it off on the 2nd run
    applyVisaFilter();

    for (const query of searchTerms) {
      console.log(`\nSearching: "${query}"`);
      applySearch(query);
      await sleep(2500);

      let stale = 0;
      let lastCount = 0;

      while (allJobs.length < MAX_JOBS && stale < 4) {
        const cards = scrapeVisible();

        let added = 0;
        for (const job of cards) {
          if (!job.title || seen.has(job.url)) continue;
          seen.add(job.url);
          allJobs.push(job);
          added++;
        }

        if (added === 0 && cards.length === lastCount) {
          stale++;
        } else {
          stale = 0;
          lastCount = cards.length;
        }

        process.stdout.write(`\r  ${allJobs.length} new jobs found…`);

        ab(['scroll', 'down', '1600'], { allowFail: true });
        await sleep(1800);
      }
      console.log();
    }
  } finally {
    // Detach agent-browser's tracked session (doesn't kill the CDP process)
    ab(['close'], { allowFail: true });
    // Terminate the cloak browser cleanly — this flushes the persistent
    // profile (cookies/localStorage) so the next run starts already logged in.
    cloakProcess.kill('SIGTERM');
  }

  return allJobs;
}

// ── Write output ─────────────────────────────────────────────────────────────

function writeOutput(jobs) {
  const today = new Date().toISOString().slice(0, 10);
  const header = `MigrateMate Scan ${today} — OPT filter (${searchTerms.join(', ')})`;

  if (DRY_RUN || jobs.length === 0) {
    if (jobs.length === 0) {
      console.log('\nNo new jobs found (all already in history).');
    } else {
      console.log(`\n[DRY RUN] Would add ${jobs.length} jobs:\n## ${header}\n`);
      jobs.forEach(j => console.log(`  - ${j.url} | ${j.company} | ${j.title}`));
    }
    return;
  }

  const pipelineLines = [
    `\n## ${header}\n`,
    ...jobs.map(j => {
      const meta = [j.salary, j.location, j.visas].filter(Boolean).join(' · ');
      return `- [ ] ${j.url} | ${j.company} | ${j.title}${meta ? ` — ${meta}` : ''}`;
    }),
    '',
  ];
  appendFileSync(PIPELINE_PATH, pipelineLines.join('\n'), 'utf8');

  if (!existsSync(HISTORY_PATH)) {
    appendFileSync(HISTORY_PATH, 'url\tdate\tsource\ttitle\tcompany\tstatus\n', 'utf8');
  }
  const tsvLines = jobs.map(j =>
    [j.url, today, 'migratemate', j.title, j.company, 'added'].join('\t')
  );
  appendFileSync(HISTORY_PATH, tsvLines.join('\n') + '\n', 'utf8');

  console.log(`\n✓ ${jobs.length} new jobs added to data/pipeline.md`);
  console.log(`  Run /career-ops pipeline to evaluate them.\n`);
}

// ── Run ───────────────────────────────────────────────────────────────────────

try {
  const jobs = await scrape();
  writeOutput(jobs);
} catch (err) {
  console.error('\nError:', err.message);
  process.exit(1);
}
