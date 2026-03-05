# HelpDrawer

Right-side sliding panel for in-context documentation display.

## Overview

HelpDrawer is a **singleton** component — one per page. It slides in from the right edge, renders markdown documentation via Vditor display mode, and supports topic history with a back button.

## Usage

```html
<!-- Vditor CDN (required for markdown rendering) -->
<link rel="stylesheet" href="https://unpkg.com/vditor@3.11.2/dist/index.css" />
<script src="https://unpkg.com/vditor@3.11.2/dist/index.min.js"></script>

<!-- HelpDrawer -->
<link rel="stylesheet" href="components/helpdrawer/helpdrawer.css" />
<script src="components/helpdrawer/helpdrawer.js"></script>
```

```javascript
// Create (or get existing) singleton
var drawer = createHelpDrawer({ width: 420 });

// Open with inline markdown
drawer.open({
    id: "getting-started",
    title: "Getting Started",
    markdown: "# Welcome\n\nThis is the getting started guide."
});

// Open with URL
drawer.open({
    id: "api-reference",
    title: "API Reference",
    url: "/docs/api-reference.md"
});

// Navigate back
drawer.back();

// Close
drawer.close();
```

## Factory

| Function | Returns | Description |
|----------|---------|-------------|
| `createHelpDrawer(options?)` | `HelpDrawerHandle` | Creates or returns singleton |
| `getHelpDrawer()` | `HelpDrawerHandle \| null` | Returns existing instance |

## Options

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `width` | `number` | `400` | Initial width in px |
| `minWidth` | `number` | `280` | Minimum resize width |
| `maxWidth` | `number` | `600` | Maximum resize width |
| `onClose` | `() => void` | — | Close callback |
| `onNavigate` | `(url: string) => void` | — | URL navigation callback |

## API

| Method | Description |
|--------|-------------|
| `open(topic)` | Open with a HelpTopic |
| `close()` | Close the drawer |
| `isOpen()` | Returns open state |
| `back()` | Go to previous topic |
| `canGoBack()` | True if history has entries |
| `getElement()` | Returns root element |
| `destroy()` | Remove and clean up |

## HelpTopic

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | `string` | Yes | Topic identifier |
| `title` | `string` | Yes | Header title |
| `markdown` | `string` | No | Inline markdown |
| `url` | `string` | No | URL to fetch markdown |

## Keyboard

| Key | Action |
|-----|--------|
| `Escape` | Close drawer |

## Dependencies

- **Vditor ≥3.11.2** — loaded via CDN; falls back to plain text if unavailable
- **Bootstrap Icons** — header icons

## CSS Classes

| Class | Description |
|-------|-------------|
| `.helpdrawer` | Root element |
| `.helpdrawer-open` | Visible state |
| `.helpdrawer-header` | Dark header bar |
| `.helpdrawer-body` | Scrollable content |

## Asset Paths

```
CSS: components/helpdrawer/helpdrawer.css
JS:  components/helpdrawer/helpdrawer.js
```
