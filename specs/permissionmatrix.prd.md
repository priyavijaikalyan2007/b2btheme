<!-- AGENT: Product Requirements Document for the PermissionMatrix component — RBAC permission matrix grid with roles, permission groups, inheritance visualization, tri-state checkboxes, bulk operations, search, change tracking, and keyboard-accessible grid navigation. -->

# PermissionMatrix Component

**Status:** Draft
**Component name:** PermissionMatrix
**Folder:** `./components/permissionmatrix/`
**Spec author:** Agent
**Date:** 2026-02-20

---

## 1. Overview

### 1.1 What Is It

An interactive Roles x Permissions checkbox grid for managing role-based access control (RBAC) configurations. The PermissionMatrix renders a table-like grid where columns represent roles and rows represent permissions grouped by category or resource. Each cell at the intersection of a role and a permission displays a tri-state checkbox indicating whether the permission is granted, denied, or inherited from a parent role.

The component is designed for enterprise administration interfaces where operators need to:

- View and edit the full RBAC matrix for a system, organisation, or resource scope.
- Understand permission inheritance chains (e.g., "Admin inherits from Editor, which inherits from Viewer").
- Distinguish between explicitly set permissions and those inherited from parent roles.
- Bulk-grant or bulk-deny all permissions for a role, or all roles for a permission.
- Search and filter permissions by name to find specific entries in large matrices.
- Track pending changes with visual diff highlighting before committing.
- Export the current matrix state for auditing or documentation.

The PermissionMatrix is a controlled component: the consumer provides the data model (roles, permissions, and their states) and receives callbacks when changes occur. The component never mutates the data model directly.

### 1.2 Why Build It

Enterprise SaaS applications frequently need RBAC management interfaces for:

- Organisation-level role management (who can access what resources)
- Project or workspace permission configuration
- API scope and OAuth consent management
- Feature flag targeting by role
- Compliance auditing and permission review workflows
- Multi-tenant administration dashboards

Common patterns in production systems include AWS IAM policy editors, GitHub organisation role settings, Azure RBAC blade, Jira project permission schemes, and Google Workspace admin consoles. No existing open-source, framework-free component provides this functionality with Bootstrap 5 theming, IIFE packaging, and zero external dependencies.

### 1.3 Design Inspiration

| Source | Key Pattern Adopted |
|--------|---------------------|
| AWS IAM Policy Summary | Roles as columns, services/actions as grouped rows, grant/deny/not-set states |
| GitHub Organisation Roles | Checkbox grid with role columns, permission categories, inherited indicators |
| Azure RBAC Blade | Role inheritance visualisation, effective vs. explicit permissions |
| Jira Permission Scheme | Permission groups with expand/collapse, bulk operations per role |
| Google Admin Console | Clean grid with sticky headers, search filter, change tracking |
| Confluence Space Permissions | Simple checkbox matrix with group headers |

### 1.4 Open Source Evaluation

| Library | Verdict | Reason |
|---------|---------|--------|
| AG Grid | Not recommended | Commercial licence; overkill for a checkbox grid; no hierarchy support |
| react-role-permission-matrix | Not recommended | React-only; unmaintained (last updated 2021); no hierarchy |
| jQuery Matrix | Not recommended | jQuery dependency; no TypeScript; no Bootstrap 5 |
| Casbin Editor | Useful reference | MIT; good permission model concepts; no grid UI component |
| Bootstrap Table | Not recommended | No checkbox grid mode; no hierarchy or inheritance support |

**Decision:** Build custom. Permission matrices are highly domain-specific. A standalone component with a focused API for RBAC use cases is simpler and more maintainable than adapting a general-purpose grid.

---

## 2. Use Cases

| # | Use Case | Description | Key Features Used |
|---|----------|-------------|-------------------|
| 1 | RBAC admin panel | Configure which permissions each role has | Checkbox grid, bulk operations, inheritance, categories |
| 2 | Compliance audit view | Review current permission assignments (read-only) | Read-only mode, inheritance indicators, export |
| 3 | Role comparison | Compare permissions across roles side-by-side | Sticky columns, search, change tracking |
| 4 | New role template | Create a new role by selecting permissions | Checkbox grid, bulk operations, category expand/collapse |
| 5 | Access review | Periodic review of role assignments for security compliance | Read-only mode, export, inheritance visibility |
| 6 | Permission diff review | Review pending changes before committing | Change tracking, diff highlighting, reset |

---

## 3. Anatomy

### 3.1 Full Matrix Layout

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [🔍 Filter permissions...]          [Export ▾]  [Reset]  [3 changes]   │  <- Toolbar
├──────────────────────────┬───────────┬───────────┬───────────┬──────────┤
│                          │   Admin   │  Editor   │  Viewer   │  Guest   │  <- Sticky role headers
│                          │ (inherits │ (inherits │           │          │
│                          │  Editor)  │  Viewer)  │           │          │
├──────────────────────────┼───────────┼───────────┼───────────┼──────────┤
│ ▼ Content Management     │ [All ☑]   │ [All ☑]   │ [All —]   │ [All ☐]  │  <- Category header + bulk
│   Create articles        │    ☑      │    ☑      │    ☐      │    ☐     │
│   Edit articles          │    ☑      │    ☑      │    ☐      │    ☐     │
│   Delete articles        │    ☑      │    ☑*     │    ☐      │    ☐     │  <- * = changed
│   Publish articles       │    ☑      │    ☐      │    ☐      │    ☐     │
├──────────────────────────┼───────────┼───────────┼───────────┼──────────┤
│ ▶ User Management        │           │           │           │          │  <- Collapsed group
├──────────────────────────┼───────────┼───────────┼───────────┼──────────┤
│ ▼ System Settings        │ [All ☑]   │ [All ☐]   │ [All ☐]   │ [All ☐]  │
│   View audit log         │    ☑      │    △      │    ☐      │    ☐     │  <- △ = inherited
│   Manage integrations    │    ☑      │    ☐      │    ☐      │    ☐     │
│   Configure SSO          │    ☑      │    ☐      │    ☐      │    ☐     │
└──────────────────────────┴───────────┴───────────┴───────────┴──────────┘

