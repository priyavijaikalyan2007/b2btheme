# Bug Report: FormDialog `type:'toggle'` Field Loses State Across Wizard Step Navigation

**Date:** 2026-05-05
**Reporter:** Platform team (via Claude agent)
**Severity:** High — silently drops user input in a multi-step submission flow
**Affects:** FormDialog (CDN component from `static.knobby.io/components/formdialog/`), wizard mode (`steps: [...]`)
**Workaround status:** **None in repo** — we explicitly removed our closure-backed custom-element workaround so this bug remains observable until the CDN fix lands.

---

## Summary

When a `FormDialog` is configured in **wizard mode** (i.e. `steps: [...]` instead of a flat `fields: [...]`) and a step contains a `type: 'toggle'` field, the toggle's checked state is **not preserved across step navigation**. Advancing to a later step and returning, or simply reading `dlg.getValues()` from a different step, returns the toggle's *declared* `checked` value, not the user's current input.

This is silent: there is no console warning, no validation error, and submitted values look reasonable to the user during the wizard. The bad value reaches the server.

Other field types in the same wizard (`text`, `select`, `textarea`, `password`) preserve their state correctly across step navigation, so the bug appears to be specific to the toggle field renderer.

---

## Expected Behaviour

In a wizard, every interactive field type should preserve user input across step transitions. Specifically:

```js
const dlg = createFormDialog({
    title: 'Install Integration',
    steps: [
        { id: 'a', fields: [/* ... */] },
        { id: 'b', fields: [
            { name: 'enable_thing', type: 'toggle', checked: false, label: 'Thing' },
        ]},
        { id: 'c', fields: [/* review */] },
    ],
    onStepChange: (idx) => {
        if (idx === 2) {
            const v = dlg.getValues();
            console.log(v.enable_thing); // ← expected: whatever the user set on step b
        }
    },
});
```

- User opens the dialog, lands on step **a**.
- User navigates to step **b**, toggles `enable_thing` ON.
- User navigates to step **c**: `dlg.getValues().enable_thing` should be `true`.
- User clicks **Back** from **c** to **b**: the toggle should still appear ON.

---

## Actual Behaviour

- After the user toggles `enable_thing` ON on step **b** and advances to step **c**, `dlg.getValues().enable_thing` returns `false` (the declared `checked` default), as if the user had never interacted with it.
- After clicking **Back** to step **b**, the toggle renders **unchecked** again, contradicting what the user just did.
- Submitting the wizard sends the declared default to the server.

This is reliably reproducible — every wizard step transition appears to reset toggle state.

---

## Reproduction Steps

Minimal repro on `frontend/admin/integrations.html` → "Install Integration" wizard (before commit `4afcf2c` introduced the workaround, and again after commit `<TBD>` removed the workaround):

1. Tenant Admin → Integrations → Install Integration.
2. Step 1 (Choose Adapter): pick any adapter, fill source key + display name, Next.
3. Step 2 (Connection): leave default JSON, Next.
4. Step 3 (Sync Schedule): **toggle "Identity Linking" ON**. (Toggle visibly switches to on.)
5. Click **Next** to advance to Step 4 (Review).
6. The review table shows **Identity Linking: Off**, despite the toggle being on a moment ago.
7. Click **Back** to return to Step 3. The "Identity Linking" toggle is rendered **unchecked**. The user's choice has been silently dropped.

Repeat with `text`, `select`, or `textarea` fields elsewhere in the same wizard — those values survive the same back/next round-trip. The bug is specific to `type: 'toggle'`.

---

## Root Cause Hypothesis

We suspect FormDialog's wizard mode rebuilds the active step's field DOM on each step transition, and the toggle field renderer takes its initial `checked` state from the field declaration (`field.checked` or `field.value`) rather than from FormDialog's internal value cache.

Other field types (`text`, `select`, etc.) appear to read their initial value from the cache first and fall back to the declaration, so they survive a rebuild. The toggle renderer likely has the fallback order inverted, or only reads from the declaration.

Suggested investigation paths:

1. **Renderer asymmetry.** Compare the toggle field renderer to the text/select renderers in the FormDialog source. Look for whether the toggle's initial `checked` state is computed from `cache.get(name) ?? field.checked` or just `field.checked`.
2. **`getValues()` consistency.** Confirm that `getValues()` for a toggle field reads from the live DOM input on the active step **and** from the value cache for inactive steps. If `getValues()` only reads from the live DOM and there's no DOM node for the toggle when on a different step, it would fall back to `field.checked`.
3. **Cache key.** Check whether the toggle's cache key matches the other field types' cache keys. A typo or different namespace (`toggle:enable_thing` vs `enable_thing`) would explain the asymmetry.

---

## Suggested Fix

In the toggle field renderer, initialize the input's `checked` attribute from the dialog's value cache first and fall back to the field declaration only when the cache has no entry for that name:

```js
// Pseudocode — adjust to actual variable names in the CDN source
function renderToggleField(field, container) {
    const cached = this.valueCache.has(field.name)
        ? this.valueCache.get(field.name)
        : undefined;
    const initialChecked = (cached !== undefined) ? !!cached : !!field.checked;

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.role = 'switch';
    input.checked = initialChecked;
    input.addEventListener('change', () => {
        this.valueCache.set(field.name, input.checked);
        this.fireOnChange(field.name, input.checked);
    });
    // ... etc
}
```

And in `getValues()`, ensure toggle values are read from the cache (or from the live input when present), the same way text and select values are read.

A complete fix should be covered by a regression test along the lines of:

```js
test('toggle field preserves state across wizard step navigation', () => {
    const dlg = createFormDialog({
        steps: [
            { id: 'a', fields: [{ name: 'x', type: 'text', value: 'hello' }] },
            { id: 'b', fields: [{ name: 'flag', type: 'toggle', checked: false }] },
            { id: 'c', fields: [] },
        ],
    });
    dlg.show();
    dlg.goToStep('b');
    const toggle = dlg.querySelector('[name="flag"]');
    toggle.click();                           // user turns it on
    expect(toggle.checked).toBe(true);

    dlg.goToStep('c');
    expect(dlg.getValues().flag).toBe(true);  // ← currently fails (returns false)

    dlg.goToStep('b');
    const toggleAgain = dlg.querySelector('[name="flag"]');
    expect(toggleAgain.checked).toBe(true);   // ← currently fails (rendered unchecked)
});
```

It is also worth running the same regression on `radio`, `checkbox`, and any other "declaration-derived initial state" field types — the same renderer asymmetry could exist there.

---

## Affected Apps / Pages

- **Tenant Admin → Integrations → Install Integration wizard** (`frontend/admin/integrations.html`) — Identity Linking toggle on Step 3 is the field that surfaced this bug in the wild.
- Any future wizard that uses `type: 'toggle'` in any step other than the last one will hit the same bug. We are filing this now so we don't have to scatter workarounds across pages as we add more wizards.

---

## What We Want From the CDN Team

1. **Confirmation** that this is reproducible on the latest CDN build, with the renderer asymmetry hypothesis (or a different one) as the diagnosis.
2. **A fix in the CDN component** so `type: 'toggle'` in wizard mode behaves like the other field types: state preserved across step navigation, `getValues()` returns the user's current input from any step.
3. **A regression test** in the CDN repo for "toggle state preserved across wizard step navigation" (sketch above), plus a sweep for the same bug shape in `radio`, `checkbox`, and any other field type whose initial state is read from the declaration.

We will pick up the fix as soon as the new CDN build is live and verify the Integrations Install wizard end-to-end.

---

## Related

- The cron-picker side of the same wizard step previously had a similar "host element not in DOM yet" gotcha (see commit `90f0024` — `frontend/admin/integrations.html`). That one was about *mount timing* inside wizard steps, not state retention, but it's in the same conceptual neighbourhood.
- See also `docs/bugs/2026-02-20-collapsed-init-bug.md` (TabbedPanel/Sidebar collapsed-init bug) for the format / severity classification.
