<!-- AGENT: Product Requirements Document for the EditableComboBox component — structure, behaviour, API, and accessibility requirements. -->

# Editable Combo Box Component

**Status:** Draft
**Component name:** EditableComboBox
**Folder:** `./components/editablecombobox/`
**Spec author:** Agent
**Date:** 2026-02-10

---

## 1. Overview

### 1.1 What Is It

An editable combo box merges a single-line text input with a dropdown list. The user can either type free text into the input or select a value from the dropdown. Typing filters the dropdown to matching entries.

This pattern is a standard control in desktop operating systems (Windows `CBS_DROPDOWN`, GNOME `GtkComboBoxText` with entry, KDE `QComboBox` with `setEditable(true)`) and is commonly needed in enterprise SaaS applications for fields such as:

- Country or region selectors where a custom value may be valid
- Tag entry where suggestions are offered but free text is accepted
- Searchable selectors with large option lists (50+ items)
- Any field where the user may need to either pick from known values or provide a new one

### 1.2 Why Build It

Bootstrap 5 does not provide an editable combo box. The native HTML `<datalist>` element offers partial functionality but has significant limitations:

- Inconsistent rendering across browsers
- No control over dropdown styling, filtering logic, or keyboard behaviour
- No programmatic API for dynamic item management
- No events for selection, filtering, or open/close state changes
- Cannot style individual items or group items

A custom component fills this gap while adhering to the Bootstrap component model and the enterprise theme.

### 1.3 Design Inspiration

The following implementations inform this specification:

| Source | Key Pattern Adopted |
|--------|-------------------|
| **Windows ComboBox (CBS_DROPDOWN)** | Arrow button on the right opens the list; typing filters; Escape closes |
| **GNOME GtkComboBoxText** | Text entry integrated into the control; dropdown arrow on right |
| **VS Code command palette** | Keyboard-first navigation; immediate substring filtering |
| **Select2 / Choices.js** | Positioning below the input; scroll within bounded list; highlight on hover |
| **WAI-ARIA Combobox pattern** | Accessibility roles, states, and keyboard interactions |

---

## 2. User Experience

### 2.1 Visual Design

The component consists of two visual parts:

1. **Text input** — A standard Bootstrap `form-control` input field. Occupies the full width of the component minus the toggle button.
2. **Toggle button** — A square button at the right edge of the input containing a downward chevron icon (`bi-chevron-down`). Clicking this button opens or closes the dropdown.
3. **Dropdown list** — A list panel that appears below the input when open. Styled consistently with Bootstrap dropdowns (same background, border, shadow, item padding).

```
┌──────────────────────────────┬──────┐
│  [Text input area]           │  ▼   │  <-- Toggle button
├──────────────────────────────┴──────┤
│  Option A                    (highlighted) │
│  Option B                           │
│  Option C                           │
│  ...                                │
│  (scrollable if items exceed max)   │
└─────────────────────────────────────┘
```

**Key visual properties:**

- The input and toggle button appear as a single unified control (no visual gap between them). Use Bootstrap's `input-group` pattern.
- The dropdown aligns with the left edge of the input and matches its full width (input + button).
- The dropdown has a visible border, subtle box shadow, and the same background as Bootstrap dropdowns.
- The currently highlighted item (via keyboard or hover) uses the Bootstrap `$dropdown-link-hover-bg` colour.
- The selected item (when the dropdown opens and the input matches an item exactly) is visually distinguished using `$dropdown-link-active-bg` / `$dropdown-link-active-color`.
- All elements use zero border-radius per the enterprise theme.
- All sizing (padding, fonts, spacing) uses theme variables.

### 2.2 Sizing Variants

The component supports Bootstrap's three standard sizes:

| Size | CSS class | Input size | Font size |
|------|-----------|------------|-----------|
| Small | `.combobox-sm` | Matches `form-control-sm` | `$font-size-sm` |
| Default | (none) | Matches `form-control` | `$font-size-base` |
| Large | `.combobox-lg` | Matches `form-control-lg` | `$font-size-lg` |

