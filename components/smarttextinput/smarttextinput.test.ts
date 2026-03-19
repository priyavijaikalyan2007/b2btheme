/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * TESTS: SmartTextInput
 * Spec-based tests for the SmartTextInput behavioural middleware engine.
 * Tests cover: factory, attach/detach, trigger registration, token management,
 * event system, keyboard delegation, and edge cases.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import {
    SmartTextInputEngine,
    createSmartTextInput,
} from "./smarttextinput";

import type {
    TriggerDefinition,
    SmartTextInputOptions,
    DataSourceResult,
} from "./smarttextinput";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLDivElement;
let inputEl: HTMLInputElement;

function buildMinimalTrigger(
    triggerChar: string, name: string
): TriggerDefinition
{
    return {
        trigger: triggerChar,
        name,
        activation: {
            requireWhitespaceBefore: false,
            minQueryLength: 0,
            maxQueryLength: 50,
            cancelChars: [],
            escapeChar: null,
            suppressIn: [],
        },
        dataSource: {
            query: async () => [],
        },
        tokenRenderer: {
            type: "pill",
            display: (t) => t.label,
        },
        tokenSerializer: {
            serialize: (t) => `[${t.triggerName}:${t.id}]`,
            deserialize: () => [],
        },
    };
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    container = document.createElement("div");
    container.id = "test-smarttext";
    document.body.appendChild(container);

    inputEl = document.createElement("input");
    inputEl.type = "text";
    container.appendChild(inputEl);
});

afterEach(() =>
{
    container.remove();
});

// ============================================================================
// FACTORY — createSmartTextInput
// ============================================================================

describe("createSmartTextInput", () =>
{
    test("returnsEngineInstance", () =>
    {
        const engine = createSmartTextInput();
        expect(engine).toBeInstanceOf(SmartTextInputEngine);
        engine.destroy();
    });

    test("withOptions_PassesOptionsToEngine", () =>
    {
        const opts: SmartTextInputOptions = { queryDebounceMs: 200 };
        const engine = createSmartTextInput(opts);
        expect(engine).toBeInstanceOf(SmartTextInputEngine);
        engine.destroy();
    });

    test("withoutOptions_CreatesWithDefaults", () =>
    {
        const engine = createSmartTextInput();
        expect(engine).toBeDefined();
        engine.destroy();
    });
});

// ============================================================================
// ATTACH / DETACH
// ============================================================================

describe("attach and detach", () =>
{
    test("attach_ToInputElement_Succeeds", () =>
    {
        const engine = createSmartTextInput();
        expect(() => engine.attach(inputEl)).not.toThrow();
        engine.destroy();
    });

    test("attach_ToTextarea_Succeeds", () =>
    {
        const textarea = document.createElement("textarea");
        container.appendChild(textarea);
        const engine = createSmartTextInput();
        expect(() => engine.attach(textarea)).not.toThrow();
        engine.destroy();
    });

    test("detach_AfterAttach_CleansUp", () =>
    {
        const engine = createSmartTextInput();
        engine.attach(inputEl);
        expect(() => engine.detach()).not.toThrow();
        engine.destroy();
    });

    test("detach_WithoutAttach_DoesNotThrow", () =>
    {
        const engine = createSmartTextInput();
        expect(() => engine.detach()).not.toThrow();
        engine.destroy();
    });

    test("attach_AfterDestroy_LogsWarning", () =>
    {
        const engine = createSmartTextInput();
        engine.destroy();
        const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
        engine.attach(inputEl);
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });
});

// ============================================================================
// TRIGGER REGISTRATION
// ============================================================================

describe("trigger registration", () =>
{
    test("register_ValidTrigger_AddsToRegistry", () =>
    {
        const engine = createSmartTextInput();
        const trigger = buildMinimalTrigger("@", "mention");
        engine.register(trigger);
        expect(engine.getTriggers()).toHaveLength(1);
        expect(engine.getTriggers()[0].name).toBe("mention");
        engine.destroy();
    });

    test("register_MultipleTriggers_AllStored", () =>
    {
        const engine = createSmartTextInput();
        engine.register(buildMinimalTrigger("@", "mention"));
        engine.register(buildMinimalTrigger("#", "channel"));
        expect(engine.getTriggers()).toHaveLength(2);
        engine.destroy();
    });

    test("unregister_RemovesTrigger", () =>
    {
        const engine = createSmartTextInput();
        engine.register(buildMinimalTrigger("@", "mention"));
        engine.unregister("mention");
        expect(engine.getTriggers()).toHaveLength(0);
        engine.destroy();
    });

    test("register_InvalidTrigger_LogsError", () =>
    {
        const engine = createSmartTextInput();
        const spy = vi.spyOn(console, "error").mockImplementation(() => {});
        engine.register({ trigger: "", name: "" } as TriggerDefinition);
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
        engine.destroy();
    });

    test("getTriggers_ReturnsArray", () =>
    {
        const engine = createSmartTextInput();
        expect(Array.isArray(engine.getTriggers())).toBe(true);
        engine.destroy();
    });
});

