<!--
  ⚓ CONCEPT: PointerGestureRegistry
  📜 PURPOSE: Defines the canonical meaning of each touch, mouse, trackpad, and pen input, so that one gesture performs one action in every component.
  🔗 RELATES: [[KEYBOARD]], [[UX_UI_GUIDELINES]], [[UI_UX_CONSISTENCY]], [[MASTER_COMPONENT_LIST]], [[AccessibilityFocus]]
  ⚡ FLOW: [Pointer Input] -> [Pointer Gesture Recognizer] -> [Pointer Gesture Registry Mapping] -> [Component Action]
-->

# Touch and pointer experience

This document defines the mandatory touch, mouse, trackpad, and pen interactions for all components and applications. It is the pointer counterpart of KEYBOARD.md. A gesture must perform the same action in every component that supports that gesture.

## 1. Summary for decision makers

**The issue.** People use the platform on phones, tablets, and laptops. Layouts already adapt to the screen size. Interactions do not adapt to the input device. Components give different meanings to the same gesture, and some interactions need a mouse.

**Why it matters now.** A phone review that fails forces the reader to wait for a laptop. Each component that defines its own gestures also adds a rule that people must learn again.

**The recommendation.** Adopt the four rules in section 3 as invariants that no component can override. Use the context tables in section 6 for each component. Route all pointer input through one shared gesture recognizer.

**The expected value.** A person learns the gestures one time and uses them in every application. The components team reviews each component against one checklist instead of debating each case.

**The main risks and tradeoffs.** The wheel rule changes the current behavior of three canvas components. A larger touch target reduces the number of rows that a grid shows on a tablet. Section 13 lists the work, and section 14 records the decisions.

**The owner and next action.** The components team owns the implementation. The product owner decides the three open items in section 14.

### Current state

On 15 November 2026, a search of the component library source gave these results. The library has 127 component directories. The search excluded tests, demos, and build output.

| Finding | Number of components |
| :--- | :--- |
| Listen for `pointerdown` | 33 |
| Listen for `pointerdown` and do not handle `pointercancel` | 29 |
| Listen for `mousedown` and not for `pointerdown` | 25 |
| Listen for `contextmenu` | 9 |
| Recognize a long press | 1 |
| Recognize a pinch or a two-finger drag | 0 |
| Use the HTML drag-and-drop interface | 17 |
| Contain a `:hover` style | 100 |
| Put a hover style in `@media (hover: hover)` | 0 |
| Contain a `(pointer: coarse)` style | 22 |
| Accept `keyBindings` | 48 |

Three facts explain most of the problems that people see on a touch screen.

First, no component recognizes a two-finger gesture. `DiagramEngine` adopted Pointer Events on 14 November 2026 (issue 176). That change ignores each pointer after the first. It also sets `touch-action: none` on the canvas. As a result, two fingers on the canvas do nothing, and the page cannot scroll or zoom there.

Second, the wheel has two meanings. `DiagramEngine`, `GraphCanvas`, and `SpineMap` zoom on the wheel. `Timeline` pans on the wheel. A trackpad sends a two-finger scroll as a wheel event. Therefore, two fingers on a trackpad zoom a diagram and pan a timeline.

Third, the context menu needs a mouse in most components. Nine components listen for `contextmenu`, and only `ContextMenu` recognizes a long press. Browsers do not all send `contextmenu` for a long press.

The application repository delegates canvas input to the maxGraph library. In `typescript/` and `frontend/` of that repository, 12 files listen for `mousedown` and 1 file listens for `pointerdown`.

## 2. Terms

Use these terms in specifications, code, and reviews. Do not use a different word for the same input.

| Term | Meaning |
| :--- | :--- |
| Touch pointer | A finger on a touch screen. `pointerType` is `"touch"`. |
| Mouse pointer | A mouse or a trackpad cursor. `pointerType` is `"mouse"`. |
| Pen pointer | A stylus, such as Apple Pencil. `pointerType` is `"pen"`. |
| Tap | One touch pointer goes down and up in the same place in less than 500 milliseconds. |
| Double tap | Two taps in the same place in less than 300 milliseconds. |
| Long press | One touch pointer stays down in the same place for 500 milliseconds. |
| Drag | One pointer goes down and moves more than the movement tolerance. |
| Two-finger drag | Two touch pointers go down and move in the same direction. |
| Pinch | Two touch pointers move toward each other or away from each other. |
| Primary click | A click of the main mouse button. A primary click is the same input as a tap. |
| Secondary click | A click of the second mouse button, or a click of the pen barrel button. |
| Lift | The moment when a long press prepares an item for a drag. The item shows a raised state. |
| Object | A content item that a person can select, such as a shape, a row, a card, or a data point. |
| View | The visible part of the content. A pan or a zoom changes the view and does not change the content. |
| Zoomable surface | A component that has its own pan and zoom, such as a diagram canvas or a timeline. |
| Scrollable view | A component that scrolls but does not zoom, such as a list, a grid, or a form. |
| Compact viewport | A viewport that is less than 768 CSS pixels wide. |
| Coarse pointer | An input with low precision. The CSS media query `(pointer: coarse)` identifies this input. |

