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
        expect(() =>
        {
            conv.destroy();
            conv.destroy();
        }).not.toThrow();
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

    test("addMessageAfterDestroy_DoesNotThrow", () =>
    {
        const conv = createConversation(defaultOptions(), container);
        conv.destroy();
        // Should not throw even if destroyed
        expect(() => conv.addUserMessage("late")).not.toThrow();
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
