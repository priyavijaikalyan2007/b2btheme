<!--
SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
SPDX-FileCopyrightText: 2026 Outcrop Inc
SPDX-License-Identifier: MIT
-->

# Agent UI 3: audit exceptions, publication, and demos

> **Date:** 2026-11-05
> **Epic:** #16. Closes #19 (MCP Apps publication) and #36 (public A2UI demos).
> **Status:** directed by the user on 2026-11-05 (§2). Delivered in four PRs (§7): PR 1 (#112), PR 2 (#113) and PR 3 (#114) merged; PR 4 in review.

## 1. Goal

Serve what #19 and #30 built, and show it:

1. `audit:vendor` can grant a narrow, recorded, expiring exception for an advisory the project has judged not to apply. The first is zod's GHSA-mrhx-c7xc-m3w5.
2. The MCP Apps view and its runtime move from `gated/` into `dist/`, so real MCP hosts can use them.
3. The A2UI playground and scenarios are published at `/demo/a2ui/`.
4. A local MCP Apps demo, `npm run demo:mcp`, shows the view across many component domains.
5. Recordings of both demos come last. The A2UI recordings (war-room, incident-triage) stand; PR 4 adds the MCP Apps demo video (user, 2026-11-06).

## 2. Decisions (user, 2026-11-05)

| # | Decision |
|---|---|
| U1 | An audit policy must allow exceptions, granted with great care. This overrides #36's "passes with no exception added". |
| U2 | GHSA-mrhx-c7xc-m3w5 gets an exception: its only source, CVE-2023-54404, was rejected by its CNA (VulnCheck, 2026-10-28) as "expected validator behavior rather than a defect in Zod"; NVD shows it rejected. GitHub has not yet withdrawn it (advisory-database#10750 is open). |
| U3 | With the exception, lift gate #36: publish the MCP Apps view, and publish the A2UI demos. |
| U4 | The MCP demo is local and uses a wide range of components (pickers, data grids, rich charts and more) to show applicability across domains. |
| U5 | Videos at the end. |

## 3. Audit exceptions (PR 1)

`scripts/audit-exceptions.mjs` lists each exception:

```js
{ advisory: "GHSA-…", package: "zod", version: "3.25.76",
  reason: "…", evidence: ["https://…"], decided: "2026-11-05", reviewBy: "2027-02-03", adr: "ADR-252" }
```

The rules are what make an exception careful:

- **Exact.** An exception names one advisory, one package and one exact version. A new advisory on the same package, or a version bump, is audited normally.
- **Recorded.** Every exception names an ADR that exists in `agentknowledge/decisions.yaml`, a reason, and at least one evidence URL.
- **Expiring.** `reviewBy` is at most 90 days after `decided`. After it, the advisory fails the audit again until someone re-decides with fresh evidence or removes the entry.
- **Never silent.** Each run prints every exception it applied, with its review date.
- **Shrink on use.** An exception that matches nothing in the served set fails the audit, with a message to remove it (for example once GitHub withdraws the advisory).
- **Chains follow their source.** `npm audit` reports dependants (`@a2ui/web_core`, `@a2ui/lit`) as chains through the vulnerable package. A chain entry passes only when every package it names is either excepted (recursively) or not served at all. That second case is the audit's existing rule: it reports only what this origin serves.

## 4. Lifting gate #36 (PR 1)

Gate #36 is removed in the same PR as the exception that justifies it, so the audit never sees a served zod without its exception:

- The `a2ui-runtime` and `mcp-ext-apps` assets lose their `gate` and build into `dist/lib/`.
- `mcp/build.mjs` writes `dist/mcp/view/v1.js` and `dist/mcp/renderer.html`, as `build:mcp` inside `npm run build`.
- The gate mechanism stays (`scripts/gated.mjs`, check `[31]`, `build:gated`, `audit:gated`) with no gates, for the next case.
- The guides, `CDN_CONTRACT.md` §2c and the README say MCP Apps is served. #19 closes.

Merging PR 1 deploys the view. The example servers then start for real.

## 5. Public A2UI demos (PR 2)

#36's remaining steps: publish #30's playground and scenarios under `/demo/a2ui/`, loading the vendored runtime and `/a2ui/adapter/v1.js` as a third-party host would, and point the README and `docs/A2UI_INTEGRATION_GUIDE.md` at them. The bring-your-own-key design (ADR for #30) already makes local and public the same page. Planned when reached.

## 6. Local MCP Apps demo (PR 3)

`npm run demo:mcp`: one local Node process serves the built `dist/` as the CDN, runs a demo MCP server over Streamable HTTP, and serves a host page. The host page uses the SDK's HTTP client and `AppBridge`, renders the view in a sandboxed `srcdoc` iframe, logs every JSON-RPC message, shows `ui/message` turns, and toggles light and dark host themes. Buttons stand in for the model. The demo server has its own tools across several domains (pickers, data grid, charts, timeline, tree and more); the guide's example server stays minimal. A Playwright spec runs it end to end. Built as ADR-254: four domains (service health, orders, scheduling, branding); the renderer bytes name the local origin so the view runs from the local `dist/`.

## 7. Delivery

| PR | Content |
|---|---|
| 1 | Audit exceptions + the zod exception + gate #36 lifted (closes #19) |
| 2 | Public A2UI demos at `/demo/a2ui/` (closes #36) |
| 3 | Local MCP Apps demo |
| 4 | Recordings of both demos |
