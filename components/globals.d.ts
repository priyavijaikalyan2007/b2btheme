/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 7f2b4d16-9c38-4a5e-b0d7-13e8a6c45f29
 * Created: 2026-10-13
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: Globals
 * 📜 PURPOSE: Ambient declarations for the window globals that components
 *             publish to each other. Components in this library do not
 *             import one another, they communicate through `window`, so
 *             every cross-component lookup used to need a `window as any`
 *             cast. Declaring the shape here types those lookups instead.
 * 🔗 RELATES: [[LogUtility]], [[FrontendLogging]]
 * ⚡ FLOW: [Component] -> [window.createLogUtility] -> [LogUtility]
 * ----------------------------------------------------------------------------
 *
 * EVERY MEMBER IS OPTIONAL, and that is the contract rather than caution.
 * Each component ships as its own IIFE bundle and a page loads only the
 * bundles it uses, so a global is present exactly when its bundle was
 * loaded. The `?` is what forces the `typeof x === "function"` guard that
 * every consumer already writes.
 *
 * THE IMPORTS ARE TYPE-ONLY AND ERASED. A `.d.ts` emits nothing, so naming
 * a component here creates no runtime edge between bundles and does not
 * change the rule that components never import one another.
 *
 * ADR-171 D2 chose this over `(window as unknown as Record<string, unknown>)`,
 * which the March 2026 audit prescribed. That form returns `unknown` and so
 * forces a second cast on the value, which buys nothing over `any`.
 *
 * ONE CENTRAL FILE RATHER THAN A `declare global` BESIDE EACH COMPONENT is
 * ADR-174 D1, and the reason is the third-party globals below. A block
 * beside the publisher has nowhere to put `Chart` or `katex`, because
 * nothing in this repository publishes them. Choosing the per-component
 * shape would not have removed this file, it would have shrunk it to the
 * third-party names and left two readers of the same library to agree with
 * each other by hand.
 *
 * THIS FILE IS BUILD-TIME ONLY. It is not emitted to `dist/`, `package.json`
 * declares no `types` entry, and no generated component `.d.ts` refers to
 * it. A consumer still loads one `<script>` per component and gets
 * `dist/components/<name>/<name>.d.ts` for types. Declaring 268 globals here
 * costs a consumer nothing and pulls in no component they did not ask for.
 */

