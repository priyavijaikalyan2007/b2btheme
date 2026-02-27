<!-- AGENT: Documentation for the ShareDialog modal share component. -->

# ShareDialog

A modal dialog for sharing resources with configurable access levels. Composes PeoplePicker for person search/selection and PersonChip for existing access display. Returns a diff of added, changed, and removed access when the user clicks Done.

## Assets

| Asset | Path |
|-------|------|
| CSS | `components/sharedialog/sharedialog.css` |
| JS | `components/sharedialog/sharedialog.js` |
| Types | `components/sharedialog/sharedialog.d.ts` |

## Requirements

- **Bootstrap CSS** -- for SCSS variables, `.btn-*`, `.form-select` classes
- **Bootstrap Icons** -- optional, used if PersonChip is loaded
- **Enterprise theme CSS** -- `css/custom.css`
- **PeoplePicker** -- `components/peoplepicker/peoplepicker.js` (optional but recommended)
- **PersonChip** -- `components/personchip/personchip.js` (optional, falls back to simple spans)
- Does **not** require Bootstrap JS.

## Quick Start

```html
<link rel="stylesheet" href="css/custom.css">
<link rel="stylesheet" href="components/personchip/personchip.css">
<link rel="stylesheet" href="components/peoplepicker/peoplepicker.css">
<link rel="stylesheet" href="components/sharedialog/sharedialog.css">

<script src="components/personchip/personchip.js"></script>
<script src="components/peoplepicker/peoplepicker.js"></script>
<script src="components/sharedialog/sharedialog.js"></script>
<script>
    async function shareDocument() {
        const result = await showShareDialog({
            title: "Share Document",
            accessLevels: [
                { id: "viewer", label: "Viewer" },
                { id: "commenter", label: "Commenter" },
                { id: "editor", label: "Editor" },
            ],
            defaultAccessLevelId: "viewer",
            existingAccess: [
                { person: { id: "1", name: "Alice Smith", email: "alice@example.com" }, accessLevelId: "editor" },
            ],
            frequentContacts: [
                { id: "2", name: "Bob Jones", email: "bob@example.com" },
                { id: "3", name: "Carol Lee", email: "carol@example.com" },
            ],
            onSearch: async (query) => {
                const resp = await fetch(`/api/people?q=${encodeURIComponent(query)}`);
                return resp.json();
            },
        });

        if (result) {
            console.log("Added:", result.added);
            console.log("Changed:", result.changed);
            console.log("Removed:", result.removed);
        }
    }
</script>
```

## API

### Global Functions

| Function | Returns | Description |
|----------|---------|-------------|
| `showShareDialog(options)` | `Promise<ShareDialogResult \| null>` | Show share dialog; resolves to result diff on Done, `null` on Cancel |
| `createShareDialog(options)` | `ShareDialog` | Create instance for imperative control; call `.show()` to display |

### Class: `ShareDialog`

```js
const dialog = createShareDialog({ title: "Share", accessLevels: [...] });
const result = await dialog.show();
```

- `show()` -- Build, mount, display. Returns `Promise<ShareDialogResult | null>`.
- `close()` -- Close and cancel (resolves `null`).
- `destroy()` -- Tear down and release all resources.
- `getElement()` -- Get the root overlay element.
- `setLoading(loading)` -- Toggle loading state (dims dialog, disables interaction).

## ShareDialogOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `title` | `string` | **required** | Dialog title text |
| `accessLevels` | `AccessLevel[]` | **required** | Available access levels |
| `defaultAccessLevelId` | `string` | First level | Default access level for new additions |
| `existingAccess` | `SharedPerson[]` | `[]` | People who already have access |
| `frequentContacts` | `PersonData[]` | `[]` | Frequent contacts for PeoplePicker |
| `onSearch` | `(query) => Promise<PersonData[]>` | -- | Async search callback |
| `searchUrl` | `string` | -- | URL-based search for PeoplePicker |
| `onShare` | `(result) => void \| Promise<void>` | -- | Callback when user clicks Done |
| `onCancel` | `() => void` | -- | Callback when user cancels |
| `size` | `string` | `"md"` | `"sm"`, `"md"`, `"lg"` |
| `cssClass` | `string` | -- | Additional CSS class on the dialog |
| `closeOnBackdrop` | `boolean` | `true` | Close when clicking outside |
| `closeOnEscape` | `boolean` | `true` | Close on Escape key |
| `keyBindings` | `Record<string, string>` | -- | Override default key bindings |

