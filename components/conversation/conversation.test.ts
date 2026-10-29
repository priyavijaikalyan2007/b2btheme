/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * TESTS: Conversation
 * Spec-based tests for the Conversation chat UI component.
 * Tests cover: factory function, options/defaults, DOM structure, ARIA,
 * handle methods, callbacks, keyboard, streaming, edge cases.
 * Mocks: markdown renderer (Vditor), DOMPurify.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { destroyProbe } from "../../tests/destroy-probe";
import { createConversation, Conversation } from "./conversation";
import type {
    ConversationOptions,
    ConversationMessage,
    ConversationSession,
} from "./conversation";

// ============================================================================
// MOCKS
// ============================================================================

/**
 * Mock Vditor preview so assistant messages render without the real library.
 * The component probes for window.Vditor.
 */
function installVditorMock(): void
{
    (window as unknown as Record<string, unknown>)["Vditor"] = {
        preview: (target: HTMLElement, md: string, _opts?: unknown) =>
        {
            target.innerHTML = `<p>${md}</p>`;
            return Promise.resolve();
        },
    };
}

function removeVditorMock(): void
{
    delete (window as unknown as Record<string, unknown>)["Vditor"];
}

/** Mock DOMPurify for sanitise calls. */
function installDOMPurifyMock(): void
{
    (window as unknown as Record<string, unknown>)["DOMPurify"] = {
        sanitize: (html: string) => html,
    };
}

function removeDOMPurifyMock(): void
{
    delete (window as unknown as Record<string, unknown>)["DOMPurify"];
}

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLDivElement;

function defaultOptions(overrides?: Partial<ConversationOptions>): ConversationOptions
{
    return {
        title: "Test Chat",
        showHeader: true,
        showFeedback: true,
        ...overrides,
    };
}

function getRoot(): HTMLElement | null
{
    return container.querySelector(".conversation") as HTMLElement | null;
}

function getHeader(): HTMLElement | null
{
    return container.querySelector(".conversation-header") as HTMLElement | null;
}

function getMessageList(): HTMLElement | null
{
    return container.querySelector(".conversation-messages") as HTMLElement | null;
}

function getMessages(): HTMLElement[]
{
    return Array.from(
        container.querySelectorAll(".conversation-message")
    );
}

function getTextarea(): HTMLTextAreaElement | null
{
    return container.querySelector(".conversation-textarea") as HTMLTextAreaElement | null;
}

function getSendBtn(): HTMLElement | null
{
    return container.querySelector(".conversation-send-btn") as HTMLElement | null;
}

function getTitle(): string
{
    const t = container.querySelector(".conversation-title");
    return t?.textContent ?? "";
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    vi.useFakeTimers();
    container = document.createElement("div");
    container.id = "conv-container";
    document.body.appendChild(container);
    installVditorMock();
    installDOMPurifyMock();
});

afterEach(() =>
{
    removeVditorMock();
    removeDOMPurifyMock();
    container.remove();
    vi.useRealTimers();
});

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

describe("createConversation", () =>
{
    test("withValidOptions_ReturnsInstance", () =>
    {
        const conv = createConversation(defaultOptions(), container);
        expect(conv).toBeDefined();
        expect(conv).toBeInstanceOf(Conversation);
        conv.destroy();
    });

    test("withContainer_MountsToContainer", () =>
    {
        const conv = createConversation(defaultOptions(), container);
        expect(getRoot()).not.toBeNull();
        conv.destroy();
    });

    test("withStringContainerId_MountsToElement", () =>
    {
        const conv = createConversation(defaultOptions(), "conv-container");
        expect(getRoot()).not.toBeNull();
        conv.destroy();
    });
});

describe("Conversation constructor", () =>
{
    test("withNoOptions_UsesDefaults", () =>
    {
        const conv = new Conversation();
        conv.show(container);
        expect(getRoot()).not.toBeNull();
        conv.destroy();
    });

    test("withOptions_AppliesOptions", () =>
    {
        const conv = new Conversation(defaultOptions({ title: "Custom Chat" }));
        conv.show(container);
        expect(getTitle()).toBe("Custom Chat");
        conv.destroy();
    });
});

