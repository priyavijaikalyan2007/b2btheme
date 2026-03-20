# GradientPicker — PRD & Technical Specification

> **Status:** Draft
> **Author:** Claude (agent)
> **Date:** 2026-03-20
> **ADR:** TBD (ADR-087 candidate)

---

## 1. Goal

Build a production-ready gradient colour picker component that enables users to
create, edit, and preview linear and radial gradients with full alpha support.
The component composes the existing ColorPicker and AnglePicker components for
stop colour and angle editing, following the project's composition pattern.

**Primary consumers:** DiagramEngine (fill, stroke, border gradients), Ribbon
toolbar (Edge tab, Shape tab), and any app requiring gradient configuration.

---

## 2. Requirements

### 2.1 Functional

| # | Requirement |
|---|-------------|
| F1 | Support **linear** and **radial** gradient types |
| F2 | Configurable **gradient stops** — each with position (0–1), colour (hex/rgba), and alpha (0–1) |
| F3 | **Draggable stop handles** on a gradient preview bar — click to add, drag to reposition, right-click or delete key to remove |
| F4 | Clicking a stop's colour swatch opens the full **ColorPicker** with `showOpacity: true` for per-stop alpha editing |
| F5 | **Angle control** for linear gradients via embedded **AnglePicker** (dropdown mode) |
| F6 | **Centre point** and **radius** controls for radial gradients |
| F7 | Configurable **min/max stop count** (default 2–8) |
| F8 | **Preset gradients** (optional swatch row) |
| F9 | **Inline** and **popup** display modes |
| F10 | **Size variants**: mini, sm, default, lg — all four matching existing picker conventions |
| F11 | **Clear gradient** action to reset to no gradient |
| F12 | **Reverse** button to flip all stop positions |
| F13 | **Live CSS preview** bar showing the gradient as rendered |
| F14 | Full **keyboard navigation** for accessibility |

### 2.2 Non-Functional

| # | Requirement |
|---|-------------|
| NF1 | Vanilla TypeScript, IIFE-wrapped, no bundler required |
| NF2 | Composes ColorPicker and AnglePicker at runtime via `window` factory lookup |
| NF3 | Graceful degradation — works without AnglePicker (falls back to numeric input) |
| NF4 | WCAG AA accessible — keyboard operable, screen reader announced |
| NF5 | Theme-native — uses `var(--theme-*)` tokens, supports dark mode |
| NF6 | Functions under 30 lines, Allman brace style, 4-space indent |

---

## 3. Data Model

### 3.1 GradientStop

```typescript
export interface GradientStop
{
    /** Position along the gradient axis. 0.0 = start, 1.0 = end. */
    position: number;

    /** Colour in hex (#RRGGBB) or rgba string. */
    color: string;

    /** Opacity for this stop. 0.0 = transparent, 1.0 = opaque. Default: 1.0. */
    alpha: number;
}
```

### 3.2 GradientValue

```typescript
export interface GradientValue
{
    /** Gradient interpolation type. */
    type: "linear" | "radial";

    /** Ordered colour stops (minimum 2). */
    stops: GradientStop[];

    /** Angle in degrees for linear gradients (0 = right, 90 = down). */
    angle: number;

    /** Centre point for radial gradients (0–1 normalised). */
    center: { x: number; y: number };

    /** Radius for radial gradients (0–1 normalised). */
    radius: number;
}
```

### 3.3 Compatibility with DiagramEngine

`GradientValue` maps directly to `GradientDefinition`:

| GradientValue | GradientDefinition |
|---------------|-------------------|
| `type` | `type` |
| `stops[].position` | `stops[].offset` |
| `stops[].color` + `stops[].alpha` | `stops[].color` (as rgba string) |
| `angle` | `angle` |
| `center` | `center` |
| `radius` | `radius` |

Conversion helpers `toGradientDefinition()` and `fromGradientDefinition()` are
provided as static methods on the component.

---

## 4. Public API

### 4.1 Factory Function

