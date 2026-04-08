# Bug Report: FormDialog Needs `showFooter` Option

> **Date:** 2026-04-08
> **Severity:** Medium (UX confusion — duplicate button rows)
> **Component:** CDN FormDialog (`static.knobby.io/components/formdialog/`)
> **Affected Apps:** Strukture (Add Relationship wizard), potentially any app using FormDialog as a modal container

---

## Summary

When using FormDialog with `customContent` that contains its own action buttons (e.g., a CDN Stepper component), the FormDialog footer (Submit + Cancel buttons) still renders, creating a confusing **dual-footer** with two sets of buttons visible at the bottom of the dialog.

---

## Problem

The "Add Relationship" wizard uses FormDialog as a modal container with `customContent` holding a CDN Stepper. The Stepper renders its own navigation buttons (Back / Next / Create). However, FormDialog also renders its own footer with Submit and Cancel buttons, resulting in two rows of buttons at the dialog bottom.

Setting `submitLabel: ''` only makes the submit button text blank (or renders a blank button) — it does not hide the footer.

### Expected Behavior

When a consumer provides `showFooter: false` (or equivalent), the entire footer row (Submit + Cancel) should be hidden, allowing `customContent` to manage its own action buttons.

### Actual Behavior

The footer always renders. There is no option to hide it.

---

## Reproduction

```typescript
const dialog = window.createFormDialog({
    title: 'Add Relationship',
    size: 'xl',
    cssClass: 'rel-wizard-dialog',
    customContent: stepperContainer,  // Stepper has its own Back/Next/Create buttons
    fields: [],
    submitLabel: '',      // ← Does NOT hide the footer
    autoClose: false,
    onSubmit: async () => {},
});
// Result: Dialog shows Stepper buttons AND a blank Submit + Cancel row
```

---

## Recommended Fix

### Option A: `showFooter` boolean (Recommended)

Add a `showFooter` option that controls footer visibility:

```typescript
interface FormDialogOptions {
    // ...existing options...
    /** Whether to show the footer with Submit/Cancel buttons. Default: true. */
    showFooter?: boolean;
}
```

Usage:
```typescript
const dialog = window.createFormDialog({
    title: 'Wizard',
    customContent: stepperEl,
    showFooter: false,     // Footer hidden, Stepper manages its own buttons
    onSubmit: async () => {},
});
```

This is preferred over a separate "modal container" component because FormDialog already provides the overlay, header, close-on-Escape, backdrop click, and animation — all of which we want to reuse.

### Option B: Auto-hide when `customContent` is sole content

If `customContent` is provided and `fields` is empty/absent, infer that the footer is not needed. This is more magical and could break existing consumers who use `customContent` alongside the default footer.

### Option C: Separate `ModalContainer` component

Create a new component that provides only the modal shell (overlay, header, close behavior) without any form fields or footer. This is more explicit but adds another component to maintain.

**Recommendation:** Option A is the cleanest. It's explicit, backward-compatible, and requires minimal CDN changes.

---

## Current Workaround

Consumer-side CSS to hide the footer for the specific dialog:

```css
.rel-wizard-dialog .form-dialog-footer {
    display: none !important;
}
```

This is fragile (depends on internal CDN class names) but functional until the CDN fix is available.

---

## Impact

- Strukture "Add Relationship" wizard shows duplicate action buttons
- Users see two "Cancel" buttons and a blank "Submit" button alongside the Stepper's "Create" button
- Confusing UX that undermines the wizard flow
