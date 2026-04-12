# CDN Bug: Ribbon Uses Hardcoded Color Tokens Instead of CSS Variables

**Filed**: 2026-04-13
**Component**: CDN Ribbon (`static.knobby.io/components/ribbon/ribbon.js`)
**Severity**: Medium — requires manual `setColors()` calls for dark mode; all other CDN components respect `data-bs-theme` automatically
**Status**: Open

## Description

The CDN Ribbon renders all colors (background, tab bar, text, borders, hover states) using hardcoded color values passed via the constructor options object. It does **not** read from CSS custom properties or respond to Bootstrap 5's `data-bs-theme` attribute.

This means switching between light and dark mode requires every app to:
1. Call `ribbon.setColors(DARK_RIBBON_THEME)` or `ribbon.setColors(LIGHT_RIBBON_THEME)` at runtime
2. Listen for theme change events (e.g., `THEME_CHANGED` postMessage from the shell)
3. Maintain two separate color constant objects (`LIGHT_RIBBON_THEME`, `DARK_RIBBON_THEME`)

Every other CDN component (DockLayout, FormDialog, Toast, ConfirmDialog, Sidebar, TabbedPanel, etc.) automatically adapts to `data-bs-theme` changes because they use Bootstrap CSS variables or have built-in `[data-bs-theme=dark]` selectors.

## Root Cause

The Ribbon component applies inline styles with literal color values from its options:

```javascript
// Inside ribbon.js (simplified)
this._tabBar.style.backgroundColor = options.tabBarBackgroundColor; // '#ffffff'
this._el.style.backgroundColor = options.backgroundColor;           // '#f8f9fa'
```

There is no CSS variable fallback and no `MutationObserver` on `data-bs-theme`.

## Expected Behavior

The Ribbon should use CSS custom properties for its color scheme, falling back to sensible defaults:

```css
.ribbon {
    background-color: var(--ribbon-bg, var(--bs-body-bg));
    color: var(--ribbon-color, var(--bs-body-color));
}
.ribbon-tab-bar {
    background-color: var(--ribbon-tab-bar-bg, var(--bs-tertiary-bg));
}
```

This way, setting `data-bs-theme="dark"` on `<html>` would automatically switch the Ribbon's appearance — consistent with all other CDN components and requiring zero app-level code.

## Current Workaround

A shared `setupSubAppTheme()` helper in `typescript/shared/theme/theme-manager.ts` handles the coordination for all 5 apps:

```typescript
export function setupSubAppTheme(getRibbon: () => Ribbon | null): void {
    initTheme(); // Apply data-bs-theme from localStorage
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
}
```

Two constant objects define the color mappings:

```typescript
// shared/ribbon/ribbon-theme.ts
export const LIGHT_RIBBON_THEME = { backgroundColor: '#f8f9fa', tabBarBackgroundColor: '#ffffff', ... };
export const DARK_RIBBON_THEME  = { backgroundColor: '#1e293b', tabBarBackgroundColor: '#1e293b', ... };
```

## Recommended CDN Fix

**Option A (CSS variables)**: Replace all inline color assignments with CSS custom properties. Define light defaults in `.ribbon` and dark overrides in `[data-bs-theme=dark] .ribbon`. Remove `setColors()` or keep it as an optional override.

**Option B (MutationObserver)**: Observe `data-bs-theme` attribute changes on `<html>` and auto-apply a built-in dark palette. This is the same pattern the CDN ThemeToggle component would use.

Option A is preferred since it aligns with Bootstrap 5 conventions and eliminates the need for JavaScript-driven color switching entirely.

## Affected Apps

All 5 apps require `setupSubAppTheme()` + `setColors()` workaround:
- Explorer (`typescript/apps/explorer/main.ts`)
- Diagrams (`typescript/apps/diagrams/diagrams-toolbar.ts`)
- Thinker (`typescript/apps/thinker/thinker-toolbar.ts`)
- Checklists (`typescript/apps/checklists/checklists-toolbar.ts`)
- Strukture (`typescript/apps/strukture/strukture-toolbar.ts`)

## Impact of CDN Fix

Once fixed, all 5 apps can remove:
- The `setupSubAppTheme()` call (theme-manager still handles `data-bs-theme` attribute, but ribbon auto-adapts)
- The `LIGHT_RIBBON_THEME` / `DARK_RIBBON_THEME` constant objects
- The `setColors()` call in the message listener