```typescript
export function createGradientPicker(
    containerId: string,
    options: GradientPickerOptions
): GradientPicker;
```

### 4.2 Options Interface

```typescript
export interface GradientPickerOptions
{
    /** Initial gradient value. */
    value?: Partial<GradientValue>;

    /** Display mode. Default: "popup". */
    mode?: "inline" | "popup";

    /** Size variant. Default: "default". */
    size?: "mini" | "sm" | "default" | "lg";

    /** Popup position relative to trigger. Default: "bottom-start". */
    popupPosition?: "bottom-start" | "bottom-end" | "top-start" | "top-end";

    /** Minimum number of stops. Default: 2. */
    minStops?: number;

    /** Maximum number of stops. Default: 8. */
    maxStops?: number;

    /** Show gradient type toggle (linear/radial). Default: true. */
    showTypeToggle?: boolean;

    /** Show angle control (linear mode). Default: true. */
    showAngle?: boolean;

    /** Show centre/radius controls (radial mode). Default: true. */
    showRadialControls?: boolean;

    /** Show reverse button. Default: true. */
    showReverse?: boolean;

    /** Show clear button. Default: true. */
    showClear?: boolean;

    /** Preset gradient swatches. */
    presets?: GradientPreset[];

    /** Disable the component. Default: false. */
    disabled?: boolean;

    /** Label text above the picker. */
    label?: string;

    /** Fires on any gradient change (stops, angle, type, center, radius). */
    onChange?: (value: GradientValue) => void;

    /** Fires continuously during drag operations. */
    onInput?: (value: GradientValue) => void;

    /** Fires when gradient is cleared. */
    onClear?: () => void;

    /** Fires when popup opens. */
    onOpen?: () => void;

    /** Fires when popup closes. */
    onClose?: () => void;
}

export interface GradientPreset
{
    /** Display name for tooltip. */
    name: string;

    /** Gradient definition for this preset. */
    value: GradientValue;
}
```

### 4.3 Instance Methods

```typescript
export interface GradientPicker
{
    /** Get the current gradient value. */
    getValue(): GradientValue;

    /** Set the gradient programmatically. */
    setValue(value: Partial<GradientValue>): void;

    /** Get stops only. */
    getStops(): GradientStop[];

    /** Set stops only (preserves type, angle, etc.). */
    setStops(stops: GradientStop[]): void;

    /** Get the angle (linear mode). */
    getAngle(): number;

    /** Set the angle (linear mode). */
    setAngle(angle: number): void;

    /** Get the gradient type. */
    getType(): "linear" | "radial";

    /** Set the gradient type. */
    setType(type: "linear" | "radial"): void;

    /** Reverse all stop positions (1 - position). */
    reverse(): void;

    /** Clear gradient (reset to default two-stop). */
    clear(): void;

    /** Convert current value to DiagramEngine GradientDefinition. */
    toGradientDefinition(): GradientDefinition;

    /** Load from a DiagramEngine GradientDefinition. */
    fromGradientDefinition(def: GradientDefinition): void;

    /** Open popup (popup mode only). */
    open(): void;

    /** Close popup (popup mode only). */
    close(): void;

    /** Enable the component. */
    enable(): void;

    /** Disable the component. */
    disable(): void;

    /** Get root DOM element. */
    getElement(): HTMLElement | null;

    /** Tear down and clean up. */
    destroy(): void;
}
```

---

## 5. Visual Design

### 5.1 Layout — Inline Mode (default size)

```
┌─────────────────────────────────────────────────────┐
│  [Linear ▼]  [↻ Reverse]  [✕ Clear]                │  ← Type toggle + actions
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│    │  ← Gradient preview bar
│  └─────────────────────────────────────────────┘    │
│    ◆────────────◆──────────────────◆                │  ← Draggable stop handles
│    0%          45%                100%               │
│                                                     │
├─────────────────────────────────────────────────────┤
│  Stop: ■ #FF0000  α 100%   Position: [45] %        │  ← Selected stop editor
├─────────────────────────────────────────────────────┤
│  Angle: [⊙ 135°]                                   │  ← AnglePicker (linear)
│  — or —                                             │
│  Centre: X [0.5] Y [0.5]  Radius: [0.5]            │  ← Radial controls
├─────────────────────────────────────────────────────┤
│  [Sunset] [Ocean] [Grayscale] [Rainbow] [...]       │  ← Preset swatches
└─────────────────────────────────────────────────────┘
```

