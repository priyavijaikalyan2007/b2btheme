# AnglePicker Component Specification

**Date**: 2026-03-13
**Priority**: Normal
**Category**: Pickers
**Primary use case**: Drop shadow angle selection in Diagrams app
**Secondary use cases**: Gradient direction, rotation controls, lighting angle

---

## 1. Overview

AnglePicker is a circular dial input for selecting an angle from 0 to 360 degrees.
It operates in two modes: **inline** (dial always visible, for property panels) and
**dropdown** (compact trigger button that opens a popover dial, for toolbars).

The dial starts at 0° on the positive x-axis (3 o'clock position) and increases
clockwise, matching CSS/SVG angle conventions. Dragging past 0°/360° wraps
seamlessly in both directions.

---

## 2. Visual Anatomy

### Inline Mode
```
            90°
             │
        ┆  ──┼──  ┆
      ╱  ┆   │   ┆  ╲
   ╱     ┆   │   ┆     ╲
180°─────── [225°] ────────0°
   ╲     ┆   │   ┆     ╱
      ╲  ┆   │   ┆  ╱
        ┆  ──┼──  ┆
             │
           270°
```

- **Outer ring**: circular track with tick marks
- **Knob**: draggable indicator on the ring
- **Center**: numeric input showing current value (editable)
- **Needle**: line from center to knob showing current angle visually
- **Tick marks**: at every 15° (24 total); major at 0/90/180/270, semi-major at 45/135/225/315, minor at all other 15° multiples

### Dropdown Mode
- **Trigger button**: shows a mini dial preview (or numeric value) + caret
- **Popover**: contains the full dial with same anatomy as inline

### Optional Shadow Preview
- Small square element beside/below the dial showing a live CSS `box-shadow` at the selected angle
- Toggle via `showPreview` option

### Optional Cardinal Labels
- Display mode for tick marks: `none` (default), `degrees` (0°/90°/180°/270°), or `compass` (E/N/W/S)

---

## 3. Interaction Model

### Pointer (mouse/touch)
| Action | Behavior |
|--------|----------|
| Click on track | Snap knob to that angle |
| Click + drag knob | Continuous rotation (no snap) |
| Click + drag anywhere on dial area | Same as knob drag (generous hit zone) |
| Shift + click/drag | Snap to nearest `snapStep` increment |
| Double-click center readout | Select text for direct editing |

### Keyboard (when dial is focused)
| Key | Action |
|-----|--------|
| Left / Down arrow | Decrease by `step` (default 1°) |
| Right / Up arrow | Increase by `step` (default 1°) |
| Shift + arrow | Increase/decrease by `snapStep` (default 15°) |
| Home | Jump to 0° |
| End | Jump to 359° |
| Escape | Close dropdown (dropdown mode only) |
| Enter | Confirm typed value in center input |

### Dropdown mode additional keyboard
| Key | Action |
|-----|--------|
| ArrowDown (when trigger focused) | Open dropdown |
| Enter (when trigger focused) | Open dropdown |
| Escape | Close dropdown, return focus to trigger |
| Tab | Close dropdown, move focus forward |

---

## 4. API

### TypeScript Interface

```typescript
export interface AnglePickerOptions
{
    /** Initial angle in degrees (0-359). Default: 0. */
    value?: number;

    /** Display mode. Default: "inline". */
    mode?: "inline" | "dropdown";

    /** Size variant. Default: "md". */
    size?: "sm" | "md" | "lg";

    /** Arrow key step in degrees. Default: 1. */
    step?: number;

    /** Shift+drag / Shift+arrow snap increment. Default: 15. */
    snapStep?: number;

    /** Show tick marks on the dial. Default: true. */
    showTicks?: boolean;

    /** Tick label display: "none", "degrees", "compass". Default: "none". */
    tickLabels?: "none" | "degrees" | "compass";

    /** Show editable numeric input at center. Default: true. */
    showInput?: boolean;

    /** Show live shadow preview square. Default: false. */
    showPreview?: boolean;

    /** Shadow preview distance in px (how far the shadow is cast). Default: 6. */
    previewDistance?: number;

    /** Shadow preview blur in px. Default: 8. */
    previewBlur?: number;

    /** Shadow preview color. Default: "rgba(0,0,0,0.4)". */
    previewColor?: string;

    /** Disable the picker. Default: false. */
    disabled?: boolean;

    /** Callback fired on angle change. */
    onChange?: (angle: number) => void;

    /** Callback fired when dropdown opens (dropdown mode only). */
    onOpen?: () => void;

    /** Callback fired when dropdown closes (dropdown mode only). */
    onClose?: () => void;
}
```

### Class API

```typescript
export class AnglePicker
{
    constructor(containerId: string, options?: AnglePickerOptions);

    /** Get current angle (0-359). */
    public getValue(): number;

    /** Set angle programmatically. */
    public setValue(angle: number): void;

    /** Open dropdown (dropdown mode only). */
    public open(): void;

    /** Close dropdown (dropdown mode only). */
    public close(): void;

    /** Enable the picker. */
    public enable(): void;

    /** Disable the picker. */
    public disable(): void;

    /** Get the root DOM element. */
    public getElement(): HTMLElement;

    /** Tear down and remove from DOM. */
    public destroy(): void;
}
```

### Factory Function

```typescript
export function createAnglePicker(
    containerId: string,
    options?: AnglePickerOptions
): AnglePicker;
```

---

## 5. Size Variants

| Size | Dial diameter | Trigger width (dropdown) |
|------|--------------|-------------------------|
| `sm` | 80px | 48px |
| `md` | 120px | 64px |
| `lg` | 160px | 80px |

---

## 6. Dark Mode

- All colors via `var(--theme-*)` CSS custom properties
- SVG stroke/fill use `currentColor` where possible
- Knob, needle, ticks adapt to theme automatically
- Shadow preview square uses `var(--theme-surface)` background

---

## 7. Accessibility

- `role="slider"` on the dial element
- `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="359"`
- `aria-label="Angle picker"` (customizable)
- Center input has `aria-label="Angle in degrees"`
- Full keyboard navigation per Section 3

---

## 8. CSS Classes

| Class | Element |
|-------|---------|
| `.anglepicker` | Root wrapper |
| `.anglepicker-dial` | SVG dial container |
| `.anglepicker-track` | Circular track ring |
| `.anglepicker-knob` | Draggable knob on track |
| `.anglepicker-needle` | Line from center to knob |
| `.anglepicker-tick` | Individual tick mark |
| `.anglepicker-tick--major` | Major tick (0/90/180/270) |
| `.anglepicker-tick--semi` | Semi-major tick (45/135/225/315) |
| `.anglepicker-tick-label` | Cardinal/degree label text |
| `.anglepicker-input` | Center numeric input |
| `.anglepicker-preview` | Shadow preview square |
| `.anglepicker-trigger` | Dropdown trigger button |
| `.anglepicker-dropdown` | Dropdown popover container |
| `.anglepicker--sm/--md/--lg` | Size modifier |
| `.anglepicker--inline` | Inline mode modifier |
| `.anglepicker--dropdown` | Dropdown mode modifier |
| `.anglepicker--disabled` | Disabled state |
| `.anglepicker--open` | Dropdown open state |

---

## 9. File Structure

```
components/anglepicker/
    anglepicker.ts      # TypeScript source
    anglepicker.scss    # Styles
    README.md           # Component documentation
```

---

## 10. Implementation Notes

- SVG-based rendering for the dial (consistent with other picker components)
- Math: angle from pointer uses `Math.atan2(dy, dx)`, converted to clockwise degrees
- Pointer events: `pointerdown` on dial area starts drag, `pointermove` on document updates angle, `pointerup` ends drag. Use `setPointerCapture` for reliable tracking.
- Value normalization: all angles stored as 0-359 integers internally, wrapping via `((angle % 360) + 360) % 360`
- Shadow preview CSS: `box-shadow: ${dx}px ${dy}px ${blur}px ${color}` where dx/dy computed from angle and distance
- Snap-on-shift: during drag, check `event.shiftKey`; if true, round to nearest `snapStep`
