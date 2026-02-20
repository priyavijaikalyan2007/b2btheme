<!-- AGENT: PRD for the MultiselectCombo component — multi-select combo box with chips, checkboxes, filtering, grouping, and Select All. -->

# MultiselectCombo Component

**Status:** Draft
**Component name:** MultiselectCombo
**Folder:** `./components/multiselectcombo/`
**Spec author:** Agent
**Date:** 2026-02-20

---

## 1. Overview

### 1.1 What Is It

A multi-select combo box that allows users to choose multiple items from a filterable dropdown list. Selected items are displayed as removable chips (tags) in the input area, or as a compact count badge ("3 selected"). The dropdown presents each item with a checkbox that toggles selection without closing the dropdown, enabling efficient multi-selection workflows.

The component supports item grouping with group headers, a Select All / Deselect All checkbox, substring filtering via a search input inside the dropdown, a configurable maximum selection limit, chip overflow via a "+N more" badge, and three size variants. It is a standalone implementation (following the ADR-021 pattern) that is not a subclass of EditableComboBox, although it shares several design conventions such as the `ComboItem` data model, dropdown positioning, and keyboard navigation patterns.

### 1.2 Why Build It

Multi-select is one of the most frequently needed input patterns in enterprise SaaS applications:

- Tag assignment (assign multiple labels or categories to a record)
- Role and permission pickers (assign multiple roles to a user)
- Filter panels (select multiple values for a column filter)
- Channel or recipient pickers (select multiple channels, teams, or people)
- Feature flag targeting (select multiple segments or environments)

Bootstrap 5 does not provide a multi-select combo box. The native HTML `<select multiple>` element has severe UX limitations: it requires Ctrl+Click for multi-selection (undiscoverable), offers no search or filtering, displays a fixed-size scrollable list, and cannot show chips or selection counts. A custom component fills this gap while adhering to the Bootstrap 5 theme and the project's component architecture.

### 1.3 Design Inspiration

| Source | Key Pattern Adopted |
|--------|---------------------|
| **React Select (isMulti)** | Chips in input area, removable with x button, type-to-filter |
| **Ant Design Select (mode="multiple")** | Checkbox beside each item, Select All, count badge mode |
| **Slack Channel Picker** | Grouped items, search within dropdown, "+N more" overflow |
| **MUI Autocomplete (multiple)** | Chip overflow, max selections limit, size variants |
| **Shopify Polaris Multi-Select** | Checkbox list, group headers, disabled item states |
| **WAI-ARIA Combobox + Listbox Pattern** | Accessibility roles, states, keyboard interactions for multi-select |

---

## 2. Anatomy

### 2.1 Full Layout (Chips Mode)

```
┌──────────────────────────────────────────────────┐
│ [Tag A x] [Tag B x] [Tag C x] [+2 more]  │ [v] │  <-- Input area with chips + toggle
└──────────────────────────────────────────────────┘
  ┌──────────────────────────────────────────────┐
  │ [icon] [Filter items...                    ] │  <-- Filter input
  ├──────────────────────────────────────────────┤
  │ [check] Select All                           │  <-- Select All checkbox
  ├──────────────────────────────────────────────┤
  │   Group A                                    │  <-- Group header
  │ [check] Item 1                               │  <-- Checked item
  │ [check] Item 2                               │
  │ [    ] Item 3                                │  <-- Unchecked item
  │   Group B                                    │  <-- Group header
  │ [    ] Item 4                                │
  │ [check] Item 5                               │
  └──────────────────────────────────────────────┘
```

### 2.2 Count Badge Mode

```
┌──────────────────────────────────────────────────┐
│ 3 selected                                │ [v] │
└──────────────────────────────────────────────────┘
```

### 2.3 Element Breakdown

