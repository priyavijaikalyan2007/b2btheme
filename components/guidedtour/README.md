# GuidedTour

Product walkthrough component wrapping Driver.js.

## Overview

GuidedTour creates in-app product tours using [Driver.js](https://driverjs.com/) (MIT, ~5KB, zero deps) with enterprise-themed popovers. It supports step progression, conditional visibility, localStorage persistence, and analytics hooks.

## Usage

```html
<!-- Driver.js CDN (required) -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/driver.js@1.4.1/dist/driver.css" />
<script src="https://cdn.jsdelivr.net/npm/driver.js@1.4.1/dist/driver.js.iife.js"></script>

<!-- GuidedTour -->
<link rel="stylesheet" href="components/guidedtour/guidedtour.css" />
<script src="components/guidedtour/guidedtour.js"></script>
```

```javascript
var tour = createGuidedTour({
    tourId: "onboarding",
    steps: [
        {
            target: "#sidebar",
            title: "Navigation",
            description: "Use the sidebar to browse between sections."
        },
        {
            target: "#search-box",
            title: "Search",
            description: "Search across all your projects and documents.",
            side: "bottom"
        },
        {
            target: "#user-menu",
            title: "Your Account",
            description: "Access settings, notifications, and sign out.",
            side: "left"
        }
    ],
    onTourStart: function() { console.log("Tour started"); },
    onStepView: function(i) { console.log("Viewing step", i); },
    onTourComplete: function() { console.log("Tour completed"); },
    onTourDismiss: function(i) { console.log("Tour dismissed at step", i); }
});

// Start the tour
if (tour && !tour.isCompleted()) {
    tour.start();
}
```

## Factory

| Function | Returns | Description |
|----------|---------|-------------|
| `createGuidedTour(options)` | `GuidedTourHandle \| null` | Returns null if Driver.js not loaded |

## Options

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `tourId` | `string` | Required | Unique tour ID |
| `steps` | `TourStep[]` | Required | Tour steps |
| `showProgress` | `boolean` | `true` | "Step X of Y" counter |
| `showSkip` | `boolean` | `true` | Skip Tour button |
| `overlayColor` | `string` | `"rgba(0,0,0,0.5)"` | Backdrop colour |
| `animate` | `boolean` | `true` | Animate transitions |
| `onTourStart` | `() => void` | — | Tour started |
| `onStepView` | `(index) => void` | — | Step viewed |
| `onStepSkip` | `(index) => void` | — | Step skipped |
| `onTourComplete` | `() => void` | — | Tour completed |
| `onTourDismiss` | `(index) => void` | — | Tour dismissed |

## TourStep

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `target` | `string \| HTMLElement` | Yes | Element to highlight |
| `title` | `string` | Yes | Step title |
| `description` | `string` | Yes | Step description |
| `side` | `string` | No | Position: top/bottom/left/right |
| `visible` | `() => boolean` | No | Conditional visibility |
| `onBeforeStep` | `() => void` | No | Pre-step hook |
| `onAfterStep` | `() => void` | No | Post-step hook |

## API

| Method | Description |
|--------|-------------|
| `start()` | Start or restart tour |
| `next()` | Next step |
| `previous()` | Previous step |
| `goToStep(index)` | Jump to step |
| `dismiss()` | Dismiss tour |
| `isActive()` | Tour running? |
| `isCompleted()` | Check localStorage |
| `resetProgress()` | Clear completion |
| `destroy()` | Clean up |

## Keyboard

| Key | Action |
|-----|--------|
| `Arrow Right/Down` | Next step |
| `Arrow Left/Up` | Previous step |
| `Escape` | Dismiss tour |

## Persistence

Tour completion is stored in `localStorage` under the key `guidedtour-{tourId}-complete`. Call `resetProgress()` to clear.

## Dependencies

- **Driver.js ~1.4** — loaded via CDN; factory returns `null` if missing
- **Bootstrap 5** — button classes used for nav buttons

## Asset Paths

```
CSS: components/guidedtour/guidedtour.css
JS:  components/guidedtour/guidedtour.js
```
