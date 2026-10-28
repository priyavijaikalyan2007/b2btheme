<!--
SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
SPDX-FileCopyrightText: 2026 Outcrop Inc
SPDX-License-Identifier: MIT
Repository: instructions
File GUID: db94a357-73e9-4c29-8a8a-83d8b85f3eb6
Created: 2026
-->

<!-- AGENT: Master instructions file for coding agents; start here for all tasks. -->

# Introduction

This repository contains themes, icons, and components to be used in cloud based software-as-a-service (SaaS) 
applications. This includes both B2B and B2C SaaS-es. The core of the system relies on Bootstrap 5 
customizations and Bootstrap 5 compatible components. This is important because Javascript frameworks 
like React, Vue.js, Next.js are very heavyweight, hard to understand, require specialized skills for debugging 
and are prone to opaque errors that are often hard to fix. Simple frameworks like Bootstrap 5 with 
vanilla TypeScript compiled to Javascript are much more preferable to those frameworks.

# Customizations
Bootstrap's initial choices of colors, fonts, sizing, border radius and more are just too colorful. 
Serious SaaS applications should prefer more muted, limited choices of colors and appropriately sized spacing, 
icons, component sizing and fonts. Hence, our customizations. The key items are:

- We prefer near-rectangular components with a small, deliberate corner radius, tiered by role
  (ADR-147). Use the tokens, never a literal: `$border-radius-sm` (2px) for badges, chips and dense
  controls; `$border-radius` (4px) for buttons, inputs, cards and panels; `$border-radius-lg` (6px)
  for modals and popovers; `$border-radius-xl` (8px) for large overlays. `border-radius: 50%` for
  genuine circles and `$border-radius-pill` for capsules remain correct — they are shapes, not
  softening. The intent is a corner that reads as considered at 14px text, NOT the consumer-app
  roundness of Material Design 3. Setting every radius token to 0 returns the whole theme to hard
  corners, so this remains one decision in one place.
  (Before ADR-147 this rule read "rectangular components with 0-2 border radius".)
- We prefer components and spacing to be compact. Compact is not cramped: reading surfaces
  (lists, menus, table rows, nav) carry slightly more vertical padding than controls do. Control
  heights and the `$sp-*` fixed-pixel scale are the compactness budget and are not to be widened
  casually — `$spacer` does not drive them, so a global bump moves layouts unevenly.
- We prefer surfaces to be distinguished TONALLY, not by borders alone. Chrome (sidebars, toolbars,
  headers) sits on `--theme-surface-raised-bg`, content on `--theme-surface-bg`, the page ground on
  `--theme-body-bg`, and insets on `--theme-surface-sunken-bg`. These four are an ordered ladder;
  never substitute a raw grey for one of them. Hover and active states are TRANSLUCENT state layers
  (`--theme-hover-bg`, `--theme-active-bg`) so they shade whatever surface they land on rather than
  punching an opaque hole in it.
- We prefer shadows that are subtle and two-layered — a tight key shadow plus a wider ambient one,
  at low alpha. Use the `--theme-shadow-*` tokens (or the `$shadow-*` Sass equivalents); never
  author a raw `box-shadow` for elevation.
- **(CRITICAL) Never write a colour through `element.style`.** Doing so removes it from the theme
  permanently and silently: an inline background cannot respond to `data-bs-theme`, so when the
  theme flips the text to near-white the content disappears against its own background. Four
  VisualTableEditor presets shipped that way and were unreadable in dark mode for months
  (ADR-152). If a colour must come from DATA — a preset, a user choice, a brand value — hand it
  to CSS as a **custom property** and let the stylesheet pick per theme; the switch stays
  declarative and repaints with no re-render. A literal light value must be paired with a
  literal dark one.
- **A background and its foreground are a pair.** Setting one without the other leaves the unset
  half following the theme, and it will invert out from under you. This applies to demo code
  too — it is the first thing a consumer copies.
- We prefer muted colors that fit into a good complementary palette of colors.
- We prefer good contrast for accessibility. For example, light grey text on bright backgrounds are a terrible choice.
  **Three structure checks hold this line, so you do not have to eyeball it:** `[12]` reads the
  compiled stylesheet and verifies the surface ladder, every text token on every surface, every
  translucent state layer composited over every surface, and the namespace group fills, in both
  themes against the 4.5 AA floor; `[13]` verifies component palettes can carry their own text;
  `[15]` verifies series palettes stay separable under three colour-vision deficiencies. What
  none of them does is render a component and measure pixels, and they do not see the 73
  component-level `rgba()` backgrounds that no token names (DEBT-VR-10). A pass means "the named
  pairs are sound", not "this is accessible".
- We prefer hyper legible fonts such as Google OpenSans Text and Atkinson Hyperlegible for regular text 
  to aid low vision readers.
- We prefer clean legible fonts such as JetBrains Mono for fixed width text to aid low vision readers.
- We prefer to load fonts from the Google Fonts project with a fallback to system fonts.

# Components
Bootstrap by default does not have all the components that a full fledged SaaS might require. 
For example, a modal dialog for literate errors does not exist. An editable combo box similar to 
that found in operating systems like Linux and Windows native UIs doesn't exist. A tree of checkbox 
style selections do not exist. An explorer like navigation pane with tree layout and high customizations 
does not exist. And many more. So, beyond the vanilla components that exist in Bootstrap by default, 
we will build custom components where necessary. For that:

- All custom components must be placed within the ./components/ folder.
- There must be one folder per custom component. For example ./components/errordialog/.
- The folder must contain all the code for that component include CSS, HTML and Typescript.
- All component Javascript must be written in TypeScript and compiled into Javascript.
- Specifications for components will be in the ./specs/ folder. 
- Components should be packeged in an appropriate fashion for use in Bootstrap based applications.
- Combine component outputs into the output folder ./dist/ where the main Bootstrap CSS, Javascript are placed.
- Create or update a COMPONENTS.md file that lists all components and the path to their CSS and Javascript files. 
- The full list of components that will be built in this repository is outlined in MASTER_COMPONENT_LIST.md. 
  Basic specifications for every component is provided in that file. You MUST start from that specification 
  before expanding on it if the component is in that file.
- Always consult KEYBOARD.md to make sure to adhere to the keyboard usage conventions outlined in that document. 
  Every component you build MUST consistently use the same keyboard combinations for the same action.
- Every new component MUST have a corresponding stencil shape registered in `stencils-ui-components.ts` 
  so it can be placed and previewed in the Layout Studio (`demo/studio/layout-studio.html`). The stencil 
  should render a detailed SVG wireframe preview of the component at its default size. Follow the Tier A/B/C 
  pattern in `specs/layout-studio-stencils.prd.md`.
- Studio applications (`demo/studio/`) are standalone apps that use the component library's 
  own components (Sidebar, Toolbar) for their UI. When building new studios or modifying existing ones, 
  always dogfood the library — never use raw HTML for UI that a library component can provide.
- Every new component MUST have a corresponding entry in the `Component Studio` app so users can model their
  applications visually (to some extend) and understand the look and feel of each component.
