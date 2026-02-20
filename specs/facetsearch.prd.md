<!-- AGENT: Product Requirements Document for the FacetSearch component — facet-aware search bar with structured query parsing, autocomplete, and chip display. -->

# FacetSearch Component — Product Requirements

**Status:** Draft
**Component name:** FacetSearch
**Folder:** `./components/facetsearch/`
**Spec author:** Agent
**Date:** 2026-02-20

---

## 1. Overview

### 1.1 What Is It

A facet-aware search bar that combines free-text search with structured query facets. Users type queries like `status:open author:@me priority:high fix login bug`, and the component parses them into structured key-value facets and free-text segments. Parsed facets appear as removable chips inline before the text cursor, while an autocomplete dropdown assists with both facet key discovery and value selection.

The component supports:

- **Facet syntax** — `key:value`, `key:"quoted value"`, `-key:value` (negation/exclusion).
- **Operators** — `:` (equals), `!:` (not equals), `>`, `<`, `>=`, `<=` for numeric and date facets.
- **Autocomplete** — Context-sensitive suggestions for facet keys (when no colon is typed) and facet values (after `key:` is typed).
- **Facet chips** — Parsed facets render as removable chips inline within the search bar, preceding the text input cursor.
- **Async value loading** — Facet values can be loaded asynchronously (e.g., user list from an API) via a `loadValues` callback.
- **Recent searches** — Optional history of previously submitted queries, shown in the dropdown when the input is empty.
- **Full programmability** — All facet definitions, chips, suggestions, and behaviour are configurable via the API.

### 1.2 Why Build It

Enterprise SaaS applications frequently need structured search for:

- Issue trackers (filter by status, assignee, label, priority, milestone)
- Log viewers (filter by severity, service, host, timestamp range)
- Admin dashboards (filter by user role, creation date, account status)
- Data grids (filter by any column with structured constraints)
- Audit trails (filter by actor, action, resource, date range)

Free-text search alone forces users to remember exact matches or rely on server-side heuristics. Faceted search makes filters visible, discoverable, and precise. Users can combine structured facets with free-text to express queries that are both specific and flexible.

No existing open-source library provides a Bootstrap 5 compatible, vanilla TypeScript, facet-aware search bar with inline chips, async autocomplete, and accessibility. Building custom ensures alignment with the project's zero-dependency, IIFE-wrapped, Bootstrap-themed architecture.

### 1.3 Design Inspiration

| Source | Key Pattern Adopted |
|--------|---------------------|
| GitHub Issue Search | `is:open author:@me label:bug` syntax, inline chips, facet suggestions |
| Jira JQL Bar | Structured query language with key-value pairs and operators |
| Datadog Log Search | Facet sidebar + query bar with autocomplete for keys and values |
| Linear Filter Bar | Clean chip-based filter bar with dropdown pickers per facet |
| Gmail Search Chips | Parsed search terms rendered as removable chips in the search input |
| Kibana KQL Bar | Autocomplete for field names and values, operator support |

### 1.4 Open Source Evaluation

| Library | Verdict | Reason |
|---------|---------|--------|
| Searchkit | Not recommended | React-only, Elasticsearch-coupled, not Bootstrap-compatible |
| Typesense InstantSearch | Not recommended | Framework-coupled (React/Vue), Typesense-specific backend |
| react-search-autocomplete | Not recommended | React-only, no facet parsing |
| jQuery Tokenfield | Useful reference | Token/chip input pattern; jQuery dependency, no facet semantics |
| Bootstrap 5 `.form-control` | Foundation | Native input styling; no parsing, chips, or autocomplete |

**Decision:** Build custom. Use Bootstrap 5 `.form-control` and `.badge` CSS patterns as a styling foundation. Implement facet parsing as a lightweight recursive-descent tokenizer. Implement autocomplete as a `role="listbox"` dropdown following the WAI-ARIA Combobox pattern.

---

## 2. Anatomy

### 2.1 Search Bar (Resting State)

```
┌──────────────────────────────────────────────────────────────────────┐
│ 🔍  [search text here...___]                                   [✕] │
└──────────────────────────────────────────────────────────────────────┘
```

### 2.2 Search Bar (With Facet Chips)

```
┌──────────────────────────────────────────────────────────────────────┐
│ 🔍 [status:open ✕] [priority:high ✕] [search text here...___] [✕] │
└──────────────────────────────────────────────────────────────────────┘
```

### 2.3 Search Bar with Autocomplete Dropdown

```
┌──────────────────────────────────────────────────────────────────────┐
│ 🔍 [status:open ✕] pri___                                     [✕] │
└──────────────────────────────────────────────────────────────────────┘
  ┌────────────────────────────────────────────────┐
  │   Facets                                       │
  │     priority   Priority                        │
  │     project    Project                         │
  │─────────────────────────────────────────────────│
  │   Recent                                       │
  │     status:open priority:high bug fix           │
  │     author:@me type:feature                    │
  └────────────────────────────────────────────────┘
```