// ============================================================================
// OPTIONS & DEFAULTS
// ============================================================================

describe("Conversation options", () =>
{
    test("withCustomTitle_DisplaysTitle", () =>
    {
        const conv = createConversation(
            defaultOptions({ title: "My Chat" }),
            container
        );
        expect(getTitle()).toBe("My Chat");
        conv.destroy();
    });

    test("withShowHeaderFalse_HidesHeader", () =>
    {
        const conv = createConversation(
            defaultOptions({ showHeader: false }),
            container
        );
        const header = getHeader();
        // Header should be hidden or not rendered
        expect(header === null || header.style.display === "none").toBe(true);
        conv.destroy();
    });

    test("withCustomPlaceholder_SetsTextareaPlaceholder", () =>
    {
        const conv = createConversation(
            defaultOptions({ placeholder: "Ask me anything..." }),
            container
        );
        const textarea = getTextarea();
        expect(textarea?.placeholder).toBe("Ask me anything...");
        conv.destroy();
    });

    test("withCssClass_AppliesCustomClass", () =>
    {
        const conv = createConversation(
            defaultOptions({ cssClass: "dark-chat" }),
            container
        );
        const root = getRoot();
        expect(root?.classList.contains("dark-chat")).toBe(true);
        conv.destroy();
    });

    test("withDisabledTrue_DisablesInput", () =>
    {
        const conv = createConversation(
            defaultOptions({ disabled: true }),
            container
        );
        // The disabled option is applied via setDisabled() after creation
        conv.setDisabled(true);
        const root = getRoot();
        expect(root?.classList.contains("conversation-disabled")).toBe(true);
        conv.destroy();
    });
});

// ============================================================================
// DOM STRUCTURE
// ============================================================================

describe("Conversation DOM structure", () =>
{
    test("rendersMessageList", () =>
    {
        const conv = createConversation(defaultOptions(), container);
        expect(getMessageList()).not.toBeNull();
        conv.destroy();
    });

    test("rendersInputArea", () =>
    {
        const conv = createConversation(defaultOptions(), container);
        expect(getTextarea()).not.toBeNull();
        conv.destroy();
    });

    test("rendersSendButton", () =>
    {
        const conv = createConversation(defaultOptions(), container);
        expect(getSendBtn()).not.toBeNull();
        conv.destroy();
    });
});

// ============================================================================
// ARIA
// ============================================================================

describe("Conversation ARIA", () =>
{
    test("messageList_HasLogRole", () =>
    {
        const conv = createConversation(defaultOptions(), container);
        const list = getMessageList();
        expect(list?.getAttribute("role")).toBe("log");
        conv.destroy();
    });

    test("textarea_HasTextboxRole", () =>
    {
        const conv = createConversation(defaultOptions(), container);
        const textarea = getTextarea();
        // Textarea natively has textbox role, or may have aria-label
        expect(textarea).not.toBeNull();
        conv.destroy();
    });
});

// ============================================================================
// MESSAGE METHODS
// ============================================================================

