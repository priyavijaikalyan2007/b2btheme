# Embeddable Components & Mockup System — PRD & Technical Specification

> **Status:** Draft
> **Author:** Claude (agent)
> **Date:** 2026-03-22
> **ADR:** TBD (ADR-092 candidate)

---

## 1. Goal

Extend the DiagramEngine to support embedding live, interactive UI components
from the enterprise theme library inside diagram shapes. This enables two
primary use cases:

1. **Data-rich diagrams** — embed DataGrids, tables, charts, and other data
   components directly in diagrams with live, editable data.
2. **Interactive mockups** — compose screens from real UI components inside
   device frames (browser windows, mobile phones, desktop windows), creating
   functional prototypes that go beyond static wireframes.

---

## 2. Architecture: Hybrid Embed Registry (Option C)

The engine provides embed infrastructure; consuming apps register which
components are embeddable. The engine handles `<foreignObject>` lifecycle,
interaction mode toggling, and data persistence.

### 2.1 Component Registration

```typescript
engine.registerEmbeddableComponent("datagrid", {
    factory: "createDataGrid",   // window function name
    cssPath: "components/datagrid/datagrid.css",
    label: "Data Grid",
    icon: "bi-table",
    category: "data",
    defaultOptions: { dense: true, striped: true, pageSize: 5 },
    defaultSize: { w: 400, h: 250 }
});
```

The engine auto-discovers components by checking `window[factoryName]` at
instantiation time. Components whose factory is not loaded are shown as
placeholder shapes with the component name.

### 2.2 Bulk Registration

For convenience, the engine provides a pre-built registry of all 91
embeddable library components:

```typescript
engine.loadEmbedPack("enterprise-theme");
```

This registers all components with their factory names, default options,
sizes, and categories. The pack is defined in a new source module
`src/embed-registry.ts`.

### 2.3 Excluded Components

| Component | Reason |
|-----------|--------|
| DiagramEngine | Recursive — cannot embed itself |
| SmartTextInput | Engine, not UI — no visual output |
| GradientPicker | Typically used as a sub-component, not standalone |

---

## 3. Data Model

### 3.1 EmbedDefinition

```typescript
export interface EmbedDefinition
{
    /** Registered component name (e.g. "datagrid", "datepicker"). */
    component: string;

    /** Options passed to the component factory function. */
    options: Record<string, unknown>;

    /**
     * Whether the component becomes interactive on double-click.
     * Default: true.
     */
    interactiveOnDoubleClick?: boolean;

    /**
     * Whether the component is currently in interactive mode.
     * Managed by the engine — not set by the user.
     */
    interactive?: boolean;

    /**
     * Component state snapshot for persistence. Updated when the
     * component exits interactive mode. Format is component-specific.
     */
    state?: Record<string, unknown>;

    /**
     * Frame style for device frame shapes.
     * Only applicable when the parent shape is a device frame.
     */
    frameStyle?: "photorealistic" | "schematic";
}
```

### 3.2 Presentation Extension

```typescript
// Added to DiagramObject.presentation
embed?: EmbedDefinition;
```

### 3.3 Embeddable Component Registry Entry

```typescript
export interface EmbeddableComponentEntry
{
    /** Factory function name on window (e.g. "createDataGrid"). */
    factory: string;

    /** Optional CSS path for auto-loading (CDN relative). */
    cssPath?: string;

    /** Human-readable label for stencil palette. */
    label: string;

    /** Bootstrap Icon class for stencil palette. */
    icon: string;

    /** Category for grouping in palette. */
    category: "data" | "input" | "feedback" | "navigation" | "layout" | "content" | "ai";

    /** Default factory options. */
    defaultOptions: Record<string, unknown>;

    /** Default shape dimensions when placed. */
    defaultSize: { w: number; h: number };
}
```

---

## 4. Rendering

### 4.1 Embed Rendering Pipeline

When `renderObject()` encounters `pres.embed`:

1. Create a `<foreignObject>` at local coordinates `(0, 0)` with bounds
   width/height.
2. Inside it, create an HTML `<div>` container with a deterministic ID:
   `de-embed-{objectId}`.
