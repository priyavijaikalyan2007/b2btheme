<!--
SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
SPDX-FileCopyrightText: 2026 Outcrop Inc
SPDX-License-Identifier: MIT
Repository: enterprise-bootstrap-theme
File GUID: 8c41d6b2-9f73-4e05-b1a8-2d7c5e9f4a31
Created: 2026
-->

<!-- AGENT: Design + response to the apps-team fallback reports. A component that cannot read must refuse, never fabricate. -->

# No fabricated reads — a failed component must refuse, not answer

**Status:** Approved (decision D3 taken by the user; the rest follow from the reports)
**Date:** 2026-10-04
**ADR:** ADR-148
**Responds to:** `2026-10-03-fail-fast-over-fallback.md`,
`2026-10-03-null-object-pickers-fabricate-settings.md`
**Defers:** `2026-10-03-serve-the-dependency-closure.md` — see §8

---

## 1. The rule we are adopting

Taken verbatim from the apps report, because it is correctly stated there and
restating it would only weaken it:

> 1. **A degraded component may never report success.**
> 2. **A degraded component may never participate in a write.**

And its deciding question, which is the one worth memorising:

> **Can a caller tell the difference between "there is nothing" and
> "I could not find out"?**

A component that answers a read after failing to initialise has answered the
second question with the first. A host then persists it.

## 2. What the audit found

The reports named four pickers. An audit of all 125 components found **twelve
sites across seven components**, including three the reports did not reach and
one they explicitly cleared.

### Tier 1 — fabricates a value a host would persist

| # | Component | Site | Fabricates | In reports? |
|---|---|---|---|---|
| 1 | **dynamicformswitcher** | `:1106` | adapter throw → `undefined` | no |
| 2 | **dynamicformswitcher** | `:1124` | unmounted field → typed default | no |
| 3 | **prompttemplatemanager** | `:1371` | failed save → `replaceTemplate` **+ `clearDirty`** | no |
| 4 | **prompttemplatemanager** | `:1867` | failed load → `[]` **+ success log** | no |
| 5 | **prompttemplatemanager** | `:1447` | failed duplicate → phantom template | no |
| 6 | orientationpicker | `:580` | `"portrait"` | yes |
| 7 | columnspicker | `:631` | `{name:"One",columns:1,widths:[1]}` | yes |
| 8 | spacingpicker | `:595` | `nullPreset` | yes |
| 9 | toolcolorpicker | `:739` | `nullColor` | yes |
| 10 | **layoutpicker** | `:1152` | `null` | listed as *not* a problem |

### Tier 2 — cache clobber, lower severity

| # | Component | Site | Behaviour |
|---|---|---|---|
| 11 | commandpalette | `:223` | recents load fails → `[]`, later written back |
| 12 | fontdropdown | `:1139` | recents load fails → `[]`, later written back |

### The two findings that matter most

**`dynamicformswitcher` is the aggregation point, and fixing the pickers without
it would have accomplished nothing.** `DynamicFormSwitcher` is designated in
`AGENTS.md` as the generic form host every value-bearing component is driven
through. Its `readFieldValue` catches an adapter throw and returns `undefined`;
its `fallbackDefault` invents a typed value for a field that never mounted. Both
feed `getValues()`, which is precisely what a host hands to `api.save()`. A
picker rewritten to throw would have had that throw caught here and converted
into `undefined` — the same fabrication, one level up, and harder to see.

**`prompttemplatemanager:1371` is the most damaging single site in the library,
and neither report reaches it.** On a failed save it calls `replaceTemplate(tpl)`
with the local copy and then `clearDirty(tpl.id)`. The editor reports the
template as saved and drops the unsaved-changes marker. A user who then navigates
away loses the work, with no error surfaced at the point of loss. This is the
incident's mechanism exactly — a failure rendered as success, then acted upon —
rather than the milder "stale value gets persisted".

`:1867` is the only site in the library that breaks **both** clauses at once: it
replaces the template list with `[]` *and* logs `Refreshed: 0 templates`.

### Correction to the reports

`layoutpicker` was listed under "not a problem, listed so nobody spends time on
it", on the grounds that it fabricates only `getElement()`. It also returns
`getValue: () => null`, and its contract is `getValue(): LayoutAlgorithm | null`
— so `null` is a **legitimate domain value** meaning "no layout selected". The
null object is therefore indistinguishable from a real user choice, which is the
report's own deciding question failing. It is arguably worse than
`orientationpicker`, where `"portrait"` at least looks like a default.

