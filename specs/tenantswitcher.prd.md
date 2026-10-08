<!-- AGENT: PRD for the TenantSwitcher component — dropdown or modal for switching between organizational tenants and tenants. -->

# TenantSwitcher Component

> **Renamed 2026-10-08 (ADR-154).** This component was `WorkspaceSwitcher`
> until the platform settled on *tenant* as the single word for the concept.
> The CDN path is now `/components/tenantswitcher/`, with the old path and
> the old API names kept for one release. Occurrences of "workspace" below
> have been updated; the design itself is unchanged.


**Status:** Draft
**Component name:** TenantSwitcher
**Folder:** `./components/tenantswitcher/`
**Spec author:** Agent
**Date:** 2026-02-20

---

## 1. Overview

### 1.1 What Is It

A tenant-switching control that presents a list of organizational tenants or tenants for the current user. The component supports two display modes: a **dropdown** attached to a trigger button (suitable for toolbars, sidebar headers, and navigation bars), and a **modal** overlay (suitable for large tenant lists or onboarding flows). Users can search/filter tenants by name, see their role and metadata at a glance, and switch with a single click.

The component consists of two collaborating pieces:

- **TenantSwitcher** -- The core component that manages tenant data, rendering, filtering, selection, and lifecycle.
- **Trigger button** -- An inline button showing the active tenant name, icon/avatar, and a chevron indicator. Clicking it opens the dropdown or modal.

The dropdown or modal displays each tenant with an icon or avatar, name, user role badge, optional member count, and optional plan badge. The currently active tenant is highlighted with a checkmark. A search input filters the list by tenant name. An optional "Create tenant" action button appears at the bottom.

Workspaces are ordered with the most recently used first. The active tenant always appears at the top regardless of recency.

### 1.2 Why Build It

Enterprise SaaS applications frequently support multi-tenancy or multi-tenant patterns where a single user belongs to multiple organizations:

- Multi-tenant platforms (each client company is a tenant)
- Team-based project management (each team or department is a tenant)
- Agency tools (each client account is a tenant)
- Developer platforms (each organization or project is a tenant)
- Collaboration tools (each shared tenant is a context boundary)

Without a dedicated component, developers build inconsistent tenant selectors using native `<select>` elements, custom dropdowns, or page-level navigation. A purpose-built TenantSwitcher provides consistent visual language, keyboard-navigable selection, search for large lists, and accessible markup.

### 1.3 Design Inspiration

| Source | Key Pattern Adopted |
|--------|---------------------|
| Slack Tenant Switcher | Dropdown from sidebar header, tenant icon + name, search, create action |
| Vercel Team Switcher | Compact dropdown with avatar, name, role badge, plan indicator |
| Notion Tenant Menu | Sidebar-triggered dropdown, tenant list with icons, settings shortcut |
| GitHub Organization Switcher | Avatar + name list, active highlighted, filter by name |
| Linear Tenant Switcher | Clean dropdown, active checkmark, compact layout, keyboard navigation |

---

## 2. Anatomy

### 2.1 Trigger Button

```
┌─────────────────────────────┐
│ [🏢] Acme Corp           ▾ │
└─────────────────────────────┘
```

### 2.2 Dropdown Mode

```
┌─────────────────────────────────────┐
│ 🔍 [Search tenants...         ] │
├─────────────────────────────────────┤
│ ✓ [🏢] Acme Corp          Owner   │  <-- active tenant
│   [🏭] Beta Industries    Admin   │
│   [🏪] Gamma Retail       Member  │
│   [🏛] Delta Gov           Viewer  │
├─────────────────────────────────────┤
│ + Create tenant                  │
└─────────────────────────────────────┘
```

### 2.3 Modal Mode

```
+-----------------------------------------------+
|                                                |
|         Switch tenant                       |  <-- heading
|                                                |
|  🔍 [Search tenants...                   ] |
|                                                |
|  ✓ [🏢] Acme Corp       Owner    12 members  |  <-- active
|    [🏭] Beta Industries  Admin     8 members  |
|    [🏪] Gamma Retail     Member    3 members  |
|    [🏛] Delta Gov         Viewer   24 members  |
|                                                |
|  [ + Create tenant ]                        |
|                                                |
+-----------------------------------------------+
```

### 2.4 Element Breakdown

