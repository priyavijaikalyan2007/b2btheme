<!-- AGENT: PRD for the CommandPalette component — keyboard-first omnibar for searching and executing registered commands. -->

# CommandPalette Component

**Status:** Draft
**Component name:** CommandPalette
**Folder:** `./components/commandpalette/`
**Spec author:** Agent
**Date:** 2026-02-20

---

## 1. Overview

### 1.1 What Is It

A keyboard-first command palette (omnibar) that provides instant access to application commands, navigation, and actions through a single unified search interface. The palette is triggered by a global hotkey (Ctrl+K on Windows/Linux, Cmd+K on macOS), renders as a full-viewport overlay with a centered search input and scrollable results list, and supports fuzzy searching across all registered commands with match highlighting.

The component is a **singleton** -- only one command palette instance exists per page. Commands are registered declaratively or programmatically, grouped into categories, and searchable by label, keywords, and description. A "Recent" section surfaces the most recently executed commands, persisted to `localStorage` for cross-session continuity.

### 1.2 Why Build It

Enterprise SaaS applications accumulate hundreds of actions, navigation targets, and settings. Traditional menu bars and button toolbars become unwieldy at scale. A command palette solves this by:

- **Reducing navigation friction** -- users reach any action in two keystrokes (hotkey + type).
- **Improving discoverability** -- fuzzy search surfaces commands users may not know exist.
- **Accelerating power users** -- keyboard-first design eliminates mouse dependency.
- **Centralising commands** -- a single registry replaces scattered menus, toolbars, and settings links.
- **Maintaining keyboard shortcuts awareness** -- displaying shortcut badges alongside commands educates users about direct shortcuts.

Without a dedicated component, developers build ad hoc search modals with inconsistent keyboard handling, no fuzzy search, no recent history, and no accessibility. A purpose-built command palette provides all of these with zero external dependencies.

### 1.3 Design Inspiration

| Source | Key Pattern Adopted |
|--------|---------------------|
| VS Code Command Palette (Ctrl+Shift+P) | Centred modal, fuzzy search, category grouping, keyboard shortcut display |
| Linear (Cmd+K) | Clean overlay, recent commands section, minimal chrome |
| Raycast | Fast fuzzy matching, category headers, action callbacks |
| GitHub Command Palette | Full-viewport backdrop, grouped results, keyboard navigation |
| Vercel Dashboard | Centred search modal, clean aesthetic, responsive width |
| Slack (Cmd+K) | Quick channel/action switcher, recent items, match highlighting |
| Figma Quick Actions | Compact results, icon + label + shortcut layout |

### 1.4 Open Source Evaluation

| Library | Verdict | Reason |
|---------|---------|--------|
| cmdk (pacocoursey) | Not recommended | React-only; incompatible with vanilla TypeScript architecture |
| ninja-keys | Useful reference | Lit-based web component; good API design but brings Lit dependency |
| kbar | Not recommended | React-only; heavy abstraction layer |
| command-score | Useful reference | MIT, 2KB, good fuzzy scoring algorithm; reference for scoring logic |
| Bootstrap 5 Modal | Foundation | Native backdrop and z-index patterns reusable for overlay |

**Decision:** Build custom. Implement a lightweight fuzzy search with substring + character-skip scoring (no external library). Use Bootstrap 5 z-index patterns for the overlay layer. Follow the singleton pattern established by the ToastContainer component.

---

## 2. Anatomy

### 2.1 Full Palette (with results)

```
+======================================================================+
|                        (backdrop overlay)                             |
|                                                                       |
|          +---------------------------------------------+              |
|          | [bi-search] [Type a command...            ]  |              |
|          +---------------------------------------------+              |
|          |   Recent                                     |              |
|          |   [bi-arrow-counterclockwise] Open Settings             Ctrl+, |
|          |   [bi-arrow-counterclockwise] Toggle Sidebar            Ctrl+B |
|          +---------------------------------------------+              |
|          |   Navigation                                 |              |
|          |   [bi-file-earmark] Go to Dashboard          |              |
|          |   [bi-graph-up] Go to Analytics              Ctrl+D |
|          |   [bi-person] Go to Profile                  |              |
|          +---------------------------------------------+              |
|          |   Actions                                    |              |
|          |   [bi-save] Save Document                    Ctrl+S |
|          |   [bi-clipboard] Copy to Clipboard           Ctrl+C |
|          |   [bi-trash] Delete Selected                 Del    |
|          +---------------------------------------------+              |
|          |   Showing 10 of 24 results  [Show all]       |              |
|          +---------------------------------------------+              |
|                                                                       |
+======================================================================+
```

### 2.2 Empty State (no results)

