# Bug: CDN Sidebar — Close and Float Buttons Visible Despite Configuration

**Date**: 2026-04-12
**Component**: CDN Sidebar (`static.knobby.io/components/sidebar/sidebar.js`)
**Severity**: Medium (UI issue, platform-wide)
**Status**: Open

## Description

The CDN Sidebar component renders Close (`x`) and Float/Undock buttons in the title bar even when the configuration explicitly disables these capabilities.

## Expected Behavior

1. `draggable: false` should hide the Float/Undock button entirely (not just prevent the action).
2. A `closable` property should exist on `SidebarOptions` (similar to `TabbedPanelTab.closable`) — when `closable: false`, the Close button should be hidden entirely.

## Actual Behavior

- **Float button**: Visible despite `draggable: false` being set. The sidebar cannot actually be undocked (the setting works functionally), but the button still renders and confuses users.
- **Close button**: Visible always. `onBeforeClose: () => false` prevents the action but the button is still rendered. There is no `closable` property on `SidebarOptions` to hide it.

## Affected Apps

All Knobby.io apps that use CDN Sidebar (all pass `draggable: false` and `onBeforeClose: () => false`):

| App | File | Sidebars |
|-----|------|----------|
| Explorer | `typescript/apps/explorer/main.ts:589-622` | Navigation (left), Properties (right) |
| Diagrams | `typescript/apps/diagrams/diagrams-sidebar.ts:61-87` | Explorer (left), Data (right) |
| Thinker | `typescript/apps/thinker/thinker-sidebar.ts:58-84` | Explorer (left), Categories (right) |
| Checklists | `typescript/apps/checklists/checklists-main.ts` | Explorer (left), Properties (right) |
| Strukture | `typescript/apps/strukture/strukture-main.ts` | Explorer (left), Properties (right) |

## Reproduction

1. Open any app (e.g., Explorer at `/explorer`)
2. Observe the sidebar title bars — both left and right sidebars show three buttons: Collapse, Float, Close
3. Only Collapse should be visible

## Requested Changes

### Bug Fix: `draggable: false` should hide Float button

When `draggable` is explicitly `false`, do not render the `.sidebar-float-btn` element.

### Feature Request: Add `closable` property to `SidebarOptions`

```typescript
interface SidebarOptions {
    // ... existing properties ...
    closable?: boolean;  // NEW — default true for backward compat
}
```

When `closable: false`:
- Do not render the `.sidebar-close-btn` element
- Do not fire `onClose` or `onBeforeClose` callbacks

### Current Workaround

CSS rules in `frontend/css/explorer-sidebar.css` and per-app CSS files hide the buttons:

```css
.sidebar-close-btn,
.sidebar-float-btn { display: none !important; }
```

These should be removed once the CDN fix is in place.

## Related

- ADR-029: CDN Ribbon `disabled:true` override issue (same class of "config not respected" bugs)
- `docs/bugs/2026-02-20-collapsed-init-bug.md` (previous CDN sidebar bug, resolved)
