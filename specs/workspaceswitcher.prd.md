<!-- AGENT: PRD for the WorkspaceSwitcher component — dropdown or modal for switching between organizational workspaces and tenants. -->

# WorkspaceSwitcher Component

**Status:** Draft
**Component name:** WorkspaceSwitcher
**Folder:** `./components/workspaceswitcher/`
**Spec author:** Agent
**Date:** 2026-02-20

---

## 1. Overview

### 1.1 What Is It

A workspace-switching control that presents a list of organizational workspaces or tenants for the current user. The component supports two display modes: a **dropdown** attached to a trigger button (suitable for toolbars, sidebar headers, and navigation bars), and a **modal** overlay (suitable for large workspace lists or onboarding flows). Users can search/filter workspaces by name, see their role and metadata at a glance, and switch with a single click.

The component consists of two collaborating pieces:

- **WorkspaceSwitcher** -- The core component that manages workspace data, rendering, filtering, selection, and lifecycle.
- **Trigger button** -- An inline button showing the active workspace name, icon/avatar, and a chevron indicator. Clicking it opens the dropdown or modal.

The dropdown or modal displays each workspace with an icon or avatar, name, user role badge, optional member count, and optional plan badge. The currently active workspace is highlighted with a checkmark. A search input filters the list by workspace name. An optional "Create workspace" action button appears at the bottom.

Workspaces are ordered with the most recently used first. The active workspace always appears at the top regardless of recency.

### 1.2 Why Build It

Enterprise SaaS applications frequently support multi-tenancy or multi-workspace patterns where a single user belongs to multiple organizations:

- Multi-tenant platforms (each client company is a workspace)
- Team-based project management (each team or department is a workspace)
- Agency tools (each client account is a workspace)
- Developer platforms (each organization or project is a workspace)
- Collaboration tools (each shared workspace is a context boundary)

Without a dedicated component, developers build inconsistent workspace selectors using native `<select>` elements, custom dropdowns, or page-level navigation. A purpose-built WorkspaceSwitcher provides consistent visual language, keyboard-navigable selection, search for large lists, and accessible markup.

### 1.3 Design Inspiration

| Source | Key Pattern Adopted |
|--------|---------------------|
| Slack Workspace Switcher | Dropdown from sidebar header, workspace icon + name, search, create action |
| Vercel Team Switcher | Compact dropdown with avatar, name, role badge, plan indicator |
| Notion Workspace Menu | Sidebar-triggered dropdown, workspace list with icons, settings shortcut |
| GitHub Organization Switcher | Avatar + name list, active highlighted, filter by name |
| Linear Workspace Switcher | Clean dropdown, active checkmark, compact layout, keyboard navigation |

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
│ 🔍 [Search workspaces...         ] │
├─────────────────────────────────────┤
│ ✓ [🏢] Acme Corp          Owner   │  <-- active workspace
│   [🏭] Beta Industries    Admin   │
│   [🏪] Gamma Retail       Member  │
│   [🏛] Delta Gov           Viewer  │
├─────────────────────────────────────┤
│ + Create workspace                  │
└─────────────────────────────────────┘
```

### 2.3 Modal Mode

```
+-----------------------------------------------+
|                                                |
|         Switch workspace                       |  <-- heading
|                                                |
|  🔍 [Search workspaces...                   ] |
|                                                |
|  ✓ [🏢] Acme Corp       Owner    12 members  |  <-- active
|    [🏭] Beta Industries  Admin     8 members  |
|    [🏪] Gamma Retail     Member    3 members  |
|    [🏛] Delta Gov         Viewer   24 members  |
|                                                |
|  [ + Create workspace ]                        |
|                                                |
+-----------------------------------------------+
```

### 2.4 Element Breakdown

| Element | Required | Description |
|---------|----------|-------------|
| Trigger button | Yes | Inline button showing active workspace icon/avatar, name, and chevron. |
| Search input | Configurable | Text input for filtering workspaces by name. Default: shown when >5 workspaces. |
| Workspace list | Yes | Scrollable list of workspace items. |
| Workspace item | Yes (1+) | Row with icon/avatar, name, role badge, optional member count. |
| Active indicator | Auto | Checkmark icon on the currently active workspace. |
| Create button | Configurable | Action button at the bottom. Default: shown. |
| Modal heading | Modal only | "Switch workspace" heading at the top of the modal overlay. |
| Modal backdrop | Modal only | Semi-transparent overlay behind the modal. |

---

## 3. API

### 3.1 Interfaces

```typescript
interface Workspace
{
    /** Unique workspace identifier. */
    id: string;

