<!--
SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
SPDX-FileCopyrightText: 2026 Outcrop Inc
SPDX-License-Identifier: MIT
Repository: enterprise-bootstrap-theme
File GUID: f1db1fb4-da18-4e23-80bd-3633501a8128
Created: 2026
-->

<!-- AGENT: PRD for Agent UI sub-project 1b — the A2UI message checker, the local playground, the in-browser bring-your-own-key reference agent (Claude and OpenAI), scenario replay tests and the recorded advertising demos. Epic: GitHub #16, this sub-project: #30. -->

# Agent UI 1b: A2UI Playground, Reference Agent and Demos

**Status:** Draft 2026-10-27 (design approved in brainstorming 2026-10-27; awaiting spec review)
**Tracking:** epic [#16](https://github.com/priyavijaikalyan2007/b2btheme/issues/16), this sub-project [#30](https://github.com/priyavijaikalyan2007/b2btheme/issues/30)
**Depends on:** #18 (`specs/agentui-a2ui.prd.md`): the adapter at `/a2ui/adapter/v1.js`.
**Related:** #36 (public live demo, blocked on `zod`), #37 (catalog component descriptions; lands before recording)
**Spec author:** Agent + User
**Date:** 2026-10-27
**Plan / progress:** `./specs/agentui-demo.plan.md` (written after this spec is approved)

---

## 1. Overview

### 1.1 What this sub-project delivers

#18 makes our components render inside any A2UI host. Nobody can yet **watch** that happen, or point a real LLM at our catalog. This sub-project delivers four things, each useful by itself:

1. **A message checker.** One validation module, used by a command-line tool, by the playground and by the agent.
2. **A local playground.** A host page that renders A2UI messages with our real components. Messages come from a saved scenario, from a file or paste, or from a live agent. It shows the messages, the data model, and the actions and errors flowing back.
3. **An in-browser reference agent.** Claude or OpenAI writes A2UI for our catalog using the developer's own key, called directly from the browser over HTTPS. The developer's clicks and edits go back to the model as turns. It is also the readable "how to wire your agent" example for host developers.
4. **Recorded advertising demos.** Saved live sessions are replayed by Playwright and recorded as GIFs and posters for the README and guides. Each replay doubles as a regression test that needs no key.

### 1.2 Decisions (user, 2026-10-27)

| # | Decision |
|---|---|
| P1 | **Local now, public later.** Nothing here is served from the CDN until #36 unblocks. The user prefers a live public demo; #36 tracks it as tech debt. |
| P2 | **The audience is developers evaluating the library.** The agent's A2UI messages are always visible beside the components they render. |
| P3 | **A real agent, not a file loop.** The reference agent calls an LLM; a coding agent writing files is not the design. |
| P4 | **Providers: Claude and OpenAI. Not Gemini.** |
| P5 | **Bring your own key.** The agent runs in the browser and calls the provider directly over HTTPS. There is no backend. The same page works locally today and on the CDN after #36. |
| P6 | **One page.** The playground and the agent are the same page. Local and public differ only in where the page is served from. |

### 1.3 Facts this design rests on (verified 2026-10-27)

- **A browser A2UI host must serve Google's renderer.** Our adapter bundles no `web_core` (#18 §1.3). A Lit host bundled with esbuild is about 454 KB minified. It contains `@a2ui/web_core`, `@a2ui/lit`, `lit`, `zod`, `zod-to-json-schema`, `redos-detector`, signals packages and `validate-color`. It does **not** contain `@a2ui/markdown-it` or `dompurify`: the v0.9 Lit entry does not import them.
- **That `zod` blocks serving it.** `zod` 3.25.76 carries GHSA-mrhx-c7xc-m3w5 (high), which covers `<4.6.6`. `@a2ui/web_core` and `@a2ui/lit` 0.14.0, the latest releases, require `zod: ^3.25.76`. `audit:vendor` would fail if we served the host, and it should. That is #36.
- **Everything under `demo/` is published.** `scripts/copy-docs.sh` copies `demo/` into `dist/demo/`, which deploys. So nothing in this sub-project lives under `demo/`.
- **The spec's message schemas exist at our pinned commit.** `a2ui-project/a2ui` at `409ded2` has `specification/v0_9_1/json/server_to_client.json` and `server_to_client_list.json`. Only `common_types.json` and the basic catalog are vendored today.
- **`web_core` validates message envelopes with Zod** (`A2uiMessageListSchema`, `v0_9/schema/server-to-client`). Ajv against the JSON Schema and `web_core`'s Zod disagree on `FunctionCall`: `web_core` 0.14.0 accepts unknown function names, and the JSON Schema rejects them.
- **Ajv compiles validators with `new Function`.** A page whose CSP has no `unsafe-eval` cannot compile them at runtime. Standalone, precompiled validators work, and #18 already generates them for the adapter (`scripts/agentui/adapter-validators.mjs`).
- **Catalog component descriptions are bare names** for 7 of our 8 components. Their 65 props are all described. That gap is #37.

### 1.4 To verify in the plan's first task (spike)

These are believed true but not yet verified. The plan starts with a spike that settles each one and records the result in §14.

1. **Anthropic accepts direct browser calls** with the `anthropic-dangerous-direct-browser-access: true` header (a CORS preflight succeeds from a `127.0.0.1` origin).
2. **OpenAI accepts direct browser calls** (CORS) today. Which endpoint to use (`/v1/chat/completions` or `/v1/responses`) and which JSON response mode it offers.
3. **`web_core`'s `MessageProcessor` runs headless in plain Node** with our catalog linked schema-only (§3.1), and reports sequencing errors such as `updateComponents` before `createSurface` through `onError` or by throwing.
4. **Our chrome components and the adapter run under the page's CSP** (§5.6) with no `unsafe-eval`.

If item 1 or 2 is false, that provider's browser path is not built. The spec is amended and the user is told. There is no proxy fallback.

---

## 2. Scope

### 2.1 In scope

- The checker module, the command-line tool and the precompiled schema validator (§3).
- The playground page and its local static server (§4, §5).
- The in-browser agent core, plus Claude and OpenAI provider files (§6).
- The scenario format, director files, replay tests, the recording script and the advertising set (§7).
- Docs: how to try it locally, how the reference agent works, and the README demo section (§12).

### 2.2 Out of scope

- **Serving anything from the CDN.** That is #36. Nothing lands in `dist/`.
- **A backend, proxy or hosted key.** BYOK only (P5).
- **Gemini** (P4) and ADK.
- **Streaming responses.** The checker needs the complete reply before anything renders, so streaming would not put pixels on screen sooner.
- **React or Angular renderers in the playground.** Lit only. React is already proven end to end by #18, and the agent never sees which renderer is used.
- **Improving catalog descriptions.** That is #37, scheduled before recording (§13).
- **Live LLM calls in CI.** Never.

---

## 3. The checker

### 3.1 Two layers; a message list is valid only if both accept it

1. **Schema layer (Ajv, JSON Schema 2020-12).** Validates against the spec's `server_to_client_list.json`. Component and function references resolve to our `dist/a2ui/catalog/v1.json`, which links Google's basic catalog the same way the published catalog does. This layer is the stricter of the two on `FunctionCall`.
2. **Dry-run layer (`web_core`).** A fresh `MessageProcessor` processes the whole list headless.
   - Its catalog is ours, **linked schema-only**: `Catalog.fromJson(catalogJson).withPeerCatalogs([basicCatalog])`, then `withEntries` with Google's basic entries and `BASIC_FUNCTIONS`. These are the steps `createOutcropCatalogFrom` takes, minus our element classes.
   - It can't use `createOutcropCatalog` itself, because that builds element classes extending `HTMLElement`, which plain Node lacks (`a2ui/src/catalog.ts:132`).
   - A unit test asserts that the schema-only catalog and `createOutcropCatalog`'s expose the same component names and schemas, so the dry run cannot drift from what hosts load.
   - `catalogJson` is the adapter's own export, which imports in plain Node (#18 gate G2). Every parse error, `surface.onError` payload and thrown exception is collected. This catches sequencing and reference errors a schema cannot see: `updateComponents` before `createSurface`, an unknown surface, duplicate component IDs, a child that references a missing ID.

When the layers disagree, the result says which accepted and which rejected, for example `schema rejects, web_core accepts: it would render but breaks the catalog contract`. Neither layer overrides the other.

### 3.2 Error format

Each finding is one line: the message index, a JSON path inside that message, the layer, and a plain-language message.

```text
#2 updateComponents.components[0].value: expected a string, a binding or a function call [schema]
#3 updateDataModel: surface "s2" was never created [web_core]
```

The agent feeds the model exactly this text during repair (§6.3), so a developer running the CLI sees what the model sees.

### 3.3 The precompiled validator

- A build step, `scripts/agentui/build-message-validator.mjs`, compiles the schema layer into one standalone ESM module. It uses the same Ajv configuration as `adapter-validators.mjs` (`strict: false`, `validateFormats: false`).
- **Output:** `agentdemo/.out/gen/message-validator.mjs`, gitignored. Its inputs are the vendored spec schemas and `dist/a2ui/catalog/v1.json`, so it is rebuilt after `npm run build:agentui`.
- The CLI and the page import **the same generated file**. There is no runtime-compile path, so the two cannot drift.
- Its closure is limited to Ajv's runtime helpers, the same rule as the adapter's closure gate. When #36 serves the page, `audit:vendor` sees them.

### 3.4 Module layout

- **`scripts/agentui/a2ui-check.mjs`:** the pure module. Plain ESM, no Node APIs and no top-level DOM access.
  - `checkSchema(messages, validate)` returns findings from the schema layer.
  - `linkSchemaOnly(catalogJson, webCore)` returns the schema-only catalog of §3.1.
  - `dryRun(messages, webCore, catalogJson)` returns findings from the dry-run layer.
  - `check(messages, deps)` returns both, with disagreements marked.
  - `formatFindings(findings)` returns the text of §3.2.
- **`scripts/agentui/check-a2ui.mjs`:** the CLI. File reading, format selection and the exit code only.

### 3.5 Command-line tool

`node scripts/agentui/check-a2ui.mjs <file>`

- **The format follows the extension, with no sniffing.** `.json` must be an array of messages. `.jsonl` must be one message per line; blank lines are an error. A scenario file (§7.1) is also accepted: only its `a2ui` lines are checked.
- **Exit codes:** `0` valid; `1` invalid; `2` usage error or missing input. A missing input names the command that produces it: no catalog means `npm run build:agentui`, and no generated validator means `npm run build:demo:a2ui`.
- **npm script:** `check:a2ui`.

---

## 4. The playground: layout and serving

### 4.1 Location (nothing ships)

| Path | Holds |
|---|---|
| `agentdemo/page/` | the playground page (HTML and TypeScript) and the agent (`agent/`) |
| `agentdemo/scenarios/` | saved sessions (`*.jsonl`) and their director files (`*.director.ts`) |
| `agentdemo/serve.mjs` | the local static server |
| `agentdemo/build.ts` | the esbuild page build, plus the validator build step |
| `agentdemo/.out/` | build output, gitignored |
| `agentdemo/tsconfig.json` | typecheck for the page and agent, wired into `npm test` as `typecheck:agentdemo` |

### 4.2 Serving

- **`npm run demo:a2ui`** builds the page and starts `agentdemo/serve.mjs`.
- `serve.mjs` uses `node:http` only. It binds **`127.0.0.1`**. It serves `dist/` at `/` and `agentdemo/.out/` at `/playground/`, and prints the URL.
- The page loads `/a2ui/adapter/v1.js`, `/components/…` and `/css/custom.css` from `dist/`, **exactly as a third-party host would** (#18 D2: no back doors).
- If `dist/` is missing, the server refuses to start and names `npm run build`.
- **`npm run build:demo:a2ui`** builds without serving. Tests and recording use it.

### 4.3 Page dependencies

- **Served to the browser:** `@a2ui/web_core` and `@a2ui/lit` (already pinned devDependencies), bundled into the page, plus the generated validator.
- **Our library:** loaded from `dist/` the way any consumer loads it.
- **No new served dependency.** Providers are called with `fetch` (§6.4).

---

## 5. The playground: behaviour

### 5.1 Layout

```text
┌─ toolbar ───────────────────────────────────────────────────────────────────────────┐
│ A2UI Playground   [Scenario ▾] [Load file] [Paste]   ⏮ ⏭ ▶ ⟲   [Check]   [☾ theme] │
├─ Messages ─────────────────────┬─ Agent-rendered surfaces ──────┬─ Inspect ───────────────┤
│ #0 createSurface        ✓      │ ┌ surface "s" ───────────────┐ │ [Data model] [Actions]  │
│ #1 updateComponents     ✓  ◀── │ │  <outcrop-sticky-note>     │ │ [Errors] [Check]        │
│ #2 updateDataModel      ·      │ └────────────────────────────┘ │                         │
├─ Agent ────────────────────────┴─────────────────────────────────┴─────────────────────────┤
│ [Claude ▾] [key ••••] [model] [☐ remember for this tab]  "Lay out…"   [Send] [Stop]      │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 One message path, three sources

Every message, whatever its source, goes through the checker's schema layer, then `processor.processMessages`, then the Messages log.

- **Scenario:** a saved session. You can step forward, step back (reset, then re-apply up to the previous step), play or reset it.
  - In the playground, a scenario's `action` lines are shown in the Actions tab marked "recorded". Only the Playwright replay re-enacts the gestures behind them (§7.3).
- **Load file or paste:** `.json` or `.jsonl`. **Check** runs both layers (§3) before you apply anything.
- **Agent:** live replies (§6), appended to the log as they arrive.

A message the schema layer rejects is shown as ✗ and **not applied**. The rule is the same in every mode.

### 5.3 Panels

- **Messages:** number, type and status (✓ applied, ✗ rejected, · pending), with the current message expanded as formatted JSON.
- **Surfaces:** one framed, labelled area per surface (`surface "s"`), so agent-rendered UI is never confused with the page's chrome. A frame is removed after `deleteSurface`, which the adapter requires (#18 guide §3).
- **Inspect:** four tabs.
  - **Data model:** each surface's live data model.
  - **Actions:** every outgoing `action` and `error`, as the exact A2UI JSON the agent receives.
  - **Errors:** the adapter's error codes, with paths.
  - **Check:** the checker's findings.

### 5.4 Chrome built from our own library

`toolbar`, `splitlayout`, `codeeditor` (Messages view and paste box), `tabbedpanel`, `logconsole` (Actions, Errors), `conversation` (agent chat) and `themetoggle`.

`conversation` is used for the chat rather than `ChatDock` on purpose. `ChatDock` is a catalog component, so having it in both the chrome and agent output would blur the labelled line.

### 5.5 Theme

- The page links `/css/custom.css` itself, because its chrome is made of our components. That is also what we recommend to real hosts.
- The adapter runs with `injectBaseTheme: false`. The `true` path keeps its #18 end-to-end coverage.
- The page sets `data-bs-theme` through `themetoggle`, using the existing demo FOUC-prevention pattern. The adapter never sets it (#18).

### 5.6 Content Security Policy

The policy is a `<meta http-equiv="Content-Security-Policy">` in the page, so it travels with the page to the CDN (#36) unchanged:

```text
default-src 'self';
script-src 'self';
connect-src 'self' https://api.anthropic.com https://api.openai.com;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' data:;
object-src 'none'; base-uri 'none'; form-action 'none'
```

- **No `unsafe-eval`.** §3.3 makes that possible.
- **`connect-src` is the key guarantee.** Even injected script cannot send a key anywhere but `'self'` and the two provider origins.
- **`'unsafe-inline'` styles** are needed by CodeMirror and by our components' inline style attributes. They do not weaken the `connect-src` guarantee.
- An end-to-end test loads the page and fails on any `securitypolicyviolation` event.

---

## 6. The reference agent (in the browser)

### 6.1 Core, `agentdemo/page/agent/core.ts`

The core is provider-neutral plain TypeScript with no Node-only APIs. A Worker or another page could reuse it unchanged (§1.2 P5, #36).

- **`systemPrompt(catalogJson, basicCatalogJson)`** returns the system prompt (§6.2).
- **`Session`** holds the history and the repair loop:
  - `send(userText)`, `deliver(actionOrErrorMessage)`, `reset()`;
  - `transcript()` returns the scenario lines (§7.1).
- **Injected dependencies:** a `Provider` (§6.4), the checker's `checkSchema`, and an `apply(messages)` callback that calls `processMessages` and reports any `surface.onError` the batch caused.

### 6.2 System prompt

1. **The A2UI rules.** The message types and when to use each, "bind `value` to read the user's edit", "bind `eventData` to read event payloads", and the error codes. This is **the same text** as `A2UI.md` §"What agents are told": the prompt module holds it, and a unit test fails if `A2UI.md` and the module differ.
2. **The catalogs.** Our catalog (the adapter's `catalogJson`, the exact catalog it serves) and Google's basic catalog, verbatim. That is about 54 KB, roughly 15k tokens.
3. **The reply contract.** Reply with exactly one JSON object: `{ "say": "<short chat text>", "messages": [ <A2UI v0.9.1 server-to-client messages> ] }`. `messages` may be empty. Use `catalogId` `https://static.outcrop.us/a2ui/catalog/v1.json`.

The system prompt is identical on every turn, so it is cacheable. Claude marks it with `cache_control`; OpenAI caches stable prefixes automatically.

### 6.3 Turns and the repair loop

- **Turns the model receives:**
  - the user's chat text;
  - every `action` and `error` the surface emits, verbatim as A2UI JSON with its `version`;
  - checker findings and adapter errors during repair, as the §3.2 text.
- **Each reply goes through:** parse the JSON object, run `checkSchema` on `messages`, then `apply(messages)`, **all or nothing**. A reply with one invalid message applies none of them.
- **Repair is bounded at 2 attempts per turn.**
  - These failures go back to the model with the exact error text: a parse failure, schema findings, or a `surface.onError` caused by the applied batch.
  - After the second failed repair, the loop stops. The chat shows `The agent's reply failed validation twice; nothing from this turn was applied.`, and the Errors tab lists every finding.
  - **This is not fallback behaviour.** Every failure is shown, nothing is auto-corrected or dropped, and the loop always terminates.
  - A `surface.onError` arrives after its batch has been applied. The loop reports it and asks for a correction. It does not undo what was rendered. The playground shows the batch as applied, with errors.
- **Usage:** each turn shows the input, output and cached token counts the provider reports.
- **New session** clears the history, deletes every surface and resets the log.

### 6.4 Providers

`agentdemo/page/agent/providers/{anthropic,openai}.ts` each export one function:

```ts
complete(req: { system: string; turns: Turn[]; model: string; key: string; signal: AbortSignal }): Promise<{ text: string; usage: Usage }>
```

| | Claude | OpenAI |
|---|---|---|
| Request | `POST https://api.anthropic.com/v1/messages` with `x-api-key`, `anthropic-version: 2023-06-01`, `anthropic-dangerous-direct-browser-access: true`, `content-type: application/json` | `POST https://api.openai.com/v1/…` with `Authorization: Bearer`; the endpoint is fixed by the spike (§1.4) |
| Model | default `claude-sonnet-5-5`, editable | **required**; Send is disabled until a model is entered, so there is no guessed default |
| JSON | the reply contract and the repair loop | the provider's JSON response mode (fixed by the spike), plus the same repair loop |

- **The provider is chosen explicitly** in the dropdown. There is no detection order and no switching to another provider on failure.
- **Errors are literate, shown in the chat, and never retried automatically.** For example: `Anthropic rejected the key (401). Check that it is an API key with access to the Messages API.` 429, 5xx and network failures are handled the same way. **Retry** re-sends the last turn; **Stop** aborts the request that is in flight.

### 6.5 Key handling

- The key is held in a password field and in memory. **Remember for this tab** is off by default; when on, it uses `sessionStorage` under one key, in a try/catch. Never `localStorage`.
- The key is sent only in the provider request header, and the CSP enforces where requests can go (§5.6).
- **The key never appears in logs, the DOM (other than the password field), a saved transcript or an error message.** A unit test plants a sentinel key, runs a full session with mocked providers including a provider error, and asserts the sentinel occurs nowhere except the request headers.
- The page tells the user to use a key with a spending limit.

### 6.6 Logging

- Logging goes through `LogUtility`, with verbose output gated by `_dbg() && console.…`, the repo idiom.
- Logged at info level: turn start and end, the repair attempt number, and finding counts.
- Prompts and replies appear at debug level only. The key never appears at any level.

---

## 7. Scenarios, replay and recordings

### 7.1 Scenario format (`*.jsonl`)

- **Line 1, the header:** `{"kind":"header","title":…,"provenance":"live"|"scripted","provider":…,"model":…,"date":"YYYY-MM-DD"}`. `provider` and `model` are required when `provenance` is `live`.
- **Every following line** is one event in order:
  - `{"kind":"user","text":…}`
  - `{"kind":"say","text":…}`
  - `{"kind":"a2ui","message":{…}}`
  - `{"kind":"action","message":{…}}`
  - `{"kind":"error","message":{…}}`
  - `{"kind":"finding","text":…}` (repair feedback)
- **Save session** in the playground downloads exactly this, with the key excluded (§6.5).

### 7.2 Honesty rule

- **An advertised scenario is a verbatim live transcript.** On screen and in the docs it is labelled `Recorded from a live session with <model>, <date>`.
- **Allowed:** trimming whole trailing turns. **Never allowed:** editing an `a2ui`, `say` or `action` line.
- Anything hand-written has `provenance: "scripted"` and is labelled **Scripted** wherever it appears.
- A test enforces the shape: every scenario under `agentdemo/scenarios/` has a valid header, and a `live` scenario names its provider and model.

### 7.3 Director files and replay

- Each scenario has `<name>.director.ts`, which maps each `action` line's index to the gesture that produced it. For example: `{ 1: { type: "fill", target: "outcrop-sticky-note textarea", value: "Ship Friday" } }`. The supported gestures are `click`, `fill` and `select`.
- **Replay** applies `a2ui` lines step by step. At each `action` line, Playwright performs the director's gesture, and the replay **asserts that the action actually emitted equals the transcript's** (name, `sourceComponentId` and resolved context).
- A mismatch fails, and so does a missing gesture. There is no tolerance.
- **Every scenario is therefore a CI regression test** with no key and no LLM: `tests/a2ui-scenarios.spec.ts`, run by `npm run test:e2e:a2ui`.

### 7.4 Recording

`npm run demo:a2ui:record [name…]`

- Builds the playground, then replays each scenario in Chromium at a fixed 1280×800 viewport with Playwright video on, paced so each step can be read.
- **`ffmpeg`** (a documented local prerequisite) converts each video into an optimised GIF (800 px wide, 10 fps) and a PNG poster.
- If `ffmpeg` is missing, the script stops with a literate error naming `brew install ffmpeg` and the equivalent for Linux.
- **Output:** `docs/media/a2ui/<name>.gif` and `<name>.png`, committed. GIFs play inline from a repository path on GitHub.
- **Size budget:** 2 MB per GIF. The script fails if a GIF is larger, which keeps git history from bloating.
- WebM and MP4 copies for posts go to `agentdemo/.out/media/`, which is gitignored.
- Recording is never run in CI. Media is regenerated only when its scenario changes.

### 7.5 The advertising set (developer audience, messages always visible)

| Scenario | Shows |
|---|---|
| `sticky-board` | You ask for meeting notes. The agent lays out `StickyNote`s in `Row`/`Column`, bound to data. You edit one: the data model updates, `onChange` goes back with its `eventData`, and the agent responds. |
| `pick-and-react` | The agent offers `OrientationPicker` and `ToolColorPicker` in a `Card`. Your choices are written back two-way, and the agent updates its summary `Text`. |
| `thinking-then-content` | `SkeletonLoader` while the agent works, then `updateComponents` swaps in `GraphLegend`. Shows a live update versus a create-time rebuild. |
| `errors-flow-back` | The agent sends a wrongly typed value. You see `VALIDATION_FAILED` reach the agent as an A2UI `error`, then its corrected reply. |

Each is recorded from a live session (§7.2) after #37 lands (§13).

---

## 8. Errors and logging summary

| Where | Failure | What happens |
|---|---|---|
| CLI | invalid input file, missing catalog or validator | exit `2`, literate message naming the command to run |
| CLI | invalid messages | exit `1`, §3.2 findings |
| Server | `dist/` missing, port in use | refuses to start, literate message |
| Page | schema rejects a message | ✗ in the log, not applied, finding in the Check tab |
| Page | adapter error | Errors tab; also sent to the agent as an A2UI `error` when the agent is active |
| Agent | provider HTTP or network error | literate chat message; manual Retry |
| Agent | reply invalid after 2 repairs | stops; chat message; findings in the Errors tab |
| Replay | emitted action ≠ transcript, or a missing gesture | test fails |
| Recording | `ffmpeg` missing, or a GIF over budget | script fails, literate message |

There are no fallbacks anywhere (AGENTS.md).

---

## 9. Security

- **The key** never leaves the browser except to the chosen provider, enforced by CSP `connect-src` (§5.6). It is never persisted beyond `sessionStorage`, and only when the user opts in. The sentinel test covers it (§6.5).
- **No third-party scripts.** Everything the page executes comes from `'self'`.
- **Agent output is untrusted input.** It is schema-checked before rendering, rendered only through catalog components (which treat data as text), and actions are plain JSON.
- **Local server:** binds `127.0.0.1` only, serves only `dist/` and `agentdemo/.out/`, and rejects paths that escape its roots (`..`, absolute paths, encoded traversal). A unit test covers traversal.
- **Advisories:** the page bundles `zod` 3.25.76 (§1.3). That is acceptable locally; it is the reason nothing is published (#36).

---

## 10. Testing

### 10.1 Unit (vitest, test-first)

- **Checker:**
  - the schema-only catalog matches `createOutcropCatalog`'s component names and schemas (§3.1);
  - schema findings;
  - dry-run sequencing findings;
  - the disagreement marking;
  - `formatFindings` text;
  - CLI exit codes and format-by-extension.
- **Agent core:** with a scripted fake provider:
  - repair bound and stop message;
  - all-or-nothing apply;
  - action and error turns;
  - `surface.onError` feedback;
  - transcript shape;
  - key sentinel;
  - the prompt-rules-equal-`A2UI.md` test.
- **Providers:** request shape against a mocked `fetch` (URL, headers, body), and error mapping for 401, 429, 5xx and network failures.
- **Server:** roots, traversal rejection, and the missing-`dist/` error.
- **Scenarios:** every file parses, has a valid header, and every `action` line has a director gesture.

### 10.2 End-to-end (Playwright, Chromium; `npm run test:e2e:a2ui`)

- The playground loads with **no CSP violation**.
- Paste, Check and apply round trip; a rejected message is not applied.
- The agent with a **mocked provider route**: send, render, user edit, action delivered to the next turn, and the repair loop visible.
- **Scenario replays** (§7.3): every scenario.

### 10.3 Manual

The live-LLM check is a documented procedure in `docs/A2UI_PLAYGROUND.md`: one turn per provider, and one action round trip. It is never part of CI.

### 10.4 Repo gates that apply

- The `[20]` audit counts, Allman braces, methods of 30 lines or fewer, SPDX and MARKERS headers.
- `test-assertions` parity, and `[11]` doc registration for every new doc.

---

## 11. Contract impact

None. Nothing is served, and no public name changes (#18 D11). The new npm scripts and devDependencies are tooling. If the spike requires a dependency, it is added as a pinned devDependency and recorded in §14.

---

## 12. Documentation

- **New `docs/A2UI_PLAYGROUND.md`**, registered in `scripts/generate-docs.js`:
  - running the playground;
  - BYOK and its guardrails;
  - the checker CLI;
  - the scenario format and honesty rule;
  - recording;
  - the manual live check.
- **`docs/A2UI_INTEGRATION_GUIDE.md`:** a "Try it" section linking the playground doc, plus a "Reference agent" section that walks through `core.ts` as the pattern for wiring an agent: catalog into the prompt, check before apply, actions as turns.
- **`A2UI.md`:** a pointer to the checker and the playground for contributors. "What agents are told" becomes the single source the prompt is tested against (§6.2).
- **README:** the "AI Agents: A2UI Support" section gains the advertising GIFs with their provenance labels, plus a link to the playground doc.
- **`docs/INDEX.md`, CHANGELOG, CONVERSATION, and `agentknowledge`:** an ADR for the BYOK browser agent and the checker's two layers, plus history.

---

## 13. Build order

1. **Spike** (§1.4), recorded in §14.
2. **Checker:** vendored message schemas, the precompiled validator, `a2ui-check.mjs`, the CLI.
3. **Playground:** server, page, chrome, paste, Check, apply, scenario stepping, CSP test.
4. **Agent:** core and prompt; the Claude provider; the OpenAI provider; key handling; Save session.
5. **Scenario replay tests**, using one scripted scenario so the machinery is tested before live recordings exist.
6. **#37** (catalog descriptions), its own change.
7. **Record the advertising set** from live sessions, then update the docs and README.

Steps 1–5 do not depend on #37. Step 7 does.

---

## 14. Amendment log

_(Empty. The spike's results and any planning amendments are recorded here.)_
