# Customizable Borders — PRD & Technical Specification

> **Status:** Draft
> **Author:** Claude (agent)
> **Date:** 2026-03-19
> **ADR:** TBD (ADR-030 candidate)
> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

---

## 1. Goal

Add per-cell customizable borders to Diagrams nodes, supporting:

1. **Border Width** — pixel stroke width
2. **Border Style** — solid, dashed, dotted, and 9 other dash patterns (reuse `DashPatternType`)
3. **Per-Side On/Off** — independently enable/disable top, right, bottom, left borders (box shapes only)
4. **Gradient Stroke** — multi-stop linear gradient applied along the border path, with per-side control on box shapes and angle-based control on non-box shapes

---

## 2. Architecture: Border Tier System

Mirrors the existing `TextTier` pattern in `ShapeRegistry` (`typescript/apps/diagrams/shapes/ShapeRegistry.ts:106`).

### 2.1 Tier Definitions

| Tier | Applicability | Capabilities |
|------|--------------|--------------|
| `'full'` | Box-like shapes (rectangle, rounded-rect, square, card, etc.) | Per-side border control: each side has its own enabled/width/style/gradient. |
| `'basic'` | Non-box shapes (circle, ellipse, triangle, star, hexagon, arrows, callouts, etc.) | Uniform border: single width/style/gradient with angle control. No per-side toggle. |
| `'none'` | Semantic shapes (UML, BPMN, flowchart symbols with structural meaning) | No border customization exposed. Uses maxGraph native stroke only. |

### 2.2 ShapeConfig Extension

```typescript
// In ShapeRegistry.ts — new type + ShapeConfig field
export type BorderTier = 'full' | 'basic' | 'none';

export interface ShapeConfig
{
    style: ShapeStyleProperties;
    compartmented?: boolean;
    compartments?: number;
    textTier?: TextTier;
    borderTier?: BorderTier;  // NEW — defaults to 'basic' if not set
    render?: (...) => void;
}
```

### 2.3 Lookup Function

```typescript
// Mirrors getTextTier() at ShapeRegistry.ts:270
getBorderTier(type: string): BorderTier
{
    const config = this.shapes[type];
    return config?.borderTier ?? 'basic';
}
```

### 2.4 Tier Assignment Guidelines

- **full**: `rectangle`, `rounded-rect`, `square`, `card`, `note`, `document`, `table`, `process`, `decision` (any shape whose visual boundary is a 4-sided box)
- **basic**: `circle`, `ellipse`, `triangle`, `star`, `hexagon`, `pentagon`, `diamond`, `parallelogram`, `trapezoid`, `arrow-*`, `callout-*`, `bracket-*`, `cloud`
- **none**: `uml-*`, `bpmn-*`, `flowchart-*` (structural labels embedded in border rendering)

---

## 3. Data Model

### 3.1 Frontend Cell Properties (`customBorder_*`)

Follows the established `customShadow_*` / `customText_*` / `customLine_*` convention.

#### Full Tier (per-side)

Each side (`top`, `right`, `bottom`, `left`) gets its own property set:

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `customBorder_top_enabled` | `boolean` | `true` | Whether top border is drawn |
| `customBorder_top_width` | `number` | `1` | Stroke width in px |
| `customBorder_top_style` | `string` | `'solid'` | Dash pattern enum name |
| `customBorder_top_color` | `string` | (inherit stroke) | Border color hex |
| `customBorder_top_opacity` | `number` | `1.0` | Border opacity 0-1 |
| `customBorder_top_gradient` | `string` | `undefined` | JSON-encoded gradient stops array |

Repeat for `right`, `bottom`, `left` (20 properties total for full-tier).

**Gradient stops format** (stored as JSON string in cell property):
```json
[
  { "position": 0, "color": "#ff0000" },
  { "position": 0.5, "color": "#00ff00" },
  { "position": 1, "color": "#0000ff" }
]
```

