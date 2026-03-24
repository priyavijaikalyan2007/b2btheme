# Rich Visual Picker Components — PRD

> **Status:** Draft
> **Date:** 2026-03-24
> **Reference:** Word/OneNote Layout tab ribbon controls

---

## 1. Overview

Six rich visual picker components designed for use inside Ribbon
toolbars, standalone toolbars, and property panels. Each renders
a dropdown or gallery with visual previews of the options.

| Component | CDN Slug | Purpose |
|-----------|----------|---------|
| Margins Picker | `marginspicker` | Page margin presets with visual page thumbnail |
| Orientation Picker | `orientationpicker` | Portrait/Landscape with page icon |
| Sizes Picker | `sizespicker` | Page size presets with proportional thumbnails |
| Tool Color Picker | `toolcolorpicker` | Pen/marker/pencil color swatches |
| Columns Picker | `columnspicker` | Column layout presets with visual preview |
| Spacing Picker | `spacingpicker` | Line/paragraph spacing presets |

---

## 2. Margins Picker

### 2.1 Purpose

Dropdown showing page margin presets, each with a small page
thumbnail illustrating where the margins are, plus exact values.

### 2.2 Configuration

```typescript
interface MarginsPickerOptions
{
    /** Container element or ID. */
    container: HTMLElement | string;

    /** Initial selected preset name. Default: "Normal". */
    value?: string;

    /** Custom preset definitions. Overrides defaults if provided. */
    presets?: MarginPreset[];

    /** Show "Custom Margins..." link at bottom. Default: true. */
    showCustom?: boolean;

    /** Callback when a preset is selected. */
    onChange?: (preset: MarginPreset) => void;

    /** Callback when "Custom Margins..." is clicked. */
    onCustom?: () => void;

    /** Render as ribbon-compatible dropdown. Default: true. */
    ribbonMode?: boolean;
}

interface MarginPreset
{
    name: string;
    top: number;      // inches or px
    bottom: number;
    left: number;
    right: number;
    /** For mirrored margins: inside/outside instead of left/right. */
    inside?: number;
    outside?: number;
    icon?: string;     // Optional Bootstrap icon override
}
```

### 2.3 Default Presets

| Name | Top | Bottom | Left | Right |
|------|-----|--------|------|-------|
| Normal | 1" | 1" | 1" | 1" |
| Narrow | 0.5" | 0.5" | 0.5" | 0.5" |
| Moderate | 1" | 1" | 0.75" | 0.75" |
| Wide | 1" | 1" | 2" | 2" |
| Mirrored | 1" | 1" | Inside: 1.25" | Outside: 1" |
| None | 0" | 0" | 0" | 0" |

### 2.4 Visual Rendering

Each preset item renders:
```
┌─────────────────────────────────┐
│ [page thumbnail]  Normal        │
│  ┌──────────┐     Top:    1"    │
│  │  ┌────┐  │     Bottom: 1"   │
│  │  │    │  │     Left:   1"   │
│  │  └────┘  │     Right:  1"   │
│  └──────────┘                   │
└─────────────────────────────────┘
```

The page thumbnail is a small SVG (40x52px) showing:
- Outer rectangle (page border)
- Inner rectangle (content area within margins)
- Dashed lines showing margin boundaries

### 2.5 Public API

```typescript
interface MarginsPicker
{
    getValue(): MarginPreset;
    setValue(presetName: string): void;
    setPresets(presets: MarginPreset[]): void;
    show(): void;
    hide(): void;
    destroy(): void;
    getElement(): HTMLElement;
}
```

---

## 3. Orientation Picker

### 3.1 Purpose

Simple dropdown with Portrait and Landscape options, each showing
a page icon in the corresponding orientation.

### 3.2 Configuration

```typescript
interface OrientationPickerOptions
{
    container: HTMLElement | string;
    value?: "portrait" | "landscape";  // Default: "portrait"
    onChange?: (orientation: "portrait" | "landscape") => void;
    ribbonMode?: boolean;
}
```

