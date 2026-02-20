<!-- AGENT: Product Requirements Document for the CommentOverlay component — commenting and annotation overlay with pins anchored to DOM elements, threaded comments, @mentions, resolve/unresolve, drag-to-reposition, and visual connectors. -->

# CommentOverlay Component — Product Requirements

**Status:** Draft
**Component name:** CommentOverlay
**Folder:** `./components/commentoverlay/`
**Spec author:** Agent
**Date:** 2026-02-20

---

## 1. Overview

### 1.1 What Is It

A transparent overlay system for anchoring comment pins to arbitrary DOM elements within a page, enabling inline annotation and threaded discussion directly on top of application content. The overlay consists of three collaborating pieces:

- **CommentOverlay** — A manager that creates and owns the transparent overlay layer, tracks all pins, manages z-index layering, coordinates visual connectors, and orchestrates pin lifecycle. Created explicitly by the consumer via `new CommentOverlay(options)`.
- **CommentPin** — A small, configurable icon marker anchored to a specific DOM element. Clicking a pin opens its associated comment thread popover. Pins can be dragged to reposition. A visual connector line links each pin to its anchor element.
- **CommentThread** — A popover panel attached to a pin, displaying a threaded conversation with nested replies, @mention autocomplete, inline editing, deletion, and resolve/unresolve state management.

The component is callback-driven — it makes no network requests. All CRUD operations (create, read, update, delete comments and threads) are delegated to the consumer via callbacks. The consumer provides comment data; the component renders it.

### 1.2 Why Build It

Enterprise SaaS applications frequently need contextual collaboration features:

- **Document review** — Reviewers annotate specific paragraphs, images, or sections with feedback.
- **Design review** — Stakeholders pin comments to specific UI elements in a prototype or live application.
- **Code review** — Developers annotate rendered output or documentation with inline remarks.
- **Approval workflows** — Approvers flag specific data points, charts, or form fields for clarification.
- **Training and onboarding** — Instructors annotate an application UI with instructional notes for new users.
- **Quality assurance** — Testers place pins on visual bugs with reproduction steps and screenshots context.
- **Content management** — Editors comment on specific sections of articles or pages before publishing.

Without a dedicated component, developers build ad-hoc tooltip systems, use heavyweight third-party collaboration SDKs (Loom, Frame.io, Marker.io) that impose their own UI and data models, or forgo inline commenting entirely. A purpose-built component provides consistent UX, accessible interaction, full data ownership, and zero external dependencies.

### 1.3 Open Source Evaluation

| Library | Verdict | Reason |
|---------|---------|--------|
| Commentbox.io | Not recommended | SaaS dependency; no self-hosted option; no spatial anchor positioning |
| Disqus | Not recommended | SaaS dependency; thread-only, no spatial anchoring; heavy embed |
| Hypothesis | Not recommended | Text-only annotations; no spatial pin positioning; complex setup |
| Annotator.js | Not recommended | Text-range annotations only; no pin markers; unmaintained (2017) |
| react-annotations | Not recommended | React-only; no threading, no @mentions, no resolve workflow |
| Marker.io widget | Not recommended | Commercial SaaS; screenshot-based, not DOM-anchored |
| Userback | Not recommended | Commercial SaaS; feedback-only, no threaded discussions |

**Decision:** Build custom. No library covers more than 30% of the required feature set (DOM-anchored pins + threaded discussions + @mention autocomplete + resolve/reopen + visual connectors + drag-to-reposition + Bootstrap 5 theming). Spatial pin anchoring with DOM selector persistence is a unique requirement not addressed by any evaluated library.

### 1.4 Design Inspiration

| Source | Key Pattern Adopted |
|--------|---------------------|
| Figma Comments | Click-to-place draggable pins on canvas, threaded replies, resolve/reopen, @mentions, visual connector lines |
| Google Docs Comments | Anchored pins with threaded replies, resolve/reopen workflow, @mention autocomplete |
| GitHub PR Review | Inline threaded discussions with resolve, edit, delete per comment |
| Notion Comments | Lightweight popover threads attached to specific blocks |
| Adobe Acrobat Annotations | Pin icons with colour-coded categories, repositionable markers, connector lines |
| VS Code Inline Comments | Threaded comment widget anchored to code lines |
| InVision Commenting | Pin markers on design screens, pin colour coding, comment panel positioning |

---

## 2. Anatomy

### 2.1 Overlay Layer with Pins, Connectors, and Thread

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Application Content                          │
│                                                                     │
│   ┌──────────────┐                                                  │
│   │  Paragraph A  │←- - - - - - ● Pin 1 (resolved, muted)          │
│   └──────────────┘                                                  │
│                                                                     │
│   ┌──────────────┐              ┌──────────────────────────┐        │
│   │   Table Row   │←- - - - - ● │ Thread Popover            │       │
│   └──────────────┘      Pin 2   │ Alice: "Check this value" │       │
│                                 │   └ Bob: "Fixed, see v2"  │       │
│                                 │ [Reply...]  [✓ Resolve]   │       │
│                                 └────────────────────────────┘      │
│                                                                     │
│   ┌──────────────┐                                                  │
│   │   Chart Area  │←- - - - - - ●₃ Pin 3 (badge: 2 replies)        │
│   └──────────────┘                                                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

←- - - -  = Dashed connector line (SVG) linking pin to anchor element
●         = Pin icon marker
●₃        = Pin with reply count badge
```

### 2.2 Single Pin with Connector

```
                    ┌───┐
                    │ ● │  ← Pin icon (configurable icon, colour, badge count)
                    └─┬─┘
                      │    ← Connector line (SVG <line>, dashed)
                      │
    ┌─────────────────┘
    ▼
