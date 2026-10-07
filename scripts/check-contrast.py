#!/usr/bin/env python3
"""Fail the build when the surface ladder or a text pair regresses.

DEBT-VR-5. Three accessibility problems shipped across ADR-147 and ADR-150,
and every one of them was caught by a hand-run browser audit AFTER the fact:

  * muted text fell to 3.94 on the new page ground (ADR-147)
  * the tinted active tab label measured 3.91 on chrome (ADR-147)
  * muted text sat at 4.61 on the widened ladder (ADR-150) — passing by
    hundredths, which is the state that broke when the background moved

All three were arithmetic. None needed judgement, a browser, or an eye. This
check is the gate that should have caught them.

IT READS THE COMPILED CSS, NOT THE SASS
---------------------------------------
`dist/css/custom.css` is what actually ships. Parsing `_variables.scss` would
test this script's model of Sass rather than the bytes a browser receives —
the same mistake as grepping a bundle instead of asking the bundler
(AGENT_INSIGHTS 6.18). Run `npm run build:css` first; the check skips rather
than guesses if the stylesheet is absent.

WHAT IT CANNOT SEE
------------------
Composited colours. A translucent state layer over a tinted surface resolves
to a colour no token names, so `--theme-hover-bg` on chrome is not checked
here. Large-text exemptions (WCAG allows 3.0 at >=24px) are not modelled
either, so a heading-only token could fail this gate while being compliant —
none currently does. Treat a pass as "the named pairs are sound", not as an
accessibility audit.
"""
import re
import sys

CSS = "dist/css/custom.css"

# The four planes, darkest to lightest in LIGHT mode.
SURFACES = [
    ("sunken", "--theme-surface-sunken-bg"),
    ("ground", "--theme-body-bg"),
    ("chrome", "--theme-surface-raised-bg"),
    ("content", "--theme-surface-bg"),
]

TEXTS = [
    ("primary", "--theme-text-primary"),
    ("secondary", "--theme-text-secondary"),
    ("muted", "--theme-text-muted"),
    ("primary-text", "--theme-primary-text"),
]

# Pairs that actually touch on screen. NOT every combination — optimising a
# pair that never abuts costs contrast on pairs that do (AGENT_INSIGHTS 6.19).
# `sunken|ground` is deliberately absent: wells sit inside content, never on
# the page ground (DEBT-VR-6).
ADJACENCIES = [
    ("chrome", "content", "a sidebar meeting the document"),
    ("chrome", "ground", "a toolbar over the page"),
    ("sunken", "content", "a well inside a card"),
]

# Below this two planes read as the same colour. The complaint that prompted
# ADR-150 measured 1.056, so the floor sits above it with room to spare.
MIN_ADJACENCY = 1.07

# WCAG AA for body text. Not negotiable, not a preference.
MIN_TEXT = 4.5


def parse_block(css, selector, probe):
    """Return the custom properties from the `selector` block that declares
    `probe`.

    NOT the first block matching the selector. Bootstrap emits its own
    `:root` long before ours — three `:root` blocks exist in the compiled
    stylesheet — so position is the wrong way to find the theme tokens. The
    probe makes the choice unambiguous.
    """
    for m in re.finditer(re.escape(selector) + r"\s*\{", css):
        start = css.index("{", m.start())
        depth, end = 0, start

        for i in range(start, len(css)):
            if css[i] == "{":
                depth += 1
            elif css[i] == "}":
                depth -= 1
                if depth == 0:
                    end = i
                    break

        body = css[start:end]
        if probe in body:
            return dict(re.findall(r"(--[\w-]+)\s*:\s*([^;]+);", body))

    return {}


def to_rgb(value):
    """Parse a hex colour. Returns None for anything else — a token defined
    as var() or rgba() cannot be checked here and must not be guessed at."""
    value = value.strip()
    m = re.fullmatch(r"#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})", value)
    if not m:
        return None

    h = m.group(1)
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


def check_theme(label, tokens, problems, notes):
    surfaces, texts = {}, {}

    for name, token in SURFACES:
        rgb = to_rgb(tokens.get(token, ""))
        if rgb is None:
            problems.append(f"{label}: {token} is missing or not a hex colour")
        else:
            surfaces[name] = rgb

    for name, token in TEXTS:
        rgb = to_rgb(tokens.get(token, ""))
        if rgb is not None:
            texts[name] = rgb

    if len(surfaces) < len(SURFACES):
        return

    # --- ordering: ~140 call sites depend on the direction ----------------
    order = sorted(surfaces, key=lambda k: luminance(surfaces[k]))
    expected = (["sunken", "ground", "chrome", "content"] if label == "light"
                else ["sunken", "ground", "content", "chrome"])

    if order != expected:
        problems.append(
            f"{label}: surface ORDER is {' < '.join(order)}, expected "
            f"{' < '.join(expected)}. Chrome and content would swap across "
            f"the fleet.")

    # --- separation on the pairs that actually abut -----------------------
    for a, b, why in ADJACENCIES:
        r = ratio(surfaces[a], surfaces[b])
        notes.append(f"    {label:5} {a:7} | {b:8} {r:6.3f}   {why}")
        if r < MIN_ADJACENCY:
            problems.append(
                f"{label}: {a}|{b} is {r:.3f}, below {MIN_ADJACENCY} — "
                f"{why} would read as one surface.")

    # --- every text token on every surface --------------------------------
    worst = (99.0, "")
    for tname, trgb in texts.items():
        for sname, srgb in surfaces.items():
            r = ratio(trgb, srgb)
            if r < worst[0]:
                worst = (r, f"{tname} on {sname}")
            if r < MIN_TEXT:
                problems.append(
                    f"{label}: {tname} text on {sname} is {r:.2f}, below the "
                    f"{MIN_TEXT} AA floor.")

    notes.append(f"    {label:5} worst text pair: {worst[1]} {worst[0]:.2f}")


def main():
    try:
        css = open(CSS, encoding="utf-8").read()
    except FileNotFoundError:
        print(f"  SKIP: {CSS} not present (run npm run build:css)")
        return 0

    problems, notes = [], []

    check_theme("light", parse_block(css, ":root", "--theme-surface-raised-bg"),
                problems, notes)
    check_theme("dark",
                parse_block(css, "[data-bs-theme=dark]", "--theme-surface-raised-bg"),
                problems, notes)

    if not notes:
        print("  FAIL: could not read any theme tokens from the stylesheet")
        return 1

    # Printed on pass as well as failure: a value sitting a hundredth above
    # the floor is the thing that breaks next, and it should be visible
    # before it fails rather than after.
    for line in notes:
        print(line)

    if problems:
        print(f"\n  FAIL: {len(problems)} contrast problem(s)\n")
        for p in problems:
            print(f"    {p}")
        print("\n  Surfaces are a ladder: moving one plane changes two")
        print("  boundaries. See specs/2026-10-06-surface-tint.prd.md §9.")
        return 1

    print("  PASS: ladder ordering, adjacencies and text pairs all sound")
    return 0


if __name__ == "__main__":
    sys.exit(main())
