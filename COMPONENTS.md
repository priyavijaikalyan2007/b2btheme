<!-- AGENT: Registry of custom components shipped with the enterprise theme. -->

# Components

Custom components built on the Enterprise Bootstrap Theme.

## ErrorDialog

Displays literate error messages in a Bootstrap 5 modal with user-friendly narrative and collapsible technical details.

| Asset | Path |
|-------|------|
| CSS | `dist/components/errordialog/errordialog.css` |
| JS | `dist/components/errordialog/errordialog.js` |
| Types | `dist/components/errordialog/errordialog.d.ts` |

**Requires:** Bootstrap JS (Modal API), Bootstrap Icons CSS.

**Usage (script tag):**

```html
<script src="dist/components/errordialog/errordialog.js"></script>
<script>
    showErrorDialog("container-id", {
        title: "Save Failed",
        message: "Could not save the document.",
        suggestion: "Try again in a moment.",
        errorCode: "DOC_SAVE_001"
    });
</script>
```

**Usage (ES module):**

```js
import { showErrorDialog } from "./dist/components/errordialog/errordialog.js";

showErrorDialog("container-id", {
    title: "Save Failed",
    message: "Could not save the document."
});
```

See `components/errordialog/README.md` for full documentation.

## EditableComboBox

A combined text input and dropdown list that allows free text entry or selection from a filterable list of options. Supports substring filtering, keyboard navigation, item grouping, size variants, and the WAI-ARIA combobox pattern.

| Asset | Path |
|-------|------|
| CSS | `dist/components/editablecombobox/editablecombobox.css` |
| JS | `dist/components/editablecombobox/editablecombobox.js` |
| Types | `dist/components/editablecombobox/editablecombobox.d.ts` |

**Requires:** Bootstrap CSS (input-group, form-control, btn), Bootstrap Icons CSS. Does **not** require Bootstrap JS.

**Usage (script tag):**

```html
<script src="dist/components/editablecombobox/editablecombobox.js"></script>
<script>
    var combo = createEditableComboBox("container-id", {
        items: [{ label: "Apple" }, { label: "Banana" }, { label: "Cherry" }],
        placeholder: "Pick a fruit...",
        onSelect: function(item) { console.log("Selected:", item.label); }
    });
</script>
```

**Usage (ES module):**

```js
import { createEditableComboBox } from "./dist/components/editablecombobox/editablecombobox.js";

const combo = createEditableComboBox("container-id", {
    items: [{ label: "Red" }, { label: "Green" }, { label: "Blue" }],
    onSelect: (item) => console.log("Selected:", item.label)
});
```

See `components/editablecombobox/README.md` for full documentation.

## DatePicker

A calendar date picker with day, month, and year navigation views. Supports manual input with configurable format, week numbers, locale-aware first day of week, min/max date constraints, and format hint with help tooltip.

| Asset | Path |
|-------|------|
| CSS | `dist/components/datepicker/datepicker.css` |
| JS | `dist/components/datepicker/datepicker.js` |
| Types | `dist/components/datepicker/datepicker.d.ts` |

**Requires:** Bootstrap CSS (input-group, form-control, btn), Bootstrap Icons CSS. Does **not** require Bootstrap JS.

**Usage (script tag):**

```html
<script src="dist/components/datepicker/datepicker.js"></script>
<script>
    var picker = createDatePicker("container-id", {
        format: "yyyy-MM-dd",
        firstDayOfWeek: 0,
        onSelect: function(date) { console.log("Selected:", date); }
    });
</script>
```

See `components/datepicker/README.md` for full documentation.

## TimePicker

A time-of-day picker with spinner columns for hours, minutes, and seconds. Supports 12-hour and 24-hour formats, optional timezone selector with searchable IANA timezone dropdown, and format hint with help tooltip.

| Asset | Path |
|-------|------|
| CSS | `dist/components/timepicker/timepicker.css` |
| JS | `dist/components/timepicker/timepicker.js` |
| Types | `dist/components/timepicker/timepicker.d.ts` |

**Requires:** Bootstrap CSS (input-group, form-control, btn), Bootstrap Icons CSS. Does **not** require Bootstrap JS.

**Usage (script tag):**

```html
<script src="dist/components/timepicker/timepicker.js"></script>
<script>
    var picker = createTimePicker("container-id", {
        clockMode: "24",
        showSeconds: true,
        onSelect: function(time) { console.log("Selected:", time); }
    });
</script>
```

See `components/timepicker/README.md` for full documentation.

## DurationPicker

A duration/interval picker with configurable unit patterns and ISO 8601 support. Supports 17 unit patterns (d-h-m, h-m-s, w, fn, mo, q, y, etc.), carry mode, manual ISO 8601 and shorthand input, and format hint with help tooltip.

| Asset | Path |
|-------|------|
| CSS | `dist/components/durationpicker/durationpicker.css` |
| JS | `dist/components/durationpicker/durationpicker.js` |
| Types | `dist/components/durationpicker/durationpicker.d.ts` |

