<!-- AGENT: Product Requirements Document for the Tagger component — combined freeform and controlled-vocabulary tag input with autocomplete, colored chips, and taxonomy categories. -->

# Tagger Component

**Status:** Draft
**Component name:** Tagger
**Folder:** `./components/tagger/`
**Spec author:** Agent
**Date:** 2026-02-20

---

## 1. Overview

### 1.1 What Is It

A combined freeform and controlled-vocabulary tag input component for labelling, classifying, and annotating entities within enterprise SaaS applications. The Tagger renders selected tags as colored chips inside a container that also contains a text input. As the user types, an autocomplete dropdown presents suggestions drawn from two sources:

- **Taxonomy tags** -- predefined categories with allowed values. Each category has a name, color, optional icon, and a list of permitted values. The dropdown groups suggestions by category with colored headers.
- **Freeform tags** -- arbitrary user-entered text. When `allowFreeform` is true, typing a value that does not match any taxonomy entry and pressing Enter creates a new uncategorized tag.

Tags appear as chips with optional category prefix badges (e.g., "[Priority] High"), a remove button, and color coding derived from the category, a deterministic hash, or no color at all depending on the configured `colorMode`.

The Tagger supports:

- **Autocomplete dropdown** -- combines taxonomy suggestions and recent freeform tags, filtered by the current input text.
- **Category prefix badges** -- colored badges on chips showing the category name for taxonomy tags.
- **Color coding** -- by category color (taxonomy), deterministic string hash (freeform), or none.
- **Tag validation** -- optional regex or callback validator before tag creation.
- **Max tags limit** -- configurable upper bound on total tags or per-category tags.
- **Duplicate prevention** -- rejects or silently ignores duplicate tags.
- **Disabled and readonly modes** -- standard interaction states.
- **Full keyboard interaction** -- type to filter, arrow keys to navigate, Enter to select or create, Backspace to remove.

### 1.2 Why Build It

Enterprise SaaS applications frequently need tagging for:

- Issue trackers (priority, type, status, sprint labels)
- Content management systems (categories, topics, keywords)
- Knowledge bases (subject taxonomy, freeform keywords)
- Asset management (classification, custom metadata tags)
- Project management (labels, milestones, assignee tags)
- Customer support (ticket tags, topic classification)
- Data catalogues (schema tags, sensitivity classification, ownership)

No existing open-source library meets all requirements. Tag input libraries like Tagify, react-tag-input, or select2 either depend on jQuery/React, lack taxonomy grouping, lack Bootstrap 5 theming, or lack the combined freeform + controlled-vocabulary model. Building custom ensures alignment with the project's zero-dependency, IIFE-wrapped, Bootstrap 5 themed architecture.

### 1.3 Design Inspiration

| Source | Key Pattern Adopted |
|--------|---------------------|
| Notion Tags Property | Colored tag chips, inline creation, autocomplete with existing tags |
| Jira Labels | Freeform labels with color coding, autocomplete suggestions |
| GitHub Labels | Category-organized labels with configurable colors, multi-select |
| Linear Labels | Grouped labels with category headers, colored dots |
| Stack Overflow Tags | Autocomplete, tag limit, inline creation with validation |
| WordPress Tags/Categories | Dual freeform + taxonomy model, category hierarchy |
| Figma Design Tokens | Chip-style display with prefix badges, remove buttons |

### 1.4 Open Source Evaluation

| Library | Verdict | Reason |
|---------|---------|--------|
| Tagify | Useful reference | MIT, vanilla JS, 30KB; good chip UI and autocomplete. No taxonomy grouping, no category badges. |
| select2 | Not recommended | jQuery dependency; heavyweight; no chip-style tags with category prefixes. |
| Choices.js | Useful reference | MIT, vanilla JS, 20KB; clean dropdown. No taxonomy categories, no freeform + controlled hybrid. |
| react-tag-input | Not recommended | React-only; no vanilla JS support. |
| Bootstrap Tags Input | Not recommended | Unmaintained (2016); Bootstrap 3; no autocomplete grouping. |
| Tom Select | Useful reference | MIT, vanilla JS, plugin architecture. No taxonomy grouping, no category prefix badges. |

**Decision:** Build custom. No single library provides the combined freeform + taxonomy model with category badges, grouped autocomplete, color modes, and Bootstrap 5 theming. Building custom ensures full control over the chip rendering, dropdown grouping, and validation pipeline.

---

## 2. Use Cases

| # | Use Case | Description | Freeform | Taxonomy | Key Features |
|---|----------|-------------|----------|----------|--------------|
| 1 | Issue tracker labels | Apply priority, type, and custom labels to tickets | Yes | Priority, Type, Status | Category badges, max per category, color by category |
| 2 | Content tagging | Add topics and keywords to articles | Yes | Topics | Freeform creation, autocomplete from recent tags |
| 3 | Data classification | Apply sensitivity and compliance tags to datasets | No | Sensitivity, Compliance, Region | Taxonomy-only, no freeform, validation |
| 4 | Project labels | Label tasks with sprint, assignee, and custom tags | Yes | Sprint, Team | Mixed freeform + taxonomy, duplicate prevention |
| 5 | Asset metadata | Tag media assets with descriptive keywords | Yes | None | Freeform-only, hash color mode, max tags limit |
| 6 | Customer support | Classify support tickets by topic and urgency | Yes | Urgency, Department | Category badges, per-category limits |

---

## 3. Anatomy

### 3.1 Full Component

```
┌──────────────────────────────────────────────────────────────┐
│ [Priority│High ✕] [Type│Bug ✕] [custom-tag ✕] [Add tag...__]│
└──────────────────────────────────────────────────────────────┘
  ┌──────────────────────────────────────────────────┐
  │   Priority                                        │ ← category header
  │   ○ Critical                                      │
  │   ● High (already added)                          │
  │   ○ Medium                                        │
  │   ○ Low                                           │
  │   Type                                            │ ← category header
  │   ● Bug (already added)                           │
  │   ○ Feature                                       │
  │   ○ Chore                                         │
  │──────────────────────────────────────────────────│
  │   Create "my-new-tag"                     [Enter] │ ← freeform creation
  └──────────────────────────────────────────────────┘
```