```
+---------------------------------------------+
| [bi-search] [search query text...         ]  |
+---------------------------------------------+
|                                               |
|      No commands found for "xyzzy"            |
|                                               |
+---------------------------------------------+
```

### 2.3 Element Breakdown

| Element | Required | Description |
|---------|----------|-------------|
| Backdrop overlay | Yes | Full-viewport semi-transparent overlay that dims the page. Click to close. |
| Palette container | Yes | Centred card containing the search input and results list. |
| Search input | Yes | Text input with search icon and placeholder text. |
| Search icon | Yes | `bi-search` Bootstrap Icons class, positioned inside the input. |
| Results list | Yes | Scrollable list of matched commands. |
| Category header | Conditional | Non-interactive header row separating command categories. |
| Recent header | Conditional | Header for the recent commands section (shown when no query). |
| Result item | Yes (1+) | Individual command row: icon + label + description + shortcut badge. |
| Result item icon | Optional | Bootstrap Icons class from the command registration. |
| Result item label | Yes | Primary command text with fuzzy match highlighting. |
| Result item description | Optional | Secondary text below the label. |
| Shortcut badge | Optional | Keyboard shortcut display (decorative, not interactive). |
| "Show all" footer | Conditional | Shown when results exceed `maxResults`. Click to reveal all. |
| Empty state message | Conditional | Shown when no commands match the query. |

---

## 3. API

### 3.1 Interfaces

```typescript
/** A single command registered with the palette. */
interface PaletteCommand
{
    /** Unique identifier for this command. */
    id: string;

    /** Display label shown in the results list. */
    label: string;

    /** Bootstrap Icons class (e.g., "bi-save"). */
    icon?: string;

    /** Grouping category (e.g., "Navigation", "Actions", "Settings"). */
    category?: string;

    /** Display-only keyboard shortcut string (e.g., "Ctrl+S"). */
    shortcut?: string;

    /** Additional search terms not visible in the UI. */
    keywords?: string[];

    /** Secondary text shown below the label. */
    description?: string;

    /** When true, the command appears in results but cannot be executed. Default: false. */
    disabled?: boolean;

    /** When true, the command is registered but excluded from search results. Default: false. */
    hidden?: boolean;

    /** Callback executed when the command is selected. May return a Promise. */
    action: () => void | Promise<void>;
}

/** Configuration options for the CommandPalette. */
interface CommandPaletteOptions
{
    /** Initial set of commands to register. */
    commands?: PaletteCommand[];

    /** Placeholder text for the search input. Default: "Type a command...". */
    placeholder?: string;

    /** Global hotkey string. Default: "ctrl+k". Use "meta+k" for Cmd on macOS. */
    hotkey?: string;

    /** Maximum number of results shown before "Show all" footer appears. Default: 20. */
    maxResults?: number;

    /** Show the recent commands section when the query is empty. Default: true. */
    showRecent?: boolean;

    /** Maximum number of recent commands to display. Default: 5. */
    maxRecent?: number;

    /** Show keyboard shortcut badges in result items. Default: true. */
    showShortcuts?: boolean;

    /** Group results by category with headers. Default: true. */
    showCategories?: boolean;

    /** CSS width of the palette container. Default: "600px". */
    width?: string;

    /** CSS z-index for the backdrop and palette. Default: 1080. */
    zIndex?: number;

    /** Backdrop opacity (0 to 1). Default: 0.5. */
    backdropOpacity?: number;

    /** Additional CSS class(es) on the palette root element. */
    cssClass?: string;

    /** Called when the palette opens. */
    onOpen?: () => void;

    /** Called when the palette closes. */
    onClose?: () => void;

    /** Called when a command is selected. Fires before the command's action. */
    onSelect?: (command: PaletteCommand) => void;

    /** Called on every search query change. */
    onSearch?: (query: string) => void;
}
```

### 3.2 Class: CommandPalette

| Method | Description |
|--------|-------------|
| `static getInstance()` | Returns the singleton CommandPalette instance. Creates one with defaults if none exists. |
| `static configure(options)` | Configures the singleton instance. Creates it if it does not exist. Merges options with existing configuration. |
| `registerCommand(command)` | Registers a single command. Replaces if `id` already exists. |
| `registerCommands(commands)` | Registers multiple commands. Replaces any with matching `id`. |
| `unregisterCommand(commandId)` | Removes a command by ID. No-op if not found. |
| `setCommands(commands)` | Replaces all registered commands with the given array. |
| `getCommand(commandId)` | Returns a registered command by ID, or `undefined`. |
| `getCommands()` | Returns an array of all registered commands. |
| `open()` | Opens the palette. Builds the DOM, attaches to `<body>`, traps focus. |
| `close()` | Closes the palette. Removes DOM, restores focus to the previously focused element. |
| `isOpen()` | Returns `true` if the palette is currently visible. |
| `clearRecent()` | Clears the recent commands list from memory and `localStorage`. |
| `destroy()` | Closes the palette, removes the global hotkey listener, and nulls the singleton reference. |

