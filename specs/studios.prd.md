# Studio Applications — PRD & Technical Specification

> **Status:** Draft
> **Author:** Claude (agent)
> **Date:** 2026-03-22

---

## 1. Overview

Three standalone studio applications that transform the Enterprise Theme
from a component library into a design platform. Each studio is a
single-page HTML app using localStorage for persistence, deployed
alongside demo pages on the CDN.

| Studio | Purpose | Primary Component |
|--------|---------|-------------------|
| **Ribbon Studio** | Visual ribbon toolbar designer | RibbonBuilder |
| **Layout Studio** | Drag-and-drop UI mockup designer | DiagramEngine |
| **Shape Studio** | Custom vector shape editor | DiagramEngine |

**Deployment:** `demo/studio/` in source, copied to `dist/demo/studio/`
by the build. Linked from the demo index page and docs landing page.

---

## 2. Ribbon Studio

### 2.1 Goal

Promote the RibbonBuilder demo to a full application with file
management, multi-ribbon persistence, and polished UX. Users can
design, save, load, and export ribbon configurations without a backend.

### 2.2 File

`demo/studio/ribbon-studio.html`

### 2.3 Features

#### File Management
- **New** — create a blank ribbon config with a name prompt
- **Save** — persist current config to localStorage under its name
- **Save As** — clone current config with a new name
- **Open** — file list dialog showing all saved ribbons with
  last-modified timestamp and tab count
- **Delete** — remove a saved ribbon with confirmation
- **Auto-save** — debounced 2-second auto-save on every change

#### Storage Format

```
localStorage key: "ribbon-studio:files"
value: JSON object { [filename]: { config: RibbonOptions, modified: ISO8601 } }

localStorage key: "ribbon-studio:active"
value: filename string of the currently open file
```

#### Export / Import
- **Export JSON** — download `.json` file with ribbon config
- **Export Markdown** — download `.md` file (agent-consumable spec)
- **Copy JSON** — copy config to clipboard
- **Import JSON** — file picker or paste dialog to import config
- **Import from URL** — fetch JSON from a URL

#### Layout

```
┌────────────────────────────────────────────────────────┐
│ ⚙ Ribbon Studio          [New] [Open] [Save] [Export▾]│
│ File: "My Ribbon"  (auto-saved)     [Theme] [?]       │
├────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────┐   │
│ │           Live Ribbon Preview (full width)       │   │
│ └──────────────────────────────────────────────────┘   │
│ ┌──────────────┬───────────────────────────────────┐   │
│ │ Structure    │ Properties Panel                  │   │
│ │ Tree         │                                   │   │
│ │              │ (tab / group / control props)     │   │
│ │ [+Tab]       │                                   │   │
│ │ [+Group]     │                                   │   │
│ │ [+Control]   │                                   │   │
│ └──────────────┴───────────────────────────────────┘   │
└────────────────────────────────────────────────────────┘
```

#### Components Used
- `RibbonBuilder` — the core WYSIWYG editor
- `Ribbon` — live preview rendering
- `ThemeToggle` — dark/light mode
- `SymbolPicker` — icon selection (already a RibbonBuilder dependency)

### 2.4 Implementation Notes

- Wrap the existing `createRibbonBuilder()` call with file management UI
- The RibbonBuilder already handles: structure tree, property panel, live
  preview, drag-and-drop reorder, icon picker, export
- New code: file toolbar, localStorage CRUD, import/export dialogs
- Start with a default "Untitled Ribbon" containing one empty tab

---

## 3. Layout Studio

### 3.1 Goal

A Balsamiq/Figma-like mockup designer where users drag library
components onto device frames to compose application screens. Each
screen is a "page" stored in localStorage.

### 3.2 File

`demo/studio/layout-studio.html`

### 3.3 Features

#### Component Palette (Left Sidebar)
- Collapsible categories matching embed registry:
  Data, Input, Content, Feedback, Navigation, AI, Governance,
  Layout, Social, Other
- Each entry shows: icon + label + default size
- **Drag** from palette → **drop** on canvas to create shape
- Search/filter input at top of palette

#### Device Frames (Toolbar)
- Quick-add buttons for: Browser, Mobile, Tablet, macOS, Dialog, Card
- Clicking adds the device frame centered on viewport
- Components dropped inside a device frame auto-parent to it

#### Canvas (Center)
- DiagramEngine instance with:
  - Grid: dots, 20px
  - All stencil packs loaded (devices + ui-components)
  - Enterprise theme embed pack loaded
  - Select, Draw, Pan, Zoom tools
- When a component shape is selected, the property panel shows
  its embed options for editing

#### Property Panel (Right Sidebar)
- Shows when an object is selected
- For embedded components: JSON editor for component options
- For device frames: frame style (clean/sketch), title text
- For all: position, size, fill, stroke, opacity

#### Page Management
- Tabs bar above the canvas showing all pages
- **New Page** button (+ icon)
- **Rename Page** — double-click tab to edit name
- **Delete Page** — right-click context menu or X button
- **Duplicate Page** — right-click context menu
- Each page is a separate DiagramEngine document (JSON)

