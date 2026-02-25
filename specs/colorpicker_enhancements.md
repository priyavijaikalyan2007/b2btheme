<!-- AGENT: Progress file for ColorPicker enhancement request from Apps team. -->

# ColorPicker Enhancements — Progress

**Spec:** `specs/colorpicker.enhancement.txt`
**Requested by:** Apps team (Thinker, Diagrams)
**Date:** 2026-02-25
**Status:** Complete

## Enhancements Implemented

| # | Enhancement | Status | Notes |
|---|-------------|--------|-------|
| 1 | `onInput` real-time callback | Done | `onColorDragged()` for drag moves, `onColorChanged()` for commits |
| 2 | `label` option | Done | `label` in options + `setLabel()` method |
| 3 | `getPopupElement()` method | Done | Returns panelEl when open, null otherwise |
| 4 | Disabled visual state | Done | Enhanced SCSS + `aria-disabled` on trigger |

## Files Modified

- `components/colorpicker/colorpicker.ts` — options, DOM refs, drag split, new methods
- `components/colorpicker/colorpicker.scss` — `.colorpicker-label`, enhanced `.colorpicker-disabled`
- `components/colorpicker/README.md` — documented all 4 enhancements
- `demo/index.html` — 4 new demo sections (onInput, label, disabled popup, disabled inline)

## Key Design Decisions

- **Drag split pattern:** `onColorDragged()` fires `onInput` only during pointermove. `onColorChanged()` fires both `onInput` + `onChange` on pointerup/commit. This ensures `onInput` fires on every colour change and `onChange` fires only on commits.
- **Keyboard fires both:** Keyboard steps are discrete adjustments, so both `onInput` and `onChange` fire. This matches user expectations — each keypress is a commit.
- **Label element:** Uses `<label>` with `for` attribute pointing to instance ID. Prepended as first child of root element.
- **Disabled trigger pointer-events:** Set to `auto` so `cursor: not-allowed` displays, while parent `.colorpicker-disabled` has `pointer-events: none` for all other children.