### 5.2 Layout — Popup Mode

Trigger button shows a small gradient preview swatch (like ColorPicker's
colour swatch trigger). Clicking opens a dropdown panel with the full
inline layout above.

```
┌──────────┐
│ ▓▓▓▓▓▓▓▓ │  ← Trigger: gradient preview swatch
└──────────┘
     │
     ▼
┌──────────────────────────────────────────┐
│  (Full inline layout as above)           │
└──────────────────────────────────────────┘
```

### 5.3 Layout — Mini Size (Ribbon)

Compact single-row trigger. The popup panel uses the default size layout
regardless of the trigger size (same pattern as ColorPicker mini).

```
┌────────┐
│▓▓▓▓▓▓▓▓│  ← 22px height, gradient preview
└────────┘
```

### 5.4 Gradient Preview Bar

- Height: 24px (default), 16px (sm/mini), 32px (lg)
- Renders the live gradient using CSS `background: linear-gradient(...)` or
  `background: radial-gradient(...)`
- Checkerboard pattern behind to visualise alpha transparency
- Border: 1px solid `var(--theme-border-color)`

### 5.5 Stop Handles

- Diamond-shaped (◆) markers below the preview bar
- Size: 12×12px (default), 8×8px (mini/sm), 14×14px (lg)
- Fill: the stop's colour
- Border: 2px solid white (with 1px dark outer ring for contrast)
- Selected stop: highlighted ring (primary colour)
- Hover: cursor changes to `ew-resize`
- Minimum drag distance between stops: 1% to prevent overlap

### 5.6 Selected Stop Editor

When a stop handle is selected (clicked):

- **Colour swatch** — small rectangle showing stop colour. Click opens
  ColorPicker inline (below) or as popup, with `showOpacity: true`.
- **Position input** — numeric input (0–100) with `%` suffix. Clamped
  between adjacent stops. Arrow keys adjust by 1%, Shift+Arrow by 5%.

### 5.7 Preset Swatches

- Row of small gradient preview rectangles (32×18px each)
- Tooltip shows preset name on hover
- Click applies the preset (replaces all stops, type, and angle)
- Default presets (if none provided):

| Name | Stops |
|------|-------|
| Sunset | `#FF512F` 0% → `#F09819` 50% → `#DD2476` 100% |
| Ocean | `#2193B0` 0% → `#6DD5ED` 100% |
| Grayscale | `#000000` 0% → `#FFFFFF` 100% |
| Forest | `#134E5E` 0% → `#71B280` 100% |
| Berry | `#8E2DE2` 0% → `#4A00E0` 100% |
| Fire | `#F83600` 0% → `#F9D423` 100% |

---

## 6. Interactions

### 6.1 Stop Handle Interactions

| Action | Behaviour |
|--------|-----------|
| Click on bar (empty area) | Add new stop at click position with interpolated colour |
| Click on handle | Select the stop for editing |
| Drag handle | Reposition stop (clamped to 0–1, cannot pass adjacent stops) |
| Right-click handle | Remove stop (if above minStops) |
| Delete/Backspace on selected | Remove selected stop (if above minStops) |
| Double-click handle | Open ColorPicker for that stop |

### 6.2 Keyboard Navigation

| Key | Action |
|-----|--------|
| Tab | Move focus between: type toggle → preview bar → stop handles → position input → angle/radial controls → presets → action buttons |
| Left/Right on preview bar | Select prev/next stop handle |
| Left/Right on selected handle | Move stop position by 1% |
| Shift+Left/Right on handle | Move stop position by 5% |
| Enter/Space on handle | Open ColorPicker for the stop |
| Delete/Backspace on handle | Remove stop |
| Escape | Close ColorPicker or popup |