## 3. Invariant rules

No component can override these four rules. All other tables in this document follow from them.

1. **Two fingers change the view. Two fingers never change the content.** A two-finger drag pans. A pinch zooms. A two-finger gesture never moves, resizes, draws, selects, or deletes an object.
2. **One finger acts on the thing that it touches.** A finger on an object acts on that object. A finger on the background moves the view.
3. **A long press and a secondary click have the same meaning.** They open the context menu for the thing below the pointer.
4. **Each gesture has an alternative that needs only a tap or a primary click.** A hover, a drag, a pinch, a long press, and a modifier key are accelerators. They are never the only path to an action.

Rule 1 has one reason. A person who navigates a diagram with two fingers must never damage the diagram by accident. Rule 4 implements Web Content Accessibility Guidelines (WCAG) 2.2 success criteria 2.5.1 and 2.5.7.

### Interaction modes

Each component that can change content accepts an `interactionMode` option. The application sets the option. The component never selects a mode from the viewport width or from the device type.

| Mode | Actions that the component permits |
| :--- | :--- |
| `view` | Select, open, pan, zoom, and scroll. No gesture changes the content. |
| `comment` | The `view` actions, and add, edit, and resolve comments on an object. |
| `edit` | All actions. |

The reason is that the correct default depends on the application and the device. A review on a small phone needs `view`. A phone that unfolds to a larger screen can support `comment` or `edit`. Only the application knows the task, the permissions of the person, and the screen.

Additional rules:

- A mode removes actions. A mode never gives a gesture a new meaning.
- In `view` and `comment` modes, a one-finger drag on an object pans the view, because the object cannot move.
- Provide a visible control to change the mode when the person has permission to edit.
- Show the current mode in the toolbar or the status bar.

## 4. Gesture meanings for touch

This table gives the meaning of each touch gesture in each context. Section 6 gives the detail for each context.

| Gesture | Canvas | Text editor | Collection | Analytics | Forms and settings |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Tap | Select the object. A tap on the background clears the selection. | Put the caret at the tap position. | Select the row, or activate the control. | Pin the tooltip for the data point. | Activate the control. |
| Double tap | Edit the text of the object, or open the object. | Select the word. The browser does this action. | Open the item, or edit the cell. | Open the detail for the data point. | Not assigned. |
| Long press | Open the context menu. | Start the text selection of the operating system. | Open the context menu. | Open the context menu. | Not assigned. |
| Long press, then drag | On the background, draw a selection rectangle. | Move the caret. The operating system does this action. | Lift the item, then move the item to a new position. | In layout edit mode, lift the widget and move it. | Lift the item in a list that permits a new order. |
| One-finger drag | On an object, move the object. On the background, pan the view. | Scroll. | Scroll. | Scroll the page vertically. Move the crosshair horizontally. | Scroll. On a slider, change the value. |
| Two-finger drag | Pan the view. | Scroll. | Scroll. | Pan an expanded chart. Scroll the page from an embedded chart. | Scroll. |
| Pinch | Zoom the view around the midpoint of the fingers. | Zoom the page. The browser does this action. | Zoom the page. The browser does this action. | Zoom an expanded chart. Zoom the page from an embedded chart. | Zoom the page. The browser does this action. |

These inputs are not assigned in this version. Components must not handle them.

- A two-finger tap
- A rotation with two fingers
- A gesture with three or more fingers, which the operating system uses
- A swipe that starts less than 20 CSS pixels from a screen edge, which the browser uses for navigation
- A horizontal swipe on a row to show actions
- A downward drag at the top of the page to refresh the page

## 5. Gesture meanings for mouse, trackpad, and pen

