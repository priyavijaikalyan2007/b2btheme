<!-- AGENT: Documentation for the Ribbon component — Microsoft Office-style tabbed toolbar with adaptive groups, menu bar, QAT, backstage, KeyTips, and 13 control types. -->

# Ribbon

A Microsoft Office-style tabbed toolbar for organizing commands and controls into logical groups. Each tab reveals a panel of grouped controls arranged in rows, supporting large, small, and mini button sizes. Includes an optional traditional menu bar, Quick Access Toolbar (QAT), contextual tabs, backstage panel, adaptive group collapsing, multi-level KeyTips, and inline gallery controls.

## Features

- **Tabbed panels** — context-based tool switching (Home, Insert, Design, etc.)
- **13 control types** — button, split-button, gallery, dropdown, input, color, number, checkbox, toggle, separator, label, custom
- **Three button sizes** — large (icon above label), small (icon left of label), mini (icon only)
- **Adaptive collapse** — groups progressively collapse (full → medium → small → mini → overflow) as the ribbon narrows
- **Quick Access Toolbar** — thin strip of pinned actions above or below the tab bar
- **Menu bar** — optional traditional dropdown menus with nested submenus above the tabs
- **Contextual tabs** — dynamic tabs that appear based on selection context with coloured accent
- **Backstage panel** — full-overlay panel (like File tab) with sidebar navigation and content area
- **Multi-level KeyTips** — Alt shows letter badges on tabs → type letter → badges on controls
- **Gallery controls** — inline preview row with "More" dropdown grid or list
- **Collapsible** — minimize ribbon to just the tab bar; click a tab to temporarily expand
- **Component hosting** — embed pickers, switchers, and other components via custom control type
- **Configurable colours** — 13 CSS custom properties, all settable via options or `setColors()`
- **Full keyboard accessibility** — WAI-ARIA roles, roving tabindex, arrow navigation
- **Layout integration** — `position: relative` for embedding in DockLayout, BorderLayout, etc.

## Assets

| Asset | Path |
|-------|------|
| CSS | `components/ribbon/ribbon.css` |
| JS | `components/ribbon/ribbon.js` |
| Types | `components/ribbon/ribbon.d.ts` |

**Requires:** Bootstrap CSS (for SCSS variables), Bootstrap Icons CSS. Does **not** require a JavaScript framework.

## Quick Start

```html
<link rel="stylesheet" href="components/ribbon/ribbon.css">
<script src="components/ribbon/ribbon.js"></script>
<script>
    var ribbon = createRibbon({
        tabs: [
            {
                id: "home",
                label: "Home",
                keyTip: "H",
                groups: [
                    {
                        id: "clipboard",
                        label: "Clipboard",
                        collapsePriority: 30,
                        controls: [
                            { type: "button", id: "paste", label: "Paste", icon: "bi bi-clipboard", size: "large", keyTip: "V" },
                            { type: "button", id: "cut", label: "Cut", icon: "bi bi-scissors", size: "small", keyTip: "X" },
                            { type: "button", id: "copy", label: "Copy", icon: "bi bi-files", size: "small", keyTip: "C" }
                        ]
                    },
                    {
                        id: "font",
                        label: "Font",
                        collapsePriority: 50,
                        controls: [
                            { type: "dropdown", id: "font-family", options: [{ value: "Arial", label: "Arial" }, { value: "Times New Roman", label: "Times New Roman" }], value: "Arial", width: "120px" },
                            { type: "dropdown", id: "font-size", options: [{ value: "11", label: "11" }, { value: "12", label: "12" }, { value: "14", label: "14" }], value: "11", width: "55px" },
                            { type: "button", id: "bold", label: "Bold", icon: "bi bi-type-bold", size: "mini", toggle: true, keyTip: "B" },
                            { type: "button", id: "italic", label: "Italic", icon: "bi bi-type-italic", size: "mini", toggle: true, keyTip: "I" }
                        ]
                    }
                ]
            }
        ],
        qat: [
            { id: "save", icon: "bi bi-floppy", tooltip: "Save", keyTip: "1" },
            { id: "undo", icon: "bi bi-arrow-counterclockwise", tooltip: "Undo", keyTip: "2" },
            { id: "redo", icon: "bi bi-arrow-clockwise", tooltip: "Redo", keyTip: "3" }
        ]
    }, "ribbon-container");
</script>
```

