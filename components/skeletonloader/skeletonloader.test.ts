/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a5b
 *
 * ⚓ TESTS: SkeletonLoader
 * Vitest unit tests for the SkeletonLoader component.
 * Covers: factory, presets, lines, DOM structure, show/hide, destroy, ARIA.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import
{
    SkeletonLoader,
    createSkeletonLoader,
} from "./skeletonloader";
import type { SkeletonLoaderOptions } from "./skeletonloader";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLElement;

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    container = document.createElement("div");
    container.id = "skeleton-test-container";
    document.body.appendChild(container);
});

afterEach(() =>
{
    container.remove();
});

// ============================================================================
// FACTORY
// ============================================================================

describe("SkeletonLoader factory", () =>
{
    test("Constructor_NoOptions_CreatesInstance", () =>
    {
        const loader = new SkeletonLoader();
        expect(loader).toBeDefined();
        expect(loader.getElement()).toBeInstanceOf(HTMLElement);
        loader.destroy();
    });

    test("createSkeletonLoader_WithContainerId_MountsInContainer", () =>
    {
        const loader = createSkeletonLoader(
            { preset: "text" }, "skeleton-test-container"
        );
        expect(
            container.querySelector(".skeleton-loader")
        ).not.toBeNull();
        loader.destroy();
    });
});

// ============================================================================
// PRESETS
// ============================================================================

describe("SkeletonLoader presets", () =>
{
    test("TextPreset_RendersLines", () =>
    {
        const loader = new SkeletonLoader({ preset: "text", lines: 4 });
        loader.show("skeleton-test-container");
        const lines = container.querySelectorAll(".skeleton-line");
        expect(lines.length).toBe(4);
        loader.destroy();
    });

    test("AvatarPreset_RendersAvatarBlock", () =>
    {
        const loader = new SkeletonLoader({ preset: "avatar" });
        loader.show("skeleton-test-container");
        expect(
            container.querySelector(".skeleton-avatar")
        ).not.toBeNull();
        loader.destroy();
    });

    test("CardPreset_RendersImageAndLines", () =>
    {
        const loader = new SkeletonLoader({ preset: "card" });
        loader.show("skeleton-test-container");
        expect(
            container.querySelector(".skeleton-card-image")
        ).not.toBeNull();
        expect(
            container.querySelectorAll(".skeleton-line").length
        ).toBeGreaterThan(0);
        loader.destroy();
    });

    test("TablePreset_RendersGridOfCells", () =>
    {
        const loader = new SkeletonLoader({ preset: "table", rows: 3, columns: 2 });
        loader.show("skeleton-test-container");
        const cells = container.querySelectorAll(".skeleton-cell");
        expect(cells.length).toBe(6);
        loader.destroy();
    });

    test("CustomPreset_RendersSingleBlock", () =>
    {
        const loader = new SkeletonLoader({ preset: "custom" });
        loader.show("skeleton-test-container");
        expect(
            container.querySelector(".skeleton-block")
        ).not.toBeNull();
        loader.destroy();
    });
});

// ============================================================================
// ACCESSIBILITY
// ============================================================================

describe("SkeletonLoader ARIA", () =>
{
    test("RootElement_HasRoleStatus", () =>
    {
        const loader = new SkeletonLoader();
        const root = loader.getElement();
        expect(root?.getAttribute("role")).toBe("status");
        loader.destroy();
    });

    test("RootElement_HasAriaBusyTrue", () =>
    {
        const loader = new SkeletonLoader();
        const root = loader.getElement();
        expect(root?.getAttribute("aria-busy")).toBe("true");
        loader.destroy();
    });
});

// ============================================================================
// SHOW / HIDE / DESTROY
// ============================================================================

describe("SkeletonLoader lifecycle", () =>
{
    test("Show_AppendsToContainer", () =>
    {
        const loader = new SkeletonLoader();
        loader.show("skeleton-test-container");
        expect(
            container.querySelector(".skeleton-loader")
        ).not.toBeNull();
        loader.destroy();
    });

    test("Hide_RemovesFromDOM", () =>
    {
        const loader = new SkeletonLoader();
        loader.show("skeleton-test-container");
        loader.hide();
        expect(
            container.querySelector(".skeleton-loader")
        ).toBeNull();
        loader.destroy();
    });

    test("Destroy_NullifiesElement", () =>
    {
        const loader = new SkeletonLoader();
        loader.show("skeleton-test-container");
        loader.destroy();
        expect(loader.getElement()).toBeNull();
    });

    test("Destroy_CalledTwice_IsIdempotent", () =>
    {
        const loader = new SkeletonLoader();
        loader.destroy();
        expect(() => loader.destroy()).not.toThrow();
    });
});