### 2.4 Autocomplete Dropdown (Value Suggestions)

```
┌──────────────────────────────────────────────────────────────────────┐
│ 🔍 [status:open ✕] priority:___                               [✕] │
└──────────────────────────────────────────────────────────────────────┘
  ┌────────────────────────────────────────────────┐
  │   priority values                              │
  │     ○ critical                                 │
  │     ○ high                                     │
  │     ○ medium                                   │
  │     ○ low                                      │
  └────────────────────────────────────────────────┘
```

### 2.5 Element Breakdown

| Element | Required | Description |
|---------|----------|-------------|
| Root container | Yes | `role="search"` wrapper with `aria-label` |
| Search icon | Yes | Leading `bi-search` icon for visual affordance |
| Chip container | Auto | Inline flex container for facet chips (shown when chips exist) |
| Facet chip | Auto | Badge-style chip with facet label, value, and remove button |
| Chip remove button | Auto | Small `bi-x` button to remove a facet chip |
| Text input | Yes | `role="searchbox"` input for typing queries |
| Clear button | Auto | Trailing `bi-x` button to clear all input and chips (shown when non-empty) |
| Autocomplete dropdown | Auto | `role="listbox"` dropdown with facet key/value suggestions |
| Dropdown section header | Auto | Non-interactive header separating facet suggestions from recent searches |
| Dropdown item | Auto | `role="option"` selectable suggestion item |
| Recent searches section | Optional | Section within the dropdown showing previously submitted queries |

---

## 3. API

### 3.1 Types

```typescript
/** Value type for a facet definition. Determines operator availability and validation. */
type FacetValueType = "text" | "enum" | "date" | "number" | "boolean";

/** Size variant for the search bar. */
type FacetSearchSize = "sm" | "default" | "lg";
```

### 3.2 Interfaces

```typescript
/**
 * Defines a single searchable facet (key-value filter dimension).
 * Facets are the structured portion of the query: status:open, priority:high, etc.
 */
interface FacetDefinition
{
    /** Internal key used in the query syntax. e.g., "status". */
    key: string;

    /** Human-readable display label. e.g., "Status". */
    label: string;

    /** Data type of the facet value. Determines operators and validation. */
    valueType: FacetValueType;

    /** Static list of valid values. Used for enum-type facets. */
    values?: string[];

    /**
     * Async value loader. Called when the user types after "key:" to fetch
     * matching values from an API. Receives the partial typed value as query.
     * Returns a promise resolving to an array of matching value strings.
     */
    loadValues?: (query: string) => Promise<string[]>;

    /** Bootstrap Icons class for this facet. Shown in autocomplete and chips. */
    icon?: string;

    /** Allow multiple values for the same key. Default: false. */
    multiple?: boolean;

    /**
     * Default operator when user types "key:value" without an explicit operator.
     * Default: ":".
     */
    defaultOperator?: ":" | "!:" | ">" | "<" | ">=" | "<=";

    /**
     * Allowed operators for this facet.
     * Default: [":", "!:"] for text/enum/boolean; [":", "!:", ">", "<", ">=", "<="] for number/date.
     */
    operators?: string[];

    /** CSS colour value for this facet's chip background. */
    color?: string;

    /** Placeholder hint shown in the autocomplete for this facet's value. */
    valuePlaceholder?: string;
}

/**
 * Represents a single parsed facet from the query string.
 */
interface ParsedFacet
{
    /** Facet key. e.g., "status". */
    key: string;

    /** Operator used. e.g., ":", "!:", ">", "<=". */
    operator: string;

    /** Facet value. e.g., "open", "high", "2026-01-01". */
    value: string;

    /** Whether the facet is negated (prefixed with "-"). */
    negated: boolean;
}

/**
 * The structured result of parsing the search bar's raw input string.
 * Returned by getQuery() and passed to onSearch().
 */
interface FacetSearchQuery
{
    /** Free-text portion of the query (all text not part of facets). */
    text: string;

    /** Array of parsed facet key-operator-value entries. */
    facets: ParsedFacet[];

    /** Original raw input string exactly as typed. */
    raw: string;
}

/**
 * Configuration options for the FacetSearch component.
 */
interface FacetSearchOptions
{
    /** Array of facet definitions describing available search facets. Required. */
    facets: FacetDefinition[];

    /** Initial search string. Parsed into chips on construction. */
    value?: string;

    /** Placeholder text shown when input is empty and no chips exist. Default: "Search...". */
    placeholder?: string;

    /** Render parsed facets as inline chips. Default: true. */
    showFacetChips?: boolean;

    /** Show recent searches section in the dropdown. Default: false. */
    showHistory?: boolean;

    /** Maximum number of recent searches to store and display. Default: 10. */
    maxHistory?: number;

    /** Submit the query when Enter is pressed. Default: true. */
    submitOnEnter?: boolean;

    /** Clear the input and chips after submitting. Default: false. */
    clearOnSubmit?: boolean;

    /** Size variant. Default: "default". */
    size?: FacetSearchSize;

    /** Disabled state. Default: false. */
    disabled?: boolean;

    /** Additional CSS class(es) on the root element. */
    cssClass?: string;

    /** Called when the user submits the search (Enter or programmatic). */
    onSearch?: (query: FacetSearchQuery) => void;

    /** Called on every input change (typing, chip add/remove). */
    onChange?: (value: string) => void;

    /** Called when a facet chip is added. */
    onFacetAdd?: (key: string, value: string) => void;

    /** Called when a facet chip is removed. */
    onFacetRemove?: (key: string) => void;

    /** Called when all input and chips are cleared. */
    onClear?: () => void;
}
```

