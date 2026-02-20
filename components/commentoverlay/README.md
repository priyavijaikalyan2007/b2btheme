# CommentOverlay

Transparent overlay system for anchoring comment pins to DOM elements, enabling inline annotation with threaded discussions, @mentions, resolve/unresolve, drag-to-reposition, and visual connector lines.

## Quick Start

```html
<link rel="stylesheet" href="dist/components/commentoverlay/commentoverlay.css">
<script src="dist/components/commentoverlay/commentoverlay.js"></script>
<script>
    var overlay = createCommentOverlay("my-container", {
        currentUser: { id: "u1", name: "Alice Chen" },
        mentionUsers: [
            { id: "u1", name: "Alice Chen" },
            { id: "u2", name: "Bob Smith", email: "bob@example.com" }
        ],
        pins: [
            {
                id: "pin-1",
                anchorElement: document.getElementById("my-paragraph"),
                offsetX: 12, offsetY: -8,
                thread: {
                    id: "pin-1",
                    rootComment: {
                        id: "c1", author: { id: "u2", name: "Bob Smith" },
                        text: "Check this value @[u1]",
                        createdAt: "2025-12-01T10:00:00Z",
                        edited: false, mentions: ["u1"]
                    },
                    replies: [],
                    resolved: false
                }
            }
        ],
        onCommentCreate: function(threadId, comment) {
            console.log("New comment:", threadId, comment.text);
        }
    });
</script>
```

## Assets

| Asset | Path |
|-------|------|
| CSS   | `dist/components/commentoverlay/commentoverlay.css` |
| JS    | `dist/components/commentoverlay/commentoverlay.js` |
| Types | `dist/components/commentoverlay/commentoverlay.d.ts` |

**Requires:** Bootstrap CSS, Bootstrap Icons CSS.

## Interfaces

### MentionUser

| Property    | Type     | Description |
|-------------|----------|-------------|
| `id`        | `string` | Unique user identifier |
| `name`      | `string` | Display name |
| `avatarUrl` | `string` | Optional avatar image URL |
| `email`     | `string` | Optional email for autocomplete |

### CommentData

| Property    | Type           | Description |
|-------------|----------------|-------------|
| `id`        | `string`       | Unique comment identifier |
| `author`    | `MentionUser`  | Comment author |
| `text`      | `string`       | Comment text (`@[userId]` for mentions) |
| `createdAt` | `string`       | ISO 8601 timestamp |
| `editedAt`  | `string`       | Last edit timestamp |
| `edited`    | `boolean`      | Whether edited |
| `mentions`  | `string[]`     | Mentioned user IDs |

### CommentThread

| Property     | Type            | Description |
|--------------|-----------------|-------------|
| `id`         | `string`        | Thread identifier |
| `rootComment`| `CommentData`   | First comment |
| `replies`    | `CommentData[]` | Reply comments |
| `resolved`   | `boolean`       | Whether resolved |
| `resolvedBy` | `MentionUser`   | Who resolved |
| `resolvedAt` | `string`        | When resolved |
| `metadata`   | `Record`        | Custom data |

### CommentPinData

| Property         | Type            | Description |
|------------------|-----------------|-------------|
| `id`             | `string`        | Pin identifier |
| `anchorElement`  | `HTMLElement`   | DOM element to anchor to |
| `anchorSelector` | `string`        | CSS selector fallback |
| `offsetX`        | `number`        | X offset from anchor |
| `offsetY`        | `number`        | Y offset from anchor |
| `thread`         | `CommentThread` | Associated thread |
| `icon`           | `string`        | Bootstrap Icons class |
| `colour`         | `string`        | CSS colour value |
| `showConnector`  | `boolean`       | Show connector line |
| `visible`        | `boolean`       | Whether visible |

