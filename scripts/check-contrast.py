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
Three things, each deliberate, each with the measurement that decided it.
Treat a pass as "the named pairs are sound", not as an accessibility audit.

1. TWO STACKED STATE LAYERS — not modelled, because the shape does not occur.
   DEBT-VR-5c predicted "a hovered row inside a selected group" as the likely
   real case. It is not reachable the way it was imagined: `background-color`
   REPLACES, it does not stack, so `.datagrid-row-selected:hover` paints one
   colour rather than hover over selected. Stacking needs two NESTED elements
   both painting on the same pointer event, since `:hover` matches ancestors
   too. A scan of the compiled component CSS found 17 candidate ancestor /
   descendant pairs and all but one were the same element matched twice at
   different specificity. The single genuine instance is `.tabbedpanel-tab-
   close` inside `.tabbedpanel-tab`, and it measures 10.92 light / 8.08 dark
   against a 4.5 floor. Modelling it strictly was tried and rejected: layer
   over layer over every base fails 24 pairs in dark, worst 3.61, for
   combinations nothing renders — the 6.19 trade again. Worth knowing that
   ignoring the nesting overstates by up to 1.59, so this has margin, not
   immunity.

2. THE LARGE-TEXT EXEMPTION (WCAG 3.0 at >=24px) — not modelled, ON PURPOSE,
   and this is the one to leave alone. It can only ever RELAX the gate, and
   no token in this repository is heading-only, so there is nothing for it to
   rescue; adding it would open a false-pass channel with no true positive to
   justify it. Add it when, and only when, a token becomes heading-only.

3. Component-level translucent backgrounds — 73 of them, `rgba()` literals in
   component SCSS that no theme token names. The group fills below are the
   subset that ARE tokens. See DEBT-VR-10 for the rest.
"""
import colorsys
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

# Opaque filled regions (ADR-156) — a tab strip, a kbd chip, a skipped step
# marker. Not part of the LADDER, so they are excluded from the ordering and
# adjacency rules, but text sits on them and must be checked. Omitting them
# is how 34 filled regions came to be painted with an interaction-state
# token in the first place.
FILLS = [
    ("fill-strong", "--theme-fill-strong"),
]

TEXTS = [
    ("primary", "--theme-text-primary"),
    ("secondary", "--theme-text-secondary"),
    ("muted", "--theme-text-muted"),
    ("primary-text", "--theme-primary-text"),
]

# Translucent state layers. These composite over whatever surface is beneath
# them, producing a colour NO TOKEN NAMES — which is why text over a hovered
# row was invisible to every check until ADR-151, and why eight real AA
# failures shipped. The worst, confirmed in toolbar.scss:581/:586, put a
# toolbar button's label at 3.69 on hover in dark mode.
#
# Checked STRICTLY: every layer over every surface, rather than only the
# combinations components currently render. A usage map would permit kinder
# values, but it goes stale silently the moment a component moves to a
# different surface, and a stale map makes the gate confidently wrong.
LAYERS = [
    ("hover", "--theme-hover-bg"),
    ("active", "--theme-active-bg"),
    ("selected", "--theme-selected-bg"),
]

# Namespace group fills (DEBT-VR-5c). A pastel tint drawn behind a cluster of
# graph nodes with the namespace name written on top of it.
#
# CURATED rather than strict, which is the opposite of how LAYERS is treated
# above, so the asymmetry needs its reason. The state layers get the strict
# sweep because any component may put any text on any surface and then hover
# it. These five tokens have exactly ONE consumer in the repository —
# `graphcanvas.ts` `renderOneGroupBg` — and it draws ONE string on them, in
# `--theme-text-secondary`. Sweeping all four text tokens over them instead
# would fail the build today on `muted` at 3.86, a pair nothing renders and
# nothing can render, and the only way to clear it would be to lighten
# pastels that are already correct. That is precisely the trade
# AGENT_INSIGHTS 6.19 warns about: a pair that never abuts, costing contrast
# on pairs that do.
#
# THE `fill-opacity` IS LOAD-BEARING. The rect is painted with
# `fill-opacity: 0.3`, so the token value is NOT the colour on screen. In
# dark mode the token is itself translucent — `rgba(28,126,214,.18)` — and
# the two multiply to an effective 0.054. Modelling the token as painted
# reports 8.40 where the browser renders 9.74; both pass today, so this
# would read as harmless, and it is the kind of harmless that stops being
# harmless the moment a pastel moves.
#
# WHERE THIS CHECK IS AND IS NOT SENSITIVE — established by mutation, since a
# gate nobody has tried to break is a guess. Lightening
# `--theme-text-secondary` to #94a3b8 fails all five fills at 2.4, and that
# is the exact drift that shipped twice, under ADR-147 and ADR-150. Making a
# token unparseable fails rather than skips. But raising a dark fill's alpha
# from .18 to .95 only moves 10.06 to 7.83 — it does NOT fail, because
# `fill-opacity: 0.3` washes every fill toward its backdrop; in light mode
# even a pure black pastel lands at 4.59, just above the floor. So read this
# as a guard on the LABEL COLOUR and on the fill-opacity, not on the pastel
# values, which have margin measured in multiples rather than hundredths.
GROUP_FILLS = [f"--theme-group-bg-{i}" for i in range(1, 6)]
GROUP_FILL_OPACITY = 0.3        # graphcanvas.ts renderOneGroupBg
GROUP_SURFACE = "content"       # graphcanvas.scss root is --theme-surface-bg
GROUP_TEXT = "secondary"        # the label's fill

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
    as var() cannot be resolved here and must not be guessed at."""
    value = value.strip()
    m = re.fullmatch(r"#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})", value)
    if not m:
        return None

    h = m.group(1)
    if len(h) == 3:
        h = "".join(c * 2 for c in h)

    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def to_rgba(value):
    """Parse a translucent layer as (rgb, alpha).

    Handles both forms the minifier emits: `rgba(15,23,42,.045)` and
    `hsla(0,0%,100%,.06)`, which is what cssnano rewrites pure white to.
    Missing either form would silently skip a layer — a false pass.
    """
    value = value.strip()

    m = re.fullmatch(r"rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)"
                     r"(?:[,/\s]+([\d.]+))?\s*\)", value)
    if m:
        rgb = tuple(float(m.group(i)) for i in (1, 2, 3))
        return rgb, float(m.group(4)) if m.group(4) else 1.0

    m = re.fullmatch(r"hsla?\(\s*([\d.]+)[,\s]+([\d.]+)%[,\s]+([\d.]+)%"
                     r"(?:[,/\s]+([\d.]+))?\s*\)", value)
    if m:
        h, sl, ll = (float(m.group(i)) for i in (1, 2, 3))
        r, g, b = colorsys.hls_to_rgb(h / 360, ll / 100, sl / 100)
        return (r * 255, g * 255, b * 255), \
               float(m.group(4)) if m.group(4) else 1.0

    return None


