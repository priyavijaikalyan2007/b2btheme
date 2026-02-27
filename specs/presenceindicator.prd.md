<!-- AGENT: PRD for the PresenceIndicator component — overlapping avatar stack. -->

# PresenceIndicator — Product Requirements Document

## Overview

The PresenceIndicator component displays a compact overlapping row of avatar circles showing who is actively viewing or editing a shared resource — similar to Google Docs' collaborator avatars. It composes PersonChip in `avatarOnly` mode for collapsed state and full PersonChip for expanded state.

## Problem Statement

When a resource is shared and multiple people are actively viewing or editing it, users need a compact visual indicator of who is present. Without this, users have no awareness of concurrent collaborators, leading to edit conflicts and wasted effort.

## Solution

A stacked avatar row component with two states:

1. **Collapsed** (default): Overlapping circular avatars with negative margins, white ring border, z-index stacking, and optional "+N" overflow badge.
2. **Expanded**: Click to reveal a vertical list of full PersonChip instances with names and status.

## Functional Requirements

### FR-1: Collapsed Stack Display
- Show up to `maxVisible` (default: 4) avatar circles overlapping left-to-right.
- Each avatar has a 2px white ring (`$gray-50`) and circular border-radius.
- First avatar (leftmost) has highest z-index — its status dot is always visible.
- Subsequent avatars overlap by a size-dependent negative margin.
- When `people.length > maxVisible`, show a "+N" overflow badge at the end.

### FR-2: Expanded List Display
- On toggle, show a vertical list of full PersonChip instances with names visible.
- Each PersonChip matches the size variant of the PresenceIndicator.
- CSS opacity transition for smooth crossfade (respects prefers-reduced-motion).

### FR-3: Size Variants
| Size | Avatar Diameter | Overlap | Overflow Badge |
|------|----------------|---------|----------------|
| sm   | 24px           | -8px    | 24px           |
| md   | 32px           | -10px   | 32px           |
| lg   | 40px           | -12px   | 40px           |

### FR-4: PersonChip Integration
- Uses `window.createPersonChip` runtime resolution (same as PeoplePicker).
- Collapsed: `avatarOnly: true` PersonChip instances.
- Expanded: full PersonChip instances with names.
- Fallback: simple circular spans with initials if PersonChip JS not loaded.

### FR-5: Public API
| Method | Returns | Description |
|--------|---------|-------------|
| `show(containerId)` | `void` | Mount into container |
| `getElement()` | `HTMLElement` | Root DOM element |
| `destroy()` | `void` | Cleanup chips, listeners, DOM |
| `setPeople(people)` | `void` | Replace all people |
| `addPerson(person)` | `void` | Add one person |
| `removePerson(id)` | `void` | Remove by ID |
| `getPeople()` | `PersonData[]` | Current list |
| `expand()` | `void` | Switch to expanded view |
| `collapse()` | `void` | Switch to collapsed view |
| `toggle()` | `void` | Toggle expanded/collapsed |
| `isExpanded()` | `boolean` | State query |

### FR-6: Keyboard Interaction
| Key | Action |
|-----|--------|
| Enter / Space | Toggle expand/collapse (when stack focused) |
| Escape | Collapse if expanded |

### FR-7: Callbacks
- `onClick(person)` — fired when a person is clicked in expanded view.
- `onExpand()` — fired when indicator expands.
- `onCollapse()` — fired when indicator collapses.

## Non-Functional Requirements

### NFR-1: Accessibility
- Root element: `role="group"` with `aria-label` describing person count.
- Stack: `tabindex="0"` for keyboard focus.
- Live region announces expand/collapse state changes.
- Focus-visible outline on stack.

### NFR-2: Performance
- Destroy and rebuild PersonChip instances on toggle (no hidden DOM overhead).
- Minimal DOM: only visible avatars + overflow badge in collapsed state.

### NFR-3: No External Dependencies
- Bootstrap CSS variables only (via SCSS import).
- PersonChip JS optional (graceful fallback).

## PersonChip Enhancement: avatarOnly Mode

### New Option
`avatarOnly?: boolean` — When `true`, renders only the avatar circle and status dot. Name and detail elements are built internally but not appended to DOM.

### Visual Changes
- `.personchip-avatar-only` class: zero padding, gap, border, background.
- Tooltip includes name (since name is not visible).

## Out of Scope
- Real-time presence protocol (WebSocket/SSE) — consumer provides data.
- Avatar image upload or cropping.
- Drag-to-reorder people in the list.