| Element | Required | Description |
|---------|----------|-------------|
| Root container | Yes | `div.multiselectcombo` wrapping the entire component |
| Input area | Yes | `div.multiselectcombo-input-area` containing chips or count badge |
| Chip | Conditional | `span.multiselectcombo-chip` with label and remove button |
| Chip remove button | Conditional | `button.multiselectcombo-chip-remove` with x icon |
| Overflow badge | Conditional | `span.multiselectcombo-overflow-badge` showing "+N more" |
| Count badge | Conditional | `span.multiselectcombo-count-badge` showing "N selected" |
| Placeholder | Conditional | `span.multiselectcombo-placeholder` when nothing selected |
| Toggle button | Yes | `button.multiselectcombo-toggle` with chevron icon |
| Dropdown | Yes | `div.multiselectcombo-dropdown` containing filter and items |
| Filter wrapper | Conditional | `div.multiselectcombo-filter` with search icon and input |
| Filter input | Conditional | `input.multiselectcombo-filter-input` for substring search |
| Select All row | Conditional | `div.multiselectcombo-select-all` with checkbox |
| Select All checkbox | Conditional | `input[type="checkbox"].multiselectcombo-select-all-check` |
| Group header | Conditional | `div.multiselectcombo-group-header` non-selectable label |
| Item list | Yes | `div.multiselectcombo-listbox` scrollable item container |
| Item row | Yes (1+) | `div.multiselectcombo-item` with checkbox and label |
| Item checkbox | Yes | `input[type="checkbox"].multiselectcombo-item-check` |
| Item icon | Optional | `span.multiselectcombo-item-icon` Bootstrap Icons element |
| Item label | Yes | `span.multiselectcombo-item-label` text label |
| No results | Conditional | `div.multiselectcombo-no-results` when filter yields nothing |
| Live region | Yes | `div.visually-hidden[aria-live="polite"]` for announcements |

---

## 3. API

### 3.1 Interfaces

```typescript
/**
 * Represents a single item in the multi-select combo box.
 */
interface ComboItem
{
    /** Programmatic value used for identification and selection state. */
    value: string;

    /** Display text shown in the dropdown and on chips. */
    label: string;

    /** Optional grouping label. Items with the same group are rendered under a group header. */
    group?: string;

    /** Optional Bootstrap Icons class displayed before the label. */
    icon?: string;

    /** When true, this item is shown but cannot be selected. Default: false. */
    disabled?: boolean;

    /** Arbitrary consumer data attached to this item. Not rendered. */
    data?: Record<string, unknown>;
}

/**
 * Configuration options for the MultiselectCombo component.
 */
interface MultiselectComboOptions
{
    /** The items to display in the dropdown. */
    items: ComboItem[];

    /** Initial selected values (array of ComboItem.value strings). Default: []. */
    selected?: string[];

    /** Placeholder text shown when no items are selected. Default: "Select...". */
    placeholder?: string;

    /** Maximum number of items that can be selected. 0 = unlimited. Default: 0. */
    maxSelections?: number;

    /** Show the Select All / Deselect All checkbox in the dropdown header. Default: true. */
    showSelectAll?: boolean;

    /**
     * Display mode for selected items in the input area.
     * true = show removable chips. false = show count badge ("3 selected").
     * Default: true.
     */
    showChips?: boolean;

    /** Show the remove (x) button on each chip. Default: true. */
    chipRemovable?: boolean;

    /** Maximum number of chips visible before showing "+N more" badge. Default: 5. */
    maxChipsVisible?: number;

    /** Placeholder text in the dropdown filter input. Default: "Filter items...". */
    filterPlaceholder?: string;

    /** Text shown when the filter yields no matches. Default: "No results found". */
    noResultsText?: string;

    /** Show the filter search input inside the dropdown. Default: true. */
    showFilter?: boolean;

    /** When true, the component is disabled. Default: false. */
    disabled?: boolean;

    /** When true, selections cannot be changed but the dropdown can open. Default: false. */
    readonly?: boolean;

    /** Size variant. Default: "default". */
    size?: "sm" | "default" | "lg";

    /** Additional CSS class(es) on the root element. */
    cssClass?: string;

    /** Called when a single item is selected. Receives the newly selected item. */
    onSelect?: (item: ComboItem) => void;

    /** Called when a single item is deselected. Receives the deselected item. */
    onDeselect?: (item: ComboItem) => void;

    /** Called after any selection change. Receives the full array of selected values. */
    onChange?: (selectedValues: string[]) => void;

    /** Called when the filter text changes. Receives the current query string. */
    onFilterChange?: (query: string) => void;

    /** Called when the dropdown opens. */
    onOpen?: () => void;

    /** Called when the dropdown closes. */
    onClose?: () => void;
}
```

### 3.2 Class: MultiselectCombo

