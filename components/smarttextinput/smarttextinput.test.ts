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
import { destroyProbe } from "../../tests/destroy-probe";
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

    // "CreatesWithDefaults" names the defaults, and
    // `toBeDefined()` on a `new` expression holds for every one of
    // them. `queryDebounceMs` is the default a user can feel:
    // DEFAULT_DEBOUNCE_MS is 150, so a query fires at 150ms and not
    // at 100. The same instrument `setOptions :: updatesEngineOptions`
    // uses below, pointed at the value nobody passed.
    test("withoutOptions_CreatesWithDefaults", () =>
    {
        vi.useFakeTimers();

        const seen: string[] = [];
        const el = document.createElement("input");
        document.body.appendChild(el);

        const engine = createSmartTextInput();
        engine.setOptions({ onTriggerQuery: (e) => { seen.push(e.queryText); } });
        engine.register({
            trigger: "@",
            name: "people",
            dataSource: { query: async () => [] },
        });
        engine.attach(el);

        const type = (value: string): void =>
        {
            el.value = value;
            el.selectionStart = value.length;
            el.selectionEnd = value.length;
            el.dispatchEvent(new Event("input", { bubbles: true }));
        };

        type("@");
        type("@ab");

        vi.advanceTimersByTime(100);
        expect(seen).toEqual([]);

        vi.advanceTimersByTime(60);
        expect(seen).toEqual(["ab"]);

        engine.destroy();
        el.remove();
        vi.useRealTimers();
    });
});

// ============================================================================
// ATTACH / DETACH
// ============================================================================

