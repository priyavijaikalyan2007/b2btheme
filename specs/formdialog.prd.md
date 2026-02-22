<!-- AGENT: PRD for the FormDialog component — modal dialog for form-based workflows with wizard mode and resizable panel. -->

# FormDialog Component

**Status:** Draft
**Component name:** FormDialog
**Folder:** `./components/formdialog/`
**Spec author:** Agent
**Date:** 2026-02-23

---

## 1. Overview

### 1.1 What Is It

A modal dialog optimized for form-based workflows (create, edit, invite, assign). Supports two mutually exclusive modes: **single-page** (fields rendered in a scrollable form body) and **wizard** (multi-step form with step indicator, Back/Next navigation, and per-step validation). Optionally includes a **resizable sidebar panel** for help text, previews, or contextual information.

### 1.2 Why Build It

Enterprise SaaS platforms contain dozens of create/edit modals with inconsistent styling and behaviour. A standardised FormDialog provides: declarative field definitions, built-in validation, loading states, focus trapping, dirty-change warnings, multi-column layout, collapsible sections, wizard stepping, and a help panel — all through a single factory function.

### 1.3 Design Inspiration

| Source | Key Pattern Adopted |
|--------|---------------------|
| Apps team `.settings-modal` | Overlay, header/footer, field layout, loading spinner |
| Salesforce Lightning Modal | Form sections, field-level validation, multi-column |
| Stripe Dashboard Modals | Sidebar help panel alongside form |
| Shopify Polaris Wizard | Step indicator with numbered circles and connector lines |
| Azure Portal Create Resource | Multi-step wizard with per-step validation |

---

## 2. Anatomy

### 2.1 Single-Page Mode

```
┌─────────────────────────────────────────────────┐
│  Create New Role                           [×]  │
├─────────────────────────────────────────────────┤
│  Define a custom role for your organisation.    │
│                                                 │
│  ▾ Basic Information                            │
│  ┌─────────────────────────────────────────┐   │
│  │ Role Name *                              │   │
│  │ [____________________________________]  │   │
│  │ Must be unique, lowercase, no spaces     │   │
│  ├─────────────────┬───────────────────┤   │
│  │ Display Name *  │ Department         │   │
│  │ [______________]│ [______________]  │   │
│  ├─────────────────┴───────────────────┤   │
│  │ Description                          │   │
│  │ [____________________________________]  │
│  │ [____________________________________]  │
│  └─────────────────────────────────────────┘   │
│  ▸ Advanced Options (collapsed)                 │
│                                                 │
├─────────────────────────────────────────────────┤
│                          [Cancel]  [Create Role] │
└─────────────────────────────────────────────────┘
```

### 2.2 Single-Page with Panel

```
┌────────────────────────────────────────────────────────────┐
│  Edit User Profile                                    [×]  │
├────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────┐│┌───────────────────────┐ │
│  │ ▾ Personal Information     │││ Help                  │ │
│  │ ┌────────┬────────┬──────┐│││                       │ │
│  │ │First * │Middle  │Last * │││ Fill in the user's    │ │
│  │ │[______]│[______]│[____]│││ profile. Required      │ │
│  │ └────────┴────────┴──────┘│││ fields are marked *.  │ │
│  │ ▾ Access & Permissions     ││▌                       │ │
│  │ ┌───────────┬────────────┐│││ Roles determine what  │ │
│  │ │ Role      │ Status     │││ features the user can  │ │
│  │ │ [Admin ▼] │ [Active ▼] │││ access.               │ │
│  │ └───────────┴────────────┘│││                       │ │
│  └────────────────────────────┘│└───────────────────────┘ │
├────────────────────────────────────────────────────────────┤
│                                   [Cancel]  [Save Changes] │
└────────────────────────────────────────────────────────────┘
```

### 2.3 Wizard Mode

```
┌────────────────────────────────────────────────────────────┐
│  Create Workspace                                     [×]  │
├────────────────────────────────────────────────────────────┤
│     (✓)───────(2)───────(3)───────(4)                      │
│    Basics    Members   Settings   Review                   │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Step 2: Add Members                                       │
│  Invite team members to your new workspace.                │
│                                                            │
│  ┌─────────────────────────────────────────────────┐      │
│  │ Email Address *                                  │      │
│  │ [___________________________________________]   │      │
│  │ Role *                                           │      │
│  │ [Member                                    ▼]   │      │
│  └─────────────────────────────────────────────────┘      │
│                                                            │
├────────────────────────────────────────────────────────────┤
│  Step 2 of 4                      [← Back]  [Next →]      │
└────────────────────────────────────────────────────────────┘
```

