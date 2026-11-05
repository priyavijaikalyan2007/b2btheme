# Agent UI 2: the MCP Apps renderer view

> **Date:** 2026-11-05
> **Epic:** #16. Sub-project #19. A2UI catalog v1 (106 components) and adapter v1 are on main.
> **Status:** approved by the user on 2026-11-05. Decisions M1–M4 (§3) were made by the user in the brainstorm; delivery is in four PRs (§9).

## 1. Goal

Any MCP server, in any language, can show Outcrop components inside an MCP Apps host (Claude, ChatGPT, VS Code and others) by returning A2UI messages from a tool.

- One generic view renders every catalog v1 component. A server writes no HTML and no JavaScript.
- The view looks native in its host: it takes the host's theme, colours and fonts, and our tokens are the default.
- Component actions reach the server or the model, whichever the server chooses.

## 2. Constraints

- **Nothing changes for current users.** Web apps that link our CSS and JS see no difference. The only edit to existing code is Conversation's additive `--mcp-*` names (M4), a labelled change. Component JS does not change; if a component turns out to need something, the user decides first.
- **Library, not product.** Knobby is the first consumer, not a special case. No artefact names `knobby` (check `[29]`); origins use `static.outcrop.us` (D13).
- **Vendor rule.** Third-party code the view runs is pinned exactly, served from `/lib/` with SRI, listed in `lib-manifest.json` and covered by `audit:vendor`.
- **No fallback code.** A malformed input is an error shown and logged, never a guess.
- **Full test suites** (`npm test`, `npm run test:e2e`, `npm run test:structure`) on every PR, and PR CI green before it is reported ready.
- **No subagents.**

## 3. Decisions (user, 2026-11-05)

| # | Decision | Why |
|---|---|---|
| M1 | Build and test all of #19 now; **publication waits for #36**. The view and its runtime build to a local-only directory, not `dist/`. One reviewed change moves them into `dist/` when the gate lifts. | `@a2ui/web_core` 0.15.0 still requires zod 3, and every zod 3 release is inside GHSA-mrhx-c7xc-m3w5 (`<4.6.6`; withdrawal PR advisory-database#10750 still open). Aliasing web_core to zod 4.6.7's `zod/v3` was ruled out: the 4.6.6 fix changed only `v4/`, so it would hide the advisory from scanners without fixing it. |
| M2 | The view is a **thin HTML page** loading our code from its always-latest CDN paths, as web apps do (ADR-139). Third-party runtime code loads from pinned `/lib/` with SRI. | Simplest for every server and host; fixes reach every view on deploy. Supersedes the "versioned snapshot tree" note on #19: a snapshot of `dist/` would double a 15,621-file deploy against Cloudflare's 20,000 cap. |
| M3 | Servers get the view as **data plus docs**, in any language: `/mcp/renderer.html` and `/mcp/renderer.meta.json`, with a guide showing TypeScript and C#. No npm or NuGet package. | Knobby's MCP server is planned in .NET (`apps/specs/infra/keycloak.mcp.md`), so a TypeScript helper would not serve the first consumer. This repo has no package release pipeline. |
| M4 | **The server declares action routes per tool result**: a default plus per-name overrides; each route is a server tool or the conversation. An action with no route is an error. | Submits and paging want a fast, deterministic tool call; "explain this" wants the model. Only the server knows which is which. |

## 4. How it works

1. A server registers a resource, `ui://<server>/outcrop-renderer`, MIME type `text/html;profile=mcp-app`. Its text is the bytes of `/mcp/renderer.html`; its `_meta.ui` is `/mcp/renderer.meta.json`.
2. A tool links to it with `_meta.ui.resourceUri`.
3. When the model calls the tool, the host fetches the resource over MCP and renders the HTML in a sandboxed iframe.
4. The page loads the theme CSS, the pinned `/lib/` runtime and `/mcp/view/v1.js`, which imports `/a2ui/adapter/v1.js` and registers catalog v1 beside the A2UI basic catalog.
5. The view connects to the host (`ui/initialize`), applies the host theme (§6), then renders the tool result's A2UI messages.
6. A component action is routed (§5.2). A tool route's result is applied like the first one.