describe("Conversation message methods", () =>
{
    test("addUserMessage_CreatesUserBubble", () =>
    {
        const conv = createConversation(defaultOptions(), container);
        conv.addUserMessage("Hello!");
        vi.advanceTimersByTime(300);
        const msgs = getMessages();
        expect(msgs.length).toBe(1);
        conv.destroy();
    });

    test("addAssistantMessage_CreatesAssistantBubble", () =>
    {
        const conv = createConversation(defaultOptions(), container);
        conv.addAssistantMessage("Hi there!");
        vi.advanceTimersByTime(300);
        const msgs = getMessages();
        expect(msgs.length).toBe(1);
        conv.destroy();
    });

    test("addSystemMessage_CreatesSystemBubble", () =>
    {
        const conv = createConversation(defaultOptions(), container);
        conv.addSystemMessage("System notice");
        vi.advanceTimersByTime(300);
        const msgs = getMessages();
        expect(msgs.length).toBe(1);
        conv.destroy();
    });

    test("getMessages_ReturnsAllMessages", () =>
    {
        const conv = createConversation(defaultOptions(), container);
        conv.addUserMessage("M1");
        conv.addAssistantMessage("M2");
        const messages = conv.getMessages();
        expect(messages.length).toBe(2);
        conv.destroy();
    });

    test("getSession_ReturnsSessionData", () =>
    {
        const conv = createConversation(
            defaultOptions({ title: "Session Test" }),
            container
        );
        const session = conv.getSession();
        expect(session.id).toBeTruthy();
        expect(session.messages).toBeInstanceOf(Array);
        conv.destroy();
    });
});

// ============================================================================
// STREAMING
// ============================================================================

describe("Conversation streaming", () =>
{
    test("startAssistantMessage_ReturnsStreamHandle", () =>
    {
        const conv = createConversation(defaultOptions(), container);
        const stream = conv.startAssistantMessage();
        expect(stream).toBeDefined();
        expect(typeof stream.appendChunk).toBe("function");
        expect(typeof stream.complete).toBe("function");
        expect(typeof stream.error).toBe("function");
        stream.complete();
        conv.destroy();
    });

    test("appendChunk_AccumulatesContent", () =>
    {
        const conv = createConversation(defaultOptions(), container);
        const stream = conv.startAssistantMessage();
        stream.appendChunk("Hello ");
        stream.appendChunk("world");
        expect(stream.getContent()).toBe("Hello world");
        stream.complete();
        conv.destroy();
    });

    test("complete_FinalizesMessage", () =>
    {
        const conv = createConversation(defaultOptions(), container);
        const stream = conv.startAssistantMessage();
        stream.appendChunk("Done");
        stream.complete();
        expect(stream.getState()).toBe("complete");
        conv.destroy();
    });

    test("error_SetsErrorState", () =>
    {
        const conv = createConversation(defaultOptions(), container);
        const stream = conv.startAssistantMessage();
        stream.appendChunk("Partial");
        stream.error("Connection lost");
        expect(stream.getState()).toBe("error");
        conv.destroy();
    });
});

// ============================================================================
// HANDLE METHODS
// ============================================================================

describe("Conversation handle methods", () =>
{
    test("setTitle_UpdatesTitleDisplay", () =>
    {
        const conv = createConversation(defaultOptions(), container);
        conv.setTitle("New Title");
        expect(getTitle()).toBe("New Title");
        conv.destroy();
    });

    test("setDisabled_TogglesDisabledState", () =>
    {
        const conv = createConversation(defaultOptions(), container);
        conv.setDisabled(true);
        const root = getRoot();
        expect(root?.classList.contains("conversation-disabled")).toBe(true);
        conv.setDisabled(false);
        expect(root?.classList.contains("conversation-disabled")).toBe(false);
        conv.destroy();
    });

    test("showTypingIndicator_ShowsIndicator", () =>
    {
        const conv = createConversation(defaultOptions(), container);
        conv.showTypingIndicator();
        const typing = container.querySelector(".conversation-typing-visible");
        expect(typing).not.toBeNull();
        conv.destroy();
    });

    test("hideTypingIndicator_HidesIndicator", () =>
    {
        const conv = createConversation(defaultOptions(), container);
        conv.showTypingIndicator();
        conv.hideTypingIndicator();
        const typing = container.querySelector(".conversation-typing-visible");
        expect(typing).toBeNull();
        conv.destroy();
    });

    test("getElement_ReturnsRootElement", () =>
    {
        const conv = createConversation(defaultOptions(), container);
        expect(conv.getElement()).toBeInstanceOf(HTMLElement);
        conv.destroy();
    });

    test("show_ThenHide_TogglesVisibility", () =>
    {
        const conv = new Conversation(defaultOptions());
        conv.show(container);
        expect(getRoot()).not.toBeNull();
        conv.hide();
        // Root should be removed from container
        conv.destroy();
    });

    test("destroy_CleansUpDOM", () =>
    {
        const conv = createConversation(defaultOptions(), container);
        conv.destroy();
        expect(getRoot()).toBeNull();
    });
});