- Every element a component gives a scrolling overflow (`overflow: auto` or
  `scroll`, on either axis) MUST carry `data-dui-region="<component>:<region>"`,
  and a component with a manifest MUST list those names in `regions` (ADR-162).
  A canvas anchor used to name a region by its INDEX in DOM order, and the index
  moves: `isScrollable()` requires an element to be overflowing when it is
  tested, so a region whose content happens to fit drops out of the list and
  every later index shifts — inside one session. Structure check `[18]` enforces
  this. If a region genuinely cannot be named, because the CONTENT creates it or
  a consuming application provides it, add it to `UNNAMEABLE` in
  `scripts/check-region-names.mjs` with the reason. Silence fails the check.

## (CRITICAL) Form-field-capable Components — DynamicFormSwitcher Convention

Every **value-bearing** component (anything a user could enter or pick a value
into — pickers, inputs, editors, choosers) MUST conform to the convention
below so DynamicFormSwitcher and any future generic form host can drive it
through auto-discovery with **zero adapter code per component**. This applies
to existing components AND every new component going forward. The convention
is what makes the library actually generic instead of a collection of
one-off widgets glued together with bespoke wiring.

### Required surface

| Surface | Required shape |
|---|---|
| **Factory** | `window.create<PascalCase>(containerId: string, options) => Handle` — e.g. `window.createCronPicker("cron-host", opts)`. **The first arg is the `id` of a host element the caller has already inserted into the DOM**, not the element itself. (Some factories also accept an `HTMLElement`; the id-string form is the canonical one and is what auto-discovery passes.) |
| **Handle method** | `getValue(): unknown` — returns the current value at its natural type. |
| **Handle method** | `setValue(value: unknown): void` — applies a value programmatically (or document the component as read-only). |
| **Handle method** | `destroy(): void` — tear down listeners and remove DOM. Must be idempotent. |
| **Options** | `value?: unknown` — initial seed. The constructor applies it on first render. |
| **Options** | `onChange?: (value: unknown) => void` — fires on every value change (user interaction OR programmatic `setValue`). |

A component that wraps a richer domain vocabulary (e.g. PeoplePicker with
`getSelected()` / `setSelected()`) SHOULD keep those domain-named methods AND
ADD convention-named aliases (`getValue` / `setValue`). Same for `value`
options that already exist under another name (`expression` for LatexEditor,
`timezone` for TimezonePicker, `data` for VisualTableEditor) — keep the
domain name AND accept `value` as an alias. Initialisation should prefer the
domain-named option when both are set.

### Type-name mapping (for DynamicFormSwitcher auto-discovery)

DynamicFormSwitcher locates the factory by transforming `field.type`:

| `field.type` | Resolves to | Notes |
|---|---|---|
| `"cron-picker"`, `"color-picker"`, `"code-editor"` | `createCronPicker`, `createColorPicker`, `createCodeEditor` | **Kebab-case is the canonical form.** PascalCase the segments and prefix `create`. |
| `"cronpicker"`, `"colorpicker"` | Window scan match — `createCronPicker`, `createColorPicker` | Single-token lowercase forms work via a window-scan fallback. Prefer kebab-case for clarity. |
| Anything else | Literate error rendered in-place | Names the missing factory and suggests `registerDynamicFormFieldProvider`. |

For non-conformant components (or to override auto-discovery in tests),
register at boot:

```typescript
registerDynamicFormFieldProvider("my-special-input", (host, fieldDef) => ({
    getValue: () => /* … */,
    setValue: (v) => /* … */,
    destroy: () => /* … */,
}));
```

### Out-of-scope by design

The convention does NOT apply to:

| Excluded class | Examples | Why |
|---|---|---|
| Layout containers | SplitLayout, AnchorLayout, StackLayout, CardLayout, BorderLayout, DockLayout | Organise children, don't carry a value of their own. |
| Dialog / overlay surfaces | FormDialog, ConfirmDialog, ErrorDialog | Workflow surfaces, not field controls. (FormDialog is the consumer.) |
| Navigation / chrome | Sidebar, Toolbar, NavRail, StatusBar, Breadcrumb, AppLauncher, UserMenu | App chrome, not field controls. |
| Selection panels with `onSelect` callback | ExplorerPicker | Read-only navigation surfaces; if a field-shaped variant is needed, register a provider that wraps the panel. |
| Multi-shape AI inputs | SmartTextInput | Has multiple content formats (plain / serialized / cursor-context); the right "value" is consumer-dependent. Use the registry to pick the shape per use case. |
| Diagram / chart surfaces | DiagramEngine, ChartPanel, GraphCanvas | Visual surfaces; values, if any, are too rich for a `unknown` round-trip. |

If you're unsure whether your component is in or out of scope, ask: **"Could
a backend round-trip this as a single JSON-serialisable value?"** If yes,
it's a field — conform to the convention. If no, it's out of scope.

### Checklist for new components

When you build a new value-bearing component, the PR is incomplete unless
every box below is ticked:

- [ ] Factory matches `create<PascalCase>(container, options) => Handle`.
- [ ] Handle exposes `getValue() => unknown`.
- [ ] Handle exposes `setValue(value) => void` (or component is documented as read-only).
- [ ] Handle exposes `destroy() => void` and `destroy()` is idempotent.
- [ ] Options accept `value` as the initial-seed key.
- [ ] Options accept `onChange?: (value: unknown) => void` and the component fires it on every value change (user + programmatic).
- [ ] At least one test asserts the component round-trips through `createDynamicFormSwitcher` (auto-discovery happy path).
- [ ] The README and the agentknowledge `concepts.yaml` entry note compliance with this convention.

### Spec / ADR

The convention is recorded in `agentknowledge/decisions.yaml` as **ADR-134**.
The audit log of the existing 33-component fleet (26 conforming, 7 retrofitted, 2
excluded) is in the ADR's context block. Any future field-capable component
must be added to the conformance list (or the exclusion list with rationale)
in the ADR comments via a follow-up entry.

## (CRITICAL) Canvas-Capable Components — Surface Contract

Every component the Dynamic UI canvas can mount MUST carry a **capability
manifest** and satisfy the **Surface contract** at its declared level. This is
enforced by a test, not by this document: `runtime/fleet-conformance.test.ts`
enumerates every directory in `components/` and fails the build when one has
neither a manifest nor an explicit exemption. `npm test` runs it.

See ADR-141 (the contract), ADR-142 (manifests), ADR-143 (allowlist-only
resolution), ADR-144 (factory argument order), and `specs/dynamicui.prd.md`.

### The three levels

| Level | Handle must expose | Applies to |
|---|---|---|
| `display` | `destroy()` | Renderers and chrome with no value and no events |
| `field` | `display` + `getValue` / `setValue` / `onChange` (ADR-134) | Value-bearing controls |
| `surface` | `display` + `setData` / `on` / `getState` / `setState` | Anything the canvas wires to another component |

The level is **verified by the conformance suite, never self-declared**. A
manifest claiming `surface` while failing the suite fails the build.

**And the minimum level is computed (ADR-219).** emits, accepts or a protocol provider require surface; a handle with getValue/setValue requires field. Declaring less fails the gate. BELOW_REQUIRED in scripts/agentui/migration.mjs holds the measured backlog and may only shrink — never add a new component to it.

