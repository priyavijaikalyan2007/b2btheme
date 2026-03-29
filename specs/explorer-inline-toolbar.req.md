# Component Requirement: Embeddable Inline Toolbar

**Date:** 2026-03-28
**Status:** Required for Explorer sidebar (and other embedded panels)
**Priority:** P1
**Requested By:** Engineering (Explorer implementation)
**Related Bug:** CDN `createToolbar()` renders at viewport top, not inside a container element

---

## 1. Problem

The existing CDN `createToolbar()` creates a toolbar docked to the top of the viewport (like a ribbon bar). When called with a `container` option pointing to a sidebar panel, the toolbar still renders outside the container at the top of the page.

The Explorer sidebar needs a **small inline toolbar** that renders INSIDE a parent container (like a sidebar's content area) — not as a floating/docked element at the viewport top.

## 2. Requested Solution

Either:
- **Option A:** Fix `createToolbar()` to respect the `container` option and render inline when provided (not docked/floating)
- **Option B:** Create a new factory `createInlineToolbar()` that renders a compact toolbar INSIDE a container element, following the same API but without docking/floating behavior

## 3. Use Cases

1. **Explorer sidebar toolbar:** Filter toggle, Expand All, Collapse All, Refresh — small icon buttons with tooltips inside the left sidebar panel
2. **Properties panel toolbar:** Quick actions (Edit, Delete, Share) inside the right panel
3. **Bottom panel header:** Tab-adjacent actions inside TabbedPanel headers

## 4. Desired API

```typescript
interface InlineToolbarOptions
{
    container: HTMLElement;    // MUST render inside this element
    items: InlineToolbarItem[];
    size?: 'xs' | 'sm' | 'md';   // xs=24px, sm=28px, md=32px button height
    align?: 'left' | 'center' | 'right';  // Default: 'left'
    compact?: boolean;         // Reduce gaps for tight spaces (default: false)
}

interface InlineToolbarItem
{
    id: string;
    icon: string;              // Bootstrap icon name without bi- prefix
    tooltip: string;
    type?: 'button' | 'toggle' | 'separator';
    active?: boolean;          // For toggles
    disabled?: boolean;
    onClick?: (item: InlineToolbarItem, active: boolean) => void;
}
```

## 5. Visual Requirements

- Renders as a flex row inside the container (no absolute/fixed positioning)
- Background: transparent or subtle `#f8fafc`
- Icon buttons: no border, subtle hover background
- Toggle active state: light blue background + blue icon
- Separators: 1px vertical divider
- Tooltips: standard browser `title` attribute (or CDN Tooltip if available)
- Theme aware: respects light/dark mode
- Compact mode: 2px gaps instead of 4px

## 6. Size

Estimated: ~100 lines JS + ~40 lines CSS. Small component.