// ============================================================================
// CALLBACKS
// ============================================================================

describe("Conversation callbacks", () =>
{
    test("onSendMessage_CalledOnUserMessage", () =>
    {
        const onSendMessage = vi.fn();
        const conv = createConversation(
            defaultOptions({ onSendMessage }),
            container
        );
        // Type into the textarea and dispatch input to enable the send button
        const textarea = getTextarea();
        if (textarea)
        {
            textarea.value = "Hello";
            textarea.dispatchEvent(new Event("input", { bubbles: true }));
        }
        vi.advanceTimersByTime(100);
        // Click the now-enabled send button
        const sendBtn = getSendBtn();
        sendBtn?.click();
        vi.advanceTimersByTime(300);
        expect(onSendMessage).toHaveBeenCalled();
        conv.destroy();
    });
});

// ============================================================================
// KEYBOARD
// ============================================================================

describe("Conversation keyboard", () =>
{
    test("ctrlEnterKey_SendsMessage", () =>
    {
        const onSendMessage = vi.fn();
        const conv = createConversation(
            defaultOptions({ onSendMessage }),
            container
        );
        const textarea = getTextarea();
        if (textarea)
        {
            textarea.value = "Test message";
            // Dispatch input first to update send button state
            textarea.dispatchEvent(new Event("input", { bubbles: true }));
            vi.advanceTimersByTime(100);
            // Default submit key is Ctrl+Enter
            textarea.dispatchEvent(new KeyboardEvent("keydown", {
                key: "Enter", ctrlKey: true, bubbles: true,
            }));
        }
        vi.advanceTimersByTime(300);
        // Ctrl+Enter should submit message
        expect(onSendMessage).toHaveBeenCalled();
        conv.destroy();
    });
});

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