### The manifest

Every component folder carries `<name>.manifest.ts` exporting one
`CapabilityManifest`. It is colocated deliberately — a central registry would
become the merge-conflict hotspot for every parallel contributor (ADR-142).
The build aggregates them into `dist/capability-manifest.json`.

**`defaultOptions` is shipped data.** It is published to consumers and is what
the canvas passes when a host supplies nothing. Never put test fixtures there —
a mount fixture belongs in `<name>.conformance.ts` under `options`. A guard
test rejects fixture vocabulary in `defaultOptions`.

### Factory signature (CORRECTED)

ADR-134 declares `create<PascalCase>(containerId, options)` canonical and
**new components MUST use it**. However, an audit found the existing fleet does
not: only 35 of 118 use that form, 27 take `(options, containerId)`, and 45
take a single `(options)` with the host element inside it (ADR-144).

Do **not** "fix" an existing component's signature — that breaks consumers and
violates the additive guarantee. Instead declare the truth in its manifest:

```typescript
factoryStyle: "container-first" | "options-first" | "options-only",
containerOption: "container",   // options-only: the key holding the ELEMENT
```

### Factory return type (PAT-1)

A factory returns a **handle interface**, never the class.

```typescript
export interface ToolbarHandle
{
    show(container?: HTMLElement): void;
    destroy(): void;
    // … every member the factory's caller may use
}

export class Toolbar implements ToolbarHandle
{
    // …
}

export function createToolbar(
    options: ToolbarOptions, container?: string | HTMLElement): ToolbarHandle
```

Three lines, and the middle one is the one that matters. **`implements` is
what makes the handle a contract rather than a copy.** Without it the two
drift and nothing says so: on 2026-10-22, 14 components had both a handle
and a class and only 8 declared the relationship, so six pairs agreed by
luck. With it, a method deleted from the class fails the typecheck, and a
method ADDED to the class is invisible to factory callers until somebody
puts it in the handle. That is the API decision happening per method, at
the moment of writing, which is the only time anybody knows the answer.

**The handle is allowed to be narrower than the class, and that is the
point.** `ActionItems` publishes `exportItems` and `importMarkdownText`
and `ActionItemsHandle` declares neither; `NavRail` keeps `getPosition`
and `getEffectiveWidth` off `NavRailHandle`. `implements` permits this —
it requires the class to have AT LEAST the handle's members, not at most.

**Naming:** `<ClassName>Handle`, with a trailing `Impl` dropped, so
`DiagramEngineImpl` is `DiagramEngineHandle`.

**Keep the class exported.** Importing it still works and the READMEs
document it. What a handle changes is what the FACTORY hands back, which
is what a CDN consumer gets, and that consumer has no other way in since
the classes came off `window`.

**Never narrow a handle because a scan found no callers.** A public
member that nothing references is a member nobody has needed yet, and
that includes callers who do not exist yet and callers this repository
cannot see. An in-repo reference count says nothing about whether a
published member is API. Narrowing a handle is a design judgement a
person makes — `ActionItemsHandle` leaves `exportItems` off because
somebody decided it is not API, not because an instrument reported
zero. This applies hardest where it is most tempting: DiagramEngine is
the largest component here, is deliberately a superset of engines such
as maxGraph, and has no consumers at all today. None of that is an
argument for shrinking `DiagramEngineHandle`.

Two counts in `scripts/audit-counts.mjs` hold this, both at zero and
both held by structure check `[20]`. `factoriesReturningClass` catches a
factory annotated with the class; `handlesWithoutImplements` catches a
handle whose class never declares the clause. **Neither is caught by the
typecheck** — returning `Toolbar` where `ToolbarHandle` is expected is
perfectly legal, and a class that happens to match its handle compiles
without the clause. Both were mutation-proven when they were written.

`scripts/gen-handles.mjs` generates a handle from a class when you need
a starting point. It is a tool, not a build step, because after the
first write the handle is a decision and the class is not its source of
truth: regenerating `ActionItemsHandle` would put `exportItems` back.

### Additive guarantee (CRITICAL)

Adding the Surface contract to an existing component MUST NOT change any
existing public behaviour. Constructor callbacks (`onSelect`, `onChange`, …)
remain public API forever and must keep firing **first**. The pattern:

```typescript
private emitChannel(channel: string, legacy: () => void, payload: unknown): void
{
    legacy();                                    // subscriber zero, unguarded

    for (const handler of this.channelHandlers.get(channel) ?? [])
    {
        try { handler(payload); }
        catch (err) { logError(`Channel "${channel}" handler threw`, err); }
    }
}
```

Declare the pairing with `legacyOption` on the channel spec so the conformance
suite can assert the old callback still fires. That assertion is what makes the
guarantee verifiable rather than merely stated.

### Checklist for a new component

The PR is incomplete unless every box is ticked:

- [ ] `<name>.manifest.ts` exporting one `CapabilityManifest`.
- [ ] Correct `factoryStyle` (and `containerOption` if options-only).
- [ ] `defaultOptions` contains production defaults only — no fixtures.
- [ ] Conformance suite passes; the component is NOT in the `EXEMPT` list.
- [ ] `destroy()` removes all DOM and is idempotent.
- [ ] For `surface`: every declared channel reaches `on()`, every declared slot
      is fillable, `getState()` returns only declared `stateKeys` and is
      JSON-serialisable, and `setState(getState())` round-trips.
- [ ] `<name>.conformance.ts` if the component needs mount fixtures or a
      `trigger` to drive its channels.
- [ ] Everything already required elsewhere in this file: Layout Studio
      stencil, Component Studio entry, README, dark mode, keyboard, demo page.

**If your component scrolls its own content**, know that the canvas records a
mark's position as a fraction of a scrolling region plus `within` — the index
of that region among the scrollable elements inside the frame body, in DOM
order (ADR-145). Adding or removing an internally-scrolling region in a later
version shifts previously recorded indices, so marks placed on the old version
land in the wrong region. Treat your scrolling structure as part of your public
shape, or say in the README that annotations on it are not durable across
versions. Tracked as DEBT-DUI-5.

A component that is genuinely not canvas-mountable — a service, an element
builder, a boot script, a modal overlay, or a surface that renders before a
model response can exist — goes in `NOT_MOUNTABLE` in the gate **with a
written rationale**, not in `EXEMPT`. `EXEMPT` means "migration pending" and is
expected to reach zero.

That last category is about **sequence** rather than shape, and it is easy to
miss. A canvas is composed in reaction to a model response, so a canvas citizen
is something a model can ask for. AuthCard renders Keycloak's login step, which
runs before any session exists. There is therefore no response to react to,
and no moment at which a canvas could mount it (ADR-163). Its factory signature was
fine and it sat in `EXEMPT` for two months reading as pending work, because the
exclusion criteria had no words for "correctly absent". **Ask what has to be
true for a mount to happen at all, not only whether the factory would
cooperate.**