### 3.3 Class: FacetSearch

| Method | Description |
|--------|-------------|
| `constructor(options)` | Creates the FacetSearch DOM but does not attach to the page. |
| `show(containerId)` | Renders the component into the specified container element. |
| `hide()` | Removes from DOM without destroying state. |
| `destroy()` | Hides, releases all references and event listeners. |
| `getElement()` | Returns the root DOM element. |
| `getValue()` | Returns the current raw input string (including facet text). |
| `setValue(value)` | Sets the input string programmatically. Parses into chips if `showFacetChips` is enabled. |
| `getQuery()` | Returns the current `FacetSearchQuery` (parsed facets + free text). |
| `clear()` | Clears all chips and input text. Fires `onClear`. |
| `focus()` | Programmatically focuses the text input. |
| `addFacet(key, value)` | Programmatically adds a facet chip. Fires `onFacetAdd`. |
| `removeFacet(key)` | Removes a facet chip by key. Fires `onFacetRemove`. |
| `getFacets()` | Returns an array of currently active `ParsedFacet` entries. |
| `enable()` | Enables the component (removes disabled state). |
| `disable()` | Disables the component (prevents all interaction). |

### 3.4 Convenience Functions

| Function | Description |
|----------|-------------|
| `createFacetSearch(containerId, options)` | Create, show, and return a FacetSearch instance. |

### 3.5 Global Exports

```typescript
window.FacetSearch = FacetSearch;
window.createFacetSearch = createFacetSearch;
```

---

## 4. Behaviour

### 4.1 Lifecycle

1. **Construction** -- Builds the DOM tree from `options` but does not attach to the page. Parses `options.value` if provided.
2. **show(containerId)** -- Appends to the specified container element.
3. **hide()** -- Removes from DOM. State (chips, input text, history) is preserved.
4. **destroy()** -- Calls hide, removes all event listeners, nulls references.

### 4.2 Query Parsing

The parser tokenizes the raw input string into facets and free text using the following rules:

1. **Facet token** -- A token matching the pattern `[-]key[operator]value` where:
   - Optional leading `-` indicates negation.
   - `key` is a known facet key (case-insensitive match against `FacetDefinition.key`).
   - `operator` is one of `:`, `!:`, `>`, `<`, `>=`, `<=`.
   - `value` is either an unquoted word (no spaces) or a double-quoted string (`"multi word value"`).
2. **Free text** -- Any token that does not match a known facet key is treated as free text.
3. **Unknown keys** -- Tokens with a colon but an unrecognised key are treated as free text (e.g., `foo:bar` where `foo` is not a defined facet).
4. **Multiple values** -- When `FacetDefinition.multiple` is true, the same key can appear multiple times (e.g., `label:bug label:feature`). When `multiple` is false, a new value for the same key replaces the previous one.

**Parser examples:**

| Input | Parsed Facets | Free Text |
|-------|--------------|-----------|
| `status:open bug fix` | `[{key:"status", op:":", value:"open", neg:false}]` | `"bug fix"` |
| `-priority:low error` | `[{key:"priority", op:":", value:"low", neg:true}]` | `"error"` |
| `author:"Jane Doe" status:closed` | `[{key:"author", op:":", value:"Jane Doe", neg:false}, {key:"status", op:":", value:"closed", neg:false}]` | `""` |
| `count>10 warning` | `[{key:"count", op:">", value:"10", neg:false}]` | `"warning"` |
| `hello world` | `[]` | `"hello world"` |
| `foo:bar status:open` | `[{key:"status", op:":", value:"open", neg:false}]` | `"foo:bar"` |

### 4.3 Autocomplete

The autocomplete dropdown provides context-sensitive suggestions based on cursor position.

**Facet key suggestions** (when the user types text without a colon):

1. Filter the facet definitions whose `key` or `label` starts with the typed prefix (case-insensitive).
2. Display matching facets as suggestions showing the icon (if defined), label, and key.
3. Selecting a facet key inserts `key:` into the input and transitions to value suggestions.

**Facet value suggestions** (after the user types `key:` or `key:partial`):