3. Look up the component factory: `window[registry[embed.component].factory]`.
4. If factory exists: call it with `(containerId, embed.options)`.
5. If factory not found: render a placeholder showing the component name
   and icon.
6. Set `pointer-events: none` on the container (non-interactive by default).
7. Store the component instance for lifecycle management.

### 4.2 Interaction Modes

**Non-interactive (default):**
- `pointer-events: none` on the embed container
- Clicks pass through to the diagram for selection, movement, resize
- The component renders and updates but cannot be interacted with
- Visual indicator: subtle overlay with component name badge

**Interactive (on double-click):**
- `pointer-events: auto` on the embed container
- The component receives all mouse/keyboard events
- User can edit DataGrid cells, pick dates, fill forms, etc.
- Visual indicator: blue border glow, "Editing" badge
- Exit interactive mode: click outside the shape or press Escape

### 4.3 Lifecycle Management

```
[addObject with embed] → [renderObject] → [createEmbedContainer]
    → [instantiateComponent] → [component live but non-interactive]

[double-click] → [enterInteractiveMode] → [pointer-events: auto]
    → [user interacts] → [click outside / Escape]
    → [exitInteractiveMode] → [captureState] → [pointer-events: none]

[moveObject / resizeObject] → [rerenderObject]
    → [destroyOldComponent] → [createNew with preserved state]

[removeObject] → [destroyComponent] → [cleanup DOM]
```

### 4.4 State Persistence

When exiting interactive mode, the engine calls a state capture function
on the component instance (if available):

```typescript
// If the component has a getState/getValue method, capture it
const instance = embedInstances.get(objectId);
if (instance && typeof instance.getValue === "function")
{
    embed.state = { value: instance.getValue() };
}
```

On re-render (move, resize, load from JSON), the state is passed back
via the options:

```typescript
const mergedOptions = { ...registry.defaultOptions, ...embed.options, ...embed.state };
factory(containerId, mergedOptions);
```

---

## 5. Device Frame Stencils

### 5.1 Stencil Pack: `devices`

```typescript
engine.loadStencilPack("devices");
```

| Shape | Default Size | Description |
|-------|-------------|-------------|
| `browser-chrome` | 800 x 600 | Chrome browser with tab bar, address bar, nav buttons |
| `browser-minimal` | 800 x 600 | Minimal browser with address bar only |
| `mobile-iphone` | 375 x 812 | iPhone frame with notch and home indicator |
| `mobile-android` | 360 x 800 | Android phone with status bar and nav bar |
| `tablet-ipad` | 768 x 1024 | iPad frame with rounded corners |
| `desktop-window` | 600 x 400 | OS window with title bar (min/max/close) |
| `desktop-macos` | 600 x 400 | macOS window with traffic light buttons |
| `dialog-modal` | 400 x 300 | Modal dialog with title bar and overlay |
| `card-container` | 350 x 250 | Bootstrap card with header |
| `sidebar-panel` | 250 x 500 | Sidebar panel with title |
| `navbar` | 800 x 60 | Horizontal navigation bar |
| `footer` | 800 x 100 | Page footer |

### 5.2 Frame Styles

Each device frame supports two visual styles:

**Photorealistic** — detailed rendering with shadows, gradients, realistic
chrome, device-specific details (iPhone notch, Android nav buttons, browser
tab shapes).

**Schematic** — simplified outlines with minimal detail, similar to Balsamiq.
Uses dashed borders, no shadows, monochrome palette.

The style is set via `embed.frameStyle` or a shape parameter.

### 5.3 Content Area

Each device frame shape defines a **content area** — the inner rectangle
where embedded components and child shapes are placed. This is exposed via
the shape's `getTextRegions()` as a region named `"content"`.

```typescript
getTextRegions(bounds: Rect): TextRegion[]
{
    // Browser: content area below the address bar
    return [{
        id: "content",
        bounds: {
            x: bounds.x + 1,
            y: bounds.y + 72,  // below tab + address bar
            width: bounds.width - 2,
            height: bounds.height - 73
        }
    }];
}
```

---

## 6. UI Component Stencils

### 6.1 Stencil Pack: `ui-components`

```typescript
engine.loadStencilPack("ui-components");
```

