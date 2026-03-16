<!-- AGENT: Auto-generated — do not edit. Run `npm run build` to regenerate. -->

# Component Index

94 implemented components. Use this file for quick lookup; see each component's README for full API details.

Full reference (all READMEs in one file): [COMPONENT_REFERENCE.md](COMPONENT_REFERENCE.md)

## Date, Time & Pickers

| Component | Description | Factory | Docs |
|-----------|-------------|---------|------|
| anglepicker | A circular dial input for selecting angles from 0 to 360 degrees. | `createAnglePicker()` | [README](docs/components/anglepicker/README.md) |
| colorpicker | A canvas-based colour selection control with saturation/brightness gradient, vertical hue strip, optional opacity sli... | `createColorPicker()` | [README](docs/components/colorpicker/README.md) |
| cronpicker | A visual builder for extended 6-field CRON expressions (second, minute, hour, day-of-month, month, day-of-week) with ... | `createCronPicker()` | [README](docs/components/cronpicker/README.md) |
| datepicker | A calendar date picker with day, month, and year navigation views. | `createDatePicker()` | [README](docs/components/datepicker/README.md) |
| durationpicker | A duration/interval picker with configurable unit patterns and ISO 8601 support. | `createDurationPicker()` | [README](docs/components/durationpicker/README.md) |
| lineendingpicker | A dropdown picker that displays line ending (arrowhead / marker) styles with inline SVG previews, letting users selec... | `createLineEndingPicker()` | [README](docs/components/lineendingpicker/README.md) |
| lineshapepicker | A dropdown picker that displays line shape/routing patterns with inline SVG previews, letting users select connector ... | `createLineShapePicker()` | [README](docs/components/lineshapepicker/README.md) |
| linetypepicker | A dropdown picker that displays line dash patterns with inline SVG previews, letting users select stroke styles for g... | `createLineTypePicker()` | [README](docs/components/linetypepicker/README.md) |
| linewidthpicker | A dropdown picker that displays line widths with visual CSS border previews, letting users select stroke thickness fo... | `createLineWidthPicker()` | [README](docs/components/linewidthpicker/README.md) |
| peoplepicker | Searchable person selector for share dialogs, assignment fields, and permission lists. | `createPeoplePicker()` | [README](docs/components/peoplepicker/README.md) |
| periodpicker | Coarse time-period selector for enterprise project planning. | `createPeriodPicker()` | [README](docs/components/periodpicker/README.md) |
| sprintpicker | Agile sprint selector with list and calendar views. | `createSprintPicker()` | [README](docs/components/sprintpicker/README.md) |
| symbolpicker | A grid-based symbol and icon picker for inserting Unicode characters and Bootstrap Icons. | `createSymbolPicker()` | [README](docs/components/symbolpicker/README.md) |
| timepicker | A time-of-day picker with spinner columns and optional timezone selector. | `createTimePicker()` | [README](docs/components/timepicker/README.md) |
| timezonepicker | A searchable dropdown selector for IANA timezones with grouped regions, UTC offset display, and live current-time pre... | `createTimezonePicker()` | [README](docs/components/timezonepicker/README.md) |

## Inputs & Selection

| Component | Description | Factory | Docs |
|-----------|-------------|---------|------|
| editablecombobox | A combined text input and dropdown list component built on Bootstrap 5. | `createEditableComboBox()` | [README](docs/components/editablecombobox/README.md) |
| maskedentry | A specialised input field that masks sensitive non-password data — API keys, tokens, SSNs, connection strings, and si... | `createMaskedEntry()` | [README](docs/components/maskedentry/README.md) |
| multiselectcombo | A multi-select combo box that allows users to choose multiple items from a filterable dropdown list. | `createMultiselectCombo()` | [README](docs/components/multiselectcombo/README.md) |
| searchbox | A debounced search input with search icon, clear button, loading spinner, and optional suggestions dropdown. | `createSearchBox()` | [README](docs/components/searchbox/README.md) |

## Content & Editing

