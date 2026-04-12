# Migration Guide: Sidebar Close & Float Button Workaround Removal

**Date**: 2026-04-12
**CDN Fix**: ADR-115 (`static.knobby.io/components/sidebar/sidebar.js`)
**Audience**: Apps team coding agents
**Priority**: Low (cosmetic cleanup, no user-facing change)

## What Changed in the CDN

The Sidebar component now supports two options that control button visibility:

| Option | Type | Default | Effect |
|--------|------|---------|--------|
| `draggable` | `boolean` | `true` | When `false`, hides the Float/Undock button **and** prevents drag |
| `closable` | `boolean` | `true` | When `false`, hides the Close (x) button entirely |

Both options existed before for behaviour control, but the buttons were always
rendered. Now the buttons are conditionally rendered based on these options.

## Migration Steps Per App

For each app listed below, perform two changes:

### Step 1 — Add `closable: false` to every `createSidebar()` / `new Sidebar()` call

Find the sidebar construction call and add `closable: false` alongside the
existing `draggable: false`. The `draggable: false` option is already present
in every app; it now also hides the float button, so no additional change is
needed for that.

```typescript
// BEFORE
const sidebar = createSidebar({
    title: "Explorer",
    dockPosition: "left",
    draggable: false,
    onBeforeClose: () => false,
    // ...
});

// AFTER
const sidebar = createSidebar({
    title: "Explorer",
    dockPosition: "left",
    draggable: false,
    closable: false,
    // ...
});
```

Once `closable: false` is set, the `onBeforeClose: () => false` guard is no
longer needed (there is no close button to trigger it). Remove that callback
to reduce dead code.

### Step 2 — Remove the CSS workaround rules

Search each app's CSS files for rules that hide sidebar buttons. Delete
the entire rule block:

```css
/* DELETE THIS BLOCK */
.sidebar-close-btn,
.sidebar-float-btn {
    display: none !important;
}
```

## Affected Apps — Checklist

Work through each app in order. Check off each step as you complete it.

### 1. Explorer

| Step | File | Action |
|------|------|--------|
| 1a | `typescript/apps/explorer/main.ts` (lines 589-622) | Add `closable: false` to both sidebar configs (Navigation left, Properties right) |
| 1b | `typescript/apps/explorer/main.ts` | Remove `onBeforeClose: () => false` from both sidebar configs |
| 2 | `frontend/css/explorer-sidebar.css` | Delete `.sidebar-close-btn, .sidebar-float-btn { display: none !important; }` rule |

### 2. Diagrams

| Step | File | Action |
|------|------|--------|
| 1a | `typescript/apps/diagrams/diagrams-sidebar.ts` (lines 61-87) | Add `closable: false` to both sidebar configs (Explorer left, Data right) |
| 1b | `typescript/apps/diagrams/diagrams-sidebar.ts` | Remove `onBeforeClose: () => false` from both sidebar configs |
| 2 | App CSS file (grep for `.sidebar-close-btn`) | Delete the workaround rule |

### 3. Thinker

| Step | File | Action |
|------|------|--------|
| 1a | `typescript/apps/thinker/thinker-sidebar.ts` (lines 58-84) | Add `closable: false` to both sidebar configs (Explorer left, Categories right) |
| 1b | `typescript/apps/thinker/thinker-sidebar.ts` | Remove `onBeforeClose: () => false` from both sidebar configs |
| 2 | App CSS file (grep for `.sidebar-close-btn`) | Delete the workaround rule |

### 4. Checklists

| Step | File | Action |
|------|------|--------|
| 1a | `typescript/apps/checklists/checklists-main.ts` | Add `closable: false` to both sidebar configs (Explorer left, Properties right) |
| 1b | `typescript/apps/checklists/checklists-main.ts` | Remove `onBeforeClose: () => false` from both sidebar configs |
| 2 | App CSS file (grep for `.sidebar-close-btn`) | Delete the workaround rule |

### 5. Strukture

| Step | File | Action |
|------|------|--------|
| 1a | `typescript/apps/strukture/strukture-main.ts` | Add `closable: false` to both sidebar configs (Explorer left, Properties right) |
| 1b | `typescript/apps/strukture/strukture-main.ts` | Remove `onBeforeClose: () => false` from both sidebar configs |
| 2 | App CSS file (grep for `.sidebar-close-btn`) | Delete the workaround rule |

## Verification

After each app is updated:

1. Open the app in a browser
2. Confirm the sidebar title bar shows **only** the Collapse chevron button
3. Confirm no Float or Close buttons appear
4. Confirm collapse/expand still works
5. Confirm no `display: none !important` rules remain for sidebar buttons in the app CSS

## Search Commands

Use these to find all remaining workarounds across the codebase:

```bash
# Find CSS workaround rules
grep -rn "sidebar-close-btn" --include="*.css" --include="*.scss"
grep -rn "sidebar-float-btn" --include="*.css" --include="*.scss"

# Find sidebar configs missing closable: false
grep -rn "draggable:\s*false" --include="*.ts" -A5 | grep -v "closable"

# Find onBeforeClose guards that can be removed
grep -rn "onBeforeClose.*false" --include="*.ts"
```

## Notes

- `closable: false` only hides the UI button. The programmatic `destroy()`
  method still works for lifecycle cleanup.
- `draggable: false` now hides the Float button **and** prevents drag-to-float.
  This was always the intended behaviour per the original component spec.
- No CDN version bump is required; the change is backward-compatible
  (`closable` defaults to `true`).
