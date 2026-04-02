/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: a7c3e1b4-5d92-4f08-ae6c-8b3f0d7e2a19
 * Created: 2026-03-22
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: DiagramEngine / EmbedRegistry
 * 📜 PURPOSE: Defines the full registry of Enterprise Theme embeddable
 *    library components and a convenience function for bulk registration.
 * 🔗 RELATES: [[DiagramEngine]], [[EmbeddableComponentEntry]]
 * ⚡ FLOW: [registerEnterpriseThemeEmbeds()] -> [engine.registerEmbeddableComponent()]
 * 🔒 SECURITY: No dynamic code execution; registry is a static constant array.
 * ----------------------------------------------------------------------------
 */

// @semantic-marker embed-registry

// LOG_PREFIX, logInfo, logWarn, logError, logDebug provided by bundle header

// ============================================================================
// TYPES
// ============================================================================

/**
 * Minimal interface required to register embeddable components.
 * Allows the embed pack to remain decoupled from the full engine.
 */
export interface EngineForEmbeds
{
    registerEmbeddableComponent(
        name: string,
        entry: EmbeddableComponentEntry
    ): void;
}

// ============================================================================
// EMBED ENTRY BUILDER
// ============================================================================

/**
 * Shorthand builder to reduce boilerplate in the entries array.
 *
 * @param factory   - Window global factory function name.
 * @param label     - Human-readable display label.
 * @param icon      - Bootstrap Icon CSS class.
 * @param category  - Grouping category.
 * @param w         - Default width in canvas pixels.
 * @param h         - Default height in canvas pixels.
 * @param opts      - Default factory options.
 * @returns A fully formed EmbeddableComponentEntry.
 */
function entry(
    factory: string,
    label: string,
    icon: string,
    category: string,
    w: number,
    h: number,
    opts: Record<string, unknown> = {}
): EmbeddableComponentEntry
{
    return {
        factory,
        label,
        icon,
        category,
        defaultOptions: opts,
        defaultSize: { w, h },
    };
}

// ============================================================================
// DATA CATEGORY ENTRIES
// ============================================================================

/** Data display and hierarchical data components. */
const DATA_ENTRIES: readonly [string, EmbeddableComponentEntry][] = [
    ["datagrid",          entry("createDataGrid",          "Data Grid",          "bi-table",         "data", 400, 250)],
    ["treegrid",          entry("createTreeGrid",          "Tree Grid",          "bi-diagram-3",     "data", 350, 300)],
    ["treeview",          entry("createTreeView",          "Tree View",          "bi-list-nested",   "data", 280, 350)],
    ["propertyinspector", entry("createPropertyInspector", "Property Inspector", "bi-card-list",     "data", 300, 400)],
    ["spinemap",          entry("createSpineMap",          "Spine Map",          "bi-bezier2",       "data", 500, 350)],
    ["graphcanvas",       entry("createGraphCanvas",       "Graph Canvas",       "bi-share",         "data", 500, 400)],
    ["visualtableeditor", entry("createVisualTableEditor", "Table Editor",       "bi-table",         "data", 300, 150)],
];

// ============================================================================
// INPUT CATEGORY ENTRIES
// ============================================================================