1. If the facet has static `values`, filter them by the partial typed value (substring match, case-insensitive).
2. If the facet has a `loadValues` function, call it with the partial value, debounced at 200ms. Show a loading indicator while the promise is pending.
3. Display matching values as selectable options.
4. Selecting a value completes the facet token and creates a chip (if `showFacetChips` is enabled).

**Recent searches** (when input is empty and `showHistory` is enabled):

1. Show the most recent submitted queries (up to `maxHistory`).
2. Selecting a recent search sets the input value and re-parses.
3. Recent searches are stored in memory (not `localStorage`). The consumer can persist them externally if needed.

**Dropdown visibility rules:**

- The dropdown opens when the input is focused and there are relevant suggestions or recent searches to show.
- The dropdown closes when the input loses focus, Escape is pressed, or a selection is made.
- The dropdown is hidden when the input is empty and `showHistory` is false.
- The dropdown does not open when the component is disabled.

### 4.4 Facet Chips

When `showFacetChips` is true (default):

1. As the user types a complete facet token (e.g., `status:open `) and moves past it (by typing a space or pressing Enter), the parser creates a chip.
2. Chips render inline within the search bar, before the text input, using a flex layout.
3. Each chip displays:
   - The facet icon (if defined in `FacetDefinition.icon`).
   - The facet key and value (e.g., "status:open").
   - A remove button (small X icon).
4. Chips use the facet's `color` property for background if defined, otherwise the default chip colour.
5. Negated facets display with a strikethrough style on the key and a different background colour to visually distinguish exclusions.
6. Clicking a chip's remove button removes the facet and fires `onFacetRemove`.
7. Chips are read-only; clicking the chip text does not edit it. To change a facet value, remove the chip and type a new one.

### 4.5 Submit

When the user presses Enter (and `submitOnEnter` is true):

1. Close the autocomplete dropdown.
2. Parse the current input into a `FacetSearchQuery`.
3. Fire `onSearch(query)`.
4. If `showHistory` is enabled, add the raw query to the recent searches list.
5. If `clearOnSubmit` is true, clear all chips and input text.

### 4.6 Clear

The clear button (trailing X icon) appears when the input has text or chips:

1. Clicking clear removes all chips and empties the input text.
2. Fires `onClear`.
3. The input retains focus after clearing.

### 4.7 Disabled State

When `disabled` is true:

- The input is not editable.
- Chips are displayed but their remove buttons are inert.
- The clear button is hidden.
- The autocomplete dropdown does not open.
- The component receives the `facetsearch-disabled` class.

---

## 5. Styling

### 5.1 CSS Classes

All classes use the `.facetsearch-` prefix.

| Class | Description |
|-------|-------------|
| `.facetsearch` | Root container — `position: relative`, `display: flex` |
| `.facetsearch-sm` | Small size variant |
| `.facetsearch-lg` | Large size variant |
| `.facetsearch-disabled` | Disabled state modifier |
| `.facetsearch-focused` | Focused state modifier (shows focus ring) |
| `.facetsearch-bar` | Inner bar — flex row containing icon, chips, input, clear button |
| `.facetsearch-icon` | Leading search icon (`bi-search`) |
| `.facetsearch-chips` | Flex container for inline facet chips |
| `.facetsearch-chip` | Individual facet chip (badge-style) |
| `.facetsearch-chip-negated` | Negated facet chip modifier (strikethrough, muted colour) |
| `.facetsearch-chip-icon` | Facet icon within a chip |
| `.facetsearch-chip-text` | Facet key:value text within a chip |
| `.facetsearch-chip-remove` | Remove button (X) within a chip |
| `.facetsearch-input` | Text input — `flex: 1`, no border (styled by parent bar) |
| `.facetsearch-clear` | Clear-all button (trailing X) |
| `.facetsearch-dropdown` | Autocomplete dropdown — `position: absolute` |
| `.facetsearch-dropdown-section` | Section within the dropdown (Facets, Recent) |
| `.facetsearch-dropdown-header` | Non-interactive section header text |
| `.facetsearch-dropdown-item` | Selectable suggestion item |
| `.facetsearch-dropdown-item-highlighted` | Currently highlighted item (keyboard/hover) |
| `.facetsearch-dropdown-item-icon` | Icon within a suggestion item |
| `.facetsearch-dropdown-item-label` | Primary text within a suggestion item |
| `.facetsearch-dropdown-item-hint` | Secondary hint text (e.g., facet key beside label) |
| `.facetsearch-dropdown-divider` | Horizontal divider between sections |
| `.facetsearch-dropdown-loading` | Loading indicator for async value loading |
| `.facetsearch-dropdown-empty` | "No matches" message |

### 5.2 Theme Integration

