<!-- AGENT: Registry of custom components shipped with the enterprise theme. -->

# Components

Custom components built on the Enterprise Bootstrap Theme.

## ErrorDialog

Displays literate error messages in a Bootstrap 5 modal with user-friendly narrative and collapsible technical details.

| Asset | Path |
|-------|------|
| CSS | `dist/components/errordialog/errordialog.css` |
| JS | `dist/components/errordialog/errordialog.js` |
| Types | `dist/components/errordialog/errordialog.d.ts` |

**Requires:** Bootstrap JS (Modal API), Bootstrap Icons CSS.

**Usage (script tag):**

```html
<script src="dist/components/errordialog/errordialog.js"></script>
<script>
    showErrorDialog("container-id", {
        title: "Save Failed",
        message: "Could not save the document.",
        suggestion: "Try again in a moment.",
        errorCode: "DOC_SAVE_001"
    });
</script>
```

**Usage (ES module):**

```js
import { showErrorDialog } from "./dist/components/errordialog/errordialog.js";

showErrorDialog("container-id", {
    title: "Save Failed",
    message: "Could not save the document."
});
```

See `components/errordialog/README.md` for full documentation.

## EditableComboBox

A combined text input and dropdown list that allows free text entry or selection from a filterable list of options. Supports substring filtering, keyboard navigation, item grouping, size variants, and the WAI-ARIA combobox pattern.

| Asset | Path |
|-------|------|
| CSS | `dist/components/editablecombobox/editablecombobox.css` |
| JS | `dist/components/editablecombobox/editablecombobox.js` |
| Types | `dist/components/editablecombobox/editablecombobox.d.ts` |

**Requires:** Bootstrap CSS (input-group, form-control, btn), Bootstrap Icons CSS. Does **not** require Bootstrap JS.

**Usage (script tag):**

```html
<script src="dist/components/editablecombobox/editablecombobox.js"></script>
<script>
    var combo = createEditableComboBox("container-id", {
        items: [{ label: "Apple" }, { label: "Banana" }, { label: "Cherry" }],
        placeholder: "Pick a fruit...",
        onSelect: function(item) { console.log("Selected:", item.label); }
    });
</script>
```

**Usage (ES module):**

```js
import { createEditableComboBox } from "./dist/components/editablecombobox/editablecombobox.js";

const combo = createEditableComboBox("container-id", {
    items: [{ label: "Red" }, { label: "Green" }, { label: "Blue" }],
    onSelect: (item) => console.log("Selected:", item.label)
});
```

See `components/editablecombobox/README.md` for full documentation.