A mouse pointer and a pen pointer are precise. They also have buttons and a hover state. For these reasons, some drags have a different meaning from the same drag with a finger.

| Input | Action | Touch input with the same action |
| :--- | :--- | :--- |
| Primary click | Select or activate. | Tap |
| Double click | Open or edit. | Double tap |
| Secondary click | Open the context menu. | Long press |
| `Shift` + primary click | Extend the selection to this object. | Selection mode, then tap |
| `Ctrl` + primary click (`Cmd` on macOS) | Add this object to the selection, or remove it. | Selection mode, then tap |
| Primary drag on an object | Move the object. In a collection, start the drag immediately. | One-finger drag on a canvas. Long press, then drag, in a collection. |
| Primary drag on a canvas background | Draw a selection rectangle. | Long press, then drag |
| Primary drag in text | Select text. | Selection handles of the operating system |
| Primary drag on grid cells | Select a range of cells. | Selection handles on the selected cell |
| Primary drag on a chart | Select a range, then zoom to that range. | Pinch on an expanded chart |
| Middle-button drag, or `Space` + primary drag | Pan a zoomable surface. | Two-finger drag |
| Wheel | Scroll vertically. On a zoomable surface, pan vertically. | One-finger or two-finger drag |
| `Shift` + wheel | Scroll or pan horizontally. | One-finger or two-finger drag |
| `Ctrl` + wheel (`Cmd` on macOS) | Zoom a zoomable surface around the pointer. | Pinch |
| Trackpad scroll with two fingers | Same as the wheel, in both directions. | Two-finger drag |
| Trackpad pinch | Same as `Ctrl` + wheel. | Pinch |
| Hover | Show a preview, a tooltip, or a highlight. | No equivalent. See rule 4. |

A pen pointer follows the mouse column for drags. A pen drag on a canvas background draws a selection rectangle. The pen barrel button is a secondary click. While a pen pointer is down, ignore a new touch pointer unless a second touch pointer makes a two-finger gesture.

One difference between touch and mouse is intended. A one-finger drag on a canvas background pans. A primary drag on a canvas background draws a selection rectangle. A mouse has the wheel and the middle button to pan, and a finger does not.

## 6. Contexts

### 6.1 Application shell and navigation

These rules apply to `DockLayout`, `Sidebar`, `TabbedPanel`, `Breadcrumb`, `CommandPalette`, dialogs, and menus.

| Input | Action | Component |
| :--- | :--- | :--- |
| Tap on the sidebar button | Open or close the sidebar. | [[Sidebar]] |
| Tap outside an open sidebar on a compact viewport | Close the sidebar. | [[Sidebar]] |
| One-finger drag on the tab strip | Scroll the tab strip. | [[TabbedPanel]] |
| Long press on a tab, then drag | Move the tab to a new position. | [[TabbedPanel]] |
| Long press or secondary click on a tab | Open the tab context menu. | [[TabbedPanel]] |
| Middle click on a tab | Close the tab. | [[TabbedPanel]] |
| Drag on a divider | Change the size of the panes. | [[SplitLayout]], [[DockLayout]] |
| Double tap or double click on a divider | Restore the default size of the panes. | [[SplitLayout]], [[DockLayout]] |
| Tap on the search button | Open the command palette. | [[CommandPalette]] |
| Tap outside a dialog | Close the dialog only when the dialog has no changes that are not saved. | Dialogs |

Additional rules:

- Do not use an edge swipe to open a sidebar. The browser uses that swipe for navigation.
- Show a visible button for each action that KEYBOARD.md assigns to a shortcut in the application shell. A phone has no `Ctrl` key.
- On a compact viewport, show a context menu as a sheet at the bottom of the screen.
- Give a divider a touch target that is 44 CSS pixels wide. The visible line can stay thin.

### 6.2 Diagramming and other canvases

These rules apply to `DiagramEngine`, `GraphCanvas`, `SpineMap`, `DynamicCanvas`, and the maxGraph canvas in the Diagrams application. Each of these components is a zoomable surface.

