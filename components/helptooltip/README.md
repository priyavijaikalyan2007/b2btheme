# HelpTooltip

A small `?` icon that attaches to any element for in-context help.

## Overview

HelpTooltip renders a 14px blue circle `?` icon positioned relative to a target element. Hovering shows a plain-text tooltip (400ms delay); clicking opens the HelpDrawer with linked documentation.

## Usage

```html
<link rel="stylesheet" href="components/helptooltip/helptooltip.css" />
<script src="components/helptooltip/helptooltip.js"></script>
<!-- HelpDrawer must also be loaded for click behaviour -->
<script src="components/helpdrawer/helpdrawer.js"></script>
```

```javascript
var tooltip = createHelpTooltip(document.getElementById("my-field"), {
    text: "Enter your project name here",
    topic: {
        id: "project-name",
        title: "Project Name",
        markdown: "# Project Name\n\nThe project name must be unique."
    },
    position: "top-right"
});
```

## Factory

| Function | Returns | Description |
|----------|---------|-------------|
| `createHelpTooltip(target, options)` | `HelpTooltipHandle` | Multiple instances allowed |

## Options

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `text` | `string` | — | Hover tooltip text |
| `topic` | `HelpTooltipTopic` | — | HelpDrawer topic |
| `position` | `string` | `"top-right"` | Icon position |
| `size` | `number` | `14` | Icon diameter in px |

### Positions

- `top-right` — upper right corner of target
- `top-left` — upper left corner of target
- `bottom-right` — lower right corner of target
- `bottom-left` — lower left corner of target
- `inline-end` — inline after target content

## API

| Method | Description |
|--------|-------------|
| `setText(text)` | Update hover text |
| `setTopic(topic)` | Update drawer topic |
| `show()` | Show icon |
| `hide()` | Hide icon |
| `getElement()` | Returns icon element |
| `destroy()` | Remove and clean up |

## Keyboard

| Key | Action |
|-----|--------|
| `Enter` / `Space` | Open HelpDrawer |

## Dependencies

- **HelpDrawer** — lazy-loaded via `window.createHelpDrawer`
- **Bootstrap Icons** — optional (icon is a text `?`)

## Asset Paths

```
CSS: components/helptooltip/helptooltip.css
JS:  components/helptooltip/helptooltip.js
```
