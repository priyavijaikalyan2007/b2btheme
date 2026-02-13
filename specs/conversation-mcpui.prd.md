<!-- AGENT: Product Requirements Document for the MCP App UI enhancement to the Conversation component — sandboxed inline app rendering, canvas side panel, and JSON-RPC host-guest communication. -->

# Conversation Component: MCP App UI Enhancement — Product Requirements

**Status:** Draft
**Component name:** Conversation (enhancement)
**Folder:** `./components/conversation/`
**Spec author:** Agent
**Date:** 2026-02-13
**Parent spec:** `specs/conversation.prd.md`

---

## 1. Overview

### 1.1 What Is It

An enhancement to the existing Conversation component that adds support for rendering rich, interactive MCP (Model Context Protocol) applications inside chat messages and in an optional resizable canvas side panel. MCP apps are self-contained HTML documents rendered in sandboxed iframes, communicating with the host conversation via JSON-RPC 2.0 over `postMessage`.

The enhancement adds:

- **MCP App Inline Rendering** — Detect `metadata.mcpApp` on assistant messages and render the app HTML in a sandboxed iframe within the message bubble, constrained to a maximum height (default 300px) with an optional "Expand to canvas" action.
- **Canvas Side Panel** — An optional resizable companion panel adjacent to the conversation (inspired by Google Gemini's canvas), activated programmatically or by expanding an inline app. The canvas hosts a single MCP app at a time in a larger viewport.
- **McpAppFrame Class** — A private class managing the lifecycle of a single sandboxed iframe: creation, security hardening, theme injection, JSON-RPC message routing, and cleanup.
- **JSON-RPC 2.0 Host-Guest Protocol** — Bidirectional communication between the conversation host and MCP app guests using structured JSON-RPC messages over `window.postMessage`.
- **Theme Pass-Through** — Automatic injection of the host page's CSS custom properties into the guest iframe so that MCP apps can adopt the enterprise theme without accessing the parent DOM.

### 1.2 Why Build It

AI assistants are evolving beyond text-only responses. Modern agent workflows produce structured outputs that benefit from interactive rendering: data tables with sorting, SVG charts, configuration forms, approval workflows, and diagnostic dashboards. Rather than requiring consumers to build bespoke rendering for every output type, MCP apps provide a standardised, sandboxed execution environment within the chat interface.

The sandboxed iframe model ensures that untrusted or AI-generated HTML cannot access the host application's DOM, cookies, or JavaScript context. The JSON-RPC protocol provides a controlled communication channel with explicit method routing, replacing ad-hoc `postMessage` patterns that are error-prone and difficult to audit.

### 1.3 Design Inspiration

| Source | Key Pattern Adopted |
|--------|---------------------|
| Google Gemini Canvas | Resizable side panel beside conversation for expanded content |
| ChatGPT Code Interpreter | Inline rendered output within assistant messages |
| Anthropic Artifacts | Sandboxed HTML/JS execution in a companion panel |
| VS Code Webview API | `postMessage` communication between host and sandboxed iframe |
| JSON-RPC 2.0 Specification | Structured request/response/notification protocol |

### 1.4 Relationship to Parent Spec

This document extends the Conversation component defined in `specs/conversation.prd.md`. All existing behaviour (messaging, streaming, feedback, copy, session management) is unchanged. The enhancements are additive and gated behind `enableMcpApps` and `showCanvas` options that default to `false`.

---

## 2. Goals

1. Render interactive MCP app content within assistant message bubbles using sandboxed iframes.
2. Provide an optional resizable canvas side panel for expanded MCP app display.
3. Establish a secure JSON-RPC 2.0 communication channel between the host conversation and guest MCP apps.
4. Pass host theme variables into guest iframes so apps can match the enterprise design system.
5. Maintain zero impact on existing conversation functionality when MCP features are not enabled.
6. Provide a clean public API for adding app messages, managing the canvas, and receiving app communications.

---

## 3. Non-Goals

The following are explicitly out of scope for this enhancement:

- **MCP app authoring tools** — No editor, builder, or IDE for creating MCP apps.
- **MCP app marketplace or registry** — No discovery, installation, or versioning system.
- **Persistent app state across sessions** — MCP app state is ephemeral; it does not survive page reload. Session serialisation captures the app HTML and metadata, not runtime state.
- **Multiple simultaneous canvas panels** — The canvas hosts exactly one app at a time.
- **Cross-origin iframe loading** — MCP apps are rendered via `srcdoc`, not `src` with external URLs. The `connectDomains` configuration controls which domains the CSP allows for network requests from within the app, but the app HTML itself is always provided inline.
- **Server-side MCP app execution** — All MCP app rendering is client-side within the browser.
- **Drag-to-dock canvas** — The canvas is fixed to the right side of the conversation. Docking to other edges is deferred.

---

## 4. Types

### 4.1 New Types

```typescript
/**
 * Display mode for an MCP app.
 * - "inline": Rendered within the message bubble (default).
 * - "canvas": Rendered in the canvas side panel.
 * - "both": Rendered inline with an active canvas mirror.
 */
type McpAppDisplayMode = "inline" | "canvas" | "both";
```

### 4.2 New Interfaces

```typescript
/**
 * Configuration for an MCP app to be rendered in the conversation.
 */
interface McpAppConfig
{
    /** The complete HTML document to render inside the sandboxed iframe. */
    html: string;

    /** Optional title displayed in the inline frame header and canvas header. */
    title?: string;

    /**
     * Preferred width for the inline frame in pixels.
     * Ignored when rendered in the canvas (canvas width governs).
     * Default: 100% of the message bubble width.
     */
    preferredWidth?: number;

    /**
     * Preferred height for the inline frame in pixels.
     * Clamped to maxInlineHeight.  Default: 200.
     */
    preferredHeight?: number;

    /**
     * Domains that the MCP app is allowed to contact via fetch/XHR.
     * Injected into the CSP connect-src directive.
     * Default: empty array (no network access).
     */
    connectDomains?: string[];

    /**
     * Display mode.  Default: "inline".
     */
    displayMode?: McpAppDisplayMode;

    /**
     * Additional sandbox flags beyond the baseline.
     * The baseline is "allow-scripts allow-forms".
     * Example: ["allow-popups"] to permit window.open().
     * "allow-same-origin" is always stripped for security.
     */
    sandboxFlags?: string[];
}

/**
 * A JSON-RPC 2.0 message exchanged between host and guest.
 */
interface McpRpcMessage
{
    /** Must be "2.0". */
    jsonrpc: "2.0";

    /** Method name (for requests and notifications). */
    method?: string;

    /** Parameters (for requests and notifications). */
    params?: Record<string, unknown> | unknown[];

    /** Unique request identifier (present on requests and responses). */
    id?: string | number;

    /** Result value (for successful responses). */
    result?: unknown;

    /** Error object (for error responses). */
    error?: {
        code: number;
        message: string;
        data?: unknown;
    };
}

/**
 * Event data passed to the onMcpAppMessage callback.
 */
interface McpAppMessageEvent
{
    /** The unique app identifier that sent the message. */
    appId: string;

    /** The message ID of the conversation message containing this app. */
    messageId: string;

    /** The parsed JSON-RPC message. */
    message: McpRpcMessage;
}
```

### 4.3 Extended Interfaces

The following existing interfaces receive new optional properties:

```typescript
/** Additions to ConversationOptions. */
interface ConversationOptions
{
    // ... existing properties unchanged ...

    /**
     * Enable MCP app rendering in assistant messages.
     * When false, metadata.mcpApp is ignored and no iframes are created.
     * Default: false.
     */
    enableMcpApps?: boolean;

    /**
     * Show the canvas side panel.
     * When false, the DOM is not restructured and no canvas elements are created.
     * Default: false.
     */
    showCanvas?: boolean;

    /**
     * Initial canvas width in pixels.  Default: 480.
     */
    canvasWidth?: number;

    /**
     * Minimum canvas width in pixels.  Default: 280.
     */
    canvasMinWidth?: number;

    /**
     * Maximum canvas width as a fraction of the total wrapper width (0.0 to 1.0).
     * Default: 0.6.
     */
    canvasMaxWidthFraction?: number;

    /**
     * Maximum height for inline MCP app iframes in pixels.
     * Default: 300.
     */
    maxInlineHeight?: number;

    /**
     * Called when the conversation receives a JSON-RPC message from an MCP app.
     * The consumer can inspect the message and optionally send a response
     * back via the McpAppFrame's sendMessage method.
     */
    onMcpAppMessage?: (event: McpAppMessageEvent) => void;

    /**
     * Called when the canvas panel is opened or closed.
     */
    onCanvasToggle?: (open: boolean) => void;
}

/** Additions to StreamHandle. */
interface StreamHandle
{
    // ... existing methods unchanged ...

    /**
     * Mark the stream as complete with optional metadata.
     * If metadata contains mcpApp (McpAppConfig), the message is rendered
     * as an MCP app after the markdown content.
     */
    complete(metadata?: Record<string, unknown>): void;
}
```

---

## 5. Security Model

### 5.1 Threat Model

MCP app HTML is potentially untrusted. It may be generated by an AI model, provided by a third-party integration, or authored by a user. The security model assumes the worst case: the HTML is fully adversarial.

### 5.2 Sandboxed iframe as Security Boundary

The iframe is the primary and sole security boundary. The component does **not** rely on DOMPurify or any HTML sanitiser for MCP app content, because the content is intended to contain arbitrary HTML, CSS, and JavaScript. Instead, the iframe sandbox attribute restricts what the content can do:

| Sandbox Flag | Included | Rationale |
|-------------|----------|-----------|
| `allow-scripts` | Yes | MCP apps need JavaScript for interactivity |
| `allow-forms` | Yes | MCP apps may contain input forms |
| `allow-same-origin` | **Never** | Prevents guest from accessing host DOM, cookies, localStorage, and same-origin APIs |
| `allow-popups` | Only if explicitly added via `sandboxFlags` | Default is no popups |
| `allow-top-navigation` | Never | Prevents guest from navigating the host page |
| `allow-modals` | Never | Prevents guest from blocking host via `alert()`/`confirm()` |

### 5.3 Content Security Policy Injection

Before rendering the HTML in `srcdoc`, the component injects a `<meta>` CSP tag into the `<head>` of the document. If no `<head>` exists, one is created.

Default CSP:

```
default-src 'none';
script-src 'unsafe-inline';
style-src 'unsafe-inline';
img-src data: blob:;
font-src data:;
connect-src 'self' {connectDomains};
```

- `default-src 'none'` blocks all resource loading by default.
- `script-src 'unsafe-inline'` allows inline scripts (required for `srcdoc` content).
- `style-src 'unsafe-inline'` allows inline styles.
- `img-src data: blob:` allows data URI and blob images (inline SVGs, generated charts).
- `connect-src` includes only the domains specified in `McpAppConfig.connectDomains`. If none are specified, only `'self'` is allowed (which resolves to nothing meaningful in a `srcdoc` iframe without `allow-same-origin`).

### 5.4 postMessage Validation

All incoming `message` events are validated before processing:

1. **`event.source` check** — The `event.source` must match the `contentWindow` of a known, registered McpAppFrame iframe. Messages from unknown sources are silently discarded.
2. **`event.data` structure check** — The data must be a plain object with `jsonrpc: "2.0"`. Messages that do not conform are discarded.
3. **App ID routing** — Each McpAppFrame is assigned a unique `appId` at creation. The `appId` is injected into the guest HTML as a global variable (`window.__MCP_APP_ID__`). Responses and notifications from the host include the `appId` for the guest to verify.

### 5.5 No `allow-same-origin`

This is the most critical security constraint. Without `allow-same-origin`, the sandboxed iframe:

- Cannot access `document.cookie`, `localStorage`, `sessionStorage`, or `indexedDB` of the host origin.
- Cannot read or modify the host page DOM.
- Cannot make same-origin `fetch` or `XMLHttpRequest` calls that would carry host credentials.
- Is treated as a unique, opaque origin by the browser.

The `sandboxFlags` option allows consumers to add flags like `allow-popups`, but `allow-same-origin` is always stripped even if explicitly provided. A console warning is logged if a consumer attempts to include it.

### 5.6 Cleanup

When an McpAppFrame is destroyed:

1. The `message` event listener is removed from `window`.
2. The iframe element is removed from the DOM.
3. All internal references (iframe, contentWindow, appId) are nulled.

---

## 6. API

### 6.1 New Public Methods on Conversation

| Method | Signature | Description |
|--------|-----------|-------------|
| `addAppMessage` | `(text: string, appConfig: McpAppConfig): ConversationMessage` | Adds an assistant message with markdown text content followed by an MCP app frame. If `enableMcpApps` is `false`, the app config is ignored and a plain assistant message is added. Returns the created `ConversationMessage` with `metadata.mcpApp` set to the config. |
| `openCanvas` | `(config: McpAppConfig): void` | Opens the canvas side panel and renders the given MCP app. If the canvas is already open, replaces the current app. If `showCanvas` is `false` in options, logs a warning and returns. Fires `onCanvasToggle(true)`. |
| `closeCanvas` | `(): void` | Closes the canvas side panel. Destroys the canvas MCP app frame. Fires `onCanvasToggle(false)`. |
| `isCanvasOpen` | `(): boolean` | Returns `true` if the canvas panel is currently open and visible. |

### 6.2 Extended `StreamHandle.complete()`

The existing `complete()` method is extended with an optional `metadata` parameter:

```typescript
complete(metadata?: Record<string, unknown>): void;
```

When `metadata` is provided and contains an `mcpApp` property of type `McpAppConfig`, the message is rendered with the MCP app frame appended after the Vditor-rendered markdown content. The metadata is stored on the `ConversationMessage.metadata` property for session serialisation.

### 6.3 Internal API: McpAppFrame

`McpAppFrame` is a private class (not exported to `window`). It manages a single sandboxed iframe.

```typescript
class McpAppFrame
{
    /** Unique identifier for this frame instance. */
    readonly appId: string;

    /**
     * Creates the iframe element but does not attach it to the DOM.
     * @param config - MCP app configuration.
     * @param messageId - The conversation message ID this frame belongs to.
     */
    constructor(config: McpAppConfig, messageId: string);

    /**
     * Attaches the iframe to the given container element.
     * Injects CSP meta tag, theme variables, and appId global.
     * Starts listening for postMessage events.
     */
    mount(container: HTMLElement): void;

    /**
     * Sends a JSON-RPC message to the guest iframe.
     * @param message - The JSON-RPC message to send.
     */
    sendMessage(message: McpRpcMessage): void;

    /**
     * Removes the iframe from the DOM, removes the message event listener,
     * and nulls all internal references.
     */
    destroy(): void;

    /**
     * Returns the iframe element (or null if destroyed).
     */
    getElement(): HTMLIFrameElement | null;

    /**
     * Returns whether the frame has been destroyed.
     */
    isDestroyed(): boolean;
}
```

### 6.4 JSON-RPC 2.0 Protocol

#### Host-to-Guest Methods

| Method | Params | Description |
|--------|--------|-------------|
| `theme.update` | `{ variables: Record<string, string> }` | Sends updated CSS custom property values to the guest. The guest should apply these to its document root. |
| `app.resize` | `{ width: number, height: number }` | Notifies the guest of its new viewport dimensions (e.g., after canvas resize). |

#### Guest-to-Host Methods

| Method | Params | Description |
|--------|--------|-------------|
| `app.ready` | `{}` | Notification sent by the guest when its DOM is loaded and it is ready to receive messages. The host responds by sending `theme.update`. |
| `app.requestResize` | `{ preferredHeight: number }` | Request from the guest to adjust its inline frame height. The host clamps to `maxInlineHeight` and applies. |
| `app.sendData` | `{ type: string, payload: unknown }` | Generic data message from the guest to the host. Forwarded to `onMcpAppMessage`. The host may respond via `sendMessage()` on the McpAppFrame. |

#### Error Codes

| Code | Meaning |
|------|---------|
| `-32700` | Parse error — invalid JSON |
| `-32600` | Invalid request — missing required fields |
| `-32601` | Method not found |
| `-32602` | Invalid params |
| `-32603` | Internal error |

### 6.5 Convenience Functions

No new convenience functions are added. The existing `createConversation()` function works with the new options.

### 6.6 Global Exports

No new global exports. `McpAppFrame` is private. All new functionality is accessed through the `Conversation` instance.

---

## 7. UI Layout

### 7.1 Inline MCP App (within message bubble)

```
+-- conversation-message conversation-message-assistant -----+
|  [avatar]                                                   |
|  [name] [timestamp]                                         |
|  [markdown content area rendered by Vditor]                 |
|                                                             |
|  +-- conversation-mcp-frame ----------------------------+   |
|  | [title]                           [Expand to canvas] |   |
|  +------------------------------------------------------+   |
|  | +-- iframe (sandboxed, srcdoc) -------------------+  |   |
|  | |                                                  |  |   |
|  | |  MCP App Content                                 |  |   |
|  | |                                                  |  |   |
|  | +--------------------------------------------------+  |   |
|  +------------------------------------------------------+   |
|                                                             |
|  [thumbs-up] [thumbs-down] [copy]                           |
+-------------------------------------------------------------+
```

### 7.2 Canvas Side Panel

When `showCanvas` is `true` and the canvas is opened, the conversation root wraps itself in a flex container:

```
+-- conversation-with-canvas (flex row) -----------------------+
|                                                               |
|  +-- conversation (existing) ---+  +-- canvas-handle --+     |
|  |  [header]                    |  |  ║                |     |
|  |  [messages]                  |  |  ║  (4px drag)    |     |
|  |  [input]                     |  |  ║                |     |
|  +------------------------------+  +--+                      |
|                                                               |
|  +-- conversation-canvas --------------+                      |
|  | +-- conversation-canvas-header ---+ |                      |
|  | | [title]              [X close]  | |                      |
|  | +--------------------------------+ |                      |
|  | +-- conversation-canvas-body ----+ |                      |
|  | | +-- iframe (sandboxed) ------+ | |                      |
|  | | |                             | | |                      |
|  | | |  MCP App Content (full)     | | |                      |
|  | | |                             | | |                      |
|  | | +-----------------------------+ | |                      |
|  | +--------------------------------+ |                      |
|  +------------------------------------+                      |
+---------------------------------------------------------------+
```

### 7.3 Conditional DOM Restructuring

The `.conversation-with-canvas` wrapper is only created when `showCanvas` is `true` in options. When `showCanvas` is `false`, the DOM structure is identical to the base conversation component. This ensures zero DOM overhead for consumers who do not use the canvas feature.

When the canvas is opened:
1. If the wrapper does not exist yet, the conversation root is wrapped in a `.conversation-with-canvas` flex container.
2. The canvas panel and resize handle are appended to the wrapper.

When the canvas is closed:
1. The canvas panel and resize handle are hidden (`display: none`).
2. The wrapper remains in the DOM (no unnecessary DOM restructuring on toggle).

### 7.4 "Expand to Canvas" Behaviour

When the user clicks the "Expand to canvas" button on an inline MCP app frame:

1. `openCanvas()` is called with the same `McpAppConfig`.
2. The inline iframe is hidden (not destroyed) to preserve its state.
3. The inline frame container shows a "View in canvas" placeholder with a button to collapse back.
4. Clicking "Collapse to inline" on the placeholder (or closing the canvas) restores the inline iframe visibility.

This hide-not-destroy pattern preserves the MCP app's JavaScript state during the transition.

---

## 8. DOM Structure

### 8.1 Inline MCP App Frame

```html
<div class="conversation-mcp-frame" data-app-id="mcp-1" data-message-id="msg-5">
    <div class="conversation-mcp-frame-header">
        <span class="conversation-mcp-frame-title">Data Table</span>
        <button class="conversation-btn conversation-mcp-expand-btn"
                type="button"
                aria-label="Expand to canvas"
                title="Expand to canvas">
            <i class="bi bi-arrows-fullscreen"></i>
        </button>
    </div>
    <iframe class="conversation-mcp-iframe"
            sandbox="allow-scripts allow-forms"
            srcdoc="..."
            title="MCP App: Data Table"
            style="height: 200px; max-height: 300px;">
    </iframe>
</div>
```

### 8.2 Inline MCP App Frame (Expanded to Canvas — Placeholder)

```html
<div class="conversation-mcp-frame conversation-mcp-frame-expanded" data-app-id="mcp-1">
    <div class="conversation-mcp-frame-placeholder">
        <i class="bi bi-window-stack"></i>
        <span>Viewing in canvas</span>
        <button class="conversation-btn conversation-mcp-collapse-btn"
                type="button"
                aria-label="Collapse to inline"
                title="Collapse to inline">
            <i class="bi bi-arrows-collapse"></i>
        </button>
    </div>
    <iframe class="conversation-mcp-iframe"
            sandbox="allow-scripts allow-forms"
            srcdoc="..."
            title="MCP App: Data Table"
            style="display: none;">
    </iframe>
</div>
```

### 8.3 Canvas Side Panel

```html
<div class="conversation-with-canvas">

    <!-- Existing conversation root (unchanged internally) -->
    <div class="conversation conversation-md" id="conversation-1"
         role="region" aria-label="Conversation">
        <!-- ... existing conversation DOM ... -->
    </div>

    <!-- Resize handle -->
    <div class="conversation-canvas-handle"
         role="separator"
         aria-orientation="vertical"
         aria-label="Resize canvas"
         aria-valuenow="480"
         aria-valuemin="280"
         aria-valuemax="768"
         tabindex="0">
    </div>

    <!-- Canvas panel -->
    <div class="conversation-canvas"
         role="complementary"
         aria-label="MCP App Canvas">
        <div class="conversation-canvas-header">
            <span class="conversation-canvas-title">Data Table</span>
            <div class="conversation-canvas-header-actions">
                <button class="conversation-btn conversation-canvas-close-btn"
                        type="button"
                        aria-label="Close canvas"
                        title="Close canvas">
                    <i class="bi bi-x-lg"></i>
                </button>
            </div>
        </div>
        <div class="conversation-canvas-body">
            <iframe class="conversation-mcp-iframe"
                    sandbox="allow-scripts allow-forms"
                    srcdoc="..."
                    title="MCP App: Data Table"
                    style="width: 100%; height: 100%;">
            </iframe>
        </div>
    </div>
</div>
```

---

## 9. CSS Classes

### 9.1 Section 18: MCP App Inline Frame

| Class | Description |
|-------|-------------|
| `.conversation-mcp-frame` | Inline MCP app container within a message bubble. `border: 1px solid $gray-300`, `border-radius: 2px`, `overflow: hidden`, `margin-top: 8px`. |
| `.conversation-mcp-frame-header` | Frame header row with title and expand button. `display: flex`, `justify-content: space-between`, `align-items: center`, `padding: 4px 8px`, `background: $gray-50`, `border-bottom: 1px solid $gray-200`. |
| `.conversation-mcp-frame-title` | Title text in the frame header. `font-size: $font-size-sm`, `font-weight: $font-weight-semibold`, `color: $gray-700`. |
| `.conversation-mcp-expand-btn` | "Expand to canvas" button. Transparent background, `$gray-500` icon, hover `$gray-700`. Hidden when `showCanvas` is `false`. |
| `.conversation-mcp-iframe` | The sandboxed iframe. `width: 100%`, `border: none`, `display: block`. Height set via inline style from `preferredHeight`, clamped to `maxInlineHeight`. |
| `.conversation-mcp-frame-expanded` | Modifier when the app is expanded to canvas. |
| `.conversation-mcp-frame-placeholder` | Placeholder shown when the inline app is expanded to canvas. `display: flex`, `align-items: center`, `gap: 8px`, `padding: 12px`, `color: $gray-500`, `background: $gray-50`. |
| `.conversation-mcp-collapse-btn` | "Collapse to inline" button within the placeholder. Same styling as expand button. |

### 9.2 Section 19: Canvas Side Panel

| Class | Description |
|-------|-------------|
| `.conversation-with-canvas` | Flex row wrapper around conversation and canvas. `display: flex`, `flex-direction: row`, `height: 100%`, `width: 100%`, `overflow: hidden`. |
| `.conversation-canvas` | Canvas panel container. `display: flex`, `flex-direction: column`, `flex-shrink: 0`, `width: var(--conversation-canvas-width, 480px)`, `border-left: 1px solid $gray-300`, `background: $white`, `overflow: hidden`. |
| `.conversation-canvas-header` | Canvas header bar. `display: flex`, `justify-content: space-between`, `align-items: center`, `padding: 8px 12px`, `background: $gray-50`, `border-bottom: 1px solid $gray-200`. |
| `.conversation-canvas-title` | Canvas title text. `font-size: $font-size-base`, `font-weight: $font-weight-semibold`, `color: $gray-800`. |
| `.conversation-canvas-header-actions` | Container for canvas header buttons. |
| `.conversation-canvas-close-btn` | Close button. Transparent background, `$gray-500` icon, hover `$gray-700`. |
| `.conversation-canvas-body` | Canvas content area. `flex: 1`, `overflow: hidden`, `position: relative`. The iframe within fills this area completely. |
| `.conversation-canvas-hidden` | Modifier when canvas is closed. `display: none`. |

### 9.3 Section 20: Canvas Resize Handle

| Class | Description |
|-------|-------------|
| `.conversation-canvas-handle` | Resize drag strip between conversation and canvas. `width: 4px`, `cursor: col-resize`, `background: $gray-200`, `flex-shrink: 0`, `touch-action: none`. Hover: `background: $blue-400`. Active (during drag): `background: $blue-600`. |
| `.conversation-canvas-handle-active` | Applied during active resize drag. |

### 9.4 Section 21: Container Query Updates

Extend the existing container query rules (Section 15 in the current SCSS) to account for the canvas panel:

| Container Width | MCP App Adjustment |
|----------------|-------------------|
| < 400px | Inline MCP app frame takes full message width; expand button hidden (canvas not usable at this width) |
| 400px - 600px | Inline MCP app frame takes full message width; expand button visible if `showCanvas` is `true` |
| > 600px | Full layout; canvas side panel available |

---

## 10. Styling

### 10.1 Theme Integration

| Property | Value | Source |
|----------|-------|--------|
| MCP frame border | `1px solid $gray-300` | Consistent with cards |
| MCP frame header background | `$gray-50` | Matches conversation header |
| MCP frame header border | `1px solid $gray-200` bottom | Subtle separator |
| MCP frame title | `$gray-700`, `$font-size-sm`, `$font-weight-semibold` | De-emphasised but readable |
| Expand/collapse button | `$gray-500` icon, `$gray-700` hover | Standard icon button |
| Canvas background | `$white` | Clean surface |
| Canvas header | Same as MCP frame header | Visual consistency |
| Canvas border-left | `1px solid $gray-300` | Panel separator |
| Resize handle default | `$gray-200` | Subtle |
| Resize handle hover | `$blue-400` | Interaction affordance |
| Resize handle active | `$blue-600` | Active drag state |
| Placeholder background | `$gray-50` | Muted indicator |
| Placeholder text | `$gray-500` | De-emphasised |

### 10.2 Theme Variable Pass-Through

When mounting an McpAppFrame, the following CSS custom properties are read from the host page via `getComputedStyle(document.documentElement)` and injected into the guest iframe's `<html>` element as inline styles:

| Variable | Purpose |
|----------|---------|
| `--bs-body-bg` | Page background colour |
| `--bs-body-color` | Default text colour |
| `--bs-primary` | Primary action colour |
| `--bs-secondary` | Secondary colour |
| `--bs-success` | Success state colour |
| `--bs-danger` | Danger/error colour |
| `--bs-warning` | Warning colour |
| `--bs-info` | Info colour |
| `--bs-border-color` | Standard border colour |
| `--bs-font-sans-serif` | Sans-serif font stack |
| `--bs-font-monospace` | Monospace font stack |

These are injected as a `<style>` block prepended to the guest HTML's `<head>`:

```html
<style>
:root {
    --bs-body-bg: #ffffff;
    --bs-body-color: #212529;
    /* ... remaining variables ... */
}
</style>
```

The `theme.update` JSON-RPC method allows the host to push updated values at runtime (e.g., when the user toggles dark mode).

### 10.3 Z-Index

| Element | Z-Index | Rationale |
|---------|---------|-----------|
| MCP iframe | `auto` | Participates in message stacking context |
| Canvas panel | `auto` | Participates in wrapper flex layout |
| Resize handle | 1 (relative) | Above canvas border for click target |
| "Expand to canvas" button | 1 (relative) | Above iframe content |

No global z-index values are used. The canvas and inline frames participate in their parent containers' stacking contexts.

---

## 11. Behaviour

### 11.1 MCP App Detection

When `enableMcpApps` is `true` and a message is added (via `addAssistantMessage`, `addAppMessage`, or `StreamHandle.complete()`) with `metadata.mcpApp` containing a valid `McpAppConfig`:

1. The markdown content (if any) is rendered via `Vditor.preview()` as normal.
2. An McpAppFrame is constructed from the config.
3. A `.conversation-mcp-frame` container is appended after the message content element.
4. The McpAppFrame is mounted into the container.
5. The frame reference is stored in an internal `Map<string, McpAppFrame>` keyed by `appId`.

### 11.2 Canvas Lifecycle

1. **Open** — `openCanvas(config)` is called. If the wrapper does not exist, it is created and the conversation root is wrapped. The canvas panel is shown, an McpAppFrame is constructed and mounted. The resize handle becomes visible.
2. **Active** — The canvas is visible. The user can resize it. The MCP app in the canvas can communicate via JSON-RPC.
3. **Close** — `closeCanvas()` is called (or the user clicks the close button, or presses Escape while the canvas has focus). The canvas McpAppFrame is destroyed. The canvas panel is hidden. If an inline app was expanded to canvas, the inline iframe is made visible again.

### 11.3 Resize Handle (Canvas)

The canvas resize handle uses pointer capture for reliable cross-element drag tracking:

1. `pointerdown` on the resize handle: call `setPointerCapture(e.pointerId)`, record starting X position and canvas width.
2. `pointermove`: calculate delta X, compute new canvas width, clamp to `canvasMinWidth` and `canvasMaxWidthFraction * wrapper width`. Apply via CSS custom property `--conversation-canvas-width`.
3. `pointerup`: release pointer capture. Fire `app.resize` JSON-RPC notification to the canvas MCP app.
4. **Keyboard**: When the resize handle has focus, Left/Right arrow keys adjust width by 10px. Home sets minimum width, End sets maximum width.

### 11.4 McpAppFrame Lifecycle

1. **Construction** — Generate a unique `appId` (`mcp-${instanceCounter++}`). Store config and messageId. Do not create DOM yet.
2. **mount(container)** — Create the iframe element. Set `sandbox` attribute. Inject CSP `<meta>` tag and theme `<style>` block into the HTML. Inject `window.__MCP_APP_ID__ = "{appId}"` as a `<script>` in the `<head>`. Set `srcdoc`. Append iframe to container. Register a `message` event listener on `window`.
3. **Message handling** — On `message` event: validate `event.source === iframe.contentWindow`, validate `event.data.jsonrpc === "2.0"`, route to the appropriate handler. Forward `app.sendData` to `onMcpAppMessage`. Handle `app.ready` by sending `theme.update`. Handle `app.requestResize` by clamping and applying height.
4. **sendMessage(msg)** — Call `iframe.contentWindow.postMessage(msg, "*")`. The target origin is `"*"` because `srcdoc` iframes without `allow-same-origin` have an opaque origin.
5. **destroy()** — Remove `message` event listener. Remove iframe from DOM. Null all references. Set destroyed flag.

### 11.5 Session Serialisation

When `getSession()` is called:

- Messages with `metadata.mcpApp` include the full `McpAppConfig` in the serialised session.
- The metadata is deep-copied (`structuredClone` or JSON parse/stringify fallback) to prevent mutation.
- MCP app runtime state (JavaScript variables, DOM state within the iframe) is not captured. On session reload, the MCP app HTML is re-rendered from scratch.

When `loadSession()` is called:

- Messages with `metadata.mcpApp` are detected and rendered as MCP app frames (if `enableMcpApps` is `true`).
- If `enableMcpApps` is `false`, the MCP app metadata is preserved on the message but no iframe is rendered.

---

## 12. Accessibility

### 12.1 ARIA Attributes

| Element | Attribute | Value |
|---------|-----------|-------|
| Canvas panel | `role="complementary"` | Landmark — complementary content |
| Canvas panel | `aria-label` | `"MCP App Canvas"` |
| Canvas close button | `aria-label` | `"Close canvas"` |
| Resize handle | `role="separator"` | Resizable separator pattern |
| Resize handle | `aria-orientation` | `"vertical"` |
| Resize handle | `aria-valuenow` | Current canvas width in px |
| Resize handle | `aria-valuemin` | `canvasMinWidth` |
| Resize handle | `aria-valuemax` | Calculated maximum width |
| Resize handle | `tabindex` | `0` — focusable |
| Inline MCP iframe | `title` | `"MCP App: {title}"` or `"MCP App"` |
| Expand button | `aria-label` | `"Expand to canvas"` |
| Collapse button | `aria-label` | `"Collapse to inline"` |

### 12.2 Keyboard Navigation

| Key | Context | Action |
|-----|---------|--------|
| **Escape** | Canvas has focus | Closes the canvas panel |
| **Left Arrow** | Resize handle focused | Increases canvas width by 10px (handle moves left, canvas grows) |
| **Right Arrow** | Resize handle focused | Decreases canvas width by 10px |
| **Home** | Resize handle focused | Sets canvas to maximum width |
| **End** | Resize handle focused | Sets canvas to minimum width |
| **Tab** | Within conversation | Tab order includes expand/collapse buttons and canvas close button |
| **Enter / Space** | Expand button focused | Expands app to canvas |
| **Enter / Space** | Collapse button focused | Collapses app from canvas to inline |
| **Enter / Space** | Canvas close button focused | Closes the canvas |

### 12.3 Focus Management

- When the canvas opens, focus moves to the canvas close button.
- When the canvas closes, focus returns to the expand button that triggered it (if applicable), or to the conversation textarea.
- Focus rings are visible on all interactive elements within the MCP frame header, canvas header, and resize handle.
- The iframe itself is focusable (browser default). Tab from the last element before the iframe enters the iframe's content. Tab from within the iframe eventually returns to the host page.

### 12.4 Screen Reader Announcements

- Opening the canvas: an `aria-live="polite"` region announces "MCP App Canvas opened: {title}".
- Closing the canvas: the same region announces "MCP App Canvas closed".
- The inline MCP frame is treated as embedded content. The iframe `title` attribute provides context.

---

## 13. Edge Cases

| Scenario | Behaviour |
|----------|-----------|
| `enableMcpApps: false` with `metadata.mcpApp` on a message | MCP app metadata is stored but no iframe is rendered. Plain assistant message is shown. |
| `showCanvas: false` and `openCanvas()` called | Logs warning with `LOG_PREFIX`, no-op. |
| `openCanvas()` while canvas is already open | Destroys the current canvas app, replaces with the new one. |
| `closeCanvas()` when canvas is not open | No-op. |
| Empty `html` in McpAppConfig | Renders an empty iframe. No error. |
| MCP app HTML with no `<head>` element | CSP meta tag and theme style block are prepended to the HTML wrapped in `<head></head>`. |
| `sandboxFlags` includes `"allow-same-origin"` | Flag is stripped. Console warning is logged. |
| `postMessage` from unknown source | Silently discarded. |
| `postMessage` with invalid JSON-RPC structure | Silently discarded. |
| Multiple MCP app messages in the same conversation | Each gets a unique `appId`. Messages are routed correctly. |
| Rapid resize of canvas | Resize is throttled via `requestAnimationFrame`. The `app.resize` notification is sent on `pointerup` only (not during drag). |
| Canvas resize beyond max fraction | Clamped to `canvasMaxWidthFraction * wrapper.offsetWidth`. |
| Canvas resize below min width | Clamped to `canvasMinWidth`. |
| MCP app calls `app.requestResize` with very large height | Clamped to `maxInlineHeight`. |
| `destroy()` on Conversation while canvas is open | Canvas app frame is destroyed, then conversation is destroyed. |
| `destroy()` on Conversation while inline MCP apps exist | All McpAppFrame instances are destroyed before conversation cleanup. |
| `loadSession()` with MCP app messages and `enableMcpApps: true` | MCP app frames are constructed and mounted for each app message. |
| `loadSession()` with MCP app messages and `enableMcpApps: false` | Messages are rendered as plain assistant messages. Metadata preserved. |
| Session serialisation with `metadata.mcpApp` | Deep copy of metadata ensures round-trip safety. No runtime state captured. |
| Browser without `structuredClone` | Falls back to `JSON.parse(JSON.stringify(metadata))`. |
| iframe fails to load (malformed HTML) | No error propagated to host. The iframe renders whatever the browser can parse. |
| MCP app sends `app.ready` before host registers listener | Cannot happen: the host registers the `message` listener in `mount()` before setting `srcdoc`, and the iframe's scripts execute asynchronously after `srcdoc` is parsed. |
| Window resize while canvas is open | Canvas width is preserved. The max width constraint is re-evaluated on next resize drag. |

---

## 14. Demo Requirements

Four self-contained demonstrations must be created to validate the MCP App UI enhancement. Each demo must be a complete HTML page that can be opened directly in a browser with no build step or external dependencies beyond the project's compiled CSS and JS.

### 14.1 Demo 1: Data Table (Inline)

- **Display mode:** Inline within a message bubble.
- **Content:** An HTML table with 10 rows of sample data. Column headers are clickable to sort ascending/descending. Rows are striped using the injected Bootstrap theme variables.
- **JSON-RPC:** On `app.ready`, the guest logs "Ready" to its message log. On column sort, the guest sends `app.sendData` with `{ type: "sort", payload: { column: "name", direction: "asc" } }`. The host logs the received message in an output area below the conversation.

### 14.2 Demo 2: SVG Chart (Canvas)

- **Display mode:** Canvas (opened programmatically).
- **Content:** An SVG bar chart rendered from inline data. Bars are coloured using `--bs-primary` and `--bs-info` from the injected theme variables.
- **JSON-RPC:** On `app.ready`, the guest sends its chart dimensions via `app.sendData`. The host sends back `theme.update` with current colours. On bar hover, the guest sends a notification with the hovered data point.

### 14.3 Demo 3: Form (Bidirectional)

- **Display mode:** Inline, with "Expand to canvas" interaction.
- **Content:** A configuration form with text inputs, a dropdown, and a submit button. Form fields use Bootstrap-style classes that reference the injected CSS custom properties.
- **JSON-RPC:** On form submit, the guest sends `app.sendData` with the form values. The host validates and responds with a JSON-RPC response (success or error). The guest displays the host's response in a status area within the form.

### 14.4 Demo 4: Error Handling

- **Display mode:** Inline.
- **Content:** A minimal HTML page that intentionally sends malformed JSON-RPC messages and messages with unknown methods.
- **JSON-RPC:** Demonstrates error responses (`-32600`, `-32601`). The host's `onMcpAppMessage` callback logs all messages. The demo output area shows the error responses received by the guest.

### 14.5 Demo Common Requirements

Each demo must include:

- A JSON-RPC message log output area (outside the conversation component) showing all messages sent and received, with timestamps.
- No external dependencies (no CDN scripts beyond what the conversation component already requires: Vditor, DOMPurify, Bootstrap).
- A brief description at the top of the page explaining what the demo illustrates.
- The ability to toggle between light and dark background to verify theme pass-through.

---

## 15. Implementation Notes

### 15.1 CSP Meta Tag Injection

```typescript
private injectCSP(html: string, connectDomains: string[]): string
{
    const connectSrc = connectDomains.length > 0
        ? `connect-src 'self' ${connectDomains.join(" ")};`
        : "connect-src 'self';";

    const csp = `<meta http-equiv="Content-Security-Policy" content="`
        + `default-src 'none'; `
        + `script-src 'unsafe-inline'; `
        + `style-src 'unsafe-inline'; `
        + `img-src data: blob:; `
        + `font-src data:; `
        + `${connectSrc}`
        + `">`;

    // Inject into <head> if it exists, otherwise wrap in <head>
    if (html.includes("<head>"))
    {
        return html.replace("<head>", `<head>${csp}`);
    }
    if (html.includes("<head "))
    {
        return html.replace(/<head\s[^>]*>/, `$&${csp}`);
    }
    return `<head>${csp}</head>${html}`;
}
```

### 15.2 Theme Variable Extraction

```typescript
private extractThemeVariables(): Record<string, string>
{
    const computed = getComputedStyle(document.documentElement);
    const vars = [
        "--bs-body-bg",
        "--bs-body-color",
        "--bs-primary",
        "--bs-secondary",
        "--bs-success",
        "--bs-danger",
        "--bs-warning",
        "--bs-info",
        "--bs-border-color",
        "--bs-font-sans-serif",
        "--bs-font-monospace"
    ];

    const result: Record<string, string> = {};
    for (const v of vars)
    {
        const val = computed.getPropertyValue(v).trim();
        if (val)
        {
            result[v] = val;
        }
    }
    return result;
}
```

### 15.3 App ID Injection

```typescript
private injectAppId(html: string, appId: string): string
{
    const script = `<script>window.__MCP_APP_ID__ = "${appId}";</script>`;

    if (html.includes("</head>"))
    {
        return html.replace("</head>", `${script}</head>`);
    }
    return `<head>${script}</head>${html}`;
}
```

### 15.4 postMessage Listener

```typescript
private handleMessage = (event: MessageEvent): void =>
{
    // Validate source
    if (!this.iframe || event.source !== this.iframe.contentWindow)
    {
        return;
    }

    // Validate JSON-RPC structure
    const data = event.data;
    if (typeof data !== "object" || data === null || data.jsonrpc !== "2.0")
    {
        return;
    }

    const msg = data as McpRpcMessage;

    switch (msg.method)
    {
        case "app.ready":
            this.handleAppReady();
            break;
        case "app.requestResize":
            this.handleResizeRequest(msg);
            break;
        case "app.sendData":
            this.forwardToHost(msg);
            break;
        default:
            if (msg.method)
            {
                this.sendMessage({
                    jsonrpc: "2.0",
                    id: msg.id,
                    error: { code: -32601, message: `Method not found: ${msg.method}` }
                });
            }
            break;
    }
};
```

### 15.5 Canvas Resize via Pointer Capture

```typescript
private initCanvasResize(): void
{
    const handle = this.canvasHandleEl;
    let startX = 0;
    let startWidth = 0;

    handle.addEventListener("pointerdown", (e: PointerEvent) =>
    {
        handle.setPointerCapture(e.pointerId);
        handle.classList.add("conversation-canvas-handle-active");
        startX = e.clientX;
        startWidth = this.canvasEl.offsetWidth;
    });

    handle.addEventListener("pointermove", (e: PointerEvent) =>
    {
        if (!handle.hasPointerCapture(e.pointerId))
        {
            return;
        }

        const delta = startX - e.clientX; // Moving left increases canvas width
        const maxWidth = this.wrapperEl.offsetWidth * this.opts.canvasMaxWidthFraction;
        const newWidth = Math.max(
            this.opts.canvasMinWidth,
            Math.min(maxWidth, startWidth + delta)
        );

        this.wrapperEl.style.setProperty(
            "--conversation-canvas-width",
            `${newWidth}px`
        );
    });

    handle.addEventListener("pointerup", (e: PointerEvent) =>
    {
        handle.releasePointerCapture(e.pointerId);
        handle.classList.remove("conversation-canvas-handle-active");

        // Notify canvas app of new size
        if (this.canvasFrame)
        {
            const rect = this.canvasBodyEl.getBoundingClientRect();
            this.canvasFrame.sendMessage({
                jsonrpc: "2.0",
                method: "app.resize",
                params: { width: rect.width, height: rect.height }
            });
        }
    });
}
```

### 15.6 Deep Copy for Session Serialisation

```typescript
private deepCopyMetadata(metadata?: Record<string, unknown>): Record<string, unknown> | undefined
{
    if (!metadata)
    {
        return undefined;
    }

    if (typeof structuredClone === "function")
    {
        return structuredClone(metadata);
    }

    return JSON.parse(JSON.stringify(metadata));
}
```

### 15.7 Sandbox Flag Sanitisation

```typescript
private buildSandboxAttr(config: McpAppConfig): string
{
    const baseline = ["allow-scripts", "allow-forms"];
    const extra = (config.sandboxFlags || [])
        .filter(flag =>
        {
            if (flag === "allow-same-origin")
            {
                console.warn(LOG_PREFIX,
                    "allow-same-origin is not permitted in MCP app sandbox. Flag stripped.");
                return false;
            }
            return true;
        });

    const all = new Set([...baseline, ...extra]);
    return Array.from(all).join(" ");
}
```

### 15.8 Performance

- McpAppFrame creation is deferred until the message is scrolled into view (intersection observer) for conversations with many MCP app messages. This prevents mass iframe creation on `loadSession()` with many app messages.
- Canvas resize uses `requestAnimationFrame` to throttle CSS custom property updates.
- The `message` event listener is a single function per McpAppFrame. On destroy, the exact function reference is removed.
- Theme variable extraction (`getComputedStyle`) is called once on `mount()` and cached. Updates are pushed via `theme.update` only when explicitly triggered.

---

## 16. Files

| File | Purpose |
|------|---------|
| `specs/conversation-mcpui.prd.md` | This specification |
| `components/conversation/conversation.ts` | TypeScript source (extended) |
| `components/conversation/conversation.scss` | Styles (sections 18-21 added) |
| `components/conversation/README.md` | Documentation (updated) |

---

## 17. Backward Compatibility

| Concern | Mitigation |
|---------|------------|
| `enableMcpApps` defaults to `false` | No iframe creation, no postMessage listeners, no DOM changes when not enabled |
| `showCanvas` defaults to `false` | No `.conversation-with-canvas` wrapper, no canvas DOM, no resize handle |
| Existing `addAssistantMessage()` without `metadata.mcpApp` | Behaves identically to the base spec |
| Existing `StreamHandle.complete()` without metadata argument | Signature is `complete(metadata?: ...)` — existing calls without arguments are unaffected |
| Session serialisation | `metadata` field already exists on `ConversationMessage`. MCP app config is stored there. Consumers who do not use MCP apps will never see this data. |
| CSS class namespace | All new classes are prefixed with `conversation-mcp-` or `conversation-canvas-`, avoiding collision with existing classes |
| SCSS section numbering | New sections (18-21) follow the existing section 17. No renumbering of existing sections. |
| `window` global exports | No new globals. `McpAppFrame` is private. |

---

## 18. Success Criteria

1. **Inline rendering** — An MCP app defined in `metadata.mcpApp` renders as a sandboxed iframe within the message bubble, respecting `maxInlineHeight` and `preferredHeight`.
2. **Canvas panel** — `openCanvas()` opens a resizable side panel. `closeCanvas()` closes it. The resize handle works via pointer drag and keyboard arrows.
3. **Security** — The iframe sandbox attribute never includes `allow-same-origin`. The CSP meta tag is present in all rendered app HTML. `event.source` is validated on all incoming messages.
4. **JSON-RPC communication** — The host can send messages to guest apps. Guest apps can send messages to the host. `app.ready`, `app.requestResize`, `app.sendData`, `theme.update`, and `app.resize` all work as specified.
5. **Theme pass-through** — Guest apps receive CSS custom properties matching the host page's computed values. Changing the host theme and calling `theme.update` updates the guest.
6. **Expand/collapse** — Clicking "Expand to canvas" on an inline app opens the canvas and hides the inline iframe. Collapsing restores it. The iframe's JavaScript state is preserved.
7. **Backward compatibility** — Existing tests and demos for the Conversation component pass without modification when `enableMcpApps` and `showCanvas` are not set.
8. **Accessibility** — Canvas has `role="complementary"` and `aria-label`. Resize handle supports keyboard. Focus management works correctly on open/close. All buttons have `aria-label`.
9. **Demos** — All four demos (Data Table, SVG Chart, Form, Error Handling) render correctly and show bidirectional JSON-RPC communication in the message log.
10. **Cleanup** — `destroy()` on the Conversation instance destroys all McpAppFrame instances, removes all `message` event listeners, and leaves no orphaned DOM elements.

---

## 19. Future Considerations (Out of Scope for v1)

These features are explicitly deferred:

- **MCP app persistence** — Capturing and restoring iframe JavaScript state across sessions.
- **Multiple canvas panels** — Side-by-side or tabbed canvas panels for comparing app outputs.
- **Canvas docking** — Positioning the canvas on the left, top, or bottom instead of only the right.
- **MCP app permissions API** — A capabilities negotiation system where apps request permissions (camera, microphone, geolocation) and the host grants or denies.
- **MCP app versioning** — Version negotiation between host and guest JSON-RPC protocol versions.
- **Shared state between inline and canvas** — Synchronising state when the same app runs in both inline and canvas simultaneously.
- **MCP app library/catalogue** — A registry of pre-built MCP apps that can be inserted into conversations.
- **Drag-and-drop between apps** — Transferring data between two MCP app frames.
