<!-- AGENT: Product Requirements Document for the Conversation component — turn-by-turn AI chat UI with streaming, feedback, copy, and session management. -->

# Conversation Component — Product Requirements

**Status:** Draft
**Component name:** Conversation
**Folder:** `./components/conversation/`
**Spec author:** Agent
**Date:** 2026-02-12

---

## 1. Overview

### 1.1 What Is It

A programmable turn-by-turn conversation component for AI agent interactions in enterprise B2B and B2C SaaS applications. Inspired by Google Gemini in Google Docs, the component provides a complete chat interface for AI-powered workflows without coupling to any specific backend or AI provider.

The conversation supports:

- **Turn-by-turn message display** with four roles: user, assistant, system, and error.
- **Rich text rendering** for assistant messages via `Vditor.preview()` — GitHub Flavoured Markdown, tables, code blocks with syntax highlighting, Mermaid diagrams, LaTeX math, and inline images.
- **Streaming responses** with a token-by-token `StreamHandle` API for real-time assistant output.
- **Session management** via callbacks — new, load, save, and clear operations without direct API calls.
- **Configurable message buffer** with oldest-first eviction to bound memory usage.
- **Feedback system** with thumbs up/down and an optional written feedback modal.
- **Copy functionality** in three formats — markdown, HTML, and plaintext — for individual messages and entire conversations.
- **Inline error display** with expandable technical details using native `<details>/<summary>` elements.
- **Auto-scroll** with user scroll detection — automatically scrolls to new content unless the user has scrolled up.
- **Input textarea** with auto-resize, Enter to send, Shift+Enter for newline.
- **Typing indicator** for visual feedback during assistant processing.
- **Size variants** (sm, md, lg) with container query responsive typography.

### 1.2 Why Build It

Enterprise SaaS applications increasingly embed AI agent functionality into workflows: document assistants, data analysis copilots, customer support bots, administrative task agents, and code review helpers. These interactions require a polished, accessible chat UI that integrates with the application's existing design system.

Nine open-source conversation/chat libraries were evaluated:

### 1.3 Open Source Evaluation

| Library | Verdict | Reason |
|---------|---------|--------|
| Deep Chat | Not recommended | Shadow DOM conflicts with Bootstrap theming; no feedback or copy-format support |
| DHTMLX ChatBot | Not recommended | Commercial licence; no streaming, no feedback, no copy |
| NLUX | Not recommended | React/Vue only; no vanilla JS support; no feedback or error display |
| OpenAI ChatKit | Not recommended | Tightly coupled to OpenAI API; no configurable buffer, no feedback modal |
| PatternFly Chatbot | Not recommended | React dependency; PatternFly design system conflicts with Bootstrap |
| Chatscope | Not recommended | React dependency; no streaming, no feedback, no markdown rendering |
| BotUI | Not recommended | Vue dependency; abandoned (last release 2021); no streaming |
| BuildShip Widget | Not recommended | Shadow DOM; no feedback, no copy, no configurable buffer |
| MDB Bootstrap Chat | Not recommended | Commercial licence; chat layout only — no streaming, no feedback, no session management |

**Decision:** No library covers more than 60% of requirements. Critical gaps across all candidates: feedback system, copy in multiple formats, configurable message buffer, inline error display with technical details. Shadow DOM in several libraries conflicts with Bootstrap theming. Build custom to ensure alignment with the project's zero-dependency, IIFE-wrapped, Bootstrap-themed architecture.

### 1.4 Design Inspiration

| Source | Key Pattern Adopted |
|--------|---------------------|
| Google Gemini (Docs) | Inline assistant panel, streaming token display, feedback thumbs |
| ChatGPT | Message bubbles with role distinction, copy button per message, markdown rendering |
| GitHub Copilot Chat | Code block rendering, streaming indicator, error display |
| Slack | Auto-scroll with "scroll to bottom" behaviour, message timestamps |
| ProgressModal (internal) | Auto-scroll with user scroll detection pattern |

---

## 2. Use Cases

| Use Case | Roles Used | Features Needed |
|----------|------------|-----------------|
| Document assistant | user, assistant | Streaming, rich text, feedback, copy |
| Customer support bot | user, assistant, system | Session management, error display |
| Data analysis copilot | user, assistant, error | Code blocks, tables, streaming |
| Admin task agent | user, assistant, system, error | All features, session save/load |
| Code review helper | user, assistant | Syntax highlighting, copy as markdown |
| Onboarding guide | system, assistant | System messages, typing indicator |

---

## 3. Anatomy

### 3.1 Full Component

```
+--[Conversation Title]--------[New][Clear][Copy v]--+
|                                                     |
|  [System] Welcome to the assistant.                 |
|                                                     |
|  [You]  Can you summarize this document?            |
|                                                     |
|  [AI]   Here is a summary of the document:          |
|         - Point one with **bold** text              |
|         - Point two with `code` reference           |
|         | Table | Data |                            |
|         |-------|------|                            |
|         | Row   | Val  |                            |
|                         [thumbs-up][thumbs-down][copy]
|                                                     |
|  [Error] ▶ Request failed                           |
|            Could not reach the AI service.           |
|            Suggestion: Check your network.           |
|            ▶ Technical Details                       |
|                                                     |
|  [AI]   ███ (streaming...)                          |
|                                                     |
|  [●●●] (typing indicator)                          |
|                                                     |
+-----------------------------------------------------+
| [Type a message...                        ] [Send]  |
+-----------------------------------------------------+
```

### 3.2 Element Breakdown

