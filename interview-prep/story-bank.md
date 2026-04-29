# Story Bank — Master STAR+R Stories

This file accumulates your best interview stories over time. Each evaluation (Block F) adds new stories here. Instead of memorizing 100 answers, maintain 5-10 deep stories that you can bend to answer almost any behavioral question.

## How it works

1. Every time `/career-ops oferta` generates Block F (Interview Plan), new STAR+R stories get appended here
2. Before your next interview, review this file — your stories are already organized by theme
3. The "Big Three" questions can be answered with stories from this bank:
   - "Tell me about yourself" → combine 2-3 stories into a narrative
   - "Tell me about your most impactful project" → pick your highest-impact story
   - "Tell me about a conflict you resolved" → find a story with a Reflection

## Stories

<!-- Stories will be added here as you evaluate offers -->
<!-- Format:
### [Theme] Story Title
**Source:** Report #NNN — Company — Role
**S (Situation):** ...
**T (Task):** ...
**A (Action):** ...
**R (Result):** ...
**Reflection:** What I learned / what I'd do differently
**Best for questions about:** [list of question types this story answers]
-->

### [Fraud / Anomaly Detection] Phishing Campaign Detection at Charles Schwab
**Source:** Report #041 — Apple — Data Scientist, Strategic Data Solutions
**S:** Monitoring 3,500+ daily security events across 3 business units in an enterprise financial services SOC using Splunk ES
**T:** Detect coordinated phishing campaigns targeting finance teams before credential compromise occurred
**A:** Correlated firewall, DNS, and proxy logs with live IOC feeds; built threshold-based detection logic mapped to MITRE ATT&CK; tuned alert rules to reduce noise while raising signal fidelity
**R:** 14% increase in detection accuracy across three business units; 18% reduction in false-positive escalations
**Reflection:** Would have built a dashboard surfacing the pattern trend over time — non-technical stakeholders needed visual proof to act faster on remediation
**Best for questions about:** anomaly detection, fraud detection, data-driven decisions, cross-functional impact, handling large data volumes

### [Automation / Pipeline Design] SOAR Playbook Build at Charles Schwab
**Source:** Report #041 — Apple — Data Scientist, Strategic Data Solutions
**S:** Phishing triage process was inconsistent across analysts — each followed different steps, producing variable outcomes and longer resolution times
**T:** Standardize investigation workflows and reduce manual, repetitive steps for the most common alert types
**A:** Designed and built 6 automated SOAR playbooks in Splunk SOAR, encoding decision logic, data enrichment steps, and escalation criteria as reusable pipeline stages
**R:** 20% improvement in triage consistency; 18% reduction in false-positive escalations; freed analyst time for higher-complexity investigations
**Reflection:** Treated this as a pipeline design problem (input → enrich → decision → output) — the same mental model applies to data engineering. Would document each playbook's logic in a shared runbook earlier.
**Best for questions about:** automation, process improvement, pipeline design, measurable impact, working with ambiguous requirements

### [Incident Response / Documentation] Root Cause Documentation Under Pressure at Charles Schwab
**Source:** Report #044 — Clinica Sierra Vista — Security Analyst
**S:** 15+ high-severity incidents at Schwab required structured documentation aligned to NIST and SOC 2 audit requirements, often captured under active-incident time pressure
**T:** Produce accurate, audit-ready records without slowing down the response itself
**A:** Treated documentation as a parallel track during IR — logged containment steps, evidence screenshots, and root cause analysis in real time rather than reconstructing after the fact
**R:** Audit readiness demonstrated across all 15+ incidents; SOC 2 control evidence accepted without rework during audit cycles
**Reflection:** Earlier in my career I treated docs as post-mortem work. Now I structure the incident record from the first action — it improves both the response and the audit trail simultaneously
**Best for questions about:** incident response, documentation discipline, working under pressure, compliance, attention to detail

### [Vulnerability Management] Risk-Based Prioritization at Cybage Software
**Source:** Report #044 — Clinica Sierra Vista — Security Analyst
**S:** 70+ open vulnerabilities across 120+ internal systems with no consistent prioritization — analysts were patching in discovery order, not risk order
**T:** Reduce the exposed attack surface using CVSS scoring and exploitability context rather than volume-first patching
**A:** Applied CVSS scores combined with active exploit availability research; reclassified the backlog by risk priority; coordinated verified patch deployment with infrastructure teams; tracked closure rates by severity tier
**R:** 18% reduction in exposed attack surface; eliminated all critical CVEs within SLA; remediation completion rate improved 17%
**Reflection:** Would integrate scan results into a live tracking dashboard from day one — spreadsheet-based tracking creates lag when volume grows above 50 open items
**Best for questions about:** vulnerability management, prioritization under constraints, risk-based thinking, cross-team coordination, measurable impact

### [Statistical Analysis / Threat Hunting] Authentication Anomaly Hunt at M&T Bank
**Source:** Report #041 — Apple — Data Scientist, Strategic Data Solutions
**S:** High-volume QRadar queue (2,800+ weekly alerts) with limited analyst bandwidth — most time spent on volume, less on novel threats
**T:** Identify real threats hidden beneath noisy alert volume using pattern analysis rather than rule-based detection alone
**A:** Ran targeted threat hunts using anomaly correlation — compared authentication event distributions against behavioral baselines, flagged statistical outliers, enriched with threat intelligence indicators
**R:** Uncovered 6 suspicious authentication patterns missed by standard rules; improved early detection rate; no false escalations from the hunt findings
**Reflection:** Should have formalized the baseline methodology and version-controlled it — reproducibility would have made this a repeatable process, not a one-time hunt

### [Policy Authorship / Standards Writing] NIST-Aligned Curriculum Design at Indiana Tech
**Source:** Report #053 — Deloitte — Global Cybersecurity Policies and Standards Analyst
**S:** Faculty needed a new graduate-level cybersecurity curriculum aligned to NIST and accreditation standards — no existing template existed
**T:** Research, draft, and structure course topics, learning objectives, and assessment rubrics against NIST and workforce standards
**A:** Synthesized data from peer institutions and professional organizations; drafted course descriptions, learning objectives, and rubrics; aligned each to NIST framework components and accreditation requirements
**R:** NIST-compliant curriculum accepted for accreditation review; course content adopted for graduate program
**Reflection:** Policy/standards writing and technical documentation are the same muscle. Translating a framework requirement into an actionable, auditable output applies whether the output is a course rubric or a security baseline.
**Best for questions about:** policy authorship, standards writing, translating frameworks into practice, technical writing, working with ambiguous requirements

### [Standards Enforcement / Automation as Policy] SOAR Playbooks as Operational Standards at Schwab
**Source:** Report #053 — Deloitte — Global Cybersecurity Policies and Standards Analyst
**S:** Phishing triage process was inconsistent across analysts — different steps, different outcomes, no enforced standard
**T:** Build a mechanism that enforces consistent procedure without requiring constant management oversight
**A:** Built 6 SOAR playbooks encoding the decision logic, enrichment steps, and escalation criteria — the playbook became the standard, enforced automatically at execution time
**R:** 20% triage consistency gain; 18% false-positive reduction; standard applied uniformly regardless of analyst experience level
**Reflection:** A policy that isn't enforced is just a document. Automation converts a written standard into an operational reality. This framing applies directly to cybersecurity standards work — the goal isn't to write a good document, it's to change behavior at scale.
**Best for questions about:** policy enforcement, standards adoption, automation, process improvement, measurable behavior change