| Input | Action |
| :--- | :--- |
| Tap on an object | Select the object and clear the previous selection. |
| Tap on the background | Clear the selection. |
| Double tap on an object | Edit the text of the object. |
| Double tap on a container | Open the container. |
| Long press on an object | Open the context menu for the object. |
| Long press on the background | Open the context menu for the canvas. |
| Long press on the background, then drag | Draw a selection rectangle. |
| One-finger drag on an object | Select the object, then move the selection. |
| One-finger drag on a selection handle | Change the size of the object. |
| One-finger drag from a connection point | Draw a connector to the object below the finger. |
| One-finger drag on the background | Pan the view. |
| Two-finger drag | Pan the view. |
| Pinch | Zoom the view around the midpoint of the fingers. |
| Primary drag on the background | Draw a selection rectangle. |
| Middle-button drag, or `Space` + primary drag | Pan the view. |
| Wheel | Pan the view vertically. |
| `Ctrl` + wheel, or trackpad pinch | Zoom the view around the pointer. |

Additional rules:

- Apply the pan and the zoom of a two-finger gesture at the same time. Do not lock the gesture to one of them.
- If a second finger touches the screen during a one-finger drag, cancel the drag and restore the object. Then start the two-finger gesture.
- When a drag comes within 48 CSS pixels of the canvas edge, scroll the view automatically.
- Show selection handles and connection points with a touch target of 44 CSS pixels for a touch pointer. The visible handle can stay small.
- Show a preview of a dragged connector end above the finger, because the finger hides the point below it.
- Provide visible buttons for zoom in, zoom out, and fit to view.
- Provide a selection mode button in the toolbar. In selection mode, each tap adds an object to the selection or removes it.
- Open the canvas in the interaction mode that the application sets. Section 3 defines the modes.
- Put the gesture recognizer before the tool dispatch. A tool must not get a pointer event that belongs to a two-finger gesture.
- When a canvas is embedded in a scrolling page, leave it inactive until a person taps or clicks it. An inactive canvas lets the page scroll.

### 6.3 Writing

These rules apply to `MarkdownEditor`, `CodeEditor`, `SmartTextInputEngine`, `Conversation` input, and each plain text field.

The operating system owns text selection on a touch device. People know its caret, its selection handles, and its menu from every other application. Therefore, a component must not replace them.

| Input | Action |
| :--- | :--- |
| Tap | Put the caret at the tap position and show the on-screen keyboard. |
| Double tap | Select the word. The browser does this action. |
| Long press | Start the text selection of the operating system. |
| One-finger drag | Scroll the text. |
| Drag on a selection handle | Change the selection. The operating system does this action. |
| Two-finger drag | Scroll the text. |
| Pinch | Zoom the page. The browser does this action. |
| Primary drag | Select text. |
| Tap on a token, such as a mention | Select the token as one unit. |
| Tap on a link in a viewer | Follow the link. |
| Tap on a link in an editor | Put the caret in the link and show a link toolbar. |

Additional rules:

- Do not attach a context menu to a long press on text that a person can select. Put the commands in a toolbar.
- Keep the formatting toolbar visible above the on-screen keyboard. Use the `visualViewport` interface to find the keyboard height.
- Keep the caret visible when the on-screen keyboard opens.
- Show the trigger popovers for `@`, `#`, `$`, and `/` above the on-screen keyboard. Make each item 44 CSS pixels high.
- Detect trigger characters from the `beforeinput` and `input` events. On Android, an on-screen keyboard does not report a reliable key in `keydown`.
- Provide a visible send button in `Conversation`. KEYBOARD.md assigns `Ctrl + Enter` to submit, and a phone has no `Ctrl` key.
- Apply these rules to read-only text also. A long press on a message or a document must select text.

### 6.4 Editing structured data

These rules apply to `DataGrid`, `TreeGrid`, `TreeView`, `FileExplorer`, `Kanban`, the backlog, and each list.

| Input | Action | Component |
| :--- | :--- | :--- |
| Tap on a row or a cell | Select the row or the cell. | All |
| Tap on an expand control | Expand or collapse the node. | [[TreeView]], [[TreeGrid]] |
| Tap on a checkbox | Add the row to the selection, or remove it. | All |
| Double tap on a row | Open the item. | [[TreeView]], [[FileExplorer]], [[Kanban]] |
| Double tap on a cell | Edit the cell. | [[DataGrid]], [[TreeGrid]] |
| Long press or secondary click | Open the context menu. | All |
| Long press, then drag | Lift the row, the card, or the column header, then move it. | All |
| One-finger drag | Scroll in both directions. | All |
| Two-finger drag | Scroll in both directions. | All |
| Primary drag on a row or a card | Start the drag after 4 CSS pixels of movement. | All |
| Primary drag on cells | Select a range of cells. | [[DataGrid]], [[TreeGrid]] |
| Drag on a column edge | Change the column width. | [[DataGrid]], [[TreeGrid]] |
| Double tap or double click on a column edge | Fit the column width to the content. | [[DataGrid]], [[TreeGrid]] |