| Property | Value | Source |
|----------|-------|--------|
| Bar background | `$gray-50` | Light, clean input background |
| Bar border | `1px solid $gray-300` | Consistent with form controls |
| Bar focus border | `$input-focus-border-color` | Bootstrap focus ring colour |
| Bar focus shadow | `$input-focus-box-shadow` | Bootstrap focus ring shadow |
| Text colour | `$gray-900` | Primary text |
| Placeholder colour | `$gray-500` | Standard placeholder |
| Search icon colour | `$gray-500` | Subtle leading icon |
| Clear button colour | `$gray-500`, hover `$gray-700` | Subtle dismiss affordance |
| Chip background | `$gray-200` | Default neutral chip |
| Chip text colour | `$gray-800` | Readable on light chip |
| Chip custom colour | `FacetDefinition.color` | Per-facet colour override |
| Chip negated background | `$red-100` | Visually distinct exclusion |
| Chip negated text | `$red-800` | Readable on red chip |
| Chip remove button | `$gray-500`, hover `$gray-700` | Subtle remove affordance |
| Dropdown background | `$gray-50` | Clean dropdown surface |
| Dropdown border | `1px solid $gray-300` | Consistent with form dropdowns |
| Dropdown shadow | `0 2px 8px rgba($gray-900, 0.12)` | Subtle elevation |
| Dropdown item hover | `$gray-100` | Matches Bootstrap dropdown hover |
| Dropdown item highlighted | `$blue-50` background | Clear keyboard focus indicator |
| Dropdown header text | `$gray-500`, `$font-size-sm`, `$font-weight-semibold` | Subdued section label |
| Dropdown loading | `$gray-500` text, spinner icon | Async feedback |
| Font | inherits `$font-family-base` | Theme font |

### 5.3 Sizing

| Size | Bar height | Chip height | Font size | Use Case |
|------|-----------|-------------|-----------|----------|
| Small (`sm`) | 30px | 20px | `$font-size-sm` | Compact toolbars, inline filters |
| Default | 36px | 24px | `$font-size-base` | Standard search bars |
| Large (`lg`) | 44px | 28px | `$font-size-lg` | Prominent page-level search |

### 5.4 Z-Index

| Element | Z-Index | Rationale |
|---------|---------|-----------|
| FacetSearch bar | (static) | Normal document flow within its container |
| Autocomplete dropdown | 1050 | Above page content, below modals |

### 5.5 Reduced Motion

A `prefers-reduced-motion: reduce` media query disables the dropdown slide-in animation. The dropdown appears and disappears without transform transitions, using only a fast opacity change.

---

## 6. DOM Structure

### 6.1 Search Bar with Chips

```html
<div class="facetsearch" role="search" aria-label="Search with filters">
    <div class="facetsearch-bar">
        <i class="bi bi-search facetsearch-icon" aria-hidden="true"></i>

        <div class="facetsearch-chips" role="list" aria-label="Active filters">
            <span class="facetsearch-chip" role="listitem" data-facet-key="status">
                <i class="bi bi-circle facetsearch-chip-icon" aria-hidden="true"></i>
                <span class="facetsearch-chip-text">status:open</span>
                <button class="facetsearch-chip-remove" type="button"
                        aria-label="Remove status filter">
                    <i class="bi bi-x" aria-hidden="true"></i>
                </button>
            </span>
            <span class="facetsearch-chip facetsearch-chip-negated" role="listitem"
                  data-facet-key="priority">
                <span class="facetsearch-chip-text">-priority:low</span>
                <button class="facetsearch-chip-remove" type="button"
                        aria-label="Remove priority filter">
                    <i class="bi bi-x" aria-hidden="true"></i>
                </button>
            </span>
        </div>

        <input class="facetsearch-input" type="text"
               role="searchbox"
               aria-label="Search"
               aria-expanded="false"
               aria-controls="facetsearch-1-listbox"
               aria-activedescendant=""
               aria-autocomplete="list"
               aria-haspopup="listbox"
               placeholder="Search..."
               autocomplete="off">

        <button class="facetsearch-clear" type="button"
                aria-label="Clear search">
            <i class="bi bi-x-lg" aria-hidden="true"></i>
        </button>
    </div>

    <div class="facetsearch-dropdown" id="facetsearch-1-listbox"
         role="listbox" aria-label="Search suggestions"
         style="display: none;">

        <div class="facetsearch-dropdown-section">
            <span class="facetsearch-dropdown-header" aria-hidden="true">Facets</span>
            <div class="facetsearch-dropdown-item" role="option"
                 id="facetsearch-1-option-0" aria-selected="false">
                <i class="bi bi-circle facetsearch-dropdown-item-icon"
                   aria-hidden="true"></i>
                <span class="facetsearch-dropdown-item-label">Status</span>
                <span class="facetsearch-dropdown-item-hint">status:</span>
            </div>
            <div class="facetsearch-dropdown-item" role="option"
                 id="facetsearch-1-option-1" aria-selected="false">
                <span class="facetsearch-dropdown-item-label">Priority</span>
                <span class="facetsearch-dropdown-item-hint">priority:</span>
            </div>
        </div>

        <div class="facetsearch-dropdown-divider" role="separator"></div>

        <div class="facetsearch-dropdown-section">
            <span class="facetsearch-dropdown-header" aria-hidden="true">Recent</span>
            <div class="facetsearch-dropdown-item" role="option"
                 id="facetsearch-1-option-2" aria-selected="false">
                <i class="bi bi-clock-history facetsearch-dropdown-item-icon"
                   aria-hidden="true"></i>
                <span class="facetsearch-dropdown-item-label">
                    status:open priority:high bug fix
                </span>
            </div>
        </div>
    </div>

    <!-- Live region for screen reader announcements -->
    <div class="visually-hidden" role="status" aria-live="polite"
         aria-atomic="true"></div>
</div>
```

