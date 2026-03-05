# HelpTooltip — Product Requirements

## Overview
A small `?` icon that attaches to any element, showing a plain-text tooltip on hover and opening the HelpDrawer on click.

## Factory
- `createHelpTooltip(target, options)` — multiple instances allowed, returns HelpTooltipHandle

## Options (HelpTooltipOptions)
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| text | string | — | Plain text shown on hover (400ms delay) |
| topic | HelpTopic | — | Topic to open in HelpDrawer on click |
| position | string | "top-right" | One of: top-right, top-left, bottom-right, bottom-left, inline-end |
| size | number | 14 | Icon diameter in px |

## Public API (HelpTooltipHandle)
| Method | Description |
|--------|-------------|
| setText(text) | Update hover tooltip text |
| setTopic(topic) | Update linked HelpDrawer topic |
| show() | Show the ? icon |
| hide() | Hide the ? icon |
| getElement() | Returns root HTMLElement |
| destroy() | Remove from DOM |

## Behaviour
1. Renders a 14px blue circle with white `?` character, positioned absolute relative to target
2. Target element gets position:relative if currently static
3. Hover (400ms delay) shows plain-text tooltip below/above the icon
4. Click opens HelpDrawer with the linked topic (lazy-creates drawer if needed via createHelpDrawer())
5. Tooltip text uses textContent only (security)
6. 5 position variants control where the icon appears relative to target

## Keyboard
| Key | Action |
|-----|--------|
| Enter/Space | (when focused) Opens HelpDrawer with linked topic |

## Security
- Tooltip text rendered via textContent only
- Never uses innerHTML for user-provided content
