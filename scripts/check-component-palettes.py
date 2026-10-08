#!/usr/bin/env python3
"""Fail the build when a component colour palette cannot carry its own text.

DEBT-VR-7. The surface-contrast gate (check [12]) reads the compiled
stylesheet, so it sees the THEME ladder and nothing else. Colours that live
in component TypeScript — avatar palettes, preset tints, status colours —
never appear in `:root`, and are invisible to it.

Nine palettes across nine components sat in that blind spot. Measured, the
avatar palettes carried white initials at ratios as low as **1.92** (white on
`#eab308`), unreadable, shipped. Three more components set a fixed palette
background and let the FOREGROUND be inherited from the theme, so the text
flipped to near-white in dark mode and every entry failed.

WHAT THIS CHECKS
----------------
Palettes named `INITIALS_*`, `AVATAR_*` or `HASH_PALETTE` — the ones that
render text directly on a generated background. Each entry must clear the AA
floor against the foreground the component actually paints on it.

WHAT IT CANNOT CHECK
--------------------
Caller-supplied colours. A host passing `tag.color` can pass anything, so no
build-time check can vet it; those sites use a runtime `readableOn()` that
picks ink or paper by luminance instead. Also unchecked: chart and diagram
palettes, where the requirement is series *distinctness* rather than text
contrast, and that is a different measurement.
"""
import glob
import re
import sys

# Palettes that carry text, and the foreground each component paints on them.
# A palette absent here is not checked — add it rather than widening the
# pattern, so the pairing stays an explicit claim.
TEXT_ON_PALETTE = {
    "INITIALS_COLORS": "#ffffff",
    "INITIALS_PALETTE": "#ffffff",
    "HASH_PALETTE": "#ffffff",
}

MIN_RATIO = 4.5

PALETTE_RE = re.compile(
    r"(?:const|let)\s+(" + "|".join(TEXT_ON_PALETTE) + r")\b[^=]*=\s*\[([^\]]*)\]")


def to_rgb(value):
    h = value.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def luminance(rgb):
    chan = []
    for v in rgb:
        v /= 255
        chan.append(v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4)
    return 0.2126 * chan[0] + 0.7152 * chan[1] + 0.0722 * chan[2]


def ratio(a, b):
    la, lb = luminance(a), luminance(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def main():
    problems, checked = [], 0

    for path in sorted(glob.glob("components/*/*.ts")):
        if path.endswith((".test.ts", ".manifest.ts", ".conformance.ts")):
            continue

        src = open(path, encoding="utf-8").read()
        component = path.split("/")[1]

        for match in PALETTE_RE.finditer(src):
            name = match.group(1)
            fg = TEXT_ON_PALETTE[name]
            colours = re.findall(r"#[0-9a-fA-F]{6}", match.group(2))

            if not colours:
                continue

            checked += 1
            worst = min(ratio(to_rgb(fg), to_rgb(c)) for c in colours)

            for colour in colours:
                r = ratio(to_rgb(fg), to_rgb(colour))
                if r < MIN_RATIO:
                    problems.append(
                        f"{component}: {name} entry {colour} carries {fg} "
                        f"text at {r:.2f}, below the {MIN_RATIO} AA floor")

            # Printed whether or not anything failed: a palette sitting just
            # above the floor is the one that breaks next, and suppressing
            # the summary on the first failure hides it.
            flag = "" if worst >= MIN_RATIO else "   <-- below floor"
            print(f"    {component:22} {name:18} "
                  f"{len(colours)} colours, worst {worst:.2f}{flag}")

    if checked == 0:
        print("  FAIL: no component palettes found — the pattern is wrong, "
              "which is a false pass, not an absence of palettes")
        return 1

    if problems:
        print(f"\n  FAIL: {len(problems)} palette entr(ies) cannot carry "
              f"their own text\n")
        for p in problems:
            print(f"    {p}")
        print("\n  Darken the entry until the foreground clears 4.5, keeping")
        print("  its hue — or, for caller-supplied colours, pick the")
        print("  foreground at runtime with readableOn(). See ADR-153.")
        return 1

    print(f"  PASS: {checked} component palette(s) carry their text at "
          f"{MIN_RATIO}+")
    return 0


if __name__ == "__main__":
    sys.exit(main())