#### Basic Tier (uniform)

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `customBorder_width` | `number` | `1` | Uniform stroke width in px |
| `customBorder_style` | `string` | `'solid'` | Dash pattern enum name |
| `customBorder_color` | `string` | (inherit stroke) | Border color hex |
| `customBorder_opacity` | `number` | `1.0` | Border opacity 0-1 |
| `customBorder_gradient` | `string` | `undefined` | JSON-encoded gradient stops array |
| `customBorder_gradientAngle` | `number` | `0` | Gradient angle in degrees (0=right, 90=down) |

### 3.2 Backend Model (C#)

New `BorderStyle` POCO on `NodePresentation`. Extends the existing pattern at `Diagram.cs:1012`.

```csharp
/// <summary>
/// Per-side border configuration for box-like shapes.
/// When Sides is null, uniform border is used (basic tier).
/// </summary>
public class BorderStyle
{
    /// <summary>Uniform border width (basic tier, or default for full tier).</summary>
    public double Width { get; set; } = 1;

    /// <summary>Uniform dash pattern (basic tier, or default for full tier).</summary>
    public DashPatternType? Style { get; set; }

    /// <summary>Uniform border color hex (basic tier, or default for full tier).</summary>
    public string? Color { get; set; }

    /// <summary>Uniform opacity 0-1 (basic tier, or default for full tier).</summary>
    public double Opacity { get; set; } = 1.0;

    /// <summary>Gradient for uniform border (basic tier).</summary>
    public BorderGradient? Gradient { get; set; }

    /// <summary>
    /// Per-side overrides (full tier only). Null for basic-tier shapes.
    /// Keys: "top", "right", "bottom", "left".
    /// </summary>
    public Dictionary<string, BorderSideStyle>? Sides { get; set; }
}

/// <summary>
/// Border configuration for a single side.
/// </summary>
public class BorderSideStyle
{
    /// <summary>Whether this side is drawn.</summary>
    public bool Enabled { get; set; } = true;

    /// <summary>Stroke width in px.</summary>
    public double Width { get; set; } = 1;

    /// <summary>Dash pattern.</summary>
    public DashPatternType? Style { get; set; }

    /// <summary>Color hex.</summary>
    public string? Color { get; set; }

    /// <summary>Opacity 0-1.</summary>
    public double Opacity { get; set; } = 1.0;

    /// <summary>Gradient stops for this side.</summary>
    public BorderGradient? Gradient { get; set; }
}

/// <summary>
/// Gradient definition for border strokes.
/// </summary>
public class BorderGradient
{
    /// <summary>Gradient stops.</summary>
    public List<GradientStop>? Stops { get; set; }

    /// <summary>
    /// Angle in degrees for uniform borders (basic tier).
    /// Per-side borders ignore this (gradient follows the side direction).
    /// </summary>
    public double Angle { get; set; } = 0;
}
```

**NodePresentation addition:**
```csharp
public class NodePresentation
{
    // ... existing properties ...

    /// <summary>
    /// Gets or sets custom border styling (replaces/augments Stroke for border-specific features).
    /// When present, takes precedence over Stroke for border rendering.
    /// </summary>
    public BorderStyle? Border { get; set; }
}
```

### 3.3 Backward Compatibility

- Existing `StrokeStyle` remains the source of truth for edges/lines and for shapes that have `borderTier = 'none'`.
- `BorderStyle` is additive: when `Border` is null, the shape renders with its existing `Stroke` properties.
- The first time a user customizes a border property, the system populates `Border` from the current `Stroke` values.
- On save, if `Border` is functionally equivalent to a uniform solid border matching `Stroke`, it can be elided to keep JSON compact.

---

## 4. SVG Rendering Approach

### 4.1 Strategy: SVG Overlay (like Shadow)

Following the pattern established by `diagrams-shadow-format.ts`, border customization uses **SVG overlay elements** managed outside maxGraph's native style system. This is necessary because:

1. maxGraph does not support per-side borders.
2. maxGraph does not support gradient strokes.
3. SVG `<linearGradient>` applied to `stroke` is the standard way to achieve gradient borders.

### 4.2 Full Tier Rendering (Per-Side Borders)

For box shapes, render each enabled side as a separate SVG `<line>` or `<path>` element overlaid on the cell's position:

```
┌──────────────── top ────────────────┐
│                                     │
left                              right
│                                     │
└──────────────── bottom ─────────────┘
```

Each side is an independent `<line>` element:
- **top**: `(x, y)` → `(x+w, y)`
- **right**: `(x+w, y)` → `(x+w, y+h)`
- **bottom**: `(x, y+h)` → `(x+w, y+h)`
- **left**: `(x, y)` → `(x, y+h)`

When a side has a gradient, define a `<linearGradient>` in `<defs>`:
- **top/bottom** gradients: `x1=0 y1=0 x2=1 y2=0` (horizontal)
- **left/right** gradients: `x1=0 y1=0 x2=0 y2=1` (vertical)

SVG structure per cell:
```xml
<defs>
  <linearGradient id="border-{cellId}-top" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="#ff0000"/>
    <stop offset="50%" stop-color="#00ff00"/>
    <stop offset="100%" stop-color="#0000ff"/>
  </linearGradient>
  <!-- repeat for other sides with gradients -->
</defs>
<g id="border-group-{cellId}">
  <line x1="..." y1="..." x2="..." y2="..."
        stroke="url(#border-{cellId}-top)" stroke-width="2"
        stroke-dasharray="6 4"/>
  <!-- more sides... -->
</g>
```

### 4.3 Basic Tier Rendering (Uniform Border with Gradient)

For non-box shapes, clone the cell's shape outline path and apply the gradient to its `stroke`:

```xml
<defs>
  <linearGradient id="border-{cellId}"
                  gradientTransform="rotate({angle})">
    <stop offset="0%" stop-color="#ff0000"/>
    <stop offset="100%" stop-color="#0000ff"/>
  </linearGradient>
</defs>
<use href="#{cellShapeId}"
     fill="none"
     stroke="url(#border-{cellId})"
     stroke-width="3"
     stroke-dasharray="6 4"/>
```

When no gradient is set, use a simple `stroke` color value.

### 4.4 maxGraph Native Stroke Suppression

When custom borders are active on a cell, suppress maxGraph's native stroke rendering to avoid double-drawing:

```typescript
// Set maxGraph strokeColor to 'none' while custom border is active
graph.setCellStyles('strokeColor', 'none', [cell]);
graph.setCellStyles('strokeWidth', 0, [cell]);
```

Store the original stroke values in `customBorder_originalStroke*` properties so they can be restored when custom borders are removed.

### 4.5 Refresh Chokepoint: `view.validate()` Hook

Reuse the monkey-patch pattern from `hookShadowRefreshOnValidate()`:

```typescript
export function hookBorderRefreshOnValidate(graph: BorderFormatGraph): void
{
    const originalValidate = graph.getView()!.validate.bind(graph.getView()!);
    graph.getView()!.validate = function(...args: unknown[])
    {
        originalValidate(...args);
        refreshAllBorderOverlays(graph);
    };
}
```

### 4.6 Performance: Border Cell Tracking

Mirror `shadowCellIds` from `diagrams-shadow-format.ts:28`:

```typescript
const borderCellIds = new Set<string>();
```

`refreshAllBorderOverlays()` early-outs when the set is empty. Cells are added when any `customBorder_*` property is set beyond defaults, removed when borders are reset.

---

## 5. Ribbon UI: New "Edge" Tab

### 5.1 Tab Restructure

Currently 6 tabs: **Home | View | Text | Shape | Image | Tools**

Proposed 7 tabs: **Home | View | Text | Shape | Edge | Image | Tools**