## Options (`CommentOverlayOptions`)

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `container` | `HTMLElement` | `document.body` | Element to overlay |
| `pins` | `CommentPinData[]` | `[]` | Initial pins |
| `mentionUsers` | `MentionUser[]` | `[]` | Users for @mention |
| `currentUser` | `MentionUser` | -- | Current user (required) |
| `showConnectors` | `boolean` | `true` | Show SVG connector lines |
| `draggablePins` | `boolean` | `true` | Allow drag-to-reposition |
| `allowResolve` | `boolean` | `true` | Show resolve button |
| `resolvedDisplay` | `string` | `"muted"` | `"muted"`, `"hidden"`, or `"normal"` |
| `enableMentions` | `boolean` | `true` | Enable @mention autocomplete |
| `defaultPinIcon` | `string` | `"bi-chat-dots-fill"` | Default pin icon |
| `defaultPinColour` | `string` | `$blue-600` | Default pin colour |
| `zIndex` | `number` | `1075` | Overlay z-index |
| `timestampFormat` | `string` | `"relative"` | `"relative"` or `"absolute"` |
| `panelWidth` | `number` | `320` | Thread popover width |
| `panelMaxHeight` | `number` | `400` | Thread popover max height |
| `pinSize` | `number` | `24` | Pin diameter in pixels |
| `onCommentCreate` | `(threadId, comment) => void` | -- | New comment callback |
| `onCommentEdit` | `(threadId, commentId, text) => void` | -- | Edit callback |
| `onCommentDelete` | `(threadId, commentId) => void` | -- | Delete callback |
| `onThreadResolve` | `(threadId, resolvedBy) => void` | -- | Resolve callback |
| `onThreadUnresolve` | `(threadId) => void` | -- | Unresolve callback |
| `onPinCreate` | `(pin) => void` | -- | New pin callback |
| `onPinMove` | `(pinId, x, y) => void` | -- | Pin repositioned callback |
| `onPinDelete` | `(pinId) => void` | -- | Pin deleted callback |
| `onMention` | `(userId, threadId, commentId) => void` | -- | @mention used |
| `onMentionSearch` | `(query) => Promise<MentionUser[]>` | -- | Async mention search |
| `onPinClick` | `(pinId) => void` | -- | Pin clicked |

## API Methods

| Method | Description |
|--------|-------------|
| `addPin(pin)` | Add a pin with its thread |
| `removePin(pinId)` | Remove a pin and thread |
| `updatePin(pinId, updates)` | Update pin properties |
| `getPin(pinId)` | Get pin by ID |
| `getAllPins()` | Get all pins |
| `addComment(threadId, comment)` | Add a comment to a thread |
| `updateComment(threadId, commentId, text)` | Update comment text |
| `removeComment(threadId, commentId)` | Remove a comment |
| `resolveThread(threadId, resolvedBy)` | Resolve a thread |
| `unresolveThread(threadId)` | Reopen a thread |
| `setMentionUsers(users)` | Update mention user list |
| `openThread(pinId)` | Open thread popover |
| `closeAllThreads()` | Close all popovers |
| `enterPlacementMode()` | Enter pin placement mode |
| `exitPlacementMode()` | Exit placement mode |
| `reposition()` | Recalculate pin positions |
| `setVisible(visible)` | Show/hide overlay |
| `setResolvedFilter(show)` | Filter by resolved state |
| `getElement()` | Get overlay DOM element |
| `exportComments()` | Export as JSON string |
| `destroy()` | Full teardown |

## Keyboard

| Key | Context | Action |
|-----|---------|--------|
| **Enter / Space** | Pin focused | Open thread popover |
| **Escape** | Popover open | Close popover |
| **Escape** | Placement mode | Cancel placement |
| **Enter** | Reply input | Send reply |
| **Shift+Enter** | Reply input | Newline |
| **Ctrl+Enter** | Edit textarea | Save edit |
| **Escape** | Edit textarea | Cancel edit |
| **ArrowDown/Up** | @mention dropdown | Navigate suggestions |
| **Enter** | @mention highlighted | Select user |
| **Escape** | @mention dropdown | Close dropdown |

## @Mention Format

Mentions are stored as `@[userId]` in comment text. When rendered, they are resolved against the `mentionUsers` list and displayed as styled chips. Use `onMentionSearch` for async user lookups.

See `specs/commentoverlay.prd.md` for the full specification.
