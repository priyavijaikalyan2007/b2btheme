<!-- AGENT: Auto-generated README for the AppLauncher component. -->

# AppLauncher

Grid-based application launcher with three view modes: dropdown (waffle icon trigger), modal (centered overlay), and fullpage (inline with sidebar). Supports search, favourites, recent apps, categories, badges, and full 2D grid keyboard navigation.

## Quick Start

```html
<link rel="stylesheet" href="css/custom.css">
<link rel="stylesheet" href="components/applauncher/applauncher.css">
<script src="components/applauncher/applauncher.js"></script>
```

```javascript
// Dropdown mode (default)
const launcher = createAppLauncher({
    apps: [
        { id: "crm", name: "CRM", icon: "bi bi-people" },
        { id: "mail", name: "Mail", icon: "bi bi-envelope" },
        { id: "files", name: "Files", icon: "bi bi-folder" },
    ],
    activeAppId: "crm",
    onSelect: (app) => console.log("Selected:", app.name),
}, "launcher-container");

// Modal mode
const modal = createAppLauncher({
    apps: myApps,
    mode: "modal",
    categories: [
        { id: "prod", label: "Productivity", icon: "bi bi-lightning" },
        { id: "admin", label: "Admin", icon: "bi bi-gear" },
    ],
    onSelect: (app) => window.location.href = app.url,
}, "modal-trigger-container");

// Fullpage mode
const fullpage = createAppLauncher({
    apps: myApps,
    mode: "fullpage",
    categories: myCategories,
}, "fullpage-container");
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apps` | `AppItem[]` | *required* | List of applications |
| `categories` | `AppCategory[]` | `undefined` | Category groupings |
| `activeAppId` | `string` | `undefined` | Currently active app ID |
| `mode` | `"dropdown" \| "modal" \| "fullpage"` | `"dropdown"` | View mode |
| `columns` | `number` | `3/4/4` | Grid columns (mode-dependent default) |
| `showSearch` | `boolean` | `true` | Show search input |
| `showFavorites` | `boolean` | `true` | Show favourites section |
| `showRecent` | `boolean` | `true` | Show recent apps section |
| `maxRecent` | `number` | `6` | Max recent apps |
| `showCategories` | `boolean` | `true` | Show category tabs/sidebar |
| `placeholder` | `string` | `"Search apps..."` | Search placeholder |
| `triggerIcon` | `string` | `"bi bi-grid-3x3-gap"` | Trigger icon class |
| `triggerLabel` | `string` | `"Apps"` | Trigger button text |
| `showTriggerLabel` | `boolean` | `true` | Show trigger label text |
| `size` | `"sm" \| "default" \| "lg"` | `"default"` | Size variant |
| `favoritesKey` | `string` | `"applauncher-favorites"` | localStorage key |
| `recentKey` | `string` | `"applauncher-recent"` | localStorage key |
| `cssClass` | `string` | `undefined` | Additional root CSS classes |
| `keyBindings` | `Record<string, string>` | See below | Key binding overrides |
| `onSelect` | `(app: AppItem) => void` | `undefined` | App selection callback |
| `onSearch` | `(query: string) => Promise<AppItem[]>` | `undefined` | Async search |
| `onFavoriteToggle` | `(id: string, isFav: boolean) => void` | `undefined` | Favourite callback |
| `onOpen` | `() => void` | `undefined` | Open callback |
| `onClose` | `() => void` | `undefined` | Close callback |

## AppItem

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Unique ID |
| `name` | `string` | Display name |
| `description` | `string?` | Optional description |
| `icon` | `string?` | Bootstrap icon class |
| `iconUrl` | `string?` | Image URL (overrides icon) |
| `url` | `string?` | Navigation URL |
| `category` | `string?` | Category ID |
| `badge` | `string?` | Badge text ("NEW", "3") |
| `badgeVariant` | `"info" \| "success" \| "warning" \| "danger"` | Badge colour |
| `disabled` | `boolean?` | Disabled state |
| `data` | `Record<string, unknown>?` | Custom data |

## Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `show(containerId)` | `void` | Append to container |
| `hide()` | `void` | Remove from DOM |
| `destroy()` | `void` | Full teardown |
| `open()` | `void` | Open dropdown/modal |
| `close()` | `void` | Close dropdown/modal |
| `isOpen()` | `boolean` | Open state |
| `getApps()` | `AppItem[]` | Current app list |
| `setApps(apps)` | `void` | Replace app list |
| `addApp(app)` | `void` | Add single app |
| `removeApp(id)` | `void` | Remove by ID |
| `updateApp(id, updates)` | `void` | Partial update |
| `getActiveAppId()` | `string` | Active app ID |
| `setActiveAppId(id)` | `void` | Set active app |
| `getFavorites()` | `string[]` | Favourite IDs |
| `setFavorites(ids)` | `void` | Set favourites |
| `toggleFavorite(id)` | `void` | Toggle favourite |
| `clearFavorites()` | `void` | Clear all favourites |
| `getRecent()` | `string[]` | Recent IDs |
| `clearRecent()` | `void` | Clear recent list |
| `setCategories(cats)` | `void` | Update categories |
| `setSearchQuery(q)` | `void` | Programmatic search |
| `getMode()` | `string` | Current mode |

## Keyboard

| Key | Context | Action |
|-----|---------|--------|
| Enter / Space | Trigger | Open launcher |
| Escape | Dropdown / Modal | Close |
| Arrow Right/Left | Grid | Horizontal navigation |
| Arrow Down/Up | Grid | Vertical navigation |
| Home / End | Grid | First / last tile |
| Enter | Focused tile | Select app |
| Shift+F | Focused tile | Toggle favourite |
| / | Any | Focus search input |

## Default Key Bindings

```javascript
{
    close: "Escape",
    focusDown: "ArrowDown",
    focusUp: "ArrowUp",
    focusLeft: "ArrowLeft",
    focusRight: "ArrowRight",
    focusFirst: "Home",
    focusLast: "End",
    select: "Enter",
    toggleFav: "Shift+F",
    focusSearch: "/",
}
```

## CSS Classes

All classes use the `applauncher-` prefix. Key classes:

- `.applauncher` — root
- `.applauncher-trigger` — waffle button
- `.applauncher-dropdown` — dropdown portal
- `.applauncher-modal` / `.applauncher-backdrop` / `.applauncher-modal-content` — modal
- `.applauncher-fullpage` / `.applauncher-sidebar` — fullpage layout
- `.applauncher-search` / `.applauncher-search-input` — search
- `.applauncher-tabs` / `.applauncher-tab` — category tabs
- `.applauncher-grid` / `.applauncher-tile` — tile grid
- `.applauncher-tile-active` / `.applauncher-tile-disabled` — tile states
- `.applauncher-tile-badge` / `.applauncher-tile-fav` — badge and favourite star
- `.applauncher-section-header` — section labels
- `.applauncher-sm` / `.applauncher-lg` — size variants

## Asset Paths

```
CSS: components/applauncher/applauncher.css
JS:  components/applauncher/applauncher.js
```
