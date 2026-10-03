#!/usr/bin/env python3
"""Fail the build when a stand-in component answers a read.

ADR-148. On 3 October 2026 a mock graph in the apps repo answered
`serialize()` with an empty document; the autosave wrote it over live
sessions and they were not recoverable. An audit of this library found the
same shape in twelve places, including five pickers whose null object
answered `getValue()` with a fabricated setting.

The rule being enforced has two clauses:

  1. A degraded component may never report success.
  2. A degraded component may never participate in a write.

Answering a read IS participating. The deciding question is whether a caller
can tell "there is nothing" from "I could not find out" — if not, the second
answer eventually gets persisted as the first.

WHAT THIS CHECK CANNOT SEE
--------------------------
One shape, deliberately. It finds NAMED stand-in factories that expose a read
method. It does not find:

  * an inline failure branch returning an object literal;
  * a `catch` that returns a fabricated value;
  * an aggregation-point default, as DynamicFormSwitcher's `fallbackDefault`
    was — the single most dangerous instance found in the ADR-148 audit.

A regex pass over `catch` blocks was prototyped and produced 25 hits of which
roughly four were real. That is not gate-worthy, and shipping it would have
trained everyone to ignore the gate. This is a ratchet against the commonest
shape reappearing, not a proof of absence. Read the spec, not just the exit
code.
"""
import glob
import re
import sys

# Reads whose answer a host could persist.
READ = re.compile(
    r"\b(getValue|getState|serialize|getData|getSelected|toJSON|getConfig"
    r"|getContent|getItems|getRows|getText|getSettings|getSelection)\s*:")

FACTORY = re.compile(
    r"function\s+((?:create|build|make)"
    r"(?:Null|Fallback|NoOp|Noop|Stub|Empty|Dummy)\w*)\s*\(",
    re.I)

# Builders that produce a VISIBLE degraded DOM element and carry no setting
# are legitimate: they announce themselves on screen and nothing reads a
# value back out of them. Listed explicitly so the exemption is a decision
# rather than a gap in the regex.
ALLOWED = {
    "buildFallbackBadge",      # graphlegend — a plain badge
    "buildFallbackHandle",     # markdownrenderer
    "buildFallbackChip",       # peoplepicker
    "buildFallbackAvatar",     # peoplepicker, presenceindicator — initials
    "buildFallbackToolbar",    # visualtableeditor
}


def block_of(lines, start):
    """Return the source of the brace-balanced block starting at `start`."""
    depth = 0

    for i in range(start, len(lines)):
        depth += lines[i].count("{") - lines[i].count("}")
        if depth == 0 and i > start:
            return "\n".join(lines[start:i + 1])

    return "\n".join(lines[start:])


def main():
    violations = []

    for path in sorted(glob.glob("components/*/*.ts")):
        if path.endswith((".test.ts", ".manifest.ts", ".conformance.ts")):
            continue

        src = open(path, encoding="utf-8").read()
        lines = src.split("\n")

        for match in FACTORY.finditer(src):
            name = match.group(1)
            if name in ALLOWED:
                continue

            start = src.count("\n", 0, match.start())
            body = block_of(lines, start)

            for rm in READ.finditer(body):
                tail = body[rm.end():rm.end() + 120].split("\n")[0]

                # Refusing is the point. Answering is the defect.
                if "throw" in tail:
                    continue

                violations.append((
                    path,
                    start + body.count("\n", 0, rm.start()) + 1,
                    name,
                    rm.group(1),
                    tail.strip()[:60],
                ))

    if not violations:
        print("  PASS: no stand-in factory answers a read")
        return 0

    print(f"  FAIL: {len(violations)} stand-in read(s) that answer "
          f"instead of refusing\n")

    for path, line, factory, read, tail in violations:
        print(f"    {path}:{line}")
        print(f"      {factory}() exposes {read}() -> {tail}")

    print("\n  A component that failed to initialise must not answer a read.")
    print("  A host persisting that answer overwrites the user's real value.")
    print("  Throw from the factory instead, and delete the stand-in.")
    print("  See specs/2026-10-04-no-fabricated-reads.prd.md (ADR-148).")
    return 1


if __name__ == "__main__":
    sys.exit(main())