| Method | Signature | Description |
|--------|-----------|-------------|
| `constructor` | `(options: MultiselectComboOptions)` | Creates the component DOM tree. Does not attach to the page. |
| `show` | `(containerId: string)` | Appends the component to the container identified by the given ID. |
| `hide` | `()` | Removes the component from the DOM without destroying state. |
| `destroy` | `()` | Hides, removes all event listeners, and releases internal references. |
| `getElement` | `(): HTMLElement` | Returns the root `.multiselectcombo` DOM element. |
| `getSelectedValues` | `(): string[]` | Returns an array of currently selected `ComboItem.value` strings. |
| `getSelectedItems` | `(): ComboItem[]` | Returns an array of currently selected `ComboItem` objects. |
| `setSelected` | `(values: string[])` | Replaces the current selection with the given values. Fires `onChange`. |
| `selectAll` | `()` | Selects all non-disabled items (respects `maxSelections`). Fires `onChange`. |
| `deselectAll` | `()` | Clears all selections. Fires `onChange`. |
| `addItem` | `(item: ComboItem)` | Adds a new item to the dropdown. Re-renders if dropdown is open. |
| `removeItem` | `(value: string)` | Removes an item by value. If the item was selected, it is deselected first. |
| `setItems` | `(items: ComboItem[])` | Replaces all items. Clears selections that no longer match any item. |
| `open` | `()` | Opens the dropdown programmatically. |
| `close` | `()` | Closes the dropdown programmatically. |
| `enable` | `()` | Enables the component. |
| `disable` | `()` | Disables the component. Closes dropdown if open. |
| `focus` | `()` | Sets focus to the input area. |

### 3.3 Convenience Functions

| Function | Description |
|----------|-------------|
| `createMultiselectCombo(options, containerId?)` | Create, optionally show, and return a MultiselectCombo instance. |

### 3.4 Global Exports

```typescript
window.MultiselectCombo = MultiselectCombo;
window.createMultiselectCombo = createMultiselectCombo;
```

---

## 4. Behaviour

### 4.1 Lifecycle

1. **Construction** -- Builds the full DOM tree based on provided options. Applies initial selections, size class, and disabled/readonly state. Does not attach to the page.
2. **show(containerId)** -- Resolves the container by ID, appends the root element. Logs error with `LOG_PREFIX` if container is not found.
3. **hide()** -- Removes from DOM. Internal state (selections, items) is preserved for re-show.
4. **destroy()** -- Calls hide, removes all event listeners (click-outside, keyboard, resize observer), nulls DOM references, sets `destroyed` flag. Subsequent method calls log a warning and no-op.

### 4.2 Opening the Dropdown

The dropdown opens when:

1. The user clicks anywhere on the input area (chips, placeholder, or count badge).
2. The user clicks the toggle button (chevron).
3. The user presses Enter, Space, or ArrowDown while the input area is focused.

On open, if `showFilter` is true, the filter input receives focus automatically. The `onOpen` callback fires after the dropdown becomes visible.

### 4.3 Closing the Dropdown

The dropdown closes when:

1. The user presses Escape.
2. The user clicks outside the component (click-outside listener on `document`).
3. The user presses Tab to leave the component.
4. The consumer calls `close()` programmatically.

Importantly, selecting or deselecting an item does **not** close the dropdown. This is the key behavioural difference from a single-select combo box.

### 4.4 Item Selection and Deselection

- Clicking an item row or its checkbox toggles that item's selected state.
- When an item is selected: a chip is added to the input area (or the count badge is updated), the item's checkbox becomes checked, and `onSelect` then `onChange` fire.
- When an item is deselected: the corresponding chip is removed (or the count badge is updated), the checkbox is unchecked, and `onDeselect` then `onChange` fire.
- Disabled items cannot be selected or deselected. Their checkboxes appear greyed out and clicks are ignored.
- In readonly mode, checkboxes appear checked/unchecked but clicks are ignored.

### 4.5 Max Selections Limit

When `maxSelections > 0`:

- Once the limit is reached, all remaining unchecked items become visually disabled (greyed out) and unclickable.
- The Select All checkbox respects the limit: it selects up to `maxSelections` items.
- If the user attempts to select beyond the limit (programmatically via `setSelected` with too many values), only the first `maxSelections` values are applied and a warning is logged with `LOG_PREFIX`.
- Deselecting an item re-enables the remaining unchecked items.

### 4.6 Select All / Deselect All

When `showSelectAll` is true:

- A checkbox labelled "Select All" appears at the top of the item list, below the filter input.
- **All deselected**: checkbox is unchecked. Clicking selects all non-disabled items (respects `maxSelections`).
- **Some selected**: checkbox shows the indeterminate state. Clicking selects all remaining non-disabled items (respects `maxSelections`).
- **All selected**: checkbox is checked. Clicking deselects all items.
- When a filter is active, Select All applies only to the visible (filtered) items.
- `onChange` fires once after the bulk operation, not once per item.