### 3.2 Tag Chip Detail

```
Taxonomy chip:
  ┌─────────────────────────────────┐
  │ [■ Priority] High            [✕]│
  └─────────────────────────────────┘

  ■              — category color dot
  Priority       — category badge (when showCategoryBadge: true)
  High           — tag value
  ✕              — remove button

Freeform chip:
  ┌─────────────────────────────────┐
  │ custom-tag                   [✕]│
  └─────────────────────────────────┘
```

### 3.3 Element Breakdown

| Element | Required | Description |
|---------|----------|-------------|
| Root container | Yes | `div.tagger` wrapping the entire component |
| Tag list | Yes | Inline flex container holding tag chips and the input |
| Tag chip | Conditional | `span.tagger-chip` for each added tag |
| Category badge | Optional | `span.tagger-chip-badge` showing category name with color |
| Tag label | Yes (per chip) | `span.tagger-chip-label` with the tag value text |
| Remove button | Configurable | `button.tagger-chip-remove` (X) to remove the tag |
| Text input | Yes | `input.tagger-input` for typing tags and filtering |
| Dropdown | Conditional | `div.tagger-dropdown` with autocomplete suggestions |
| Category header | Optional | `div.tagger-dropdown-header` for taxonomy group headings |
| Dropdown item | Conditional | `div.tagger-dropdown-item` for each suggestion |
| Already-added indicator | Conditional | Visual mark on dropdown items for tags already present |
| Freeform create row | Conditional | `div.tagger-dropdown-create` for "Create [value]" action |
| Validation error | Conditional | `div.tagger-error` for inline validation messages |
| Live region | Yes | `div[aria-live="polite"]` for screen reader announcements |

---

## 4. API

### 4.1 Interfaces

```typescript
/** Defines a taxonomy category with allowed tag values. */
interface TagCategory
{
    /** Unique identifier for this category. */
    id: string;

    /** Display label for the category (shown in badges and dropdown headers). */
    label: string;

    /** CSS color for the category badge and chip accent. */
    color?: string;

    /** Allowed tag values within this category. */
    values: string[];

    /** Allow values not in the predefined list. Default: false. */
    allowFreeform?: boolean;

    /** Bootstrap Icons class for the category (e.g., "bi-flag"). */
    icon?: string;

    /** Maximum number of tags from this category. 0 = unlimited. Default: 0. */
    maxTags?: number;
}

/** Represents a single tag applied to the component. */
interface TagItem
{
    /** The tag value text. */
    value: string;

    /** Category ID (for taxonomy tags). Omitted for freeform tags. */
    category?: string;

    /** Override color for this specific tag. */
    color?: string;

    /** Arbitrary consumer data attached to this tag. */
    data?: Record<string, unknown>;
}

/** Configuration options for the Tagger component. */
interface TaggerOptions
{
    /** Initial tags. Default: []. */
    tags?: TagItem[];

    /** Controlled vocabulary categories. Default: []. */
    taxonomy?: TagCategory[];

    /** Allow uncategorized freeform tags. Default: true. */
    allowFreeform?: boolean;

    /** Maximum total tags. 0 = unlimited. Default: 0. */
    maxTags?: number;

    /** Placeholder text for the input. Default: "Add tag...". */
    placeholder?: string;

    /**
     * Color mode for tag chips.
     * - "category": use category color for taxonomy tags, gray for freeform.
     * - "hash": deterministic color from string hash for all tags.
     * - "none": no color accents, uniform neutral chips.
     * Default: "category".
     */
    colorMode?: "category" | "hash" | "none";

    /**
     * Tag validator. Called before a tag is added.
     * Return true to accept, or a string error message to reject.
     */
    validator?: (value: string) => boolean | string;

    /**
     * Duplicate handling mode.
     * - "reject": show validation error on duplicate attempt.
     * - "ignore": silently discard duplicates without error.
     * Default: "reject".
     */
    duplicateMode?: "reject" | "ignore";

    /** Show category prefix badge on taxonomy chips. Default: true. */
    showCategoryBadge?: boolean;

    /** Component size variant. Default: "default". */
    size?: "sm" | "default" | "lg";

    /** Disable the entire component. Default: false. */
    disabled?: boolean;

    /** Readonly mode — tags are visible but cannot be added or removed. Default: false. */
    readonly?: boolean;

    /** Additional CSS class(es) on the root element. */
    cssClass?: string;

    /** Maximum visible items in the autocomplete dropdown before scrolling. Default: 8. */
    maxDropdownItems?: number;

    /** Minimum characters before autocomplete activates. Default: 0. */
    minFilterLength?: number;

    /** Debounce delay in milliseconds for input filtering. Default: 150. */
    filterDebounceMs?: number;

    /** Callback fired when a tag is added. */
    onAdd?: (tag: TagItem) => void;

    /** Callback fired when a tag is removed. */
    onRemove?: (tag: TagItem) => void;

    /** Callback fired when the tags array changes (add, remove, clear, setTags). */
    onChange?: (tags: TagItem[]) => void;

    /** Callback fired when validation rejects a tag. */
    onValidationError?: (value: string, error: string) => void;
}
```

### 4.2 Class: Tagger