| Component | Description | Factory | Docs |
|-----------|-------------|---------|------|
| codeeditor | Bootstrap 5-themed code editor wrapping CodeMirror 6 with syntax highlighting, toolbar, and diagnostics. | `createCodeEditor()` | [README](docs/components/codeeditor/README.md) |
| commentoverlay | Transparent overlay system for anchoring comment pins to DOM elements, enabling inline annotation with threaded discu... | `createCommentOverlay()` | [README](docs/components/commentoverlay/README.md) |
| fileupload | A drag-and-drop file upload zone with progress bars, file type validation, size limits, batch upload, and an optional... | `createFileUpload()` | [README](docs/components/fileupload/README.md) |
| markdowneditor | A Bootstrap 5-themed Markdown editor wrapper around [Vditor](https://github.com/Vanessa219/vditor) with tab/side-by-s... | `createMarkdownEditor()`, `showMarkdownEditorModal()`, `created()`, `showOverflowIndicator()` | [README](docs/components/markdowneditor/README.md) |

## Data Display

| Component | Description | Factory | Docs |
|-----------|-------------|---------|------|
| datagrid | High-performance flat data table with sorting, filtering, pagination, column resize, row selection, inline editing, v... | `createDataGrid()`, `showColumn()` | [README](docs/components/datagrid/README.md) |
| fileexplorer | Two-pane file navigation component with a folder tree sidebar, breadcrumb navigation, three view modes (grid, list, d... | `createFileExplorer()` | [README](docs/components/fileexplorer/README.md) |
| treeview | A highly configurable, generic tree view component for representing multi-tree structured data. | `createTreeView()` | [README](docs/components/treeview/README.md) |

## Data Visualization

| Component | Description | Factory | Docs |
|-----------|-------------|---------|------|
| activityfeed | Social-style activity feed with date grouping, infinite scroll, real-time additions, and compact mode. | `createActivityFeed()` | [README](docs/components/activityfeed/README.md) |
| gauge | A visual measure component modeled after the ASN.1 Gauge type. | `createTileGauge()`, `createRingGauge()`, `createGauge()`, `createBarGauge()` | [README](docs/components/gauge/README.md) |
| timeline | A horizontal event timeline component for displaying point and span events along a time axis. | `createTimeline()`, `showDetailPanel()` | [README](docs/components/timeline/README.md) |

## Search & Filtering

| Component | Description | Factory | Docs |
|-----------|-------------|---------|------|
| commandpalette | Keyboard-first command palette (Ctrl+K omnibar) for searching and executing registered commands with fuzzy matching, ... | — | [README](docs/components/commandpalette/README.md) |
| facetsearch | Facet-aware search bar that combines free-text search with structured `key:value` query facets. | `createFacetSearch()` | [README](docs/components/facetsearch/README.md) |
| tagger | Combined freeform and controlled-vocabulary tag input with autocomplete, colored chips, taxonomy categories, and vali... | `createTagger()` | [README](docs/components/tagger/README.md) |

## Dialogs & Modals

| Component | Description | Factory | Docs |
|-----------|-------------|---------|------|
| confirmdialog | A general-purpose confirmation modal with customizable title, message, icon, buttons, and a promise-based API. | `showConfirmDialog()`, `showDangerConfirmDialog()` | [README](docs/components/confirmdialog/README.md) |
| errordialog | A Bootstrap 5 modal that displays literate error messages with user-friendly narrative and collapsible technical deta... | `showErrorDialog()` | [README](docs/components/errordialog/README.md) |
| progressmodal | A modal dialog for displaying progress of long-running operations. | `showProgressModal()`, `showSteppedProgressModal()` | [README](docs/components/progressmodal/README.md) |

## Feedback & Status

| Component | Description | Factory | Docs |
|-----------|-------------|---------|------|
| emptystate | A centered placeholder component shown when a view, list, table, or container has no data. | `createEmptyState()`, `showAction()` | [README](docs/components/emptystate/README.md) |
| skeletonloader | Animated placeholder component that mimics content layout during loading. | `createSkeletonLoader()` | [README](docs/components/skeletonloader/README.md) |
| statusbadge | Colour-coded pills/dots communicating process or system state with animated pulse and click-for-detail support. | `createStatusBadge()` | [README](docs/components/statusbadge/README.md) |
| toast | A transient, non-blocking notification system with stacking, auto-dismiss, progress bar, and action support. | `showSuccessToast()`, `showErrorToast()`, `showToast()`, `showInfoToast()`, `showWarningToast()` | [README](docs/components/toast/README.md) |

## Bars & Toolbars

| Component | Description | Factory | Docs |
|-----------|-------------|---------|------|
| bannerbar | A fixed-to-top viewport banner for announcing significant events such as service status updates, critical issues, mai... | `createBannerBar()`, `showBanner()` | [README](docs/components/bannerbar/README.md) |
| graphtoolbar | Factory function that creates a preconfigured Toolbar instance for graph visualization applications. | `createGraphToolbar()` | [README](docs/components/graphtoolbar/README.md) |
| statusbar | A fixed-to-bottom viewport status bar with configurable label/value regions separated by pipe dividers. | `createStatusBar()` | [README](docs/components/statusbar/README.md) |
| toolbar | A programmable action bar component for grouping tools and actions into labelled regions. | `createToolbar()`, `showKeyTips()`, `createDockedToolbar()`, `createFloatingToolbar()` | [README](docs/components/toolbar/README.md) |

## Panels & Navigation

| Component | Description | Factory | Docs |
|-----------|-------------|---------|------|
| sidebar | A dockable, floatable, resizable sidebar panel component that acts as a container for other components. | `createDockedSidebar()`, `createFloatingSidebar()`, `createSidebar()` | [README](docs/components/sidebar/README.md) |
| tabbedpanel | A dockable, collapsible, resizable tabbed panel component for grouping related content into tabs. | `createTabbedPanel()`, `createDockedTabbedPanel()`, `createFloatingTabbedPanel()` | [README](docs/components/tabbedpanel/README.md) |

## Identity & Navigation

| Component | Description | Factory | Docs |
|-----------|-------------|---------|------|
| usermenu | Avatar-triggered dropdown menu for user account actions. | `createUserMenu()` | [README](docs/components/usermenu/README.md) |
| workspaceswitcher | Dropdown or modal control for switching between organisational workspaces and tenants. | `createWorkspaceSwitcher()` | [README](docs/components/workspaceswitcher/README.md) |

## AI & ML

| Component | Description | Factory | Docs |
|-----------|-------------|---------|------|
| conversation | A programmable turn-by-turn conversation UI component for AI agent interactions in enterprise SaaS applications. | `createConversation()`, `showTypingIndicator()` | [README](docs/components/conversation/README.md) |
| prompttemplatemanager | Two-pane CRUD interface for creating, editing, organising, and testing prompt templates with `{{variable}}` extractio... | `createPromptTemplateManager()`, `createTemplate()` | [README](docs/components/prompttemplatemanager/README.md) |
| reasoningaccordion | Collapsible accordion for displaying AI chain-of-thought reasoning steps with status indicators, shimmer animation, t... | `createReasoningAccordion()` | [README](docs/components/reasoningaccordion/README.md) |

## Layout Containers

| Component | Description | Factory | Docs |
|-----------|-------------|---------|------|
| anchorlayout | A constraint-based layout container that positions children by declaring anchor relationships between child edges and... | `createElement()`, `createAnchorLayout()` | [README](docs/components/anchorlayout/README.md) |
| borderlayout | A five-region CSS Grid layout container that divides its area into North, South, East, West, and Center regions. | `createElement()`, `createBorderLayout()` | [README](docs/components/borderlayout/README.md) |
| boxlayout | A single-axis flex layout container that arranges children sequentially along one axis (horizontal or vertical) with ... | `createBoxLayout()` | [README](docs/components/boxlayout/README.md) |
| cardlayout | An indexed-stack layout container that stacks all children in the same space but displays only one at a time. | `createElement()`, `createCardLayout()` | [README](docs/components/cardlayout/README.md) |
| docklayout | A CSS Grid-based layout coordinator that arranges Toolbar, Sidebar, TabbedPanel, StatusBar, and content into a 5-zone... | `createDockLayout()` | [README](docs/components/docklayout/README.md) |
| flexgridlayout | An advanced CSS Grid layout container with mixed track sizes and cell spanning. | `createFlexGridLayout()` | [README](docs/components/flexgridlayout/README.md) |
| flowlayout | A wrapping flex layout container that arranges children sequentially and wraps to the next line when the boundary is ... | `createElement()`, `createFlowLayout()` | [README](docs/components/flowlayout/README.md) |
| gridlayout | A uniform CSS Grid layout container where all cells are the same size, arranged via `grid-template-columns: repeat(N,... | `createElement()`, `createGridLayout()` | [README](docs/components/gridlayout/README.md) |
| layerlayout | A z-stack layout container where all children are simultaneously visible, layered in z-order. | `createLayerLayout()` | [README](docs/components/layerlayout/README.md) |
| splitlayout | A split layout container that divides available space into two or more panes separated by draggable dividers. | `createSplitLayout()` | [README](docs/components/splitlayout/README.md) |
| treegrid | A highly configurable tree-grid hybrid component for displaying hierarchical data with multi-column tabular views. | `createTreeGrid()`, `showColumn()` | [README](docs/components/treegrid/README.md) |

## Governance & Security

| Component | Description | Factory | Docs |
|-----------|-------------|---------|------|
| auditlogviewer | Read-only filterable audit log viewer with severity badges, expandable detail rows, filter chips, pagination, and CSV... | `createAuditLogViewer()` | [README](docs/components/auditlogviewer/README.md) |
| permissionmatrix | Interactive RBAC permission matrix with roles as columns and grouped permissions as rows. | `createPermissionMatrix()` | [README](docs/components/permissionmatrix/README.md) |

## Developer Tools

| Component | Description | Factory | Docs |
|-----------|-------------|---------|------|
| logconsole | A reusable in-app logging console for displaying high-level user actions and system events. | `createLogConsole()`, `createDockedTabbedPanel()` | [README](docs/components/logconsole/README.md) |

## Other

| Component | Description | Factory | Docs |
|-----------|-------------|---------|------|
| actionitems | A rich, stateful action item list with status lifecycle tracking, person assignments, priority badges, due dates, com... | `createActionItems()` | [README](docs/components/actionitems/README.md) |
| applauncher | Grid-based application launcher with three view modes: dropdown (waffle icon trigger), modal (centered overlay), and ... | `createAppLauncher()` | [README](docs/components/applauncher/README.md) |
| breadcrumb | Hierarchical path display with clickable segments, optional terminal dropdown actions, and overflow truncation for de... | `createBreadcrumb()` | [README](docs/components/breadcrumb/README.md) |
| diagramengine | Universal vector canvas engine for diagramming, graph visualization, technical drawing, poster creation, and embedded... | `createDiagramEngine()` | [README](docs/components/diagramengine/README.md) |
| docviewer | Full-page three-column documentation layout. | `createDocViewer()` | [README](docs/components/docviewer/README.md) |
| fontdropdown | A dropdown where each font name renders in its own typeface, similar to the font picker in Google Docs. | `createFontDropdown()`, `createRibbon()` | [README](docs/components/fontdropdown/README.md) |
| formdialog | A modal dialog optimized for form-based workflows (create, edit, invite, assign). | `createFormDialog()`, `createElement()` | [README](docs/components/formdialog/README.md) |
| graphcanvas | Interactive SVG graph visualization with multiple layout algorithms, zoom/pan, selection, edge creation, keyboard sho... | `createGraphCanvas()` | [README](docs/components/graphcanvas/README.md) |
| graphcanvasmx | Interactive graph visualization powered by [maxGraph](https://github.com/maxGraph/maxGraph). | `createGraphCanvasMx()` | [README](docs/components/graphcanvasmx/README.md) |
| guidedtour | Product walkthrough component wrapping Driver.js. | `createGuidedTour()` | [README](docs/components/guidedtour/README.md) |
| helpdrawer | Right-side sliding panel for in-context documentation display. | `createHelpDrawer()` | [README](docs/components/helpdrawer/README.md) |
| helptooltip | A small `?` icon that attaches to any element for in-context help. | `createHelpTooltip()` | [README](docs/components/helptooltip/README.md) |
| magnifier | A cursor-following magnifying glass overlay that clones and scales the content of a target element within a circular ... | `createMagnifier()` | [README](docs/components/magnifier/README.md) |
| notificationcenter | Aggregated notification panel with bell trigger, unread badge, category filters, read/unread state, dismiss per item,... | `createNotificationCenter()` | [README](docs/components/notificationcenter/README.md) |
| personchip | A compact inline element displaying a person's identity: circular avatar (image or deterministic initials), name, opt... | `createPersonChip()`, `createElement()` | [README](docs/components/personchip/README.md) |
| pill | A reusable inline pill element for mentions, issues, documents, tags, and other entity references. | `createPill()` | [README](docs/components/pill/README.md) |
| presenceindicator | A compact overlapping avatar stack showing who is actively viewing or editing a shared resource. | `createPresenceIndicator()` | [README](docs/components/presenceindicator/README.md) |
| propertyinspector | Non-modal right-side panel for viewing and editing entity details without navigating away from the parent list. | `createPropertyInspector()`, `createElement()` | [README](docs/components/propertyinspector/README.md) |
| relationshipmanager | Component for creating, viewing, and managing typed relationships between entities. | `createRelationshipManager()` | [README](docs/components/relationshipmanager/README.md) |
| ribbon | A Microsoft Office-style tabbed toolbar for organizing commands and controls into logical groups. | `createRibbon()`, `showContextualTab()`, `createElement()` | [README](docs/components/ribbon/README.md) |
| ribbonbuilder | Visual WYSIWYG editor for composing Ribbon toolbar layouts via drag-and-drop. | `createRibbon()`, `createRibbonBuilder()` | [README](docs/components/ribbonbuilder/README.md) |
| richtextinput | A lightweight `contenteditable`-based rich text input that composes STIE and Pill for per-row editing contexts — todo... | `createRichTextInput()` | [README](docs/components/richtextinput/README.md) |
| ruler | A canvas-based calibrated ruler with cursor tracking, multiple unit systems, and DPI-aware rendering. | `createRuler()` | [README](docs/components/ruler/README.md) |
| sharedialog | A modal dialog for sharing resources with configurable access levels. | `showShareDialog()`, `createShareDialog()` | [README](docs/components/sharedialog/README.md) |
| slider | A range input component with single-value and dual-thumb range modes, optional tick marks, value labels, keyboard nav... | `createSlider()` | [README](docs/components/slider/README.md) |
| smarttextinput | A behavioral middleware engine (non-UI) that attaches to text inputs and provides trigger-based inline references suc... | `createSmartTextInput()`, `showPopover()` | [README](docs/components/smarttextinput/README.md) |
| spinemap | Interactive SVG capability/feature map with a central spine, branching sub-nodes, four layout algorithms, zoom/pan, s... | `createSpineMap()` | [README](docs/components/spinemap/README.md) |
| stepper | Linear or non-linear step progression UI for complex multi-step processes with validation gates, save-as-draft, step ... | `createStepper()` | [README](docs/components/stepper/README.md) |
| themetoggle | Compact three-state theme switcher — **Light**, **Auto** (OS preference), and **Dark**. | `createThemeToggle()` | [README](docs/components/themetoggle/README.md) |
| typebadge | Small inline chip/badge that visually identifies an ontology type via icon, color, and label. | `createTypeBadge()` | [README](docs/components/typebadge/README.md) |

## Asset Paths

All components follow the same pattern:

```
CSS: components/<name>/<name>.css
JS:  components/<name>/<name>.js
```