### 2.3 States

| State | Visual Behaviour |
|-------|-----------------|
| **Default** | Input has standard border colour. Dropdown is closed. |
| **Focused** | Input has Bootstrap focus ring (`$input-focus-border-color`, `$input-focus-box-shadow`). Dropdown may or may not be open. |
| **Dropdown open** | Toggle button chevron rotates 180 degrees (points up). Dropdown is visible below input. |
| **Disabled** | Input is dimmed. Toggle button is inert. Dropdown cannot open. Uses `$input-disabled-bg`. |
| **Readonly** | Input text is not editable. Dropdown can still open to allow selection. |

---

## 3. Behaviour

### 3.1 Opening the Dropdown

The dropdown opens when:

1. The user clicks the toggle button (chevron).
2. The user presses `ArrowDown` or `Alt+ArrowDown` while the input is focused and the dropdown is closed.
3. The user begins typing in the input (the dropdown opens automatically to show filtered results).

### 3.2 Closing the Dropdown

The dropdown closes when:

1. The user presses `Escape`. Focus remains on the input. The input text is not changed.
2. The user presses `Tab`. If an item is highlighted, the highlighted item's value is committed to the input before the focus moves to the next focusable element.
3. The user clicks outside the component (blur). The current input text is retained as-is.
4. The user selects an item (via click or `Enter`).
5. The user clicks the toggle button while the dropdown is open.

### 3.3 Filtering

- When the user types in the input, the dropdown filters to show only items whose text contains the typed substring.
- Filtering is **case-insensitive**.
- The match is a **substring match** (not prefix-only). For example, typing "land" matches "Finland", "Iceland", and "New Zealand".
- If no items match the current filter text, the dropdown displays a single "No matches" message (not selectable).
- When the filter text is cleared (input is empty), all items are shown.
- The matched portion of each item's text is visually highlighted (bold or underline) so the user can see why the item matched.

### 3.4 Selection

- Clicking an item or pressing `Enter` on a highlighted item commits that item's value to the input.
- After selection, the dropdown closes and the input retains focus.
- If no item is highlighted and the user presses `Enter`, the current free text is accepted as-is and the dropdown closes.

### 3.5 Free Text

- The user may type any text, including values that do not match any item in the list.
- When the component's value is read programmatically, it returns whatever text is in the input, whether or not it matches a dropdown item.
- The consumer application can optionally restrict values to the item list (see `restrictToItems` option in the API).

---

## 4. Keyboard Interactions

The component follows the [WAI-ARIA Combobox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) keyboard conventions.

| Key | Dropdown closed | Dropdown open |
|-----|----------------|---------------|
| `ArrowDown` | Opens the dropdown and highlights the first item | Moves highlight to the next item (wraps to first) |
| `ArrowUp` | Opens the dropdown and highlights the last item | Moves highlight to the previous item (wraps to last) |
| `Alt+ArrowDown` | Opens the dropdown without moving highlight | No additional effect |
| `Alt+ArrowUp` | No effect | Closes the dropdown, commits highlighted item |
| `Enter` | No effect (form submit behaviour is left to the host) | Selects the highlighted item. If no item highlighted, closes dropdown with current text. |
| `Escape` | No effect | Closes the dropdown. Input text is not changed. |
| `Tab` | Normal tab behaviour | Closes dropdown, commits highlighted item (if any), then moves focus |
| `Home` | Moves cursor to start of input text | Highlights the first item in the list |
| `End` | Moves cursor to end of input text | Highlights the last item in the list |
| `PageDown` | No effect | Scrolls the list down by one "page" (~10 visible items) |
| `PageUp` | No effect | Scrolls the list up by one "page" |
| Any printable character | Enters the character in the input, opens and filters dropdown | Enters the character in the input, updates filter |