| Element | Required | Description |
|---------|----------|-------------|
| Root container | Yes | `role="region"` with `aria-label` |
| Header | Yes | Title text and action buttons |
| Title | Yes | `<h3>` with conversation name |
| Header actions | Yes | New, clear, copy conversation buttons |
| Message area | Yes | `role="log"` scrollable container for messages |
| Message | Yes (1+) | Individual message with role-based styling |
| Message avatar | Optional | Role icon or initials |
| Message header | Optional | Sender name and timestamp |
| Message content | Yes | Text or rich-rendered content |
| Message actions | Auto | Feedback and copy buttons (assistant messages only) |
| Typing indicator | Auto | Animated dots shown during assistant processing |
| Input area | Yes | Textarea and send button |
| Textarea | Yes | Auto-resizing text input |
| Send button | Yes | Submit trigger |
| Feedback modal | Auto | Hidden overlay for written feedback |

---

## 4. API

### 4.1 Types

```typescript
/** Message sender role. */
type ConversationRole = "user" | "assistant" | "system" | "error";

/** Format for copy operations. */
type CopyFormat = "markdown" | "html" | "plaintext";

/** Feedback sentiment value. */
type FeedbackSentiment = "positive" | "negative";

/** Current state of a streaming message. */
type StreamState = "streaming" | "complete" | "error";

/** Size variant for the conversation component. */
type ConversationSize = "sm" | "md" | "lg";
```

### 4.2 Interfaces

```typescript
/** A single message within the conversation. */
interface ConversationMessage
{
    /** Unique message identifier. Auto-generated if omitted on add. */
    id: string;

    /** Sender role. */
    role: ConversationRole;

    /** Message content (plain text for user/system, markdown for assistant). */
    content: string;

    /** ISO 8601 timestamp. Auto-set to current time if omitted. */
    timestamp: string;

    /** Feedback data if the user has provided feedback. */
    feedback?: FeedbackData;

    /** Arbitrary consumer metadata attached to this message. */
    metadata?: Record<string, unknown>;
}

/** Feedback data attached to an assistant message. */
interface FeedbackData
{
    /** Positive or negative sentiment. */
    sentiment: FeedbackSentiment;

    /** Optional written comment from the user. */
    comment?: string;

    /** ISO 8601 timestamp of when feedback was submitted. */
    timestamp: string;
}

/** A conversation session containing messages and metadata. */
interface ConversationSession
{
    /** Unique session identifier. */
    id: string;

    /** Optional session title. */
    title?: string;

    /** Ordered array of messages in this session. */
    messages: ConversationMessage[];

    /** ISO 8601 creation timestamp. */
    createdAt: string;

    /** ISO 8601 last update timestamp. */
    updatedAt: string;

    /** Arbitrary consumer metadata. */
    metadata?: Record<string, unknown>;
}

/**
 * Handle for streaming assistant messages. Returned by startAssistantMessage().
 * Consumers call appendChunk() as tokens arrive, then complete() or error().
 */
interface StreamHandle
{
    /** The message ID of the streaming message. */
    messageId: string;

    /** Append a text chunk to the streaming message. */
    appendChunk(chunk: string): void;

    /** Mark the stream as complete. Triggers final Vditor render. */
    complete(): void;

    /** Mark the stream as errored. Displays error state on the message. */
    error(message?: string): void;

    /** Get the accumulated content so far. */
    getContent(): string;

    /** Get the current stream state. */
    getState(): StreamState;
}

/** Structured error for inline display. */
interface ConversationError
{
    /** Short error title shown in the summary line. */
    title: string;

    /** Human-readable error description. */
    message: string;

    /** Optional actionable suggestion for the user. */
    suggestion?: string;

    /** Optional technical detail (shown in expandable section). */
    technicalDetail?: string;

    /** Optional application error code. */
    errorCode?: string;

    /** Optional correlation/trace ID for support. */
    correlationId?: string;
}

/** Configuration options for the Conversation component. */
interface ConversationOptions
{
    /** Unique identifier. Auto-generated if omitted. */
    id?: string;

    /** Accessible label for the conversation region. Default: "Conversation". */
    label?: string;

    /** Initial title displayed in the header. Default: "Conversation". */
    title?: string;

    /** Size variant. Default: "md". */
    size?: ConversationSize;

    /** Maximum number of messages to retain. 0 = unlimited. Default: 0. */
    maxMessages?: number;

    /** Display name for user messages. Default: "You". */
    userName?: string;

    /** Display name for assistant messages. Default: "Assistant". */
    assistantName?: string;

    /** Show timestamps on messages. Default: true. */
    showTimestamps?: boolean;

    /** Show avatar icons beside messages. Default: true. */
    showAvatars?: boolean;

    /** Placeholder text for the input textarea. Default: "Type a message...". */
    placeholder?: string;

    /** Enable the feedback system (thumbs up/down). Default: true. */
    enableFeedback?: boolean;

    /** Enable copy buttons on messages. Default: true. */
    enableCopy?: boolean;

    /** Enable the conversation-level copy button in the header. Default: true. */
    enableConversationCopy?: boolean;

    /** Enable the new session button. Default: true. */
    enableNewSession?: boolean;

    /** Enable the clear session button. Default: true. */
    enableClearSession?: boolean;

    /** Initial disabled state. Default: false. */
    disabled?: boolean;

    /** Additional CSS class(es) for the root element. */
    cssClass?: string;

    // -- Callbacks --

    /** Called when the user sends a message. The consumer should process and respond. */
    onSendMessage?: (message: string, conversation: Conversation) => void;

    /** Called when the user clicks "New Session". Consumer creates a new session. */
    onNewSession?: (conversation: Conversation) => void;

    /** Called to load a session. Consumer provides session data. */
    onLoadSession?: (sessionId: string, conversation: Conversation) => void;

    /** Called to save the current session. Consumer persists session data. */
    onSaveSession?: (session: ConversationSession, conversation: Conversation) => void;

    /** Called when the user clicks "Clear". Consumer decides whether to proceed. */
    onClearSession?: (conversation: Conversation) => void;

    /** Called when feedback is submitted on a message. */
    onFeedback?: (messageId: string, feedback: FeedbackData, conversation: Conversation) => void;

    /** Called when a copy operation completes. */
    onCopy?: (content: string, format: CopyFormat, conversation: Conversation) => void;

    /** Called when an error occurs internally. */
    onError?: (error: Error, conversation: Conversation) => void;
}
```

