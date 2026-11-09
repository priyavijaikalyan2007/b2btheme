<!--
SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
SPDX-FileCopyrightText: 2026 Outcrop Inc
SPDX-License-Identifier: MIT
Repository: enterprise-bootstrap-theme
File GUID: 32e2a4ae-c6fa-4926-8c75-650e5f5c7d02
Created: 2026
-->

<!-- AGENT: Rules for agents and contributors so the MCP Apps view, and every component it shows, keeps working in MCP Apps hosts. Referenced from AGENTS.md. -->
<!-- ⚓ DOC: McpUiRules -->

# MCP Apps: rules for agents and contributors

This file is referenced from the **(CRITICAL) Agent-Protocol-Capable Components** section of [`AGENTS.md`](AGENTS.md). It covers the **MCP Apps view** (#19, ADR-250 to ADR-254), which shows catalog components inside MCP Apps hosts such as Claude, ChatGPT and VS Code.

Other readers want other files:

- **Someone building an MCP server** wants [`docs/MCP_APPS_INTEGRATION_GUIDE.md`](docs/MCP_APPS_INTEGRATION_GUIDE.md).
- **A coding agent wiring a server** wants [`docs/MCP_APPS_AGENT_GUIDE.md`](docs/MCP_APPS_AGENT_GUIDE.md).
- **The catalog and the A2UI adapter** have their rules in [`A2UI.md`](A2UI.md). The view reuses both.

## What exists

- **`/mcp/renderer.html`, a thin page.** An MCP server returns its bytes as the text of a `ui://` resource. It loads the theme, the icons, the pinned runtime from `/lib/` with SRI, and `/mcp/view/v1.js`. `mcp/renderer.mjs` writes it, and `mcp/build.mjs` builds it.
- **`/mcp/renderer.meta.json`, the resource's `_meta.ui`.** It names the origins the page may load from in `csp.resourceDomains`, and has no `connectDomains`. `scripts/agentui/mcp-descriptors.mjs` generates it in the same `dist/` swap as the catalog.
- **`/mcp/view/v1.js`, the view.** It is `mcp/src/` bundled as one ESM file. It connects to the host, takes the host's theme, and renders the A2UI messages in each tool result. It then sends each component action to a server tool or to the model, as the server chose.
- **The view's parts in `mcp/src/`:**

  | File | Does |
  |---|---|
  | `view.ts` | the lifecycle: connect, theme, render each result, route each action |
  | `result.ts` | reads `structuredContent.outcrop` and rejects any other shape |
  | `router.ts` | picks an action's route and shapes the tool arguments or the user turn |
  | `theme.ts` | maps host style variables to the library's tokens, and sets the layout height |
  | `errors.ts` | the five public error codes and the `[outcrop-mcp]` log prefix |

- **No component code of its own.** A component shows in MCP Apps because it is in the A2UI catalog. The view loads the A2UI adapter from its CDN path, so the catalog, the adapter and the view cannot disagree.

## Rules

1. **A component needs no MCP code.** To make a component work in MCP Apps hosts, classify it into the catalog and follow `A2UI.md`. Never add a component-specific branch to `mcp/src/`.
2. **The server contract is public, and changes additively within `version: 1`.** These names are public:
   - the payload `structuredContent.outcrop`, with `version`, `messages` and `routes`;
   - the routes, `{ "tool": "<name>" }` and `"message"`;
   - the arguments a routed tool receives;
   - the five error codes and the log prefix.

   `CDN_CONTRACT.md` lists them. Adding an optional field is allowed. Renaming, removing or changing the meaning of one needs a new payload version and the user's decision first.
3. **The view fetches nothing.** Data arrives only in tool results. Never add `connectDomains`, and never call `fetch` from `mcp/src/`. A host would block it, and the server guides promise there is none.
4. **The view bundles only `mcp/src/`.** The runtime arrives as the pinned `/lib/` globals `McpExtApps` and `A2uiRuntime`. The adapter arrives by `import()` from its own CDN path. `mcp/build.mjs` reads esbuild's metafile and fails the build if anything else was bundled, because a bundled copy would be a second, unpinned one.
5. **New third-party code goes through `/lib/`.** Add it to `scripts/vendor-closure.mjs` with an exact pin, and load it in `renderer.html` with its manifest hash. Add its origin to `resourceDomains` only if it is not `static.outcrop.us`. Check `[29]` fails if `static.outcrop.us` is not first.
6. **URLs in `renderer.html` are absolute.** Hosts load the page by `srcdoc`, where a root-relative URL resolves against the host.
7. **Nothing renders before `ui/initialize` returns.** The view assumes no theme. If initialisation fails, it shows that it could not connect and logs the cause.
8. **Our tokens are the value, and a host variable overrides one only while the host sends it.** The map is `THEME_MAP` in `mcp/src/theme.ts`. Status colours, type sizes, weights, line heights and shadows stay unmapped in v1 by decision. Adding one is a user decision, and the guides list what is unmapped.
9. **Every failure is visible.** It shows as an error card with its code, on the surface when a routed tool caused it. It is also logged with `[outcrop-mcp]`. A new failure gets a new code in `errors.ts`, in both guides and in `CDN_CONTRACT.md`. There are no fallbacks (AGENTS.md).
10. **No analytics and no telemetry.** The view runs inside someone else's app.
11. **Conversation is a host, not the view.** Conversation (ADR-017) shows MCP Apps inside this library's own pages. It sends the standard MCP Apps style variables beside its older `--mcp-*` names (M4). Those older names stay, for existing users.

## When you change something

| You change | Also change |
|---|---|
| a public name of the server contract | both guides, `CDN_CONTRACT.md` "The MCP Apps server contract", the example servers, and the user's decision first |
| an error code or its meaning | `errors.ts`, both guides' error tables, `CDN_CONTRACT.md`, the matching test in `tests/mcp-view.spec.ts` |
| `THEME_MAP` | the guide's theme table, `theme.test.ts`, the theme tests in `tests/mcp-view.spec.ts` |
| what `renderer.html` loads | `renderer.test.ts`, and `renderer.meta.json` when a new origin is needed |
| a demo domain in `mcp/demo/domains/` | `mcp/demo/demo.test.ts` checks it. Re-record the video if the demo's look changes (`npm run demo:mcp:record`) |

## Checking and trying it

- **The local demo:** `npm run build && npm run demo:mcp`, then open <http://127.0.0.1:8125/host/>. A local host and a demo server load the view from your own `dist/`, so you see your change before it deploys (ADR-254).
- **The example servers:** `mcp/examples/typescript/` is the server the e2e suite runs. `mcp/examples/csharp/` has the same shape. It is checked by hand against the .NET MCP SDK, because CI has no .NET.
- **Agent-written payloads:** `npm run check:a2ui -- <file>` checks A2UI messages against the catalog. `demo.test.ts` passes every demo payload through it.

## Tests and gates

| What | Where | Fails when |
|---|---|---|
| Unit | `mcp/src/*.test.ts`, `mcp/renderer.test.ts` | the theme table, route resolution, result parsing, the tool arguments or user turn an action becomes, or the page's tags are wrong |
| View e2e | `tests/mcp-view.spec.ts` | the view, in a sandboxed iframe under a host on the SDK's `AppBridge`, does not render after initialise, follow a live theme switch, report its size, route an action, answer a provider request, or show each error code |
| Demo e2e | `tests/mcp-demo.spec.ts` | the local demo's four domains do not render and act |
| Bundle | `npm run build:mcp` | the view bundled code outside `mcp/src/`, or the runtime is not vendored |
| CSP | `[29]` (`scripts/agentui/check-dist.mjs`) | `renderer.meta.json` does not name `static.outcrop.us` first in `resourceDomains` |
| Types | `npm test` (`typecheck:mcp`, `typecheck:mcp-examples`, `typecheck:mcp-demo`) | the view, the examples or the demo do not compile |

`npm run test:e2e:mcp` runs both e2e files.

## Scope today

- **Served** since ADR-252, when gate #36 lifted.
- **Tested** under the SDK's `AppBridge`, in a local host page. No test runs it in Claude, ChatGPT or VS Code.
- **Shows** every component in the A2UI catalog. Components outside the catalog do not show. `A2UI.md` "Scope today" lists them.
- **Deferred:** the mappings that are unmapped in v1 (rule 8). Agent-usable manifest actions wait for the action bar (#45), as they do over A2UI.