---

## 5. Accessibility (ARIA)

The component implements the WAI-ARIA combobox pattern:

### 5.1 Roles and Attributes

| Element | Role / Attribute | Value |
|---------|-----------------|-------|
| Wrapper `<div>` | `role` | Not set (structural only) |
| Text input | `role` | `combobox` |
| Text input | `aria-expanded` | `true` when dropdown is open, `false` when closed |
| Text input | `aria-controls` | ID of the listbox element |
| Text input | `aria-activedescendant` | ID of the currently highlighted option, or empty |
| Text input | `aria-autocomplete` | `list` |
| Text input | `aria-haspopup` | `listbox` |
| Dropdown list | `role` | `listbox` |
| Each dropdown item | `role` | `option` |
| Each dropdown item | `id` | Unique ID (for `aria-activedescendant`) |
| Each dropdown item | `aria-selected` | `true` if currently highlighted |
| Toggle button | `aria-label` | "Toggle dropdown" |
| Toggle button | `tabindex` | `-1` (not in tab order; input receives focus) |

### 5.2 Screen Reader Announcements

- When the dropdown opens, screen readers announce the number of available options via `aria-expanded` state change.
- As the user navigates with arrow keys, the highlighted item is announced via `aria-activedescendant`.
- The "No matches" message uses `role="status"` so screen readers announce it when filter results change.

### 5.3 Focus Management

- Focus always remains on the text input. The dropdown list items are never directly focused; they are highlighted visually and indicated via `aria-activedescendant`.
- The toggle button has `tabindex="-1"` and is activated by mouse/touch only.

---

## 6. API

### 6.1 TypeScript Interface

```typescript
/**
 * Configuration options for the EditableComboBox component.
 */
interface ComboBoxOptions
{
    /** The items to display in the dropdown. */
    items: ComboBoxItem[];

    /** Placeholder text shown when the input is empty. */
    placeholder?: string;

    /** Initial value of the input. If it matches an item, that item is selected. */
    value?: string;

    /** When true, the user can only select values from the item list; free text is rejected. Default: false. */
    restrictToItems?: boolean;

    /** Maximum number of visible items before the dropdown scrolls. Default: 8. */
    maxVisibleItems?: number;

    /** Minimum characters before filtering begins. Default: 0 (filter immediately). */
    minFilterLength?: number;

    /** When true, the input and toggle are disabled. Default: false. */
    disabled?: boolean;

    /** When true, the input text is not editable but the dropdown can still open. Default: false. */
    readonly?: boolean;

    /** Size variant: "sm", "default", or "lg". Default: "default". */
    size?: "sm" | "default" | "lg";

    /** Custom filter function. Receives the search text and an item; returns true to include. */
    filterFn?: (searchText: string, item: ComboBoxItem) => boolean;

    /** Callback fired when the user selects an item from the dropdown. */
    onSelect?: (item: ComboBoxItem) => void;

    /** Callback fired whenever the input value changes (typing or selection). */
    onChange?: (value: string) => void;

    /** Callback fired when the dropdown opens. */
    onOpen?: () => void;

    /** Callback fired when the dropdown closes. */
    onClose?: () => void;
}

/**
 * Represents a single item in the combo box dropdown.
 */
interface ComboBoxItem
{
    /** The display text shown in the dropdown and committed to the input on selection. */
    label: string;

    /** An optional programmatic value distinct from the display label. */
    value?: string;

    /** When true, this item is shown but cannot be selected. Default: false. */
    disabled?: boolean;

    /** Optional grouping label. Items with the same group are displayed under a group header. */
    group?: string;
}
```

### 6.2 Class API

