<!-- AGENT: Documentation for the NavRail component — app-level primary navigation with collapsed icon rail and expanded categorized drawer. -->

# NavRail

App-level **primary navigation** component. Renders as a vertical strip pinned
to the left or right edge of the viewport with two states:

- **Collapsed** — narrow icon-only rail. Labels hidden; hover shows tooltip.
  Numeric badges collapse to a dot.
- **Expanded** — wider drawer with icons, labels, category headers, pill badges,
  and optional brand header + search row + footer.

NavRail is **navigation-only** — it emits `onNavigate` events; the host app
owns routing and page-content rendering. Paired with `DockLayout` /
`SplitLayout` / a plain container for content.

The pattern is commonly called a *Navigation Rail* (Material Design) or
*Primary Side Nav* (Azure Portal, Linear, Slack, VS Code Activity Bar).

**MASTER_COMPONENT_LIST §8.3** | **ADR-124** | **Spec:** `specs/navrail.prd.md`

## Assets

| Asset  | Path                                      |
|--------|-------------------------------------------|
| CSS    | `components/navrail/navrail.css`          |
| JS     | `components/navrail/navrail.js`           |
| Types  | `components/navrail/navrail.d.ts`         |

## Requirements

- **Bootstrap CSS** — for base reset and SCSS variables
- **Bootstrap Icons** — item icons (`bi-*` classes)
- `_dark-mode.scss` from the theme pipeline — provides `--theme-navrail-*`
  tokens. Standalone usage falls back to inline defaults.
- Does **not** require Bootstrap JS.

## Quick Start

```html
<link rel="stylesheet" href="components/navrail/navrail.css">
<script src="components/navrail/navrail.js"></script>
<script>
    var nav = createNavRail({
        container: document.getElementById("app-shell"),
        position: "left",
        header: {
            brandInitials: "K",
            title: "Knobby IO",
            subtitle: "Pro plan · 12/25 seats"
        },
        search: {
            placeholder: "Jump to...",
            shortcutHint: "\u2318K",
            onActivate: function () { openCommandPalette(); }
        },
        categories: [
            {
                id: "workspace", label: "Workspace",
                items: [
                    { id: "overview", icon: "bi-speedometer2", label: "Overview" },
                    { id: "settings", icon: "bi-sliders", label: "Settings" },
                    { id: "billing", icon: "bi-receipt", label: "Billing" }
                ]
            },
            {
                id: "people", label: "People",
                items: [
                    { id: "users", icon: "bi-people", label: "Users", badge: 1 },
                    { id: "roles", icon: "bi-shield", label: "Roles" }
                ]
            }
        ],
        activeId: "overview",
        persistStateKey: "app-navrail",
        onNavigate: function (id, item) {
            router.push("/" + id);
        }
    });
</script>
```

## Options (`NavRailOptions`)

| Option            | Type                                           | Default       | Notes |
|-------------------|------------------------------------------------|---------------|-------|
| `container`       | `HTMLElement`                                  | required      | Mount point. |
| `categories`      | `NavRailCategory[]`                            | required      | Grouped items. |
| `onNavigate`      | `(id, item, evt?) => void`                     | required      | Fires on activation. |
| `id`              | `string`                                       | auto          | Stable instance id. |
| `position`        | `"left" \| "right"`                            | `"left"`      | Fixed edge. |
| `collapsed`       | `boolean`                                      | `false`       | Initial state. |
| `collapsedWidth`  | `number`                                       | `48`          | px |
| `width`           | `number`                                       | `240`         | px (expanded) |
| `minWidth` / `maxWidth` | `number`                                 | `200` / `320` | When `resizable`. |
| `resizable`       | `boolean`                                      | `false`       | Reserved; trailing-edge handle. |
| `size`            | `"sm" \| "md" \| "lg"`                         | `"md"`        | Preset width + type scale. |
| `header`          | `NavRailHeader`                                | —             | Brand / tenant block. |
| `search`          | `NavRailSearch`                                | —             | Delegates to host (CommandPalette). |
| `footer`          | `NavRailFooter`                                | —             | Account / settings block. |
| `activeId`        | `string`                                       | —             | Initial active item. |
| `persistStateKey` | `string`                                       | —             | localStorage key for collapsed state. |
| `ariaLabel`       | `string`                                       | `"Primary"`   | On the `<nav>` root. |
| `cssClass`        | `string`                                       | —             | Extra class names. |
| `keyBindings`     | `Record<string, string>`                       | see below     | Override shortcuts. |
| `contained`       | `boolean`                                      | `false`       | Parent controls sizing. |
| `onCollapseToggle`| `(collapsed: boolean) => void`                 | —             | Fires on collapse/expand. |
| `onSearchOpen`    | `() => void`                                   | —             | Alongside `search.onActivate`. |

### `NavRailItem`

| Field          | Type                              | Notes |
|----------------|-----------------------------------|-------|
| `id`           | `string`                          | Stable id (used for all mutations). |
| `icon`         | `string`                          | Bootstrap Icons class (`bi-*`). |
| `label`        | `string`                          | Rendered as text and tooltip. |
| `tooltip`      | `string`                          | Override tooltip. |
| `badge`        | `string \| number`                | Pill (expanded) / dot (collapsed). |
| `badgeVariant` | `"default" \| "danger" \| "success" \| "warning"` | Colour. |
| `children`     | `NavRailItem[]`                   | Sub-pages. Indented (expanded) or flyout (collapsed). |
| `hasOwnPage`   | `boolean`                         | When `children` exist: whether the parent is also activatable. Default `true`. |
| `disabled` / `hidden` | `boolean`                  | State flags. |
| `cssClass`     | `string`                          | Extra class names. |
| `data`         | `Record<string, unknown>`         | Arbitrary payload. |