┌──────────────┐
│ Anchor Elem  │
└──────────────┘
```

### 2.3 Comment Thread Popover

```
┌───────────────────────────────────────┐
│ Thread #42                    [✕] [⋮] │  ← Header: thread ID, close, overflow menu
├───────────────────────────────────────┤
│ ┌─────────────────────────────────┐   │
│ │ [A] Alice Chen · 2h ago  [⋮]   │   │  ← Comment: avatar, author, timestamp, actions
│ │ This value looks incorrect.     │   │
│ │ @Bob can you verify?            │   │  ← @mention rendered as styled chip
│ └─────────────────────────────────┘   │
│   ┌───────────────────────────────┐   │
│   │ [B] Bob Smith · 1h ago  [⋮]  │   │  ← Reply (indented)
│   │ Fixed in v2, see commit abc.  │   │
│   └───────────────────────────────┘   │
│   ┌───────────────────────────────┐   │
│   │ [A] Alice Chen · 30m ago     │   │  ← Reply
│   │ Confirmed, looks good now.   │   │
│   └───────────────────────────────┘   │
├───────────────────────────────────────┤
│ [Type a reply... @mention]   [Send]   │  ← Reply input with @mention trigger
├───────────────────────────────────────┤
│ [✓ Resolve]                           │  ← Resolve/unresolve toggle
└───────────────────────────────────────┘
```

### 2.4 @Mention Autocomplete Dropdown

```
┌─────────────────────────────────────┐
│ Reply input: "Hey @al|"             │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ [A] Alice Chen                  │ │  ← Highlighted match
│ │ [A] Alan Walker                 │ │
│ │ [A] Alexandra Kim               │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### 2.5 Element Breakdown

| Element | Required | Description |
|---------|----------|-------------|
| Overlay container | Auto | Transparent layer covering the target container, owns all pins and connectors |
| SVG connector layer | Configurable | SVG element spanning the overlay for drawing connector lines. Default: shown |
| Pin icon | Yes | Small circular or custom-icon marker rendered at an offset from the anchor element |
| Pin badge | Auto | Small count badge on the pin showing reply count (shown when replies > 0) |
| Connector line | Configurable | SVG `<line>` connecting pin centre to anchor element edge midpoint. Default: shown |
| Thread popover | On click | Popover panel displaying the full comment thread for a pin |
| Thread header | Yes (per popover) | Thread ID, close button, overflow menu |
| Comment card | Yes (per comment) | Individual comment: avatar, author, text, timestamp, actions menu |
| Reply input | Yes (per popover) | Textarea at the bottom of the thread for composing new replies |
| @mention autocomplete | Configurable | Dropdown listing matching users when `@` is typed. Default: enabled |
| Resolve button | Configurable | Toggle button to mark a thread as resolved or unresolve it. Default: shown |
| Comment actions menu | Per comment | Overflow menu (edit, delete) on comments authored by the current user |
| Screen reader live region | Auto | Hidden `aria-live` region for status announcements |

---

## 3. API

### 3.1 Data Interfaces

```typescript
/** Represents a user who can author comments or be @mentioned. */
interface MentionUser
{
    /** Unique user identifier. */
    id: string;

    /** Display name shown in autocomplete and @mention chips. */
    name: string;

    /** Optional avatar image URL. If omitted, initials are derived from name. */
    avatarUrl?: string;

    /** Optional email for tooltip or secondary display in autocomplete. */
    email?: string;
}

/** Represents a single comment within a thread. */
interface Comment
{
    /** Unique comment identifier. */
    id: string;

    /** Author of the comment. */
    author: MentionUser;

    /** Plain text content. @mentions stored as @[userId] internally. */
    text: string;

    /** ISO 8601 timestamp of when the comment was created. */
    createdAt: string;

    /** ISO 8601 timestamp of last edit. Undefined if never edited. */
    editedAt?: string;

    /** Whether this comment has been edited. */
    edited: boolean;

    /** Array of user IDs mentioned in this comment. */
    mentions: string[];
}

/** Represents a threaded conversation associated with a pin. */
interface CommentThread
{
    /** Unique thread identifier. */
    id: string;

    /** The root comment that started the thread. */
    rootComment: Comment;

    /** Flat array of reply comments in chronological order. */
    replies: Comment[];

    /** Whether the thread is resolved. Resolved threads are visually muted. */
    resolved: boolean;

    /** User who resolved the thread. Undefined if not resolved. */
    resolvedBy?: MentionUser;

    /** ISO 8601 timestamp of when the thread was resolved. */
    resolvedAt?: string;

    /** Arbitrary metadata the consumer can attach to the thread. */
    metadata?: Record<string, unknown>;
}

/** Represents a pin marker anchored to a DOM element. */
interface CommentPin
{
    /** Unique pin identifier. Typically matches the thread ID. */
    id: string;

    /** The DOM element this pin is anchored to. */
    anchorElement: HTMLElement;

    /** CSS selector string for re-anchoring after DOM changes. Optional fallback. */
    anchorSelector?: string;

    /** Horizontal offset in pixels from the anchor element's top-right corner. */
    offsetX: number;

    /** Vertical offset in pixels from the anchor element's top-right corner. */
    offsetY: number;

    /** The thread associated with this pin. */
    thread: CommentThread;

    /** Bootstrap Icons class for the pin icon. Default: "bi-chat-dots-fill". */
    icon?: string;

    /** Pin colour as a CSS colour value. Default: theme primary ($blue-600). */
    colour?: string;

    /** Whether the connector line from pin to anchor is visible. Default: true. */
    showConnector?: boolean;

    /** Whether this pin is currently visible. Default: true. */
    visible?: boolean;
}
```

### 3.2 Options Interface