### 3.3 Visual Rendering

```
┌───────────────────┐
│ 📄 Portrait       │  (tall page icon)
│ 📄 Landscape      │  (wide page icon, rotated)
└───────────────────┘
```

Page icons are small SVG rectangles (24x32 for portrait, 32x24 for
landscape) with a subtle page fold in the corner.

### 3.4 Public API

```typescript
interface OrientationPicker
{
    getValue(): "portrait" | "landscape";
    setValue(orientation: "portrait" | "landscape"): void;
    destroy(): void;
    getElement(): HTMLElement;
}
```

---

## 4. Sizes Picker

### 4.1 Purpose

Dropdown listing page/frame sizes with proportional page thumbnails
and dimensions. Maps to the DiagramEngine's `PAGE_FRAME_SIZES`.

### 4.2 Configuration

```typescript
interface SizesPickerOptions
{
    container: HTMLElement | string;
    value?: string;                    // Default: "A4 Portrait"
    sizes?: SizePreset[];             // Override default list
    category?: string;                // Filter to one category
    showCustom?: boolean;             // Default: true
    onChange?: (size: SizePreset) => void;
    onCustom?: () => void;
    ribbonMode?: boolean;
}

interface SizePreset
{
    name: string;
    width: number;          // pixels at 96 DPI
    height: number;
    category?: string;      // "Paper", "Screen", "Mobile", etc.
    displayWidth?: string;  // "8.5\"" for human display
    displayHeight?: string; // "11\""
}
```

### 4.3 Default Sizes

Loaded from `PAGE_FRAME_SIZES` constant (already defined in the
DiagramEngine page-frames module). Consumer can also pass custom
sizes.

### 4.4 Visual Rendering

Each size item renders:
```
┌────────────────────────────┐
│ [proportional   Letter     │
│  page rect]     8.5" x 11" │
└────────────────────────────┘
```

The page rectangle is proportionally scaled (tallest page ≈ 40px
tall, widths scaled relative to height). Category headers separate
groups (Paper, Screen, Mobile, etc.).

### 4.5 Public API

```typescript
interface SizesPicker
{
    getValue(): SizePreset;
    setValue(sizeName: string): void;
    setSizes(sizes: SizePreset[]): void;
    destroy(): void;
    getElement(): HTMLElement;
}
```

---

## 5. Tool Color Picker

### 5.1 Purpose

A visual colour picker that displays colours as tool icons
(pens, markers, pencils, highlighters). The tool shape is
configurable — different tools show different icon styles.

### 5.2 Configuration

```typescript
interface ToolColorPickerOptions
{
    container: HTMLElement | string;

    /** Tool type determines the icon shape. */
    tool: "pen" | "marker" | "pencil" | "highlighter" | "brush";

    /** Available colours. Each includes a hex colour and label. */
    colors: ToolColor[];

    /** Currently selected colour index or hex. */
    value?: string;

    /** Callback when a colour is selected. */
    onChange?: (color: ToolColor) => void;

    /** Layout: "row" for horizontal, "grid" for grid. Default: "row". */
    layout?: "row" | "grid";

    /** Grid columns (when layout is "grid"). Default: 6. */
    gridColumns?: number;

    /** Show colour name tooltip on hover. Default: true. */
    showTooltips?: boolean;
}

interface ToolColor
{
    hex: string;
    label: string;
    alpha?: number;  // 0-1, default 1. Useful for highlighters.
}
```

### 5.3 Built-in Color Packs

