<!-- AGENT: Documentation for the PersonChip component — compact person-identity chip. -->

# PersonChip

A compact inline element displaying a person's identity: circular avatar (image or deterministic initials), name, optional status dot, and email/role detail at large size. Visual style matches the UserMenu trigger — transparent background at rest, subtle gray on hover, zero border-radius.

Designed for share dialogs, assignment fields, permission lists, and future PeoplePicker dropdown rows.

## Assets

| Asset | Path |
|-------|------|
| CSS | `components/personchip/personchip.css` |
| JS | `components/personchip/personchip.js` |
| Types | `components/personchip/personchip.d.ts` |

## Requirements

- **Bootstrap CSS** — for SCSS variables (`$gray-100`, `$gray-300`, `$blue-600`, etc.)
- **Bootstrap Icons** — not required (no icons used)
- Does **not** require Bootstrap JS.

## Quick Start

```html
<link rel="stylesheet" href="components/personchip/personchip.css">
<script src="components/personchip/personchip.js"></script>
<script>
    var chip = createPersonChip({
        name: "Alice Chen",
        email: "alice@acme.com",
        status: "online"
    });
    document.getElementById("container").appendChild(chip.getElement());
</script>
```

## API

### Global Functions

| Function | Returns | Description |
|----------|---------|-------------|
| `createPersonChip(options)` | `PersonChip` | Create a PersonChip instance |

### PersonChip Class

| Method | Returns | Description |
|--------|---------|-------------|
| `getElement()` | `HTMLElement` | Get the root DOM element |
| `setName(name)` | `void` | Update name, initials, and tooltip |
| `setEmail(email)` | `void` | Update tooltip and lg detail |
| `setAvatarUrl(url)` | `void` | Swap avatar image or fall back to initials |
| `setStatus(status)` | `void` | Change or remove status dot |
| `setRole(role)` | `void` | Update tooltip and lg detail |
| `destroy()` | `void` | Remove listeners, DOM, null refs |

### PersonChipOptions

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `name` | `string` | Yes | — | Display name |
| `email` | `string` | No | — | Shown in tooltip (+ lg detail) |
| `avatarUrl` | `string` | No | — | Image URL for avatar |
| `role` | `string` | No | — | Role/title in tooltip (+ lg detail) |
| `status` | `"online"\|"offline"\|"busy"\|"away"` | No | — | Status dot indicator |
| `size` | `"sm"\|"md"\|"lg"` | No | `"md"` | Size variant |
| `clickable` | `boolean` | No | `false` | Enable pointer + click/keyboard |
| `href` | `string` | No | — | Render as `<a>` tag |
| `tooltip` | `string` | No | auto | Override auto-generated tooltip |
| `cssClass` | `string` | No | — | Additional CSS class |
| `metadata` | `Record<string,string>` | No | — | data-* attributes for integration |
| `onClick` | `(chip) => void` | No | — | Click callback |
| `onHover` | `(chip, event) => void` | No | — | Mouseenter callback |
| `onHoverOut` | `(chip, event) => void` | No | — | Mouseleave callback |

## Size Variants

| Size | Avatar | Font | Detail Shown |
|------|--------|------|--------------|
| `sm` | 20px | $font-size-sm | No (tooltip only) |
| `md` | 28px | 0.875rem | No (tooltip only) |
| `lg` | 36px | 0.875rem | Yes (email/role inline) |

## Status Indicators

| Status | Colour |
|--------|--------|
| `online` | Green ($green-600) |
| `busy` | Red ($red-600) |
| `away` | Yellow ($yellow-500) |
| `offline` | Gray ($gray-400) |

## Accessibility

- Clickable chips receive `tabindex="0"` and `role="button"`.
- Href chips render as `<a>` (natively focusable).
- Enter and Space activate clickable chips.
- Focus-visible outline: `2px solid $blue-600`.
- Avatar content is `aria-hidden="true"` (decorative).
- Auto-generated tooltip shows email and role.

## Keyboard

| Key | Action |
|-----|--------|
| Enter | Activate clickable chip |
| Space | Activate clickable chip |
| Tab | Move focus to/from chip |

## Examples

### Basic with initials
```js
var chip = createPersonChip({ name: "Bob Smith" });
container.appendChild(chip.getElement());
```

### With avatar image and status
```js
var chip = createPersonChip({
    name: "Alice Chen",
    email: "alice@acme.com",
    avatarUrl: "https://example.com/alice.jpg",
    status: "online",
    size: "lg"
});
container.appendChild(chip.getElement());
```

### Clickable with callback
```js
var chip = createPersonChip({
    name: "Carol Davis",
    clickable: true,
    onClick: function(c) { console.log("Clicked:", c.getElement().title); }
});
container.appendChild(chip.getElement());
```

### Share dialog composition
```js
var people = ["Alice Chen", "Bob Smith", "Carol Davis"];
var row = document.createElement("div");
row.style.display = "flex";
row.style.flexWrap = "wrap";
row.style.gap = "4px";

people.forEach(function(name) {
    var chip = createPersonChip({ name: name, status: "online" });
    row.appendChild(chip.getElement());
});
container.appendChild(row);
```

## ADR

ADR-036: PersonChip replicates UserMenu trigger style as standalone reusable element.