## API

### Factory

```typescript
createRibbon(options: RibbonOptions, containerId?: string): Ribbon
```

Creates a Ribbon instance. If `containerId` is provided, the ribbon is shown immediately.

### RibbonOptions

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `tabs` | `RibbonTab[]` | **required** | Array of tab definitions |
| `activeTabId` | `string` | First tab | Initially active tab ID |
| `menuBar` | `RibbonMenuBarItem[]` | — | Optional menu bar items |
| `qat` | `RibbonQATItem[]` | — | Quick Access Toolbar items |
| `qatPosition` | `"above" \| "below"` | `"above"` | QAT position relative to tab bar |
| `panelHeight` | `number` | `86` | Panel height in pixels |
| `groupOverflow` | `"visible" \| "hidden"` | `"visible"` | Overflow for hosted components |
| `collapsible` | `boolean` | `true` | Allow ribbon collapse |
| `collapsed` | `boolean` | `false` | Start collapsed |
| `adaptive` | `boolean` | `true` | Enable adaptive group collapse |
| `keyTips` | `boolean` | `true` | Enable multi-level KeyTips |
| `onTabChange` | `(tabId) => void` | — | Tab switch callback |
| `onCollapse` | `(collapsed) => void` | — | Collapse/expand callback |
| `onQATCustomize` | `(items) => void` | — | QAT customize callback |
| `onControlClick` | `(controlId) => void` | — | Any control click callback |
| `statusBar` | `HTMLElement \| () => HTMLElement` | — | Right-aligned status area in the tab bar (user info, entity name, version badge, etc.) |
| `autoCollapseDelay` | `number` | `0` | Auto-collapse delay in ms after temp-expanding (0 = disabled, min 5000) |
| `cssClass` | `string` | — | Additional CSS class on root |
| `keyBindings` | `Record<string, string>` | — | Custom key bindings |
| **Colour options** | `string` | — | See Colour Configuration below |

### RibbonTab

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Unique tab identifier |
| `label` | `string` | Tab display label |
| `groups` | `RibbonGroup[]` | Groups of controls in this tab |
| `contextual` | `boolean` | Hidden by default, shown via API |
| `accentColor` | `string` | Contextual tab accent colour |
| `backstage` | `boolean` | Opens backstage instead of panel |
| `backstageContent` | `HTMLElement \| () => HTMLElement` | Backstage main content |
| `backstageSidebar` | `RibbonBackstageItem[]` | Backstage sidebar items |
| `keyTip` | `string` | KeyTip letter for this tab |

### RibbonGroup

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Unique group identifier |
| `label` | `string` | Group label (shown below controls) |
| `controls` | `RibbonControl[]` | Array of controls |
| `collapsePriority` | `number` | Lower collapses first (default 50) |
| `collapseStages` | `RibbonCollapseStage[]` | Custom collapse stages |

### Control Types

#### button

| Property | Type | Description |
|----------|------|-------------|
| `type` | `"button"` | Control type |
| `id` | `string` | Unique ID |
| `label` | `string` | Button label |
| `icon` | `string` | Icon CSS classes — Bootstrap Icons (`"bi bi-type-bold"`) or Font Awesome (`"fa-solid fa-home"`). Any space-separated classes work. |
| `size` | `"large" \| "small" \| "mini"` | Button size |
| `toggle` | `boolean` | Enable toggle behaviour |
| `active` | `boolean` | Initial toggle state |
| `tooltip` | `string` | Tooltip text |
| `keyTip` | `string` | KeyTip letter |
| `disabled` | `boolean` | Disable the button |
| `onClick` | `(btn, active) => void` | Click callback |