## Handle API (`NavRailHandle`)

```ts
rail.collapse();
rail.expand();
rail.toggleCollapse();
rail.isCollapsed();

rail.setActive(id);
rail.getActive();

rail.setCategories(newCategories);
rail.setBadge(itemId, 5, "danger");
rail.setBadge(itemId, null);          // clear
rail.setDisabled(itemId, true);
rail.setVisible(itemId, false);

rail.getRootElement();
rail.destroy();
```

## Keyboard

| Shortcut                | Action |
|-------------------------|--------|
| `Tab`                   | Focus the rail (single tab stop; roving focus inside). |
| `↑` / `↓`               | Move focus to previous / next item. |
| `→`                     | On collapsed parent: open flyout. On expanded parent: expand children. |
| `←`                     | On collapsed: close flyout. On expanded parent: collapse children. |
| `Enter` / `Space`       | Activate focused item. |
| `Home` / `End`          | Focus first / last item. |
| `Esc`                   | Close flyout (collapsed). |
| `Ctrl + \``             | Toggle left NavRail. Override via `keyBindings.toggleCollapseLeft`. |
| `Ctrl + B`              | Toggle right NavRail. Override via `keyBindings.toggleCollapseRight`. |

### Binding overlap with `Sidebar`

`KEYBOARD.md §2` assigns the same two combos to `Sidebar`. If an app mounts
**both** NavRail and Sidebar on the same edge, resolve the collision by
overriding `keyBindings` on either component:

```js
createNavRail({ keyBindings: { toggleCollapseLeft: "Ctrl+Shift+`" }, ... });
```

## Accessibility

- Root is `<nav aria-label="Primary">`.
- Categories use `role="group"` with `aria-labelledby`.
- Items are `<button role="treeitem">` with `aria-current="page"` on the
  active one and `aria-expanded` on parents with children.
- Flyout uses `role="menu"` / `role="menuitem"`.
- Focus ring via `:focus-visible` (keyboard-only).
- All colours meet WCAG AA contrast in both light and dark modes.
- Honours `prefers-reduced-motion` (no transitions) and
  `prefers-contrast: more` (thicker active stripe, stronger tint).

## Dark mode

All colours flow through `--theme-navrail-*` tokens defined in
`src/scss/_dark-mode.scss`. Applying `data-bs-theme="dark"` on `<html>`
switches the rail automatically — no JavaScript needed.

| Token                                | Light                | Dark                 |
|--------------------------------------|----------------------|----------------------|
| `--theme-navrail-bg`                 | `$gray-50`           | `$gray-900`          |
| `--theme-navrail-surface`            | `$gray-100`          | `$gray-800`          |
| `--theme-navrail-item-fg`            | `$gray-700`          | `$gray-300`          |
| `--theme-navrail-item-active-bg`     | `rgba($blue-600, .08)` | `rgba($blue-400, .15)` |
| `--theme-navrail-item-active-stripe` | `$blue-600`          | `$blue-400`          |
| `--theme-navrail-badge-bg`           | `$red-600`           | `$red-500`           |
| `--theme-navrail-category-fg`        | `$gray-500`          | `$gray-500`          |

See `_dark-mode.scss` for the full set.

## Mobile / touch

- Every interactive target is at least **40px tall** (44px under
  `@media (hover: none)` or `(pointer: coarse)` per WCAG 2.5.5).
- Collapsed width grows from 48px → 56px on coarse pointers.
- Expanded width clamps to `min(80vw, 260px)` below 576px so the rail fits
  narrow phones.
- Hover-only interactions (flyout on `mouseenter`) are duplicated on `focus`
  for keyboard + touch.
- `-webkit-tap-highlight-color: transparent` + `touch-action` defaults
  prevent double-tap zoom and flash.

## CSS Custom Properties

NavRail publishes two properties on `<html>` so other components can offset:

- `--navrail-left-width` — width of the left NavRail (collapsed or expanded).
- `--navrail-right-width` — width of the right NavRail.

Example:

```css
.app-content {
    padding-left: var(--navrail-left-width, 0);
    padding-right: var(--navrail-right-width, 0);
}
```

`Sidebar` already honours these transparently via `SidebarManager`.

## Coexistence with `Sidebar` and `DockLayout`

- NavRail sits on the outermost edge; a same-edge `Sidebar` nests inside.
- `contained: true` lets NavRail be placed inside a `DockLayout` panel and
  sized by the parent instead of pinning to the viewport.
- NavRail does not drag, float, or dock — use `Sidebar` for that.

## Events

| Event             | Fires when                                           |
|-------------------|------------------------------------------------------|
| `onNavigate`      | Item activated (click, Enter, Space). Skipped for disabled and for parents whose `hasOwnPage === false`. |
| `onCollapseToggle`| Collapsed state changes (programmatic, toggle button, or keyboard). |
| `onSearchOpen`    | Search row (or collapsed search icon) activated.     |

## Demo

See `demo/components/navrail.html` for the full walkthrough (expanded, collapsed,
right-edge, sub-pages, paired with DockLayout, dark-mode parity).

## Related components

- `Sidebar` — dockable / floatable resizable panel container.
- `Toolbar` — flat action bar; dockable to any edge.
- `CommandPalette` — keyboard-first omnibar; target of `onSearchOpen`.
- `AppLauncher` — cross-app switcher (different scope).
- `Breadcrumb` — hierarchical path display.
