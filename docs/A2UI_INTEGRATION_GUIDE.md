<!--
SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
SPDX-FileCopyrightText: 2026 Outcrop Inc
SPDX-License-Identifier: MIT
Repository: enterprise-bootstrap-theme
File GUID: a613e54c-63f4-4e2c-a558-cde9459ccc09
Created: 2026
-->

<!-- AGENT: Host developer guide for rendering this library's components inside A2UI (Google's Agent-to-User Interface) hosts with the /a2ui/adapter/v1.js bundle. -->
<!-- ⚓ DOC: A2uiIntegrationGuide -->

# Rendering these components for AI agents with A2UI

**A2UI** is Google's open protocol for agents to describe UI as JSON messages. A host app's *renderer* turns those messages into elements on screen. This guide shows how a host lets an agent use **this library's components** (sticky notes, chat docks, pickers and more), with data flowing in both directions.

## 1. The 60-second version

| Who | Owns | In this setup |
|---|---|---|
| **Agent** | decisions | sends A2UI v0.9.1 messages such as "show a StickyNote bound to `/note`" |
| **Host** (your app) | the page | installs Google's renderer, imports our adapter, removes surfaces it deletes |
| **Renderer** (Google's `@a2ui/lit` or `@a2ui/react`, plus `@a2ui/web_core`) | turning messages into elements | renders `<outcrop-*>` elements for our components |
| **Adapter** (`/a2ui/adapter/v1.js`, ours) | wrapping our components | builds the catalog, lazy-loads each component's script and CSS, binds data, sends events back |

```text
Agent ──messages──► Host's MessageProcessor ──► Renderer ──► <outcrop-sticky-note>
  ▲                                                               │  loads stickynote.js/.css
  └──────────── actions (onChange, onSubmit …) ◄──────────────────┘  calls createStickyNote()
```

- The catalog ID is `https://static.outcrop.us/a2ui/catalog/v1.json`.
- The adapter is `https://static.outcrop.us/a2ui/adapter/v1.js` (ESM), with types at `v1.d.ts`.
- `static.outcrop.us` is the host-neutral name of this library's CDN.

## 2. Requirements

- **`@a2ui/web_core` 0.14.x** in your app. That is the version the adapter is tested against. The adapter uses **your** copy and bundles none.
- **A renderer:** `@a2ui/lit` 0.14.x or `@a2ui/react` 0.14.x, both tested end to end. For `@a2ui/angular`, turn on `useUniversalComponents: true`. It is expected to work, but it is **not yet tested**.
- **The base theme on your page (required):**

  ```html
  <link rel="stylesheet" href="https://static.outcrop.us/css/custom.css">
  <html data-bs-theme="light">   <!-- or "dark" -->
  ```

  Our components are styled by this stylesheet. It is Bootstrap plus our design tokens, so **it also restyles your page's own buttons, forms and typography**. That is why adding it is your decision.

  For a demo, prototype or agent-only page you can opt in to `injectBaseTheme: true` instead (§3). The adapter then adds the stylesheet itself the first time a component appears. It **never** sets `data-bs-theme`; light or dark is yours to choose. The agent's `createSurface.theme.primaryColor` is ignored, because one colour cannot reproduce the hover, focus and contrast shades derived from our primary token.

- **CSP:** allow the asset origin in `script-src` and `style-src` (for example `https://static.outcrop.us`). `import()` of the adapter is a CORS request, and `/a2ui/*` is served with `Access-Control-Allow-Origin: *`.

## 3. Lit recipe

```ts
import { Catalog, MessageProcessor } from "@a2ui/web_core/v0_9";
import { BASIC_FUNCTIONS, basicCatalog } from "@a2ui/web_core/v0_9/basic_catalog";
import "@a2ui/lit/v0_9";                       // defines <a2ui-surface>
import { createOutcropCatalog } from "https://static.outcrop.us/a2ui/adapter/v1.js";

const catalog = createOutcropCatalog(
    { Catalog, basicCatalog, BASIC_FUNCTIONS },
    { assetBaseUrl: "https://static.outcrop.us" });   // no trailing slash; injectBaseTheme defaults to false

const processor = new MessageProcessor([catalog], (action) =>
    sendToAgent({ version: "v0.9.1", action }));      // your transport

processor.onSurfaceCreated((surface) =>
{
    surface.onError.subscribe((error) => sendToAgent({ version: "v0.9.1", error }));
    const el = document.createElement("a2ui-surface");
    el.id = `surface-${surface.id}`;
    el.surface = surface;
    document.body.append(el);
});

// Required: remove the element after deleteSurface. Nothing else tells our components to tear down.
processor.onSurfaceDeleted((id) => document.getElementById(`surface-${id}`)?.remove());

onAgentMessages((messages) => processor.processMessages(messages));
```

If your bundler cannot import a URL, mark it external, or load the adapter with `await import(url)`. Every `options` value is **page-global**: every `createOutcropCatalog` call on a page must pass the same ones.

| Option | Default | Meaning |
|---|---|---|
| `assetBaseUrl` | (required) | where the library's `dist/` tree is served; no trailing slash |
| `injectBaseTheme` | `false` | also load `<assetBaseUrl>/css/custom.css` (§2) |
| `providerTimeoutMs` | `30000` | how long a component's data request waits for the agent's answer, in milliseconds, before `OUTCROP_PROVIDER_TIMEOUT` (ADR-225) |

## 4. React recipe

```tsx
import { createRoot } from "react-dom/client";
import { A2uiSurface } from "@a2ui/react/v0_9";
// …catalog and processor exactly as in §3…

const roots = new Map();
processor.onSurfaceCreated((surface) =>
{
    surface.onError.subscribe((error) => sendToAgent({ version: "v0.9.1", error }));
    const host = document.body.appendChild(document.createElement("div"));
    host.id = `surface-${surface.id}`;
    const root = createRoot(host);
    root.render(<A2uiSurface surface={surface} />);
    roots.set(surface.id, root);
});
processor.onSurfaceDeleted((id) =>
{
    roots.get(id)?.unmount();
    document.getElementById(`surface-${id}`)?.remove();
});
```

Both recipes are what `tests/a2ui/harness-lit.ts` and `harness-react.ts` run in the library's end-to-end tests (`npm run test:e2e:a2ui`).

## 4a. Try it, and a reference agent

- **Try it locally:** `npm run demo:a2ui` opens a playground that renders A2UI messages with these components through this exact recipe. See [`A2UI_PLAYGROUND.md`](A2UI_PLAYGROUND.md).
- **Check what your agent writes:** `npm run check:a2ui -- messages.json` runs the A2UI schemas, a `web_core` dry run and a reference check, all against this catalog.
- **Wire an agent:** `agentdemo/page/agent/core.ts` is a small, provider-neutral reference.
  1. Put both catalogs and the rules from [`A2UI.md`](../A2UI.md) in the system prompt.
  2. Check each reply and apply it all or nothing.
  3. Send the findings back for at most two repairs.
  4. Send each `action` and later `error` back verbatim as the next turn.

  It runs in the browser with the user's own Claude or OpenAI key.

## 5. Advertising the catalog to the agent

- `processor.getRendererCapabilities({ versions: ["v0.9"] })` lists our catalog ID among `supportedCatalogIds`. Send it the way your transport sends A2UI client capabilities.
- The adapter also exports `catalogJson`, the exact catalog it serves, for agents that take an inline catalog.
- Each entry's descriptions are written for an agent to read.
- The catalog re-exports Google's basic components (`Row`, `Column`, `Text` …), so one surface can mix both.

## 6. A worked round trip: StickyNote

The agent sends:

```json
[
  { "version": "v0.9.1", "createSurface": { "surfaceId": "s", "catalogId": "https://static.outcrop.us/a2ui/catalog/v1.json" } },
  { "version": "v0.9.1", "updateComponents": { "surfaceId": "s", "components": [
      { "id": "root", "component": "StickyNote",
        "value": { "path": "/note" },
        "eventData": { "path": "/ev" },
        "onChange": { "event": { "name": "noteChanged", "context": { "text": { "path": "/note" } } } } } ] } },
  { "version": "v0.9.1", "updateDataModel": { "surfaceId": "s", "path": "/", "value": { "note": "Draft" } } }
]
```

1. The renderer creates `<outcrop-sticky-note>`. The adapter loads `components/stickynote/stickynote.js` and `.css`, then calls `createStickyNote` with `value: "Draft"`.
2. An `updateDataModel` to `/note` updates the note **in place** (`setValue`), with no rebuild.
3. The user types. The adapter writes `/note`, then sends:

   ```json
   { "version": "v0.9.1", "action": { "name": "noteChanged", "surfaceId": "s", "sourceComponentId": "root", "context": { "text": "…typed…" } } }
   ```

4. Sending `readOnly: true` in a later `updateComponents` rebuilds the note, because `readOnly` is a create-time prop.

**The rules agents rely on:**
- **Bind `value` to read the user's edit.** A literal `value` means "set it and don't read it back".
- **Bind `eventData` to read event payloads.** Each payload is written to `<eventData path>/<channel>` before its action is sent.
- **Props the manifest declares live** (slots, state keys, two-way `value`) update in place. **Any other prop rebuilds** the component when it changes.

## 7. Errors

The adapter reports through `surface.onError`. Forward each one to the agent as a v0.9.1 `error` message (§3). Nothing falls back silently.

| Code | Cause | What the user sees | Fix |
|---|---|---|---|
| `VALIDATION_FAILED` (with `path`) | a bound value does not match the prop's schema | the component keeps its last good state | the agent sends a value of the right type |
| `OUTCROP_BINDING_LOST` (with `path`) | a bound value became undefined after mount (not for a clearable `value`; see below) | the last value stays | restore the data, or drop the binding |
| `OUTCROP_ASSET_LOAD_FAILED` | a script or stylesheet failed to load | the component stays empty | check `assetBaseUrl` and your CSP |
| `OUTCROP_MOUNT_FAILED` | the factory is missing or threw, a handle method is missing, or the element sits in a shadow root | the component stays empty | read the message; render surfaces in the light DOM |
| `OUTCROP_PROVIDER_TIMEOUT` (with `path`) | the agent did not answer a component's data request (`on<Request>`) within `providerTimeoutMs` | the component handles it as a failed load (TreeView: the node stays collapsed) | the agent answers at the `<request>Result` path, once per request; or raise `providerTimeoutMs` |

While a bound value has not arrived yet, the component waits, empty, with `aria-busy="true"`. `web_core` itself warns `MISSING_DATA_BINDING`.

**Cleared values are absent paths.** An A2UI data model cannot hold `null`: `set(path, null)` deletes the key. So for components whose `value` description says "When the user clears it, the path is deleted", the user clearing the field deletes the bound path, and your agent deleting the path clears the component. It is not a lost binding. Binding `value` to a path that does not exist yet mounts the component empty.

## 8. Which components

- Every component in `/a2ui/catalog/v1.json` renders through the adapter: 26 today.
- `/agentui-report.json` lists the components not yet in the catalog, and why.
- More arrive as they are classified. A component in the catalog is guaranteed by the build to work through the adapter: gates G1–G3 in [`A2UI.md`](../A2UI.md).
- Containers that hold child components are not in the catalog yet.

## 9. Security notes

- **Actions are untrusted input** to your agent backend, like any form post. Validate them there.
- **The adapter loads scripts only from your `assetBaseUrl`.**
- **Agents cannot pass functions or elements**, because the catalog has none.
- **`@a2ui/web_core` 0.14.0's dependency tree carries open advisories** (`zod`, and `dompurify` through `@a2ui/markdown-it`) as of 2026-10-26. Our adapter serves none of that code, but your app does. Track them as you would any dependency.

## 10. Related reading

- [`A2UI.md`](../A2UI.md): the rules the library follows to keep this working.
- [`CDN_INTEGRATION_GUIDE.md`](CDN_INTEGRATION_GUIDE.md) §7 and [`CDN_CONTRACT.md`](../CDN_CONTRACT.md) §2c: paths, caching, versioning.
- The A2UI v0.9.1 specification: <https://github.com/a2ui-project/a2ui>.
