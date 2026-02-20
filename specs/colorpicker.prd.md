<!-- AGENT: Product Requirements Document for the ColorPicker component — canvas-based color selection with hex/RGB/HSL formats, swatches, and popup/inline modes. -->

# ColorPicker Component

**Status:** Draft
**Component name:** ColorPicker
**Folder:** `./components/colorpicker/`
**Spec author:** Agent
**Date:** 2026-02-20

---

## 1. Overview

### 1.1 What Is It

A color selection control combining a canvas-based saturation/brightness gradient, a vertical hue strip, an optional opacity slider, text inputs for hex/RGB/HSL formats, and configurable preset swatches. Operates in two modes: **inline** (rendered in-place) and **popup** (attached to a trigger button, like the DatePicker). All color math (hex/RGB/HSL conversions) is implemented internally -- no external color libraries.

### 1.2 Why Build It

Enterprise SaaS applications need color selection for theming, branding, data visualization, and user personalization. Bootstrap 5 provides no color picker, and the native `<input type="color">` lacks opacity support, format switching, preset swatches, and a programmatic API.

### 1.3 Design Inspiration

| Source | Key Pattern Adopted |
|--------|---------------------|
| Chrome DevTools Color Picker | Saturation/brightness square + vertical hue strip, format tabs |
| VS Code Color Picker | Inline swatch preview, compact layout, opacity slider |
| Figma Color Picker | Clean gradient canvas, hex/RGB/HSL tabs, preset swatches |
| Canva Theme Editor | Swatch grid for brand colours, copy-to-clipboard |
| Shopify Theme Editor | Popup trigger with colour preview, format toggle |

---

## 2. Anatomy

```
Popup mode trigger:
  [## #3B82F6 v]  <-- trigger button: color swatch + hex label + caret

Picker panel (shared by popup and inline modes):
  +------------------------------+
  |  +--------------------+  +-+ |
  |  |                    |  |H| |  <-- Hue strip (vertical canvas, 0-360 deg)
  |  |  Saturation /      |  |u| |
  |  |  Brightness        |  |e| |
  |  |  Canvas            |  | | |
  |  |        o           |  | | |  <-- crosshair cursor on canvas
  |  +--------------------+  +-+ |
  |  +--------------------------+|
  |  | #### Opacity slider      ||  <-- optional (showOpacity: true)
  |  +--------------------------+|
  |  +------+  +----------------+|
  |  | Old  |  | New            ||  <-- preview: previous vs current colour
  |  +------+  +----------------+|
  |  [Hex] [RGB] [HSL]          |  <-- format tabs
  |  # [3B82F6          ] [copy]|  <-- text input + clipboard button
  |                              |
  |  o o o o o o o o o o         |  <-- preset swatches (from swatches[])
  |  o o o o o o o o o o         |
  +------------------------------+
```

---

## 3. API

### 3.1 Interfaces

```typescript
interface ColorPickerOptions
{
    /** Initial color (hex string). Default: "#3B82F6". */
    value?: string;
    /** Output format for getValue(). Default: "hex". */
    format?: "hex" | "rgb" | "hsl";
    /** Show alpha/opacity slider. Default: false. */
    showOpacity?: boolean;
    /** Show hex/RGB/HSL format tabs. Default: true. */
    showFormatTabs?: boolean;
    /** Show text input fields. Default: true. */
    showInputs?: boolean;
    /** Preset swatch colours (hex strings). */
    swatches?: string[];
    /** Render inline (true) or popup (false). Default: false. */
    inline?: boolean;
    /** Popup position relative to trigger. Default: "bottom-start". */
    popupPosition?: "bottom-start" | "bottom-end" | "top-start" | "top-end";
    /** Custom trigger element (popup mode only). */
    triggerElement?: HTMLElement;
    /** Disable the component. Default: false. */
    disabled?: boolean;
    /** Size variant. Default: "default". */
    size?: "sm" | "default" | "lg";
    /** Fired on colour change. */
    onChange?: (color: string, alpha?: number) => void;
    /** Fired when popup opens. */
    onOpen?: () => void;
    /** Fired when popup closes. */
    onClose?: () => void;
}
```

### 3.2 Class Methods