```typescript
/** Configuration options for the CommentOverlay component. */
interface CommentOverlayOptions
{
    /** The container element that the overlay covers. Default: document.body. */
    container?: HTMLElement;

    /** Initial array of pins with their threads to render on creation. */
    pins?: CommentPin[];

    /** Array of users available for @mention autocomplete. */
    mentionUsers?: MentionUser[];

    /** The current user (used to determine edit/delete permissions on comments). */
    currentUser: MentionUser;

    /** Whether to show connector lines from pins to anchor elements. Default: true. */
    showConnectors?: boolean;

    /** Whether pins can be repositioned by dragging. Default: true. */
    draggablePins?: boolean;

    /** Whether to show the resolve/unresolve button on threads. Default: true. */
    allowResolve?: boolean;

    /** How resolved thread pins are displayed. Default: "muted". */
    resolvedDisplay?: "muted" | "hidden" | "normal";

    /** Whether to enable @mention autocomplete. Default: true. */
    enableMentions?: boolean;

    /** Maximum nesting depth for replies. Default: 1 (flat replies under root). */
    maxReplyDepth?: number;

    /** Default pin icon (Bootstrap Icons class). Default: "bi-chat-dots-fill". */
    defaultPinIcon?: string;

    /** Default pin colour (CSS colour value). Default: theme primary ($blue-600). */
    defaultPinColour?: string;

    /** CSS z-index for the overlay layer. Default: 1075. */
    zIndex?: number;

    /** Timestamp format. Default: "relative". */
    timestampFormat?: "relative" | "absolute";

    /** Comment panel width in pixels. Default: 320. */
    panelWidth?: number;

    /** Maximum comment panel height in pixels before scrolling. Default: 400. */
    panelMaxHeight?: number;

    /** Pin marker diameter in pixels. Default: 24. */
    pinSize?: number;

    /** Additional CSS class(es) on the overlay container element. */
    cssClass?: string;

    // ── Callbacks ──────────────────────────────────────────────────

    /** Fired when the user creates a new comment (root or reply). */
    onCommentCreate?: (threadId: string, comment: Comment, parentCommentId?: string) => void;

    /** Fired when the user edits a comment. */
    onCommentEdit?: (threadId: string, commentId: string, newText: string) => void;

    /** Fired when the user deletes a comment. */
    onCommentDelete?: (threadId: string, commentId: string) => void;

    /** Fired when a thread is resolved. */
    onThreadResolve?: (threadId: string, resolvedBy: MentionUser) => void;

    /** Fired when a thread is unresolve (reopened). */
    onThreadUnresolve?: (threadId: string) => void;

    /** Fired when a new pin is placed (user clicks overlay in placement mode). */
    onPinCreate?: (pin: CommentPin) => void;

    /** Fired when a pin is repositioned via drag. */
    onPinMove?: (pinId: string, newOffsetX: number, newOffsetY: number) => void;

    /** Fired when a pin is deleted (thread and all comments removed). */
    onPinDelete?: (pinId: string) => void;

    /** Fired when an @mention is used in a comment. */
    onMention?: (userId: string, threadId: string, commentId: string) => void;

    /** Async callback to fetch mention users dynamically (e.g., from server). Debounced at 200ms. */
    onMentionSearch?: (query: string) => Promise<MentionUser[]>;

    /** Fired when the user clicks a pin (before the thread opens). */
    onPinClick?: (pinId: string) => void;
}
```

### 3.3 CommentOverlay Class

```typescript
class CommentOverlay
{
    /** Create and mount the overlay. */
    constructor(options: CommentOverlayOptions);

    // ── Pin Management ────────────────────────────────────────────

    /** Add a pin with its thread to the overlay. */
    addPin(pin: CommentPin): void;

    /** Remove a pin and its thread from the overlay. */
    removePin(pinId: string): void;

    /** Update a pin's position, icon, colour, or visibility. */
    updatePin(pinId: string, updates: Partial<CommentPin>): void;

    /** Get a pin by its ID. Returns undefined if not found. */
    getPin(pinId: string): CommentPin | undefined;

    /** Get all pins. Returns a shallow copy of the internal array. */
    getAllPins(): CommentPin[];

    // ── Comment Management ────────────────────────────────────────

    /** Add a comment to an existing thread (root or reply). */
    addComment(threadId: string, comment: Comment, parentCommentId?: string): void;

    /** Update a comment's text within a thread. */
    updateComment(threadId: string, commentId: string, newText: string): void;

    /** Remove a comment from a thread. */
    removeComment(threadId: string, commentId: string): void;

    // ── Thread State ──────────────────────────────────────────────

    /** Resolve a thread. */
    resolveThread(threadId: string, resolvedBy: MentionUser): void;

    /** Unresolve (reopen) a thread. */
    unresolveThread(threadId: string): void;

    // ── @Mention ──────────────────────────────────────────────────

    /** Update the list of @mention users. */
    setMentionUsers(users: MentionUser[]): void;

    // ── UI Control ────────────────────────────────────────────────

    /** Open the thread popover for a specific pin. */
    openThread(pinId: string): void;

    /** Close all open thread popovers. */
    closeAllThreads(): void;

    /** Enter pin placement mode — next click on overlay creates a new pin. */
    enterPlacementMode(): void;

    /** Exit pin placement mode without placing a pin. */
    exitPlacementMode(): void;

    /** Recalculate all pin and connector positions (call after layout changes). */
    reposition(): void;

    /** Show or hide the entire overlay. */
    setVisible(visible: boolean): void;

    /** Filter pins by resolved state. */
    setResolvedFilter(show: "all" | "resolved" | "unresolved"): void;

    /** Returns the root overlay DOM element. */
    getElement(): HTMLElement;

    /** Export all comment data as a JSON string for persistence. */
    exportComments(): string;

    /** Destroy the overlay and clean up all DOM elements and event listeners. */
    destroy(): void;
}
```

### 3.4 Global Exports

```typescript
window.CommentOverlay = CommentOverlay;
```

---

## 4. Behaviour

### 4.1 Overlay Lifecycle

```
[Created] --> [Mounted] --> [Pins Rendered] --> [Active / Interactive]
                                                    --> [Destroyed]
```

1. **Created** — `new CommentOverlay(options)` constructs the overlay container, SVG connector layer, and pin elements from the initial `options.pins` data.
2. **Mounted** — The overlay container is appended to `options.container` (or `document.body`). It covers the full scrollable area of the container using `position: absolute` with `inset: 0` and `overflow: visible`.
3. **Pins Rendered** — Each pin in `options.pins` is positioned relative to its anchor element using `getBoundingClientRect()` plus the pin's `offsetX`/`offsetY`. Connector lines are drawn.
4. **Active** — The overlay listens for scroll, resize, and mutation events to keep pins and connectors positioned correctly.
5. **Destroyed** — `destroy()` removes all DOM elements, disconnects observers, detaches event listeners, and clears internal state.

### 4.2 Pin Placement

When `enterPlacementMode()` is called:

1. The cursor changes to `crosshair` over the overlay.
2. A CSS class `.commentoverlay-placement-mode` is added to the container for visual feedback.
3. The user clicks on the overlay. The component determines the nearest anchor-eligible element under the click point using `document.elementsFromPoint()`.
4. A new pin is created at the click position with an offset calculated relative to the determined anchor element.
5. A new empty thread is associated with the pin.
6. The thread popover opens immediately with the reply input focused for the first comment.
7. The `onPinCreate` callback fires with the new `CommentPin`.
8. Placement mode is exited automatically after one pin is placed. Call `enterPlacementMode()` again for additional pins.
9. Pressing Escape or clicking away without submitting a comment removes the temporary pin and cancels placement.

### 4.3 Pin Positioning and Anchoring

Pins are positioned using `position: absolute` within the overlay container. Their positions are calculated as:

```
pinX = anchorElement.getBoundingClientRect().right + offsetX - container.getBoundingClientRect().left + container.scrollLeft
pinY = anchorElement.getBoundingClientRect().top + offsetY - container.getBoundingClientRect().top + container.scrollTop
```

A `ResizeObserver` on the container and a `MutationObserver` on the container's subtree trigger `reposition()` to keep pins aligned when the layout changes. Scroll events on the container also trigger repositioning.

If an anchor element is removed from the DOM, the pin remains at its last known position and a warning is logged: `[CommentOverlay] Anchor element for pin "<pinId>" no longer in DOM`. If `anchorSelector` is provided, the component attempts to re-query the anchor element on each reposition cycle.

### 4.4 Drag-to-Reposition Pins

When `draggablePins` is true:

1. The user presses and holds on a pin (150ms long-press threshold to distinguish from click).
2. The pin enters drag state: `.commentoverlay-pin-dragging` class is applied, `cursor: grabbing`.
3. The pin follows the pointer using `pointermove` events with `setPointerCapture()` for reliable tracking.
4. The connector line updates in real time during the drag, redrawing from the pin's current position to the anchor element.
5. On `pointerup`, the new offset is calculated relative to the anchor element.
6. The `onPinMove` callback fires with the pin ID and new `offsetX`/`offsetY`.
7. The drag is constrained to the overlay container bounds — the pin cannot be dragged outside the container.

### 4.5 Connector Lines

Visual connectors are drawn as SVG `<line>` elements within an SVG layer that spans the overlay. Each connector runs from the centre of the pin icon to the nearest edge midpoint of the anchor element's bounding box.

| Property | Value |
|----------|-------|
| Stroke colour | Pin colour at 40% opacity |
| Stroke width | 1.5px |
| Stroke dasharray | `4 3` (dashed) |
| Endpoint circles | None (clean line endpoints) |
| SVG element | `<line>` within a shared `<svg>` layer |

Connectors are updated on every `reposition()` call. When `showConnectors` is false (globally or per pin via `pin.showConnector`), no SVG elements are created for those pins. Connectors are hidden when their anchor element is not visible in the container viewport.

### 4.6 Thread Popover

Clicking a pin opens the thread popover. The popover is positioned adjacent to the pin using a smart placement algorithm:

1. **Preferred**: to the right of the pin, 8px gap.
2. If insufficient space on the right, try left.
3. If insufficient space on left, try below.
4. If insufficient space below, try above.
5. The popover stays within the container's visible bounds, clamped to edges with an 8px margin.

Only one thread popover is open at a time. Opening a new thread closes the previously open one. Clicking outside the popover or pressing Escape closes it.

The popover has a maximum height of `panelMaxHeight` (default 400px) and scrolls internally when the thread exceeds this height. Width is `panelWidth` (default 320px, responsive: `min(panelWidth, calc(100vw - 2rem))`).

### 4.7 Threading Model

Comments use a flat-with-root model:

- Each thread has exactly one **root comment** (the first comment that started the conversation).
- All subsequent comments are **replies** in chronological order within `thread.replies`.
- `maxReplyDepth` controls visual nesting. Default is 1 (flat replies). When set to 2+, replies to replies are visually indented with 16px left margin per level.
- Deeply nested replies beyond `maxReplyDepth` are displayed at the maximum indent level.

### 4.8 @Mention Autocomplete

When the user types `@` in the reply input or edit textarea:

1. An autocomplete dropdown appears below the cursor position within the input.
2. The dropdown filters the `mentionUsers` list by substring match on `name` (case-insensitive).
3. If `onMentionSearch` is provided, it is called with the query text after a 200ms debounce. Results replace the static list.
4. If both `mentionUsers` and `onMentionSearch` are provided, `onMentionSearch` takes precedence.
5. The user selects a mention via click or keyboard (Arrow Down/Up + Enter).
6. The `@query` text is replaced with a styled mention chip displaying the user's name.
7. Internally, the mention is stored in the comment text as `@[userId]`.
8. When rendering, `@[userId]` tokens are resolved against the `mentionUsers` list and displayed as styled inline chips.
9. The autocomplete dropdown shows a maximum of 8 results. Each result displays the user's avatar (or initials), name, and optionally email.
10. When no users match, the dropdown shows "No users found".
11. When `enableMentions` is false, the `@` character is inserted as plain text with no dropdown.

### 4.9 Inline Editing

A user can edit their own comments (determined by matching `comment.author.id` with `currentUser.id`):

1. The user clicks the overflow menu (three dots `⋮`) on their comment and selects "Edit".
2. The comment text is replaced with an editable textarea pre-filled with the current text.
3. @mention chips in the textarea are converted back to `@[userId]` tokens for editing.
4. The user edits the text and clicks "Save" or presses Ctrl+Enter to submit.
5. The `onCommentEdit` callback fires with the thread ID, comment ID, and new text.
6. Pressing Escape cancels the edit and restores the original text.
7. The `edited` flag on the comment is set to true and `editedAt` is updated.
8. An "(edited)" indicator appears next to the timestamp.

### 4.10 Comment Deletion

A user can delete their own comments:

1. The user clicks the overflow menu and selects "Delete".
2. An inline confirmation prompt appears: "Delete this comment? [Cancel] [Delete]".
3. On confirmation, the `onCommentDelete` callback fires.
4. The comment is removed from the thread DOM.
5. If the root comment is deleted and no replies exist, the entire thread and pin are removed.
6. If the root comment is deleted but replies exist, the root comment text is replaced with "[Deleted]" and the thread persists.

### 4.11 Resolve / Unresolve

When `allowResolve` is true:

1. A "Resolve" button appears at the bottom of the thread popover.
2. Clicking "Resolve" fires `onThreadResolve` with the thread ID and current user.
3. The thread popover shows a "Resolved by [Name] on [Date]" banner at the top.
4. The pin is visually updated based on `resolvedDisplay`:
   - `"muted"` — pin opacity reduced to 0.4, icon greyed to `$gray-400`.
   - `"hidden"` — pin and connector are hidden via `display: none`.
   - `"normal"` — no visual change.
5. The button label changes to "Reopen". Clicking it fires `onThreadUnresolve`.
6. On reopen, the pin returns to its normal visual state and the resolved banner is removed.

### 4.12 Timestamp Formatting

Timestamps are displayed based on the `timestampFormat` option:

**Relative format** (default):

| Elapsed Time | Display |
|-------------|---------|
| < 1 minute | "just now" |
| 1-59 minutes | "Nm ago" |
| 1-23 hours | "Nh ago" |
| 1-6 days | "Nd ago" |
| 7-29 days | Date without year (e.g., "Feb 15") |
| >= current year boundary | Date with year (e.g., "Feb 15, 2025") |

**Absolute format**: Full locale-formatted date-time using `Intl.DateTimeFormat`.

Relative timestamps update every 60 seconds using a single shared `setInterval`. The full ISO 8601 date-time is always available in the `title` attribute for hover tooltip.

### 4.13 Scroll and Resize Behaviour

- Pins maintain their position relative to their anchor elements during scroll and resize.
- `reposition()` is debounced at 16ms (one frame) for scroll events and 100ms for resize events.
- A `ResizeObserver` on the container triggers repositioning on container resize.
- A `MutationObserver` on the container (with `childList: true, subtree: true, attributes: true, attributeFilter: ["style", "class"]`) triggers repositioning on DOM changes.
- When the anchor element scrolls out of the container's visible area, both the pin and connector are hidden via `display: none` to avoid rendering off-screen elements.
- `IntersectionObserver` on anchor elements toggles pin visibility for performance.

### 4.14 Pin Visual States

| State | Background | Opacity | Additional |
|-------|-----------|---------|------------|
| Open (unresolved) | `$blue-600` | 1.0 | Default state |
| Active (popover open) | `$blue-700` | 1.0 | Subtle box shadow ring |
| Resolved (muted) | `$gray-400` | 0.4 | When `resolvedDisplay: "muted"` |
| Resolved (hidden) | N/A | N/A | `display: none` when `resolvedDisplay: "hidden"` |
| Dragging | Pin colour | 0.8 | `cursor: grabbing`, slight scale-up |
| Hover | Pin colour | 1.0 | `transform: scale(1.15)`, 150ms transition |

---

## 5. Styling

### 5.1 CSS Classes

All classes use the `.commentoverlay-` prefix.

| Class | Description |
|-------|-------------|
| `.commentoverlay-container` | Transparent overlay covering the target container |
| `.commentoverlay-placement-mode` | Modifier on container: crosshair cursor during pin placement |
| `.commentoverlay-svg-layer` | SVG element for connector lines, spans the overlay |
| `.commentoverlay-connector` | Individual SVG `<line>` element for a connector |
| `.commentoverlay-pin` | Pin icon marker button |
| `.commentoverlay-pin-resolved` | Modifier: resolved pin (muted or hidden based on config) |
| `.commentoverlay-pin-active` | Modifier: pin whose thread popover is currently open |
| `.commentoverlay-pin-dragging` | Modifier: pin currently being dragged |
| `.commentoverlay-pin-badge` | Reply count badge on the pin |
| `.commentoverlay-thread` | Thread popover container |
| `.commentoverlay-thread-header` | Thread header: title, close button, overflow menu |
| `.commentoverlay-thread-header-title` | Thread identifier text |
| `.commentoverlay-thread-header-actions` | Close and overflow menu buttons container |
| `.commentoverlay-thread-body` | Scrollable comment list area |
| `.commentoverlay-thread-footer` | Reply input and resolve button area |
| `.commentoverlay-thread-resolved-banner` | Banner showing "Resolved by X on Y" |
| `.commentoverlay-comment` | Individual comment card |
| `.commentoverlay-comment-own` | Modifier: comment authored by the current user |
| `.commentoverlay-comment-deleted` | Modifier: deleted comment showing "[Deleted]" text |
| `.commentoverlay-comment-avatar` | Avatar circle (image or initials) |
| `.commentoverlay-comment-author` | Author name text |
| `.commentoverlay-comment-timestamp` | Relative or absolute timestamp |
| `.commentoverlay-comment-edited` | "(edited)" indicator next to timestamp |
| `.commentoverlay-comment-text` | Comment body text |
| `.commentoverlay-comment-actions` | Overflow menu trigger button (three dots) |
| `.commentoverlay-comment-actions-menu` | Dropdown menu: Edit, Delete |
| `.commentoverlay-reply` | Reply comment (indented under root) |
| `.commentoverlay-reply-input` | Textarea for composing a reply |
| `.commentoverlay-reply-send` | Send button for the reply input |
| `.commentoverlay-mention-chip` | Inline @mention styled chip within comment text |
| `.commentoverlay-mention-dropdown` | @mention autocomplete dropdown |
| `.commentoverlay-mention-item` | Individual user row in autocomplete dropdown |
| `.commentoverlay-mention-item-active` | Modifier: keyboard-highlighted autocomplete item |
| `.commentoverlay-mention-avatar` | Avatar in @mention dropdown item |
| `.commentoverlay-mention-name` | User name in @mention dropdown item |
| `.commentoverlay-resolve-btn` | Resolve / Reopen toggle button |
| `.commentoverlay-confirm-delete` | Inline delete confirmation prompt |
| `.commentoverlay-edit-textarea` | Textarea shown during inline comment editing |
| `.commentoverlay-edit-actions` | Save / Cancel buttons during inline editing |

### 5.2 Theme Integration

