<!-- AGENT: Documentation for the Feedback component — rating, comment and problem reports for any surface, saved once. -->

# Feedback

A rating (thumbs or stars), an optional comment and problem reports for anything a page shows: an AI result, a document, a page. It comes in two forms:

- **Inline:** `createFeedback` renders a small toolbar inside an existing surface, as InlineToolbar does.
- **Dialog:** `showFeedbackDialog` asks for a rating and a comment, or for a report, and saves them together.

The component never sends anything itself. It hands your callback a value, and shows the action as saved only when your promise resolves. Design: `specs/feedback.prd.md`.

## Assets

| Asset | Path |
|-------|------|
| CSS | `components/feedback/feedback.css` |
| JS | `components/feedback/feedback.js` |
| Types | `components/feedback/feedback.d.ts` |

## Requirements

- **Bootstrap Icons**, for the default icons. Icon-pack and Font Awesome classes work when their stylesheet is loaded.
- **FormDialog** (`components/formdialog/formdialog.js` and `.css`), for the Report button and for `showFeedbackDialog`. Load it first. `createFeedback` throws when Report is shown and FormDialog is missing; pass `showReport: false` if you don't need it.
- Does **not** require Bootstrap JS.

## Quick Start

```html
<link rel="stylesheet" href="components/formdialog/formdialog.css">
<link rel="stylesheet" href="components/feedback/feedback.css">
<script src="components/formdialog/formdialog.js"></script>
<script src="components/feedback/feedback.js"></script>
```

```javascript
const feedback = createFeedback({
    container: resultFooter,
    targetId: generationId,
    onFeedback: (id, f) => api.post(`/api/ai/generations/${id}/feedback`, f),
});
```

## One call per rating

`onFeedback` is called at most once per rating, so a person cannot send a dozen ratings for the same thing. `commit` picks how:

| `commit` | Behaviour |
|---|---|
| `"submit"` (default) | Picks stay local, and a new pick replaces the last (3 stars after 4 is just 3 stars). The comment goes with the rating, in the same call. Nothing is sent until the person presses Submit. A comment without a rating is allowed. |
| `"once"` | The first pick is sent at once. There is no Comment button, because there is nothing to attach a comment to. |

Either way, once the save resolves the control **locks**. The rating shows the saved value and can't be changed. `initial` shows a rating saved earlier, also locked. `reset()` unlocks the control, for an app that lets a person change a rating on purpose.

## Saving is honest

- While your promise is pending, the control is `aria-busy` and its buttons are disabled, so a second call can't start.
- When it resolves, the control locks and announces "Saved" through a polite live region.
- When it rejects, nothing locks. The pick and the comment are kept, and the error shows in place (`role="alert"`) with your error's message. Submit tries again.

## API

### Global Functions

| Function | Returns | Description |
|---|---|---|
| `createFeedback(options)` | `FeedbackHandle` | Renders the inline toolbar in `options.container` |
| `showFeedbackDialog(options)` | `Promise<FeedbackData \| null>` | Opens a rating or report dialog; resolves with what was saved, or `null` when cancelled |

### FeedbackOptions

| Option | Type | Default | Description |
|---|---|---|---|
| `container` | `HTMLElement` | required | Where the toolbar renders |
| `targetId` | `string` | required | Your id for what is being rated; passed back on every save |
| `onFeedback` | `(targetId, feedback) => Promise<void>` | — | The save. Give this or `onSave`, not both |
| `onSave` | `({ targetId, feedback }) => Promise<void>` | — | The same save as one object. Over A2UI the agent answers it |
| `commit` | `"submit" \| "once"` | `"submit"` | See above |
| `scale` | `"thumbs" \| "stars"` | `"thumbs"` | Helpful or not, or 1 to `max` stars |
| `max` | `5 \| 10` | `5` | Stars only |
| `showRating` | `boolean` | `true` | Show the rating |
| `showComment` | `boolean` | `true` | Show the Comment button (`commit: "submit"` only) |
| `showReport` | `boolean` | `true` | Show the Report button (needs FormDialog) |
| `showCopy` | `boolean` | `false` | Show the Copy button |
| `onCopy` | `(targetId) => void` | — | Called when the person presses Copy |
| `reportCategories` | `string[]` | Inaccurate, Not what I asked for, Harmful or unsafe, Other | The report's categories |
| `initial` | `{ sentiment? } \| { score? }` | — | A rating saved earlier; shows saved and locked |
| `summary` | `{ positive, negative } \| { average, count }` | — | Everyone's ratings, shown beside the control (see below) |
| `labels` | `Partial<FeedbackLabels>` | English | Every text the control shows, set as text |
| `icons` | `Partial<FeedbackIcons>` | Bootstrap Icons | Every icon (see below) |
| `size` | `"sm" \| "md"` | `"sm"` | 28px or 32px buttons |
| `cssClass` | `string` | — | Extra classes on the root |