### 3.3 Global Convenience Functions

| Function | Description |
|----------|-------------|
| `openCommandPalette()` | Opens the singleton palette. Creates it with defaults if needed. |
| `registerCommand(command)` | Registers a command on the singleton palette. |
| `registerCommands(commands)` | Registers multiple commands on the singleton palette. |

### 3.4 Global Exports

```typescript
window.CommandPalette = CommandPalette;
window.openCommandPalette = openCommandPalette;
window.registerCommand = registerCommand;
window.registerCommands = registerCommands;
```

---

## 4. Behaviour

### 4.1 Singleton Pattern

A module-level `instance` variable holds the single CommandPalette instance. It is created lazily on the first call to `CommandPalette.getInstance()`, `CommandPalette.configure()`, or any global convenience function. Only one palette can exist per page. Calling `CommandPalette.configure()` after the instance exists merges the new options into the existing configuration.

### 4.2 Lifecycle

```
[Registered] --> [Hotkey pressed] --> [Open / DOM created] --> [User types / navigates]
                                                                    --> [Command selected / Escape]
                                                                        --> [Close / DOM removed]
```

1. **Registered** -- Commands are registered via `registerCommand()` or `registerCommands()`. The palette DOM does not exist yet.
2. **Open** -- On hotkey press or `open()` call, the palette builds its DOM, appends to `<body>`, and traps focus in the search input. The backdrop overlay fades in (150ms).
3. **Active** -- The user types to filter commands. Results update on every keystroke. Arrow keys navigate results.
4. **Select** -- The user presses Enter or clicks a result. The command's `action()` is invoked. The palette closes.
5. **Close** -- On Escape, backdrop click, or `close()` call. The DOM is removed from the page. Focus returns to the previously focused element.

### 4.3 Hotkey Handling

The palette listens for a global `keydown` event on `document`:

- Default hotkey: `ctrl+k` (Windows/Linux) and `meta+k` (macOS).
- The hotkey string is parsed into modifier keys (`ctrl`, `meta`, `shift`, `alt`) and a base key.
- On match, `event.preventDefault()` is called to suppress browser defaults (e.g., Ctrl+K opens the address bar in some browsers).
- If the palette is already open, the hotkey closes it (toggle behaviour).
- The hotkey listener is registered once when the singleton is created and removed on `destroy()`.

**Platform detection:** The component detects macOS via `navigator.platform` or `navigator.userAgentData` and automatically maps `ctrl+k` to `meta+k` on macOS unless the consumer explicitly sets a different hotkey.

### 4.4 Fuzzy Search Algorithm

The palette implements a lightweight fuzzy search without external libraries.

**Matching strategy (in priority order):**

1. **Exact prefix match** -- Query matches the start of the label. Highest score.
2. **Substring match** -- Query appears as a contiguous substring anywhere in the label.
3. **Character-skip match** -- Each character in the query appears in the label in order, but not necessarily contiguously (e.g., "gda" matches "Go to Dashboard").
4. **Keyword match** -- Query matches any keyword in the command's `keywords` array (substring match).
5. **Description match** -- Query matches the command's `description` (substring match, lower score).

**Scoring factors:**

- Match position: earlier matches score higher.
- Match contiguity: consecutive character matches score higher than scattered matches.
- Match case: exact case matches receive a small bonus.
- Keyword match: lower score than label match but higher than description match.

**Search scope:** The fuzzy search compares against `label`, `keywords`, and `description`. The `id` field is not searched (it is a programmatic identifier, not user-facing text).

**Performance:** All comparisons are case-insensitive. The search runs synchronously on every keystroke for command sets up to 500 commands. For larger sets, a 100ms debounce is applied.

### 4.5 Match Highlighting

When results are rendered, the matched characters in the label are wrapped in `<mark class="commandpalette-match">` elements for visual highlighting. This uses DOM manipulation with `textContent` for non-matched spans and `<mark>` elements for matched characters. No `innerHTML` is used with user-provided content.

### 4.6 Category Grouping

When `showCategories` is enabled (default):

- Results are grouped by their `category` property.
- Each group is preceded by a non-interactive category header row.
- Groups are ordered by the position of their first matching result in the scored list.
- Commands with no `category` are placed in an implicit "Other" group at the bottom.
- When the search query is empty and `showRecent` is enabled, the "Recent" group appears first, followed by category groups.

When `showCategories` is disabled:

- Results are rendered as a flat list sorted by fuzzy score (highest first).
- No category headers are shown.

### 4.7 Recent Commands

