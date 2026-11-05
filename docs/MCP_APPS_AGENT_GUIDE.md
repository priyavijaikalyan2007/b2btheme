<!--
SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
SPDX-FileCopyrightText: 2026 Outcrop Inc
SPDX-License-Identifier: MIT
Repository: enterprise-bootstrap-theme
File GUID: 3d8b6f21-a4c7-4e59-8b1d-0f6e2a9c7d53
Created: 2026-11-05
-->

<!-- AGENT: Rules for coding agents wiring an MCP server to show this library's components in MCP Apps hosts. Exact names only; the reasons are in MCP_APPS_INTEGRATION_GUIDE.md. -->
<!-- ⚓ DOC: McpAppsAgentGuide -->

# MCP Apps: agent reference

Rules for a coding agent adding Outcrop UI to an MCP server. For the reasons behind them, read `MCP_APPS_INTEGRATION_GUIDE.md`.

**Status:** not served until issue #36 clears (ADR-250). `/mcp/renderer.html` answers 404 until then. Do not work around that: no copy, no fallback.

## Exact names

```
https://static.outcrop.us/mcp/renderer.html        — resource text (fetch at server startup)
https://static.outcrop.us/mcp/renderer.meta.json   — resource _meta.ui (fetch at server startup)
https://static.outcrop.us/a2ui/catalog/v1.json     — catalogId for every createSurface
text/html;profile=mcp-app                          — resource MIME type
ui://<server-name>/renderer                        — resource URI (any ui:// URI; one per server)
_meta.ui.resourceUri                               — on each UI tool
_meta.ui.visibility = ["app"]                      — on tools only the view calls
structuredContent.outcrop                          — the payload the view reads
version: 1                                         — outcrop payload version
v0.9.1                                             — A2UI message version
```

## Result shape (every UI tool, and every tool a route names)

```json
{
  "content": [{ "type": "text", "text": "<plain summary for the model>" }],
  "structuredContent": { "outcrop": {
    "version": 1,
    "messages": [],
    "routes": { "default": { "tool": "<tool>" }, "byName": { "<action name>": "message" } }
  } }
}
```

- `messages`: required, an array of A2UI v0.9.1 messages (`createSurface`, `updateComponents`, `updateDataModel`, `deleteSurface`).
- `routes`: optional. It replaces the routes of the surfaces this result touches. Leave it out to keep them.
- `content`: always present, always a readable summary.

## Routing decision table

| The action… | Route | Why |
|---|---|---|
| submits, saves, approves, deletes | `{ "tool": "<name>" }` | one right answer; fast; no model turn |
| pages, sorts, filters, loads children | `{ "tool": "<name>" }` | a data fetch |
| asks "why", "explain", "suggest" | `"message"` | needs the model's judgement |
| is any provider request (`on<Request>`) | `{ "tool": "<name>" }` | answer with `updateDataModel` at `<request>Result` |

`byName` wins over `default`. An action with neither is `OUTCROP_MCP_NO_ROUTE`.

## Routed tool arguments (what your tool receives)

```json
{ "outcrop": { "version": 1, "surfaceId": "<id>",
  "action": { "version": "v0.9.1",
    "action": { "name": "<name>", "surfaceId": "<id>", "sourceComponentId": "<id>",
                "timestamp": "<ISO 8601>", "context": {} } } } }
```

Validate this shape: it comes from the page. Return the result shape. Return `isError: true` with a text reason for an action you don't handle.

A `"message"` route sends this user turn:

```
The user chose "<name>" on "<sourceComponentId>" in surface "<surfaceId>".
{"version":"v0.9.1","action":{…}}
```

## Error codes

| Code | Fix |
|---|---|
| `OUTCROP_MCP_BAD_RESULT` | return `structuredContent.outcrop` with `version: 1` and a `messages` array |
| `OUTCROP_MCP_NO_ROUTE` | add `routes.byName.<name>` or `routes.default` |
| `OUTCROP_MCP_TOOL_ERROR` | the routed tool returned `isError` or failed: check its name, visibility, and argument schema |
| `OUTCROP_MCP_MESSAGE_FAILED` | the host refused `ui/message`: route that action to a tool |
| `OUTCROP_MCP_NOT_CONNECTED` | the host has no MCP Apps support; the user sees `content` text only |

Logs are prefixed `[outcrop-mcp]` and arrive as host log notifications.

## Common mistakes

- Bundling a copy of `renderer.html`. Fetch it at startup; stop if the fetch fails.
- Adding `connectDomains`, or fetching from the view. The view fetches nothing; data arrives only in tool results.
- Leaving out the `content` summary. The model and UI-less hosts read only `content`.
- Using a catalog ID other than `https://static.outcrop.us/a2ui/catalog/v1.json`.
- Making a view-only tool visible to the model. Set `visibility: ["app"]`.
- Routing a provider request to `"message"`. A provider waits for `updateDataModel`; route it to a tool.
- Repeating `routes` in every incremental result. They are kept per surface.
- Mapping more host style variables. Status colours, type sizes, weights, line heights and shadows are deliberately unmapped in v1.

## Examples

- `mcp/examples/typescript/` (`server.ts`, `deals.ts`, `main.ts`): tested in CI.
- `mcp/examples/csharp/`: `ModelContextProtocol` and `ModelContextProtocol.Extensions.Apps` 2.3.1. Not built in CI.