| Method | Signature | Description |
|--------|-----------|-------------|
| `constructor` | `(options: TaggerOptions)` | Creates the Tagger DOM but does not attach to the page. |
| `show` | `(containerId: string)` | Renders the component into the specified container element. |
| `hide` | `()` | Removes from DOM without destroying state. |
| `destroy` | `()` | Hides, releases all references and event listeners. |
| `getElement` | `(): HTMLElement` | Returns the root DOM element. |
| `getTags` | `(): TagItem[]` | Returns a copy of the current tags array. |
| `setTags` | `(tags: TagItem[])` | Replaces all tags. Fires `onChange`. |
| `addTag` | `(tag: TagItem): boolean` | Adds a tag. Returns false if rejected (duplicate, validation, limit). Fires `onAdd` and `onChange` on success. |
| `removeTag` | `(value: string, category?: string): boolean` | Removes a tag by value and optional category. Returns false if not found. Fires `onRemove` and `onChange` on success. |
| `clearTags` | `()` | Removes all tags. Fires `onChange`. |
| `hasTag` | `(value: string, category?: string): boolean` | Returns true if the tag exists. |
| `getTagsByCategory` | `(categoryId: string): TagItem[]` | Returns all tags belonging to the specified category. |
| `focus` | `()` | Moves focus to the text input. |
| `enable` | `()` | Enables the component. |
| `disable` | `()` | Disables the component. |

### 4.3 Convenience Functions

| Function | Description |
|----------|-------------|
| `createTagger(containerId, options)` | Creates, renders into the container, and returns a Tagger instance. |

### 4.4 Global Exports

```typescript
window.Tagger = Tagger;
window.createTagger = createTagger;
```

---

## 5. Behaviour

### 5.1 Lifecycle

1. **Construction** -- Builds the internal DOM tree from `options` but does not attach to the page.
2. **show(containerId)** -- Appends to the specified container element.
3. **hide()** -- Removes from DOM. State (tags, options) is preserved.
4. **destroy()** -- Calls hide, removes all event listeners, nulls references.

### 5.2 Tag Addition Pipeline

When the user attempts to add a tag (via Enter, click on dropdown item, or programmatic `addTag()`):

1. **Trim** -- Whitespace is trimmed from the value. Empty strings are rejected silently.
2. **Duplicate check** -- If `hasTag(value, category)` returns true:
   - `duplicateMode: "reject"`: fire `onValidationError(value, "Tag already exists")`. Briefly flash the existing chip. Do not add.
   - `duplicateMode: "ignore"`: silently discard. Do not add. No error.
3. **Max tags check** -- If `maxTags > 0` and `getTags().length >= maxTags`, fire `onValidationError(value, "Maximum tags reached")`. Do not add.
4. **Per-category max check** -- If the tag has a `category` and that category's `maxTags > 0` and `getTagsByCategory(category).length >= maxTags`, fire `onValidationError(value, "Maximum tags for [category] reached")`. Do not add.
5. **Validator** -- If `options.validator` is set, call `validator(value)`:
   - Returns `true`: proceed.
   - Returns a string: fire `onValidationError(value, errorString)`. Do not add.
6. **Add** -- Append the `TagItem` to the internal tags array. Render a new chip in the DOM. Fire `onAdd(tag)` then `onChange(tags)`.
7. **Clear input** -- Reset the text input to empty. Close the dropdown.

### 5.3 Tag Removal

When the user clicks the remove button on a chip, or calls `removeTag()`:

1. Remove the `TagItem` from the internal tags array.
2. Remove the chip DOM element with a brief fade-out (100ms).
3. Fire `onRemove(tag)` then `onChange(tags)`.
4. If the dropdown is open, update it (the removed tag is no longer marked as "already added").

### 5.4 Autocomplete Dropdown

The dropdown opens when the user focuses the input and types (or immediately on focus if `minFilterLength` is 0).

#### 5.4.1 Suggestion Sources

The dropdown combines suggestions from two sources:

1. **Taxonomy values** -- All values from all categories in `options.taxonomy`, grouped by category. Each category appears as a colored header followed by its matching values.
2. **Freeform creation** -- If `allowFreeform` is true and the input text does not exactly match any taxonomy value, a "Create [value]" row appears at the bottom of the dropdown separated by a divider.

#### 5.4.2 Filtering

- As the user types, suggestions are filtered by case-insensitive substring match against the tag value.
- Matching text within suggestion items is highlighted with `<mark class="tagger-highlight">`.
- Categories with no matching values after filtering are hidden entirely.
- If no suggestions match and freeform is disabled, the dropdown shows "No matching tags".

#### 5.4.3 Already-Added Indicators

Taxonomy values that are already present in the tags array are shown with a check mark icon (`bi-check`) and muted text styling. Clicking an already-added item removes it (toggle behaviour).

#### 5.4.4 Dropdown Positioning

- The dropdown appears below the tag container by default.
- If insufficient space exists below, it flips above the container.
- Width matches the full container width.

### 5.5 Freeform Tag Creation

When `allowFreeform` is true:

1. The user types a value that does not match any taxonomy entry.
2. The dropdown shows a "Create [typed-value]" option at the bottom.
3. Pressing Enter or clicking the create option adds a new freeform `TagItem` (no `category` property).
4. The freeform tag runs through the full addition pipeline (validation, duplicate check, max limit).

When `allowFreeform` is false:

1. The user can only select values from the taxonomy dropdown.
2. Pressing Enter with non-matching text has no effect.
3. No "Create" option appears in the dropdown.

### 5.6 Color Modes

#### 5.6.1 Category Mode (`colorMode: "category"`)

- Taxonomy tags use the `TagCategory.color` as the chip's left border and badge background.
- Freeform tags use a neutral `$gray-400` left border with no badge.
- Individual `TagItem.color` overrides take precedence.

#### 5.6.2 Hash Mode (`colorMode: "hash"`)

- All tags (taxonomy and freeform) receive a color derived from a deterministic hash of the tag value string.
- The hash function maps strings to a palette of 12 distinct, accessible colors.
- Same tag value always produces the same color across sessions and instances.
- The hash palette: `["#1c7ed6", "#2b8a3e", "#e67700", "#c92a2a", "#862e9c", "#0b7285", "#5c940d", "#d9480f", "#364fc7", "#087f5b", "#9c36b5", "#e03131"]`.

#### 5.6.3 None Mode (`colorMode: "none"`)

- All chips are uniform neutral style with `$gray-300` border, no colored accents.
- Category badges still show text but without colored backgrounds.

### 5.7 Disabled and Readonly States

**Disabled** (`disabled: true`):