Additional rules:

- A long press opens the context menu only when the finger lifts without movement. If the finger moves after the lift, start the drag and do not open the menu.
- Show the lifted state at 500 milliseconds, before the finger moves. The lifted state tells the person that a drag is possible.
- Provide a "Move to" command in the context menu for each item that a drag can move. This command satisfies rule 4.
- Show a checkbox column on a coarse pointer when the component permits multiple selection. A touch pointer has no `Shift` key.
- Give each expand control and each column edge a touch target of 44 CSS pixels.
- When a drag comes within 48 CSS pixels of a scroll edge, scroll the view automatically. This rule includes the horizontal edges of `Kanban`.
- Keep the header row and the first column fixed while the grid scrolls.
- Show an Undo action in a toast after a drag changes saved data.

### 6.5 Viewing analytics

These rules apply to `ChartPanel`, `Gauge`, `MetricCard`, and `Timeline`. They also apply to the planned `DashboardGrid` and `Gantt` components.

A chart is in one of two states. An embedded chart sits in a dashboard that scrolls. An expanded chart fills the view after a person opens it. An embedded chart must never stop the page scroll.

| Input | Embedded chart | Expanded chart, `Timeline`, or `Gantt` |
| :--- | :--- | :--- |
| Tap on a data point | Pin the tooltip. | Pin the tooltip. |
| Tap on the background | Remove the pinned tooltip. | Remove the pinned tooltip. |
| Tap on a legend item | Show or hide the series. | Show or hide the series. |
| Double tap on a data point | Open the detail for the data point. | Open the detail for the data point. |
| Long press | Open the context menu. | Open the context menu. |
| One-finger vertical drag | Scroll the page. | Pan the view. |
| One-finger horizontal drag | Move the crosshair. | Pan the view. |
| Two-finger drag | Scroll the page. | Pan the view. |
| Pinch | Zoom the page. The browser does this action. | Zoom the view around the midpoint of the fingers. |
| Wheel | Scroll the page. | Pan the view vertically. |
| `Ctrl` + wheel, or trackpad pinch | Zoom the page. The browser does this action. | Zoom the view around the pointer. |
| Primary drag | Select a range, then zoom to that range. | Select a range, then zoom to that range. |
| Hover | Show the tooltip. | Show the tooltip. |

Additional rules:

- Show the same content in a pinned tooltip and in a hover tooltip.
- Put a pinned tooltip above the finger or beside the finger. The finger hides the point below it.
- Provide an expand button on each embedded chart.
- Provide a visible button to restore the default zoom. KEYBOARD.md assigns `0` to this action.
- Provide a visible Today button on `Timeline` and `Gantt`. KEYBOARD.md assigns `T` to this action.
- Move or resize a widget in `DashboardGrid` only in layout edit mode. Outside that mode, a drag on a widget scrolls the page.
- Move a bar in `Gantt` with a one-finger drag only in `edit` mode. Show an Undo action in a toast after the move.

### 6.6 Configuration

These rules apply to forms, settings pages, the property inspector, the permission matrix, the query builder, and each picker.

| Input | Action |
| :--- | :--- |
| Tap | Activate the control. |
| Tap on a slider track | Set the value at the tap position. |
| Drag on a slider handle | Change the value. |
| One-finger drag | Scroll the form. |
| Long press, then drag | Lift an item in a list that permits a new order, then move it. |
| Tap on a cell in the permission matrix | Change the permission in the cell. |
| Primary drag across cells in the permission matrix | Apply the first cell value to each cell in the drag. |
| Tap on an information button | Show the help text. |

Additional rules:

- Use the native control of the browser for dates, times, and selection lists when the native control meets the need.
- Set the `type`, `inputmode`, and `autocomplete` attributes on each input so that the correct on-screen keyboard opens.
- Do not put help text in a hover tooltip only. Provide an information button, or show the text below the field.
- Do not change a value when a finger scrolls across a control. Change the value on the up event only.
- Put the primary action where the on-screen keyboard does not hide it.
- Do not apply a drag across permission cells for a touch pointer. That drag scrolls the matrix.

## 7. Thresholds

Use these values in the shared gesture recognizer. A component must not define its own values.

