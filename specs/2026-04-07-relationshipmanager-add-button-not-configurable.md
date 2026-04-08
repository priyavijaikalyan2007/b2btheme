# Bug Report: RelationshipManager Add Button Not Configurable

> **Date:** 2026-04-07
> **Severity:** Medium (functional — workaround exists via ribbon wizard)
> **Component:** CDN RelationshipManager (`static.knobby.io/components/relationshipmanager/`)
> **Affected Apps:** Strukture, Diagrams, Thinker, Checklists, Explorer (all apps using the Related tab)

---

## Summary

The CDN RelationshipManager component always shows the "+Add" button whenever `readOnly` is `false`, regardless of whether the `onCreateRelationship` callback is provided. There is no way to show delete+navigate functionality while hiding the create button.

---

## Problem

We need the RelationshipManager in **display + delete + navigate** mode — no built-in add wizard. Creation is now handled by app-specific ribbon wizards (e.g., Strukture's "Add Relationship" Stepper wizard). However, even when `onCreateRelationship` is **omitted** from the options object, the Add button still renders.

### Expected Behavior

When `onCreateRelationship` is not provided (or a new `showAddButton: false` option is set), the Add button should be hidden.

### Actual Behavior

The Add button is always visible when `readOnly: false`.

---

## Reproduction

```typescript
const manager = window.createRelationshipManager({
    container: el,
    resourceId: '...',
    resourceType: '...',
    resourceDisplayName: '...',
    relationshipDefinitions: [...],
    relationships: [...],
    readOnly: false,
    // NOTE: onCreateRelationship is NOT provided
    onDeleteRelationship: async (id) => { /* ... */ },
    onNavigate: (id) => { /* ... */ },
});
// ❌ Add button still visible
```

---

## Proposed Fix (any of these)

### Option A: Infer from callback presence (Recommended)
Hide the Add button when `onCreateRelationship` is not provided (key absent from options). This is the most intuitive behavior — no callback means no create capability.

### Option B: Add `showAddButton` option
```typescript
interface RelationshipManagerOptions {
    // ...existing options...
    /** Show the Add button. Default: true when readOnly=false. */
    showAddButton?: boolean;
}
```

### Option C: Separate `readOnlyCreate` / `readOnlyDelete` flags
Allow granular control:
```typescript
interface RelationshipManagerOptions {
    /** Disable create operations only. */
    disableCreate?: boolean;
    /** Disable delete operations only. */
    disableDelete?: boolean;
}
```

---

## Workaround

Currently none — the Add button is visible and clickable but non-functional (since no callback is provided, clicking it likely shows an incomplete wizard or does nothing).

---

## Impact

- All apps using the shared `ExplorerRightPanel` Related tab show a non-functional Add button
- Users may click it expecting it to work, creating a confusing experience
- Strukture has a working ribbon-based wizard but users see two "add" entry points
