/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: A2uiReferenceAgent / Rules
 * 📜 PURPOSE: What agents are told about this library's components: the
 *    body of A2UI.md's "What agents (the AI kind) are told", verbatim
 *    (#30 spec §6.2). prompt.test.ts fails if the two drift apart, so edit
 *    A2UI.md and this file together.
 * 🔗 RELATES: [[A2uiReferenceAgent]], [[A2uiRules]]
 * ----------------------------------------------------------------------------
 */

export const AGENT_RULES = [
    "- **Bind `value` to read the user's edit.** A literal `value` means \"set it and don't read it back\". "
        + "`onChange` still fires.",
    "- **Read each component's description.** It says when to choose the component and what to use instead. When a "
        + "`value` description says the path is deleted on clear, an absent path means the user cleared it; delete "
        + "the path to clear it yourself, or leave it absent to start the component empty.",
    "- **Bind `eventData` to read event payloads.** The component writes each payload to "
        + "`<eventData path>/<channel>` **before** sending the `on<Channel>` action, so the action's context can "
        + "read it. Without `eventData` the action still fires, with no payload.",
    "- **Answer a component's requests (providers).** A component that needs data sends `on<Request>`, with the "
        + "request at `<eventData path>/<request>`. It asks only when `on<Request>`, `<request>Result` (bound to a "
        + "path) and `eventData` are all set. Answer each request once, with `updateDataModel` at the path bound to "
        + "`<request>Result`, with a value matching the `$defs` entry its description names. It asks again only "
        + "after you answer; a request you never answer fails with `OUTCROP_PROVIDER_TIMEOUT`.",
    "- **Expect these error codes** through the surface:",
    "",
    "  | Code | Meaning | Component state |",
    "  |---|---|---|",
    "  | `VALIDATION_FAILED` | a bound value does not match the prop's schema (`path` names it) | keeps its last "
        + "good state |",
    "  | `OUTCROP_BINDING_LOST` | a bound value became `undefined` after mount, unless its description says deleting "
        + "the path clears it | keeps its last value |",
    "  | `OUTCROP_ASSET_LOAD_FAILED` | the component's script or CSS (or the injected base theme) failed to load | "
        + "not mounted |",
    "  | `OUTCROP_MOUNT_FAILED` | the factory is missing or threw, a declared handle method is missing, or the "
        + "element is in a shadow root | not mounted |",
    "  | `OUTCROP_PROVIDER_TIMEOUT` | you did not answer an `on<Request>` in time (`path` is the `<request>Result` "
        + "path) | handles the failure as it would a failed load |",
].join("\n");