The new **Edge** tab consolidates all line/edge and border controls:

```
Edge Tab
├── Edge group (MOVED from Shape tab)
│   ├── Color picker    → prop-edge-stroke
│   ├── Routing picker  → line-shape
│   ├── ─── separator ───
│   ├── Width picker    → line-width
│   ├── Style picker    → line-type
│   ├── ─── separator ───
│   ├── Start arrow     → start-arrow
│   └── End arrow       → end-arrow
│
├── Node Border group (NEW)
│   ├── Width picker (reuse LineWidthPicker CDN)
│   ├── Style picker (reuse LineTypePicker CDN)
│   ├── Color picker (ColorPicker CDN)
│   ├── ─── separator ───
│   ├── Per-Side toggles (full tier only, 4 toggle buttons: T R B L)
│   │   visible only when selected cell is full-tier
│   └── Gradient picker (NEW CDN component)
│
└── Shadow group (MOVED from Shape tab)
    ├── Toggle button
    ├── Color picker
    ├── Distance/Angle sliders
    └── Opacity/Blur sliders
```

### 5.2 Shape Tab Simplification

After move, Shape tab retains:
```
Shape Tab
├── Format Painter group
├── Default Colors group
├── Node Colors group (fill, stroke)
└── Selection Colors group (multi-select fill/stroke)
```

### 5.3 Tab Activation Lifecycle

```typescript
// In diagrams-toolbar.ts onTabChange handler:
if (tabId === 'edge')
{
    requestAnimationFrame(() => handlers.onEdgeTabActivated?.());
}
```

The `onEdgeTabActivated` handler initializes CDN pickers lazily (same pattern as Shape tab).

### 5.4 Per-Side Toggle Buttons

Four small toggle buttons in the Node Border group:

| Button | Icon | Label | ID |
|--------|------|-------|-----|
| Top | `bi bi-border-top` | T | `border-toggle-top` |
| Right | `bi bi-border-right` | R | `border-toggle-right` |
| Bottom | `bi bi-border-bottom` | B | `border-toggle-bottom` |
| Left | `bi bi-border-left` | L | `border-toggle-left` |

All default to active (pressed state). Clicking toggles the corresponding side off/on.

**Visibility rule:** Per-side toggles are visible only when the selected cell's shape has `borderTier === 'full'`. For `'basic'` tier, the toggle row is hidden. This is managed via `ribbon.setControlVisible()` in the selection-change handler.

### 5.5 Per-Side Cascade

When a per-side toggle is active and the user changes width/style/color/gradient in the border controls, the change applies **only to enabled sides**. This allows workflows like:

1. Select a rectangle
2. Disable top and bottom toggles
3. Set gradient → applies to left and right sides only
4. Re-enable top, set different gradient → top gets its own gradient

---

## 6. CDN Component: GradientPicker

A new CDN component to be built by the UI team.

### 6.1 Contract

```typescript
interface GradientPickerOptions
{
    /** Container element ID */
    containerId: string;

    /** Initial stops */
    stops?: GradientStop[];

    /** Initial angle (for uniform/basic tier) */
    angle?: number;

    /** Whether to show the angle control */
    showAngle?: boolean;

    /** Minimum number of stops (default 2) */
    minStops?: number;

    /** Maximum number of stops (default 8) */
    maxStops?: number;

    /** Callback when stops change */
    onChange?: (stops: GradientStop[], angle?: number) => void;

    /** Callback when "Clear Gradient" is clicked */
    onClear?: () => void;
}

interface GradientStop
{
    position: number;  // 0.0 to 1.0
    color: string;     // hex
}

// CDN global
declare function createGradientPicker(id: string, options: GradientPickerOptions): GradientPickerInstance;

interface GradientPickerInstance
{
    setStops(stops: GradientStop[]): void;
    getStops(): GradientStop[];
    setAngle(angle: number): void;
    getAngle(): number;
    setDisabled(disabled: boolean): void;
    destroy(): void;
}
```