| Name | Value | Use |
| :--- | :--- | :--- |
| Movement tolerance for a touch pointer | 10 CSS pixels | A larger movement changes a tap to a drag. |
| Movement tolerance for a mouse or pen pointer | 4 CSS pixels | A larger movement changes a click to a drag. |
| Long press time | 500 milliseconds | The lift occurs at this time. |
| Double tap time | 300 milliseconds | The maximum time between the two taps. |
| Double tap distance | 24 CSS pixels | The maximum distance between the two taps. |
| Minimum target for a coarse pointer | 44 by 44 CSS pixels | The touch target of each interactive element. |
| Minimum target for a fine pointer | 24 by 24 CSS pixels | The click target of each interactive element. |
| Automatic scroll zone | 48 CSS pixels | The distance from an edge where a drag starts to scroll the view. |
| Reserved edge zone | 20 CSS pixels | No component gesture starts in this zone at the left or right screen edge. |
| Pressed state time | 100 milliseconds | The maximum time before a pressed element shows its pressed state. |

The 24-pixel minimum is WCAG 2.2 success criterion 2.5.8, which is level AA. The 44-pixel minimum is success criterion 2.5.5, which is level AAA. This document applies the larger value to coarse pointers only.

## 8. Required alternatives

Rule 4 requires a tap alternative for each gesture. Each component must provide the alternative in this table.

| Gesture | Required alternative |
| :--- | :--- |
| Pinch, or `Ctrl` + wheel | Buttons for zoom in, zoom out, and the default zoom |
| Two-finger drag, or middle-button drag | Scroll bars, or a fit-to-view button |
| Long press, or secondary click | A visible "More" button that opens the same menu |
| Long press, then drag, in a collection | A "Move to" command in the context menu |
| Drag to move an object on a canvas | Arrow keys, and position fields in the property inspector |
| Drag to change the size of an object or a column | Size fields in the property inspector or in the column menu |
| Drag to draw a selection rectangle | Selection mode, and a "Select all" command |
| Double tap, or double click | An "Open" or "Edit" command in the context menu |
| Hover | A pinned tooltip, an information button, or visible text |
| `Shift` + click, or `Ctrl` + click | Checkboxes, or selection mode |
| A keyboard shortcut in KEYBOARD.md | A visible button, a menu command, or the command palette |

## 9. Implementation rules

1. **Use Pointer Events.** Listen for `pointerdown`, `pointermove`, `pointerup`, and `pointercancel`. Do not add `mousedown`, `mousemove`, `mouseup`, or `touchstart` listeners in new code. Item 9 gives the one exception.
2. **Use the `click` event for a simple activation.** The browser sends `click` for a touch pointer, a mouse pointer, a pen pointer, and the keyboard. Do not activate a button on `pointerdown`.
3. **Use the shared gesture recognizer.** One module in the component library converts pointer events to a tap, a double tap, a long press, a drag, and a pinch. A component must not run its own timers.
4. **Capture the pointer for each drag.** Call `setPointerCapture` when the drag starts. The component then gets the move events when the pointer leaves the element.
5. **Handle `pointercancel` as an abort.** Restore the state from before the gesture. The browser sends this event when it takes the gesture for a scroll or when a call arrives.
6. **Decide by pointer, not by device.** Read `pointerType` on each event. Do not read the user agent string. A tablet with a trackpad and a laptop with a touch screen send two pointer types.
7. **Declare `touch-action` on each interactive surface.** The table below gives the values. Without this property, the browser takes each drag for a scroll.
8. **Do not depend on the `contextmenu` event for a touch pointer.** Browsers differ. Use the long press from the gesture recognizer for touch. Use `contextmenu` for a mouse pointer and a pen pointer. Open one menu only.
9. **Stop the scroll after a lift in a scrollable view.** The `touch-action` value cannot change after the pointer goes down. After the lift, call `preventDefault` in a `touchmove` listener that is not passive. This case is the one permitted use of touch events.
10. **Put hover styles in `@media (hover: hover)`.** A touch device then does not keep a hover style after a tap.
11. **Put target sizes in `@media (pointer: coarse)`.** Use `(any-pointer: coarse)` when a device has both a mouse and a touch screen.
12. **Do not disable page zoom.** Do not set `user-scalable=no` or `maximum-scale` in the viewport meta element. People with low vision need page zoom.
13. **Keep wheel listeners passive.** Use a listener that is not passive only on a zoomable surface, to stop the page zoom on `Ctrl` + wheel.
14. **Handle the trackpad pinch in Safari on macOS.** Safari sends `gesturestart` and `gesturechange` for this input instead of `Ctrl` + wheel. Map both inputs to the same zoom action.
15. **Stop the selection and the callout on non-text elements.** Set `user-select: none` and `-webkit-touch-callout: none` on rows, cards, shapes, and handles. Do not set them on text.
16. **Contain the scroll.** Set `overscroll-behavior: contain` on the application shell and on each inner scroll area. This property stops the page refresh gesture and the scroll of the parent.
17. **Use dynamic viewport units.** Use `100dvh` and the `env(safe-area-inset-*)` values for layouts that fill the screen.

