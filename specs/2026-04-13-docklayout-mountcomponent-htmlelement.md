# Bug: DockLayout.mountComponent() silently drops plain HTMLElements

**Filed**: 2026-04-13
**Severity**: High — causes layout overflow in all 6 apps
**Components**: CDN DockLayout, CDN Ribbon
**Status**: Workaround applied in app code; awaiting CDN fix

---

## Summary

`DockLayout.mountComponent()` silently does nothing when passed a plain `HTMLElement` (e.g., from `ribbon.getElement()`). The element is never appended to the target grid cell. This causes the toolbar to remain on `document.body` outside the CSS Grid, pushing the `100vh` grid past the viewport and clipping the bottom panel and statusbar off-screen.

Additionally, `Ribbon.mountTo()` only accepts string element IDs — not `HTMLElement` parents — so even if `mountComponent()` called `ribbon.show(toolbarCell)`, it would silently fall back to `document.body`.

## Reproduction

1. Create a Ribbon: `const ribbon = createRibbon({ ... })`
2. Show it (for DOM creation): `ribbon.show()`
3. Pass the element to DockLayout: `createDockLayout({ toolbar: ribbon.getElement(), ... })`
4. **Expected**: Ribbon appears inside the DockLayout grid's toolbar cell
5. **Actual**: Ribbon stays on `document.body`; statusbar and bottom panel are clipped below the viewport

The clipping is proportional to the ribbon height:
- Ribbon collapsed (~32px tab bar): bottom 32px clipped — statusbar partially hidden
- Ribbon expanded (~128px tab bar + panel): bottom 128px clipped — statusbar and bottom panel entirely hidden

## Root Cause

### 1. `DockLayout.mountComponent()` — no HTMLElement fallback

```javascript
mountComponent(t, e) {
    if (typeof t.setContained === 'function') t.setContained(true);           // HTMLElement: skip
    if (typeof t.isVisible === 'function' && ...) t.hide();                   // HTMLElement: skip
    if (typeof t.show === 'function') t.show(e);                              // HTMLElement: skip (no .show())
    else if (typeof t.getRootElement === 'function') { ... }                  // HTMLElement: skip
    // ← Nothing happens. Element is never appended to cell `e`.
}
```

Contrast with `setContent()` which correctly handles HTMLElements:
```javascript
setContent(t) {
    this.centerCell.appendChild(t);  // ← Direct appendChild
}
```

### 2. `Ribbon.mountTo()` — string-only parameter

```javascript
mountTo(t) {
    let e = null;
    t && (e = "string" == typeof t ? document.getElementById(t) : null);
    // ← If t is an HTMLElement, typeof check fails, e stays null
    e || (e = document.body);         // Falls back to body
    e.appendChild(this.rootEl);
}
```

Every other CDN component (`StatusBar`, `Sidebar`, `TabbedPanel`) accepts an HTMLElement parent in their `show()` method. Ribbon is the only one that doesn't.

## Suggested Fix

### Fix 1: `DockLayout.mountComponent()` — add HTMLElement fallback

```javascript
mountComponent(t, e) {
    if (typeof t.setContained === 'function') t.setContained(true);
    if (typeof t.isVisible === 'function' && t.isVisible() && typeof t.hide === 'function') t.hide();
    if (typeof t.show === 'function') t.show(e);
    else if (typeof t.getRootElement === 'function') {
        const i = t.getRootElement();
        if (i) e.appendChild(i);
    }
    else if (t instanceof HTMLElement) {   // ← NEW: plain HTMLElement fallback
        e.appendChild(t);
    }
}
```

### Fix 2: `Ribbon.mountTo()` — accept HTMLElement parents

```javascript
mountTo(t) {
    let e = null;
    if (t) {
        if (typeof t === 'string') e = document.getElementById(t);
        else if (t instanceof HTMLElement) e = t;   // ← NEW: HTMLElement branch
    }
    if (!e) e = document.body;
    e.appendChild(this.rootEl);
}
```

Also update `Ribbon.show()` type signature to match other components:
```typescript
show(container?: string | HTMLElement): void;
```

## Current Workaround

All 6 apps manually re-parent the toolbar element after `createDockLayout()`:

```typescript
if (ribbonEl) {
    const toolbarCell = document.querySelector('.dock-layout-toolbar');
    if (toolbarCell) toolbarCell.appendChild(ribbonEl);
}
```

This workaround can be removed once both CDN fixes are deployed.

## Affected Apps

| App | File | Workaround applied |
|-----|------|--------------------|
| Diagrams | `diagrams-app-main.ts` | Yes |
| Thinker | `thinker-main.ts` | Yes |
| Strukture | `strukture-main.ts` | Yes |
| Checklists | `checklists-main.ts` | Yes |
| Explorer | `main.ts` | Yes |
| Ontology Visualizer | `ontology-app-main.ts` | Yes (plain div toolbar) |

## Contract Violation

The TypeScript type declaration promises HTMLElement support:
```typescript
interface DockLayout {
    setToolbar(toolbar: Toolbar | HTMLElement | null): void;
}
```

The runtime implementation does not honour this contract for the `HTMLElement` case.
