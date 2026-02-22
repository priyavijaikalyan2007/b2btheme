<!-- AGENT: PRD for the AppLauncher component — grid-based application launcher with dropdown, modal, and fullpage view modes. -->

# AppLauncher Component

**Status:** Draft
**Component name:** AppLauncher
**Folder:** `./components/applauncher/`
**Spec author:** Agent
**Date:** 2026-02-21

---

## 1. Overview

### 1.1 What Is It

A grid-based application launcher for switching between apps in an enterprise SaaS platform. Supports three view modes: **dropdown** (triggered by a waffle icon, positioned below the trigger), **modal** (centered overlay with backdrop), and **fullpage** (inline rendering with sidebar navigation). Users can search, pin favourites, view recent apps, browse by category, and see badges on tiles.

### 1.2 Why Build It

Enterprise SaaS platforms with multiple apps need a consistent launcher pattern. Without it, developers build ad-hoc navigation with inconsistent UX. A purpose-built AppLauncher provides standardised tile grids, search, favourites, keyboard navigation, and accessibility.

### 1.3 Design Inspiration

| Source | Key Pattern Adopted |
|--------|---------------------|
| Google Workspace App Launcher | 9-dot "waffle" icon trigger, 3×3 tile grid |
| Microsoft 365 App Launcher | Favourites pinning, "NEW" badges, tabbed categories |
| Salesforce App Launcher | Modal with search, tile grid with descriptions |
| ServiceNow Application Navigator | Full-page launcher, sidebar categories |
| Atlassian App Switcher | Streamlined dropdown, clear active app indicator |

---

## 2. Anatomy

### 2.1 Trigger Button

```
┌──────────────┐
│ [⊞] Apps     │
└──────────────┘
```

### 2.2 Dropdown Mode

```
┌───────────────────────────────┐
│ 🔍 [Search apps...         ] │
├───────────────────────────────┤
│ ★ FAVORITES                   │
│ ┌─────┐ ┌─────┐ ┌─────┐     │
│ │[📊] │ │[📧] │ │[📁] │     │
│ │Anal │ │Mail │ │File │     │
│ └─────┘ └─────┘ └─────┘     │
│ ALL APPS                      │
│ ┌─────┐ ┌─────┐ ┌─────┐     │
│ │[📊]★│ │[📧]★│ │[📁]★│     │
│ │Anal │ │Mail │ │File │     │
│ │·act │ │     │ │NEW │     │
│ └─────┘ └─────┘ └─────┘     │
├───────────────────────────────┤
│       View all apps           │
└───────────────────────────────┘
```

### 2.3 Modal Mode

```
┌─────────────────────────────────────────┐
│ App Launcher                        [×] │
├─────────────────────────────────────────┤
│ 🔍 [Search apps...                   ] │
│ [All] [Productivity] [Analytics] [Admin]│
├─────────────────────────────────────────┤
│ ★ FAVORITES                             │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │
│ │[📊]  │ │[📧]  │ │[📁]  │ │[📋]  │   │
│ │Analyt│ │ Mail │ │Files │ │Tasks │   │
│ └──────┘ └──────┘ └──────┘ └──────┘   │
│ ALL APPS                                │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │
│ │[📊]★ │ │[📧]★ │ │[📁]★ │ │[📋]★ │   │
│ │Analyt│ │ Mail │ │Files │ │Tasks │   │
│ └──────┘ └──────┘ └──────┘ └──────┘   │
└─────────────────────────────────────────┘
```

### 2.4 Fullpage Mode

```
┌───────────────────────────────────────────────────────┐
│ All Applications       🔍 [Search apps...           ] │
├─────────────┬─────────────────────────────────────────┤
│ CATEGORIES  │ ★ FAVORITES                             │
│ ▸ All       │ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │
│   Productiv │ │[📊]  │ │[📧]  │ │[📁]  │ │[📋]  │   │
│   Analytics │ │Analyt│ │ Mail │ │Files │ │Tasks │   │
│   Admin     │ └──────┘ └──────┘ └──────┘ └──────┘   │
│             │ ALL APPS                                │
│             │ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │
│             │ │[📊]★ │ │[📧]★ │ │[📁]★ │ │[📋]★ │   │
│             │ │Analyt│ │ Mail │ │Files │ │Tasks │   │
│             │ └──────┘ └──────┘ └──────┘ └──────┘   │
└─────────────┴─────────────────────────────────────────┘
```

---

## 3. API

### 3.1 Interfaces

See `components/applauncher/applauncher.ts` for full TypeScript interfaces: `AppItem`, `AppCategory`, `AppLauncherMode`, `AppLauncherOptions`.

### 3.2 Factory

```typescript
createAppLauncher(options: AppLauncherOptions, containerId?: string): AppLauncher
```

### 3.3 Key Methods

| Method | Description |
|--------|-------------|
| `show(containerId)` | Appends to container |
| `hide()` | Removes from DOM |
| `destroy()` | Full teardown |
| `open()` / `close()` | Dropdown/modal toggle |
| `isOpen()` | Current open state |
| `getApps()` / `setApps()` | App list management |
| `addApp()` / `removeApp()` / `updateApp()` | Individual app mutations |
| `getActiveAppId()` / `setActiveAppId()` | Active app indicator |
| `getFavorites()` / `setFavorites()` / `toggleFavorite()` / `clearFavorites()` | Favourites |
| `getRecent()` / `clearRecent()` | Recent apps |
| `setCategories()` | Update categories |
| `setSearchQuery()` | Programmatic search |
| `getMode()` | Current view mode |

### 3.4 Globals

```typescript
window.AppLauncher = AppLauncher;
window.createAppLauncher = createAppLauncher;
```

---

## 4. Behaviour

- **Dropdown**: Portal on `document.body`, positioned via `getBoundingClientRect()` with collision detection. Escape/outside click closes.
- **Modal**: Backdrop + centered dialog. Escape/backdrop click closes. Focus trapped.
- **Fullpage**: Inline render, always visible, no open/close.
- **Search**: 150ms debounce, local filter + optional async `onSearch`.
- **Favourites**: localStorage persistence, star toggle, `onFavoriteToggle` callback.
- **Recent**: localStorage MRU list (max 6), auto-updated on selection.
- **Selection**: `onSelect` callback, pushes to recent, closes (dropdown/modal).

---

## 5. Keyboard

| Key | Context | Action |
|-----|---------|--------|
| Enter/Space | Trigger | Open |
| Escape | Dropdown/Modal | Close |
| ArrowRight/Left | Grid | Horizontal navigation |
| ArrowDown/Up | Grid | Vertical navigation |
| Home/End | Grid | First/last tile |
| Enter | Tile | Select |
| Shift+F | Tile | Toggle favourite |
| / | Any | Focus search |

---

## 6. Accessibility

- Trigger: `aria-haspopup`, `aria-expanded`
- Grid: `role="grid"` + `role="row"` + `role="gridcell"`, roving tabindex
- Modal: `role="dialog"`, `aria-modal="true"`
- Favourites: `aria-pressed` on star toggles
- Live region: `aria-live="polite"` for announcements
- Focus ring: `2px solid $blue-600`

---

## 7. Dependencies

- Bootstrap 5 CSS (SCSS variables)
- Bootstrap Icons (`bi-grid-3x3-gap`, `bi-search`, `bi-star`, `bi-star-fill`, `bi-x-lg`)

---

## 8. Open Questions

None (all resolved in plan).