### 6.3 Type Toggle

- Dropdown or segmented button: `Linear` | `Radial`
- Switching type preserves stops and colours
- Linear → shows angle control, hides centre/radius
- Radial → shows centre/radius controls, hides angle
- Preview bar updates immediately

### 6.4 Angle Control (Linear)

- Embeds AnglePicker component (dropdown mode, size sm)
- If AnglePicker is not loaded (`window.createAnglePicker` undefined),
  falls back to a numeric `<input type="number">` with 0–359 range
- Changes update the preview bar in real time

### 6.5 Radial Controls

- **Centre X/Y**: two numeric inputs (0.00–1.00, step 0.01)
- **Radius**: numeric input (0.01–1.00, step 0.01)
- All three update the preview bar in real time

---

## 7. DOM Structure

```html
<div class="gradientpicker gradientpicker-{size}" id="{instanceId}">

  <!-- Popup trigger (popup mode only) -->
  <button class="gradientpicker-trigger" type="button">
    <span class="gradientpicker-trigger-swatch"
          style="background: linear-gradient(...)"></span>
    <i class="bi bi-chevron-down gradientpicker-chevron"></i>
  </button>

  <!-- Panel (always visible in inline, dropdown in popup) -->
  <div class="gradientpicker-panel">

    <!-- Header: type toggle + action buttons -->
    <div class="gradientpicker-header">
      <select class="gradientpicker-type form-select form-select-sm">
        <option value="linear">Linear</option>
        <option value="radial">Radial</option>
      </select>
      <button class="gradientpicker-reverse btn btn-sm" title="Reverse">
        <i class="bi bi-arrow-left-right"></i>
      </button>
      <button class="gradientpicker-clear btn btn-sm" title="Clear">
        <i class="bi bi-x-lg"></i>
      </button>
    </div>

    <!-- Gradient preview bar -->
    <div class="gradientpicker-preview">
      <div class="gradientpicker-preview-checker"></div>
      <div class="gradientpicker-preview-gradient"
           style="background: linear-gradient(...)"></div>
    </div>

    <!-- Stop handles track -->
    <div class="gradientpicker-track" role="listbox" aria-label="Gradient stops">
      <div class="gradientpicker-handle gradientpicker-handle-selected"
           role="option" aria-selected="true"
           style="left: 0%; background: #FF0000;"
           data-index="0" tabindex="0">
      </div>
      <!-- ... more handles ... -->
    </div>

    <!-- Selected stop editor -->
    <div class="gradientpicker-stop-editor">
      <button class="gradientpicker-stop-swatch"
              style="background: #FF0000;" title="Edit colour">
      </button>
      <label class="gradientpicker-stop-label">
        Position
        <input class="gradientpicker-stop-position form-control form-control-sm"
               type="number" min="0" max="100" value="0">
        <span>%</span>
      </label>
    </div>

    <!-- Angle control (linear) or centre/radius (radial) -->
    <div class="gradientpicker-controls">
      <!-- AnglePicker embedded here (linear mode) -->
      <div class="gradientpicker-angle" id="{instanceId}-angle"></div>
      <!-- OR radial controls -->
      <div class="gradientpicker-radial" style="display:none;">
        <label>X <input type="number" min="0" max="1" step="0.01"></label>
        <label>Y <input type="number" min="0" max="1" step="0.01"></label>
        <label>R <input type="number" min="0.01" max="1" step="0.01"></label>
      </div>
    </div>

    <!-- Preset swatches (optional) -->
    <div class="gradientpicker-presets" role="listbox" aria-label="Preset gradients">
      <button class="gradientpicker-preset"
              style="background: linear-gradient(...)"
              title="Sunset" role="option">
      </button>
      <!-- ... more presets ... -->
    </div>

    <!-- Embedded ColorPicker panel (shown when editing a stop) -->
    <div class="gradientpicker-colorpicker" id="{instanceId}-cp"></div>

  </div>
</div>
```