import type { LogUtility, LogUtilityOptions } from "./logutility/logutility";
import type { ActionItems, createActionItems } from "./actionitems/actionitems";
import type { ActivityFeed, createActivityFeed } from "./activityfeed/activityfeed";
import type { AnchorLayout, createAnchorLayout } from "./anchorlayout/anchorlayout";
import type { AnglePicker, createAnglePicker } from "./anglepicker/anglepicker";
import type { createAnnotation } from "./annotation/annotation";
import type { AppLauncher, createAppLauncher } from "./applauncher/applauncher";
import type { AuditLogViewer, createAuditLogViewer } from "./auditlogviewer/auditlogviewer";
import type { createAuthCard } from "./authcard/authcard";
import type { BannerBar, createBannerBar, showBanner } from "./bannerbar/bannerbar";
import type { BorderLayout, createBorderLayout } from "./borderlayout/borderlayout";
import type { BoxLayout, createBoxLayout } from "./boxlayout/boxlayout";
import type { createBreadcrumb } from "./breadcrumb/breadcrumb";
import type { CardLayout, createCardLayout } from "./cardlayout/cardlayout";
import type { ChartPanel, createChartPanel } from "./chartpanel/chartpanel";
import type { createChatDock } from "./chatdock/chatdock";
import type { CodeEditor, createCodeEditor } from "./codeeditor/codeeditor";
import type { ColorPicker, createColorPicker } from "./colorpicker/colorpicker";
import type { createColumnsPicker } from "./columnspicker/columnspicker";
import type
{
    CommandPalette,
    openCommandPalette,
    registerCommand,
    registerCommands,
} from "./commandpalette/commandpalette";
import type { CommentOverlay, createCommentOverlay } from "./commentoverlay/commentoverlay";
import type { ConfirmDialog, showConfirmDialog, showDangerConfirmDialog } from "./confirmdialog/confirmdialog";
import type { attachLongPress, createContextMenu } from "./contextmenu/contextmenu";
import type { Conversation, createConversation } from "./conversation/conversation";
import type { CronPicker, createCronPicker } from "./cronpicker/cronpicker";
import type { DataGrid, createDataGrid } from "./datagrid/datagrid";
import type { DatePicker, createDatePicker } from "./datepicker/datepicker";
import type { createDiagramEngine } from "./diagramengine/diagramengine";
import type { DockLayout, createDockLayout } from "./docklayout/docklayout";
import type { createDocViewer } from "./docviewer/docviewer";
import type { DurationPicker, createDurationPicker } from "./durationpicker/durationpicker";
import type { createDynamicCanvas } from "./dynamiccanvas/dynamiccanvas";
import type
{
    DynamicFormSwitcherHandle,
    DynamicFormSwitcherOptions,
    createDynamicFormSwitcher,
    registerDynamicFormFieldProvider,
    unregisterDynamicFormFieldProvider,
} from "./dynamicformswitcher/dynamicformswitcher";
import type { EditableComboBox, createEditableComboBox } from "./editablecombobox/editablecombobox";
import type { EmptyState, createEmptyState } from "./emptystate/emptystate";
import type { ErrorDialog, showErrorDialog } from "./errordialog/errordialog";
import type { ExplorerPickerImpl, createExplorerPicker } from "./explorerpicker/explorerpicker";
import type { FacetSearch, createFacetSearch, parseFacetQuery } from "./facetsearch/facetsearch";
import type { FileExplorer, createFileExplorer } from "./fileexplorer/fileexplorer";
import type { FileUpload, createFileUpload } from "./fileupload/fileupload";
import type { FlexGridLayout, createFlexGridLayout } from "./flexgridlayout/flexgridlayout";
import type { FlowLayout, createFlowLayout } from "./flowlayout/flowlayout";
import type { FontDropdown, createFontDropdown } from "./fontdropdown/fontdropdown";
import type { FormDialog, FormDialogOptions, createFormDialog } from "./formdialog/formdialog";
import type { Gauge, createBarGauge, createGauge, createRingGauge, createTileGauge } from "./gauge/gauge";
import type { GradientPicker, createGradientPicker } from "./gradientpicker/gradientpicker";
import type { GraphCanvas, GraphCanvasOptions, createGraphCanvas } from "./graphcanvas/graphcanvas";
import type { createGraphLegend } from "./graphlegend/graphlegend";
import type { createGraphMinimap } from "./graphminimap/graphminimap";
import type { createGraphToolbar } from "./graphtoolbar/graphtoolbar";
import type { GridLayout, createGridLayout } from "./gridlayout/gridlayout";
import type { createGuidedTour } from "./guidedtour/guidedtour";
import type { createHelpDrawer, getHelpDrawer } from "./helpdrawer/helpdrawer";
import type { createHelpTooltip } from "./helptooltip/helptooltip";
import type { attachHoverCard, createHoverCard } from "./hovercard/hovercard";
import type { createInlineToolbar } from "./inlinetoolbar/inlinetoolbar";
import type { createLatexEditor } from "./latexeditor/latexeditor";
import type { LayerLayout, createLayerLayout } from "./layerlayout/layerlayout";
import type { LayoutAlgorithm, createLayoutPicker } from "./layoutpicker/layoutpicker";
import type { LineEndingPicker, createLineEndingPicker } from "./lineendingpicker/lineendingpicker";
import type { LineShapePicker, createLineShapePicker } from "./lineshapepicker/lineshapepicker";
import type { LineTypePicker, createLineTypePicker } from "./linetypepicker/linetypepicker";
import type { LineWidthPicker, createLineWidthPicker } from "./linewidthpicker/linewidthpicker";
import type { LogConsole, createLogConsole } from "./logconsole/logconsole";
import type { Magnifier, createMagnifier } from "./magnifier/magnifier";
import type { MarginsPicker, createMarginsPicker } from "./marginspicker/marginspicker";
import type
{
    MarkdownEditor,
    MarkdownEditorModalOptions,
    MarkdownEditorOptions,
} from "./markdowneditor/markdowneditor";
import type
{
    HljsStatic,
    KatexStatic,
    MarkedStatic,
    MermaidStatic,
    VizStatic,
    createMarkdownRenderer,
} from "./markdownrenderer/markdownrenderer";
import type { MarketingHero, createMarketingHero } from "./marketinghero/marketinghero";
import type { MaskedEntry, createMaskedEntry } from "./maskedentry/maskedentry";
import type { MetricCard, createMetricCard } from "./metriccard/metriccard";
import type { MultiselectCombo, createMultiselectCombo } from "./multiselectcombo/multiselectcombo";
import type { NavRail, NavRailManager, createNavRail } from "./navrail/navrail";
import type { createNotificationCenter } from "./notificationcenter/notificationcenter";
import type { createOrientationPicker } from "./orientationpicker/orientationpicker";
import type { PeoplePicker, createPeoplePicker } from "./peoplepicker/peoplepicker";
import type { PeriodPicker, createPeriodPicker } from "./periodpicker/periodpicker";
import type { PermissionMatrix, createPermissionMatrix } from "./permissionmatrix/permissionmatrix";
import type { PersonChip, createPersonChip } from "./personchip/personchip";
import type { Pill, createPill } from "./pill/pill";
import type { PresenceIndicator, createPresenceIndicator } from "./presenceindicator/presenceindicator";
import type { ProgressModal, showProgressModal, showSteppedProgressModal } from "./progressmodal/progressmodal";
import type { PromptTemplateManager, createPromptTemplateManager } from "./prompttemplatemanager/prompttemplatemanager";
import type { createPropertyInspector } from "./propertyinspector/propertyinspector";
import type { ReasoningAccordion, createReasoningAccordion } from "./reasoningaccordion/reasoningaccordion";
import type
{
    RelationshipManager,
    RelationshipManagerOptions,
    createRelationshipManager,
} from "./relationshipmanager/relationshipmanager";
import type { RibbonImpl, createRibbon } from "./ribbon/ribbon";
import type { RibbonBuilderHandle, RibbonBuilderOptions, createRibbonBuilder } from "./ribbonbuilder/ribbonbuilder";
import type { RichTextInput, createRichTextInput } from "./richtextinput/richtextinput";
import type { Ruler, createRuler } from "./ruler/ruler";
import type { SearchBox, createSearchBox } from "./searchbox/searchbox";
import type { ShareDialog, createShareDialog, showShareDialog } from "./sharedialog/sharedialog";
import type
{
    Sidebar,
    SidebarManager,
    createDockedSidebar,
    createFloatingSidebar,
    createSidebar,
} from "./sidebar/sidebar";
import type { SiteFooter, createSiteFooter } from "./sitefooter/sitefooter";
import type { SizesPicker, createSizesPicker } from "./sizespicker/sizespicker";
import type { SkeletonLoader, createSkeletonLoader } from "./skeletonloader/skeletonloader";
import type { createSlider } from "./slider/slider";
import type { SmartTextInputEngine, createSmartTextInput } from "./smarttextinput/smarttextinput";
import type { createSpacingPicker } from "./spacingpicker/spacingpicker";
import type { createSpineMap } from "./spinemap/spinemap";
import type { SplitLayout, createSplitLayout } from "./splitlayout/splitlayout";
import type { SprintPicker, createSprintPicker } from "./sprintpicker/sprintpicker";
import type { createStackLayout } from "./stacklayout/stacklayout";
import type { StatusBadge, createStatusBadge } from "./statusbadge/statusbadge";
import type { StatusBar, createStatusBar } from "./statusbar/statusbar";
import type { createStepper } from "./stepper/stepper";
import type { createStickyNote } from "./stickynote/stickynote";
import type { SymbolPicker, createSymbolPicker } from "./symbolpicker/symbolpicker";
import type
{
    TabbedPanel,
    TabbedPanelManager,
    createDockedTabbedPanel,
    createFloatingTabbedPanel,
    createTabbedPanel,
} from "./tabbedpanel/tabbedpanel";
import type { Tagger, createTagger } from "./tagger/tagger";
import type { TenantSwitcher, createTenantSwitcher, createWorkspaceSwitcher } from "./tenantswitcher/tenantswitcher";
import type { createThemeToggle } from "./themetoggle/themetoggle";
import type { Timeline, createTimeline } from "./timeline/timeline";
import type { TimePicker, createTimePicker } from "./timepicker/timepicker";
import type { TimezonePicker, createTimezonePicker } from "./timezonepicker/timezonepicker";
import type
{
    clearAllToasts,
    configureToasts,
    showErrorToast,
    showInfoToast,
    showSuccessToast,
    showToast,
    showWarningToast,
} from "./toast/toast";
import type { Toolbar, createDockedToolbar, createFloatingToolbar, createToolbar } from "./toolbar/toolbar";
import type { createToolColorPicker } from "./toolcolorpicker/toolcolorpicker";
import type { TreeGrid, createTreeGrid } from "./treegrid/treegrid";
import type { TreeView, createTreeView } from "./treeview/treeview";
import type { createTypeBadge } from "./typebadge/typebadge";
import type { UserMenu, createUserMenu } from "./usermenu/usermenu";
import type { createVisualTableEditor } from "./visualtableeditor/visualtableeditor";
import type { createWorkspaceShell } from "./workspaceshell/workspaceshell";