---

## 3. API

### 3.1 Factory

```typescript
createFormDialog(options: FormDialogOptions): FormDialog
```

### 3.2 Key Interfaces

See `components/formdialog/formdialog.ts` for full TypeScript interfaces: `FormFieldDef`, `FormSection`, `FormStep`, `FormDialogPanel`, `FormDialogOptions`, `FormDialog`.

### 3.3 Field Types

| Type | Element | Notes |
|------|---------|-------|
| `text` | `<input type="text">` | Standard text input |
| `email` | `<input type="email">` | Built-in email validation |
| `password` | `<input type="password">` | Password input |
| `number` | `<input type="number">` | Numeric input |
| `select` | `<select>` | Dropdown from `options` array |
| `textarea` | `<textarea>` | Multi-line, `rows` configurable |
| `readonly` | `<input readonly>` | Grey background, value included in submit |
| `hidden` | `<input type="hidden">` | No visible UI, value included in submit |
| `checkbox` | `<input type="checkbox">` | Boolean field, uses `checked` |
| `toggle` | Toggle switch | Styled checkbox as toggle, uses `checked` |
| `date` | `<input type="date">` | Native date picker |
| `custom` | Consumer-provided | `customElement` inserted, label/help/error managed |

### 3.4 Key Methods

| Method | Description |
|--------|-------------|
| `show()` | Open dialog, focus first field |
| `close()` | Close dialog, call onCancel |
| `destroy()` | Remove from DOM, clean up |
| `getValue(name)` / `setValue(name, value)` | Field access |
| `getValues()` | All values as flat object |
| `setFieldError(name, msg)` / `clearFieldErrors()` | Validation |
| `setLoading(loading)` | Loading state with spinner |
| `isDirty()` | Check for unsaved changes |
| `goToStep(index)` / `nextStep()` / `prevStep()` | Wizard navigation |
| `toggleSection(id)` / `setSectionCollapsed(id, collapsed)` | Section control |
| `updatePanel(content)` | Replace panel content |

---

## 4. Behaviour

- **Single-page**: All fields visible in scrollable body. Optional collapsible sections. Optional resizable panel.
- **Wizard**: One step visible at a time. Step indicator shows progress. Back/Next/Submit buttons. Configurable transitions (slide/fade/none).
- **Validation**: Required, email, custom per-field, custom per-step. Errors clear on input. Focus first invalid on submit/next.
- **Loading**: Auto-enters loading state when onSubmit returns a Promise. Spinner on submit button, all fields disabled.
- **Dirty tracking**: Optional `warnOnDirty`. Compares current vs. initial values. ConfirmDialog on close if dirty.
- **Panel**: Resizable via pointer-capture drag. Reactive render callback re-invokes on field changes.
- **Focus trap**: Tab/Shift+Tab cycles within dialog. Restore previous focus on close.

---

## 5. Keyboard

| Key | Context | Action |
|-----|---------|--------|
| Escape | Dialog | Close (warnOnDirty check) |
| Tab / Shift+Tab | Dialog | Cycle focus within dialog |
| Enter | Single-line field | Submit form |
| Enter | Wizard, non-last step | Next step |

---

## 6. Accessibility

- Dialog: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
- Close button: `aria-label="Close"`
- Required fields: `aria-required="true"`
- Error fields: `aria-invalid="true"`, `aria-describedby` → error element
- Section toggles: `aria-expanded`, `aria-controls`
- Step indicator: `aria-current="step"` on active step
- Live region: `aria-live="polite"` for announcements

---

## 7. Dependencies

- Bootstrap 5 CSS (SCSS variables)
- Bootstrap Icons (`bi-x-lg`, `bi-chevron-down`, `bi-chevron-right`, `bi-check-lg`)
- Optional: `window.showConfirmDialog` for dirty warnings, `window.showErrorToast` for rejected promises
