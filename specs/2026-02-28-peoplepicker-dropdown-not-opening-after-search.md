# Bug Report: PeoplePicker Dropdown Does Not Open After Search Results Arrive

**Date:** 2026-02-28
**Reporter:** Platform team (via Claude agent)
**Severity:** High — autocomplete search appears completely broken; users see no results
**Affects:** PeoplePicker CDN component (`static.knobby.io/components/peoplepicker/`)
**Workaround:** MutationObserver on `.peoplepicker-dropdown` with `subtree: true` to force dropdown visible when results are populated (see workaround section below)

---

## Summary

When using the PeoplePicker component, typing a search query correctly triggers `onSearch`, the callback returns results, and those results are rendered into the `.peoplepicker-listbox-results` container — but the `.peoplepicker-dropdown` remains `display: none`. The user sees nothing and the component appears non-functional.

## Expected Behaviour

1. User types 2+ characters in the PeoplePicker input
2. `onSearch` callback fires and returns results
3. Results are rendered into the listbox
4. **The dropdown should automatically open** (set `display: ''` or `display: block`) to show the results
5. User can click a result to select it

## Actual Behaviour

Steps 1-3 work correctly. At step 4, the dropdown remains hidden (`display: none`). The results exist in the DOM but are invisible to the user. The component appears completely non-functional.

## Root Cause Analysis

The `executeSearch()` method in the PeoplePicker source correctly:
1. Calls the `onSearch` callback
2. Receives results
3. Creates result DOM elements in the `.peoplepicker-listbox-results` container

But `executeSearch()` **never calls `openDropdown()`** after populating results.

The `openDropdown()` method is only called from:
- `onInputFocus()` — only if `frequentContacts` are configured (shows the frequent contacts section)
- `onInputKeydown()` — only on `ArrowDown` key

This means:
- If `frequentContacts` are provided, the dropdown opens on focus (before any typing), but closing it and re-searching won't reopen it
- If `frequentContacts` are NOT provided, the dropdown never opens at all unless the user presses ArrowDown
- In neither case does the dropdown open as a direct result of search results arriving

### Suggested Fix

In `executeSearch()`, after results are rendered, call `openDropdown()`:

```javascript
async executeSearch(query) {
    // ... existing search logic ...
    this.renderResults(results);
    this.openDropdown();  // <-- Add this line
}
```

## Secondary Issue: CSS Containing Block Trap with FormDialog

When PeoplePicker is used inside a FormDialog, there is an additional CSS issue. FormDialog's entrance animation applies a `transform` to `.formdialog-dialog`. Per CSS spec, any ancestor with a `transform` property creates a new containing block for `position: fixed` descendants. Since PeoplePicker's dropdown uses `position: fixed`, it becomes positioned relative to the dialog instead of the viewport, and gets clipped by `overflow: hidden` on `.formdialog-body`.

### Suggested Fix

Either:
- **Option A (FormDialog):** Remove the `transform` after the entrance animation completes (set `transform: none` when animation ends)
- **Option B (PeoplePicker):** Use `position: absolute` instead of `position: fixed`, or use `getBoundingClientRect()` to calculate position relative to the containing block
- **Option C (PeoplePicker):** Append the dropdown to `document.body` instead of inside the component tree, avoiding the containing block entirely (this is how many dropdown libraries work — e.g., Popper.js, Tippy.js)

Option C is the most robust long-term solution as it avoids all containing block issues regardless of where the PeoplePicker is placed.

## Reproduction Steps

```javascript
// Minimal reproduction
const picker = createPeoplePicker('my-container', {
    placeholder: 'Search...',
    onSearch: async (query) => {
        // Simulate API call
        return [
            { id: '1', name: 'Test User', email: 'test@example.com' },
            { id: '2', name: 'Another User', email: 'another@example.com' },
        ];
    },
    onSelect: (person) => console.log('Selected:', person),
});

// Steps:
// 1. Click the input field
// 2. Type "test"
// 3. Wait for onSearch to return
// 4. OBSERVE: No dropdown appears, despite results being in the DOM
// 5. Open browser DevTools → inspect .peoplepicker-dropdown → it has display: none
// 6. Manually set display: '' → results ARE there, just hidden
```

