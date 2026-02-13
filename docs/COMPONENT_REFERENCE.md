<!-- AGENT: Auto-generated — do not edit. Run `npm run build` to regenerate. -->

# Component Reference

Complete reference for all custom components shipped with the enterprise theme.

## Components

| Component | CSS | JS |
|-----------|-----|----|
| [bannerbar](#bannerbar) | `dist/components/bannerbar/bannerbar.css` | `dist/components/bannerbar/bannerbar.js` |
| [conversation](#conversation) | `dist/components/conversation/conversation.css` | `dist/components/conversation/conversation.js` |
| [cronpicker](#cronpicker) | `dist/components/cronpicker/cronpicker.css` | `dist/components/cronpicker/cronpicker.js` |
| [datepicker](#datepicker) | `dist/components/datepicker/datepicker.css` | `dist/components/datepicker/datepicker.js` |
| [durationpicker](#durationpicker) | `dist/components/durationpicker/durationpicker.css` | `dist/components/durationpicker/durationpicker.js` |
| [editablecombobox](#editablecombobox) | `dist/components/editablecombobox/editablecombobox.css` | `dist/components/editablecombobox/editablecombobox.js` |
| [errordialog](#errordialog) | `dist/components/errordialog/errordialog.css` | `dist/components/errordialog/errordialog.js` |
| [gauge](#gauge) | `dist/components/gauge/gauge.css` | `dist/components/gauge/gauge.js` |
| [markdowneditor](#markdowneditor) | `dist/components/markdowneditor/markdowneditor.css` | `dist/components/markdowneditor/markdowneditor.js` |
| [progressmodal](#progressmodal) | `dist/components/progressmodal/progressmodal.css` | `dist/components/progressmodal/progressmodal.js` |
| [sidebar](#sidebar) | `dist/components/sidebar/sidebar.css` | `dist/components/sidebar/sidebar.js` |
| [statusbar](#statusbar) | `dist/components/statusbar/statusbar.css` | `dist/components/statusbar/statusbar.js` |
| [timeline](#timeline) | `dist/components/timeline/timeline.css` | `dist/components/timeline/timeline.js` |
| [timepicker](#timepicker) | `dist/components/timepicker/timepicker.css` | `dist/components/timepicker/timepicker.js` |
| [timezonepicker](#timezonepicker) | `dist/components/timezonepicker/timezonepicker.css` | `dist/components/timezonepicker/timezonepicker.js` |
| [toolbar](#toolbar) | `dist/components/toolbar/toolbar.css` | `dist/components/toolbar/toolbar.js` |

---

<a id="bannerbar"></a>

# BannerBar

A fixed-to-top viewport banner for announcing significant events such as service status updates, critical issues, maintenance windows, and success confirmations.

## Features

- Four severity presets: info, warning, critical, success
- Full colour override support for custom branding
- Optional bold title, icon, and action link/button
- Closeable via X button (configurable)
- Optional auto-dismiss timer
- Scrollable overflow at configurable max height
- Slide-in/slide-out animation
- Single-instance model (new banner replaces the previous)
- Sets `--bannerbar-height` CSS custom property on `<html>` for layout offset
- WCAG AA accessible with appropriate ARIA attributes

## Assets

| Asset | Path |
|-------|------|
| CSS | `dist/components/bannerbar/bannerbar.css` |
| JS | `dist/components/bannerbar/bannerbar.js` |
| Types | `dist/components/bannerbar/bannerbar.d.ts` |

**Requires:** Bootstrap CSS (for SCSS variables), Bootstrap Icons CSS. Does **not** require Bootstrap JS.

## Quick Start

```html
<link rel="stylesheet" href="dist/components/bannerbar/bannerbar.css">
<script src="dist/components/bannerbar/bannerbar.js"></script>
<script>
    var banner = createBannerBar({
        message: "Scheduled maintenance tonight at 02:00 UTC.",
        variant: "warning"
    });
</script>
```

## API

### `createBannerBar(options)` / `showBanner(options)`

Creates, shows, and returns a `BannerBar` instance. `showBanner` is an ergonomic alias.

### `new BannerBar(options)`

Creates a BannerBar instance without showing it. Call `.show()` to display.

### Options

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `id` | string | auto | Unique identifier |
| `title` | string | — | Bold title text before the message |
| `message` | string | **(required)** | Main message text |
| `variant` | `"info"` \| `"warning"` \| `"critical"` \| `"success"` | `"info"` | Severity preset |
| `icon` | string | variant default | Bootstrap Icons class |
| `actionLabel` | string | — | Text for action link/button |
| `actionHref` | string | — | If set, action renders as `<a>` |
| `onAction` | function | — | Click handler for action |
| `closable` | boolean | `true` | Show the close X button |
| `autoDismissMs` | number | `0` | Auto-close after N ms (0 = disabled) |
| `maxHeight` | number | `200` | Max height in px before scrolling |
| `backgroundColor` | string | — | CSS colour override |
| `textColor` | string | — | CSS colour override |
| `borderColor` | string | — | CSS border-bottom colour override |
| `zIndex` | number | `1045` | CSS z-index |
| `cssClass` | string | — | Additional CSS classes |
| `onClose` | function | — | Called after close/destroy |

### Instance Methods

| Method | Description |
|--------|-------------|
| `show()` | Show the banner (replaces any active banner) |
| `hide()` | Hide the banner with slide-out animation |
| `destroy()` | Remove the banner and release all resources |
| `setMessage(msg)` | Update the message text |
| `setTitle(title)` | Update the title text (empty string hides it) |
| `setVariant(variant)` | Switch severity variant |
| `isVisible()` | Returns `true` if the banner is currently shown |

## Variants

| Variant | Use Case | Default Icon |
|---------|----------|-------------|
| `info` | Announcements, feature notices | `bi-info-circle-fill` |
| `warning` | Maintenance windows, degradation | `bi-exclamation-triangle-fill` |
| `critical` | Outages, breaking issues | `bi-exclamation-octagon-fill` |
| `success` | Completed operations, confirmations | `bi-check-circle-fill` |

## Examples

### Basic Info Banner

```javascript
createBannerBar({
    message: "New dashboard analytics are now available."
});
```

### Critical Banner with Title

```javascript
createBannerBar({
    title: "Service Disruption",
    message: "Payment processing is currently unavailable. We are investigating.",
    variant: "critical"
});
```

### Banner with Action Link

```javascript
createBannerBar({
    message: "Your subscription expires in 3 days.",
    variant: "warning",
    actionLabel: "Renew Now",
    actionHref: "/billing/renew"
});
```

### Auto-Dismissing Success Banner

```javascript
createBannerBar({
    message: "All records imported successfully.",
    variant: "success",
    autoDismissMs: 5000
});
```

### Custom Colours

```javascript
createBannerBar({
    message: "Beta feature enabled for your account.",
    backgroundColor: "#f0e6ff",
    textColor: "#4a1d8e",
    borderColor: "#7c3aed"
});
```

## CSS Custom Property

When visible, the banner sets `--bannerbar-height` on `<html>` to its measured pixel height. Other components (e.g., Sidebar) use this to offset their top position:

```css
.my-fixed-element {
    top: var(--bannerbar-height, 0px);
}
```

The property is removed when the banner is hidden or destroyed.

## Accessibility

- Root element has `role="alert"` with `aria-live="assertive"` for critical/warning variants, `aria-live="polite"` for info/success
- Close button has `aria-label="Close banner"`
- Action element is a standard focusable `<a>` or `<button>`
- All variant colour combinations meet WCAG AA contrast requirements


---

<a id="conversation"></a>

# Conversation

A programmable turn-by-turn conversation UI component for AI agent interactions in enterprise SaaS applications. Supports rich text rendering via Vditor, streaming responses, session management, user feedback, copy in multiple formats, and inline error display.

## Features

- **Turn-by-turn messaging** — user, assistant, system, and error message roles
- **Rich text rendering** — assistant messages rendered as Markdown via Vditor with syntax highlighting, math (KaTeX), and footnotes
- **Token streaming** — stream assistant responses chunk-by-chunk with a final Vditor render on completion
- **Session management** — create, load, save, and clear conversation sessions with async callbacks
- **Feedback** — thumbs-up/down with optional written comments on assistant messages
- **Copy to clipboard** — copy single messages or the entire conversation in Markdown, HTML, or plain text
- **Inline errors** — structured error display with title, message, suggestion, and expandable technical details
- **Typing indicator** — animated dots with configurable label text
- **Customisable avatars** — Bootstrap Icons class names or image URLs for user and assistant
- **Full accessibility** — ARIA roles, live regions, keyboard navigation

## Assets

| Asset | Path |
|-------|------|
| CSS | `dist/components/conversation/conversation.css` |
| JS | `dist/components/conversation/conversation.js` |
| Types | `dist/components/conversation/conversation.d.ts` |

**Dependencies:**

| Dependency | Purpose | Required |
|------------|---------|----------|
| Bootstrap CSS | Layout and base styles | Yes |
| Bootstrap Icons | Avatar and action button icons | Yes |
| Vditor (CDN) | Markdown rendering for assistant messages | Yes |
| DOMPurify (CDN) | HTML sanitisation on copy export paths | Recommended |

## Quick Start

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5/dist/css/bootstrap.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons/font/bootstrap-icons.css">
<link rel="stylesheet" href="dist/components/conversation/conversation.css">

<script src="https://cdn.jsdelivr.net/npm/vditor/dist/index.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/dompurify/dist/purify.min.js"></script>
<script src="dist/components/conversation/conversation.js"></script>

<div id="chat-container" style="height: 600px;"></div>

<script>
    var chat = createConversation(
    {
        title: "Support Agent",
        onSendMessage: function(message, session)
        {
            // Call your backend API here
            chat.showTypingIndicator();
            fetch("/api/chat", { method: "POST", body: JSON.stringify({ message: message }) })
                .then(function(res) { return res.json(); })
                .then(function(data)
                {
                    chat.hideTypingIndicator();
                    chat.addAssistantMessage(data.reply);
                });
        }
    }, "chat-container");
</script>
```

## API

### Constructor

```typescript
const chat = new Conversation(options?: ConversationOptions);
```

Creates the conversation DOM but does not attach it to the page. Call `show()` to mount.

### ConversationOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxMessages` | `number` | `0` (unlimited) | Maximum messages to retain in buffer. Oldest messages are evicted when exceeded. |
| `session` | `ConversationSession` | — | Initial session to load. A default empty session is created if omitted. |
| `placeholder` | `string` | `"Type a message..."` | Placeholder text for the input textarea. |
| `showHeader` | `boolean` | `true` | Show the session header with title and action buttons. |
| `title` | `string` | `"Conversation"` | Title displayed in the header. |
| `showFeedback` | `boolean` | `true` | Show thumbs-up/down feedback buttons on assistant messages. |
| `showMessageCopy` | `boolean` | `true` | Show copy button on individual messages. |
| `showConversationCopy` | `boolean` | `true` | Show conversation-level copy dropdown in header. |
| `showNewConversation` | `boolean` | `true` | Show the "New conversation" button in the header. |
| `showClearContext` | `boolean` | `true` | Show the "Clear context" button in the header. |
| `showTimestamps` | `boolean` | `false` | Show timestamp (HH:MM) on each message. |
| `userDisplayName` | `string` | `"You"` | Display name for user messages. |
| `assistantDisplayName` | `string` | `"Assistant"` | Display name for assistant messages. |
| `userAvatar` | `string` | `"bi-person-circle"` | User avatar: a Bootstrap Icons class (e.g., `"bi-person-circle"`) or an image URL. |
| `assistantAvatar` | `string` | `"bi-robot"` | Assistant avatar: a Bootstrap Icons class or an image URL. |
| `typingIndicatorText` | `string` | `"Thinking..."` | Text shown beside the typing indicator dots. |
| `autoFocus` | `boolean` | `true` | Auto-focus the input textarea on `show()`. |
| `disabled` | `boolean` | `false` | Disable the input area (prevents sending). |
| `height` | `string` | `"100%"` | CSS height of the component. |
| `width` | `string` | `"100%"` | CSS width of the component. |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Bootstrap size variant controlling density. |
| `cssClass` | `string` | — | Additional CSS class(es) on the root element. |
| `onNewSession` | `() => Promise<ConversationSession> \| ConversationSession` | — | Called when a new session is requested. |
| `onLoadSession` | `(sessionId: string) => Promise<ConversationSession> \| ConversationSession` | — | Called when loading an existing session. |
| `onSaveSession` | `(session: ConversationSession) => Promise<void> \| void` | — | Called to persist the session after each message. |
| `onClearSession` | `(sessionId: string) => Promise<void> \| void` | — | Called when the user clicks "Clear context". |
| `onSendMessage` | `(message: string, session: ConversationSession) => void` | — | Called when the user sends a message. |
| `onFeedback` | `(messageId: string, feedback: FeedbackData, session: ConversationSession) => void` | — | Called when feedback is given on an assistant message. |
| `onCopy` | `(content: string, format: CopyFormat) => void` | — | Called when content is copied. |
| `onError` | `(error: Error) => void` | — | Called when an error occurs. |

### ConversationMessage

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Unique message identifier. Auto-generated if not provided. |
| `role` | `"user" \| "assistant" \| "system" \| "error"` | Who sent the message. |
| `content` | `string` | Message content (Markdown for assistant, plain text for user). |
| `timestamp` | `Date` | UTC timestamp. |
| `feedback` | `FeedbackData` | Feedback on this message (assistant messages only). Optional. |
| `metadata` | `Record<string, unknown>` | Arbitrary metadata the consumer can attach. Optional. |

### ConversationSession

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Unique session identifier. |
| `title` | `string` | Human-readable session title. Optional. |
| `messages` | `ConversationMessage[]` | Messages in this session. |
| `createdAt` | `Date` | When the session was created. |
| `updatedAt` | `Date` | When the session was last updated. |
| `metadata` | `Record<string, unknown>` | Arbitrary session metadata. Optional. |

### StreamHandle

| Property / Method | Type | Description |
|-------------------|------|-------------|
| `messageId` | `string` (readonly) | The message ID being streamed. |
| `appendChunk(text)` | `(text: string) => void` | Append a text chunk to the message. |
| `complete()` | `() => void` | Mark streaming as complete. Triggers final Vditor render. |
| `error(message?)` | `(message?: string) => void` | Mark streaming as errored. Shows inline error state. |
| `getContent()` | `() => string` | Returns current accumulated content. |
| `getState()` | `() => StreamState` | Returns current stream state: `"streaming"`, `"complete"`, or `"error"`. |

### ConversationError

| Property | Type | Description |
|----------|------|-------------|
| `title` | `string` | Short error title. Required. |
| `message` | `string` | Explanation text. Required. |
| `suggestion` | `string` | Actionable suggestion. Optional. |
| `technicalDetail` | `string` | Technical detail shown in an expandable section. Optional. |
| `errorCode` | `string` | Error code for searchability. Optional. |
| `correlationId` | `string` | Correlation ID for backend log tracing. Optional. |

### FeedbackData

| Property | Type | Description |
|----------|------|-------------|
| `sentiment` | `"positive" \| "negative"` | Positive or negative sentiment. |
| `comment` | `string` | Optional written comment from the user. |
| `timestamp` | `Date` | UTC timestamp of when feedback was given. |

### Methods

| Method | Description |
|--------|-------------|
| `show(container?)` | Appends to container (ID string or HTMLElement) and makes visible. |
| `hide()` | Removes from DOM without destroying state. |
| `destroy()` | Hides and releases all references and timers. |
| `addUserMessage(text)` | Adds a user message to the conversation. Returns `ConversationMessage`. |
| `addAssistantMessage(text)` | Adds a complete assistant message rendered via Vditor. Returns `ConversationMessage`. |
| `addSystemMessage(text)` | Adds an informational system message. Returns `ConversationMessage`. |
| `addError(error)` | Adds an inline error with expandable details. Returns `ConversationMessage`. |
| `startAssistantMessage()` | Begins a streaming assistant message. Returns a `StreamHandle`. |
| `showTypingIndicator()` | Shows the animated typing indicator. |
| `hideTypingIndicator()` | Hides the typing indicator. |
| `loadSession(session)` | Replaces the current session and re-renders all messages. |
| `newSession()` | Creates a new session via callback and reinitialises. Returns `Promise<void>`. |
| `clearSession()` | Clears messages in the current session. Returns `Promise<void>`. |
| `getSession()` | Returns a deep copy of the current session. |
| `getMessages()` | Returns a copy of the messages array. |
| `copyMessage(messageId, format, btn?)` | Copies a single message to the clipboard. |
| `copyConversation(format, btn?)` | Copies the entire conversation to the clipboard. |
| `setDisabled(disabled)` | Enables or disables the input area. |
| `setTitle(title)` | Updates the header title. |
| `scrollToBottom()` | Forces scroll to the bottom of the message list. |
| `focus()` | Focuses the input textarea. |
| `getMessageCount()` | Returns current message count. |
| `isStreaming()` | Returns `true` if a stream is active. |
| `isVisible()` | Returns visibility state. |
| `getElement()` | Returns the root DOM element (or `null`). |

### Convenience Functions

```typescript
createConversation(options?, container?)    // Create, show, and return
```

### Global Exports

```
window.Conversation
window.createConversation
```

## Streaming Example

Use `startAssistantMessage()` to stream tokens from your backend into the conversation. During streaming, chunks are displayed as plain text. On `complete()`, the full content is rendered through Vditor.

```javascript
chat.showTypingIndicator();

fetch("/api/stream", { method: "POST", body: JSON.stringify({ prompt: userText }) })
    .then(function(response)
    {
        chat.hideTypingIndicator();
        var stream = chat.startAssistantMessage();
        var reader = response.body.getReader();
        var decoder = new TextDecoder();

        function pump()
        {
            reader.read().then(function(result)
            {
                if (result.done)
                {
                    stream.complete();
                    return;
                }
                var chunk = decoder.decode(result.value, { stream: true });
                stream.appendChunk(chunk);
                pump();
            }).catch(function(err)
            {
                stream.error("Connection lost: " + err.message);
            });
        }

        pump();
    });
```

## Session Management Example

Provide session lifecycle callbacks to persist conversations to your backend.

```javascript
var chat = createConversation(
{
    title: "Project Assistant",

    onNewSession: function()
    {
        return fetch("/api/sessions", { method: "POST" })
            .then(function(res) { return res.json(); });
    },

    onSaveSession: function(session)
    {
        return fetch("/api/sessions/" + session.id,
        {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(session)
        });
    },

    onClearSession: function(sessionId)
    {
        return fetch("/api/sessions/" + sessionId + "/clear",
        {
            method: "POST"
        });
    },

    onLoadSession: function(sessionId)
    {
        return fetch("/api/sessions/" + sessionId)
            .then(function(res) { return res.json(); });
    },

    onSendMessage: function(message, session)
    {
        // Handle message and respond
    }
}, "chat-container");
```

You can also load a session programmatically:

```javascript
var savedSession = {
    id: "session-abc123",
    title: "Previous chat",
    messages: [],
    createdAt: new Date("2026-01-15"),
    updatedAt: new Date("2026-01-15")
};

chat.loadSession(savedSession);
```

## Feedback Example

When feedback buttons are enabled (`showFeedback: true`), users can rate assistant messages as helpful or unhelpful. Clicking a feedback button opens a modal for an optional written comment.

```javascript
var chat = createConversation(
{
    showFeedback: true,

    onFeedback: function(messageId, feedback, session)
    {
        console.log("Feedback on", messageId, ":", feedback.sentiment);
        if (feedback.comment)
        {
            console.log("Comment:", feedback.comment);
        }

        fetch("/api/feedback",
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(
            {
                messageId: messageId,
                sentiment: feedback.sentiment,
                comment: feedback.comment,
                sessionId: session.id
            })
        });
    }
}, "chat-container");
```

## Copy Functionality

The component supports copying content in three formats:

| Format | Description |
|--------|-------------|
| `"markdown"` | Raw Markdown source. For assistant messages, this is the original Markdown content. |
| `"html"` | Rendered HTML from the DOM, sanitised through DOMPurify. |
| `"plaintext"` | Plain text extracted from the rendered DOM via `textContent`. |

**Conversation-level copy** is available through a dropdown in the header (when `showConversationCopy` is `true`). Each message is prefixed with the sender's display name.

**Message-level copy** is available through a clipboard button on individual assistant messages (when `showMessageCopy` is `true`). Message-level copy defaults to Markdown format.

The `onCopy` callback is fired after each copy operation:

```javascript
var chat = createConversation(
{
    onCopy: function(content, format)
    {
        console.log("Copied as", format, ":", content.length, "characters");
    }
}, "chat-container");
```

## Error Display

Use `addError()` to display structured, user-friendly error messages inline in the conversation. Errors follow the literate error pattern with a title, explanation, suggestion, and expandable technical details.

```javascript
chat.addError(
{
    title: "Request failed",
    message: "The assistant could not process your request because the service is temporarily unavailable.",
    suggestion: "Wait a moment and try again, or contact support if the problem persists.",
    technicalDetail: "HTTP 503 Service Unavailable\nEndpoint: POST /api/v2/chat/completions",
    errorCode: "CHAT-503",
    correlationId: "req-7f3a-4b2c-9d1e"
});
```

The error code and correlation ID appear in the expandable "Technical Details" section, making it straightforward for support teams to trace issues in backend logs.

## Security

The Conversation component applies defence-in-depth to prevent cross-site scripting (XSS):

- **User messages** are rendered using `textContent` only. HTML in user input is never interpreted.
- **Assistant messages** are rendered through `Vditor.preview()` with `sanitize: true`, which strips dangerous markup before rendering Markdown.
- **HTML copy export** passes through `DOMPurify.sanitize()` before being written to the clipboard. If DOMPurify is not loaded, a console warning is emitted.
- **System messages** and **error messages** use `textContent` for all user-visible strings.

Loading DOMPurify via CDN is recommended for production deployments to ensure HTML export paths are sanitised.

## Accessibility

The component implements the following accessibility features:

| Feature | Implementation |
|---------|----------------|
| Region landmark | Root element uses `role="region"` with `aria-label` set to the conversation title. |
| Live region | Message list uses `role="log"` with `aria-live="polite"` and `aria-relevant="additions"` so screen readers announce new messages. |
| Message articles | Each message bubble uses `role="article"` with a descriptive `aria-label` (sender name and time). |
| Typing indicator | Uses `role="status"` with `aria-label` matching the typing indicator text. |
| Input label | The textarea has `aria-label="Message input"`. |
| Button labels | All action buttons have `aria-label` attributes (e.g., "Send message", "Rate as helpful", "Copy message"). |
| Keyboard send | Press Enter to send a message. Press Shift+Enter for a new line. |
| Copy menu | The copy dropdown menu uses `role="menu"` with `role="menuitem"` on each option. |
| Focus management | `autoFocus` places focus on the input textarea when the component is shown. |

| Key | Action |
|-----|--------|
| Enter | Send message |
| Shift+Enter | Insert new line |
| Tab | Navigate between focusable elements |

See `specs/conversation.prd.md` for the complete specification.


---

<a id="cronpicker"></a>

# CronPicker

A visual builder for extended 6-field CRON expressions (second, minute, hour, day-of-month, month, day-of-week) with presets, mode-based field editors, human-readable descriptions, and bidirectional raw expression editing.

## Quick Start

```html
<link rel="stylesheet" href="dist/components/cronpicker/cronpicker.css">
<script src="dist/components/cronpicker/cronpicker.js"></script>

<div id="my-cron"></div>
<script>
    var picker = createCronPicker("my-cron", {
        value: "0 0 9 * * 1-5",
        onChange: function(expr) { console.log("Expression:", expr); }
    });
</script>
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `value` | `string` | `"0 * * * * *"` | Initial CRON expression |
| `showPresets` | `boolean` | `true` | Show preset dropdown |
| `showDescription` | `boolean` | `true` | Show human-readable description |
| `showRawExpression` | `boolean` | `true` | Show raw expression input |
| `allowRawEdit` | `boolean` | `true` | Allow editing raw expression |
| `showFormatHint` | `boolean` | `true` | Show field order hint |
| `presets` | `CronPreset[]` | Default list | Custom presets |
| `disabled` | `boolean` | `false` | Disable the component |
| `readonly` | `boolean` | `false` | Read-only mode |
| `size` | `"sm" \| "default" \| "lg"` | `"default"` | Size variant |
| `onChange` | `(value: string) => void` | — | Expression change callback |
| `onPresetSelect` | `(preset: CronPreset) => void` | — | Preset selection callback |

## CronPreset Interface

```typescript
interface CronPreset {
    label: string;  // Display label
    value: string;  // CRON expression
}
```

## Public API

| Method | Returns | Description |
|--------|---------|-------------|
| `getValue()` | `string` | Current CRON expression |
| `getDescription()` | `string` | Human-readable description |
| `setValue(cron)` | `void` | Set expression programmatically |
| `clear()` | `void` | Reset to default expression |
| `enable()` | `void` | Enable component |
| `disable()` | `void` | Disable component |
| `destroy()` | `void` | Remove from DOM |

## CRON Expression Format

Six-field extended format: `second minute hour day-of-month month day-of-week`

| Field | Range | Labels |
|-------|-------|--------|
| Second | 0–59 | Numeric |
| Minute | 0–59 | Numeric |
| Hour | 0–23 | Numeric |
| Day of Month | 1–31 | Numeric |
| Month | 1–12 | Jan–Dec |
| Day of Week | 0–6 | Sun–Sat |

### Supported Syntax

| Syntax | Meaning | Example |
|--------|---------|---------|
| `*` | Every value | Every minute |
| `N` | Specific value | `30` |
| `N,M` | List | `1,15` |
| `N-M` | Range | `1-5` (Mon–Fri) |
| `*/N` | Step from 0 | `*/15` (every 15) |
| `N/M` | Step from N | `5/10` |

## Default Presets

| Preset | Expression |
|--------|-----------|
| Every second | `* * * * * *` |
| Every minute | `0 * * * * *` |
| Every hour | `0 0 * * * *` |
| Daily at midnight | `0 0 0 * * *` |
| Daily at noon | `0 0 12 * * *` |
| Weekdays at 9am | `0 0 9 * * 1-5` |
| Weekly on Monday | `0 0 0 * * 1` |
| Monthly on the 1st | `0 0 0 1 * *` |
| Yearly on Jan 1 | `0 0 0 1 1 *` |

## Features

- **Visual field builder** with 4 modes per field: Every, Specific, Range, Step
- **Chip grid** for specific value selection with named labels for months and days
- **Bidirectional sync** between visual builder and raw expression input
- **Human-readable description** generated live from the expression
- **Presets** for common schedules with custom preset support
- **Accessible** with ARIA roles on all interactive elements

## Dependencies

- Bootstrap CSS (form-control, form-select, btn)
- Bootstrap Icons CSS
- Does **not** require Bootstrap JS


---

<a id="datepicker"></a>

# DatePicker

A calendar date picker with day, month, and year navigation views.

## Quick Start

### Script Tag

```html
<link rel="stylesheet" href="https://static.knobby.io/components/datepicker/datepicker.css">
<script src="https://static.knobby.io/components/datepicker/datepicker.js"></script>

<div id="my-date"></div>
<script>
    var picker = createDatePicker("my-date", {
        format: "yyyy-MM-dd",
        firstDayOfWeek: 0,
        onSelect: function(date) { console.log("Selected:", date); }
    });
</script>
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `value` | `Date` | Today | Initial selected date |
| `format` | `string` | `"yyyy-MM-dd"` | Display format |
| `firstDayOfWeek` | `number` | `0` | 0=Sunday, 1=Monday, …, 6=Saturday |
| `showWeekNumbers` | `boolean` | `false` | Show ISO week numbers |
| `showTodayButton` | `boolean` | `true` | Show Today button |
| `minDate` | `Date` | — | Earliest selectable date |
| `maxDate` | `Date` | — | Latest selectable date |
| `disabledDates` | `Date[]` | — | Specific non-selectable dates |
| `isDateDisabled` | `(date: Date) => boolean` | — | Custom disable function |
| `disabled` | `boolean` | `false` | Disable the component |
| `readonly` | `boolean` | `false` | Read-only input, calendar works |
| `placeholder` | `string` | Format string | Placeholder text |
| `size` | `"sm" \| "default" \| "lg"` | `"default"` | Size variant |
| `locale` | `string` | `"en-US"` | Locale for month/day names |
| `showFormatHint` | `boolean` | `true` | Show format hint below input |
| `formatHint` | `string` | Format string | Custom hint text |
| `showFormatHelp` | `boolean` | `true` | Show help icon |
| `formatHelpText` | `string` | Auto-generated | Custom help tooltip |
| `onSelect` | `(date: Date) => void` | — | Selection callback |
| `onChange` | `(date: Date \| null) => void` | — | Value change callback |
| `onOpen` | `() => void` | — | Calendar open callback |
| `onClose` | `() => void` | — | Calendar close callback |

## Instance Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getValue()` | `Date \| null` | Current selected date |
| `getFormattedValue()` | `string` | Formatted date string |
| `setValue(date)` | `void` | Set date programmatically |
| `open()` | `void` | Open the calendar |
| `close()` | `void` | Close the calendar |
| `navigateTo(year, month)` | `void` | Navigate to specific month |
| `enable()` | `void` | Enable the component |
| `disable()` | `void` | Disable the component |
| `setMinDate(date)` | `void` | Set minimum date |
| `setMaxDate(date)` | `void` | Set maximum date |
| `destroy()` | `void` | Remove from DOM |

## Keyboard Interactions

| Key | Day View |
|-----|----------|
| Arrow keys | Navigate by day/week |
| Home / End | First/last day of week |
| PageUp / PageDown | Previous/next month |
| Shift+PageUp/Down | Previous/next year |
| Enter / Space | Select focused date |
| Escape | Close calendar |
| t | Jump to today |

## Dependencies

- Bootstrap 5 CSS (input-group, form-control, btn)
- Bootstrap Icons (bi-calendar3, bi-chevron-left, bi-chevron-right)
- Enterprise Theme CSS


---

<a id="durationpicker"></a>

# DurationPicker

A duration/interval picker with configurable unit patterns and ISO 8601 support.

## Quick Start

```html
<link rel="stylesheet" href="https://static.knobby.io/components/durationpicker/durationpicker.css">
<script src="https://static.knobby.io/components/durationpicker/durationpicker.js"></script>

<div id="my-duration"></div>
<script>
    var picker = createDurationPicker("my-duration", {
        pattern: "h-m",
        onChange: function(val) { console.log("Duration:", val); }
    });
</script>
```

## Supported Patterns

`d-h-m`, `h-m`, `h-m-s`, `h`, `m`, `s`, `m-s`, `w`, `fn`, `mo`, `q`, `y`, `y-mo`, `y-mo-d`, `w-d`, `w-d-h`, `d-h-m-s`

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `pattern` | `string` | `"h-m"` | Unit pattern |
| `value` | `DurationValue` | All zeros | Initial value |
| `unitSteps` | `Record<DurationUnit, number>` | All 1 | Step per unit |
| `unitMax` | `Record<DurationUnit, number>` | Natural ranges | Max per unit |
| `carry` | `boolean` | `false` | Overflow carries to next unit |
| `hideZeroLeading` | `boolean` | `true` | Hide leading zeros in display |
| `displayFormat` | `(val) => string` | — | Custom formatter |
| `showClearButton` | `boolean` | `true` | Show Clear button |
| `showFormatHint` | `boolean` | `true` | Show ISO 8601 hint |
| `showFormatHelp` | `boolean` | `true` | Show help icon |
| `disabled` | `boolean` | `false` | Disable component |
| `readonly` | `boolean` | `false` | Read-only input |
| `size` | `"sm" \| "default" \| "lg"` | `"default"` | Size variant |
| `onChange` | `(val: DurationValue) => void` | — | Change callback |

## Instance Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getValue()` | `DurationValue` | Current duration |
| `getFormattedValue()` | `string` | Display string |
| `toISO()` | `string` | ISO 8601 string |
| `toTotalSeconds()` | `number` | Total in seconds |
| `setValue(val)` | `void` | Set duration |
| `setFromISO(iso)` | `void` | Set from ISO string |
| `clear()` | `void` | Reset to zero |
| `open()` / `close()` | `void` | Toggle dropdown |
| `enable()` / `disable()` | `void` | Toggle state |
| `destroy()` | `void` | Remove from DOM |

## Manual Input

Accepts ISO 8601 (`PT4H30M`) or shorthand (`4h 30m`).

## Dependencies

- Bootstrap 5 CSS, Bootstrap Icons, Enterprise Theme CSS


---

<a id="editablecombobox"></a>

# EditableComboBox

A combined text input and dropdown list component built on Bootstrap 5. Users can type free text or select a value from a filterable dropdown.

## Purpose and Use Cases

- Searchable selectors with large option lists
- Fields where users may type a custom value or pick from suggestions
- Tag entry with auto-complete suggestions
- Country, region, or status selectors

## Quick Start

### Script Tag

```html
<!-- Dependencies -->
<link rel="stylesheet" href="dist/css/custom.css">
<link rel="stylesheet" href="dist/icons/bootstrap-icons.css">
<link rel="stylesheet" href="dist/components/editablecombobox/editablecombobox.css">

<!-- Component -->
<div id="my-combo"></div>
<script src="dist/components/editablecombobox/editablecombobox.js"></script>
<script>
    createEditableComboBox("my-combo", {
        items: [
            { label: "Apple" },
            { label: "Banana" },
            { label: "Cherry" }
        ],
        placeholder: "Pick a fruit..."
    });
</script>
```

### ES Module

```js
import { createEditableComboBox } from "./dist/components/editablecombobox/editablecombobox.js";

const combo = createEditableComboBox("my-combo", {
    items: [{ label: "Red" }, { label: "Green" }, { label: "Blue" }],
    onSelect: (item) => console.log("Selected:", item.label)
});
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `items` | `ComboBoxItem[]` | Required | The items to display in the dropdown |
| `placeholder` | `string` | `undefined` | Placeholder text for the input |
| `value` | `string` | `undefined` | Initial input value |
| `restrictToItems` | `boolean` | `false` | When true, only list values are accepted |
| `maxVisibleItems` | `number` | `8` | Max visible items before scrolling |
| `minFilterLength` | `number` | `0` | Min characters before filtering starts |
| `disabled` | `boolean` | `false` | Disables the component |
| `readonly` | `boolean` | `false` | Makes input non-editable; dropdown still works |
| `size` | `"sm" \| "default" \| "lg"` | `"default"` | Size variant |
| `filterFn` | `function` | Substring match | Custom filter function |
| `onSelect` | `function` | `undefined` | Called when an item is selected |
| `onChange` | `function` | `undefined` | Called when input value changes |
| `onOpen` | `function` | `undefined` | Called when dropdown opens |
| `onClose` | `function` | `undefined` | Called when dropdown closes |

### ComboBoxItem

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `label` | `string` | Required | Display text |
| `value` | `string` | `undefined` | Programmatic value (distinct from label) |
| `disabled` | `boolean` | `false` | Item is visible but not selectable |
| `group` | `string` | `undefined` | Group header under which the item appears |

## Instance Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getValue()` | `string` | Current input text |
| `getSelectedItem()` | `ComboBoxItem \| null` | Selected item, or null for free text |
| `setValue(value)` | `void` | Set input value programmatically |
| `setItems(items)` | `void` | Replace the dropdown items |
| `open()` | `void` | Open the dropdown |
| `close()` | `void` | Close the dropdown |
| `enable()` | `void` | Enable the component |
| `disable()` | `void` | Disable the component |
| `destroy()` | `void` | Remove from DOM and clean up |

## Keyboard Interactions

| Key | Closed | Open |
|-----|--------|------|
| ArrowDown | Opens, highlights first | Highlights next |
| ArrowUp | Opens, highlights last | Highlights previous |
| Enter | No effect | Selects highlighted item |
| Escape | No effect | Closes dropdown |
| Tab | Normal tab | Commits highlight, moves focus |
| Home/End | Cursor in input | First/last item |
| PageUp/Down | No effect | Scroll by 10 items |

## Accessibility

- Implements the WAI-ARIA Combobox pattern
- `role="combobox"` on the input with `aria-expanded`, `aria-controls`, `aria-activedescendant`
- `role="listbox"` on the dropdown, `role="option"` on each item
- Focus stays on the input; items are highlighted via `aria-activedescendant`
- "No matches" message uses `role="status"` for screen reader announcement

## Dependencies

| Dependency | Required | Notes |
|------------|----------|-------|
| Bootstrap 5 CSS | Yes | For `input-group`, `form-control`, `btn` |
| Bootstrap 5 JS | No | Not used by this component |
| Bootstrap Icons | Yes | For `bi-chevron-down` |
| Enterprise Theme CSS | Yes | For theme variable overrides |


---

<a id="errordialog"></a>

# ErrorDialog Component

A Bootstrap 5 modal that displays literate error messages with user-friendly narrative and collapsible technical details.

## Dependencies

- Bootstrap 5 JS (Modal API) — loaded as a global script
- Bootstrap Icons CSS — for header and UI icons
- Enterprise theme CSS — `dist/css/custom.css`
- Component CSS — `dist/components/errordialog/errordialog.css`

## Quick Start

```html
<!-- In your HTML head -->
<link rel="stylesheet" href="dist/css/custom.css">
<link rel="stylesheet" href="dist/icons/bootstrap-icons.css">
<link rel="stylesheet" href="dist/components/errordialog/errordialog.css">

<!-- Container where modals will be injected -->
<div id="error-dialog-container"></div>

<!-- Scripts -->
<script src="dist/js/bootstrap.bundle.min.js"></script>
<script src="dist/components/errordialog/errordialog.js"></script>
<script>
    showErrorDialog("error-dialog-container", {
        title: "Document Could Not Be Saved",
        message: "The server rejected the save request.",
        suggestion: "Please try again in a moment.",
        errorCode: "DOC_SAVE_FAILED",
        correlationId: "a1b2c3d4-e5f6-7890"
    });
</script>
```

## LiterateError Interface

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | `string` | Yes | Short, non-alarming summary |
| `message` | `string` | Yes | Full sentence in plain language |
| `suggestion` | `string` | No | Actionable advice for the user |
| `errorCode` | `string` | No | Unique, searchable error code |
| `correlationId` | `string` | No | UUID linking to backend logs |
| `timestamp` | `string` | No | UTC timestamp of the error |
| `technicalDetail` | `string` | No | Stack trace, API response, etc. |
| `context` | `Record<string, string>` | No | Key-value pairs of system state |
| `onRetry` | `() => void` | No | Callback for the Retry button |

## API

### Class: `ErrorDialog`

```js
const dialog = new ErrorDialog("container-id");
dialog.show({ title: "Error", message: "Something went wrong." });
dialog.hide();
dialog.destroy();
```

- `show(error)` — Builds and displays the modal
- `hide()` — Hides the modal (triggers cleanup)
- `destroy()` — Removes the modal element from the DOM

### Function: `showErrorDialog(containerId, error)`

One-liner convenience function. Creates an `ErrorDialog` instance and immediately shows it.

## Features

- **Danger header** — Red header strip with exclamation icon
- **Suggestion box** — Light alert with lightbulb icon (only when suggestion provided)
- **Technical accordion** — Collapsible section with error code, correlation ID, timestamp, context, and stack trace
- **Copy to clipboard** — Copies all technical details with visual feedback
- **Retry button** — Shown only when `onRetry` callback is provided
- **XSS safe** — All content set via `textContent`, never `innerHTML`
- **Auto-cleanup** — Modal DOM is removed when dismissed

## Accessibility

- Modal uses `aria-labelledby` pointing to the title
- Close button has `aria-label="Close"`
- Suggestion box has `role="alert"`
- Tab navigation works across all focusable elements
- Escape key closes the modal


---

<a id="gauge"></a>

# Gauge

A visual measure component modeled after the ASN.1 Gauge type. Displays a value on a scale with configurable colour thresholds. Supports three shapes (tile, ring, bar) and two modes (value, time countdown).

## Features

- **Three shapes** — square tile, circular ring (SVG), horizontal/vertical bar
- **Value mode** — numeric value with min/max/units (e.g., storage, licenses, CPU)
- **Time mode** — countdown to a target date with auto-tick and overdue state
- **Configurable thresholds** — colour changes at user-defined percentage boundaries
- **Over-limit / Overdue** — distinct colour and label when value exceeds max or time passes
- **Fluid or explicit sizing** — fills parent container or uses preset/pixel sizes
- **Custom formatting** — provide a `formatValue` callback for custom display
- **Full accessibility** — `role="meter"` / `role="timer"`, ARIA value attributes, descriptive labels

## Assets

| Asset | Path |
|-------|------|
| CSS | `dist/components/gauge/gauge.css` |
| JS | `dist/components/gauge/gauge.js` |
| Types | `dist/components/gauge/gauge.d.ts` |

**Requires:** Bootstrap CSS (for SCSS variables). Does **not** require Bootstrap JS or Bootstrap Icons.

## Quick Start

```html
<link rel="stylesheet" href="dist/components/gauge/gauge.css">
<script src="dist/components/gauge/gauge.js"></script>
<script>
    // Value tile
    var storage = createTileGauge({
        mode: "value",
        title: "Storage",
        value: 50,
        max: 100,
        unit: "GiB"
    }, "my-container");

    // Countdown ring
    var deadline = createRingGauge({
        mode: "time",
        title: "Sprint End",
        targetDate: new Date("2026-03-01"),
        max: 30 * 86400000  // 30 days in ms
    }, "timer-container");
</script>
```

## API

### Constructor

```typescript
const gauge = new Gauge(options: GaugeOptions);
```

Creates the gauge DOM but does not attach to the page.

### GaugeOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `shape` | `"tile" \| "ring" \| "bar"` | required | Visual shape |
| `mode` | `"value" \| "time"` | `"value"` | Data mode |
| `value` | `number` | `0` | Current value (value mode) |
| `min` | `number` | `0` | Minimum value |
| `max` | `number` | `100` | Maximum value |
| `unit` | `string` | — | Unit label (e.g., "GiB") |
| `targetDate` | `Date \| string` | — | Countdown target (time mode) |
| `autoTick` | `boolean` | `true` | Enable auto-tick timer (time mode) |
| `title` | `string` | — | Gauge title/name |
| `subtitle` | `string` | — | Subtitle text (auto-generated if omitted) |
| `size` | `GaugeSize \| number` | fluid | Predefined or pixel size |
| `orientation` | `"horizontal" \| "vertical"` | `"horizontal"` | Bar orientation |
| `thresholds` | `GaugeThreshold[]` | 70/30/10/0% | Colour thresholds |
| `invertThresholds` | `boolean` | `false` | Lower % = worse |
| `overLimitColor` | `string` | `"#dc3545"` | Over-limit colour |
| `overLimitLabel` | `string` | `"Over Limit"` | Over-limit text |
| `overdueColor` | `string` | `"#dc3545"` | Overdue colour |
| `overdueLabel` | `string` | `"Overdue"` | Overdue text |
| `formatValue` | `function` | — | Custom value formatter |
| `cssClass` | `string` | — | Additional CSS classes |
| `ariaLabel` | `string` | auto | Screen reader label |
| `onChange` | `function` | — | Fires on value change |
| `onOverLimit` | `function` | — | Fires when over-limit state entered |
| `onOverdue` | `function` | — | Fires when overdue state entered |

### Methods

| Method | Description |
|--------|-------------|
| `show(container?)` | Appends to container (ID string or HTMLElement) |
| `hide()` | Removes from DOM without destroying |
| `destroy()` | Hides, releases all references and timers |
| `setValue(value)` | Updates value and refreshes display |
| `setTargetDate(date)` | Updates target date and restarts auto-tick |
| `setThresholds(thresholds)` | Replaces threshold configuration |
| `getValue()` | Returns current value |
| `getPercentage()` | Returns current percentage |
| `isOverLimit()` | Returns true if value exceeds max |
| `isOverdue()` | Returns true if target date has passed |
| `isVisible()` | Returns visibility state |
| `getElement()` | Returns the root DOM element |

### Convenience Functions

```typescript
createGauge(options, container?)        // Create, show, and return
createTileGauge(options, container?)    // Shorthand for tile shape
createRingGauge(options, container?)    // Shorthand for ring shape
createBarGauge(options, container?)     // Shorthand for bar shape
```

### Global Exports

```
window.Gauge
window.createGauge
window.createTileGauge
window.createRingGauge
window.createBarGauge
```

## Shapes

### Tile

Square card with large value text on a coloured background. Best for dashboard KPI tiles.

### Ring

Circular SVG arc that fills based on percentage. Value displayed in the centre. Best for utilisation metrics.

### Bar

Horizontal or vertical bar with percentage fill. Best for inline progress/quota indicators.

## Threshold Configuration

Thresholds define colour boundaries based on percentage:

```javascript
createTileGauge({
    mode: "value",
    value: 75,
    max: 100,
    thresholds: [
        { value: 70, color: "#2b8a3e", label: "Good" },
        { value: 30, color: "#e67700", label: "Warning" },
        { value: 10, color: "#d9480f", label: "Danger" },
        { value: 0,  color: "#c92a2a", label: "Critical" }
    ]
}, "container");
```

For "remaining" scenarios where lower is worse, use `invertThresholds: true`.

## Size Variants

| Size | Pixels |
|------|--------|
| `"xs"` | 80px |
| `"sm"` | 120px |
| `"md"` | 180px |
| `"lg"` | 260px |
| `"xl"` | 360px |

Omit `size` for fluid mode — the gauge fills its parent container with `aspect-ratio: 1` (tile/ring) and scales typography via CSS container queries.

## Keyboard Accessibility

| Key | Action |
|-----|--------|
| Tab | Focus gauge element |

Gauge elements use `role="meter"` (value mode) or `role="timer"` (time mode) with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, and `aria-label` attributes.

See `specs/gauge.prd.md` for the complete specification.


---

<a id="markdowneditor"></a>

# MarkdownEditor

A Bootstrap 5-themed Markdown editor wrapper around [Vditor](https://github.com/Vanessa219/vditor) with tab/side-by-side layout modes, collapsible panes, inline selection toolbar, export, and optional modal hosting.

## Dependencies

This component requires external libraries loaded before the component script:

```html
<!-- Vditor (>= 3.8.13 required for security fixes; 3.11.2 recommended) -->
<link rel="stylesheet" href="https://unpkg.com/vditor@3.11.2/dist/index.css" />
<script src="https://unpkg.com/vditor@3.11.2/dist/index.min.js"></script>

<!-- DOMPurify (strongly recommended for XSS protection) -->
<script src="https://unpkg.com/dompurify@3.2.4/dist/purify.min.js"></script>

<!-- Component CSS + JS -->
<link rel="stylesheet" href="dist/components/markdowneditor/markdowneditor.css">
<script src="dist/components/markdowneditor/markdowneditor.js"></script>
```

## Quick Start

```html
<div id="my-editor"></div>
<script>
    var editor = createMarkdownEditor("my-editor", {
        title: "My Document",
        value: "# Hello World\n\nStart writing...",
        onChange: function(value) { console.log("Content changed"); }
    });
</script>
```

## Modal Usage

```html
<script>
    showMarkdownEditorModal({
        modalTitle: "Edit Description",
        value: existingMarkdown,
        onSave: function(value) {
            console.log("Saved:", value);
        },
        onClose: function(value) {
            // value is null if cancelled
            if (value !== null) {
                console.log("Closed with content");
            }
        }
    });
</script>
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `value` | `string` | `""` | Initial markdown content |
| `mode` | `"tabs" \| "sidebyside"` | `"tabs"` | Layout mode |
| `editable` | `boolean` | `true` | Readwrite (true) or readonly (false). When false, the toolbar is hidden and the Preview tab is shown by default |
| `title` | `string` | — | Header bar title |
| `height` | `string` | `"70vh"` | Component height (CSS value) |
| `width` | `string` | `"100%"` | Component width (CSS value) |
| `minHeight` | `number` | `300` | Minimum height in pixels |
| `minWidth` | `number` | `400` | Minimum width in pixels |
| `showExport` | `boolean` | `true` | Show export dropdown |
| `showFullscreen` | `boolean` | `true` | Show fullscreen toggle |
| `showInlineToolbar` | `boolean` | `true` | Show inline formatting toolbar on selection |
| `showCounter` | `boolean` | `false` | Show character counter |
| `placeholder` | `string` | — | Placeholder text |
| `vditorMode` | `"ir" \| "wysiwyg" \| "sv"` | `"ir"` | Vditor editing mode |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Size variant |
| `disabled` | `boolean` | `false` | Disabled state |
| `toolbar` | `string[]` | Default set | Custom Vditor toolbar items |
| `vditorOptions` | `object` | — | Custom Vditor options (merged) |
| `onChange` | `(value: string) => void` | — | Content changed |
| `onReady` | `() => void` | — | Editor ready |
| `onSave` | `(value: string) => void` | — | Save triggered (Ctrl+Enter) |
| `onModeChange` | `(mode: string) => void` | — | Layout mode switched |

## Modal Options

Extends all options above plus:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `modalTitle` | `string` | `"Edit Markdown"` | Modal title |
| `showSave` | `boolean` | `true` | Show Save button |
| `saveLabel` | `string` | `"Save"` | Save button text |
| `cancelLabel` | `string` | `"Cancel"` | Cancel button text |
| `onClose` | `(value: string \| null) => void` | — | Modal closed (null if cancelled) |

The modal dialog is horizontally resizable — drag the right edge to adjust width (min 480 px, max 95 vw).

## Public API

| Method | Returns | Description |
|--------|---------|-------------|
| `getValue()` | `string` | Get current markdown |
| `setValue(md)` | `void` | Set markdown content |
| `getHTML()` | `string` | Get sanitised rendered HTML |
| `setMode(mode)` | `void` | Switch layout mode |
| `setEditable(bool)` | `void` | Switch readonly/readwrite |
| `setTitle(title)` | `void` | Update header title |
| `exportMarkdown()` | `void` | Download as .md file |
| `exportHTML()` | `void` | Download as .html file |
| `exportPDF()` | `void` | Open print dialog (Save as PDF) |
| `focus()` | `void` | Focus the editor |
| `enable()` | `void` | Enable the editor |
| `disable()` | `void` | Disable the editor |
| `destroy()` | `void` | Remove component and clean up |

## Supported Markdown Features

Via Vditor, the editor supports:

- **GFM**: Headings, bold, italic, strikethrough, lists, task lists, tables, blockquotes, code blocks, inline code, horizontal rules, images, links
- **Extended**: Footnotes, superscript (`^text^`), subscript (`~text~`), mark (`==text==`), table of contents
- **Diagrams**: MermaidJS, Graphviz (DOT), PlantUML (rendered inline)
- **Syntax highlighting**: 170+ languages in fenced code blocks
- **Math**: LaTeX formulas via KaTeX

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl/Cmd + B | Bold |
| Ctrl/Cmd + I | Italic |
| Ctrl/Cmd + U | Underline |
| Ctrl/Cmd + D | Strikethrough |
| Ctrl/Cmd + Z | Undo |
| Ctrl/Cmd + Shift + Z | Redo |
| Ctrl/Cmd + K | Insert link |
| Ctrl/Cmd + Enter | Save (triggers onSave) |
| Escape | Close inline toolbar / Exit fullscreen |

## Security

**Important:** This component requires security-conscious deployment.

1. **Vditor version**: Always use >= 3.8.13 (fixes CVE-2022-0341, CVE-2022-0350, CVE-2021-4103, CVE-2021-32855). Pin the version in production.
2. **DOMPurify**: Always load DOMPurify alongside this component. All HTML output is sanitised through DOMPurify before DOM insertion or export.
3. **Content-Security-Policy**: Configure CSP headers to restrict `script-src` to trusted CDN domains only.
4. **SRI hashes**: Use Subresource Integrity attributes on CDN `<script>` and `<link>` tags in production.
5. **`getHTML()` is safe**: The public `getHTML()` method returns sanitised HTML. If you bypass the component and call Vditor's `getHTML()` directly, you must sanitise the output yourself.

## Window Globals

| Global | Type |
|--------|------|
| `window.MarkdownEditor` | `class` |
| `window.createMarkdownEditor` | `function(containerId, options): MarkdownEditor` |
| `window.showMarkdownEditorModal` | `function(options): MarkdownEditor` |


---

<a id="progressmodal"></a>

# ProgressModal

A modal dialog for displaying progress of long-running operations.

## Quick Start

```html
<link rel="stylesheet" href="https://static.knobby.io/components/progressmodal/progressmodal.css">
<script src="https://static.knobby.io/components/progressmodal/progressmodal.js"></script>

<script>
    // Indeterminate spinner
    var modal = showProgressModal({ title: "Processing..." });
    modal.logInfo("Starting operation...");
    modal.setStatus("Connecting...");
    // ... later
    modal.logSuccess("Done!");
    modal.complete("Operation finished.");

    // Stepped progress
    var stepped = showSteppedProgressModal("Uploading", 5);
    stepped.setStep(1);
    stepped.logInfo("Uploading file 1...");
    // ... later
    stepped.setStep(5);
    stepped.complete();
</script>
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `title` | `string` | Required | Modal title |
| `mode` | `"indeterminate" \| "determinate"` | `"indeterminate"` | Progress mode |
| `statusText` | `string` | — | Initial status message |
| `totalSteps` | `number` | — | Total steps (enables step counter) |
| `showTimestamps` | `boolean` | `true` | Timestamps in log |
| `showDetailLog` | `boolean` | `true` | Show scrollable log |
| `showCopyLog` | `boolean` | `true` | Copy log button |
| `autoClose` | `number` | `0` | Auto-close delay (ms) on success |
| `allowBackdropClose` | `boolean` | `false` | Backdrop dismissible when done |
| `wide` | `boolean` | `false` | Wide layout |
| `onCancel` | `() => void` | — | Cancel callback (shows button) |
| `onRetry` | `() => void` | — | Retry callback (shows on error) |
| `onClose` | `() => void` | — | Close callback |

## Instance Methods

| Method | Description |
|--------|-------------|
| `show()` | Show the modal |
| `setStatus(text)` | Update status text |
| `setProgress(0.0–1.0)` | Set progress (switches to determinate) |
| `setStep(n)` | Set current step (calculates %) |
| `setIndeterminate()` | Switch to spinner mode |
| `log(entry)` | Add log entry |
| `logInfo(msg)` | Add info entry |
| `logSuccess(msg)` | Add success entry |
| `logError(msg)` | Add error entry |
| `logWarning(msg)` | Add warning entry |
| `complete(msg?)` | Mark as complete |
| `fail(msg?)` | Mark as failed |
| `close()` | Close (after complete/fail) |
| `getLog()` | Get all entries |
| `getLogText()` | Get log as text |
| `getState()` | "running" / "completed" / "failed" / "closed" |
| `isVisible()` | Check visibility |
| `destroy()` | Remove from DOM |

## Log Entry Levels

| Level | Icon | Colour |
|-------|------|--------|
| `info` | `bi-info-circle` | Default |
| `success` | `bi-check-circle-fill` | Green |
| `error` | `bi-x-circle-fill` | Red |
| `warning` | `bi-exclamation-triangle-fill` | Yellow |
| `progress` | Mini spinner | Primary |

## Dependencies

- Bootstrap 5 CSS, Bootstrap Icons, Enterprise Theme CSS
- Does NOT require Bootstrap JS


---

<a id="sidebar"></a>

# Sidebar

A dockable, floatable, resizable sidebar panel component that acts as a container for other components. Supports docking to left/right viewport edges, free-positioned floating with drag-based positioning, collapsing to a 40px icon strip, resizing via drag handles, tab grouping when multiple sidebars share the same dock edge, and drag-to-dock with visual drop zones.

## Assets

| Asset | Path |
|-------|------|
| CSS | `dist/components/sidebar/sidebar.css` |
| JS | `dist/components/sidebar/sidebar.js` |
| Types | `dist/components/sidebar/sidebar.d.ts` |

## Requirements

- **Bootstrap CSS** — for SCSS variables (`$gray-*`, `$font-size-*`, etc.)
- **Bootstrap Icons CSS** — for title bar action icons and optional sidebar icon
- Does **not** require Bootstrap JS.

## Usage (Script Tag)

```html
<link rel="stylesheet" href="dist/components/sidebar/sidebar.css">
<script src="dist/components/sidebar/sidebar.js"></script>
<script>
    // Docked sidebar
    var explorer = createDockedSidebar({
        title: "Explorer",
        icon: "bi-folder",
        dockPosition: "left",
        width: 280
    });
    explorer.getContentElement().innerHTML = "<p style='padding:1rem'>Content here</p>";

    // Floating sidebar
    var tools = createFloatingSidebar({
        title: "Tools",
        icon: "bi-tools",
        floatX: 400,
        floatY: 100,
        width: 300,
        height: 400
    });
</script>
```

## Usage (ES Module)

```js
import { createSidebar, createDockedSidebar } from "./dist/components/sidebar/sidebar.js";

const sb = createDockedSidebar({
    title: "Explorer",
    icon: "bi-folder",
    dockPosition: "left",
    onModeChange: (mode, sidebar) => console.log("Mode:", mode),
    onResize: (w, h) => console.log("Resized:", w, h)
});
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | `string` | auto | Unique identifier |
| `title` | `string` | **required** | Title bar text |
| `icon` | `string` | — | Bootstrap Icons class (e.g., `"bi-folder"`) |
| `mode` | `"docked" \| "floating"` | `"docked"` | Initial mode |
| `dockPosition` | `"left" \| "right"` | `"left"` | Dock edge |
| `width` | `number` | `280` | Panel width in pixels |
| `minWidth` | `number` | `180` | Minimum resize width |
| `maxWidth` | `number` | `600` | Maximum resize width |
| `height` | `number` | `400` | Floating height in pixels |
| `minHeight` | `number` | `200` | Minimum floating height |
| `maxHeight` | `number` | `800` | Maximum floating height |
| `floatX` | `number` | `100` | Initial floating X position |
| `floatY` | `number` | `100` | Initial floating Y position |
| `collapsed` | `boolean` | `false` | Start collapsed |
| `collapsedWidth` | `number` | `40` | Width when collapsed |
| `backgroundColor` | `string` | — | CSS background colour override |
| `opacity` | `number` | — | Opacity (0-1) |
| `borderColor` | `string` | — | CSS border colour override |
| `borderWidth` | `string` | — | CSS border width override |
| `zIndex` | `number` | — | CSS z-index override |
| `cssClass` | `string` | — | Additional CSS classes |
| `resizable` | `boolean` | `true` | Enable resize handles |
| `draggable` | `boolean` | `true` | Enable floating drag |
| `collapsible` | `boolean` | `true` | Enable collapse |
| `showTitleBar` | `boolean` | `true` | Show title bar |
| `onModeChange` | `function` | — | Mode change callback |
| `onResize` | `function` | — | Resize complete callback |
| `onCollapseToggle` | `function` | — | Collapse toggle callback |
| `onBeforeClose` | `function` | — | Before close callback (return false to cancel) |
| `onClose` | `function` | — | After close callback |

## API

### Sidebar

| Method | Returns | Description |
|--------|---------|-------------|
| `show()` | `void` | Append to DOM and register |
| `hide()` | `void` | Remove from DOM (preserves state) |
| `destroy()` | `void` | Hide, unregister, and release references |
| `dock(position)` | `void` | Switch to docked mode |
| `float(x?, y?)` | `void` | Switch to floating mode |
| `collapse()` | `void` | Collapse to icon strip |
| `expand()` | `void` | Expand from collapsed |
| `toggleCollapse()` | `void` | Toggle collapse state |
| `setTitle(title)` | `void` | Update title text |
| `setIcon(iconClass)` | `void` | Update title icon |
| `setWidth(w)` | `void` | Set width (clamped) |
| `setHeight(h)` | `void` | Set height (clamped, floating only) |
| `getContentElement()` | `HTMLElement` | Content div for appending children |
| `getMode()` | `string` | Current mode |
| `getDockPosition()` | `string` | Current dock position |
| `getWidth()` | `number` | Current width |
| `getHeight()` | `number` | Current height |
| `isVisible()` | `boolean` | Whether sidebar is in the DOM |
| `isCollapsed()` | `boolean` | Whether sidebar is collapsed |

### SidebarManager

| Method | Returns | Description |
|--------|---------|-------------|
| `getInstance()` | `SidebarManager` | Singleton accessor |
| `register(sidebar)` | `void` | Register for tab grouping |
| `unregister(sidebar)` | `void` | Remove from management |
| `getSidebars(position?)` | `Sidebar[]` | Query registered sidebars |
| `getActiveTab(position)` | `Sidebar` | Active sidebar at a dock position |
| `setActiveTab(sidebar)` | `void` | Activate a specific tab |

### Convenience Functions

| Function | Description |
|----------|-------------|
| `createSidebar(options)` | Create and show a sidebar |
| `createDockedSidebar(options)` | Create a docked sidebar (mode defaults to "docked") |
| `createFloatingSidebar(options)` | Create a floating sidebar (mode defaults to "floating") |

## CSS Custom Properties

The component sets these properties on `<html>` for layout integration:

| Property | Description |
|----------|-------------|
| `--sidebar-left-width` | Total width of docked left sidebar(s) |
| `--sidebar-right-width` | Total width of docked right sidebar(s) |

Consumers can offset main content with:

```css
.main-content {
    margin-left: var(--sidebar-left-width, 0px);
    margin-right: var(--sidebar-right-width, 0px);
}
```

## Tab Grouping

When multiple sidebars dock to the same edge, they automatically form a tab group. Only one sidebar is visible at a time; the others are hidden. A tab bar appears at the top of the dock zone.

## Drag-to-Dock

In floating mode, dragging the sidebar near a viewport edge (within 40px) shows a translucent drop-zone indicator. Releasing within the zone docks the sidebar to that edge.

## Z-Index Layering

| Element | Z-Index |
|---------|---------|
| Docked sidebar | 1035 |
| Floating sidebar | 1036 |
| Drop zone overlays | 1037 |
| StatusBar | 1040 |
| Bootstrap modals | 1050+ |

## Accessibility

- Root: `role="complementary"` with descriptive `aria-label`
- Title bar: `role="heading"` with `aria-level="2"`
- Collapse button: `aria-expanded="true|false"`
- Tab bar: `role="tablist"`, tabs: `role="tab"` + `aria-selected`
- Resize handle: `role="separator"`, `aria-valuenow/min/max`, arrow keys (10px steps)
- Collapsed strip: keyboard-accessible (Enter/Space to expand)
- No focus trapping (persistent panel, not modal)


---

<a id="statusbar"></a>

# StatusBar

A fixed-to-bottom viewport status bar with configurable label/value regions separated by pipe dividers. Text is natively selectable for Ctrl+C copying.

## Quick Start

```html
<link rel="stylesheet" href="https://static.knobby.io/components/statusbar/statusbar.css">
<script src="https://static.knobby.io/components/statusbar/statusbar.js"></script>

<script>
    var bar = createStatusBar({
        regions: [
            { id: "status", icon: "bi-circle-fill", value: "Connected" },
            { id: "env", label: "Environment:", value: "Production" },
            { id: "user", label: "User:", value: "jsmith" },
            { id: "version", value: "v2.4.1" }
        ]
    });

    // Update a value dynamically
    bar.setValue("user", "adoe");

    // Read a value
    var user = bar.getValue("user"); // "adoe"

    // Get all text (including dividers)
    var text = bar.getAllText();
    // "Connected | Environment: Production | User: adoe | v2.4.1"
</script>
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `regions` | `StatusBarRegion[]` | Required | Regions to display |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Height variant (24/28/34px) |
| `backgroundColor` | `string` | `$gray-800` | Background colour |
| `textColor` | `string` | `$gray-300` | Text colour |
| `labelColor` | `string` | `$gray-400` | Label colour |
| `fontSize` | `string` | — | Font size override |
| `zIndex` | `number` | `1040` | CSS z-index |
| `cssClass` | `string` | — | Additional CSS class(es) |
| `showDividers` | `boolean` | `true` | Show pipe dividers |
| `dividerChar` | `string` | `"\|"` | Divider character |

## Region Definition

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Required. Unique identifier |
| `label` | `string` | Optional semi-bold label |
| `value` | `string` | Optional value text |
| `icon` | `string` | Optional Bootstrap Icons class (e.g., `"bi-circle-fill"`) |
| `minWidth` | `string` | Optional minimum width (CSS value) |

## Instance Methods

| Method | Description |
|--------|-------------|
| `show()` | Append to body, set `--statusbar-height` |
| `hide()` | Remove from DOM, clear CSS property |
| `destroy()` | Hide and release all references |
| `setValue(id, value)` | Update region value text |
| `getValue(id)` | Get region value text |
| `setIcon(id, cls)` | Update region icon class |
| `getAllText()` | Get full bar text with dividers |
| `addRegion(region, index?)` | Add a region dynamically |
| `removeRegion(id)` | Remove a region by ID |
| `isVisible()` | Check visibility state |

## Size Variants

| Size | Height | Font Size |
|------|--------|-----------|
| `sm` | 24px | ~11.5px |
| `md` | 28px | 12.25px |
| `lg` | 34px | 14px (base) |

## CSS Custom Property

When visible, the bar sets `--statusbar-height` on `<html>`. Other components can use:

```css
.my-fixed-element {
    bottom: var(--statusbar-height, 0px);
}
```

## Accessibility

- `role="status"` with `aria-live="polite"` for screen reader announcements.
- No `user-select: none` — all text is natively selectable.
- Light text on dark background meets WCAG AA contrast requirements.

## Dependencies

- Bootstrap 5 CSS (for SCSS variables), Bootstrap Icons (optional), Enterprise Theme CSS.
- Does NOT require Bootstrap JS.


---

<a id="timeline"></a>

# Timeline

A horizontal event timeline component for displaying point and span events along a time axis. Supports grouped rows, collapsible sections, viewport panning, a "now" marker, and item selection.

## Features

- **Point and span events** -- circular markers for moments; horizontal bars for durations
- **Grouped rows** -- organise items into labelled, sortable groups
- **Collapsible groups** -- expand or collapse groups to manage visual density
- **Viewport control** -- set, pan, and query the visible date range programmatically
- **Now marker** -- optional vertical line indicating the current time
- **Item selection** -- click or programmatic selection with change callbacks
- **Size variants** -- small, medium, and large density presets (`sm`, `md`, `lg`)
- **Scrollable rows** -- vertical scroll after a configurable maximum row count
- **Full keyboard accessibility** -- ARIA roles, roving tabindex, keyboard navigation
- **Security** -- all user-supplied text rendered via `textContent`; no `innerHTML`

## Assets

| Asset | Path | Description |
|-------|------|-------------|
| TypeScript source | `components/timeline/timeline.ts` | Component source code |
| Compiled JS | `dist/components/timeline/timeline.js` | IIFE-wrapped JavaScript |
| Type declarations | `dist/components/timeline/timeline.d.ts` | TypeScript declaration file |
| SCSS source | `components/timeline/timeline.scss` | Component styles |
| Compiled CSS | `dist/components/timeline/timeline.css` | Compiled stylesheet |

**Requires:** Bootstrap CSS (for SCSS variables). Does **not** require Bootstrap JS or Bootstrap Icons.

## Quick Start

```html
<link rel="stylesheet" href="dist/components/timeline/timeline.css">
<script src="dist/components/timeline/timeline.js"></script>

<div id="my-timeline"></div>

<script>
    var timeline = createTimeline({
        containerId: "my-timeline",
        start: new Date("2026-01-01"),
        end: new Date("2026-12-31"),
        items: [
            {
                id: "release-1",
                type: "point",
                start: new Date("2026-03-15"),
                label: "v2.0 Release"
            },
            {
                id: "sprint-4",
                type: "span",
                start: new Date("2026-04-01"),
                end: new Date("2026-04-14"),
                label: "Sprint 4",
                color: "#2b8a3e"
            }
        ],
        onItemClick: function(item) { console.log("Clicked:", item.id); }
    });
</script>
```

## API Reference

### 5.1 Types

```typescript
type TimelineItemType = "point" | "span";
type TimelineSize = "sm" | "md" | "lg";
```

### 5.2 TimelineItem Interface

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | `string` | Yes | -- | Unique identifier for the item |
| `type` | `TimelineItemType` | Yes | -- | `"point"` for a single moment or `"span"` for a duration |
| `start` | `Date` | Yes | -- | Start date and time |
| `end` | `Date` | For spans | -- | End date and time (required when `type` is `"span"`) |
| `label` | `string` | Yes | -- | Display label rendered on or beside the item |
| `tooltip` | `string` | No | -- | Native browser tooltip via the `title` attribute |
| `color` | `string` | No | `"#0d6efd"` | CSS colour applied to the item |
| `cssClass` | `string` | No | -- | Additional CSS class added to the item element |
| `group` | `string` | No | -- | Group ID that this item belongs to |
| `data` | `unknown` | No | -- | Arbitrary user data passed through to callbacks |

### 5.3 TimelineGroup Interface

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | `string` | Yes | -- | Unique group identifier |
| `label` | `string` | Yes | -- | Display label shown in the group label column |
| `collapsible` | `boolean` | No | `true` | Whether the group can be collapsed |
| `collapsed` | `boolean` | No | `false` | Whether the group is initially collapsed |
| `order` | `number` | No | `0` | Sort order; lower values appear first |
| `cssClass` | `string` | No | -- | Additional CSS class on the group row |

### 5.4 TimelineOptions Interface

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `containerId` | `string` | Yes | -- | DOM container element ID |
| `start` | `Date` | Yes | -- | Viewport start date |
| `end` | `Date` | Yes | -- | Viewport end date |
| `items` | `TimelineItem[]` | No | `[]` | Initial items |
| `groups` | `TimelineGroup[]` | No | `[]` | Group definitions |
| `maxVisibleRows` | `number` | No | `8` | Max rows before scroll |
| `showHeader` | `boolean` | No | `true` | Show time axis header |
| `showGroupLabels` | `boolean` | No | `true` | Show group label column |
| `showNowMarker` | `boolean` | No | `false` | Show "now" marker line |
| `pointSize` | `number` | No | `10` | Point marker diameter (px) |
| `spanHeight` | `number` | No | `24` | Span bar height (px) |
| `rowGap` | `number` | No | `4` | Vertical row gap (px) |
| `groupLabelWidth` | `number` | No | `120` | Label column width (px) |
| `collapsedBandHeight` | `number` | No | `6` | Collapsed band height (px) |
| `collapsedBandColor` | `string` | No | `"#adb5bd"` | Collapsed band colour |
| `size` | `TimelineSize` | No | `"md"` | Density variant |
| `height` | `string` | No | -- | CSS height (e.g., `"400px"`) |
| `width` | `string` | No | `"100%"` | CSS width |
| `cssClass` | `string` | No | -- | Extra CSS class on root |
| `selectedItemId` | `string` | No | `null` | Initially selected item ID |
| `disabled` | `boolean` | No | `false` | Disable all interactions |
| `onItemClick` | `(item) => void` | No | -- | Item click callback |
| `onItemSelect` | `(item \| null) => void` | No | -- | Selection change callback |
| `onItemVisible` | `(items[]) => void` | No | -- | Visible items change callback |
| `onViewportChange` | `(start, end) => void` | No | -- | Viewport change callback |
| `onGroupToggle` | `(group, collapsed) => void` | No | -- | Group toggle callback |

### 5.5 Methods

**Item API**

| Method | Description |
|--------|-------------|
| `addItem(item)` | Add a single item and re-render. |
| `addItems(items)` | Add multiple items in one batch. |
| `removeItem(id)` | Remove an item by ID. |
| `updateItem(item)` | Replace item matching `item.id`. |
| `getItems()` | Return a copy of all items. |

**Selection API**

| Method | Description |
|--------|-------------|
| `selectItem(id)` | Select by ID, or pass `null` to clear. |
| `getSelectedItem()` | Return selected item or `null`. |

**Group API**

| Method | Description |
|--------|-------------|
| `addGroup(group)` | Add a group definition. |
| `removeGroup(id)` | Remove a group by ID. |
| `updateGroup(group)` | Replace group matching `group.id`. |
| `toggleGroup(id)` | Toggle collapsed state. |
| `collapseAll()` | Collapse all groups. |
| `expandAll()` | Expand all groups. |

**Viewport API**

| Method | Description |
|--------|-------------|
| `setViewport(start, end)` | Set the visible date range. |
| `getViewport()` | Return `{ start, end }` dates. |
| `scrollToDate(date)` | Centre viewport on date. |

**Lifecycle**

| Method | Description |
|--------|-------------|
| `show()` | Render into the container element. |
| `hide()` | Remove from DOM without destroying state. |
| `destroy()` | Hide and release all references and listeners. |
| `setDisabled(disabled)` | Enable or disable interactions. |

### Convenience Functions

```typescript
createTimeline(options)    // Create, show, and return
```

### Global Exports

```
window.Timeline
window.createTimeline
```

## Examples

### Grouped timeline with collapsible sections

```javascript
var timeline = createTimeline({
    containerId: "project-timeline",
    start: new Date("2026-01-01"),
    end: new Date("2026-06-30"),
    groups: [
        { id: "backend", label: "Backend", order: 1 },
        { id: "frontend", label: "Frontend", order: 2 },
        { id: "milestones", label: "Milestones", order: 0, collapsible: false }
    ],
    items: [
        { id: "api", type: "span", start: new Date("2026-01-15"),
          end: new Date("2026-02-28"), label: "API Design", group: "backend" },
        { id: "ui", type: "span", start: new Date("2026-02-01"),
          end: new Date("2026-04-15"), label: "UI Build", group: "frontend", color: "#2b8a3e" },
        { id: "launch", type: "point", start: new Date("2026-05-01"),
          label: "Launch", group: "milestones", color: "#e67700" }
    ],
    showNowMarker: true,
    onGroupToggle: function(group, collapsed)
    {
        console.log(group.label, collapsed ? "collapsed" : "expanded");
    }
});
```

### Dynamic item management

```javascript
timeline.addItem({ id: "hotfix-1", type: "point", start: new Date("2026-03-10"), label: "Hotfix deployed" });

timeline.addItems([
    { id: "testing", type: "span", start: new Date("2026-03-01"),
      end: new Date("2026-03-14"), label: "QA Testing", group: "backend" },
    { id: "freeze", type: "point", start: new Date("2026-03-15"), label: "Code Freeze" }
]);

timeline.updateItem({ id: "hotfix-1", type: "point", start: new Date("2026-03-12"),
    label: "Hotfix (rescheduled)", color: "#dc3545" });

timeline.removeItem("hotfix-1");
```

### Viewport control and selection

```javascript
timeline.setViewport(new Date("2026-04-01"), new Date("2026-06-30"));
timeline.scrollToDate(new Date());
timeline.selectItem("sprint-4");
timeline.selectItem(null);

var vp = timeline.getViewport();
console.log("Showing:", vp.start, "to", vp.end);
```

### Callbacks for application integration

```javascript
var timeline = createTimeline({
    containerId: "ops-timeline",
    start: new Date("2026-01-01"),
    end: new Date("2026-12-31"),
    onItemClick: function(item) { showDetailPanel(item.data); },
    onItemSelect: function(item) { item ? highlightRelated(item.id) : clearHighlights(); },
    onViewportChange: function(start, end)
    {
        fetchEventsForRange(start, end).then(function(events) { timeline.addItems(events); });
    },
    onItemVisible: function(items) { console.log(items.length, "items visible"); }
});
```

## Accessibility

| Feature | Implementation |
|---------|----------------|
| Region landmark | Root element uses `role="region"` with `aria-label`. |
| Group headings | Interactive headings that toggle collapse state. |
| Item roles | `role="button"` with `aria-label` containing label and date. |
| Selection state | Selected items indicated with `aria-pressed="true"`. |
| Disabled state | Root element has `aria-disabled="true"`; items become inert. |
| Tooltips | `tooltip` field maps to native `title` attribute. |

| Key | Action |
|-----|--------|
| Tab | Focus timeline / navigate between groups |
| Arrow Left / Right | Navigate between items in a row |
| Arrow Up / Down | Navigate between rows or groups |
| Enter / Space | Select or activate focused item |
| Escape | Clear selection |
| Home / End | First or last item in current row |

## Security

The Timeline component applies the following measures to prevent cross-site scripting (XSS):

- **All labels and tooltips** are rendered using `textContent` only. User-supplied strings are never interpreted as HTML.
- **No `innerHTML`** is used anywhere in the component. All DOM construction uses `createElement` and `textContent`.
- **Colour values** are applied via inline `style` properties and are restricted to CSS colour syntax.
- **The `data` field** is opaque to the component and is never rendered into the DOM.

See `specs/timeline.prd.md` for the complete specification.


---

<a id="timepicker"></a>

# TimePicker

A time-of-day picker with spinner columns and optional timezone selector.

## Quick Start

```html
<link rel="stylesheet" href="https://static.knobby.io/components/timepicker/timepicker.css">
<script src="https://static.knobby.io/components/timepicker/timepicker.js"></script>

<div id="my-time"></div>
<script>
    var picker = createTimePicker("my-time", {
        clockMode: "24",
        showSeconds: true,
        onSelect: function(time) { console.log("Selected:", time); }
    });
</script>
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `value` | `TimeValue` | Current time | Initial time |
| `clockMode` | `"12" \| "24"` | `"24"` | Clock mode |
| `showSeconds` | `boolean` | `true` | Show seconds column |
| `format` | `string` | `"HH:mm:ss"` | Display format |
| `minuteStep` | `number` | `1` | Minute step (1, 5, 15, 30) |
| `secondStep` | `number` | `1` | Second step |
| `minTime` | `TimeValue` | — | Earliest selectable time |
| `maxTime` | `TimeValue` | — | Latest selectable time |
| `showNowButton` | `boolean` | `true` | Show Now button |
| `showTimezone` | `boolean` | `false` | Show timezone selector |
| `timezone` | `string` | `"UTC"` | IANA timezone or "local" |
| `showFormatHint` | `boolean` | `true` | Format hint below input |
| `showFormatHelp` | `boolean` | `true` | Help icon and tooltip |
| `disabled` | `boolean` | `false` | Disable the component |
| `readonly` | `boolean` | `false` | Read-only input |
| `size` | `"sm" \| "default" \| "lg"` | `"default"` | Size variant |
| `onSelect` | `(time: TimeValue) => void` | — | Selection callback |
| `onChange` | `(time: TimeValue \| null) => void` | — | Change callback |
| `onTimezoneChange` | `(tz: string) => void` | — | Timezone change callback |

## TimeValue Interface

```typescript
interface TimeValue {
    hours: number;   // 0–23
    minutes: number; // 0–59
    seconds?: number; // 0–59
}
```

## Instance Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getValue()` | `TimeValue \| null` | Current time |
| `getFormattedValue()` | `string` | Formatted time string |
| `getTimezone()` | `string` | Current IANA timezone |
| `setValue(time)` | `void` | Set time programmatically |
| `setTimezone(tz)` | `void` | Set timezone |
| `open()` / `close()` | `void` | Toggle dropdown |
| `enable()` / `disable()` | `void` | Toggle state |
| `destroy()` | `void` | Remove from DOM |

## Dependencies

- Bootstrap 5 CSS, Bootstrap Icons, Enterprise Theme CSS
- Intl API (for timezone support)


---

<a id="timezonepicker"></a>

# TimezonePicker

A searchable dropdown selector for IANA timezones with grouped regions, UTC offset display, and live current-time preview.

## Quick Start

```html
<link rel="stylesheet" href="dist/components/timezonepicker/timezonepicker.css">
<script src="dist/components/timezonepicker/timezonepicker.js"></script>

<div id="my-tz"></div>
<script>
    var picker = createTimezonePicker("my-tz", {
        timezone: "America/New_York",
        onSelect: function(tz) { console.log("Selected:", tz); }
    });
</script>
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `timezone` | `string` | `"UTC"` | Initial IANA timezone or "local" |
| `showTimePreview` | `boolean` | `true` | Live clock in dropdown footer |
| `showFormatHint` | `boolean` | `true` | IANA identifier below input |
| `showFormatHelp` | `boolean` | `true` | Help icon and tooltip |
| `formatHelpText` | `string` | — | Custom help tooltip text |
| `disabled` | `boolean` | `false` | Disable the component |
| `readonly` | `boolean` | `false` | Read-only mode |
| `size` | `"sm" \| "default" \| "lg"` | `"default"` | Size variant |
| `placeholder` | `string` | `"Select a timezone..."` | Input placeholder |
| `onSelect` | `(tz: string) => void` | — | Selection callback |
| `onChange` | `(tz: string) => void` | — | Change callback |
| `onOpen` | `() => void` | — | Dropdown open callback |
| `onClose` | `() => void` | — | Dropdown close callback |

## Public API

| Method | Returns | Description |
|--------|---------|-------------|
| `getValue()` | `string` | Current IANA timezone |
| `setValue(tz)` | `void` | Set timezone programmatically |
| `getOffset()` | `string` | Current UTC offset (e.g., "GMT-5") |
| `open()` | `void` | Open dropdown |
| `close()` | `void` | Close dropdown |
| `enable()` | `void` | Enable component |
| `disable()` | `void` | Disable component |
| `destroy()` | `void` | Remove from DOM |

## Features

- **Searchable dropdown** with substring matching on timezone name and offset
- **Grouped by region** — Common timezones first, then Americas, Europe, Asia, Pacific, etc.
- **Live time preview** — Shows current time in the selected timezone, updated every second
- **UTC offset display** — Each timezone shows its current GMT offset
- **Keyboard navigation** — Arrow keys, Enter to select, Escape to close
- **Accessible** — WAI-ARIA combobox/listbox pattern

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `ArrowDown` | Open dropdown or move highlight down |
| `ArrowUp` | Move highlight up |
| `Enter` | Select highlighted timezone |
| `Escape` | Close dropdown |

## Dependencies

- Bootstrap CSS (input-group, form-control, btn)
- Bootstrap Icons CSS
- Does **not** require Bootstrap JS


---

<a id="toolbar"></a>

# Toolbar

A programmable action bar component for grouping tools and actions into labelled regions. Inspired by the Microsoft Office Ribbon but adapted to the enterprise Bootstrap 5 aesthetic — single strip, no tabs.

## Features

- **Docked** or **floating** positioning with **drag-to-dock** snapping
- **Horizontal** or **vertical** orientation in either mode
- **Regions** — named groups of related tools separated by dividers
- **Tool types** — standard buttons, toggle buttons, split buttons, gallery controls
- **Overflow** — Priority+ algorithm collapses excess tools into a dropdown menu
- **KeyTips** — Office-style keyboard shortcut badges revealed on Alt press
- **Layout persistence** — save and restore toolbar position, orientation, and state
- **Resize** — drag handle along the orientation axis
- **Tooltips** — Bootstrap 5 native tooltips on every tool
- **Full keyboard accessibility** — WAI-ARIA toolbar pattern with roving tabindex

## Assets

| Asset | Path |
|-------|------|
| CSS | `dist/components/toolbar/toolbar.css` |
| JS | `dist/components/toolbar/toolbar.js` |
| Types | `dist/components/toolbar/toolbar.d.ts` |

**Requires:** Bootstrap CSS (for SCSS variables), Bootstrap Icons CSS, Bootstrap JS (optional, for tooltips). Does **not** require a JavaScript framework.

## Quick Start

```html
<link rel="stylesheet" href="dist/components/toolbar/toolbar.css">
<script src="dist/components/toolbar/toolbar.js"></script>
<script>
    var toolbar = createToolbar({
        label: "Document formatting",
        regions: [
            {
                id: "formatting",
                title: "Formatting",
                items: [
                    { id: "bold", icon: "bi-type-bold", tooltip: "Bold", toggle: true },
                    { id: "italic", icon: "bi-type-italic", tooltip: "Italic", toggle: true },
                    { type: "separator" },
                    { id: "align-left", icon: "bi-text-left", tooltip: "Align left" }
                ]
            }
        ]
    });
</script>
```

## API

### Constructor

```typescript
const toolbar = new Toolbar(options: ToolbarOptions);
```

Creates the toolbar DOM but does not attach to the page.

### ToolbarOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | `string` | auto | Unique identifier |
| `label` | `string` | required | ARIA label for accessibility |
| `regions` | `ToolbarRegion[]` | required | Regions containing tool items |
| `orientation` | `"horizontal" \| "vertical"` | `"horizontal"` | Toolbar orientation |
| `mode` | `"docked" \| "floating"` | `"docked"` | Positioning mode |
| `dockPosition` | `"top" \| "bottom" \| "left" \| "right"` | `"top"` | Dock edge |
| `style` | `"icon" \| "icon-label" \| "label"` | `"icon"` | Default tool display style |
| `toolSize` | `number` | `32` | Tool button size in pixels |
| `iconSize` | `number` | `16` | Icon size in pixels |
| `overflow` | `boolean` | `true` | Enable overflow menu |
| `resizable` | `boolean` | `true` | Enable resize handle |
| `minSize` | `number` | `120` | Minimum size in orientation axis (px) |
| `maxSize` | `number` | viewport | Maximum size in orientation axis (px) |
| `draggable` | `boolean` | `true` | Enable floating drag |
| `dragToDock` | `boolean` | `true` | Enable drag-to-dock snapping |
| `dragToDockThreshold` | `number` | `40` | Dock zone threshold in px |
| `keyTips` | `boolean` | `true` | Enable KeyTip badges on Alt press |
| `persistLayout` | `boolean` | `false` | Enable localStorage persistence |
| `persistKey` | `string` | `"toolbar-layout-"` | localStorage key prefix |
| `floatX` | `number` | `100` | Initial floating X position |
| `floatY` | `number` | `100` | Initial floating Y position |
| `onToolClick` | `function` | — | Global tool click handler |
| `onResize` | `function` | — | Called when toolbar is resized |
| `onModeChange` | `function` | — | Called when mode changes |
| `onOrientationChange` | `function` | — | Called when orientation changes |

### Methods

| Method | Description |
|--------|-------------|
| `show()` | Appends to `document.body`, sets CSS custom properties |
| `hide()` | Removes from DOM without destroying state |
| `destroy()` | Hides, releases all references and event listeners |
| `dock(position)` | Switches to docked mode at the given edge |
| `float(x?, y?)` | Switches to floating mode at optional coordinates |
| `setOrientation(o)` | Changes orientation (horizontal/vertical) |
| `addRegion(region, index?)` | Adds a region at optional position |
| `removeRegion(regionId)` | Removes a region by ID |
| `getRegion(regionId)` | Returns the region configuration |
| `addTool(regionId, tool, index?)` | Adds a tool to a region |
| `removeTool(toolId)` | Removes a tool by ID |
| `getTool(toolId)` | Returns the tool configuration |
| `setToolState(toolId, state)` | Updates tool properties |
| `getToolState(toolId)` | Returns current tool state |
| `setStyle(style)` | Changes default tool display style |
| `setToolSize(size)` | Changes tool button size |
| `recalculateOverflow()` | Forces overflow recalculation |
| `setGallerySelection(galleryId, optionId)` | Selects a gallery option |
| `getGallerySelection(galleryId)` | Returns selected gallery option ID |
| `setSplitMenuItems(splitId, items)` | Updates split button menu items |
| `showKeyTips()` | Shows KeyTip badges |
| `hideKeyTips()` | Hides KeyTip badges |
| `saveLayout()` | Saves layout state to localStorage |
| `restoreLayout()` | Restores layout state from localStorage |
| `getLayoutState()` | Returns current layout state |
| `applyLayoutState(state)` | Applies a layout state object |
| `getMode()` | Returns current mode |
| `getOrientation()` | Returns current orientation |
| `getDockPosition()` | Returns current dock position |
| `isVisible()` | Returns visibility state |
| `getElement()` | Returns the root DOM element |

### Convenience Functions

```typescript
createToolbar(options)         // Create, show, and return
createDockedToolbar(options)   // Shorthand for docked mode
createFloatingToolbar(options) // Shorthand for floating mode
```

### Global Exports

```
window.Toolbar
window.createToolbar
window.createDockedToolbar
window.createFloatingToolbar
```

## Tool Types

### Standard Tool

```typescript
{ id: "bold", icon: "bi-type-bold", tooltip: "Bold", toggle: true }
```

### Split Button

```typescript
{
    type: "split-button",
    id: "paste",
    icon: "bi-clipboard",
    tooltip: "Paste",
    menuItems: [
        { id: "paste-plain", icon: "bi-file-text", label: "Paste as plain text" },
        { id: "paste-special", icon: "bi-file-earmark-code", label: "Paste special" }
    ]
}
```

### Gallery Control

```typescript
{
    type: "gallery",
    id: "font-color",
    icon: "bi-palette",
    tooltip: "Font colour",
    layout: "grid",
    columns: 4,
    options: [
        { id: "red", label: "Red", color: "#dc2626" },
        { id: "blue", label: "Blue", color: "#1c7ed6" }
    ],
    onSelect: function(option, gallery) { console.log("Selected:", option.id); }
}
```

### Separator

```typescript
{ type: "separator" }
```

## CSS Custom Properties

When docked, the toolbar sets a CSS custom property on `<html>`:

| Property | Set When |
|----------|----------|
| `--toolbar-top-size` | Docked top |
| `--toolbar-bottom-size` | Docked bottom |
| `--toolbar-left-size` | Docked left |
| `--toolbar-right-size` | Docked right |

Properties are cleared when the toolbar is hidden or undocked.

## Keyboard Accessibility

| Key | Action |
|-----|--------|
| Tab | Move focus into toolbar |
| Arrow keys | Navigate between tools |
| Home / End | First / last tool |
| Enter / Space | Activate tool |
| Escape | Close dropdown / gallery / overflow / KeyTips |
| Alt | Toggle KeyTip badges |

See `specs/toolbar.prd.md` for the complete specification.


---

