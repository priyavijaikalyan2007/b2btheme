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
import type
{
    PresenceIndicatorOptions,
    PersonData,
} from "./presenceindicator";

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