/** Form inputs, pickers, and selection controls. */
const INPUT_ENTRIES: readonly [string, EmbeddableComponentEntry][] = [
    ["editablecombobox",  entry("createEditableComboBox",  "Editable Combo Box", "bi-menu-button-wide",  "input", 200, 34)],
    ["multiselectcombo",  entry("createMultiselectCombo",  "Multi-Select Combo", "bi-ui-checks",         "input", 250, 34)],
    ["searchbox",         entry("createSearchBox",         "Search Box",         "bi-search",            "input", 250, 34)],
    ["peoplepicker",      entry("createPeoplePicker",      "People Picker",      "bi-people",            "input", 250, 40)],
    ["datepicker",        entry("createDatePicker",        "Date Picker",        "bi-calendar-date",     "input", 250, 40)],
    ["timepicker",        entry("createTimePicker",        "Time Picker",        "bi-clock",             "input", 200, 40)],
    ["durationpicker",    entry("createDurationPicker",    "Duration Picker",    "bi-hourglass-split",   "input", 250, 40)],
    ["cronpicker",        entry("createCronPicker",        "CRON Picker",        "bi-calendar-range",    "input", 360, 280)],
    ["timezonepicker",    entry("createTimezonePicker",    "Timezone Picker",    "bi-globe",             "input", 250, 40)],
    ["periodpicker",      entry("createPeriodPicker",      "Period Picker",      "bi-calendar-week",     "input", 250, 40)],
    ["sprintpicker",      entry("createSprintPicker",      "Sprint Picker",      "bi-kanban",            "input", 250, 40)],
    ["colorpicker",       entry("createColorPicker",       "Color Picker",       "bi-palette",           "input", 280, 320)],
    ["gradientpicker",    entry("createGradientPicker",    "Gradient Picker",    "bi-palette2",          "input", 300, 340)],
    ["anglepicker",       entry("createAnglePicker",       "Angle Picker",       "bi-arrow-clockwise",   "input", 160, 160)],
    ["fontdropdown",      entry("createFontDropdown",      "Font Dropdown",      "bi-fonts",             "input", 200, 34)],
    ["symbolpicker",      entry("createSymbolPicker",      "Symbol Picker",      "bi-emoji-smile",       "input", 320, 300)],
    ["slider",            entry("createSlider",            "Slider",             "bi-sliders",           "input", 200, 40)],
    ["fileupload",        entry("createFileUpload",        "File Upload",        "bi-cloud-upload",      "input", 300, 200)],
    ["tagger",            entry("createTagger",            "Tagger",             "bi-tags",              "input", 250, 34)],
    ["richtextinput",     entry("createRichTextInput",     "Rich Text Input",    "bi-text-paragraph",    "input", 300, 100)],
    ["maskedentry",       entry("createMaskedEntry",       "Masked Entry",       "bi-shield-lock",       "input", 200, 34)],
    ["lineendingpicker",  entry("createLineEndingPicker",  "Line Ending Picker", "bi-arrow-right",       "input", 200, 34)],
    ["lineshapepicker",   entry("createLineShapePicker",   "Line Shape Picker",  "bi-bezier",            "input", 200, 34)],
    ["linetypepicker",    entry("createLineTypePicker",    "Line Type Picker",   "bi-dash-lg",           "input", 200, 34)],
    ["linewidthpicker",   entry("createLineWidthPicker",   "Line Width Picker",  "bi-border-width",      "input", 200, 34)],
    ["orientationpicker", entry("createOrientationPicker", "Orientation Picker", "bi-aspect-ratio",      "input", 200, 40)],
    ["sizespicker",       entry("createSizesPicker",       "Sizes Picker",       "bi-rulers",            "input", 200, 40)],
    ["marginspicker",     entry("createMarginsPicker",     "Margins Picker",     "bi-border-outer",      "input", 200, 40)],
    ["toolcolorpicker",   entry("createToolColorPicker",   "Tool Color Picker",  "bi-palette-fill",      "input", 250, 40)],
    ["columnspicker",     entry("createColumnsPicker",     "Columns Picker",     "bi-layout-three-columns", "input", 200, 40)],
    ["spacingpicker",     entry("createSpacingPicker",     "Spacing Picker",     "bi-distribute-vertical",  "input", 200, 40)],
];

// ============================================================================
// CONTENT CATEGORY ENTRIES
// ============================================================================

