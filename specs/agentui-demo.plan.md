<!--
SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
SPDX-FileCopyrightText: 2026 Outcrop Inc
SPDX-License-Identifier: MIT
Repository: enterprise-bootstrap-theme
File GUID: 3a0c2f4e-6c1b-4f0e-9d55-0b7e8a2c41d9
Created: 2026
-->

<!-- AGENT: Implementation plan for Agent UI 1b (#30): checker, playground, BYOK reference agent, scenario replays, recordings. Spec: specs/agentui-demo.prd.md. -->

# A2UI Playground, Reference Agent and Demos: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A local A2UI playground, with its checker, a BYOK reference agent for Claude and OpenAI, key-free scenario replay tests and a recording pipeline. Nothing is served and no existing behaviour changes.

**Architecture:** The checker is one pure ESM module (`scripts/agentui/a2ui-check.mjs`) with three layers: precompiled Ajv schemas, a headless `web_core` dry run, and a schema-derived reference check. The CLI and the page both use it. The playground is an esbuild-bundled page under `agentdemo/` (never `demo/`). It loads our library from `dist/` like any host, renders with `@a2ui/lit`, and wraps a provider-neutral agent core that calls the providers with `fetch` directly from the browser.

**Tech Stack:** Node ≥24 ESM scripts (`.mjs`), TypeScript for the page, esbuild, Ajv 2020 standalone, `@a2ui/web_core` and `@a2ui/lit` 0.14.0 (already pinned), vitest (jsdom, with node environment where noted), Playwright (Chromium), and ffmpeg (local only, for recording).

## Global Constraints

- **Non-breaking (user, 2026-10-27).** No change to any existing component, `dist/` artifact, CDN path or published contract. Everything is additive tooling. `npm run build` must produce a `dist/` that is byte-identical to `main`'s, except for timestamps the build already varies.
- **Nothing ships.** Nothing goes under `demo/` (`scripts/copy-docs.sh` publishes it) or `dist/`. Build output goes to `agentdemo/.out/`, which is gitignored.
- **No fallbacks** (AGENTS.md): literate errors; no silent defaults; no auto-retry; no provider auto-switch.
- **Repo style:**
  - Allman braces; methods of 30 lines or fewer; lines of 120 columns or fewer.
  - SPDX headers on new files; `⚓` MARKERS blocks on modules and tests.
  - Verbose console output only as `_dbg() && console.…`; no `window as` casts (augment `Window` in a `globals.d.ts`).
  - Every git-tracked non-test `.ts` file is scanned by the `[20]` audit (`scripts/audit-counts.mjs:94`).
- **Pinned exact devDependencies only.** No new served dependency. Providers are called with `fetch`.
- **The key never leaves the browser** except in the chosen provider's request header. It is never written to logs, the DOM (other than the password field), transcripts or error text.
- **CSP** (spec §5.6) is a `<meta>` in `agentdemo/page/index.html`, verbatim:
  `default-src 'self'; script-src 'self'; connect-src 'self' https://api.anthropic.com https://api.openai.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'none'`
- **Catalog ID** `https://static.outcrop.us/a2ui/catalog/v1.json`; **protocol** `v0.9.1`.
- **Repair bound** 2 attempts per turn. **Claude default model** `claude-sonnet-5-5`. **OpenAI model** required (no default). **OpenAI endpoint** `POST https://api.openai.com/v1/chat/completions` with `response_format: { type: "json_object" }`.
- **GIF budget** 2 MB, 800 px wide, 10 fps; recording viewport 1280×800.
- **Commits** end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. No session links anywhere. Push `feat/agentui-30` after each task.

## Amendments made while planning

- **A1. Director files are `<name>.director.json`, not `.ts`.** They are data, and JSON is validated by the scenario tests and loaded by Playwright without a TypeScript import.
- **A2. `.gitignore` ignores `*.png`.** Task 11 adds `!docs/media/a2ui/*.png` so recorded posters are committed.
- **A3. The page exposes a small automation API, `window.a2uiPlayground`**, which replay and recording use: `loadScenario`, `step`, `actions`, `snapshot`. It is documented, read-mostly, and changes no behaviour.
- **A4–A9 (made during implementation):** see spec §14.2. In brief:
  - the agent uses the host's apply path, with no `checkSchema` dependency;
  - turns are queued, and `retry()` was added;
  - `Host.onError` passes `duringApply`;
  - director entries are gesture lists;
  - the scripted scenario is `pick-orientation`;
  - checker error text is built from the value's shape, with per-function validators.

## File structure

| File | Responsibility |
|---|---|
| `scripts/agentui/vendor/a2ui-v0_9_1/server_to_client.json`, `server_to_client_list.json` | vendored verbatim from `409ded2` (SOURCE.md updated) |
| `scripts/agentui/message-validator.mjs` | compile the schema layer to standalone ESM; write `agentdemo/.out/gen/message-validator.mjs` |
| `scripts/agentui/a2ui-check.mjs` | pure checker: `checkSchema`, `linkSchemaOnly`, `dryRun`, `referenceProps`, `checkReferences`, `check`, `formatFindings` |
| `scripts/agentui/check-a2ui.mjs` | CLI: read file, choose format by extension, exit code |
| `agentdemo/serve.mjs` | `127.0.0.1` static server: `dist/` at `/`, `agentdemo/.out/` at `/playground/` |
| `agentdemo/build.mjs` | build the validator and bundle the page; copy HTML, scenarios and the scenario index |
| `agentdemo/tsconfig.json` | typecheck the page (`typecheck:agentdemo`) |
| `agentdemo/page/index.html` | page shell, CSP, script tags for our library |
| `agentdemo/page/main.ts` | wiring: host, chrome, agent, automation API |
| `agentdemo/page/globals.d.ts` | `Window` augmentation (library factories, `a2uiPlayground`) |
| `agentdemo/page/host.ts` | `Host`: processor, surface frames, apply-with-checks, action/error streams |
| `agentdemo/page/log-model.ts` | message log entries and status, pure |
| `agentdemo/page/scenario.ts` | parse and serialize scenario JSONL; header rules; pure |
| `agentdemo/page/stepper.ts` | scenario cursor: step, back, reset, which lines to apply; pure |
| `agentdemo/page/ui/*.ts` | chrome: toolbar, panes, messages view, inspect tabs, chat |
| `agentdemo/page/agent/rules.ts` | the agent rules text (equal to `A2UI.md` "What agents are told") |
| `agentdemo/page/agent/prompt.ts` | `systemPrompt(catalogJson, basicCatalogJson)` |
| `agentdemo/page/agent/types.ts` | `Turn`, `Usage`, `Provider`, `CompleteRequest`, `CompleteResult` |
| `agentdemo/page/agent/core.ts` | `Session`: turns, repair loop, all-or-nothing apply, transcript |
| `agentdemo/page/agent/redact.ts` | `redactKey(text, key)` |
| `agentdemo/page/agent/providers/anthropic.ts`, `openai.ts` | `complete()` for each provider |
| `agentdemo/scenarios/*.jsonl`, `*.director.json` | saved sessions and their gestures |
| `agentdemo/record/record.config.ts`, `record.spec.ts`, `encode.mjs` | recording pipeline (never CI) |
| `tests/a2ui/playground-route.ts` | Playwright helper: build the page once, serve `/playground/*` by route |
| `tests/a2ui/replay.ts` | `replayScenario(page, scenario, director, opts)`, shared by tests and recording |
| `tests/a2ui-playground.spec.ts`, `tests/a2ui-scenarios.spec.ts` | end-to-end tests |
| `docs/A2UI_PLAYGROUND.md` | new doc (registered in `scripts/generate-docs.js`) |

---

### Task 1: Vendor the message schemas and compile the schema layer

**Files:**
- Create: `scripts/agentui/vendor/a2ui-v0_9_1/server_to_client.json`, `server_to_client_list.json` (verbatim from `a2ui-project/a2ui@409ded2` `specification/v0_9_1/json/`)
- Modify: `scripts/agentui/vendor/a2ui-v0_9_1/SOURCE.md` (list both files)
- Create: `scripts/agentui/message-validator.mjs`
- Test: `scripts/agentui/message-validator.test.ts` (`// @vitest-environment node`)
- Modify: `.gitignore` (add `agentdemo/.out/`)

**Interfaces:**
- Produces:
  - `MESSAGE_TYPES = ["createSurface", "updateComponents", "updateDataModel", "deleteSurface"]`
  - `CATALOG_ALIAS = "https://a2ui.org/specification/v0_9/catalog.json"`
  - `compileMessageValidator({ catalog, basic, commonTypes, envelope }) → string`: ESM source exporting `messageValidators = { messages: { createSurface, updateComponents, updateDataModel, deleteSurface }, components: { <Name>: fn } }`. Each value is an Ajv standalone validate function, with `.errors` after a failing call.
  - `bundleMessageValidator(source) → Promise<string>`: esbuild inlines Ajv's runtime helpers, because Ajv's standalone output `require`s them even with `esm: true`. esbuild is imported lazily.
  - `writeMessageValidator(repoRoot) → Promise<string>` (the path written: `agentdemo/.out/gen/message-validator.mjs`, self-contained ESM)
  - The tests read the baseline catalog `specs/agentui/published/catalog-v1.json`, so they need no `dist/` build.

- [ ] **Step 1: Vendor the two schemas.** Fetch them with `gh api ".../contents/specification/v0_9_1/json/<f>?ref=409ded2" -H "Accept: application/vnd.github.raw"` and save them verbatim. Append to SOURCE.md: "and `specification/v0_9_1/json/server_to_client.json` and `server_to_client_list.json` (the checker's envelope schemas, #30)."
- [ ] **Step 2: Write the failing tests.**

```ts
// @vitest-environment node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { compileMessageValidator, CATALOG_ALIAS } from "./message-validator.mjs";

const V = path.join(__dirname, "vendor", "a2ui-v0_9_1");
const read = (p: string) => JSON.parse(fs.readFileSync(p, "utf8"));
const inputs = () => ({
    catalog: read(path.join(__dirname, "..", "..", "dist", "a2ui", "catalog", "v1.json")),
    basic: read(path.join(V, "catalogs", "basic", "catalog.json")),
    commonTypes: read(path.join(V, "common_types.json")),
    envelope: read(path.join(V, "server_to_client.json")),
});

async function load(): Promise<Record<string, any>>
{
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "mv-")), "v.mjs");
    fs.writeFileSync(file, compileMessageValidator(inputs()));
    return (await import(file)).messageValidators;
}

describe("compileMessageValidator", () =>
{
    test("accepts a createSurface for our catalog and rejects one without surfaceId", async () =>
    {
        const v = await load();
        expect(v.messages.createSurface({ version: "v0.9.1", createSurface:
            { surfaceId: "s", catalogId: "https://static.outcrop.us/a2ui/catalog/v1.json" } })).toBe(true);
        expect(v.messages.createSurface({ version: "v0.9.1", createSurface: { catalogId: "x" } })).toBe(false);
    });

    test("has one component validator per catalog component, ours and basic", async () =>
    {
        const v = await load();
        expect(Object.keys(v.components)).toEqual(expect.arrayContaining(["StickyNote", "Ruler", "Row", "Text"]));
        expect(v.components.Ruler({ id: "r", component: "Ruler", length: 100 })).toBe(true);
        expect(v.components.Ruler({ id: "r", component: "Ruler", length: "long" })).toBe(false);
    });

    test("an updateComponents naming an unknown component fails the message validator", async () =>
    {
        const v = await load();
        expect(v.messages.updateComponents({ version: "v0.9.1", updateComponents:
            { surfaceId: "s", components: [{ id: "root", component: "Nope" }] } })).toBe(false);
    });

    test("the generated module has no runtime compile and imports only ajv runtime helpers", () =>
    {
        const src = compileMessageValidator(inputs());
        expect(src).not.toMatch(/new Function|eval\(/);
        const imports = [...src.matchAll(/require\("([^"]+)"\)|from "([^"]+)"/g)].map((m) => m[1] ?? m[2]);
        expect(imports.every((s) => s.startsWith("ajv/dist/runtime/") || s === "fast-deep-equal")).toBe(true);
    });

    test("routes catalog.json references to our catalog", () =>
    {
        expect(CATALOG_ALIAS).toBe("https://a2ui.org/specification/v0_9/catalog.json");
    });
});
```

- [ ] **Step 3: Run it and watch it fail.** `npx vitest run scripts/agentui/message-validator.test.ts`. Expected: FAIL (module not found).
- [ ] **Step 4: Implement `message-validator.mjs`.**

```js
// SPDX header + ⚓ COMPONENT: AgentUiMessageValidator block (PURPOSE: precompile the checker's schema layer, #30).
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const Ajv2020 = require("ajv/dist/2020").default;
const standaloneCode = require("ajv/dist/standalone").default;

export const MESSAGE_TYPES = ["createSurface", "updateComponents", "updateDataModel", "deleteSurface"];
export const CATALOG_ALIAS = "https://a2ui.org/specification/v0_9/catalog.json";
const OUT = path.join("agentdemo", ".out", "gen", "message-validator.mjs");

/** `updateComponents` -> `UpdateComponentsMessage`, the $def name in server_to_client.json. */
function defName(type) { return `${type[0].toUpperCase()}${type.slice(1)}Message`; }

/**
 * Standalone ESM for the checker's schema layer: one validator per message
 * type and one per catalog component. `catalog.json` references inside the
 * spec schemas resolve to OUR catalog, registered under CATALOG_ALIAS.
 */
export function compileMessageValidator({ catalog, basic, commonTypes, envelope })
{
    const ajv = new Ajv2020({ code: { source: true, esm: true }, strict: false, validateFormats: false });
    ajv.addSchema(commonTypes);
    ajv.addSchema(basic);
    ajv.addSchema(catalog);
    ajv.addSchema({ ...catalog, $id: CATALOG_ALIAS });
    ajv.addSchema(envelope);

    const refs = {};
    for (const t of MESSAGE_TYPES) { refs[`m_${t}`] = `${envelope.$id}#/$defs/${defName(t)}`; }
    const names = Object.keys(catalog.components);
    names.forEach((n, i) => { refs[`c${i}`] = `${catalog.$id}#/components/${n}`; });

    const messages = MESSAGE_TYPES.map((t) => `${t}: m_${t}`).join(", ");
    const components = names.map((n, i) => `${JSON.stringify(n)}: c${i}`).join(", ");
    return `${standaloneCode(ajv, refs)}\nexport const messageValidators = { messages: { ${messages} }, `
        + `components: { ${components} } };\n`;
}