**Requires:** Bootstrap CSS (input-group, form-control, btn), Bootstrap Icons CSS. Does **not** require Bootstrap JS.

**Usage (script tag):**

```html
<script src="dist/components/durationpicker/durationpicker.js"></script>
<script>
    var picker = createDurationPicker("container-id", {
        pattern: "h-m",
        onChange: function(val) { console.log("Duration:", val); }
    });
</script>
```

See `components/durationpicker/README.md` for full documentation.

## ProgressModal

A modal dialog for displaying progress of long-running operations. Supports indeterminate (spinner) and determinate (progress bar) modes, stepped progress, a scrollable timestamped detail log with copy-to-clipboard, and Cancel/Retry/Close lifecycle management.

| Asset | Path |
|-------|------|
| CSS | `dist/components/progressmodal/progressmodal.css` |
| JS | `dist/components/progressmodal/progressmodal.js` |
| Types | `dist/components/progressmodal/progressmodal.d.ts` |

**Requires:** Bootstrap CSS, Bootstrap Icons CSS. Does **not** require Bootstrap JS.

**Usage (script tag):**

```html
<script src="dist/components/progressmodal/progressmodal.js"></script>
<script>
    var modal = showProgressModal({ title: "Processing..." });
    modal.logInfo("Starting operation...");
    modal.setStatus("Working...");
    // ... later
    modal.logSuccess("Done!");
    modal.complete("Operation finished.");
</script>
```

See `components/progressmodal/README.md` for full documentation.

## TimezonePicker

A searchable dropdown selector for IANA timezones grouped by geographic region, with UTC offset display and a live clock showing the current time in the selected timezone.

| Asset | Path |
|-------|------|
| CSS | `dist/components/timezonepicker/timezonepicker.css` |
| JS | `dist/components/timezonepicker/timezonepicker.js` |
| Types | `dist/components/timezonepicker/timezonepicker.d.ts` |

**Requires:** Bootstrap CSS (input-group, form-control, btn), Bootstrap Icons CSS. Does **not** require Bootstrap JS.

**Usage (script tag):**

```html
<script src="dist/components/timezonepicker/timezonepicker.js"></script>
<script>
    var picker = createTimezonePicker("container-id", {
        timezone: "America/New_York",
        onSelect: function(tz) { console.log("Selected:", tz); }
    });
</script>
```

See `components/timezonepicker/README.md` for full documentation.

## CronPicker

A visual builder for extended 6-field CRON expressions (second, minute, hour, day-of-month, month, day-of-week) with presets, mode-based field editors, human-readable descriptions, and bidirectional raw expression editing.

| Asset | Path |
|-------|------|
| CSS | `dist/components/cronpicker/cronpicker.css` |
| JS | `dist/components/cronpicker/cronpicker.js` |
| Types | `dist/components/cronpicker/cronpicker.d.ts` |

**Requires:** Bootstrap CSS (form-control, form-select, btn), Bootstrap Icons CSS. Does **not** require Bootstrap JS.

**Usage (script tag):**

```html
<script src="dist/components/cronpicker/cronpicker.js"></script>
<script>
    var picker = createCronPicker("container-id", {
        value: "0 0 9 * * 1-5",
        onChange: function(expr) { console.log("Expression:", expr); }
    });
</script>
```

See `components/cronpicker/README.md` for full documentation.

## MarkdownEditor

A Bootstrap 5-themed Markdown editor wrapper around Vditor with tab/side-by-side layout modes, collapsible panes, inline selection toolbar, GFM support, Mermaid/Graphviz/PlantUML diagram rendering, export, and optional modal hosting. All HTML output is sanitised via DOMPurify.

| Asset | Path |
|-------|------|
| CSS | `dist/components/markdowneditor/markdowneditor.css` |
| JS | `dist/components/markdowneditor/markdowneditor.js` |
| Types | `dist/components/markdowneditor/markdowneditor.d.ts` |