#### split-button

Same properties as button plus:

| Property | Type | Description |
|----------|------|-------------|
| `type` | `"split-button"` | Control type |
| `menuItems` | `RibbonSplitMenuItem[]` | Dropdown menu items |

#### gallery

| Property | Type | Description |
|----------|------|-------------|
| `type` | `"gallery"` | Control type |
| `options` | `RibbonGalleryOption[]` | Gallery items |
| `selectedId` | `string` | Currently selected option ID |
| `columns` | `number` | Grid columns in popup (default 4) |
| `layout` | `"grid" \| "list"` | Popup layout |
| `inlineCount` | `number` | Items shown inline (default 3) |
| `onSelect` | `(option) => void` | Selection callback |

#### dropdown

| Property | Type | Description |
|----------|------|-------------|
| `type` | `"dropdown"` | Control type |
| `options` | `{ value, label }[]` | Dropdown options |
| `value` | `string` | Current value |
| `width` | `string` | CSS width |
| `onChange` | `(value) => void` | Change callback |

#### input

| Property | Type | Description |
|----------|------|-------------|
| `type` | `"input"` | Control type |
| `placeholder` | `string` | Placeholder text |
| `value` | `string` | Current value |
| `width` | `string` | CSS width |
| `onInput` | `(value) => void` | Input callback |
| `onSubmit` | `(value) => void` | Enter key callback |

#### color

| Property | Type | Description |
|----------|------|-------------|
| `type` | `"color"` | Control type |
| `value` | `string` | Hex colour value |
| `showLabel` | `boolean` | Show hex value text |
| `onChange` | `(value) => void` | Change callback |

#### number

| Property | Type | Description |
|----------|------|-------------|
| `type` | `"number"` | Control type |
| `value` | `number` | Current value |
| `min` | `number` | Minimum value |
| `max` | `number` | Maximum value |
| `step` | `number` | Step increment |
| `suffix` | `string` | Unit suffix text |
| `width` | `string` | CSS width |
| `onChange` | `(value) => void` | Change callback |

#### checkbox / toggle

| Property | Type | Description |
|----------|------|-------------|
| `type` | `"checkbox" \| "toggle"` | Control type |
| `checked` | `boolean` | Current state |
| `onChange` | `(checked) => void` | Change callback |

#### separator / row-break / label / custom

| Property | Type | Description |
|----------|------|-------------|
| `type` | `"separator"` | Visual divider |
| `type` | `"row-break"` | Invisible layout break — starts a new horizontal row within the group (see Row Layout below) |
| `type` | `"label"` | Non-interactive text with optional icon and colour |
| `type` | `"custom"` | Consumer-provided `element: HTMLElement \| () => HTMLElement` |
| `width` | `string` | CSS width for the custom control wrapper (e.g. `"120px"`) |

### Instance Methods