/** Writes the generated module; the CLI and the page import this one file. */
export function writeMessageValidator(repoRoot)
{
    const read = (rel) => JSON.parse(fs.readFileSync(path.join(repoRoot, rel), "utf8"));
    const vendor = "scripts/agentui/vendor/a2ui-v0_9_1";
    const catalogPath = path.join(repoRoot, "dist", "a2ui", "catalog", "v1.json");

    if (!fs.existsSync(catalogPath))
    {
        throw new Error("dist/a2ui/catalog/v1.json is absent, so there is no catalog to check messages against. "
            + "Run `npm run build:agentui` first.");
    }

    const source = compileMessageValidator({ catalog: read("dist/a2ui/catalog/v1.json"),
        basic: read(`${vendor}/catalogs/basic/catalog.json`), commonTypes: read(`${vendor}/common_types.json`),
        envelope: read(`${vendor}/server_to_client.json`) });
    const out = path.join(repoRoot, OUT);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, source);
    return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1])
{
    console.log(`[message-validator] wrote ${writeMessageValidator(process.cwd())}`);
}
```

  The `server_to_client_list.json` file is vendored for completeness. The checker validates per message (`checkSchema` dispatches on the message's key), so the list schema is not compiled.
- [ ] **Step 5: Run the tests and make sure they pass.** Then add `agentdemo/.out/` to `.gitignore`.
- [ ] **Step 6: Commit and push.** `feat(agentui): vendor A2UI message schemas and precompile the checker's schema layer (#30)`

