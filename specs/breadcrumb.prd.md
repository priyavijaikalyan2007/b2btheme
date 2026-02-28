<!-- AGENT: PRD specification for the Breadcrumb Navigation component (MASTER_COMPONENT_LIST §15.3). -->

# Breadcrumb Navigation — PRD

## 1. Overview

Hierarchical path display with clickable segments and an optional quick-action dropdown on the terminal segment. Supports overflow truncation for deep hierarchies.

**MASTER_COMPONENT_LIST §15.3** | **ADR-042**

## 2. Use Cases

- Nested settings navigation (Settings → General → Notifications)
- Folder path display (Root → Projects → Acme → src)
- Entity hierarchy traversal (Organization → Team → Member)
- SPA route visualisation with programmatic navigation

## 3. References

- Atlassian breadcrumbs
- AWS Console hierarchy navigation
- Shopify admin breadcrumbs
- WAI-ARIA Breadcrumb Pattern (APG)

## 4. Functional Requirements

### 4.1 Core Display
- Render an ordered list of labelled path segments with separator dividers
- Each non-terminal segment is a clickable link (or callback target)
- Terminal segment displays as static text with `aria-current="page"`
- Support optional per-item Bootstrap Icons

### 4.2 Terminal Dropdown Actions
- Optional actions dropdown on the terminal (last) segment
- Renders a caret button next to the terminal label
- Dropdown menu with action items, separators, disabled items
- Positioned with `position: fixed` (ADR-040 pattern) to avoid overflow clipping

### 4.3 Overflow Truncation
- When `items.length > maxVisible` (default 5), collapse middle items into an ellipsis "…"
- Ellipsis is clickable and opens a dropdown listing collapsed items
- First item and last `ceil(maxVisible/2)` items always visible

### 4.4 Programmatic API
- `setItems(items)` — replace all breadcrumb items
- `addItem(item)` — append a new segment
- `removeItem(index)` — remove by index
- `getItems()` — return current items array
- `setActions(actions)` — update terminal dropdown actions
- `getElement()` — return root DOM element
- `destroy()` — clean up DOM and listeners

### 4.5 Size Variants
- `sm` / `md` (default) / `lg` matching project convention

### 4.6 Keyboard
- `Tab` — focus breadcrumb items sequentially
- `Enter` / `Space` — activate focused item or action
- `Escape` — close any open dropdown
- `Alt + D` — focus breadcrumb (KEYBOARD.md §2)

## 5. Non-Functional Requirements

- Accessibility: `<nav aria-label="Breadcrumb">`, `aria-current="page"` on active item
- Performance: DOM reuse where possible; no full re-render on single item add/remove
- Security: `textContent` only — never `innerHTML` with user content
- Reduced motion: dropdowns open/close instantly when `prefers-reduced-motion: reduce`

## 6. Technical Design

### 6.1 CSS Strategy
- Root wrapper: `.breadcrumb-nav` (avoids Bootstrap `.breadcrumb` collision)
- Inside: Bootstrap `.breadcrumb` + `.breadcrumb-item` for base layout
- Custom classes prefixed `breadcrumb-nav-`
- Reuse `$breadcrumb-*` variables from `_variables.scss`
- Dropdowns: `position: fixed`, `z-index: 1060`

### 6.2 TypeScript Pattern
- Class `Breadcrumb` with factory `createBreadcrumb(options)`
- DOM helpers: `createElement`, `setAttr` (component-local)
- Window export: `createBreadcrumb`
- IIFE-wrapped (no ES module imports)

## 7. Demo Sections

1. Basic breadcrumb (3 items, no actions)
2. With icons and terminal dropdown actions
3. Deep hierarchy with overflow truncation (8+ items, maxVisible=5)
4. Size variants (sm / md / lg)

## 8. Status

| Phase | Status |
|-------|--------|
| PRD | Complete |
| TypeScript | Complete |
| SCSS | Complete |
| README | Complete |
| Demo | Complete |
| Build | Complete |