def composite(layer_rgb, alpha, base_rgb):
    """The colour a browser actually paints: layer over base."""
    return tuple(alpha * f + (1 - alpha) * b
                 for f, b in zip(layer_rgb, base_rgb))


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

    # Fills join the text sweep below but NOT the ordering or adjacency
    # checks above, because they are not rungs of the ladder.
    fills = {}
    for name, token in FILLS:
        rgb = to_rgb(tokens.get(token, ""))
        if rgb is None:
            problems.append(
                f"{label}: {token} is missing or not a hex colour — text on "
                f"filled regions would go unchecked, which is a false pass")
        else:
            fills[name] = rgb

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
        for sname, srgb in {**surfaces, **fills}.items():
            r = ratio(trgb, srgb)
            if r < worst[0]:
                worst = (r, f"{tname} on {sname}")
            if r < MIN_TEXT:
                problems.append(
                    f"{label}: {tname} text on {sname} is {r:.2f}, below the "
                    f"{MIN_TEXT} AA floor.")

    notes.append(f"    {label:5} worst text pair: {worst[1]} {worst[0]:.2f}")

    # --- the same text, over every state layer, over every surface --------
    layers = {}
    for name, token in LAYERS:
        parsed = to_rgba(tokens.get(token, ""))
        if parsed is None:
            problems.append(
                f"{label}: {token} could not be parsed as a colour, so text "
                f"over it is unchecked — that is a false pass, not a skip.")
        else:
            layers[name] = parsed

    cworst = (99.0, "")
    for lname, (lrgb, alpha) in layers.items():
        for sname, srgb in {**surfaces, **fills}.items():
            comp = composite(lrgb, alpha, srgb)
            for tname, trgb in texts.items():
                r = ratio(trgb, comp)
                if r < cworst[0]:
                    cworst = (r, f"{tname} on {lname} over {sname}")
                if r < MIN_TEXT:
                    problems.append(
                        f"{label}: {tname} text on a {lname} state over "
                        f"{sname} is {r:.2f}, below the {MIN_TEXT} AA floor. "
                        f"That background is a composite no token names.")

    if layers:
        n = len(layers) * (len(surfaces) + len(fills)) * len(texts)
        notes.append(f"    {label:5} worst composited ({n} pairs): "
                     f"{cworst[1]} {cworst[0]:.2f}")

    check_group_fills(label, tokens, surfaces, texts, problems, notes)


def check_group_fills(label, tokens, surfaces, texts, problems, notes):
    """The namespace group label on each pastel fill, as the browser paints it.

    Two compositing steps, not one: the token's own alpha if it has one, then
    the `fill-opacity` on the rect. See GROUP_FILLS for why this is curated to
    a single text token rather than swept.
    """
    base = surfaces.get(GROUP_SURFACE)
    text = texts.get(GROUP_TEXT)

    if base is None or text is None:
        problems.append(
            f"{label}: cannot check group fills — "
            f"{GROUP_SURFACE} surface or {GROUP_TEXT} text is unreadable")
        return

    gworst = (99.0, "")
    for token in GROUP_FILLS:
        raw = tokens.get(token, "")

        # Opaque in light, rgba() in dark. A token that parses as neither must
        # fail rather than be skipped, or the check reports a pass it never ran.
        rgb = to_rgb(raw)
        parsed = (rgb, 1.0) if rgb is not None else to_rgba(raw)
        if parsed is None:
            problems.append(
                f"{label}: {token} could not be parsed as a colour, so the "
                f"namespace label on it is unchecked — a false pass.")
            continue

        frgb, alpha = parsed
        painted = composite(frgb, alpha * GROUP_FILL_OPACITY, base)
        r = ratio(text, painted)

        if r < gworst[0]:
            gworst = (r, token)
        if r < MIN_TEXT:
            problems.append(
                f"{label}: the namespace label ({GROUP_TEXT} text) on {token} "
                f"is {r:.2f}, below the {MIN_TEXT} AA floor. That fill is "
                f"painted at {alpha * GROUP_FILL_OPACITY:.3f} effective alpha "
                f"over {GROUP_SURFACE}, so the token value is not the colour "
                f"on screen.")

    if gworst[1]:
        notes.append(f"    {label:5} worst group fill ({len(GROUP_FILLS)} "
                     f"pairs): {GROUP_TEXT} on {gworst[1]} {gworst[0]:.2f}")


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
