<!--
SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
SPDX-FileCopyrightText: 2026 Outcrop Inc
SPDX-License-Identifier: MIT
Repository: enterprise-bootstrap-theme
File GUID: 7a1c3e58-2f94-4b6d-9e07-c5d81a6b2f40
Created: 2026-11-05
-->

<!-- AGENT: Server developer guide for showing this library's components in MCP Apps hosts (Claude, ChatGPT, VS Code) through the /mcp/renderer.html view. Rule-shaped companion: MCP_APPS_AGENT_GUIDE.md. -->
<!-- ⚓ DOC: McpAppsIntegrationGuide -->

# Showing these components in MCP Apps hosts

**MCP Apps** is the Model Context Protocol extension that lets a tool's result appear as interactive UI inside the AI app that called it. Hosts include Claude, ChatGPT and VS Code. This guide shows an MCP server, in any language, how to show **this library's components** there. The server writes no HTML and no JavaScript; it returns A2UI messages from its tools.

> **Not served yet.** The view and its runtime are built and tested, but they are held back from the CDN until issue #36 clears. One of the view's runtime dependencies still requires a zod 3 release covered by an open advisory (ADR-250).
>
> Until then, `https://static.outcrop.us/mcp/renderer.html` answers 404, and the example servers stop at startup because of it. Everything below is the contract that will apply once the view is served. It is tested against the local build today.

## 1. The 60-second version

| Who | Owns | In this setup |
|---|---|---|
| **Your MCP server** | data and decisions | serves our renderer page as a `ui://` resource; its tools return A2UI messages |
| **Host** (Claude, ChatGPT, VS Code…) | the conversation | renders the page in a sandboxed iframe and relays tool calls and messages |
| **View** (`/mcp/renderer.html`, ours) | the UI | connects to the host, takes its theme, renders the messages with our components, routes actions |

```text
model ──calls──► your tool ──result: A2UI messages──► host ──► view (iframe) ──► <outcrop-tree-view> …
                     ▲                                                              │
                     └──────── routed action: a tool call, or a user turn ◄─────────┘
```

- **One page renders every component** in catalog v1, from the CDN's always-latest paths, so a fix reaches every view on deploy.
- **The view looks native.** It takes the host's light or dark theme, colours, fonts and radii; our tokens fill the gaps.
- **You choose where each action goes:** back to one of your tools, which is fast and deterministic, or to the model as a user turn.

## 2. How a host shows the view

1. Your server registers a resource, for example `ui://<your-server>/renderer`, with MIME type `text/html;profile=mcp-app`. The resource's text is the bytes of `/mcp/renderer.html`, and its `_meta.ui` is `/mcp/renderer.meta.json`.
2. A tool links to it with `_meta.ui.resourceUri`.
3. When the model calls that tool, the host reads the resource and renders the page in a sandboxed iframe.
4. The page loads the theme CSS, the pinned runtime from `/lib/` (with SRI), and `/mcp/view/v1.js`.
5. The view connects to the host (`ui/initialize`) and applies the host's theme. Only then does it render the tool result's messages: nothing renders before the host answers.
6. A component action is routed (§4). If the route is a tool, the view applies that tool's result in the same way.

## 3. Wiring a server

Every server does three things, whatever the language:

1. **Fetch the renderer once, at startup**, from `https://static.outcrop.us/mcp/renderer.html` and `/mcp/renderer.meta.json`. If either fetch fails, stop. Do not ship a copy in your package: it would go stale.
2. **Serve it as a `ui://` resource**, with MIME type `text/html;profile=mcp-app` and the meta JSON as `_meta.ui`.
3. **Link each UI tool to it** with `_meta.ui.resourceUri`, and return the result shape in §4.

The page is about 1.2 KB. When we update a pinned runtime, a new page names the new files; the old files stay served, so a server that fetched the old page keeps working until it restarts.

### TypeScript

The example is `mcp/examples/typescript/` in this repository, and CI runs it. Its unit test reads the resource and calls each tool over an in-memory transport, and the view's browser tests use it as their server.

| File | What it shows |
|---|---|
| `server.ts` | `loadRenderer()`, and `createServer(renderer)` with `registerAppResource` and `registerAppTool` from `@modelcontextprotocol/ext-apps/server` |
| `deals.ts` | the tools as plain functions over the result shape: `show_deal` and `deal_action` |
| `main.ts` | the stdio entry point |

