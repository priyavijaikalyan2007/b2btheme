# Component Requirement: Stackable Sidebars

**Date:** 2026-03-28
**Status:** Feature Request
**Priority:** P2
**Requested By:** Engineering (Explorer + app integration)
**CDN Component:** `sidebar` (enhancement to existing component)

---

## 1. Problem

The current CDN Sidebar component supports a single docked panel per edge (left, right, top, bottom). Applications increasingly need **multiple independent panels on the same edge** — for example, a Properties panel AND a Relationships panel on the right side, each independently collapsible and resizable.

The current workaround is to use a TabbedPanel inside a single sidebar, which works but forces users to switch between tabs instead of seeing both panels simultaneously when screen space permits.

## 2. Use Cases

### Use Case 1: Properties + Relationships (Right Edge)
The Explorer and all sub-apps want to show:
- **Properties panel** (top): Name, type, dates, owner, access level
- **Relationships panel** (bottom): Ontology edges (references, derives_from, owns)

Both should be visible simultaneously on large screens, collapsible independently.

### Use Case 2: Explorer Tree + Starred Items (Left Edge)
The Explorer sidebar has:
- **Tree view** (main content): org hierarchy + folders + assets
- **Starred items** (top section): quick-access bookmarks

Currently these are vertically stacked inside one sidebar. With stackable sidebars, they could be independent panels with independent collapse.

### Use Case 3: Diagrams Shapes + Metadata (Right Edge)
The Diagrams app has:
- **Shapes palette** (top): drag shapes onto canvas
- **Metadata panel** (bottom): properties of selected node/edge

Currently in a TabbedPanel — but would benefit from simultaneous visibility.

### Use Case 4: Future AI Assistant Panel
An AI chat/assistant panel that can stack below other panels on any edge.

## 3. Proposed API Enhancement

### Option A: Stack Configuration on DockLayout

```typescript
interface DockLayoutOptions
{
    // Existing single-panel options (unchanged for backward compat)
    leftSidebar?: Sidebar;
    rightSidebar?: Sidebar;

    // NEW: stacked panels on an edge
    leftStack?: SidebarStackOptions;
    rightStack?: SidebarStackOptions;
}

interface SidebarStackOptions
{
    panels: StackedPanelConfig[];
    orientation?: 'vertical';  // Could support 'horizontal' in future
    defaultSizes?: number[];   // Percentage split (e.g., [60, 40])
    resizable?: boolean;       // Drag divider between panels
    minSize?: number;          // Minimum panel height in px
}

interface StackedPanelConfig
{
    id: string;
    title: string;
    icon?: string;
    content: HTMLElement;
    collapsed?: boolean;
    collapsible?: boolean;
    minHeight?: number;
}
```

### Option B: Stack Method on Existing Sidebar

```typescript
interface Sidebar
{
    // Existing methods...

    // NEW: Split this sidebar into stacked panels
    stack(panels: StackedPanelConfig[]): SidebarStack;
}

interface SidebarStack
{
    getPanel(id: string): StackedPanel;
    setPanelContent(id: string, content: HTMLElement): void;
    collapsePanel(id: string): void;
    expandPanel(id: string): void;
    setSizes(percentages: number[]): void;
    destroy(): void;
}
```

### Option C: New StackLayout Component

```typescript
// A generic vertical stack of collapsible panels
interface StackLayoutOptions
{
    container: HTMLElement;
    panels: StackedPanelConfig[];
    resizable?: boolean;
    orientation?: 'vertical' | 'horizontal';
}

declare function createStackLayout(options: StackLayoutOptions): StackLayout;
```

This option is the most flexible — it's not sidebar-specific and could be used inside any container (sidebar content, center panel, dialog, etc.).

## 4. Recommended Approach

**Option C (StackLayout)** is the most versatile. A `createStackLayout()` component that:
- Renders N panels vertically with collapsible headers
- Drag dividers between panels for resizing
- Each panel has: title bar, collapse toggle, content area
- Persists sizes/collapsed state via callback
- Works inside any container (sidebar, center panel, standalone)

This can be composed with the existing Sidebar:
```typescript
const rightSidebar = createDockedSidebar({ position: 'right', width: 380 });
const stack = createStackLayout({
    container: rightSidebar.getContentElement(),
    panels: [
        { id: 'properties', title: 'Properties', content: propsEl },
        { id: 'relationships', title: 'Relationships', content: relsEl, collapsed: true },
    ],
    resizable: true,
});
```

## 5. Visual Design

```
┌─────────────────────┐
│ ▾ Properties    [—] │  ← Collapsible header with toggle
│                     │
│  Name: Deploy Plan  │  ← Panel 1 content
│  Type: Checklist    │
│  Owner: Jane        │
│                     │
├─ ─ ─ ─ ─ ─ ─ ─ ─ ─┤  ← Draggable divider
│ ▾ Relationships [—] │  ← Collapsible header
│                     │
│  ▸ derived_from (1) │  ← Panel 2 content
│  ▸ owned_by (1)     │
│  ▸ references (2)   │
│                     │
└─────────────────────┘
```

When a panel is collapsed:
```
┌─────────────────────┐
│ ▸ Properties    [+] │  ← Collapsed (header only, ~28px)
├─────────────────────┤
│ ▾ Relationships [—] │  ← Expanded (gets full height)
│                     │
│  ▸ derived_from (1) │
│  ▸ owned_by (1)     │
│  ▸ references (2)   │
│                     │
└─────────────────────┘
```

## 6. Accessibility

- Panel headers are focusable (`tabindex="0"`)
- Enter/Space toggles collapse
- Drag divider has `role="separator"` with `aria-orientation="horizontal"`
- Arrow keys adjust divider position when focused
- Panels have `role="region"` with `aria-label`

## 7. Size Estimate

~300 lines JS + ~80 lines CSS. Medium component.
