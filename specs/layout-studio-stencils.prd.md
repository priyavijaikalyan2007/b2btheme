# Layout Studio — Detailed Component Stencils PRD

> **Status:** Draft
> **Date:** 2026-03-23
> **Depends on:** `specs/studios.prd.md` (Layout Studio section)

---

## 1. Goal

Replace the minimal generic SVG placeholders in
`stencils-ui-components.ts` with **detailed, Balsamiq-quality wireframe
renderings** for all 93 modelable components. Each stencil renders a
visually recognizable representation of the component — close enough
that screenshots of the layout can be given to a coding agent and
it will understand the intended UI.

**Fidelity target:** between Balsamiq (low-fi wireframe) and Figma
(high-fi mockup). Users can see what each component IS at a glance,
and the stencil includes editable details (column names in a grid,
button labels in a toolbar, nav items in a sidebar).

---

## 2. Architecture

### 2.1 Shape Parameters

Each stencil uses the DiagramEngine's `parameters` field on
`presentation` to store editable properties. When the user selects a
component shape, the property panel reads these parameters and shows
appropriate editors (text inputs, lists, etc.).

```typescript
// Example: DataGrid stencil parameters
presentation: {
    shape: "datagrid",
    parameters: {
        columns: "ID, Name, Status, Date",    // comma-separated column names
        rows: 5,                               // number of visible rows
        headerBg: "#f8f9fa",                   // header background colour
        striped: true,                         // alternating row colours
    }
}
```

The stencil's `render()` function reads these parameters to draw the
appropriate content. Default values are provided when parameters are
missing.

### 2.2 Rendering Approach

All stencils render pure SVG using `svgCreate()`. No HTML, no
foreignObject, no external dependencies. This ensures:
- Reliable rendering in all browsers
- Clean SVG export
- No dependency on component JS being loaded
- Fast rendering for 50+ shapes on canvas

### 2.3 Visual Style