| Element | Required | Description |
|---------|----------|-------------|
| Trigger button | Yes | Inline button showing active tenant icon/avatar, name, and chevron. |
| Search input | Configurable | Text input for filtering tenants by name. Default: shown when >5 tenants. |
| Tenant list | Yes | Scrollable list of tenant items. |
| Tenant item | Yes (1+) | Row with icon/avatar, name, role badge, optional member count. |
| Active indicator | Auto | Checkmark icon on the currently active tenant. |
| Create button | Configurable | Action button at the bottom. Default: shown. |
| Modal heading | Modal only | "Switch tenant" heading at the top of the modal overlay. |
| Modal backdrop | Modal only | Semi-transparent overlay behind the modal. |

---

## 3. API

### 3.1 Interfaces

```typescript
interface Tenant
{
    /** Unique tenant identifier. */
    id: string;

    /** Display name of the tenant. Required. */
    name: string;

    /** Bootstrap Icons class (e.g., "bi-building") or image URL for the tenant icon. */
    icon?: string;

    /** URL to the tenant logo/avatar image. Takes precedence over icon. */
    avatarUrl?: string;

    /** User's role within this tenant (e.g., "Owner", "Admin", "Member"). */
    role?: string;

    /** Number of members in the tenant. */
    memberCount?: number;

    /** Subscription plan label (e.g., "Pro", "Enterprise", "Free"). */
    plan?: string;

    /** Arbitrary consumer data attached to this tenant. */
    data?: Record<string, unknown>;
}

interface TenantSwitcherOptions
{
    /** List of tenants available to the user. Required. */
    tenants: Tenant[];

    /** ID of the currently active tenant. Required. */
    activeWorkspaceId: string;

    /** Display mode. Default: "dropdown". */
    mode?: "dropdown" | "modal";

    /** Show the search input. Default: true when tenants.length > 5. */
    showSearch?: boolean;

    /** Show the "Create tenant" button. Default: true. */
    showCreateButton?: boolean;

    /** Show member count for each tenant. Default: false. */
    showMemberCount?: boolean;

    /** Show user role badge for each tenant. Default: true. */
    showRole?: boolean;

    /** Show plan badge for each tenant. Default: false. */
    showPlan?: boolean;

    /** Label text for the create button. Default: "Create tenant". */
    createLabel?: string;

    /** Placeholder text for the search input. Default: "Search tenants...". */
    placeholder?: string;

    /** Size variant affecting trigger button and dropdown dimensions. Default: "default". */
    size?: "sm" | "default" | "lg";

    /** Additional CSS class(es) on the root element. */
    cssClass?: string;

    /** Called when the user switches to a different tenant. */
    onSwitch?: (tenant: Tenant) => void;

    /** Called when the user clicks the create button. */
    onCreate?: () => void;

    /** Called when the user types in the search input. Enables server-side filtering. */
    onSearch?: (query: string) => Promise<Tenant[]>;

    /** Called when the dropdown or modal opens. */
    onOpen?: () => void;

    /** Called when the dropdown or modal closes. */
    onClose?: () => void;
}
```

### 3.2 Class: TenantSwitcher

| Method | Description |
|--------|-------------|
| `constructor(options)` | Creates the DOM tree (trigger button + dropdown/modal). Does not attach to the page. |
| `show(containerId)` | Appends the trigger button to the container specified by ID string or `HTMLElement`. |
| `hide()` | Removes from DOM without destroying state. |
| `destroy()` | Hides, removes all event listeners, nulls references. |
| `getElement()` | Returns the root `HTMLElement` (trigger button). |
| `open()` | Programmatically opens the dropdown or modal. |
| `close()` | Programmatically closes the dropdown or modal. |
| `isOpen()` | Returns whether the dropdown or modal is currently visible. |
| `getActiveWorkspace()` | Returns the currently active `Tenant` object. |
| `setActiveWorkspace(id)` | Sets the active tenant by ID. Updates the trigger button and highlights. Does not fire `onSwitch`. |
| `setWorkspaces(tenants)` | Replaces the entire tenant list. Re-renders the dropdown/modal content. |
| `addWorkspace(tenant)` | Appends a tenant to the list. |
| `removeWorkspace(id)` | Removes a tenant by ID. If the active tenant is removed, no auto-selection occurs -- the consumer must call `setActiveWorkspace`. |

### 3.3 Globals

