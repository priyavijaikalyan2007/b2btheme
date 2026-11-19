<!-- AGENT: The #202 review, 2026-11-18. Every component against TOUCH_EXPERIENCE.md sections 6 to 9 and UI_EXPERIENCE.md sections 21, 22 and 24. Counts, findings by family, a proposed order of fixes and proposed ratchets. Findings only. The fixes go in #181. -->

# Touch and UX review of every component

**Date**: 2026-11-18
**Status**: The owner agreed the order of fixes in section 6 and the ratchets in section 7 on 18 November 2026. Tracked in #202. The fixes go in #181.
**Question**: Where does each component break `TOUCH_EXPERIENCE.md` or `UI_EXPERIENCE.md`, and how does a person meet each break?

---

## 1. The short answer

1. **The counts in `TOUCH_EXPERIENCE.md` section 1 are mostly still right.** The library has 129 component directories now, not 127. The HTML drag-and-drop count was wrong on 15 November: six components start an HTML drag, not 17.
2. **Hover styles are the largest gap by size.** 99 of 129 components have 410 `:hover` rules outside `@media (hover: hover)`. On a phone, a tapped item keeps its hover color until the next tap somewhere else.
3. **The worst gaps for a person on a phone are few.** Seven components open a menu only from a secondary click, so a finger cannot reach their commands. Six move items only with HTML drag and drop, with no "Move to" command. Timeline has no button for Today or the zoom levels.
4. **One finding loses a person's work.** FormDialog closes on a tap outside the dialog by default. It asks about unsaved changes only when the host sets `warnOnDirty`.
5. **One finding is a defect, not a gap.** In SearchBox, FacetSearch and RelationshipManager, a slow answer to an older search can replace a newer one. It is filed as #225.
6. **The standard contract of `UI_EXPERIENCE.md` section 22 is mostly not written.** 2 of 129 READMEs describe the pointer behavior. 19 list the states.
7. **The apps meet the shell, the dialogs and the status components most.** The fixes follow that order (section 6). The canvases come late, because the apps draw diagrams with maxGraph.

---

## 2. The counts (step 1)

`node scripts/touch-counts.mjs` measures each count and names the components in it. Its header states the file set and the patterns. `scripts/touch-counts.test.ts` tests its classifier. Three cases in that test are mistakes that the first version made.

The unit is a component directory. A directory is in a count when any of its source files matches.