    /** Display name of the workspace. Required. */
    name: string;

    /** Bootstrap Icons class (e.g., "bi-building") or image URL for the workspace icon. */
    icon?: string;

    /** URL to the workspace logo/avatar image. Takes precedence over icon. */
    avatarUrl?: string;

    /** User's role within this workspace (e.g., "Owner", "Admin", "Member"). */
    role?: string;

    /** Number of members in the workspace. */
    memberCount?: number;

    /** Subscription plan label (e.g., "Pro", "Enterprise", "Free"). */
    plan?: string;

    /** Arbitrary consumer data attached to this workspace. */
    data?: Record<string, unknown>;
}

interface WorkspaceSwitcherOptions
{
    /** List of workspaces available to the user. Required. */
    workspaces: Workspace[];

    /** ID of the currently active workspace. Required. */
    activeWorkspaceId: string;

    /** Display mode. Default: "dropdown". */
    mode?: "dropdown" | "modal";

    /** Show the search input. Default: true when workspaces.length > 5. */
    showSearch?: boolean;

    /** Show the "Create workspace" button. Default: true. */
    showCreateButton?: boolean;

    /** Show member count for each workspace. Default: false. */
    showMemberCount?: boolean;

    /** Show user role badge for each workspace. Default: true. */
    showRole?: boolean;

    /** Show plan badge for each workspace. Default: false. */
    showPlan?: boolean;

    /** Label text for the create button. Default: "Create workspace". */
    createLabel?: string;

    /** Placeholder text for the search input. Default: "Search workspaces...". */
    placeholder?: string;

    /** Size variant affecting trigger button and dropdown dimensions. Default: "default". */
    size?: "sm" | "default" | "lg";

    /** Additional CSS class(es) on the root element. */
    cssClass?: string;

    /** Called when the user switches to a different workspace. */
    onSwitch?: (workspace: Workspace) => void;

    /** Called when the user clicks the create button. */
    onCreate?: () => void;

    /** Called when the user types in the search input. Enables server-side filtering. */
    onSearch?: (query: string) => Promise<Workspace[]>;

    /** Called when the dropdown or modal opens. */
    onOpen?: () => void;

