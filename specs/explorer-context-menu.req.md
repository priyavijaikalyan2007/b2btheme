# Component Requirement: Context Menu

**Date:** 2026-03-28
**Status:** Required for Explorer (and all apps)
**Priority:** P1
**Requested By:** Engineering (Explorer implementation)
**CDN Slug:** `contextmenu`

---

## 1. Purpose

A theme-aware, accessible context menu component that appears on right-click (desktop) or long-press (mobile). Currently the Explorer uses a hand-crafted `<div>` with inline styles that doesn't match the platform's design system. This component should be reusable across all apps.

## 2. Design References

- **VS Code** — context menu with icons, keyboard shortcuts, separators, disabled states, sub-menus
- **Windows 11** — rounded corners, acrylic backdrop, smooth animations
- **Google Docs** — clean context menu with icon column, label, shortcut hint column
- **Figma** — context menu with nested sub-menus and checkmarks

## 3. Current Problems

The hand-crafted Explorer context menu has:
- No theme awareness (hardcoded colors, no dark mode support)
- No shadow/elevation matching the CDN design system
- No keyboard navigation (arrow keys, Enter, Escape)
- No sub-menu support
- No shortcut hint column
- No checkmark/radio states
- No animation (appears instantly, no fade-in)
- No mobile/touch support (long-press)
- No accessibility (no ARIA roles)
- Positioning can overflow viewport edges

## 4. Configuration Options

```typescript
interface ContextMenuOptions
{
    // Required
    items: ContextMenuItem[];

    // Position
    x: number;
    y: number;

    // Optional
    theme?: 'light' | 'dark' | 'auto';  // Default: 'auto' (follows system)
    minWidth?: number;                    // Default: 200
    maxWidth?: number;                    // Default: 320
    onClose?: () => void;                 // Called when menu closes

    // Behavior
    autoClose?: boolean;                  // Close on click outside (default: true)
    closeOnEscape?: boolean;              // Close on Escape key (default: true)
    animation?: 'fade' | 'scale' | 'none'; // Default: 'fade'
}

interface ContextMenuItem
{
    // Basic
    id: string;
    label: string;
    icon?: string;                        // Bootstrap icon name (without bi- prefix)
    shortcut?: string;                    // e.g., "Ctrl+C", "F2", "Del"

    // State
    disabled?: boolean;
    checked?: boolean;                    // For checkmark items
    active?: boolean;                     // For radio-style items

    // Appearance
    type?: 'item' | 'separator' | 'header' | 'submenu';
    danger?: boolean;                     // Red styling for destructive actions (e.g., Delete)

    // Sub-menu
    children?: ContextMenuItem[];         // For type: 'submenu'

    // Action
    onClick?: (item: ContextMenuItem) => void;
}
```

## 5. Public API

```typescript
interface ContextMenu
{
    close(): void;
    isOpen(): boolean;
    updateItems(items: ContextMenuItem[]): void;
    destroy(): void;
}

declare function createContextMenu(options: ContextMenuOptions): ContextMenu;
```

## 6. Behavior

1. **Positioning:** Auto-adjusts to stay within viewport bounds (flips up/left if near edge)
2. **Keyboard:** Arrow Up/Down navigates items, Enter selects, Escape closes, Right opens sub-menu, Left closes sub-menu
3. **Focus:** First non-disabled item receives focus on open
4. **Separator:** Rendered as a horizontal line, not focusable
5. **Header:** Bold text label for grouping, not clickable
6. **Sub-menu:** Opens on hover (desktop) or tap (mobile) with arrow indicator
7. **Animation:** Fade-in on open (150ms), instant close
8. **Theme:** Respects the platform's light/dark mode CSS variables
9. **Backdrop:** Optional semi-transparent backdrop on mobile
10. **Close:** Closes on click outside, Escape, or item click (unless item is a sub-menu)

## 7. Accessibility

- `role="menu"` on container
- `role="menuitem"` on items
- `role="separator"` on separators
- `aria-disabled="true"` on disabled items
- `aria-haspopup="menu"` on sub-menu triggers
- `aria-checked` on checkmark items
- Focus management: trapped within menu while open

## 8. Visual Design

- Rounded corners (8px)
- Box shadow: `0 4px 16px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.05)`
- Background: white (light) / `#1e293b` (dark)
- Item height: 32px
- Icon column: 20px wide, left-aligned
- Shortcut column: right-aligned, muted color
- Hover: `#f1f5f9` (light) / `#334155` (dark)
- Danger items: red text, red icon
- Disabled items: 50% opacity, no pointer events

## 9. Size

Estimated: ~350 lines JS + ~120 lines CSS. Medium component.

## 10. Migration Path

Once available, replace the hand-crafted context menu in:
- `typescript/shared/explorer/explorer-sidebar.ts` (showContextMenu method)
- Any other app that uses right-click menus