| Property | Value | Source / Rationale |
|----------|-------|---------------------|
| Overlay background | `transparent` | Non-obstructive layer |
| Overlay pointer events | `none` on container, `auto` on pins and popovers | Clicks pass through to content |
| Pin (default) background | `$blue-600` | Theme primary colour |
| Pin (active) background | `$blue-700` | Darker when popover is open |
| Pin (active) shadow | `0 0 0 3px rgba($blue-600, 0.3)` | Ring highlight |
| Pin (resolved, muted) background | `$gray-400` | Muted state |
| Pin text colour | `$gray-50` | White on coloured background |
| Pin size | `pinSize` option, default 24px | Compact but tappable |
| Pin border radius | `50%` | Circular markers |
| Pin hover transform | `scale(1.15)`, 150ms ease | Subtle hover enlargement |
| Pin badge background | `$red-600` | Attention-drawing count |
| Pin badge text | `$gray-50`, `0.65rem` | Compact white text |
| Pin badge size | 16px diameter | Small notification badge |
| Connector stroke | Pin colour at `0.4` opacity | Subtle link to anchor |
| Connector width | 1.5px | Thin, non-intrusive |
| Connector dasharray | `4 3` | Dashed line |
| Thread popover background | `$gray-50` | Card background |
| Thread popover border | `1px solid $gray-300` | Subtle card border |
| Thread popover shadow | `0 4px 16px rgba($gray-900, 0.15)` | Elevated popover |
| Thread popover width | `panelWidth` (default 320px) | Comfortable reading width |
| Thread popover max-height | `panelMaxHeight` (default 400px) | Scrollable on long threads |
| Thread header background | `$gray-100` | Differentiated header |
| Thread header text | `$gray-900`, `$font-weight-semibold` | Prominent thread identifier |
| Comment author text | `$gray-900`, `$font-weight-semibold`, `$font-size-sm` | Bold author name |
| Comment body text | `$gray-800`, `$font-size-sm` | Primary readable text |
| Comment timestamp | `$gray-500`, `$font-size-xs` (0.75rem) | De-emphasised metadata |
| Comment edited indicator | `$gray-500`, `$font-size-xs`, italic | De-emphasised metadata |
| Comment avatar size | 28px | Compact avatar |
| Comment avatar (initials) background | `$blue-100` | Light blue circle |
| Comment avatar (initials) text | `$blue-700`, `$font-weight-semibold` | Readable initials |
| Reply indent | 16px left margin per nesting level | Visual hierarchy |
| @mention chip background | `$blue-100` | Highlighted mention |
| @mention chip text | `$blue-700` | Readable on light blue |
| @mention chip border-radius | `2px` | Near-zero per ADR-003 |
| Autocomplete dropdown background | `$gray-50` | Match theme cards |
| Autocomplete dropdown border | `1px solid $gray-300` | Consistent border |
| Autocomplete dropdown shadow | `0 2px 8px rgba($gray-900, 0.15)` | Elevated dropdown |
| Autocomplete active item background | `$blue-100` | Highlighted selection |
| Resolve button | `btn btn-sm btn-outline-success` | Bootstrap outline style |
| Reopen button | `btn btn-sm btn-outline-secondary` | Bootstrap outline style |
| Delete confirmation background | `lighten($red-100, 5%)` | Danger zone indicator |
| Resolved banner background | `$green-100` | Success state |
| Resolved banner text | `$green-800` | Readable on green background |
| Resolved banner border | `1px solid $green-200` | Subtle banner border |
| Edit/delete action buttons | `$gray-400` icons, visible on hover | Non-intrusive affordance |
| Reply textarea | `form-control-sm`, `$gray-200` border | Bootstrap-consistent input |
| Reply textarea focus | `$blue-400` border | Standard focus ring |
| Send button | `btn btn-sm btn-primary` | Bootstrap primary action |
| Temporary pin (placement mode) | `$blue-400`, opacity 0.7 | Distinguishable from permanent |
| New comment mode cursor | `crosshair` | Standard placement cursor |
| Font | inherits `$font-family-base` | Theme font |

### 5.3 Z-Index

| Element | Z-Index | Rationale |
|---------|---------|-----------|
| **CommentOverlay container** | **1075** | Above toasts (1070) — annotation pins must be interactive over all UI |
| **CommentOverlay thread popover** | **1076** | Above pins within the overlay |
| **CommentOverlay autocomplete** | **1077** | Above thread popover |
| **CommentOverlay confirm dialog** | **1078** | Above autocomplete |
| Toast container | 1070 | Below overlay |
| Toolbar popups | 1060 | Below toasts |
| Bootstrap Modal | 1050 | Below toolbar popups |
| BannerBar | 1045 | Below modals |
| StatusBar | 1040 | Below BannerBar |
| Sidebar / TabbedPanel | 1035-1037 | Below StatusBar |
| Toolbar (docked/floating) | 1032-1033 | Below Sidebar |

The CommentOverlay sits at z-index 1075 because annotation pins and their thread popovers must remain interactive on top of all other UI elements including toasts. Thread popovers at 1076 and autocomplete at 1077 ensure proper stacking within the overlay system.

### 5.4 Dimensions Summary

| Element | Size | Notes |
|---------|------|-------|
| Pin marker | `pinSize` (default 24px) | Circular, centred on anchor point |
| Pin number font | 11px | Fits within 24px circle |
| Pin badge | 16px diameter | Small count indicator |
| Panel width | `panelWidth` (default 320px) | Fixed width, responsive capped |
| Panel max height | `panelMaxHeight` (default 400px) | Scrolls after this height |
| Panel offset from pin | 8px | Gap between pin and panel edge |
| Comment avatar | 28px | Compact inline avatar |
| Comment padding | 12px | Comfortable reading spacing |
| Comment gap | 8px | Space between comment entries |
| Reply textarea min height | 36px | Single line minimum |
| Reply textarea max height | 120px | Auto-grows to this limit |
| @mention dropdown max height | 200px | Scrollable user list |
| @mention item height | 36px | Comfortable click target |
| @mention max results | 8 | Prevents excessively long dropdown |

### 5.5 Reduced Motion

A `prefers-reduced-motion: reduce` media query:

- Disables the pin hover scale-up transition.
- Disables any connector line draw animation.
- Thread popover open/close uses instant opacity change instead of transform + opacity transition.
- Pin drag follows pointer without animated easing.

---

## 6. Keyboard Interaction

### 6.1 Overlay and Pin Navigation