## Data Types

### AccessLevel

```typescript
{ id: string; label: string; description?: string }
```

### SharedPerson

```typescript
{ person: PersonData; accessLevelId: string }
```

### ShareDialogResult

```typescript
{
    added: SharedPerson[];    // newly added people
    changed: SharedPerson[];  // people whose access level changed
    removed: string[];        // IDs of removed people
}
```

## Keyboard

| Key | Action |
|-----|--------|
| `Escape` | Cancel (resolve `null`) |
| `Tab` | Cycle focus within dialog (focus trap) |
| `Enter` | Activate focused button |

Key bindings can be overridden via the `keyBindings` option:

```js
showShareDialog({
    title: "Share",
    accessLevels: [...],
    keyBindings: { close: "Ctrl+Escape" },
});
```

## Accessibility

- Dialog uses `role="dialog"` and `aria-modal="true"`
- Title linked via `aria-labelledby`
- `aria-live="polite"` region announces access changes to screen readers
- Remove buttons have `aria-label="Remove <name>"`
- Close button has `aria-label="Close"`
- Native `<select>` elements for access levels (inherently accessible)
- Focus trapped within dialog on Tab
- Focus restored to previously active element on close
- Animations respect `prefers-reduced-motion: reduce`

## DOM Structure

```
div.sharedialog-overlay [z-index 2000]
  div.sharedialog-backdrop
  div.sharedialog.sharedialog-{size} [role="dialog" aria-modal="true"]
    div.sharedialog-header
      h2.sharedialog-title
      button.sharedialog-close [aria-label="Close"]
    div.sharedialog-body
      div.sharedialog-add-section
        div.sharedialog-picker-row
          div.sharedialog-picker-wrap [PeoplePicker mounts here]
          select.sharedialog-access-select.form-select
        button.sharedialog-add-btn.btn.btn-primary
      div.sharedialog-divider
      div.sharedialog-existing-section
        h3.sharedialog-section-label "People with access"
        div.sharedialog-access-list
          div.sharedialog-access-row [data-person-id] x N
            div.sharedialog-access-person [PersonChip md]
            select.sharedialog-access-level.form-select
            button.sharedialog-access-remove
    div.sharedialog-footer
      span.sharedialog-status
      div.sharedialog-actions
        button.sharedialog-cancel-btn.btn.btn-secondary
        button.sharedialog-done-btn.btn.btn-primary
    div.visually-hidden [aria-live="polite"]
```

## Features

- **Promise-based** -- `await showShareDialog(...)` returns result diff or `null`
- **Diff computation** -- Returns only what changed: `{ added, changed, removed }`
- **Configurable access levels** -- Define your own (Viewer, Editor, Owner, etc.)
- **PeoplePicker integration** -- Searchable person selector with frequent contacts
- **PersonChip display** -- Rich person identity chips in access list
- **Focus trap** -- Tab cycles within the dialog
- **Focus restore** -- Returns focus to the previously active element
- **Loading state** -- Async `onShare` callback with dimmed dialog
- **Backdrop dismiss** -- Click outside to cancel (configurable)
- **XSS safe** -- All content set via `textContent`, never `innerHTML`
- **Graceful degradation** -- Works without PeoplePicker/PersonChip via fallbacks
- **Auto-cleanup** -- DOM removed when dialog resolves
- **No Bootstrap JS dependency** -- Fully standalone modal implementation