Check the exclusion criteria **before** writing a blocker. `EXEMPT` is the
default, and `NOT_MOUNTABLE` costs you a rationale, so miscategorisations
collect in `EXEMPT` and read as a backlog. Five of the original sixteen
exemptions were in the wrong list (ADR-160): a factory that calls `show()`
with no argument is viewport-docked chrome, and a factory that takes the
element it decorates as its first argument is a decoration.

When an exemption is real, **write the blocker as what you TRIED and what
HAPPENED**, never as what looks hard. Ten of the original sixteen were worded
as predictions — "Required option shape not yet determined", "non-standard
factory signature" — and eleven of the sixteen fell on a re-read, because the
runtime had since grown `factoryStyle`, `containerOption`, `containerAs`, `mountMethod` and the
`invoke` glue hook — the blockers named mechanisms that now exist. A testable
sentence stays true or becomes visibly false; a prediction just ages.

**A TESTABLE BLOCKER IS STILL ONLY A CLAIM.** This passage used to hold up
"Throws without `options.graphCanvas`, and jsdom has no 2D context" as the
model of a good blocker. It was testable, it read as measured, and **both
halves were false**: GraphMinimap renders SVG and contains no `getContext`
call, and `graphCanvas` is a six-method structural interface a plain object
satisfies (ADR-206). The last three fell the same way (ADR-214) — a required
handle no option asks for, a phase that had already completed doing something
else, and a "design question" whose two options were not both expressible in
the `DataShape` vocabulary. **The exemption list reached zero on 2026-10-20,
and it got there by opening files rather than by re-reading sentences.**
Re-measuring a deferral means re-reading the CODE it describes.

The empty `EXEMPT` set stays in the file. It is where a new exemption would
have to be written down, and the comment above it is the rule.

## (CRITICAL) Agent-Protocol-Capable Components