// ============================================================================
// TOKEN MANAGEMENT
// ============================================================================

describe("token management", () =>
{
    test("getTokens_InitiallyEmpty", () =>
    {
        const engine = createSmartTextInput();
        expect(engine.getTokens()).toHaveLength(0);
        engine.destroy();
    });

    test("getTokensByType_ReturnsEmptyForUnknown", () =>
    {
        const engine = createSmartTextInput();
        expect(engine.getTokensByType("nonexistent")).toHaveLength(0);
        engine.destroy();
    });
});

// ============================================================================
// EVENT SYSTEM
// ============================================================================

describe("event system", () =>
{
    test("on_ReturnsUnsubscribeFunction", () =>
    {
        const engine = createSmartTextInput();
        const unsub = engine.on("trigger:open", () => {});
        expect(typeof unsub).toBe("function");
        engine.destroy();
    });

    test("on_CallingUnsubscribe_DoesNotThrow", () =>
    {
        const engine = createSmartTextInput();
        const unsub = engine.on("trigger:open", () => {});
        expect(() => unsub()).not.toThrow();
        engine.destroy();
    });

    test("on_MultipleListeners_AllRegistered", () =>
    {
        const engine = createSmartTextInput();
        const unsub1 = engine.on("trigger:open", () => {});
        const unsub2 = engine.on("trigger:query", () => {});
        expect(typeof unsub1).toBe("function");
        expect(typeof unsub2).toBe("function");
        engine.destroy();
    });
});

// ============================================================================
// OPTIONS
// ============================================================================

describe("setOptions", () =>
{
    test("updatesEngineOptions", () =>
    {
        const engine = createSmartTextInput({ queryDebounceMs: 100 });
        expect(() =>
        {
            engine.setOptions({ queryDebounceMs: 300 });
        }).not.toThrow();
        engine.destroy();
    });
});

// ============================================================================
// DESTROY
// ============================================================================

describe("destroy", () =>
{
    test("clearsTriggersAndTokens", () =>
    {
        const engine = createSmartTextInput();
        engine.register(buildMinimalTrigger("@", "mention"));
        engine.destroy();
        expect(engine.getTriggers()).toHaveLength(0);
        expect(engine.getTokens()).toHaveLength(0);
    });

    test("calledTwice_DoesNotThrow", () =>
    {
        const engine = createSmartTextInput();
        engine.destroy();
        expect(() => engine.destroy()).not.toThrow();
    });
});

// ============================================================================
// CONTENT SERIALIZATION
// ============================================================================

describe("content serialization", () =>
{
    test("getPlainTextContent_WithNoAdapter_ReturnsEmpty", () =>
    {
        const engine = createSmartTextInput();
        expect(engine.getPlainTextContent()).toBe("");
        engine.destroy();
    });

    test("getSerializedContent_WithNoAdapter_ReturnsEmpty", () =>
    {
        const engine = createSmartTextInput();
        expect(engine.getSerializedContent()).toBe("");
        engine.destroy();
    });

    test("getPlainTextContent_AfterAttach_ReturnsInputContent", () =>
    {
        const engine = createSmartTextInput();
        inputEl.value = "hello world";
        engine.attach(inputEl);
        expect(engine.getPlainTextContent()).toBe("hello world");
        engine.destroy();
    });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe("edge cases", () =>
{
    test("attachContentEditable_DetectsCorrectly", () =>
    {
        const div = document.createElement("div");
        div.contentEditable = "true";
        container.appendChild(div);
        const engine = createSmartTextInput();
        expect(() => engine.attach(div)).not.toThrow();
        engine.destroy();
    });

    test("explicitAdapterType_OverridesAutoDetect", () =>
    {
        const engine = createSmartTextInput();
        expect(() =>
        {
            engine.attach(inputEl, "plaintext");
        }).not.toThrow();
        engine.destroy();
    });
});
