<!-- AGENT: Documentation for the PresenceIndicator component — overlapping avatar stack. -->

# PresenceIndicator

A compact overlapping avatar stack showing who is actively viewing or editing a shared resource. Collapsed state shows overlapping circles with white ring borders and a "+N" overflow badge. Click to expand and reveal full PersonChip instances with names.

Designed for document headers, toolbar corners, and collaborative editing UIs similar to Google Docs' presence avatars.

## Assets

| Asset | Path |
|-------|------|
| CSS | `components/presenceindicator/presenceindicator.css` |
| JS | `components/presenceindicator/presenceindicator.js` |
| Types | `components/presenceindicator/presenceindicator.d.ts` |

## Requirements

- **Bootstrap CSS** — for SCSS variables (`$gray-50`, `$gray-300`, `$blue-600`, etc.)
- **PersonChip JS** — optional but recommended for rich avatars with status dots
- Does **not** require Bootstrap JS.

## Quick Start

```html
<link rel="stylesheet" href="components/personchip/personchip.css">
<link rel="stylesheet" href="components/presenceindicator/presenceindicator.css">
<script src="components/personchip/personchip.js"></script>
<script src="components/presenceindicator/presenceindicator.js"></script>
<script>
    var indicator = createPresenceIndicator("container-id", {
        people: [
            { id: "u1", name: "Alice Chen", status: "online" },
            { id: "u2", name: "Bob Smith", status: "busy" },
            { id: "u3", name: "Carol Davis", status: "away" }
        ]
    });
</script>
```

## API

### Global Functions

| Function | Returns | Description |
|----------|---------|-------------|
| `createPresenceIndicator(containerId, options)` | `PresenceIndicator` | Create and optionally mount an instance |

### PresenceIndicator Class

| Method | Returns | Description |
|--------|---------|-------------|
| `show(containerId)` | `void` | Mount into container |
| `getElement()` | `HTMLElement` | Root DOM element |
| `destroy()` | `void` | Cleanup chips, listeners, DOM |
| `setPeople(people)` | `void` | Replace all people |
| `addPerson(person)` | `void` | Add one person |
| `removePerson(id)` | `void` | Remove by ID |
| `getPeople()` | `PersonData[]` | Current list |
| `expand()` | `void` | Switch to expanded view |
| `collapse()` | `void` | Switch to collapsed view |
| `toggle()` | `void` | Toggle expanded/collapsed |
| `isExpanded()` | `boolean` | State query |

### PresenceIndicatorOptions

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `people` | `PersonData[]` | No | `[]` | Initial people list |
| `maxVisible` | `number` | No | `4` | Max avatars before overflow badge |
| `size` | `"sm"\|"md"\|"lg"` | No | `"md"` | Size variant |
| `expandable` | `boolean` | No | `true` | Allow expand/collapse |
| `expanded` | `boolean` | No | `false` | Initial expanded state |
| `cssClass` | `string` | No | — | Additional CSS class |
| `disabled` | `boolean` | No | `false` | Disable interaction |
| `onClick` | `(person) => void` | No | — | Person click callback (expanded) |
| `onExpand` | `() => void` | No | — | Expand callback |
| `onCollapse` | `() => void` | No | — | Collapse callback |

### PersonData

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | `string` | Yes | Unique identifier |
| `name` | `string` | Yes | Display name |
| `email` | `string` | No | Email address |
| `avatarUrl` | `string` | No | Image URL for avatar |
| `role` | `string` | No | Role or title |
| `status` | `"online"\|"offline"\|"busy"\|"away"` | No | Status dot indicator |
| `metadata` | `Record<string,string>` | No | Data attributes |

## Size Variants

| Size | Avatar Diameter | Overlap | Overflow Badge |
|------|----------------|---------|----------------|
| `sm` | 24px | -8px | 24px |
| `md` | 32px | -10px | 32px |
| `lg` | 40px | -12px | 40px |

## Accessibility

- Root element: `role="group"` with `aria-label` describing person count.
- Stack: `tabindex="0"` and `role="button"` when expandable.
- Live region announces expand/collapse state changes.
- Focus-visible: `2px solid $blue-600` outline on stack.

## Keyboard

| Key | Action |
|-----|--------|
| Enter | Toggle expand/collapse |
| Space | Toggle expand/collapse |
| Escape | Collapse if expanded |

## Examples

### Basic collapsed
```js
var indicator = createPresenceIndicator("my-container", {
    people: [
        { id: "1", name: "Alice Chen", status: "online" },
        { id: "2", name: "Bob Smith" },
        { id: "3", name: "Carol Davis", status: "away" }
    ]
});
```

### With overflow
```js
createPresenceIndicator("container", {
    people: sevenPeople,
    maxVisible: 4   // Shows 4 avatars + "+3" badge
});
```

### Programmatic control
```js
var pi = createPresenceIndicator(null, { people: initialPeople });
document.getElementById("target").appendChild(pi.getElement());

pi.addPerson({ id: "new", name: "Dave Wilson", status: "online" });
pi.expand();
pi.removePerson("new");
```

## ADR

ADR-038: PresenceIndicator composes PersonChip avatarOnly mode with runtime bridge pattern.
