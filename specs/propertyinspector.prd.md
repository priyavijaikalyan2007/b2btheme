<!-- AGENT: PRD specification for the Property Inspector (Drawer) component (MASTER_COMPONENT_LIST §19.4). -->

# Property Inspector (Slide-out Drawer) — PRD

## 1. Overview

Non-modal right-side panel (30-40% width) for viewing and editing entity details without navigating away from the parent list. Supports tabbed sections within the drawer.

**MASTER_COMPONENT_LIST §19.4** | **ADR-045**

## 2. Use Cases

- Record detail preview from a DataGrid or list
- Quick-edit workflows (update fields without full-page nav)
- Support ticket inspection
- Metadata editing (tags, properties, custom fields)

## 3. References

- Asana (task detail slide-out)
- Shopify Polaris Drawer
- Linear issue detail panel

## 4. Functional Requirements

### 4.1 Drawer Panel
- Slides from right edge of container (not viewport; scoped to parent)
- Configurable width (px or %, default 380px)
- Optional resize handle for drag-to-resize
- Backdrop optional (default: none, non-modal)

### 4.2 Header
- Title, optional subtitle, close button
- Optional icon/avatar
- Optional action buttons (edit, delete, etc.)

### 4.3 Tabbed Sections
- Optional tab bar within the drawer for multi-section content
- Tabs: configurable label, icon, content element
- Active tab persistence across open/close

### 4.4 Content
- Scrollable body area
- Consumer provides content elements (or tab contents)
- Optional footer with action buttons

### 4.5 API
- `open(options)` — show drawer with content
- `close()` — hide drawer
- `isOpen()` — check visibility
- `setTitle(title)` / `setContent(el)` — update dynamically
- `setTabs(tabs)` / `setActiveTab(id)` — manage tabs
- `destroy()` — clean up

### 4.6 Size Variants
- `sm` / `md` (default) / `lg`

## 5. Status

| Phase | Status |
|-------|--------|
| PRD | Complete |
| TypeScript | Complete |
| SCSS | Complete |
| README | Complete |
| Demo | Complete |
| Build | Complete |
