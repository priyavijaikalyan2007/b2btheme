# CommandPalette

Keyboard-first command palette (Ctrl+K omnibar) for searching and executing registered commands with fuzzy matching, category grouping, recent history, and match highlighting.

## Assets

| File | Purpose |
|------|---------|
| `commandpalette.ts` | TypeScript source |
| `commandpalette.scss` | Component styles |
| `commandpalette.js` | Compiled JS (IIFE-wrapped) |
| `commandpalette.css` | Compiled CSS |

## Usage

```html
<link rel="stylesheet" href="components/commandpalette/commandpalette.css">
<script src="components/commandpalette/commandpalette.js"></script>
```

### Basic — Register Commands

```javascript
CommandPalette.configure({
    commands: [
        { id: "save", label: "Save Document", icon: "bi-save", category: "Actions", shortcut: "Ctrl+S", action: function() { console.log("Save!"); } },
        { id: "settings", label: "Open Settings", icon: "bi-gear", category: "Navigation", shortcut: "Ctrl+,", action: function() { console.log("Settings!"); } }
    ]
});
// Now press Ctrl+K (or Cmd+K on macOS) to open
```

### Programmatic Open

```javascript
openCommandPalette();
```

### Register Commands Individually

```javascript
registerCommand({
    id: "toggle-sidebar",
    label: "Toggle Sidebar",
    icon: "bi-layout-sidebar",
    category: "View",
    shortcut: "Ctrl+B",
    action: function() { sidebar.toggleCollapse(); }
});
```

## Interfaces

### PaletteCommand

```typescript
interface PaletteCommand {
    id: string;
    label: string;
    icon?: string;                   // Bootstrap Icons class
    category?: string;               // Grouping category
    shortcut?: string;               // Display-only shortcut badge
    keywords?: string[];             // Additional search terms
    description?: string;            // Secondary text
    disabled?: boolean;              // Default: false
    hidden?: boolean;                // Excluded from search. Default: false
    action: () => void | Promise<void>;
}
```

### CommandPaletteOptions

```typescript
interface CommandPaletteOptions {
    commands?: PaletteCommand[];
    placeholder?: string;            // Default: "Type a command..."
    hotkey?: string;                 // Default: "ctrl+k" ("meta+k" on macOS)
    maxResults?: number;             // Default: 20
    showRecent?: boolean;            // Default: true
    maxRecent?: number;              // Default: 5
    showShortcuts?: boolean;         // Default: true
    showCategories?: boolean;        // Default: true
    width?: string;                  // Default: "600px"
    zIndex?: number;                 // Default: 1080
    backdropOpacity?: number;        // Default: 0.5
    cssClass?: string;
    onOpen?: () => void;
    onClose?: () => void;
    onSelect?: (command: PaletteCommand) => void;
    onSearch?: (query: string) => void;
}
```

## API

| Method | Description |
|--------|-------------|
| `CommandPalette.getInstance()` | Returns singleton instance |
| `CommandPalette.configure(options)` | Configure the singleton |
| `registerCommand(cmd)` | Register a command |
| `registerCommands(cmds)` | Register multiple commands |
| `unregisterCommand(id)` | Remove a command |
| `setCommands(cmds)` | Replace all commands |
| `getCommand(id)` | Get a command by ID |
| `getCommands()` | Get all commands |
| `open()` | Open the palette |
| `close()` | Close the palette |
| `isOpen()` | Check if open |
| `clearRecent()` | Clear recent history |
| `destroy()` | Full cleanup |
| `openCommandPalette()` | Global: open singleton |

## Keyboard

| Key | Action |
|-----|--------|
| Ctrl+K (Cmd+K on macOS) | Open/close palette |
| Arrow Down | Highlight next result |
| Arrow Up | Highlight previous result |
| Enter | Execute highlighted command |
| Escape | Close palette |
| Home | Highlight first result |
| End | Highlight last result |
| Tab | Trapped (focus stays in input) |

## Fuzzy Search

The palette implements a lightweight fuzzy search:

1. **Exact prefix match** — Highest score
2. **Substring match** — High score
3. **Character-skip match** — Score based on contiguity
4. **Keyword match** — 70% of label match score
5. **Description match** — 50% of label match score

Matched characters are highlighted with `<mark>` elements.

## Singleton Pattern

Only one CommandPalette exists per page. Use `CommandPalette.configure()` or the global `registerCommand()` functions.

## Dependencies

- **Required:** Bootstrap 5 CSS, Bootstrap Icons
