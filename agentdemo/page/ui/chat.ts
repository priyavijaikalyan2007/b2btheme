/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: A2uiPlayground / Chat
 * 📜 PURPOSE: The conversation pane (#30 spec §5.1): the user's turns and the
 *    agent's `say` text, live or replayed from a scenario. Built on the
 *    library's Conversation component, without Vditor: its preview loads
 *    scripts from unpkg, which the page's CSP forbids, so assistant text
 *    renders as plain text.
 * 🔗 RELATES: [[A2uiPlayground]], [[Conversation]]
 * ----------------------------------------------------------------------------
 */

import { factory } from "./factory";
import type { ConversationHandle } from "./factory";

type CreateConversation = (options: Record<string, unknown>, container: HTMLElement) => ConversationHandle;

export interface Chat
{
    /** A replayed user turn. (A live one is added by the component itself before onSend fires.) */
    user(text: string): void;
    say(text: string): void;
    notice(text: string): void;
    error(title: string, message: string): void;
    busy(on: boolean): void;
    enable(on: boolean): void;
    clear(): void;
}

/** Builds the conversation in `el`; `onSend` receives what the user submits. */
export function buildChat(el: HTMLElement, onSend: (text: string) => void): Chat
{
    const chat = factory<CreateConversation>("createConversation")({ title: "Agent", showHeader: false,
        placeholder: "Ask the agent to build something… (Ctrl+Enter to send)", height: "100%",
        assistantDisplayName: "Agent", onSendMessage: (text: string) => onSend(text) }, el);

    return {
        user: (t) => { chat.addUserMessage(t); },
        say: (t) => { chat.addAssistantMessage(t); },
        notice: (t) => { chat.addSystemMessage(t); },
        error: (title, message) => { chat.addError({ title, message }); },
        busy: (on) => (on ? chat.showTypingIndicator() : chat.hideTypingIndicator()),
        enable: (on) => chat.setDisabled(!on),
        clear: () => chat.clearSession(),
    };
}