| Method | Description |
|--------|-------------|
| `constructor(options?)` | Creates the component. Does not attach to the DOM. |
| `show(containerId)` | Renders into the specified container element. |
| `hide()` | Removes from the DOM. |
| `destroy()` | Hides, removes listeners, nulls references, releases canvas contexts. |
| `getValue()` | Returns colour string in the configured `format`. |
| `getValueWithAlpha()` | Returns colour with alpha, e.g. `"rgba(59, 130, 246, 0.8)"`. |
| `setValue(color)` | Sets colour programmatically. Accepts hex, `rgb()`, or `hsl()`. |
| `getAlpha()` | Returns alpha as a number 0-1. |
| `setAlpha(a)` | Sets alpha (clamped 0-1). |
| `open()` | Opens popup (no-op in inline mode). |
| `close()` | Closes popup (no-op in inline mode). |
| `getElement()` | Returns the root DOM element. |
| `enable()` | Enables the component. |
| `disable()` | Disables the component; closes popup if open. |

### 3.3 Globals

```typescript
window.ColorPicker = ColorPicker;
window.createColorPicker = createColorPicker;
```

`createColorPicker(containerId, options?)` is a convenience function that creates and shows in one call.

---

## 4. Behaviour

### 4.1 Lifecycle

1. **Construction** -- Builds DOM tree and canvas contexts; does not attach to the page.
2. **show(containerId)** -- Appends root element to the container.
3. **hide()** -- Removes root element from the DOM.
4. **destroy()** -- Calls `hide()`, releases canvas contexts, removes listeners, nulls references.

### 4.2 Colour Conversions

Colour is stored internally as HSL + alpha. Four conversion functions are implemented without external libraries: `hexToRgb` (~15 lines), `rgbToHsl` (~25 lines), `hslToRgb` (~25 lines), `rgbToHex` (~5 lines).

### 4.3 Canvas Rendering

**Saturation/Brightness Canvas:** Fill with current hue, overlay white-to-transparent gradient horizontally, overlay transparent-to-black gradient vertically, draw crosshair circle at current position.

**Hue Strip Canvas:** Vertical gradient cycling 0-360 hue degrees, horizontal indicator at current hue.

Both canvases use `requestAnimationFrame` to throttle redraws during drag operations.

### 4.4 Interaction

- **Palette/Hue/Opacity:** Mousedown starts drag, mousemove updates value, mouseup ends. Touch events mirror mouse.
- **Swatches:** Click selects immediately.
- **Popup:** Trigger click toggles open/closed. Outside click closes. Positioned via `getBoundingClientRect()` with viewport-overflow flipping.
- **Text inputs:** Hex validates on blur/Enter (accepts `#RRGGBB` or `RRGGBB`; invalid reverts). RGB fields clamp 0-255. HSL fields clamp H: 0-360, S/L: 0-100.
- **Copy button:** `navigator.clipboard.writeText()` with 1.5s checkmark confirmation.
- **Previous colour:** Stored on popup open (or inline init). Left preview swatch shows it; clicking reverts.

---

## 5. Styling

### 5.1 CSS Classes (`.colorpicker-` prefix)

| Class | Element |
|-------|---------|
| `.colorpicker` | Root container |
| `.colorpicker-sm` / `.colorpicker-lg` | Size variants |
| `.colorpicker-trigger` | Popup trigger button |
| `.colorpicker-trigger-swatch` | Colour preview square in trigger |
| `.colorpicker-trigger-label` | Hex text in trigger |
| `.colorpicker-panel` | Picker panel |
| `.colorpicker-canvas-area` | Flex row: palette + hue strip |
| `.colorpicker-palette` | Saturation/brightness `<canvas>` |
| `.colorpicker-palette-cursor` | Crosshair indicator |
| `.colorpicker-hue-strip` | Hue `<canvas>` |
| `.colorpicker-hue-indicator` | Hue position indicator |
| `.colorpicker-opacity-bar` | Opacity slider container (checkerboard bg) |
| `.colorpicker-opacity-track` | Gradient track |
| `.colorpicker-opacity-thumb` | Draggable thumb |
| `.colorpicker-preview` | Preview row |
| `.colorpicker-preview-old` / `-new` | Previous / current colour swatch |
| `.colorpicker-tabs` | Format tab row |
| `.colorpicker-tab` / `.colorpicker-tab-active` | Tab button / active state |
| `.colorpicker-input-row` | Text input row |
| `.colorpicker-input` | Text input field |
| `.colorpicker-copy-btn` | Clipboard button |
| `.colorpicker-swatches` | Swatch grid |
| `.colorpicker-swatch` / `.colorpicker-swatch-selected` | Swatch circle / selected |
| `.colorpicker-disabled` | Disabled state |

