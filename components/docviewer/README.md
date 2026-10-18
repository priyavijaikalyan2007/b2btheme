# DocViewer

Full-page three-column documentation layout.

## Overview

DocViewer renders documentation in a three-column CSS Grid layout: a hierarchical TOC tree on the left, MarkdownRenderer-rendered content in the center, and an "On This Page" outline on the right with IntersectionObserver-based scroll tracking.

## Usage

```html
<!-- marked, which MarkdownRenderer parses with (required) -->
<script src="https://cdn.jsdelivr.net/npm/marked@15.0.7/marked.min.js"
        integrity="sha384-H+hy9ULve6xfxRkWIh/YOtvDdpXgV2fmAGQkIDTxIgZwNoaoBal14Di2YTMR6MzR"
        crossorigin="anonymous"></script>

<!-- MarkdownRenderer (required). DocViewer calls
     window.createMarkdownRenderer and throws without it. -->
<script src="components/markdownrenderer/markdownrenderer.js"></script>

<!-- DocViewer -->
<link rel="stylesheet" href="components/docviewer/docviewer.css" />
<script src="components/docviewer/docviewer.js"></script>
```

```javascript
var viewer = createDocViewer({
    container: document.getElementById("docs-container"),
    pages: [
        {
            id: "intro",
            title: "Introduction",
            markdown: "# Introduction\n\nWelcome to the docs.",
            children: [
                { id: "getting-started", title: "Getting Started", url: "/docs/getting-started.md" },
                { id: "installation", title: "Installation", url: "/docs/installation.md" }
            ]
        },
        {
            id: "api",
            title: "API Reference",
            icon: "bi-code-slash",
            url: "/docs/api.md"
        }
    ],
    activePage: "intro",
    onPageChange: function(pageId) { console.log("Page:", pageId); }
});

// Navigate programmatically
viewer.navigateTo("api");
```

## Factory

| Function | Returns | Description |
|----------|---------|-------------|
| `createDocViewer(options)` | `DocViewerHandle` | Creates documentation viewer |

## Options

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `container` | `HTMLElement` | Required | Parent element |
| `pages` | `DocPage[]` | Required | Page tree |
| `activePage` | `string` | First page | Initial page ID |
| `showToc` | `boolean` | `true` | Show TOC panel |
| `showOutline` | `boolean` | `true` | Show outline panel |
| `tocWidth` | `number` | `260` | TOC width in px |
| `outlineWidth` | `number` | `220` | Outline width in px |
| `onPageChange` | `(pageId) => void` | — | Navigation callback |
| `onReady` | `() => void` | — | Render complete callback |

## DocPage

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | `string` | Yes | Unique identifier |
| `title` | `string` | Yes | TOC display title |
| `markdown` | `string` | No | Inline markdown |
| `url` | `string` | No | URL to fetch |
| `children` | `DocPage[]` | No | Child pages |
| `icon` | `string` | No | Bootstrap Icons class |

## API

| Method | Description |
|--------|-------------|
| `navigateTo(pageId)` | Navigate to page |
| `getActivePage()` | Current page ID |
| `expandTocNode(pageId)` | Expand TOC node |
| `collapseTocNode(pageId)` | Collapse TOC node |
| `searchToc(query)` | Filter TOC |
| `getElement()` | Root element |
| `destroy()` | Clean up |

## Layout

Three-column CSS Grid: `260px 1fr 220px` (configurable).

### Content Enhancements

- **Code blocks**: copy-to-clipboard button
- **Images**: CSS drop-shadow
- **Videos**: responsive 16:9 wrapper
- **Headings**: auto-assigned anchor IDs

### Responsive

- **< 1200px**: outline panel hides
- **< 768px**: TOC hides, hamburger toggle appears

## Keyboard

| Key | Action |
|-----|--------|
| `Arrow keys` | Navigate TOC tree |
| `Enter` | Select TOC item |
| `ArrowRight` | Expand TOC node |
| `ArrowLeft` | Collapse TOC node |

## Dependencies

- **MarkdownRenderer** (`window.createMarkdownRenderer`) — **required.**
  DocViewer throws without it rather than rendering the raw markdown as
  plain text, which it used to do: a reader then saw `## Heading` and
  `**bold**` as literal characters, with no way to tell that the
  renderer had failed rather than that the documentation was badly
  written. See its own README for what `marked` and the optional
  highlighters add.
- **Bootstrap Icons** — TOC icons

> **This section named Vditor until 2026-10-18, and DocViewer has never
> used it.** There is not one reference to Vditor in `docviewer.ts`. The
> Usage block above told consumers to load it, the Overview called the
> content "Vditor-rendered", and the real dependency was named nowhere.

## Asset Paths

```
CSS: components/docviewer/docviewer.css
JS:  components/docviewer/docviewer.js
```
