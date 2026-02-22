# FormDialog CDN Component — Requirements Specification

> **Component:** `formdialog`
> **CDN Path:** `static.knobby.io/components/formdialog/formdialog.{css|js}`
> **Date:** 2026-02-22
> **Author:** Claude (Anthropic) / Engineering
> **Status:** Draft

---

## 1. Purpose

A reusable modal dialog component optimized for form-based workflows (create, edit, invite, assign). Provides a JavaScript API for programmatic creation, field management, validation, and lifecycle control. Replaces ad-hoc `.settings-modal` CSS patterns with a standardized, accessible component.

## 2. Design Language

Must match the existing `.settings-modal` visual pattern used throughout the platform:

- **Overlay:** Fixed fullscreen backdrop, `rgba(0, 0, 0, 0.5)`, `z-index: 2000`
- **Dialog:** White card, centered, `border-radius: 0.5rem`, `box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15)`
- **Header:** Title (1.125rem, weight 600) + close button (x icon), separated by `border-bottom: 1px solid #e2e8f0`
- **Body:** `padding: 1.5rem`, scrollable if content exceeds viewport
- **Footer:** `background: #f8f9fa`, `border-top: 1px solid #e2e8f0`, right-aligned action buttons
- **Form fields:** 0.75rem font, `border: 1px solid #cbd5e1`, focus border `#1c7ed6`
- **Labels:** 0.75rem, weight 500, block display

Reference CSS: `frontend/css/shell.css` lines 610-786 (`.settings-modal-*` and `.settings-*` rules).

## 3. API

### 3.1 Factory Function

```typescript
function createFormDialog(options: FormDialogOptions): FormDialog;
```

Exposed on `window` as `window.createFormDialog`.

### 3.2 FormDialogOptions

```typescript
interface FormDialogOptions {
    /** Modal header title. */
    title: string;

    /** Optional description text shown below the header, above fields. */
    description?: string;

    /** Dialog width variant. Default: 'md'. */
    size?: 'sm' | 'md' | 'lg';

    /** Array of form field definitions rendered in order. */
    fields?: FormFieldDef[];

    /** Label for the submit button. Default: 'Submit'. */
    submitLabel?: string;

    /** Label for the cancel button. Default: 'Cancel'. */
    cancelLabel?: string;

    /** Called when user submits the form. Receives all field values as a flat object.
     *  If this returns a Promise, the dialog enters loading state until it resolves.
     *  If the Promise rejects, the error message is shown as a toast. */
    onSubmit: (values: Record<string, string>) => Promise<void> | void;

    /** Called when the dialog is closed without submitting (Cancel, Escape, backdrop click). */
    onCancel?: () => void;

    /** Optional slot for custom DOM content inserted after the fields array.
     *  Use for non-standard widgets (e.g., MultiSelectCombo, avatar previews). */
    customContent?: HTMLElement;

    /** Whether to close the dialog automatically after successful onSubmit. Default: true. */
    autoClose?: boolean;

    /** Whether clicking the backdrop closes the dialog. Default: true. */
    closeOnBackdrop?: boolean;

    /** Whether pressing Escape closes the dialog. Default: true. */
    closeOnEscape?: boolean;
}
```

### 3.3 FormFieldDef

```typescript
interface FormFieldDef {
    /** Unique field name (used as key in the values object passed to onSubmit). */
    name: string;

    /** Display label shown above the field. */
    label: string;

    /** Field type. */
    type: 'text' | 'email' | 'password' | 'number' | 'select' | 'textarea' | 'readonly' | 'hidden';

    /** Placeholder text for text/email/password/textarea fields. */
    placeholder?: string;

    /** Whether the field is required. Default: false. */
    required?: boolean;

    /** Initial value. */
    value?: string;

    /** Options for 'select' type fields. */
    options?: { value: string; label: string }[];

    /** Help text shown below the field in muted small text. */
    helpText?: string;

    /** Number of visible rows for 'textarea' type. Default: 3. */
    rows?: number;

    /** If true, field is disabled (greyed out, not submitted). */
    disabled?: boolean;

    /** HTML autocomplete attribute value. */
    autocomplete?: string;

    /** Field width within a row. Default: 'full'.
     *  When 'half' is used, adjacent 'half' fields are placed side-by-side.
     *  When 'third' is used, adjacent 'third' fields fill a 3-column row. */
    width?: 'full' | 'half' | 'third';
}
```

### 3.4 FormDialog Instance

