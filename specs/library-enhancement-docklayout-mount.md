# Library Enhancement Request: DockLayout mountComponent

## Problem

When `createDockLayout(options)` receives components (toolbar, sidebars, etc.), those components have already been auto-shown by their factory functions (`createToolbar()`, `createSidebar()`, etc.). The DockLayout constructor calls `mountComponent(component, cell)` which calls `component.show(cell)`, but `.show()` has an early-return guard:

```javascript
show(container) {
    if (this.visible) {
        console.warn("Already visible:", this.id);
        return;  // <-- skips re-parenting to container
    }
    // ...mount to container
}
```

Since the factory already set `visible = true`, the `show(cell)` call is a no-op. The component stays appended to `<body>` instead of being re-parented into the DockLayout grid cell.

## Current Workaround

Consumer code must call `.hide()` on every component between factory creation and passing to `createDockLayout()`:

```typescript
const toolbar = createDockedToolbar({ ... });
const sidebar = createDockedSidebar({ ... });
toolbar.hide();   // Reset visible=false, remove from body
sidebar.hide();   // Reset visible=false, remove from body
createDockLayout({ toolbar, sidebar, content });
```

This is error-prone and counter-intuitive — every consumer must know about this internal state management issue.

## Proposed Fix

In `DockLayout.mountComponent()`, handle already-visible components by calling `.hide()` before `.show(cell)`:

```javascript
mountComponent(component, cell) {
    component.setContained(true);
    if (component.visible) {
        component.hide();  // Reset visibility so show(cell) can re-parent
    }
    component.show(cell);
}
```

Alternatively, `show(container)` could be modified to re-parent if a container argument is provided, even when already visible:

```javascript
show(container) {
    if (this.visible && container) {
        // Re-parent to new container
        container.appendChild(this.rootEl);
        return;
    }
    if (this.visible) {
        console.warn("Already visible:", this.id);
        return;
    }
    // ...normal show logic
}
```

## Affected Components

All factory functions exhibit this pattern:
- `createToolbar()` / `createDockedToolbar()` — `toolbar.js:2494`
- `createSidebar()` / `createDockedSidebar()` — `sidebar.js:1433`
- `createStatusBar()` — `statusbar.js:485`
- `createTabbedPanel()` / `createDockedTabbedPanel()` — `tabbedpanel.js:1662`

## Impact

Without the fix, every consumer of `createDockLayout()` must know to call `.hide()` on all components before passing them. This is a common pitfall that results in broken grid layouts (empty grid cells, components floating on body with `position: fixed`).

## Alternative: Factory Option

Add a `show: false` option to factory functions:

```javascript
const toolbar = createDockedToolbar({ ..., show: false });
```

This would skip the auto-`.show()` call, letting DockLayout handle the initial show. However, this still requires consumer awareness and is less robust than fixing `mountComponent()` directly.