### 4.3 Class: Conversation

| Method | Description |
|--------|-------------|
| `constructor(options)` | Creates the conversation DOM but does not attach to the page. |
| `show(container?)` | Appends to container (ID string or HTMLElement). Defaults to `document.body`. |
| `hide()` | Removes from DOM without destroying state. |
| `destroy()` | Hides, releases all references and event listeners. |
| `addUserMessage(content, metadata?)` | Adds a user message. Returns the `ConversationMessage`. |
| `addAssistantMessage(content, metadata?)` | Adds a fully-formed assistant message (no streaming). Returns the `ConversationMessage`. |
| `addSystemMessage(content, metadata?)` | Adds a system-role message. Returns the `ConversationMessage`. |
| `addError(error)` | Adds an inline error display. Accepts a `ConversationError` object. Returns the `ConversationMessage`. |
| `startAssistantMessage(metadata?)` | Starts a streaming assistant message. Returns a `StreamHandle`. |
| `showTypingIndicator()` | Shows the animated typing indicator. |
| `hideTypingIndicator()` | Hides the typing indicator. |
| `loadSession(session)` | Replaces the current messages with the provided `ConversationSession`. |
| `newSession()` | Clears messages and creates a fresh session. Fires `onNewSession`. |
| `clearSession()` | Removes all messages from the current session. Fires `onClearSession`. |
| `getSession()` | Returns the current `ConversationSession` object. |
| `getMessages()` | Returns a copy of the current message array. |
| `copyMessage(messageId, format)` | Copies a single message to the clipboard in the specified format. |
| `copyConversation(format)` | Copies the entire conversation to the clipboard in the specified format. |
| `setDisabled(disabled)` | Enables or disables the input area and action buttons. |
| `setTitle(title)` | Updates the header title text. |
| `scrollToBottom()` | Programmatically scrolls the message area to the bottom. |
| `focus()` | Sets focus to the input textarea. |
| `getMessageCount()` | Returns the number of messages in the session. |
| `isStreaming()` | Returns `true` if a streaming message is currently active. |
| `isVisible()` | Returns whether the conversation is in the DOM. |
| `getElement()` | Returns the root DOM element. |

### 4.4 Convenience Functions

| Function | Description |
|----------|-------------|
| `createConversation(options, container?)` | Create, show, and return a Conversation instance. |

### 4.5 Global Exports

```
window.Conversation
window.createConversation
```

---

## 5. Behaviour

### 5.1 Lifecycle

1. **Construction** — Builds the DOM tree from `options`. Sets defaults, initialises an empty session, attaches internal event listeners to textarea and buttons. Does not attach to the page.
2. **show(container?)** — Appends to the resolved container element. Focuses the textarea if not disabled.
3. **hide()** — Removes from DOM. State (messages, session) is preserved.
4. **destroy()** — Calls hide, aborts any active stream, removes all event listeners, nulls DOM references. Sets destroyed flag. No further method calls are valid.

### 5.2 Message Rendering

Each message role has a distinct rendering strategy:

**User messages:** Content is rendered via `textContent` only. No HTML parsing, no markdown rendering. This prevents XSS from user-entered text. Whitespace is preserved via CSS `white-space: pre-wrap`.

**Assistant messages:** Content is rendered via `Vditor.preview()` with `sanitize: true`. This provides GitHub Flavoured Markdown rendering including tables, code blocks with syntax highlighting, Mermaid diagrams, LaTeX math, and inline images. If Vditor is not loaded, content falls back to `textContent` with `white-space: pre-wrap`. If DOMPurify is available, it is applied as an additional sanitisation layer after Vditor rendering.

**System messages:** Content is rendered via `textContent` only, styled distinctly from user messages (muted colour, centred, italic). Used for informational messages like "Session started" or "The assistant is ready".

**Error messages:** Rendered using a `<details>/<summary>` pattern for expandable technical details:

```html
<details class="conversation-error-details">
    <summary class="conversation-error-summary">
        <i class="bi bi-exclamation-triangle-fill"></i>
        <span>Request failed</span>
    </summary>
    <div class="conversation-error-body">
        <p class="conversation-error-message">Could not reach the AI service.</p>
        <p class="conversation-error-suggestion">Check your network connection.</p>
        <details class="conversation-error-technical">
            <summary>Technical Details</summary>
            <pre class="conversation-error-pre">HTTP 503 — correlationId: abc-123</pre>
        </details>
    </div>
</details>
```

### 5.3 Streaming Protocol

The streaming protocol enables token-by-token display of assistant responses:

1. **Start** — Consumer calls `startAssistantMessage(metadata?)`. The component creates a new assistant message element, shows a blinking cursor indicator, and returns a `StreamHandle`.
2. **Append** — Consumer calls `handle.appendChunk(text)` as tokens arrive from the AI backend. Each chunk is appended to the accumulated content. During streaming, content is rendered as plain text with `white-space: pre-wrap` for performance (no markdown parsing per-chunk).
3. **Complete** — Consumer calls `handle.complete()`. The component triggers a full `Vditor.preview()` render of the accumulated content, replacing the plain text with rich markdown. Message action buttons (feedback, copy) appear. The stream state transitions to `"complete"`.
4. **Error** — Consumer calls `handle.error(message?)`. The component displays an error indicator on the message. The stream state transitions to `"error"`.

Only one stream may be active at a time. Calling `startAssistantMessage()` while a stream is active logs a warning and returns `null`.

### 5.4 Input Handling