The packages are `@modelcontextprotocol/server` 2.4.0 and `@modelcontextprotocol/ext-apps` 2.0.4. Run it with any TypeScript runner, for example `npx tsx mcp/examples/typescript/main.ts`.

### C#

The C# example, `mcp/examples/csharp/`, is the same server on `ModelContextProtocol` and `ModelContextProtocol.Extensions.Apps` 2.3.1.

| File | What it shows |
|---|---|
| `Program.cs` | load the renderer, then `AddMcpServer().WithStdioServerTransport().WithResources<RendererResource>().WithTools<DealTools>().WithMcpApps()` |
| `Renderer.cs` | `Renderer.LoadAsync`, and the resource with its `_meta.ui` |
| `Deals.cs` | `[McpAppUi(ResourceUri = …)]` on each tool; `Visibility = [McpUiToolVisibility.App]` on `deal_action` |

- The SDK marks its MCP Apps API experimental (`MCPEXP003`); the project file suppresses that diagnostic.
- CI has no .NET. This example was built with .NET 10.0.302 and smoke-tested over stdio by an MCP client on 2026-11-05: the tool metadata, the resource, and every result checked by the view's own parser.

### Other languages

Any MCP SDK that can set `_meta` on a tool and on resource contents works. Follow the three steps above and copy the shapes from `deals.ts`.

## 4. The result contract

A UI tool returns a plain-text summary in `content` and the A2UI messages in `structuredContent.outcrop`:

```jsonc
{
  "content": [{ "type": "text", "text": "Deal 7 is awaiting approval." }],
  "structuredContent": {
    "outcrop": {
      "version": 1,
      "messages": [ /* A2UI v0.9.1 server-to-client messages */ ],
      "routes": {
        "default": { "tool": "deal_action" },
        "byName": { "explain": "message" }
      }
    }
  }
}
```

- **`messages` is required.** Surfaces use the catalog ID `https://static.outcrop.us/a2ui/catalog/v1.json`. The A2UI basic catalog's components (`Text`, `Column`, `Row`, `Button` and so on) work beside ours. [`A2UI_INTEGRATION_GUIDE.md`](A2UI_INTEGRATION_GUIDE.md) §8 lists our components.
- **`routes` is optional**, but an action with no route is the error `OUTCROP_MCP_NO_ROUTE`. Routes are kept per surface:
  - a later result's `routes` replace the routes of the surfaces it touches;
  - a result without `routes` leaves them unchanged, so an incremental reply need not repeat them.
- **Always write the `content` summary.** The model reads it, and so does a host that shows no UI.
- **Within `version: 1`, all of this changes only additively** (`CDN_CONTRACT.md` §2c).

### Routes

| Route | The view does | Use it for |
|---|---|---|
| `{ "tool": "<name>" }` | calls `<name>` with `{ "outcrop": { "version": 1, "surfaceId", "action": { "version": "v0.9.1", "action" } } }`. The result must have the shape above, and its messages are applied. | submits, paging, loading data: anything with one right answer |
| `"message"` | sends the model a user turn: one line describing the action, then the action as JSON | "explain this", "what should I do?": anything that needs judgement |

- `action` is the A2UI action: `name`, `surfaceId`, `sourceComponentId`, `timestamp`, and the resolved `context`.
- Mark a tool that only the view calls with `_meta.ui.visibility: ["app"]`, so the model does not see it.
- Validate its arguments: they come from the page, not from the model.

### Provider requests

Some components ask for data on demand, such as a TreeView loading a folder's children (ADR-225). That request is an A2UI action like any other, so it is routed the same way. Answer it with `updateDataModel` at the component's `<request>Result` path. The example's `load` action does exactly this.

## 5. Theme and size

The view applies the host's theme before it renders anything, and again whenever the host's theme or layout changes.