#### Storage Format

```
localStorage key: "layout-studio:project"
value: JSON {
    name: string,
    pages: [
        { id: string, name: string, document: DiagramDocument JSON }
    ],
    activePageId: string,
    modified: ISO8601
}
```

#### Export / Import
- **Export Project** — download all pages as single JSON file
- **Export Current Page** — download current page as SVG or JSON
- **Import Project** — upload JSON file
- **Export HTML Scaffold** — generate a basic HTML page with the
  component layout (stretch goal)

#### Layout

```
┌───────────────────────────────────────────────────────────────┐
│ 🎨 Layout Studio       [Save] [Export▾]  [Import]   [Theme]  │
│ Project: "My App"  (auto-saved)                               │
├──────┬────────────────────────────────────────────────┬───────┤
│Comps │  [Page 1] [Page 2] [Page 3] [+]               │Props  │
│──────│                                                │───────│
│🔍    │                                                │       │
│      │          DiagramEngine Canvas                  │ x: _  │
│▸ Data│                                                │ y: _  │
│  Grid│     ┌──Browser Frame──────────┐                │ w: _  │
│  Tree│     │ ┌─Toolbar─────────────┐ │                │ h: _  │
│      │     │ │ [⊕][✎][🗑] [↻]     │ │                │       │
│▸Input│     │ ├─DataGrid────────────┤ │                │Fill:  │
│  Date│     │ │ ID │ Name  │ Status │ │                │ ...   │
│  Time│     │ │  1 │ Dash  │ Active │ │                │       │
│  ...│      │ └─────────────────────┘ │                │Embed: │
│      │     └─────────────────────────┘                │{opts} │
│▸Nav  │                                                │       │
│  ...│                                                 │       │
└──────┴────────────────────────────────────────────────┴───────┘
```

#### Drag-and-Drop from Palette

When the user starts dragging a component from the palette:

1. Create a ghost element showing the component icon + label
2. On drop over the canvas, calculate the canvas position from the
   mouse coordinates using the engine's viewport transform
3. Call `engine.addObject()` with:
   - `shape: "rectangle"` (for embedded components)
   - `embed: { component: name, options: defaultOptions }`
   - `bounds` at the drop position with the component's defaultSize
4. If dropped inside a device frame, auto-parent via containment

#### Components Used
- `DiagramEngine` — canvas engine (all packs loaded)
- All 91 embeddable components (JS + CSS)
- `ThemeToggle` — dark/light mode

### 3.4 Implementation Notes

- The engine already supports everything needed: shapes, embed,
  containment, serialization to/from JSON
- New code: palette sidebar, page tabs, property panel, drag-drop
  bridge, localStorage persistence
- Start with a default project containing one blank page
- Load all 91 component scripts and CSS (same as current demo page)
- Canvas height: `calc(100vh - header - tabs)` for full-screen feel

---

## 4. Shape Studio

### 4.1 Goal

A vector shape editor where users can draw, edit, and save custom
shapes using Pen, Brush, and Draw tools. Saved shapes can be exported
as SVG files or as DiagramEngine ShapeDefinition JSON for use in
diagrams.

### 4.2 File

`demo/studio/shape-studio.html`

### 4.3 Features

#### Canvas
- DiagramEngine instance with:
  - Fine grid: 10px, lines style
  - Select, Draw, Pen, Brush, Highlighter, Paintbrush tools
  - Ultra zoom (32x) for pixel-level precision
  - All basic + extended shape types available

#### Tool Panel (Left Sidebar)
- **Select** (S) — select, move, resize, rotate
- **Draw** — rectangle, ellipse, diamond, hexagon, star, triangle,
  arrow shapes with shape picker
- **Pen** (P) — draw custom paths, click near start to close shape
- **Brush** (B) — freehand brush strokes
- **Highlighter** (H) — translucent highlight strokes
- **Paintbrush** — raster painting inside paintable shapes
- **Text** (T) — add text labels
- **Measure** — measure distances and angles

#### Tool Options Bar (Below Toolbar)
- Context-sensitive options for the active tool:
  - Pen: fill color, stroke color, stroke width
  - Brush: stroke color, stroke width
  - Paintbrush: brush size, shape, color, alpha, hardness
  - Highlighter: color presets
  - Draw: shape type selector

#### Shape Library Panel (Right Sidebar)
- List of saved shapes with thumbnails
- **Save Current** — save selected objects as a named shape
- **Load** — place a saved shape on the canvas
- **Delete** — remove a saved shape
- **Rename** — edit shape name
- **Export SVG** — download shape as SVG file
- **Export JSON** — download as ShapeDefinition JSON

#### File Management
- **New Canvas** — clear canvas with confirmation
- **Save Canvas** — save entire canvas state to localStorage
- **Open Canvas** — load a saved canvas state
- **Canvas List** — show all saved canvases

#### Storage Format