```typescript
window.TenantSwitcher = TenantSwitcher;
window.createTenantSwitcher = createTenantSwitcher;
```

- `createTenantSwitcher(options)` -- Convenience function: creates a TenantSwitcher and returns the instance without calling `show()`.

---

## 4. Behaviour

### 4.1 Lifecycle

1. **Construction** -- Builds the trigger button and the dropdown/modal DOM. Does not attach to the page.
2. **show(containerId)** -- Appends the trigger button to the specified container. The dropdown/modal is appended to `document.body` when opened (portal pattern for z-index stacking).
3. **hide()** -- Closes the dropdown/modal if open, removes the trigger from DOM. State preserved for re-show.
4. **destroy()** -- Calls hide, removes body-level event listeners, nulls all references. Subsequent calls log a warning and no-op.

### 4.2 Dropdown Mode

- The dropdown is positioned below the trigger button using `position: fixed` with coordinates calculated from the trigger's `getBoundingClientRect()`.
- If the dropdown would extend below the viewport, it flips above the trigger.
- If the dropdown would extend beyond the right viewport edge, it aligns to the trigger's right edge instead of left.
- Maximum dropdown height: `min(400px, 60vh)`. Content scrolls via `overflow-y: auto` on the tenant list.
- Clicking outside the dropdown or pressing Escape closes it.
- The dropdown is appended to `document.body` to escape any `overflow: hidden` ancestors (portal pattern).

### 4.3 Modal Mode

- A semi-transparent backdrop (`rgba($gray-900, 0.5)`) covers the viewport.
- The modal is centered vertically and horizontally using `position: fixed` + flexbox.
- Maximum modal width: `480px`. Maximum height: `min(600px, 80vh)`.
- The tenant list scrolls within the modal body.
- Clicking the backdrop or pressing Escape closes the modal.
- Focus is trapped within the modal while open (Tab cycles through search input, tenant items, create button, and close button).

### 4.4 Search and Filtering

When the user types in the search input:

1. The tenant list is filtered by substring match against `tenant.name` (case-insensitive).
2. Filtering is applied on every keystroke with a 150ms debounce.
3. If `onSearch` is provided, it is called with the query string and expected to return a `Promise<Tenant[]>`. The returned tenants replace the visible list. A loading indicator is shown during the async operation.
4. If no tenants match, a "No tenants found" empty state is shown.
5. The search input is auto-focused when the dropdown/modal opens.
6. Clearing the search input restores the full tenant list.

### 4.5 Tenant Selection

When the user clicks a tenant item or presses Enter on a focused item:

1. If the selected tenant is already active, the dropdown/modal closes with no further action.
2. Otherwise, `onSwitch(tenant)` is called.
3. The active tenant is updated: the trigger button text and icon/avatar change, the previous active item loses its checkmark, and the new item gains a checkmark.
4. The dropdown/modal closes.

### 4.6 Ordering

Workspaces are displayed in the following order:

1. **Active tenant** -- Always first, regardless of recency.
2. **Remaining tenants** -- Ordered by their position in the `tenants` array (consumer controls ordering; typically most recently used first).

### 4.7 Trigger Button

The trigger button displays:

- The active tenant's icon (Bootstrap Icons `<i>`) or avatar (`<img>` with rounded corners).
- The active tenant's name (truncated with ellipsis if too long).
- A chevron-down indicator (`bi-chevron-down`).

If no tenant is active (invalid `activeWorkspaceId`), the trigger shows a placeholder: "Select tenant" with a generic icon.

### 4.8 Avatar and Icon

For each tenant item:

1. If `avatarUrl` is provided, render an `<img>` element with `width`/`height` matching the size variant and rounded corners.
2. If `icon` is provided (and no `avatarUrl`), check if it looks like a URL (starts with `http` or `/`). If so, render as `<img>`. Otherwise, render as a Bootstrap Icons `<i>` element.
3. If neither is provided, generate an initials avatar: take the first letter of the tenant name, display it in a coloured circle. The background colour is deterministically derived from the tenant name (hash the name to select from a predefined palette of 8 muted colours).

### 4.9 Create Button

When `showCreateButton` is true (default):

- A button labelled with `createLabel` (default: "Create tenant") appears at the bottom of the dropdown/modal, separated by a thin divider.
- The button shows a `bi-plus-lg` icon.
- Clicking fires `onCreate()`.
- The dropdown/modal closes after the callback is invoked.

