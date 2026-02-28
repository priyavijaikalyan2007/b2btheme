<!-- AGENT: Documentation for the Property Inspector (Slide-out Drawer) component. -->

# Property Inspector (Slide-out Drawer)

Non-modal right-side panel for viewing and editing entity details without navigating away from the parent list. Supports tabbed sections, resize handle, header actions, and footer.

## Assets

| Asset | Path |
|-------|------|
| CSS | `components/propertyinspector/propertyinspector.css` |
| JS | `components/propertyinspector/propertyinspector.js` |
| Types | `components/propertyinspector/propertyinspector.d.ts` |

## Requirements

- **Bootstrap CSS** — SCSS variables
- **Bootstrap Icons** — header/action icons (`bi-*` classes)
- Does **not** require Bootstrap JS.

## Quick Start

```html
<link rel="stylesheet" href="components/propertyinspector/propertyinspector.css">
<script src="components/propertyinspector/propertyinspector.js"></script>
<script>
    var inspector = createPropertyInspector({
        container: document.getElementById("main-content"),
        onClose: function() { console.log("Closed"); },
        onAction: function(id) { console.log("Action:", id); }
    });

    // Open with content
    var content = document.createElement("div");
    content.textContent = "Entity details here...";

    inspector.open({
        title: "Task #1234",
        subtitle: "High Priority",
        icon: "bi-clipboard-check",
        content: content,
        actions: [{ id: "edit", label: "Edit", icon: "bi-pencil" }]
    });
</script>
```

## API

### `createPropertyInspector(options): PropertyInspectorHandle`

### PropertyInspectorOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `container` | `HTMLElement` | **required** | Parent element to scope drawer within |
| `width` | `number` | `380` | Drawer width in px |
| `resizable` | `boolean` | `true` | Allow drag-to-resize |
| `showBackdrop` | `boolean` | `false` | Show overlay behind drawer |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Size variant |
| `cssClass` | `string` | — | Extra CSS class(es) |
| `onClose` | `() => void` | — | Called when drawer closes |
| `onAction` | `(actionId, data) => void` | — | Header action callback |
| `onTabChange` | `(tabId) => void` | — | Tab change callback |
| `onResize` | `(width) => void` | — | Resize callback |

### InspectorOpenOptions

| Property | Type | Description |
|----------|------|-------------|
| `title` | `string` | Header title (required) |
| `subtitle` | `string` | Header subtitle |
| `icon` | `string` | Header Bootstrap Icons class |
| `actions` | `InspectorAction[]` | Header action buttons |
| `content` | `HTMLElement` | Body content (if no tabs) |
| `tabs` | `InspectorTab[]` | Tabbed sections (overrides content) |
| `activeTab` | `string` | Initial active tab ID |
| `footer` | `HTMLElement` | Footer element |
| `data` | `unknown` | Payload for action callbacks |

### PropertyInspectorHandle

| Method | Returns | Description |
|--------|---------|-------------|
| `open(options)` | `void` | Show drawer with content |
| `close()` | `void` | Hide drawer |
| `isOpen()` | `boolean` | Check visibility |
| `setTitle(title, subtitle?)` | `void` | Update header text |
| `setContent(el)` | `void` | Replace body content |
| `setTabs(tabs)` | `void` | Replace tabs |
| `setActiveTab(id)` | `void` | Switch active tab |
| `setFooter(el)` | `void` | Replace footer content |
| `getElement()` | `HTMLElement` | Root drawer element |
| `destroy()` | `void` | Tear down DOM and listeners |

## Keyboard

| Key | Action |
|-----|--------|
| `Escape` | Close the drawer |
| `Tab` | Navigate within drawer content |

## Accessibility

- Drawer: `role="complementary"`, `aria-label="Property Inspector"`
- Tab bar: `role="tablist"`, `role="tab"`, `aria-selected`
- Close/action buttons: `aria-label`