## 5. The server contract (public names)

Within `version: 1`, everything in this section changes additively only. It is recorded in `CDN_CONTRACT.md`.

### 5.1 Tool result

```jsonc
{
  "content": [{ "type": "text", "text": "A plain summary for hosts and models that see no UI" }],
  "structuredContent": {
    "outcrop": {
      "version": 1,
      "messages": [ /* A2UI v0.9 server-to-client messages */ ],
      "routes": {
        "default": { "tool": "crm_action" },
        "byName": { "explain": "message" }
      }
    }
  }
}
```

- `messages` is required; `routes` is optional, but an action with no route is `OUTCROP_MCP_NO_ROUTE`.
- Routes from a later result replace earlier ones for the surfaces that result touches.
- A text summary in `content` is required by the guides, not checked by the view: it is what the model and UI-less hosts read.

### 5.2 Routes

| Route | The view does |
|---|---|
| `{ "tool": "<name>" }` | `tools/call` `<name>` with arguments `{ "outcrop": { "version": 1, "surfaceId", "action" } }`, where `action` is the A2UI action message. The result must be a §5.1 result; its messages are applied. |
| `"message"` | `ui/message`: a user turn with a one-line description of the action and its context as JSON, so the model can act on it. |

Provider requests (a component asking for data, ADR-225) are A2UI actions, so they route the same way; the server answers with `updateDataModel` at the `<request>Result` path.

### 5.3 CDN files

| Path | What | Cache |
|---|---|---|
| `/mcp/renderer.html` | The thin page. A server returns these bytes as the resource text. | `max-age=300, stale-while-revalidate=86400` + CORS `*` |
| `/mcp/renderer.meta.json` | `_meta.ui` for the resource: `csp.resourceDomains` (`static.outcrop.us`, Google Fonts), no `connectDomains`. Exists since #17; changes additively. | same |
| `/mcp/view/v1.js` | The view script (ESM). Not called by servers. | same |
| `/lib/a2ui-runtime-<version>.js`, `/lib/mcp-ext-apps-<version>.js` | Pinned runtime (§7). | 1 year, immutable |

Until #36 clears (M1), none of these except `renderer.meta.json` is in `dist/`.

## 6. Theme, lifecycle, sizing

**Lifecycle.** Nothing renders before `ui/initialize` returns: no assumed light theme. If initialisation fails, the view shows "This view couldn't connect to its host" and logs the cause.

**Theme bridge.** Our tokens are the value; a host variable overrides one only when the host sends it. Re-applied on `onhostcontextchanged`.

| Host | Library |
|---|---|
| `theme` | `data-bs-theme` on `<html>`, and `color-scheme` |
| `--color-background-primary`, `-secondary`, `-tertiary`, `-inverse` | `--theme-surface-bg`, `--theme-surface-raised-bg`, `--theme-surface-sunken-bg`, `--theme-surface-inverse-bg` |
| `--color-text-primary`, `-secondary`, `-tertiary`, `-inverse` | `--theme-text-primary`, `--theme-text-secondary`, `--theme-text-muted`, `--theme-text-on` |
| `--color-border-primary` | `--theme-border-color` |
| `--font-sans`, `--font-mono` | `--bs-font-sans-serif` and `--bs-body-font-family`, `--bs-font-monospace` |
| `--border-radius-sm`, `-md`, `-lg` | `--bs-border-radius-sm`, `--bs-border-radius`, `--bs-border-radius-lg` |
| `styles.css.fonts` | injected as a `<style>`; without it, our fonts |

Status colours, type sizes, weights, line heights and shadows stay unmapped in v1, keeping the library's palette and scale. The guides list them.

**Sizing.** The SDK's `autoResize` reports content height. Layout components get `--outcrop-layout-height` from `containerDimensions` (`maxHeight`, else `height`); in `fullscreen` the surface fills the viewport. The view never requests a display mode in v1.