Legend:  ☑ = granted   ☐ = denied/none   △ = inherited   — = mixed   * = changed
```

### 3.2 Single Cell Detail

```
┌───────────┐
│           │
│   [☑/☐/△] │  <- Tri-state checkbox
│           │
└───────────┘
```

Cell visual states:

| State | Icon | Background | Description |
|-------|------|------------|-------------|
| Granted (explicit) | Filled checkbox with checkmark | Default | Permission explicitly granted to this role |
| Denied (explicit) | Empty checkbox (border only) | Default | Permission explicitly denied for this role |
| Inherited (granted) | Outlined checkbox with arrow indicator | Blue tint | Permission inherited from a parent role |
| None | Empty checkbox with dashed border | Default | No permission set, no inheritance applies |
| Changed (pending) | Any state + highlight | Yellow tint | Cell was modified since last save |

### 3.3 Element Breakdown

| Element | Required | Description |
|---------|----------|-------------|
| Root container | Yes | `div.permissionmatrix` wrapping the entire component |
| Toolbar | Yes | Filter input, export button, reset button, change counter |
| Filter input | Yes | Text input for searching permissions by name |
| Export button | Optional | Dropdown or button to export matrix state |
| Reset button | Optional | Reverts all pending changes to the last saved state |
| Change counter | Optional | Badge showing the count of pending changes |
| Grid container | Yes | `div.permissionmatrix-grid` scrollable grid area |
| Column header row | Yes | Sticky row with role names and descriptions |
| Role header cell | Yes | `div.permissionmatrix-role-header` per role column |
| Inheritance indicator | Optional | Text or icon showing the role's parent |
| Category header row | Yes (1+) | `div.permissionmatrix-group-header` expandable group |
| Category toggle | Yes | Expand/collapse chevron for the permission group |
| Category bulk cells | Optional | Bulk toggle checkboxes per role in the category header |
| Permission row | Yes (1+) | `div.permissionmatrix-row` single permission |
| Permission label cell | Yes | `div.permissionmatrix-permission-label` sticky left column |
| Permission cell | Yes | `div.permissionmatrix-cell` checkbox at role x permission |
| Tri-state checkbox | Yes | `button.permissionmatrix-checkbox` the interactive control |
| Inherited badge | Optional | Visual indicator that a value is inherited |
| Change highlight | Optional | Visual indicator that a cell was modified |
| Empty state | Conditional | Shown when filter produces no matching permissions |
| Screen reader live region | Yes | Visually hidden `aria-live="polite"` region |

---

## 4. API

### 4.1 Types

```typescript
/**
 * The state of a single permission for a single role.
 * - "granted": explicitly granted to this role.
 * - "denied": explicitly denied for this role.
 * - "inherited": granted via inheritance from a parent role (read-only).
 * - "none": no permission set and no inheritance applies.
 */
type PermissionState = "granted" | "denied" | "inherited" | "none";

/**
 * Export format for the matrix state.
 */
type ExportFormat = "json" | "csv";
```

### 4.2 Interfaces

#### 4.2.1 Role

Defines a single role (column) in the matrix.

```typescript
interface Role
{
    /** Unique identifier for the role. */
    id: string;

    /** Display name shown in the column header. */
    name: string;

    /** Optional description shown as a tooltip or subtitle. */
    description?: string;

    /**
     * ID of the parent role this role inherits from.
     * Permissions granted to the parent are inherited by this role
     * unless explicitly overridden.
     */
    inheritsFrom?: string;

    /**
     * Optional accent colour for the role column header.
     * CSS colour value (e.g., "#4a90d9" or "var(--bs-primary)").
     */
    color?: string;

    /** Whether this role's permissions are read-only (non-editable). Default: false. */
    readonly?: boolean;

    /** Arbitrary consumer data attached to this role. Not rendered. */
    data?: unknown;
}
```

#### 4.2.2 Permission

Defines a single permission (row) in the matrix.

```typescript
interface Permission
{
    /** Unique identifier for the permission. */
    id: string;

    /** Display name shown in the row label. */
    name: string;

    /** Optional description shown as a tooltip. */
    description?: string;

    /** Arbitrary consumer data attached to this permission. Not rendered. */
    data?: unknown;
}
```

#### 4.2.3 PermissionGroup

Defines a collapsible group of related permissions.

```typescript
interface PermissionGroup
{
    /** Unique identifier for the group. */
    id: string;

    /** Display name shown in the group header row. */
    name: string;

    /** Optional description shown as a tooltip on the group header. */
    description?: string;

    /** Permissions belonging to this group. */
    permissions: Permission[];

    /** Whether the group is initially expanded. Default: true. */
    expanded?: boolean;

    /** Optional Bootstrap Icons class for the group header. */
    icon?: string;
}
```

#### 4.2.4 MatrixCell

Represents the state of a single role x permission intersection.

```typescript
interface MatrixCell
{
    /** The role ID this cell belongs to. */
    roleId: string;

    /** The permission ID this cell belongs to. */
    permissionId: string;

    /** The current state of this permission for this role. */
    state: PermissionState;
}
```

#### 4.2.5 PermissionChange

Describes a single change made to the matrix.

```typescript
interface PermissionChange
{
    /** The role ID affected. */
    roleId: string;

    /** The permission ID affected. */
    permissionId: string;

    /** The state before the change. */
    previousState: PermissionState;

    /** The new state after the change. */
    newState: PermissionState;
}
```

#### 4.2.6 BulkChange

Describes a bulk operation applied to multiple cells.

```typescript
interface BulkChange
{
    /** The type of bulk operation. */
    type: "grant-all-for-role" | "deny-all-for-role"
        | "grant-all-for-permission" | "deny-all-for-permission"
        | "grant-all-in-group" | "deny-all-in-group";

    /** The role ID (for role-scoped bulk operations). */
    roleId?: string;

    /** The permission ID (for permission-scoped bulk operations). */
    permissionId?: string;

    /** The permission group ID (for group-scoped bulk operations). */
    groupId?: string;

    /** The individual cell changes that compose this bulk operation. */
    changes: PermissionChange[];
}
```

#### 4.2.7 MatrixExportData

The data structure returned by the export function.

```typescript
interface MatrixExportData
{
    /** ISO 8601 timestamp of the export. */
    exportedAt: string;

    /** The roles in the matrix. */
    roles: Role[];

    /** The permission groups and their permissions. */
    groups: PermissionGroup[];

    /** All cell states in the matrix. */
    cells: MatrixCell[];

    /** Pending changes not yet saved (if any). */
    pendingChanges: PermissionChange[];
}
```

#### 4.2.8 PermissionMatrixOptions

Configuration object passed to the PermissionMatrix constructor.

```typescript
interface PermissionMatrixOptions
{
    /** ID of the container element to render the matrix inside. */
    containerId: string;

    /** Roles displayed as columns. Rendered left-to-right in array order. */
    roles: Role[];

    /** Permission groups displayed as row sections. Rendered top-to-bottom in array order. */
    groups: PermissionGroup[];

    /**
     * Initial cell states. Array of MatrixCell objects defining the state
     * for each role x permission intersection. Cells not specified default
     * to "none".
     */
    cells: MatrixCell[];

    /** Whether the entire matrix is read-only. Default: false. */
    readOnly?: boolean;

    /** Show the filter/search input in the toolbar. Default: true. */
    showFilter?: boolean;

    /** Debounce delay in ms for the filter input. Default: 250. */
    filterDebounceMs?: number;

    /** Show the export button in the toolbar. Default: true. */
    showExport?: boolean;

    /** Show the reset button in the toolbar. Default: true. */
    showReset?: boolean;

    /** Show the pending change counter in the toolbar. Default: true. */
    showChangeCounter?: boolean;

    /** Show inheritance indicators on inherited cells. Default: true. */
    showInheritance?: boolean;

    /** Show the change diff highlighting on modified cells. Default: true. */
    showChangeHighlight?: boolean;

    /** Enable category-level bulk toggle checkboxes. Default: true. */
    enableGroupBulk?: boolean;

    /** Enable role-column-level bulk toggle in the header. Default: true. */
    enableRoleBulk?: boolean;

    /**
     * Enable permission-row-level bulk toggle.
     * Adds a "grant/deny for all roles" control on each permission row.
     * Default: false.
     */
    enablePermissionBulk?: boolean;

