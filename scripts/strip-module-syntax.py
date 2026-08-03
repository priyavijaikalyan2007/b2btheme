#!/usr/bin/env python3
"""
SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
SPDX-License-Identifier: MIT

COMPONENT: DynamicUIRuntime / BuildPipeline
PURPOSE: Strips ES module syntax from one TypeScript source so it can be
    concatenated into a single-scope bundle.

    Removes import statements (single- and multi-line) and the leading
    `export ` keyword from declarations. Everything else is emitted verbatim,
    so line-for-line correspondence with the source is preserved apart from
    the removed lines.
"""

import re
import sys


def strip(text: str) -> str:
    """Remove imports and export keywords from a module source."""
    out = []
    in_import = False

    for line in text.splitlines():
        if in_import:
            # A multi-line import ends at the line closing its brace list.
            if re.match(r'^\}\s*from\s+".*";\s*$', line):
                in_import = False
            continue

        if re.match(r"^import\s.*;\s*$", line):
            continue

        if re.match(r"^import\s", line) and " from " not in line:
            in_import = True
            continue

        out.append(re.sub(r"^export\s+(?!default)", "", line))

    return "\n".join(out)


if __name__ == "__main__":
    with open(sys.argv[1], encoding="utf-8") as handle:
        sys.stdout.write(strip(handle.read()))
        sys.stdout.write("\n")