- **Clean mode:** Filled rectangles, solid borders, clear text labels.
  Colours match the theme (white backgrounds, #dee2e6 borders,
  #212529 text, #0d6efd primary accents).
- **Sketch mode:** Dashed borders, no fills, hand-drawn feel.
  Matches the device frame sketch mode.

---

## 3. Component Stencil Specifications

### 3.1 Tier System

Components are grouped into 3 tiers by rendering detail:

| Tier | Count | Description |
|------|-------|-------------|
| **A — Custom** | ~25 | Fully detailed SVG with editable parameters |
| **B — Enhanced** | ~35 | Improved generic variant with component-specific tweaks |
| **C — Basic** | ~33 | Simple label + icon + border (current generic but improved) |

### 3.2 Tier A — Custom Detailed Stencils (25 components)

Each has a dedicated render function with component-specific visuals.

#### Data Components

**DataGrid** (`datagrid`)
- Parameters: `columns` (string, comma-separated), `rows` (number),
  `striped` (boolean), `showHeader` (boolean)
- Render: Header row with column names in bold, data rows with
  placeholder text (· · ·), alternating row backgrounds if striped,
  column dividers, optional footer with page controls
- Default: 4 columns (ID, Name, Status, Date), 5 rows

**TreeGrid** (`treegrid`)
- Parameters: `columns` (string), `rows` (number), `expanded` (boolean)
- Render: Like DataGrid but first column shows tree indent arrows
  (▸/▾) with indented child rows
- Default: 3 columns (Name, Type, Size), 4 rows with 2 levels

**TreeView** (`treeview`)
- Parameters: `items` (string, semicolon-separated), `expanded` (boolean)
- Render: Vertical list with indent levels, folder/file icons,
  expand/collapse arrows
- Default: "Project; src; index.ts; app.ts; README.md" with 2 levels

**PropertyInspector** (`propertyinspector`)
- Parameters: `items` (string, semicolon-separated)
- Render: Two-column label-value layout, alternating row backgrounds
- Default: "Name: Widget; Type: Button; Width: 200px; Height: 40px"

#### Input Components

**SearchBox** (`searchbox`)
- Parameters: `placeholder` (string)
- Render: Rounded input field with magnifying glass icon + placeholder
- Default: "Search..."

**EditableComboBox** (`editablecombobox`)
- Parameters: `placeholder` (string)
- Render: Input field with dropdown chevron icon
- Default: "Select..."

**DatePicker** (`datepicker`)
- Parameters: `value` (string)
- Render: Input field with calendar icon + date value
- Default: "2026-03-23"

**Slider** (`slider`)
- Parameters: `min` (number), `max` (number), `value` (number)
- Render: Horizontal track line with circular thumb at value position,
  min/max labels at ends
- Default: 0 to 100, value 50

**ColorPicker** (`colorpicker`)
- Parameters: `value` (string, hex)
- Render: Colour swatch rectangle + hex value text + small
  saturation/brightness gradient preview
- Default: "#3b82f6"

#### Content Components

**CodeEditor** (`codeeditor`)
- Parameters: `language` (string), `lines` (number)
- Render: Dark background (#1e1e1e), line numbers on left (1-N),
  syntax-coloured placeholder text lines, language badge top-right
- Default: "typescript", 8 lines

**MarkdownEditor** (`markdowneditor`)
- Parameters: `toolbar` (boolean)
- Render: Toolbar row with B/I/Link/List icons, text area with
  markdown-formatted placeholder (# heading, paragraph, - list item)
- Default: toolbar visible

**DocViewer** (`docviewer`)
- Parameters: `title` (string)
- Render: Title bar, page-like content area with heading + paragraph
  placeholder lines
- Default: "Document Title"

#### Feedback Components

**Toast** (`toast`)
- Parameters: `message` (string), `variant` (string)
- Render: Small rounded rectangle with icon (check/warning/info) +
  message text + close X button
- Default: "Operation completed successfully", variant "success"

**Stepper** (`stepper`)
- Parameters: `steps` (string, comma-separated), `active` (number)
- Render: Horizontal circles connected by lines, step labels below,
  completed steps filled, active step highlighted
- Default: "Cart, Shipping, Payment, Done", active 2

**ConfirmDialog** / **ErrorDialog** / **FormDialog** (`confirmdialog`, `errordialog`, `formdialog`)
- Parameters: `title` (string), `message` (string)
- Render: Dialog chrome (title bar with close X), message text,
  button row (OK/Cancel for confirm, OK for error, Submit/Cancel
  for form). FormDialog adds input field placeholders.
- Default: "Confirm Action" / "Error" / "Form"

#### Navigation Components

**Toolbar** (`toolbar`)
- Parameters: `buttons` (string, comma-separated icon:label pairs)
- Render: Horizontal bar with button outlines, each showing icon +
  label. Separator lines between groups.
- Default: "plus:New, pencil:Edit, trash:Delete | refresh:Refresh"

**Sidebar** (`sidebar`)
- Parameters: `items` (string, semicolon-separated), `title` (string)
- Render: Title bar at top, vertical nav items with icons + labels,
  active item highlighted
- Default: "Dashboard; Projects; Tasks; Settings"

**TabbedPanel** (`tabbedpanel`)
- Parameters: `tabs` (string, comma-separated)
- Render: Tab bar at top with tab labels (first active/underlined),
  content area below with placeholder lines
- Default: "General, Advanced, About"

**Ribbon** (`ribbon`)
- Parameters: `tabs` (string, comma-separated)
- Render: Tab bar + panel area with group outlines and button
  placeholders inside groups
- Default: "Home, Insert, View"

**Breadcrumb** (`breadcrumb`)
- Parameters: `items` (string, comma-separated)
- Render: Horizontal chain: item > item > item (last bold, no chevron)
- Default: "Home, Products, Detail"

**StatusBar** (`statusbar`)
- Parameters: `items` (string, comma-separated)
- Render: Thin horizontal bar with left-aligned + right-aligned text
- Default: "Ready, Ln 42 Col 8, UTF-8"

#### AI Components

**Conversation** (`conversation`)
- Parameters: `messages` (number)
- Render: Chat interface: alternating user/assistant message bubbles
  (left/right aligned), input bar at bottom with send button
- Default: 3 messages

#### Social Components

**ActivityFeed** (`activityfeed`)
- Parameters: `items` (number)
- Render: Vertical timeline with dots, each entry showing avatar
  circle + name + action text + timestamp
- Default: 4 items

**Timeline** (`timeline`)
- Parameters: `items` (string, comma-separated)
- Render: Horizontal timeline with markers, dates above, labels below
- Default: "Jan, Feb, Mar, Apr, May"

### 3.3 Tier B — Enhanced Generic Stencils (35 components)

These use improved versions of the 7 variant renderers with
component-specific icon, label, and minor visual tweaks.

| Component | Variant | Enhancement |
|-----------|---------|-------------|
| MultiSelectCombo | input | Dropdown chevron + tag pills inside |
| PeoplePicker | input | Person icon + "Add people..." text |
| TimePicker | input | Clock icon + "12:00" value |
| DurationPicker | input | Hourglass icon + "2h 30m" value |
| CronPicker | panel | Clock icon + cron expression "0 */5 * * *" |
| TimezonePicker | input | Globe icon + "UTC-5" value |
| PeriodPicker | input | Calendar icon + "Q1 2026" value |
| SprintPicker | input | Kanban icon + "Sprint 4" value |
| GradientPicker | panel | Small gradient bar preview |
| AnglePicker | default | Circle with angle indicator line |
| FontDropdown | input | "Aa" icon + "Inter" value |
| SymbolPicker | panel | Grid of small squares (icon grid) |
| FileUpload | panel | Cloud upload icon + "Drop files here" |
| Tagger | input | Tag icon + pill tags inside |
| RichTextInput | input | B/I/U toolbar mini-bar + text area |
| MaskedEntry | input | Bullet dots + format hint |
| LineEndingPicker | input | Arrow icon + arrow preview |
| LineShapePicker | input | Curve icon + curve preview |
| LineTypePicker | input | Dashed line preview |
| LineWidthPicker | input | Thick/thin line preview |
| Magnifier | default | Circle with + icon (zoom lens) |
| Ruler | input | Tick marks with numbers |
| PromptTemplateManager | panel | Template list with edit/delete |
| ReasoningAccordion | list | Expandable sections with ▸/▾ |
| AuditLogViewer | table | Timestamp + user + action columns |
| PermissionMatrix | table | Checkbox grid with role headers |
| ShareDialog | panel | User list + permissions dropdown |
| NotificationCenter | list | Bell icon + notification entries |
| WorkspaceSwitcher | panel | Workspace cards with icons |
| UserMenu | list | Avatar + menu items |
| FileExplorer | panel | Tree + file list split view |
| AppLauncher | panel | Grid of app icons (3x3) |
| LogConsole | list | Monospace text lines with timestamps |
| Gauge | default | Semicircle gauge with needle + value |
| EmptyState | default | Large icon + "No data" text + action button |

### 3.4 Tier C — Basic Stencils (33 components)

Improved generic rendering with better proportions and more fill.
These are mostly layout containers and small UI atoms.

| Component | Improvement |
|-----------|-------------|
| All layouts (10) | Show split/dock/grid lines inside the shape |
| PersonChip | Avatar circle + name text inline |
| PresenceIndicator | Small green dot + "Online" text |
| Pill | Rounded rectangle with short label |
| TypeBadge | Small coloured badge with text |
| StatusBadge | Dot + status text |
| HelpTooltip | ? icon in circle |
| HelpDrawer | Panel with ? header + content lines |
| BannerBar | Coloured bar with icon + message text |
| GraphToolbar | Button row with graph-specific icons |
| SkeletonLoader | Animated-looking grey bars |
| ProgressModal | Progress bar + percentage text |
| GuidedTour | Tooltip pointer with step text |
| CommandPalette | Search input + command list |
| ActionItems | Checkbox list with items |
| FacetSearch | Search input with filter tag pills |
| ThemeToggle | Sun/moon icon toggle |
| ConfirmDialog | (covered in Tier A) |
| ErrorDialog | (covered in Tier A) |
| FormDialog | (covered in Tier A) |
| RelationshipManager | (use table variant) |
| RibbonBuilder | (use panel variant with tree) |
| SpineMap | (use default with bezier curves) |
| GraphCanvas | (use default with node/edge diagram) |

---

## 4. Property Panel Integration

### 4.1 Component-Specific Editors

When a component shape is selected in the Layout Studio, the property
panel shows editors appropriate to that component's parameters:

- **String parameters:** Text input
- **Number parameters:** Number input with step
- **Boolean parameters:** Checkbox
- **List parameters (comma/semicolon-separated):** Text input with
  helper text explaining the format
- **Colour parameters:** Colour input (native picker)

### 4.2 Parameter Metadata

Each stencil shape definition includes a `parameterSchema` object
describing its editable parameters:

```typescript
parameterSchema: {
    columns: { type: "string", label: "Columns", default: "ID, Name, Status, Date",
               help: "Comma-separated column names" },
    rows:    { type: "number", label: "Rows", default: 5, min: 1, max: 20 },
    striped: { type: "boolean", label: "Striped", default: true },
}
```

The Layout Studio reads this schema to build the property panel UI
dynamically.

---

## 5. Implementation Plan

### Phase 1: Infrastructure
1. Add `parameterSchema` field to `ShapeDefinition` interface
2. Update Layout Studio property panel to read parameter schema
   and build dynamic editors
3. Update `buildUiComponentShape()` builder to accept a render function

### Phase 2: Tier A Stencils (25 custom renders)
4. Data components: DataGrid, TreeGrid, TreeView, PropertyInspector
5. Input components: SearchBox, EditableComboBox, DatePicker, Slider,
   ColorPicker
6. Content components: CodeEditor, MarkdownEditor, DocViewer
7. Feedback components: Toast, Stepper, ConfirmDialog, ErrorDialog,
   FormDialog
8. Navigation components: Toolbar, Sidebar, TabbedPanel, Ribbon,
   Breadcrumb, StatusBar
9. AI + Social: Conversation, ActivityFeed, Timeline

### Phase 3: Tier B Stencils (35 enhanced generics)
10. Update variant renderers with component-specific tweaks
11. Add per-component default parameters

### Phase 4: Tier C Stencils (33 basic improvements)
12. Improve generic renderers with better proportions
13. Add layout-specific line patterns

### Phase 5: Polish
14. Ensure all 93 stencils render well at common sizes
15. Test clean vs sketch mode for all tiers
16. Update Layout Studio palette with component previews

---

## 6. Constraints

- All rendering via SVG (`svgCreate`) — no HTML, no foreignObject
- Each render function under 30 lines — extract helpers
- Stencils file should not exceed 3,000 lines (use shared helpers)
- Parameters are optional — stencils render sensible defaults
- Clean + sketch mode support for all tiers
- Text rendering via SVG `<text>` elements (no `foreignObject`)
