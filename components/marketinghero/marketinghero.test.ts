/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: MarketingHero
 * Unit tests for the MarketingHero component. Covers the canonical structure
 * contract, layout modifiers, breakpoint classes, actions, the aside slot,
 * escaping, and teardown.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { MarketingHero, createMarketingHero } from "./marketinghero";
import type { MarketingHeroOptions } from "./marketinghero";

let container: HTMLElement;

function makeOptions(overrides?: Partial<MarketingHeroOptions>): MarketingHeroOptions
{
    return {
        title: "Ship enterprise UI faster",
        lede: "A compact Bootstrap 5 theme and component library.",
        ...overrides,
    };
}

beforeEach(() =>
{
    container = document.createElement("div");
    container.id = "marketinghero-test-container";
    document.body.appendChild(container);
});

afterEach(() =>
{
    container.remove();
});

// ============================================================================
// CANONICAL STRUCTURE — the contract the stylesheet depends on
// ============================================================================

describe("MarketingHero canonical structure", () =>
{
    test("Render_Always_RootIsSectionWithHeroClass", () =>
    {
        const hero = createMarketingHero("marketinghero-test-container", makeOptions());
        const root = container.querySelector(".marketinghero");
        expect(root?.tagName.toLowerCase()).toBe("section");
        hero.destroy();
    });

    test("Render_Always_ContentPrecedesAside", () =>
    {
        const aside = document.createElement("div");
        const hero = createMarketingHero("marketinghero-test-container",
            makeOptions({ aside }));
        const root = container.querySelector(".marketinghero") as HTMLElement;
        const children = Array.from(root.children).map((c) => c.className);
        expect(children).toEqual(["marketinghero-content", "marketinghero-aside"]);
        hero.destroy();
    });

    test("Render_WithEyebrow_TitleIsFirstInDocumentOrder", () =>
    {
        const hero = createMarketingHero("marketinghero-test-container",
            makeOptions({ eyebrow: "New" }));
        const content = container.querySelector(".marketinghero-content") as HTMLElement;
        expect(content.children[0].classList.contains("marketinghero-title")).toBe(true);
        expect(content.children[1].classList.contains("marketinghero-eyebrow")).toBe(true);
        hero.destroy();
    });

    test("Render_Always_TitleIsH1WithIdReferencedByAriaLabelledby", () =>
    {
        const hero = createMarketingHero("marketinghero-test-container", makeOptions());
        const root = container.querySelector(".marketinghero") as HTMLElement;
        const title = container.querySelector(".marketinghero-title") as HTMLElement;
        expect(title.tagName.toLowerCase()).toBe("h1");
        expect(root.getAttribute("aria-labelledby")).toBe(title.id);
        expect(title.id).not.toBe("");
        hero.destroy();
    });
});

// ============================================================================
// LAYOUT MODIFIERS
// ============================================================================

describe("MarketingHero layout", () =>
{
    test("Layout_Omitted_IsStackedWithNoModifier", () =>
    {
        const hero = createMarketingHero("marketinghero-test-container", makeOptions());
        const root = container.querySelector(".marketinghero") as HTMLElement;
        expect(root.classList.contains("marketinghero-split")).toBe(false);
        expect(root.classList.contains("marketinghero-centered")).toBe(false);
        hero.destroy();
    });

    test("Layout_Centered_AddsCenteredClass", () =>
    {
        const hero = createMarketingHero("marketinghero-test-container",
            makeOptions({ layout: "centered" }));
        const root = container.querySelector(".marketinghero") as HTMLElement;
        expect(root.classList.contains("marketinghero-centered")).toBe(true);
        hero.destroy();
    });

    test("Layout_Split_AddsSplitAndDefaultStackLgClass", () =>
    {
        const hero = createMarketingHero("marketinghero-test-container",
            makeOptions({ layout: "split" }));
        const root = container.querySelector(".marketinghero") as HTMLElement;
        expect(root.classList.contains("marketinghero-split")).toBe(true);
        expect(root.classList.contains("marketinghero-stack-lg")).toBe(true);
        hero.destroy();
    });

    test("StackBelow_Md_AddsStackMdClass", () =>
    {
        const hero = createMarketingHero("marketinghero-test-container",
            makeOptions({ layout: "split", stackBelow: "md" }));
        const root = container.querySelector(".marketinghero") as HTMLElement;
        expect(root.classList.contains("marketinghero-stack-md")).toBe(true);
        hero.destroy();
    });

    test("StackBelow_WithoutSplit_AddsNoStackClass", () =>
    {
        const hero = createMarketingHero("marketinghero-test-container",
            makeOptions({ stackBelow: "md" }));
        const root = container.querySelector(".marketinghero") as HTMLElement;
        expect(root.className).not.toContain("marketinghero-stack");
        hero.destroy();
    });
});

// ============================================================================
// OPTIONAL PARTS — omitted renders nothing, not an empty element
// ============================================================================