---

### Task 2: The pure checker module

**Files:**
- Create: `scripts/agentui/a2ui-check.mjs`
- Test: `scripts/agentui/a2ui-check.test.ts` (`// @vitest-environment node`)

**Interfaces:**
- Consumes: the `messageValidators` shape (Task 1); `@a2ui/web_core` `{ Catalog, MessageProcessor }`, `{ basicCatalog, BASIC_FUNCTIONS }`.
- Produces:
  - `Finding = { index: number | null, path: string, layer: "schema" | "web_core" | "references", message: string, disagreement?: string }`
  - `checkSchema(messages, validators) → Finding[]`
  - `linkSchemaOnly(catalogJson, webCore) → catalog`
  - `dryRun(messages, webCore, catalogJson) → Finding[]`
  - `referenceProps(catalogs) → Map<componentName, RefSite[]>`, where `RefSite = { path: string[], kind: "id" | "childList" }` and `"*"` marks an array element
  - `checkReferences(messages, catalogs) → Finding[]`
  - `check(messages, deps) → { ok: boolean, findings: Finding[] }`, with `deps = { validators, webCore, catalogJson, catalogs }` and `catalogs = { ours, basic, commonTypes }`
  - `formatFindings(findings) → string`

- [ ] **Step 1: Write the failing tests.** These are the cases, with full assertions in the file.

```ts
// @vitest-environment node
// Fixtures: V = "v0.9.1", ID = our catalog id, surface(id) = createSurface message.
// deps(): validators loaded from a compileMessageValidator() temp module (as in Task 1),
//         webCore = { Catalog, MessageProcessor, basicCatalog, BASIC_FUNCTIONS }, catalogJson = dist catalog,
//         catalogs = { ours: dist catalog, basic: vendored basic, commonTypes: vendored common types }.

test("a valid sticky-note sequence has no findings", ...);                  // createSurface, updateComponents(root StickyNote value {path}), updateDataModel
test("a message with two update keys is one schema finding naming the four types", ...);
test("an unknown component is a schema finding at components[0].component listing nothing else", ...);
test("a wrongly typed prop is reported once at its path, e.g. #1 updateComponents.components[0].length", ...);
test("updateComponents before createSurface is a web_core finding on that index, and later messages are still checked", ...);
test("web_core accepts an unknown function name the schema rejects: the finding is marked as a disagreement", ...);
test("a dangling Column child is a references finding naming the missing id and the surface", ...);
test("a template ChildList componentId that does not exist is a references finding", ...);
test("a surface with components but no root is a references finding", ...);
test("re-sending a component id is not a finding", ...);
test("referenceProps derives Row/Column/List children, Card/Button child, Tabs tabs[].child, Modal trigger/content", ...);
test("linkSchemaOnly exposes the same component names and schemas as createOutcropCatalog", ...); // uses jsdom? No: compares names + schema JSON of loaded.components vs the adapter's createOutcropCatalog in a jsdom subtest file (see Step 4 note)
test("formatFindings prints '#<i> <dotted.path>: <message> [<layer>]', and '(<disagreement>)' when marked", ...);
```

- [ ] **Step 2: Run them and watch them fail.**
- [ ] **Step 3: Implement.** Core logic:

```js
/** One schema finding per error path; anyOf/oneOf children are merged into one "expected …" line. */
export function checkSchema(messages, validators)
{
    return messages.flatMap((message, index) => schemaFindings(message, index, validators));
}

function schemaFindings(message, index, validators)
{
    const keys = MESSAGE_TYPES.filter((t) => message && typeof message === "object" && t in message);

    if (keys.length !== 1)
    {
        return [finding(index, "", "schema", `a message must contain exactly one of ${MESSAGE_TYPES.join(", ")}; `
            + `found ${keys.length === 0 ? "none" : keys.join(" and ")}`)];
    }

    if (keys[0] === "updateComponents") { return componentFindings(message, index, validators); }

    const validate = validators.messages[keys[0]];
    return validate(message) ? [] : ajvFindings(validate.errors, index, "");
}
```

  - `componentFindings` validates the envelope with `components: []`, then each component by its `component` name through `validators.components[name]`. An unknown name gives `unknown component "<name>"; this catalog has <n> components, listed in the catalog's anyComponent`. Paths are prefixed `updateComponents.components[<i>]`.
  - `ajvFindings` groups errors by `instancePath`. A group with an `anyOf` or `oneOf` error becomes one finding: `does not match any allowed form: <child messages joined with "; or ">`. Other groups use the first error's `message`. JSON pointers convert to dotted paths (`/updateComponents/components/0/value` → `updateComponents.components[0].value`).
  - `linkSchemaOnly` uses exactly `Catalog.fromJson(catalogJson).withPeerCatalogs([basicCatalog])`, then `withEntries` (basic entries with `schema` from the loaded API, ours as the loaded API) and `BASIC_FUNCTIONS`.
  - `dryRun` creates one `MessageProcessor([linked], () => undefined)`, subscribes to each created surface's `onError`, and for each message calls `processMessages([message])` in a try/catch. Each throw becomes a `web_core` finding with `path: ""` and the error's message. `onError` payloads become findings with their `path`.
  - `referenceProps` walks each component schema in `ours` and `basic`: `properties`, then `items` (adding `"*"` to the path), then `allOf`. It records a `RefSite` wherever a `$ref` ends with `/ComponentId` (kind `"id"`) or `/ChildList` (kind `"childList"`).
  - `checkReferences` replays `createSurface`, `updateComponents` and `deleteSurface` into a `Map<surfaceId, Map<id, component>>`, collects referenced IDs through `referenceProps`, and reports each missing ID: `component "<from>" references "<id>", which surface "<s>" never defines`. It also reports `surface "<s>" has components but none with id "root"`. These findings have `index: null`.
  - `check` concatenates the three layers. For each message index where exactly one of schema or web_core has findings, it sets `disagreement: "schema rejects, web_core accepts: it would render but breaks the catalog contract"` or the reverse. `ok` is true when there are no findings.
