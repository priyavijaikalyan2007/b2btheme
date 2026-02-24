<!-- AGENT: PRD for the Ribbon component — Microsoft Office-style tabbed toolbar with adaptive groups, menu bar, QAT, backstage, KeyTips. -->

# Ribbon Component

**Status:** Draft
**Component name:** Ribbon
**Folder:** `./components/ribbon/`
**Spec author:** Agent
**Date:** 2026-02-24

---

## 1. Overview

### 1.1 What Is It

A Microsoft Office-style tabbed toolbar interface for organizing commands and controls into logical groups. Each tab reveals a panel of grouped controls arranged in rows, supporting large, small, and mini button sizes. Includes an optional traditional menu bar, Quick Access Toolbar (QAT), contextual tabs, backstage panel, adaptive group collapsing, multi-level KeyTips, and inline gallery controls.

### 1.2 Why Build It

As the enterprise platform expands, the existing single-strip Toolbar becomes insufficient for organizing growing toolsets. A Ribbon provides:
- **Tabbed organization** — context-based tool switching (Home, Insert, Design)
- **Hierarchical groups** — multiple rows of tools within visually framed sections
- **Adaptive layout** — groups progressively collapse when the window narrows
- **Contextual tabs** — dynamic tabs that appear based on selection context
- **Keyboard discoverability** — multi-level KeyTips for full keyboard access
- **Component hosting** — embed pickers, switchers, and other components as custom controls

### 1.3 Design Inspiration

| Source | Key Pattern Adopted |
|--------|---------------------|
| Microsoft Office 2016+ | Tabs, groups with labels, large/small/mini buttons, contextual tabs, QAT, backstage, adaptive collapse, KeyTips |
| Metro UI Ribbon | tabs-holder, content-holder with sections/groups, ribbon-button sizes, split buttons, toggle groups |
| Existing Toolbar component | 11 control types, KeyTip badges, gallery popups, split button menus, roving tabindex |
| Existing Sidebar component | Backstage slide panel pattern |
| Existing FormDialog component | Focus trap pattern for backstage |

---

## 2. Anatomy

### 2.1 Full Ribbon

```
┌─[QAT: 💾 ↩ ↪  ▼]──────────────────────────────────────────────────────────┐
├─[File ▾]──[Edit ▾]──[View ▾]─────────────────────── (optional menu bar) ────┤
├─[File]──[Home]──[Insert]──[Design]──[View]──{Table Design}── [▲ Collapse] ──┤
│ ┌─ Clipboard ──┐ ┌────── Font ──────────────┐ ┌── Paragraph ──┐ ┌ Styles ┐ │
│ │ [📋 Paste ▼] │ │ [Arial        ▼] [11 ▼] │ │ [≡][≡][≡][≡] │ │[Normal]│ │
│ │ [✂Cut][📄Cpy]│ │ [B][I][U][S] [A▼][🎨▼] │ │ [⇥][⇤][↕][¶] │ │[Head 1]│ │
│ └──────────────┘ └──────────────────────────┘ └───────────────┘ └────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Collapsed Ribbon

```
┌─[QAT: 💾 ↩ ↪  ▼]──────────────────────────────────────────────────────────┐
├─[File]──[Home]──[Insert]──[Design]──[View]──────────────────── [▼ Expand] ──┤
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Backstage (File Tab)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [← Back]                                                                    │
│ ┌───────────┐ ┌─────────────────────────────────────────────────────────┐  │
│ │  Info      │ │                                                         │  │
│ │  New       │ │  Document Properties                                    │  │
│ │ ▸Save As   │ │                                                         │  │
│ │  Print     │ │  Title: My Document                                     │  │
│ │  Export    │ │  Author: Jane Smith                                     │  │
│ │  Close     │ │  Last Modified: 2026-02-24                              │  │
│ └───────────┘ └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. API

### 3.1 Factory

```typescript
createRibbon(options: RibbonOptions, containerId?: string): Ribbon
```

### 3.2 Key Interfaces

See `components/ribbon/ribbon.ts` for full TypeScript interfaces.

### 3.3 Control Types

