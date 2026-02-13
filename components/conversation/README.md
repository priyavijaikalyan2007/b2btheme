<!-- AGENT: Component documentation for the Conversation AI chat component — turn-by-turn messaging with rich text, streaming, sessions, feedback, and copy. -->

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
- **MCP App rendering** — embed interactive MCP apps in sandboxed iframes within message bubbles with JSON-RPC 2.0 postMessage communication and automatic theme injection
- **Canvas side panel** — optional resizable side panel for full-size MCP app display with pointer-capture resize, keyboard navigation, and expand-from-inline

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
| `enableMcpApps` | `boolean` | `false` | Enable MCP App rendering in messages. When true, messages with `metadata.mcpApp` are rendered as sandboxed iframes. |
| `showCanvas` | `boolean` | `false` | Show the canvas side panel for full-size MCP apps. Adds a `.conversation-with-canvas` wrapper around the conversation. |
| `canvasWidth` | `number` | `480` | Default canvas panel width in pixels. |
| `canvasMinWidth` | `number` | `280` | Minimum canvas panel width in pixels. |
| `canvasMaxWidthFraction` | `number` | `0.6` | Maximum canvas width as a fraction of the container width. |
| `onMcpAppMessage` | `(appId: string, method: string, params: unknown) => void` | — | Called when an MCP app sends a JSON-RPC message to the host. |
| `onCanvasToggle` | `(open: boolean) => void` | — | Called when the canvas panel is opened or closed. |

### McpAppConfig

Configuration for an MCP App resource to render within a message. The app HTML runs in a sandboxed iframe with no access to the host page.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `html` | `string` | — | The HTML content of the MCP app (text/html;profile=mcp-app). Required. |
| `title` | `string` | `"App"` | Title for the app panel header. |
| `preferredWidth` | `number` | `480` | Preferred width in pixels for canvas mode. |
| `preferredHeight` | `number` | `300` | Preferred height in pixels for inline mode. |
| `connectDomains` | `string[]` | — | Allowed connect-src domains for the iframe CSP. |
| `displayMode` | `"inline" \| "canvas"` | `"inline"` | Render inline within the message or in the canvas panel. |
| `sandboxFlags` | `string` | `"allow-scripts allow-forms"` | Override iframe sandbox flags. `allow-same-origin` is never permitted. |

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
| `complete(metadata?)` | `(metadata?: Record<string, unknown>) => void` | Mark streaming as complete. Triggers final Vditor render. Pass `{ mcpApp: config }` to transition into MCP app display. |
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
| `addAppMessage(text, appConfig)` | Adds an assistant message with an inline MCP app. Returns `ConversationMessage`. |
| `openCanvas(config)` | Opens the canvas side panel with the given MCP app config. Requires `showCanvas: true`. |
| `closeCanvas()` | Closes the canvas side panel. The previously expanded inline frame is restored. |
| `isCanvasOpen()` | Returns `true` if the canvas panel is currently open. |

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

## MCP App Rendering