```typescript
class EditableComboBox
{
    /**
     * Creates a new EditableComboBox and renders it into the specified container.
     *
     * @param containerId - The ID of the DOM element to render into
     * @param options - Configuration options
     */
    constructor(containerId: string, options: ComboBoxOptions);

    /** Returns the current text value of the input. */
    getValue(): string;

    /** Returns the currently selected ComboBoxItem, or null if the input is free text. */
    getSelectedItem(): ComboBoxItem | null;

    /** Sets the input value programmatically. If it matches an item, that item is selected. */
    setValue(value: string): void;

    /** Replaces the dropdown items. Resets the filter. */
    setItems(items: ComboBoxItem[]): void;

    /** Opens the dropdown programmatically. */
    open(): void;

    /** Closes the dropdown programmatically. */
    close(): void;

    /** Enables the component. */
    enable(): void;

    /** Disables the component. */
    disable(): void;

    /** Removes the component from the DOM and cleans up event listeners. */
    destroy(): void;
}
```

### 6.3 Convenience Function

```typescript
/**
 * Creates an EditableComboBox in a single call.
 *
 * @param containerId - The DOM element ID to render into
 * @param options - Configuration options
 * @returns The EditableComboBox instance for further programmatic control
 */
function createEditableComboBox(
    containerId: string,
    options: ComboBoxOptions): EditableComboBox;
```

### 6.4 Global Exports

For consumers using `<script>` tags:

```typescript
window.EditableComboBox = EditableComboBox;
window.createEditableComboBox = createEditableComboBox;
```

---

## 7. HTML Structure (Rendered Output)

The component generates the following DOM structure inside the container element:

```html
<div class="combobox" id="combobox-1">
    <div class="input-group">
        <input
            type="text"
            class="form-control combobox-input"
            role="combobox"
            aria-expanded="false"
            aria-controls="combobox-1-listbox"
            aria-activedescendant=""
            aria-autocomplete="list"
            aria-haspopup="listbox"
            placeholder="Select or type..."
            autocomplete="off"
        >
        <button
            type="button"
            class="btn btn-outline-secondary combobox-toggle"
            tabindex="-1"
            aria-label="Toggle dropdown"
        >
            <i class="bi bi-chevron-down combobox-chevron"></i>
        </button>
    </div>
    <ul
        class="combobox-listbox"
        id="combobox-1-listbox"
        role="listbox"
        aria-label="Options"
        style="display: none;"
    >
        <!-- Group header (if items have groups) -->
        <li class="combobox-group-header" aria-hidden="true">Group Name</li>

        <!-- Regular item -->
        <li
            class="combobox-item"
            id="combobox-1-option-0"
            role="option"
            aria-selected="false"
        >
            Option text with <mark class="combobox-match">matched</mark> portion
        </li>

        <!-- Disabled item -->
        <li
            class="combobox-item combobox-item-disabled"
            id="combobox-1-option-1"
            role="option"
            aria-selected="false"
            aria-disabled="true"
        >
            Disabled option
        </li>

        <!-- No matches message -->
        <li class="combobox-no-matches" role="status">
            No matches found
        </li>
    </ul>
</div>
```

---

## 8. SCSS Styling

### 8.1 Class Naming

All classes are prefixed with `combobox-`:

| Class | Element |
|-------|---------|
| `.combobox` | Outer wrapper |
| `.combobox-input` | Text input |
| `.combobox-toggle` | Arrow button |
| `.combobox-chevron` | Chevron icon (rotates when open) |
| `.combobox-listbox` | Dropdown list |
| `.combobox-item` | Individual dropdown item |
| `.combobox-item-highlighted` | Currently highlighted item (keyboard/hover) |
| `.combobox-item-selected` | Item matching the current input value |
| `.combobox-item-disabled` | Disabled item |
| `.combobox-group-header` | Group heading |
| `.combobox-match` | Highlighted matched text within an item |
| `.combobox-no-matches` | "No matches" message |
| `.combobox-sm` | Small size variant (on `.combobox`) |
| `.combobox-lg` | Large size variant (on `.combobox`) |

### 8.2 Styling Rules