- Input is not focusable.
- Chips are dimmed (0.5 opacity).
- Remove buttons are hidden.
- Dropdown does not open.
- All API mutators (`addTag`, `removeTag`, `clearTags`, `setTags`) are no-ops.

**Readonly** (`readonly: true`):

- Input is hidden.
- Chips are visible at full opacity but remove buttons are hidden.
- Dropdown does not open.
- All API mutators are no-ops.

### 5.8 Chip Flash on Duplicate

When `duplicateMode: "reject"` and a duplicate is attempted:

1. The existing chip for the duplicate tag receives the class `.tagger-chip-flash`.
2. The chip briefly pulses with a highlight animation (200ms scale + background flash).
3. The class is removed after the animation completes.
4. This gives the user visual feedback that the tag already exists.

---

## 6. DOM Structure

### 6.1 Full Component

```html
<div class="tagger" id="tagger-1">

    <!-- Tag chips + input wrapper -->
    <div class="tagger-wrap" role="group" aria-label="Tags">

        <!-- Taxonomy chip with category badge -->
        <span class="tagger-chip" data-value="High" data-category="priority"
              role="listitem">
            <span class="tagger-chip-badge"
                  style="background-color: #c92a2a;">
                Priority
            </span>
            <span class="tagger-chip-label">High</span>
            <button class="tagger-chip-remove" type="button"
                    aria-label="Remove tag High"
                    tabindex="-1">
                <i class="bi bi-x"></i>
            </button>
        </span>

        <!-- Taxonomy chip without badge (showCategoryBadge: false) -->
        <span class="tagger-chip" data-value="Bug" data-category="type"
              role="listitem"
              style="border-left-color: #1c7ed6;">
            <span class="tagger-chip-label">Bug</span>
            <button class="tagger-chip-remove" type="button"
                    aria-label="Remove tag Bug"
                    tabindex="-1">
                <i class="bi bi-x"></i>
            </button>
        </span>

        <!-- Freeform chip -->
        <span class="tagger-chip tagger-chip-freeform" data-value="custom-tag"
              role="listitem">
            <span class="tagger-chip-label">custom-tag</span>
            <button class="tagger-chip-remove" type="button"
                    aria-label="Remove tag custom-tag"
                    tabindex="-1">
                <i class="bi bi-x"></i>
            </button>
        </span>

        <!-- Text input -->
        <input class="tagger-input" type="text"
               role="combobox"
               aria-expanded="false"
               aria-controls="tagger-1-dropdown"
               aria-activedescendant=""
               aria-autocomplete="list"
               aria-haspopup="listbox"
               placeholder="Add tag..."
               autocomplete="off">
    </div>

    <!-- Autocomplete dropdown -->
    <div class="tagger-dropdown" id="tagger-1-dropdown"
         role="listbox" aria-label="Tag suggestions"
         style="display: none;">

        <!-- Category group -->
        <div class="tagger-dropdown-group" role="group"
             aria-label="Priority">
            <div class="tagger-dropdown-header">
                <span class="tagger-dropdown-header-dot"
                      style="background-color: #c92a2a;"></span>
                Priority
            </div>
            <div class="tagger-dropdown-item" role="option"
                 id="tagger-1-opt-priority-critical"
                 aria-selected="false"
                 data-value="Critical" data-category="priority">
                Critical
            </div>
            <div class="tagger-dropdown-item tagger-dropdown-item-added"
                 role="option"
                 id="tagger-1-opt-priority-high"
                 aria-selected="false"
                 data-value="High" data-category="priority">
                <i class="bi bi-check tagger-dropdown-check"></i>
                High
            </div>
            <div class="tagger-dropdown-item" role="option"
                 id="tagger-1-opt-priority-medium"
                 aria-selected="false"
                 data-value="Medium" data-category="priority">
                Medium
            </div>
            <div class="tagger-dropdown-item" role="option"
                 id="tagger-1-opt-priority-low"
                 aria-selected="false"
                 data-value="Low" data-category="priority">
                Low
            </div>
        </div>

        <!-- Another category group -->
        <div class="tagger-dropdown-group" role="group"
             aria-label="Type">
            <div class="tagger-dropdown-header">
                <span class="tagger-dropdown-header-dot"
                      style="background-color: #1c7ed6;"></span>
                Type
            </div>
            <div class="tagger-dropdown-item tagger-dropdown-item-added"
                 role="option"
                 id="tagger-1-opt-type-bug"
                 aria-selected="false"
                 data-value="Bug" data-category="type">
                <i class="bi bi-check tagger-dropdown-check"></i>
                Bug
            </div>
            <div class="tagger-dropdown-item" role="option"
                 id="tagger-1-opt-type-feature"
                 aria-selected="false"
                 data-value="Feature" data-category="type">
                Feature
            </div>
            <div class="tagger-dropdown-item" role="option"
                 id="tagger-1-opt-type-chore"
                 aria-selected="false"
                 data-value="Chore" data-category="type">
                Chore
            </div>
        </div>

        <!-- Divider before freeform creation -->
        <div class="tagger-dropdown-divider" role="separator"></div>

        <!-- Freeform creation row -->
        <div class="tagger-dropdown-create" role="option"
             id="tagger-1-opt-create"
             aria-selected="false">
            Create "<strong>my-new-tag</strong>"
            <span class="tagger-dropdown-create-hint">Enter</span>
        </div>
    </div>

    <!-- Validation error (shown transiently) -->
    <div class="tagger-error" role="alert" style="display: none;">
        Tag already exists
    </div>

    <!-- Screen reader live region -->
    <div class="visually-hidden" aria-live="polite" aria-atomic="true"></div>
</div>
```

### 6.2 Readonly State

```html
<div class="tagger tagger-readonly" id="tagger-2">
    <div class="tagger-wrap" role="group" aria-label="Tags">
        <span class="tagger-chip" data-value="High" data-category="priority"
              role="listitem">
            <span class="tagger-chip-badge"
                  style="background-color: #c92a2a;">
                Priority
            </span>
            <span class="tagger-chip-label">High</span>
            <!-- No remove button in readonly mode -->
        </span>
        <!-- No input in readonly mode -->
    </div>
</div>
```