| Type | Sizes | Element | Notes |
|------|-------|---------|-------|
| `button` | large/small/mini | `<button>` | Standard action, optional toggle |
| `split-button` | large/small | `<div>` with primary + arrow | Primary button + dropdown menu |
| `gallery` | large | `<div>` with inline row + popup | Inline preview + "More" dropdown grid |
| `dropdown` | small | `<select>` wrapper | Dropdown with options |
| `input` | small | `<input>` wrapper | Text input with optional icon |
| `color` | small/mini | Color swatch button | Native color picker |
| `number` | small | `<input type="number">` wrapper | Spinner with min/max/step/suffix |
| `checkbox` | small | `<input type="checkbox">` | Checkbox with label |
| `toggle` | small | Toggle switch | Styled checkbox as toggle |
| `separator` | — | `<div>` | Vertical divider |
| `label` | small | `<span>` | Non-interactive text |
| `custom` | any | Consumer-provided | HTMLElement or factory function |

### 3.4 Key Methods

| Method | Description |
|--------|-------------|
| `show(containerId?)` | Mount and display the ribbon |
| `hide()` | Hide the ribbon |
| `destroy()` | Remove from DOM, clean up |
| `setActiveTab(tabId)` | Switch to a tab |
| `getActiveTab()` | Get active tab ID |
| `addTab(tab, index?)` | Add a tab dynamically |
| `removeTab(tabId)` | Remove a tab |
| `showContextualTab(tabId)` | Show a contextual tab |
| `hideContextualTab(tabId)` | Hide a contextual tab |
| `setControlDisabled(id, disabled)` | Enable/disable a control |
| `setControlHidden(id, hidden)` | Show/hide a control |
| `setControlActive(id, active)` | Set toggle active state |
| `getControlValue(id)` | Get control value |
| `setControlValue(id, value)` | Set control value |
| `addQATItem(item)` | Add a QAT button |
| `removeQATItem(id)` | Remove a QAT button |
| `collapse()` / `expand()` / `toggleCollapse()` | Ribbon minimize |
| `isCollapsed()` | Check collapsed state |
| `openBackstage()` / `closeBackstage()` | Backstage panel |
| `setColors(colors)` | Update colors at runtime |
| `getElement()` | Get root DOM element |

---

## 4. Behaviour

### 4.1 Tab Switching
- Click tab to switch. Active tab is visually highlighted.
- Panel content swaps to show the active tab's groups.
- Previous tab content is detached (not destroyed) for fast switching.
- `onTabChange(tabId)` fires on switch.

### 4.2 Contextual Tabs
- Tabs with `contextual: true` are hidden by default.
- `showContextualTab(tabId)` makes them visible with a colored accent bar.
- `hideContextualTab(tabId)` hides them. If active, switches to first static tab.

### 4.3 Backstage
- Tabs with `backstage: true` open a full-overlay panel instead of ribbon content.
- Left sidebar with navigation items, right content area.
- Escape or back button closes backstage, returns to previous tab.
- Focus trapped within backstage.

### 4.4 Menu Bar
- Optional traditional dropdown menus above the tab bar.
- Top-level triggers open fixed-position dropdown menus.
- Menu items support: icon, label, shortcut text, disabled, separator, header.
- Nested submenus via `children[]` — fly-out on hover (300ms delay) or ArrowRight.
- Click-outside closes all menus.

### 4.5 Quick Access Toolbar (QAT)
- Thin strip above or below the tab bar (`qatPosition: "above" | "below"`).
- Small icon-only buttons for frequently used actions.
- Customize dropdown at end to add/remove items.
- `onQATCustomize(items)` fires on change.

### 4.6 Adaptive Collapse
- When the ribbon panel width decreases, groups progressively collapse.
- Stages: full → medium (large→small) → small (all small) → mini (icon-only) → overflow (dropdown).
- Groups with lower `collapsePriority` collapse first.
- ResizeObserver triggers recalculation (debounced 150ms).
- CSS classes control rendering: `.ribbon-group-medium`, `.ribbon-group-small`, `.ribbon-group-mini`, `.ribbon-group-overflow`.

### 4.7 Collapse/Expand
- Ribbon can minimize to just the tab bar (clicking a tab temporarily expands).
- Ctrl+F1 toggles collapse.
- Chevron button in tab bar toggles.
- `onCollapse(collapsed)` fires on change.

### 4.8 Loading/Disabled States
- Individual controls can be disabled via `setControlDisabled(id, true)`.
- Disabled controls are greyed out and non-interactive.

---

## 5. Keyboard