### 5.2 Theme Integration

- Background: `$gray-50` | Border: `$gray-300` | Text: `$gray-900` | Muted: `$gray-600`
- Tab active: `$primary` bg, `$gray-50` text | Tab inactive: `$gray-200` bg
- Inputs: Bootstrap `form-control` styling | Focus ring: `$input-focus-box-shadow`
- Never use `$white` or `$black` directly. SCSS import: `@import '../../src/scss/variables';`
- Popup `z-index: 1050` (same level as modals).

---

## 6. Keyboard Interaction

| Context | Key | Action |
|---------|-----|--------|
| General | `Tab` | Navigate between palette, hue, opacity, tabs, inputs, swatches |
| General | `Escape` | Close popup; return focus to trigger |
| Palette | `Arrow keys` | Move saturation/brightness by 1% per axis |
| Palette | `Shift+Arrow` | Move by 10% |
| Hue strip | `ArrowUp`/`Down` | Change hue by 1 degree |
| Hue strip | `Shift+ArrowUp`/`Down` | Change hue by 10 degrees |
| Opacity | `ArrowLeft`/`Right` | Change alpha by 1% |
| Opacity | `Shift+Arrow` | Change alpha by 10% |
| Swatch | `Enter`/`Space` | Select swatch colour |
| Swatch | `Arrow keys` | Navigate between swatches |
| Text input | `Enter` | Apply typed value |

---

## 7. Accessibility

| Element | Attributes |
|---------|------------|
| Palette canvas | `role="slider"`, `aria-label="Color saturation and brightness"`, `aria-valuenow` (brightness %), `tabindex="0"` |
| Hue strip | `role="slider"`, `aria-label="Hue"`, `aria-valuenow` (0-360), `aria-valuemin="0"`, `aria-valuemax="360"`, `tabindex="0"` |
| Opacity slider | `role="slider"`, `aria-label="Opacity"`, `aria-valuenow` (0-100), `aria-valuemin="0"`, `aria-valuemax="100"`, `tabindex="0"` |
| Swatch grid | `role="listbox"`, `aria-label="Preset colors"` |
| Swatch item | `role="option"`, `aria-selected`, `aria-label` (hex value) |
| Format tabs | `role="tablist"` container; `role="tab"` + `aria-selected` per tab |
| Text inputs | `aria-label` per field (e.g. `"Hex color value"`, `"Red channel"`) |
| Popup trigger | `aria-haspopup="dialog"`, `aria-expanded` |
| Copy button | `aria-label="Copy hex value to clipboard"` |

A visually hidden `aria-live="polite"` region announces colour changes (e.g. "Selected colour: #3B82F6"). Panel meets WCAG AA contrast: `$gray-900` text on `$gray-50` background.

---

## 8. Dependencies

| Dependency | Required | Notes |
|------------|----------|-------|
| Bootstrap 5 CSS | Yes | `form-control`, `btn`, `input-group` base styles |
| Bootstrap 5 JS | No | No Bootstrap JS plugins used |
| Bootstrap Icons | Yes | `bi-clipboard`, `bi-check2`, `bi-caret-down-fill` |
| Enterprise Theme CSS | Yes | Theme variable overrides |
| Canvas 2D API | Yes | Built-in; palette and hue rendering |
| Clipboard API | Yes | Built-in; `navigator.clipboard.writeText()` |

No external colour libraries. All hex/RGB/HSL conversions implemented internally.

---

## 9. Open Questions

1. **EyeDropper API** -- Include a screen eyedropper button for browsers supporting `EyeDropperAPI`? Progressive enhancement, Chromium-only.
2. **Named CSS colours** -- Should the hex input accept names like `"red"` or `"cornflowerblue"`? Adds parsing complexity for marginal utility.
3. **Saved colours** -- Provide a "recent colours" row persisted via `localStorage`?
