<!-- AGENT: Documentation for the FormDialog modal form component with single-page and wizard modes. -->

# FormDialog

A modal dialog optimized for form-based workflows (create, edit, invite, assign). Supports two mutually exclusive modes: **single-page** (scrollable form body with optional collapsible sections) and **wizard** (multi-step form with step indicator, Back/Next navigation, and per-step validation). Optionally includes a **resizable sidebar panel** for help text, previews, or contextual information.

## Assets

| Asset | Path |
|-------|------|
| CSS | `components/formdialog/formdialog.css` |
| JS | `components/formdialog/formdialog.js` |
| Types | `components/formdialog/formdialog.d.ts` |

## Requirements

- **Bootstrap CSS** -- for SCSS variables and `.btn-*` classes
- **Bootstrap Icons** -- `bi-x-lg`, `bi-chevron-down`, `bi-chevron-right`, `bi-check-lg`
- **Enterprise theme CSS** -- `css/custom.css`
- **Optional:** `window.showConfirmDialog` (from ConfirmDialog) for dirty-change warnings
- **Optional:** `window.showErrorToast` (from Toast) for rejected promise errors
- Does **not** require Bootstrap JS.

## Quick Start

```html
<link rel="stylesheet" href="css/custom.css">
<link rel="stylesheet" href="icons/bootstrap-icons.css">
<link rel="stylesheet" href="components/formdialog/formdialog.css">

<script src="components/formdialog/formdialog.js"></script>
<script>
    const dialog = createFormDialog({
        title: "Invite New User",
        size: "sm",
        description: "Send an invitation to join your workspace.",
        submitLabel: "Send Invitation",
        fields: [
            { name: "email", label: "Email Address", type: "email", required: true, placeholder: "user@example.com" },
            { name: "role", label: "Role", type: "select", required: true, value: "MEMBER",
              options: [{ value: "MEMBER", label: "Member" }, { value: "ADMIN", label: "Admin" }] }
        ],
        onSubmit: async (values) => {
            await fetch("/api/invitations", { method: "POST", body: JSON.stringify(values) });
        }
    });

    dialog.show();
</script>
```

## API

### Factory Function

| Function | Returns | Description |
|----------|---------|-------------|
| `createFormDialog(options)` | `FormDialog` | Create a form dialog instance |

### FormDialog Instance

| Method | Returns | Description |
|--------|---------|-------------|
| `show()` | `void` | Open dialog, focus first field |
| `close()` | `void` | Close dialog, call `onCancel` |
| `destroy()` | `void` | Remove from DOM, clean up listeners |
| `getValue(name)` | `string` | Get field value by name |
| `setValue(name, value)` | `void` | Set field value by name |
| `getValues()` | `Record<string, string>` | Get all field values as flat object |
| `setFieldError(name, msg)` | `void` | Show inline error below a field |
| `clearFieldErrors()` | `void` | Remove all field error messages |
| `setLoading(loading)` | `void` | Toggle loading state (spinner, disable fields) |
| `setTitle(title)` | `void` | Update dialog title text |
| `isDirty()` | `boolean` | Check if any field changed from initial value |
| `goToStep(index)` | `void` | Navigate to wizard step by index |
| `nextStep()` | `void` | Advance to next wizard step (validates current) |
| `prevStep()` | `void` | Go back to previous wizard step |
| `getCurrentStep()` | `number` | Get current wizard step index |
| `toggleSection(id)` | `void` | Toggle a collapsible section |
| `setSectionCollapsed(id, collapsed)` | `void` | Set section collapsed state |
| `updatePanel(content)` | `void` | Replace panel content with new element |
| `getElement()` | `HTMLElement` | Get the overlay root element |
| `getContentElement()` | `HTMLElement` | Get the form body element |

## FormDialogOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `title` | `string` | **required** | Dialog title |
| `description` | `string` | -- | Description text below the header |
| `size` | `string` | `"md"` | `"sm"` (400px), `"md"` (550px), `"lg"` (750px), `"xl"` (960px) |
| `fields` | `FormFieldDef[]` | -- | Single-page mode field definitions |
| `sections` | `FormSection[]` | -- | Collapsible section definitions |
| `steps` | `FormStep[]` | -- | Wizard mode step definitions (mutually exclusive with `fields`) |
| `stepTransition` | `string` | `"slide"` | Wizard transition: `"slide"`, `"fade"`, `"none"` |
| `panel` | `FormDialogPanel` | -- | Resizable sidebar panel configuration |
| `submitLabel` | `string` | `"Submit"` | Submit button text |
| `cancelLabel` | `string` | `"Cancel"` | Cancel button text |
| `nextLabel` | `string` | `"Next"` | Wizard next button text |
| `backLabel` | `string` | `"Back"` | Wizard back button text |
| `onSubmit` | `function` | **required** | Called with all field values; may return a Promise |
| `onCancel` | `function` | -- | Called when dialog is cancelled |
| `onStepChange` | `function` | -- | Called with `(stepIndex, stepId)` on wizard navigation |
| `onFieldChange` | `function` | -- | Called with `(name, value)` on any field input |
| `customContent` | `HTMLElement` | -- | Custom DOM appended after fields |
| `showFooter` | `boolean` | `true` | Show footer with Submit/Cancel buttons; set `false` when `customContent` manages its own actions |
| `autoClose` | `boolean` | `true` | Auto-close after successful submit |
| `closeOnBackdrop` | `boolean` | `true` | Close on backdrop click |
| `closeOnEscape` | `boolean` | `true` | Close on Escape key |
| `warnOnDirty` | `boolean` | `false` | Show confirm dialog before discarding changes |
| `cssClass` | `string` | -- | Additional CSS class on dialog |
| `keyBindings` | `object` | -- | Override default key combos |

## Field Types

| Type | Element | Notes |
|------|---------|-------|
| `text` | `<input type="text">` | Standard text input |
| `email` | `<input type="email">` | Basic email validation |
| `password` | `<input type="password">` | Password input |
| `number` | `<input type="number">` | Numeric input |
| `select` | `<select>` | Dropdown from `options` array |
| `textarea` | `<textarea>` | Multi-line, `rows` configurable (default 3) |
| `readonly` | `<input readonly>` | Grey background, value included in submit |
| `hidden` | `<input type="hidden">` | No visible UI, value included in submit |
| `checkbox` | `<input type="checkbox">` | Boolean field, uses `checked` |
| `toggle` | Toggle switch | Styled checkbox as toggle, uses `checked` |
| `date` | `<input type="date">` | Native date picker |
| `custom` | Consumer-provided | `customElement` inserted; label/help/error managed by dialog |

## FormFieldDef

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | `string` | **required** | Unique field name (key in values object) |
| `label` | `string` | **required** | Display label above the field |
| `type` | `FormFieldType` | **required** | Field type (see table above) |
| `placeholder` | `string` | -- | Placeholder text |
| `required` | `boolean` | `false` | Whether field is required |
| `value` | `string` | -- | Initial value |
| `checked` | `boolean` | -- | Initial checked state (checkbox/toggle) |
| `options` | `array` | -- | Options for select: `{ value, label }[]` |
| `helpText` | `string` | -- | Help text shown below field |
| `rows` | `number` | `3` | Textarea visible rows |
| `disabled` | `boolean` | `false` | Disable the field |
| `autocomplete` | `string` | -- | HTML autocomplete attribute |
| `width` | `string` | `"full"` | `"full"`, `"half"`, `"third"` for multi-column layout |
| `section` | `string` | -- | Section ID for grouping into collapsible sections |
| `customElement` | `HTMLElement` | -- | Custom DOM for `type: "custom"` |
| `validate` | `function` | -- | Custom validator: returns error string or `null` |

## FormSection

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | `string` | **required** | Unique section identifier |
| `label` | `string` | **required** | Section heading text |
| `collapsed` | `boolean` | `false` | Initial collapsed state |
| `icon` | `string` | -- | Bootstrap icon class for section heading |

