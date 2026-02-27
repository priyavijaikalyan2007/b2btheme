<!-- AGENT: PRD specification for the ShareDialog component — modal share dialog with PeoplePicker and access level management. -->

# ShareDialog — Product Requirements Document

## Overview

ShareDialog is a reusable modal dialog for sharing resources with people at configurable access levels. It composes PeoplePicker (ADR-037) for person selection and PersonChip (ADR-036) for existing access display. It follows FormDialog's overlay pattern (z-index 2000) with ConfirmDialog's simpler promise-based API.

PersonChip and PeoplePicker were designed specifically for embedding in this component.

## Problem Statement

Enterprise SaaS applications universally need share dialogs — Google Docs, Figma, Jira, Confluence all have them. Without a reusable component, each application reimplements person selection, access level management, and diff computation. This leads to inconsistent UX, duplicated code, and integration brittleness.

## Goals

1. Modal dialog with PeoplePicker for adding people and access level selector.
2. Existing access list showing PersonChip + access level dropdown + remove button per row.
3. Configurable access levels (e.g. Viewer, Commenter, Editor, Owner).
4. Diff computation: `{ added, changed, removed }` comparing current vs original state.
5. Promise-based API: `showShareDialog()` returns `Promise<ShareDialogResult | null>`.
6. Imperative API: `createShareDialog()` returns instance for programmatic control.
7. Three size variants: sm, md, lg.
8. Full keyboard accessibility with focus trap.

## Non-Goals

- Link sharing (public/anyone-with-link). Can be added later as a separate section.
- Notification messages or email body. Can be added later as an optional textarea.
- Drag-and-drop reordering of access list.
- Server-side pagination of existing access list.
- Inline person creation (consumer provides data via PeoplePicker's search).

## User Stories

1. **As a user**, I want to open a share dialog and search for people to add so I can grant them access.
2. **As a user**, I want to select an access level before adding people so they get the right permissions.
3. **As a user**, I want to see who already has access and at what level so I can review permissions.
4. **As a user**, I want to change an existing person's access level via a dropdown.
5. **As a user**, I want to remove a person's access by clicking a remove button.
6. **As a user**, I want to click "Done" and have the app receive only the changes (added, changed, removed).
7. **As a user**, I want to cancel the dialog and have no changes applied.
8. **As a developer**, I want to configure the access levels (id, label, description) for my application.
9. **As a developer**, I want to provide existing access data and receive a diff of what changed.

## Interfaces

### AccessLevel

```typescript
interface AccessLevel
{
    id: string;
    label: string;
    description?: string;
}
```

### SharedPerson

```typescript
interface SharedPerson
{
    person: PersonData;
    accessLevelId: string;
}
```

### ShareDialogResult

```typescript
interface ShareDialogResult
{
    added: SharedPerson[];
    changed: SharedPerson[];
    removed: string[];
}
```

### ShareDialogOptions

```typescript
interface ShareDialogOptions
{
    title: string;
    accessLevels: AccessLevel[];
    defaultAccessLevelId?: string;
    existingAccess?: SharedPerson[];
    frequentContacts?: PersonData[];
    onSearch?: (query: string) => Promise<PersonData[]>;
    searchUrl?: string;
    onShare?: (result: ShareDialogResult) => void | Promise<void>;
    onCancel?: () => void;
    size?: "sm" | "md" | "lg";
    cssClass?: string;
    closeOnBackdrop?: boolean;
    closeOnEscape?: boolean;
    keyBindings?: Record<string, string>;
}
```

## DOM Structure

```
div.sharedialog-overlay [fixed, z-index 2000]
  div.sharedialog-backdrop [absolute, inset 0, fade]
  div.sharedialog.sharedialog-{size} [role="dialog", aria-modal]
    div.sharedialog-header
      h2.sharedialog-title
      button.sharedialog-close [aria-label="Close"]
    div.sharedialog-body
      div.sharedialog-add-section
        div.sharedialog-picker-row [flex]
          div.sharedialog-picker-wrap [flex: 1, PeoplePicker mounts here]
          select.sharedialog-access-select [configurable access levels]
        button.sharedialog-add-btn.btn.btn-primary ["Add"]
      div.sharedialog-divider
      div.sharedialog-existing-section
        h3.sharedialog-section-label ["People with access"]
        div.sharedialog-access-list [scrollable, max-height 240px]
          div.sharedialog-access-row [flex] x N
            div.sharedialog-access-person [PersonChip md]
            select.sharedialog-access-level
            button.sharedialog-access-remove [x]
    div.sharedialog-footer
      span.sharedialog-status
      div.sharedialog-actions
        button.btn.btn-secondary [Cancel]
        button.btn.btn-primary [Done]
```

## Keyboard Navigation

| Key | Action |
|-----|--------|
| Escape | Close dialog (cancel) |
| Tab | Cycle focus within dialog (focus trap) |
| Enter | Activates focused button |

## Accessibility

- `role="dialog"` on dialog, `aria-modal="true"`
- Title linked via `aria-labelledby`
- `aria-live="polite"` region announces access changes
- Remove buttons have `aria-label="Remove <name>"`
- Close button has `aria-label="Close"`
- Native `<select>` elements for access levels (inherently accessible)
- Focus trapped within dialog
- Focus restored on close

## Visual Design

- Overlay: fixed, flex center, z-index 2000
- Backdrop: rgba($gray-900, 0.5), opacity fade transition
- Dialog: $gray-50 background, 1px $gray-300 border, box-shadow, scale+fade enter
- Header: flex, border-bottom $gray-200, title + close button
- Body: padding 16px, overflow-y auto
- Add Section: picker row with flex gap, native select with form-select styling, primary Add button
- Divider: 1px $gray-200
- Existing Section: uppercase label $gray-500, scrollable list max-height 240px
- Access Row: flex with PersonChip md + select + remove button
- Footer: flex space-between, status text + Cancel/Done buttons
- Loading state: opacity 0.6, pointer-events none
- Size variants: sm 400px, md 550px, lg 750px

## Technical Notes

- PeoplePicker resolved at runtime via `window.createPeoplePicker` (IIFE-safe)
- PersonChip resolved at runtime via `window.createPersonChip` (IIFE-safe)
- Fallback: simple spans with inlined initials helpers if PersonChip JS not loaded
- Diff computation compares current access map vs original access map snapshot
- Native `<select>` for access level dropdowns — no import needed, accessible by default
