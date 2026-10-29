/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: d6e7f8a9-b0c1-4d2e-3f4a-5b6c7d8e9f0a
 *
 * ⚓ TESTS: PresenceIndicator
 * Vitest unit tests for the PresenceIndicator component.
 * Covers: factory, people rendering, overflow badge, expand/collapse,
 * show/hide, destroy.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import
{
    PresenceIndicator,
    createPresenceIndicator,
} from "./presenceindicator";
import { createPersonChip } from "../personchip/personchip";
import type
{
    PresenceIndicatorOptions,
    PersonData,
} from "./presenceindicator";

// Importing PersonChip registers window.createPersonChip. Only the surface
// contract tests want the chip path, and they install it themselves, so every
// other test here keeps running on the fallback avatars.
delete window.createPersonChip;

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLElement;

function makePeople(count: number): PersonData[]
{
    const people: PersonData[] = [];
    for (let i = 0; i < count; i++)
    {
        people.push({
            id: `person-${i}`,
            name: `Person ${i}`,
            email: `person${i}@example.com`,
            status: "online",
        });
    }
    return people;
}

function makeOptions(
    overrides?: Partial<PresenceIndicatorOptions>
): PresenceIndicatorOptions
{
    return {
        people: makePeople(3),
        ...overrides,
    };
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    container = document.createElement("div");
    container.id = "presence-test-container";
    document.body.appendChild(container);
});

afterEach(() =>
{
    container.remove();
});

// ============================================================================
// FACTORY
// ============================================================================

describe("PresenceIndicator factory", () =>
{
    test("Constructor_ValidOptions_CreatesInstance", () =>
    {
        const indicator = new PresenceIndicator(makeOptions());
        expect(indicator).toBeDefined();
        expect(indicator.getElement()).toBeInstanceOf(HTMLElement);
        indicator.destroy();
    });

    test("createPresenceIndicator_WithContainerId_MountsInContainer", () =>
    {
        const indicator = createPresenceIndicator(
            "presence-test-container", makeOptions()
        );
        expect(
            container.querySelector(".presence-indicator")
        ).not.toBeNull();
        indicator.destroy();
    });

    test("createPresenceIndicator_NullContainerId_DoesNotMount", () =>
    {
        const indicator = createPresenceIndicator(null, makeOptions());
        expect(
            container.querySelector(".presence-indicator")
        ).toBeNull();
        indicator.destroy();
    });
});

// ============================================================================
// PEOPLE RENDERING
// ============================================================================

describe("PresenceIndicator people", () =>
{
    test("ThreePeople_RendersThreeAvatars", () =>
    {
        const indicator = new PresenceIndicator(makeOptions({
            people: makePeople(3),
        }));
        indicator.show("presence-test-container");
        const avatars = container.querySelectorAll(
            ".presence-indicator-avatar"
        );
        expect(avatars.length).toBe(3);
        indicator.destroy();
    });

    test("MoreThanMax_ShowsOverflowBadge", () =>
    {
        const indicator = new PresenceIndicator(makeOptions({
            people: makePeople(6),
            maxVisible: 4,
        }));
        indicator.show("presence-test-container");
        const overflow = container.querySelector(
            ".presence-indicator-overflow"
        );
        expect(overflow).not.toBeNull();
        indicator.destroy();
    });
});

// ============================================================================
// SET PEOPLE
// ============================================================================

describe("PresenceIndicator setPeople", () =>
{
    test("SetPeople_UpdatesList", () =>
    {
        const indicator = new PresenceIndicator(makeOptions({
            people: makePeople(2),
        }));
        indicator.show("presence-test-container");
        indicator.setPeople(makePeople(5));
        const avatars = container.querySelectorAll(
            ".presence-indicator-avatar"
        );
        expect(avatars.length).toBeGreaterThanOrEqual(4);
        indicator.destroy();
    });
});

// ============================================================================
// LIFECYCLE
// ============================================================================

describe("PresenceIndicator lifecycle", () =>
{
    test("Show_AppendsToContainer", () =>
    {
        const indicator = new PresenceIndicator(makeOptions());
        indicator.show("presence-test-container");
        expect(
            container.querySelector(".presence-indicator")
        ).not.toBeNull();
        indicator.destroy();
    });

    test("Destroy_RemovesFromDOM", () =>
    {
        const indicator = new PresenceIndicator(makeOptions());
        indicator.show("presence-test-container");
        indicator.destroy();
        expect(
            container.querySelector(".presence-indicator")
        ).toBeNull();
    });

    test("Destroy_ThrowsOnGetElement", () =>
    {
        const indicator = new PresenceIndicator(makeOptions());
        indicator.destroy();
        expect(() => indicator.getElement()).toThrow();
    });
});

// ============================================================================
// SURFACE CONTRACT (B4): additive on("click"), getState/setState, setData and
// the clickable option. onClick keeps firing first, exactly once.
// ============================================================================

