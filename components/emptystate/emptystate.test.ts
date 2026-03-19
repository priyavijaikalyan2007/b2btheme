/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: EmptyState
 * Comprehensive Vitest unit tests for the EmptyState component.
 * Covers: factory, constructor, options, rendering with icon/heading/
 * description, action button callback, secondary link, setters,
 * show/hide, and destroy.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import
{
    EmptyState,
    createEmptyState,
} from "./emptystate";
import type { EmptyStateOptions } from "./emptystate";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLElement;

function makeOptions(overrides?: Partial<EmptyStateOptions>): EmptyStateOptions
{
    return {
        heading: "No items found",
        description: "Create your first item to get started.",
        icon: "bi-inbox",
        ...overrides,
    };
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    container = document.createElement("div");
    container.id = "emptystate-test-container";
    document.body.appendChild(container);
});

afterEach(() =>
{
    container.remove();
});

// ============================================================================
// FACTORY — createEmptyState
// ============================================================================

describe("createEmptyState", () =>
{
    test("createEmptyState_ValidOptions_ReturnsEmptyStateInstance", () =>
    {
        const es = createEmptyState("emptystate-test-container", makeOptions());
        expect(es).toBeInstanceOf(EmptyState);
        es.destroy();
    });

    test("createEmptyState_ValidOptions_AppendsToContainer", () =>
    {
        const es = createEmptyState("emptystate-test-container", makeOptions());
        expect(container.querySelector(".emptystate")).not.toBeNull();
        es.destroy();
    });
});

// ============================================================================
// CONSTRUCTOR
// ============================================================================

describe("EmptyState constructor", () =>
{
    test("Constructor_WithHeading_CreatesInstance", () =>
    {
        const es = new EmptyState(makeOptions());
        expect(es.getElement()).toBeInstanceOf(HTMLElement);
        es.destroy();
    });

    test("Constructor_DefaultSize_IsMd", () =>
    {
        const es = new EmptyState(makeOptions());
        const el = es.getElement();
        expect(el?.classList.contains("emptystate-md")).toBe(true);
        es.destroy();
    });

    test("Constructor_SizeSm_HasSmClass", () =>
    {
        const es = new EmptyState(makeOptions({ size: "sm" }));
        const el = es.getElement();
        expect(el?.classList.contains("emptystate-sm")).toBe(true);
        es.destroy();
    });

    test("Constructor_SizeLg_HasLgClass", () =>
    {
        const es = new EmptyState(makeOptions({ size: "lg" }));
        const el = es.getElement();
        expect(el?.classList.contains("emptystate-lg")).toBe(true);
        es.destroy();
    });

    test("Constructor_Compact_HasCompactClass", () =>
    {
        const es = new EmptyState(makeOptions({ compact: true }));
        const el = es.getElement();
        expect(el?.classList.contains("emptystate-compact")).toBe(true);
        es.destroy();
    });
});

// ============================================================================
// RENDERING — ICON
// ============================================================================

describe("EmptyState icon rendering", () =>
{
    test("Render_WithIcon_RendersIconElement", () =>
    {
        const es = new EmptyState(makeOptions());
        es.show("emptystate-test-container");
        const icon = container.querySelector(".emptystate-icon");
        expect(icon).not.toBeNull();
        expect(icon?.classList.contains("bi-inbox")).toBe(true);
        es.destroy();
    });

    test("Render_DefaultIcon_UsesInbox", () =>
    {
        const es = new EmptyState(makeOptions({ icon: undefined }));
        es.show("emptystate-test-container");
        const icon = container.querySelector(".emptystate-icon");
        expect(icon?.classList.contains("bi-inbox")).toBe(true);
        es.destroy();
    });

    test("Render_IconHasAriaHidden", () =>
    {
        const es = new EmptyState(makeOptions());
        es.show("emptystate-test-container");
        const icon = container.querySelector(".emptystate-icon");
        expect(icon?.getAttribute("aria-hidden")).toBe("true");
        es.destroy();
    });

    test("Render_WithIllustration_UsesIllustrationInsteadOfIcon", () =>
    {
        const illus = document.createElement("img");
        illus.src = "test.png";
        const es = new EmptyState(makeOptions({ illustration: illus }));
        es.show("emptystate-test-container");
        const illusWrap = container.querySelector(".emptystate-illustration");
        expect(illusWrap).not.toBeNull();
        const icon = container.querySelector(".emptystate-icon");
        expect(icon).toBeNull();
        es.destroy();
    });
});

// ============================================================================
// RENDERING — HEADING
// ============================================================================

describe("EmptyState heading rendering", () =>
{
    test("Render_WithHeading_RendersHeadingText", () =>
    {
        const es = new EmptyState(makeOptions());
        es.show("emptystate-test-container");
        const heading = container.querySelector(".emptystate-heading");
        expect(heading).not.toBeNull();
        expect(heading?.textContent).toBe("No items found");
        es.destroy();
    });

    test("Render_SizeSm_UsesH5Tag", () =>
    {
        const es = new EmptyState(makeOptions({ size: "sm" }));
        es.show("emptystate-test-container");
        const heading = container.querySelector(".emptystate-heading");
        expect(heading?.tagName.toLowerCase()).toBe("h5");
        es.destroy();
    });

    test("Render_SizeLg_UsesH3Tag", () =>
    {
        const es = new EmptyState(makeOptions({ size: "lg" }));
        es.show("emptystate-test-container");
        const heading = container.querySelector(".emptystate-heading");
        expect(heading?.tagName.toLowerCase()).toBe("h3");
        es.destroy();
    });
});

