# HelpDrawer — Product Requirements

## Overview
Right-side sliding panel for in-context documentation display. Singleton per page, renders markdown content via Vditor display mode, with history navigation, drag-to-resize, and keyboard support.

## Factory
- `createHelpDrawer(options?)` — creates or returns the singleton instance
- `getHelpDrawer()` — returns existing instance or null

## Options (HelpDrawerOptions)
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| width | number | 400 | Initial width in px |
| minWidth | number | 280 | Minimum resize width |
| maxWidth | number | 600 | Maximum resize width |
| onClose | () => void | — | Called when drawer closes |
| onNavigate | (url: string) => void | — | Called when a doc link is followed |

## Public API (HelpDrawerHandle)
| Method | Description |
|--------|-------------|
| open(topic) | Open drawer with HelpTopic (markdown or URL) |
| close() | Close the drawer |
| isOpen() | Returns boolean |
| back() | Navigate to previous topic in history |
| canGoBack() | Returns true if history has previous entries |
| getElement() | Returns root HTMLElement |
| destroy() | Remove from DOM, clean up listeners |

## HelpTopic
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | yes | Unique topic identifier |
| title | string | yes | Displayed in header |
| markdown | string | no | Inline markdown content |
| url | string | no | URL to fetch markdown from |

## Behaviour
1. Fixed position, right edge, z-index 1060, slides in via CSS transform
2. Dark header bar with title, back button (when history > 1), close button
3. Body renders markdown via Vditor.preview() with sanitize:true
4. If URL provided, fetches content then renders; shows loading spinner during fetch
5. History stack: opening new topic pushes to stack; back() pops
6. Drag-to-resize left edge, clamped to minWidth/maxWidth
7. Escape key closes drawer
8. Falls back to plain text if Vditor not loaded

## Dependencies
- Vditor ≥3.11.2 via CDN (window.Vditor)
- Bootstrap Icons for header icons

## Keyboard
| Key | Action |
|-----|--------|
| Escape | Close drawer |

## Security
- Vditor.preview() with sanitize:true
- Plain text fallback (textContent) when Vditor unavailable
- URL fetch uses same-origin or CORS-enabled endpoints only