### What is already correct, recorded so nobody re-opens it

- **`breadcrumb.ts:830` already throws** on a missing container. It is the
  in-repo precedent for this fix and the pattern the others move to.
- The six visible-degraded-DOM builders the report cleared are genuinely fine:
  they produce an on-screen degraded element and nothing reads a setting from
  them.
- `prompttemplatemanager:1394` (`onDelete` → `false` → abort) is correct.
- No component logs success from a failure branch, except `:1867` above. The
  reports' credit that `logError` is called before returning is accurate.

## 3. Decisions

### D1 — A missing container throws. The null-object factories are deleted.

For the five pickers. A container that cannot be resolved is a host programming
error — a selector that matches nothing, or a call before the element exists. It
is not a runtime condition to absorb. This is the reports' first preference, it
matches `breadcrumb`, and **no internal caller is affected**: every in-repo
reference to these factories is a registry name string, not a call.

Messages follow `LITERATE_ERRORS.md` — what happened, why, what to do:

```ts
throw new Error(
    `[OrientationPicker] Cannot create the picker: no element matches ` +
    `container "${String(options.container)}". ` +
    `Check the selector, and ensure the element exists in the DOM before ` +
    `calling createOrientationPicker().`);
```

### D2 — A degraded `getValue()` is impossible, because the object no longer exists.

D1 subsumes the reports' option 3. There is no null object left to read from.

### D3 — `DynamicFormSwitcher.getValues()` throws, naming every unreadable field.

**Chosen by the user** from three options. The alternatives — omitting failed
fields, or a discriminated result — each leave a path where a whole-document
host still persists a partial form. Throwing removes the path entirely.