    /** Called when the dropdown or modal closes. */
    onClose?: () => void;
}
```

### 3.2 Class: WorkspaceSwitcher

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
| `getActiveWorkspace()` | Returns the currently active `Workspace` object. |
| `setActiveWorkspace(id)` | Sets the active workspace by ID. Updates the trigger button and highlights. Does not fire `onSwitch`. |
| `setWorkspaces(workspaces)` | Replaces the entire workspace list. Re-renders the dropdown/modal content. |
| `addWorkspace(workspace)` | Appends a workspace to the list. |
| `removeWorkspace(id)` | Removes a workspace by ID. If the active workspace is removed, no auto-selection occurs -- the consumer must call `setActiveWorkspace`. |

### 3.3 Globals

```typescript
window.WorkspaceSwitcher = WorkspaceSwitcher;
window.createWorkspaceSwitcher = createWorkspaceSwitcher;
```

- `createWorkspaceSwitcher(options)` -- Convenience function: creates a WorkspaceSwitcher and returns the instance without calling `show()`.

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
- Maximum dropdown height: `min(400px, 60vh)`. Content scrolls via `overflow-y: auto` on the workspace list.
- Clicking outside the dropdown or pressing Escape closes it.
- The dropdown is appended to `document.body` to escape any `overflow: hidden` ancestors (portal pattern).

### 4.3 Modal Mode

- A semi-transparent backdrop (`rgba($gray-900, 0.5)`) covers the viewport.
- The modal is centered vertically and horizontally using `position: fixed` + flexbox.
- Maximum modal width: `480px`. Maximum height: `min(600px, 80vh)`.
- The workspace list scrolls within the modal body.
- Clicking the backdrop or pressing Escape closes the modal.
- Focus is trapped within the modal while open (Tab cycles through search input, workspace items, create button, and close button).

### 4.4 Search and Filtering

When the user types in the search input:

1. The workspace list is filtered by substring match against `workspace.name` (case-insensitive).
2. Filtering is applied on every keystroke with a 150ms debounce.
3. If `onSearch` is provided, it is called with the query string and expected to return a `Promise<Workspace[]>`. The returned workspaces replace the visible list. A loading indicator is shown during the async operation.
4. If no workspaces match, a "No workspaces found" empty state is shown.
5. The search input is auto-focused when the dropdown/modal opens.
6. Clearing the search input restores the full workspace list.

### 4.5 Workspace Selection

When the user clicks a workspace item or presses Enter on a focused item:

1. If the selected workspace is already active, the dropdown/modal closes with no further action.
2. Otherwise, `onSwitch(workspace)` is called.
3. The active workspace is updated: the trigger button text and icon/avatar change, the previous active item loses its checkmark, and the new item gains a checkmark.
4. The dropdown/modal closes.

### 4.6 Ordering

Workspaces are displayed in the following order:

1. **Active workspace** -- Always first, regardless of recency.
2. **Remaining workspaces** -- Ordered by their position in the `workspaces` array (consumer controls ordering; typically most recently used first).

### 4.7 Trigger Button

The trigger button displays:

- The active workspace's icon (Bootstrap Icons `<i>`) or avatar (`<img>` with rounded corners).
- The active workspace's name (truncated with ellipsis if too long).
- A chevron-down indicator (`bi-chevron-down`).

If no workspace is active (invalid `activeWorkspaceId`), the trigger shows a placeholder: "Select workspace" with a generic icon.

### 4.8 Avatar and Icon

For each workspace item:

1. If `avatarUrl` is provided, render an `<img>` element with `width`/`height` matching the size variant and rounded corners.
2. If `icon` is provided (and no `avatarUrl`), check if it looks like a URL (starts with `http` or `/`). If so, render as `<img>`. Otherwise, render as a Bootstrap Icons `<i>` element.
3. If neither is provided, generate an initials avatar: take the first letter of the workspace name, display it in a coloured circle. The background colour is deterministically derived from the workspace name (hash the name to select from a predefined palette of 8 muted colours).

### 4.9 Create Button

When `showCreateButton` is true (default):

- A button labelled with `createLabel` (default: "Create workspace") appears at the bottom of the dropdown/modal, separated by a thin divider.
- The button shows a `bi-plus-lg` icon.
- Clicking fires `onCreate()`.
- The dropdown/modal closes after the callback is invoked.

---

## 5. Styling

### 5.1 CSS Classes

| Class | Description |
|-------|-------------|
| `.workspaceswitcher` | Root element wrapping the trigger button |
| `.workspaceswitcher-sm` / `-default` / `-lg` | Size variant modifiers |
| `.workspaceswitcher-trigger` | Trigger button element |
| `.workspaceswitcher-trigger-icon` | Icon or avatar in the trigger |
| `.workspaceswitcher-trigger-name` | Workspace name text in the trigger |
| `.workspaceswitcher-trigger-chevron` | Chevron-down indicator |
| `.workspaceswitcher-dropdown` | Dropdown container (portal, appended to body) |
| `.workspaceswitcher-modal` | Modal container (portal, appended to body) |
| `.workspaceswitcher-backdrop` | Semi-transparent backdrop (modal mode) |
| `.workspaceswitcher-modal-content` | Inner modal card |
| `.workspaceswitcher-modal-heading` | "Switch workspace" heading |
| `.workspaceswitcher-search` | Search input wrapper |
| `.workspaceswitcher-search-input` | The search `<input>` element |
| `.workspaceswitcher-search-icon` | Magnifying glass icon in the search input |
| `.workspaceswitcher-list` | Scrollable workspace list container |
| `.workspaceswitcher-item` | Individual workspace row |
| `.workspaceswitcher-item-active` | Active workspace modifier (checkmark visible) |
| `.workspaceswitcher-item-icon` | Workspace icon or avatar container |
| `.workspaceswitcher-item-avatar` | Avatar `<img>` element |
| `.workspaceswitcher-item-initials` | Initials fallback circle |
| `.workspaceswitcher-item-info` | Name + role + meta text container |
| `.workspaceswitcher-item-name` | Workspace name text |
| `.workspaceswitcher-item-role` | Role badge (e.g., "Owner", "Admin") |
| `.workspaceswitcher-item-members` | Member count text |
| `.workspaceswitcher-item-plan` | Plan badge (e.g., "Pro", "Enterprise") |
| `.workspaceswitcher-item-check` | Checkmark icon for active workspace |
| `.workspaceswitcher-divider` | Horizontal divider line |
| `.workspaceswitcher-create` | "Create workspace" action button |
| `.workspaceswitcher-empty` | "No workspaces found" empty state |
| `.workspaceswitcher-loading` | Loading indicator during async search |

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
| Item name | `$gray-900`, `$font-weight-semibold` | Bold workspace name |
| Role badge | `$gray-500`, `$font-size-sm` | Muted role text |
| Member count | `$gray-400`, `$font-size-sm` | De-emphasized metadata |
| Plan badge | `$gray-100` background, `$gray-600` text, `$font-size-sm` | Subtle pill badge |
| Divider | `1px solid $gray-200` | Light separator |
| Create button text | `$blue-600` | Action-oriented link colour |
| Create button hover | `$blue-700` | Darker on hover |
| Search input | `$gray-50` background, `$gray-300` border | Standard input styling |
| Initials avatar | Deterministic palette, `$gray-50` text | Consistent per workspace |
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
| Toast container | 1070 | Above workspace switcher modal |

---

## 6. Keyboard Interaction

| Key | Context | Action |
|-----|---------|--------|
| Enter / Space | Trigger button | Opens the dropdown or modal |
| Escape | Dropdown / modal | Closes and returns focus to the trigger button |
| ArrowDown | Dropdown / modal | Moves focus to the next workspace item |
| ArrowUp | Dropdown / modal | Moves focus to the previous workspace item |
| Home | Dropdown / modal | Moves focus to the first workspace item |
| End | Dropdown / modal | Moves focus to the last workspace item |
| Enter | Focused workspace item | Selects the workspace and closes |
| Tab | Search input | Moves focus to the first workspace item |
| Tab | Last item / create button | Cycles focus (trapped in modal mode; exits in dropdown mode) |
| Any printable character | Dropdown / modal (when search visible) | Focuses the search input and appends the character |

### 6.1 Focus Management

- **Dropdown mode**: On open, focus moves to the search input (if visible) or the first workspace item. On close, focus returns to the trigger button.
- **Modal mode**: On open, focus moves to the search input (if visible) or the first workspace item. Focus is trapped within the modal. On close, focus returns to the trigger button.

---

## 7. Accessibility

### 7.1 Trigger Button

| Attribute | Value |
|-----------|-------|
| `role` | `"button"` (native `<button>` element) |
| `aria-haspopup` | `"listbox"` (dropdown mode) or `"dialog"` (modal mode) |
| `aria-expanded` | `"true"` when open, `"false"` when closed |
| `aria-label` | `"Switch workspace, currently {active workspace name}"` |

### 7.2 Dropdown

| Element | Attribute | Value |
|---------|-----------|-------|
| Dropdown container | `role` | `"listbox"` |
| Dropdown container | `aria-label` | `"Workspace list"` |
| Workspace item | `role` | `"option"` |
| Workspace item | `aria-selected` | `"true"` for active workspace, `"false"` for others |
| Search input | `aria-label` | `"Search workspaces"` |
| Search input | `role` | `"searchbox"` |
| Create button | `role` | `"button"` (native `<button>`) |

### 7.3 Modal

| Element | Attribute | Value |
|---------|-----------|-------|
| Modal container | `role` | `"dialog"` |
| Modal container | `aria-modal` | `"true"` |
| Modal container | `aria-label` | `"Switch workspace"` |
| Workspace list | `role` | `"listbox"` |
| Workspace item | `role` | `"option"` |
| Workspace item | `aria-selected` | `"true"` for active workspace |
| Close button (modal) | `aria-label` | `"Close workspace switcher"` |

### 7.4 General

- All icon and avatar elements: `aria-hidden="true"` (decorative).
- Initials avatars: `aria-hidden="true"` (workspace name is announced via the item text).
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

1. Should the trigger button support a "compact" variant that shows only the workspace avatar/icon without the name text (useful for narrow sidebars)?
2. Should there be a visual separator between the active workspace and the rest of the list, or is the checkmark and highlight sufficient?
3. Should the component emit a custom DOM event (`workspaceswitcher:switch`) in addition to the `onSwitch` callback, for use cases where the consumer is not the direct instantiator?
4. Should keyboard "type-ahead" search work when the search input is hidden (i.e., when there are 5 or fewer workspaces)?