---

## 8. Composition Strategy

### 8.1 ColorPicker

- Looked up at init via `window.createColorPicker`
- Created once per GradientPicker instance, reused for all stops
- Options: `{ inline: true, showOpacity: true, showFormatTabs: false, size: "sm" }`
- Shown/hidden when stop is selected/deselected
- `onInput` updates the selected stop's colour and alpha in real time
- `onChange` commits the final colour

### 8.2 AnglePicker

- Looked up at init via `window.createAnglePicker`
- Created once, embedded in the angle controls section
- Options: `{ mode: "dropdown", size: "sm", showTicks: true, showInput: true }`
- `onChange` updates the gradient angle and preview bar
- Falls back to `<input type="number">` if not available

### 8.3 Dependency Loading

Both dependencies are optional. The GradientPicker works without them:

| Dependency | Available | Behaviour |
|-----------|-----------|-----------|
| ColorPicker | Yes | Full colour picker with alpha for each stop |
| ColorPicker | No | Simple `<input type="color">` + alpha slider |
| AnglePicker | Yes | Circular dial for angle selection |
| AnglePicker | No | `<input type="number" min="0" max="359">` |

---

## 9. Size Variants

| Size | Trigger Height | Preview Bar | Handle Size | Panel Width |
|------|---------------|-------------|-------------|-------------|
| `mini` | 22px | 16px | 8×8px | 260px |
| `sm` | 28px | 18px | 10×10px | 280px |
| `default` | 34px | 24px | 12×12px | 320px |
| `lg` | 42px | 32px | 14×14px | 380px |

Panel width applies to both inline and popup modes. In popup mode, the
trigger inherits the size variant height; the popup panel always uses
the width above regardless of trigger size.

---

## 10. CSS Custom Properties

The component uses theme tokens for styling:

```scss
.gradientpicker-panel {
    background: var(--theme-surface-bg);
    border: $border-width solid var(--theme-border-color);
    box-shadow: var(--theme-shadow-md);
}

.gradientpicker-preview {
    border: $border-width solid var(--theme-border-color);
    border-radius: $border-radius;
}

.gradientpicker-handle {
    border: 2px solid var(--theme-surface-bg);
    box-shadow: 0 0 0 1px var(--theme-border-color);
}

.gradientpicker-handle-selected {
    box-shadow: 0 0 0 2px var(--bs-primary);
}
```

---

## 11. Default Presets

When `presets` is not provided, these built-in presets are available:

```typescript
const DEFAULT_PRESETS: GradientPreset[] = [
    {
        name: "Sunset",
        value: { type: "linear", angle: 90,
            stops: [
                { position: 0, color: "#FF512F", alpha: 1 },
                { position: 0.5, color: "#F09819", alpha: 1 },
                { position: 1, color: "#DD2476", alpha: 1 }
            ], center: { x: 0.5, y: 0.5 }, radius: 0.5 }
    },
    {
        name: "Ocean",
        value: { type: "linear", angle: 135,
            stops: [
                { position: 0, color: "#2193B0", alpha: 1 },
                { position: 1, color: "#6DD5ED", alpha: 1 }
            ], center: { x: 0.5, y: 0.5 }, radius: 0.5 }
    },
    {
        name: "Grayscale",
        value: { type: "linear", angle: 90,
            stops: [
                { position: 0, color: "#000000", alpha: 1 },
                { position: 1, color: "#FFFFFF", alpha: 1 }
            ], center: { x: 0.5, y: 0.5 }, radius: 0.5 }
    },
    {
        name: "Forest",
        value: { type: "linear", angle: 135,
            stops: [
                { position: 0, color: "#134E5E", alpha: 1 },
                { position: 1, color: "#71B280", alpha: 1 }
            ], center: { x: 0.5, y: 0.5 }, radius: 0.5 }
    },
    {
        name: "Berry",
        value: { type: "linear", angle: 135,
            stops: [
                { position: 0, color: "#8E2DE2", alpha: 1 },
                { position: 1, color: "#4A00E0", alpha: 1 }
            ], center: { x: 0.5, y: 0.5 }, radius: 0.5 }
    },
    {
        name: "Fire",
        value: { type: "linear", angle: 0,
            stops: [
                { position: 0, color: "#F83600", alpha: 1 },
                { position: 1, color: "#F9D423", alpha: 1 }
            ], center: { x: 0.5, y: 0.5 }, radius: 0.5 }
    },
];
```