**Enter to send:** Pressing Enter without Shift submits the message. The textarea is cleared and focus is retained.

**Shift+Enter for newline:** Pressing Shift+Enter inserts a newline character without submitting.

**Auto-resize textarea:** The textarea height adjusts automatically as content is typed, from a minimum of one line to a maximum of six lines. Beyond six lines the textarea scrolls internally. Height is recalculated on `input` events by setting `height: auto`, reading `scrollHeight`, and clamping to `maxHeight`.

**Empty message guard:** Whitespace-only messages are not sent. The send button is visually disabled when the textarea is empty or whitespace-only.

**Disabled state:** When disabled, the textarea and send button are both disabled. Keyboard shortcuts do not trigger submission.

### 5.5 Auto-Scroll

Follows the pattern established in the ProgressModal component:

1. On new message or streaming chunk, check if the user has scrolled up from the bottom.
2. **User at bottom** (within 50px of scroll end): auto-scroll to reveal new content.
3. **User scrolled up**: do not auto-scroll. The user is reading earlier content.
4. After the user scrolls back to the bottom, auto-scroll resumes.
5. `scrollToBottom()` can be called programmatically to force-scroll regardless of position.

The threshold (50px) accounts for rounding errors and minor padding differences.

### 5.6 Session Management

All session operations are **callback-driven**. The component never makes API calls, network requests, or `localStorage` writes. The consumer controls all persistence.

**New session** — `newSession()` clears the message area, generates a new session ID, and fires `onNewSession`. The consumer may use the callback to persist the previous session or initialise backend state.

**Load session** — `loadSession(session)` accepts a `ConversationSession` object, clears the current messages, and renders all messages from the session. Assistant messages are rendered via `Vditor.preview()`. Feedback state is restored from the message data.

**Save session** — `getSession()` returns the current session data. The consumer calls this at any point and persists via their chosen mechanism. There is no auto-save.

**Clear session** — `clearSession()` removes all messages from the current session. Fires `onClearSession` so the consumer can confirm or persist.

### 5.7 Feedback System

Each assistant message displays two feedback buttons: thumbs up and thumbs down.

**Quick feedback** — Clicking a thumb button records the sentiment (`"positive"` or `"negative"`) on the message. The clicked button receives a pressed/active visual state. Clicking the same button again removes the feedback (toggle behaviour). Clicking the opposite button switches the sentiment.

**Written feedback** — After clicking thumbs down, a feedback modal slides into view within the conversation component (not a Bootstrap modal — an inline overlay). The modal contains a textarea for optional written comments and a Submit button. Submitting attaches the comment to the `FeedbackData` and fires `onFeedback`.

**State persistence** — Feedback data is stored on the `ConversationMessage.feedback` property and included when `getSession()` is called. Loading a session restores feedback button states.

### 5.8 Copy Functionality

Copy operations support three formats:

| Format | Content |
|--------|---------|
| `"markdown"` | Raw markdown source of assistant messages; plain text for user/system |
| `"html"` | Rendered HTML from the message content element's `innerHTML` (sanitised) |
| `"plaintext"` | Stripped text via `textContent` from the rendered content element |

**Per-message copy** — Each assistant message has a copy button. Clicking it copies in `"markdown"` format by default. The button shows a brief checkmark confirmation (1.5 seconds).

**Conversation-level copy** — The header copy button opens a small dropdown to select format. The entire conversation is formatted with role prefixes and separators.

**Clipboard API** — Uses `navigator.clipboard.writeText()` as the primary method. If the Clipboard API is unavailable (older browsers, non-HTTPS), falls back to the deprecated `document.execCommand("copy")` with a temporary textarea. If both fail, fires `onError` with a descriptive message.

### 5.9 Message Buffer

When `maxMessages` is set to a value greater than 0, the component enforces a message limit with oldest-first eviction:

1. After each message addition, check `messages.length > maxMessages`.
2. If exceeded, remove the oldest messages (from index 0) until the count equals `maxMessages`.
3. Evicted messages are removed from both the data array and the DOM.
4. System messages and error messages are evicted equally — no role-based priority.
5. An active streaming message is never evicted. Eviction skips to the next oldest message.

---

## 6. DOM Structure

### 6.1 Full Component