    /** Make the header row sticky during vertical scroll. Default: true. */
    stickyHeader?: boolean;

    /** Make the first column sticky during horizontal scroll. Default: true. */
    stickyFirstColumn?: boolean;

    /** CSS height of the matrix container. Default: "100%". */
    height?: string;

    /** CSS width of the matrix container. Default: "100%". */
    width?: string;

    /** Additional CSS class(es) for the root element. */
    cssClass?: string;

    /** Message displayed when filter produces no results. Default: "No matching permissions". */
    emptyMessage?: string;

    // -- Callbacks -------------------------------------------------------

    /**
     * Called when a single cell state changes (user click or programmatic).
     * The consumer should update their data model accordingly.
     */
    onChange?: (change: PermissionChange) => void;

    /**
     * Called when a bulk operation is performed (grant/deny all for a role,
     * permission, or group).
     */
    onBulkChange?: (bulkChange: BulkChange) => void;

    /**
     * Called when the user clicks the export button.
     * Receives the full matrix export data and selected format.
     */
    onExport?: (data: MatrixExportData, format: ExportFormat) => void;

    /**
     * Called when the user clicks the reset button.
     * The consumer should revert their data model to the last saved state
     * and call setData() to refresh the matrix.
     */
    onReset?: () => void;

    /**
     * Custom cell renderer. If provided, called for every cell.
     * Return an HTMLElement to replace the default checkbox,
     * or null to use the default renderer.
     */
    cellRenderer?: (
        role: Role,
        permission: Permission,
        state: PermissionState
    ) => HTMLElement | null;
}
```

### 4.3 Class: PermissionMatrix

| Method | Signature | Description |
|--------|-----------|-------------|
| `constructor` | `(options: PermissionMatrixOptions)` | Creates the matrix DOM inside the container element identified by `containerId`. |
| `setCellState` | `(roleId: string, permissionId: string, state: PermissionState)` | Programmatically sets the state of a single cell. Fires `onChange`. Updates change tracking. |
| `getCellState` | `(roleId: string, permissionId: string): PermissionState` | Returns the current explicit state of a cell. |
| `getEffectiveState` | `(roleId: string, permissionId: string): PermissionState` | Returns the effective state of a cell, resolving inheritance chains. |
| `setData` | `(roles: Role[], groups: PermissionGroup[], cells: MatrixCell[])` | Replaces the entire data model. Clears change tracking. Re-renders. |
| `getChanges` | `(): PermissionChange[]` | Returns all pending changes since the last `setData()` or `clearChanges()`. |
| `clearChanges` | `()` | Clears the pending change list and removes diff highlighting. |
| `expandGroup` | `(groupId: string)` | Expands a permission group. |
| `collapseGroup` | `(groupId: string)` | Collapses a permission group. |
| `expandAllGroups` | `()` | Expands all permission groups. |
| `collapseAllGroups` | `()` | Collapses all permission groups. |
| `setFilter` | `(text: string)` | Programmatically sets the filter text. Filters permissions by name. |
| `clearFilter` | `()` | Clears the filter and restores all permissions. |
| `exportData` | `(format: ExportFormat): MatrixExportData` | Returns the current matrix state as a structured export object. |
| `setReadOnly` | `(readOnly: boolean)` | Toggles read-only mode. Disables all checkboxes when true. |
| `refresh` | `()` | Re-renders the matrix from the current data model. Preserves expand/collapse and filter state. |
| `destroy` | `()` | Removes all DOM elements, event listeners, and internal references. |
| `getElement` | `(): HTMLElement` | Returns the root `div.permissionmatrix` DOM element. |

### 4.4 Convenience Functions

| Function | Description |
|----------|-------------|
| `createPermissionMatrix(options)` | Creates and returns a PermissionMatrix instance. |

### 4.5 Global Exports

```typescript
window.PermissionMatrix = PermissionMatrix;
window.createPermissionMatrix = createPermissionMatrix;
```

---

## 5. Behaviour

### 5.1 Lifecycle

1. **Construction** -- The constructor validates that the container element exists. If not, it throws an error logged with `LOG_PREFIX`. The roles, groups, and cells arrays are ingested into internal data structures. An internal `Map<string, Map<string, PermissionState>>` is built, keyed by `roleId` then `permissionId`, for O(1) cell state lookups. The inheritance chain for each role is resolved and cached. Circular inheritance is detected and logged as a warning; the cycle is broken at the point of detection. The DOM is built: toolbar, column headers, group headers, permission rows, and cells. Event listeners are attached via event delegation on the grid container. A `console.log` message is emitted: `[PermissionMatrix] Initialised with N roles, M permissions in K groups`.
2. **Interaction** -- User interactions (cell clicks, bulk toggles, filter, expand/collapse) modify the visual state and fire callbacks. The component never modifies the consumer's data model.
3. **Refresh** -- Re-renders the matrix from the current internal data model. Preserves expand/collapse and filter state.
4. **Destroy** -- Removes all DOM elements, event listeners, internal maps and sets, and sets a `destroyed` flag.

### 5.2 Cell Interaction — Tri-State Cycle

When a user clicks a cell checkbox (and the matrix is not read-only, and the role is not read-only):

**Standard cells (state is "granted", "denied", or "none"):**

1. **Current state: "none"** -> transitions to **"granted"**.
2. **Current state: "granted"** -> transitions to **"denied"**.
3. **Current state: "denied"** -> transitions to **"none"**.

**Inherited cells (state is "inherited"):**

Inherited cells follow a four-state cycle that allows explicit override and revert:

1. **Current state: "inherited"** -> transitions to **"granted"** (explicit override).
2. **Current state: "granted"** -> transitions to **"denied"** (explicit deny).
3. **Current state: "denied"** -> transitions to **"inherited"** (removes explicit override, reverts to inheritance).

Each state change:

- Updates the internal state map.
- Fires `onChange` with the `PermissionChange`.
- Records the change in the pending changes list (for diff tracking).
- Updates the cell's visual appearance.
- Announces the change via the screen reader live region.

### 5.3 Inheritance Resolution

Roles can inherit from other roles via the `inheritsFrom` property. Inheritance is resolved as follows:

1. Build an ordered inheritance chain for each role by following `inheritsFrom` references (e.g., Admin -> Editor -> Viewer).
2. For a given role and permission, the effective state is determined by:
   - If the cell has an explicit state ("granted" or "denied"), that state takes precedence.
   - If the cell has no explicit state ("none"), walk the inheritance chain upward. The first ancestor role with an explicit "granted" state determines the effective state as "inherited".
   - If no ancestor has an explicit "granted" state, the effective state is "none".
3. When a parent role's permission changes, all descendant roles with "inherited" state for that permission are visually updated to reflect the new effective state.
4. Inherited cells display a visual indicator (outlined checkbox with an arrow icon, blue tint) and a tooltip showing the source: "Inherited from [Role name]".
5. Circular inheritance chains are detected during initialisation. If a cycle is found, a `console.warn` is emitted: `[PermissionMatrix] Circular inheritance detected: [chain]`. The cycle is broken by ignoring the back-edge.
6. Maximum inheritance depth: 20 levels. Deeper chains are truncated with a console warning.

### 5.4 Bulk Operations

#### 5.4.1 Role-Level Bulk (Column Header)

When `enableRoleBulk` is true, each role column header contains a bulk toggle checkbox:

- If all permissions in the column are "granted" (explicit or inherited), the bulk checkbox shows as checked. Clicking it sets all editable cells to "denied".
- If all are "denied" or "none", the bulk checkbox shows as unchecked. Clicking it sets all editable cells to "granted".
- If mixed, the bulk checkbox shows as indeterminate (dash). Clicking it sets all editable cells to "granted".
- The `onBulkChange` callback fires with `type: "grant-all-for-role"` or `"deny-all-for-role"`.
- Inherited cells are not affected by bulk operations unless the user has already explicitly overridden them.
- Read-only roles do not display bulk toggle controls.

#### 5.4.2 Group-Level Bulk (Category Header)

When `enableGroupBulk` is true, each group header row contains bulk toggle checkboxes per role column:

- The checkbox reflects the aggregate state of all permissions in that group for that role.
- Clicking toggles all editable permissions in the group for that role between granted and denied.
- The `onBulkChange` callback fires with `type: "grant-all-in-group"` or `"deny-all-in-group"`.

#### 5.4.3 Permission-Level Bulk (Row)

When `enablePermissionBulk` is true, each permission row contains a bulk toggle at the far right:

- Clicking grants or denies that permission across all editable (non-read-only) roles.
- The `onBulkChange` callback fires with `type: "grant-all-for-permission"` or `"deny-all-for-permission"`.

### 5.5 Category Expand/Collapse

Permission groups can be expanded or collapsed:

- Clicking the chevron toggle on a group header row toggles the visibility of that group's permission rows.
- The chevron is a right-pointing triangle (`bi-chevron-right`) that rotates 90 degrees clockwise when expanded.
- Collapsed groups show only the header row with the group name and bulk checkboxes (if enabled).
- The `aria-expanded` attribute is updated on the group header.
- Expand/collapse state is preserved across filter operations and `refresh()` calls.
- `expandGroup(groupId)`, `collapseGroup(groupId)`, `expandAllGroups()`, and `collapseAllGroups()` provide programmatic control.

### 5.6 Search/Filter

When `showFilter` is true:

1. A search input (`input.permissionmatrix-filter-input`, `role="searchbox"`) appears in the toolbar.
2. As the user types, permissions are filtered after a debounce delay (`filterDebounceMs`, default 250ms).
3. **Matching**: case-insensitive substring match against `permission.name`. If a permission matches, its entire row is shown.
4. **Group visibility**: if any permission in a group matches, the group header remains visible and the group is auto-expanded. Groups with no matching permissions are hidden.
5. **Mark highlighting**: matching text within permission labels is wrapped in `<mark class="permissionmatrix-highlight">` elements.
6. **Empty result**: if no permissions match, the `emptyMessage` is displayed.
7. **Clear**: clicking the clear button (x) in the filter input, pressing Escape while the input is focused, or calling `clearFilter()` removes the filter, restores original expand/collapse state, and removes mark highlighting.
8. Auto-expanded groups during filter are restored to their previous state when filter is cleared.

### 5.7 Change Tracking

The component tracks all changes made since the last `setData()` or `clearChanges()` call:

1. Each cell state change is recorded as a `PermissionChange` in an internal map keyed by `"roleId:permissionId"`.
2. If a cell is changed back to its original state, the change is removed from the map (net-zero change).
3. When `showChangeHighlight` is true, modified cells display a visual diff indicator (yellow-tinted background).
4. When `showChangeCounter` is true, the toolbar displays a badge with the count of pending changes. The badge uses `aria-live="polite"` to announce changes to screen readers.
5. The `getChanges()` method returns the current array of pending changes.
6. The `clearChanges()` method resets the map and removes all diff highlighting.
7. The reset button (when `showReset` is true) fires `onReset()`. The consumer should revert their data model and call `setData()` to refresh the matrix. The reset button is disabled when there are no pending changes.

### 5.8 Export

When the user clicks the export button (or calls `exportData()` programmatically):

1. The matrix state is serialized into a `MatrixExportData` object containing: timestamp, roles, groups with permissions, all cell states, and pending changes.
2. The `onExport` callback fires with the data and the selected format.
3. The consumer is responsible for handling the export (download, clipboard copy, API call, etc.).
4. If the consumer does not provide an `onExport` callback, the component performs a default JSON download via `Blob` and a temporary `<a>` element.

### 5.9 Read-Only Mode

When `readOnly` is true (globally or per-role via `role.readonly`):

1. All checkboxes are visually disabled (reduced opacity, cursor not-allowed, no hover effects).
2. Click events on cells are suppressed. No state changes occur.
3. Bulk toggle checkboxes are hidden or disabled.
4. The toolbar shows only the filter and export buttons. The reset button and change counter are hidden.
5. Keyboard navigation still works for accessibility (users can read the matrix), but Space/Enter do not toggle cell state.
6. `onChange` and `onBulkChange` callbacks are never fired.
7. Per-role read-only: only that role's column cells are disabled. Other roles remain editable.

---

## 6. Keyboard Interaction

The PermissionMatrix implements the WAI-ARIA grid pattern for two-dimensional keyboard navigation.

| Key | Action |
|-----|--------|
| **Tab** | Moves focus into the grid (to the last-focused cell, or the first data cell). A second Tab moves focus to the next focusable element outside the grid. |
| **Shift+Tab** | Reverse of Tab. |
| **Arrow Right** | Moves focus to the next cell in the row (next role column). |
| **Arrow Left** | Moves focus to the previous cell in the row (previous role column). |
| **Arrow Down** | Moves focus to the same column in the next permission row. Skips collapsed group content. |
| **Arrow Up** | Moves focus to the same column in the previous permission row. |
| **Home** | Moves focus to the first cell in the current row (first role column). |
| **End** | Moves focus to the last cell in the current row (last role column). |
| **Ctrl+Home** | Moves focus to the first cell in the first row. |
| **Ctrl+End** | Moves focus to the last cell in the last row. |
| **Space** | Toggles the focused cell through its state cycle (granted -> denied -> none, or inherited -> granted -> denied -> inherited). |
| **Enter** | Same as Space (toggles cell state). On a group header, toggles expand/collapse. |
| **Escape** | Clears the filter input if focused. Closes any open tooltip. |
| **Page Down** | Scrolls down by one viewport height within the grid. Focus moves to the corresponding cell. |
| **Page Up** | Scrolls up by one viewport height within the grid. |

### 6.1 Focus Management

- The grid uses roving tabindex: only the currently focused cell has `tabindex="0"`. All other cells have `tabindex="-1"`.
- When focus enters the grid via Tab, it moves to the last-focused cell (remembered from previous interaction) or the first data cell.
- Arrow key navigation does not wrap (does not move from the last column to the first column of the next row).
- Group header rows are focusable. When a group header is focused, Enter or Space toggles expand/collapse.
- Bulk toggle checkboxes in headers are part of the focus order within their row.
- After a cell state change, focus remains on the same cell.
- After a bulk operation, focus remains on the element that triggered the operation.
- After expand/collapse, focus remains on the group header.

---

## 7. Accessibility

The PermissionMatrix follows the WAI-ARIA grid pattern.

### 7.1 Grid ARIA

| Element | Attribute | Value |
|---------|-----------|-------|
| `div.permissionmatrix-grid` | `role` | `"grid"` |
| `div.permissionmatrix-grid` | `aria-label` | `"Permission matrix"` (or consumer-provided label) |
| `div.permissionmatrix-grid` | `aria-readonly` | `"true"` when readOnly is true |
| `div.permissionmatrix-header-row` | `role` | `"row"` |
| `div.permissionmatrix-role-header` | `role` | `"columnheader"` |
| `div.permissionmatrix-role-header` | `aria-label` | `"[Role name]"` |
| `div.permissionmatrix-group-header` | `role` | `"row"` |
| `div.permissionmatrix-group-header` | `aria-expanded` | `"true"` or `"false"` |
| `div.permissionmatrix-row` | `role` | `"row"` |
| `div.permissionmatrix-permission-label` | `role` | `"rowheader"` |
| `div.permissionmatrix-permission-label` | `aria-label` | `"[Permission name]"` |
| `div.permissionmatrix-cell` | `role` | `"gridcell"` |

### 7.2 Cell ARIA

| Element | Attribute | Value |
|---------|-----------|-------|
| `.permissionmatrix-checkbox` | `role` | `"checkbox"` |
| `.permissionmatrix-checkbox` (granted) | `aria-checked` | `"true"` |
| `.permissionmatrix-checkbox` (denied/none) | `aria-checked` | `"false"` |
| `.permissionmatrix-checkbox` (inherited) | `aria-checked` | `"mixed"` |
| `.permissionmatrix-checkbox` | `aria-label` | `"[Permission name] for [Role name]: [state]"` |
| `.permissionmatrix-checkbox` (readonly) | `aria-disabled` | `"true"` |
| Bulk checkbox (indeterminate) | `aria-checked` | `"mixed"` |

### 7.3 Toolbar ARIA

| Element | Attribute | Value |
|---------|-----------|-------|
| `.permissionmatrix-toolbar` | `role` | `"toolbar"` |
| `.permissionmatrix-toolbar` | `aria-label` | `"Permission matrix actions"` |
| `.permissionmatrix-filter-input` | `role` | `"searchbox"` |
| `.permissionmatrix-filter-input` | `aria-label` | `"Filter permissions"` |
| `.permissionmatrix-export-btn` | `aria-label` | `"Export permission matrix"` |
| `.permissionmatrix-reset-btn` | `aria-label` | `"Reset changes"` |
| `.permissionmatrix-change-counter` | `aria-live` | `"polite"` |
| `.permissionmatrix-change-counter` | `aria-label` | `"N pending changes"` |

### 7.4 Screen Reader Announcements

A visually hidden `div[aria-live="polite"]` announces state changes:

| Event | Announcement |
|-------|-------------|
| Cell state changed | "[Permission name] for [Role name] changed to [state]" |
| Bulk grant (role) | "All permissions for [Role name] set to granted" |
| Bulk deny (role) | "All permissions for [Role name] set to denied" |
| Bulk grant (permission) | "[Permission name] set to granted for all roles" |
| Bulk grant (group) | "All [Group name] permissions for [Role name] set to granted" |
| Group expanded | "[Group name] expanded, N permissions" |
| Group collapsed | "[Group name] collapsed" |
| Filter applied | "N permissions match filter" |
| Filter cleared | "Filter cleared, showing all N permissions" |
| Changes reset | "All changes reset" |
| Export completed | "Permission matrix exported" |

### 7.5 Colour and Contrast

- Checkbox states are not conveyed by colour alone. Each state uses a distinct icon shape:
  - Granted: filled square with checkmark (`bi-check-square-fill`).
  - Denied: empty square, border only (`bi-square`).
  - Inherited: outlined square with checkmark and arrow indicator (`bi-check-square` + small arrow badge).
  - None: empty square with dashed border (custom CSS).
  - Indeterminate (bulk): filled square with dash (`bi-dash-square-fill`).
- All text meets WCAG 2.1 AA contrast requirements (minimum 4.5:1 for body text, 3:1 for large text and UI components).
- Changed cells use both background colour and a small dot indicator, not colour alone.

---

## 8. Styling

### 8.1 CSS Classes

All classes use the `.permissionmatrix-` prefix.

| Class | Description |
|-------|-------------|
| `.permissionmatrix` | Root container |
| `.permissionmatrix-toolbar` | Toolbar row above the grid |
| `.permissionmatrix-filter` | Filter input wrapper |
| `.permissionmatrix-filter-input` | Filter text input |
| `.permissionmatrix-filter-clear` | Filter clear (x) button |
| `.permissionmatrix-export-btn` | Export button |
| `.permissionmatrix-reset-btn` | Reset button |
| `.permissionmatrix-change-counter` | Pending changes badge |
| `.permissionmatrix-grid` | Scrollable grid container |
| `.permissionmatrix-header-row` | Sticky top row with role names |
| `.permissionmatrix-corner-cell` | Top-left empty corner cell |
| `.permissionmatrix-role-header` | Individual role column header |
| `.permissionmatrix-role-name` | Role name text |
| `.permissionmatrix-role-desc` | Role description or inheritance text |
| `.permissionmatrix-role-color` | Colour accent bar on role header |
| `.permissionmatrix-role-bulk` | Bulk toggle checkbox in role header |
| `.permissionmatrix-role-inherit-icon` | Inheritance indicator icon in role header |
| `.permissionmatrix-group-header` | Category/group header row |
| `.permissionmatrix-group-toggle` | Expand/collapse chevron button |
| `.permissionmatrix-group-name` | Group name text |
| `.permissionmatrix-group-icon` | Optional group icon |
| `.permissionmatrix-group-bulk-cell` | Bulk toggle cell in group header per role |
| `.permissionmatrix-row` | Single permission row |
| `.permissionmatrix-row-changed` | Row containing at least one changed cell |
| `.permissionmatrix-row-hidden` | Hidden row (filtered out by search) |
| `.permissionmatrix-permission-label` | Sticky left-column permission name cell |
| `.permissionmatrix-permission-name` | Permission name text |
| `.permissionmatrix-permission-desc` | Permission description tooltip trigger |
| `.permissionmatrix-permission-bulk` | Per-permission bulk toggle |
| `.permissionmatrix-cell` | Single role x permission intersection cell |
| `.permissionmatrix-cell-granted` | Cell with explicit "granted" state |
| `.permissionmatrix-cell-denied` | Cell with explicit "denied" state |
| `.permissionmatrix-cell-inherited` | Cell with inherited state |
| `.permissionmatrix-cell-none` | Cell with no state set |
| `.permissionmatrix-cell-changed` | Cell with pending change (diff highlight) |
| `.permissionmatrix-cell-readonly` | Cell in a read-only role or matrix |
| `.permissionmatrix-checkbox` | Tri-state checkbox button |
| `.permissionmatrix-checkbox-granted` | Granted checkbox visual state |
| `.permissionmatrix-checkbox-denied` | Denied checkbox visual state |
| `.permissionmatrix-checkbox-inherited` | Inherited checkbox visual state |
| `.permissionmatrix-checkbox-indeterminate` | Indeterminate state for bulk toggles |
| `.permissionmatrix-inherited-badge` | Small badge indicating inheritance source |
| `.permissionmatrix-highlight` | `<mark>` element for filter match highlighting |
| `.permissionmatrix-empty` | Empty state message |
| `.permissionmatrix-sr-live` | Visually hidden live region for screen readers |

### 8.2 Theme Integration

| Property | Value | Source / Rationale |
|----------|-------|---------------------|
| Background | `$gray-50` | Clean grid background |
| Grid border | `1px solid $gray-200` | Subtle cell borders |
| Header row background | `$gray-100` | Differentiate from data rows |
| Header row text | `$gray-900`, `$font-weight-semibold` | Clear role identification |
| Group header background | `$gray-100` | Section distinction |
| Group header text | `$gray-800`, `$font-weight-semibold` | Section heading |
| Group chevron | `$gray-500`, 14px | Subtle toggle indicator |
| Permission label text | `$gray-900`, `$font-size-sm` | Readable at compact size |
| Permission description | `$gray-600`, `$font-size-xs` | Secondary information |
| Cell background (default) | `$gray-50` | Neutral base |
| Cell background (hover) | `$gray-100` | Subtle highlight |
| Cell background (changed) | `$yellow-50` | Diff highlight tint |
| Cell background (inherited) | `$blue-50` | Inheritance tint |
| Checkbox granted | `$green-600` fill | Positive action |
| Checkbox denied | `$gray-400` border, no fill | Negative/restricted |
| Checkbox inherited | `$blue-500` outline with arrow badge | Inherited indicator |
| Checkbox none | `$gray-400` dashed border | Neutral unset |
| Checkbox disabled | `$gray-300` border, 0.5 opacity | Read-only state |
| Role colour accent | 3px top border per `role.color` | Role differentiation |
| Inheritance icon | `bi-arrow-bar-down`, `$gray-400`, 12px | Subtle indicator in role header |
| Toolbar background | `$gray-50` | Consistent with grid |
| Toolbar border | `1px solid $gray-200` bottom | Subtle separation |
| Change counter badge | `bg-warning text-dark` | Attention-drawing |
| Filter input | `form-control form-control-sm` | Bootstrap standard |
| Export/Reset buttons | `btn btn-sm btn-outline-secondary` | Subtle action buttons |
| Empty message | `$gray-500`, italic, `$font-size-sm` | Subtle empty state |
| Row hover | `$gray-100` background on the entire row | Row-level highlight |
| Box shadow | None | Flat grid aesthetic |
| Font | Inherits `$font-family-base` | Theme font |
| SCSS import | `@import '../../src/scss/variables'` | Access project variables |

### 8.3 Dimensions

| Property | Value |
|----------|-------|
| Cell size | 40px wide x 36px tall (minimum) |
| Permission label column width | 240px (minimum) |
| Role column width | 120px (minimum), auto |
| Row height | 36px |
| Group header height | 36px |
| Header row height | 56px (accommodates name + inheritance text) |
| Toolbar height | 40px |
| Checkbox size | 18px x 18px |
| Group toggle chevron width | 20px |
| Cell padding | `4px 8px` |
| Permission label padding | `4px 12px` |
| Minimum grid width | 480px |
| Filter input width | 220px |

### 8.4 Z-Index

The PermissionMatrix is a flow-positioned component. Internal z-index values are scoped within the grid's stacking context:

| Element | Z-Index | Rationale |
|---------|---------|-----------|
| Grid container | Auto (flow) | Normal stacking context |
| Sticky column headers | 10 (within grid) | Above scrolled rows |
| Sticky permission label column | 10 (within grid) | Above scrolled cells |
| Corner cell (top-left) | 20 (within grid) | Above both sticky axes |
| Group header rows | 5 (within grid) | Above adjacent body rows |
| Toolbar | Auto | Normal flow, above grid via DOM order |

### 8.5 Sticky Headers

The matrix uses CSS `position: sticky` for two axes:

1. **Role column headers** (top row): stick to the top of the grid container during vertical scrolling. Background is opaque (`$gray-100`) to prevent content bleed-through.
2. **Permission label column** (left column): sticks to the left of the grid container during horizontal scrolling. Background is opaque (`$gray-50`) to prevent content bleed-through.
3. **Corner cell** (top-left): sticks to both top and left, remaining visible at all scroll positions. Background is opaque.

This ensures that when scrolling a large matrix, the user always sees which role and which permission a cell belongs to.

### 8.6 Transitions and Animations

| Property | Duration | Easing | Description |
|----------|----------|--------|-------------|
| Cell background (hover) | 100ms | ease | Subtle hover feedback |
| Checkbox state change | 150ms | ease | Smooth icon transition |
| Group expand/collapse | 200ms | ease-out | Content reveal |
| Chevron rotation | 200ms | ease | Expand/collapse toggle |
| Change highlight appearance | 200ms | ease | Diff tint fade-in |
| Filter highlight | 150ms | ease | Mark appearance |

### 8.7 Reduced Motion

A `prefers-reduced-motion: reduce` media query disables all transitions. State changes are still visually reflected, just without animated transitions.

---

## 9. Dependencies

| Dependency | Required | Notes |
|------------|----------|-------|
| Bootstrap 5 CSS | Yes | For `$gray-*`, `$blue-*`, `$green-*`, `$yellow-*`, `$red-*` SCSS variables, `btn`, `badge`, `form-control` classes |
| Bootstrap Icons | Yes | For `bi-check-square-fill`, `bi-check-square`, `bi-square`, `bi-dash-square-fill`, `bi-chevron-right`, `bi-funnel`, `bi-download`, `bi-arrow-counterclockwise`, `bi-arrow-bar-down`, `bi-x`, `bi-info-circle` |
| Enterprise Theme CSS | Yes | For theme variable overrides |
| No JavaScript framework dependencies | -- | Vanilla TypeScript only |

---

## 10. Edge Cases

| Scenario | Behaviour |
|----------|-----------|
| Empty roles array | Grid renders with only the permission label column. Console warning logged. |
| Empty groups array | Empty state message shown. Toolbar remains functional. |
| No cells provided | All cells default to "none" state. |
| Role with no inheritsFrom | Role has no inheritance. All cells are explicit or "none". |
| Circular inheritance (A inherits B, B inherits A) | Detected during init. Console warning logged. Cycle broken at detection point. Both roles treated as having no further inheritance. |
| Deep inheritance chain (A <- B <- C <- ... 20+ levels) | Maximum depth of 20 levels enforced. Deeper chains are truncated with a console warning. |
| Duplicate role IDs | Console warning logged. First role with the ID wins. |
| Duplicate permission IDs across groups | Console warning logged. First permission with the ID wins. Only the first occurrence is rendered. |
| Permission in multiple groups | Not supported. Each permission belongs to exactly one group. |
| Very large matrix (50+ roles, 200+ permissions) | Horizontal scrolling with sticky headers. Performance guidance: consider virtual column rendering for 100+ columns. |
| Filter with no results | Empty state message shown. Group headers hidden. Change counter remains visible. |
| Reset with no changes | Reset button is disabled (no pending changes). |
| Export with pending changes | Export includes both current state and pending changes in the output. |
| setData() during active filter | Filter is re-applied to the new data. |
| destroy() during active filter | Filter is cleared, DOM removed, listeners detached. |
| Container element not found | Constructor throws with a descriptive error message logged with `LOG_PREFIX`. |
| Read-only role in editable matrix | Only that role's column cells are disabled. Other roles remain editable. |
| Inherited cell explicitly overridden, then reverted | When the user cycles back to "inherited" state, the explicit override is removed and the cell returns to its inherited visual state. The change is removed from the pending changes map (net-zero). |
| Bulk grant on role with read-only permissions | Read-only cells are skipped. Only editable cells are affected. |
| Bulk grant on inherited cells | Inherited cells are skipped by default during bulk operations. Only cells with explicit state or "none" are affected. |
| Group expanded/collapsed during filter | Auto-expanded groups during filter are restored to their previous state when filter is cleared. |
| Multiple instances on same page | Each operates independently with its own data, state, and filter. |
| clearChanges() with active filter | Changes are cleared. Diff highlighting is removed from all cells (including hidden ones). |

---

## 11. Performance Considerations

### 11.1 Cell State Map

- Internal `Map<string, Map<string, PermissionState>>` for O(1) cell lookups by roleId + permissionId.
- Built once on `setData()` or constructor. Updated incrementally on `setCellState()`.

### 11.2 Inheritance Cache

- Pre-computed `Map<string, string[]>` mapping each role ID to its ordered inheritance chain (e.g., `"admin" -> ["editor", "viewer"]`).
- Built once during initialisation. Invalidated only on `setData()`.
- Effective state resolution walks the chain. Typical chain length is 2-4 levels, so resolution is effectively O(1).

### 11.3 Event Delegation

- A single `click` event listener on the grid container, delegating to individual cells via `event.target.closest(".permissionmatrix-cell")`.
- A single `keydown` event listener on the grid container for keyboard navigation.
- A single `input` event listener on the filter input.
- No per-cell event listeners. This is critical for large matrices.

### 11.4 Change Tracking

- Pending changes stored in a `Map<string, PermissionChange>` keyed by `"roleId:permissionId"`.
- O(1) lookup, insert, and delete for change tracking operations.
- Change counter updated by reading `map.size`.
- Original state snapshot stored as a separate `Map<string, Map<string, PermissionState>>` for net-zero change detection.

### 11.5 DOM Recycling

For matrices exceeding 1000 visible cells, batch DOM updates using `requestAnimationFrame` to avoid layout thrashing during bulk operations. A single rAF callback applies all visual updates from a bulk change.

### 11.6 Grid Layout

Use CSS Grid with a CSS custom property for column count:

```scss
.permissionmatrix-grid
{
    display: grid;
    grid-template-columns: minmax(240px, auto) repeat(var(--pm-role-count), minmax(120px, 1fr));
}
```

The `--pm-role-count` property is set dynamically via JavaScript based on `roles.length`.

---

## 12. Logging

All log statements use the pattern:

```typescript
const LOG_PREFIX = "[PermissionMatrix]";
```

| Level | When | Example |
|-------|------|---------|
| `console.log` | Component lifecycle events | `[PermissionMatrix] Initialised with 4 roles, 15 permissions in 3 groups` |
| `console.log` | Significant user actions | `[PermissionMatrix] Exported matrix as JSON` |
| `console.warn` | Recoverable issues | `[PermissionMatrix] Circular inheritance detected: Admin -> Editor -> Admin` |
| `console.warn` | Data integrity issues | `[PermissionMatrix] Duplicate permission ID "create-articles" in groups "Content" and "Admin"` |
| `console.error` | Unrecoverable errors | `[PermissionMatrix] Container element #permissions-grid not found` |
| `console.debug` | Verbose diagnostics | `[PermissionMatrix] Filter applied: 8 of 15 permissions visible` |
| `console.debug` | State changes | `[PermissionMatrix] Cell [editor:create-articles] changed: none -> granted` |