This pack registers shapes for every embeddable library component. Each
shape renders a static SVG preview when the component factory is not loaded,
and the live component when it is.

| Category | Components |
|----------|-----------|
| **Data** | DataGrid, TreeGrid, TreeView, PropertyInspector, SpineMap, GraphCanvas |
| **Input** | EditableComboBox, MultiSelectCombo, SearchBox, PeoplePicker, DatePicker, TimePicker, DurationPicker, CronPicker, TimezonePicker, PeriodPicker, SprintPicker, ColorPicker, GradientPicker, AnglePicker, FontDropdown, SymbolPicker, Slider, Toggle, FileUpload |
| **Content** | CodeEditor, MarkdownEditor, RichTextInput, DocViewer, HelpDrawer |
| **Feedback** | Toast, ProgressModal, ErrorDialog, ConfirmDialog, FormDialog, Stepper |
| **Navigation** | Ribbon, RibbonBuilder, Toolbar, Sidebar, StatusBar, TabbedPanel |
| **AI** | Conversation, PromptTemplateManager, ReasoningAccordion |
| **Governance** | AuditLogViewer, PermissionMatrix |
| **Layout** | DockLayout, SplitLayout, LayerLayout, CardLayout, StackLayout, FlowLayout, GridLayout, ScrollLayout, OverlayLayout, AccordionLayout |

### 6.2 Static vs Live Rendering

When a component's factory function is NOT loaded (e.g., the page only
loads `diagramengine.js` without `datagrid.js`), the shape renders a
**static placeholder**:

```
┌──────────────────────────┐
│  ≡ DataGrid              │
│  ┌────┬────┬────┬────┐   │
│  │ ID │Name│Type│Act │   │
│  ├────┼────┼────┼────┤   │
│  │ ·  │ ·  │ ·  │ ·  │   │
│  │ ·  │ ·  │ ·  │ ·  │   │
│  └────┴────┴────┴────┘   │
└──────────────────────────┘
```

When the factory IS loaded, the actual component is instantiated inside
the shape with the configured options and persisted state.

---

## 7. Spatial Containment (Nesting)

### 7.1 Container Shapes

Device frames and layout containers act as **spatial containers** — shapes
dropped inside their content area are automatically parented to them.

```typescript
interface ShapeDefinition
{
    // ... existing properties ...

    /** Whether this shape acts as a spatial container. */
    isContainer?: boolean;

    /** Content area bounds for child shape containment (normalised 0-1). */
    contentArea?: { x: number; y: number; w: number; h: number };

    /** Whether shapes dropped inside auto-parent to this container. */
    autoMembership?: boolean;
}
```

### 7.2 Containment Behaviour

- **Drop inside**: when the user releases a shape inside a container's
  content area, the shape's `groupId` is set to the container's ID.
- **Move container**: all contained shapes move with it.
- **Resize container**: contained shapes can optionally scale proportionally
  or maintain their absolute positions.
- **Delete container**: option to delete children or orphan them.
- **Visual clipping**: contained shapes are visually clipped to the
  container's content area via SVG `<clipPath>`.

### 7.3 Nesting Depth

Containers can be nested (e.g., a DataGrid inside a card inside a browser
window). The engine tracks parent-child relationships via `groupId` chains.
Maximum recommended depth: 4 levels.

---

## 8. Additional Page Frame Sizes

### 8.1 App Icons

| Name | Size (px) | Category |
|------|-----------|----------|
| Icon 16x16 | 16 x 16 | Icons |
| Icon 24x24 | 24 x 24 | Icons |
| Icon 32x32 | 32 x 32 | Icons |
| Icon 48x48 | 48 x 48 | Icons |
| Icon 64x64 | 64 x 64 | Icons |
| Icon 96x96 | 96 x 96 | Icons |
| Icon 128x128 | 128 x 128 | Icons |
| Icon 256x256 | 256 x 256 | Icons |
| Icon 512x512 | 512 x 512 | Icons |
| Favicon 16x16 | 16 x 16 | Icons |
| Apple Touch 180x180 | 180 x 180 | Icons |

### 8.2 Device Screens

