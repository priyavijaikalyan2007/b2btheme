<!-- AGENT: CSS class reference for custom enterprise components defined in custom.scss. -->

# Custom CSS Classes

All custom classes defined in `src/scss/custom.scss`, grouped by category. These extend Bootstrap 5 with enterprise-specific components.

---

## Tables

### `.table-enterprise`

Enhanced table styling for data-heavy applications. Applies a dark header, hover highlight, and compact font.

```html
<table class="table table-enterprise table-striped table-hover">
    <thead>
        <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Status</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>1001</td>
            <td>Acme Corp</td>
            <td><span class="badge badge-status status-active">Active</span></td>
        </tr>
    </tbody>
</table>
```

Combine with `.table-sm` for an even more compact variant (`0.25rem 0.5rem` cell padding).

---

## Cards

### `.card-compact`

Reduces card header, footer, and body padding for dense dashboard layouts.

```html
<div class="card card-compact">
    <div class="card-header">Revenue</div>
    <div class="card-body">
        <p class="metric-value">$1.2M</p>
    </div>
</div>
```

---

## Sidebar Navigation

### `.sidebar`

Full-height dark sidebar with nav link states.

```html
<nav class="sidebar">
    <ul class="nav flex-column">
        <li class="nav-item">
            <a class="nav-link active" href="#"><i class="bi bi-speedometer2"></i> Dashboard</a>
        </li>
        <li class="nav-item">
            <a class="nav-link" href="#"><i class="bi bi-people"></i> Users</a>
        </li>
        <li class="nav-item">
            <a class="nav-link" href="#"><i class="bi bi-gear"></i> Settings</a>
        </li>
    </ul>
</nav>
```

- Background: `$gray-900`
- Active link: `$primary` background, white text
- Hover: semi-transparent white overlay

---

## Toolbar

### `.toolbar`

Horizontal action bar with title and action buttons, used at the top of data views.

```html
<div class="toolbar">
    <h5 class="toolbar-title">User Management</h5>
    <div class="toolbar-actions">
        <input type="search" class="form-control form-control-sm" placeholder="Search...">
        <button class="btn btn-sm btn-primary">Add User</button>
        <button class="btn btn-sm btn-outline-secondary">Export</button>
    </div>
</div>
```

Child classes:
- `.toolbar-title` — bold title text, no margin
- `.toolbar-actions` — flex row with `0.5rem` gap

---

## Metrics

### `.metric-card`

Dashboard metric display with label, value, and change indicator.

```html
<div class="metric-card">
    <div class="metric-label">Monthly Revenue</div>
    <div class="metric-value">$142,300</div>
    <div class="metric-change positive">+8.2% from last month</div>
</div>
```

Child classes:
- `.metric-label` — uppercase, small, muted
- `.metric-value` — large bold number
- `.metric-change` — with `.positive` (green) or `.negative` (red) modifiers

---

## Badges

### `.badge-status`

Status indicator badges with semantic colours.

```html
<span class="badge badge-status status-active">Active</span>
<span class="badge badge-status status-pending">Pending</span>
<span class="badge badge-status status-inactive">Inactive</span>
<span class="badge badge-status status-error">Error</span>
```

| Modifier | Background | Text |
|----------|-----------|------|
| `.status-active` | `$green-600` | white |
| `.status-pending` | `$yellow-500` | `$gray-900` |
| `.status-inactive` | `$gray-400` | white |
| `.status-error` | `$red-600` | white |

### `.theme-ontology-category-<name>`

A relationship category badge, with one colour for each of the eight ontology categories (apps#249). The class sets the background, the text colour and the border together. The text on each background passes WCAG AA in light and dark mode.

```html
<span class="badge border theme-ontology-category-structural">Structural</span>
<span class="badge border theme-ontology-category-strategic">Strategic</span>
```

Each category also has three tokens, for a page that paints the colours itself: `--theme-ontology-category-<name>-bg`, `-fg` and `-border`. Use the `-fg` token only on the matching `-bg`.

| Category | Class | Slot |
|----------|-------|------|
| structural | `.theme-ontology-category-structural` | 1, blue |
| lifecycle | `.theme-ontology-category-lifecycle` | 2, green |
| dependency | `.theme-ontology-category-dependency` | 3, amber |
| custom | `.theme-ontology-category-custom` | 4, pink |
| strategic | `.theme-ontology-category-strategic` | 5, indigo |
| identity | `.theme-ontology-category-identity` | 6, teal |
| knowledge | `.theme-ontology-category-knowledge` | 7, purple |
| ownership | `.theme-ontology-category-ownership` | 8, orange |

Each category is a named slot of the categorical palette, `.theme-group-1` to `.theme-group-8`. So a category has the same colour as its slot. The mapping is `$ontology-category-slots` in `src/scss/_variables.scss`. The palette has eight slots, so a ninth category needs a new slot, not a reused one.

---

## Modals

### `.modal-header-enterprise`

Dark modal header with inverted close button.

```html
<div class="modal-header modal-header-enterprise">
    <h5 class="modal-title">Confirm Action</h5>
    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
</div>
```

- Background: `$gray-900`, white text
- Close button uses `filter: invert(1)` for visibility

---

## Forms

### `.form-inline-compact`

Horizontal form layout with tight gaps, useful for filter bars.

```html
<div class="form-inline-compact">
    <div class="form-group">
        <input type="text" class="form-control form-control-sm" placeholder="Name">
    </div>
    <div class="form-group">
        <select class="form-select form-select-sm">
            <option>All Status</option>
            <option>Active</option>
        </select>
    </div>
    <button class="btn btn-sm btn-primary">Filter</button>
</div>
```

### `.form-label-inline`

Label and input on the same line with consistent alignment.

```html
<div class="form-label-inline">
    <label>Email</label>
    <input type="email" class="form-control form-control-sm">
</div>
```

### `.btn-group-compact`

Button group with smaller padding and font size.

```html
<div class="btn-group btn-group-compact">
    <button class="btn btn-outline-secondary">Day</button>
    <button class="btn btn-outline-secondary active">Week</button>
    <button class="btn btn-outline-secondary">Month</button>
</div>
```

---

## Layout Utilities

### `.text-compact`

Tighter line height (1.3) for dense text blocks.

### `.p-compact`

Compact padding (`0.5rem`) on all sides.

### `.m-compact`

Compact margin (`0.5rem`) on all sides.

### `.layout-dense`

Adds `0.5rem` vertical spacing between direct children.

```html
<div class="layout-dense">
    <div class="card card-compact">...</div>
    <div class="card card-compact">...</div>
    <div class="card card-compact">...</div>
</div>
```

---

## Accessibility

### `.skip-link`

Hidden skip link that appears on focus for keyboard navigation.

```html
<a class="skip-link" href="#main-content">Skip to main content</a>
```

The link is positioned off-screen and slides into view when focused via Tab key.

### Focus States

All interactive elements (links, buttons, inputs, selects, textareas) get a `2px solid $primary` outline with `2px` offset on `:focus-visible`. This is applied globally in `custom.scss` and does not require an additional class.