---

## 13. Testing Considerations

### 13.1 Unit Tests

| Area | Test Cases |
|------|------------|
| Rendering | Empty matrix, single role, multiple roles, single group, multiple groups, nested groups |
| Cell states | All four states render correctly (granted, denied, inherited, none) |
| Cell interaction | Click cycles through tri-state correctly, inherited cells follow four-state cycle |
| Inheritance | Single-level inheritance, multi-level inheritance, circular detection, override and revert |
| Effective state | getEffectiveState resolves inheritance chains correctly |
| Bulk (role) | Grant all, deny all, mixed to granted, skip read-only cells, skip inherited cells |
| Bulk (group) | Grant all in group, deny all in group, mixed state |
| Bulk (permission) | Grant for all roles, deny for all roles, skip read-only roles |
| Expand/collapse | Toggle group, expand all, collapse all, state preserved across refresh |
| Filter | Substring match, case-insensitive, group visibility, mark highlighting, clear, no results |
| Change tracking | Record change, revert removes change, clearChanges, getChanges, change counter, net-zero detection |
| Export | JSON format, CSV format, includes pending changes, MatrixExportData structure |
| Reset | onReset callback fires, reset disabled when no changes |
| Read-only | Global read-only, per-role read-only, bulk operations blocked, keyboard navigation works |
| API methods | setCellState, getCellState, getEffectiveState, setData, setFilter, clearFilter, expandGroup, collapseGroup, destroy |
| Callbacks | onChange fires on cell change, onBulkChange fires on bulk, onExport fires on export, onReset fires on reset |