### 6.2 Visual Design

- A horizontal gradient preview bar showing current stops
- Draggable stop handles below the bar (click to add, drag to reposition, right-click to remove)
- Color swatch per stop (clicking opens ColorPicker)
- Optional angle dial/input (shown when `showAngle: true`)
- "Clear" button to remove gradient

### 6.3 Interim Solution (Before CDN Component)

Until the UI team delivers GradientPicker, implement gradient editing via a simple modal dialog:
- List of stops with position (numeric input 0-100%) and color (ColorPicker)
- Add/Remove stop buttons
- Angle input for basic tier
- Preview bar (read-only rendered `<div>` with CSS `linear-gradient`)

---

## 7. Frontend Module: `diagrams-border-format.ts`

### 7.1 File Structure

```
typescript/apps/diagrams/app/diagrams-border-format.ts
```

Follows the structure of `diagrams-shadow-format.ts` and `diagrams-line-format.ts`.

### 7.2 Exports

```typescript
// CDN initialization (called from onEdgeTabActivated)
export function initBorderCdnPickers(canvas: BorderFormatCanvas): void;

// Apply border properties to selected cells
export function applyBorderWidth(width: number): void;
export function applyBorderStyle(pattern: string): void;
export function applyBorderColor(color: string, opacity: number): void;
export function applyBorderGradient(stops: GradientStop[], angle?: number): void;
export function clearBorderGradient(): void;

// Per-side toggles (full tier only)
export function toggleBorderSide(side: 'top' | 'right' | 'bottom' | 'left', enabled: boolean): void;

// Selection sync — update ribbon controls to reflect selected cell's borders
export function syncBorderControlsToSelection(cells: unknown[]): void;

// SVG overlay management
export function hookBorderRefreshOnValidate(graph: BorderFormatGraph): void;
export function refreshAllBorderOverlays(graph: BorderFormatGraph): void;
export function removeBorderOverlay(cellId: string): void;

// Border cell tracking (performance)
export function hasBorderCells(): boolean;
```

### 7.3 Key Implementation Patterns

**beginUpdate/endUpdate wrapping** for atomic undo:
```typescript
function applyBorderWidth(width: number): void
{
    const canvas = getCanvas();
    if (!canvas) return;
    const cells = getSelectedVertexCells();
    if (!cells.length) return;

    canvas.beginUpdate();
    try
    {
        for (const cell of cells)
        {
            const tier = getBorderTierForCell(cell);
            if (tier === 'none') continue;

            if (tier === 'full')
            {
                // Apply to enabled sides only
                for (const side of SIDES)
                {
                    if (cell[`customBorder_${side}_enabled`] !== false)
                    {
                        setCellProp(cell, `customBorder_${side}_width`, width);
                    }
                }
            }
            else
            {
                setCellProp(cell, 'customBorder_width', width);
            }

            borderCellIds.add(cell.id);
        }
    }
    finally
    {
        canvas.endUpdate();
    }
    markDirty();
}
```

**Gradient SVG generation:**
```typescript
function createGradientElement(
    cellId: string,
    side: string | null,  // null for uniform
    stops: GradientStop[],
    angle?: number
): SVGLinearGradientElement
{
    const gradientId = side
        ? `border-${cellId}-${side}`
        : `border-${cellId}`;

    const grad = document.createElementNS(SVG_NS, 'linearGradient');
    grad.setAttribute('id', gradientId);

    if (side)
    {
        // Per-side: gradient follows line direction
        const coords = SIDE_GRADIENT_COORDS[side];
        grad.setAttribute('x1', coords.x1);
        grad.setAttribute('y1', coords.y1);
        grad.setAttribute('x2', coords.x2);
        grad.setAttribute('y2', coords.y2);
    }
    else if (angle !== undefined)
    {
        // Uniform: use angle
        grad.setAttribute('gradientTransform', `rotate(${angle})`);
        grad.setAttribute('gradientUnits', 'objectBoundingBox');
    }

    for (const stop of stops)
    {
        const s = document.createElementNS(SVG_NS, 'stop');
        s.setAttribute('offset', `${stop.position * 100}%`);
        s.setAttribute('stop-color', stop.color);
        grad.appendChild(s);
    }

    return grad;
}
```