## FormStep (Wizard Mode)

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | `string` | **required** | Unique step identifier |
| `label` | `string` | **required** | Step label in indicator |
| `description` | `string` | -- | Description text shown at top of step |
| `icon` | `string` | -- | Bootstrap icon class |
| `fields` | `FormFieldDef[]` | **required** | Fields for this step |
| `sections` | `FormSection[]` | -- | Collapsible sections within step |
| `validate` | `function` | -- | Per-step cross-field validator |

## FormDialogPanel

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `content` | `HTMLElement` or `function` | **required** | Static element or `(values) => HTMLElement` reactive callback |
| `width` | `number` | `300` | Initial panel width in px |
| `minWidth` | `number` | `200` | Minimum drag width |
| `maxWidth` | `number` | `500` | Maximum drag width |
| `title` | `string` | -- | Panel header title |

## Modes

### Single-Page Mode

Provide `fields` (and optionally `sections`) for a single scrollable form. Fields are rendered in order; adjacent `half` or `third` fields are placed in multi-column rows.

```js
createFormDialog({
    title: "Edit User",
    size: "lg",
    sections: [
        { id: "personal", label: "Personal Information" },
        { id: "access", label: "Access & Permissions", collapsed: true }
    ],
    fields: [
        { name: "first", label: "First Name", type: "text", required: true, width: "third", section: "personal" },
        { name: "middle", label: "Middle Name", type: "text", width: "third", section: "personal" },
        { name: "last", label: "Last Name", type: "text", required: true, width: "third", section: "personal" },
        { name: "role", label: "Role", type: "select", width: "half", section: "access",
          options: [{ value: "admin", label: "Admin" }, { value: "member", label: "Member" }] },
        { name: "status", label: "Status", type: "select", width: "half", section: "access",
          options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }] }
    ],
    onSubmit: async (values) => { /* save */ }
});
```

### Wizard Mode

Provide `steps` for a multi-step wizard. Each step has its own fields. The step indicator shows progress, and Back/Next buttons navigate between steps.

```js
createFormDialog({
    title: "Create Workspace",
    size: "xl",
    stepTransition: "slide",
    steps: [
        { id: "basics", label: "Basics", fields: [
            { name: "name", label: "Workspace Name", type: "text", required: true }
        ]},
        { id: "members", label: "Members", description: "Invite team members.", fields: [
            { name: "email", label: "Email", type: "email", required: true },
            { name: "role", label: "Role", type: "select", options: [
                { value: "member", label: "Member" }, { value: "admin", label: "Admin" }
            ]}
        ]},
        { id: "review", label: "Review", fields: [] }
    ],
    onSubmit: async (values) => { /* create workspace */ }
});
```

### With Panel

Add a resizable sidebar panel for help text or previews. If `panel.content` is a function, it re-renders reactively when fields change.

```js
createFormDialog({
    title: "Create Role",
    size: "xl",
    panel: {
        title: "Help",
        width: 280,
        content: (values) => {
            const el = document.createElement("div");
            el.textContent = values.name
                ? `Role "${values.name}" will be created.`
                : "Fill in the role details.";
            return el;
        }
    },
    fields: [
        { name: "name", label: "Role Name", type: "text", required: true },
        { name: "description", label: "Description", type: "textarea" }
    ],
    onSubmit: async (values) => { /* save */ }
});
```

## Keyboard

| Key | Context | Action |
|-----|---------|--------|
| `Escape` | Dialog | Close (with dirty warning if `warnOnDirty`) |
| `Tab` / `Shift+Tab` | Dialog | Cycle focus within dialog (focus trap) |
| `Enter` | Single-line field | Submit form (single-page) or next step (wizard) |

Key bindings can be overridden via the `keyBindings` option.

## Validation

