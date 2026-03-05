# GuidedTour — Product Requirements

## Overview
Product walkthrough component wrapping Driver.js (MIT, 5KB, zero deps) with enterprise-themed popovers.

## Factory
- `createGuidedTour(options)` — returns GuidedTourHandle or null if Driver.js not loaded

## Options (GuidedTourOptions)
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| tourId | string | required | Unique tour identifier (used for localStorage key) |
| steps | TourStep[] | required | Array of tour steps |
| showProgress | boolean | true | Show "Step X of Y" counter |
| showSkip | boolean | true | Show "Skip Tour" button |
| overlayColor | string | "rgba(0,0,0,0.5)" | Backdrop overlay color |
| overlayOpacity | number | 0.5 | Backdrop opacity |
| animate | boolean | true | Animate step transitions |
| onTourStart | () => void | — | Tour started callback |
| onStepView | (stepIndex) => void | — | Step viewed callback |
| onStepSkip | (stepIndex) => void | — | Step skipped callback |
| onTourComplete | () => void | — | Tour completed callback |
| onTourDismiss | (stepIndex) => void | — | Tour dismissed/skipped callback |

## TourStep
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| target | string/HTMLElement | yes | CSS selector or element to highlight |
| title | string | yes | Step title |
| description | string | yes | Step description |
| side | string | no | Popover position: top, bottom, left, right |
| visible | () => boolean | no | Predicate to conditionally show step |
| onBeforeStep | () => void/Promise | no | Called before showing step |
| onAfterStep | () => void/Promise | no | Called after leaving step |

## Public API (GuidedTourHandle)
| Method | Description |
|--------|-------------|
| start() | Start or restart the tour |
| next() | Advance to next step |
| previous() | Go to previous step |
| goToStep(index) | Jump to specific step |
| dismiss() | Dismiss the tour |
| isActive() | Returns true if tour is running |
| isCompleted() | Checks localStorage for completion |
| resetProgress() | Clears localStorage completion flag |
| destroy() | Clean up Driver.js instance |

## Behaviour
1. CDN probe: check window.driver for Driver.js; factory returns null if missing
2. Enterprise-themed popovers: dark title bar, clean typography, no border-radius
3. Step counter: "Step 2 of 5" in popover footer
4. Nav buttons: Previous, Next, Skip Tour, Done (last step)
5. Buttons styled with project btn classes
6. Conditional steps: visible() predicate filters steps before starting
7. Progress persistence: localStorage key `guidedtour-{tourId}-complete`
8. Analytics hooks fire for all lifecycle events

## Keyboard
| Key | Action |
|-----|--------|
| Arrow Right/Down | Next step |
| Arrow Left/Up | Previous step |
| Escape | Dismiss tour |

## Dependencies
- Driver.js ~1.4 via CDN (window.driver)

## Security
- Step title/description rendered via textContent only in custom popover
- Driver.js loaded externally, never modified
- All styling via CSS overrides only