---

## 5. Styling

### 5.1 CSS Classes

| Class | Description |
|-------|-------------|
| `.tenantswitcher` | Root element wrapping the trigger button |
| `.tenantswitcher-sm` / `-default` / `-lg` | Size variant modifiers |
| `.tenantswitcher-trigger` | Trigger button element |
| `.tenantswitcher-trigger-icon` | Icon or avatar in the trigger |
| `.tenantswitcher-trigger-name` | Tenant name text in the trigger |
| `.tenantswitcher-trigger-chevron` | Chevron-down indicator |
| `.tenantswitcher-dropdown` | Dropdown container (portal, appended to body) |
| `.tenantswitcher-modal` | Modal container (portal, appended to body) |
| `.tenantswitcher-backdrop` | Semi-transparent backdrop (modal mode) |
| `.tenantswitcher-modal-content` | Inner modal card |
| `.tenantswitcher-modal-heading` | "Switch tenant" heading |
| `.tenantswitcher-search` | Search input wrapper |
| `.tenantswitcher-search-input` | The search `<input>` element |
| `.tenantswitcher-search-icon` | Magnifying glass icon in the search input |
| `.tenantswitcher-list` | Scrollable tenant list container |
| `.tenantswitcher-item` | Individual tenant row |
| `.tenantswitcher-item-active` | Active tenant modifier (checkmark visible) |
| `.tenantswitcher-item-icon` | Tenant icon or avatar container |
| `.tenantswitcher-item-avatar` | Avatar `<img>` element |
| `.tenantswitcher-item-initials` | Initials fallback circle |
| `.tenantswitcher-item-info` | Name + role + meta text container |
| `.tenantswitcher-item-name` | Tenant name text |
| `.tenantswitcher-item-role` | Role badge (e.g., "Owner", "Admin") |
| `.tenantswitcher-item-members` | Member count text |
| `.tenantswitcher-item-plan` | Plan badge (e.g., "Pro", "Enterprise") |
| `.tenantswitcher-item-check` | Checkmark icon for active tenant |
| `.tenantswitcher-divider` | Horizontal divider line |
| `.tenantswitcher-create` | "Create tenant" action button |
| `.tenantswitcher-empty` | "No tenants found" empty state |
| `.tenantswitcher-loading` | Loading indicator during async search |

### 5.2 Theme Integration

| Property | Value | Source |
|----------|-------|--------|
| Trigger background | `transparent` | Blends with parent container |
| Trigger hover | `$gray-200` background | Subtle highlight |
| Trigger text | `$gray-900` | Primary text colour |
| Trigger chevron | `$gray-500` | Subdued indicator |
| Dropdown background | `$gray-50` | Card-like background |
| Dropdown border | `1px solid $gray-300` | Standard card border |
| Dropdown shadow | `0 4px 16px rgba($gray-900, 0.12)` | Elevation |
| Item hover | `$gray-100` background | Subtle row highlight |
| Active item background | `$blue-50` | Light primary accent |
| Active item checkmark | `$blue-600` | Primary colour |
| Item name | `$gray-900`, `$font-weight-semibold` | Bold tenant name |
| Role badge | `$gray-500`, `$font-size-sm` | Muted role text |
| Member count | `$gray-400`, `$font-size-sm` | De-emphasized metadata |
| Plan badge | `$gray-100` background, `$gray-600` text, `$font-size-sm` | Subtle pill badge |
| Divider | `1px solid $gray-200` | Light separator |
| Create button text | `$blue-600` | Action-oriented link colour |
| Create button hover | `$blue-700` | Darker on hover |
| Search input | `$gray-50` background, `$gray-300` border | Standard input styling |
| Initials avatar | Deterministic palette, `$gray-50` text | Consistent per tenant |
| Modal backdrop | `rgba($gray-900, 0.5)` | Standard overlay |
| Empty state text | `$gray-400` | Muted placeholder |
| SCSS import | `@import '../../src/scss/variables'` | Theme variables |

### 5.3 Size Variants

| Size | Trigger Height | Avatar/Icon Size | Dropdown Width | Font Size |
|------|---------------|-----------------|----------------|-----------|
| `sm` | 28px | 20px | 240px | `$font-size-sm` |
| `default` | 36px | 28px | 300px | `$font-size-base` |
| `lg` | 44px | 36px | 360px | `$font-size-base` |