### Values for `touch-action`

| Surface | Value | Result |
| :--- | :--- | :--- |
| Application root | `manipulation` | The browser scrolls and zooms the page. The double tap zoom is off. |
| Active zoomable surface | `none` | The component handles each touch gesture. |
| Inactive embedded canvas | `manipulation` | The page scrolls across the canvas. |
| Embedded chart | `pan-y pinch-zoom` | The page scrolls vertically. The component handles a horizontal drag. |
| Horizontal slider, divider between side-by-side panes | `pan-y` | The page scrolls vertically. The component handles a horizontal drag. |
| Vertical slider, divider between stacked panes | `pan-x` | The component handles a vertical drag. |
| Selection handle, connection point, drag handle | `none` | The drag starts immediately. |
| Scrollable collection | `pan-x pan-y` | The browser scrolls. Item 9 applies after a lift. |

### Overriding pointer bindings

This section is a proposal. The component library does not have this property today.

Each interactive component accepts an optional `pointerBindings` property in its options object. The property mirrors the `keyBindings` property in KEYBOARD.md. Pass a partial map of action name to a list of gesture strings.

A gesture string has the form `"Modifier+Pointer:Gesture"`. The modifiers are `Ctrl`, `Shift`, `Alt`, and `Space`. The pointer is `Touch`, `Mouse`, `Pen`, or `Any`. `Wheel` is a gesture string without a pointer.

```typescript
const canvas = new DiagramEngine({
    pointerBindings: {
        // Pan with the primary button while Alt is down, in addition to the defaults.
        "panView": ["Touch:TwoFingerDrag", "Mouse:MiddleDrag", "Alt+Mouse:PrimaryDrag", "Wheel"],
        "zoomView": ["Touch:Pinch", "Ctrl+Wheel"],
    },
});
```

Each component documents its action names in `DEFAULT_POINTER_BINDINGS` near the top of its TypeScript source file. The recognizer rejects a binding that breaks a rule in section 3.

| Action name | Typical default | Components |
| :--- | :--- | :--- |
| `select` | `Any:Tap` | All |
| `open` | `Any:DoubleTap` | TreeView, FileExplorer, DiagramEngine |
| `contextMenu` | `Touch:LongPress`, `Mouse:SecondaryClick`, `Pen:SecondaryClick` | All |
| `moveItem` | `Touch:LongPressDrag`, `Mouse:PrimaryDrag` | TreeView, DataGrid, TabbedPanel |
| `moveObject` | `Any:Drag` | DiagramEngine, GraphCanvas |
| `selectArea` | `Touch:LongPressDrag`, `Mouse:PrimaryDrag`, `Pen:Drag` | DiagramEngine, GraphCanvas |
| `panView` | `Touch:TwoFingerDrag`, `Mouse:MiddleDrag`, `Space+Mouse:PrimaryDrag`, `Wheel` | DiagramEngine, GraphCanvas, SpineMap, Timeline |
| `zoomView` | `Touch:Pinch`, `Ctrl+Wheel` | DiagramEngine, GraphCanvas, SpineMap, Timeline |

## 10. Feedback

A touch pointer has no hover state, and the finger hides the target. Therefore, feedback must come sooner and must appear beside the finger.

- Show the pressed state in less than 100 milliseconds after the pointer goes down.
- Show the lifted state at the end of a long press, before the finger moves.
- Show each valid drop target while a drag is active. Show the position where the item goes.
- Show a dragged item with an offset from the finger so that the item stays visible.
- When a drag is canceled, move the item back to its start position with a short animation.
- Do not depend on vibration. Safari on iOS does not support the Vibration API.

## 11. Review checklist