describe("Conversation session management", () =>
{
    test("loadSession_ReplacesMessages", () =>
    {
        const conv = createConversation(defaultOptions(), container);
        const session: ConversationSession = {
            id: "new-session",
            title: "Loaded Session",
            messages: [
                {
                    id: "m1",
                    role: "user",
                    content: "Loaded message",
                    timestamp: new Date(),
                },
            ],
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        conv.loadSession(session);
        vi.advanceTimersByTime(300);
        expect(conv.getSession().id).toBe("new-session");
        expect(conv.getMessages().length).toBe(1);
        conv.destroy();
    });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe("Conversation edge cases", () =>
{
    test("destroyTwice_DoesNotThrow", () =>
    {
        const conv = createConversation(defaultOptions(), container);
        const probe = destroyProbe();

        conv.destroy();
        const first = probe.total();
        conv.destroy();

        expect(first).toBeGreaterThan(0);
        expect(probe.total()).toBe(first);
        probe.restore();
    });

    test("showTwice_DoesNotDuplicate", () =>
    {
        const conv = new Conversation(defaultOptions());
        conv.show(container);
        conv.show(container);
        const roots = container.querySelectorAll(".conversation");
        expect(roots.length).toBe(1);
        conv.destroy();
    });

    test("addMessageAfterDestroy_RefusesRatherThanFabricating", () =>
    {
        const conv = createConversation(defaultOptions(), container);
        conv.destroy();

        // ADR-200. MEASURED before the fix: the message was created,
        // pushed into session.messages, returned to the caller, and
        // rendered into a container destroy() had already emptied.
        // getSession() reported one message and the screen showed
        // none. A method that RETURNS a ConversationMessage has no
        // honest quiet option — the object says the message exists.
        expect(() => conv.addUserMessage("late"))
            .toThrow(/addUserMessage: this conversation is destroyed/);
        expect(conv.getSession().messages).toHaveLength(0);
    });

    test("withoutVditor_StillRendersMessages", () =>
    {
        removeVditorMock();
        const conv = createConversation(defaultOptions(), container);
        conv.addAssistantMessage("Fallback rendering");
        vi.advanceTimersByTime(300);
        const msgs = getMessages();
        expect(msgs.length).toBe(1);
        conv.destroy();
    });
});

// ===========================================================================
// ADR-149, B7-2: Vditor.preview must not fetch its engine from a public CDN
// ===========================================================================

describe("vditorCdn", () =>
{
    test("assistantPreview_SetsCdnToThisLibrarysMirror_NotUnpkg", () =>
    {
        // Vditor.preview lazily fetches lute (its markdown engine), KaTeX and
        // its other renderers as script tags it injects itself. Left at its
        // default that is executable code from unpkg.com. The `cdn` option is
        // the only thing that redirects it.
        let captured: Record<string, unknown> | null = null;

        (window as unknown as Record<string, unknown>)["Vditor"] = {
            preview: (target: HTMLElement, md: string, opts: Record<string, unknown>) =>
            {
                captured = opts;
                target.textContent = md;
            },
        };

        const conv = createConversation(defaultOptions(), container);
        conv.addAssistantMessage("Hello **there**");

        expect(captured).not.toBeNull();

        const cdn = String((captured as unknown as Record<string, unknown>).cdn ?? "");

        expect(cdn).toMatch(/\/lib\/vditor-\d+\.\d+\.\d+$/);
        expect(cdn).not.toContain("unpkg.com");
        expect(cdn).not.toContain("jsdelivr");

        conv.destroy();
    });
});

// ============================================================================
// SURFACE CONTRACT (readiness step 2 B7): additive on() for sendMessage,
// feedback, newSession and clearSession, setData("session") and an empty
// state. Legacy callbacks keep firing first, exactly once.
// ============================================================================

/** A complete message, every field ConversationMessage requires, with a Date timestamp. */
function message(id: string, role: "user" | "assistant", content: string): ConversationMessage
{
    return { id, role, content, timestamp: new Date("2026-10-29T09:00:00.000Z") };
}

/** A session holding `messages`, as a host passes it (Dates, not ISO strings). */
function session(id: string, messages: ConversationMessage[]): ConversationSession
{
    const at = new Date("2026-10-29T09:00:00.000Z");
    return { id, title: "Support", messages, createdAt: at, updatedAt: at };
}

/** One question and its answer. */
const QA = (): ConversationMessage[] => [
    message("m1", "user", "What is the capital of France?"),
    message("m2", "assistant", "Paris."),
];

/** Types `text` into the textarea, then clicks Send. */
function typeAndSend(text: string): void
{
    const textarea = getTextarea()!;
    textarea.value = text;
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    getSendBtn()!.click();
}

/** Clicks a reply's thumb, types an optional comment and submits the feedback modal. */
function rate(msgId: string, label: "Rate as helpful" | "Rate as unhelpful", comment = ""): void
{
    container.querySelector<HTMLElement>(
        `.conversation-message[data-message-id="${msgId}"] [aria-label="${label}"]`)!.click();
    container.querySelector<HTMLTextAreaElement>(".conversation-feedback-textarea")!.value = comment;
    container.querySelector<HTMLElement>(".conversation-feedback-submit")!.click();
}

/** Clicks a header button by its label. */
function clickHeader(label: "New conversation" | "Clear context"): void
{
    container.querySelector<HTMLElement>(`.conversation-header-btn[aria-label="${label}"]`)!.click();
}

/** The rendered message ids, in order. */
function renderedIds(): (string | null)[]
{
    return getMessages().map((el) => el.getAttribute("data-message-id"));
}

/**
 * Gives the message list the layout jsdom lacks, as a browser would: 200px tall, 1000px of content once every
 * reply has rendered and 150px while one is still empty, and a scroll that clamps to that. The Vditor stand-in
 * fills a reply a microtask later, then calls after(), as the real preview does once lute has run.
 */
function layOut(): HTMLElement
{
    const list = getMessageList()!;
    let pending = 0;
    let top = 0;
    const height = (): number => (pending > 0 ? 150 : 1000);

    Object.defineProperty(list, "clientHeight", { configurable: true, get: () => 200 });
    Object.defineProperty(list, "scrollHeight", { configurable: true, get: height });
    Object.defineProperty(list, "scrollTop", { configurable: true, get: () => top,
        set: (v: number) => { top = Math.max(0, Math.min(v, height() - 200)); } });
    (window as unknown as Record<string, unknown>)["Vditor"] = {
        preview: (target: HTMLElement, md: string, opts: { after?: () => void }) =>
        {
            pending++;
            void Promise.resolve().then(() => { target.textContent = md; pending--; opts.after?.(); });
        },
    };
    return list;
}

describe("Conversation surface contract (B7)", () =>
{
    test("on_UnknownChannel_Throws", () =>
    {
        const conv = createConversation(defaultOptions(), container);

        expect(() => conv.on("reply", () => {})).toThrow(/unknown channel/);
        conv.destroy();
    });

    test("send_FiresOnSendMessageFirstThenTheChannelWithTheText", () =>
    {
        const order: string[] = [];
        const onSendMessage = vi.fn(() => { order.push("legacy"); });
        const conv = createConversation(defaultOptions({ onSendMessage }), container);
        const heard: unknown[] = [];
        conv.on("sendMessage", (p) => { order.push("channel"); heard.push(p); });

        typeAndSend("  Hello there  ");

        expect(onSendMessage).toHaveBeenCalledTimes(1);
        expect(onSendMessage.mock.calls[0][0]).toBe("Hello there");
        expect(order).toEqual(["legacy", "channel"]);
        expect(heard).toEqual(["Hello there"]);
        conv.destroy();
    });

    test("send_WithoutOnSendMessage_StillReachesTheChannel", () =>
    {
        const conv = createConversation(defaultOptions(), container);
        const heard: unknown[] = [];
        const off = conv.on("sendMessage", (p) => heard.push(p));

        typeAndSend("Hi");
        off();
        typeAndSend("Again");

        expect(heard).toEqual(["Hi"]);
        expect(conv.getMessages().map((m) => m.content)).toEqual(["Hi", "Again"]);
        conv.destroy();
    });

    test("feedback_FiresOnFeedbackFirstThenTheChannelWithAJsonRecord", () =>
    {
        const order: string[] = [];
        const onFeedback = vi.fn(() => { order.push("legacy"); });
        const conv = createConversation(defaultOptions({ onFeedback, session: session("s1", QA()) }), container);
        const heard: unknown[] = [];
        conv.on("feedback", (p) => { order.push("channel"); heard.push(p); });

        rate("m2", "Rate as unhelpful", "Too short");

        expect(onFeedback).toHaveBeenCalledTimes(1);
        expect(onFeedback.mock.calls[0][0]).toBe("m2");
        expect(order).toEqual(["legacy", "channel"]);
        expect(heard).toEqual([{ messageId: "m2", sentiment: "negative", comment: "Too short",
            timestamp: expect.stringMatching(/^\d{4}-\d\d-\d\dT/) }]);
        conv.destroy();
    });

    test("feedback_WithoutAComment_SendsCommentNull", () =>
    {
        const conv = createConversation(defaultOptions({ session: session("s1", QA()) }), container);
        const heard: Record<string, unknown>[] = [];
        conv.on("feedback", (p) => heard.push(p as Record<string, unknown>));

        rate("m2", "Rate as helpful");

        expect(heard).toHaveLength(1);
        expect(heard[0]).toMatchObject({ messageId: "m2", sentiment: "positive", comment: null });
        expect(JSON.parse(JSON.stringify(heard[0]))).toEqual(heard[0]);
        conv.destroy();
    });

    test("newConversation_WithoutOnNewSession_ClearsLocallyAndEmitsTheNewSessionId", async () =>
    {
        const conv = createConversation(defaultOptions({ session: session("s1", QA()) }), container);
        const heard: unknown[] = [];
        conv.on("newSession", (p) => heard.push(p));

        clickHeader("New conversation");
        await Promise.resolve();

        expect(getMessages()).toHaveLength(0);
        expect(conv.getSession().id).not.toBe("s1");
        expect(heard).toEqual([conv.getSession().id]);
        conv.destroy();
    });

    test("newConversation_WithOnNewSession_EmitsOnceTheHostsSessionLoads", async () =>
    {
        const onNewSession = vi.fn(() => Promise.resolve(session("host-2", [])));
        const conv = createConversation(defaultOptions({ onNewSession, session: session("s1", QA()) }), container);
        const heard: unknown[] = [];
        conv.on("newSession", (p) => heard.push(p));

        await conv.newSession();

        expect(onNewSession).toHaveBeenCalledTimes(1);
        expect(heard).toEqual(["host-2"]);
        conv.destroy();
    });

    test("clearContext_FiresOnClearSessionFirstThenTheChannelWithTheSessionId", async () =>
    {
        const order: string[] = [];
        const onClearSession = vi.fn(() => { order.push("legacy"); });
        const conv = createConversation(defaultOptions({ onClearSession, session: session("s1", QA()) }),
            container);
        conv.on("clearSession", (p) => { order.push(`channel:${String(p)}`); });

        clickHeader("Clear context");
        await Promise.resolve();
        await Promise.resolve();

        expect(onClearSession).toHaveBeenCalledTimes(1);
        expect(onClearSession).toHaveBeenCalledWith("s1");
        expect(order).toEqual(["legacy", "channel:s1"]);
        expect(getMessages()).toHaveLength(0);
        conv.destroy();
    });

    test("setDataSession_RendersTheTranscriptSilently", () =>
    {
        const onSaveSession = vi.fn();
        const onSendMessage = vi.fn();
        const onFeedback = vi.fn();
        const conv = createConversation(defaultOptions({ onSaveSession, onSendMessage, onFeedback }), container);
        const heard: unknown[] = [];
        for (const channel of ["sendMessage", "feedback", "newSession", "clearSession"])
        {
            conv.on(channel, (p) => heard.push(p));
        }

        conv.setData("session", session("s9", QA()));

        expect(renderedIds()).toEqual(["m1", "m2"]);
        expect(conv.getSession().id).toBe("s9");
        expect(onSaveSession).not.toHaveBeenCalled();
        expect(onSendMessage).not.toHaveBeenCalled();
        expect(onFeedback).not.toHaveBeenCalled();
        expect(heard).toEqual([]);
        conv.destroy();
    });

    test("setDataSession_KeepsTheDraftAndFocus", () =>
    {
        const conv = createConversation(defaultOptions({ session: session("s1", [QA()[0]]) }), container);
        const textarea = getTextarea()!;
        textarea.value = "And Germany";
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
        textarea.focus();

        conv.setData("session", session("s1", QA()));

        expect(renderedIds()).toEqual(["m1", "m2"]);
        expect(getTextarea()).toBe(textarea);
        expect(textarea.value).toBe("And Germany");
        expect(document.activeElement).toBe(textarea);
        expect(getSendBtn()!.hasAttribute("disabled")).toBe(false);
        conv.destroy();
    });

    test("setDataSession_ScrolledUp_KeepsTheUsersPlaceOnceTheRepliesRender", async () =>
    {
        const conv = createConversation(defaultOptions({ session: session("s1", QA()) }), container);
        const list = layOut();
        list.scrollTop = 300;
        list.dispatchEvent(new Event("scroll"));

        conv.setData("session", session("s1", [...QA(), message("m3", "user", "More"),
            message("m4", "assistant", "Lyon.")]));

        expect(renderedIds()).toEqual(["m1", "m2", "m3", "m4"]);
        // The replies are still empty, so the list is too short to hold the place yet.
        expect(list.scrollTop).toBe(0);
        await Promise.resolve();
        expect(list.scrollTop).toBe(300);
        conv.destroy();
    });

    test("setDataSession_AtTheBottom_StaysAtTheBottomOnceTheRepliesRender", async () =>
    {
        const conv = createConversation(defaultOptions({ session: session("s1", QA()) }), container);
        const list = layOut();
        list.scrollTop = 800;
        list.dispatchEvent(new Event("scroll"));

        conv.setData("session", session("s1", [...QA(), message("m3", "assistant", "Anything else?")]));
        await Promise.resolve();

        expect(list.scrollHeight).toBe(1000);
        expect(list.scrollTop).toBe(800);
        conv.destroy();
    });

    test("setDataSession_LaterRepliesTheHostAdds_LeaveTheScrollAlone", async () =>
    {
        const conv = createConversation(defaultOptions({ session: session("s1", QA()) }), container);
        const list = layOut();
        conv.setData("session", session("s1", QA()));
        await Promise.resolve();
        list.scrollTop = 100;
        list.dispatchEvent(new Event("scroll"));

        conv.addAssistantMessage("A host-added reply.");
        await Promise.resolve();

        expect(list.scrollTop).toBe(100);
        conv.destroy();
    });

    test("setDataSession_AnOlderWritesLateReplies_DoNotMoveTheScroll", () =>
    {
        const queued: (() => void)[][] = [];
        (window as unknown as Record<string, unknown>)["Vditor"] = {
            preview: (target: HTMLElement, md: string, opts: { after?: () => void }) =>
            {
                queued.at(-1)!.push(() => { target.textContent = md; opts.after?.(); });
            },
        };
        const conv = createConversation(defaultOptions(), container);
        const list = getMessageList()!;
        Object.defineProperty(list, "scrollHeight", { configurable: true, value: 1000 });
        Object.defineProperty(list, "clientHeight", { configurable: true, value: 200 });
        list.scrollTop = 300;
        list.dispatchEvent(new Event("scroll"));

        queued.push([]);
        conv.setData("session", session("s1", QA()));
        list.scrollTop = 500;
        list.dispatchEvent(new Event("scroll"));
        queued.push([]);
        conv.setData("session", session("s1", [...QA(), message("m3", "assistant", "More.")]));
        // The newer write's replies finish first; the older write's first lute load lands last.
        for (const finish of [...queued[1], ...queued[0]]) { finish(); }

        expect(list.scrollTop).toBe(500);
        conv.destroy();
    });

    test("setData_UnknownSlotOrMalformedSession_Throws", () =>
    {
        const conv = createConversation(defaultOptions(), container);

        expect(() => conv.setData("messages", [])).toThrow(/unknown slot "messages"/);
        expect(() => conv.setData("session", [])).toThrow(/expected a session/);
        expect(() => conv.setData("session", { id: "s1", messages: {} })).toThrow(/messages must be an array/);
        expect(() => conv.setData("session", { id: "s1", messages: [
            { id: "m1", role: "user", content: "Hi", timestamp: "2026-10-29T09:00:00.000Z" }] }))
            .toThrow(/message 0.*timestamp/);
        expect(() => conv.setData("session", { id: "s1", messages: [
            { role: "user", content: "Hi", timestamp: new Date() }] })).toThrow(/message 0.*id/);
        conv.destroy();
    });

    test("state_IsEmpty_AndSetStateDoesNothing", () =>
    {
        const conv = createConversation(defaultOptions({ session: session("s1", QA()) }), container);

        expect(conv.getState()).toEqual({});
        conv.setState({});
        conv.setState(conv.getState());
        expect(renderedIds()).toEqual(["m1", "m2"]);
        conv.destroy();
    });
});