```typescript
// Solid pen colours (opaque, vivid)
ToolColorPicker.PEN_COLORS = [
    { hex: "#000000", label: "Black" },
    { hex: "#dc3545", label: "Red" },
    { hex: "#0d6efd", label: "Blue" },
    { hex: "#198754", label: "Green" },
    { hex: "#6f42c1", label: "Purple" },
    { hex: "#fd7e14", label: "Orange" },
    { hex: "#495057", label: "Dark Gray" },
];

// Marker colours (semi-transparent, saturated)
ToolColorPicker.MARKER_COLORS = [
    { hex: "#dc3545", label: "Red", alpha: 0.6 },
    { hex: "#0d6efd", label: "Blue", alpha: 0.6 },
    { hex: "#198754", label: "Green", alpha: 0.6 },
    { hex: "#6f42c1", label: "Purple", alpha: 0.6 },
    { hex: "#ffc107", label: "Yellow", alpha: 0.6 },
    { hex: "#fd7e14", label: "Orange", alpha: 0.6 },
];

// Highlighter colours (very transparent, bright)
ToolColorPicker.HIGHLIGHTER_COLORS = [
    { hex: "#ffc107", label: "Yellow", alpha: 0.4 },
    { hex: "#20c997", label: "Teal", alpha: 0.4 },
    { hex: "#e83e8c", label: "Pink", alpha: 0.4 },
    { hex: "#0dcaf0", label: "Cyan", alpha: 0.4 },
    { hex: "#6f42c1", label: "Purple", alpha: 0.4 },
    { hex: "#fd7e14", label: "Orange", alpha: 0.4 },
];

// Pencil colours (muted, textured feel)
ToolColorPicker.PENCIL_COLORS = [
    { hex: "#495057", label: "Graphite" },
    { hex: "#212529", label: "Dark" },
    { hex: "#6c757d", label: "Medium" },
    { hex: "#adb5bd", label: "Light" },
    { hex: "#3d5a80", label: "Steel Blue" },
    { hex: "#8b4513", label: "Sienna" },
];
```

### 5.4 Visual Rendering

Each colour renders as a tool icon (SVG) filled with that colour:
- **Pen**: Thin nib with colour fill in the tip
- **Marker**: Thick chisel-tip marker with colour body
- **Pencil**: Classic pencil shape with colour body
- **Highlighter**: Wide translucent tip marker
- **Brush**: Paintbrush with colour on bristles

Tool icons are 24x36px SVG. Selected colour has a highlight
ring/outline.

### 5.5 Public API

```typescript
interface ToolColorPicker
{
    getValue(): ToolColor;
    setValue(hex: string): void;
    setColors(colors: ToolColor[]): void;
    setTool(tool: "pen" | "marker" | "pencil" | "highlighter" | "brush"): void;
    destroy(): void;
    getElement(): HTMLElement;
}
```

---

## 6. Columns Picker

### 6.1 Purpose

Dropdown showing column layout presets with visual preview of
how content will be arranged in columns.

### 6.2 Configuration

```typescript
interface ColumnsPickerOptions
{
    container: HTMLElement | string;
    value?: number;                // Default: 1
    presets?: ColumnPreset[];     // Override defaults
    showCustom?: boolean;         // Default: true
    onChange?: (preset: ColumnPreset) => void;
    onCustom?: () => void;
    ribbonMode?: boolean;
}

interface ColumnPreset
{
    name: string;
    columns: number;
    /** Column widths as ratios (e.g., [1, 1] for equal, [2, 1] for 2:1). */
    widths?: number[];
    gap?: number;     // Gap between columns in px
}
```

### 6.3 Default Presets

| Name | Columns | Widths |
|------|---------|--------|
| One | 1 | [1] |
| Two | 2 | [1, 1] |
| Three | 3 | [1, 1, 1] |
| Left | 2 | [1, 2] (narrow left, wide right) |
| Right | 2 | [2, 1] (wide left, narrow right) |

### 6.4 Visual Rendering

Each preset shows a page thumbnail with vertical column dividers
and horizontal placeholder lines in each column:
```
┌──────────────┐
│ ──  │  ──    │  Two columns
│ ──  │  ──    │
│ ──  │  ──    │
└──────────────┘
```

---

