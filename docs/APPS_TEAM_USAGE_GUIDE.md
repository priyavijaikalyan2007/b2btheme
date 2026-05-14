<!-- AGENT: Consumer-facing usage guide for the apps teams that embed CDN
     components from this theme repo. Covers stable workflow, naming
     conventions, README-first discipline, and a CI guard recipe to catch
     silent rename regressions early. -->

# Apps Team Usage Guide

This guide is for teams that consume the Enterprise Bootstrap Theme components
from the CDN (`static.knobby.io/components/<slug>/`). It explains the workflow
that keeps integrations stable across CDN updates and how to catch the silent
breaking changes that have surfaced over the last few cycles.

If you only read one section: **[the three rules](#the-three-rules)**.

---

## The three rules

1. **README is the source of truth.** Before writing the first call to any
   component, read its README at
   `https://static.knobby.io/docs/components/<slug>/README.md`. The factory
   name, the option keys, the callback names, and the handle methods are
   listed there. **Do not guess** these from the directory slug — they are
   often *not* a mechanical transform of the slug.

2. **Pin to a CDN version and read the CHANGELOG on bump.** The repo
   maintains `CHANGELOG.md` at the root of the CDN. Every API rename,
   removal, or option-shape change lands there with an explicit "BREAKING"
   marker. Read the diff for components you embed before promoting a bump.

3. **Add a CI grep guard against rogue factory names.** The factory names
   `window.create<PascalCase>` are unguessable for some slugs (see
   [Naming gotchas](#naming-gotchas) below). A CI grep against a curated
   allowlist catches typo regressions early and surfaces silent renames at
   PR time, not in production. See [CI guard recipe](#ci-guard-recipe).

---

## Why renames happen

The theme repo is moving toward a uniform convention so that **every
value-bearing component is automatically usable as a form field inside
`DynamicFormSwitcher`** (see `AGENTS.md` → "Form-field-capable Components"
section, ADR-134). That convention requires:

- A factory signature `window.create<PascalCase>(containerId: string, options) => Handle`
- An `onChange(value)` callback (alongside any domain-specific ones)
- `getValue()` / `setValue(value)` handle methods
- A `value` option (alongside any domain-specific seed option)

The convention is additive for most components. For a small number of
components, prior public names didn't fit — those were renamed in the same
cycle the convention landed. The recent rename log:

| Component | Before | After | Cycle |
|---|---|---|---|
| `Breadcrumb` | `options.segments` | `options.items` | 2026-03 |
| `SymbolPicker` | `onChange` (selection event) | `onInsert` (insertion event) — `onChange` repurposed to fire on selection with `string` payload | 2026-05 |
| `MultiselectCombo` | `window.createMultiSelectCombo` (lower-cased `S`) at one point — current canonical is **`createMultiselectCombo`** (capital `S` on `Select`, lowercase `c` on `combo`) | n/a — names have flipped twice; pin to the README | 2026-04 |

We hear the apps team feedback that three renames in eight weeks is too
many. Going forward:

- **Public-API renames will ship a runtime deprecation warning under the old
  name for at least one minor release** before the old name is removed. If
  you see `[ComponentName] DEPRECATED: 'oldKey' renamed to 'newKey' …` in
  the console, do not ignore it — it is your one-cycle migration window.
- **CHANGELOG.md will list the rename under a `### BREAKING` heading**, with
  the before/after symbol and the cycle it ships in.
- **Per-component README will show the canonical name at the top of the
  Quick Start block.** If you are looking at a README and the example call
  does not compile in your app, you are reading a stale local copy — refetch
  from `static.knobby.io/docs/components/<slug>/README.md`.

This is a one-way ratchet: we will not silently rename again. If a regression
slips through, file it and we will treat it as a bug, not a versioning
question.

---

## Naming gotchas

For most components, the factory name is a literal PascalCase of the
directory slug. For example:

- `components/breadcrumb/` → `window.createBreadcrumb`
- `components/datepicker/` → `window.createDatepicker`
- `components/colorpicker/` → `window.createColorpicker`

But several slugs are compound words where the PascalCase boundary is not
mechanical. **Always check the README** for these:

| Directory slug | Factory name |
|---|---|
| `multiselectcombo` | `createMultiselectCombo` |
| `peoplepicker` | `createPeoplePicker` |
| `sprintpicker` | `createSprintPicker` |
| `timezonepicker` | `createTimezonePicker` |
| `symbolpicker` | `createSymbolPicker` |
| `latexeditor` | `createLatexEditor` |
| `visualtableeditor` | `createVisualTableEditor` |
| `dynamicformswitcher` | `createDynamicFormSwitcher` |
| `formdialog` | `createFormDialog` |
| `confirmdialog` | `createConfirmDialog` |

DynamicFormSwitcher auto-discovers factories using a three-pattern resolver
(kebab canonical, camelCase, lowercase window scan) which absorbs most slug
shapes, but **your hand-written code is not protected by that resolver** —
it calls `window.createXxx` directly.

---

## Recommended workflow

Adopt this sequence for every component you embed:

1. **Read the README first**, full sweep, before writing the first call.
   The Quick Start block at the top of every README compiles as-is.
2. **Copy the Quick Start verbatim**, including the factory name and the
   option keys. Do not paraphrase from a teammate's memory.
3. **Type-check against the published `.d.ts`.** Each component ships a
   type definition at `components/<slug>/<slug>.d.ts` on the CDN. Wire it
   into your TypeScript project's `paths` or vendor it; the d.ts encodes
   every public type and will catch most renames at compile time.
4. **Run the CI guard ([recipe below](#ci-guard-recipe))** on every PR.
5. **On a CDN version bump**, diff `CHANGELOG.md` between your pinned
   version and the new version. Look for `BREAKING` markers. Grep your
   codebase for the affected symbols.
6. **In dev, do not silence the console.** Deprecation warnings only fire
   in the console; if a build pipeline strips them, the migration window is
   invisible to you. Keep one dev environment loud.

---

## CI guard recipe

A grep-based allowlist of `window.create*` references catches three failure
modes: typos, silent renames, and accidental adoption of unwhitelisted
private components.

### As a shell script (any CI)

Save as `scripts/check-cdn-factory-names.sh` in your repo, mark executable,
wire it into your CI's lint stage:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Allowlist of CDN factory names this app is allowed to call.
# Keep this list in sync with the type stub interface.
ALLOWED=(
    "createBreadcrumb"
    "createConfirmDialog"
    "createDatepicker"
    "createDynamicFormSwitcher"
    "createFormDialog"
    "createMultiselectCombo"
    "createPeoplePicker"
    "createSprintPicker"
    "createSymbolPicker"
    "createTimezonePicker"
    "createToast"
    # ...add components as you adopt them
)

# Build an alternation pattern from the allowlist.
ALLOWED_PATTERN=$(IFS=\|; echo "${ALLOWED[*]}")

# Find every reference to a window.create<Pascal> call in the codebase.
mapfile -t FOUND < <(
    grep -rEho 'createElement|create[A-Z][A-Za-z0-9_]+' src/ \
        | grep -v '^createElement$' \
        | sort -u
)

FAIL=0
for name in "${FOUND[@]}"; do
    if [[ ! "|$ALLOWED_PATTERN|" =~ \|"$name"\| ]]; then
        echo "ERROR: unrecognised CDN factory name: $name"
        FAIL=1
    fi
done

exit $FAIL
```

### As an ESLint rule (TypeScript projects)

If your app uses ESLint, the same allowlist can be enforced by
`@typescript-eslint/no-restricted-syntax` with a `MemberExpression` selector
on `window.create*`. Configure once, no per-PR cost.

### Where to source the allowlist

The canonical list of public factory names is the per-component README on
the CDN (`static.knobby.io/docs/components/<slug>/README.md`, top of the
Quick Start block). The theme repo also publishes `COMPONENT_INDEX.md` at
the CDN root which lists every component slug; the factory name is the
PascalCase form documented in each linked README.

If you want a single machine-readable source of truth, the bundled type
stubs at `dist/types.d.ts` (planned, currently per-component `.d.ts` files)
are authoritative.

---

## Stable APIs you can rely on (form-field-capable subset)

The following surface is **stable and convention-locked** across every
form-field-capable component — it is the contract `DynamicFormSwitcher`
auto-discovers against, and renaming any of these would break the
convention itself, so renames here are off the table.

| Symbol | Type | Notes |
|---|---|---|
| `window.create<PascalCase>(containerId, options)` | factory | `containerId` is a string; the DOM element with that id must exist in the document when the factory is called. |
| `options.value` | seed value | Type matches the field's value contract (`string`, `boolean`, `string[]`, etc. — see component README). |
| `options.onChange(value)` | callback | Fires on every user-driven value change; payload type matches `getValue()`. |
| `handle.getValue()` | method | Returns the current value. |
| `handle.setValue(value)` | method | Sets the value programmatically; should fire `onChange` only if the value actually changed. |
| `handle.destroy()` | method | Tears down event listeners and DOM. Idempotent. |

Domain-specific options and callbacks (e.g. `SymbolPicker.onInsert`,
`PeoplePicker.maxSelections`) are documented per-README and may evolve;
the convention surface above will not.

---

## Reporting an unexpected rename

If you upgrade the CDN and a component you embed breaks without a
CHANGELOG `BREAKING` entry or a runtime deprecation warning, that is a
defect in the theme repo. File it with:

- Component slug
- The old symbol that stopped working
- The CDN versions involved (`from` and `to`)
- A minimal repro snippet

We will treat it as a bug, not a versioning discussion.

---

## Related reading

- `AGENTS.md` (root of CDN) — "Form-field-capable Components Convention" section.
- `CHANGELOG.md` (root of CDN) — `BREAKING` entries are the renaming log.
- `COMPONENT_INDEX.md` (root of CDN) — categorised list of every component
  with links to per-component READMEs.
- `docs/AGENT_QUICK_REF.md` — quick reference for embedding components.