### 5.4 Z-Index

| Element | Z-Index | Rationale |
|---------|---------|-----------|
| Dropdown | 1050 | Same level as Bootstrap modals; above sidebars and toolbars |
| Modal backdrop | 1055 | Above dropdowns |
| Modal content | 1056 | Above backdrop |
| Toast container | 1070 | Above tenant switcher modal |

---

## 6. Keyboard Interaction

| Key | Context | Action |
|-----|---------|--------|
| Enter / Space | Trigger button | Opens the dropdown or modal |
| Escape | Dropdown / modal | Closes and returns focus to the trigger button |
| ArrowDown | Dropdown / modal | Moves focus to the next tenant item |
| ArrowUp | Dropdown / modal | Moves focus to the previous tenant item |
| Home | Dropdown / modal | Moves focus to the first tenant item |
| End | Dropdown / modal | Moves focus to the last tenant item |
| Enter | Focused tenant item | Selects the tenant and closes |
| Tab | Search input | Moves focus to the first tenant item |
| Tab | Last item / create button | Cycles focus (trapped in modal mode; exits in dropdown mode) |
| Any printable character | Dropdown / modal (when search visible) | Focuses the search input and appends the character |

### 6.1 Focus Management

- **Dropdown mode**: On open, focus moves to the search input (if visible) or the first tenant item. On close, focus returns to the trigger button.
- **Modal mode**: On open, focus moves to the search input (if visible) or the first tenant item. Focus is trapped within the modal. On close, focus returns to the trigger button.

---

## 7. Accessibility

### 7.1 Trigger Button

| Attribute | Value |
|-----------|-------|
| `role` | `"button"` (native `<button>` element) |
| `aria-haspopup` | `"listbox"` (dropdown mode) or `"dialog"` (modal mode) |
| `aria-expanded` | `"true"` when open, `"false"` when closed |
| `aria-label` | `"Switch tenant, currently {active tenant name}"` |

### 7.2 Dropdown

| Element | Attribute | Value |
|---------|-----------|-------|
| Dropdown container | `role` | `"listbox"` |
| Dropdown container | `aria-label` | `"Tenant list"` |
| Tenant item | `role` | `"option"` |
| Tenant item | `aria-selected` | `"true"` for active tenant, `"false"` for others |
| Search input | `aria-label` | `"Search tenants"` |
| Search input | `role` | `"searchbox"` |
| Create button | `role` | `"button"` (native `<button>`) |

### 7.3 Modal

| Element | Attribute | Value |
|---------|-----------|-------|
| Modal container | `role` | `"dialog"` |
| Modal container | `aria-modal` | `"true"` |
| Modal container | `aria-label` | `"Switch tenant"` |
| Tenant list | `role` | `"listbox"` |
| Tenant item | `role` | `"option"` |
| Tenant item | `aria-selected` | `"true"` for active tenant |
| Close button (modal) | `aria-label` | `"Close tenant switcher"` |

### 7.4 General

- All icon and avatar elements: `aria-hidden="true"` (decorative).
- Initials avatars: `aria-hidden="true"` (tenant name is announced via the item text).
- Role and plan badges: included in the accessible name via the item's composite text content.
- Colour contrast meets WCAG AA for all text, badges, and interactive elements.
- Focus ring: visible `2px solid $blue-600` outline on all focusable elements.

---

## 8. Dependencies

| Dependency | Required | Notes |
|------------|----------|-------|
| Bootstrap 5 CSS | Yes | For `$gray-*`, `$blue-*` SCSS variables and utility classes |
| Bootstrap Icons | Yes | For `bi-chevron-down`, `bi-check-lg`, `bi-plus-lg`, `bi-search`, `bi-building` |
| Enterprise Theme CSS | Yes | For theme variable overrides |
| No JavaScript framework dependencies | -- | Vanilla TypeScript only |

---

## 9. Open Questions

1. Should the trigger button support a "compact" variant that shows only the tenant avatar/icon without the name text (useful for narrow sidebars)?
2. Should there be a visual separator between the active tenant and the rest of the list, or is the checkmark and highlight sufficient?
3. Should the component emit a custom DOM event (`tenantswitcher:switch`) in addition to the `onSwitch` callback, for use cases where the consumer is not the direct instantiator?
4. Should keyboard "type-ahead" search work when the search input is hidden (i.e., when there are 5 or fewer tenants)?