---

## 12. Testing Strategy

### 12.1 Unit Tests

| Group | Count | Coverage |
|-------|-------|----------|
| Factory & lifecycle | 6 | create, destroy, getElement, inline/popup modes |
| Stop management | 10 | add, remove, reposition, min/max enforcement, colour update, alpha |
| Gradient type | 4 | linear/radial toggle, controls visibility, preview update |
| Angle control | 4 | set/get angle, AnglePicker integration, fallback input |
| Radial controls | 4 | centre x/y, radius, preview update |
| Presets | 4 | apply preset, default presets, custom presets |
| Reverse/Clear | 4 | reverse positions, clear to default, onClear callback |
| Serialization | 4 | toGradientDefinition, fromGradientDefinition, round-trip |
| Events | 6 | onChange, onInput, onClear, onOpen, onClose |
| Keyboard | 6 | arrow keys, delete, enter, tab, escape |
| Size variants | 4 | mini, sm, default, lg |
| **Total** | **~56** | |

---

## 13. Implementation Plan

### Phase 1: Core Data Model + Preview Bar

1. Create `components/gradientpicker/` directory with `.ts`, `.scss`, `README.md`
2. Implement `GradientStop`, `GradientValue`, `GradientPickerOptions` interfaces
3. Build factory function and class skeleton
4. Render the gradient preview bar with CSS `linear-gradient`/`radial-gradient`
5. Render stop handles below the bar
6. Handle: click bar to add stop, click handle to select, drag handle to reposition

### Phase 2: Stop Editing + ColorPicker Composition

7. Build the selected stop editor (colour swatch + position input)
8. Compose ColorPicker for stop colour editing (with alpha)
9. Wire `onInput`/`onChange` between ColorPicker and stop state
10. Implement remove stop (right-click, delete key)

### Phase 3: Gradient Type + Controls

11. Add type toggle (linear/radial)
12. Compose AnglePicker for linear angle control (with fallback)
13. Add radial controls (centre x/y, radius inputs)
14. Update preview bar for radial gradient CSS

### Phase 4: Presets + Actions + Polish

15. Render preset swatches row
16. Implement reverse and clear actions
17. Add popup mode (trigger swatch + dropdown panel)
18. Add size variants (mini, sm, default, lg)
19. Full keyboard navigation
20. Conversion helpers (toGradientDefinition, fromGradientDefinition)

### Phase 5: Tests + Demo

21. Write Vitest unit tests (~56 tests)
22. Build standalone demo page
23. Add to demo index, COMPONENT_INDEX, MASTER_COMPONENT_LIST
24. Update agentknowledge files

---

## 14. Dependencies

| Dependency | Required | Purpose |
|-----------|----------|---------|
| ColorPicker | Optional (soft) | Per-stop colour + alpha editing |
| AnglePicker | Optional (soft) | Linear gradient angle control |
| Bootstrap 5 | Yes | Form controls, buttons, layout |
| Bootstrap Icons | Yes | Icons for reverse, clear, chevron |

---

## 15. Files

```
components/gradientpicker/
├── gradientpicker.ts        # Component source (~1200–1600 lines est.)
├── gradientpicker.scss      # Component styles (~200–300 lines est.)
├── gradientpicker.test.ts   # Vitest unit tests (~56 tests)
└── README.md                # Component API documentation
```