### 6.2 Value Suggestions (After key:)

```html
<div class="facetsearch-dropdown" id="facetsearch-1-listbox"
     role="listbox" aria-label="Priority values">
    <div class="facetsearch-dropdown-section">
        <span class="facetsearch-dropdown-header" aria-hidden="true">
            priority values
        </span>
        <div class="facetsearch-dropdown-item facetsearch-dropdown-item-highlighted"
             role="option" id="facetsearch-1-option-0" aria-selected="true">
            <span class="facetsearch-dropdown-item-label">critical</span>
        </div>
        <div class="facetsearch-dropdown-item" role="option"
             id="facetsearch-1-option-1" aria-selected="false">
            <span class="facetsearch-dropdown-item-label">high</span>
        </div>
        <div class="facetsearch-dropdown-item" role="option"
             id="facetsearch-1-option-2" aria-selected="false">
            <span class="facetsearch-dropdown-item-label">medium</span>
        </div>
        <div class="facetsearch-dropdown-item" role="option"
             id="facetsearch-1-option-3" aria-selected="false">
            <span class="facetsearch-dropdown-item-label">low</span>
        </div>
    </div>
</div>
```

### 6.3 Async Loading State

```html
<div class="facetsearch-dropdown" id="facetsearch-1-listbox" role="listbox">
    <div class="facetsearch-dropdown-section">
        <span class="facetsearch-dropdown-header" aria-hidden="true">
            author values
        </span>
        <div class="facetsearch-dropdown-loading" role="status">
            <i class="bi bi-arrow-repeat facetsearch-dropdown-loading-icon"
               aria-hidden="true"></i>
            <span>Loading...</span>
        </div>
    </div>
</div>
```

---

## 7. Keyboard Interaction

The component follows the [WAI-ARIA Combobox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) keyboard conventions.

### 7.1 Input Navigation

| Key | Dropdown closed | Dropdown open |
|-----|----------------|---------------|
| **Typing** | Opens dropdown with matching facet key suggestions | Updates suggestions based on typed text |
| **Typing `key:`** | Opens dropdown with value suggestions for the facet | Updates value suggestions based on typed partial value |
| **Enter** | Submits the search (fires `onSearch`) | Selects highlighted suggestion and creates chip; if no suggestion highlighted, submits search |
| **Escape** | No effect | Closes the dropdown |
| **ArrowDown** | Opens dropdown and highlights first item | Moves highlight to next item (wraps to first) |
| **ArrowUp** | Opens dropdown and highlights last item | Moves highlight to previous item (wraps to last) |
| **Tab** | Accepts highlighted suggestion (if dropdown open), then moves focus | Accepts highlighted suggestion and closes dropdown |
| **Backspace** (at start of input) | Removes the last facet chip | Removes the last facet chip |
| **Ctrl+Backspace** | Clears all facet chips | Clears all facet chips and closes dropdown |
| **Home** | Moves cursor to start of input text | Highlights first item in dropdown |
| **End** | Moves cursor to end of input text | Highlights last item in dropdown |

### 7.2 Chip Navigation

| Key | Action |
|-----|--------|
| **Backspace** at position 0 | Selects the last chip visually; a second Backspace removes it |
| **Left Arrow** at position 0 | Moves focus to the last chip (chip receives visual focus ring) |
| **Right Arrow** on focused chip | Moves focus to the next chip, or back to the input if on the last chip |
| **Left Arrow** on focused chip | Moves focus to the previous chip |
| **Delete / Backspace** on focused chip | Removes the chip; focus moves to the next chip or input |
| **Escape** on focused chip | Returns focus to the input |

---

## 8. Accessibility

### 8.1 ARIA Roles and Attributes