describe("surface contract (B4)", () =>
{
    beforeEach(() =>
    {
        window.createPersonChip = createPersonChip;
    });

    afterEach(() =>
    {
        delete window.createPersonChip;
    });

    function makeExpanded(overrides?: Partial<PresenceIndicatorOptions>)
    {
        const indicator = createPresenceIndicator(
            "presence-test-container", makeOptions({ expanded: true, ...overrides })
        );
        const rows = container.querySelectorAll<HTMLElement>(".presence-indicator-person");
        const chipOf = (i: number) => rows[i].firstElementChild as HTMLElement;

        return { indicator, chipOf };
    }

    test("on(click)_HearsThePerson_AfterOnClick_AndUnsubscribeStops", () =>
    {
        const order: string[] = [];
        const { indicator, chipOf } = makeExpanded({ onClick: (p) => order.push(`option:${p.id}`) });
        const off = indicator.on("click", (p) => order.push(`channel:${(p as PersonData).id}`));

        chipOf(1).click();
        off();
        chipOf(1).click();

        expect(order).toEqual(["option:person-1", "channel:person-1", "option:person-1"]);
        indicator.destroy();
    });

    test("on(click)_WithClickableAndNoOnClick_StillEmits_OnClickAndEnter", () =>
    {
        const { indicator, chipOf } = makeExpanded({ clickable: true });
        const heard = vi.fn();
        indicator.on("click", heard);

        chipOf(0).click();
        chipOf(2).dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

        expect(heard).toHaveBeenCalledTimes(2);
        expect((heard.mock.calls[0][0] as PersonData).id).toBe("person-0");
        expect((heard.mock.calls[1][0] as PersonData).id).toBe("person-2");
        indicator.destroy();
    });

    test("on(click)_WithoutClickableOrOnClick_AvatarsAreNotClickable", () =>
    {
        const { indicator, chipOf } = makeExpanded();
        const heard = vi.fn();
        indicator.on("click", heard);

        chipOf(0).click();

        expect(heard).not.toHaveBeenCalled();
        expect(chipOf(0).classList.contains("person-chip-clickable")).toBe(false);
        indicator.destroy();
    });

    test("on(click)_PayloadIsPlainJsonCopy_HandlerCannotMutateTheComponent", () =>
    {
        const people: PersonData[] = [{
            id: "a", name: "Ada Lovelace", email: "ada@example.com", role: "Engineer",
            status: "busy", metadata: { team: "core" },
        }];
        const { indicator, chipOf } = makeExpanded({ people, clickable: true });
        let payload: PersonData | undefined;
        indicator.on("click", (p) =>
        {
            payload = p as PersonData;
            payload.name = "Mutated";
            payload.metadata!.team = "mutated";
        });

        chipOf(0).click();

        expect(JSON.parse(JSON.stringify(payload))).toEqual({
            id: "a", name: "Mutated", email: "ada@example.com", role: "Engineer",
            status: "busy", metadata: { team: "mutated" },
        });
        expect(payload).not.toBe(people[0]);
        expect(indicator.getPeople()[0]).toEqual({
            id: "a", name: "Ada Lovelace", email: "ada@example.com", role: "Engineer",
            status: "busy", metadata: { team: "core" },
        });
        indicator.destroy();
    });

    test("on(click)_ThrowingHandler_DoesNotStopTheNextHandler", () =>
    {
        const { indicator, chipOf } = makeExpanded({ clickable: true });
        const errSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
        const next = vi.fn();
        indicator.on("click", () => { throw new Error("boom"); });
        indicator.on("click", next);

        chipOf(0).click();

        expect(next).toHaveBeenCalledTimes(1);
        errSpy.mockRestore();
        indicator.destroy();
    });

    test("on_UnknownChannel_Throws_NamingTheValidChannel", () =>
    {
        const indicator = new PresenceIndicator(makeOptions());

        expect(() => indicator.on("bogus", () => undefined)).toThrow("click");
        indicator.destroy();
    });

    test("setData_Throws_NamingTheComponentAndTheSetters", () =>
    {
        const indicator = new PresenceIndicator(makeOptions());

        expect(() => indicator.setData("people", [])).toThrow("PresenceIndicator");
        expect(() => indicator.setData("people", [])).toThrow("no data slots");
        expect(() => indicator.setData("people", [])).toThrow("setPeople()");
        indicator.destroy();
    });

    test("getState_SetState_RoundTripExpanded", () =>
    {
        const indicator = new PresenceIndicator(makeOptions());
        expect(indicator.getState()).toEqual({ expanded: false });

        indicator.setState({ expanded: true });
        expect(indicator.isExpanded()).toBe(true);
        const captured = indicator.getState();
        expect(captured).toEqual({ expanded: true });

        indicator.setState({ expanded: false });
        expect(indicator.isExpanded()).toBe(false);
        indicator.setState(captured);
        expect(indicator.isExpanded()).toBe(true);

        indicator.setState({});
        expect(indicator.isExpanded()).toBe(true);
        indicator.destroy();
    });

    test("setState_Expanded_FiresOnExpandAndOnCollapseOnceEach", () =>
    {
        const order: string[] = [];
        const indicator = new PresenceIndicator(makeOptions({
            onExpand: () => order.push("expand"),
            onCollapse: () => order.push("collapse"),
        }));

        indicator.setState({ expanded: true });
        indicator.setState({ expanded: true });
        indicator.setState({ expanded: false });

        expect(order).toEqual(["expand", "collapse"]);
        indicator.destroy();
    });

    test("destroy_ClearsHandlers", () =>
    {
        const { indicator, chipOf } = makeExpanded({ clickable: true });
        const heard = vi.fn();
        indicator.on("click", heard);
        const chip = chipOf(0);

        indicator.destroy();
        chip.click();

        expect(heard).not.toHaveBeenCalled();
    });
});