```html
<div class="conversation conversation-md"
     id="conversation-1"
     role="region"
     aria-label="Conversation">

    <div class="conversation-header">
        <h3 class="conversation-title">Assistant</h3>
        <div class="conversation-header-actions">
            <button class="conversation-btn conversation-btn-new"
                    type="button" aria-label="New session"
                    title="New session">
                <i class="bi bi-plus-lg"></i>
            </button>
            <button class="conversation-btn conversation-btn-clear"
                    type="button" aria-label="Clear conversation"
                    title="Clear conversation">
                <i class="bi bi-trash3"></i>
            </button>
            <div class="conversation-copy-dropdown">
                <button class="conversation-btn conversation-btn-copy-all"
                        type="button" aria-label="Copy conversation"
                        aria-haspopup="true" aria-expanded="false"
                        title="Copy conversation">
                    <i class="bi bi-clipboard"></i>
                    <i class="bi bi-chevron-down"></i>
                </button>
                <div class="conversation-copy-menu" role="menu">
                    <button class="conversation-copy-menu-item" role="menuitem"
                            data-format="markdown">Copy as Markdown</button>
                    <button class="conversation-copy-menu-item" role="menuitem"
                            data-format="html">Copy as HTML</button>
                    <button class="conversation-copy-menu-item" role="menuitem"
                            data-format="plaintext">Copy as Plain Text</button>
                </div>
            </div>
        </div>
    </div>

    <div class="conversation-messages" role="log"
         aria-live="polite" aria-relevant="additions">

        <!-- User message -->
        <div class="conversation-message conversation-message-user"
             role="article" data-message-id="msg-1"
             aria-label="You, 10:30 AM">
            <div class="conversation-message-avatar" aria-hidden="true">
                <i class="bi bi-person-fill"></i>
            </div>
            <div class="conversation-message-body">
                <div class="conversation-message-header">
                    <span class="conversation-message-name">You</span>
                    <time class="conversation-message-time"
                          datetime="2026-02-12T10:30:00Z">10:30 AM</time>
                </div>
                <div class="conversation-message-content">
                    Can you summarize this document?
                </div>
            </div>
        </div>

        <!-- Assistant message -->
        <div class="conversation-message conversation-message-assistant"
             role="article" data-message-id="msg-2"
             aria-label="Assistant, 10:30 AM">
            <div class="conversation-message-avatar" aria-hidden="true">
                <i class="bi bi-robot"></i>
            </div>
            <div class="conversation-message-body">
                <div class="conversation-message-header">
                    <span class="conversation-message-name">Assistant</span>
                    <time class="conversation-message-time"
                          datetime="2026-02-12T10:30:05Z">10:30 AM</time>
                </div>
                <div class="conversation-message-content">
                    <!-- Vditor-rendered markdown content -->
                </div>
                <div class="conversation-message-actions">
                    <button class="conversation-btn conversation-btn-feedback
                                   conversation-btn-thumbs-up"
                            type="button" aria-label="Good response"
                            aria-pressed="false">
                        <i class="bi bi-hand-thumbs-up"></i>
                    </button>
                    <button class="conversation-btn conversation-btn-feedback
                                   conversation-btn-thumbs-down"
                            type="button" aria-label="Bad response"
                            aria-pressed="false">
                        <i class="bi bi-hand-thumbs-down"></i>
                    </button>
                    <button class="conversation-btn conversation-btn-copy"
                            type="button" aria-label="Copy message"
                            title="Copy message">
                        <i class="bi bi-clipboard"></i>
                    </button>
                </div>
            </div>
        </div>

        <!-- System message -->
        <div class="conversation-message conversation-message-system"
             role="article" data-message-id="msg-3"
             aria-label="System">
            <div class="conversation-message-content">
                Session started.
            </div>
        </div>

        <!-- Error message -->
        <div class="conversation-message conversation-message-error"
             role="article" data-message-id="msg-4"
             aria-label="Error">
            <div class="conversation-message-avatar" aria-hidden="true">
                <i class="bi bi-exclamation-triangle-fill"></i>
            </div>
            <div class="conversation-message-body">
                <details class="conversation-error-details">
                    <summary class="conversation-error-summary">
                        Request failed
                    </summary>
                    <div class="conversation-error-body">
                        <p class="conversation-error-message">
                            Could not reach the AI service.
                        </p>
                        <p class="conversation-error-suggestion">
                            Check your network connection and try again.
                        </p>
                        <details class="conversation-error-technical">
                            <summary>Technical Details</summary>
                            <pre class="conversation-error-pre">HTTP 503 Service Unavailable
correlationId: abc-123-def-456
errorCode: AI_SERVICE_UNREACHABLE</pre>
                        </details>
                    </div>
                </details>
            </div>
        </div>

        <!-- Typing indicator -->
        <div class="conversation-typing-indicator" role="status"
             aria-label="Assistant is typing" style="display: none;">
            <div class="conversation-message-avatar" aria-hidden="true">
                <i class="bi bi-robot"></i>
            </div>
            <div class="conversation-typing-dots">
                <span></span><span></span><span></span>
            </div>
        </div>
    </div>

    <div class="conversation-input-area">
        <textarea class="conversation-textarea"
                  rows="1"
                  placeholder="Type a message..."
                  aria-label="Message input"></textarea>
        <button class="conversation-send-btn"
                type="button"
                aria-label="Send message"
                disabled>
            <i class="bi bi-send-fill"></i>
        </button>
    </div>

    <!-- Inline feedback modal (hidden) -->
    <div class="conversation-feedback-modal" style="display: none;"
         role="dialog" aria-label="Provide feedback"
         aria-modal="true">
        <div class="conversation-feedback-modal-content">
            <h4 class="conversation-feedback-modal-title">
                Provide additional feedback
            </h4>
            <textarea class="conversation-feedback-textarea"
                      rows="4"
                      placeholder="What could be improved?"
                      aria-label="Feedback comment"></textarea>
            <div class="conversation-feedback-modal-actions">
                <button class="conversation-btn conversation-feedback-cancel"
                        type="button">Cancel</button>
                <button class="conversation-btn conversation-feedback-submit"
                        type="button">Submit</button>
            </div>
        </div>
    </div>
</div>
```

---

## 7. CSS Classes