declare global
{
    interface Window
    {
        /**
         * Factory published by the LogUtility component. Absent when the
         * host page does not load `logutility.js`, which is why every
         * component checks for it before use. See FRONTEND_LOGGING.md.
         */
        createLogUtility?: (options?: LogUtilityOptions) => LogUtility;

        /** Resets the LogUtility singleton. Published for tests. */
        resetLogUtility?: () => void;

        /**
         * The LogUtility implementation class. Published for tests. Typed by
         * its construct signature rather than by `typeof LogUtilityImpl`,
         * because that class is module-private and exporting it to describe
         * a global would widen the component's published surface.
         */
        LogUtility?: new (options?: LogUtilityOptions) => LogUtility;

        /**
         * Per-level logging overrides, read by the LogUtility and set by hand
         * in a browser console or by a test. When one is true that level is
         * emitted even if the configured level would suppress it. Declared so
         * the lookup is typed: the names come from a `GLOBAL_FLAGS` object
         * marked `as const`, which keeps them a union of literals rather than
         * widening to `string`.
         */
        __ebt_debug_logging?: boolean;
        __ebt_trace_logging?: boolean;
        __ebt_info_logging?: boolean;

        /**
         * Published by a vendor script, not by this library. The page loads
         * `dompurify` itself, so the global is absent on a page that does
         * not. Typed structurally rather than imported from the package,
         * because the global is the script's own object and this library
         * never imports the module.
         */
        DOMPurify?: { sanitize(html: string, config?: Record<string, unknown>): string };

        /**
         * PUBLISHED BY A VENDOR SCRIPT, NOT BY THIS LIBRARY. Each of these is
         * typed structurally and deliberately narrowly: only the members this
         * library actually reaches are declared.
         *
         * Typing them structurally rather than importing the package keeps
         * these declarations independent of a package version this library
         * never imports at run time, and it is the rule `DOMPurify` above
         * already follows. Some of these are vendored into `dist/lib` with an
         * SRI hash and some are supplied by the host page. That distinction
         * decides who ships the file, not what the global looks like here.
         */
        Chart?: new (ctx: unknown, config: unknown) => { destroy(): void; update(): void };

        /**
         * Vendored into `dist/lib`. The Markdown editor that RichTextInput and
         * MarkdownEditor wrap. Only the members those two call are declared,
         * which is the rule the other third-party globals here follow.
         */
        Vditor?: (new (element: HTMLElement | string, options: Record<string, unknown>) => VditorInstance) &
        {
            /** Static renderer, used for the read-only preview pane. */
            preview(el: HTMLElement, markdown: string, options: Record<string, unknown>): void;
        };

        /** Supplied by the host page. Bootstrap's own JavaScript bundle. */
        bootstrap?: Record<string, unknown>;

        /** Supplied by the host page. Graph layout, read by the DiagramEngine. */
        dagre?: Record<string, unknown>;

        /** Supplied by the host page. Product tours, read by the GuidedTour. */
        driver?: Record<string, unknown>;

        /**
         * SUPPLIED BY THE HOST PAGE, NOT VENDORED. The five optional rendering
         * libraries the MarkdownRenderer probes for. Their shapes are the
         * interfaces that component already maintains, so the declaration
         * describes them once rather than twice. `markdownrenderer/README.md`
         * names the CDN build each one expects.
         */
        marked?: MarkedStatic;
        hljs?: HljsStatic;
        katex?: KatexStatic;
        mermaid?: MermaidStatic;
        Viz?: VizStatic;

        /**
         * Published by `runtime/runtime.ts`, which is built by a separate
         * program whose `rootDir` is `runtime/`. That program cannot see this
         * file, so the runtime declares the global for itself and this
         * declaration exists for the components that READ it.
         */
        EnterpriseRuntime?: Record<string, unknown>;

        /** Published by the ActionItems component. */
        ActionItems?: typeof ActionItems;
        createActionItems?: typeof createActionItems;

        /** Published by the Activityfeed component. */
        ActivityFeed?: typeof ActivityFeed;
        createActivityFeed?: typeof createActivityFeed;

        /** Published by the AnchorLayout component. */
        AnchorLayout?: typeof AnchorLayout;
        createAnchorLayout?: typeof createAnchorLayout;

        /** Published by the Anglepicker component. */
        AnglePicker?: typeof AnglePicker;
        createAnglePicker?: typeof createAnglePicker;

        /** Published by the Annotation component. */
        createAnnotation?: typeof createAnnotation;

        /** Published by the Applauncher component. */
        AppLauncher?: typeof AppLauncher;
        createAppLauncher?: typeof createAppLauncher;

        /** Published by the Auditlogviewer component. */
        AuditLogViewer?: typeof AuditLogViewer;
        createAuditLogViewer?: typeof createAuditLogViewer;

        /** Published by the Authcard component. */
        createAuthCard?: typeof createAuthCard;

        /** Published by the BannerBar component. */
        BannerBar?: typeof BannerBar;
        createBannerBar?: typeof createBannerBar;
        showBanner?: typeof showBanner;

        /** Published by the BorderLayout component. */
        BorderLayout?: typeof BorderLayout;
        createBorderLayout?: typeof createBorderLayout;

        /** Published by the BoxLayout component. */
        BoxLayout?: typeof BoxLayout;
        createBoxLayout?: typeof createBoxLayout;

        /** Published by the Breadcrumb component. */
        createBreadcrumb?: typeof createBreadcrumb;

        /** Published by the CardLayout component. */
        CardLayout?: typeof CardLayout;
        createCardLayout?: typeof createCardLayout;

        /** Published by the ChartPanel component. */
        ChartPanel?: typeof ChartPanel;
        createChartPanel?: typeof createChartPanel;

        /** Published by the ChatDock component. */
        createChatDock?: typeof createChatDock;

        /** Published by the CodeEditor component. */
        CodeEditor?: typeof CodeEditor;
        createCodeEditor?: typeof createCodeEditor;

        /** Published by the ColorPicker component. */
        ColorPicker?: typeof ColorPicker;
        createColorPicker?: typeof createColorPicker;

        /** Published by the Columnspicker component. */
        createColumnsPicker?: typeof createColumnsPicker;

        /** Published by the Commandpalette component. */
        CommandPalette?: typeof CommandPalette;
        openCommandPalette?: typeof openCommandPalette;
        registerCommand?: typeof registerCommand;
        registerCommands?: typeof registerCommands;

        /** Published by the Commentoverlay component. */
        CommentOverlay?: typeof CommentOverlay;
        createCommentOverlay?: typeof createCommentOverlay;

        /** Published by the Confirmdialog component. */
        ConfirmDialog?: typeof ConfirmDialog;
        showConfirmDialog?: typeof showConfirmDialog;
        showDangerConfirmDialog?: typeof showDangerConfirmDialog;

        /** Published by the Contextmenu component. */
        attachLongPress?: typeof attachLongPress;
        createContextMenu?: typeof createContextMenu;

        /** Published by the Conversation component. */
        Conversation?: typeof Conversation;
        createConversation?: typeof createConversation;

        /** Published by the CronPicker component. */
        CronPicker?: typeof CronPicker;
        createCronPicker?: typeof createCronPicker;

        /** Published by the Datagrid component. */
        DataGrid?: typeof DataGrid;
        createDataGrid?: typeof createDataGrid;

        /** Published by the DatePicker component. */
        DatePicker?: typeof DatePicker;
        createDatePicker?: typeof createDatePicker;

        /** Published by the DiagramEngine component. */
        /**
         * The engine class. `DiagramEngineImpl` is module-private, so the construct
         * signature is derived from the exported factory rather than from the class.
         */
        DiagramEngine?: new (
            container: HTMLElement, opts: NonNullable<Parameters<typeof createDiagramEngine>[1]>
        ) => ReturnType<typeof createDiagramEngine>;
        createDiagramEngine?: typeof createDiagramEngine;

        /** Published by the DocViewer component. */
        createDocViewer?: typeof createDocViewer;

        /** Published by the DockLayout component. */
        DockLayout?: typeof DockLayout;
        createDockLayout?: typeof createDockLayout;

        /** Published by the DurationPicker component. */
        DurationPicker?: typeof DurationPicker;
        createDurationPicker?: typeof createDurationPicker;

        /** Published by the DynamicCanvas component. */
        /**
         * A tuning constant published for tests. `ZOOM_STEP` is module-private.
         */
        DYNAMIC_CANVAS_ZOOM_STEP?: number;
        createDynamicCanvas?: typeof createDynamicCanvas;

        /** Published by the DynamicFormSwitcher component. */
        /**
         * Module-private class, published for tests. Typed by its construct signature.
         */
        DynamicFormSwitcher?: new (
            target: string | HTMLElement, options: DynamicFormSwitcherOptions
        ) => DynamicFormSwitcherHandle;
        createDynamicFormSwitcher?: typeof createDynamicFormSwitcher;
        registerDynamicFormFieldProvider?: typeof registerDynamicFormFieldProvider;
        unregisterDynamicFormFieldProvider?: typeof unregisterDynamicFormFieldProvider;

        /** Published by the Editablecombobox component. */
        EditableComboBox?: typeof EditableComboBox;
        createEditableComboBox?: typeof createEditableComboBox;

        /** Published by the EmptyState component. */
        EmptyState?: typeof EmptyState;
        createEmptyState?: typeof createEmptyState;

        /** Published by the Errordialog component. */
        ErrorDialog?: typeof ErrorDialog;
        showErrorDialog?: typeof showErrorDialog;

        /** Published by the ExplorerPicker component. */
        ExplorerPickerImpl?: typeof ExplorerPickerImpl;
        createExplorerPicker?: typeof createExplorerPicker;

        /** Published by the FacetSearch component. */
        FacetSearch?: typeof FacetSearch;
        createFacetSearch?: typeof createFacetSearch;
        parseFacetQuery?: typeof parseFacetQuery;

        /** Published by the FileExplorer component. */
        FileExplorer?: typeof FileExplorer;
        createFileExplorer?: typeof createFileExplorer;

        /** Published by the Fileupload component. */
        FileUpload?: typeof FileUpload;
        createFileUpload?: typeof createFileUpload;

        /** Published by the FlexGridLayout component. */
        FlexGridLayout?: typeof FlexGridLayout;
        createFlexGridLayout?: typeof createFlexGridLayout;

        /** Published by the FlowLayout component. */
        FlowLayout?: typeof FlowLayout;
        createFlowLayout?: typeof createFlowLayout;

        /** Published by the FontDropdown component. */
        FontDropdown?: typeof FontDropdown;
        createFontDropdown?: typeof createFontDropdown;

        /** Published by the FormDialog component. */
        /**
         * Module-private class, published for tests. Typed by its construct signature.
         */
        FormDialog?: new (options: FormDialogOptions) => FormDialog;
        createFormDialog?: typeof createFormDialog;

        /** Published by the Gauge component. */
        Gauge?: typeof Gauge;
        createBarGauge?: typeof createBarGauge;
        createGauge?: typeof createGauge;
        createRingGauge?: typeof createRingGauge;
        createTileGauge?: typeof createTileGauge;

        /** Published by the GradientPicker component. */
        GradientPicker?: typeof GradientPicker;
        createGradientPicker?: typeof createGradientPicker;

        /** Published by the GraphCanvas component. */
        /**
         * Module-private class, published for tests. Typed by its construct signature.
         */
        GraphCanvasImpl?: new (opts: GraphCanvasOptions) => GraphCanvas;
        createGraphCanvas?: typeof createGraphCanvas;

        /** Published by the GraphLegend component. */
        createGraphLegend?: typeof createGraphLegend;

        /** Published by the GraphToolbar component. */
        createGraphToolbar?: typeof createGraphToolbar;

        /** Published by the Graphminimap component. */
        createGraphMinimap?: typeof createGraphMinimap;

        /** Published by the GridLayout component. */
        GridLayout?: typeof GridLayout;
        createGridLayout?: typeof createGridLayout;

        /** Published by the GuidedTour component. */
        createGuidedTour?: typeof createGuidedTour;

        /** Published by the HelpDrawer component. */
        createHelpDrawer?: typeof createHelpDrawer;
        getHelpDrawer?: typeof getHelpDrawer;

        /** Published by the HelpTooltip component. */
        createHelpTooltip?: typeof createHelpTooltip;

        /** Published by the HoverCard component. */
        attachHoverCard?: typeof attachHoverCard;
        createHoverCard?: typeof createHoverCard;

        /** Published by the InlineToolbar component. */
        createInlineToolbar?: typeof createInlineToolbar;

        /** Published by the Latexeditor component. */
        createLatexEditor?: typeof createLatexEditor;

        /** Published by the LayerLayout component. */
        LayerLayout?: typeof LayerLayout;
        createLayerLayout?: typeof createLayerLayout;

        /** Published by the LayoutPicker component. */
        /**
         * A namespace object built in the module, not a class and not a function.
         */
        LayoutPicker?: { LAYOUT_ALGORITHMS: LayoutAlgorithm[]; createLayoutPicker: typeof createLayoutPicker };
        createLayoutPicker?: typeof createLayoutPicker;

        /** Published by the Lineendingpicker component. */
        LineEndingPicker?: typeof LineEndingPicker;
        createLineEndingPicker?: typeof createLineEndingPicker;

        /** Published by the Lineshapepicker component. */
        LineShapePicker?: typeof LineShapePicker;
        createLineShapePicker?: typeof createLineShapePicker;

        /** Published by the Linetypepicker component. */
        LineTypePicker?: typeof LineTypePicker;
        createLineTypePicker?: typeof createLineTypePicker;

        /** Published by the Linewidthpicker component. */
        LineWidthPicker?: typeof LineWidthPicker;
        createLineWidthPicker?: typeof createLineWidthPicker;

        /** Published by the LogConsole component. */
        LogConsole?: typeof LogConsole;
        createLogConsole?: typeof createLogConsole;

        /** Published by the Magnifier component. */
        Magnifier?: typeof Magnifier;
        createMagnifier?: typeof createMagnifier;

        /** Published by the Marginspicker component. */
        MarginsPicker?: typeof MarginsPicker;
        createMarginsPicker?: typeof createMarginsPicker;

        /** Published by the MarkdownEditor component. */
        MarkdownEditor?: typeof MarkdownEditor;
        /**
         * The module names this function `createMarkdownEditorFn` and does not export it.
         */
        createMarkdownEditor?: (containerId: string, options?: MarkdownEditorOptions) => MarkdownEditor | null;
        /**
         * The module names this function `showMarkdownEditorModalFn` and does not export it.
         */
        showMarkdownEditorModal?: (options?: MarkdownEditorModalOptions) => MarkdownEditor | null;

        /** Published by the MarkdownRenderer component. */
        createMarkdownRenderer?: typeof createMarkdownRenderer;

        /** Published by the MarketingHero component. */
        MarketingHero?: typeof MarketingHero;
        createMarketingHero?: typeof createMarketingHero;

        /** Published by the Maskedentry component. */
        MaskedEntry?: typeof MaskedEntry;
        createMaskedEntry?: typeof createMaskedEntry;

        /** Published by the MetricCard component. */
        MetricCard?: typeof MetricCard;
        createMetricCard?: typeof createMetricCard;

        /** Published by the Multiselectcombo component. */
        MultiselectCombo?: typeof MultiselectCombo;
        createMultiselectCombo?: typeof createMultiselectCombo;

        /** Published by the NavRail component. */
        NavRail?: typeof NavRail;
        NavRailManager?: typeof NavRailManager;
        /**
         * The NavRailManager singleton, written here by its own `getInstance()` for
         * debugging and for tests. Internal: it is not part of the published API.
         * It is declared because it is already public at run time, and a declaration
         * describes what is there rather than widening it.
         */
        __navRailManager?: NavRailManager;
        createNavRail?: typeof createNavRail;

        /** Published by the NotificationCenter component. */
        createNotificationCenter?: typeof createNotificationCenter;

        /** Published by the Orientationpicker component. */
        createOrientationPicker?: typeof createOrientationPicker;

        /** Published by the PeoplePicker component. */
        PeoplePicker?: typeof PeoplePicker;
        createPeoplePicker?: typeof createPeoplePicker;

        /** Published by the Periodpicker component. */
        PeriodPicker?: typeof PeriodPicker;
        createPeriodPicker?: typeof createPeriodPicker;

        /** Published by the Permissionmatrix component. */
        PermissionMatrix?: typeof PermissionMatrix;
        createPermissionMatrix?: typeof createPermissionMatrix;

        /** Published by the PersonChip component. */
        PersonChip?: typeof PersonChip;
        createPersonChip?: typeof createPersonChip;

        /** Published by the Pill component. */
        Pill?: typeof Pill;
        createPill?: typeof createPill;

        /** Published by the PresenceIndicator component. */
        PresenceIndicator?: typeof PresenceIndicator;
        createPresenceIndicator?: typeof createPresenceIndicator;

        /** Published by the ProgressModal component. */
        ProgressModal?: typeof ProgressModal;
        showProgressModal?: typeof showProgressModal;
        showSteppedProgressModal?: typeof showSteppedProgressModal;

        /** Published by the Prompttemplatemanager component. */
        PromptTemplateManager?: typeof PromptTemplateManager;
        createPromptTemplateManager?: typeof createPromptTemplateManager;

        /** Published by the PropertyInspector component. */
        createPropertyInspector?: typeof createPropertyInspector;

        /** Published by the ReasoningAccordion component. */
        ReasoningAccordion?: typeof ReasoningAccordion;
        createReasoningAccordion?: typeof createReasoningAccordion;

        /** Published by the RelationshipManager component. */
        /**
         * Module-private class, published for tests. Typed by its construct signature.
         */
        RelationshipManagerImpl?: new (opts: RelationshipManagerOptions) => RelationshipManager;
        createRelationshipManager?: typeof createRelationshipManager;

        /** Published by the Ribbon component. */
        Ribbon?: typeof RibbonImpl;
        createRibbon?: typeof createRibbon;

        /** Published by the RibbonBuilder component. */
        /**
         * Module-private class, published for tests. Typed by its construct signature.
         */
        RibbonBuilderImpl?: new (options: RibbonBuilderOptions) => RibbonBuilderHandle;
        createRibbonBuilder?: typeof createRibbonBuilder;

        /** Published by the RichTextInput component. */
        RichTextInput?: typeof RichTextInput;
        createRichTextInput?: typeof createRichTextInput;

        /** Published by the Ruler component. */
        Ruler?: typeof Ruler;
        createRuler?: typeof createRuler;

        /** Published by the Searchbox component. */
        SearchBox?: typeof SearchBox;
        createSearchBox?: typeof createSearchBox;

        /** Published by the ShareDialog component. */
        ShareDialog?: typeof ShareDialog;
        createShareDialog?: typeof createShareDialog;
        showShareDialog?: typeof showShareDialog;

        /** Published by the Sidebar component. */
        Sidebar?: typeof Sidebar;
        SidebarManager?: typeof SidebarManager;
        createDockedSidebar?: typeof createDockedSidebar;
        createFloatingSidebar?: typeof createFloatingSidebar;
        createSidebar?: typeof createSidebar;

        /**
         * The SidebarManager singleton, written here by its own
         * `getInstance()` for debugging and for tests. Internal: it is not
         * part of the published API and no component reads it. It is
         * declared because it is already public at run time, and a
         * declaration describes what is there rather than widening it.
         */
        __sidebarManager?: SidebarManager;

        /** Published by the SiteFooter component. */
        SiteFooter?: typeof SiteFooter;
        createSiteFooter?: typeof createSiteFooter;

        /** Published by the Sizespicker component. */
        SizesPicker?: typeof SizesPicker;
        createSizesPicker?: typeof createSizesPicker;

        /** Published by the SkeletonLoader component. */
        SkeletonLoader?: typeof SkeletonLoader;
        createSkeletonLoader?: typeof createSkeletonLoader;

        /** Published by the Slider component. */
        createSlider?: typeof createSlider;

        /** Published by the Smarttextinput component. */
        SmartTextInputEngine?: typeof SmartTextInputEngine;
        createSmartTextInput?: typeof createSmartTextInput;

        /** Published by the Spacingpicker component. */
        createSpacingPicker?: typeof createSpacingPicker;

        /** Published by the SpineMap component. */
        createSpineMap?: typeof createSpineMap;

        /** Published by the Splitlayout component. */
        SplitLayout?: typeof SplitLayout;
        createSplitLayout?: typeof createSplitLayout;

        /** Published by the Sprintpicker component. */
        SprintPicker?: typeof SprintPicker;
        createSprintPicker?: typeof createSprintPicker;

        /** Published by the Stacklayout component. */
        createStackLayout?: typeof createStackLayout;

        /** Published by the StatusBar component. */
        StatusBar?: typeof StatusBar;
        createStatusBar?: typeof createStatusBar;

        /** Published by the Statusbadge component. */
        StatusBadge?: typeof StatusBadge;
        createStatusBadge?: typeof createStatusBadge;

        /** Published by the Stepper component. */
        createStepper?: typeof createStepper;

        /** Published by the StickyNote component. */
        createStickyNote?: typeof createStickyNote;

        /** Published by the Symbolpicker component. */
        SymbolPicker?: typeof SymbolPicker;
        createSymbolPicker?: typeof createSymbolPicker;

        /** Published by the TabbedPanel component. */
        TabbedPanel?: typeof TabbedPanel;
        TabbedPanelManager?: typeof TabbedPanelManager;
        createDockedTabbedPanel?: typeof createDockedTabbedPanel;
        createFloatingTabbedPanel?: typeof createFloatingTabbedPanel;
        createTabbedPanel?: typeof createTabbedPanel;

        /**
         * The TabbedPanelManager singleton, written here by its own
         * `getInstance()` for debugging and for tests. Internal: it is not
         * part of the published API and no component reads it. It is
         * declared because it is already public at run time, and a
         * declaration describes what is there rather than widening it.
         */
        __tabbedPanelManager?: TabbedPanelManager;

        /** Published by the Tagger component. */
        Tagger?: typeof Tagger;
        createTagger?: typeof createTagger;

        /** Published by the TenantSwitcher component. */
        TenantSwitcher?: typeof TenantSwitcher;
        WorkspaceSwitcher?: typeof TenantSwitcher;
        createTenantSwitcher?: typeof createTenantSwitcher;
        createWorkspaceSwitcher?: typeof createWorkspaceSwitcher;

        /** Published by the Themetoggle component. */
        createThemeToggle?: typeof createThemeToggle;

        /** Published by the TimePicker component. */
        TimePicker?: typeof TimePicker;
        createTimePicker?: typeof createTimePicker;

        /** Published by the Timeline component. */
        Timeline?: typeof Timeline;
        createTimeline?: typeof createTimeline;

        /** Published by the TimezonePicker component. */
        TimezonePicker?: typeof TimezonePicker;
        createTimezonePicker?: typeof createTimezonePicker;

        /** Published by the Toast component. */
        clearAllToasts?: typeof clearAllToasts;
        configureToasts?: typeof configureToasts;
        showErrorToast?: typeof showErrorToast;
        showInfoToast?: typeof showInfoToast;
        showSuccessToast?: typeof showSuccessToast;
        showToast?: typeof showToast;
        showWarningToast?: typeof showWarningToast;

        /** Published by the Toolbar component. */
        Toolbar?: typeof Toolbar;
        createDockedToolbar?: typeof createDockedToolbar;
        createFloatingToolbar?: typeof createFloatingToolbar;
        createToolbar?: typeof createToolbar;

        /** Published by the Toolcolorpicker component. */
        createToolColorPicker?: typeof createToolColorPicker;

        /** Published by the TreeView component. */
        TreeView?: typeof TreeView;
        createTreeView?: typeof createTreeView;

        /** Published by the Treegrid component. */
        TreeGrid?: typeof TreeGrid;
        createTreeGrid?: typeof createTreeGrid;

        /** Published by the Typebadge component. */
        createTypeBadge?: typeof createTypeBadge;

        /** Published by the Usermenu component. */
        UserMenu?: typeof UserMenu;
        createUserMenu?: typeof createUserMenu;

        /** Published by the VisualTableEditor component. */
        createVisualTableEditor?: typeof createVisualTableEditor;

        /** Published by the WorkspaceShell component. */
        createWorkspaceShell?: typeof createWorkspaceShell;
    }

    /**
     * BOOTSTRAP'S OWN JAVASCRIPT BUNDLE, supplied by the host page.
     *
     * Declared as a `var` rather than as a member of `Window`, because three
     * components reach it as a BARE identifier — `new bootstrap.Modal(el)` —
     * and only a global `var` types that. A `var` also types
     * `window.bootstrap`, so this one declaration covers both spellings and
     * leaves no second place for them to disagree.
     *
     * ANY-2 found four declarations of this one global: `declare var
     * bootstrap: any` in toolbar.ts, a `window["bootstrap"] as { Modal: … }`
     * cast in markdowneditor.ts, a `@ts-expect-error` in errordialog.ts
     * suppressing the missing declaration outright, and a
     * `bootstrap?: Record<string, unknown>` added here by WIN-2. That
     * suppression was the only one in the tracked sources.
     *
     * `undefined` is part of the type because every caller guards with
     * `typeof bootstrap === "undefined"` first. Only the members this
     * library calls are declared, which is the rule `DOMPurify` and the
     * renderer libraries above already follow.
     */
    var bootstrap: BootstrapStatic | undefined;

    /**
     * A Bootstrap component instance, as this library uses one.
     *
     * Declared inside `declare global` rather than at this file's top
     * level, because the file is a module and a top-level interface in a
     * module is module-scoped. Components name this type directly, as
     * Toolbar does for its tooltip handles.
     */
    interface BootstrapInstance
    {
        show(): void;
        hide(): void;
        dispose(): void;
    }

    /**
     * `Intl.supportedValuesOf` is ES2022 and this project compiles against
     * the ES2020 lib, so TypeScript does not know the method exists. Three
     * components list the IANA time zones with it and each reached for a
     * cast. The method is present in every browser this theme targets, so
     * the honest description is a declaration rather than an assertion.
     *
     * Only the one key this library passes is declared. Widening it to the
     * full ES2022 union would describe a surface nothing here uses.
     */
    namespace Intl
    {
        function supportedValuesOf(key: "timeZone"): string[];
    }

    /**
     * A COMPONENT A LAYOUT CAN MOUNT INTO ONE OF ITS CELLS.
     *
     * Eight layout components — AnchorLayout, BorderLayout, BoxLayout,
     * CardLayout, FlexGridLayout, FlowLayout, GridLayout and LayerLayout —
     * each mount, show, hide and destroy whatever child they are handed,
     * and each described that child as `any`. The surface is identical in
     * all eight, measured: seven members and nothing else.
     *
     * It lives here rather than in one of them because components in this
     * library do not import one another, so eight private copies of one
     * interface was the alternative. A consumer may also mount a component
     * this repository has never heard of, which is why the contract is
     * STRUCTURAL and why every member is optional: each caller already
     * tests with `typeof child.method === "function"` before using it.
     * ANY-1, ADR-175.
     */
    interface MountableComponent
    {
        getRootElement?(): HTMLElement;
        show?(container?: HTMLElement): void;
        hide?(): void;
        isVisible?(): boolean;
        setContained?(contained: boolean): void;
        destroy?(): void;
        remove?(): void;
    }

    /** The parts of a Vditor instance this library calls. */
    interface VditorInstance
    {
        getValue(): string;
        setValue(value: string, clearStack?: boolean): void;
        updateValue(value: string): void;
        getHTML(): string;
        getCursorPosition(): { left: number; top: number };
        getSelection(): string;
        enable(): void;
        disabled(): void;
        focus(): void;
        destroy(): void;
    }

    /** The parts of Bootstrap's JavaScript bundle this library calls. */
    interface BootstrapStatic
    {
        Modal: new (element: HTMLElement) => BootstrapInstance;
        Tooltip: (new (element: HTMLElement) => BootstrapInstance) &
        {
            getInstance(element: HTMLElement): BootstrapInstance | null;
        };
    }
}
