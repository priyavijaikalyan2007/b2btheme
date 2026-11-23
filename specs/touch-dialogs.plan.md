# Touch, family 2: dialogs and forms

> Executed inline. The owner asked for no subagents.

**Goal:** The dialogs and forms family follows `TOUCH_EXPERIENCE.md`, as `specs/2026-11-18-touch-ux-review.md` sections 4 and 5.2 say. Part of #181. It covers FormDialog, ConfirmDialog, ErrorDialog, ProgressModal, DynamicFormSwitcher, PropertyInspector, ShareDialog, FileUpload, Stepper, AuthCard and MaskedEntry.

## Decisions

- **The owner, 23 November 2026: a tap outside closes a dialog only when it has no unsaved changes** (`TOUCH_EXPERIENCE.md` section 6.1).
  - FormDialog: with unsaved changes, a tap on the backdrop does nothing. With `warnOnDirty`, it asks, as `close()` does today.
  - ShareDialog: a tap on the backdrop does nothing while the person has added, changed or removed access, or picked people not yet added.
  - A clean dialog closes on the tap as today. `closeOnBackdrop: false` still turns the tap off. Cancel and `Escape` do not change. ConfirmDialog holds no input, so it does not change.
- **No `inputmode` work.** The review found no `inputmode`. FormDialog and DynamicFormSwitcher give email, URL and number fields their native input types, and the browser then opens the right keyboard. No field in the family is a number or an email field that is typed as text.

## Work

1. **The tap outside**, in FormDialog and ShareDialog, with unit tests for a clean dialog, unsaved changes, `warnOnDirty`, and `closeOnBackdrop: false`.
2. **Drags:**
   - FormDialog's divider and PropertyInspector's resize handle put back their size on `pointercancel` (section 9, item 5).
   - Each declares `touch-action`, from the section 9 table.
   - Unit tests for the cancel.
3. **The section 4 work** for the eleven:
   - hover styles in `@media (hover: hover)`;
   - 44 px targets under a coarse pointer;
   - `overscroll-behavior: contain` on inner scroll areas;
   - `100dvh` for FormDialog and ShareDialog;
   - a **Pointer and touch** section in each README.
4. **A browser test** with a touch screen. It measures each component's targets, checks a tap outside a dirty FormDialog, and checks the `touch-action` values.
5. **Counts and documents:**
   - lower the ratchets;
   - CHANGELOG and one history line;
   - the references.
6. **Verify:** `npm run build`, `npm test`, `npm run test:structure`, then `npm run test:e2e` alone. Then push, open the PR, and wait for CI.