### 6.3 Disabled State

```html
<div class="tagger tagger-disabled" id="tagger-3">
    <div class="tagger-wrap" role="group" aria-label="Tags">
        <span class="tagger-chip tagger-chip-disabled" data-value="High"
              data-category="priority" role="listitem">
            <span class="tagger-chip-badge"
                  style="background-color: #c92a2a;">
                Priority
            </span>
            <span class="tagger-chip-label">High</span>
            <!-- Remove button hidden in disabled mode -->
        </span>
        <input class="tagger-input" type="text" disabled
               placeholder="Add tag..." autocomplete="off">
    </div>
</div>
```

---

## 7. Styling

### 7.1 CSS Classes

All classes use the `.tagger-` prefix.

| Class | Description |
|-------|-------------|
| `.tagger` | Root container |
| `.tagger-sm` | Small size variant |
| `.tagger-lg` | Large size variant |
| `.tagger-disabled` | Disabled state on root |
| `.tagger-readonly` | Readonly state on root |
| `.tagger-focused` | Root modifier when input is focused |
| `.tagger-wrap` | Flex-wrap container for chips and input |
| `.tagger-chip` | Individual tag chip |
| `.tagger-chip-freeform` | Freeform (uncategorized) chip modifier |
| `.tagger-chip-badge` | Category prefix badge within a chip |
| `.tagger-chip-label` | Tag value text within a chip |
| `.tagger-chip-remove` | Remove (X) button within a chip |
| `.tagger-chip-flash` | Temporary animation class for duplicate feedback |
| `.tagger-chip-disabled` | Disabled chip appearance |
| `.tagger-input` | Text input for typing tags |
| `.tagger-dropdown` | Autocomplete dropdown container |
| `.tagger-dropdown-group` | Category group within the dropdown |
| `.tagger-dropdown-header` | Category header row in the dropdown |
| `.tagger-dropdown-header-dot` | Colored dot before the category name |
| `.tagger-dropdown-item` | Individual suggestion item |
| `.tagger-dropdown-item-highlighted` | Keyboard/hover highlighted item |
| `.tagger-dropdown-item-added` | Item already present in tags (check mark, muted) |
| `.tagger-dropdown-check` | Check mark icon on already-added items |
| `.tagger-dropdown-divider` | Separator line before the freeform creation row |
| `.tagger-dropdown-create` | "Create [value]" freeform creation row |
| `.tagger-dropdown-create-hint` | "Enter" hint badge on the create row |
| `.tagger-dropdown-empty` | "No matching tags" message |
| `.tagger-highlight` | `<mark>` element for search match highlighting |
| `.tagger-error` | Validation error message |

### 7.2 Theme Integration

| Property | Value | Source / Rationale |
|----------|-------|---------------------|
| Container background | `$gray-50` | Light, form-like background |
| Container border | `1px solid $gray-300` | Matches Bootstrap `form-control` border |
| Container border (focused) | `1px solid $blue-500` | Bootstrap focus ring colour |
| Container box-shadow (focused) | `0 0 0 0.2rem rgba($blue-500, 0.25)` | Bootstrap focus shadow |
| Chip background | `$gray-100` | Subtle chip background |
| Chip border | `1px solid $gray-300` | Clean chip outline |
| Chip border-left (category) | `3px solid [category.color]` | Category accent stripe |
| Chip text | `$gray-900` | Primary text colour |
| Chip padding | `2px 6px 2px 4px` | Compact chip sizing |
| Chip font | `$font-size-sm` (0.8rem) | Compact readable text |
| Badge background | `[category.color]` | Category identification |
| Badge text | `$gray-50` (or auto-contrast) | Readable on colored background |
| Badge font | `$font-size-xs` (0.7rem), `$font-weight-semibold` | Compact category label |
| Badge padding | `1px 5px` | Tight badge sizing |
| Remove button | `$gray-500`, hover `$gray-700` | Subtle dismiss affordance |
| Remove button size | 14px icon | Compact |
| Input background | `transparent` | Seamless with container |
| Input text | `$gray-900` | Standard input text |
| Input placeholder | `$gray-500` | Standard placeholder colour |
| Dropdown background | `$gray-50` | Matches container |
| Dropdown border | `1px solid $gray-300` | Standard dropdown border |
| Dropdown shadow | `0 2px 8px rgba($gray-900, 0.12)` | Subtle elevation |
| Dropdown item hover | `$gray-100` background | Standard highlight |
| Dropdown item added | `$gray-500` text, check icon | Already-present indicator |
| Dropdown header | `$gray-600`, `$font-size-xs`, `$font-weight-semibold` | Subdued category heading |
| Dropdown header dot | 8px circle, `[category.color]` | Category identification |
| Create row | `$blue-600` text, `$font-weight-semibold` | Action-like appearance |
| Create hint badge | `$gray-200` background, `$gray-600` text, `$font-size-xs` | Keyboard hint |
| Validation error | `$red-600` text, `$font-size-sm` | Error feedback |
| Highlight `<mark>` | `$yellow-100` background | Standard mark styling |
| Disabled opacity | 0.5 | Standard disabled pattern |

### 7.3 Size Variants

| Size | Container padding | Chip height | Input height | Font size |
|------|-------------------|-------------|-------------|-----------|
| Small (`sm`) | `3px 4px` | 22px | 22px | `$font-size-sm` |
| Default | `4px 6px` | 26px | 26px | `$font-size-base` |
| Large (`lg`) | `6px 8px` | 32px | 32px | `$font-size-lg` |

### 7.4 Z-Index

| Element | Z-Index | Rationale |
|---------|---------|-----------|
| Tagger container | Auto (flow) | Normal stacking context |
| Dropdown | 1050 | Above page content, matches Bootstrap dropdown tier |
| Validation error | Auto | Positioned below container in flow |

### 7.5 Transitions and Animations

