<!-- AGENT: Documentation for the SmartTextInput component. -->

# SmartTextInput

A behavioral middleware engine (non-UI) that attaches to text inputs and provides trigger-based inline references such as @mentions, #resources, and $formulas. The host application is responsible for rendering the popover/dropdown UI and supplying data sources; the engine handles trigger detection, keyboard delegation, token lifecycle, serialization, and accessibility announcements.

## Quick Start

```html
<link rel="stylesheet" href="components/smarttextinput/smarttextinput.css">
<script src="components/smarttextinput/smarttextinput.js"></script>

<textarea id="my-input"></textarea>
<script>
    var engine = createSmartTextInput({
        queryDebounceMs: 150,
        delegateKeyboard: true
    });

    // Register an @mention trigger
    engine.register({
        trigger: "@",
        name: "mention",
        activation: {
            requireWhitespaceBefore: true,
            minQueryLength: 0,
            maxQueryLength: 50,
            cancelChars: [" ", "\n"],
            escapeChar: "\\",
            suppressIn: ["codeBlock", "inlineCode", "url"]
        },
        dataSource: { query: (text) => fetchUsers(text) },
        tokenRenderer: {
            type: "pill",
            display: (token) => "@" + token.label,
            className: "stie-token-pill"
        },
        tokenSerializer: {
            serialize: (token) => "[@" + token.label + "](user:" + token.id + ")",
            deserialize: (raw) => parseMentions(raw)
        }
    });

    // Attach to the input element
    engine.attach(document.getElementById("my-input"));

    // Listen for trigger lifecycle events
    engine.on("trigger:open", function(e) {
        showPopover(e.position, e.triggerName);
    });

    engine.on("trigger:query", function(e) {
        updatePopoverResults(e.queryText);
    });

    engine.on("trigger:close", function(e) {
        hidePopover(e.reason);
    });

    // When the user picks an item from the host popover:
    engine.resolve({ id: "42", label: "Jane Doe" });
</script>
```

## Configuration Options

`SmartTextInputOptions` passed to `createSmartTextInput()`:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `queryDebounceMs` | `number` | `150` | Debounce delay before emitting `trigger:query` |
| `delegateKeyboard` | `boolean` | `true` | When true, engine intercepts ArrowUp/Down/Enter/Escape during active sessions |
| `atomicTokenDeletion` | `boolean` | `false` | Delete entire token on single Backspace |
| `showTriggerCharInToken` | `boolean` | `false` | Include the trigger character in token display text |
| `onTriggerOpen` | `function` | -- | Callback when a trigger session opens |
| `onTriggerQuery` | `function` | -- | Callback when query text changes |
| `onTriggerClose` | `function` | -- | Callback when a trigger session closes |
| `onTokenInserted` | `function` | -- | Callback after a token is inserted |
| `onTokenRemoved` | `function` | -- | Callback after a token is removed |
| `onTokenClicked` | `function` | -- | Callback when a token is clicked |
| `onNavigate` | `function` | -- | Callback for ArrowUp/Down during active session |
| `onSelect` | `function` | -- | Callback for Enter during active session |
| `onDismiss` | `function` | -- | Callback for Escape during active session |
| `onContentChange` | `function` | -- | Callback when input content changes |

## Trigger Definition

Each trigger registered via `engine.register(def)` conforms to `TriggerDefinition`:

| Field | Type | Description |
|-------|------|-------------|
| `trigger` | `string` | Character(s) that activate this trigger (e.g. `"@"`, `"#"`, `"::"`) |
| `name` | `string` | Unique name used in events and token lookups |
| `activation` | `TriggerActivation` | Rules governing how the trigger activates (see below) |
| `dataSource` | `TriggerDataSource` | Object with an async `query(text)` method returning `DataSourceResult[]` |
| `tokenRenderer` | `TokenRenderer` | Controls visual rendering of inserted tokens |
| `tokenSerializer` | `TokenSerializer` | Serialize/deserialize tokens to/from raw text |
| `allowedInputTypes` | `InputAdapterType[]` | Optional adapter type restriction |

### TriggerActivation

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `requireWhitespaceBefore` | `boolean` | -- | Trigger only fires after whitespace or at start of input |
| `minQueryLength` | `number` | `0` | Minimum characters typed after trigger before querying |
| `maxQueryLength` | `number` | `50` | Cancel session if query exceeds this length |
| `cancelChars` | `string[]` | -- | Characters that cancel the session (e.g. `[" ", "\n"]`) |
| `escapeChar` | `string \| null` | `null` | Preceding character that suppresses trigger (e.g. `"\\"`) |
| `suppressIn` | `SuppressContext[]` | `[]` | Suppress triggers inside: `codeBlock`, `inlineCode`, `url`, `email`, `quotation` |

## Adapter Types

The engine auto-detects the adapter from the attached element. You can also pass an explicit type to `attach()`.

| Adapter | Element Types | Token Storage |
|---------|---------------|---------------|
| `plaintext` | `<input>`, `<textarea>` | Serialized syntax inline in element value |
| `contenteditable` | `[contenteditable="true"]` | Non-editable `<span>` elements in the DOM |
| `prosemirror` | ProseMirror view | Host-implemented adapter |
| `codemirror` | CodeMirror view | Host-implemented adapter |
| `monaco` | Monaco Editor | Host-implemented adapter |

The `plaintext` and `contenteditable` adapters are built in. The others require the host to implement the `InputAdapter` interface.

## Public API