## 7. Runtime bundles

- `a2ui-runtime-<version>`: `@a2ui/web_core` (v0_9 and the basic catalog) and `@a2ui/lit` v0_9, as one ESM bundle. `@a2ui/markdown-it`'s exact `dompurify` pin is overridden to 3.4.17, the version `/lib/dompurify` already serves.
- `mcp-ext-apps-<version>`: `@modelcontextprotocol/ext-apps` `App` and style helpers, with its zod 4 peer (zod `>=4.6.6`).
- Exact pins; `lib-manifest.json` entries with SRI; `audit:vendor` covers them. While M1 holds, `audit:vendor` reports zod 3 as a served hit **in the local build**, and that report is the gate's evidence, not something to silence.

## 8. Errors, logging, privacy

| Problem | Code | Shown |
|---|---|---|
| `structuredContent.outcrop` missing, malformed, or unknown `version` | `OUTCROP_MCP_BAD_RESULT` | error card |
| action with no route | `OUTCROP_MCP_NO_ROUTE` | on the surface |
| routed tool returns `isError` or throws | `OUTCROP_MCP_TOOL_ERROR` | on the surface, with the tool's text |
| host connection fails | `OUTCROP_MCP_NOT_CONNECTED` | the view's only content |
| adapter errors | as today (`OUTCROP_MOUNT_FAILED`, …) | as today |

Every error goes to `console` with the prefix `[outcrop-mcp]` and to the host log through `app.sendLog`, so a server developer sees it in their MCP client. The view sends no analytics: it runs in someone else's app and has no `connectDomains`.

## 9. Delivery

Sequential PRs against main, not stacked.

| PR | Contents | Issue |
|---|---|---|
| M1 | Runtime bundles (§7), the local-only build directory and its gate check, lib-manifest and audit wiring. | #104 |
| M2 | The view: `mcp/` sources (`bridge`, `theme`, `router`, `size`, `view`), `renderer.html`, `renderer.meta.json` update; the e2e test host on the SDK's `AppBridge`; unit and e2e tests (§10). | #105 |
| M3 | The example TypeScript MCP server (tested in CI), the C# example, `docs/MCP_APPS_INTEGRATION_GUIDE.md` (humans), `docs/MCP_APPS_AGENT_GUIDE.md` (coding agents), `CDN_CONTRACT.md` §, ADRs, knowledge records. | #106 |
| M4 | Conversation emits the standard MCP Apps style variables beside `--mcp-*` (additive, labelled). | #107 |

## 10. Testing

- **Unit (vitest):** the theme table, route resolution (tool, message, override, none), result parsing (good, malformed, unknown version), the message an action becomes.
- **End-to-end (Playwright):** a local host page using `@modelcontextprotocol/ext-apps/app-bridge` loads `renderer.html` in a sandboxed iframe and answers tool calls from the example server's handlers. It covers: no render before initialise; light, dark and a live switch; host variables overriding tokens; a tool-routed action applying new messages; a message-routed action; a provider request; each error code; auto-resize.
- **Docs are tested:** the guide's TypeScript server is the file CI runs. The C# example has the same shape and is checked by hand against the .NET MCP SDK (no .NET in CI); the guide says so.

## 11. Docs

- **Humans** (`docs/MCP_APPS_INTEGRATION_GUIDE.md`): how MCP Apps work, wiring a server (TypeScript, C#), the result contract and routing, theming and what is unmapped, CSP, troubleshooting by error code, publication status. Adoption: when a view beats a text answer, a rollout checklist.
- **Coding agents** (`docs/MCP_APPS_AGENT_GUIDE.md`): rule-shaped, like `AGENT_QUICK_REF.md`: exact names, the result shape, a routing decision table, error codes with the fix for each, common mistakes.
- When the gate lifts: README states MCP Apps support; #16 and #19 updated.

## 12. Done when

- M1–M4 merged, CI green, both guides written, the e2e suite covering §10.
- Publication stays held by #36; moving the view into `dist/` is its own reviewed change.
