# AiFeedback: one feedback control for every AI output

**Date**: 2026-11-07
**Component**: AiFeedback (new CDN component)
**Severity**: Medium (needed before the apps ship AI generation outside chat)
**Status**: Shipped as Feedback (`createFeedback`) in #122, live 2026-11-08. Design and the differences from this request: `specs/feedback.prd.md`
**Filed by**: Apps team (knobby.io apps repo)

---

## Summary

The apps are adding AI features that are not chats. Examples are "Generate
diagram" and "Validate diagram" in Diagrams, and generating ideas in Thinker.
Each result needs the same feedback control: helpful, not helpful, a written
comment, and a way to report a problem.

The library has this control only inside Conversation (`showFeedback`,
`onFeedback`, thumbs up and down, a comment dialog). Nothing outside a chat
thread can use it. `MASTER_COMPONENT_INDEX.md` lists no standalone feedback
component.

The apps repo has its own copy, `AiFeedbackToolbar`, in
`typescript/shared/components/AiFeedbackToolbar.ts`. Nothing uses it yet. We
would like the library to own this control instead, so every app looks and
behaves the same. When AiFeedback ships, the apps team deletes its copy.

## What the apps copy does today

| Part | What it does |
|---|---|
| Thumbs up, thumbs down | Toggle buttons. Choosing one clears the other. `aria-pressed` follows the state. |
| Feedback | Opens a collapsed box with a text field and a Send button. Enter sends. |
| Copy | Calls `onCopy`, then shows a check mark for 2 seconds. |
| State | `setLiked`, `setDisliked`, `reset`, `destroy`. Starting state from `liked` and `disliked`. |
| Options | Show or hide each button. Labels for Copy and Feedback. An extra class. |

It also has defects we do not want carried into the library:

- It uses fixed hex colours (`#dee2e6`, `#0d6efd`, `#dc3545`) instead of theme tokens.
- It builds its markup with `innerHTML` and puts the caller's labels in unescaped.
- It reports success whether or not the caller saved the feedback.
- It has no way to report a problem.

## What the apps team needs

### Actions

1. **Helpful** and **Not helpful.** Toggle buttons, as in Conversation. Choosing one clears the other.
2. **Comment.** After a rating, the person may add a written comment. Conversation's comment dialog is the model. A comment without a rating is allowed too.
3. **Report a problem.** A separate action, not a rating. The person picks a category and may add a description. The caller supplies the categories. A sensible default is "Inaccurate", "Not what I asked for", "Harmful or unsafe" and "Other".
4. **Copy** (optional, off by default). Most AI results here are diagrams or lists, not text. When it is on, it works as Conversation's copy button does.

Each action can be turned off.

### The data the caller receives

The component never sends anything over the network. It hands the caller a
value, and the caller sends it to its own API. Please use the same shape as
Conversation's `FeedbackData`, extended so one type covers both components:

```ts
export interface AiFeedbackData
{
    /** What the person did. */
    kind: "rating" | "report";
    /** Set when kind is "rating". */
    sentiment?: "positive" | "negative";
    /** Set when kind is "report": one of the caller's categories. */
    category?: string;
    /** Optional written comment or description. */
    comment?: string;
    /** When the person acted, in UTC. The server keeps its own time too. */
    timestamp: Date;
}

export interface AiFeedbackOptions
{
    container: HTMLElement;
    /** The caller's id for the AI result, passed back with every callback. */
    targetId: string;
    /**
     * Called with each rating, comment or report. The component shows the
     * action as saved only when the promise resolves. When it rejects, the
     * component shows the failure and keeps what the person entered.
     */
    onFeedback: (targetId: string, feedback: AiFeedbackData) => Promise<void>;
    onCopy?: (targetId: string) => void;
    showRating?: boolean;      // default true
    showComment?: boolean;     // default true
    showReport?: boolean;      // default true
    showCopy?: boolean;        // default false
    reportCategories?: string[];
    /** A rating already stored for this result, so the buttons show it. */
    initial?: { sentiment?: "positive" | "negative" };
    size?: "sm" | "md";        // default "sm"
}
```

The handle should offer `setFeedback(initial)`, `setDisabled(boolean)`,
`reset()` and `destroy()`.

### Saving must be honest

`onFeedback` returns a promise because saving can fail. The button must not
stay pressed, and the component must not say "Thanks", until the promise
resolves. When it rejects, the component shows the error in place, keeps the
comment text, and lets the person try again. A control that looks saved when
it is not tells the person their report was heard when it was lost.

This is the rule in your `2026-10-03-fail-fast-over-fallback.md`.

### Look and behaviour

- Colour only from theme tokens, in light and dark themes.
- Icons follow `docs/ICON_PACKS.md`. Each icon is an option that takes a full
  class, as InlineToolbar now does, with sensible defaults.
- `role="toolbar"`, a label on every button, `aria-pressed` on the ratings,
  and full keyboard use. The comment and report dialogs trap focus, close on
  Escape and return focus to the button that opened them.
- No markup from caller strings. Labels and categories are set as text.
- A manifest and conformance file, as your other components have.

### Conversation

Conversation could draw its own feedback with AiFeedback, so the two never
drift apart. That is your call. Nothing in the apps depends on it.

## How the apps will use it

```js
const feedback = createAiFeedback({
    container: resultFooter,
    targetId: generationId,
    onFeedback: (id, f) => api.post(`/api/ai/generations/${id}/feedback`, f),
});
```

The API stores the feedback and records who gave it. The browser does no
more than collect it.

## Not in scope

- Storing or reporting on feedback. That is the apps team's API.
- Feedback on things that are not AI results.