When `showRecent` is enabled (default):

- Each time a command is executed, its `id` is pushed to the front of the recent list.
- Duplicate entries are removed (only the most recent occurrence is kept).
- The list is capped at `maxRecent` entries (default 5).
- The recent list is persisted to `localStorage` under the key `"commandpalette-recent"`.
- When the palette opens with an empty query, the "Recent" section appears above category groups.
- Recent items display a `bi-arrow-counterclockwise` icon prefix to distinguish them from search results.
- If a recently used command is later unregistered, it is silently removed from the recent list.

**localStorage safety:** All `localStorage` access is wrapped in try/catch. If storage is unavailable or the stored data is corrupt, the recent list falls back to an empty array and a warning is logged.

### 4.8 Max Results and "Show All"

When the total number of matching commands exceeds `maxResults` (default 20):

- Only the top `maxResults` results are rendered.
- A footer row appears: "Showing N of M results" with a "Show all" link.
- Clicking "Show all" renders all matching results and hides the footer.
- The expanded state is reset when the query changes.

### 4.9 Command Execution

When a command is selected (Enter on highlighted result, or click):

1. The `onSelect` callback fires (if configured) with the command.
2. The command's `action()` is invoked.
3. If `action()` returns a Promise, the palette waits for it to settle (no loading indicator in v1).
4. The command's `id` is added to the recent list.
5. The palette closes.
6. If the command is `disabled`, the selection is ignored. The highlight remains and no action fires.

### 4.10 Backdrop Behaviour

- The backdrop is a full-viewport `<div>` with `position: fixed` covering the entire screen.
- Background colour: `rgba($gray-900, backdropOpacity)` where `backdropOpacity` defaults to 0.5.
- Clicking the backdrop closes the palette.
- The backdrop has `aria-hidden="true"` (it is a visual-only element).
- The backdrop fades in with a 150ms CSS opacity transition on open, and fades out on close.

---

## 5. Styling

### 5.1 CSS Classes

All classes use the `.commandpalette-` prefix.

| Class | Description |
|-------|-------------|
| `.commandpalette-backdrop` | Full-viewport backdrop overlay |
| `.commandpalette-container` | Centred palette card (search input + results) |
| `.commandpalette-search` | Search input row container |
| `.commandpalette-search-icon` | Search icon (bi-search) inside the input row |
| `.commandpalette-input` | Text input element |
| `.commandpalette-results` | Scrollable results list container |
| `.commandpalette-category` | Category header row (non-interactive) |
| `.commandpalette-item` | Individual result item row |
| `.commandpalette-item-highlighted` | Currently highlighted result (keyboard/hover) |
| `.commandpalette-item-disabled` | Disabled command result |
| `.commandpalette-item-icon` | Command icon element |
| `.commandpalette-item-content` | Flex column for label + description |
| `.commandpalette-item-label` | Primary command label text |
| `.commandpalette-item-description` | Secondary description text below the label |
| `.commandpalette-item-shortcut` | Keyboard shortcut badge (right-aligned) |
| `.commandpalette-match` | Highlighted matched characters within a label |
| `.commandpalette-recent-icon` | Recent command indicator icon (bi-arrow-counterclockwise) |
| `.commandpalette-empty` | Empty state message ("No commands found") |
| `.commandpalette-footer` | "Showing N of M results" footer row |
| `.commandpalette-footer-link` | "Show all" clickable link in the footer |
| `.commandpalette-entering` | Entrance animation state |
| `.commandpalette-exiting` | Exit animation state |

### 5.2 Theme Integration

| Property | Value | Source |
|----------|-------|--------|
| Backdrop | `rgba($gray-900, 0.5)` | Dim overlay |
| Container background | `$gray-50` | Clean, neutral card |
| Container border | `1px solid $gray-300` | Consistent with cards and panels |
| Container box shadow | `0 8px 32px rgba($gray-900, 0.24)` | Elevated modal-like depth |
| Search input background | `$gray-50` | Seamless with container |
| Search input text | `$gray-900` | Primary text colour |
| Search input placeholder | `$gray-500` | Muted placeholder |
| Search icon | `$gray-400` | Subtle icon |
| Search input border-bottom | `1px solid $gray-300` | Separator between input and results |
| Category header text | `$gray-500`, `$font-size-sm`, `$font-weight-semibold` | Subdued but readable |
| Category header background | `$gray-100` | Subtle grouping highlight |
| Result item background | `transparent` | Clean default |
| Result item hover / highlight | `$gray-200` | Visible selection indicator |
| Result item text | `$gray-900` | Primary text |
| Result item description | `$gray-500`, `$font-size-sm` | Secondary text |
| Result item icon | `$gray-600` | Muted icon colour |
| Disabled item text | `$gray-400` | Standard disabled pattern |
| Disabled item opacity | `0.6` | Reduced salience |
| Shortcut badge background | `$gray-200` | Subtle badge |
| Shortcut badge text | `$gray-600`, `$font-size-sm` | Muted, compact |
| Shortcut badge border | `1px solid $gray-300` | Defined key-cap appearance |
| Match highlight | `$font-weight-bold`, `$yellow-100` background | Visible match indicator |
| Recent icon | `$gray-400` | Subtle indicator |
| Empty state text | `$gray-500` | Muted message |
| Footer text | `$gray-500`, `$font-size-sm` | Muted info |
| Footer link | `$blue-600` | Standard link colour |
| Font | inherits `$font-family-base` | Theme font |
| Container width | `600px` (configurable via `width` option) | Comfortable reading width |
| Container max-height | `min(480px, 70vh)` | Prevents palette from dominating viewport |
| Container border-radius | `0` or `$border-radius` (per theme: 0-2px) | Enterprise theme rectangular |

