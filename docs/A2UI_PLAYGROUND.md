<!--
SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
SPDX-FileCopyrightText: 2026 Outcrop Inc
SPDX-License-Identifier: MIT
Repository: enterprise-bootstrap-theme
File GUID: 7b6f0e52-2f4c-4d7a-9a1e-5c3d8e1f0a64
Created: 2026
-->

<!-- AGENT: Guide to the local A2UI playground, its message checker, the bring-your-own-key reference agent (Claude, OpenAI), saved scenarios and the recording pipeline (#30). -->
<!-- ⚓ DOC: A2uiPlaygroundGuide -->

# A2UI playground, checker and reference agent

The playground is a local page where you can watch an AI agent build UI out of this library's components with A2UI. It shows the agent's messages, the components they render, the data model, and the actions and errors flowing back to the agent. Bring your own Claude or OpenAI key to drive it live, or replay a saved session with no key at all.

It is **local developer tooling**. Nothing here is deployed. A public version is tracked in #36.

## 1. Run it

```bash
npm run build          # once: builds dist/, which the page loads from like any host
npm run demo:a2ui      # builds the playground and serves it
```

Then open **http://127.0.0.1:8124/playground/**. The server binds to `127.0.0.1` only. Use `PORT=<n>` to change the port.

The page loads `/a2ui/adapter/v1.js`, the components and `/css/custom.css` from your local `dist/`, **exactly as a third-party host would**. It renders with Google's `@a2ui/lit` renderer and `@a2ui/web_core`, both pinned devDependencies.

## 2. What you see

| Region | Shows |
|---|---|
| **Toolbar** | the scenario picker; **Back**, **Step**, **Play**, **Reset**; **Load file**; **Paste**; **Check**; the theme |
| **Messages** (left) | every message, numbered, with ✓ applied, ✗ rejected or ⚠ applied with errors, and the selected one as JSON |
| **Surfaces** (centre) | each surface in a dashed frame captioned `surface "<id>"`, so agent-rendered UI is never confused with the page's own controls |
| **Inspect** (right) | **Data model**; **Actions** (the exact A2UI JSON the agent receives); **Errors**; **Check** (checker findings); **Paste** (a box with Check and Apply) |
| **Agent** (bottom) | provider, key, model, the conversation, usage per turn |

Every message, whatever its source (a scenario, a pasted file or the agent), goes through one path: the checker's schema layer, then `processMessages`, then the log. A batch with any schema finding is **rejected whole and nothing renders**.

## 3. The checker

```bash
npm run check:a2ui -- agent-output.json      # a JSON array of messages
npm run check:a2ui -- agent-output.jsonl     # one message per line, or a saved scenario
```

It prints `OK: <n> message(s), no findings` and exits 0, or prints one line per finding and exits 1. A usage error or missing input exits 2 and names the command that fixes it.

```text
#1 updateComponents.components[0].length: expected a literal number, a data binding {"path": "/…"}, or a function call {"call": "<name>", "args": {…}}; got "long" [schema]
#2: Surface not found for message: zz [web_core] (web_core rejects, schema accepts: the schema cannot see surface state or ordering)
end of list: component "root" references "n", which surface "s" never defines [references]
```

A message list is valid only when **all three layers** accept it:

1. **schema:** the A2UI v0.9.1 message schemas plus this library's catalog. Each component is checked against its own catalog entry, so a finding names one prop.
2. **web_core:** a headless dry run through Google's `MessageProcessor`, one message at a time. It catches what a schema cannot see, such as a message for a surface that was never created.
3. **references:** child IDs that no component defines, and surfaces without a `root`. The props that hold references are read from the catalog schemas.

When the schema and web_core layers disagree, the finding says which accepted and which rejected. The two disagree on purpose in one place: `web_core` 0.14.0 accepts an unknown function name, and the schema does not.

The playground's **Check** button and the reference agent run the same module (`scripts/agentui/a2ui-check.mjs`). The agent receives the same text you see.

## 4. The reference agent: bring your own key

1. Choose **Claude** or **OpenAI**.
2. Paste your API key.
3. Check the model:
   - Claude defaults to `claude-sonnet-5-5`.
   - OpenAI has **no default**. Enter a model ID.
4. Type a request in the conversation and press **Ctrl+Enter** or the send button.

The page calls the provider **directly from your browser over HTTPS**. Nothing passes through any server of ours.

**Guardrails:**

- **The key can only go to the provider.** The page's Content Security Policy limits outgoing requests to the page itself, `https://api.anthropic.com` and `https://api.openai.com`. Even injected script could not send the key anywhere else.
- **The key is held in memory by default** and is gone when you close the tab. **Remember for this tab** keeps it in that tab's `sessionStorage`. It is never written to `localStorage`.
- **The key never appears in logs, the page, a saved session or an error message.** Provider error text is scrubbed of it, whole or masked. A test plants a sentinel key and proves it.
- **Use a key with a spending limit.** You pay for every call.
- **No third-party scripts.** Everything the page runs comes from its own origin.

**What happens on each turn:**

- The model gets a system prompt with an A2UI primer, this library's rules (A2UI.md "What agents are told", verbatim) and both catalogs. It replies with exactly one JSON object, `{ "say": …, "messages": […] }`.
- The reply is checked and applied **all or nothing**.
- If it fails, the exact findings go back to the model, which gets **at most two repairs**. After that the playground stops and says so. Nothing is ever corrected for it.
- Your clicks and edits on the rendered components go back to the model **verbatim** as A2UI `action` messages: that is the round trip. Errors a component raises later go back too, at most twice in a row.
- Turns run one at a time.
- **Stop** aborts the request in flight. **Retry** asks again after a failure; nothing retries on its own. **New session** clears everything.

**Provider notes:**

- **Anthropic** lets browsers read its error responses, so a wrong key shows as `Anthropic rejected the key (401)…`.
- **OpenAI** does not, as verified on 2026-10-27. A wrong key, model or quota surfaces as `OpenAI's response could not be read…`, the same as a network failure. The playground says exactly that rather than guess.

**Known limits:**

- The catalog's component descriptions are thin today (#37), so the model may choose components poorly until that lands.
- Lit's `Text` warns that no markdown renderer is configured and renders plain text. Adding `@a2ui/markdown-it` would bring in a vulnerable nested `dompurify`.

**The agent's code is the pattern to copy** for your own host: `agentdemo/page/agent/core.ts`, under 300 lines, provider-neutral, with no Node-only APIs. It covers prompt, check, apply, and actions as turns. Each provider is one small file in `agentdemo/page/agent/providers/`.

## 5. Scenarios

**Save session** downloads the conversation as a `.jsonl` scenario. Each line is one event:

```text
{"kind":"header","title":"…","provenance":"live","provider":"anthropic","model":"claude-sonnet-5-5","date":"2026-10-27"}
{"kind":"user","text":"…"}
{"kind":"say","text":"…"}
{"kind":"a2ui","message":{…}}
{"kind":"action","message":{…}}
{"kind":"error","message":{…}}
{"kind":"finding","text":"…"}
```

**Replaying in the page:**

- Pick a scenario from the toolbar, or **Load file**, then step through it.
- `a2ui` lines are applied, `user` and `say` lines appear in the conversation, and recorded `action` lines show in the Actions tab marked `recorded`.

**Replaying as a test:**

- Each scenario in `agentdemo/scenarios/` has a **director** file, `<name>.director.json`. It lists the gestures that produced each recorded action:

  ```json
  { "5": [ { "type": "click", "target": "[data-surface=\"s\"] .orientationpicker-trigger" },
           { "type": "click", "target": ".orientationpicker-panel [data-value=\"landscape\"]" },
           { "type": "click", "target": "[data-surface=\"s\"] button:has-text(\"Done\")" } ] }
  ```

  The key is the line's index after the header. Gestures are `click`, `fill` or `select`.
- `npm run test:e2e:a2ui` replays every scenario. It performs the gestures on the real components and **fails unless each emitted action equals the recorded one**. So every scenario is a regression test, with no key and no LLM.
- `agentdemo/scenarios/scenarios.test.ts` checks each file's header, its director coverage, and all three checker layers.

**Honesty rule for anything advertised:**

- A recording must come from a **verbatim live session** and is labelled `Recorded from a live session with <model>, <date>`.
- Trimming whole trailing turns is allowed. Editing an `a2ui`, `say` or `action` line is not.
- A hand-written scenario has `"provenance": "scripted"` and is labelled **Scripted** everywhere. `pick-orientation` is one.

## 6. Recording demos

```bash
brew install ffmpeg                  # once (Debian/Ubuntu: sudo apt install ffmpeg)
npm run demo:a2ui:record             # every scenario; SCENARIOS=a,b to choose
```

1. Playwright replays each scenario at 1280×800 with video on, still asserting every recorded action.
2. ffmpeg writes **`docs/media/a2ui/<name>.gif`** (800 px, 10 fps) and **`<name>.png`**, both committed. WebM and MP4 copies for posts go to the gitignored `agentdemo/.out/media/`.
3. A GIF over **2 MB** fails the run.

Recording is never part of CI.

## 7. Manual live check

Do this before advertising, and whenever a provider integration changes:

1. Choose **Claude**, paste a key, and ask: *"Show a sticky note bound to /note with the text 'Draft', and tell me when I edit it."* The note renders, and your edit comes back as a turn the agent answers.
2. Do the same with **OpenAI** and a model ID you have access to. **This is the gate for OpenAI** (spec §14.1): a successful OpenAI response must be readable by the browser. If it is not, the OpenAI path is removed.
3. Paste a deliberately wrong key for each provider and confirm the error message, with no key in it.

## 8. Related

- [`A2UI_INTEGRATION_GUIDE.md`](A2UI_INTEGRATION_GUIDE.md): hosting our components in your own A2UI app.
- [`A2UI.md`](../A2UI.md): rules for contributors, and what agents are told.
- `specs/agentui-demo.prd.md`: the design, with the spike's findings in §14.