- **Required fields** -- non-empty trimmed value; inline error "This field is required"
- **Email fields** -- basic `@` + `.` check; inline error "Please enter a valid email address"
- **Custom per-field** -- `field.validate(value)` returns error string or `null`
- **Custom per-step** (wizard) -- `step.validate(values)` for cross-field validation
- Errors clear automatically on field input
- On submit/next: all visible fields validated, first invalid field focused

## Accessibility

- Dialog: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to title
- Close button: `aria-label="Close"`
- Required fields: `aria-required="true"`
- Error fields: `aria-invalid="true"`, `aria-describedby` linked to error element
- Section toggles: `aria-expanded`, `aria-controls`
- Step indicator: `aria-current="step"` on active step
- Live region: `aria-live="polite"` for announcements
- Focus trap: Tab/Shift+Tab cycles within dialog
- Focus restore: returns focus to previously active element on close
- Animations respect `prefers-reduced-motion: reduce`

## DOM Structure

### Single-Page (with panel)

```
div.formdialog-overlay
  div.formdialog-backdrop
  div.formdialog-dialog.formdialog-dialog-{size} [role="dialog" aria-modal="true"]
    div.formdialog-header
      h2.formdialog-title
      button.formdialog-close [aria-label="Close"]
    div.formdialog-description?
    div.formdialog-body.formdialog-body-split?
      div.formdialog-form
        div.formdialog-section
          button.formdialog-section-toggle [aria-expanded]
            i.formdialog-section-chevron
            i.formdialog-section-icon?
            span (label)
          div.formdialog-section-body [id]
            div.formdialog-row.formdialog-row-half?
              div.formdialog-group
                label.formdialog-label
                input.formdialog-input
                span.formdialog-help
                span.formdialog-error
      div.formdialog-divider?
      div.formdialog-panel?
        div.formdialog-panel-header?
        div.formdialog-panel-content
    div.formdialog-footer
      div.formdialog-footer-left
      div.formdialog-actions
        button.btn.btn-secondary (Cancel)
        button.btn.btn-primary (Submit)
```

### Wizard Mode

```
div.formdialog-overlay
  div.formdialog-backdrop
  div.formdialog-dialog [role="dialog"]
    div.formdialog-header
    div.formdialog-steps
      button.formdialog-step.formdialog-step-complete
        span.formdialog-step-number (check icon)
        span.formdialog-step-label
      span.formdialog-step-connector.formdialog-step-connector-done
      button.formdialog-step.formdialog-step-active [aria-current="step"]
        span.formdialog-step-number (2)
        span.formdialog-step-label
      span.formdialog-step-connector
      button.formdialog-step.formdialog-step-pending
        span.formdialog-step-number (3)
        span.formdialog-step-label
    div.formdialog-body
      div.formdialog-form (current step fields)
    div.formdialog-footer
      div.formdialog-footer-left "Step 2 of 3"
      div.formdialog-actions
        button (Back)
        button (Next / Submit)
```

## Features

- **Two modes** -- single-page or wizard, mutually exclusive
- **12 field types** -- text, email, password, number, select, textarea, readonly, hidden, checkbox, toggle, date, custom
- **Multi-column layout** -- `width: "half"` or `"third"` for side-by-side fields
- **Collapsible sections** -- group related fields with expand/collapse
- **Resizable panel** -- pointer-capture drag sidebar for help or previews
- **Reactive panel** -- panel content re-renders when fields change (function mode)
- **Wizard stepping** -- numbered step indicator with connectors, configurable transitions
- **Built-in validation** -- required, email, custom per-field, custom per-step
- **Loading state** -- spinner on submit button, all fields disabled during async submit
- **Dirty tracking** -- optional `warnOnDirty` prompts ConfirmDialog before discarding changes
- **Focus trap** -- Tab cycles within dialog; no escape
- **Focus restore** -- returns focus to previously active element
- **XSS safe** -- all content set via `textContent`, never `innerHTML`
- **Auto-cleanup** -- DOM removed on `destroy()`
- **No Bootstrap JS dependency** -- fully standalone modal implementation