| Key | Context | Action |
|-----|---------|--------|
| Tab | Overlay focused | Move focus to the next pin in DOM order |
| Shift+Tab | Overlay focused | Move focus to the previous pin |
| Enter / Space | Pin focused | Open the thread popover for the focused pin |
| Escape | Placement mode active | Exit placement mode without placing a pin |
| Escape | Thread popover open | Close the thread popover; focus returns to the pin |

### 6.2 Thread Popover

| Key | Context | Action |
|-----|---------|--------|
| Tab | Within popover | Cycle through interactive elements: comments, reply input, resolve button, close button |
| Shift+Tab | Within popover | Reverse cycle |
| Escape | Within popover | Close the popover; focus returns to the pin |
| Enter | Reply input focused, text present | Send the reply |
| Shift+Enter | Reply input focused | Insert a newline |
| Ctrl+Enter | Edit textarea focused | Save the edit |
| Escape | Edit textarea focused | Cancel the edit, restore original text |

### 6.3 @Mention Autocomplete

| Key | Context | Action |
|-----|---------|--------|
| Arrow Down | Autocomplete visible | Move highlight to the next user |
| Arrow Up | Autocomplete visible | Move highlight to the previous user |
| Enter | Autocomplete visible, item highlighted | Select the highlighted user and insert mention |
| Escape | Autocomplete visible | Close the autocomplete dropdown |

### 6.4 Comment Actions Menu

| Key | Context | Action |
|-----|---------|--------|
| Enter / Space | Actions menu trigger (⋮) focused | Open the actions dropdown |
| Arrow Down / Arrow Up | Actions menu open | Navigate menu items (Edit, Delete) |
| Enter | Menu item focused | Activate the focused action |
| Escape | Actions menu open | Close the menu, focus returns to trigger |

---

## 7. Accessibility

### 7.1 Overlay ARIA

| Attribute | Value |
|-----------|-------|
| `role` | `"region"` |
| `aria-label` | `"Comment annotations"` |

### 7.2 Pin ARIA

| Attribute | Value |
|-----------|-------|
| `role` | `"button"` |
| `tabindex` | `"0"` |
| `aria-label` | `"Comment by [author], [N] replies, [resolved/open]"` |
| `aria-expanded` | `"true"` when thread popover is open, `"false"` otherwise |
| `aria-haspopup` | `"dialog"` |

### 7.3 Thread Popover ARIA

| Attribute | Value |
|-----------|-------|
| `role` | `"dialog"` |
| `aria-label` | `"Comment thread"` |
| `aria-modal` | `"false"` (non-modal — user can interact with underlying content) |

### 7.4 Comment List ARIA

| Element | Attribute | Value |
|---------|-----------|-------|
| Comment list container | `role` | `"list"` |
| Individual comment | `role` | `"listitem"` |
| Individual comment | `aria-label` | `"Comment by [author], [timestamp]"` |

### 7.5 Reply Input ARIA

| Attribute | Value |
|-----------|-------|
| Element | Native `<textarea>` |
| `aria-label` | `"Reply to thread"` |
| `aria-multiline` | `"true"` |

### 7.6 @Mention Autocomplete ARIA

| Element | Attribute | Value |
|---------|-----------|-------|
| Dropdown container | `role` | `"listbox"` |
| Dropdown container | `aria-label` | `"Mention suggestions"` |
| Suggestion item | `role` | `"option"` |
| Suggestion item | `aria-selected` | `"true"` when highlighted |
| Reply input (when dropdown visible) | `aria-autocomplete` | `"list"` |
| Reply input (when dropdown visible) | `aria-controls` | ID of the autocomplete dropdown |
| Reply input (when dropdown visible) | `aria-expanded` | `"true"` |
| Reply input (when dropdown visible) | `aria-activedescendant` | ID of the highlighted item |

### 7.7 Resolve Button ARIA

| Attribute | Value |
|-----------|-------|
| `aria-label` | `"Resolve thread"` or `"Reopen thread"` |
| `aria-pressed` | `"true"` when resolved |

### 7.8 Screen Reader Announcements

All announcements are delivered via a shared `aria-live="polite"` region:

- When a new pin is created: "Comment pin placed".
- When a thread is resolved: "Thread resolved".
- When a thread is reopened: "Thread reopened".
- When a new reply is added: "[Author] replied".
- When a comment is deleted: "Comment deleted".
- When placement mode is enabled: "New comment mode. Click to place a comment pin."
- When placement mode is disabled: "New comment mode disabled."

### 7.9 Focus Management

- After opening a popover: focus moves to the first comment in the thread.
- After closing a popover: focus returns to the pin that opened it.
- After adding a reply: focus moves to the newly added reply element.
- After deleting a comment: focus moves to the previous comment, or to the reply input if no comments remain above.
- After resolving/reopening: focus stays on the resolve/reopen button.
- After placing a new pin: focus moves to the comment input in the new popover.
- After cancelling pin placement: focus returns to the overlay container.

---

## 8. Dependencies

| Dependency | Required | Notes |
|------------|----------|-------|
| Bootstrap 5 CSS | Yes | For `$gray-*`, `$blue-*`, `$green-*`, `$red-*` SCSS variables and `btn`, `form-control-sm` classes |
| Bootstrap Icons | Yes | For `bi-chat-dots-fill`, `bi-x-lg`, `bi-three-dots`, `bi-check-circle`, `bi-pencil`, `bi-trash` |
| Enterprise Theme CSS | Yes | For theme variable overrides |
| No JavaScript framework dependencies | -- | Vanilla TypeScript only |

---

## 9. Implementation Notes

### 9.1 Coding Conventions

| Convention | Value |
|------------|-------|
| LOG_PREFIX | `"[CommentOverlay]"` |
| DOM helpers | `createElement` / `setAttr` |
| Text rendering | `textContent` only (never `innerHTML` for user content) |
| Brace style | Allman (opening brace on its own line) |
| Indentation | 4 spaces |
| Function length | 25-30 lines maximum |
| Nesting depth | 3-4 levels maximum |
| CSS class prefix | `commentoverlay-` |

### 9.2 Internal Data Structures

