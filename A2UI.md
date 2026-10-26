<!--
SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
SPDX-FileCopyrightText: 2026 Outcrop Inc
SPDX-License-Identifier: MIT
Repository: enterprise-bootstrap-theme
File GUID: 662d6146-f0a6-4867-a046-b922e977b72f
Created: 2026
-->

<!-- AGENT: Rules for agents and contributors so every component, today's and future ones, keeps working through the A2UI adapter. Referenced from AGENTS.md. -->
<!-- ⚓ DOC: A2uiRules -->

# A2UI: rules for agents and contributors

This file is referenced from the **(CRITICAL) Agent-Protocol-Capable Components** section of [`AGENTS.md`](AGENTS.md). It covers the **adapter** (#18, ADR-220) that renders catalog components inside A2UI hosts. The catalog rules themselves (classification, naming, versioning) are in AGENTS.md and `specs/agentui-schema.prd.md`. Host developers want [`docs/A2UI_INTEGRATION_GUIDE.md`](docs/A2UI_INTEGRATION_GUIDE.md) instead.

## What exists

- **`/a2ui/adapter/v1.js`**, an ESM bundle, and `v1.d.ts`. A host calls `createOutcropCatalog(webCore, { assetBaseUrl })`, and every catalog component renders as an `<outcrop-*>` custom element inside Google's A2UI renderers.
- **The bundle is generated, never hand-written.** `npm run build:agentui` derives one descriptor per catalog component (`scripts/agentui/adapter-descriptors.mjs`), compiles one validator per data prop (`adapter-validators.mjs`), and bundles `a2ui/src/` with both and with the catalog text (`adapter-bundle.mjs`). All of it lands in the same `dist/` swap as the catalog, so the adapter and the catalog cannot disagree.
- **One generic element** (`a2ui/src/element.ts`) serves every tag. It uses only the `context` the host renderer assigns and imports nothing from `@a2ui/*` (spec `specs/agentui-a2ui.prd.md` §1.3, §4).

## Rules

1. **Never hand-write a wrapper, and never edit `dist/a2ui/adapter/`.** A component gains A2UI support by being classified into the catalog (AGENTS.md). The adapter follows automatically.
2. **A prop is live only if the manifest says so.** The route rule is fixed, in this order (spec §3.2):

   | The data prop is… | Route | Call on the handle |
   |---|---|---|
   | named in `accepts` | slot | the slot's `setter` if declared, else `setData(slot, v)` |
   | named in `stateKeys` | state | `setState({ [key]: v })` |
   | `value` on a two-way component | value | `setValue(v)` |
   | anything else | create | destroy and rebuild the component |

   **To make a prop update in place, declare it as an `accepts` slot or a `stateKeys` entry.** Never add a special case to the adapter. A create-time prop that changes rebuilds the component, which loses transient UI state such as focus and scroll.
3. **Handles must honour their declared routes.** A route names a method the handle must have (`setData`, `setState`, `setValue`, or the slot's setter). A surface component with channels must implement `on()`, returning an unsubscribe function. Every handle implements `destroy()`. A missing method is reported to the agent as `OUTCROP_MOUNT_FAILED`.
4. **`mountMethod` must name a real method.** `runtime/src/mount.ts` throws when a manifest declares `show` or `getElement` and the handle lacks it.
5. **Components mount in the light DOM.** Factories find their container by id and their CSS lives in `document.head`. An element inside a shadow root reports `OUTCROP_MOUNT_FAILED`.
6. **No `@a2ui/*` import in `a2ui/src/`.** The element must run against the host's own `web_core`. A second copy's signals would silently stop updating. The closure gate fails the build if the bundle would serve anything but Ajv's runtime helpers (`ajv`, `fast-deep-equal`). Test helpers live in `a2ui/testing/`.
7. **No top-level DOM access in `a2ui/src/`.** The bundle must import in plain Node: `[29]` imports it, and server-rendering hosts do too. The `HTMLElement` base class and the logger are created on first use.
8. **No fallbacks** (AGENTS.md):
   - A bound value that is missing waits.
   - A bound value that is lost after mount is `OUTCROP_BINDING_LOST`.
   - A bound value that fails its schema is `VALIDATION_FAILED`, and the component keeps its last good state.
   - An option the agent did not send is omitted, so the component's own default applies.
   - Manifest `defaultOptions` are never applied.

## What agents (the AI kind) are told

- **Bind `value` to read the user's edit.** A literal `value` means "set it and don't read it back". `onChange` still fires.
- **Bind `eventData` to read event payloads.** The component writes each payload to `<eventData path>/<channel>` **before** sending the `on<Channel>` action, so the action's context can read it. Without `eventData` the action still fires, with no payload.
- **Expect these error codes** through the surface:

  | Code | Meaning | Component state |
  |---|---|---|
  | `VALIDATION_FAILED` | a bound value does not match the prop's schema (`path` names it) | keeps its last good state |
  | `OUTCROP_BINDING_LOST` | a bound value became `undefined` after mount | keeps its last value |
  | `OUTCROP_ASSET_LOAD_FAILED` | the component's script or CSS (or the injected base theme) failed to load | not mounted |
  | `OUTCROP_MOUNT_FAILED` | the factory is missing or threw, a declared handle method is missing, or the element is in a shadow root | not mounted |

## Gates

| Gate | Where | Fails when |
|---|---|---|
| G1 | `npm run build:agentui` | a catalog component declares manifest `actions[]` or `protocol.providers`. The adapter cannot serve them yet (#31), so their catalog action props would never fire. |
| G2 | `npm run build:agentui` and `[29]` | a data prop has no route, two tags collide, the bundle's embedded catalog differs from `dist/a2ui/catalog/v1.json`, it does not import in plain Node, or it would serve a forbidden package |
| G3 | `a2ui/fleet-adapter.test.ts` | any catalog component fails the round trip through the built bundle and a real `web_core` surface: mount, live updates without a rebuild (live taken from the **manifest**), create-time rebuilds, events, two-way edits, teardown |

G3 triggers each channel through the component's `<name>.conformance.ts` glue. **A surface component with channels needs a glue trigger for every channel**, as the runtime fleet gate already requires.

## Scope today

- **In the catalog:** the 8 components that are. The 93 components on `PENDING_CLASSIFICATION` join as #20 classifies them.
- **Containers with children** wait on their `children[]` hazards.
- **Deferred:**
  - Manifest actions and providers are #31.
  - The A2UI v1.0 codec is later.
  - `theme.primaryColor` is ignored by decision: components follow the host page's theme.
- **Verified renderers:**
  - `@a2ui/lit` and `@a2ui/react` 0.14.0, end to end (`npm run test:e2e:a2ui`).
  - Angular should work with `useUniversalComponents: true`, but is not tested.