Every canvas-mountable component must be usable by AI agents over **A2UI**
and **MCP Apps** (epic #16, ADR-219, `specs/agentui-schema.prd.md`). That is
enforced by the build, not by this document: `npm run build` runs
`scripts/agentui/generate.mjs`, and `npm test` runs the conformance gate,
check `[20]`'s counts and check `[29]`.

**Every option of your factory is classified, or the build fails.** The
generator reads your `<Name>Options` type with the TypeScript checker, and each
member must be exactly one of:

| Class | How it is recognised | You do |
|---|---|---|
| data | JSON-serialisable (a `Date` counts; it is sent as an ISO string) | write a JSDoc comment **on its own line above the member** — it is what the agent reads, and typia ignores a comment on the member's line |
| event | named by an `emits[].legacyOption`, or the ADR-134 `onChange` beside `value` (one `onChange` may be both: a single callback in two roles) | nothing more |
| provider | asks the host for data | declare it in `protocol.providers` as `{ request }`; exactly one parameter |
| host-only | needs something JSON cannot carry | declare it in `protocol.hostOnly` with a reason of at least 20 characters |

A data member that has a function, element or open record **nested inside it**
(`columns[].renderer`) must declare that path in `protocol.hostOnly`. Every schema
tool tried drops such parts silently, so an undeclared one fails the build.
`unknown` and open records need `protocol.schemas`.

**Catalog names are derived by one rule, with no override** (spec §5.4–5.5).
Each event is an `on<Channel>` action (a `legacyOption` that is `on` + the
channel name, compared case-insensitively, keeps its own casing); a manifest
action is `on<Id>`, and one whose `id` equals a channel is that channel's event.
Payloads go through ONE binding-only `eventData` prop: the component writes each
event's payload to `<path>/<channel>` and each provider request to
`<path>/<request>` before sending the action. A provider is `on<Request>` plus
`<request>Result`, the prop the agent answers at. A two-way field's `onChange`
channel carries its payload in `value`. Channel names are persisted Dynamic UI
API, so they are never renamed to fix a name.

**The conformance level is computed, not declared** (amends SURFACE_CONTRACT.md
§1). `emits`, `accepts` or a provider require `surface`; a handle with
`getValue`/`setValue`, or a two-way `value` (a `value` data prop paired with the
ADR-134 `onChange` write-back), requires `field`. A read-only `value`, such as a
displayed metric, is ordinary data. Declaring less fails the gate.
Under-declaring used to be "the smaller problem"; an agent cannot read a value
from a `display`, so it is now a defect.

**The A2UI catalog is a permanent public identifier.** Removing, renaming,
retyping or newly requiring anything in it breaks hosts that hard-coded
`https://static.outcrop.us/a2ui/catalog/v1.json`. The gate diffs every build
against `specs/agentui/published/`, and a breaking change needs `CATALOG_MAJOR`
raised in `scripts/agentui/catalog.mjs` (the old version stays published). Any
change, additive included, needs `npm run build:agentui -- --write-baseline`
and the baseline committed in the same change.

**Rendering is generated too: read [`A2UI.md`](A2UI.md).** The A2UI adapter
(#18, ADR-220) derives one `<outcrop-*>` element per catalog component from the
manifest, so a classified component renders in A2UI hosts with no wrapper code.
A prop updates in place only if the manifest declares it an `accepts` slot or a
`stateKeys` entry (or it is a two-way `value`); any other prop rebuilds the
component. Gates G1–G3 fail the build if a catalog component would not work
through the adapter. Never hand-write a wrapper; never edit `dist/a2ui/adapter/`.

**Three more declarations (ADR-222, `specs/agentui-readiness.prd.md`):**

- **`protocol.change`: when `onChange` is not the value.** The adapter writes
  `onChange`'s first argument to the path bound to `value`, so the build checks
  with the TypeScript checker that it is assignable to `value`. If it isn't,
  you get `change-mismatch`, naming the properties that would fit. Declare one
  of three forms:
  - `{ valueFrom: "hex" }`: the value is that property of the payload, e.g.
    `onChange(color: ToolColor)` with `value: string`.
  - `{ cleared: null }`: the payload is the value, or `null` when the user
    clears it. The handle's `setValue` must accept `null`. An A2UI data model
    cannot hold `null`, so **cleared is an absent path, in both directions**:
    the user clearing deletes the bound path, and the agent deleting it calls
    `setValue(null)`.
  - `"event"`: `onChange` is not a value change. `value` becomes one-way, and
    `onChange` must be named by an `emits[].legacyOption` like any event.
- **`agent: { useWhen, avoidWhen }`: what a model reads to choose the component.**
  Two sentences, each 30–240 characters, ending with a full stop, and neither
  just the label. `avoidWhen` must name another catalog component exactly as
  the catalog spells it (`For any other choice use ChoicePicker.`). Without
  them a catalog component fails with `agent-description`.
- **`protocol.hostOnlyActions: { <actionId>: reason }`: a manifest action an
  agent cannot act on.** For example, DataGrid's CSV export happens in the
  browser. It gets no `on<Id>` catalog prop and is listed host-only in the
  report. Gate G1 fails on any other catalog action until the adapter supports
  actions (#31).
- **`presentation: "overlay"`: the component floats.** A component that
  positions itself absolutely inside its container (a legend over a graph)
  declares it. The adapter then mounts it in a `position: relative` box whose
  `min-height` is `defaultSize.h`; otherwise it lands against the page and
  adds no height to the surface (#41, ADR-224).

**The testing bar for joining the catalog (readiness spec §6):**

- **Rendering:** `tests/a2ui-catalog-render.spec.ts` renders every catalog
  component from catalog sample values in a real browser, automatically. If
  yours needs specific props, add an `OVERRIDES` entry with the reason; never
  skip it.
- **Interaction:** a component with a two-way `value` or any event needs a
  gesture test in `tests/a2ui-components/`, titled `"<CatalogName>: …"`. It
  must drive the component like a user and assert the written value with
  `expectCatalogValid` or the action's `{ name, context }`. The coverage gate
  (`scripts/agentui/gesture-coverage.test.ts`) fails, by name, for an
  interactive component without one.

**`PENDING_CLASSIFICATION` and `BELOW_REQUIRED`** in `scripts/agentui/migration.mjs`
are the measured backlog of 2026-10-25. A component on `PENDING_CLASSIFICATION`
is left out of the catalog and reported in `dist/agentui-report.json` instead of
failing the build, **for the backlog kinds only**: an unclassified option, an
undeclared mixed member, an undeclared nested hazard, a too-broad type, missing
JSDoc, a `change-mismatch` (pinned as `changeMismatches`). Every other violation (a stale declaration, a short reason, a provider's
arity, a double claim) fails the build for every component, listed or not. Both
lists, and the `unclassifiedOptions` and `protocolPropsMissingJsdoc` counts, are
pinned EXACTLY by check `[20]`: each is a ceiling in `BASELINES` and a floor in
`FLOORS` of `scripts/audit-counts.mjs` at the same value
(`componentsPendingClassification`, `componentsBelowRequiredLevel`). Growing
fails. Shrinking also fails until the pin is lowered in both places in the same
change, so a freed slot can never be reused.
**Never add a new component to either**; a component written after the gate
landed conforms from its first commit.

### Checklist for a new component (in addition to the Surface checklist)

- [ ] `npm run build` prints no `[agentui]` problem for it, and it appears in
      `dist/a2ui/catalog/v1.json`.
- [ ] Every protocol-visible option has JSDoc on its own line.
- [ ] Every non-data option is an event, a provider, or host-only with a reason.
- [ ] Its declared `conformance` meets the computed required level.
- [ ] The catalog baseline is rewritten and committed.
- [ ] It works through the A2UI adapter: gates G1–G3 pass (`npm run build`,
      `npm test`), every channel has a conformance-glue trigger, and each prop
      that should update in place is an `accepts` slot or a `stateKeys` entry
      ([`A2UI.md`](A2UI.md)). Never hand-write a wrapper.
- [ ] `agent.useWhen` and `agent.avoidWhen` say when to choose it and what to
      use instead.
- [ ] If `onChange` does not pass the value, `protocol.change` says how it maps.
- [ ] It renders in `tests/a2ui-catalog-render.spec.ts`, and, if it has a
      two-way value or events, it has a gesture test in `tests/a2ui-components/`.

## (CRITICAL) No Fabricated Reads

A component that cannot initialise, or cannot reach a dependency, **must refuse
to answer a read rather than returning a plausible value**. This is not a style
preference. A null-object picker answering `getValue()` with `"portrait"` is
indistinguishable from a user who chose portrait, and a host saving a page setup
persists the fabrication over the user's real setting. The equivalent pattern
destroyed unrecoverable production data in the consuming apps repo on
2026-10-03.

Two clauses, both testable (ADR-148):

1. **A degraded component may never report success.** No log line, return
   value, or status that an intact component would also produce.
2. **A degraded component may never participate in a write.** Answering a read
   *is* participating — the caller is usually about to persist the answer.

**The deciding question for any such code:** can a caller tell *"there is
nothing"* from *"I could not find out"*? If not, the second answer will
eventually be persisted as the first.

| Situation | Do this | Not this |
|---|---|---|
| Container not found | `throw` a literate error | return a null object |
| Dependency missing | `throw`, or a sentinel the caller must handle | a stand-in satisfying the interface |
| Host callback rejected | keep prior state, surface the error | substitute a plausible value |
| A read cannot be performed | refuse, naming what is unreadable | return `undefined`, `null`, `[]` or a schema default |
| Cache load failed | an empty read is fine — but **do not write back** | overwrite storage you could not read |

Legitimate degraded modes **announce themselves and withdraw from authority**:
read-only when the write path is down, a value labelled stale, an empty state
that says it could not load, a visibly degraded DOM element. Six such builders
exist in this library and are correct. What is prohibited is a stand-in
indistinguishable from the real thing.

**Consumers need to know this too.** The behaviour is contractual, not
internal: a picker now throws and `getValues()` refuses a partial form, so
integrating code must handle it. That is documented for them in
[`docs/CDN_INTEGRATION_GUIDE.md`](./docs/CDN_INTEGRATION_GUIDE.md) §5 — keep
the two in step when you change the rule here.

Enforced by **two** structure checks, because one shape is not the rule.

`scripts/check-stand-in-reads.py` (check `[9]`) matches **names** — stand-in
factories like `createNullPicker` that announce themselves. It cannot see a
failure branch that does the same thing anonymously.

`scripts/check-fabricated-reads.mjs` (check `[16]`, ADR-157) covers the other
three shapes the ADR-148 audit had to find by hand: an inline failure branch
returning an object literal, a `catch` that returns a fabricated value, and an
aggregation-point default. It walks the **TypeScript AST**, because whether a
`return` sits *inside* a `catch` is a structural question — a regex prototype
answered it wrong 21 times out of 25 and was dropped rather than shipped.

Two gaps remain, both recorded in ADR-157: a class-property arrow
(`fallbackDefault = () => …`) escapes check `[16]`'s name-based branch, and a
`return` inside a callback arrow nested in a guard is attributed to that
guard. Treat a green check as a ratchet, not a clearance.

## (CRITICAL) No Fallback Code

**When something is broken, let it break.** Do not write a fallback. If a
dependency is missing, a global is absent, or a construction fails, throw a
literate error and let it reach the host. Do not substitute a stand-in widget,
a plain input, a default value, or a reduced rendering.

This is a standing instruction from the repository owner, restated on
2026-10-16 after it had been given many times. The reason is not taste. A
fallback converts a loud failure into a quiet wrong answer, and the quiet
wrong answer is the one that reaches production.

The evidence is FALLBACK-1. Ten SpineMap field adapters answered a missing
library picker with a bare text input. Three of them were worse than a
degraded widget: `multiselectcombo`, `tagger` and `peoplepicker` read through
`getSelected()` and `getTags()`, while the stand-in supplied `getValue()`
only. Those three silently discarded everything the user typed and returned
an empty value. The code shipped, the gate did not see it, and the only trace
was a `logWarn` nobody reads.

| Situation | Do this | Not this |
|---|---|---|
| A library global is absent | `throw`, naming the global and what to load | mount a plain input |
| A constructor throws | rethrow, attaching the original as `cause` | `catch` and substitute |
| An option is missing | `throw` a literate error | apply a silent default |
| A capability is unavailable | `throw`, or refuse the one feature loudly | render a reduced version |

**Validation that throws is wanted.** Fail-fast input checking is the rule
working, not an exception to it. See LITERATE_ERRORS.md for the message shape.

**This rule is wider than [No Fabricated Reads](#critical-no-fabricated-reads)
above.** That section governs what a broken component may ANSWER. This one
governs whether a broken component may CONTINUE. A fallback that renders
correctly and reads correctly is still prohibited, because the host cannot
tell that the real dependency never loaded.

Do not cite an existing fallback elsewhere in this library as precedent. The
survivors are tracked as FALLBACK-2 and they are debt, not a pattern.

**A refusal is only as loud as the quietest catch between it and the user.**
Before adding a throw, walk the call tree above it. FALLBACK-9 replaced an
invented string in DiagramEngine with a throw, and the behaviour did not
change at all: a catch two functions up logged it and drew a placeholder, so
the new refusal was turned back into the old fallback. Removing one fallback
under another moves which one answers. The test is what proves the
difference, because the diff looks complete either way.

**Subresource integrity is this rule at the network boundary.** A runtime
check in this repository cannot reach a third-party script that arrives
substituted. An `integrity` hash can, and it fails in the right direction.
The browser refuses the file and the global is absent, so the component
that needs it throws the refusal the rule already asks for. So a recommended
third-party build carries a hash (`scripts/third-party-sri.json`, ADR-189).
Note the trap. Without `crossorigin="anonymous"` the browser cannot read the
body to hash it, so it **skips** the check rather than failing it. That is a
control which is present, correct and inert.

**A required field that a type cannot enforce needs a runtime check.** The
tell is interpolation. `aria-label: item.tooltip` on a field declared
`tooltip: string` cannot fail against a JavaScript host, it can only write
the string `"undefined"` into the DOM. Narrowing the component to tolerate
the absence is a fallback wearing a narrowing costume.

Enforced in part by `scripts/check-fabricated-reads.mjs` (check `[16]`), which
gained the assignment shape on 2026-10-16. A gate that passes is a ratchet
rather than a clearance, because a fallback that fabricates through a field
rather than an object literal still escapes it.

## Operating Style

Use the **V-V-P-T-I-R-V-C** loop (Plan → Test → Implement → Refactor → Verify) for your core workflow. 
This is a strict **Test-Driven Development** workflow. For all software engineering tasks, you MUST follow 
this sequence. **Never write implementation code before writing a failing test.**

+ **Validate (Request):** Analyse the prompt for ambiguity. Restate the core requirement and constraints 
  to ensure alignment before acting.
  
+ **Verify (State):** Inspect the current codebase context. Read relevant files to confirm the environment 
  is clean and assumptions about the existing code are correct. Consult `agentknowledge/concepts.yaml` 
  to locate related code.
  
+ **Plan (Design):** Draft a concrete, step-by-step technical plan. This step is where architecture happens - not 
  during implementation. The plan MUST include:
  1. **Files to modify or create** - list every file.
  2. **Pattern selection** - consult `GOF_PATTERNS.md` and select any GoF patterns that apply. Justify 
     each choice against the Balance Checklist. If no pattern is needed, state 
     "No pattern required - simple function/class suffices."
  3. **Interface design** - define the public interfaces (method signatures, DTOs) BEFORE thinking about implementation.
  4. **Layering check** - confirm that business logic is in services (not controllers), 
     HTTP concerns are in controllers, cross-cutting concerns use middleware or filters.
  5. **Review the plan** against project conventions (`CODING_STYLE.md`, `SECURITY_GUIDELINES.md`, 
     `API_GUIDELINES.md`, `PERFORMANCE.md`). Ensure the approach is idiomatic and low-risk.
     
+ **Test First (Red):** Write the tests BEFORE writing any implementation code. This is the "Red" phase of TDD.
  1. Write unit tests that describe the expected behaviour of the new code. Follow `TESTING.md` conventions 
     (Arrange-Act-Assert, one assertion per test, descriptive names).
  2. For new interfaces or services, write tests against the interface contract.
  3. For bug fixes, write a test that reproduces the bug and currently fails.
  4. For refactorings, verify that existing tests pass as a baseline (per `MIGRATIONS.md` Phase 1). 
     Fill coverage gaps to >=90% BEFORE refactoring.
  5. Run the tests - they MUST fail (Red). If they pass, the tests are not testing the new behaviour.

+ **Implement (Green):** Write the minimum code needed to make the failing tests pass. This is the "Green" phase of TDD.
  1. Focus on correctness, not elegance. Get the tests to pass with the simplest implementation.
  2. Apply the GoF patterns identified in the Plan step.
  3. Follow `CODING_STYLE.md` (Allman braces, max 30-line methods, max 3 nesting levels, guard clauses).
  4. Add logging per `FRONTEND_LOGGING.md` (`LOGGING.md` for the principles behind it), comments per `COMMENTING.md`, and markers per `MARKERS.md`.
  5. Run the tests - they MUST pass (Green). If they fail, fix the implementation, NOT the tests.

+ **Refactor (Clean):** Now that tests pass, improve the code structure without changing behaviour. 
  This is the "Refactor" phase of TDD. Apply Martin Fowler refactoring techniques:
  1. **Extract Method** - break methods exceeding 30 lines into smaller, named methods.
  2. **Extract Class** - split classes exceeding 500 lines or having multiple responsibilities.
  3. **Replace Conditional with Polymorphism** - replace switch/if-else chains dispatching to type-specific 
     code with Strategy or polymorphic calls.
  4. **Replace Magic String with Symbolic Constant** - replace hardcoded strings in conditionals with enums or 
     constants.
  5. **Move Method** - move logic to the class where it belongs (e.g., business logic out of controllers).
  6. **Encapsulate Collection** - replace `Dictionary<string, object>` with strongly-typed classes.
  7. Run the tests after EACH refactoring step. If tests fail, revert the last refactoring.

+ **Verify (Full):** Execute the new tests AND all relevant regression tests. Ensure everything passes locally. 
  Run `./test.sh` for full suite validation.

+ **Commit:** Stage the verified changes and create a commit with a concise, conventional message 
  (e.g., `fix: ...`, `feat: ...`, `refactor: ...`). One logical change per commit.

## (CRITICAL) Thinking
I urge you to think along the lines of Steve Jobs, Douglas Normal, Jonathan Ivy and others. The details 
are important in making sure the software and documentation we provide our users offer an amazing, 
consistent, thoughtful and complete end to end experience.

## Development (CRITICAL)
- Read README.md, FONT_UPDATE_SUMMARY.md and ULTRA_COMPACT_THEME_CHANGES.md for all changes made so far.
- You must adhere to the language conventions provided in LANGUAGE.md.
- You must utilize the navigation markers defined in [MARKERS.md](./MARKERS.md) in all generated code. 
  See the Agent Knowledge Base section below for how to read and update `./agentknowledge/` every session. 
  In additon, use the Git Log, CONVERSATION.md files, specifications in ./specs/ and language server plugins 
  to locate code, decisions and more. Rely on grep and globbing only at the end.
- Always consult CODING_STYLE.md when writing code. This is important for maintainability.
- **(CRITICAL)** Always consult GOF_PATTERNS.md when designing new services, controllers, or significant features. 
  Select patterns during the **Plan** step, not during implementation. Consult the "Usage Guidance in This Codebase" 
  section for patterns already in use and anti-patterns to avoid. Consult GOF_REFACTOR.md for the active 
  refactoring backlog and to understand the target architecture.
- Always consult DOCUMENTATION.md when generating internal operator or external user facing documentation.
  **A doc in `docs/` is only published if it is registered in `scripts/generate-docs.js`** — see the
  publishing rule at the end of DOCUMENTATION.md. Structure check `[11]` enforces it.
- **A conformance fixture must change what is rendered.** The gate's
  `renders-content` check asserts the host is not empty, which a component
  whose shell is chrome satisfies with no data at all: seven of the thirteen
  mount fixtures could be replaced with an inert key and no test turned red
  (DEBT-DUI-6, ADR-167). `data-changes-render` now mounts a second instance
  with the fixture's options stripped and compares the two hosts. When you add
  a `<name>.conformance.ts`, give it data the component has to render in a
  freshly mounted state — not data it only shows once opened, which belongs in
  a Playwright spec instead.
- **A generated document must read code, never prose.** `scripts/generate-docs.js` derived each
  component's published API list by regexing its own README for the words `class` and `function`,
  so a sentence became an API name: of 54 names published across 32 components, one was real, and
  the quick reference listed `class on` 17 times (DEBT-DOC-1, ADR-166). The extractors now read the
  component's TypeScript — `extractGlobals` for the `window` registrations a CDN consumer calls, and
  `extractExports` for the declarations a TypeScript consumer imports. Structure check `[19]` holds
  the line, and it reads the built `d.ts` and bundle rather than reusing those extractors, because a
  check that shares an oracle with the thing it checks passes by construction.
- **A count is a claim about a file set and a pattern — state both in code.** `console.log` was
  measured three times in one workstream as 406, 200 and 176 with no change to the code, because
  neither the file set nor the pattern was ever written down. WIN-1's "311 occurrences on 203 lines"
  matches no file set in this repository and the command was not recorded, so the figure cannot be
  reproduced or corrected (AUDIT-1, ADR-168). Counts belong in `scripts/audit-counts.mjs`, which
  declares the file set once and classifies each hit: a token in a doc comment, inside a string
  literal, or in a logging shim body is not a violation. Check `[20]` ratchets each count so it can
  only fall. Give any new classifier a test — the two probes written for this work were both wrong,
  one keeping the `()` that documentation writes around a name and one using `grep -oc`, where `-c`
  silently overrides `-o` and counts lines. **Date every count you write into a tracker.** An
  undated number is an unverified claim, and nine of the ten re-measured so far were wrong in
  both directions. Check `[20]`, and the whole structure suite, runs in CI as
  well as via `./test-local.sh` (ADR-169), so a rising count fails the workflow. CI pins Node 20
  while Cloudflare builds on Node 24, so green CI still does not predict the deploy — see CI-1.
- When changing anything a consuming app can observe — a factory signature, a thrown error, a CDN path,
  a vendored dependency version — update [docs/CDN_INTEGRATION_GUIDE.md](./docs/CDN_INTEGRATION_GUIDE.md)
  and [CDN_CONTRACT.md](./CDN_CONTRACT.md) in the same change. Those two are the contract consuming
  teams read; a change that lands without them is a silent breaking change.
- Always consult MIGRATIONS.md when migrating from one stack to another such as Javascript to TypeScript, Python to .NET Core etc.
- Always consult **FRONTEND_LOGGING.md** for component logging, and LOGGING.md for the general
  principles behind it. **FRONTEND_LOGGING.md is the authority for anything in `components/`.**
  Both documents now say so in their own first section, and all 143 logging components follow it
  (LOG-2, ADR-171). Do not open an item against LOGGING.md's level mapping without checking which
  document governs — LOG-1 survived six months because it cited the superseded one (ADR-168).
- **(CRITICAL) Publishing a global means adding a declaration to `components/globals.d.ts`.**
  That file holds 268 declarations and is the single place a component's window API is typed
  (ADR-174 D1). Add yours there in the same change that publishes it, and write
  `window.createThing = createThing;` with no assertion. A `declare global` beside your own
  component is NOT the house style: the third-party globals have no publisher here, so the
  central file exists either way. The file is build-time only, so declaring a global costs a
  consumer nothing. `(window as unknown as Record<string, unknown>)` and `(window as any)` are
  both superseded. Do not add either, and do not copy one from a spec or a README that still
  shows it.
- **`windowCasts` gates EVERY assertion on the global object, and `windowAliasUses` gates the
  way round it.** WIN-1 counted the literal `(window as any)` and reached 0 while 237
  assertions in three other spellings went unwatched (ADR-173). WIN-2 then found that
  `const win = window as unknown as Record<string, unknown>;` spends one occurrence and buys
  73 untyped accesses (ADR-174, insight 6.65). `window as`, `globalThis as`, an alias
  declaration and every use of an aliased name all fail check `[20]` now. If you need an alias,
  write `const win = window;`, which types every use and emits the same JavaScript.
- **Six assertions are allowed and they are listed, not budgeted.** Each reaches `window` by a
  name known only at run time, which no declaration can express: `window[someString]` is TS7015
  and `Window` is not assignable to `Record<string, unknown>` without an assertion, which is
  TS2322. ADR-174 D3 names all six by file and line, and the baseline of 6 is the count of that
  list. If you believe you need a seventh, the key is probably from a closed set the module
  owns — mark the source `as const` and type the parameter as a union or `keyof Window`, which
  is how five other sites were typed. If it genuinely is host data, amend ADR-174 D3 and say
  why, rather than removing a listed one to stay under the number.
- **`any` is gated in two places, because `: any` and `as any` are the same claim.**
  `anyAnnotations` watches the annotation and `anyCasts` watches the value cast. They are
  deliberately separate: rewriting a cast as an annotation fails the first while the second
  holds, and the reverse also fails. Both are at their floor (13 and 2), so any new `any` in
  the tracked sources fails check `[20]`. The 15 that remain are all in
  `visualtableeditor.ts` and carried as ANY-3.
- **A cast is usually downstream of a type nobody wrote. Count them, then look upstream.**
  41 casts in Toolbar came from a union naming three of ten interfaces. 26 annotations in
  DockLayout came from one unwritten slot contract. 16 across eight layouts came from one
  missing shared interface. Fixing the declaration removes the casts as a side effect, and
  the compiled bundle usually stays byte-identical, which is the proof that only types
  moved. ADR-175, insight 6.68.
- **A contract several components share goes in `components/globals.d.ts`, not in each of
  them.** `MountableComponent` and `BootstrapStatic` live there because components in this
  library do not import one another, so a `.d.ts` in the global scope is the only place a
  shared structural type can sit. Make every member optional when each caller already guards
  with `typeof x.method === "function"`.
- Always consult COMMENTING.md so that you add appropriate comments to all generated code.
- Always consult PRAGMATIC_PROGRAMMER.md for pragmatic engineering principles and PRAGMATIC_PROGRAMMER.checklist.md for a quick review.
- Always consult CODE_COMPLETE.md for software construction best practices and CODE_COMPLETE.checklist.md for a quick review.
- Always consult SECURITY_GUIDELINES.md so that you are aware of how to mitigate security concerns and do not introduce inadvertent security issues.
- **(CRITICAL)** Always consult DARKMODE.md when building or modifying any component. All components MUST be 
  dark-mode compatible using `var(--theme-*)` CSS tokens. This is mandatory for accessibility and theme consistency.
- Always consult FRONTEND.md when frontend code changes are involved.
- Always consult UX_UI_GUIDELINES.md when thinking about any new capability or feature. 
- Always consult UI_UX_CONSISTENCY.md when thinking about and implementing UIs. 
- Always consult API_GUIDELINES.md when implementing new APIs.
- Always consult PERFORMANCE.md when implementing backends, frontends or APIs. It is important to keep performance in mind upfront.
- **(CRITICAL)** Always consult TESTING.md when writing tests. Tests are written BEFORE implementation code (TDD "Red" phase). Having maintainable and comprehensive tests is the foundation of code quality. Without tests, refactoring is unsafe.
- Always consult MIGRATIONS.md when refactoring or restructuring existing code, not just when migrating between stacks. 
  The Golden Loop (baseline -> refactor -> verify) applies to all refactorings. Establish a test baseline 
  before changing any code.
- When selecting libraries for frontend functionality, always consult FRONTEND_LIBRARY_SELECTION.md for guidelines 
  and FRONTEND_SELECTION.md for pre-canned recommendations.
- Before building new UI components, always consult the MASTER_COMPONENT_LIST.md to check if a resuable 
  component exists. If not, produce a specification for resuable UI components and then wait for the user 
  to confirm that the components are available for use before proceeding. This ensures that UI code uses
  standardized repeatable patterns and not AI slop.
- Always consult LITERATE_ERRORS.md for how to construct error messages to be usable and meaningful to users 
  and operators.
- Always consult LLM_TECHNIQUES.md and NON_LLM_AIML_TECHNIQUES.md to determine the best approach for infusing 
  any AI or ML feature. It's important to choose the right AI or ML technique instead of one-shotting everything 
  with LLMs. Make sure to consult AIML_SECURITY.md *every time* to make sure AI or ML features, especially 
  those involving LLMs do not lead to system compromise or data exfiltration.
- Always consult ADDITIONAL_INSTRUCTIONS.md which contain some refinements. 
- Always make sure that all generated code includes copyright information following the instructions in 
  COPYRIGHT_HEADER.md
- Generate a concise summary of changes for each set of changes and commit the Git code. Don't push yet.

## Local Development

### Clean
```bash
./clean.sh
```

### Build
```bash
./build.sh
```

### Test
```bash
./test.sh
```

### Run
```bash
./run.sh
```

## Local Endpoints

After `run.sh` starts, about 1 minute later, the app should be available at `http://localhost:8000`. 
# Agent Knowledge Base (CRITICAL)

The directory `./agentknowledge/` contains a machine-readable knowledge graph of the codebase. 
See [KNOWLEDGE_ARCHITECTURE.md](./KNOWLEDGE_ARCHITECTURE.md) for the full specification.

## Session Start - Read
At the beginning of every session, read these files to orient yourself:
1. `agentknowledge/concepts.yaml` - Business concepts mapped to anchor files. 
   Use this to locate code instead of blind searching.
2. `agentknowledge/entities.yaml` - Data models mapped to code files, database tables, and relationships.
3. `agentknowledge/decisions.yaml` - Architectural Decision Records (ADRs). 
   Consult before proposing alternative approaches; the decision may already be recorded and reasoned.

## Session End - Update
Before your final commit in a session, update these files if your work changed the codebase meaningfully:

| Trigger | Action |
|---------|--------|
| Created a new service, controller, or shared module | Add a concept entry to `concepts.yaml` with `name`, `definition`, `anchor_file`, `related`. |
| Created or modified a data model / entity | Add or update an entry in `entities.yaml` with `name`, `table`, `file`, `description`, `related`. |
| Made an architectural decision (new library, new pattern, new infrastructure choice) | Add an ADR entry to `decisions.yaml` with `id` (next `ADR-NNN`), `title`, `date`, `status`, `context`, `files`. |
| Completed any significant task | Append a single JSON line to `history.jsonl` with `date`, `task`, `files`, `summary`. |
| Made any user-visible change (feature, fix, refactor) | Add an entry to `CHANGELOG.md` under the current date with the appropriate category (Added/Changed/Fixed/Removed). Keep entries concise — one line per change. |

## Rules
- **Never delete** existing entries — only add or update.
- **Never rewrite** `history.jsonl` — it is append-only.
- **(CRITICAL) Append to `history.jsonl` with a JSON serializer, never with
  `echo`, `cat` or a heredoc.** Both ways this file has been corrupted came from
  writing JSON as shell text: an append with no trailing newline put two objects
  on one line, and a `\!` — bash history-expansion escaping — leaked through a
  double-quoted string as an invalid JSON escape. Three lines were broken this
  way between 2026-02 and 2026-03 and nobody noticed for six months, because
  nothing ever parsed the file. Use `json.dumps(entry) + "\n"` (or the
  equivalent) so the framing and the escaping are not your problem.
  `test-local.sh` check [8] now parses `history.jsonl` and the three YAML files
  on every `npm test`, so a malformed append fails the build. See DEBT-KB-1.
- Keep concept names in PascalCase and stable; other files may reference them.
- If a decision is superseded, set its `status` to `Superseded` and add the replacement ADR id.

# History and Status

Always keep all provided input from me to you, the agent, in the file CONVERSATION.md. 
Write the request + your output summary into the CONVERSATION.md file as well. 
This helps keep track of all refinements and changes over time. If this file already exists, 
also attempt to read it to understand everything that has been done so far. 
Leverage the `git log` to understand past changes and refinements. 
Use agentic markers in all generated files to guide yourself. 
This combination should give you almost all context about what was achieved.

Always keep the per-component progress and plans in an component specific file inside the `./specs/` directory. 
For example, as we are working on the *Permissions Matrix* component, keep progress from CONVERSATION.md, 
your context, your history, the `git log`, bug fixes, refinements in the file `./specs/permissions_matrix.md`. 
This makes it easier to resume sessions working on the component over time or for bug fixes etc. 
This is going to be shorter context than CONVERSATION.md which is quite large.


# Demo
Whenever components, CSS, HTML or TypeScript, Javascript are modified, created or enabled, a demonstration 
site must be created within the ./demo/ folder. Every new component demo page MUST also be registered as a 
card in `demo/index.html`, which is the only page that indexes component demos — a demo page nothing links 
to is unreachable from the gallery and is not delivered. The site can be a single or multi-page HTML site. 
But it must demonstrate all styles, all components, all dialogs, all typography, all colors from the 
base Bootstrap framework with the customizations added. This allows the user to validate that the 
theme is working well or if not, adjust any instructions.
