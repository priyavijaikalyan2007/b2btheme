<!-- AGENT: GestureRecognizer reads the pointer events of one element and reports tap, double tap, long press, drag and two-finger gestures, with the thresholds of TOUCH_EXPERIENCE.md section 7. -->

# GestureRecognizer

The shared gesture recognizer that `TOUCH_EXPERIENCE.md` requires (section 9, item 3, and section 13, item 1). It reads the pointer events of one element and reports gestures. A component uses it instead of its own timers and thresholds, so each gesture means the same thing in every component.

It renders nothing. The component that uses it owns the element and decides what each gesture does.

## Quick Start

```html
<script src="components/gesturerecognizer/gesturerecognizer.js"></script>
```

```js
const surface = document.getElementById("my-canvas");
// The component declares touch-action itself (section 9, item 7).
surface.style.touchAction = "none";

const gestures = createGestureRecognizer(surface, {
    onTap: (g) => select(g.x, g.y),
    onDoubleTap: (g) => edit(g.x, g.y),
    onLongPress: (g) => openContextMenu(g.x, g.y),
    onDragStart: (g) => beginMove(g.startX, g.startY),
    onDragMove: (g) => moveTo(g.x, g.y),
    onDragEnd: () => commitMove(),
    onDragCancel: () => restoreMove(),
    onTwoFingerMove: (g) => setView(g.centerX - g.startCenterX, g.centerY - g.startCenterY, g.scale),
});

// Later:
gestures.destroy();
```

## Gestures

| Gesture | Callback | When |
| :--- | :--- | :--- |
| Press | `onPress` | A pointer goes down, and the recognizer follows it. Every other one-pointer callback for that pointer comes after it. Use it for the pressed state (section 10). |
| Tap, or a click of the main button | `onTap` | The pointer goes down and up within the movement tolerance. A touch must lift before the long-press time. |
| Double tap, or a double click | `onDoubleTap` | A second tap of the same pointer type within 300 ms and 24 px. It comes after that tap's `onTap`. A third tap starts a new pair. |
| Long press | `onLongPress` | A touch pointer stays within the tolerance for 500 ms. No tap follows it. A mouse and a pen never long-press. |
| Drag | `onDragStart`, `onDragMove`, `onDragEnd` | The pointer moves further than the tolerance. `onDragStart` is followed at once by an `onDragMove` to the same position. |
| Long press, then drag | the drag callbacks, with `afterLongPress: true` | A drag that starts after `onLongPress`. On a canvas background it draws a selection rectangle (section 6.2). |
| Cancelled drag | `onDragCancel` | A `pointercancel`, a second finger, or `cancel()`. Restore the state from before the drag (section 9, item 5). |
| Two fingers | `onTwoFingerStart`, `onTwoFingerMove`, `onTwoFingerEnd` | Two touch pointers are down. Each report has the midpoint and the scale, so the pan and the zoom apply together (section 6.2). |
| Cancelled two-finger gesture | `onTwoFingerCancel` | A `pointercancel` on either finger, or `cancel()`. |
| Release | `onRelease` | The press is over, however it ended: a tap, a drag, a long press, a middle click, a cancel or a second finger. It comes last, after `onTap`, `onDoubleTap`, `onDragEnd` or `onDragCancel`. Each `onPress` has one `onRelease`. |

A drag reports the `button` that went down, so a component can pan on a middle-button drag. The secondary button and the pen barrel button are left to the `contextmenu` event (section 9, item 8).

## Rules it applies

- **Movement tolerance:** 10 px for touch, 4 px for a mouse or a pen (section 7).
- **A second finger during a one-finger drag** cancels the drag, then starts the two-finger gesture. Two fingers never change content (rule 1).
- **A touch while a pen or a mouse is down** is ignored, so a palm cannot drive a tool. A second touch still starts a two-finger gesture, and that cancels the pen's drag (section 5).
- **A third finger** is ignored (section 4).
- **The finger left down** after a two-finger gesture does nothing until it lifts. A finger put back down starts the two-finger gesture again.
- **The edge zone:** a touch that starts within 20 px of the left or right edge of the viewport starts nothing. The browser uses that swipe for navigation (section 7).
- **Pointer capture:** the element captures a pointer when its drag starts, and both fingers when a two-finger gesture starts (section 9, item 4).
- **A lost `pointerup`:** if a pointer goes down again before its `pointerup` arrives, its old press is dropped.
- **The state clears before each callback runs.** A callback that throws reaches the host as an uncaught error, and the next gesture still starts clean.

## API

### `createGestureRecognizer(element, options)`

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `element` | `Element` | The surface whose pointer events to read. Required. |
| `options` | `GestureRecognizerOptions` | The callbacks above, each optional, and `accept`. |

`accept(event)` returns `false` for a pointer that the recognizer must leave alone, such as a press inside an embedded control that handles its own drags.

It throws when `element` is missing.

### Reports

`PointerGesture` (press, release, tap, double tap, long press):

| Field | Description |
| :--- | :--- |
| `pointerType` | `"touch"`, `"mouse"` or `"pen"` |
| `x`, `y` | The position now, in client coordinates |
| `startX`, `startY` | Where the pointer went down |
| `button` | The button that went down: 0 for the main button, 1 for the middle one |
| `event` | The `PointerEvent` that produced the report, for its target and modifier keys |

`DragGesture` adds `afterLongPress`.

`TwoFingerGesture` has `centerX`, `centerY`, `startCenterX`, `startCenterY`, `scale` (the distance between the fingers now, divided by the distance at the start) and `event`.

A cancel keeps the last position. The `pointercancel` event's own position is not where the pointer was.

### Handle

| Member | Description |
| :--- | :--- |
| `thresholds` | `GESTURE_THRESHOLDS`, frozen |
| `cancel()` | Cancels the gesture in progress, with `onDragCancel` then `onRelease`, or with `onTwoFingerCancel` |
| `destroy()` | Removes the listeners and the timer. Safe to call more than once. |

### `GESTURE_THRESHOLDS`

The values of `TOUCH_EXPERIENCE.md` section 7. A component reads them from here and defines none of its own.

| Name | Value |
| :--- | :--- |
| `touchTolerance` | 10 px |
| `fineTolerance` | 4 px |
| `longPressMs` | 500 ms |
| `doubleTapMs` | 300 ms |
| `doubleTapDistance` | 24 px |
| `coarseTarget` | 44 px |
| `fineTarget` | 24 px |
| `autoScrollZone` | 48 px |
| `edgeZone` | 20 px |
| `pressedStateMs` | 100 ms |

The recognizer uses the first five and `edgeZone`. The target sizes, the automatic scroll zone and the pressed-state time are for the component.

## What it does not do

- It does not set `touch-action`. The component declares the value from section 9 for each surface.
- It does not read the wheel. The wheel change is #183.
- It does not open a menu. A long press reports `onLongPress`, and the component opens the same menu that its `contextmenu` handler opens (rule 3).
- It does not take `pointerBindings`. Section 9 marks that property as a proposal, and section 14 lists it as open decision 3.

## Keyboard

The recognizer reads pointers only. Each gesture needs a keyboard and a tap alternative in the component that uses it (rule 4, and section 8).

## Logging

It logs through LogUtility when the page loads it, under the `GestureRecognizer` name. Gesture starts and ends are at debug level. Moves are at trace level.

## Testing

Playwright's `page.touchscreen` sends one finger. A two-finger gesture needs the Chrome DevTools Protocol command `Input.dispatchTouchEvent`, which works in Chromium only (section 11).