| Property | Duration | Easing | Description |
|----------|----------|--------|-------------|
| Chip appearance | 150ms | ease-out | Scale from 0.9 to 1.0 + opacity 0 to 1 |
| Chip removal | 100ms | ease-in | Opacity 1 to 0 + scale 1.0 to 0.9 |
| Chip flash (duplicate) | 200ms | ease | Background pulse + scale 1.0 to 1.05 to 1.0 |
| Dropdown open | 100ms | ease-out | Opacity 0 to 1 |
| Dropdown close | 80ms | ease-in | Opacity 1 to 0 |
| Container focus ring | 150ms | ease | Border + shadow transition |
| Validation error | 200ms | ease | Slide-down + opacity |

### 7.6 Reduced Motion

A `prefers-reduced-motion: reduce` media query disables scale and slide transforms. Chip add/remove and dropdown open/close use instant opacity transitions only.

---

## 8. Keyboard Interaction

### 8.1 Input Focused

| Key | Dropdown Closed | Dropdown Open |
|-----|----------------|---------------|
| **Any printable character** | Types into input, opens dropdown with filter | Types into input, updates filter |
| **ArrowDown** | Opens dropdown, highlights first item | Highlights next item (wraps to first) |
| **ArrowUp** | Opens dropdown, highlights last item | Highlights previous item (wraps to last) |
| **Enter** | No effect | Selects highlighted item. If no item highlighted and freeform allowed, creates freeform tag from input text. |
| **Escape** | No effect | Closes dropdown, clears input text |
| **Backspace** (input empty) | Removes the last tag chip | Removes the last tag chip |
| **Tab** | Moves focus out of component | Closes dropdown, moves focus out |
| **Shift+Tab** | Moves focus to previous element | Closes dropdown, moves focus to previous element |
| **Home** | Cursor to start of input | Highlights first dropdown item |
| **End** | Cursor to end of input | Highlights last dropdown item |

### 8.2 Chip Focus

When Tab is used to navigate among chip remove buttons (via sequential Tab presses after focus enters the component):

| Key | Action |
|-----|--------|
| **Enter / Space** | Activates the focused remove button (removes the tag) |
| **Tab** | Moves to the next chip's remove button, or the input |
| **Shift+Tab** | Moves to the previous chip's remove button |

---

## 9. Accessibility

### 9.1 ARIA Roles and Attributes

| Element | Attribute | Value |
|---------|-----------|-------|
| `.tagger-wrap` | `role` | `"group"` |
| `.tagger-wrap` | `aria-label` | `"Tags"` (or custom label) |
| Chip `<span>` | `role` | `"listitem"` |
| Remove button | `aria-label` | `"Remove tag [value]"` |
| Remove button | `tabindex` | `"-1"` (focused via chip navigation, not direct Tab) |
| `.tagger-input` | `role` | `"combobox"` |
| `.tagger-input` | `aria-expanded` | `"true"` when dropdown open, `"false"` when closed |
| `.tagger-input` | `aria-controls` | ID of the dropdown element |
| `.tagger-input` | `aria-activedescendant` | ID of the currently highlighted dropdown item |
| `.tagger-input` | `aria-autocomplete` | `"list"` |
| `.tagger-input` | `aria-haspopup` | `"listbox"` |
| `.tagger-dropdown` | `role` | `"listbox"` |
| `.tagger-dropdown` | `aria-label` | `"Tag suggestions"` |
| `.tagger-dropdown-group` | `role` | `"group"` |
| `.tagger-dropdown-group` | `aria-label` | Category label |
| `.tagger-dropdown-item` | `role` | `"option"` |
| `.tagger-dropdown-item` | `id` | Unique ID (for `aria-activedescendant`) |
| `.tagger-dropdown-item` | `aria-selected` | `"true"` if highlighted |
| `.tagger-dropdown-create` | `role` | `"option"` |
| `.tagger-error` | `role` | `"alert"` |

### 9.2 Screen Reader Announcements

The visually hidden `aria-live="polite"` region announces:

- **Tag added:** "Tag [value] added" (e.g., "Tag High added")
- **Tag added with category:** "Tag [category] [value] added" (e.g., "Tag Priority High added")
- **Tag removed:** "Tag [value] removed"
- **Validation error:** The error message text
- **Max tags reached:** "Maximum tags reached"
- **Filter results:** "[N] suggestions available" (after debounce)

### 9.3 Focus Management

- After a tag is added: focus returns to the text input.
- After a tag is removed via chip button: focus moves to the next chip's remove button, or the input if no chips remain.
- After a tag is removed via Backspace: focus stays on the input.
- After dropdown close via Escape: focus stays on the input.
- On component focus (Tab into): focus goes to the input.

---

## 10. Dependencies

| Dependency | Required | Notes |
|------------|----------|-------|
| Bootstrap 5 CSS | Yes | For `$gray-*`, `$blue-*`, `$red-*`, `$yellow-*` SCSS variables and `form-control` patterns |
| Bootstrap Icons | Yes | For `bi-x`, `bi-check` icons |
| Enterprise Theme CSS | Yes | For theme variable overrides |
| No JavaScript framework dependencies | -- | Vanilla TypeScript only |

---

## 11. Edge Cases

