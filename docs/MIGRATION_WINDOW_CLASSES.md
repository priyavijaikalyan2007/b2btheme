<!-- AGENT: Migration guide for the removal of component classes from the window global. -->

# Migration: component classes are no longer on `window`

**Date of change:** 2026-10-21
**Applies to:** anyone who loads this library from `static.knobby.io`
**Who is affected:** only code that calls `new window.<ClassName>(...)`

---

## What changed

Each component used to put two names on `window`. It published a
**factory**, such as `window.createSizesPicker`, and it also published
the **class**, such as `window.SizesPicker`. The class is no longer
published. The factory is unchanged.

## Are you affected?

Search your code for direct construction:

```bash
grep -rnE "new window\.[A-Z]" .
grep -rnE "new (window as [^)]*)\.[A-Z]" .
```

If that search finds nothing, this change does not affect you. Every
`window.create...` call keeps working exactly as before.

If you load the library through a `<script>` tag and call factories,
you are not affected.

## How to fix it

Replace the constructor with the factory for that component. The
factory takes the same options object.

**Before**

```javascript
const picker = new window.SizesPicker({ sizes: mySizes });
picker.show();
```

**After**

```javascript
const picker = window.createSizesPicker({ sizes: mySizes });
```

Most factories mount the component for you. Check the component README
if you need to control where it mounts. Several factories take a
container as a second argument, for example
`window.createToolbar(options, "my-container-id")`.

## If you relied on reading a private field

Some code reached into an instance and read a field such as
`instance.rootEl` or `instance.destroyed`. Those fields were never part
of the published API. TypeScript marks them `private`, and the compiler
removes that keyword, so they were reachable by accident.

Use the component's public methods instead. If a value you need has no
public method, that is a gap in the API. Raise it and we will add one,
rather than reading the field.

## Two classes carried static methods

A factory returns an instance, so it cannot reach a static method.
Three static members were published as plain functions instead,
because a static method is a function and a function does not need a
class.

| Was | Now |
|---|---|
| `window.CommandPalette.configure(options)` | `window.configureCommandPalette(options)` |
| `window.CommandPalette.getInstance()` | `window.getCommandPalette()` |
| `window.SmartTextInputEngine.renderTokens(...)` | `window.renderSmartTextTokens(...)` |

The arguments and the return values are unchanged.

## The full list

Every class below was removed from `window`. Use the factory in the
third column.