- All colours, fonts, spacing, and borders use SCSS variables from `_variables.scss`.
- No hardcoded hex values, pixel sizes, or font names.
- The dropdown (`combobox-listbox`) uses `position: absolute` and `z-index` to overlay page content.
- The chevron rotation uses a CSS transition (`transform: rotate(180deg)`) for smooth animation.
- The `combobox-match` element uses `background-color: transparent` and `font-weight: $font-weight-bold` to highlight matched text without changing layout.
- Scrolling within the listbox uses `overflow-y: auto` with a `max-height` calculated from `maxVisibleItems` and the item height.
- SCSS nesting is limited to 3 levels per `CODING_STYLE.md`.

---

## 9. Dropdown Positioning

- The dropdown appears **below** the input by default.
- If there is insufficient space below (near the bottom of the viewport), the dropdown appears **above** the input. This is calculated on open using `getBoundingClientRect()`.
- When positioned above, the class `combobox-listbox-above` is added to the listbox for styling (e.g., different box-shadow direction).

---

## 10. Item Grouping

Items with a `group` property are visually grouped:

- A non-selectable group header is rendered before each group's items.
- Group headers use `combobox-group-header` class and smaller, muted text.
- Groups are displayed in the order they first appear in the items array.
- When filtering, empty groups (where no items match) are hidden entirely.

---

## 11. Edge Cases

| Scenario | Behaviour |
|----------|-----------|
| Empty items array | Input is functional for free text. Dropdown does not open. |
| Single item | Dropdown opens with one item. No scrollbar. |
| Very long item text | Text is truncated with ellipsis (`text-overflow: ellipsis`). Full text shown in a `title` attribute. |
| Duplicate labels | Allowed. Each item is identified by its index, not its label. |
| Items added/removed after init | Use `setItems()`. The dropdown re-renders. If open, the filter is re-applied. |
| Input value set to non-matching text | `getSelectedItem()` returns `null`. `getValue()` returns the text. |
| `restrictToItems` with free text | On blur, if the input text does not match any item, the input reverts to the last valid selection (or empty). A `console.warn` is logged. |
| Container not found | `console.error` is logged. Component is not rendered. |
| Component disabled during open dropdown | Dropdown closes immediately. |

---

## 12. Performance

- **Large lists (1000+ items):** The component renders only visible items using a simple windowing approach — the listbox renders items in the visible scroll range plus a small buffer. This prevents DOM bloat for very large lists.
- **Filtering debounce:** Filtering is applied synchronously for lists under 500 items. For larger lists, a 150ms debounce is applied to the input event to prevent UI jank during rapid typing.
- **DOM recycling:** When filtering changes the visible items, existing DOM nodes are updated in place where possible rather than destroyed and recreated.

---

## 13. Testing Requirements

### 13.1 Unit Tests (Jest/Vitest with jsdom)

| Test Case | Category |
|-----------|----------|
| `constructor_WithValidContainer_RendersComponent` | Initialisation |
| `constructor_WithMissingContainer_LogsError` | Error handling |
| `constructor_WithItems_RendersInputAndToggle` | Initialisation |
| `open_WhenClosed_ShowsDropdownWithAllItems` | Dropdown |
| `open_WhenDisabled_DoesNotOpen` | State |
| `close_WhenOpen_HidesDropdown` | Dropdown |
| `filterInput_WithSubstring_FiltersItems` | Filtering |
| `filterInput_CaseInsensitive_MatchesRegardlessOfCase` | Filtering |
| `filterInput_NoMatches_ShowsNoMatchesMessage` | Filtering |
| `filterInput_EmptyText_ShowsAllItems` | Filtering |
| `selectItem_ByClick_SetsValueAndCloses` | Selection |
| `selectItem_ByEnter_SetsValueAndCloses` | Selection |
| `keyboard_ArrowDown_HighlightsNextItem` | Keyboard |
| `keyboard_ArrowUp_HighlightsPreviousItem` | Keyboard |
| `keyboard_Escape_ClosesDropdownOnly` | Keyboard |
| `keyboard_Tab_CommitsAndMovesFocus` | Keyboard |
| `getValue_AfterSelection_ReturnsItemLabel` | API |
| `getValue_AfterFreeText_ReturnsTypedText` | API |
| `getSelectedItem_WithMatchingText_ReturnsItem` | API |
| `getSelectedItem_WithFreeText_ReturnsNull` | API |
| `setValue_WithMatchingItem_SelectsItem` | API |
| `setItems_WhileOpen_RefiltersDropdown` | API |
| `disable_WhileOpen_ClosesDropdown` | State |
| `destroy_RemovesFromDOM_CleansUpListeners` | Lifecycle |
| `restrictToItems_WithInvalidText_RevertsOnBlur` | Restriction |
| `groupedItems_RendersGroupHeaders` | Grouping |
| `aria_Attributes_AreCorrectlySet` | Accessibility |