### 4.7 Filtering

- When `showFilter` is true, a search input with a magnifying glass icon appears at the top of the dropdown.
- Typing filters items to those whose `label` contains the typed substring (case-insensitive).
- Group headers are hidden when all items in the group are filtered out.
- The Select All checkbox applies only to visible items when a filter is active.
- The "No results found" message is displayed when no items match the filter.
- Clearing the filter input restores all items.
- The `onFilterChange` callback fires on each keystroke with the current query string.
- Filtering is applied synchronously for lists under 500 items. For larger lists, a 150ms debounce is applied.

### 4.8 Chip Display

When `showChips` is true:

- Each selected item is rendered as a chip in the input area.
- Chips display the item's label as `textContent` and, when `chipRemovable` is true, a small x button.
- Clicking the chip x button deselects that item (fires `onDeselect` then `onChange`).
- When the number of selected items exceeds `maxChipsVisible`, the excess chips are hidden and a "+N more" badge is displayed.
- The "+N more" badge has a `title` attribute listing the hidden item labels.

### 4.9 Count Badge Display

When `showChips` is false:

- Instead of individual chips, a single count badge ("3 selected") is shown in the input area.
- When nothing is selected, the placeholder text is shown.
- The count badge has a `title` attribute listing all selected item labels.

### 4.10 Dropdown Positioning

- The dropdown appears **below** the input area by default.
- If there is insufficient space below (calculated via `getBoundingClientRect()` on open), the dropdown appears **above** the input area.
- When positioned above, the class `multiselectcombo-dropdown-above` is added for styling.
- The dropdown width matches the full width of the input area.

### 4.11 States

| State | Visual Behaviour |
|-------|-----------------|
| **Default** | Input area has standard border colour. Dropdown is closed. |
| **Focused** | Input area has Bootstrap focus ring (`$input-focus-border-color`, `$input-focus-box-shadow`). |
| **Dropdown open** | Toggle chevron rotates 180 degrees. Dropdown is visible. |
| **Disabled** | Input area is dimmed (`$input-disabled-bg`). Toggle button is inert. Dropdown cannot open. Chips have no remove button. |
| **Readonly** | Input area looks normal. Dropdown can open to view items but checkboxes are non-interactive. Chips have no remove button. |
| **Max reached** | Unchecked items in dropdown are greyed out. A subtle "Maximum reached" hint appears below the Select All row. |

---

## 5. Styling

### 5.1 CSS Classes

| Class | Element |
|-------|---------|
| `.multiselectcombo` | Root container |
| `.multiselectcombo-sm` | Small size variant (on root) |
| `.multiselectcombo-lg` | Large size variant (on root) |
| `.multiselectcombo-disabled` | Disabled state (on root) |
| `.multiselectcombo-readonly` | Readonly state (on root) |
| `.multiselectcombo-open` | Dropdown open state (on root) |
| `.multiselectcombo-input-area` | Input area wrapping chips/badge and toggle |
| `.multiselectcombo-chip` | Individual chip tag |
| `.multiselectcombo-chip-remove` | Chip remove (x) button |
| `.multiselectcombo-overflow-badge` | "+N more" badge |
| `.multiselectcombo-count-badge` | "N selected" badge |
| `.multiselectcombo-placeholder` | Placeholder text when nothing selected |
| `.multiselectcombo-toggle` | Chevron toggle button |
| `.multiselectcombo-chevron` | Chevron icon inside toggle |
| `.multiselectcombo-dropdown` | Dropdown panel |
| `.multiselectcombo-dropdown-above` | Dropdown positioned above input |
| `.multiselectcombo-filter` | Filter input wrapper |
| `.multiselectcombo-filter-input` | Filter text input |
| `.multiselectcombo-filter-icon` | Search icon in filter |
| `.multiselectcombo-select-all` | Select All row |
| `.multiselectcombo-select-all-check` | Select All checkbox |
| `.multiselectcombo-max-hint` | "Maximum reached" hint text |
| `.multiselectcombo-listbox` | Scrollable item container |
| `.multiselectcombo-group-header` | Group header label |
| `.multiselectcombo-item` | Individual item row |
| `.multiselectcombo-item-highlighted` | Keyboard-highlighted item |
| `.multiselectcombo-item-disabled` | Disabled item |
| `.multiselectcombo-item-check` | Item checkbox |
| `.multiselectcombo-item-icon` | Item icon element |
| `.multiselectcombo-item-label` | Item label text |
| `.multiselectcombo-no-results` | No results message |