| Method | Returns | Description |
|--------|---------|-------------|
| `attach(element, adapterType?)` | `void` | Attach engine to a DOM element |
| `detach()` | `void` | Detach from the current element |
| `destroy()` | `void` | Permanently destroy the engine |
| `register(trigger)` | `void` | Register a `TriggerDefinition` |
| `unregister(triggerName)` | `void` | Remove a trigger by name |
| `getTriggers()` | `TriggerDefinition[]` | List all registered triggers |
| `resolve(item)` | `void` | Resolve active session with a `DataSourceResult` |
| `cancel()` | `void` | Cancel the active trigger session |
| `getTokens()` | `ResolvedToken[]` | All tokens in the engine |
| `getTokensByType(triggerName)` | `ResolvedToken[]` | Tokens filtered by trigger name |
| `removeToken(instanceId)` | `void` | Remove a token by instance ID |
| `replaceToken(instanceId, partial)` | `void` | Merge new data into an existing token |
| `getSerializedContent()` | `string` | Raw content with serialized tokens |
| `setSerializedContent(content)` | `void` | Load serialized content into the adapter |
| `getPlainTextContent()` | `string` | Plain text without token markup |
| `on(event, handler)` | `Unsubscribe` | Subscribe to an engine event |
| `setOptions(options)` | `void` | Merge new options at runtime |
| `static renderTokens(container, content, serializers, renderers)` | `void` | Render serialized content into a read-only container with styled tokens |

## Events

Subscribe via `engine.on(eventName, handler)`. Each returns an `Unsubscribe` function.

| Event | Payload | Description |
|-------|---------|-------------|
| `trigger:open` | `{ triggerName, triggerDef, queryText, position }` | A trigger character was detected |
| `trigger:query` | `{ triggerName, queryText, position }` | Query text changed (debounced) |
| `trigger:close` | `{ triggerName, reason }` | Session ended; reason: `"resolved"`, `"cancelled"`, `"blur"`, `"escape"` |
| `token:inserted` | `ResolvedToken` | A token was inserted into the input |
| `token:removed` | `ResolvedToken` | A token was removed |
| `token:clicked` | `ResolvedToken` | A token was clicked |
| `navigate` | `{ direction: "up" \| "down" }` | ArrowUp/Down pressed during active session |
| `select` | `{}` | Enter pressed during active session |
| `dismiss` | `{}` | Escape pressed during active session |
| `content:change` | `{ content }` | Input content changed |

## Token Model

`ResolvedToken` represents an inserted token:

| Field | Type | Description |
|-------|------|-------------|
| `instanceId` | `string` | Unique ID for this token instance |
| `triggerName` | `string` | Name of the trigger that created it |
| `id` | `string` | Entity ID from the data source |
| `label` | `string` | Display label |
| `sublabel` | `string?` | Optional secondary label |
| `icon` | `string?` | Optional icon class |
| `metadata` | `Record<string, unknown>` | Arbitrary data from the data source |
| `sourceRange` | `{ start, end }` | Character offsets in the input |

## Token Rendering Types

The `TokenRenderer.type` field controls visual appearance. Built-in CSS classes are provided for each type:

| Type | CSS Class | Description |
|------|-----------|-------------|
| `pill` | `.stie-token-pill` | Rounded badge with background, border, optional icon -- for @mentions |
| `link` | `.stie-token-link` | Underlined link text, renders as `<a>` in contenteditable -- for #resources |
| `computed` | `.stie-token-computed` | Monospace badge with green tint -- for $formulas |
| `inline-text` | `.stie-token-inline-text` | Italic inline text, minimal chrome -- for lightweight cross-refs |
| `custom` | `.stie-token-custom` | No built-in styling; use `render()` callback for full control |

## Serialization

Tokens are serialized to and from raw text using `TokenSerializer`. This allows content with tokens to be stored, transmitted, and restored.

The default pattern uses a markdown-link-inspired format:

```
[@Jane Doe](user:42)
[#PROJ-100](issue:100)
[$revenue](formula:rev-2024)
```

Each trigger's serializer defines `serialize(token)` (token to string) and `deserialize(rawContent)` (string to `DeserializedToken[]`). The engine's `setSerializedContent()` runs all registered deserializers to reconstruct tokens from stored content.

Use `SmartTextInputEngine.renderTokens()` to render serialized content into a read-only container with styled token spans.

## Keyboard Behavior

When `delegateKeyboard` is `true` (default) and a trigger session is active:

| Key | Action |
|-----|--------|
| ArrowUp | Emits `navigate` with `"up"` -- host moves popover highlight |
| ArrowDown | Emits `navigate` with `"down"` -- host moves popover highlight |
| Enter | Emits `select` -- host calls `engine.resolve(item)` |
| Escape | Cancels session, emits `trigger:close` with reason `"escape"` |

All four keys call `preventDefault()` during an active session to avoid interfering with the input's default behavior. When no session is active, keys pass through normally.

## Accessibility

The engine creates a visually-hidden ARIA live region (`role="status"`, `aria-live="polite"`) that announces:

- `"<triggerName> suggestions available"` when a trigger opens
- `"Inserted <label>"` when a token is resolved
- `"Suggestions closed"` when a session ends

The host popover should implement the WAI-ARIA combobox pattern (`role="combobox"` on the input, `role="listbox"` on the results list, `aria-activedescendant` for the highlighted item) to provide full screen reader support.

## Security

- All DOM text is set via `textContent` -- `innerHTML` is never used for user content.
- Token display text comes from `renderer.display()`, which should return sanitized strings.
- Validate all data returned by `dataSource.query()` callbacks before passing to `resolve()`.
- The engine does not fetch remote data itself; the host controls all network calls.

## Window Globals

| Global | Type |
|--------|------|
| `window.SmartTextInputEngine` | `class` |
| `window.createSmartTextInput` | `function(options?): SmartTextInputEngine` |