| Structure | Type | Purpose |
|-----------|------|---------|
| Pin map | `Map<string, CommentPin>` | O(1) lookup of pin data by ID |
| Pin element map | `Map<string, HTMLElement>` | O(1) access to pin DOM elements |
| Connector map | `Map<string, SVGLineElement>` | O(1) access to connector SVG elements |
| Thread map | `Map<string, CommentThread>` | O(1) thread lookup by thread ID |

### 9.3 Performance Considerations

- Pin repositioning uses `requestAnimationFrame` throttling to avoid layout thrashing.
- `IntersectionObserver` on anchor elements hides off-screen pins instead of repositioning them.
- The `MutationObserver` filters mutations via `attributeFilter: ["style", "class"]` to reduce noise.
- @mention autocomplete search is debounced at 200ms for the async `onMentionSearch` callback.
- The shared timestamp update interval (60s) is a single `setInterval` that updates all visible timestamps, not one per comment.
- SVG connector lines use simple `<line>` elements rather than `<path>` to minimise SVG complexity.
- Observer callbacks are debounced (100ms for resize, 100ms for mutation) to batch rapid changes.

### 9.4 Estimated Complexity

Approximately 2800 lines of TypeScript (Tier 3 component), comprising:

| Area | Estimated Lines |
|------|-----------------|
| Pin management and positioning | ~600 |
| Thread popover UI and comment rendering | ~800 |
| @mention autocomplete system | ~400 |
| Drag-to-reposition | ~250 |
| Connector line SVG management | ~200 |
| Keyboard and accessibility | ~250 |
| Timestamp formatting and updates | ~100 |
| Scroll/resize/mutation observers | ~200 |

### 9.5 SCSS Import

```scss
@import '../../src/scss/variables';
```

---

## 10. Edge Cases

| Scenario | Behaviour |
|----------|-----------|
| Empty pins array | Overlay renders with no pins. Placement mode is available. |
| Container resized | `ResizeObserver` triggers `reposition()`. All pins and connectors update. |
| Container DOM mutation | `MutationObserver` triggers `reposition()` (debounced). |
| Anchor selector matches no element | Pin uses last known position. Console warning logged. |
| Anchor element removed from DOM | Pin remains at last position. `anchorSelector` re-queried each cycle. |
| Pin positioned outside container bounds | Pin is clamped to the container's bounding rectangle. |
| Multiple pins at same position | Pins stack with a slight offset (4px down and right per subsequent pin). |
| Very long comment text | Text wraps within the popover. No truncation. Popover scrolls at max height. |
| Thread with no replies | Pin has no badge. Popover shows only root comment and reply input. |
| Delete root comment with replies | Root text replaced with "[Deleted]". Thread persists with replies. |
| Delete root comment without replies | Entire pin and thread removed. |
| Resolve last open thread | If `resolvedDisplay: "hidden"`, all pins disappear. Overlay remains for placement. |
| @mention with no matching users | Dropdown shows "No users found" message. |
| @mention with empty users and no callback | `@` inserted as plain text. No dropdown shown. |
| `onMentionSearch` failure | Dropdown shows "Error loading users". Console warning logged. |
| Popover would overflow viewport | Popover repositions per placement algorithm (right, left, below, above). |
| Destroy while popover is open | Popover closed. All DOM removed. Observers disconnected. |
| Destroy while placement mode active | Mode disabled. Temporary pin removed. DOM cleaned up. |
| Container removed from DOM | Console error logged. Consumer should call `destroy()` first. |
| Multiple overlays on same container | Not supported. Console error logged on construction. |
| Comment text with HTML entities | Rendered via `textContent`. No HTML parsing. XSS safe. |
| Rapid pin clicks | Only one popover open at a time. New click closes previous instantly. |
| Drag pin outside container | Drag constrained to container bounds. Pin clamped to edges. |
| Drag pin over another pin | Pins do not snap or merge. Both remain independent. |
| Window scroll during drag | Pin follows pointer correctly via `setPointerCapture`. |

---

## 11. Logging

All log statements use the pattern:

```typescript
const LOG_PREFIX = "[CommentOverlay]";
```

| Level | When | Example |
|-------|------|---------|
| `console.log` | Component lifecycle | `[CommentOverlay] Initialised with 5 pins on target #dashboard` |
| `console.log` | User actions | `[CommentOverlay] New pin placed at offset (12, -8) anchored to .chart-container` |
| `console.log` | Thread state changes | `[CommentOverlay] Thread "t-42" resolved by Alice Chen` |
| `console.log` | Pin drag complete | `[CommentOverlay] Pin "p-1" moved to offset (20, -4)` |
| `console.warn` | Recoverable issues | `[CommentOverlay] Anchor selector ".chart-old" matched no element, using last known position` |
| `console.warn` | Data issues | `[CommentOverlay] Pin ID "xyz" not found for removePin()` |
| `console.warn` | Feature guards | `[CommentOverlay] enterPlacementMode() called but overlay is hidden` |
| `console.error` | Unrecoverable errors | `[CommentOverlay] Container element not found in DOM` |
| `console.debug` | Verbose diagnostics | `[CommentOverlay] Repositioned 5 pins and connectors after container resize (640x480)` |

---

## 12. Open Questions

1. Should the overlay use `pointer-events: none` on the transparent layer with `pointer-events: auto` only on pins and popovers (allowing click-through to underlying content), or should it intercept all pointer events when active? The click-through approach is better UX but complicates pin placement mode.
2. Should the component support pinning to elements within iframes (e.g., MCP App frames in Conversation), or is same-document-only sufficient for the initial release?
3. Should `maxReplyDepth` support unlimited nesting (tree-style threads), or should 2-3 levels be the practical maximum to avoid deeply indented, narrow comment text?
4. Should the default `resolvedDisplay` be `"muted"` (show dimmed) or `"hidden"` (remove from view)? Current spec defaults to `"muted"` for discoverability.
5. Should the component provide a built-in "Add Comment" floating action button, or should the consumer always call `enterPlacementMode()` programmatically?
6. Should connector lines animate on creation (dash-march draw-in effect), or appear instantly? Current spec says instant with reduced-motion fallback for any future animation.
7. Should the component support exporting/importing comment data as JSON for round-trip serialisation, or is the callback-driven model sufficient for all persistence needs?
8. Should pins support a custom hover tooltip showing a preview of the root comment text (separate from opening the full thread popover)?