describe("MarketingHero optional parts", () =>
{
    test("Eyebrow_Omitted_RendersNoEyebrowElement", () =>
    {
        const hero = createMarketingHero("marketinghero-test-container", makeOptions());
        expect(container.querySelector(".marketinghero-eyebrow")).toBeNull();
        hero.destroy();
    });

    test("Lede_Omitted_RendersNoLedeElement", () =>
    {
        const hero = createMarketingHero("marketinghero-test-container",
            makeOptions({ lede: undefined }));
        expect(container.querySelector(".marketinghero-lede")).toBeNull();
        hero.destroy();
    });

    test("Actions_Omitted_RendersNoActionsElement", () =>
    {
        const hero = createMarketingHero("marketinghero-test-container", makeOptions());
        expect(container.querySelector(".marketinghero-actions")).toBeNull();
        hero.destroy();
    });

    test("Aside_Omitted_RendersNoAsideElement", () =>
    {
        const hero = createMarketingHero("marketinghero-test-container", makeOptions());
        expect(container.querySelector(".marketinghero-aside")).toBeNull();
        hero.destroy();
    });

    test("Aside_Provided_ContainsTheGivenElement", () =>
    {
        const aside = document.createElement("img");
        aside.id = "hero-shot";
        const hero = createMarketingHero("marketinghero-test-container",
            makeOptions({ aside }));
        expect(container.querySelector(".marketinghero-aside #hero-shot")).not.toBeNull();
        hero.destroy();
    });
});

// ============================================================================
// ACTIONS
// ============================================================================

describe("MarketingHero actions", () =>
{
    test("PrimaryAction_WithHref_RendersAnchor", () =>
    {
        const hero = createMarketingHero("marketinghero-test-container",
            makeOptions({ primaryAction: { text: "Get started", href: "/signup" } }));
        const el = container.querySelector(".marketinghero-actions a") as HTMLAnchorElement;
        expect(el.getAttribute("href")).toBe("/signup");
        expect(el.textContent).toBe("Get started");
        expect(el.classList.contains("btn-primary")).toBe(true);
        hero.destroy();
    });

    test("PrimaryAction_WithOnClickOnly_RendersButtonAndFires", () =>
    {
        const onClick = vi.fn();
        const hero = createMarketingHero("marketinghero-test-container",
            makeOptions({ primaryAction: { text: "Open", onClick } }));
        const el = container.querySelector(".marketinghero-actions button") as HTMLElement;
        el.click();
        expect(onClick).toHaveBeenCalledOnce();
        hero.destroy();
    });

    test("SecondaryAction_Provided_RendersOutlineVariantAfterPrimary", () =>
    {
        const hero = createMarketingHero("marketinghero-test-container", makeOptions({
            primaryAction: { text: "Get started", href: "/signup" },
            secondaryAction: { text: "Read the docs", href: "/docs" },
        }));
        const actions = container.querySelector(".marketinghero-actions") as HTMLElement;
        expect(actions.children.length).toBe(2);
        expect(actions.children[1].classList.contains("btn-outline-secondary")).toBe(true);
        hero.destroy();
    });

    test("SecondaryAction_WithoutPrimary_StillRenders", () =>
    {
        const hero = createMarketingHero("marketinghero-test-container",
            makeOptions({ secondaryAction: { text: "Read the docs", href: "/docs" } }));
        const actions = container.querySelector(".marketinghero-actions") as HTMLElement;
        expect(actions.children.length).toBe(1);
        hero.destroy();
    });
});

// ============================================================================
// SAFETY AND LIFECYCLE
// ============================================================================

describe("MarketingHero safety and lifecycle", () =>
{
    test("Title_ContainingMarkup_RendersAsText", () =>
    {
        const hero = createMarketingHero("marketinghero-test-container",
            makeOptions({ title: "<script>alert(1)</script>" }));
        const title = container.querySelector(".marketinghero-title") as HTMLElement;
        expect(title.querySelector("script")).toBeNull();
        expect(title.textContent).toBe("<script>alert(1)</script>");
        hero.destroy();
    });

    test("Constructor_MissingTitle_LogsAndDoesNotThrow", () =>
    {
        const spy = vi.spyOn(console, "error").mockImplementation(() => {});
        expect(() => new MarketingHero({ title: "" })).not.toThrow();
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });

    test("Show_UnknownContainer_LogsAndDoesNotThrow", () =>
    {
        const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const hero = new MarketingHero(makeOptions());
        expect(() => hero.show("no-such-container")).not.toThrow();
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
        hero.destroy();
    });

    test("Destroy_AfterShow_RemovesFromDOM", () =>
    {
        const hero = createMarketingHero("marketinghero-test-container", makeOptions());
        expect(container.querySelector(".marketinghero")).not.toBeNull();
        hero.destroy();
        expect(container.querySelector(".marketinghero")).toBeNull();
    });

    test("Destroy_CalledTwice_IsIdempotent", () =>
    {
        const hero = createMarketingHero("marketinghero-test-container", makeOptions());
        hero.destroy();
        expect(() => hero.destroy()).not.toThrow();
    });
});