describe("attach and detach", () =>
{
    /*
     * DEBT-TEST-1b. EIGHT BLOCKS IN THIS FILE SAID "SUCCEEDS", "CLEANS
     * UP", "DETECTS CORRECTLY" OR "OVERRIDES", AND ASSERTED THAT A CALL
     * DID NOT THROW. Attaching has two visible effects: it appends a
     * live region to the body, and it wires the element's own events to
     * the engine. `content:change` is emitted from `handleInput` with
     * no trigger registered and no debounce in the way, so one `input`
     * event is enough to ask whether the wiring happened.
     */
    function typeInto(el: HTMLElement, text: string): void
    {
        if (el instanceof HTMLInputElement
            || el instanceof HTMLTextAreaElement)
        {
            el.value = text;
        }
        else
        {
            el.textContent = text;
        }
        el.dispatchEvent(new Event("input", { bubbles: true }));
    }

    test("attach_ToInputElement_WiresTheElementsEvents", () =>
    {
        const engine = createSmartTextInput();
        const seen: string[] = [];
        engine.on("content:change",
            (p: { content: string }) => { seen.push(p.content); });

        engine.attach(inputEl);
        typeInto(inputEl, "hello");

        expect(seen).toEqual(["hello"]);
        engine.destroy();
    });

    test("attach_ToTextarea_WiresTheElementsEvents", () =>
    {
        const textarea = document.createElement("textarea");
        container.appendChild(textarea);
        const engine = createSmartTextInput();
        const seen: string[] = [];
        engine.on("content:change",
            (p: { content: string }) => { seen.push(p.content); });

        engine.attach(textarea);
        typeInto(textarea, "from a textarea");

        expect(seen).toEqual(["from a textarea"]);
        engine.destroy();
    });

    test("attach_AddsAnAriaLiveRegionToTheDocument", () =>
    {
        // The other half of attach, and the half a reader never sees
        // unless it is missing. It is announced to, so it has to exist.
        const engine = createSmartTextInput();

        expect(document.querySelector("[role=\"status\"][aria-live]")).toBeNull();
        engine.attach(inputEl);

        expect(document.querySelector("[role=\"status\"][aria-live]"))
            .not.toBeNull();
        engine.destroy();
    });

    test("detach_AfterAttach_StopsEmittingAndRemovesTheLiveRegion", () =>
    {
        // "Cleans up" was the claim and no cleanup was checked.
        //
        // WHAT THIS PROVES IS THAT THE EVENTS STOP, AND NOT THAT THE
        // LISTENERS WERE REMOVED. `detach` sets `this.adapter = null`
        // before anything else reads it, and `emitContentChange`
        // returns on that, so deleting the unsubscribe loop leaves
        // this test green — verified by mutation. The leak is not
        // observable from here and the claim is not made. Same shape
        // as GraphToolbar's Destroy_StopsTheKeyboardShortcuts.
        const engine = createSmartTextInput();
        const seen: string[] = [];
        engine.on("content:change",
            (p: { content: string }) => { seen.push(p.content); });

        engine.attach(inputEl);
        typeInto(inputEl, "before");
        engine.detach();
        typeInto(inputEl, "after");

        expect(seen).toEqual(["before"]);
        expect(document.querySelector("[role=\"status\"][aria-live]")).toBeNull();
        engine.destroy();
    });

    test("detach_WithoutAttach_LeavesTheEngineAttachable", () =>
    {
        // The claim worth making is not that the call survives but that
        // it does not poison the engine. A detach that cleared state it
        // did not own would show up on the attach after it.
        const engine = createSmartTextInput();
        const seen: string[] = [];
        engine.on("content:change",
            (p: { content: string }) => { seen.push(p.content); });

        engine.detach();
        engine.attach(inputEl);
        typeInto(inputEl, "still works");

        expect(seen).toEqual(["still works"]);
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

    test("on_CallingUnsubscribe_StopsTheHandler", () =>
    {
        // DEBT-TEST-1b. An unsubscribe that returned without removing
        // anything passed the old assertion. `content:change` needs no
        // trigger registered, so one input event settles it.
        const engine = createSmartTextInput();
        const input = document.createElement("input");
        container.appendChild(input);
        let calls = 0;
        const unsub = engine.on("content:change", () => { calls++; });

        engine.attach(input);
        input.value = "one";
        input.dispatchEvent(new Event("input", { bubbles: true }));
        unsub();
        input.value = "two";
        input.dispatchEvent(new Event("input", { bubbles: true }));

        expect(calls).toBe(1);
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

describe("trigger activation is filled in and checked (DEBT-STI-2)", () =>
{
    // The defect: `isSuppressed` read `activation.suppressIn.length`
    // with no guard, and the TypeError that produced was raised inside
    // the input listener — it never reached the consumer and the
    // trigger simply never fired. TypeScript made it unreachable from
    // TypeScript and from nowhere else: this library ships to a CDN
    // and is consumed from plain JavaScript, and RichTextInput
    // declares `activation?: Record<string, unknown>`.

    function typeTrigger(engine: ReturnType<typeof createSmartTextInput>): HTMLInputElement
    {
        const el = document.createElement("input");
        document.body.appendChild(el);
        engine.attach(el);
        el.value = "@";
        el.selectionStart = 1;
        el.dispatchEvent(new Event("input", { bubbles: true }));
        return el;
    }

    test("anOmittedActivationStillOpensASession", () =>
    {
        const opened: string[] = [];
        const engine = createSmartTextInput({
            onTriggerOpen: (e) => { opened.push(e.triggerName); },
        });

        engine.register({
            trigger: "@", name: "mention",
            dataSource: { query: async () => [] },
        } as never);

        const el = typeTrigger(engine);

        expect(opened).toEqual(["mention"]);

        engine.destroy();
        el.remove();
    });

    test("theDefaultsTheReadmeDocumentsAreTheOnesApplied", () =>
    {
        const engine = createSmartTextInput({});

        engine.register({
            trigger: "@", name: "mention", activation: { minQueryLength: 2 },
            dataSource: { query: async () => [] },
        } as never);

        expect(engine.getTriggers()[0].activation).toEqual({
            requireWhitespaceBefore: false,
            minQueryLength: 2,
            maxQueryLength: 50,
            cancelChars: [],
            escapeChar: null,
            suppressIn: [],
        });

        engine.destroy();
    });

    test("anUnknownActivationFieldIsRefusedByName", () =>
    {
        // demo/full-demo.html registered two triggers with the field
        // names of an older API — `precedingChar`, `minLength`,
        // `maxLength` — and both were dead. Defaulting around a
        // misspelled field would have left them working and quietly
        // not doing what their author asked for.
        const engine = createSmartTextInput({});

        expect(() => engine.register({
            trigger: "@", name: "mention",
            activation: { precedingChar: "whitespace", minLength: 0 },
            dataSource: { query: async () => [] },
        } as never)).toThrow(/precedingChar, minLength/);

        engine.destroy();
    });
});

describe("setOptions", () =>
{
    test("updatesEngineOptions", () =>
    {
        // DEBT-TEST-1b. The name claims the engine's options were
        // UPDATED and the body claimed only that setOptions survived
        // — which would hold for a method whose whole body was a
        // comment. `queryDebounceMs` reaches the user as the delay
        // before `onTriggerQuery` fires, so the test drives a trigger
        // session and reads the clock (ADR-215).
        vi.useFakeTimers();

        const seen: string[] = [];
        const el = document.createElement("input");
        document.body.appendChild(el);

        const engine = createSmartTextInput({
            queryDebounceMs: 100,
            onTriggerQuery: (e) => { seen.push(e.queryText); },
        });

        engine.register({
            trigger: "@",
            name: "people",
            activation: {},
            dataSource: { query: async () => [] },
        });
        engine.attach(el);

        // The trigger is detected from the text immediately BEFORE the
        // cursor, so the session has to be opened by typing "@" on its
        // own before the query characters follow it. A test that set
        // the whole string at once opened no session at all.
        const type = (value: string): void =>
        {
            el.value = value;
            el.selectionStart = value.length;
            el.selectionEnd = value.length;
            el.dispatchEvent(new Event("input", { bubbles: true }));
        };

        type("@");
        type("@ab");
        vi.advanceTimersByTime(150);

        expect(seen).toEqual(["ab"]);

        engine.setOptions({ queryDebounceMs: 300 });

        type("@abc");
        vi.advanceTimersByTime(150);

        // The old 100 ms would already have fired by here.
        expect(seen).toEqual(["ab"]);

        vi.advanceTimersByTime(200);
        expect(seen).toEqual(["ab", "abc"]);

        engine.destroy();
        el.remove();
        vi.useRealTimers();
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

    test("destroyCalledTwice_IsIdempotent", () =>
    {
        const engine = createSmartTextInput();
        const input = document.createElement("input");
        document.body.appendChild(input);
        engine.attach(input);
        const probe = destroyProbe();

        engine.destroy();
        const first = probe.total();
        engine.destroy();

        expect(first).toBeGreaterThan(0);
        expect(probe.total()).toBe(first);
        probe.restore();
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
    test("attachContentEditable_ReadsTheElementsText", () =>
    {
        // DEBT-TEST-1b. "Detects correctly" is a claim about WHICH
        // adapter was built, and the two adapters are told apart by
        // where they read from. A contenteditable div has textContent
        // and no `value`, so content arriving at all is the proof.
        const div = document.createElement("div");
        div.contentEditable = "true";
        container.appendChild(div);
        const engine = createSmartTextInput();
        const seen: string[] = [];
        engine.on("content:change",
            (p: { content: string }) => { seen.push(p.content); });

        engine.attach(div);
        div.textContent = "typed into a div";
        div.dispatchEvent(new Event("input", { bubbles: true }));

        expect(seen).toEqual(["typed into a div"]);
        engine.destroy();
    });

    test("explicitAdapterType_OverridesAutoDetect", () =>
    {
        // The override has to be VISIBLE, or the parameter is
        // decoration. The two adapters are told apart by where they
        // read: PlainText reads `value`, ContentEditable reads
        // `textContent`. A textarea has both, and they disagree the
        // moment anything is typed, which makes it the one element
        // that can answer this question without either adapter
        // meeting a property its element does not have.
        //
        // THE OTHER DIRECTION WAS TRIED FIRST AND IS A TRAP. Forcing
        // "plaintext" onto a contenteditable div makes the handler
        // read `value` off a div, and the resulting TypeError is
        // swallowed by jsdom's listener boundary — the test sees no
        // event, no throw and no log, which is three ways of learning
        // nothing.
        const textarea = document.createElement("textarea");
        container.appendChild(textarea);
        const engine = createSmartTextInput();
        const seen: string[] = [];
        engine.on("content:change",
            (p: { content: string }) => { seen.push(p.content); });

        engine.attach(textarea, "contenteditable");
        textarea.value = "typed";
        textarea.dispatchEvent(new Event("input", { bubbles: true }));

        // Auto-detection would have built the PlainText adapter and
        // reported "typed". The override built the other one, which
        // reads textContent, and nothing has written to that.
        expect(seen).toEqual([""]);
        engine.destroy();
    });

    test("explicitPlaintextOnADiv_RefusesAtAttach", () =>
    {
        // DEBT-STI-1, closed. This used to succeed, and the first
        // keystroke then threw `Cannot read properties of undefined
        // (reading 'slice')` from inside the input listener, where
        // jsdom's boundary swallows it — no event, no throw, no log.
        // The refusal now happens while the caller is on the stack.
        const div = document.createElement("div");
        div.contentEditable = "true";
        container.appendChild(div);
        const engine = createSmartTextInput();

        expect(() => engine.attach(div, "plaintext"))
            .toThrow(/needs an <input> or a <textarea>/);
        engine.destroy();
    });

    test("explicitContenteditableOnAPlainDiv_RefusesAtAttach", () =>
    {
        // The other direction. A div WITHOUT the attribute has no
        // contenteditable behaviour to drive, and `detectAdapterType`
        // already refuses it — this is the branch that skips detection.
        const div = document.createElement("div");
        container.appendChild(div);
        const engine = createSmartTextInput();

        expect(() => engine.attach(div, "contenteditable"))
            .toThrow(/needs an element with contenteditable/);
        engine.destroy();
    });

    test("autoDetectOnATextarea_IsTheControlForTheOverrideAbove", () =>
    {
        // Same element, same keystroke, no override. Without this the
        // test above passes whenever `attach` quietly does nothing.
        const textarea = document.createElement("textarea");
        container.appendChild(textarea);
        const engine = createSmartTextInput();
        const seen: string[] = [];
        engine.on("content:change",
            (p: { content: string }) => { seen.push(p.content); });

        engine.attach(textarea);
        textarea.value = "typed";
        textarea.dispatchEvent(new Event("input", { bubbles: true }));

        expect(seen).toEqual(["typed"]);
        engine.destroy();
    });
});

// ============================================================================
// ATTACH IS NOT REPEATABLE — UNUSED-1
// ============================================================================

describe("attach refuses a second element", () =>
{
    // Nothing checked whether the engine was already attached, so a
    // second `attach()` overwrote `this.adapter` without destroying
    // the first and silently rebound to the new element.
    // `targetElement` is the state that was already there for it,
    // written by attach, cleared by detach and read nowhere.
    test("attaching twice throws and names detach", () =>
    {
        const a = document.createElement("input");
        const b = document.createElement("input");
        document.body.append(a, b);
        const engine = createSmartTextInput();
        engine.attach(a);

        expect(() => engine.attach(b)).toThrow(/Already attached.*detach\(\)/s);

        engine.destroy();
        a.remove();
        b.remove();
    });

    test("detach first, then attach again, wires the NEW element", () =>
    {
        // `.not.toThrow()` would be the accept half of the pair
        // above and a correct positive control -- and it would also
        // hold for a detach that unwired everything and an attach
        // that wired nothing back. Typing into the second element
        // is what separates those.
        vi.useFakeTimers();

        const seen: string[] = [];
        const a = document.createElement("input");
        const b = document.createElement("input");
        document.body.append(a, b);
        const engine = createSmartTextInput({
            onTriggerQuery: (e) => { seen.push(e.queryText); },
        });
        engine.register({
            trigger: "@",
            name: "people",
            dataSource: { query: async () => [] },
        });
        engine.attach(a);

        engine.detach();
        engine.attach(b);

        const type = (value: string): void =>
        {
            b.value = value;
            b.selectionStart = value.length;
            b.selectionEnd = value.length;
            b.dispatchEvent(new Event("input", { bubbles: true }));
        };

        type("@");
        type("@zz");
        vi.advanceTimersByTime(200);

        expect(seen).toEqual(["zz"]);

        engine.destroy();
        a.remove();
        b.remove();
        vi.useRealTimers();
    });
});
