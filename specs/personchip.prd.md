<!-- AGENT: PRD specification for the PersonChip component — compact people indicator chip. -->

# PersonChip — Product Requirements Document

## Overview

PersonChip is a compact inline element that displays a person's identity: avatar (image or deterministic initials), name, and optional email/role detail. Visual style matches the UserMenu trigger (collapsed state) — transparent background, zero border-radius, hover reveals subtle gray background. Never dismissible.

Designed for embedding in share dialogs, assignment fields, permission lists, and future PeoplePicker rows.

## Problem Statement

Person display in share dialogs and permission lists is currently plain text. There is no consistent, reusable element for showing a person with their avatar, name, and metadata in a compact inline format.

## Goals

1. Provide a reusable person-identity chip matching UserMenu trigger visual style.
2. Support image avatars and deterministic initials fallback.
3. Three size variants: sm (20px), md (28px), lg (36px) with inline detail at lg.
4. Status dots (online/offline/busy/away) consistent with UserMenu.
5. Clickable mode with keyboard support (Enter/Space) and href mode.
6. Metadata (`data-*`) attributes for PeoplePicker integration.
7. Auto-generated or custom tooltip showing email and role.

## Non-Goals

- Dismiss/remove button (chips are never dismissible).
- Dropdown or popover on click (consumer handles via onClick callback).
- Group/stack layout (consumer composes chips in flex containers).

## Visual Design

### Rest State
- `display: inline-flex; align-items: center; gap: 8px; padding: 4px 8px`
- `border: 1px solid transparent`
- `background: none`
- `border-radius: 0` (theme zero-radius)
- `font-size: 0.875rem; font-weight: 500; color: $gray-700`

### Hover State
- `background-color: $gray-100`
- `border-color: $gray-300`

### Focus State
- `outline: 2px solid $blue-600; outline-offset: 2px`

## Size Variants

| Size | Avatar | Font | Name | Detail |
|------|--------|------|------|--------|
| sm | 20px | $font-size-sm | Yes | No (tooltip) |
| md | 28px | 0.875rem | Yes | No (tooltip) |
| lg | 36px | 0.875rem | Yes | Email/role inline |

## DOM Structure

```html
<span class="personchip personchip-md">
    <span class="personchip-avatar">
        <img class="personchip-avatar-img" src="..." alt="AC">
        <span class="personchip-status personchip-status-online"></span>
    </span>
    <span class="personchip-name">Alice Chen</span>
    <span class="personchip-detail">alice@acme.com</span>  <!-- lg only -->
</span>
```

## API

### PersonChipOptions

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| name | string | Yes | — | Display name |
| email | string | No | — | Shown in tooltip (+ lg detail) |
| avatarUrl | string | No | — | Image URL |
| role | string | No | — | Shown in tooltip (+ lg detail) |
| status | "online"\|"offline"\|"busy"\|"away" | No | — | Status dot |
| size | "sm"\|"md"\|"lg" | No | "md" | Size variant |
| clickable | boolean | No | false | Enable pointer + click/keyboard |
| href | string | No | — | Render as \<a\> tag |
| tooltip | string | No | auto | Override auto-generated tooltip |
| cssClass | string | No | — | Additional CSS class |
| metadata | Record<string,string> | No | — | data-* attributes |
| onClick | (chip) => void | No | — | Click callback |
| onHover | (chip, event) => void | No | — | Mouseenter callback |
| onHoverOut | (chip, event) => void | No | — | Mouseleave callback |

### Public Methods

| Method | Returns | Description |
|--------|---------|-------------|
| getElement() | HTMLElement | Root DOM element |
| setName(name) | void | Update name + initials + tooltip |
| setEmail(email) | void | Update tooltip and lg detail |
| setAvatarUrl(url) | void | Swap image or fall back to initials |
| setStatus(status) | void | Change or remove status dot |
| setRole(role) | void | Update tooltip and lg detail |
| destroy() | void | Remove listeners, DOM, null refs |

### Factory

`createPersonChip(options)` → `PersonChip`

## Accessibility

- `role="img"` on avatar initials with `aria-hidden="true"` (decorative).
- `title` attribute for tooltip on root element.
- Clickable chips get `tabindex="0"`, `role="button"`.
- Href chips render as `<a>` (natively focusable).
- Enter and Space activate clickable chips.
- Focus-visible outline: `2px solid $blue-600`.

## Keyboard

| Key | Action |
|-----|--------|
| Enter | Activate clickable chip |
| Space | Activate clickable chip |
| Tab | Move focus to/from chip |

## Reused Code (from UserMenu, copied per IIFE constraint)

- `INITIALS_COLORS` — 8-color palette
- `getInitialsFromName(name)` — first+last letter extraction
- `getInitialsColor(name)` — deterministic hash
- Status dot colours: online=$green-600, busy=$red-600, away=$yellow-500, offline=$gray-400
- Avatar circular `border-radius: 50%`

## Integration Points

- **PeoplePicker** (future): will embed PersonChip in dropdown rows via `metadata` data attributes.
- **Share dialogs**: flex container with multiple PersonChip instances.
- **Permission lists**: PersonChip with role detail at lg size.

## ADR

ADR-036: PersonChip replicates UserMenu trigger style as standalone reusable element.
