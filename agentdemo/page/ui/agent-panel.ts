/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: A2uiPlayground / Agent panel
 * 📜 PURPOSE: The bring-your-own-key agent (#30 spec §6): provider, key,
 *    model, the chat, and the wiring that sends the user's actions and the
 *    surface's later errors back to the model as turns. The key is held by
 *    KeyStore and goes only into the provider's request header.
 * 🔗 RELATES: [[A2uiReferenceAgent]], [[A2uiPlaygroundHost]], [[Conversation]]
 * ----------------------------------------------------------------------------
 */

import { Session } from "../agent/core";
import type { SessionEvent } from "../agent/core";
import { ANTHROPIC_DEFAULT_MODEL, anthropicProvider } from "../agent/providers/anthropic";
import { openaiProvider } from "../agent/providers/openai";
import type { Provider } from "../agent/types";
import type { Host } from "../host";
import type { Playground } from "../playground";
import { serializeScenario } from "../scenario";
import type { Finding } from "../types";
import { buildAgentBar } from "./agent-bar";
import type { AgentBar } from "./agent-bar";
import { buildChat } from "./chat";
import type { Chat } from "./chat";
import type { Inspect } from "./inspect";
import { KeyStore } from "./key-store";

/** At most this many surface errors in a row go to the model before the user acts again. */
const MAX_AUTO_ERROR_TURNS = 2;
const PROVIDERS: Record<Provider["id"], Provider> = { anthropic: anthropicProvider, openai: openaiProvider };

export interface AgentPanelDeps
{
    readonly el: HTMLElement;
    readonly host: Host;
    /** A getter: the Playground is built with this panel's chat. */
    readonly playground: () => Playground;
    readonly inspect: Inspect;
    readonly system: string;
    readonly formatFindings: (findings: readonly Finding[]) => string;
}

export interface AgentPanel
{
    /** Ends the agent session: used when a scenario takes over the surfaces. */
    reset(): void;
    /** The conversation pane, which scenario replay also writes to. */
    readonly chat: Chat;
}

/** Builds the agent bar and chat in `d.el`, and wires them to a Session and the Host. */
export function buildAgentPanel(d: AgentPanelDeps): AgentPanel
{
    const keys = new KeyStore();
    const state = { session: null as Session | null, autoErrors: 0 };
    const chatEl = document.createElement("div");

    d.el.classList.add("a2ui-agent");
    chatEl.className = "a2ui-chat";

    const bar = buildAgentBar(d.el, keys, { defaultModel: (id) => (id === "anthropic" ? ANTHROPIC_DEFAULT_MODEL : ""),
        changed: () => { state.session?.reset(); state.session = null; sync(); },
        stop: () => state.session?.stop(), retry: () => void state.session?.retry(),
        newSession: () => { state.session?.reset(); state.session = null; d.playground().reset(); },
        save: () => save(state.session, bar, chat) });

    d.el.append(chatEl);

    const chat = buildChat(chatEl, (text) => { state.autoErrors = 0; void session().send(text); });
    const sync = () => chat.enable(bar.ready());
    const session = () => (state.session ??= newSession(d, bar, keys, chat));

    bar.onInput(sync);
    sync();
    wireSurfaceTurns(d.host, state);

    return { chat, reset: () => { state.session?.reset(); state.session = null; } };
}

function newSession(d: AgentPanelDeps, bar: AgentBar, keys: KeyStore, chat: Chat): Session
{
    return new Session({ provider: PROVIDERS[bar.provider()], model: () => bar.model(), key: () => keys.get(),
        system: d.system, formatFindings: d.formatFindings,
        apply: (m) => d.playground().applyBatch("agent", m), onEvent: (e) => onEvent(e, chat, bar, d) });
}

/** The user's actions always go to an active agent; later surface errors do too, at most twice in a row. */
function wireSurfaceTurns(host: Host, state: { session: Session | null; autoErrors: number }): void
{
    host.onAction((action) =>
    {
        if (!state.session || state.session.transcript().length === 0) { return; }

        state.autoErrors = 0;
        void state.session.deliver(action);
    });
    host.onError((error, duringApply) =>
    {
        if (duringApply || !state.session || state.session.transcript().length === 0) { return; }
        if (state.autoErrors >= MAX_AUTO_ERROR_TURNS) { return; }

        state.autoErrors += 1;
        void state.session.deliver(error);
    });
}

function onEvent(e: SessionEvent, chat: Chat, bar: AgentBar, d: AgentPanelDeps): void
{
    switch (e.kind)
    {
        case "busy": chat.busy(e.on); chat.enable(!e.on && bar.ready()); bar.busy(e.on); break;
        case "say": chat.say(e.text); break;
        case "usage": bar.usage(e.usage); break;
        case "repair": chat.notice(`Repair ${e.attempt} of 2: the findings were sent back to the agent.`); break;
        case "failed": chat.error("Not applied", e.message); d.inspect.showFindings(e.feedback); break;
        case "providerError": chat.error(`${bar.providerLabel()} error`, e.message); bar.canRetry(true); break;
        case "applied": bar.canRetry(false); break;
    }
}

/** Downloads the session as a scenario file; the key is never in it. */
function save(session: Session | null, bar: AgentBar, chat: Chat): void
{
    if (!session || session.transcript().length === 0) { chat.notice("Nothing to save yet."); return; }

    const date = new Date().toISOString().slice(0, 10);
    const text = serializeScenario({ header: { kind: "header", title: "Saved session", provenance: "live",
        provider: bar.provider(), model: bar.model(), date }, lines: session.transcript() });
    const link = document.createElement("a");

    link.href = URL.createObjectURL(new Blob([text], { type: "application/x-ndjson" }));
    link.download = `session-${date}.jsonl`;
    link.click();
    URL.revokeObjectURL(link.href);
}