### 5.3 Z-Index

| Element | Z-Index | Rationale |
|---------|---------|-----------|
| Toast container | 1070 | Below command palette |
| **CommandPalette backdrop** | **1080** | Above toasts, above all layout components |
| **CommandPalette container** | **1081** | Above its own backdrop |
| Bootstrap Modal | 1050 | Below toasts and command palette |
| Toolbar popups | 1060 | Below toasts |
| BannerBar | 1045 | Below modals |
| StatusBar | 1040 | Below BannerBar |
| Sidebar | 1035-1037 | Below StatusBar |

The command palette sits at z-index 1080-1081, above toasts (1070) and all other fixed UI elements. This ensures the palette is always the topmost interactive element when open, consistent with its modal nature.

### 5.4 Dimensions

| Property | Value |
|----------|-------|
| Container width | `600px` (configurable) |
| Container max-height | `min(480px, 70vh)` |
| Search input height | `48px` |
| Search input font size | `$font-size-base * 1.15` (slightly larger for prominence) |
| Search icon size | `18px` |
| Result item height | `auto` (minimum `40px`) |
| Result item padding | `8px 16px` |
| Category header padding | `6px 16px` |
| Shortcut badge padding | `2px 6px` |
| Results list max-height | Container max-height minus search input height |
| Gap between result items | `0` (items are contiguous, separated by background change) |

### 5.5 Reduced Motion

A `prefers-reduced-motion: reduce` media query disables the backdrop fade and container scale transitions. The palette appears and disappears instantly (or with a simple opacity fade, 100ms) to avoid vestibular-triggering motion.

---

## 6. DOM Structure

### 6.1 Full Palette

```html
<!-- Backdrop -->
<div class="commandpalette-backdrop" aria-hidden="true"></div>

<!-- Palette container -->
<div class="commandpalette-container"
     role="dialog"
     aria-modal="true"
     aria-label="Command palette">

    <!-- Search input row -->
    <div class="commandpalette-search">
        <i class="bi bi-search commandpalette-search-icon" aria-hidden="true"></i>
        <input class="commandpalette-input"
               type="text"
               role="combobox"
               aria-autocomplete="list"
               aria-expanded="true"
               aria-controls="commandpalette-results"
               aria-activedescendant=""
               placeholder="Type a command..."
               autocomplete="off"
               spellcheck="false">
    </div>

    <!-- Results list -->
    <div class="commandpalette-results"
         id="commandpalette-results"
         role="listbox"
         aria-label="Command results">

        <!-- Category header -->
        <div class="commandpalette-category" role="presentation">
            Recent
        </div>

        <!-- Recent result item -->
        <div class="commandpalette-item commandpalette-item-highlighted"
             id="commandpalette-item-open-settings"
             role="option"
             aria-selected="true"
             data-command-id="open-settings">
            <i class="bi bi-arrow-counterclockwise commandpalette-recent-icon"
               aria-hidden="true"></i>
            <i class="bi bi-gear commandpalette-item-icon" aria-hidden="true"></i>
            <div class="commandpalette-item-content">
                <span class="commandpalette-item-label">Open Settings</span>
            </div>
            <kbd class="commandpalette-item-shortcut" aria-hidden="true">Ctrl+,</kbd>
        </div>

        <!-- Category header -->
        <div class="commandpalette-category" role="presentation">
            Navigation
        </div>

        <!-- Regular result item -->
        <div class="commandpalette-item"
             id="commandpalette-item-go-dashboard"
             role="option"
             aria-selected="false"
             data-command-id="go-dashboard">
            <i class="bi bi-file-earmark commandpalette-item-icon"
               aria-hidden="true"></i>
            <div class="commandpalette-item-content">
                <span class="commandpalette-item-label">Go to Dashboard</span>
                <span class="commandpalette-item-description">Navigate to the main dashboard</span>
            </div>
        </div>

        <!-- Disabled result item -->
        <div class="commandpalette-item commandpalette-item-disabled"
             id="commandpalette-item-deploy"
             role="option"
             aria-selected="false"
             aria-disabled="true"
             data-command-id="deploy">
            <i class="bi bi-cloud-upload commandpalette-item-icon"
               aria-hidden="true"></i>
            <div class="commandpalette-item-content">
                <span class="commandpalette-item-label">Deploy to Production</span>
                <span class="commandpalette-item-description">No active deployment configured</span>
            </div>
        </div>
    </div>

    <!-- Footer (when results exceed maxResults) -->
    <div class="commandpalette-footer">
        Showing 20 of 47 results
        <a class="commandpalette-footer-link" href="#" role="button">Show all</a>
    </div>
</div>
```