```typescript
interface FormDialog {
    /** Opens the dialog. Auto-focuses the first focusable field. */
    show(): void;

    /** Closes the dialog without triggering onSubmit. Calls onCancel if set. */
    close(): void;

    /** Removes the dialog DOM element entirely. Call when done with the dialog. */
    destroy(): void;

    /** Shows an inline error message below a specific field. Pass empty string to clear. */
    setFieldError(fieldName: string, message: string): void;

    /** Toggles the loading state: disables submit button, shows spinner, disables all fields. */
    setLoading(loading: boolean): void;

    /** Gets the current value of a field by name. */
    getValue(fieldName: string): string;

    /** Sets the value of a field by name. */
    setValue(fieldName: string, value: string): void;

    /** Gets all current field values as a flat object. */
    getValues(): Record<string, string>;

    /** Updates the dialog title. */
    setTitle(title: string): void;

    /** Returns the dialog's root DOM element (the overlay). */
    getElement(): HTMLElement;

    /** Returns the content body element (for inserting custom DOM after fields). */
    getContentElement(): HTMLElement;
}
```

## 4. Behavior

### 4.1 Lifecycle

| Event | Behavior |
|-------|----------|
| `show()` | Overlay fades in, first focusable field receives focus |
| Submit click / Enter in single-line field | Validates required fields; if valid, calls `onSubmit(values)` |
| `onSubmit` returns Promise | Dialog enters loading state (spinner on submit button, all fields disabled) |
| Promise resolves | If `autoClose: true`, dialog closes automatically |
| Promise rejects | Loading state clears, error shown via `showErrorToast(error.message)` |
| Cancel click | Calls `onCancel()` if set, closes dialog |
| Backdrop click | If `closeOnBackdrop: true`, closes dialog, calls `onCancel()` |
| Escape key | If `closeOnEscape: true`, closes dialog, calls `onCancel()` |
| `close()` | Overlay hides, calls `onCancel()` if not already called |
| `destroy()` | Removes overlay element from DOM, cleans up event listeners |

### 4.2 Validation

- **Required fields:** On submit, check all fields with `required: true` have non-empty trimmed values. Show inline error "This field is required" below the first invalid field and focus it.
- **Email fields:** For `type: 'email'`, validate basic email format (contains `@` and `.`). Show inline error "Please enter a valid email address".
- **Custom validation:** Consumers use `setFieldError(name, msg)` in their `onSubmit` handler for server-side or business-rule validation.
- Inline errors clear when the user modifies the field value.

### 4.3 Focus Management

- On `show()`: focus the first non-hidden, non-disabled, non-readonly field.
- **Focus trap:** Tab/Shift+Tab cycles within the dialog (fields + Cancel + Submit buttons). Focus does not escape to elements behind the overlay.
- On `close()`: return focus to the element that was focused before `show()` was called.

### 4.4 Field Layout

- `width: 'full'` (default) — field spans the full width of the form body.
- `width: 'half'` — two adjacent `half` fields are placed in a flex row with `gap: 1rem`.
- `width: 'third'` — three adjacent `third` fields are placed in a flex row with `gap: 1rem`.
- If a row of `half`/`third` fields is incomplete (e.g., only one `half` field), the remaining space is empty.
- The `customContent` slot, if provided, is rendered below all field definitions as a full-width block.

### 4.5 Readonly and Hidden Fields

- `type: 'readonly'` — renders an input with `readonly` attribute and `background: #f8f9fa`. Value is included in `getValues()` and `onSubmit` values.
- `type: 'hidden'` — renders `<input type="hidden">`. No label or visible UI. Value is included in `getValues()` and `onSubmit` values.

## 5. Accessibility

- Dialog has `role="dialog"` and `aria-modal="true"`.
- Dialog has `aria-labelledby` pointing to the title element.
- Close button has `aria-label="Close"`.
- Required fields have `aria-required="true"`.
- Inline error messages use `aria-describedby` linked to the field.
- Error fields have `aria-invalid="true"`.
- Focus trap prevents tabbing out of the dialog.

## 6. CSS Classes

The component should use its own prefixed class names to avoid collisions:

| Class | Element |
|-------|---------|
| `.formdialog-overlay` | Root overlay (fixed fullscreen) |
| `.formdialog-overlay.active` | Visible state |
| `.formdialog-content` | Dialog card |
| `.formdialog-content--sm` | Small variant (max-width: 400px) |
| `.formdialog-content--md` | Medium variant (max-width: 550px) |
| `.formdialog-content--lg` | Large variant (max-width: 750px) |
| `.formdialog-header` | Header row |
| `.formdialog-title` | Title text |
| `.formdialog-close` | Close button |
| `.formdialog-body` | Scrollable form body |
| `.formdialog-description` | Description text |
| `.formdialog-row` | Flex row for multi-column fields |
| `.formdialog-group` | Single field wrapper |
| `.formdialog-label` | Field label |
| `.formdialog-input` | Text/email/password/number input |
| `.formdialog-select` | Select dropdown |
| `.formdialog-textarea` | Textarea |
| `.formdialog-help` | Help text below field |
| `.formdialog-error` | Inline error message |
| `.formdialog-footer` | Footer row |
| `.formdialog-actions` | Button group in footer |
| `.formdialog-spinner` | Loading spinner on submit button |