| Class | Description |
|-------|-------------|
| `.conversation` | Root container — `position: relative`, `display: flex`, `flex-direction: column`, `container-type: inline-size` |
| `.conversation-sm` | Small size variant — compact padding, smaller font |
| `.conversation-md` | Medium size variant (default) |
| `.conversation-lg` | Large size variant — generous padding, larger font |
| `.conversation-disabled` | Disabled state — reduced opacity on input area |
| `.conversation-header` | Header bar — `display: flex`, `justify-content: space-between`, `align-items: center` |
| `.conversation-title` | Title `<h3>` — `$font-size-base`, `$font-weight-semibold`, `margin: 0` |
| `.conversation-header-actions` | Flex container for header action buttons |
| `.conversation-btn` | Base button style — transparent background, icon-sized |
| `.conversation-btn-new` | New session button |
| `.conversation-btn-clear` | Clear session button |
| `.conversation-btn-copy-all` | Copy conversation button with dropdown chevron |
| `.conversation-copy-dropdown` | Dropdown container for copy format selection |
| `.conversation-copy-menu` | Dropdown menu for copy formats |
| `.conversation-copy-menu-item` | Individual copy format menu item |
| `.conversation-messages` | Scrollable message area — `overflow-y: auto`, `flex: 1` |
| `.conversation-message` | Individual message container — `display: flex`, `gap` |
| `.conversation-message-user` | User message modifier — right-aligned content bubble |
| `.conversation-message-assistant` | Assistant message modifier — left-aligned, full width |
| `.conversation-message-system` | System message modifier — centred, muted, italic |
| `.conversation-message-error` | Error message modifier — danger colour border accent |
| `.conversation-message-streaming` | Active streaming message — blinking cursor indicator |
| `.conversation-message-avatar` | Avatar icon container — fixed width circle |
| `.conversation-message-body` | Message body flex container |
| `.conversation-message-header` | Name and timestamp row |
| `.conversation-message-name` | Sender display name |
| `.conversation-message-time` | Timestamp `<time>` element |
| `.conversation-message-content` | Content area — `white-space: pre-wrap` for user/system |
| `.conversation-message-actions` | Feedback and copy button row (assistant only) |
| `.conversation-btn-feedback` | Base feedback button style |
| `.conversation-btn-thumbs-up` | Thumbs up feedback button |
| `.conversation-btn-thumbs-down` | Thumbs down feedback button |
| `.conversation-btn-feedback-active` | Active/pressed feedback state — filled icon |
| `.conversation-btn-copy` | Per-message copy button |
| `.conversation-btn-copy-success` | Temporary checkmark state after successful copy |
| `.conversation-error-details` | Outer `<details>` for error display |
| `.conversation-error-summary` | Error title summary line |
| `.conversation-error-body` | Expanded error content container |
| `.conversation-error-message` | Error description paragraph |
| `.conversation-error-suggestion` | Actionable suggestion paragraph |
| `.conversation-error-technical` | Inner `<details>` for technical detail |
| `.conversation-error-pre` | Preformatted technical detail text |
| `.conversation-typing-indicator` | Typing indicator container — flex row |
| `.conversation-typing-dots` | Animated dots container |
| `.conversation-input-area` | Input row — `display: flex`, `align-items: flex-end` |
| `.conversation-textarea` | Auto-resizing textarea input |
| `.conversation-send-btn` | Send button — primary colour accent |
| `.conversation-feedback-modal` | Inline feedback overlay — absolute positioned within root |
| `.conversation-feedback-modal-content` | Modal content card |
| `.conversation-feedback-modal-title` | Modal heading |
| `.conversation-feedback-textarea` | Feedback comment textarea |
| `.conversation-feedback-modal-actions` | Cancel/Submit button row |
| `.conversation-feedback-cancel` | Cancel button |
| `.conversation-feedback-submit` | Submit button — primary colour |

---

## 8. Styling

### 8.1 Theme Integration

| Property | Value | Source |
|----------|-------|--------|
| Root background | `$white` | Clean conversation surface |
| Root border | `1px solid $gray-300` | Consistent with cards and panels |
| Header background | `$gray-50` | Subtle differentiation from message area |
| Header border | `1px solid $gray-200` bottom | Separator |
| User message bubble | `$blue-50` background | Distinct from assistant |
| User message text | `$gray-900` | High contrast |
| Assistant message background | `transparent` | Full-width, no bubble |
| Assistant message text | `$gray-900` | High contrast |
| System message text | `$gray-500`, `font-style: italic` | Subdued informational |
| Error message border-left | `3px solid $red-600` | Danger accent |
| Error summary icon | `$red-600` | Matches LITERATE_ERRORS.md pattern |
| Error suggestion text | `$gray-600` | Secondary emphasis |
| Error technical pre | `$gray-100` background, `$font-family-monospace` | Code-like detail |
| Avatar background | `$gray-200` | Neutral circle |
| Avatar icon colour | `$gray-600` | Subdued |
| Timestamp text | `$gray-400`, `$font-size-sm` | De-emphasised |
| Feedback button default | `$gray-400` icon | Inactive state |
| Feedback button hover | `$gray-600` icon | Hover highlight |
| Feedback button active (positive) | `$green-600` icon, filled | Positive feedback |
| Feedback button active (negative) | `$red-600` icon, filled | Negative feedback |
| Copy button default | `$gray-400` icon | Inactive state |
| Copy button success | `$green-600` checkmark icon | Confirmation |
| Typing indicator dots | `$gray-400` | Subtle animation |
| Input area background | `$white` | Clean input surface |
| Input area border | `1px solid $gray-300` top | Separator |
| Textarea border | `1px solid $gray-300` | Standard input border |
| Textarea focus | `$blue-600` border, `box-shadow` | Bootstrap focus ring |
| Send button enabled | `$blue-600` background, `$white` icon | Primary action |
| Send button disabled | `$gray-300` background, `$gray-500` icon | Inactive |
| Feedback modal backdrop | `rgba($black, 0.3)` | Semi-transparent overlay |
| Feedback modal card | `$white` background, `$gray-300` border | Standard card |

### 8.2 Size Variants

| Property | sm | md | lg |
|----------|----|----|-----|
| Root padding | 8px | 12px | 16px |
| Message gap | 8px | 12px | 16px |
| Avatar size | 24px | 32px | 40px |
| Avatar icon size | 14px | 16px | 20px |
| Message content font | `$font-size-sm` | `$font-size-base` | `$font-size-base` |
| Header title font | `$font-size-sm` | `$font-size-base` | `$font-size-lg` |
| Textarea font | `$font-size-sm` | `$font-size-base` | `$font-size-base` |
| Action button size | 24px | 28px | 32px |

### 8.3 Container Queries

The `.conversation` root sets `container-type: inline-size`, enabling responsive adjustments:

| Container Width | Adjustment |
|----------------|------------|
| < 400px | Timestamps hidden, avatars hidden, compact padding |
| 400px - 600px | Timestamps shown, avatars shown, standard padding |
| > 600px | Full layout with generous spacing |