/** Content editing, rendering, and documentation components. */
const CONTENT_ENTRIES: readonly [string, EmbeddableComponentEntry][] = [
    ["codeeditor",        entry("createCodeEditor",        "Code Editor",        "bi-code-square",    "content", 400, 300)],
    ["markdowneditor",    entry("createMarkdownEditor",    "Markdown Editor",    "bi-markdown",       "content", 500, 400)],
    ["markdownrenderer",  entry("createMarkdownRenderer",  "Markdown Renderer",  "bi-file-richtext",  "content", 400, 300)],
    ["docviewer",         entry("createDocViewer",          "Doc Viewer",         "bi-file-text",      "content", 600, 450)],
    ["helpdrawer",        entry("createHelpDrawer",         "Help Drawer",        "bi-question-circle","content", 320, 400)],
    ["helptooltip",       entry("createHelpTooltip",        "Help Tooltip",       "bi-patch-question", "content", 24,  24)],
    ["latexeditor",       entry("createLatexEditor",        "LaTeX Editor",       "bi-subscript",      "content", 400, 300)],
];

// ============================================================================
// FEEDBACK CATEGORY ENTRIES
// ============================================================================

/** Feedback, progress, confirmation, and status components. */
const FEEDBACK_ENTRIES: readonly [string, EmbeddableComponentEntry][] = [
    ["toast",             entry("showToast",               "Toast",              "bi-bell",           "feedback", 300, 60)],
    ["progressmodal",     entry("showProgressModal",       "Progress Modal",     "bi-hourglass",      "feedback", 400, 200)],
    ["errordialog",       entry("showErrorDialog",         "Error Dialog",       "bi-exclamation-triangle", "feedback", 400, 300)],
    ["confirmdialog",     entry("showConfirmDialog",       "Confirm Dialog",     "bi-question-diamond",    "feedback", 400, 200)],
    ["formdialog",        entry("createFormDialog",        "Form Dialog",        "bi-input-cursor-text",   "feedback", 400, 300)],
    ["stepper",           entry("createStepper",           "Stepper",            "bi-list-ol",             "feedback", 500, 60)],
    ["statusbar",         entry("createStatusBar",         "Status Bar",         "bi-info-square",         "feedback", 600, 28)],
];

// ============================================================================
// NAVIGATION CATEGORY ENTRIES
// ============================================================================

/** Navigation, toolbars, and viewport helper components. */
const NAVIGATION_ENTRIES: readonly [string, EmbeddableComponentEntry][] = [
    ["ribbon",            entry("createRibbon",            "Ribbon",             "bi-layout-text-window",  "navigation", 600, 120)],
    ["ribbonbuilder",     entry("createRibbonBuilder",     "Ribbon Builder",     "bi-tools",               "navigation", 600, 400)],
    ["toolbar",           entry("createToolbar",           "Toolbar",            "bi-wrench",              "navigation", 500, 40)],
    ["sidebar",           entry("createSidebar",           "Sidebar",            "bi-layout-sidebar",      "navigation", 260, 400)],
    ["tabbedpanel",       entry("createTabbedPanel",       "Tabbed Panel",       "bi-window-stack",        "navigation", 400, 300)],
    ["magnifier",         entry("createMagnifier",         "Magnifier",          "bi-zoom-in",             "navigation", 150, 150)],
    ["ruler",             entry("createRuler",             "Ruler",              "bi-rulers",              "navigation", 400, 24)],
];

// ============================================================================
// AI CATEGORY ENTRIES
// ============================================================================

/** AI and machine learning interaction components. */
const AI_ENTRIES: readonly [string, EmbeddableComponentEntry][] = [
    ["conversation",           entry("createConversation",           "Conversation",            "bi-chat-dots",        "ai", 400, 500)],
    ["prompttemplatemanager",  entry("createPromptTemplateManager",  "Prompt Template Manager", "bi-file-earmark-code","ai", 600, 450)],
    ["reasoningaccordion",     entry("createReasoningAccordion",     "Reasoning Accordion",     "bi-list-stars",       "ai", 400, 300)],
];

// ============================================================================
// GOVERNANCE CATEGORY ENTRIES
// ============================================================================

/** Governance, audit, and access control components. */
const GOVERNANCE_ENTRIES: readonly [string, EmbeddableComponentEntry][] = [
    ["auditlogviewer",   entry("createAuditLogViewer",   "Audit Log Viewer",   "bi-journal-text",  "governance", 600, 350)],
    ["permissionmatrix", entry("createPermissionMatrix", "Permission Matrix",  "bi-shield-check",  "governance", 500, 350)],
];

