/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: Conversation / ConformanceGlue
 * 📜 PURPOSE: The mount fixture, slot sample and channel triggers for the
 *    conformance gate and A2UI G3: typing and sending a message, rating the
 *    reply, and the header's New conversation and Clear context buttons
 *    (readiness step 2 B7). The fixture lives here rather than in the
 *    manifest, because manifest defaultOptions ship to consumers and this is
 *    placeholder content.
 * 🔗 RELATES: [[Conversation]], [[Conformance]]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker conversation-conformance-glue

/** Minimal view of the handle, limited to what the triggers need. */
interface ConversationLike
{
    getElement(): HTMLElement | null;
}

/** When every fixture message was sent. */
const AT = "2026-10-29T09:00:00.000Z";

/** A question and its answer, so the feedback trigger has a reply to rate. */
const MESSAGES = [
    { id: "m1", role: "user", content: "What is the capital of France?" },
    { id: "m2", role: "assistant", content: "**Paris**." },
];

/**
 * The session as a host passes it, with Date timestamps. The gate hands options and slot samples straight to
 * the factory and setData, with no adapter to revive ISO strings, and every bubble formats its timestamp.
 */
function hostSession(id: string, messages: Record<string, unknown>[]): Record<string, unknown>
{
    return { id, title: "Support", createdAt: new Date(AT), updatedAt: new Date(AT),
        messages: messages.map((m) => ({ ...m, timestamp: new Date(AT) })) };
}

/** The same session as an agent sends it: ISO strings, which the adapter turns into Dates (ADR-227). */
const AGENT_SESSION = { id: "s1", title: "Support", createdAt: AT, updatedAt: AT,
    messages: MESSAGES.map((m) => ({ ...m, timestamp: AT })) };

/** The root element; every write re-renders the transcript, so elements are looked up afresh. */
function rootOf(handle: Record<string, unknown>): HTMLElement
{
    return (handle as unknown as ConversationLike).getElement()!;
}

/** Clicks a header button by its label; false when it is not there. */
function clickHeader(root: HTMLElement, label: string): boolean
{
    const button = root.querySelector<HTMLElement>(`.conversation-header-btn[aria-label="${label}"]`);
    button?.click();
    return button !== null;
}

export const CONFORMANCE_GLUE =
{
    options: { session: hostSession("s1", MESSAGES) },

    // What an agent sets for a chat: the transcript, with a reply to rate.
    eventProps: { session: AGENT_SESSION },

    // The generic { id, name } record is not a session. The transcript is the slot and there is no state to
    // restore (ADR-229), so the round trip records a warning rather than a pass.
    slotSamples: { session: hostSession("s2", [...MESSAGES, { id: "m3", role: "user", content: "And Spain?" }]) },

    trigger: (
        channel: string,
        handle: Record<string, unknown>): boolean | "async" =>
    {
        const root = rootOf(handle);

        switch (channel)
        {
            case "sendMessage":
            {
                const textarea = root.querySelector<HTMLTextAreaElement>(".conversation-textarea");
                const send = root.querySelector<HTMLElement>(".conversation-send-btn");
                if (!textarea || !send) { return false; }
                textarea.value = "And Germany?";
                textarea.dispatchEvent(new Event("input", { bubbles: true }));
                send.click();
                return true;
            }
            case "feedback":
            {
                const thumb = root.querySelector<HTMLElement>(
                    '.conversation-message[data-message-id="m2"] [aria-label="Rate as helpful"]');
                const submit = root.querySelector<HTMLElement>(".conversation-feedback-submit");
                if (!thumb || !submit) { return false; }
                thumb.click();
                submit.click();
                return true;
            }
            case "newSession":
                // Without onNewSession (host-only) the component starts its own empty session at once.
                return clickHeader(root, "New conversation");
            case "clearSession":
                // onClearSession is awaited before the transcript clears and the channel fires.
                return clickHeader(root, "Clear context") ? "async" : false;
            default:
                return false;
        }
    },
};
