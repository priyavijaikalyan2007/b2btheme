<!-- AGENT: PRD specification for the PeoplePicker component — searchable person selector. -->

# PeoplePicker — Product Requirements Document

## Overview

PeoplePicker is a searchable person selector for share dialogs, assignment fields, and permission lists. It provides a searchable dropdown with pre-loaded frequent contacts, optional async API lookup, and PersonChip integration for visually rich person rows. Supports both single-select ("Assign to") and multi-select ("Share with") modes.

PersonChip (ADR-036) was designed specifically for embedding in this component.

## Problem Statement

Person selection in share dialogs and assignment UIs is currently plain text entry. Users must type exact names or emails with no auto-complete, no visual confirmation of who they selected, and no access to a frequent contacts list. This leads to errors, slow task completion, and poor UX.

## Goals

1. Searchable person selector with inline chips (multi-select) or single-person display (single-select).
2. Frequent contacts shown on focus before typing, with "Frequent" section header.
3. Async search via callback (`onSearch`) or URL-based (`searchUrl`) with "Results" section header.
4. PersonChip integration at sm size for selected chips and md size for dropdown rows.
5. Keyboard-navigable: ArrowUp/Down, Enter to select, Escape to close, Backspace to remove last chip.
6. Configurable max selections with overflow badge ("+N more").
7. Disabled and readonly states.
8. Three size variants: sm, md, lg.

## Non-Goals

- Drag-and-drop reordering of selected chips.
- Inline editing of person data.
- Built-in person creation (consumer provides data via `onSearch` or `searchUrl`).
- Server-side pagination of results.

## User Stories

1. **As a user**, I want to type a name in a share dialog and see matching people so I can select the right person.
2. **As a user**, I want to see my frequent contacts when I focus the field so I can quickly select common collaborators.
3. **As a user**, I want to remove selected people by clicking X on their chip or pressing Backspace.
4. **As a user**, I want to navigate the dropdown with keyboard only so I can use the component without a mouse.
5. **As a developer**, I want to provide either a callback or URL for async search so I can integrate with any backend.
6. **As a developer**, I want to limit selections with `maxSelections` and control display with `maxChipsVisible`.

## Interfaces

### PersonData

```typescript
interface PersonData
{
    id: string;
    name: string;
    email?: string;
    avatarUrl?: string;
    role?: string;
    status?: "online" | "offline" | "busy" | "away";
    metadata?: Record<string, string>;
}
```

### PeoplePickerOptions

```typescript
interface PeoplePickerOptions
{
    multiple?: boolean;              // Default: true
    maxSelections?: number;          // 0 = unlimited. Default: 0
    selected?: PersonData[];         // Pre-selected on init
    frequentContacts?: PersonData[];
    onSearch?: (query: string) => Promise<PersonData[]>;
    searchUrl?: string;
    debounceMs?: number;             // Default: 300
    minSearchChars?: number;         // Default: 2
    placeholder?: string;            // Default: "Search people..."
    maxChipsVisible?: number;        // Default: 5
    noResultsText?: string;          // Default: "No results found"
    size?: "sm" | "md" | "lg";      // Default: "md"
    cssClass?: string;
    disabled?: boolean;
    readonly?: boolean;
    onSelect?: (person: PersonData) => void;
    onDeselect?: (person: PersonData) => void;
    onChange?: (selected: PersonData[]) => void;
    onOpen?: () => void;
    onClose?: () => void;
    onSearchError?: (error: Error) => void;
    keyBindings?: Partial<Record<string, string>>;
}
```

## DOM Structure

- Root: `div.peoplepicker` with `role="combobox"`
- Input area: flex-wrap row of PersonChip sm chips + text input
- Overflow badge: `+N more` when chips exceed `maxChipsVisible`
- Dropdown: absolute-positioned panel with "Frequent" and "Results" sections
- Rows: PersonChip md elements with check icon for selected state
- Single-select: selected person shown as PersonChip md replacing input; click to clear

## Keyboard Navigation

| Key | Dropdown Closed | Dropdown Open |
|-----|----------------|---------------|
| ArrowDown | Open + highlight first | Move highlight down |
| ArrowUp | — | Move highlight up |
| Enter | — | Select highlighted |
| Escape | Clear input | Close dropdown |
| Backspace | Remove last chip | Remove last chip |
| Tab | Normal focus | Close + tab |
| Home | — | First row |
| End | — | Last row |

## Accessibility

- `role="combobox"` on root, `role="listbox"` on dropdown sections
- `aria-activedescendant` tracks highlighted row
- `aria-live="polite"` region announces selection changes
- Remove buttons have `aria-label="Remove <name>"`

## Visual Design

- Input area matches Bootstrap form-control styles
- Section headers: uppercase, $gray-500, $font-size-sm, font-weight 600 (matches UserMenu group-header)
- Dropdown: z-index 1050, 1px $gray-300 border, $gray-50 background, box-shadow
- Row hover: $gray-100; highlighted: $gray-200; selected: check icon visible
- Size variants affect min-height, chip size, row padding
- Disabled: $input-disabled-bg, opacity 0.65, cursor not-allowed
- Readonly: $gray-100 bg, no input or remove buttons

## Technical Notes

- PersonChip resolved at runtime via `window.createPersonChip` (IIFE-safe)
- Fallback: simple spans with inlined initials helpers if PersonChip JS not loaded
- Async search uses generation counter to prevent stale result rendering
- URL-based search: `searchUrl + (includes("?") ? "&" : "?") + "q=" + encodeURIComponent(query)`
