# Enhancement Request: ShareDialog Remove Confirmation

**Component**: `theme.priyavijai-kalyan2007.workers.dev/components/sharedialog/sharedialog.js`
**Date**: 2026-02-28
**Priority**: Low (cosmetic UX improvement)
**Reporter**: Strukture app integration

## Current Behavior

When a user clicks the remove/revoke button for a shared person in the ShareDialog component, the person is immediately removed from the list with no confirmation step. The removal is staged (not committed until "Save"), but the instant removal can be surprising to users.

## Expected Behavior

Before removing a person's access, show a lightweight confirmation — either:

1. **Inline undo toast** (preferred): Remove immediately but show a brief "Removed [Name]. Undo?" toast/snackbar at the bottom of the dialog for 5 seconds, allowing the user to reverse the action.
2. **ConfirmDialog integration**: Use the CDN ConfirmDialog component to ask "Remove [Name]'s access?" before removing.

## Suggested API Addition

Add an optional `onRemoveConfirm` callback to the ShareDialog options:

```typescript
interface ShareDialogOptions {
    // ... existing options ...

    /**
     * Called before removing a person's access. Return true to proceed, false to cancel.
     * If not provided, removal is immediate (current behavior).
     */
    onRemoveConfirm?: (person: { id: string; name: string }) => Promise<boolean>;
}
```

This allows consuming apps to integrate their preferred confirmation UX (ConfirmDialog, toast, inline undo, etc.) without hardcoding a specific approach in the component.

## Workaround

The consuming app cannot intercept the removal since `handleRemoveAccess()` is internal to the component. The staged save model (changes only apply on "Save") partially mitigates this — users can cancel the entire dialog to undo removals.

## Impact

Low — the staged save model means accidental removals are recoverable by cancelling. But the UX is inconsistent with other destructive actions in the platform that use ConfirmDialog.