| Host sends | Becomes |
|---|---|
| `theme` | `data-bs-theme` on `<html>`, and `color-scheme` |
| `--color-background-primary`, `-secondary`, `-tertiary`, `-inverse` | `--theme-surface-bg`, `--theme-surface-raised-bg`, `--theme-surface-sunken-bg`, `--theme-surface-inverse-bg` |
| `--color-text-primary`, `-secondary`, `-tertiary`, `-inverse` | `--theme-text-primary`, `--theme-text-secondary`, `--theme-text-muted`, `--theme-text-on` |
| `--color-border-primary` | `--theme-border-color` |
| `--font-sans`, `--font-mono` | `--bs-font-sans-serif` and `--bs-body-font-family`, `--bs-font-monospace` |
| `--border-radius-sm`, `-md`, `-lg` | `--bs-border-radius-sm`, `--bs-border-radius`, `--bs-border-radius-lg` |
| `styles.css.fonts` | a `<style>` with the host's font faces; without it, our fonts load |

- A host variable overrides one of our tokens only when the host sends it.
- **Left unmapped in v1:** status colours, type sizes, weights, line heights and shadows. These keep the library's palette and scale, so success, warning and danger look the same in every host.
- **Size.** The view reports its content height to the host. Layout components fill `--outcrop-layout-height`, which comes from the host's `containerDimensions` (`maxHeight`, else `height`). In fullscreen the surface fills the viewport. The view never asks to change display mode.

## 6. Security and privacy

- **The page fetches nothing at run time.** `renderer.meta.json` lists `resourceDomains` (`static.outcrop.us` and Google Fonts) and no `connectDomains`, so the host's CSP blocks any network call from the view.
- **It runs in the host's sandbox**, with an opaque origin. Its third-party runtime is pinned and loaded with SRI.
- **The view sends no analytics.** Errors go to the console and to the host's log, and nowhere else.
- **Data reaches the view only through your tool results.** Treat everything in `structuredContent` as visible to the user.

## 7. Troubleshooting

Every error is logged to the console with the prefix `[outcrop-mcp]` and sent to the host log (`notifications/message`), so it appears in your MCP client's logs.

| Code | Shown | Cause | Fix |
|---|---|---|---|
| `OUTCROP_MCP_BAD_RESULT` | an error card; on the surface if a routed tool returned it | `structuredContent.outcrop` missing or malformed, or an unknown `version` | return the §4 shape with `version: 1` and a `messages` array |
| `OUTCROP_MCP_NO_ROUTE` | on the surface | an action whose name is not in `byName`, with no `default` | add a route, or a `default` |
| `OUTCROP_MCP_TOOL_ERROR` | on the surface, with the tool's text | the routed tool returned `isError`, or the call failed | check the tool's name, its visibility, and its argument validation |
| `OUTCROP_MCP_MESSAGE_FAILED` | on the surface | the host refused the `ui/message` of a `"message"` route | the host may not allow messages from apps; use a tool route |
| `OUTCROP_MCP_NOT_CONNECTED` | "This view couldn't connect to its host." | `ui/initialize` failed | the host does not support MCP Apps, or does not support this view |

- **The adapter's own codes** (`OUTCROP_MOUNT_FAILED` and others) mean the same as in [`A2UI_INTEGRATION_GUIDE.md`](A2UI_INTEGRATION_GUIDE.md) §7.
- **Nothing appears and there's no error?** The host probably has no MCP Apps support: it shows your `content` text instead.

## 8. Adopting it

**Use a view when the user will act on the answer:**

- approving or editing a record;
- choosing from options;
- browsing a tree or a table.

**Keep a text answer when they will only read it.** A view costs a resource read and an iframe; a sentence costs neither.

**Rollout checklist:**

- [ ] The server fetches the renderer at startup and stops if it can't.
- [ ] Every UI tool has `_meta.ui.resourceUri` and a `content` summary.
- [ ] Tools only the view calls have `visibility: ["app"]` and validate their arguments.
- [ ] Every action name has a route, or there is a `default`.
- [ ] Tested in at least one host in light and dark themes, with the host log open.

## 9. Related reading

- [`MCP_APPS_AGENT_GUIDE.md`](MCP_APPS_AGENT_GUIDE.md): the same contract, as rules for coding agents.
- [`A2UI_INTEGRATION_GUIDE.md`](A2UI_INTEGRATION_GUIDE.md): the components, the catalog and the adapter.
- `CDN_CONTRACT.md` §2c: the public names and their change rules.
- The MCP Apps SDK documentation: <https://apps.extensions.modelcontextprotocol.io/api/>.