### 6.2 Empty State

```html
<div class="commandpalette-results"
     id="commandpalette-results"
     role="listbox"
     aria-label="Command results">
    <div class="commandpalette-empty" role="status">
        No commands found for "xyzzy"
    </div>
</div>
```

### 6.3 Match Highlighting

```html
<!-- "Go to Dashboard" with query "gda" -->
<span class="commandpalette-item-label">
    <mark class="commandpalette-match">G</mark>o to
    <mark class="commandpalette-match">D</mark>ashbo<mark class="commandpalette-match">a</mark>rd
</span>
```

Match highlighting is constructed using `document.createTextNode()` for non-matched text and `createElement("mark")` with `textContent` for matched characters. No `innerHTML` is used.

---

## 7. Keyboard Interaction

| Key | Palette Closed | Palette Open |
|-----|---------------|--------------|
| **Ctrl+K** (or configured hotkey) | Opens the palette | Closes the palette |
| **Typing** | N/A | Filters commands by fuzzy match |
| **ArrowDown** | N/A | Moves highlight to the next result item (skips category headers) |
| **ArrowUp** | N/A | Moves highlight to the previous result item (skips category headers) |
| **Enter** | N/A | Executes the highlighted command and closes the palette |
| **Escape** | N/A | Closes the palette without executing |
| **Backspace** | N/A | Deletes the last character in the search query |
| **Tab** | N/A | No effect (does not move focus out of the input; results are navigable via arrows only) |
| **Home** | N/A | Highlights the first result item |
| **End** | N/A | Highlights the last result item |
| **PageDown** | N/A | Scrolls the results list down by one page (~10 visible items) |
| **PageUp** | N/A | Scrolls the results list up by one page |

### 7.1 Highlight Behaviour

- When the palette opens, the first result item is highlighted by default.
- ArrowDown/Up wraps around: moving past the last item wraps to the first, and vice versa.
- When the user types and results change, the highlight resets to the first result.
- Category headers are skipped during keyboard navigation (they are `role="presentation"`).
- The highlighted item is scrolled into view using `element.scrollIntoView({ block: "nearest" })`.

### 7.2 Focus Trapping

While the palette is open, focus is trapped within the palette:

- Tab and Shift+Tab are intercepted and do not move focus outside the palette.
- Focus remains on the search input at all times. Arrow keys control the highlight; they do not move DOM focus.
- When the palette closes, focus returns to the element that was focused before the palette opened.

---

## 8. Accessibility

### 8.1 ARIA Roles and Attributes

| Element | Attribute | Value |
|---------|-----------|-------|
| Backdrop | `aria-hidden` | `"true"` (visual only) |
| Palette container | `role` | `"dialog"` |
| Palette container | `aria-modal` | `"true"` |
| Palette container | `aria-label` | `"Command palette"` |
| Search input | `role` | `"combobox"` |
| Search input | `aria-autocomplete` | `"list"` |
| Search input | `aria-expanded` | `"true"` (always, while palette is open) |
| Search input | `aria-controls` | ID of the results listbox |
| Search input | `aria-activedescendant` | ID of the currently highlighted option |
| Results container | `role` | `"listbox"` |
| Results container | `aria-label` | `"Command results"` |
| Result item | `role` | `"option"` |
| Result item | `aria-selected` | `"true"` on highlighted item, `"false"` on others |
| Disabled result item | `aria-disabled` | `"true"` |
| Category header | `role` | `"presentation"` |
| Shortcut badge | `aria-hidden` | `"true"` (decorative) |
| Icons | `aria-hidden` | `"true"` (decorative) |
| Empty state | `role` | `"status"` |

### 8.2 Screen Reader Behaviour