| Removed class | Component | Use instead |
|---|---|---|
| `ActionItems` | `actionitems` | `window.createActionItems(...)` |
| `ActivityFeed` | `activityfeed` | `window.createActivityFeed(...)` |
| `AnchorLayout` | `anchorlayout` | `window.createAnchorLayout(...)` |
| `AnglePicker` | `anglepicker` | `window.createAnglePicker(...)` |
| `AppLauncher` | `applauncher` | `window.createAppLauncher(...)` |
| `AuditLogViewer` | `auditlogviewer` | `window.createAuditLogViewer(...)` |
| `BannerBar` | `bannerbar` | `window.createBannerBar(...)` |
| `BorderLayout` | `borderlayout` | `window.createBorderLayout(...)` |
| `BoxLayout` | `boxlayout` | `window.createBoxLayout(...)` |
| `CardLayout` | `cardlayout` | `window.createCardLayout(...)` |
| `ChartPanel` | `chartpanel` | `window.createChartPanel(...)` |
| `CodeEditor` | `codeeditor` | `window.createCodeEditor(...)` |
| `ColorPicker` | `colorpicker` | `window.createColorPicker(...)` |
| `CommandPalette` | `commandpalette` | `window.openCommandPalette(...)` or `window.registerCommand(...)` or `window.registerCommands(...)` |
| `CommentOverlay` | `commentoverlay` | `window.createCommentOverlay(...)` |
| `ConfirmDialog` | `confirmdialog` | `window.showConfirmDialog(...)` or `window.showDangerConfirmDialog(...)` |
| `Conversation` | `conversation` | `window.createConversation(...)` |
| `CronPicker` | `cronpicker` | `window.createCronPicker(...)` |
| `DataGrid` | `datagrid` | `window.createDataGrid(...)` |
| `DatePicker` | `datepicker` | `window.createDatePicker(...)` |
| `DockLayout` | `docklayout` | `window.createDockLayout(...)` |
| `DurationPicker` | `durationpicker` | `window.createDurationPicker(...)` |
| `EditableComboBox` | `editablecombobox` | `window.createEditableComboBox(...)` |
| `EmptyState` | `emptystate` | `window.createEmptyState(...)` |
| `ErrorDialog` | `errordialog` | `window.showErrorDialog(...)` |
| `ExplorerPickerImpl` | `explorerpicker` | `window.createExplorerPicker(...)` |
| `FacetSearch` | `facetsearch` | `window.createFacetSearch(...)` |
| `FileExplorer` | `fileexplorer` | `window.createFileExplorer(...)` |
| `FileUpload` | `fileupload` | `window.createFileUpload(...)` |
| `FlexGridLayout` | `flexgridlayout` | `window.createFlexGridLayout(...)` |
| `FlowLayout` | `flowlayout` | `window.createFlowLayout(...)` |
| `FontDropdown` | `fontdropdown` | `window.createFontDropdown(...)` |
| `Gauge` | `gauge` | `window.createBarGauge(...)` or `window.createGauge(...)` or `window.createRingGauge(...)` or `window.createTileGauge(...)` |
| `GradientPicker` | `gradientpicker` | `window.createGradientPicker(...)` |
| `GraphCanvasImpl` | `graphcanvas` | `window.createGraphCanvas(...)` |
| `GridLayout` | `gridlayout` | `window.createGridLayout(...)` |
| `LayerLayout` | `layerlayout` | `window.createLayerLayout(...)` |
| `LineEndingPicker` | `lineendingpicker` | `window.createLineEndingPicker(...)` |
| `LineShapePicker` | `lineshapepicker` | `window.createLineShapePicker(...)` |
| `LineTypePicker` | `linetypepicker` | `window.createLineTypePicker(...)` |
| `LineWidthPicker` | `linewidthpicker` | `window.createLineWidthPicker(...)` |
| `LogConsole` | `logconsole` | `window.createLogConsole(...)` |
| `Magnifier` | `magnifier` | `window.createMagnifier(...)` |
| `MarginsPicker` | `marginspicker` | `window.createMarginsPicker(...)` |
| `MarkdownEditor` | `markdowneditor` | `window.createMarkdownEditor(...)` |
| `MarketingHero` | `marketinghero` | `window.createMarketingHero(...)` |
| `MaskedEntry` | `maskedentry` | `window.createMaskedEntry(...)` |
| `MetricCard` | `metriccard` | `window.createMetricCard(...)` |
| `MultiselectCombo` | `multiselectcombo` | `window.createMultiselectCombo(...)` |
| `NavRail` | `navrail` | `window.createNavRail(...)` |
| `NavRailManager` | `navrail` | `window.createNavRail(...)` |
| `PeoplePicker` | `peoplepicker` | `window.createPeoplePicker(...)` |
| `PeriodPicker` | `periodpicker` | `window.createPeriodPicker(...)` |
| `PermissionMatrix` | `permissionmatrix` | `window.createPermissionMatrix(...)` |
| `PersonChip` | `personchip` | `window.createPersonChip(...)` |
| `Pill` | `pill` | `window.createPill(...)` |
| `PresenceIndicator` | `presenceindicator` | `window.createPresenceIndicator(...)` |
| `ProgressModal` | `progressmodal` | `window.showProgressModal(...)` or `window.showSteppedProgressModal(...)` |
| `PromptTemplateManager` | `prompttemplatemanager` | `window.createPromptTemplateManager(...)` |
| `ReasoningAccordion` | `reasoningaccordion` | `window.createReasoningAccordion(...)` |
| `RelationshipManagerImpl` | `relationshipmanager` | `window.createRelationshipManager(...)` |
| `RibbonBuilderImpl` | `ribbonbuilder` | `window.createRibbonBuilder(...)` |
| `RichTextInput` | `richtextinput` | `window.createRichTextInput(...)` |
| `Ruler` | `ruler` | `window.createRuler(...)` |
| `SearchBox` | `searchbox` | `window.createSearchBox(...)` |
| `ShareDialog` | `sharedialog` | `window.createShareDialog(...)` |
| `Sidebar` | `sidebar` | `window.createDockedSidebar(...)` or `window.createFloatingSidebar(...)` or `window.createSidebar(...)` |
| `SidebarManager` | `sidebar` | `window.createDockedSidebar(...)` or `window.createFloatingSidebar(...)` or `window.createSidebar(...)` |
| `SiteFooter` | `sitefooter` | `window.createSiteFooter(...)` |
| `SizesPicker` | `sizespicker` | `window.createSizesPicker(...)` |
| `SkeletonLoader` | `skeletonloader` | `window.createSkeletonLoader(...)` |
| `SmartTextInputEngine` | `smarttextinput` | `window.createSmartTextInput(...)` |
| `SplitLayout` | `splitlayout` | `window.createSplitLayout(...)` |
| `SprintPicker` | `sprintpicker` | `window.createSprintPicker(...)` |
| `StatusBadge` | `statusbadge` | `window.createStatusBadge(...)` |
| `StatusBar` | `statusbar` | `window.createStatusBar(...)` |
| `SymbolPicker` | `symbolpicker` | `window.createSymbolPicker(...)` |
| `TabbedPanel` | `tabbedpanel` | `window.createDockedTabbedPanel(...)` or `window.createFloatingTabbedPanel(...)` or `window.createTabbedPanel(...)` |
| `TabbedPanelManager` | `tabbedpanel` | `window.createDockedTabbedPanel(...)` or `window.createFloatingTabbedPanel(...)` or `window.createTabbedPanel(...)` |
| `Tagger` | `tagger` | `window.createTagger(...)` |
| `TenantSwitcher` | `tenantswitcher` | `window.createTenantSwitcher(...)` or `window.createWorkspaceSwitcher(...)` |
| `TimePicker` | `timepicker` | `window.createTimePicker(...)` |
| `Timeline` | `timeline` | `window.createTimeline(...)` |
| `TimezonePicker` | `timezonepicker` | `window.createTimezonePicker(...)` |
| `Toolbar` | `toolbar` | `window.createDockedToolbar(...)` or `window.createFloatingToolbar(...)` or `window.createToolbar(...)` |
| `TreeGrid` | `treegrid` | `window.createTreeGrid(...)` |
| `TreeView` | `treeview` | `window.createTreeView(...)` |
| `UserMenu` | `usermenu` | `window.createUserMenu(...)` |

## Why the change was made

TypeScript removes the `private` keyword when it compiles. The keyword
tells the compiler what to allow. It does not change the object at run
time.

A class on `window` therefore handed a JavaScript caller every instance
field as an ordinary property. `new window.SizesPicker(options)`
returned an object that carried all 14 of its private fields. A caller
could read them, write them, and depend on them. Any later change to a
field name would then break that caller, even though the field was
never published.

The factory returns the same object and does not publish the class, so
the component keeps one public surface instead of two.

## How to roll back

The library records a rollback point in `rollback.info` at the root of
the repository. That file names the last commit before this change and
gives the exact steps. Tell us if you need the change reverted. Do not
work around it in your own code first.

## Getting help

Open an issue in the theme repository with the output of the two
`grep` commands above. Include the component name and how you
construct it. We will reply with the exact replacement call.
