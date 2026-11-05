# MCP Apps renderer view: implementation plan

> **For agentic workers:** executed inline with superpowers:executing-plans (the user asked for no subagents). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** deliver `specs/agentui-mcpapps.prd.md` in four sequential PRs, M1 to M4 (#104 to #107).

**Architecture:** a thin `ui://` page loads our code from always-latest CDN paths and a pinned third-party runtime from `/lib/`. Until #36 clears, the runtime and the view build to a git-ignored `gated/` directory instead of `dist/`, and a structure check proves nothing gated reaches `dist/`.

**Tech stack:** esbuild (IIFE bundles, metafile closure checks), `@a2ui/web_core` and `@a2ui/lit` 0.14.0, `@modelcontextprotocol/ext-apps` 2.0.4 with `@modelcontextprotocol/core`, `client` and `server` 2.4.0, zod 4.6.7, vitest and Playwright.

## Global constraints

- Web apps that link our CSS and JS see no change. No component JS changes without the user's approval.
- Served dependencies are pinned exactly (check `[28]`).
- No fallback code: malformed input is an error that is shown and logged.
- No artefact names `knobby` (check `[29]`). Origins use `static.outcrop.us`.
- Run `npm test`, `npm run test:e2e` and `npm run test:structure` before each PR. Wait for PR CI.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. No session links.
- Never push to main.

M2 to M4 are planned in detail when they're reached, so each plan builds on what the previous PR actually produced.

---

## M1 (#104): runtime bundles behind the publication gate

### Task 1: dependencies

**Files:** `package.json`, `package-lock.json`

- [x] Exact devDependencies: `@modelcontextprotocol/ext-apps` 2.0.4; `@modelcontextprotocol/core`, `client` and `server` 2.4.0; `zod` 4.6.7.
- [x] Override `"zod-to-json-schema": { "zod": "3.25.76" }`, with `_comment_overrides_zod` explaining why. `npm ls zod` shows `zod-to-json-schema` on 3.25.76 and the A2UI runtime spike bundles a single zod.
- [ ] Run `npm test`. The A2UI suites must pass unchanged: zod 4 at the top level must not change what web_core runs.
- [ ] Commit: `build(deps): MCP Apps SDK 2.0.4 and zod 4.6.7, exact pins (#104)`.

### Task 2: the gate module and the gated build

**Files:**
- Create: `scripts/gated.mjs`, `scripts/gated.test.ts`
- Modify: `scripts/vendor-closure.mjs` (two assets, `--gated` mode), `package.json` (`build:gated`), `.gitignore` (`/gated/`)

**Interfaces (produces):**
- `GATED_DIR = "gated"`. Paths inside it mirror `dist/`, so `gated/lib/<file>` is published later as `dist/lib/<file>`.
- `GATES: Record<string, string>`: the issue to its reason.
- `GATED: ReadonlyArray<{ prefix: string; gate: string }>`: `dist`-relative path prefixes.
- `gatedLeaks(paths: string[]): Array<{ path: string; gate: string }>`: the paths that match a prefix.
- Vendor assets carry `gate: "#36"`. `node scripts/vendor-closure.mjs` skips them. `--gated` builds only them, into `gated/lib/`, with `gated/lib-manifest.json` in the same shape as `dist/lib-manifest.json`. Each entry carries `gate`.

- [ ] **Step 1: failing test** (`scripts/gated.test.ts`)

```ts
import { describe, expect, test } from "vitest";
import { GATED, GATES, gatedLeaks } from "./gated.mjs";

describe("publication gate", () =>
{
    test("every gated prefix names a gate with a reason", () =>
    {
        for (const { gate } of GATED) { expect(GATES[gate]).toMatch(/\S/); }
    });

    test("a dist path under a gated prefix is a leak; others are not", () =>
    {
        expect(gatedLeaks(["lib/a2ui-runtime-0.14.0.js", "lib/dompurify-3.4.17.js"]))
            .toEqual([{ path: "lib/a2ui-runtime-0.14.0.js", gate: "#36" }]);
    });
});
```

- [ ] **Step 2:** `npx vitest run scripts/gated.test.ts` fails because the module is missing.
- [ ] **Step 3:** write `scripts/gated.mjs`:

```js
export const GATED_DIR = "gated";

export const GATES = {
    "#36": "@a2ui/web_core 0.14.0 and 0.15.0 require zod 3, and every zod 3 release is inside "
        + "GHSA-mrhx-c7xc-m3w5 (<4.6.6). The view serves web_core, so it waits for web_core on "
        + "zod 4 or the advisory's withdrawal (advisory-database#10750).",
};

export const GATED = [
    { prefix: "lib/a2ui-runtime-", gate: "#36" },
    { prefix: "lib/mcp-ext-apps-", gate: "#36" },
];

export function gatedLeaks(paths)
{
    return paths.flatMap((path) =>
        GATED.filter(({ prefix }) => path.startsWith(prefix)).map(({ gate }) => ({ path, gate })));
}
```

- [ ] **Step 4:** the test passes.
- [ ] **Step 5:** in `vendor-closure.mjs`, add the two assets after `maxgraph`:

```js
{
    name: "a2ui-runtime",
    kind: "bundle",
    pkg: "@a2ui/web_core",
    members: ["@a2ui/lit"],
    entry: [
        'export { Catalog, MessageProcessor } from "@a2ui/web_core/v0_9";',
        'export { BASIC_FUNCTIONS, basicCatalog as coreBasicCatalog } from "@a2ui/web_core/v0_9/basic_catalog";',
        'export { A2uiSurface, basicCatalog } from "@a2ui/lit/v0_9";',
    ].join("\n"),
    global: "A2uiRuntime",
    gate: "#36",
    note: "The A2UI runtime the MCP Apps view runs (#19). Gated: it holds web_core's zod 3.",
},
{
    name: "mcp-ext-apps",
    kind: "bundle",
    pkg: "@modelcontextprotocol/ext-apps",
    members: ["@modelcontextprotocol/core", "@modelcontextprotocol/client", "zod"],
    entry: 'export { App, applyDocumentTheme, applyHostFonts, applyHostStyleVariables } '
        + 'from "@modelcontextprotocol/ext-apps";',
    global: "McpExtApps",
    gate: "#36",
    note: "The MCP Apps view's host bridge (#19). Gated with the view it serves.",
},
```

  In `main()`, read `const gated = process.argv.includes("--gated")`. Select `ASSETS.filter((a) => Boolean(a.gate) === gated)`. Write to `join(GATED_DIR, "lib")` and `join(GATED_DIR, "lib-manifest.json")` when gated, and to `OUT_DIR` and `MANIFEST` otherwise. Add `...(asset.gate ? { gate: asset.gate } : {})` to the entry. Every gated asset's `gate` must be a key of `GATES`; otherwise throw.
- [ ] **Step 6:** `package.json` gets `"build:gated": "node scripts/vendor-closure.mjs --gated"`, and `.gitignore` gets `/gated/`.
- [ ] **Step 7: verify.**
  - `npm run build:gated` prints both assets with 0 externals, and `gated/lib-manifest.json` lists `@a2ui/web_core`, `zod` 3.25.76, `@modelcontextprotocol/ext-apps` and `zod` 4.6.7, in separate assets.
  - `npm run build:vendor` produces the same `dist/lib-manifest.json` asset list as before.
- [ ] **Step 8: commit.** `feat(vendor): gated A2UI and MCP Apps runtime bundles (#104)`.

### Task 3: check [31], nothing gated reaches dist

**Files:**
- Create: `scripts/check-gated.mjs`
- Modify: `test-local.sh` (adds `[31]`)

- [ ] **Step 1:** write `scripts/check-gated.mjs`. It walks `dist/` and collects each file path relative to `dist/`, then adds each `dist/lib-manifest.json` asset URL with its leading `/` stripped. It runs `gatedLeaks` over both and exits 1 if any match, printing each leak with its gate and the gate's reason. It also exits 1 if `dist/` is absent, because a check over nothing doesn't pass (ADR-196).
- [ ] **Step 2: verify the check fails.** Copy a gated file into `dist/lib/`, see `[31]` fail, then remove the copy.
- [ ] **Step 3:** add `[31] Nothing held by a publication gate is in dist (specs/agentui-mcpapps.prd.md M1)` to `test-local.sh`, after `[30]`, following the pattern of `[30]`.
- [ ] **Step 4: commit.** `test(structure): [31] gated files never reach dist (#104)`.

### Task 4: audit the gated set

**Files:** modify `scripts/vendor-audit.mjs` and `package.json` (`audit:gated`).

- [ ] **Step 1:** when `--gated` is passed, `main()` reads `gated/lib-manifest.json` and skips `addAdapterPackages`. The adapter is already audited from `dist`. The "absent" error names `npm run build:gated`. The default behaviour is unchanged.
- [ ] **Step 2:** `npm run audit:gated` (`node scripts/vendor-audit.mjs --gated`) fails, naming `zod@3.25.76` in `a2ui-runtime`. That failure is the gate's evidence and stays out of CI. `npm run audit:vendor` still passes.
- [ ] **Step 3: commit.** `feat(vendor): audit:gated reports what the gate holds back (#104)`.

### Task 5: records and PR

- [ ] **ADR-250** in `agentknowledge/decisions.yaml`: M1 and the gate mechanism, with the zod `v3` finding. **ADR-251:** M2 to M4 and the server contract, recorded in M3 once the names are final.
- [ ] A history entry, a `CHANGELOG.md` line, and a `CDN_CONTRACT.md` note that `/lib/a2ui-runtime-*` and `/lib/mcp-ext-apps-*` are reserved until #36.
- [ ] Run `npm test`, `npm run test:e2e` and `npm run test:structure`; push; check that origin matches HEAD; open the PR "Closes #104"; wait for CI.

---

## M2 (#105): the view

Built on what M1 produced. The pinned runtime arrives as two IIFE globals, `McpExtApps` and `A2uiRuntime`, and gated paths mirror `dist/` under `gated/`.

### Decisions made while planning

- **Where the view lives.** Sources go in `mcp/src/`. `mcp/build.mjs` bundles `mcp/src/view.ts` with esbuild into `gated/mcp/view/v1.js` (ESM). It reads the runtime from the two globals and never bundles it. It imports the adapter at run time from `/a2ui/adapter/v1.js`, resolved against its own `import.meta.url`, and that URL's origin becomes `assetBaseUrl`. The view therefore loads from wherever it was served, with no origin written into its code.
- **The page.** `mcp/build.mjs` also writes `gated/mcp/renderer.html`. It references `https://static.outcrop.us` and carries SRI hashes for the two runtime files, taken from `gated/lib-manifest.json`. `renderer.meta.json` needs no change: the view loads from `static.outcrop.us` and Google Fonts and fetches nothing.
- **The gate.** `GATED` gains `mcp/renderer.html` and `mcp/view/`, so check `[31]` covers them.
- **No schema layer in the view.** web_core rejects a malformed A2UI message, and that rejection becomes an error shown on the surface. The view does not ship ajv.
- **The e2e host.** `tests/mcp-host/host.ts` is bundled with esbuild in the spec's `beforeAll`. It is served at the virtual origin `https://host.test`, and `https://static.outcrop.us/**` is served from the local tree (`gated/` for gated paths, `dist/` otherwise) with `Access-Control-Allow-Origin: *`, as the CDN does. Google Fonts requests are aborted. The tests therefore run against the real page bytes, unchanged, in an `<iframe sandbox="allow-scripts">` with an opaque origin, as hosts run it. The host answers tool calls with fixtures; M3 replaces them with the example server's handlers.
- **CI.** It adds `npm run build:gated` and `npm run test:e2e:mcp`. `npm run build` (Cloudflare) does not change.

### Files

| File | Responsibility |
|---|---|
| `mcp/src/errors.ts` | `McpViewCode` codes, `McpViewError`, `LOG_PREFIX = "[outcrop-mcp]"` |
| `mcp/src/result.ts` | `parseResult(result)` returns `{ messages, routes, surfaceIds }`, or throws `BAD_RESULT` or `TOOL_ERROR` |
| `mcp/src/router.ts` | `resolveRoute(routes, name)`, `toolArguments(action)` and `messageText(action)` |
| `mcp/src/theme.ts` | `THEME_MAP`, `themeDeclarations(vars)` and `applyHostContext(root, ctx)` (theme, variables, fonts, layout height) |
| `mcp/src/view.ts` | Wiring: `App`, `MessageProcessor`, surface frames, the route map per surface, and the error display |
| `mcp/build.mjs` | `rendererHtml(origin, libs)` and the bundle; `build:gated` runs it after the vendor step |
| `mcp/tsconfig.json` | `typecheck:mcp`, added to `npm test` |
| `tests/mcp-host/host.ts`, `tests/mcp-view.spec.ts` | e2e (`test:e2e:mcp`) |

### Tests

- **Unit:**
  - result: good, missing, malformed, unknown version, `isError`.
  - routes: by name, default, `"message"`, none.
  - the action as tool arguments and as message text.
  - the theme table: each row, only the variables sent, and removal on change.
  - layout height: `maxHeight`, `height`, fullscreen, none.
  - the renderer HTML: SRI, `crossorigin`, and order.
- **e2e:**
  - nothing renders before initialize;
  - light, dark, and a live switch;
  - host variables override tokens;
  - a tool-routed action applies new messages;
  - a message-routed action;
  - each error code;
  - auto-resize reported to the host.

### Steps

- [x] Gate prefixes, plus the `[31]` failing-then-passing check.
- [x] errors, result and router (test first).
- [x] theme and size (test first).
- [x] view, build and renderer, with `typecheck:mcp`.
- [x] e2e host and spec, `test:e2e:mcp`, and the CI steps.
- [x] Records: the history entry and CHANGELOG. ADR-251 waits for M3, as planned.
- [ ] Full suites; push; the PR "Closes #105"; CI.