| Element | Attribute | Value |
|---------|-----------|-------|
| Root container | `role` | `"search"` |
| Root container | `aria-label` | `"Search with filters"` (or consumer-provided) |
| Text input | `role` | `"searchbox"` |
| Text input | `aria-expanded` | `"true"` when dropdown is open, `"false"` when closed |
| Text input | `aria-controls` | ID of the listbox element |
| Text input | `aria-activedescendant` | ID of the currently highlighted option, or empty |
| Text input | `aria-autocomplete` | `"list"` |
| Text input | `aria-haspopup` | `"listbox"` |
| Chip container | `role` | `"list"` |
| Chip container | `aria-label` | `"Active filters"` |
| Each chip | `role` | `"listitem"` |
| Chip remove button | `aria-label` | `"Remove [key] filter"` (e.g., "Remove status filter") |
| Dropdown | `role` | `"listbox"` |
| Dropdown | `aria-label` | `"Search suggestions"` or `"[key] values"` depending on context |
| Each dropdown item | `role` | `"option"` |
| Each dropdown item | `id` | Unique ID (for `aria-activedescendant`) |
| Each dropdown item | `aria-selected` | `"true"` if highlighted |
| Section header | `aria-hidden` | `"true"` (non-interactive) |
| Clear button | `aria-label` | `"Clear search"` |
| Live region | `role` | `"status"` |
| Live region | `aria-live` | `"polite"` |
| Live region | `aria-atomic` | `"true"` |

### 8.2 Screen Reader Announcements

The component uses an `aria-live="polite"` region to announce:

- When a facet chip is added: "Added filter: status equals open"
- When a facet chip is removed: "Removed filter: status"
- When all filters are cleared: "All filters cleared"
- When the dropdown shows suggestions: "[N] suggestions available" (number of visible suggestions)
- When async loading completes: "[N] values loaded"
- When no suggestions match: "No matching suggestions"

### 8.3 Focus Management

- Focus always remains on the text input during typing and dropdown navigation.
- Dropdown items are never directly focused; they are highlighted visually and indicated via `aria-activedescendant`.
- When a chip is "focused" via Left Arrow, a visual focus ring appears on the chip but DOM focus stays on the input (using `aria-activedescendant` pointing to the chip, or a visual-only class).
- The clear button is keyboard-accessible via Tab.
- Chip remove buttons are not in the tab order (removing chips is done via Backspace on focused chips).

### 8.4 Colour Contrast

- All text meets WCAG AA contrast ratio of 4.5:1 against its background.
- Chip colours (including custom `FacetDefinition.color`) should be validated by the consumer. The component renders custom colours as-is and does not auto-correct contrast.
- Negated chips use `$red-100` background with `$red-800` text (passes AA contrast).

---

## 9. Dependencies

| Dependency | Required | Notes |
|------------|----------|-------|
| Bootstrap 5 CSS | Yes | For `$gray-*`, `$blue-*`, `$red-*` SCSS variables and `.form-control` base styles |
| Bootstrap Icons | Yes | For `bi-search`, `bi-x`, `bi-x-lg`, `bi-clock-history`, `bi-arrow-repeat` icons |
| Enterprise Theme CSS | Yes | For theme variable overrides |
| No JavaScript framework dependencies | -- | Vanilla TypeScript only |

---

## 10. Edge Cases

| Scenario | Behaviour |
|----------|-----------|
| Empty facets array | Component renders as a plain search bar with no autocomplete for facets. Free-text only. |
| No matching facet key | Token treated as free text. No autocomplete suggestions shown. |
| Quoted value with escaped quotes | `key:"value \"with\" quotes"` — parser handles escaped double quotes within quoted values. |
| Very long facet value | Chip text truncates with ellipsis (`text-overflow: ellipsis`). Full value shown as a `title` attribute. |
| Duplicate facet (multiple: false) | Adding a second `status:closed` when `status:open` exists replaces the existing chip. |
| Duplicate facet (multiple: true) | Both chips are shown side by side (e.g., `label:bug` and `label:feature`). |
| Async loadValues rejects | Dropdown shows "Failed to load values" message. Console error logged. |
| Async loadValues slow (>2s) | Loading indicator remains visible. No timeout — the promise controls its own lifecycle. |
| Async loadValues returns empty | Dropdown shows "No matching values" message. |
| Input value set to malformed query | Parser extracts what it can; unrecognised tokens become free text. No errors thrown. |
| Container not found | `console.error` is logged with `LOG_PREFIX`. Component is not rendered. |
| Destroy while dropdown open | Closes dropdown, removes all DOM elements, clears event listeners. |
| Disabled during open dropdown | Dropdown closes immediately. |
| Very many chips (>10) | Chip container wraps to multiple lines. The search bar grows vertically. Maximum height is unconstrained by default; the consumer can set `max-height` + `overflow-y: auto` on the root via `cssClass`. |
| Paste multi-facet string | Pasted text is parsed in full. All valid facets become chips; remaining text stays in input. |
| Browser autocomplete interference | Native autocomplete is disabled via `autocomplete="off"` on the input element. |
| showHistory with no previous searches | Recent section is hidden. Only facet suggestions are shown. |
| All chips removed via clear | `onClear` fires once. Individual `onFacetRemove` does not fire for each chip during clear. |

---

## 11. Implementation Notes

### 11.1 Facet Parser