### 13.2 Accessibility Tests

| Test | Expectation |
|------|-------------|
| `role="grid"` present | Grid container has correct role |
| `role="row"` present | Each row (header, group, permission) has correct role |
| `role="gridcell"` present | Each cell has correct role |
| `role="columnheader"` present | Role headers have correct role |
| `role="rowheader"` present | Permission labels have correct role |
| `aria-checked` values | Match cell state (true/false/mixed) |
| `aria-label` on checkboxes | Contains permission name, role name, and state |
| `aria-expanded` on groups | Correct value on expand/collapse |
| `aria-readonly` on grid | Present when readOnly is true |
| `aria-disabled` on read-only cells | Present on disabled checkboxes |
| Roving tabindex | Only one cell has `tabindex="0"` at a time |
| Keyboard navigation | All keys from section 6 work correctly |
| Screen reader announcements | Live region updates for state changes, bulk, filter, reset, export |
| Colour independence | States distinguishable without colour (distinct icon shapes) |
| Contrast ratios | All text and UI components meet WCAG 2.1 AA |

### 13.3 Visual Regression Tests

| Scenario | What to Capture |
|----------|-----------------|
| Default matrix (3 roles, 2 groups) | Full grid with expanded groups |
| Collapsed group | Group header with hidden content |
| All states visible | Cells showing granted, denied, inherited, none |
| Changed cells | Cells with diff highlighting (yellow tint) |
| Read-only mode | Disabled checkboxes and hidden controls |
| Filter active | Filtered grid with mark highlighting |
| Bulk indeterminate | Header checkbox in indeterminate state |
| Empty filter result | Empty state message |
| Sticky headers during scroll | Headers remain visible at scroll offset |
| Role colour accents | Headers with custom colours |
| Large matrix (10+ roles) | Horizontal scroll with sticky labels |
| Inherited cells | Blue-tinted cells with arrow badge |

