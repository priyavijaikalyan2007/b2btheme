# SprintPicker

Agile sprint selector with list and calendar views. Computes sprints from anchor date, sprint length, and week start day. Supports configurable naming and colored sprint band overlays.

## Usage

### CSS

```html
<link rel="stylesheet" href="components/sprintpicker/sprintpicker.css">
```

### JavaScript

```html
<script src="components/sprintpicker/sprintpicker.js"></script>
```

### Basic (List View)

```html
<div id="my-sprint-picker"></div>

<script>
const picker = createSprintPicker("my-sprint-picker", {
    anchorDate: new Date(2026, 0, 5), // Mon Jan 5 2026
    sprintLength: 2,
    onSelect: function(value) {
        console.log("Selected:", value.sprintName, value.date);
    }
});
</script>
```

### Calendar View

```html
<div id="calendar-sprint"></div>

<script>
const picker = createSprintPicker("calendar-sprint", {
    anchorDate: "2026-01-05",
    sprintLength: 1,
    viewMode: "calendar",
    onSelect: function(value) {
        console.log("Sprint:", value.sprintName);
    }
});
</script>
```

### Custom Naming

```html
<div id="custom-sprint"></div>

<script>
const picker = createSprintPicker("custom-sprint", {
    anchorDate: new Date(2026, 0, 5),
    sprintLength: 2,
    sprintNaming: function(index, start, end) {
        return "Iteration " + (index + 1);
    }
});
</script>
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `anchorDate` | `Date \| string` | **required** | First sprint start date |
| `sprintLength` | `1–8` | `2` | Sprint duration in weeks |
| `weekStartDay` | `0–6` | `1` (Mon) | Week start day |
| `mode` | `"start" \| "end"` | `"start"` | Date resolution mode |
| `maxSprints` | `number` | `26` | Maximum sprints to compute |
| `sprintNaming` | `SprintNaming` | `"sprint"` | Naming mode |
| `viewMode` | `"list" \| "calendar"` | `"list"` | Initial view |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Size variant |
| `disabled` | `boolean` | `false` | Disable the component |
| `readonly` | `boolean` | `false` | Read-only mode |
| `placeholder` | `string` | `"Select sprint…"` | Input placeholder |
| `onSelect` | `(value: SprintValue) => void` | — | Fires on selection |
| `onChange` | `(value: SprintValue \| null) => void` | — | Fires on value change |
| `onOpen` | `() => void` | — | Fires when dropdown opens |
| `onClose` | `() => void` | — | Fires when dropdown closes |
| `keyBindings` | `Record<string, string>` | — | Override default key combos |

## Sprint Naming Modes

| Mode | Example Output |
|------|---------------|
| `"sprint"` | Sprint 1, Sprint 2, … |
| `"short"` | S1, S2, … |
| `"monthly"` | Jan Sprint 1, Feb Sprint 2, … |
| `callback` | Custom function `(index, start, end) => string` |

## SprintValue

```typescript
interface SprintValue {
    sprintIndex: number;   // 0-based
    sprintName: string;    // Display name
    startDate: Date;       // Sprint start (Monday)
    endDate: Date;         // Sprint end (Friday)
    date: Date;            // Resolved date based on mode
}
```

## Public API

| Method | Returns | Description |
|--------|---------|-------------|
| `getValue()` | `SprintValue \| null` | Get current selection |
| `setValue(value)` | `void` | Set selection programmatically |
| `getFormattedValue()` | `string` | Get display string |
| `open()` | `void` | Open dropdown |
| `close()` | `void` | Close dropdown |
| `enable()` | `void` | Enable component |
| `disable()` | `void` | Disable component |
| `setReadonly(flag)` | `void` | Toggle read-only |
| `setMode(mode)` | `void` | Switch start/end mode |
| `setSprintLength(weeks)` | `void` | Change sprint length (recomputes) |
| `setAnchorDate(date)` | `void` | Change anchor date (recomputes) |
| `getSprintAtDate(date)` | `SprintInfo \| null` | Find sprint containing date |
| `getSprints()` | `SprintInfo[]` | Get all computed sprints |
| `destroy()` | `void` | Clean up DOM and listeners |

## Keyboard

### List View

| Key | Action |
|-----|--------|
| `ArrowUp` | Previous sprint |
| `ArrowDown` | Next sprint |
| `Home` | First sprint |
| `End` | Last sprint |
| `Enter` / `Space` | Select focused sprint |
| `v` | Toggle to calendar view |
| `Escape` | Close dropdown |

### Calendar View

| Key | Action |
|-----|--------|
| `ArrowLeft/Right` | Previous/next day |
| `ArrowUp/Down` | Previous/next week |
| `PageUp` | Previous month |
| `PageDown` | Next month |
| `Enter` / `Space` | Select sprint at focused day |
| `v` | Toggle to list view |
| `Escape` | Close dropdown |

## Sprint Computation

Sprints are computed from the anchor date:

```
start[i] = anchorDate + (i × sprintLength × 7) days
end[i]   = start[i] + (sprintLength × 7 - 3) days  // Friday
```

Example (2-week sprints, Mon Jan 5 2026):
- Sprint 1: Jan 5 – Jan 16
- Sprint 2: Jan 19 – Jan 30
- Sprint 3: Feb 2 – Feb 13

## Dropdown Positioning

The dropdown is portaled to `document.body` with `position: fixed` and `z-index: 2050`, ensuring it renders above FormDialog overlays (z-index 2001).