| Scenario | Behaviour |
|----------|-----------|
| Empty initial tags | Component renders with only the text input, no chips. |
| All tags removed | Returns to empty state with only the input. |
| Max tags reached | Input is disabled (greyed out). Dropdown does not open. Typing is prevented. |
| Per-category max reached | Category section in dropdown is disabled (items greyed out). Other categories remain interactive. |
| Duplicate tag attempt (reject mode) | Existing chip flashes. Validation error shown transiently (3 seconds). Input is not cleared. |
| Duplicate tag attempt (ignore mode) | Input is cleared silently. No error shown. |
| Validator returns error | Validation error shown below the container. Input is not cleared. Tag is not added. |
| Very long tag value | Chip text truncates with ellipsis (`text-overflow: ellipsis`). Full text shown in `title` attribute. |
| Taxonomy with zero categories | Component operates in freeform-only mode. No category headers in dropdown. |
| Categories with zero values | Empty categories are hidden in the dropdown. |
| allowFreeform: false with no taxonomy | Input accepts no tags. Dropdown shows "No matching tags". |
| Empty taxonomy values array in a category | Category header is hidden in dropdown. |
| Tag value with special characters | Tag values are rendered via `textContent` (no HTML injection). All characters are valid. |
| Input paste with commas | If the pasted text contains commas, split into multiple tags and add each through the pipeline. |
| Rapid typing during debounce | Only the final debounced value triggers autocomplete. Intermediate states are discarded. |
| Dropdown open when component is destroyed | Dropdown is closed and removed. All event listeners are cleaned up. |
| Container element not found | `console.error` logged with `LOG_PREFIX`. Component is not rendered. |
| setTags() with invalid tags | Each tag runs through validation. Invalid tags are skipped with a `console.warn`. |
| Backspace on empty input with no tags | No effect. |
| Click outside with dropdown open | Dropdown closes. Input text is cleared. |
| Window resize with dropdown open | Dropdown repositions (stays aligned with container). |
| Readonly with programmatic addTag | No-op. `console.warn` logged. |
| Disabled with programmatic addTag | No-op. `console.warn` logged. |

---

## 12. Logging

All log statements use the pattern:

```typescript
const LOG_PREFIX = "[Tagger]";
```

| Level | When | Example |
|-------|------|---------|
| `console.log` | Component lifecycle events | `[Tagger] Initialised with 3 tags in container #tag-input` |
| `console.log` | Significant user actions | `[Tagger] Tag "High" (Priority) added` |
| `console.log` | Significant user actions | `[Tagger] Tag "custom-tag" removed` |
| `console.warn` | Validation rejections | `[Tagger] Tag "High" rejected: duplicate` |
| `console.warn` | Limit reached | `[Tagger] Max tags (10) reached` |
| `console.warn` | Mutator called in disabled/readonly state | `[Tagger] addTag() ignored: component is readonly` |
| `console.error` | Container not found | `[Tagger] Container element #tag-input not found` |
| `console.debug` | Verbose diagnostics | `[Tagger] Autocomplete: 12 suggestions for "bu"` |

---

## 13. Testing Considerations

### 13.1 Unit Tests

| Area | Test Cases |
|------|------------|
| Rendering | Empty tags, initial tags, taxonomy chips with badges, freeform chips |
| Tag addition | Enter to add, click dropdown item, programmatic `addTag()`, freeform creation |
| Tag removal | Click remove button, Backspace on empty input, programmatic `removeTag()`, `clearTags()` |
| Duplicate handling | Reject mode (error shown, chip flash), ignore mode (silent discard) |
| Validation | Validator returns true (accepted), validator returns string (rejected, error shown) |
| Max tags | Global max, per-category max, input disabled at limit |
| Autocomplete | Substring filter, case-insensitive, category grouping, already-added indicators |
| Freeform | Create row appears, Enter creates tag, disabled when `allowFreeform: false` |
| Color modes | Category mode (colored borders), hash mode (deterministic colors), none mode (neutral) |
| Keyboard | ArrowDown/Up navigation, Enter selection, Escape close, Backspace remove, Tab out |
| States | Disabled (no interaction), readonly (no add/remove, visible chips) |
| Size variants | `sm`, default, `lg` render correct dimensions |
| API methods | `getTags()`, `setTags()`, `hasTag()`, `getTagsByCategory()`, `focus()`, `enable()`, `disable()` |
| Callbacks | `onAdd`, `onRemove`, `onChange`, `onValidationError` fire at correct times |
| Lifecycle | `show()`, `hide()`, `destroy()` |
| Paste handling | Comma-separated paste creates multiple tags |

### 13.2 Accessibility Tests

| Test | Expectation |
|------|-------------|
| `role="combobox"` on input | Present with correct attributes |
| `role="listbox"` on dropdown | Present when open |
| `role="option"` on items | Present on each suggestion |
| `role="group"` on container | Present with `aria-label` |
| `aria-expanded` | Toggles with dropdown state |
| `aria-activedescendant` | Updates with keyboard navigation |
| Live region | Announces tag add/remove/validation events |
| Remove button `aria-label` | Includes tag value |
| Focus management | Correct focus target after add, remove, close |

### 13.3 Visual Regression Tests

| Scenario | What to Capture |
|----------|-----------------|
| Default with mixed tags | Taxonomy chips with badges + freeform chips |
| Dropdown open with filter | Category groups with highlighted matching text |
| Already-added indicators | Check marks on present tags |
| Freeform create row | "Create [value]" row at bottom |
| Size variants | Small, default, large side by side |
| Disabled state | Dimmed chips, disabled input |
| Readonly state | Chips without remove buttons, no input |
| Validation error | Error message below container |
| Chip flash animation | Duplicate attempt feedback |
| Hash color mode | All chips with deterministic colors |
| No color mode | Uniform neutral chips |

---

## 14. Files

| File | Purpose |
|------|---------|
| `specs/tagger.prd.md` | This specification |
| `components/tagger/tagger.ts` | TypeScript source |
| `components/tagger/tagger.scss` | Styles |
| `components/tagger/README.md` | Consumer documentation |

---

## 15. Implementation Notes

### 15.1 Tag Index Map

Maintain a `Map<string, TagItem>` mapping composite keys (`category:value` for taxonomy, `:value` for freeform) to `TagItem` objects. This enables O(1) lookups for `hasTag()`, duplicate checking, and `removeTag()`. The map is updated on every add, remove, and `setTags()`.

### 15.2 Deterministic Hash Function

For `colorMode: "hash"`, use a simple DJB2 string hash mapped to the palette:

```typescript
function hashColor(value: string): string
{
    const palette =
    [
        "#1c7ed6", "#2b8a3e", "#e67700", "#c92a2a",
        "#862e9c", "#0b7285", "#5c940d", "#d9480f",
        "#364fc7", "#087f5b", "#9c36b5", "#e03131"
    ];
    let hash = 5381;
    for (let i = 0; i < value.length; i++)
    {
        hash = ((hash << 5) + hash) + value.charCodeAt(i);
        hash = hash & hash; // Convert to 32-bit integer
    }
    return palette[Math.abs(hash) % palette.length];
}
```

### 15.3 Comma-Paste Handling

On the `paste` event, intercept the clipboard text:

1. Check if the pasted text contains commas.
2. If so, prevent default paste behaviour.
3. Split by commas, trim each segment.
4. Run each non-empty segment through the tag addition pipeline.
5. Log the number of tags created: `[Tagger] Pasted 4 tags`.

### 15.4 Dropdown Filtering

```typescript
function filterSuggestions(
    text: string,
    taxonomy: TagCategory[]
): FilteredGroup[]
{
    const lower = text.toLowerCase();
    return taxonomy
        .map(cat =>
        ({
            category: cat,
            matches: cat.values.filter(v =>
                v.toLowerCase().includes(lower))
        }))
        .filter(g => g.matches.length > 0);
}
```

### 15.5 Chip Building

Extract chip creation into a helper function to keep the main class methods under 25-30 lines:

```typescript
function buildChip(
    tag: TagItem,
    category: TagCategory | undefined,
    options: TaggerOptions
): HTMLElement
{
    const chip = createElement("span");
    setAttr(chip, "class", "tagger-chip");
    setAttr(chip, "data-value", tag.value);
    setAttr(chip, "role", "listitem");

    if (tag.category)
    {
        setAttr(chip, "data-category", tag.category);
    }

    // Badge (taxonomy only, when showCategoryBadge is true)
    if (category && options.showCategoryBadge)
    {
        const badge = createElement("span");
        setAttr(badge, "class", "tagger-chip-badge");
        if (category.color)
        {
            badge.style.backgroundColor = category.color;
        }
        badge.textContent = category.label;
        chip.appendChild(badge);
    }

    // Label
    const label = createElement("span");
    setAttr(label, "class", "tagger-chip-label");
    label.textContent = tag.value;
    chip.appendChild(label);

    // Remove button (not in readonly/disabled)
    if (!options.readonly && !options.disabled)
    {
        const btn = createElement("button");
        setAttr(btn, "class", "tagger-chip-remove");
        setAttr(btn, "type", "button");
        setAttr(btn, "aria-label",
            "Remove tag " + tag.value);
        setAttr(btn, "tabindex", "-1");
        const icon = createElement("i");
        setAttr(icon, "class", "bi bi-x");
        btn.appendChild(icon);
        chip.appendChild(btn);
    }

    return chip;
}
```

### 15.6 Event Delegation

Use a single `click` event listener on `.tagger-wrap` to handle chip remove button clicks via `event.target.closest(".tagger-chip-remove")`. Use a single `click` listener on `.tagger-dropdown` for item selection via `event.target.closest(".tagger-dropdown-item")`.

### 15.7 Highlight Matching Text

Reuse the same mark-highlighting pattern as the TreeView:

```typescript
function highlightMatch(
    element: HTMLElement,
    text: string,
    search: string
): void
{
    const lower = text.toLowerCase();
    const idx = lower.indexOf(search.toLowerCase());
    if (idx === -1)
    {
        element.textContent = text;
        return;
    }
    element.textContent = "";
    if (idx > 0)
    {
        element.appendChild(
            document.createTextNode(text.substring(0, idx)));
    }
    const mark = createElement("mark");
    setAttr(mark, "class", "tagger-highlight");
    mark.textContent = text.substring(idx, idx + search.length);
    element.appendChild(mark);
    const rest = text.substring(idx + search.length);
    if (rest)
    {
        element.appendChild(document.createTextNode(rest));
    }
}
```

### 15.8 Performance

- Debounce filter input (150ms default) to avoid excessive dropdown rebuilds during rapid typing.
- Use `requestAnimationFrame` for chip add/remove animations.
- Cache category lookup in a `Map<string, TagCategory>` for O(1) access by category ID.
- For large taxonomies (500+ total values), consider virtual scrolling in the dropdown (out of scope for v1, but the DOM structure supports it).

### 15.9 Defensive Destroy

The `destroy()` method must:

1. Set an internal `destroyed` flag.
2. Close the dropdown if open.
3. Remove all event listeners (click, keydown, input, paste, focus, blur on the input; click-outside on document).
4. Clear the tag index map.
5. Remove all child DOM elements from the container.
6. Null internal references to prevent memory leaks.

### 15.10 Target Size

The implementation should target approximately 200-240 lines of TypeScript. Extract helpers aggressively (chip building, dropdown rendering, filtering, highlight matching) to keep individual functions under 25-30 lines per CODING_STYLE.md.

---

## 16. Future Considerations (Out of Scope for v1)

These features are explicitly deferred:

- **Drag-and-drop reordering** of tag chips within the container.
- **Tag grouping** -- visual grouping of chips by category within the container.
- **Async autocomplete** -- server-side search for taxonomy suggestions.
- **Tag icons** -- per-tag custom icons displayed within chips.
- **Nested categories** -- hierarchical taxonomy with parent-child category relationships.
- **Color picker for freeform tags** -- allowing users to choose a color when creating freeform tags.
- **Tag edit in place** -- double-click a chip to edit its value.
- **Export/import** -- serialise tags to JSON or CSV for clipboard or file operations.

---

## 17. Open Questions

1. Should clicking an already-added tag in the dropdown remove it (toggle behaviour) or simply flash the existing chip to indicate it is already present?
2. When `maxTags` is reached, should the input be hidden entirely or remain visible but disabled with a tooltip explaining the limit?
3. Should the comma-paste splitting also support semicolons and newlines as delimiters, or only commas?
4. Should freeform tags track "recent" values across component instances (via `localStorage`) for cross-session autocomplete, or only within the current instance?
5. Should the deterministic hash color palette be configurable via options, or is the built-in 12-color palette sufficient?