- When the palette opens, screen readers announce "Command palette" via the dialog role.
- As the user navigates results with arrow keys, the highlighted item is announced via `aria-activedescendant`.
- When search results change, the empty state message is announced via `role="status"`.
- Shortcut badges are `aria-hidden="true"` because they are decorative display-only hints; the actual keyboard shortcut handling is separate from the palette.

### 8.3 Focus Management

- Focus moves to the search input immediately when the palette opens.
- Focus is trapped within the palette (Tab does not leave).
- On close, focus returns to the element that had focus before the palette opened (stored via `document.activeElement`).

### 8.4 Colour Contrast

- All text meets WCAG AA contrast ratios (4.5:1 for normal text, 3:1 for large text).
- The highlighted result item uses `$gray-200` background with `$gray-900` text, providing sufficient contrast.
- Disabled items use reduced opacity but maintain minimum 3:1 contrast.

---

## 9. Dependencies

| Dependency | Required | Notes |
|------------|----------|-------|
| Bootstrap 5 CSS | Yes | For `$gray-*`, `$blue-*`, `$yellow-*` SCSS variables |
| Bootstrap Icons | Yes | For `bi-search`, `bi-arrow-counterclockwise`, and command icons |
| Enterprise Theme CSS | Yes | For theme variable overrides |
| No JavaScript framework | -- | Vanilla TypeScript only |
| No external fuzzy search library | -- | Built-in fuzzy matching algorithm |

---

## 10. Edge Cases

| Scenario | Behaviour |
|----------|-----------|
| Zero registered commands | Palette opens with empty state: "No commands registered". |
| All commands hidden | Same as zero commands -- empty state message. |
| Query matches no commands | Empty state: "No commands found for [query]". |
| Very long command label | Truncated with `text-overflow: ellipsis`. Full text in `title` attribute. |
| Very long description | Truncated to one line with ellipsis. |
| Command `action()` throws | Error is caught, logged with `LOG_PREFIX`, and the palette closes normally. |
| Command `action()` returns rejected Promise | Same as above -- caught, logged, palette closes. |
| Duplicate command IDs via `registerCommand()` | The newer registration replaces the older one. |
| `unregisterCommand()` for a command in the recent list | Command is removed from the recent list on next palette open. |
| Hotkey pressed while a Bootstrap modal is open | The palette opens above the modal (z-index 1080 > 1050). Closing the palette returns focus to the modal. |
| Hotkey pressed while palette is already open | Palette closes (toggle behaviour). |
| Rapid open/close | Debounced with a 100ms cooldown to prevent flickering. |
| `localStorage` unavailable | Recent commands work in-memory only. Warning logged on first `localStorage` failure. |
| `localStorage` data corrupt | Recent list resets to empty array. Warning logged. |
| Browser prevents `preventDefault` on Ctrl+K | Some browsers may intercept Ctrl+K for the address bar. The component calls `preventDefault()` as early as possible. If the browser still captures the event, the user can configure an alternative hotkey. |
| Multiple calls to `registerCommand()` with same ID | Last registration wins. No error. |
| `destroy()` called while palette is open | Palette closes, hotkey listener removed, singleton reference cleared. |
| Window resize while palette is open | Palette re-centres itself (CSS `transform: translate` or flexbox centring). |
| Mobile / touch devices | Palette can be opened programmatically via `open()`. Hotkey is not applicable. Touch scrolling works in the results list. |

---

## 11. Integration with Existing Components

### 11.1 Toolbar

Toolbar tools can register themselves as palette commands:

```typescript
registerCommand({
    id: "toolbar-bold",
    label: "Bold",
    icon: "bi-type-bold",
    category: "Formatting",
    shortcut: "Ctrl+B",
    action: () => toolbar.setToolState("bold", { active: !toolbar.getToolState("bold").active })
});
```

### 11.2 Sidebar

Sidebar visibility can be toggled from the command palette:

```typescript
registerCommand({
    id: "toggle-sidebar",
    label: "Toggle Sidebar",
    icon: "bi-layout-sidebar",
    category: "View",
    shortcut: "Ctrl+B",
    action: () => sidebar.toggleCollapse()
});
```

### 11.3 StatusBar

The status bar can display a clickable indicator that opens the command palette:

```typescript
statusBar.addItem({
    id: "command-palette-trigger",
    text: "Ctrl+K",
    icon: "bi-search",
    onClick: () => openCommandPalette()
});
```

---

## 12. Files

| File | Purpose |
|------|---------|
| `specs/commandpalette.prd.md` | This specification |
| `components/commandpalette/commandpalette.ts` | TypeScript source |
| `components/commandpalette/commandpalette.scss` | Styles |
| `components/commandpalette/README.md` | Component documentation |

Output in `dist/`:

| File | Purpose |
|------|---------|
| `dist/components/commandpalette/commandpalette.js` | Compiled JavaScript (IIFE-wrapped) |
| `dist/components/commandpalette/commandpalette.css` | Compiled CSS |

---

## 13. Implementation Notes

### 13.1 Fuzzy Search Implementation

```typescript
/** Score a command against a query string. Returns 0 for no match. */
function fuzzyScore(query: string, text: string): number
{
    const lowerQuery = query.toLowerCase();
    const lowerText = text.toLowerCase();

    // Exact prefix match — highest score
    if (lowerText.startsWith(lowerQuery))
    {
        return 100 + (query.length / text.length) * 50;
    }

    // Substring match — high score
    const subIndex = lowerText.indexOf(lowerQuery);
    if (subIndex >= 0)
    {
        return 80 - subIndex;
    }

    // Character-skip match — variable score based on contiguity
    let score = 0;
    let queryIndex = 0;
    let consecutive = 0;

    for (let i = 0; i < lowerText.length && queryIndex < lowerQuery.length; i++)
    {
        if (lowerText[i] === lowerQuery[queryIndex])
        {
            queryIndex++;
            consecutive++;
            score += consecutive * 2;
        }
        else
        {
            consecutive = 0;
        }
    }

    return queryIndex === lowerQuery.length ? score : 0;
}
```

The actual implementation should score across `label`, `keywords`, and `description`, taking the highest score. The match positions should be tracked for highlighting.

### 13.2 DOM Construction Pattern

The palette DOM is built on `open()` and removed on `close()`. This avoids stale DOM state and keeps the page clean when the palette is not visible. DOM elements are created using `createElement()` and `setAttr()` helpers per project conventions. All user-provided text (labels, descriptions) is set via `textContent`, never `innerHTML`.

### 13.3 Event Listener Cleanup

- The global `keydown` listener for the hotkey is registered once on singleton creation and removed on `destroy()`.
- The palette-specific listeners (input, keydown within palette, click on backdrop/results) are registered on `open()` and removed on `close()`.
- Use `AbortController` with `signal` option on `addEventListener` for clean bulk removal.

### 13.4 Recent Commands Persistence

```typescript
const RECENT_KEY = "commandpalette-recent";

function loadRecent(): string[]
{
    try
    {
        const raw = localStorage.getItem(RECENT_KEY);
        if (!raw) { return []; }
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    }
    catch (e)
    {
        console.warn(LOG_PREFIX, "Failed to load recent commands:", e);
        return [];
    }
}

function saveRecent(ids: string[]): void
{
    try
    {
        localStorage.setItem(RECENT_KEY, JSON.stringify(ids));
    }
    catch (e)
    {
        console.warn(LOG_PREFIX, "Failed to save recent commands:", e);
    }
}
```

### 13.5 Performance Considerations

- **DOM construction:** Build the entire results list in a `DocumentFragment` before appending to the DOM to minimise reflows.
- **Keystroke handling:** For command sets under 500, run fuzzy search synchronously. For larger sets, debounce at 100ms.
- **Result rendering:** Only render up to `maxResults` items initially. The "Show all" action renders the remainder.
- **Scroll performance:** Use `overflow-y: auto` on the results container. No virtual scrolling is needed for typical command sets (under 500).
- **Match highlighting:** Pre-compute match positions during scoring to avoid a second pass during rendering.

### 13.6 Target Code Size

The implementation should target approximately 240-280 lines of TypeScript, following the project convention of small, focused functions (25-30 lines maximum per function). Key functions:

- `fuzzyScore()` -- Scoring algorithm (~25 lines).
- `fuzzySearch()` -- Orchestrates search across commands (~20 lines).
- `buildResults()` -- Constructs the results DOM (~25 lines).
- `buildResultItem()` -- Constructs a single result item DOM (~20 lines).
- `highlightMatches()` -- Wraps matched characters in `<mark>` elements (~20 lines).
- `handleKeydown()` -- Keyboard event dispatcher (~25 lines).
- `open()` / `close()` -- Lifecycle methods (~20 lines each).
- `registerCommand()` / `unregisterCommand()` -- Registry management (~10 lines each).

---

## 14. Future Considerations (Out of Scope for v1)

These features are explicitly deferred:

- **Nested submenus** -- Commands that open sub-palettes with further options.
- **Dynamic command providers** -- Asynchronous command sources (e.g., fetching commands from a server API).
- **Command history search** -- Searching through previously executed commands beyond the recent list.
- **Theming modes** -- Dark mode / light mode toggle within the palette.
- **Custom result renderers** -- Consumer-provided DOM templates for result items.
- **Pinned commands** -- User-pinnable favourite commands that always appear at the top.
- **Context-sensitive commands** -- Commands that appear or hide based on application state (e.g., only show "Save" when a document is dirty).