| Method | Description |
|--------|-------------|
| `show(containerId?)` | Mount and display the ribbon |
| `hide()` | Hide the ribbon |
| `destroy()` | Remove from DOM, clean up listeners |
| `setActiveTab(tabId)` | Switch to a tab |
| `getActiveTab()` | Get active tab ID |
| `addTab(tab, index?)` | Add a tab dynamically |
| `removeTab(tabId)` | Remove a tab |
| `showContextualTab(tabId)` | Show a contextual tab |
| `hideContextualTab(tabId)` | Hide a contextual tab |
| `setControlDisabled(id, disabled)` | Enable/disable a control |
| `setControlHidden(id, hidden)` | Show/hide a control |
| `setControlActive(id, active)` | Set toggle active state |
| `getControlValue(id)` | Get control value |
| `setControlValue(id, value)` | Set control value |
| `getControlState(id)` | Get `{ disabled, active, visible }` or `null` if unknown ID |
| `addQATItem(item)` | Add a QAT button |
| `removeQATItem(id)` | Remove a QAT button |
| `collapse()` | Minimize ribbon to tab bar |
| `expand()` | Expand ribbon |
| `toggleCollapse()` | Toggle collapse state |
| `isCollapsed()` | Check collapsed state |
| `openBackstage()` | Open backstage panel |
| `closeBackstage()` | Close backstage panel |
| `setStatusBar(element)` | Set, replace, or remove (`null`) the status bar at runtime |
| `getStatusBarElement()` | Get the `.ribbon-tabbar-status` wrapper element (or `null`) |
| `setAutoCollapseDelay(ms)` | Set auto-collapse delay in ms (0 to disable) |
| `getAutoCollapseDelay()` | Get current auto-collapse delay |
| `getState()` | Get serialisable snapshot of current ribbon UI state |
| `restoreState(state)` | Restore ribbon state from a (partial) snapshot |
| `setColors(colors)` | Update colours at runtime |
| `getElement()` | Get root DOM element |

## Status Bar

The optional `statusBar` slot places a right-aligned area in the tab bar between the tabs and the collapse button. The Ribbon provides the container; consumers provide the content (user chip, entity name, version badge, PresenceIndicator, etc.).

```javascript
var ribbon = createRibbon({
    tabs: [ /* ... */ ],
    statusBar: function() {
        var bar = document.createElement("div");
        bar.style.display = "inline-flex";
        bar.style.alignItems = "center";
        bar.style.gap = "8px";

        var user = document.createElement("span");
        user.textContent = "Jane Doe";
        bar.appendChild(user);

        var badge = document.createElement("span");
        badge.textContent = "v2.4.1";
        bar.appendChild(badge);
        return bar;
    }
}, "container");

// Update at runtime
ribbon.setStatusBar(newElement);

// Remove
ribbon.setStatusBar(null);

// Get the wrapper element
var wrapper = ribbon.getStatusBarElement();
```

## Keyboard

| Key | Context | Action |
|-----|---------|--------|
| Alt | Anywhere | Toggle KeyTips |
| Escape | KeyTips active | Go back one level or dismiss |
| Escape | Menu/popup open | Close |
| Escape | Backstage | Close backstage |
| ArrowLeft/Right | Tab bar | Navigate tabs |
| Enter/Space | Tab bar | Activate tab |
| ArrowDown | Menu trigger | Open menu |
| ArrowRight | Submenu trigger | Open submenu |
| ArrowLeft | Submenu | Close submenu |
| Ctrl+F1 | Anywhere | Toggle ribbon collapse |

## Colour Configuration

All visual properties are configurable via options and `setColors()`:

| Property | CSS Variable | Default |
|----------|-------------|---------|
| `backgroundColor` | `--ribbon-bg` | `$gray-100` |
| `tabBarBackgroundColor` | `--ribbon-tab-bar-bg` | `$gray-200` |
| `tabTextColor` | `--ribbon-tab-color` | `$gray-700` |
| `tabActiveTextColor` | `--ribbon-tab-active-color` | `$gray-900` |
| `tabActiveBackgroundColor` | `--ribbon-tab-active-bg` | `$gray-100` |
| `panelBackgroundColor` | `--ribbon-panel-bg` | `$gray-100` |
| `groupLabelColor` | `--ribbon-group-label-color` | `$gray-500` |
| `groupBorderColor` | `--ribbon-group-border-color` | `$gray-300` |
| `controlColor` | `--ribbon-control-color` | `$gray-800` |
| `controlHoverColor` | `--ribbon-control-hover-bg` | `$gray-200` |
| `controlActiveColor` | `--ribbon-control-active-bg` | `$blue-100` |
| `qatBackgroundColor` | `--ribbon-qat-bg` | `$gray-200` |
| `menuBarBackgroundColor` | `--ribbon-menubar-bg` | `$gray-200` |