| Finding | 15 Nov | 18 Nov | Why it changed |
| :--- | ---: | ---: | :--- |
| Component directories | 127 | 129 | QueryLanguage and ExpressionBuilder are new. |
| Listen for `pointerdown` | 33 | 33 | DiagramEngine now gets its pointers through GestureRecognizer. ExpressionBuilder does too. |
| Listen for `pointerdown` and do not handle `pointercancel` | 29 | 29 | A component that uses GestureRecognizer counts as handling it. This count also holds a press with nothing to restore, such as a close on a press outside. |
| Run a drag | | 31 | New in #202. The code follows a pointer's movement and waits for the lift or captures the pointer, or it uses GestureRecognizer. |
| Run a drag and do not handle `pointercancel` | | 25 | New in #202. This is the count that section 9, item 5 is about. |
| Run a drag and declare no `touch-action` | | 22 | New in #202. ContextMenu and GestureRecognizer are in it, and neither needs the property. ContextMenu's long press must leave the scroll to the browser, and GestureRecognizer leaves `touch-action` to its host. So 20 are real surfaces. |
| Listen for `mousedown` and not for `pointerdown` | 25 | 25 | |
| Listen for `contextmenu` | 9 | 8 | |
| Listen for `contextmenu` and recognize no long press | 8 | 7 | DiagramEngine now has the long press (#184). HoverCard is in this count, but it only closes on `contextmenu`. |
| Recognize a long press | 1 | 3 | ContextMenu, DiagramEngine and GestureRecognizer. |
| Use the shared GestureRecognizer | | 3 | DiagramEngine, ExpressionBuilder and GestureRecognizer itself. |
| Recognize a pinch or a two-finger drag | 0 | 2 | DiagramEngine and GestureRecognizer. |
| Start an HTML drag | 17 | 6 | The 15 November search did not separate the interface from the word. Sidebar, TabbedPanel and Toolbar have a `draggable` option that moves a floating panel with Pointer Events. |
| Accept an HTML drop only | | 1 | FileUpload takes files from the desktop. Pointer Events cannot replace that. |
| Contain a `:hover` style | 100 | 100 | |
| Have a `:hover` style outside `@media (hover: hover)` | 100 | 99 | Only DiagramEngine puts its hover styles in the query. The 99 hold 410 such rules. |
| Contain a `(pointer: coarse)` style | 22 | 24 | |
| Accept `keyBindings` | 48 | 49 | |

Other checks across the library, made with `grep` on the same file set:

| Check | Components | Rule |
| :--- | :--- | :--- |
| Accept `interactionMode` | DiagramEngine only | `TOUCH_EXPERIENCE.md` section 3 |
| Set `-webkit-touch-callout` | DiagramEngine only | Section 9, item 15 |
| Set `overscroll-behavior` | LayoutPicker only | Section 9, item 16 |
| Use `dvh` units | None. Eight use `100vh`: DockLayout, DocViewer, FormDialog, HelpDrawer, NotificationCenter, Ribbon, ShareDialog and Toast. | Section 9, item 17 |
| Read `visualViewport` | None | Section 6.3 |
| Listen for `beforeinput` | None | Section 6.3 |
| Set `inputmode` | None | Section 6.6 |
| Accept a help option for a field | DatePicker, DurationPicker, DynamicFormSwitcher, FormDialog, TimePicker and TimezonePicker | `UI_EXPERIENCE.md` section 24, Help |
| Accept `readOnly` | 20 components. 50 accept `disabled`. | `UI_EXPERIENCE.md` section 2.7 |
| README has a pointer or touch section | ExpressionBuilder and NavRail | `UI_EXPERIENCE.md` section 22 |
| README has a states section | 19 | `UI_EXPERIENCE.md` section 22 |

---

## 3. How the review worked

- **The script** gives the findings for section 9, items 1, 5, 7, 8 and 10. The review lists each component under its family instead of reading each one again.
- **Reading the code** covered what a pattern cannot see:
  - Whether each gesture means what the tables in sections 4 to 6 say.
  - The alternatives in section 8.
  - The keyboard path to each context menu.
  - The tap outside each dialog.
  - The async searches.
- **A browser check** tested one doubt. ActionItems sets `draggable="true"` on a handle that it drags with Pointer Events. A Playwright drag with a mouse in Chromium reorders the list, and no stray drag starts. It is not a defect in Chromium. Safari needs the device check in section 11 of `TOUCH_EXPERIENCE.md`.
- **Not checked here:**
  - The target size of each control in a browser.
  - Validation (`UI_EXPERIENCE.md` section 3).
  - Security (`UI_EXPERIENCE.md` section 19).

  A missing `(pointer: coarse)` style does not prove a small target, because a control can be 44 pixels already. Each family's fix pull request measures its targets with a Playwright size check.

Each finding below names the component, the section that it breaks, what is wrong and how a person meets it. A section number alone means `TOUCH_EXPERIENCE.md`. "UI" before a number means `UI_EXPERIENCE.md`.

---

## 4. Findings in every family

These hold for nearly every component. Each family's fix pull request closes them for its own components.

| Finding | Section | What is wrong | How a person meets it |
| :--- | :--- | :--- | :--- |
| Hover styles | 9, item 10 | 410 `:hover` rules in 99 components sit outside `@media (hover: hover)`. | On a phone, a tapped button or row keeps its hover color after the finger lifts. It looks selected when it is not. |
| No `interactionMode` | 3 | Only DiagramEngine accepts it. DataGrid, TreeGrid, TreeView, FileExplorer, ActionItems, VisualTableEditor, Timeline and the other editors cannot open read-only for a review on a phone. | A reviewer on a phone can move a row or a card by accident. |
| No coarse targets | 7 | 105 components have no `(pointer: coarse)` style. Section 5 lists them by family. | A finger hits the neighbor of a small control. |
| No `-webkit-touch-callout: none` | 9, item 15 | Only DiagramEngine sets it. Rows, cards and handles in the grids, trees and ActionItems do not. | A long press on a row in iOS Safari opens the system callout over the row. |
| No `overscroll-behavior` | 9, item 16 | Only LayoutPicker sets it. The shell, the dialogs and each inner scroll area do not. | A scroll that reaches the end of a list scrolls the page behind it, or pulls the page down to refresh. |
| `100vh` | 9, item 17 | Eight components size to `100vh`. | In Safari on iOS the bottom of a full-height drawer or dialog sits under the browser's toolbar. |
| Contract not written | UI 22 | 127 READMEs do not describe the pointer behavior and its non-drag alternative. 110 do not list the states. | An app developer cannot tell what a component does on touch without reading its code. |
| Help on a field | UI 24, Help | Six components take a help option. The other pickers and data-entry components have no HelpTooltip topic. | A person on a phone has no way to read what a field means. |
| `disabled` and `readOnly` | UI 2.7 | 50 components accept `disabled`, and 20 accept `readOnly`. Among the pickers, ColorPicker, the four line pickers, SymbolPicker, Slider and 11 others have no read-only state. | A host that must show a value it cannot change has to disable it, and a disabled value is gray and hard to read. |

---

## 5. Findings by family

The families follow the order in section 6. Each family lists the components that the counts name, then the findings from reading.

### 5.1 Shell and navigation

DockLayout, Sidebar, TabbedPanel, Breadcrumb, CommandPalette, NavRail, WorkspaceShell, SplitLayout, StackLayout, AppLauncher, UserMenu, TenantSwitcher, Toolbar, Ribbon, RibbonBuilder, InlineToolbar, ContextMenu, StatusBar, BannerBar, NotificationCenter, ThemeToggle and GraphToolbar. Section 6.1 applies.

From the counts:

- **A drag with no `pointercancel`:** RibbonBuilder, Sidebar, SplitLayout, StackLayout, TabbedPanel and Toolbar. If a call arrives during a resize or a panel drag, the pane stays at the size where the drag stopped. Section 9, item 5 says to restore the size from before the drag.
- **`mousedown` only:** AppLauncher, NotificationCenter, TenantSwitcher and UserMenu. Each closes its popup from a `mousedown` on the document (section 9, item 1). Safari on iOS has sent mouse events only to elements that it treats as clickable. A tap on blank page space may not close the popup. The device check must confirm this.
- **HTML drag:** RibbonBuilder.
- **No coarse style:** 16 of 22, among them Breadcrumb, CommandPalette, AppLauncher, UserMenu, Ribbon, InlineToolbar, ContextMenu and StatusBar.

From reading:

| Component | Section | What is wrong | How a person meets it |
| :--- | :--- | :--- | :--- |
| ContextMenu | 6.1 | No bottom sheet on a compact viewport. The menu opens at the pointer. | On a phone, a long menu opens beside the finger and runs off the screen. |
| TabbedPanel | 6.1 | A closable tab has no middle-click close. No long press or secondary click opens a tab menu. No tab moves. | A mouse user cannot close a tab with the middle button, as in a browser. |
| SplitLayout, StackLayout | 9, `touch-action` table | Dividers set `touch-action: none`. The table says `pan-y` between side-by-side panes and `pan-x` between stacked panes. | A vertical swipe that starts on a divider does not scroll the page. |
| StackLayout | 6.1 | No double-tap to restore the default size. No wider touch target on a coarse pointer. SplitLayout has both. | On a tablet, the thin divider is hard to grab. |
| RibbonBuilder | 8 | Items move only by HTML drag. There is no "Move to" command or keyboard move. | On a phone, a person cannot change the ribbon's order. |

### 5.2 Dialogs and forms

FormDialog, ConfirmDialog, ErrorDialog, ProgressModal, DynamicFormSwitcher, PropertyInspector, ShareDialog, FileUpload, Stepper, AuthCard and MaskedEntry. Section 6.6 and UI 12.1 apply.

From the counts:

- **A drag with no `pointercancel` and no `touch-action`:** FormDialog (its divider) and PropertyInspector (its resize handle).
- **No coarse style:** 10 of 11. Only PropertyInspector has one.

From reading:

| Component | Section | What is wrong | How a person meets it |
| :--- | :--- | :--- | :--- |
| FormDialog | 6.1, UI 2.9 | A tap outside closes the dialog by default (`closeOnBackdrop`). It asks about unsaved changes only when the host sets `warnOnDirty`, which is off by default. | On a phone, a person who taps beside the keyboard loses a half-filled form. |
| ShareDialog, ConfirmDialog | 6.1 | A tap outside closes by default. ConfirmDialog holds no input, so it is safe. ShareDialog can hold people that the person added and not yet shared. | A person loses the people that they picked. |
| FormDialog, ShareDialog | 9, item 17 | They size with `100vh`. | In Safari on iOS, the buttons at the bottom of a tall dialog sit under the browser's toolbar. |
| All with text fields | 6.6 | No component sets `inputmode`. | A number or an email field opens the full keyboard on a phone. |

### 5.3 Status, help and feedback

Toast, EmptyState, SkeletonLoader, StatusBadge, Pill, PersonChip, PresenceIndicator, TypeBadge, HoverCard, HelpTooltip, HelpDrawer, GuidedTour, Feedback, ReasoningAccordion, MarketingHero and SiteFooter.

From the counts:

- **A drag with no `pointercancel` and no `touch-action`:** HelpDrawer, which resizes with a drag.
- **No coarse style:** 13 of 16.

From reading:

| Component | Section | What is wrong | How a person meets it |
| :--- | :--- | :--- | :--- |
| HoverCard | 4, 8 | It opens on `mouseenter` and `focusin` only. There is no tap path and no pinned state. | On a phone, a person cannot open the card on purpose. Whether a tap opens it depends on the browser's mouse events after the tap. |
| HelpDrawer | 9, item 17 | It sizes with `100vh`. | The bottom of the drawer sits under the browser's toolbar on iOS. |

HelpTooltip opens on a click as well as on hover, so it meets rule 4.

### 5.4 Pickers

DatePicker, TimePicker, DurationPicker, CronPicker, TimezonePicker, PeriodPicker, SprintPicker, LayoutPicker, ColorPicker, ToolColorPicker, GradientPicker, AnglePicker, FontDropdown, SymbolPicker, OrientationPicker, SizesPicker, MarginsPicker, ColumnsPicker, SpacingPicker, LineEndingPicker, LineShapePicker, LineTypePicker, LineWidthPicker, PeoplePicker, ExplorerPicker, EditableComboBox, MultiselectCombo, Slider and Tagger. Section 6.6 applies.

From the counts:

- **`mousedown` only (section 9, item 1):** 19 pickers. 15 close their popup from a `mousedown` on the document, as the shell components do. The other four are DurationPicker, EditableComboBox, MultiselectCombo and TimezonePicker. They use `mousedown` on a button or an option.
- **A drag with no `pointercancel`:** AnglePicker, ColorPicker, GradientPicker and Slider.
- **No `touch-action` on a drag surface:** ColorPicker and GradientPicker. On a phone, a drag across the color area or the gradient bar scrolls the page instead of changing the color.
- **No coarse style:** 24 of 29.

From reading:

| Component | Section | What is wrong | How a person meets it |
| :--- | :--- | :--- | :--- |
| EditableComboBox, TimezonePicker | 9, item 2. 6.6 | An option is chosen on `mousedown`, not on the up event. | A mouse user who presses on the wrong option cannot slide off it to cancel. |
| GradientPicker | 3, rule 3. 8 | A secondary click on a stop deletes the stop. The rule gives the secondary click to the context menu only. There is no long press, and no visible delete. `Delete` works after a stop is selected. | A mouse user who expects a menu loses a stop. A finger has no way to delete a stop without a keyboard. |
| Slider, AnglePicker | 9, item 5 | No `pointercancel`. | A call during a drag can leave the value where the drag stopped, with no way to restore it. |

### 5.5 Grids, trees and lists

DataGrid, TreeGrid, TreeView, FileExplorer, VisualTableEditor, ActionItems, PermissionMatrix, AuditLogViewer, LogConsole and RelationshipManager. Section 6.4 applies.

From the counts:

- **`contextmenu` only:** FileExplorer, TreeGrid, TreeView and VisualTableEditor.
- **HTML drag:** DataGrid (column headers), FileExplorer, TreeGrid, TreeView, and ActionItems (the `draggable` attribute on a Pointer Events handle).
- **A drag with no `pointercancel` and no `touch-action`:** ActionItems, DataGrid, FileExplorer, TreeGrid and VisualTableEditor.
- **No coarse style:** TreeView, FileExplorer, ActionItems, PermissionMatrix, AuditLogViewer, LogConsole and RelationshipManager.

From reading:

| Component | Section | What is wrong | How a person meets it |
| :--- | :--- | :--- | :--- |
| FileExplorer, TreeGrid, TreeView, VisualTableEditor | 3, rule 3. 8. 9, item 8 | The context menu opens on `contextmenu` only. No long press. No visible "More" button. No key opens it. | On a phone, and from a keyboard, the commands in the menu cannot be reached at all. |
| DataGrid, FileExplorer, TreeGrid, TreeView, RibbonBuilder | 6.4, 8 | Items move only by HTML drag. No component has a "Move to" command, and none moves a row or a column from the keyboard. | On a phone, a person cannot reorder or move items. HTML drag does not lift on a long press. |
| DataGrid, TreeGrid | 6.4 | No checkbox column on a coarse pointer when multiple selection is on. | A finger has no `Shift` or `Ctrl` to select more than one row. |
| All that move saved data | 6.4 | No Undo toast after a drag. Only VisualTableEditor has undo. | A wrong drop on a phone cannot be undone. |
| PermissionMatrix | 6.6 | No `(pointer: coarse)` style on the cells. | A finger changes the wrong permission. |

### 5.6 Search

SearchBox, FacetSearch, ExpressionBuilder and QueryLanguage. Sections 6.3 and 6.6, and UI 8, apply.

| Component | Section | What is wrong | How a person meets it |
| :--- | :--- | :--- | :--- |
| SearchBox, FacetSearch | UI 2.8 | An older answer can replace a newer one. This is a defect, filed as #225. RelationshipManager has the same defect. | On a slow connection, the suggestions match text that is no longer in the field. |
| SearchBox | 9, items 1 and 2 | A suggestion is chosen on `mousedown`. | A mouse user cannot slide off a wrong suggestion to cancel. |

ExpressionBuilder already uses GestureRecognizer, and its README describes the pointer behavior.

### 5.7 Analytics

ChartPanel, Gauge, MetricCard, Timeline and ActivityFeed. Section 6.5 applies.

| Component | Section | What is wrong | How a person meets it |
| :--- | :--- | :--- | :--- |
| Timeline | 6.5, 8 | Today, zoom in, zoom out and reset zoom are keys only (`T`, `+`, `-`, `0`). There is no visible button. | On a phone, a person cannot return to today or change the zoom. |
| Timeline | 4, 9, item 7 | No pinch and no two-finger pan. No `touch-action`. No `pointercancel`. | Two fingers zoom the page instead of the timeline. A one-finger pan fights with the page scroll. |
| ChartPanel | 6.5 | No expand button. No `touch-action: pan-y pinch-zoom`. | An embedded chart cannot be opened to fill the screen. |

### 5.8 Canvases

DiagramEngine, GraphCanvas, SpineMap, DynamicCanvas, GraphMinimap, GraphLegend, Magnifier, Ruler, CommentOverlay, Annotation and StickyNote. Section 6.2 applies.

DiagramEngine meets section 6.2 since #184. It waits for the device check in #183 and #184.

| Component | Section | What is wrong | How a person meets it |
| :--- | :--- | :--- | :--- |
| GraphCanvas | 4, 6.2, 9 | No pinch and no two-finger pan. No `touch-action`. No `pointercancel`. No `setPointerCapture`, and the move and lift listeners are on the canvas only. The context menu opens on `contextmenu` only. | On a tablet, two fingers zoom the page. A node drag that leaves the canvas stops, and a lift outside the canvas does not end it. |
| SpineMap | 4, 9, item 7 | No pinch and no two-finger pan. No `touch-action`. | A one-finger pan scrolls the page instead. |
| DynamicCanvas | 9, items 5 and 7 | A frame drag has no `pointercancel` and no `touch-action`. Its move listeners are removed only on `pointerup`. | After a cancel, the frame can follow the next pointer that moves over its title bar. |
| GraphMinimap | 9, items 5 and 7 | No `pointercancel` and no `touch-action` on the viewport drag. | A drag on the minimap scrolls the page on a phone. |
| Magnifier | 3, rule 4 | It follows a mouse that is up. A finger cannot use it. | On a tablet, the magnifier does nothing. |
| CommentOverlay | 9, item 7 | The pin drag has no `touch-action`. | A pin drag scrolls the page. |

GraphCanvas moves into DiagramEngine under #176. The owner can choose to fix it there instead of here.

### 5.9 Writing

MarkdownEditor, CodeEditor, LaTeXEditor, SmartTextInput, RichTextInput, Conversation, ChatDock, PromptTemplateManager, DocViewer and MarkdownRenderer. Section 6.3 applies.

| Component | Section | What is wrong | How a person meets it |
| :--- | :--- | :--- | :--- |
| MarkdownEditor, RichTextInput, LaTeXEditor | 6.3 | No component reads `visualViewport`. The formatting toolbar does not move above the on-screen keyboard. | On a phone, the toolbar is hidden while the person types. |
| SmartTextInput | 6.3 | The trigger popover has no 44-pixel items on a coarse pointer. | A finger picks the wrong mention. |
| RichTextInput | 9, items 1 and 2 | Toolbar buttons and the task checkbox act on `mousedown`. | A mouse user who presses the wrong button cannot slide off it to cancel. |
| Conversation, MarkdownEditor, PromptTemplateManager | 9, items 5 and 7 | No `pointercancel` and no `touch-action` on their resize drags. | A call during a resize leaves the pane at the wrong size. |

Conversation has a visible send button, as section 6.3 requires.

---

## 6. Order of fixes (step 3)

The owner agreed this order on 18 November 2026.

The basis is how often the apps load each family. The measure is the references to `/components/<name>/<name>.js` or `.css` in `~/Work/knobby/apps`, without `specs/` and Markdown. It was measured on 18 November 2026. One page that loads a component's script and its style counts twice.

| Order | Family | Components | Apps references | Used by the apps | Why here |
| ---: | :--- | ---: | ---: | ---: | :--- |
| 1 | Shell and navigation | 22 | 238 | 15 | On every page. ContextMenu's long press and sheet reach every app. |
| 2 | Dialogs and forms | 11 | 119 | 8 | FormDialog's tap outside loses work. |
| 3 | Status, help and feedback | 16 | 110 | 8 | Mostly hover styles. HoverCard needs a tap path. |
| 4 | Pickers | 29 | 72 | 20 | The `mousedown` dismissals, and choosing on the down event. |
| 5 | Grids, trees and lists | 10 | 42 | 7 | The context menus and moves that a finger cannot reach. The largest change in behavior. |
| 6 | Search | 4 | 32 | 2 | #225 is fixed first, apart from this order. |
| 7 | Analytics | 5 | 16 | 3 | Timeline's buttons and pinch. |
| 8 | Canvases | 11 | 10 | 5 | The apps draw with maxGraph. GraphCanvas may move into DiagramEngine. |
| 9 | Writing | 10 | 10 | 3 | The keyboard toolbar needs a device to test. |

The 11 components with no pointer input are done: the eight layouts, ThemeInit, LogUtility and GestureRecognizer.

Each family's pull request also does the work in section 4 for its components.

### Decisions for the shell and navigation family

The owner made these decisions on 18 November 2026, after #226 merged.

- **Three pull requests.** The family is too large for one review. Each pull request says "Part N of 3 of #181".
  1. Dividers and drags: SplitLayout, StackLayout, Sidebar, TabbedPanel, Toolbar and RibbonBuilder.
  2. Popups and menus: ContextMenu, AppLauncher, UserMenu, TenantSwitcher, NotificationCenter and CommandPalette.
  3. The other ten components. They need only the work in section 4.
- **ContextMenu opens as a sheet on a phone by default.** Below the compact width, the menu shows as a sheet at the bottom of the screen. A host option keeps today's menu at the pointer. Larger screens do not change.
- **TabbedPanel gets a close and a tab menu in part 1.** A middle click closes a closable tab, through `onTabClose` as a close button does today. A long press or a secondary click opens a menu with Close, Close others and Close to the right, for closable tabs only. Moving a tab waits for its own issue, because it needs an order option and a callback.

---

## 7. Ratchets (step 4)

The owner chose the six gated counts below on 18 November 2026. They are the `touch*` entries in the BASELINES of `scripts/audit-counts.mjs`.

`scripts/audit-counts.mjs` gates each count at a baseline, so a fixed family cannot slip back. A gate is only as good as its definition. A loose definition fails the suite on code that complies.

| Count | Today | Gated | Reason |
| :--- | ---: | :--- | :--- |
| `:hover` rules outside `@media (hover: hover)` | 410 | Yes, by rule | The classifier walks the blocks and has a test. A count of rules moves with each fix. A count of components moves only when a component is finished. |
| `mousedown` and no `pointerdown` | 25 | Yes | The pattern is exact. |
| A drag and no `pointercancel` | 25 | Yes | The pattern is exact at the level of a component. Section 1's `pointerdown` count is not gated, because a press outside needs no cancel. |
| `contextmenu` and no long press | 7 | Yes | HoverCard stays in the count. Its `contextmenu` listener only closes the card. The baseline holds it. |
| Start an HTML drag | 6 | Yes | The pattern separates the interface from an option named `draggable`. |
| A drag and no `touch-action` | 22 | Yes | ContextMenu and GestureRecognizer stay in the count, as HoverCard does above. The first draft counted movement alone and held three hovers. The drag rule removed them. |
| `(pointer: coarse)` style | 24 | No | A missing query does not prove a small target. Each family's pull request measures targets in a browser. |

Lowering a baseline in a family's pull request records its progress, as for every other count in the script.

---

## 8. Defects found

| Issue | Defect |
| :--- | :--- |
| #225 | SearchBox, FacetSearch and RelationshipManager draw an older search's answer over a newer one. |

The ActionItems drag handle looked like a defect. Section 3 records why it is not one in Chromium.

---

## 9. What this changes in other documents

The table in section 1 of `TOUCH_EXPERIENCE.md` held the 15 November counts. On 18 November 2026 the owner chose to update it. It now holds the counts from section 2 of this review and tells the reader to run `node scripts/touch-counts.mjs` for the current ones.
