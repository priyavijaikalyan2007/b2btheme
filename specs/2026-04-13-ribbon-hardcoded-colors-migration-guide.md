# Migration Guide: Ribbon Dark Mode — Remove `setColors()` Workarounds

**Date**: 2026-04-13
**CDN Fix**: ADR-117 — `resetColors()` method added to Ribbon
**Affects**: All 5 apps (Explorer, Diagrams, Thinker, Checklists, Strukture)

---

## Background

The Ribbon SCSS already defines CSS custom properties with `var(--theme-*)` fallbacks that
automatically adapt when `data-bs-theme` changes. However, when apps pass explicit colour
options in the constructor (e.g. `backgroundColor: '#f8f9fa'`), these create inline
`style.setProperty('--ribbon-bg', '#f8f9fa')` overrides that shadow the CSS defaults and
prevent dark mode adaptation.

The CDN Ribbon now has a `resetColors()` method that clears all 13 inline `--ribbon-*`
overrides, reverting to the CSS-defined defaults.

---

## Migration Steps (Per App)

### Step 1: Remove colour options from Ribbon constructor

**Before:**
```typescript
const ribbon = createRibbon({
    tabs: [...],
    backgroundColor: '#f8f9fa',
    tabBarBackgroundColor: '#ffffff',
    tabTextColor: '#6c757d',
    // ... other colour options
}, containerId);
```

**After:**
```typescript
const ribbon = createRibbon({
    tabs: [...],
    // No colour options — CSS defaults auto-adapt to data-bs-theme
}, containerId);
```

### Step 2: Remove `LIGHT_RIBBON_THEME` / `DARK_RIBBON_THEME` constants

Delete the theme constant objects from `shared/ribbon/ribbon-theme.ts` (or wherever they
are defined). These are no longer needed.

### Step 3: Remove `setColors()` from theme change listener

**Before (in `setupSubAppTheme()` or equivalent):**
```typescript
window.addEventListener('message', (event: MessageEvent) => {
    if (event.data?.type === 'THEME_CHANGED') {
        const theme = event.data.theme as 'light' | 'dark';
        document.documentElement.setAttribute('data-bs-theme', theme);
        const rb = getRibbon();
        if (rb) {
            rb.setColors(theme === 'dark' ? DARK_RIBBON_THEME : LIGHT_RIBBON_THEME);
        }
    }
});
```

**After:**
```typescript
window.addEventListener('message', (event: MessageEvent) => {
    if (event.data?.type === 'THEME_CHANGED') {
        const theme = event.data.theme as 'light' | 'dark';
        document.documentElement.setAttribute('data-bs-theme', theme);
        // Ribbon auto-adapts via CSS custom properties — no setColors() needed
    }
});
```

### Step 4: (Optional) Call `resetColors()` if you cannot remove constructor colours yet

If removing constructor colour options is a larger change, you can call `resetColors()`
after construction to immediately clear the inline overrides:

```typescript
const ribbon = createRibbon({
    tabs: [...],
    backgroundColor: '#f8f9fa', // legacy — will be cleared
}, containerId);

ribbon.resetColors(); // clears inline overrides, CSS defaults take over
```

This is a transitional pattern — the goal is to remove colour options from the constructor
entirely (Step 1).

---

## Affected Files (Per App)

| App | File | Change |
|-----|------|--------|
| Explorer | `typescript/apps/explorer/main.ts` | Remove colour options from `createRibbon()` |
| Diagrams | `typescript/apps/diagrams/diagrams-toolbar.ts` | Remove colour options from `createRibbon()` |
| Thinker | `typescript/apps/thinker/thinker-toolbar.ts` | Remove colour options from `createRibbon()` |
| Checklists | `typescript/apps/checklists/checklists-toolbar.ts` | Remove colour options from `createRibbon()` |
| Strukture | `typescript/apps/strukture/strukture-toolbar.ts` | Remove colour options from `createRibbon()` |
| Shared | `typescript/shared/ribbon/ribbon-theme.ts` | Delete `LIGHT_RIBBON_THEME`, `DARK_RIBBON_THEME` |
| Shared | `typescript/shared/theme/theme-manager.ts` | Remove `setColors()` from `setupSubAppTheme()` |

---

## Verification

1. Switch `data-bs-theme` between `light` and `dark` in DevTools
2. Confirm Ribbon background, tab bar, text, borders, and hover states all change
3. Confirm no console errors
4. Confirm no visual flicker on theme switch

---

## API Reference

```typescript
/** Clears all inline --ribbon-* CSS custom property overrides. */
ribbon.resetColors(): void
```

The 13 CSS custom properties cleared:
- `--ribbon-bg`
- `--ribbon-tab-bar-bg`
- `--ribbon-tab-color`
- `--ribbon-tab-active-color`
- `--ribbon-tab-active-bg`
- `--ribbon-panel-bg`
- `--ribbon-group-label-color`
- `--ribbon-group-border-color`
- `--ribbon-control-color`
- `--ribbon-control-hover-bg`
- `--ribbon-control-active-bg`
- `--ribbon-qat-bg`
- `--ribbon-menubar-bg`