```
localStorage key: "shape-studio:canvases"
value: JSON { [name]: { document: DiagramDocument JSON, modified: ISO8601 } }

localStorage key: "shape-studio:shapes"
value: JSON { [name]: { svg: string, bounds: Rect, modified: ISO8601 } }

localStorage key: "shape-studio:active"
value: canvas name string
```

#### Layout

```
┌───────────────────────────────────────────────────────────────┐
│ ✏ Shape Studio     [New] [Open] [Save]  [Export▾]    [Theme]  │
│ Canvas: "My Shapes"  (auto-saved)                             │
├───────┬───────────────────────────────────────────────┬───────┤
│Tools  │                                               │Shapes │
│───────│          DiagramEngine Canvas                 │───────│
│[→]Sel │          (fine grid, 10px)                    │🔍     │
│[□]Rect│                                               │       │
│[○]Ell │                                               │ Arrow │
│[◇]Dia │       ┌──────────────────┐                    │ [img] │
│[✦]Star│       │   User-drawn     │                    │       │
│[✎]Pen │       │   custom shape   │                    │ Star  │
│[/]Bru │       │                  │                    │ [img] │
│[H]Hlt │       └──────────────────┘                    │       │
│[🖌]Pnt│                                               │[Save] │
│[T]Txt │                                               │       │
│[📏]Msr│                                               │       │
│       │ Tool options: [color] [width] [size] ...      │       │
└───────┴───────────────────────────────────────────────┴───────┘
```

#### Components Used
- `DiagramEngine` — canvas engine (basic shapes only, no stencil packs)
- `ColorPicker` — colour selection for tools
- `Slider` — brush size, opacity controls
- `ThemeToggle` — dark/light mode
- `GradientPicker` — gradient fills

### 4.4 Implementation Notes

- The engine already has all tools needed (12 tools, 38 shapes)
- New code: tool panel, shape library sidebar, file management,
  SVG export for individual shapes
- The Pen tool close-shape feature (Z fill) is key for creating
  reusable shapes
- Start with a blank canvas named "Untitled"

---

## 5. Shared Infrastructure

### 5.1 Studio Shell

A shared CSS file `demo/studio/studio-shell.css` providing:
- Full-viewport layout (no scroll on body)
- Header bar with app name, file controls, theme toggle
- Three-column layout: left sidebar, center content, right sidebar
- Collapsible sidebars
- File dialogs (modal overlays for open/save/export)
- Tab bar for multi-page/multi-file

### 5.2 Storage Helpers

A shared JS file `demo/studio/studio-storage.js` providing:
- `StudioStorage.save(namespace, key, data)` — save to localStorage
- `StudioStorage.load(namespace, key)` — load from localStorage
- `StudioStorage.delete(namespace, key)` — delete from localStorage
- `StudioStorage.list(namespace)` — list all keys in namespace
- `StudioStorage.exportAll(namespace)` — export all data as JSON
- `StudioStorage.importAll(namespace, json)` — import data from JSON
- Auto-save debounce helper

### 5.3 Common File Dialog

Reusable modal for file operations:
- File list with name, modified date, size info
- New/rename/delete actions
- Search/filter
- Used by all three studios

### 5.4 Directory Structure

```
demo/studio/
├── ribbon-studio.html
├── layout-studio.html
├── shape-studio.html
├── studio-shell.css       (shared layout styles)
└── studio-storage.js      (shared localStorage helpers)
```

---

## 6. Integration Points

### 6.1 Demo Index Page

Add a "Studios" section to `demo/index.html` above the component cards:

```html
<div class="studio-cards">
    <a href="studio/ribbon-studio.html" class="studio-card">
        <i class="bi bi-layout-text-window"></i>
        <h3>Ribbon Studio</h3>
        <p>Design ribbon toolbars visually</p>
    </a>
    <a href="studio/layout-studio.html" class="studio-card">
        <i class="bi bi-grid-1x2"></i>
        <h3>Layout Studio</h3>
        <p>Compose UI mockups with real components</p>
    </a>
    <a href="studio/shape-studio.html" class="studio-card">
        <i class="bi bi-vector-pen"></i>
        <h3>Shape Studio</h3>
        <p>Create custom vector shapes</p>
    </a>
</div>
```

### 6.2 Docs Landing Page

Add a "Studio Apps" section to the docs nav and index.

### 6.3 Component Demo Pages

- RibbonBuilder demo: add "Open in Ribbon Studio →" link
- DiagramEngine demo: add "Open in Layout Studio →" and
  "Open in Shape Studio →" links

---

## 7. Implementation Order

1. **Shared infrastructure** — studio-shell.css + studio-storage.js
2. **Ribbon Studio** — smallest delta, wraps existing RibbonBuilder
3. **Shape Studio** — moderate, wraps existing DiagramEngine tools
4. **Layout Studio** — largest, needs palette + drag-drop + pages

---

## 8. Non-Goals (v1)

- No collaboration / real-time sync
- No server-side persistence (localStorage only)
- No undo/redo beyond what DiagramEngine/RibbonBuilder already provide
- No code generation from Layout Studio (stretch goal)
- No plugin/extension system
- No user accounts or sharing links