---

## 8. Persistence: Three Export Paths

All three paths must be updated, following the pattern established in ADR-027 (text formatting).

### 8.1 Active Save — `DiagramService.buildNodePresentation()`

In `typescript/apps/diagrams/modules/DiagramService.ts`:

```typescript
// Inside buildNodePresentation():
const border = buildBorderPresentation(cell);
if (border) presentation.border = border;
```

Helper:
```typescript
function buildBorderPresentation(cell: BorderCell): BorderStyleDTO | undefined
{
    const tier = ShapeRegistry.getBorderTier(cell.shapeType);
    if (tier === 'none') return undefined;

    if (tier === 'full')
    {
        const sides: Record<string, BorderSideDTO> = {};
        let hasCustomization = false;

        for (const side of ['top', 'right', 'bottom', 'left'])
        {
            const enabled = cell[`customBorder_${side}_enabled`] ?? true;
            const width = cell[`customBorder_${side}_width`] ?? 1;
            const style = cell[`customBorder_${side}_style`] ?? 'solid';
            const color = cell[`customBorder_${side}_color`];
            const opacity = cell[`customBorder_${side}_opacity`] ?? 1.0;
            const gradientJson = cell[`customBorder_${side}_gradient`];

            if (!enabled || width !== 1 || style !== 'solid' || color || opacity !== 1.0 || gradientJson)
                hasCustomization = true;

            sides[side] = {
                enabled,
                width,
                style,
                color,
                opacity,
                gradient: gradientJson ? JSON.parse(gradientJson) : undefined,
            };
        }

        if (!hasCustomization) return undefined;
        return { sides };
    }
    else // basic
    {
        const width = cell.customBorder_width ?? 1;
        const style = cell.customBorder_style ?? 'solid';
        const color = cell.customBorder_color;
        const opacity = cell.customBorder_opacity ?? 1.0;
        const gradientJson = cell.customBorder_gradient;
        const angle = cell.customBorder_gradientAngle ?? 0;

        if (width === 1 && style === 'solid' && !color && opacity === 1.0 && !gradientJson)
            return undefined;

        return {
            width,
            style,
            color,
            opacity,
            gradient: gradientJson ? { stops: JSON.parse(gradientJson), angle } : undefined,
        };
    }
}
```

### 8.2 Load — `MaxGraphCanvas.loadFromData()`

Read `node.border` from server data, populate `customBorder_*` cell properties:

```typescript
// Inside the node-loading loop:
if (nodeData.border)
{
    if (nodeData.border.sides)
    {
        // Full tier
        for (const [side, sideData] of Object.entries(nodeData.border.sides))
        {
            cell.customBorder_{side}_enabled = sideData.enabled;
            cell.customBorder_{side}_width = sideData.width;
            // ... etc
        }
    }
    else
    {
        // Basic tier
        cell.customBorder_width = nodeData.border.width;
        cell.customBorder_style = nodeData.border.style;
        // ... etc
    }
    borderCellIds.add(cell.id);
}
```

### 8.3 Export — `MaxGraphCanvas.exportVerticesRecursive()`

Read `customBorder_*` cell properties, emit `border` object in the export data. Mirrors the `text` and `shadow` export blocks.

---

## 9. Format Painter Integration

Extend `CapturedFormat` in `diagrams-format-painter.ts`:

```typescript
interface CapturedFormat
{
    // ... existing vertex/edge props ...

    // Border (vertex only)
    border?: {
        tier: BorderTier;
        // Full tier: per-side properties
        sides?: Record<string, {
            enabled: boolean;
            width: number;
            style: string;
            color?: string;
            opacity: number;
            gradient?: string;  // JSON
        }>;
        // Basic tier: uniform properties
        width?: number;
        style?: string;
        color?: string;
        opacity?: number;
        gradient?: string;
        gradientAngle?: number;
    };
}
```

When pasting, if source tier differs from target tier:
- **full → basic**: Use top-side values as uniform values, ignore per-side differences.
- **basic → full**: Apply uniform values to all four sides.
- **any → none**: Skip border entirely.

---

## 10. Clipboard Integration

Extend `diagrams-clipboard.ts` to serialize/deserialize `customBorder_*` properties in the clipboard envelope. The existing pattern already serializes all `custom*` prefixed properties, so this should work automatically — verify and add explicit handling if needed.

---

## 11. Export (SVG/PNG)

### 11.1 SVG Export

The SVG overlay elements (gradient defs + border lines/paths) must be included in exported SVG. The `exportToSVG()` function should call `renderBorderOverlaysForExport()` which generates standalone SVG elements at the correct positions.

### 11.2 PNG Export

PNG export renders SVG to canvas, so SVG gradient borders will be included automatically once the SVG export is correct.

---

## 12. Selection Change Sync

In `diagrams-app-main.ts` `onSelectionChange()` handler, add:

```typescript
// Sync border controls to selection
syncBorderControlsToSelection(selectedCells);
```

This function should:
1. Read `customBorder_*` properties from the first selected vertex cell.
2. Update CDN pickers (width, style, color, gradient) to reflect current values.
3. Show/hide per-side toggles based on `borderTier` of selected shape.
4. Set toggle states for per-side buttons.

---

## 13. Testing Strategy

### 13.1 Unit Tests — `diagrams-border-format.test.ts`

| Test Group | Count (est.) | Coverage |
|-----------|-------------|----------|
| Border tier lookup | 6 | full/basic/none for various shapes |
| Property application (full tier) | 12 | width/style/color/gradient × per-side logic |
| Property application (basic tier) | 8 | width/style/color/gradient/angle |
| Per-side toggle | 6 | enable/disable each side, apply-to-enabled-only |
| SVG overlay generation | 8 | gradient defs, line elements, basic path clone |
| Border cell tracking | 4 | add/remove/hasBorderCells/early-out |
| Selection sync | 6 | full→controls, basic→controls, mixed selection |
| Format painter capture/apply | 6 | full→full, basic→basic, full→basic, basic→full |
| Persistence round-trip | 4 | save/load for both tiers |
| **Total** | **~60** | |

### 13.2 Backend Tests

| Test Group | Count (est.) | Coverage |
|-----------|-------------|----------|
| BorderStyle serialization | 4 | full tier, basic tier, null, defaults |
| TolerantConverter (if needed) | 3 | enum names, legacy values, unknown |
| NodePresentation with Border | 2 | save/load round-trip |
| **Total** | **~9** | |

---

## 14. Implementation Tasks

### Phase 1: Foundation (data model + tier system)

1. **Add `BorderTier` to ShapeRegistry** — type, config field, lookup function, assign tiers to all existing shapes.
2. **Add `BorderStyle` POCOs to backend** — `BorderStyle`, `BorderSideStyle`, `BorderGradient` classes in `Diagram.cs`. Add `Border` property to `NodePresentation`.
3. **Define `customBorder_*` cell property types** — TypeScript interfaces for full/basic tier cell properties.

### Phase 2: SVG Rendering

4. **Create `diagrams-border-format.ts`** — module skeleton with SVG overlay functions. `hookBorderRefreshOnValidate()`, `borderCellIds` tracking, `refreshAllBorderOverlays()`.
5. **Implement full-tier rendering** — per-side `<line>` elements with gradient `<linearGradient>` defs.
6. **Implement basic-tier rendering** — uniform border with shape outline cloning and angle-based gradient.
7. **maxGraph stroke suppression** — hide native stroke when custom borders are active, restore on removal.

