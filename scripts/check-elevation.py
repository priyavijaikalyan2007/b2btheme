#!/usr/bin/env python3
"""Fail the build when the three elevation layers disagree.

DEBT-VR-2. The same shadow scale is declared three times, and during ADR-147
to ADR-151 the copies drifted TWICE:

  1. Sass `$shadow-*` in `_variables.scss`   — 30 component call sites
  2. CSS `--theme-shadow-*` in `_dark-mode.scss` — 67 call sites
  3. Bootstrap's own `$box-shadow` scale     — dropdowns, modals, popovers

ADR-147 updated (1) and (2) and missed (3), so the most visible overlays in
the library kept the old single-blur smudge while everything else moved.
ADR-151 then found (3) was never redefined in the DARK block either, so
Bootstrap overlays cast light-tinted shadows on a dark ground.

Both were caught by a human noticing. Neither needed to be.

WHAT AGREEMENT MEANS HERE
-------------------------
Not byte equality — the layers legitimately express the same thing
differently. `$shadow-lg` writes `rgba($gray-900, 0.07)` where
`--theme-shadow-lg` writes `rgba(var(--theme-shadow-rgb), 0.07)`, and both
resolve to the same colour. So the check compares the GEOMETRY (offsets,
blur) and the ALPHAS, which is what actually makes two shadows look alike,
and ignores how the colour is spelled.

Dark is deliberately NOT compared to light: ADR-151 gave dark elevations a
hairline light ring and roughly doubled alphas, because a black shadow on a
near-black ground carries almost no signal. Dark is checked for PRESENCE
instead — that every `--bs-box-shadow*` is redefined there at all, which is
the exact thing ADR-151 found missing.
"""
import re
import sys

VARS = "src/scss/_variables.scss"
DARKMODE = "src/scss/_dark-mode.scss"
CSS = "dist/css/custom.css"

STEPS = ["xs", "sm", "md", "lg", "xl"]

# Which Sass alias Bootstrap's scale must point at. ADR-147 chose these.
BOOTSTRAP_ALIASES = {
    "$box-shadow": "$shadow-lg",
    "$box-shadow-sm": "$shadow-sm",
    "$box-shadow-lg": "$shadow-xl",
}

# Bootstrap vars that must be redefined in the dark block.
DARK_REQUIRED = ["--bs-box-shadow", "--bs-box-shadow-sm", "--bs-box-shadow-lg"]


def _collapse_colours(text):
    """Replace every colour function with `@<alpha>`.

    Hand-written rather than a regex because the argument list NESTS:
    `rgba(var(--theme-shadow-rgb), 0.07)` has a `)` belonging to `var(`, and
    a `[^)]*` pattern stops there and captures the wrong thing — which
    reports a drift on every step while the geometry is in fact identical.
    """
    out, i = [], 0

    while i < len(text):
        m = re.compile(r"(rgba?|hsla?)\(").match(text, i)
        if not m:
            out.append(text[i])
            i += 1
            continue

        depth, j = 0, m.end() - 1
        while j < len(text):
            if text[j] == "(":
                depth += 1
            elif text[j] == ")":
                depth -= 1
                if depth == 0:
                    break
            j += 1

        args, parts, d = text[m.end():j], [], 0
        current = ""
        for ch in args:
            if ch == "(":
                d += 1
            elif ch == ")":
                d -= 1
            if ch == "," and d == 0:
                parts.append(current)
                current = ""
            else:
                current += ch
        parts.append(current)

        alpha = parts[-1].strip() if len(parts) > 1 else "1"
        out.append("@" + alpha)
        i = j + 1

    return "".join(out)


def shape(value):
    """Reduce a shadow to geometry + alphas, discarding how colour is written.

    `0 4px 8px rgba($gray-900, 0.07)` and
    `0 4px 8px rgba(var(--theme-shadow-rgb), 0.07)` both become
    `0 4px 8px @0.07`, because they paint the same shadow.
    """
    v = value.strip().rstrip(";").strip()
    v = re.sub(r"!default\s*$", "", v).strip()
    v = _collapse_colours(v)
    v = re.sub(r"\s+", " ", v)
    # 0.10 and .1 are the same number
    v = re.sub(r"@([\d.]+)", lambda m: "@%g" % float(m.group(1)), v)
    return v.lower()