// ============================================================================
// RENDERING — DESCRIPTION
// ============================================================================

describe("EmptyState description rendering", () =>
{
    test("Render_WithDescription_RendersDescriptionText", () =>
    {
        const es = new EmptyState(makeOptions());
        es.show("emptystate-test-container");
        const desc = container.querySelector(".emptystate-description");
        expect(desc?.textContent).toBe("Create your first item to get started.");
        es.destroy();
    });

    test("Render_WithoutDescription_HidesDescriptionElement", () =>
    {
        const es = new EmptyState(makeOptions({ description: undefined }));
        es.show("emptystate-test-container");
        const desc = container.querySelector(".emptystate-description") as HTMLElement;
        expect(desc?.style.display).toBe("none");
        es.destroy();
    });
});

// ============================================================================
// ACTION BUTTON
// ============================================================================

describe("EmptyState action button", () =>
{
    test("Render_WithActionLabel_RendersButton", () =>
    {
        const es = new EmptyState(makeOptions({
            actionLabel: "Create Project",
        }));
        es.show("emptystate-test-container");
        const btn = container.querySelector(".emptystate-action") as HTMLElement;
        expect(btn).not.toBeNull();
        expect(btn?.textContent).toContain("Create Project");
        es.destroy();
    });

    test("Render_WithoutActionLabel_HidesButton", () =>
    {
        const es = new EmptyState(makeOptions());
        es.show("emptystate-test-container");
        const btn = container.querySelector(".emptystate-action") as HTMLElement;
        expect(btn?.style.display).toBe("none");
        es.destroy();
    });

    test("ActionClick_WithOnAction_FiresCallback", () =>
    {
        const onAction = vi.fn();
        const es = new EmptyState(makeOptions({
            actionLabel: "Go",
            onAction,
        }));
        es.show("emptystate-test-container");
        const btn = container.querySelector(".emptystate-action") as HTMLElement;
        btn?.click();
        expect(onAction).toHaveBeenCalledOnce();
        es.destroy();
    });

    test("Render_WithActionIcon_RendersIconInButton", () =>
    {
        const es = new EmptyState(makeOptions({
            actionLabel: "Add",
            actionIcon: "bi-plus-lg",
        }));
        es.show("emptystate-test-container");
        const btn = container.querySelector(".emptystate-action");
        const icon = btn?.querySelector("i.bi-plus-lg");
        expect(icon).not.toBeNull();
        es.destroy();
    });
});

// ============================================================================
// SECONDARY LINK
// ============================================================================

describe("EmptyState secondary link", () =>
{
    test("Render_WithSecondaryLabel_RendersLink", () =>
    {
        const es = new EmptyState(makeOptions({
            secondaryLabel: "Learn more",
        }));
        es.show("emptystate-test-container");
        const link = container.querySelector(".emptystate-secondary") as HTMLElement;
        expect(link?.textContent).toBe("Learn more");
        es.destroy();
    });

    test("SecondaryClick_WithOnSecondary_FiresCallback", () =>
    {
        const onSecondary = vi.fn();
        const es = new EmptyState(makeOptions({
            secondaryLabel: "Learn more",
            onSecondary,
        }));
        es.show("emptystate-test-container");
        const link = container.querySelector(".emptystate-secondary") as HTMLElement;
        link?.click();
        expect(onSecondary).toHaveBeenCalledOnce();
        es.destroy();
    });
});

// ============================================================================
// SETTERS
// ============================================================================

describe("EmptyState setters", () =>
{
    test("SetHeading_NewText_UpdatesHeading", () =>
    {
        const es = new EmptyState(makeOptions());
        es.show("emptystate-test-container");
        es.setHeading("Updated Heading");
        const heading = container.querySelector(".emptystate-heading");
        expect(heading?.textContent).toBe("Updated Heading");
        es.destroy();
    });

    test("SetDescription_NewText_UpdatesDescription", () =>
    {
        const es = new EmptyState(makeOptions());
        es.show("emptystate-test-container");
        es.setDescription("Updated description.");
        const desc = container.querySelector(".emptystate-description");
        expect(desc?.textContent).toBe("Updated description.");
        es.destroy();
    });

    test("SetIcon_NewClass_UpdatesIcon", () =>
    {
        const es = new EmptyState(makeOptions());
        es.show("emptystate-test-container");
        es.setIcon("bi-folder");
        const icon = container.querySelector(".emptystate-icon");
        expect(icon?.classList.contains("bi-folder")).toBe(true);
        es.destroy();
    });
});

// ============================================================================
// HANDLE — destroy
// ============================================================================

describe("EmptyState destroy", () =>
{
    test("Destroy_AfterShow_RemovesFromDOM", () =>
    {
        const es = new EmptyState(makeOptions());
        es.show("emptystate-test-container");
        expect(container.querySelector(".emptystate")).not.toBeNull();
        es.destroy();
        expect(container.querySelector(".emptystate")).toBeNull();
    });

    test("Destroy_GetElement_ReturnsNull", () =>
    {
        const es = new EmptyState(makeOptions());
        es.destroy();
        expect(es.getElement()).toBeNull();
    });

    test("Destroy_CalledTwice_IsIdempotent", () =>
    {
        const es = new EmptyState(makeOptions());
        es.destroy();
        expect(() => es.destroy()).not.toThrow();
    });
});