### 5.2 Theme Integration

| Property | Value | Source |
|----------|-------|--------|
| Input area background | `$white` | Standard input background |
| Input area border | `1px solid $gray-400` | Standard input border (`$input-border-color`) |
| Input area focus border | `$input-focus-border-color` | Bootstrap focus state |
| Input area focus shadow | `$input-focus-box-shadow` | Bootstrap focus ring |
| Input area disabled background | `$input-disabled-bg` | Standard disabled pattern |
| Chip background | `$gray-200` | Subtle tag background |
| Chip text colour | `$gray-900` | High contrast label |
| Chip border | `1px solid $gray-300` | Subtle border |
| Chip remove button colour | `$gray-500`, hover `$gray-700` | Muted, visible on hover |
| Overflow badge background | `$gray-300` | Slightly stronger than chip |
| Overflow badge text | `$gray-700` | Readable |
| Count badge text | `$gray-700` | Readable count |
| Toggle chevron colour | `$gray-500` | Standard indicator |
| Dropdown background | `$white` | Standard dropdown |
| Dropdown border | `1px solid $gray-300` | Matches Bootstrap dropdown |
| Dropdown shadow | `0 2px 8px rgba(0,0,0,0.15)` | Elevation indicator |
| Item hover background | `$gray-100` | Subtle highlight |
| Item highlighted background | `$gray-200` | Keyboard navigation highlight |
| Item disabled text | `$gray-400` | Standard disabled |
| Item checkbox checked | `$primary` | Bootstrap primary accent |
| Group header text | `$gray-500`, `$font-size-sm`, uppercase | Section divider |
| Select All row border-bottom | `1px solid $gray-200` | Visual separator |
| No results text | `$gray-500`, italic | Subtle empty state |
| Placeholder text | `$gray-500` | Standard placeholder |
| SCSS import | `@import '../../src/scss/variables'` | Project convention |

### 5.3 Sizing Variants

| Size | CSS class | Input area height | Chip padding | Font size |
|------|-----------|-------------------|--------------|-----------|
| Small | `.multiselectcombo-sm` | Matches `form-control-sm` | `0.1rem 0.35rem` | `$font-size-sm` |
| Default | (none) | Matches `form-control` | `0.15rem 0.4rem` | `$font-size-base` |
| Large | `.multiselectcombo-lg` | Matches `form-control-lg` | `0.2rem 0.5rem` | `$font-size-lg` |

### 5.4 Dimensions

| Property | Value |
|----------|-------|
| Dropdown max height | 280px (scrollable) |
| Chip border-radius | 2px (minimal, per project theme) |
| Chip margin | 2px |
| Chip remove button size | 16px x 16px |
| Item row height | 32px |
| Filter input height | 30px |
| Select All row height | 34px |
| Group header height | 26px |
| Toggle button width | 32px |

### 5.5 Z-Index

| Element | Z-Index | Rationale |
|---------|---------|-----------|
| Root | Auto (flow) | Normal stacking context |
| Dropdown | 1050 | Above page content, matches Bootstrap dropdown z-index |

### 5.6 Transitions and Animations

| Property | Duration | Easing | Description |
|----------|----------|--------|-------------|
| Chevron rotation | 200ms | ease | Rotates 180 degrees when dropdown opens |
| Item hover background | 150ms | ease | Smooth colour transition |
| Chip appear | 150ms | ease-in | Chip fades in on selection |
| Chip remove | 100ms | ease-out | Chip fades out on deselection |

---

## 6. Keyboard Interaction

