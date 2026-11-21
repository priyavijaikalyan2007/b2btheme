#!/usr/bin/env python3
"""Fail when a line of agentknowledge/history.jsonl is not valid JSON.

Structure check [8]. history.jsonl silently held three malformed lines
between 2026-02 and 2026-03, because nothing parsed it. The check was
inline in test-local.sh until the docs workflow needed it too. A spec or
history change runs that workflow and not the full build, so both call
this one file.

Exit 0 when every line parses, 1 otherwise, with each bad line on stderr.
Standard library only.
"""

import json
import sys

bad = []
with open("agentknowledge/history.jsonl", encoding="utf-8") as history:
    for n, line in enumerate(history, 1):
        if not line.strip():
            continue
        try:
            json.loads(line)
        except Exception as exc:
            bad.append(f"line {n}: {exc}")

if bad:
    print("\n".join(f"      {b}" for b in bad), file=sys.stderr)
    sys.exit(1)