```ts
public getValues(): Values
{
    const unreadable = this.collectUnreadableFields();

    if (unreadable.length > 0)
    {
        throw new Error(
            `[DynamicFormSwitcher] Cannot read ${unreadable.length} field(s): ` +
            `${unreadable.join(", ")}. Refusing to return a partial form, ` +
            `because saving one would overwrite the user's stored values with ` +
            `defaults. Fix the field's mount, or remove it from the schema.`);
    }

    return values;
}
```

`readFieldValue` stops converting an adapter throw into `undefined` and stops
calling `fallbackDefault` for a field that never mounted; both record the field
as unreadable instead. `fallbackDefault` is deleted — its only caller was the
unmounted-field branch, and a seeded default is exactly the fabrication at issue.

**This is a breaking change** for a consumer that today reads a partial form and
tolerates it. That is intended, and it is the specific breakage the reporting
team asked for.

### D4 — A failed host callback never becomes the success path.

For the three `prompttemplatemanager` sites. Throwing is wrong here: these are
async UI flows where the right behaviour is to keep prior state and surface the
failure, not to unwind.

| Site | Now | Becomes |
|---|---|---|
| `:1371` save | `replaceTemplate(fallback)` then `clearDirty` | keep dirty, keep the local edit, surface the error; **never** clear the marker |
| `:1867` load | `setTemplates([])` + `logInfo("Refreshed: 0")` | keep existing templates, `logError`, no success log |
| `:1447` duplicate | push the local copy | push nothing, surface the error |

`safeAsync` keeps existing as a helper but loses its fabricating use: callers
that need a value on failure must decide explicitly rather than passing a
plausible one.

### D5 — Tier 2 caches: stop the write-back, keep the empty read.

Returning `[]` for a *recents* list whose load failed is a legitimate degraded
read — it is a cache, and an empty recents list is honest. The clause-2 breach is
narrow: the component later persists its in-memory list, overwriting the stored
recents it failed to read. Both set a flag on load failure and skip persisting
for that session.

### D6 — The build enforces this, because prose already failed.

`scripts/check-stand-in-reads.py` runs as structure check `[9]`. It fails the
build when a stand-in factory exposes a read that answers rather than refuses.
This mirrors the apps repo's `check-fallbacks.sh` and follows this repo's own
doctrine that a contract without a failing test is a hope.

**Stated honestly: the guard sees one shape.** It detects named
`create*/build*Null|Fallback|NoOp|Stub|Empty` factories that expose a read
method. It does **not** detect an inline failure branch returning an object
literal, a `catch` that returns a fabricated value, or an aggregation-point
default like `fallbackDefault` — all three of which were found by hand in this
audit. A regex pass over `catch` blocks was prototyped and produced 25 hits of
which roughly 4 were real; it is not gate-worthy and was dropped rather than
shipped as noise. The guard is a ratchet against the most common shape
re-appearing, not a proof of absence.

## 4. Why the pattern was permitted here

The apps report attributes it to contradictory instructions and asks us to check
for our copy. **This repo has neither instruction** — no "design fallback
mechanisms for storage failures", and no Fallback Code Prohibition either.

What it has is `FRONTEND.md:87`:

> Fail gracefully: if a component cannot initialise, log the error and leave the
> DOM unchanged.

That is not wrong, it is **incomplete**, and it licenses the null object by
omission. It mandates the two things the existing code already does correctly —
log, and do not touch the DOM — and is silent on the third, which is the one
that matters: *do not answer*. An agent following it exactly produces
`createNullPicker()`. The line is amended rather than deleted, because its first
two clauses are still right.

## 5. Report 2's open question about stylesheets

> If those components can render without their stylesheet in a way that hides a
> destructive confirmation, that is worth a look independently.

**Checked: ConfirmDialog fails visible, not invisible.** It builds plain `<div>`
elements and sets no visibility, opacity or display from TypeScript. The only
`opacity: 0` in `confirmdialog.scss` is the *from*-state of a keyframe, which
cannot apply when the stylesheet is absent. With no CSS the backdrop and dialog
render unstyled in normal document flow: ugly, fully legible, buttons clickable
and labelled. Toast behaves the same way.

So an unstyled confirmation is not a hidden one. No change needed, and the
question is closed rather than left ambient.

## 6. Verification

Per the report's closing ask — "a test per picker asserting that a failed mount
**cannot** produce a value, rather than only that it logs":

| Property | Test |
|---|---|
| A bad container throws | `Factory_InvalidContainer_Throws` × 5 pickers |
| No readable object survives a failed mount | the factory call itself throws, so there is nothing to read |
| A partial form cannot be read | `GetValues_UnreadableField_Throws` |
| An adapter throw is not absorbed | `ReadFieldValue_AdapterThrows_MarksUnreadable` |
| An unmounted field is not defaulted | `GetValues_UnmountedField_Throws` |
| A failed save keeps the dirty marker | `Save_CallbackRejects_KeepsDirty` |
| A failed load keeps prior templates | `Refresh_CallbackRejects_KeepsTemplates` |
| A failed load logs no success | `Refresh_CallbackRejects_NoSuccessLog` |
| A failed duplicate adds nothing | `Duplicate_CallbackRejects_AddsNothing` |
| The guard catches a reintroduction | mutation test on check `[9]` |

`components/orientationpicker/orientationpicker.test.ts:86`
(`Factory_InvalidContainer_LogsError`) is replaced rather than amended. The
report is precise that it does not assert the dangerous read — it asserts the
log and then calls `destroy()` — so it was not pinning the defect in place the
way the apps repo's test was. It does depend on the factory returning an object,
so D1 breaks it, and the replacement asserts the throw.

## 7. Non-goals

- No change to the six visible-degraded-DOM builders.
- No change to the glow/elevation/surface work of ADR-147.
- `safeAsync` is not deleted, only its fabricating call sites.
- No new runtime dependency.

## 8. Deferred: serve the dependency closure

`2026-10-03-serve-the-dependency-closure.md` asks for the third-party closure to
be vendored to `static.knobby.io` with SRI hashes and immutable URLs. It is real
and we accept the reasoning — in particular that serving the closure and applying
SRI are one requirement rather than two, since `integrity` cannot attach to a
bare import specifier.

It is **not** part of this change. It is infrastructure — a vendoring step in the
build, a hash manifest, `_headers` rules, and a version-bump protocol for
consumers — and bundling it with a correctness fix would delay the fix and
obscure both. The repo already vendors `chart.js` under `dist/vendor/`, so the
pattern exists to extend.

Tracked as **DEBT-SEC-4**, to be specced separately. **DOMPurify first**, per the
report's own ordering: every other asset degrades when substituted, while a
substituted sanitizer becomes the attack.