### 13.2 Visual Verification

After implementation, visually verify in the demo page:

- Default, small, and large size variants render correctly
- Dropdown opens below the input, aligned to full width
- Typing filters the list with matched text highlighted
- Arrow key navigation highlights items and scrolls into view
- Escape closes without changing the value
- Disabled and readonly states look and behave correctly
- Focus ring is visible on the input during keyboard navigation
- Grouped items show headers correctly
- Long text is truncated with ellipsis

### 13.3 Cross-Browser

Test in Chrome, Firefox, Safari, and Edge for consistent rendering and keyboard behaviour.

---

## 14. Demo Page Integration

Add a section to `demo/index.html` titled "Editable Combo Box" that demonstrates:

1. **Basic combo box** — A list of 10-15 countries with free text enabled.
2. **Restricted combo box** — A list of statuses (Active, Pending, Inactive) with `restrictToItems: true`.
3. **Grouped combo box** — Items grouped by continent or category.
4. **Size variants** — Small, default, and large side by side.
5. **Disabled and readonly** — One disabled, one readonly instance.
6. **Programmatic control** — Buttons that call `setValue()`, `setItems()`, `getValue()`, `open()`, `close()` to demonstrate the API.
7. **Large list** — A combo box with 200+ items to demonstrate scrolling and performance.

---

## 15. File Structure

```
components/
└── editablecombobox/
    ├── editablecombobox.ts          # Component logic
    ├── editablecombobox.scss        # Component styles
    ├── editablecombobox.test.ts     # Unit tests
    └── README.md                    # Component documentation
```

Output in `dist/`:

```
dist/
└── components/
    └── editablecombobox/
        ├── editablecombobox.js      # Compiled JavaScript
        ├── editablecombobox.css     # Compiled CSS
        └── editablecombobox.d.ts    # TypeScript declarations
```

---

## 16. Dependencies

| Dependency | Required | Notes |
|------------|----------|-------|
| Bootstrap 5 CSS | Yes | For `input-group`, `form-control`, `btn` base styles |
| Bootstrap 5 JS | No | This component does not use Bootstrap JS plugins |
| Bootstrap Icons | Yes | For `bi-chevron-down` icon |
| Enterprise Theme CSS | Yes | For theme variable overrides |

---

## 17. Definition of Done

- [ ] TypeScript component compiles without errors
- [ ] SCSS compiles without errors via `npm run build`
- [ ] All unit tests pass
- [ ] Component renders correctly in `demo/index.html`
- [ ] All keyboard interactions work as specified
- [ ] ARIA attributes are correct (verified with axe-core or manual inspection)
- [ ] Focus states are visible
- [ ] Component respects disabled and readonly states
- [ ] `COMPONENTS.md` is updated with the new component entry
- [ ] `agentknowledge/concepts.yaml` is updated
- [ ] `CONVERSATION.md` is updated
- [ ] Code committed to git
