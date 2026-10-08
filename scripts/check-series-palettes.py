#!/usr/bin/env python3
"""Fail the build when a chart or status palette collapses for a colour-blind reader.

DEBT-VR-9. Check [13] asks whether a palette can carry TEXT. These palettes
carry none — they are chart series, status dots and connector lines — so it
skips them, and a different question applies: can two series be told apart?

For roughly 1 in 12 men that question has a different answer than it does
for the author. Red and green sit almost on top of each other under
deuteranopia, which is the single most common deficiency and the one most
likely to be designed straight past.

MEASURED, NOTHING IS CURRENTLY BROKEN. Every palette here clears the floor
under all three simulated deficiencies; the tightest is activityfeed at 11.2.
This gate exists to keep that true rather than to fix something — which is
the cheapest moment to add one.

HOW IT WORKS
------------
Each colour is converted to linear RGB, run through the Vienot-Brettel-Mollon
(1999) simulation matrices for protanopia, deuteranopia and tritanopia, and
every pair is compared as a CIE76 delta-E in Lab. Lab is used because
distance there approximates perceived difference, which RGB distance does
not.

WHAT IT DOES NOT CLAIM
----------------------
delta-E 10 is a rule of thumb for "distinguishable side by side", not a
standard. It says nothing about thin lines, small dots or large flat areas,
where the same pair reads differently. And it does not discharge WCAG 1.4.1:
colour must not be the ONLY way a distinction is conveyed, so a chart still
needs labels, a legend or shape. This gate makes colour a usable SECOND
channel; it does not make it a sufficient first one.
"""

import itertools

import glob
import re
import sys

# Palettes whose job is to SEPARATE things rather than carry text. Listed by
# name so adding one is a deliberate claim about what it is for, the same
# convention as check [13].
SERIES_PALETTES = [
    "EVENT_COLORS", "FALLBACK_INTENT_HEX", "STATUS_COLORS",
    "CONN_COLORS", "SPRINT_COLORS",
]

# Rule of thumb for "tellable apart at a glance". See the caveat above.
MIN_DELTA_E = 10.0


def discover():
    """Read the palettes out of the components rather than restating them."""
    found = {}
    pattern = (r"(?:const|let)\s+(" + "|".join(SERIES_PALETTES)
               + r")\b[^=]*=\s*[\[{]([^\]}]*)[\]}]")

    for path in sorted(glob.glob("components/*/*.ts")):
        if path.endswith((".test.ts", ".manifest.ts", ".conformance.ts")):
            continue
        src = open(path, encoding="utf-8").read()
        for m in re.finditer(pattern, src):
            colours = re.findall(r"#[0-9a-fA-F]{6}", m.group(2))
            if len(colours) >= 2:
                found[f"{path.split('/')[1]}/{m.group(1)}"] = colours

    return found

# Viénot, Brettel & Mollon (1999) simulation, applied in linear RGB.
CVD = {
    "normal":      ((1, 0, 0), (0, 1, 0), (0, 0, 1)),
    "protanopia":  ((0.1121, 0.8853, -0.0005), (0.1127, 0.8897, -0.0001),
                    (0.0045, 0.0000, 1.0019)),
    "deuteranopia": ((0.2920, 0.7054, -0.0003), (0.2934, 0.7089, 0.0000),
                     (-0.0209, 0.0272, 0.9915)),
    "tritanopia":  ((1.0170, 0.1472, -0.1638), (0.0000, 0.8672, 0.1332),
                    (0.0000, 0.0000, 1.0000)),
}


def to_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def srgb_to_linear(c):
    c = c / 255
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def linear_to_srgb(c):
    c = max(0.0, min(1.0, c))
    return 12.92 * c if c <= 0.0031308 else 1.055 * (c ** (1 / 2.4)) - 0.055


def simulate(rgb, kind):
    m = CVD[kind]
    lin = [srgb_to_linear(v) for v in rgb]
    out = [sum(m[i][j] * lin[j] for j in range(3)) for i in range(3)]
    return tuple(linear_to_srgb(v) * 255 for v in out)


def to_lab(rgb):
    lin = [srgb_to_linear(v) for v in rgb]
    x = 0.4124 * lin[0] + 0.3576 * lin[1] + 0.1805 * lin[2]
    y = 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]
    z = 0.0193 * lin[0] + 0.1192 * lin[1] + 0.9505 * lin[2]
    xn, yn, zn = 0.95047, 1.0, 1.08883

    def f(t):
        return t ** (1 / 3) if t > 0.008856 else (7.787 * t) + (16 / 116)

    fx, fy, fz = f(x / xn), f(y / yn), f(z / zn)
    return (116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz))


def delta_e(a, b):
    la, lb = to_lab(a), to_lab(b)
    return sum((x - y) ** 2 for x, y in zip(la, lb)) ** 0.5




def main():
    palettes = discover()

    if not palettes:
        print("  FAIL: no series palettes found — the pattern is wrong, "
              "which is a false pass rather than an absence of palettes")
        return 1

    problems = []

    for name, pal in palettes.items():
        worst = (999.0, None, None)
        for kind in CVD:
            for a, b in itertools.combinations(pal, 2):
                d = delta_e(simulate(to_rgb(a), kind), simulate(to_rgb(b), kind))
                if d < worst[0]:
                    worst = (d, kind, (a, b))

        flag = "" if worst[0] >= MIN_DELTA_E else "   <-- collides"
        print(f"    {name:34} {len(pal)} colours, worst dE {worst[0]:5.1f} "
              f"({worst[1]}){flag}")

        if worst[0] < MIN_DELTA_E:
            who = ("even with normal colour vision" if worst[1] == "normal"
                   else f"to a reader with {worst[1]}")
            problems.append(
                f"{name}: {worst[2][0]} and {worst[2][1]} are dE {worst[0]:.1f} "
                f"apart {who} — below {MIN_DELTA_E}, so those two series "
                f"cannot be told apart")

    if problems:
        print(f"\n  FAIL: {len(problems)} palette(s) collapse for a "
              f"colour-blind reader\n")
        for p in problems:
            print(f"    {p}")
        print("\n  Move one of the pair in LIGHTNESS, not hue — hue is the")
        print("  channel the deficiency removes. scripts/derive-colour.py")
        print("  `fit` adjusts lightness while preserving hue.")
        return 1

    print(f"  PASS: {len(palettes)} series palette(s) stay separable under "
          f"protanopia, deuteranopia and tritanopia")
    return 0


if __name__ == "__main__":
    sys.exit(main())
