# DocViewer — Product Requirements

## Overview
Full-page three-column documentation layout with hierarchical TOC, Vditor-rendered content, and auto-generated "On This Page" outline.

## Factory
- `createDocViewer(options)` — returns DocViewerHandle

## Options (DocViewerOptions)
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| container | HTMLElement | required | Parent element |
| pages | DocPage[] | required | Array of documentation pages |
| activePage | string | — | Initial page ID |
| showToc | boolean | true | Show left TOC panel |
| showOutline | boolean | true | Show right outline panel |
| tocWidth | number | 260 | Left panel width in px |
| outlineWidth | number | 220 | Right panel width in px |
| onPageChange | (pageId) => void | — | Page navigation callback |
| onReady | () => void | — | Content rendered callback |

## DocPage
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | yes | Unique page identifier |
| title | string | yes | Display title in TOC |
| markdown | string | no | Inline markdown content |
| url | string | no | URL to fetch markdown from |
| children | DocPage[] | no | Nested child pages for TOC tree |
| icon | string | no | Bootstrap Icons class |

## Public API (DocViewerHandle)
| Method | Description |
|--------|-------------|
| navigateTo(pageId) | Navigate to a specific page |
| getActivePage() | Returns current page ID |
| expandTocNode(pageId) | Expand a TOC tree node |
| collapseTocNode(pageId) | Collapse a TOC tree node |
| searchToc(query) | Filter TOC tree by search query |
| getElement() | Returns root HTMLElement |
| destroy() | Clean up |

## Layout
- CSS Grid: `260px 1fr 220px` columns (configurable)
- Left column: hierarchical TOC tree with search input
- Center column: rendered markdown content + prev/next nav
- Right column: "On This Page" outline from H2/H3 headings

## Content Enhancements
- Code blocks: copy-to-clipboard button overlay
- Images: CSS drop-shadow
- Videos: responsive 16:9 wrapper
- Headings: auto-assigned anchor IDs for deep linking

## Outline
- Auto-generated from H2/H3 headings in rendered content
- IntersectionObserver highlights current visible section
- Click scrolls to section

## Responsive
- < 1200px: outline panel hides
- < 768px: TOC panel hides, hamburger toggle appears

## Navigation
- Prev/Next links at top and bottom of content area
- Derived from flat page order (depth-first TOC traversal)

## Dependencies
- Vditor ≥3.11.2 via CDN (window.Vditor)

## Keyboard
| Key | Action |
|-----|--------|
| Arrow keys | Navigate TOC tree |
| Enter | Select TOC item |

## Security
- Vditor.preview() with sanitize:true
- textContent fallback without Vditor