### FeedbackData

What your callback receives:

```typescript
interface FeedbackData
{
    kind: "rating" | "report";
    sentiment?: "positive" | "negative";   // thumbs
    score?: number;                        // stars, 1..maxScore
    maxScore?: number;                     // stars: 5 or 10
    category?: string;                     // report
    comment?: string;                      // the comment, or the report's description
    timestamp: Date;                       // when the person acted (UTC)
}
```

### FeedbackHandle

| Method | Description |
|---|---|
| `setFeedback(rating \| null)` | Shows a stored rating, saved and locked; `null` clears it and unlocks |
| `setSummary(summary \| null)` | Shows everyone's ratings; `null` hides them |
| `setDisabled(disabled)` | Disables or enables every control |
| `reset()` | Clears the pick, the comment and the Reported state, and unlocks |
| `getElement()` | The root element |
| `on("copy", handler)` | Subscribes to Copy; returns the unsubscribe |
| `getState()` / `setState(state)` | `{ saved, reported }`, so a rebuilt control stays locked |
| `destroy()` | Removes the control. Idempotent |

### FeedbackDialogOptions

`targetId`, `onFeedback` or `onSave`, `scale`, `max`, `reportCategories`, `initial`, `labels` and `icons` work as above, plus:

| Option | Type | Default | Description |
|---|---|---|---|
| `kind` | `"rating" \| "report"` | `"rating"` | A rating with a comment, or a category with a description |
| `title` | `string` | "Rate this" / "Report a problem" | The dialog's title |

The dialog uses FormDialog's focus trap, Escape and focus return. A rejected save keeps the dialog open, with the error shown in it.

## Reports

Report is separate from rating. It opens a dialog with the caller's categories and an optional description, and sends `{ kind: "report", category, comment }`. A report is sent once per control: after it saves, the button reads "Reported" and is disabled until `reset()`.

## Summary

`summary` shows numbers you supply. The component never computes or guesses them, so after a save, send the new numbers with `setSummary`.

- Thumbs: "1 like" / "12 likes" beside thumbs up, and "1 dislike" / "3 dislikes" beside thumbs down.
- Stars: "4.3 (128 ratings)", the average to one decimal.

Numbers use the page's locale. Change the wording through `labels` (`likeOne`, `likeMany`, `dislikeOne`, `dislikeMany`, `averageOne`, `averageMany`; `{n}`, `{average}` and `{count}` are filled in). A summary must match the scale; one in the other scale's shape throws.

## Icons

Each icon in `icons` takes one of:

- a Bootstrap Icons name, such as `"flag"`;
- a Font Awesome class string, such as `"fa-solid fa-flag"`;
- an icon-pack class, such as `"fluent-ui-flag-16-regular"`.

This is the same rule as GraphCanvas and TypeBadge. The keys are `positive`, `positiveActive`, `negative`, `negativeActive`, `star`, `starActive`, `comment`, `report`, `copy` and `copied`. The `…Active` icons show the chosen state. Load the stylesheet that defines a class. Monochrome icons follow the text colour; colour-pack icons keep their palette.

## Accessibility

- The toolbar is `role="toolbar"` with a label, and every button has a name.
- Thumbs are toggle buttons with `aria-pressed`.
- Stars are a `role="radiogroup"` of radios, each named like "3 of 5 stars".
  - Arrow keys, Home and End move focus between the stars without picking, so moving through them with `commit: "once"` sends nothing.
  - Space, Enter or a click picks.
- The comment panel is not modal. Escape closes it and returns focus to the Comment button. Closing keeps the text.
- "Saved" is announced through a polite live region, and errors through `role="alert"`.

## Over A2UI and MCP Apps

Feedback is in the agent catalog, as `Feedback`. A save goes through the `onFeedback` action:

1. The component writes `{ targetId, feedback }` under `eventData`.
2. The agent stores it.
3. The agent answers by writing `true` at the path bound to `feedbackResult`.

The control shows the rating as saved only after that answer. If no answer arrives in time, the control shows the error and keeps the person's input. `onFeedback`, `feedbackResult` and `eventData` are required.

Copy is the `onCopy` event. `cssClass` is host-only. Each icon takes a single class or a Font Awesome pair (`fa-solid fa-flag`), not an arbitrary class list.

## Global

`window.createFeedback`, `window.showFeedbackDialog`.