| Key | Context | Action |
|-----|---------|--------|
| **Tab** | Any | Moves focus into or out of the component. If dropdown is open, closes it first. |
| **Enter** | Input area focused, dropdown closed | Opens the dropdown. |
| **Space** | Input area focused, dropdown closed | Opens the dropdown. |
| **ArrowDown** | Input area focused, dropdown closed | Opens the dropdown and highlights the first item. |
| **ArrowDown** | Dropdown open | Moves highlight to the next item (skips group headers, wraps to first). |
| **ArrowUp** | Dropdown open | Moves highlight to the previous item (skips group headers, wraps to last). |
| **Space** | Dropdown open, item highlighted | Toggles the highlighted item's selection. Does **not** close the dropdown. |
| **Enter** | Dropdown open, item highlighted | Toggles the highlighted item's selection. Does **not** close the dropdown. |
| **Escape** | Dropdown open | Closes the dropdown. Focus returns to input area. |
| **Ctrl+A** | Dropdown open | Selects all visible non-disabled items (respects `maxSelections`). |
| **Backspace** | Filter input empty, dropdown open | Removes the last selected chip (deselects the most recently selected item). |
| **Delete** | Chip focused | Removes (deselects) the focused chip. Focus moves to the next chip or input area. |
| **Home** | Dropdown open | Highlights the first item. |
| **End** | Dropdown open | Highlights the last item. |
| **Any printable character** | Dropdown open | Types into the filter input. |

---

## 7. Accessibility

### 7.1 ARIA Roles and Attributes

| Element | Attribute | Value |
|---------|-----------|-------|
| Root `div.multiselectcombo` | `role` | `combobox` |
| Root `div.multiselectcombo` | `aria-haspopup` | `listbox` |
| Root `div.multiselectcombo` | `aria-expanded` | `true` when dropdown open, `false` when closed |
| Root `div.multiselectcombo` | `aria-owns` | ID of the listbox element |
| Input area | `tabindex` | `0` (focusable) |
| Input area | `aria-multiselectable` | `"true"` |
| Input area | `aria-label` | Consumer-provided or defaults to placeholder text |
| Chip container | `role` | `list` |
| Each chip | `role` | `listitem` |
| Chip remove button | `aria-label` | `"Remove [item label]"` |
| Dropdown listbox | `role` | `listbox` |
| Dropdown listbox | `aria-multiselectable` | `"true"` |
| Dropdown listbox | `aria-label` | `"Options"` |
| Each item | `role` | `option` |
| Each item | `aria-selected` | `true` or `false` |
| Each item | `aria-checked` | `true` or `false` |
| Each item | `id` | Unique ID (for `aria-activedescendant`) |
| Disabled item | `aria-disabled` | `"true"` |
| Group wrapper | `role` | `group` |
| Group wrapper | `aria-label` | Group name text |
| Select All | `role` | `option` |
| Select All | `aria-checked` | `"true"`, `"false"`, or `"mixed"` (indeterminate) |
| Filter input | `role` | `searchbox` |
| Filter input | `aria-label` | `"Filter items"` |
| Input area | `aria-activedescendant` | ID of the currently highlighted option, or empty |
| Live region | `aria-live` | `"polite"` |
| Live region | `aria-atomic` | `"true"` |

### 7.2 Screen Reader Announcements

- When an item is selected or deselected, the live region announces "[Item label] selected" or "[Item label] removed".
- When Select All is used, the live region announces "N items selected" or "All items deselected".
- When the filter yields no results, the live region announces the `noResultsText`.
- When `maxSelections` is reached, the live region announces "Maximum of N selections reached".

### 7.3 Focus Management

- Focus starts on the input area.
- When the dropdown opens with `showFilter` true, focus moves to the filter input.
- When the dropdown opens without a filter, `aria-activedescendant` tracks the highlighted item while focus remains on the input area.
- When the dropdown closes, focus returns to the input area.
- The toggle button has `tabindex="-1"` and is activated by mouse/touch only.
- Chip remove buttons are reachable via arrow keys within the chip list but are not in the main tab order.

---

## 8. Dependencies

| Dependency | Required | Notes |
|------------|----------|-------|
| Bootstrap 5 CSS | Yes | For `form-control`, `btn`, `badge`, checkbox styling base |
| Bootstrap 5 JS | No | This component does not use Bootstrap JS plugins |
| Bootstrap Icons | Yes | For `bi-chevron-down`, `bi-search`, `bi-x` icons |
| Enterprise Theme CSS | Yes | For theme variable overrides (`_variables.scss`) |

---

## 9. Open Questions

| # | Question | Status |
|---|----------|--------|
| 1 | Should the component support async item loading (e.g., fetch items from an API as the user types)? | Deferred to v2. Consumers can use `onFilterChange` + `setItems()` as a workaround. |
| 2 | Should chips be reorderable via drag and drop within the input area? | Deferred. Not required for initial release. |
| 3 | Should the component support a "create new item" option at the bottom of the dropdown when the filter text does not match any existing item? | Deferred to v2. Consumers can listen to `onFilterChange` and use `addItem()`. |