---

## 14. Files

| File | Purpose |
|------|---------|
| `specs/permissionmatrix.prd.md` | This specification |
| `components/permissionmatrix/permissionmatrix.ts` | TypeScript source |
| `components/permissionmatrix/permissionmatrix.scss` | Styles |
| `components/permissionmatrix/README.md` | Consumer documentation |

---

## 15. Implementation Notes

### 15.1 DOM Helper Usage

All DOM construction must use the project's `createElement` and `setAttr` helpers. Never use `innerHTML` for user-provided content. Use `textContent` for setting text values.

```typescript
const cell = createElement("div", "permissionmatrix-cell");
setAttr(cell, "role", "gridcell");
setAttr(cell, "tabindex", "-1");

const checkbox = createElement("button", "permissionmatrix-checkbox");
setAttr(checkbox, "type", "button");
setAttr(checkbox, "role", "checkbox");
setAttr(checkbox, "aria-checked", "false");
setAttr(checkbox, "aria-label", `${permission.name} for ${role.name}: none`);
checkbox.textContent = "";

cell.appendChild(checkbox);
```

### 15.2 Grid Layout Strategy

Use CSS Grid for the matrix layout:

```scss
.permissionmatrix-grid
{
    display: grid;
    grid-template-columns: minmax(240px, auto) repeat(var(--pm-role-count), minmax(120px, 1fr));
}
```