def declarations(path, pattern):
    """Parse `name: value;` declarations.

    re.M matters: the patterns anchor on ^ to avoid matching a name inside a
    comment or a nested rule, and without it ^ only matches the start of the
    whole file — which reports every declaration missing and reads exactly
    like a real failure.
    """
    src = open(path, encoding="utf-8").read()
    return {m.group(1): m.group(2).strip()
            for m in re.finditer(pattern, src, re.M)}


def light_tokens(path):
    """The --theme-shadow-* declared in the LIGHT :root block only."""
    src = open(path, encoding="utf-8").read()
    start = src.index(":root")
    depth, end = 0, len(src)

    for i in range(src.index("{", start), len(src)):
        if src[i] == "{":
            depth += 1
        elif src[i] == "}":
            depth -= 1
            if depth == 0:
                end = i
                break

    return {m.group(1): m.group(2).strip()
            for m in re.finditer(
                r"^\s*(--theme-shadow-(?:xs|sm|md|lg|xl))\s*:\s*([^;]+);",
                src[start:end], re.M)}


def dark_block(css):
    """The [data-bs-theme=dark] block that carries the theme tokens."""
    for m in re.finditer(r"\[data-bs-theme=dark\]\s*\{", css):
        start = css.index("{", m.start())
        depth = 0
        for i in range(start, len(css)):
            if css[i] == "{":
                depth += 1
            elif css[i] == "}":
                depth -= 1
                if depth == 0:
                    body = css[start:i]
                    if "--theme-shadow-lg" in body or "--bs-box-shadow" in body:
                        return body
                    break
    return ""


def main():
    problems, notes = [], []

    sass = declarations(
        VARS, r"^(\$(?:shadow|box-shadow)[\w-]*)\s*:\s*([^;]+);")
    # Scoped to the LIGHT :root block on purpose. _dark-mode.scss declares
    # --theme-shadow-* twice — once under :root, once under the dark
    # selector — and a flat parse keeps whichever comes last, silently
    # comparing the Sass scale against the DARK values. Those legitimately
    # differ (ADR-151), so the check would fail on every step and look like
    # a real drift.
    tokens = light_tokens(DARKMODE)

    # --- 1. Sass scale vs CSS token scale, in LIGHT ----------------------
    for step in STEPS:
        a = sass.get(f"$shadow-{step}")
        b = tokens.get(f"--theme-shadow-{step}")

        if a is None or b is None:
            problems.append(
                f"missing declaration for step '{step}' "
                f"({'$shadow' if a is None else '--theme-shadow'}-{step})")
            continue

        if shape(a) != shape(b):
            problems.append(
                f"step '{step}' differs between the Sass and CSS layers\n"
                f"        $shadow-{step:<2}      {shape(a)}\n"
                f"        --theme-shadow-{step:<2} {shape(b)}")
        else:
            notes.append(f"    {step:2} {shape(a)}")

    # --- 2. Bootstrap's scale points at ours ------------------------------
    for name, expected in BOOTSTRAP_ALIASES.items():
        actual = sass.get(name)
        if actual is None:
            problems.append(
                f"{name} is not overridden — Bootstrap overlays would keep "
                f"its default shadow while the rest of the library moved")
        elif actual.split("!")[0].strip() != expected:
            problems.append(
                f"{name} points at '{actual.split('!')[0].strip()}', "
                f"expected '{expected}'")

    # --- 3. Bootstrap's scale is redefined in DARK ------------------------
    try:
        css = open(CSS, encoding="utf-8").read()
    except FileNotFoundError:
        notes.append("    (dark check skipped — dist/css/custom.css absent)")
        css = None

    if css is not None:
        body = dark_block(css)
        if not body:
            problems.append("could not find the dark theme block in the "
                            "compiled stylesheet")
        else:
            for name in DARK_REQUIRED:
                if not re.search(re.escape(name) + r"\s*:", body):
                    problems.append(
                        f"{name} is not redefined in the dark block — "
                        f"Bootstrap overlays would cast a LIGHT-tinted shadow "
                        f"on a dark ground, which is invisible (ADR-151)")

    if notes:
        print("    geometry shared by the Sass and CSS layers:")
        for n in notes:
            print(n)

    if problems:
        print(f"\n  FAIL: {len(problems)} elevation disagreement(s)\n")
        for p in problems:
            print(f"    {p}")
        print("\n  The scale is declared three times and all three must move")
        print("  together. See the note above $shadow-xs in _variables.scss.")
        return 1

    print(f"  PASS: Sass, CSS and Bootstrap elevation layers agree")
    return 0


if __name__ == "__main__":
    sys.exit(main())
