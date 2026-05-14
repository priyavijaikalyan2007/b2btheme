<!--
  SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
  SPDX-License-Identifier: MIT
-->

# DynamicFormSwitcher — Progress and Plan

**Status:** Shipped (CDN). Field-capable components convention adopted.

This file is the per-component progress log per AGENTS.md. Source of truth
for the requirement is `specs/dynamicformswitcher.req.md`. ADRs:
- ADR-132 — primitive shipped (variant form switcher with retained state).
- ADR-133 — FormDialog field-type expansion (additive subset).
- ADR-134 — Form-field-capable Components Convention + auto-discovery + registry + mount.

---

## Implementation summary

### Core (ADR-132)
- Variants: `Record<string, DynamicFormVariant>` with `initialVariant`.
- Three selector styles: `dropdown` / `segmented` / `tabs` + selector-less
  mode (default; caller drives via `setVariant()`).
- Per-variant state retention via `Map<variantId, Values>`. State key
  invariant: `(variantId, fieldName)` — same-named fields across variants
  are stored independently.
- Native-typed value extraction (`number → number | null`, `toggle → boolean`,
  `multiselect → string[]`, `file → File[]`, etc.). No string coercion.
- `validate()` runs per-field validators + adapter `validate()` + optional
  `onValidate` cross-field veto. Inline error markers + `aria-invalid`.
- Public API: `getVariant` / `setVariant` / `getValues` / `getAllValues` /
  `setValues` / `clearValues` / `validate` / `reset` / `resetAll` /
  `refresh` / `destroy`.
- ARIA region + tablist + arrow-key navigation. Respects
  `prefers-reduced-motion`. Dark mode via `data-bs-theme` (no explicit prop).

### Field type set (ADR-133)
- Full built-in coverage: `text`, `email`, `password`, `url`, `number`,
  `textarea`, `select`, `multiselect`, `radio`, `checkbox`, `toggle`,
  `date`, `datetime`, `time`, `file`, `color`, `code`, `richtext`, `custom`.
- FormDialog extended with `url` / `datetime` / `time` / `color` / `radio` /
  `code` / `richtext` (string-valued subset). `multiselect` and `file`
  deferred from FormDialog (require breaking `getValues()` value-shape
  change to `Record<string, unknown>`).

### Component-driven field machinery (ADR-134)
- `field.mount: (host, fieldName) => DynamicFormFieldAdapter` on
  `type: "custom"` — caller returns a full adapter; DFS owns lifecycle.
- `field.componentOptions` — forwarded verbatim to factory / provider.
- **Auto-discovery**: unknown `field.type` → `window.create<PascalCase>`
  with multi-pattern resolution (kebab canonical, camelCase, lowercase
  window scan). Library convention: factory accepts `(containerId: string,
  options) => Handle`. DFS assigns a stable id to host element, attaches it
  to `fieldsEl` before factory invocation, and passes the id string.
- **Registry**: `registerDynamicFormFieldProvider(typeName, factory)` for
  non-conformant components or test overrides.
- **Literate error**: rendered in-place when no factory/provider matches.
- `tearDownActiveAdapters()` runs before re-render and on destroy.

### Convention codified
- AGENTS.md (CRITICAL section) — required surface, type-name mapping,
  out-of-scope taxonomy, per-PR checklist.
- 26 existing components conform as-is.
- 7 retrofitted: `latexeditor`, `symbolpicker`, `sprintpicker`,
  `timezonepicker`, `peoplepicker`, `multiselectcombo`, `visualtableeditor`.
- 2 excluded by design: `explorerpicker` (selection panel), `smarttextinput`
  (multi-shape AI input).

---

## Files

| Path | Role |
|---|---|
| `components/dynamicformswitcher/dynamicformswitcher.ts` | Implementation. |
| `components/dynamicformswitcher/dynamicformswitcher.scss` | Styles + dark-mode tokens + literate-error block. |
| `components/dynamicformswitcher/dynamicformswitcher.test.ts` | 68 tests (51 from ADR-132, 17 from ADR-134). |
| `components/dynamicformswitcher/README.md` | Public API + embedding patterns + auto-discovery / mount / registry examples. |
| `components/diagramengine/src/stencils-ui-components.ts` | Stencil entry (Tier A) for Layout Studio. |
| `demo/components/dynamicformswitcher.html` | 9 demo sections (1–5 builtins; 6–9 auto-discovery / registry / mount / literate error). |
| `demo/studio/component-studio.html` | Component Studio tile. |
| `agentknowledge/concepts.yaml` | DynamicFormSwitcher + FieldCapableComponentsConvention concepts. |
| `agentknowledge/decisions.yaml` | ADR-132 / 133 / 134. |
| `agentknowledge/history.jsonl` | Append-only task log. |
| `AGENTS.md` | CRITICAL "Form-field-capable Components — DynamicFormSwitcher Convention" section. |
| `CHANGELOG.md` | 2026-05-13 entries. |

---

## Known gaps / open follow-ups

1. **FormDialog `multiselect` + `file` types** — deferred (ADR-133 partial).
   Requires breaking change to `getValues(): Record<string, string>` →
   `Record<string, unknown>`. 8 internal callers must migrate.
2. **ExplorerPicker DFS field shape** — out-of-scope per ADR-134, but if a
   "pick a resource" field is needed in DFS, register a thin provider that
   wraps ExplorerPicker into the adapter contract.
3. **SmartTextInput DFS field shape** — out-of-scope per ADR-134. Apps must
   register a provider that picks the appropriate content format
   (`getPlainTextContent` vs `getSerializedContent`) for their use case.
4. **Future field-capable components** — any new value-bearing component
   PR must include the per-PR checklist in AGENTS.md ("Form-field-capable
   Components Convention" section). The auto-discovery test path is
   parameterised in `dynamicformswitcher.test.ts > retrofitCompliance`
   — extend that array when adding new components to the convention.

---

## Test scorecard

- DynamicFormSwitcher: **68** unit tests, all green.
- FormDialog: **38** unit tests (existing 31 + 7 new for ADR-133 types).
- Retrofitted components: all existing tests pass unchanged
  (latexeditor / symbolpicker / sprintpicker / timezonepicker /
  peoplepicker / multiselectcombo / visualtableeditor).
- Full repo: **4087 / 4087** tests across 123 files, no regressions.

---

## Operational notes

- **Container convention** — auto-discovered factories receive a
  *containerId string*, not an HTMLElement. DFS sets `host.id` and attaches
  the host to `fieldsEl` BEFORE calling the factory; `buildFieldGroup` later
  re-parents the host into its label/error wrapper. Factory-rendered children
  move with the host. Without the temporary attach step, `document.getElementById`
  inside the factory returns null and "Container not found" errors fire.
- **Adapter destroy ordering** — `tearDownActiveAdapters()` runs BEFORE
  `clearChildren(bodyEl)` in `render()`. Adapters that hold references to
  DOM inside the host can clean up cleanly before the host is detached.