| Key | Context | Action |
|-----|---------|--------|
| Alt | Anywhere | Toggle KeyTips (multi-level) |
| Escape | KeyTips active | Go back one KeyTip level or dismiss |
| Escape | Menu/popup open | Close menu/popup |
| Escape | Backstage | Close backstage |
| ArrowLeft/Right | Tab bar | Navigate between tabs |
| Enter/Space | Tab bar | Activate focused tab |
| Tab | Ribbon panel | Move to next group |
| Shift+Tab | Ribbon panel | Move to previous group |
| ArrowLeft/Right | Within group | Navigate between controls |
| ArrowUp/Down | Within group | Navigate between stacked controls |
| Home/End | Within group | First/last control |
| Enter/Space | Control | Activate button/toggle |
| ArrowDown | Menu trigger | Open menu |
| ArrowRight | Menu item with children | Open submenu |
| ArrowLeft | Submenu | Close submenu |
| Ctrl+F1 | Anywhere | Toggle ribbon collapse |

---

## 6. Accessibility

- Tab bar: `role="tablist"`, tabs: `role="tab"`, `aria-selected`, `aria-controls`
- Panel: `role="tabpanel"`, `aria-labelledby`
- Groups: `role="group"`, `aria-label`
- Buttons: `role="button"`, `aria-pressed` (toggles), `aria-disabled`
- Menu bar: `role="menubar"`, menus: `role="menu"`, items: `role="menuitem"`
- QAT: `role="toolbar"`, `aria-label="Quick Access"`
- Backstage: `role="dialog"`, `aria-modal="true"`, `aria-label`
- KeyTip badges: `aria-hidden="true"`
- Live region: `aria-live="polite"` for announcements
- Focus trap within backstage
- Focus restore on backstage close
- Roving tabindex within groups
- Animations respect `prefers-reduced-motion: reduce`

---

## 7. Color Configuration

All visual properties configurable via options and runtime `setColors()`:

| Property | CSS Custom Property | Default |
|----------|-------------------|---------|
| `backgroundColor` | `--ribbon-bg` | `$gray-50` |
| `tabBarBackgroundColor` | `--ribbon-tab-bar-bg` | `$gray-100` |
| `tabTextColor` | `--ribbon-tab-color` | `$gray-700` |
| `tabActiveTextColor` | `--ribbon-tab-active-color` | `$gray-900` |
| `tabActiveBackgroundColor` | `--ribbon-tab-active-bg` | `$gray-50` |
| `panelBackgroundColor` | `--ribbon-panel-bg` | `$gray-50` |
| `groupLabelColor` | `--ribbon-group-label-color` | `$gray-500` |
| `groupBorderColor` | `--ribbon-group-border-color` | `$gray-300` |
| `controlColor` | `--ribbon-control-color` | `$gray-800` |
| `controlHoverColor` | `--ribbon-control-hover-bg` | `$gray-200` |
| `controlActiveColor` | `--ribbon-control-active-bg` | `$blue-100` |
| `qatBackgroundColor` | `--ribbon-qat-bg` | `$gray-100` |
| `menuBarBackgroundColor` | `--ribbon-menubar-bg` | `$gray-100` |

---

## 8. Layout Integration

The Ribbon uses `position: relative` (not fixed), making it embeddable in layout containers:

| Layout | Slot | Usage |
|--------|------|-------|
| DockLayout | `toolbar` | `dock.setToolbar(ribbon.getElement())` |
| BorderLayout | `north` | `border.setNorth(ribbon.getElement())` |
| FlexGridLayout | Row 0 | `rows: ["auto", "1fr"]` |
| BoxLayout | Child 0 | `flex: 0` (natural height) |
| Standalone | Any div | `ribbon.show("container-id")` |

---

## 9. Component Hosting

The `custom` control type embeds existing components (pickers, switchers, menus) inside ribbon groups.

- `.ribbon-group-content` uses `overflow: visible` so child component dropdowns are not clipped.
- `.ribbon-panel` uses `overflow-y: visible` for dropdowns extending below.
- `panelHeight` option (default 96px) is configurable for taller embedded components.
- Components portaling to `document.body` (WorkspaceSwitcher, ColorPicker) work without special handling.

---

## 10. Dependencies

- Bootstrap 5 CSS (SCSS variables)
- Bootstrap Icons (control icons, chevrons, check marks)
- Optional: `window.DOMPurify` for gallery preview sanitization