// ============================================================================
// LAYOUT CATEGORY ENTRIES
// ============================================================================

/** Layout container and arrangement components. */
const LAYOUT_ENTRIES: readonly [string, EmbeddableComponentEntry][] = [
    ["docklayout",       entry("createDockLayout",       "Dock Layout",        "bi-grid-1x2",        "layout", 600, 400)],
    ["splitlayout",      entry("createSplitLayout",      "Split Layout",       "bi-layout-split",    "layout", 600, 400)],
    ["layerlayout",      entry("createLayerLayout",      "Layer Layout",       "bi-layers",          "layout", 600, 400)],
    ["cardlayout",       entry("createCardLayout",       "Card Layout",        "bi-stack",           "layout", 400, 300)],
    ["boxlayout",        entry("createBoxLayout",        "Box Layout",         "bi-distribute-horizontal", "layout", 400, 200)],
    ["flowlayout",       entry("createFlowLayout",       "Flow Layout",        "bi-text-wrap",       "layout", 500, 300)],
    ["gridlayout",       entry("createGridLayout",       "Grid Layout",        "bi-grid-3x3",        "layout", 500, 400)],
    ["anchorlayout",     entry("createAnchorLayout",     "Anchor Layout",      "bi-pin-angle",       "layout", 600, 400)],
    ["borderlayout",     entry("createBorderLayout",     "Border Layout",      "bi-border-outer",    "layout", 600, 400)],
    ["flexgridlayout",   entry("createFlexGridLayout",   "Flex Grid Layout",   "bi-grid",            "layout", 600, 400)],
];

// ============================================================================
// SOCIAL CATEGORY ENTRIES
// ============================================================================

/** Social, collaboration, and identity components. */
const SOCIAL_ENTRIES: readonly [string, EmbeddableComponentEntry][] = [
    ["activityfeed",       entry("createActivityFeed",       "Activity Feed",       "bi-rss",            "social", 350, 400)],
    ["timeline",           entry("createTimeline",           "Timeline",            "bi-clock-history",  "social", 500, 200)],
    ["commentoverlay",     entry("createCommentOverlay",     "Comment Overlay",     "bi-chat-right-dots","social", 400, 300)],
    ["sharedialog",        entry("createShareDialog",        "Share Dialog",        "bi-share-fill",     "social", 400, 300)],
    ["notificationcenter", entry("createNotificationCenter", "Notification Center", "bi-bell-fill",      "social", 350, 400)],
    ["workspaceswitcher",  entry("createWorkspaceSwitcher",  "Workspace Switcher",  "bi-building",       "social", 250, 300)],
    ["usermenu",           entry("createUserMenu",           "User Menu",           "bi-person-circle",  "social", 200, 250)],
    ["personchip",         entry("createPersonChip",         "Person Chip",         "bi-person-badge",   "social", 180, 32)],
    ["presenceindicator",  entry("createPresenceIndicator",  "Presence Indicator",  "bi-people-fill",    "social", 120, 32)],
    ["pill",               entry("createPill",               "Pill",                "bi-capsule",        "social", 100, 24)],
    ["typebadge",          entry("createTypeBadge",          "Type Badge",          "bi-bookmark",       "social", 80,  24)],
    ["relationshipmanager",entry("createRelationshipManager","Relationship Manager","bi-diagram-2",      "social", 500, 350)],
];

// ============================================================================
// OTHER CATEGORY ENTRIES
// ============================================================================