### Inside FormDialog (compounds the issue)

```javascript
const dlg = createFormDialog({
    title: 'Add Member',
    fields: [
        { name: 'person', label: 'Person', type: 'custom' },
    ],
    onSubmit: async (data) => { /* ... */ },
});

dlg.show();

// After dialog opens:
const picker = createPeoplePicker('person-container-in-dialog', {
    onSearch: async (query) => {
        return [{ id: '1', name: 'Test User', email: 'test@example.com' }];
    },
    onSelect: (person) => console.log(person),
});

// Same bug as above, PLUS the CSS containing block issue clips the dropdown
```

## DOM Structure Reference

```
.peoplepicker-dropdown (display: none — NEVER set to '' after search)
  ├── .peoplepicker-section (Frequent)
  │   ├── .peoplepicker-section-header
  │   └── .peoplepicker-listbox (always 0 children — red herring)
  ├── .peoplepicker-section (Results)
  │   ├── .peoplepicker-section-header
  │   └── .peoplepicker-listbox-results (receives search result rows)
  │       ├── .peoplepicker-row (result 1)
  │       ├── .peoplepicker-row (result 2)
  │       └── .peoplepicker-row (result 3)
  └── .peoplepicker-no-results
```

**Important note:** `.peoplepicker-listbox` and `.peoplepicker-listbox-results` are siblings
in separate sections. They are NOT the same element. `.peoplepicker-listbox` (under Frequent)
remains empty, while `.peoplepicker-listbox-results` (under Results) receives the search rows.

## Current Workaround

In the consuming app (`strukture-ui.ts` and `strukture-main.ts`), a MutationObserver watches
the entire dropdown subtree and forces the dropdown visible when results are populated:

```typescript
function ensurePeoplePickerDropdownOpens(containerId: string): void
{
    const container = document.getElementById(containerId);
    if (!container) return;

    // Fix CSS containing block trap from FormDialog's entrance animation
    const dialogEl = container.closest('.formdialog-dialog') as HTMLElement;
    if (dialogEl) dialogEl.style.transform = 'none';

    const dropdown = container.querySelector('.peoplepicker-dropdown') as HTMLElement;
    if (!dropdown) return;

    const positionAndShow = (): void =>
    {
        const resultsListbox = container.querySelector('.peoplepicker-listbox-results') as HTMLElement;
        if (!resultsListbox || resultsListbox.children.length === 0) return;
        const picker = container.querySelector('.peoplepicker') as HTMLElement;
        if (!picker) return;
        const rect = picker.getBoundingClientRect();
        dropdown.style.position = 'fixed';
        dropdown.style.left = `${rect.left}px`;
        dropdown.style.top = `${rect.bottom + 2}px`;
        dropdown.style.width = `${rect.width}px`;
        dropdown.style.display = '';
        dropdown.style.zIndex = '2100';
    };

    // Must observe the entire dropdown subtree — observing .peoplepicker-listbox-results
    // alone may miss mutations if the CDN component rebuilds internal elements.
    const observer = new MutationObserver(() => positionAndShow());
    observer.observe(dropdown, { childList: true, subtree: true });

    // Cleanup when dialog closes
    const overlay = container.closest('.formdialog-overlay');
    if (overlay)
    {
        const closeObserver = new MutationObserver(() =>
        {
            if (!document.body.contains(overlay))
            {
                observer.disconnect();
                closeObserver.disconnect();
            }
        });
        closeObserver.observe(document.body, { childList: true });
    }
}
```

This workaround should be removed once the CDN component is fixed.

## Environment

- PeoplePicker CDN: `static.knobby.io/components/peoplepicker/peoplepicker.js`
- Observed in: Strukture app (Add Member dialog, ShareDialog)
- Browser: Chromium (via Playwright), also confirmed in Chrome
- Other CDN components used alongside: FormDialog, ShareDialog, Toast