Implement the parser as a standalone pure function `parseFacetQuery(raw, facetDefs)` that returns a `FacetSearchQuery`. This enables unit testing independently of the DOM component.

The parser uses simple string scanning (not regex) for clarity and maintainability:

1. Scan character by character.
2. When encountering `-` at token start, mark as negated.
3. Accumulate characters until a whitespace boundary or operator character.
4. If the accumulated token contains a known operator and the prefix matches a known facet key, parse as a facet.
5. If a `"` follows the operator, read until the closing `"` (handling `\"` escapes).
6. Otherwise, read until whitespace.
7. All unrecognised tokens are concatenated as free text.

### 11.2 Debounced Async Loading

When a `loadValues` function is defined on a facet:

```typescript
let loadTimer: number | null = null;

function scheduleLoad(facet: FacetDefinition, query: string): void
{
    if (loadTimer !== null)
    {
        clearTimeout(loadTimer);
    }

    loadTimer = window.setTimeout(() =>
    {
        showLoadingIndicator();

        facet.loadValues!(query)
            .then(values => renderValueSuggestions(values))
            .catch(err =>
            {
                console.error(LOG_PREFIX, "Failed to load values:", err);
                renderLoadError();
            });
    }, 200);
}
```

### 11.3 Recent Search Storage

Recent searches are stored in a simple in-memory array (not `localStorage`). This avoids persistence concerns and privacy issues. If the consumer wants persistence, they can read/write the history externally via the `getValue()` and `setValue()` methods or by intercepting `onSearch`.

```typescript
private recentSearches: string[] = [];

private addToHistory(raw: string): void
{
    const trimmed = raw.trim();
    if (!trimmed)
    {
        return;
    }

    // Remove duplicate if exists
    const index = this.recentSearches.indexOf(trimmed);
    if (index >= 0)
    {
        this.recentSearches.splice(index, 1);
    }

    // Add to front
    this.recentSearches.unshift(trimmed);

    // Trim to max
    if (this.recentSearches.length > this.maxHistory)
    {
        this.recentSearches.pop();
    }
}
```

### 11.4 Chip Creation from Input

When the user types a valid facet and presses Space, Tab, or Enter:

1. Re-parse the current input text.
2. For each newly detected facet that is not already a chip, create a chip element.
3. Remove the facet text from the input.
4. Announce the addition via the live region.

This approach re-parses on every significant input event rather than maintaining incremental state, which is simpler and less error-prone for the expected input lengths (rarely more than 200 characters).

### 11.5 Performance

- Debounce input parsing at 50ms to avoid excessive DOM updates during rapid typing.
- Debounce async `loadValues` calls at 200ms.
- Cache `loadValues` results per query string for the duration of the dropdown being open (invalidated when the dropdown closes).
- Use `textContent` only (never `innerHTML`) for all user-provided content (facet values, labels, search text) to prevent XSS.
- Chip DOM elements are created and destroyed (not recycled) because the expected count is small (typically fewer than 10).

### 11.6 Logging

Follow the project `LOG_PREFIX` pattern:

```typescript
const LOG_PREFIX = "[FacetSearch]";

console.log(LOG_PREFIX, "Initialized with", options.facets.length, "facet definitions");
console.warn(LOG_PREFIX, "Facet key not found:", key);
console.error(LOG_PREFIX, "Container not found:", containerId);
```

### 11.7 Target Line Count

The implementation should target approximately 220-260 lines of TypeScript, achieved by:

- Extracting the parser into a separate pure function (~40 lines).
- Extracting chip DOM creation into a helper (~15 lines).
- Extracting dropdown rendering into a helper (~25 lines).
- Keeping the main class focused on event wiring and state management.

---

## 12. Files

| File | Purpose |
|------|---------|
| `specs/facetsearch.prd.md` | This specification |
| `components/facetsearch/facetsearch.ts` | TypeScript source |
| `components/facetsearch/facetsearch.scss` | Styles (imports `../../src/scss/variables`) |
| `components/facetsearch/README.md` | Component documentation |

Output in `dist/`:

```
dist/
└── components/
    └── facetsearch/
        ├── facetsearch.js      # Compiled JavaScript (IIFE-wrapped)
        └── facetsearch.css     # Compiled CSS
```

---

## 13. Open Questions

1. Should the parser support boolean operators (`AND`, `OR`, `NOT`) between facets, or is the implicit AND (all facets must match) sufficient for v1?
2. Should facet chips be editable inline (click to modify value) or is the remove-and-retype workflow acceptable for v1?
3. Should the component support a "structured mode" toggle that shows a visual form with dropdowns for each facet instead of the text-based query syntax?
4. Should `loadValues` results be cached across dropdown open/close cycles, or only within a single dropdown session?
5. Should the component emit a `FacetSearchQuery` object on every keystroke (via `onChange`) or only on submit (via `onSearch`)? Currently `onChange` emits the raw string; consumers must call `getQuery()` to get the parsed form.