Use this checklist for each new component and for each change to an existing component.

1. Does each gesture in the component match the tables in sections 4, 5, and 6?
2. Does a two-finger gesture leave the content unchanged in each state of the component?
3. Does each action have the alternative that section 8 requires?
4. Does the component work on a phone with one finger and no keyboard?
5. Does the component use Pointer Events and the shared gesture recognizer?
6. Does the component restore its state on `pointercancel`?
7. Does each interactive surface declare the `touch-action` value from section 9?
8. Is each target 44 by 44 CSS pixels on a coarse pointer?
9. Does the page scroll when a finger starts a vertical drag on the component in its embedded state?
10. Does page zoom work in each view that is not a zoomable surface?
11. Does the operating system select text on a long press in each text area?
12. Does a second finger during a one-finger drag cancel the drag without a change to the content?
13. Do the Playwright tests cover a tap, a long press, a drag, and a pinch with a touch pointer?

### Test method

Playwright supports a tap through `page.touchscreen.tap` in a context that has `hasTouch` set. A pinch and a two-finger drag need the `Input.dispatchTouchEvent` command of the Chrome DevTools Protocol. This command works in Chromium only. Therefore, also do a manual test on these devices before each release of a component:

- A phone with Safari on iOS, with a finger
- A tablet with Safari on iPadOS, with a finger, a pen, and a trackpad
- A phone with Chrome on Android, with a finger
- A laptop with a touch screen on Windows, with a finger and a mouse
- A laptop on macOS with Chrome and with Safari, with a trackpad

## 12. Component names

Section 6 uses the component names from the component library. KEYBOARD.md uses `DiagramCanvas` for the canvas of the Diagrams application. The component library has no `Kanban`, `Gantt`, or `DashboardGrid` component on 15 November 2026. The rules for these three components apply when the components team builds them.

## 13. Work that this document creates

The list is in priority order. The first two items remove the problems that people see on a touch screen today.

1. **Build the shared gesture recognizer.** It tracks each active pointer and reports a tap, a double tap, a long press, a drag, and a pinch.
2. **Add the two-finger pan and the pinch to the four zoomable surfaces.** The surfaces are `DiagramEngine`, `GraphCanvas`, `SpineMap`, and `Timeline`. In `DiagramEngine`, replace the rule that ignores each pointer after the first.
3. **Change the wheel in three components.** `DiagramEngine`, `GraphCanvas`, and `SpineMap` must pan on the wheel and zoom on `Ctrl` + wheel. `Timeline` already pans.
4. **Add the long press to the eight components that open a menu from `contextmenu` only.**
5. **Add the `interactionMode` option to each component that can change content.**
6. **Handle `pointercancel` in the 29 components that do not handle it.**
7. **Test the 17 components that use the HTML drag-and-drop interface on each device in section 11.** If a component does not follow the lift rule, replace the interface with Pointer Events.
8. **Move the hover styles of 100 components into `@media (hover: hover)`.**
9. **Review the 25 components that listen for `mousedown` only.** Most of them are pickers. The search did not show how each picker uses the event.
10. **Verify how the maxGraph library handles the wheel and touch in the Diagrams application.**

Item 3 changes behavior that people who use a mouse know today. Announce the change in the release notes of the component library.

## 14. Decisions

The product owner confirmed these decisions on 15 November 2026.

| Decision | Reason |
| :--- | :--- |
| A one-finger drag on a canvas object moves the object immediately. | Other diagram tools do the same. |
| The wheel pans a zoomable surface, and `Ctrl` + wheel zooms. | A trackpad then has the same meaning as two fingers on a touch screen. |
| The application sets the interaction mode. The component does not select it from the viewport width. | The correct default depends on the application and the device. |

These choices are open. Each choice is a judgment, not a measured fact.

| Number | Choice in this document | Alternative | Tradeoff |
| :--- | :--- | :--- | :--- |
| 1 | A horizontal swipe on a row is not assigned. | A swipe shows row actions. | The choice prevents a conflict with horizontal scroll in grids. Some people expect the swipe from phone applications. |
| 2 | The minimum target on a coarse pointer is 44 CSS pixels. | The minimum target is 24 CSS pixels. | The choice reduces tap errors. A grid shows fewer rows on a tablet. |
| 3 | Components accept a `pointerBindings` property. | Bindings are fixed. | The choice mirrors `keyBindings`. It adds an interface that the components team must maintain. |