**Requires:** Bootstrap CSS, Bootstrap Icons CSS, Bootstrap JS (Modal API for modal hosting), [Vditor](https://github.com/Vanessa219/vditor) >= 3.8.13 (CDN), [DOMPurify](https://github.com/cure53/DOMPurify) (CDN, strongly recommended).

**Usage (script tag):**

```html
<link rel="stylesheet" href="https://unpkg.com/vditor@3.11.2/dist/index.css" />
<script src="https://unpkg.com/vditor@3.11.2/dist/index.min.js"></script>
<script src="https://unpkg.com/dompurify@3.2.4/dist/purify.min.js"></script>
<script src="dist/components/markdowneditor/markdowneditor.js"></script>
<script>
    var editor = createMarkdownEditor("container-id", {
        title: "My Document",
        value: "# Hello\n\nStart editing...",
        onChange: function(value) { console.log("Changed"); }
    });
</script>
```

See `components/markdowneditor/README.md` for full documentation including security guidance.

## StatusBar

A fixed-to-bottom viewport status bar with configurable label/value regions separated by pipe dividers. Text is natively selectable for Ctrl+C clipboard copying. Supports dynamic region add/remove, O(1) value updates, and sets a `--statusbar-height` CSS custom property on `<html>` for layout offset.

| Asset | Path |
|-------|------|
| CSS | `dist/components/statusbar/statusbar.css` |
| JS | `dist/components/statusbar/statusbar.js` |
| Types | `dist/components/statusbar/statusbar.d.ts` |

**Requires:** Bootstrap CSS (for SCSS variables), Bootstrap Icons CSS (optional, for region icons). Does **not** require Bootstrap JS.

**Usage (script tag):**

```html
<script src="dist/components/statusbar/statusbar.js"></script>
<script>
    var bar = createStatusBar({
        regions: [
            { id: "status", icon: "bi-circle-fill", value: "Connected" },
            { id: "env", label: "Environment:", value: "Production" },
            { id: "user", label: "User:", value: "jsmith" }
        ]
    });
    bar.setValue("user", "adoe");
</script>
```

See `components/statusbar/README.md` for full documentation.

## Sidebar

A dockable, floatable, resizable sidebar panel component that acts as a container for other components. Supports docking to left/right viewport edges, free-positioned floating with drag-based positioning, collapsing to a 40px icon strip, resizing via drag handles, tab grouping when multiple sidebars share the same dock edge, and drag-to-dock with visual drop zones.

| Asset | Path |
|-------|------|
| CSS | `dist/components/sidebar/sidebar.css` |
| JS | `dist/components/sidebar/sidebar.js` |
| Types | `dist/components/sidebar/sidebar.d.ts` |

**Requires:** Bootstrap CSS (for SCSS variables), Bootstrap Icons CSS. Does **not** require Bootstrap JS.

**Usage (script tag):**

```html
<script src="dist/components/sidebar/sidebar.js"></script>
<script>
    var sb = createDockedSidebar({
        title: "Explorer",
        icon: "bi-folder",
        dockPosition: "left",
        width: 280
    });
    sb.getContentElement().innerHTML = "<p style='padding:1rem'>My content</p>";
</script>
```

See `components/sidebar/README.md` for full documentation.

## BannerBar

A fixed-to-top viewport banner for announcing significant events such as service status updates, critical issues, maintenance windows, and success confirmations. Supports four severity presets (info, warning, critical, success), optional title, icon, action link/button, auto-dismiss timer, and full colour overrides. Only one banner is visible at a time; showing a new one replaces the previous. Sets a `--bannerbar-height` CSS custom property on `<html>` for layout offset.

| Asset | Path |
|-------|------|
| CSS | `dist/components/bannerbar/bannerbar.css` |
| JS | `dist/components/bannerbar/bannerbar.js` |
| Types | `dist/components/bannerbar/bannerbar.d.ts` |

**Requires:** Bootstrap CSS (for SCSS variables), Bootstrap Icons CSS. Does **not** require Bootstrap JS.

**Usage (script tag):**

```html
<script src="dist/components/bannerbar/bannerbar.js"></script>
<script>
    var banner = createBannerBar({
        message: "Scheduled maintenance tonight at 02:00 UTC.",
        variant: "warning",
        actionLabel: "Details",
        actionHref: "/status"
    });
</script>
```

See `components/bannerbar/README.md` for full documentation.

## Toolbar

A programmable action bar component for grouping tools and actions into labelled regions. Inspired by the Microsoft Office Ribbon but adapted to the enterprise Bootstrap 5 aesthetic — single strip, no tabs. Supports docked/floating positioning with drag-to-dock snapping, horizontal/vertical orientation, regions with dividers, standard/toggle/split/gallery tool types, Priority+ overflow, Office-style KeyTip badges, layout persistence, resize handle, and full WAI-ARIA keyboard accessibility.

| Asset | Path |
|-------|------|
| CSS | `dist/components/toolbar/toolbar.css` |
| JS | `dist/components/toolbar/toolbar.js` |
| Types | `dist/components/toolbar/toolbar.d.ts` |

**Requires:** Bootstrap CSS (for SCSS variables), Bootstrap Icons CSS, Bootstrap JS (optional, for tooltips). Does **not** require a JavaScript framework.

**Usage (script tag):**

```html
<script src="dist/components/toolbar/toolbar.js"></script>
<script>
    var toolbar = createToolbar({
        label: "Document formatting",
        regions: [
            {
                id: "formatting",
                title: "Formatting",
                items: [
                    { id: "bold", icon: "bi-type-bold", tooltip: "Bold", toggle: true },
                    { id: "italic", icon: "bi-type-italic", tooltip: "Italic", toggle: true },
                    { type: "separator" },
                    { id: "align-left", icon: "bi-text-left", tooltip: "Align left" }
                ]
            }
        ]
    });
</script>
```

See `components/toolbar/README.md` for full documentation.

## Gauge

A visual measure component modeled after the ASN.1 Gauge type. Displays a value on a scale with configurable colour thresholds. Supports three shapes (tile, ring, bar) and two modes (value for numeric metrics, time for countdown). Features auto-tick countdown, over-limit/overdue states, fluid or explicit sizing, custom formatting, and full ARIA accessibility.

| Asset | Path |
|-------|------|
| CSS | `dist/components/gauge/gauge.css` |
| JS | `dist/components/gauge/gauge.js` |
| Types | `dist/components/gauge/gauge.d.ts` |

**Requires:** Bootstrap CSS (for SCSS variables). Does **not** require Bootstrap JS or Bootstrap Icons.

**Usage (script tag):**

```html
<script src="dist/components/gauge/gauge.js"></script>
<script>
    var storage = createTileGauge({
        value: 50,
        max: 100,
        unit: "GiB",
        title: "Storage"
    }, "container-id");
</script>
```

See `components/gauge/README.md` for full documentation.

## Conversation

A turn-by-turn AI chat UI component with rich text rendering via Vditor, streaming token-by-token responses, session management, feedback (thumbs up/down with optional written comments), clipboard copy in Markdown/HTML/plaintext, inline error display with expandable details, message buffer eviction, and size variants. Callback-driven — makes no network requests.

| Asset | Path |
|-------|------|
| CSS | `dist/components/conversation/conversation.css` |
| JS | `dist/components/conversation/conversation.js` |
| Types | `dist/components/conversation/conversation.d.ts` |

**Requires:** Bootstrap CSS, Bootstrap Icons CSS, [Vditor](https://github.com/Vanessa219/vditor) >= 3.8.13 (CDN), [DOMPurify](https://github.com/cure53/DOMPurify) (CDN, recommended). Does **not** require Bootstrap JS.

**Usage (script tag):**

```html
<link rel="stylesheet" href="https://unpkg.com/vditor@3.11.2/dist/index.css" />
<script src="https://unpkg.com/vditor@3.11.2/dist/index.min.js"></script>
<script src="https://unpkg.com/dompurify@3.2.4/dist/purify.min.js"></script>
<script src="dist/components/conversation/conversation.js"></script>
<script>
    var chat = createConversation({
        title: "Support Agent",
        onSendMessage: function(message, session) {
            // call your backend, then:
            chat.addAssistantMessage("Response text with **markdown**.");
        }
    }, "container-id");
</script>
```

## Timeline

A horizontal event timeline for visualising point events (pins at a moment) and span events (blocks with start→end) on a time axis. Supports row packing, grouping, collapsible groups with presence bands, selection/click callbacks, viewport visibility detection, now marker, size variants, and container query responsiveness.

| Asset | Path |
|-------|------|
| CSS | `dist/components/timeline/timeline.css` |
| JS | `dist/components/timeline/timeline.js` |
| Types | `dist/components/timeline/timeline.d.ts` |

**Requires:** Bootstrap CSS, Bootstrap Icons CSS. No additional external dependencies.

**Usage (script tag):**

```html
<script src="dist/components/timeline/timeline.js"></script>
<script>
    var tl = createTimeline({
        containerId: "timeline-container",
        start: new Date("2026-02-12T00:00:00"),
        end: new Date("2026-02-13T00:00:00"),
        items: [
            { id: "s1", type: "span", start: new Date("2026-02-12T09:00:00"), end: new Date("2026-02-12T12:00:00"), label: "Build" },
            { id: "p1", type: "point", start: new Date("2026-02-12T14:00:00"), label: "Deploy", color: "#e03131" }
        ],
        onItemClick: function(item) { console.log("Clicked:", item.label); }
    });
</script>
```

**Usage (ES module):**

```js
import { createConversation } from "./dist/components/conversation/conversation.js";

const chat = createConversation({
    title: "Support Agent",
    onSendMessage: (msg, session) => callMyAPI(msg),
}, "container-id");
```

See `components/conversation/README.md` for full documentation.

## TabbedPanel

A dockable, collapsible, resizable tabbed panel component for grouping related content into tabs. Supports docking to top/bottom viewport edges, free-positioned floating with drag-based positioning, collapsing to a 32px strip, resizing via drag handles, configurable tab bar position (top/left/bottom/right), dynamic tab management, and drag-to-dock with visual drop zones. Complementary to the Sidebar component.

| Asset | Path |
|-------|------|
| CSS | `dist/components/tabbedpanel/tabbedpanel.css` |
| JS | `dist/components/tabbedpanel/tabbedpanel.js` |
| Types | `dist/components/tabbedpanel/tabbedpanel.d.ts` |

**Requires:** Bootstrap CSS (for SCSS variables), Bootstrap Icons CSS. Does **not** require Bootstrap JS.

**Usage (script tag):**

```html
<script src="dist/components/tabbedpanel/tabbedpanel.js"></script>
<script>
    var panel = createTabbedPanel({
        tabs: [
            { id: "terminal", title: "Terminal", icon: "bi-terminal" },
            { id: "output", title: "Output", icon: "bi-journal-text" }
        ],
        dockPosition: "bottom",
        height: 250,
        onTabSelect: function(tabId) { console.log("Selected:", tabId); }
    });
</script>
```

**Usage (ES module):**

```js
import { createTabbedPanel } from "./dist/components/tabbedpanel/tabbedpanel.js";

const panel = createTabbedPanel({
    tabs: [
        { id: "terminal", title: "Terminal", icon: "bi-terminal" },
        { id: "output", title: "Output", icon: "bi-journal-text" }
    ],
    dockPosition: "bottom",
    height: 250,
    onTabSelect: (tabId) => console.log("Selected:", tabId)
});
```

See `components/tabbedpanel/README.md` for full documentation.

## TreeView

A highly configurable, generic tree view component for representing multi-tree structured data. Supports lazy loading, multi-select (Ctrl+Click / Shift+Click), drag and drop (internal + cross-tree + external), context menu, inline rename (F2), search with mark highlighting, starred/favourites group, sort modes, extensible node types with badges, toolbar actions, and full WAI-ARIA tree pattern keyboard navigation.

| Asset | Path |
|-------|------|
| CSS | `dist/components/treeview/treeview.css` |
| JS | `dist/components/treeview/treeview.js` |
| Types | `dist/components/treeview/treeview.d.ts` |

**Requires:** Bootstrap CSS (for SCSS variables), Bootstrap Icons CSS. Does **not** require Bootstrap JS.

**Usage (script tag):**

```html
<script src="dist/components/treeview/treeview.js"></script>
<script>
    var tree = createTreeView({
        containerId: "my-tree",
        roots: [
            { id: "1", label: "Documents", kind: "folder", children: [
                { id: "2", label: "Report.pdf", kind: "file" }
            ]}
        ],
        nodeTypes: {
            folder: { kind: "folder", icon: "bi-folder", isParent: true },
            file: { kind: "file", icon: "bi-file-earmark" }
        },
        onSelect: function(node, selected) { console.log(node.label, selected); }
    });
</script>
```

**Usage (ES module):**

```js
import { createTreeView } from "./dist/components/treeview/treeview.js";

const tree = createTreeView({
    containerId: "my-tree",
    roots: [
        { id: "1", label: "Documents", kind: "folder", children: [
            { id: "2", label: "Report.pdf", kind: "file" }
        ]}
    ],
    nodeTypes: {
        folder: { kind: "folder", icon: "bi-folder", isParent: true },
        file: { kind: "file", icon: "bi-file-earmark" }
    },
    onSelect: (node, selected) => console.log(node.label, selected)
});
```

See `components/treeview/README.md` for full documentation.

## TreeGrid

An enterprise tree-grid hybrid component combining a hierarchical tree in column 1 with tabular data in remaining columns. Features inline cell editing (text, number, select, date), column resize/reorder/sort, row selection, keyboard navigation (2D cell-level WAI-ARIA treegrid), virtual scrolling, summary/aggregate rows, drag-and-drop, context menu, and row striping.

| Asset | Path |
|-------|------|
| CSS | `dist/components/treegrid/treegrid.css` |
| JS | `dist/components/treegrid/treegrid.js` |
| Types | `dist/components/treegrid/treegrid.d.ts` |

**Requires:** Bootstrap CSS (for SCSS variables), Bootstrap Icons CSS. Does **not** require Bootstrap JS.

**Usage (script tag):**

```html
<script src="dist/components/treegrid/treegrid.js"></script>
<script>
    var grid = createTreeGrid({
        containerId: "my-grid",
        columns: [
            { id: "name", label: "Name", width: 200 },
            { id: "size", label: "Size", width: 100, type: "number" },
            { id: "modified", label: "Modified", width: 150, type: "date" }
        ],
        roots: [
            { id: "1", name: "Documents", size: 1024, kind: "folder", children: [
                { id: "2", name: "Report.pdf", size: 512, modified: new Date(), kind: "file" }
            ]}
        ],
        onCellEdit: function(node, columnId, value) { console.log("Edited:", node.id, columnId, value); }
    });
</script>
```

**Usage (ES module):**

```js
import { createTreeGrid } from "./dist/components/treegrid/treegrid.js";

const grid = createTreeGrid({
    containerId: "my-grid",
    columns: [
        { id: "name", label: "Name", width: 200 },
        { id: "size", label: "Size", width: 100, type: "number" },
        { id: "modified", label: "Modified", width: 150, type: "date" }
    ],
    roots: [
        { id: "1", name: "Documents", size: 1024, kind: "folder", children: [
            { id: "2", name: "Report.pdf", size: 512, modified: new Date(), kind: "file" }
        ]}
    ],
    onCellEdit: (node, columnId, value) => console.log("Edited:", node.id, columnId, value)
});
```

See `components/treegrid/README.md` for full documentation.

## DockLayout

A CSS Grid-based layout coordinator that arranges Toolbar, Sidebar, TabbedPanel, StatusBar, and content into a 5-zone application shell. Inspired by Java Swing's `BorderLayout` — child components are automatically positioned and resized without manual pixel-positioning. Auto-sets `contained: true` on child components.

| Asset | Path |
|-------|------|
| CSS | `dist/components/docklayout/docklayout.css` |
| JS | `dist/components/docklayout/docklayout.js` |
| Types | `dist/components/docklayout/docklayout.d.ts` |

**Requires:** Bootstrap CSS (for SCSS variables). Component CSS/JS for each slot component used (Toolbar, Sidebar, TabbedPanel, StatusBar). Does **not** require Bootstrap JS.

**Usage (script tag):**

```html
<script src="dist/components/toolbar/toolbar.js"></script>
<script src="dist/components/sidebar/sidebar.js"></script>
<script src="dist/components/statusbar/statusbar.js"></script>
<script src="dist/components/docklayout/docklayout.js"></script>
<script>
    var layout = createDockLayout({
        toolbar: new Toolbar({ label: "My App", mode: "docked", dockPosition: "top", regions: [] }),
        leftSidebar: new Sidebar({ title: "Explorer", dockPosition: "left", width: 260 }),
        statusBar: new StatusBar({ size: "sm", regions: [{ id: "status", label: "Ready" }] }),
        content: document.getElementById("my-content")
    });
</script>
```

See `components/docklayout/README.md` for full documentation.

## LogConsole

A reusable in-app logging console for displaying high-level user actions and system events. Supports 5 log levels (debug, info, warn, error, fatal) with per-level colour configuration, level filtering, dark/light themes, `requestAnimationFrame`-batched rendering, FIFO eviction, Clear and Export actions.

| Asset | Path |
|-------|------|
| CSS | `dist/components/logconsole/logconsole.css` |
| JS | `dist/components/logconsole/logconsole.js` |
| Types | `dist/components/logconsole/logconsole.d.ts` |

**Requires:** Bootstrap CSS (for SCSS variables). Does **not** require Bootstrap JS or Bootstrap Icons.

**Usage (script tag):**

```html
<script src="dist/components/logconsole/logconsole.js"></script>
<script>
    var log = createLogConsole({ theme: "dark", contained: true, height: "100%" });
    document.getElementById("container").appendChild(log.getElement());
    log.info("Application started");
</script>
```

See `components/logconsole/README.md` for full documentation.

## MaskedEntry

A masked input for sensitive non-password data — API keys, tokens, SSNs, connection strings. Provides a show/hide toggle, copy-to-clipboard, and two masking strategies (native browser or custom character replacement).

| Asset | Path |
|-------|------|
| CSS | `dist/components/maskedentry/maskedentry.css` |
| JS | `dist/components/maskedentry/maskedentry.js` |
| Types | `dist/components/maskedentry/maskedentry.d.ts` |

**Requires:** Bootstrap CSS (input-group, form-control, btn), Bootstrap Icons CSS. Does **not** require Bootstrap JS.

**Usage (script tag):**

```html
<script src="dist/components/maskedentry/maskedentry.js"></script>
<script>
    var entry = createMaskedEntry("container-id", {
        value: "sk-abc123def456ghi789",
        label: "API Key",
        readonly: true,
        onCopy: function() { console.log("Copied"); }
    });
</script>
```

See `components/maskedentry/README.md` for full documentation.

## SplitLayout

A split layout container that divides available space into two or more panes separated by draggable dividers. Supports horizontal/vertical orientation, pane collapsing, nested layouts, divider style variants (line, dots, handle), and state persistence via localStorage.

| Asset | Path |
|-------|------|
| CSS | `dist/components/splitlayout/splitlayout.css` |
| JS | `dist/components/splitlayout/splitlayout.js` |
| Types | `dist/components/splitlayout/splitlayout.d.ts` |

**Requires:** Bootstrap CSS (for SCSS variables). Does **not** require Bootstrap JS or Bootstrap Icons.

**Usage (script tag):**

```html
<script src="dist/components/splitlayout/splitlayout.js"></script>
<script>
    var layout = createSplitLayout({
        orientation: "horizontal",
        panes: [
            { id: "left", initialSize: "30%", minSize: 200, collapsible: true },
            { id: "center", initialSize: "1fr" },
            { id: "right", initialSize: 300, collapsible: true }
        ]
    }, "my-container");

    layout.getPaneElement("left").textContent = "Left pane";
</script>
```

**Usage (ES module):**

```js
import { createSplitLayout } from "./dist/components/splitlayout/splitlayout.js";

const layout = createSplitLayout({
    orientation: "horizontal",
    panes: [
        { id: "sidebar", initialSize: 250, collapsible: true },
        { id: "editor", initialSize: "1fr", minSize: 300 }
    ],
    persistKey: "editor-layout"
}, "app-container");
```

See `components/splitlayout/README.md` for full documentation.

## ColorPicker

A canvas-based colour selection control with saturation/brightness gradient, vertical hue strip, optional opacity slider, hex/RGB/HSL format tabs, text inputs, and configurable preset swatches. Operates in popup or inline mode.

| Asset | Path |
|-------|------|
| CSS | `dist/components/colorpicker/colorpicker.css` |
| JS | `dist/components/colorpicker/colorpicker.js` |
| Types | `dist/components/colorpicker/colorpicker.d.ts` |

**Requires:** Bootstrap CSS (for SCSS variables), Bootstrap Icons CSS. Does **not** require Bootstrap JS. No external colour libraries.

**Usage (script tag):**

```html
<script src="dist/components/colorpicker/colorpicker.js"></script>
<script>
    var picker = createColorPicker("container-id", {
        value: "#FF5733",
        showOpacity: true,
        swatches: ["#EF4444", "#F59E0B", "#10B981", "#3B82F6"],
        onChange: function(color) { console.log("Selected:", color); }
    });
</script>
```

**Usage (ES module):**

```js
import { createColorPicker } from "./dist/components/colorpicker/colorpicker.js";

const picker = createColorPicker("container-id", {
    value: "#3B82F6",
    inline: true,
    format: "hsl",
    onChange: (color) => console.log("Selected:", color)
});
```

See `components/colorpicker/README.md` for full documentation.

## EmptyState

A centered placeholder component shown when a view, list, table, or container has no data. Presents a large icon (or custom illustration), heading, optional description, primary CTA button, and secondary link. Supports size variants and compact mode.

| Asset | Path |
|-------|------|
| CSS | `dist/components/emptystate/emptystate.css` |
| JS | `dist/components/emptystate/emptystate.js` |
| Types | `dist/components/emptystate/emptystate.d.ts` |

**Requires:** Bootstrap CSS (for SCSS variables and `.btn-*` classes), Bootstrap Icons CSS. Does **not** require Bootstrap JS.

**Usage (script tag):**

```html
<script src="dist/components/emptystate/emptystate.js"></script>
<script>
    var empty = createEmptyState("container-id", {
        heading: "No projects found",
        description: "Create your first project to get started.",
        actionLabel: "Create Project",
        actionIcon: "bi-plus-lg",
        onAction: function() { console.log("Create clicked"); }
    });
</script>
```

See `components/emptystate/README.md` for full documentation.

## SkeletonLoader

Animated placeholder component that mimics content layout during loading. CSS shimmer animation with six presets: text, avatar, card, table, paragraph, and custom. Supports reduced motion.

| Asset | Path |
|-------|------|
| CSS | `dist/components/skeletonloader/skeletonloader.css` |
| JS | `dist/components/skeletonloader/skeletonloader.js` |
| Types | `dist/components/skeletonloader/skeletonloader.d.ts` |

**Requires:** Bootstrap CSS (for SCSS variables). Does **not** require Bootstrap JS or Bootstrap Icons.

**Usage (script tag):**

```html
<script src="dist/components/skeletonloader/skeletonloader.js"></script>
<script>
    var skeleton = createSkeletonLoader({ preset: "card" }, "container-id");
    // When data loads:
    skeleton.destroy();
</script>
```

See `components/skeletonloader/README.md` for full documentation.

## Toast

A transient, non-blocking notification system with stacking, auto-dismiss, progress bar, and action support. Singleton container at configurable viewport corners, z-index 1070. Four severity variants.

| Asset | Path |
|-------|------|
| CSS | `dist/components/toast/toast.css` |
| JS | `dist/components/toast/toast.js` |
| Types | `dist/components/toast/toast.d.ts` |

**Requires:** Bootstrap CSS (for SCSS variables and `.btn-*` classes), Bootstrap Icons CSS. Does **not** require Bootstrap JS.

**Usage (script tag):**

```html
<script src="dist/components/toast/toast.js"></script>
<script>
    showSuccessToast("Changes saved successfully", "Saved");
    showToast({
        message: "Item deleted",
        variant: "warning",
        actionLabel: "Undo",
        onAction: function() { console.log("Undo"); }
    });
</script>
```

See `components/toast/README.md` for full documentation.

## MultiselectCombo

A multi-select combo box with chips, checkboxes, filtering, grouping, Select All, and configurable display modes. Supports chip or count badge display, maximum selections limit, item grouping with headers, and three size variants.

| Asset | Path |
|-------|------|
| CSS | `dist/components/multiselectcombo/multiselectcombo.css` |
| JS | `dist/components/multiselectcombo/multiselectcombo.js` |
| Types | `dist/components/multiselectcombo/multiselectcombo.d.ts` |

**Requires:** Bootstrap CSS (for SCSS variables), Bootstrap Icons CSS. Does **not** require Bootstrap JS.

**Usage (script tag):**

```html
<script src="dist/components/multiselectcombo/multiselectcombo.js"></script>
<script>
    var combo = createMultiselectCombo({
        items: [
            { value: "a", label: "Apple" },
            { value: "b", label: "Banana" },
            { value: "c", label: "Cherry" }
        ],
        placeholder: "Pick fruits...",
        onChange: function(values) { console.log("Selected:", values); }
    }, "my-container");
</script>
```

**Usage (ES module):**

```js
import { createMultiselectCombo } from "./dist/components/multiselectcombo/multiselectcombo.js";

const combo = createMultiselectCombo({
    items: [
        { value: "a", label: "Apple" },
        { value: "b", label: "Banana" },
        { value: "c", label: "Cherry" }
    ],
    onChange: (values) => console.log("Selected:", values)
}, "my-container");
```

See `components/multiselectcombo/README.md` for full documentation.

## DataGrid

High-performance flat data table with sorting, filtering, pagination, column resize, row selection, inline editing, virtual scrolling, footer aggregation, and CSV export. Supports single/multi/checkbox selection, text/select/number-range/date-range filters, dense mode, row striping, pinned columns, and column reorder.

| Asset | Path |
|-------|------|
| CSS | `dist/components/datagrid/datagrid.css` |
| JS | `dist/components/datagrid/datagrid.js` |
| Types | `dist/components/datagrid/datagrid.d.ts` |

**Requires:** Bootstrap CSS (for SCSS variables), Bootstrap Icons CSS. Does **not** require Bootstrap JS.

**Usage (script tag):**

```html
<script src="dist/components/datagrid/datagrid.js"></script>
<script>
    var grid = createDataGrid({
        columns: [
            { id: "name", label: "Name", sortable: true, filterable: true },
            { id: "status", label: "Status", filterType: "select",
              filterOptions: [{ value: "active", label: "Active" }] },
            { id: "amount", label: "Amount", align: "right", aggregate: "sum" }
        ],
        rows: [
            { id: "1", data: { name: "Acme Corp", status: "active", amount: 1234 } }
        ],
        selectable: "checkbox",
        showFooter: true
    }, "my-container");
</script>
```

**Usage (ES module):**

```js
import { createDataGrid } from "./dist/components/datagrid/datagrid.js";

const grid = createDataGrid({
    columns: [
        { id: "name", label: "Name", sortable: true },
        { id: "amount", label: "Amount", aggregate: "sum" }
    ],
    rows: [{ id: "1", data: { name: "Acme", amount: 100 } }],
    showFooter: true
}, "my-container");
```

See `components/datagrid/README.md` for full documentation.

## CodeEditor

Bootstrap 5-themed code editor wrapping CodeMirror 6 with syntax highlighting, toolbar, diagnostics, and graceful textarea fallback. Features language selector, undo/redo, word wrap, copy-to-clipboard, format, save (Ctrl+S), light/dark themes, read-only mode, auto-grow, and disabled state.

| Asset | Path |
|-------|------|
| CSS | `dist/components/codeeditor/codeeditor.css` |
| JS | `dist/components/codeeditor/codeeditor.js` |
| Types | `dist/components/codeeditor/codeeditor.d.ts` |

**Requires:** Bootstrap CSS (for SCSS variables), Bootstrap Icons CSS. **Optional:** CodeMirror 6 (CDN or bundled) for rich editing mode.

**Usage (script tag):**

```html
<script src="dist/components/codeeditor/codeeditor.js"></script>
<script>
    var editor = createCodeEditor("my-container", {
        value: "function hello() {\n    return 'world';\n}",
        language: "javascript",
        onSave: function(val) { console.log("Saved:", val); }
    });
</script>
```

**Usage (ES module):**

```js
import { createCodeEditor } from "./dist/components/codeeditor/codeeditor.js";

const editor = createCodeEditor("my-container", {
    value: '{"key": "value"}',
    language: "json",
    theme: "dark",
    readOnly: true
});
```

See `components/codeeditor/README.md` for full documentation.

## Tagger

Combined freeform and controlled-vocabulary tag input with autocomplete, colored chips, taxonomy categories, and validation. Supports taxonomy-based and freeform tags, category badges, three color modes (category/hash/none), per-category limits, duplicate handling, paste splitting, keyboard navigation, and ARIA combobox/listbox pattern.

| Asset | Path |
|-------|------|
| CSS | `dist/components/tagger/tagger.css` |
| JS | `dist/components/tagger/tagger.js` |
| Types | `dist/components/tagger/tagger.d.ts` |

**Requires:** Bootstrap CSS, Bootstrap Icons CSS.

**Usage (script tag):**

```html
<script src="dist/components/tagger/tagger.js"></script>
<script>
    var tagger = createTagger("my-container", {
        taxonomy: [
            { id: "priority", label: "Priority", color: "#c92a2a", values: ["High", "Medium", "Low"] }
        ],
        allowFreeform: true,
        onAdd: function(tag) { console.log("Added:", tag); }
    });
</script>
```

**Usage (ES module):**

```js
import { createTagger } from "./dist/components/tagger/tagger.js";

const tagger = createTagger("my-container", {
    taxonomy: [
        { id: "type", label: "Type", color: "#1c7ed6", values: ["Bug", "Feature", "Enhancement"] }
    ],
    colorMode: "category",
    maxTags: 10
});
```

See `components/tagger/README.md` for full documentation.