/** Miscellaneous utility and specialised components. */
const OTHER_ENTRIES: readonly [string, EmbeddableComponentEntry][] = [
    ["actionitems",      entry("createActionItems",      "Action Items",       "bi-check2-square",    "other", 400, 300)],
    ["commandpalette",   entry("openCommandPalette",     "Command Palette",    "bi-terminal",         "other", 500, 350)],
    ["facetsearch",      entry("createFacetSearch",      "Facet Search",       "bi-funnel",           "other", 350, 34)],
    ["guidedtour",       entry("createGuidedTour",       "Guided Tour",        "bi-signpost-2",       "other", 300, 200)],
    ["themetoggle",      entry("createThemeToggle",      "Theme Toggle",       "bi-circle-half",      "other", 100, 32)],
    ["fileexplorer",     entry("createFileExplorer",     "File Explorer",      "bi-folder2-open",     "other", 500, 400)],
    ["applauncher",      entry("createAppLauncher",      "App Launcher",       "bi-grid-3x3-gap",    "other", 300, 300)],
    ["breadcrumb",       entry("createBreadcrumb",       "Breadcrumb",         "bi-chevron-right",    "other", 400, 28)],
    ["logconsole",       entry("createLogConsole",       "Log Console",        "bi-terminal-fill",    "other", 500, 250)],
    ["gauge",            entry("createGauge",            "Gauge",              "bi-speedometer2",     "other", 200, 200)],
    ["emptystate",       entry("createEmptyState",       "Empty State",        "bi-inbox",            "other", 300, 200)],
    ["skeletonloader",   entry("createSkeletonLoader",   "Skeleton Loader",    "bi-placeholder",      "other", 300, 100)],
    ["statusbadge",      entry("createStatusBadge",      "Status Badge",       "bi-circle-fill",      "other", 80,  24)],
    ["bannerbar",        entry("createBannerBar",        "Banner Bar",         "bi-megaphone",        "other", 600, 48)],
    ["graphtoolbar",     entry("createGraphToolbar",     "Graph Toolbar",      "bi-diagram-3-fill",   "other", 500, 40)],
    ["graphlegend",      entry("createGraphLegend",      "Graph Legend",       "bi-list-columns",     "other", 240, 300)],
    ["graphminimap",     entry("createGraphMinimap",      "Graph Minimap",     "bi-pip",              "other", 200, 150)],
    ["contextmenu",      entry("createContextMenu",       "Context Menu",      "bi-menu-button",      "other", 220, 200)],
    ["inlinetoolbar",    entry("createInlineToolbar",      "Inline Toolbar",    "bi-wrench",           "other", 300, 32)],
    ["stacklayout",      entry("createStackLayout",        "Stack Layout",      "bi-stack",            "layout", 300, 400)],
];

// ============================================================================
// COMBINED REGISTRY
// ============================================================================

/**
 * Complete registry of all Enterprise Theme embeddable components.
 *
 * Each tuple is `[registryName, EmbeddableComponentEntry]`.
 * Excludes DiagramEngine (recursive) and SmartTextInput (engine, not UI).
 */
export const ENTERPRISE_EMBED_ENTRIES: readonly [string, EmbeddableComponentEntry][] = [
    ...DATA_ENTRIES,
    ...INPUT_ENTRIES,
    ...CONTENT_ENTRIES,
    ...FEEDBACK_ENTRIES,
    ...NAVIGATION_ENTRIES,
    ...AI_ENTRIES,
    ...GOVERNANCE_ENTRIES,
    ...LAYOUT_ENTRIES,
    ...SOCIAL_ENTRIES,
    ...OTHER_ENTRIES,
];

// ============================================================================
// BULK REGISTRATION
// ============================================================================

/**
 * Registers all Enterprise Theme components as embeddable types in
 * the given engine. Call this once after engine creation to make the
 * full component library available for embedding on the canvas.
 *
 * @param engine - Any object implementing the EngineForEmbeds interface.
 */
export function registerEnterpriseThemeEmbeds(engine: EngineForEmbeds): void
{
    const count = ENTERPRISE_EMBED_ENTRIES.length;

    logInfo(`Registering ${count} enterprise theme embed components...`);

    for (const [name, embedEntry] of ENTERPRISE_EMBED_ENTRIES)
    {
        engine.registerEmbeddableComponent(name, embedEntry);
    }

    logInfo(`Enterprise theme embed pack loaded (${count} components).`);
}