The `--pm-role-count` CSS custom property is set dynamically based on the number of roles. This allows the grid to adapt without regenerating CSS.

### 15.3 State Map Structure

```typescript
// Primary state map: roleId -> permissionId -> PermissionState
private stateMap: Map<string, Map<string, PermissionState>>;

// Inheritance chain cache: roleId -> [parentId, grandparentId, ...]
private inheritanceChains: Map<string, string[]>;

// Pending changes: "roleId:permissionId" -> PermissionChange
private pendingChanges: Map<string, PermissionChange>;

// Original state snapshot for change tracking (net-zero detection)
private originalStateMap: Map<string, Map<string, PermissionState>>;
```

### 15.4 Checkbox Icon Strategy

Use Bootstrap Icons with CSS class swaps rather than SVG manipulation:

| State | Icon Class | Additional Visual |
|-------|-----------|-------------------|
| Granted | `bi-check-square-fill` | Green colour (`$green-600`) |
| Denied | `bi-square` | Gray colour (`$gray-400`) |
| Inherited | `bi-check-square` (outline) | Blue colour (`$blue-500`) + small arrow badge |
| None | `bi-square` | Gray colour, dashed appearance via CSS |
| Indeterminate (bulk) | `bi-dash-square-fill` | Neutral colour |

### 15.5 Inheritance Resolution Algorithm