- [ ] **Step 4: Cover the linkSchemaOnly parity test.** Put it in `a2ui/link-parity.test.ts` (jsdom, so `createOutcropCatalog` can build element classes), importing `../dist/a2ui/adapter/v1.js` the way `a2ui/fleet-adapter.test.ts:110` does. It compares the sorted component names and `JSON.stringify(schema)` of each. Run all the checker tests until they pass.
- [ ] **Step 5: Commit and push.** `feat(agentui): the A2UI message checker: schema, web_core dry run, references (#30)`

---

### Task 3: The checker CLI

**Files:**
- Create: `scripts/agentui/check-a2ui.mjs`
- Test: `scripts/agentui/check-a2ui.test.ts` (`// @vitest-environment node`, spawns the CLI with `execFileSync` and temp files)
- Modify: `package.json` (add the scripts `check:a2ui` and `build:demo:a2ui` (Task 5 fills in its body; set it now to `node agentdemo/build.mjs`))

**Interfaces:**
- Consumes: `check`, `formatFindings` (Task 2); `agentdemo/.out/gen/message-validator.mjs` (Task 1).
- Produces: CLI `node scripts/agentui/check-a2ui.mjs <file>`. Exit 0 valid, 1 invalid, 2 usage or missing input.

- [ ] **Step 1: Write the failing tests.**
  - A valid `.json` array exits 0 and prints `OK: 3 message(s), no findings`.
  - An invalid `.jsonl` exits 1 and prints formatted findings.
  - A `.jsonl` with a blank line exits 2: `line 2 is blank; .jsonl needs one message per line`.
  - A `.txt` file exits 2: `unknown extension .txt; use .json (an array) or .jsonl (one message per line)`.
  - A scenario `.jsonl` (header line with `kind: "header"`) checks only its `a2ui` lines.
  - A missing generated validator exits 2, naming `npm run build:demo:a2ui`.
  - No argument exits 2 with usage.
- [ ] **Step 2: Run them and watch them fail.**
- [ ] **Step 3: Implement.**
  - Read the file and choose `.json` or `.jsonl` by extension only.
  - Scenario detection is the explicit header line: first line parsed with `kind === "header"`. Not sniffing content shapes.
  - Import the validator by `pathToFileURL` (absent means exit 2).
  - Read `dist/a2ui/catalog/v1.json` and the vendored basic catalog and common types.
  - Import `@a2ui/web_core`, run `check`, print, and exit.
  - Keep `main` at 30 lines or fewer by splitting it into `readMessages`, `loadDeps` and `report`.
- [ ] **Step 4: Run the tests and make sure they pass.** Also run `npm run check:a2ui -- <file>` by hand once.
- [ ] **Step 5: Commit and push.** `feat(agentui): check-a2ui CLI (#30)`

---

### Task 4: The local server

**Files:**
- Create: `agentdemo/serve.mjs`
- Test: `agentdemo/serve.test.ts` (`// @vitest-environment node`)
- Modify: `vitest.config.ts` (add `"agentdemo/**/*.test.ts"` to `include`), `package.json` (`demo:a2ui`: `node agentdemo/build.mjs && node agentdemo/serve.mjs`)

**Interfaces:**
- Produces:
  - `createServer({ distDir, outDir }) → http.Server` (not yet listening)
  - `resolveRequest(urlPath, { distDir, outDir }) → { file } | { status: 403 | 404 }`
  - CLI: listens on `127.0.0.1:${PORT ?? 8124}` and prints `A2UI playground: http://127.0.0.1:8124/playground/`

- [ ] **Step 1: Write the failing tests.**
  - `/playground/` maps to `outDir/index.html`.
  - `/a2ui/adapter/v1.js` maps to the `distDir` file.
  - `/playground/../../package.json`, `%2e%2e` traversal and absolute paths all return 403.
  - A missing file returns 404.
  - Content types: `.js` is `text/javascript`, `.css` is `text/css`, `.json` is `application/json`, `.html` is `text/html; charset=utf-8`.
  - The CLI with no `dist/` exits non-zero: `dist/ is absent. Run \`npm run build\` first.`
  - The server binds to `127.0.0.1` only (assert `server.address().address`).
- [ ] **Step 2: Run them and watch them fail.**
- [ ] **Step 3: Implement with `node:http` and `node:fs` only.** Decode the URL path, normalise it with `path.posix.normalize`, and reject anything containing `..` after decoding or not under the chosen root (check that `path.resolve(root, rel)` starts with `root + path.sep`). An `EADDRINUSE` gets a literate message suggesting `PORT=<n>`.
- [ ] **Step 4: Run the tests and make sure they pass.**
- [ ] **Step 5: Commit and push.** `feat(agentdemo): localhost static server for the playground (#30)`

---

### Task 5: Page build, page shell and the Host

**Files:**
- Create: `agentdemo/build.mjs`, `agentdemo/tsconfig.json`, `agentdemo/page/index.html`, `agentdemo/page/main.ts` (minimal for now), `agentdemo/page/playground.css`, `agentdemo/page/globals.d.ts`, `agentdemo/page/host.ts`, `agentdemo/page/log-model.ts`
- Test: `agentdemo/page/host.test.ts` (jsdom), `agentdemo/page/log-model.test.ts`
- Modify: `package.json` (`typecheck:agentdemo`: `tsc -p agentdemo/tsconfig.json --noEmit`, added to `test` after `typecheck:a2ui`), `.github/workflows/ci.yml` (typecheck step for the playground, next to the a2ui step)

