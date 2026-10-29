/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 7ecf8f39-a40f-4db5-80b9-2f46ad97e796
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Conversation / CapabilityManifest
 * PURPOSE: Declares what Conversation can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Conversation]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker conversation-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/** A rating on an assistant message, closed like the message that holds it. */
const FEEDBACK_SCHEMA = {
    type: "object",
    description: "The user's rating of this reply. The feedback event tells you of each rating; repeat it here in "
        + "every later write, or the reply's thumb is shown unrated again.",
    properties: {
        sentiment: { description: "Positive or negative sentiment.",
            oneOf: [{ const: "negative" }, { const: "positive" }] },
        comment: { type: "string", description: "Optional written comment from the user." },
        timestamp: { type: "string", format: "date-time", description: "When the rating was given." },
    },
    required: ["sentiment", "timestamp"],
    additionalProperties: false,
};

/** One message of the session schema: what an agent writes, without the host-only metadata. */
const MESSAGE_SCHEMA = {
    type: "object",
    properties: {
        id: { type: "string", description: "Unique message identifier: the message's DOM key and the target of its "
            + "feedback, so keep it stable across writes of the session." },
        role: { description: "Who sent the message. A system or error message is shown as a plain notice.",
            oneOf: [{ const: "assistant" }, { const: "error" }, { const: "system" }, { const: "user" }] },
        content: { type: "string", description: "Message content: markdown for the assistant, plain text otherwise." },
        timestamp: { type: "string", format: "date-time", description: "When the message was sent." },
        feedback: FEEDBACK_SCHEMA,
    },
    required: ["id", "role", "content", "timestamp"],
    additionalProperties: false,
};

/**
 * Declared at `surface` conformance (readiness step 2 B7): sending a message,
 * rating a reply, and the header's New conversation and Clear context buttons
 * emit through an additive on(); the agent answers by writing the whole
 * session through the "session" slot, which re-renders the transcript while
 * the user's half-typed message, focus and scroll stay (B7-1). There is no
 * view state to restore beyond the slot (ADR-229).
 */
export const CONVERSATION_MANIFEST: CapabilityManifest =
{
    name: "conversation",
    factory: "createConversation",
    factoryStyle: "options-first",
    label: "Conversation",
    icon: "bi-chat-dots",
    category: "ai",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Show a full chat panel between the user and the agent, with markdown replies the user can rate; "
            + "answer each message by writing the whole session, your reply included.",
        avoidWhen: "For a compact docked chat with branching turns use ChatDock; for a log of system output use "
            + "LogConsole; for markdown the user edits use MarkdownEditor.",
    },

    affords: [],
    // The header channels come last: the gate and G3 drive every channel on one mount, in this order, and New
    // conversation and Clear context empty the transcript the feedback trigger rates a reply in.
    emits: [
        { name: "sendMessage", payload: "scalar", multi: false, legacyOption: "onSendMessage" },
        { name: "feedback", payload: "record", multi: false, legacyOption: "onFeedback" },
        { name: "newSession", payload: "scalar", multi: false },
        { name: "clearSession", payload: "scalar", multi: false, legacyOption: "onClearSession" },
    ],
    accepts: [
        { name: "session", payload: "record", required: false },
    ],
    actions: [],
    stateKeys: [],

    // How this component appears to agent protocols (ADR-219, ADR-222, ADR-230, readiness step 2 B7).
    protocol: {
        hostOnly: {
            // Both metadata records are left out of the session schema below, which is closed at every level, so an
            // agent's session that carries either is rejected.
            "session.metadata": "An open record the component never reads, so no schema can check its values; "
                + "the session schema leaves it out, so an agent's session that carries it is rejected.",
            "session.messages[].metadata": "An open record; its mcpApp entry is HTML the component runs in an "
                + "iframe with the network domains and sandbox flags it names. The session schema leaves it out, so "
                + "an agent's message that carries it is rejected.",
            enableMcpApps: "Runs the HTML in a message's metadata.mcpApp in an iframe whose sandbox flags and "
                + "network domains that same metadata chooses; an agent must not turn on running HTML it wrote "
                + "in the host's page.",
            onNewSession: "Returns the session New conversation loads, which the component awaits; an agent cannot "
                + "answer a callback. Without it the component starts an empty session, and the newSession event "
                + "tells the agent.",
            onLoadSession: "The component never calls this option.",
            onSaveSession: "Persistence is the host's: it fires with the whole session after every message. The "
                + "agent hears each message through sendMessage and writes its own replies.",
            onCopy: "Fires after the user copies a message or the conversation to the clipboard; a lifecycle "
                + "signal, not information for an agent.",
            onError: "The component never calls this option.",
            onMcpAppMessage: "Receives the messages of an MCP app in a sandboxed iframe, and apps come only from "
                + "message metadata, which is host-only; over A2UI no app is rendered.",
            onCanvasToggle: "Fires as the canvas panel opens or closes; that is view state, and the canvas shows "
                + "MCP apps, which come only from host-only message metadata.",
        },
        schemas: {
            // Closed at every level (B4's link rule, readiness step 2 B7): metadata is left out of the session and
            // of each message, so an agent's session that carries either is rejected. Every date keeps format
            // date-time, which is what the adapter revives as a Date.
            session: {
                type: "object",
                properties: {
                    id: { type: "string", description: "Unique session identifier." },
                    title: { type: "string", description: "Human-readable session title. The header shows the "
                        + "title option instead when it is set." },
                    messages: { type: "array", description: "Messages in this session, oldest first: every message "
                        + "so far, the user's included, in each write.", items: MESSAGE_SCHEMA },
                    createdAt: { type: "string", format: "date-time", description: "When the session was created." },
                    updatedAt: { type: "string", format: "date-time",
                        description: "When the session was last updated." },
                },
                required: ["id", "messages", "createdAt", "updatedAt"],
                additionalProperties: false,
            },
        },
        // Vditor renders the assistant's markdown (KaTeX and its other renderers load from Vditor's own mirror
        // through its cdn option, ADR-149), with its stylesheet; DOMPurify sanitises the HTML copy (ADR-230).
        dependencies: { libraries: ["vditor", "vditor-css", "dompurify"] },
    },

    regions: [
        "conversation:messages",
        "conversation:textarea",
        "conversation:error-technical",
    ],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 38792, mountCost: "moderate", holdsResources: false },

    defaultSize: { w: 400, h: 500 },
    defaultOptions: {},

    conformance: "surface",
    priority: 50,
};