| Name | Size (px) | Category |
|------|-----------|----------|
| iPhone SE | 375 x 667 | Mobile |
| iPhone 15 | 393 x 852 | Mobile |
| iPhone 15 Pro Max | 430 x 932 | Mobile |
| Pixel 8 | 412 x 915 | Mobile |
| Galaxy S24 | 360 x 780 | Mobile |
| iPad Mini | 744 x 1133 | Tablet |
| iPad Air | 820 x 1180 | Tablet |
| iPad Pro 11" | 834 x 1194 | Tablet |
| iPad Pro 12.9" | 1024 x 1366 | Tablet |
| Surface Pro | 912 x 1368 | Tablet |
| MacBook Air 13" | 1280 x 800 | Laptop |
| MacBook Pro 14" | 1512 x 982 | Laptop |
| MacBook Pro 16" | 1728 x 1117 | Laptop |

---

## 9. Implementation Plan

### Phase 1: Embed Infrastructure

1. Add `EmbedDefinition` to `types.ts`
2. Add `EmbeddableComponentEntry` and embed registry to new `src/embed-registry.ts`
3. Add `registerEmbeddableComponent()` and `loadEmbedPack()` to engine API
4. Add embed rendering in `render-engine.ts` (`createEmbedContainer`,
   `instantiateComponent`, `renderPlaceholder`)
5. Add interaction mode toggling (double-click to enter, Escape/click-outside
   to exit)
6. Add state capture on exit and state restore on re-render
7. Add embed cleanup in `removeObjectEl()`
8. Tests for embed lifecycle

### Phase 2: Enterprise Theme Embed Pack

9. Create `src/embed-registry.ts` with all 91 component entries
10. Create `loadEmbedPack("enterprise-theme")` convenience method
11. Test with DataGrid, DatePicker, ColorPicker (representative samples)
12. Demo page showing embedded components

### Phase 3: Device Frame Stencils

13. Create `src/stencils-devices.ts` with 12 device frame shapes
14. Implement photorealistic and schematic frame styles
15. Define content areas for each frame
16. Register as `loadStencilPack("devices")`
17. Demo page with device frames containing embedded components

### Phase 4: Spatial Containment

18. Add `isContainer`, `contentArea`, `autoMembership` to ShapeDefinition
19. Implement drop-inside detection in SelectTool
20. Implement move-with-parent and resize behaviour
21. Implement visual clipping via `<clipPath>`
22. Tests for containment lifecycle

### Phase 5: UI Component Stencils

23. Create `src/stencils-ui-components.ts` with static SVG previews
24. Register as `loadStencilPack("ui-components")`
25. Demo page showing static vs live component rendering

### Phase 6: Additional Page Frames + Polish

26. Add icon and device page frame sizes
27. Add presentation mode toggle
28. Polish interaction mode transitions (animations, visual feedback)
29. Comprehensive tests

---

## 10. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Component CSS conflicts inside foreignObject | Style leakage between diagram and embedded component | Scoped containers with CSS isolation; components use var(--theme-*) tokens consistently |
| Performance with many embedded components | Slow rendering with 20+ live DataGrids | Lazy instantiation — only instantiate components visible in viewport |
| foreignObject browser inconsistencies | Some SVG features don't work inside foreignObject | Test across Chrome, Firefox, Safari; graceful fallback to placeholder |
| Component resize on shape resize | Components may not handle dynamic resize well | Debounce resize events; call component.resize() if available |
| Circular embedding | User embeds a browser frame inside another browser frame | Allow but cap nesting depth at 4; warn in console at depth 3 |
| State serialisation size | Large DataGrid state bloats JSON | Compress state; offer option to exclude state from export |

---

## 11. Dependencies

| Dependency | Required | Purpose |
|-----------|----------|---------|
| Enterprise theme components | Optional (soft) | Each component loaded independently via `<script>` tag |
| Component CSS files | Optional (soft) | Loaded via `<link>` or injected dynamically |
| DiagramEngine | Yes | Host engine for embed infrastructure |

The embed system has **zero hard dependencies** on specific components.
Components are discovered at runtime via `window[factoryName]`. If a
component is not loaded, a placeholder is rendered instead.