## 7. Size Variants

| Size | `max-width` | Use Case |
|------|-------------|----------|
| `sm` | 400px | Simple confirms with 1-2 fields |
| `md` | 550px | Standard forms (3-5 fields) |
| `lg` | 750px | Complex forms with multi-column layout |

## 8. Current Use Cases

These are the existing modals that would migrate to FormDialog:

### 8.1 Admin Users — Invite User
- **Size:** `sm`
- **Fields:** email (required), role select (required, options: Member/Admin)
- **Submit:** `POST /api/v1/tenants/{id}/invitations`

### 8.2 Admin Users — Edit User
- **Size:** `lg`
- **Fields:** hidden (user_id), first_name (third), middle_name (third), last_name (third), role select (half), status select (half), job_title (half), department (half)
- **Custom content:** Avatar display section (above fields), MultiSelectCombo for app entitlements (below fields)
- **Submit:** `PUT /api/v1/users/{id}/profile` + `PUT /api/v1/tenants/{id}/members/{userId}`

### 8.3 Admin Roles — Create Role
- **Size:** `md`
- **Fields:** name (required, with help text), display_name (required), description textarea
- **Submit:** `POST /api/v1/admin/authorization/roles`

### 8.4 Admin Roles — Edit Role
- **Size:** `md`
- **Fields:** hidden (role_id), display_name (required), description textarea
- **Submit:** `PUT /api/v1/admin/authorization/roles/{id}`

### 8.5 Admin Roles — Assign User
- **Size:** `sm`
- **Fields:** user select (required, dynamically populated), role_name (readonly)
- **Submit:** `POST /api/v1/admin/authorization/users/{id}/roles`

### 8.6 Shell — Create Workspace
- **Size:** `sm`
- **Fields:** name (required)
- **Description:** "Create a project workspace to organize work with your team."
- **Submit:** `POST /api/v1/tenants`

## 9. Dependencies

- **None** — the component is self-contained (CSS + JS).
- **Optional integration:** If `window.showErrorToast` is available, use it for rejected Promise errors. Otherwise fall back to `console.error`.

## 10. Load Order

No ordering dependency on other CDN components. Can be loaded at any position in the component script chain.

```html
<link rel="stylesheet" href="https://static.knobby.io/components/formdialog/formdialog.css">
<script src="https://static.knobby.io/components/formdialog/formdialog.js"></script>
```

## 11. TypeScript Declaration

The following should be added to `typescript/shared/types/component-library.d.ts` once the component ships:

```typescript
interface FormDialogOptions {
    title: string;
    description?: string;
    size?: 'sm' | 'md' | 'lg';
    fields?: FormFieldDef[];
    submitLabel?: string;
    cancelLabel?: string;
    onSubmit: (values: Record<string, string>) => Promise<void> | void;
    onCancel?: () => void;
    customContent?: HTMLElement;
    autoClose?: boolean;
    closeOnBackdrop?: boolean;
    closeOnEscape?: boolean;
}

interface FormFieldDef {
    name: string;
    label: string;
    type: 'text' | 'email' | 'password' | 'number' | 'select' | 'textarea' | 'readonly' | 'hidden';
    placeholder?: string;
    required?: boolean;
    value?: string;
    options?: { value: string; label: string }[];
    helpText?: string;
    rows?: number;
    disabled?: boolean;
    autocomplete?: string;
    width?: 'full' | 'half' | 'third';
}

interface FormDialog {
    show(): void;
    close(): void;
    destroy(): void;
    setFieldError(fieldName: string, message: string): void;
    setLoading(loading: boolean): void;
    getValue(fieldName: string): string;
    setValue(fieldName: string, value: string): void;
    getValues(): Record<string, string>;
    setTitle(title: string): void;
    getElement(): HTMLElement;
    getContentElement(): HTMLElement;
}

// On Window interface:
// createFormDialog?: (options: FormDialogOptions) => FormDialog;
```

## 12. Example Usage

```javascript
const dialog = window.createFormDialog({
    title: 'Invite New User',
    size: 'sm',
    description: 'Send an invitation to join your workspace',
    submitLabel: 'Send Invitation',
    fields: [
        {
            name: 'email',
            label: 'Email Address',
            type: 'email',
            required: true,
            placeholder: 'user@example.com'
        },
        {
            name: 'role',
            label: 'Role',
            type: 'select',
            required: true,
            value: 'MEMBER',
            options: [
                { value: 'MEMBER', label: 'Member' },
                { value: 'ADMIN', label: 'Admin' }
            ]
        }
    ],
    onSubmit: async (values) => {
        const response = await fetch(`/api/v1/tenants/${tenantId}/invitations`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(values)
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to send invitation');
        }
        showSuccessToast('Invitation sent');
        loadUsers();
    }
});

dialog.show();
```
