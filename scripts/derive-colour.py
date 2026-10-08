#!/usr/bin/env python3
"""Derive accessible colour values instead of picking them by eye.

DEBT-VR-8. Two jobs keep recurring by hand, and both are arithmetic:

  1. A palette entry must carry a fixed foreground at 4.5+ (ADR-153). Four
     avatar colours and six tag colours were darkened by hand to achieve it.
  2. A light preset tint needs a dark-mode twin (ADR-152). Four were picked
     by eye at matching hue.

Both preserve HUE and move LIGHTNESS, which is a two-line transform once
stated — but stating it once is the point. Hand-picking produced a value that
measured 4.30 and shipped, caught only when the gate was written.

This is a developer tool, not a build step. Nothing imports it; the gates
(`check-component-palettes.py`, `check-contrast.py`) verify the results it
helps you reach.

USAGE
  python3 scripts/derive-colour.py fit  '#e67700' --on '#ffffff'
      Darken (or lighten) until the given foreground clears the floor,
      keeping hue and saturation.

  python3 scripts/derive-colour.py twin '#e7f1ff' --surface '#161f2e'
      Produce a dark-mode counterpart of a light tint: same hue, lifted just
      far enough off the dark surface to read as a stripe.

  python3 scripts/derive-colour.py check '#1c7ed6' '#ffffff'
      Report the contrast ratio between two colours.
"""
import argparse
import colorsys
import sys

AA_TEXT = 4.5
# A stripe must be visibly distinct from the surface it sits on without
# becoming a second surface. 1.10 is the separation ADR-150 settled on for
# chrome against content.
STRIPE_SEPARATION = 1.10


def to_rgb(value):
    h = value.strip().lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    if len(h) != 6:
        raise ValueError(f"not a hex colour: {value}")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def to_hex(rgb):
    return "#%02x%02x%02x" % tuple(max(0, min(255, round(v))) for v in rgb)


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


def with_lightness(rgb, lightness):
    r, g, b = [v / 255 for v in rgb]
    h, _, s = colorsys.rgb_to_hls(r, g, b)
    return tuple(v * 255 for v in colorsys.hls_to_rgb(h, lightness, s))


def fit(colour, foreground, target):
    """Move lightness until `foreground` clears `target` on `colour`.

    Direction is chosen by which way actually helps: a light foreground needs
    a darker background, a dark one needs lighter. Guessing the direction is
    how a 'darken muted text' fix once doubled the failures (ADR-151).
    """
    base = to_rgb(colour)
    fg = to_rgb(foreground)

    if ratio(fg, base) >= target:
        return base, ratio(fg, base), 0

    r, g, b = [v / 255 for v in base]
    _, l0, _ = colorsys.rgb_to_hls(r, g, b)
    step = -0.004 if luminance(fg) > 0.5 else 0.004

    lightness = l0
    for _ in range(250):
        lightness += step
        if not 0.0 <= lightness <= 1.0:
            break
        candidate = with_lightness(base, lightness)
        if ratio(fg, candidate) >= target:
            return candidate, ratio(fg, candidate), lightness - l0

    raise SystemExit(
        f"  cannot reach {target} for {foreground} on {colour} by lightness "
        f"alone — the hue may need to change, which is a design decision")


def twin(light_tint, surface):
    """A dark-mode counterpart of a light tint: same hue, separated from the
    dark surface by about as much as the light tint is from white."""
    base = to_rgb(light_tint)
    surf = to_rgb(surface)

    r, g, b = [v / 255 for v in base]
    h, _, s = colorsys.rgb_to_hls(r, g, b)
    saturation = min(s, 0.35) if s > 0 else 0

    _, l_surf, _ = colorsys.rgb_to_hls(*[v / 255 for v in surf])

    lightness = l_surf
    for _ in range(250):
        lightness += 0.004
        candidate = tuple(v * 255 for v in colorsys.hls_to_rgb(h, lightness, saturation))
        if ratio(candidate, surf) >= STRIPE_SEPARATION:
            return candidate, ratio(candidate, surf)

    raise SystemExit(f"  cannot separate a twin of {light_tint} from {surface}")


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)

    f = sub.add_parser("fit", help="move lightness until a foreground is readable")
    f.add_argument("colour")
    f.add_argument("--on", default="#ffffff", help="foreground painted on it")
    f.add_argument("--target", type=float, default=AA_TEXT + 0.1)

    t = sub.add_parser("twin", help="derive a dark-mode counterpart of a light tint")
    t.add_argument("colour")
    t.add_argument("--surface", default="#161f2e", help="the dark surface beneath it")

    c = sub.add_parser("check", help="report the contrast between two colours")
    c.add_argument("a")
    c.add_argument("b")

    args = ap.parse_args()

    if args.cmd == "fit":
        out, got, delta = fit(args.colour, args.on, args.target)
        before = ratio(to_rgb(args.on), to_rgb(args.colour))
        if delta == 0:
            print(f"  {args.colour} already clears {args.target} ({before:.2f}) "
                  f"for {args.on} — unchanged")
        else:
            print(f"  {args.colour} -> {to_hex(out)}   "
                  f"{args.on} contrast {before:.2f} -> {got:.2f}")

    elif args.cmd == "twin":
        out, sep = twin(args.colour, args.surface)
        print(f"  {args.colour} -> {to_hex(out)}   "
              f"separation from {args.surface}: {sep:.3f}")

    else:
        print(f"  {ratio(to_rgb(args.a), to_rgb(args.b)):.2f}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