**Interfaces:**
- Consumes: `checkSchema` (Task 2), the generated validator (Task 1), the adapter `createOutcropCatalog` and `catalogJson` from `/a2ui/adapter/v1.js` (#18).
- Produces:
  - `buildPlayground(repoRoot) → Promise<string>` (outDir). It writes the validator, bundles `page/main.ts` to `.out/main.js` (esbuild, ESM, browser, es2022, `define process.env.NODE_ENV="development"`; `/a2ui/adapter/v1.js` external), copies `page/index.html`, copies `scenarios/*.jsonl` and `*.director.json` to `.out/scenarios/`, and writes `.out/scenarios/index.json` (`[{ name, title, provenance }]`).
  - `class Host`:
    - `constructor(opts: { surfacesEl: HTMLElement; catalog: unknown; webCore: WebCoreLike; validators: Validators })`
    - `apply(messages: unknown[]) → ApplyResult`, where `ApplyResult = { applied: boolean; findings: Finding[]; errors: A2uiError[] }`. All or nothing on schema findings; `errors` are the `surface.onError` payloads raised during the batch.
    - `onAction(cb)`, `onError(cb)` → unsubscribe
    - `dataModel(surfaceId) → unknown`, `surfaces() → string[]`, `reset()`
  - `class LogModel`:
    - `add(source, message, status) → number`, `setStatus(i, status)`, `entries() → LogEntry[]`, `clear()`, `onChange(cb)`
    - `source: "scenario" | "file" | "agent"`, `status: "pending" | "applied" | "rejected" | "applied-with-errors"`

- [ ] **Step 1: Write the failing `log-model` tests** (add, status transitions, change events, clear). Run them and watch them fail. Implement. Run them until they pass.
- [ ] **Step 2: Write the failing `host` tests** in jsdom, with real `web_core` and a schema-only catalog from `linkSchemaOnly`, so no adapter assets load:
  - A valid batch creates one labelled frame per surface (`[data-surface="s"]` with a caption `surface "s"`).
  - A batch with one schema-invalid message applies nothing and returns findings.
  - `deleteSurface` removes the frame.
  - An action dispatched by a surface reaches `onAction` as a v0.9.1 `action` message.
  - `dataModel("s")` returns the surface's data.
  - `reset()` removes all frames and surfaces.
- [ ] **Step 3: Run them and watch them fail.**
- [ ] **Step 4: Implement `host.ts`.** Each frame is a `<section class="a2ui-frame" data-surface>` with a `<header>` caption and an `<a2ui-surface>` (Lit) child. The processor's action handler wraps actions as `{ version: "v0.9.1", action }`. `surface.onError` payloads become `{ version: "v0.9.1", error }`.
- [ ] **Step 5: Write `index.html`.**
  - The CSP meta, verbatim from Global Constraints.
  - The theme FOUC script moved to a same-origin file `/playground/theme-init.js`, because `script-src 'self'` forbids inline script. Load it with `<script src="theme-init.js">` and copy it in the build.
  - `<link rel="stylesheet" href="/css/custom.css">` and `/icons/bootstrap-icons.css`.
  - **In `<head>`:** `<script src="/js/theme-init.js">` (blocking, the library's own CSP-safe theme script), then the CSS: `/css/custom.css`, `/icons/bootstrap-icons.css`, then `/components/<name>/<name>.css` for `toolbar`, `splitlayout`, `codeeditor`, `tabbedpanel`, `logconsole`, `conversation` and `themetoggle`, then `playground.css` (frame and layout styles, copied by the build).
  - **At the end of `<body>`:** `/js/bootstrap.bundle.min.js`, `/components/logutility/logutility.js`, `/lib/codemirror6-6.43.15.js` (read the file name from `dist/lib-manifest.json` at build time and template it into the HTML; never hard-code the version), then the seven component scripts.
  - **Not Vditor.** `conversation` renders assistant text with `textContent` when `window.Vditor` is absent. Vditor's preview injects scripts from `https://unpkg.com`, which `script-src 'self'` forbids.
  - **Google Fonts** are allowed by the CSP (`style-src`/`font-src`), linked like the demos.
  - `<script type="module" src="main.js">`.
- [ ] **Step 6: Write `build.mjs` and a minimal `main.ts`.** `main.ts` imports `@a2ui/lit/v0_9`, imports the adapter by URL (external), builds `createOutcropCatalog(webCore, { assetBaseUrl: location.origin, injectBaseTheme: false })`, and creates a `Host` on `#surfaces`. Add `agentdemo/tsconfig.json` modelled on `a2ui/tsconfig.json`: `include ["page/**/*.ts"]`, `exclude ["page/**/*.test.ts"]`, `moduleResolution bundler`, `lib ES2022 + DOM`. Declare `/a2ui/adapter/v1.js` in `globals.d.ts`, re-exporting the types from `a2ui/src/public.d.ts`.
- [ ] **Step 7: Run `npm run build:demo:a2ui`, `npm run typecheck:agentdemo` and the tests.** All pass.
- [ ] **Step 8: Commit and push.** `feat(agentdemo): page build, CSP shell and the Host (#30)`

---

### Task 6: Playground chrome, paste, Check, apply, scenario stepping

**Files:**
- Create: `agentdemo/page/scenario.ts`, `agentdemo/page/stepper.ts`, `agentdemo/page/ui/layout.ts`, `ui/toolbar.ts`, `ui/messages.ts`, `ui/inspect.ts`, `agentdemo/page/automation.ts`
- Create: `agentdemo/scenarios/hello-ruler.jsonl`, `hello-ruler.director.json` (scripted, Task 10 uses them)
- Test: `agentdemo/page/scenario.test.ts`, `agentdemo/page/stepper.test.ts`, `tests/a2ui/playground-route.ts`, `tests/a2ui-playground.spec.ts`
- Modify: `agentdemo/page/main.ts`, `agentdemo/page/index.html`, `package.json` (`test:e2e:a2ui` also runs `tests/a2ui-playground.spec.ts tests/a2ui-scenarios.spec.ts`)

**Interfaces:**
- Consumes: `Host`, `LogModel` (Task 5); `check` and `formatFindings` (Task 2).
- Produces:
  - `parseScenario(text) → Scenario` (throws literate errors with line numbers), where `Scenario = { header: ScenarioHeader; lines: ScenarioLine[] }`
  - `serializeScenario(s) → string`
  - `class Stepper`:
    - `constructor(lines)`; `cursor`; `next() → ScenarioLine | null`; `back() → ScenarioLine[]` (the lines to re-apply after a reset); `reset()`; `done`
  - `window.a2uiPlayground = { loadScenario(text: string): void; step(): ScenarioLine | null; actions(): unknown[]; snapshot(): { log: LogEntry[]; dataModels: Record<string, unknown> } }`

**Chrome wiring, from the component API survey (component file:line cited in `components/<name>/<name>.ts`):**

| Piece | Call | Notes |
|---|---|---|
| Outer layout | `createSplitLayout({ orientation: "vertical", panes: [{ id: "top", initialSize: "72%" }, { id: "agent", initialSize: "28%", collapsible: true }] }, "app")` | options-first; container is an id (`:1525`). `#app` is `height: 100vh` in `playground.css`. |
| Inner layout | set `outer.getPaneElement("top").id = "top"`, then `createSplitLayout({ orientation: "horizontal", panes: [{ id: "messages", initialSize: "28%" }, { id: "surfaces", initialSize: "1fr" }, { id: "inspect", initialSize: "30%" }] }, "top")` | mount into `inner.getPaneElement(id)` (`:1203`) |
| Toolbar | `createToolbar({ label: "A2UI Playground", contained: true, style: "icon-label", regions: [...] }, toolbarEl)` | items `{ id, icon, label, tooltip, onClick }`. Scenario picker `{ type: "dropdown", id: "scenario", options, onChange }` (`:307`). Enable or disable with `setToolState(id, { disabled })` (`:1578`). `contained: true` avoids `position: fixed`. |
| Messages view | `createCodeEditor(id, { language: "json", readOnly: true, height: "100%" })` | container-first, id string (`:1481`). CodeMirror must load first. `setValue(text)` shows the current message. The log list above it is plain DOM (`<ol class="a2ui-log">`, with ✓ ✗ · status). |
| Paste box | a second `createCodeEditor(id, { language: "json" })` in a "Paste" tab of the inspect panel, with Check and Apply buttons under it | `getValue()` reads it |
| Inspect | `createTabbedPanel({ contained: true, tabs: [...] }, inspectEl)` with tabs `data`, `actions`, `errors`, `check` and `paste` | each `content` is an `HTMLElement` (`TabDefinition :39`). `selectTab(id)` (`:831`). Height via `setHeight`, plus a resize listener on the pane. |
| Data model tab | read-only `createCodeEditor` with `setValue(JSON.stringify(dataModel, null, 2))` | refreshed after every apply and every action |
| Actions and Errors tabs | `createLogConsole({ contained: true, height: "100%", showHeader: false })`, mounted with `el.appendChild(log.getElement())` | `log.info(JSON.stringify(msg))` for actions and `log.error(…)` for errors (messages are strings only; `:454`) |
| Check tab | `<pre class="a2ui-findings">` with `textContent = formatFindings(findings)` | the same text the CLI and the model see |
| Theme | `createThemeToggle({ container: themeEl, defaultTheme: "auto" })` | it sets `data-bs-theme` itself (`:249`) and does not persist; that's acceptable for a playground |
| Agent chat (Task 9) | `createConversation({ title: "Agent", placeholder: "Ask the agent… (Ctrl+Enter to send)", onSendMessage }, chatEl)` | `onSendMessage(text)` fires after the component has added the user bubble itself (`:3005`). Never call `addUserMessage` there. `addAssistantMessage(say)`, `addSystemMessage(notice)`, `addError({ title, message })`, `showTypingIndicator()` and `hideTypingIndicator()`, `setDisabled(bool)`. Replayed `user` lines use `addUserMessage`. |

- [ ] **Step 1: Write the failing `scenario` and `stepper` tests.**
  - `parseScenario`:
    - rejects an empty file and a missing header (`line 1 must be a header line: {"kind":"header",…}`);
    - rejects an unknown `kind` (with its line number) and a `live` header missing `provider`, `model` or `date`;
    - round-trips with `serializeScenario`.
  - `Stepper`:
    - `next` walks the lines in order and returns null at the end;
    - `back` returns the lines up to `cursor - 1` and moves the cursor back;
    - `reset` returns the cursor to 0.
- [ ] **Step 2: Implement both modules** (pure, no DOM). Run the tests until they pass.
- [ ] **Step 3: Implement the UI modules and wire them in `main.ts`:**
  - `layout.ts` builds the layouts and returns the mount elements.
  - `toolbar.ts`: the scenario dropdown (from `/playground/scenarios/index.json`), Load file (a hidden `<input type="file" accept=".json,.jsonl">`), Paste (selects the paste tab), ⏮ back (`host.reset()`, then re-apply `stepper.back()`), ⏭ step, ▶ play (steps every 900 ms until done or paused), ⟲ reset, Check, and the theme.
  - `messages.ts` renders the `LogModel`. `inspect.ts` builds the five tabs.
  - **One apply path, `applyBatch(source, messages)`:** `host.apply` updates the log statuses, the Check tab, the Errors tab and the data model tab.
  - **Scenario `user` and `say` lines** go to the chat panel's transcript (Task 9 adds the panel; until then, to a plain `<div>` in the agent pane). **`action` lines** appear in the Actions tab marked `recorded`.
- [ ] **Step 4: Implement `automation.ts`** (`window.a2uiPlayground`, amendment A3) and declare it in `globals.d.ts`.
- [ ] **Step 5: Write `hello-ruler.jsonl` and its director** (Task 10's spec). The header is `provenance: "scripted"`.
- [ ] **Step 6: Write the failing end-to-end tests** in `tests/a2ui-playground.spec.ts`, with `playground-route.ts` building once via `buildPlayground` and serving `http://localhost:8000/playground/*` from `agentdemo/.out` with `page.route`. The existing Playwright web server serves `dist/` at `:8000`.
  - The page loads; the toolbar, three panes and the agent pane render; **no `securitypolicyviolation`** event (record them with `page.addInitScript` adding a listener).
  - Paste `[createSurface, updateComponents(Ruler)]` and Check: the Check tab shows `OK`. Apply: an `outcrop-ruler` renders inside `[data-surface="s"]`.
  - Paste a message with an unknown component and Apply: the log shows ✗ and nothing renders.
  - Choose `hello-ruler` and step through it: the log statuses advance and the data model tab shows `/o`.
- [ ] **Step 7: Run them until they pass.** Then run `npm run demo:a2ui` and check the page by hand once.
- [ ] **Step 8: Commit and push.** `feat(agentdemo): playground chrome, paste/check/apply and scenario stepping (#30)`

---

### Task 7: Agent core and prompt

**Files:**
- Create: `agentdemo/page/agent/types.ts`, `rules.ts`, `prompt.ts`, `redact.ts`, `core.ts`
- Test: `agentdemo/page/agent/core.test.ts`, `prompt.test.ts`, `redact.test.ts`

**Interfaces:**
- Produces:
  - `type Turn = { role: "user" | "assistant"; text: string }`
  - `type Usage = { input: number; output: number; cached: number }`
  - `type CompleteRequest = { system: string; turns: Turn[]; model: string; key: string; signal: AbortSignal }`
  - `type CompleteResult = { text: string; usage: Usage }`
  - `type Provider = { id: "anthropic" | "openai"; complete(r: CompleteRequest): Promise<CompleteResult> }`
  - `AGENT_RULES: string` (rules.ts)
  - `systemPrompt(catalogJson: object, basicCatalogJson: object) → string`
  - `redactKey(text: string, key: string) → string`. Replaces every occurrence of the key, and of any prefix of it longer than 7 characters followed by `*`, with `[redacted key]`.
  - `class Session`:
    - `constructor(deps: { provider: Provider; model: string; key: () => string; checkSchema: (m: unknown[]) => Finding[]; apply: (m: unknown[]) => ApplyResult; system: string; onEvent: (e: SessionEvent) => void })`
    - `send(text) → Promise<TurnOutcome>`, `deliver(a2uiActionOrError: object) → Promise<TurnOutcome>`, `stop()`, `reset()`, `transcript() → ScenarioLine[]`
  - `SessionEvent = { kind: "say" | "applied" | "repair" | "failed" | "usage" | "providerError"; … }`
  - `TurnOutcome = "applied" | "failed" | "stopped" | "providerError"`

- [ ] **Step 1: Write the failing tests.**
  - **prompt:**
    - `AGENT_RULES` equals the text of `A2UI.md` between `## What agents are told` and the next `## `. Read the file in the test and normalise trailing whitespace only.
    - `systemPrompt` contains both catalogs verbatim, the reply contract sentence, and our catalog ID.
    - The output is identical across two calls (cacheable).
  - **redact:** a full key, a provider-masked prefix (`sk-ant-abc1234*****`), and text without the key, which is unchanged.
  - **core** (scripted fake provider returning queued texts):
    1. A valid reply is applied once, emits `say`, and records `user`, `say` and `a2ui` transcript lines.
    2. Unparseable JSON leads to a repair turn containing the parse error, then a valid reply is applied.
    3. Schema findings lead to a repair turn containing the `formatFindings` text, and nothing is applied before the valid reply.
    4. Three invalid replies in a row stop after 2 repairs: outcome `failed`, a `failed` event with the stop message `The agent's reply failed validation twice; nothing from this turn was applied.`, `apply` never called, and exactly 3 provider calls.
    5. `apply` returning `errors` leads to a repair turn containing the error JSON. The batch counts as applied with errors.
    6. `deliver(action)` sends the action JSON verbatim as a user turn.
    7. A provider throw becomes outcome `providerError`, with its message redacted and no retry (1 call).
    8. `stop()` aborts the signal: outcome `stopped`.
    9. **Key sentinel:** with key `sk-SENTINEL-0123456789`, run cases 1, 4 and 7, collect every emitted event, transcript line and `console` output, and assert the sentinel appears nowhere. The fake provider is the only place that sees it.
- [ ] **Step 2: Run them and watch them fail.**
- [ ] **Step 3: Implement.**
  - **`rules.ts`** holds the verbatim `A2UI.md` section as a template literal.
  - **`prompt.ts`** assembles: the rules, then `## Catalogs`, then the catalogs (`JSON.stringify(json)`, compact), then `## Reply contract` with the exact sentence from spec §6.2.
  - **`core.ts`:**
    - `#turn(userText)` loops at most 3 times (1 attempt plus 2 repairs). Each pass calls the provider, then `parseReply`, then `checkSchema`, then `apply`.
    - `parseReply(text)` extracts the first top-level JSON object. A reply must be exactly one JSON object; leading or trailing prose is a parse error that names the rule.
    - It never logs the key. Logging uses `logInfo`/`logDebug` (the same `_dbg`-gated pattern as `a2ui/src/log.ts`).
- [ ] **Step 4: Run the tests and make sure they pass.**
- [ ] **Step 5: Commit and push.** `feat(agentdemo): provider-neutral agent core with a bounded repair loop (#30)`

---

### Task 8: Providers

**Files:**
- Create: `agentdemo/page/agent/providers/anthropic.ts`, `openai.ts`
- Test: `agentdemo/page/agent/providers/anthropic.test.ts`, `openai.test.ts` (mocked `fetch`)

**Interfaces:**
- Consumes: `Provider`, `CompleteRequest`, `CompleteResult`, `redactKey` (Task 7).
- Produces: `anthropicProvider: Provider`, `openaiProvider: Provider`, `ANTHROPIC_DEFAULT_MODEL = "claude-sonnet-5-5"`.

- [ ] **Step 1: Write the failing tests.**
  - **Anthropic request:**
    - URL `https://api.anthropic.com/v1/messages`, method `POST`.
    - Headers exactly `x-api-key`, `anthropic-version: 2023-06-01`, `anthropic-dangerous-direct-browser-access: true`, `content-type: application/json`.
    - Body `{ model, max_tokens: 8192, system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }], messages: turns.map(t => ({ role: t.role, content: t.text })) }`.
    - `signal` is passed through.
  - **Anthropic response:** `content[0].text` becomes `text`; `usage.input_tokens`, `output_tokens` and `cache_read_input_tokens` become `Usage`.
  - **Anthropic errors:**
    - 401 → `Anthropic rejected the key (401). Check that it is an API key with access to the Messages API.`
    - 429 → `Anthropic is rate-limiting this key (429). Wait, then press Retry.`
    - 5xx → `Anthropic returned <status>: <error.message>`
    - `TypeError` → `Could not reach Anthropic: <message>`
    - Every message is passed through `redactKey`.
  - **OpenAI request:**
    - URL `https://api.openai.com/v1/chat/completions`.
    - Headers `authorization: Bearer <key>` and `content-type`.
    - Body `{ model, response_format: { type: "json_object" }, messages: [{ role: "system", content: system }, ...turns] }`.
  - **OpenAI response:** `choices[0].message.content`; `usage.prompt_tokens`, `completion_tokens` and `prompt_tokens_details.cached_tokens`.
  - **OpenAI errors:**
    - `TypeError` → the exact spec §14.1 text.
    - Readable 4xx/5xx → `OpenAI returned <status>: <redacted error.message>`.
    - An empty model → throws `Enter an OpenAI model ID; there is no default.` before calling `fetch`.
  - **Neither provider retries:** one `fetch` call per `complete`.
- [ ] **Step 2: Run them and watch them fail.**
- [ ] **Step 3: Implement.** Each file stays under 120 lines, with one exported object and small helpers. No SDK.
- [ ] **Step 4: Run the tests and make sure they pass.**
- [ ] **Step 5: Commit and push.** `feat(agentdemo): Claude and OpenAI providers over fetch (#30)`

---

### Task 9: Agent UI: chat, provider, key, usage, Save session

**Files:**
- Create: `agentdemo/page/ui/chat.ts`, `agentdemo/page/ui/key-store.ts`
- Test: `agentdemo/page/ui/key-store.test.ts`; extend `tests/a2ui-playground.spec.ts`
- Modify: `agentdemo/page/main.ts`, `index.html`

**Interfaces:**
- Consumes: `Session` (Task 7), the providers (Task 8), `Host` (Task 5), `serializeScenario` (Task 6).
- Produces: `KeyStore`, with `get()`, `set(key, remember: boolean)` and `clear()`. In memory by default; `sessionStorage` key `a2ui-playground.key` only when `remember` is true; every storage access in try/catch.

- [ ] **Step 1: Write the failing `key-store` tests.**
  - Memory only by default: `sessionStorage` is untouched.
  - `remember` writes to `sessionStorage`; `clear` removes it.
  - A throwing `sessionStorage` leaves memory working and reports `Could not use this tab's storage; the key is kept in memory only.`
  - `localStorage` is never touched (spy).
- [ ] **Step 2: Implement `key-store.ts`.** Run the tests until they pass.
- [ ] **Step 3: Implement `chat.ts`.**
  - The agent bar: a provider select (Claude, OpenAI), a password input, a model input (prefilled `claude-sonnet-5-5` for Claude, empty for OpenAI), a "remember for this tab" checkbox, Send, Stop, Retry, New session and Save session.
  - It uses the `conversation` component for turns (the APIs are listed in Task 6's wiring table). Assistant text renders as plain text: Vditor is not loaded (CSP).
  - Usage is shown per turn as `in <n> · out <n> · cached <n>`.
  - Send is disabled while the model is empty.
  - Every `deliver` path is wired: `host.onAction` and `host.onError` call `session.deliver` when a session is active.
  - Save session downloads `session-<date>.jsonl` with a header `{ kind: "header", title: "Saved session", provenance: "live", provider, model, date }`, using `serializeScenario`.
- [ ] **Step 4: Write the failing end-to-end tests** (mock provider by `page.route("https://api.anthropic.com/v1/messages", …)` returning queued JSON bodies):
  - **send → render:** a `StickyNote` appears in a frame; the log shows ✓.
  - **edit → deliver:** the next provider request's last user turn contains the `noteChanged` action JSON.
  - **repair is visible:** the first reply is invalid and the second valid; the chat shows the repair notice and the log shows ✗ then ✓.
  - **key sentinel in the DOM:** after a full turn, `document.documentElement.outerHTML` has no sentinel outside the password input's value (read `input.value` separately and remove it from the comparison).
  - **no CSP violation** during all of the above.
- [ ] **Step 5: Run them until they pass.**
- [ ] **Step 6: Commit and push.** `feat(agentdemo): BYOK agent chat, key handling and Save session (#30)`

---

### Task 10: Scenario replay tests

**Files:**
- Create: `tests/a2ui/replay.ts`, `tests/a2ui-scenarios.spec.ts`
- Test: `agentdemo/scenarios/scenarios.test.ts` (shape checks, node environment)

**Interfaces:**
- Consumes: `window.a2uiPlayground` (Task 6), `parseScenario` (Task 6), director JSON `{ "<actionLineIndex>": { "type": "click" | "fill" | "select", "target": "<css selector>", "value"?: string } }`.
- Produces: `replayScenario(page, scenarioText, director, { paceMs = 0 }) → Promise<void>`.

- [ ] **Step 1: Write the failing `scenarios.test.ts`.** For every `agentdemo/scenarios/*.jsonl`:
  - `parseScenario` succeeds.
  - A `live` header has `provider`, `model` and `date`.
  - A director file exists.
  - Every `action` line index has a gesture, and the director has no extra indices.
  - `check` (Task 2) on its `a2ui` lines has no findings.
- [ ] **Step 2: Implement `replay.ts`.**
  - Call `loadScenario`, then loop `step()`.
  - At an `action` line, perform the director's gesture with Playwright and wait for `actions().length` to grow. Assert the new action deep-equals the transcript's (`name`, `sourceComponentId`, `context`). A missing gesture throws `scenario line <i> is an action but the director has no gesture for it`.
  - Wait `paceMs` between steps.
- [ ] **Step 3: Write `tests/a2ui-scenarios.spec.ts`.** One test per scenario file, discovered with `fs.readdirSync`.
- [ ] **Step 4: Make `hello-ruler` pass.** It is scripted: `createSurface`; a `Column` with `Text` and `OrientationPicker` bound to `/o`; `updateDataModel`; then a user `select` gesture and its action.
- [ ] **Step 5: Mutation check.** Edit one context value in a temporary copy of the transcript and confirm the test fails. Then revert.
- [ ] **Step 6: Commit and push.** `test(agentdemo): scenario transcripts replay as key-free regression tests (#30)`

---

### Task 11: Recording pipeline

**Files:**
- Create: `agentdemo/record/record.config.ts`, `agentdemo/record/record.spec.ts`, `agentdemo/record/encode.mjs`
- Test: `agentdemo/record/encode.test.ts` (node environment; budget and `ffmpeg` detection with a stubbed `execFileSync`)
- Modify: `package.json` (`demo:a2ui:record`: `npx playwright test -c agentdemo/record/record.config.ts && node agentdemo/record/encode.mjs`), `.gitignore` (`!docs/media/a2ui/*.png`)

**Interfaces:**
- Consumes: `replayScenario` (Task 10).
- Produces:
  - `encodeAll({ videosDir, outDir, budgetBytes = 2 * 1024 * 1024 }) → { name, gifBytes }[]`
  - `requireFfmpeg()`, which throws `ffmpeg is not installed. Install it (macOS: brew install ffmpeg; Debian/Ubuntu: sudo apt install ffmpeg) and run again.`

- [ ] **Step 1: Write the failing `encode` tests.**
  - `requireFfmpeg` throws the exact text when `ffmpeg -version` fails.
  - A GIF over budget throws `<name>.gif is <n> MB, over the 2 MB budget; shorten the scenario or lower its pace.`
  - The ffmpeg arguments include `fps=10,scale=800:-1:flags=lanczos` and a palette pass.
- [ ] **Step 2: Implement `encode.mjs`.**
  - Convert each `agentdemo/.out/videos/<name>.webm` into `docs/media/a2ui/<name>.gif` (two-pass palette) and `<name>.png` (a frame from the last second).
  - Copy the WebM and write an MP4 to `agentdemo/.out/media/`.
  - Check the budget.
- [ ] **Step 3: Implement the recording run.**
  - `record.config.ts`: Chromium, viewport 1280×800, `video: { mode: "on", size: { width: 1280, height: 800 } }`, output to `agentdemo/.out/videos`.
  - `record.spec.ts`: replay each scenario (or the names in `SCENARIOS`) with `paceMs: 900`, then rename the video to `<name>.webm`.
- [ ] **Step 4: Run the encode tests until they pass.** If `ffmpeg` is installed, also run `npm run demo:a2ui:record hello-ruler` once by hand. Do not commit that scripted GIF.
- [ ] **Step 5: Commit and push.** `feat(agentdemo): record scenarios to GIF and poster under a size budget (#30)`

---

### Task 12: Documentation

**Files:**
- Create: `docs/A2UI_PLAYGROUND.md`, and an ADR in `agentknowledge` (the next free number after ADR-220; check `agentknowledge/` for the numbering file)
- Modify:
  - `scripts/generate-docs.js` (register `"A2UI_PLAYGROUND.md": "A2UI Playground"` next to line 874)
  - `docs/INDEX.md`
  - `docs/A2UI_INTEGRATION_GUIDE.md` ("Try it" and "Reference agent" sections)
  - `A2UI.md` (point contributors to the checker and the playground; note that "What agents are told" is the prompt's tested source)
  - `README.md` (link to the playground doc in the A2UI section; GIFs come with the recording step after #37)
  - `CHANGELOG.md`, `CONVERSATION.md`, the `agentknowledge` history and concept

- [ ] **Step 1: Write `docs/A2UI_PLAYGROUND.md`.** Cover:
  - what it is;
  - `npm run demo:a2ui`;
  - the panels;
  - BYOK and its guardrails (the CSP line, memory versus "remember", a spend-limited key, OpenAI's unreadable errors);
  - `npm run check:a2ui -- <file>` and the three layers;
  - the scenario format and the honesty rule;
  - director files;
  - recording and `ffmpeg`;
  - the manual live check for each provider (one turn, plus one action round trip; for OpenAI, the gate in spec §14.1).
- [ ] **Step 2: Update the integration guide, `A2UI.md`, the README, INDEX, CHANGELOG and CONVERSATION, and write the ADR.**
- [ ] **Step 3: Run `npm test`.** `[11]` doc registration, `[20]` counts and test-assertions parity all pass.
- [ ] **Step 4: Commit and push.** `docs(agentdemo): playground guide, reference-agent walkthrough, ADR (#30)`

---

### Task 13: Whole-branch verification (non-breaking gate)

- [ ] **Step 1:** Run `npm run build` on `main` and on this branch. Diff the two `dist/` trees, ignoring `dist/build.json` timestamps and generated `"generated"` fields. **Expected: no difference.** Any difference stops the work, and is reported to the user.
- [ ] **Step 2:** Run `npm test`, `npm run test:e2e:a2ui` and `npm run audit:vendor`. All green.
- [ ] **Step 3:** Run `npm run demo:a2ui` by hand, open the URL, step through `hello-ruler`, paste an invalid message and press Check.
- [ ] **Step 4:** Update #30 with what was built and what's left: #37, then live recordings (the user runs live sessions with their keys, saves them, and the advertising set is recorded). Push.