```typescript
function resolveEffectiveState(
    roleId: string,
    permissionId: string,
    stateMap: Map<string, Map<string, PermissionState>>,
    inheritanceChains: Map<string, string[]>
): PermissionState
{
    const roleStates = stateMap.get(roleId);
    const explicit = roleStates?.get(permissionId);

    if (explicit === "granted" || explicit === "denied")
    {
        return explicit;
    }

    const chain = inheritanceChains.get(roleId);

    if (!chain)
    {
        return "none";
    }

    for (const ancestorId of chain)
    {
        const ancestorStates = stateMap.get(ancestorId);
        const ancestorState = ancestorStates?.get(permissionId);

        if (ancestorState === "granted")
        {
            return "inherited";
        }
    }

    return "none";
}
```

### 15.6 Sticky Positioning

```scss
.permissionmatrix-permission-label
{
    position: sticky;
    left: 0;
    z-index: 10;
    background-color: $gray-50;
}

.permissionmatrix-header-row
{
    position: sticky;
    top: 0;
    z-index: 10;
    background-color: $gray-100;
}

.permissionmatrix-corner-cell
{
    position: sticky;
    top: 0;
    left: 0;
    z-index: 20;
    background-color: $gray-100;
}
```

### 15.7 Mark Highlighting for Filter

```typescript
function highlightLabel(
    labelElement: HTMLElement,
    searchText: string
): void
{
    const text = labelElement.textContent || "";
    const lowerText = text.toLowerCase();
    const lowerSearch = searchText.toLowerCase();
    const index = lowerText.indexOf(lowerSearch);

    if (index === -1)
    {
        return;
    }

    const before = text.substring(0, index);
    const match = text.substring(index, index + searchText.length);
    const after = text.substring(index + searchText.length);

    labelElement.textContent = "";

    if (before)
    {
        labelElement.appendChild(document.createTextNode(before));
    }

    const mark = createElement("mark", "permissionmatrix-highlight");
    mark.textContent = match;
    labelElement.appendChild(mark);

    if (after)
    {
        labelElement.appendChild(document.createTextNode(after));
    }
}
```

### 15.8 Defensive Destroy

The `destroy()` method must:

1. Set an internal `destroyed` flag.
2. Cancel any pending filter debounce timers.
3. Remove all event listeners (click on grid container, keydown on grid container, input on filter).
4. Clear the state map, inheritance cache, original state snapshot, and pending changes.
5. Remove all child DOM elements from the container.
6. Null internal references to prevent memory leaks.
7. Log: `[PermissionMatrix] Destroyed`.

---

## 16. Open Questions

1. Should the matrix support column reordering (drag roles to rearrange column order)?
2. Should there be a "compact mode" that reduces cell size for very large matrices (50+ roles)?
3. Should the export support additional formats beyond JSON and CSV (e.g., Markdown table for documentation)?
4. Should permission descriptions be shown inline (beneath the permission name) or only via tooltip?
5. Should the component provide a "compare" mode that shows two matrix states side-by-side (e.g., before and after a policy change)?
6. Should there be undo/redo support for individual cell changes (Ctrl+Z / Ctrl+Y)?
7. Should the sticky permission label column be resizable by the user (drag to resize)?
8. Should row selection be supported (clicking a permission label selects the entire row for bulk operations)?

---

## 17. Future Considerations (Out of Scope for v1)

| Feature | Notes |
|---------|-------|
| **Column reorder** | Drag-and-drop role columns for custom ordering. |
| **Diff mode** | Compare two snapshots of the permission matrix, highlighting additions and removals. |
| **Conditional grants** | Permissions granted only under specific conditions (time-based, attribute-based). |
| **Audit trail integration** | Show who last modified each grant and when. Integrates with AuditLogViewer. |
| **Role templates** | Pre-built permission sets that can be applied as a starting point for new roles. |
| **Permission dependencies** | Declaring that one permission requires another (e.g., "edit" requires "view"). Auto-grant dependencies on grant, warn on revoke. |
| **Virtual scrolling** | For matrices exceeding 500+ permissions. Would render only visible rows in the viewport. |
| **Undo/redo** | Ctrl+Z / Ctrl+Y for individual cell changes. |
| **Keyboard bulk operations** | Ctrl+Space for row-level bulk, Shift+Space for column-level bulk. |