### Phase 3: Ribbon UI

8. **Create Edge tab** — move Edge group and Shadow group from Shape tab. Add Node Border group.
9. **Wire CDN pickers** — reuse LineWidthPicker + LineTypePicker for border width/style. Add ColorPicker for border color.
10. **Add per-side toggle buttons** — 4 toggles with visibility rule based on borderTier.
11. **Implement GradientPicker interim UI** — modal dialog with stops list + preview.

### Phase 4: Integration

12. **Persistence: save path** — `buildBorderPresentation()` in DiagramService.
13. **Persistence: load path** — populate `customBorder_*` from server data in MaxGraphCanvas.
14. **Persistence: export path** — serialize border data in exportVerticesRecursive.
15. **Selection sync** — update border controls on selection change.
16. **Format Painter** — capture/apply border properties with tier conversion.
17. **Clipboard** — verify automatic `custom*` serialization or add explicit handling.
18. **SVG/PNG export** — include border overlays in exported output.

### Phase 5: Polish

19. **Edge cases** — grouped cells, resize refresh, zoom/pan coordinate mapping, undo/redo.
20. **Tests** — full test suite per §13.

---

## 15. Dependencies

| Dependency | Status | Blocker? |
|-----------|--------|----------|
| maxGraph 0.22.0 SVG structure | Available | No |
| CDN LineWidthPicker, LineTypePicker | Available | No |
| CDN ColorPicker | Available | No |
| CDN GradientPicker | **Not yet built** | **Soft** — interim modal UI unblocks development |
| CDN Ribbon `setControlVisible()` | Available | No |
| `view.validate()` hook pattern | Established (shadow) | No |

---

## 16. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| SVG overlay coordinate drift on zoom/pan | Border misalignment | Use `view.validate()` hook for refresh; read view-space bounds from `getState()` (proven in guides feature) |
| Performance with many bordered cells | Janky redraw | `borderCellIds` Set for O(1) early-out; only refresh changed cells when possible |
| Native stroke suppression side effects | Missing stroke on export or undo | Store original values; restore in `removeBorderOverlay()`; test undo path explicitly |
| GradientPicker CDN delivery delay | Feature incomplete without gradient UI | Interim modal dialog; gradient data model is CDN-independent |
| Per-side JSON gradient string size | Large cell properties | Max 8 stops × 4 sides = 32 stops; ~1KB — negligible |

---

## Appendix A: SVG `<linearGradient>` on Stroke — Reference

SVG supports applying `<linearGradient>` to the `stroke` attribute of any shape element:

```xml
<svg>
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ff0000"/>
      <stop offset="100%" stop-color="#0000ff"/>
    </linearGradient>
  </defs>
  <rect x="10" y="10" width="200" height="100"
        fill="#ffffff"
        stroke="url(#grad1)"
        stroke-width="4"/>
</svg>
```

This is supported in all modern browsers and renders correctly in SVG export (both inline and as `.svg` file).

---

## Appendix B: Coordinate Space

All SVG overlay elements must use **view-space coordinates** (screen pixels after zoom/pan), NOT model-space coordinates. Use `graph.getView().getState(cell)` to get the view-space bounds, as established in the guides feature (`diagrams-guides.ts:collectViewBounds`).

---

## Appendix C: Related ADRs and Specs

- **ADR-027**: Text formatting — `customText_*` property pattern, two-tier system
- **ADR-028**: Cross-app clipboard — `custom*` property serialization
- **ADR-029**: CDN Ribbon lessons — `disabled:true` config vs runtime `setControlDisabled()`
- **`specs/diagrams-format-painter-design.md`**: CapturedFormat interface
- **`specs/diagrams-ordering.md`**: Z-order with fractional indexing
- **`specs/diagrams-images.prd.md`**: Image nodes with SVG overlay rendering