```javascript
ribbon.setColors({
    backgroundColor: "#1a1a2e",
    tabBarBackgroundColor: "#16213e",
    tabTextColor: "#a0a0c0",
    tabActiveTextColor: "#ffffff",
    controlColor: "#e0e0f0"
});
```

## Row Layout

By default, small/mini controls stack into vertical columns of 3. Use `row-break` controls to arrange items into explicit horizontal rows instead — ideal for Office-style groups like Font or Paragraph.

```javascript
controls: [
    { type: "row-break", id: "r1" },        // start row 1
    { type: "dropdown", id: "font-family", ... },
    { type: "dropdown", id: "font-size", ... },
    { type: "row-break", id: "r2" },        // start row 2
    { type: "button", id: "bold", size: "mini", ... },
    { type: "button", id: "italic", size: "mini", ... },
    { type: "button", id: "underline", size: "mini", ... }
]
```

This produces:
```
Row 1: [Arial ▼] [11 ▼]
Row 2: [B] [I] [U]
```

All rows are wrapped in a vertical `.ribbon-stack` container so they tile top-to-bottom within the horizontal group flow.

### Stack Alignment

Stacks use CSS `subgrid` to align labels and controls across rows. When multiple labeled controls are stacked (e.g. three dropdowns or a mix of dropdowns, inputs, and custom controls), all labels share one column width and all controls share another — producing uniform alignment. The `width` property on custom controls is applied as `min-width` so it sets a floor without conflicting with grid column sizing. In mini collapse, labels are hidden and the stack collapses to a single column.

## Adaptive Collapse

Groups progressively collapse as the ribbon narrows:

1. **Full** — all controls at configured sizes
2. **Medium** — large buttons become small
3. **Small** — all buttons become small
4. **Mini** — all buttons become icon-only
5. **Overflow** — entire group collapses into a single dropdown

Groups with lower `collapsePriority` collapse first. A `ResizeObserver` triggers recalculation (debounced 150ms).

## Layout Integration

The Ribbon uses `position: relative` (not fixed), making it embeddable in any layout container:

| Layout | Slot | Usage |
|--------|------|-------|
| DockLayout | `toolbar` | `dock.setToolbar(ribbon.getElement())` |
| BorderLayout | `north` | `border.setNorth(ribbon.getElement())` |
| FlexGridLayout | Row 0 | `rows: ["auto", "1fr"]` |
| BoxLayout | Child 0 | `flex: 0` (natural height) |
| Standalone | Any div | `ribbon.show("container-id")` |

## Component Hosting

The `custom` control type embeds existing components inside ribbon groups:

```javascript
{
    type: "custom",
    id: "workspace",
    label: "Workspace",
    size: "large",
    element: function() {
        var div = document.createElement("div");
        var ws = new WorkspaceSwitcher({ workspaces: [...], size: "sm" });
        ws.show(div);
        return div;
    }
}
```

The optional `label` property renders a text label whose position depends on size: **small/mini** place the label on the **left** (row layout, matching built-in controls), while **large** places it **below** (column layout). The optional `width` property sets the wrapper's minimum width (e.g. `width: "120px"`), useful for components like FontDropdown or Slider that need space at mini height. Inside stacks the grid controls the actual width; the `width` value acts as a floor. The ribbon uses `overflow: visible` on group content so hosted component dropdowns are not clipped.

## Icon Support

The `icon` property on controls accepts any space-separated CSS class string. The Ribbon applies each class individually, so any CSS icon library works:

- **Bootstrap Icons:** `"bi bi-house"`, `"bi bi-pencil"`
- **Font Awesome (Solid):** `"fa-solid fa-home"`, `"fa-solid fa-pen"`
- **Font Awesome (Regular):** `"fa-regular fa-heart"`
- **Font Awesome (Brands):** `"fa-brands fa-github"`

Ensure the corresponding icon library CSS is loaded in the page.

## DOM Structure