### 8.4 Z-Index

| Element | Z-Index | Rationale |
|---------|---------|-----------|
| Conversation root | `auto` | Participates in parent stacking context |
| Copy format dropdown | 1 (relative) | Above message content |
| Feedback modal | 2 (relative) | Above dropdown |

The conversation component does not use fixed positioning or global z-index values. It participates in its parent container's stacking context.

### 8.5 Typing Indicator Animation

The three dots animate with a staggered `@keyframes` bounce:

```css
@keyframes conversation-typing-bounce
{
    0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
    30% { transform: translateY(-4px); opacity: 1; }
}

.conversation-typing-dots span
{
    animation: conversation-typing-bounce 1.4s infinite;
}

.conversation-typing-dots span:nth-child(2)
{
    animation-delay: 0.2s;
}

.conversation-typing-dots span:nth-child(3)
{
    animation-delay: 0.4s;
}
```

### 8.6 Reduced Motion

A `prefers-reduced-motion: reduce` media query disables the typing indicator animation and the streaming cursor blink. Dots and cursor remain static but visible.

---

## 9. Keyboard Accessibility

### 9.1 ARIA Attributes

| Element | Attribute | Value |
|---------|-----------|-------|
| Root | `role="region"` | Landmark region |
| Root | `aria-label` | Descriptive label from `options.label` |
| Message area | `role="log"` | Auto-updating content log |
| Message area | `aria-live="polite"` | Screen readers announce new messages |
| Message area | `aria-relevant="additions"` | Only announce added content |
| Message | `role="article"` | Self-contained message unit |
| Message | `aria-label` | "{name}, {time}" for context |
| Typing indicator | `role="status"` | Status update |
| Typing indicator | `aria-label` | "Assistant is typing" |
| Feedback buttons | `aria-pressed` | `"true"` or `"false"` for toggle state |
| Copy dropdown button | `aria-haspopup` | `"true"` |
| Copy dropdown button | `aria-expanded` | `"true"` or `"false"` |
| Copy menu | `role="menu"` | Menu pattern |
| Copy menu item | `role="menuitem"` | Menu item |
| Feedback modal | `role="dialog"` | Dialog pattern |
| Feedback modal | `aria-label` | "Provide feedback" |
| Feedback modal | `aria-modal` | `"true"` |
| Textarea | `aria-label` | "Message input" |
| Send button | `aria-label` | "Send message" |
| Avatar | `aria-hidden` | `"true"` — decorative |
| Timestamp | `<time>` element | Machine-readable `datetime` attribute |

### 9.2 Keyboard Navigation

| Key | Context | Action |
|-----|---------|--------|
| **Tab** | Anywhere | Moves focus through interactive elements in DOM order |
| **Enter** | Textarea | Sends message (when not empty) |
| **Shift+Enter** | Textarea | Inserts newline |
| **Escape** | Copy dropdown open | Closes dropdown |
| **Escape** | Feedback modal open | Closes modal, returns focus to feedback button |
| **Up/Down Arrow** | Copy dropdown menu | Navigates menu items |
| **Enter/Space** | Copy menu item | Activates copy in selected format |
| **Enter/Space** | Feedback button | Toggles feedback |
| **Enter/Space** | Send button | Sends message |

### 9.3 Focus Management

- On `show()`, focus moves to the textarea unless the component is disabled.
- After sending a message, focus returns to the textarea.
- Opening the feedback modal traps focus within the modal (Tab cycles through textarea, Cancel, Submit).
- Closing the feedback modal returns focus to the feedback button that triggered it.
- After copy dropdown closes, focus returns to the copy button.

---

## 10. Edge Cases

| Scenario | Behaviour |
|----------|-----------|
| Empty or whitespace-only message submitted | Blocked — send button stays disabled, Enter is no-op |
| `startAssistantMessage()` called while stream is active | Logs warning, returns `null` |
| `appendChunk()` called after `complete()` | Logs warning, no-op |
| `appendChunk()` called after `error()` | Logs warning, no-op |
| `complete()` called with no chunks appended | Renders empty assistant message |
| `destroy()` called during active stream | Aborts stream (calls `error()`), then destroys |
| Very long message (10,000+ characters) | Rendered fully; message area scrolls; no truncation |
| Rapid sequential messages (100+ in <1 second) | Batches DOM updates via `requestAnimationFrame`; auto-scroll applies after batch |
| Clipboard API unavailable (HTTP, older browser) | Falls back to `document.execCommand("copy")`; if that fails, fires `onError` |
| Vditor not loaded (CDN failure, missing script) | Assistant messages fall back to `textContent` with `white-space: pre-wrap`; logs warning |
| DOMPurify not loaded | Vditor `sanitize: true` is the only sanitisation layer; logs info-level note |
| `maxMessages` exceeded during stream | Evicts oldest non-streaming messages |
| `loadSession()` with messages exceeding `maxMessages` | Loads only the most recent `maxMessages` messages |
| `loadSession()` with invalid message data | Skips malformed messages, logs warning per skipped message |
| Session with no messages | Renders empty message area; no error |
| `onSendMessage` callback throws | Caught and logged; component state remains consistent |
| `onFeedback` callback throws | Caught and logged; feedback UI state remains applied |
| Multiple `show()` calls without `hide()` | Logs warning, no-op on second call |
| `show()` after `destroy()` | Logs warning, no-op |
| Copy of conversation with zero messages | Copies empty string; no error |
| Feedback submitted on message that was later evicted | Feedback data persists in session data; DOM element is gone |
| Container removed from DOM externally | Component detects orphaned state on next interaction; logs warning |

---

## 11. Security

### 11.1 Content Rendering

