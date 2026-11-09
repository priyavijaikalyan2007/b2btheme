# Feedback: one rating and report control for any surface

**Date**: 2026-11-07
**Status**: Shipped in #122, live 2026-11-08
**Request**: `specs/2026-11-07-aifeedback-component-requirements.md` (apps team)

## 1. Summary

A new CDN component that collects a rating, an optional comment and problem
reports for anything: an AI result, a document, a page. It never sends
anything itself. It hands the caller a value, and shows the action as saved
only when the caller's promise resolves.

It comes in two forms:

- **Inline** (`createFeedback`): a small toolbar placed inside an existing
  surface, as InlineToolbar is.
- **Modal** (`showFeedbackDialog`): a dialog that asks for a rating and a
  comment, or for a report, and submits them together.

Existing components do not change. Conversation keeps its own feedback.

## 2. Decisions

| # | Decision |
|---|---|
| F1 | Not AI-specific. The name is `Feedback`; nothing in the API says "AI". |
| F2 | Two scales: `"thumbs"` (good or bad) and `"stars"` (1 to `max`, where `max` is 5 or 10; default 5). |
| F3 | `onFeedback` fires at most once per rating, so a person cannot send a dozen ratings for the same thing. `commit` picks how: `"submit"` (default) keeps picks local, where 3 stars after 4 simply replaces the pick, until the person presses Submit; `"once"` sends the first pick at once. Either way the control then locks, showing the saved rating. There is no "send every change" mode and no "cleared" value. |
| F4 | A comment is always optional. With `commit: "submit"` it goes in the same call as the rating; a comment without a rating is allowed. With `commit: "once"` there is nothing to attach it to, so the Comment button is not shown. In the dialog, the rating and comment are submitted together in one call. |
| F5 | A report is separate from rating: a category from the caller's list, and an optional description. It always opens a dialog. |
| F6 | The modal form is built on FormDialog (custom element for the rating, textarea, select). FormDialog already waits on an async submit and stays open with the error shown when it rejects. FormDialog must be loaded; Feedback throws a clear error if it is not. No fallback. |
| F7 | Joins the A2UI and MCP Apps catalog through its manifest (inline form). The catalog change is additive. |
| F8 | Icons take a Bootstrap Icons name or a full class, so Font Awesome and Fluent UI work, using the same rule as GraphCanvas. |
| F9 | Conversation does not change. Adopting Feedback there is a later, separate decision. |
| F10 | A rating given before (`initial`) shows as saved and locked. `reset()` unlocks the control, for an app that lets a person change a rating on purpose. Throttling across page loads is the caller's API's job. |
| F11 | An optional summary shows what everyone said: "1 like" / "12 likes" and "1 dislike" / "3 dislikes" beside the thumbs, or "4.3 (128 ratings)" beside the stars. The caller supplies the numbers (`summary`, `setSummary`); the component never computes or guesses them, so after a save the caller sends the new numbers. |
| F12 | A report is sent once per control: after it saves, the Report button shows "Reported" and is disabled until `reset()`. |
| F13 | Over A2UI the save is an **acknowledgement provider** (user decision, 2026-11-08). The provider path could not carry a void answer, since an undefined write is no answer. `ProviderSpec.ack` types `<request>Result` as `true`, the agent writes true once it has stored the feedback, and the component's promise resolves with no value. A timeout rejects it. The generator requires `ack` exactly when a provider's callback returns `Promise<void>`. |
| F14 | A provider takes one parameter, and `onFeedback(targetId, feedback)` takes two. So `onSave({ targetId, feedback })` is an additive single-object variant, as RelationshipManager's onSearchTargets is. Give exactly one of the two; `onFeedback` is host-only in the catalog. |
| F15 | Arrow keys, Home and End move focus among the stars without picking; Space, Enter or a click picks. With `commit: "once"`, picking on focus would send a rating as the person moved through the stars. |
| F16 | The only surface channel is `copy`. A save already reaches the caller through `onFeedback`/`onSave`, and an agent through the provider, so a `feedback` channel would duplicate it. |
| F17 | `getState()` holds `{ saved, reported }` (the manifest's stateKeys), so a control rebuilt over A2UI stays locked and takes no second rating. |

## 3. API

```ts
export type FeedbackScale = "thumbs" | "stars";

export interface FeedbackData
{
    kind: "rating" | "report";
    /** Thumbs scale. */
    sentiment?: "positive" | "negative";
    /** Stars scale: the score, 1..maxScore, and the scale's maximum. */
    score?: number;
    maxScore?: number;
    /** Report: one of the caller's categories. */
    category?: string;
    /** Optional comment or report description. */
    comment?: string;
    /** When the person acted (UTC). */
    timestamp: Date;
}
```

A flat shape rather than a nested union: it keeps the agent catalog schema
simple and matches Conversation's `FeedbackData` fields where they overlap.

```ts
export interface FeedbackOptions
{
    container: HTMLElement;
    /** The caller's id for what is being rated; passed back on every call. */
    targetId: string;
    onFeedback?: (targetId: string, feedback: FeedbackData) => Promise<void>;
    /** The same save as one object (F14); give exactly one of onFeedback and onSave. */
    onSave?: (entry: { targetId: string; feedback: FeedbackData }) => Promise<void>;
    commit?: "submit" | "once";         // default "submit" (F3)
    scale?: FeedbackScale;              // default "thumbs"
    max?: 5 | 10;                       // stars only; default 5
    showRating?: boolean;               // default true
    showComment?: boolean;              // default true
    showReport?: boolean;               // default true
    showCopy?: boolean;                 // default false
    onCopy?: (targetId: string) => void;
    reportCategories?: string[];        // default below
    /** A rating already stored, so the control shows it, locked (F10). */
    initial?: { sentiment?: "positive" | "negative"; score?: number };
    /** Everyone's ratings, shown when given (F11). */
    summary?: FeedbackSummary;
    labels?: Partial<FeedbackLabels>;   // all text; set with textContent
    icons?: Partial<FeedbackIcons>;     // name or full class
    size?: "sm" | "md";                 // default "sm"
    cssClass?: string;
}

/** Thumbs: the counts. Stars: the average score and how many ratings it is over. */
export type FeedbackSummary =
    | { positive: number; negative: number }
    | { average: number; count: number };

export interface FeedbackHandle
{
    setFeedback(initial: FeedbackOptions["initial"]): void;
    setSummary(summary: FeedbackSummary | null): void;
    setDisabled(disabled: boolean): void;
    /** Clears the pick, comment and "Reported" state and unlocks the control. */
    reset(): void;
    destroy(): void;
}

export function createFeedback(options: FeedbackOptions): FeedbackHandle;

export interface FeedbackDialogOptions
{
    targetId: string;
    onFeedback?: (targetId: string, feedback: FeedbackData) => Promise<void>;
    onSave?: (entry: { targetId: string; feedback: FeedbackData }) => Promise<void>;
    kind?: "rating" | "report";         // default "rating"
    title?: string;
    scale?: FeedbackScale;
    max?: 5 | 10;
    reportCategories?: string[];
    initial?: FeedbackOptions["initial"];
    labels?: Partial<FeedbackLabels>;
    icons?: Partial<FeedbackIcons>;
}

/** Resolves with what was saved, or null when the person cancels. */
export function showFeedbackDialog(options: FeedbackDialogOptions): Promise<FeedbackData | null>;
```

Default report categories: "Inaccurate", "Not what I asked for", "Harmful or
unsafe", "Other". Default icons are Bootstrap Icons, with a filled variant for
the chosen state: `hand-thumbs-up(-fill)`, `hand-thumbs-down(-fill)`,
`star(-fill)`, `chat-left-text`, `flag`, `clipboard`.

## 4. Behaviour

**One call per rating.**
- With `commit: "submit"`, picking a rating shows a Submit button. Picking
  again replaces the pick, and nothing is sent until Submit is pressed.
- With `commit: "once"`, the first pick is sent at once.
- Once a rating saves, the control locks. The rating controls show the saved
  value and are disabled, and Submit is hidden.

**Saving is honest.**
- While a call is pending, the control shows a busy state (`aria-busy`) and
  its buttons are disabled, so a second call cannot start.
- On resolve, the control locks as above and announces "Saved" through a
  polite live region.
- On reject, nothing locks, the person's pick and text are kept, and the error
  shows in place. The person can try again.

**Inline comment** (`commit: "submit"` only). The Comment button opens a
panel under the toolbar. The panel is not modal, so focus is not trapped. It
holds a textarea that is sent with the rating when Submit is pressed. Escape
closes the panel and returns focus to the Comment button. Closing the panel
keeps the text.

**Summary** (F11).
- Shown only when `summary` is given.
- Thumbs show the counts beside each button, singular for 1 ("1 like",
  "12 likes").
- Stars show the average to one decimal and the count ("4.3 (128 ratings)").
- Numbers use the page's locale.
- Each label is set through `labels`.

**Accessibility.**
- The whole control is `role="toolbar"` with a label.
- Thumbs are toggle buttons with `aria-pressed`.
- Stars are a `role="radiogroup"` with roving tabindex. Arrow keys and
  Home/End move focus without picking (F15); Space, Enter or a click picks.
  Each star is labelled "3 of 5 stars".
- The dialogs get FormDialog's focus trap, Escape and focus return.

**Look.** Colour comes only from theme tokens, in light and dark themes.
Monochrome icons use `currentColor`, and colour-pack icons keep their own
palette.

**Safety.** The component never uses `innerHTML` with caller strings. Labels
and categories are set as text, and icon classes go through `classList`.

**Observability.** It logs with the library's log prefix pattern. The handle
emits `copy` on its surface channel (F16).

## 5. Agent catalog (A2UI and MCP Apps)

The manifest declares the inline form at `surface` conformance.

**The save is a required acknowledgement provider** (F13, F14): `onSave: { request: "feedback", ack: true, required: true }`.

1. The component writes `{ targetId, feedback }` under `eventData` and sends the `onFeedback` action.
2. The agent stores it.
3. The agent writes `true` at the path bound to `feedbackResult`.

The honest-saving rule holds over A2UI: the control locks only on that answer. No answer in time rejects the save, and the control keeps the person's input.

**Other catalog props:**
- Copy is the `onCopy` event.
- `onFeedback` (two parameters) and `cssClass` (it would add classes to the host page) are host-only.
- Each icon in `icons` takes the agent-facing allowlist: a single class, or a Font Awesome pair. This is the same as TypeBadge's and ExplorerPicker's `icon`, so Fluent UI and Font Awesome work, but an arbitrary class list does not.

FormDialog is a declared dependency, for Report. Adding the component is additive, so the baseline is updated in the same change and the major stays 1.

## 6. Deliverables

- `components/feedback/`: `feedback.ts`, `.scss`, `.manifest.ts`,
  `.conformance.ts`, unit tests, `README.md`.
- A demo page with both scales, both commit modes, both forms, a summary, a
  failing save, light and dark themes, and Fluent icons.
- Playwright e2e tests:
  - one call per rating in each commit mode;
  - locking, and `reset()`;
  - failure and retry;
  - keyboard use and dialog focus;
  - the summary.
- Records: `MASTER_COMPONENT_INDEX.md`, the CHANGELOG, history, the catalog
  baseline and the regenerated `COMPONENT_REFERENCE.md`.
- An apps note in `~/Work/knobby/apps/specs/bugreports/`.

## 7. Not in scope

- Storing feedback or reporting on it (the caller's API does that).
- Conversation adopting Feedback (F9).
- Half stars, and scales other than 5 and 10.