```
div.ribbon
├── div.ribbon-qat [role="toolbar"]
├── div.ribbon-menubar [role="menubar"]
│   └── div.ribbon-menu-item
│       ├── button.ribbon-menu-trigger
│       └── div.ribbon-menu-dropdown [role="menu"]
├── div.ribbon-tabbar [role="tablist"]
│   ├── button.ribbon-tab [role="tab"]
│   ├── div.ribbon-tabbar-status          ← optional right-aligned status slot
│   │   └── [consumer HTMLElement]
│   └── button.ribbon-collapse-btn
├── div.ribbon-panel [role="tabpanel"]
│   └── div.ribbon-tab-content
│       ├── div.ribbon-group [role="group"]
│       │   ├── div.ribbon-group-content
│       │   │   ├── button.ribbon-btn-large
│       │   │   ├── div.ribbon-stack
│       │   │   │   └── button.ribbon-btn-small
│       │   │   └── div.ribbon-custom.ribbon-custom-{size}
│       │   │       ├── span.ribbon-custom-label    ← before element for small/mini
│       │   │       ├── [consumer HTMLElement]
│       │   │       └── span.ribbon-custom-label    ← after element for large
│       │   └── div.ribbon-group-label
│       └── div.ribbon-group-separator
├── div.ribbon-backstage [role="dialog"]
└── div.ribbon-keytip-layer [aria-hidden]
```

## Auto-Collapse

When the ribbon is collapsed and a user clicks a tab, the panel temporarily expands. With `autoCollapseDelay` set to a positive value (minimum 5000 ms), the panel automatically collapses after the specified delay of inactivity. Any interaction (click, tap) inside the ribbon resets the timer.

```javascript
var ribbon = createRibbon({
    tabs: [ /* ... */ ],
    collapsed: true,
    autoCollapseDelay: 8000  // auto-hide after 8 seconds
}, "container");

// Change at runtime
ribbon.setAutoCollapseDelay(5000);

// Disable
ribbon.setAutoCollapseDelay(0);
```

## State Persistence

Save and restore the ribbon's UI state across sessions using `getState()` and `restoreState()`. The returned `RibbonState` object is JSON-serialisable.

```javascript
// Save
var state = ribbon.getState();
localStorage.setItem("ribbon-state", JSON.stringify(state));

// Restore (on next load)
var saved = JSON.parse(localStorage.getItem("ribbon-state"));
if (saved) { ribbon.restoreState(saved); }
```

`restoreState()` accepts a `Partial<RibbonState>`, so consumers can restore only the fields they saved. The state includes: `activeTabId`, `collapsed`, `contextualTabs` visibility, `controlValues`, and `autoCollapseDelay`.

## Deferred State

State methods (`setControlDisabled`, `setControlActive`, `setControlHidden`, `setControlValue`) work on controls in any tab — even tabs not yet rendered. The Ribbon queues changes internally and applies them when the tab is first activated. Multiple calls before render are supported; the last value wins.

`getControlValue` and `getControlState` also return queued state for unrendered controls, so consuming apps never need to track parallel state variables.

When `setControlActive` is called on a `toggle: true` button, the Ribbon syncs the internal toggle state so the next click always produces the correct opposite value — whether the state was set by click or by API.

## Accessibility

- Tab bar: `role="tablist"`, tabs: `role="tab"`, `aria-selected`
- Panel: `role="tabpanel"`, `aria-labelledby`
- Groups: `role="group"`, `aria-label`
- Buttons: `aria-pressed` (toggles), `aria-disabled`
- Menu bar: `role="menubar"` → `role="menu"` → `role="menuitem"`
- QAT: `role="toolbar"`, `aria-label="Quick Access"`
- Backstage: `role="dialog"`, `aria-modal="true"`
- KeyTip badges: `aria-hidden="true"`
- Focus visible outlines on all interactive elements
- `prefers-reduced-motion: reduce` disables all transitions