- **User messages** — Always rendered via `textContent`. Never parsed as HTML. This prevents stored XSS from user input.
- **Assistant messages** — Rendered via `Vditor.preview()` with `sanitize: true`. If DOMPurify is available, it is applied as an additional layer after Vditor rendering. This double-sanitisation guards against markdown injection and HTML injection from AI model output.
- **System messages** — Always rendered via `textContent`. No HTML parsing.
- **Error messages** — All fields (`title`, `message`, `suggestion`, `technicalDetail`, `errorCode`, `correlationId`) are rendered via `textContent` within their respective elements. The `<pre>` block for technical details uses `textContent`, not `innerHTML`.

### 11.2 Event Handling

- No inline event handlers (`onclick`, `onload`, etc.) in generated HTML.
- No `eval()`, `Function()`, or `setTimeout(string)`.
- All event listeners are attached programmatically via `addEventListener()`.

### 11.3 Copy Operations

- Markdown and plaintext copy output the raw text content. No executable content.
- HTML copy output is sanitised via DOMPurify (if available) before writing to clipboard.

### 11.4 External Dependencies

- Vditor is expected but optional. The component degrades gracefully if absent.
- DOMPurify is expected but optional. The component logs a note if absent.
- Neither dependency is loaded by the component. The consumer includes them via `<script>` tags.

---

## 12. Files

| File | Purpose |
|------|---------|
| `specs/conversation.prd.md` | This specification |
| `components/conversation/conversation.ts` | TypeScript source |
| `components/conversation/conversation.scss` | Styles |
| `components/conversation/README.md` | Documentation |

---

## 13. Implementation Notes

### 13.1 Message ID Generation

Message IDs are generated using a monotonic counter prefixed with `"msg-"`. The counter is scoped to the `Conversation` instance. IDs are unique within a session but not globally unique across sessions. Consumers can override by providing `id` in the message metadata.

### 13.2 Vditor Integration

Assistant message rendering uses `Vditor.preview()` in static mode:

```typescript
const contentEl = messageEl.querySelector(".conversation-message-content") as HTMLElement;

if (typeof Vditor !== "undefined")
{
    Vditor.preview(contentEl, content, {
        mode: "dark",       // or "light" based on theme
        sanitize: true,
        cdn: "",            // consumer provides CDN path
        math: { engine: "KaTeX" },
        hljs: { lineNumber: true }
    });
}
else
{
    console.warn(LOG_PREFIX, "Vditor not loaded; falling back to plain text.");
    contentEl.textContent = content;
}
```

### 13.3 Streaming Chunk Rendering

During streaming, chunks are appended to a plain text buffer and rendered via `textContent` for performance. A blinking cursor CSS pseudo-element (`.conversation-message-streaming::after`) provides visual feedback that content is arriving.

On `complete()`, the entire accumulated buffer is rendered through `Vditor.preview()`, replacing the plain text with rich content. This two-phase approach avoids the cost of re-parsing markdown on every chunk.

### 13.4 Auto-Scroll Implementation

```typescript
private isNearBottom(): boolean
{
    const el = this.messagesEl;
    const threshold = 50;
    return el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
}

private autoScroll(): void
{
    if (this.userScrolledUp)
    {
        return;
    }
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
}
```

The `scroll` event listener on the message area sets `this.userScrolledUp = !this.isNearBottom()`. New messages and streaming chunks call `autoScroll()`.

### 13.5 Textarea Auto-Resize

```typescript
private resizeTextarea(): void
{
    const ta = this.textareaEl;
    ta.style.height = "auto";
    const maxHeight = parseFloat(getComputedStyle(ta).lineHeight) * 6;
    ta.style.height = Math.min(ta.scrollHeight, maxHeight) + "px";
}
```

Called on `input` events. The `maxHeight` is capped at six lines of text. Overflow scrolls internally.

### 13.6 Clipboard Fallback

```typescript
private async copyToClipboard(text: string): Promise<void>
{
    if (navigator.clipboard && navigator.clipboard.writeText)
    {
        await navigator.clipboard.writeText(text);
        return;
    }

    // Fallback for non-HTTPS or older browsers
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();

    try
    {
        document.execCommand("copy");
    }
    finally
    {
        document.body.removeChild(ta);
    }
}
```

### 13.7 Callback Safety

All consumer callbacks (`onSendMessage`, `onFeedback`, `onCopy`, `onNewSession`, `onLoadSession`, `onSaveSession`, `onClearSession`, `onError`) are wrapped in try/catch blocks. Errors are logged with `LOG_PREFIX` but do not break internal component state.

### 13.8 Performance

- DOM updates during rapid message addition are batched via `requestAnimationFrame`.
- Streaming chunks update a single `textContent` node — no DOM tree manipulation per chunk.
- `Vditor.preview()` is called once on stream completion, not on every chunk.
- Message elements are created using `createElement` and `setAttr` helpers — no `innerHTML` for structure.
- Auto-scroll check uses cached scroll measurements, not forced reflow queries.
- The feedback modal is created once and reused across all feedback interactions.

---

## 14. Future Considerations (Out of Scope for v1)

These features are explicitly deferred:

- **Message threading/replies** — Nested replies to specific messages within the conversation.
- **Message editing** — Editing previously sent user messages and re-running the assistant response.
- **Message deletion** — Removing individual messages from the conversation.
- **File and image upload** — Attaching files or images to user messages.
- **Voice input** — Speech-to-text for message composition.
- **Message search** — Searching within conversation history.
- **Conversation branching** — Forking a conversation at a specific point to explore alternative paths.
- **Shared/collaborative conversations** — Multiple users participating in the same conversation.
- **Message reactions** — Emoji reactions beyond thumbs up/down.
- **Suggested replies** — Pre-composed response suggestions shown to the user.
- **Code execution** — Inline code execution with output display.
- **Citation/source linking** — Linking assistant responses to source documents.