The component supports the [MCP Apps specification](https://mcpui.dev) (stable 2026-01-26) for embedding interactive content within chat messages. MCP apps run in sandboxed iframes with JSON-RPC 2.0 communication via `postMessage`.

### Inline MCP App

Add a message with an inline MCP app using `addAppMessage()`:

```javascript
var chat = createConversation(
{
    enableMcpApps: true,

    onMcpAppMessage: function(appId, method, params)
    {
        console.log("MCP message from", appId, ":", method, params);

        // Example: respond to a data request from the app
        if (method === "getData")
        {
            // Send response back to the iframe
            // (handled internally via the McpAppFrame postMessage bridge)
        }
    },

    onSendMessage: function(message, session)
    {
        // Simulate an API response that returns MCP app content
        chat.showTypingIndicator();
        setTimeout(function()
        {
            chat.hideTypingIndicator();
            chat.addAppMessage("Here are the server metrics:", {
                html: "<html><body><h2>CPU Usage</h2><p>42%</p></body></html>",
                title: "Server Metrics",
                preferredHeight: 200
            });
        }, 1000);
    }
}, "chat-container");
```

### Streaming into MCP App

Stream text first, then transition to an MCP app on completion:

```javascript
var stream = chat.startAssistantMessage();
stream.appendChunk("Analysing your data");
stream.appendChunk("...");

// On completion, attach MCP app content
stream.complete({
    mcpApp: {
        html: "<html><body><div id='chart'>...</div></body></html>",
        title: "Analysis Results",
        preferredHeight: 400
    }
});
```

### Canvas Side Panel

Enable the canvas panel for full-size MCP app display:

```javascript
var chat = createConversation(
{
    enableMcpApps: true,
    showCanvas: true,
    canvasWidth: 500,

    onCanvasToggle: function(open)
    {
        console.log("Canvas", open ? "opened" : "closed");
    }
}, "chat-container");

// Programmatically open an app in the canvas
chat.openCanvas({
    html: "<html><body><div id='editor'>Full-size editor...</div></body></html>",
    title: "Code Editor",
    preferredWidth: 600
});

// Close the canvas
chat.closeCanvas();
```

When `showCanvas` is true, inline MCP apps display an "expand" button. Clicking it moves the app to the canvas panel. The canvas panel supports pointer-capture resize with min/max width constraints and keyboard navigation (Esc to close, Arrow keys to resize).

### MCP App HTML Structure

MCP app HTML is injected into a sandboxed iframe via `srcdoc`. The component automatically prepends:

1. A **Content Security Policy** meta tag restricting resource access
2. A **theme style block** injecting `--mcp-*` CSS custom properties (colours, fonts) computed from the host page's Bootstrap theme at runtime
3. A **bridge script** providing `window.mcpBridge.send(method, params)` and `window.mcpBridge.onMessage` for JSON-RPC 2.0 communication with the host

Example MCP app HTML that communicates with the host:

```html
<html>
<body>
    <button id="btn">Request Data</button>
    <pre id="output"></pre>
    <script>
        document.getElementById("btn").addEventListener("click", function()
        {
            window.mcpBridge.send("getData", { query: "metrics" });
        });

        window.mcpBridge.onMessage = function(method, params)
        {
            document.getElementById("output").textContent = JSON.stringify(params, null, 2);
        };
    </script>
</body>
</html>
```

## Security

The Conversation component applies defence-in-depth to prevent cross-site scripting (XSS):

- **User messages** are rendered using `textContent` only. HTML in user input is never interpreted.
- **Assistant messages** are rendered through `Vditor.preview()` with `sanitize: true`, which strips dangerous markup before rendering Markdown.
- **HTML copy export** passes through `DOMPurify.sanitize()` before being written to the clipboard. If DOMPurify is not loaded, a console warning is emitted.
- **System messages** and **error messages** use `textContent` for all user-visible strings.
- **MCP App iframes** are sandboxed with `sandbox="allow-scripts allow-forms"` — no `allow-same-origin`, preventing access to the host page's DOM, cookies, or storage. A CSP meta tag is injected restricting `default-src` to `'none'`, `script-src` and `style-src` to `'unsafe-inline'`, and `connect-src` to explicitly listed domains only. PostMessage validation uses `event.source === iframe.contentWindow` (not origin, since sandboxed iframe origin is `"null"`). Each frame gets a unique ID for routing.

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
| Escape | Close canvas panel (when canvas has focus) |
| Arrow Left/Right | Resize canvas panel (when resize handle has focus) |

| Feature | Implementation |
|---------|----------------|
| Canvas landmark | Canvas panel uses `role="complementary"` with `aria-label="MCP App Canvas"`. |
| Resize handle | Resize divider uses `role="separator"` with `aria-orientation="vertical"` and keyboard resize. |

See `specs/conversation.prd.md` and `specs/conversation-mcpui.prd.md` for the complete specifications.