## 7. Spacing Picker

### 7.1 Purpose

Dropdown showing line/paragraph spacing presets with visual
preview of how text spacing looks.

### 7.2 Configuration

```typescript
interface SpacingPickerOptions
{
    container: HTMLElement | string;
    value?: number;               // Default: 1.15
    presets?: SpacingPreset[];    // Override defaults
    showCustom?: boolean;         // Default: true
    onChange?: (preset: SpacingPreset) => void;
    onCustom?: () => void;
    ribbonMode?: boolean;
}

interface SpacingPreset
{
    name: string;
    lineHeight: number;     // CSS line-height value (1.0, 1.15, 1.5, 2.0)
    beforeParagraph?: number; // Space before paragraph in px
    afterParagraph?: number;  // Space after paragraph in px
}
```

### 7.3 Default Presets

| Name | Line Height | Before | After |
|------|-------------|--------|-------|
| Single | 1.0 | 0 | 0 |
| 1.15 | 1.15 | 0 | 8 |
| 1.5 | 1.5 | 0 | 8 |
| Double | 2.0 | 0 | 8 |
| Compact | 1.0 | 0 | 4 |
| Relaxed | 1.6 | 8 | 12 |

### 7.4 Visual Rendering

Each preset shows a small thumbnail with horizontal lines
at the appropriate spacing:
```
┌───────────────┐
│ ────────────  │  Single (tight lines)
│ ────────────  │
│ ────────────  │
│ ────────────  │
└───────────────┘
```

---

## 8. Shared Architecture

### 8.1 Common Patterns

All pickers share:
- **Dropdown trigger**: A button showing the current selection
  with a chevron. Clicking opens the dropdown panel.
- **Dropdown panel**: Positioned below the trigger (or above if
  near viewport bottom). Contains the preset list.
- **Selection state**: Active preset highlighted with accent colour.
- **Keyboard**: Arrow keys to navigate, Enter to select, Escape
  to close.
- **Ribbon mode**: When `ribbonMode: true`, the component renders
  as a Ribbon-compatible custom control (no trigger button, panel
  shows directly in a popup).

### 8.2 Thumbnail SVG Helper

All pickers that show page thumbnails share a common SVG helper:

```typescript
function renderPageThumbnail(
    width: number, height: number,
    options?: {
        margins?: { top: number; bottom: number; left: number; right: number };
        columns?: number[];
        lines?: boolean;
        orientation?: "portrait" | "landscape";
        fold?: boolean;     // Show corner fold
    }
): SVGElement
```

This produces a small SVG showing a page outline with optional
margin guides, column dividers, and placeholder lines.

### 8.3 Factory Pattern

All pickers follow the standard factory pattern:
```typescript
export function createMarginsPicker(
    options: MarginsPickerOptions
): MarginsPicker
```

---

## 9. Implementation Order

1. **Shared thumbnail SVG helper** (used by margins, orientation, sizes, columns)
2. **Orientation Picker** (simplest — 2 options)
3. **Sizes Picker** (maps to existing PAGE_FRAME_SIZES)
4. **Margins Picker** (maps to existing PAGE_FRAME_MARGIN_PRESETS)
5. **Tool Color Picker** (independent, SVG tool icons)
6. **Columns Picker** (uses thumbnail helper)
7. **Spacing Picker** (uses line-spacing visual)

---

## 10. Component Sizes (Estimated)

| Component | JS Lines | CSS Lines | Tests |
|-----------|----------|-----------|-------|
| Margins Picker | ~300 | ~80 | ~15 |
| Orientation Picker | ~150 | ~40 | ~8 |
| Sizes Picker | ~250 | ~70 | ~12 |
| Tool Color Picker | ~350 | ~100 | ~15 |
| Columns Picker | ~200 | ~60 | ~10 |
| Spacing Picker | ~200 | ~60 | ~10 |
| **Total** | **~1,450** | **~410** | **~70** |
