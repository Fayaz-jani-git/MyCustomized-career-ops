#!/usr/bin/env python3
"""Launches a stealth Chromium (cloakbrowser) with a persistent profile and
an exposed CDP debug port, so agent-browser can attach to it.

Prints "CDP_READY <port>" once the debug port is listening, then blocks
until terminated (SIGTERM/SIGINT), closing the browser cleanly on exit.

Run with the cloakbrowser venv's python:
  ~/.venvs/cloakbrowser/bin/python3 cloak-launch.py --port 9333 --profile-dir DIR
"""
import argparse
import signal
import sys
import time
from pathlib import Path

import cloakbrowser


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--port", type=int, default=9333)
    p.add_argument("--profile-dir", required=True)
    p.add_argument("--headless", action="store_true")
    args = p.parse_args()

    Path(args.profile_dir).mkdir(parents=True, exist_ok=True)

    ctx = cloakbrowser.launch_persistent_context(
        user_data_dir=args.profile_dir,
        headless=args.headless,
        args=[f"--remote-debugging-port={args.port}"],
        viewport={"width": 1280, "height": 900},
    )

    print(f"CDP_READY {args.port}", flush=True)

    stop = {"flag": False}

    def handle(sig, frame):
        stop["flag"] = True

    signal.signal(signal.SIGTERM, handle)
    signal.signal(signal.SIGINT, handle)

    try:
        while not stop["flag"]:
            time.sleep(0.5)
    finally:
        try:
            ctx.close()
        except Exception as exc:
            print(f"cleanup warning: {exc}", file=sys.stderr)


if __name__ == "__main__":
    main()
