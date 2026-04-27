/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 *
 * TESTS: MetricCard
 * Vitest unit tests for the MetricCard component (ADR-129).
 * Covers: factory, four lifecycle states, trend variants + intent
 * override, sparkline render, click semantics (a vs button),
 * keyboard activation, ARIA, mutators, destroy.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import
{
    MetricCard,
    createMetricCard,
} from "./metriccard";
import type { MetricCardOptions } from "./metriccard";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLElement;

function makeOptions(
    overrides?: Partial<MetricCardOptions>
): MetricCardOptions
{
    return {
        container,
        label: "Active Users",
        value: 12,
        ...overrides,
    };
}

beforeEach(() =>
{
    container = document.createElement("div");
    container.id = "metric-test-container";
    document.body.appendChild(container);
});

afterEach(() =>
{
    container.remove();
});

// ============================================================================
// FACTORY + DOM STRUCTURE
// ============================================================================

describe("MetricCard factory", () =>
{
    test("Constructor_ValidOptions_CreatesInstance", () =>
    {
        const card = new MetricCard(makeOptions());
        expect(card).toBeDefined();
        expect(card.getRootElement()).toBeInstanceOf(HTMLElement);
        card.destroy();
    });

    test("createMetricCard_MountsInContainer", () =>
    {
        const card = createMetricCard(makeOptions());
        expect(container.querySelector(".metriccard")).not.toBeNull();
        card.destroy();
    });

    test("Constructor_RendersLabelAndValue", () =>
    {
        const card = new MetricCard(makeOptions({
            label: "Diagrams Triggered",
            value: 9738,
        }));
        const root = card.getRootElement()!;
        expect(root.querySelector(".metriccard-label")?.textContent)
            .toBe("Diagrams Triggered");
        expect(root.querySelector(".metriccard-value")?.textContent)
            .toBe("9738");
        card.destroy();
    });

    test("Constructor_StringValue_RendersAsIs", () =>
    {
        const card = new MetricCard(makeOptions({ value: "3.4 GB" }));
        const value = card.getRootElement()!
            .querySelector(".metriccard-value");
        expect(value?.textContent).toBe("3.4 GB");
        card.destroy();
    });

    test("Constructor_OptionalIcon_RendersIconElement", () =>
    {
        const card = new MetricCard(makeOptions({
            icon: "bi-people",
        }));
        const icon = card.getRootElement()!
            .querySelector(".metriccard-icon");
        expect(icon).not.toBeNull();
        expect(icon?.classList.contains("bi-people")).toBe(true);
        expect(icon?.getAttribute("aria-hidden")).toBe("true");
        card.destroy();
    });

    test("Constructor_NoIcon_OmitsIconElement", () =>
    {
        const card = new MetricCard(makeOptions());
        expect(card.getRootElement()!
            .querySelector(".metriccard-icon")).toBeNull();
        card.destroy();
    });
});

// ============================================================================
// SIZE
// ============================================================================

describe("MetricCard size", () =>
{
    test("Constructor_DefaultSize_AppliesMd", () =>
    {
        const card = new MetricCard(makeOptions());
        expect(card.getRootElement()!.classList.contains("metriccard-md"))
            .toBe(true);
        card.destroy();
    });

    test("Constructor_SmSize_AppliesSm", () =>
    {
        const card = new MetricCard(makeOptions({ size: "sm" }));
        expect(card.getRootElement()!.classList.contains("metriccard-sm"))
            .toBe(true);
        card.destroy();
    });
});

// ============================================================================
// TREND
// ============================================================================

describe("MetricCard trend", () =>
{
    test("Constructor_TrendUp_AppliesPositiveClass", () =>
    {
        const card = new MetricCard(makeOptions({
            trend: { direction: "up", text: "+2 this week" },
        }));
        const trend = card.getRootElement()!
            .querySelector(".metriccard-trend");
        expect(trend).not.toBeNull();
        expect(trend?.classList.contains("metriccard-trend-positive"))
            .toBe(true);
        expect(trend?.textContent).toContain("+2 this week");
        card.destroy();
    });

    test("Constructor_TrendDown_AppliesNegativeClass", () =>
    {
        const card = new MetricCard(makeOptions({
            trend: { direction: "down", text: "-3" },
        }));
        const trend = card.getRootElement()!
            .querySelector(".metriccard-trend");
        expect(trend?.classList.contains("metriccard-trend-negative"))
            .toBe(true);
        card.destroy();
    });

    test("Constructor_TrendFlat_AppliesNeutralClass", () =>
    {
        const card = new MetricCard(makeOptions({
            trend: { direction: "flat", text: "no change" },
        }));
        const trend = card.getRootElement()!
            .querySelector(".metriccard-trend");
        expect(trend?.classList.contains("metriccard-trend-neutral"))
            .toBe(true);
        card.destroy();
    });

    test("Constructor_TrendIntentOverride_UsesIntentClass", () =>
    {
        // Errors increased: direction up, semantically negative.
        const card = new MetricCard(makeOptions({
            trend: {
                direction: "up",
                text: "+50 errors",
                intent: "negative",
            },
        }));
        const trend = card.getRootElement()!
            .querySelector(".metriccard-trend");
        expect(trend?.classList.contains("metriccard-trend-negative"))
            .toBe(true);
        expect(trend?.classList.contains("metriccard-trend-positive"))
            .toBe(false);
        card.destroy();
    });

    test("Constructor_TrendArrow_HasAriaHidden", () =>
    {
        const card = new MetricCard(makeOptions({
            trend: { direction: "up", text: "+2" },
        }));
        const arrow = card.getRootElement()!
            .querySelector(".metriccard-trend-arrow");
        expect(arrow?.getAttribute("aria-hidden")).toBe("true");
        card.destroy();
    });
});

// ============================================================================
// SECONDARY
// ============================================================================

describe("MetricCard secondary text", () =>
{
    test("Constructor_Secondary_RendersBelowValue", () =>
    {
        const card = new MetricCard(makeOptions({
            secondary: "of 10 GB cap",
        }));
        const sec = card.getRootElement()!
            .querySelector(".metriccard-secondary");
        expect(sec?.textContent).toBe("of 10 GB cap");
        card.destroy();
    });

    test("Constructor_NoSecondary_OmitsElement", () =>
    {
        const card = new MetricCard(makeOptions());
        expect(card.getRootElement()!
            .querySelector(".metriccard-secondary")).toBeNull();
        card.destroy();
    });
});

// ============================================================================
// SPARKLINE
// ============================================================================

describe("MetricCard sparkline", () =>
{
    test("Constructor_Sparkline_RendersSvg", () =>
    {
        const card = new MetricCard(makeOptions({
            sparkline: [1, 3, 2, 5, 4, 6, 5, 7],
        }));
        const svg = card.getRootElement()!
            .querySelector(".metriccard-sparkline");
        expect(svg).not.toBeNull();
        expect(svg?.tagName.toLowerCase()).toBe("svg");
        expect(svg?.querySelector("polyline")).not.toBeNull();
        card.destroy();
    });

    test("Constructor_SparklineSinglePoint_RendersWithoutError", () =>
    {
        const card = new MetricCard(makeOptions({
            sparkline: [42],
        }));
        const svg = card.getRootElement()!
            .querySelector(".metriccard-sparkline");
        expect(svg).not.toBeNull();
        card.destroy();
    });

    test("Constructor_SparklineEmptyArray_OmitsSvg", () =>
    {
        const card = new MetricCard(makeOptions({ sparkline: [] }));
        expect(card.getRootElement()!
            .querySelector(".metriccard-sparkline")).toBeNull();
        card.destroy();
    });

    test("Constructor_SparklineWithNegativeIntent_AppliesNegativeClass", () =>
    {
        const card = new MetricCard(makeOptions({
            sparkline: [10, 8, 6, 4],
            trend: { direction: "down", text: "-6", intent: "negative" },
        }));
        const svg = card.getRootElement()!
            .querySelector(".metriccard-sparkline");
        expect(svg?.classList.contains("metriccard-sparkline-negative"))
            .toBe(true);
        card.destroy();
    });

    test("Constructor_SparklineHasAriaHidden", () =>
    {
        const card = new MetricCard(makeOptions({
            sparkline: [1, 2, 3],
        }));
        const svg = card.getRootElement()!
            .querySelector(".metriccard-sparkline");
        expect(svg?.getAttribute("aria-hidden")).toBe("true");
        card.destroy();
    });
});

// ============================================================================
// CLICK SEMANTICS — link vs button
// ============================================================================

describe("MetricCard click semantics", () =>
{
    test("Constructor_HrefSet_RootIsAnchor", () =>
    {
        const card = new MetricCard(makeOptions({
            href: "/admin/users",
        }));
        const root = card.getRootElement()!;
        expect(root.tagName.toLowerCase()).toBe("a");
        expect(root.getAttribute("href")).toBe("/admin/users");
        card.destroy();
    });

    test("Constructor_HrefSet_NoButtonRole", () =>
    {
        const card = new MetricCard(makeOptions({
            href: "/admin/users",
        }));
        // Native <a> with href is already a link — no manual role.
        expect(card.getRootElement()!.getAttribute("role")).toBeNull();
        card.destroy();
    });

    test("Constructor_OnClickOnly_RootIsButton", () =>
    {
        const onClick = vi.fn();
        const card = new MetricCard(makeOptions({ onClick }));
        const root = card.getRootElement()!;
        expect(root.tagName.toLowerCase()).toBe("button");
        expect(root.getAttribute("type")).toBe("button");
        card.destroy();
    });

    test("Constructor_NoHrefNoOnClick_RootIsDiv", () =>
    {
        const card = new MetricCard(makeOptions());
        expect(card.getRootElement()!.tagName.toLowerCase()).toBe("div");
        card.destroy();
    });

    test("Constructor_ButtonClick_InvokesOnClick", () =>
    {
        const onClick = vi.fn();
        const card = new MetricCard(makeOptions({ onClick }));
        const root = card.getRootElement() as HTMLButtonElement;
        root.click();
        expect(onClick).toHaveBeenCalledTimes(1);
        card.destroy();
    });

    test("Constructor_ClickableSurface_HasClickableClass", () =>
    {
        const a = new MetricCard(makeOptions({ href: "#" }));
        const b = new MetricCard(makeOptions({ onClick: vi.fn() }));
        expect(a.getRootElement()!.classList.contains("metriccard-clickable"))
            .toBe(true);
        expect(b.getRootElement()!.classList.contains("metriccard-clickable"))
            .toBe(true);
        a.destroy();
        b.destroy();
    });
});

// ============================================================================
// LIFECYCLE STATES
// ============================================================================

describe("MetricCard lifecycle states", () =>
{
    test("Constructor_DefaultState_IsReady", () =>
    {
        const card = new MetricCard(makeOptions());
        const root = card.getRootElement()!;
        expect(root.getAttribute("data-state")).toBe("ready");
        expect(root.getAttribute("aria-busy")).toBeNull();
        card.destroy();
    });

    test("Constructor_LoadingState_AppliesAriaBusy", () =>
    {
        const card = new MetricCard(makeOptions({ state: "loading" }));
        const root = card.getRootElement()!;
        expect(root.getAttribute("data-state")).toBe("loading");
        expect(root.getAttribute("aria-busy")).toBe("true");
        // Skeleton present, value text hidden.
        expect(root.querySelector(".metriccard-skeleton")).not.toBeNull();
        card.destroy();
    });

    test("Constructor_LoadingState_KeepsLabelVisible", () =>
    {
        const card = new MetricCard(makeOptions({ state: "loading" }));
        const label = card.getRootElement()!
            .querySelector(".metriccard-label");
        expect(label?.textContent).toBe("Active Users");
        card.destroy();
    });

    test("Constructor_LoadingState_HidesTrend", () =>
    {
        const card = new MetricCard(makeOptions({
            state: "loading",
            trend: { direction: "up", text: "+2" },
        }));
        // Trend element may be in DOM but hidden via state class on root.
        expect(card.getRootElement()!.getAttribute("data-state"))
            .toBe("loading");
        const trend = card.getRootElement()!
            .querySelector(".metriccard-trend");
        // Either omitted or hidden — assert root state class drives visibility.
        // We assert presence via the data-state attribute.
        expect(trend === null || trend.classList.contains("metriccard-hidden"))
            .toBe(true);
        card.destroy();
    });

    test("Constructor_ErrorState_RendersDashAndErrorText", () =>
    {
        const card = new MetricCard(makeOptions({
            state: "error",
            errorText: "Couldn't load",
        }));
        const root = card.getRootElement()!;
        expect(root.getAttribute("data-state")).toBe("error");
        expect(root.querySelector(".metriccard-value")?.textContent).toBe("—");
        expect(root.querySelector(".metriccard-error")?.textContent)
            .toBe("Couldn't load");
        card.destroy();
    });

    test("Constructor_ErrorState_NoErrorText_OmitsErrorElement", () =>
    {
        const card = new MetricCard(makeOptions({ state: "error" }));
        expect(card.getRootElement()!
            .querySelector(".metriccard-error")).toBeNull();
        card.destroy();
    });

    test("Constructor_EmptyState_RendersDashOnly", () =>
    {
        const card = new MetricCard(makeOptions({ state: "empty" }));
        const root = card.getRootElement()!;
        expect(root.getAttribute("data-state")).toBe("empty");
        expect(root.querySelector(".metriccard-value")?.textContent).toBe("—");
        expect(root.querySelector(".metriccard-error")).toBeNull();
        card.destroy();
    });
});

// ============================================================================
// MUTATORS — handle methods
// ============================================================================

describe("MetricCard handle methods", () =>
{
    test("setValue_UpdatesValueText", () =>
    {
        const card = new MetricCard(makeOptions({ value: 1 }));
        card.setValue(42);
        expect(card.getRootElement()!
            .querySelector(".metriccard-value")?.textContent).toBe("42");
        card.destroy();
    });

    test("setValue_StringValue_RendersAsIs", () =>
    {
        const card = new MetricCard(makeOptions());
        card.setValue("3.4 GB");
        expect(card.getRootElement()!
            .querySelector(".metriccard-value")?.textContent).toBe("3.4 GB");
        card.destroy();
    });

    test("setTrend_AddsTrendElement", () =>
    {
        const card = new MetricCard(makeOptions());
        card.setTrend({ direction: "up", text: "+5" });
        const trend = card.getRootElement()!
            .querySelector(".metriccard-trend");
        expect(trend).not.toBeNull();
        expect(trend?.textContent).toContain("+5");
        card.destroy();
    });

    test("setTrend_Null_RemovesTrendElement", () =>
    {
        const card = new MetricCard(makeOptions({
            trend: { direction: "up", text: "+5" },
        }));
        card.setTrend(null);
        expect(card.getRootElement()!
            .querySelector(".metriccard-trend")).toBeNull();
        card.destroy();
    });

    test("setSecondary_AddsSecondaryText", () =>
    {
        const card = new MetricCard(makeOptions());
        card.setSecondary("of 10 GB cap");
        expect(card.getRootElement()!
            .querySelector(".metriccard-secondary")?.textContent)
            .toBe("of 10 GB cap");
        card.destroy();
    });

    test("setSecondary_Null_RemovesElement", () =>
    {
        const card = new MetricCard(makeOptions({
            secondary: "of 10 GB cap",
        }));
        card.setSecondary(null);
        expect(card.getRootElement()!
            .querySelector(".metriccard-secondary")).toBeNull();
        card.destroy();
    });

    test("setState_LoadingToReady_RestoresValue", () =>
    {
        const card = new MetricCard(makeOptions({
            state: "loading",
            value: 100,
        }));
        card.setState("ready");
        const root = card.getRootElement()!;
        expect(root.getAttribute("data-state")).toBe("ready");
        expect(root.getAttribute("aria-busy")).toBeNull();
        expect(root.querySelector(".metriccard-skeleton")).toBeNull();
        expect(root.querySelector(".metriccard-value")?.textContent)
            .toBe("100");
        card.destroy();
    });

    test("setState_ReadyToError_RendersErrorText", () =>
    {
        const card = new MetricCard(makeOptions({ value: 100 }));
        card.setState("error", "Backend timeout");
        const root = card.getRootElement()!;
        expect(root.getAttribute("data-state")).toBe("error");
        expect(root.querySelector(".metriccard-value")?.textContent).toBe("—");
        expect(root.querySelector(".metriccard-error")?.textContent)
            .toBe("Backend timeout");
        card.destroy();
    });

    test("setState_ErrorToReady_ClearsError", () =>
    {
        const card = new MetricCard(makeOptions({
            value: 100,
            state: "error",
            errorText: "fail",
        }));
        card.setState("ready");
        const root = card.getRootElement()!;
        expect(root.querySelector(".metriccard-error")).toBeNull();
        expect(root.querySelector(".metriccard-value")?.textContent)
            .toBe("100");
        card.destroy();
    });
});

// ============================================================================
// LAYOUT-STABILITY (no-jump) — DOM-based proxy in jsdom
// ============================================================================

describe("MetricCard layout stability", () =>
{
    test("LoadingToReady_ValueElementAlwaysPresent", () =>
    {
        // jsdom doesn't compute layout, so we assert the structural invariant
        // that backs "no layout jump": .metriccard-value exists in every
        // state. Skeleton overlays it; transitions don't add/remove it.
        const card = new MetricCard(makeOptions({ state: "loading" }));
        const root = card.getRootElement()!;
        expect(root.querySelector(".metriccard-value")).not.toBeNull();

        card.setState("ready");
        expect(root.querySelector(".metriccard-value")).not.toBeNull();

        card.setState("error", "x");
        expect(root.querySelector(".metriccard-value")).not.toBeNull();

        card.setState("empty");
        expect(root.querySelector(".metriccard-value")).not.toBeNull();
        card.destroy();
    });
});

// ============================================================================
// ARIA
// ============================================================================

describe("MetricCard ARIA", () =>
{
    test("Default_AriaLabel_CombinesLabelAndValue", () =>
    {
        const card = new MetricCard(makeOptions({
            label: "Active Users",
            value: 12,
        }));
        expect(card.getRootElement()!.getAttribute("aria-label"))
            .toBe("Active Users: 12");
        card.destroy();
    });

    test("AriaLabelOverride_UsesProvidedString", () =>
    {
        const card = new MetricCard(makeOptions({
            ariaLabel: "Twelve active users this week",
        }));
        expect(card.getRootElement()!.getAttribute("aria-label"))
            .toBe("Twelve active users this week");
        card.destroy();
    });

    test("AcceptsListItemRole_WithoutBreaking", () =>
    {
        const card = new MetricCard(makeOptions());
        // Caller can apply role="listitem" via cssClass + manual setAttr;
        // we ensure the component never strips that.
        card.getRootElement()!.setAttribute("role", "listitem");
        // Re-render via setValue; role must persist.
        card.setValue(99);
        expect(card.getRootElement()!.getAttribute("role")).toBe("listitem");
        card.destroy();
    });
});

// ============================================================================
// CSS CLASS + ID
// ============================================================================

describe("MetricCard cssClass + id", () =>
{
    test("CssClass_AppliedToRoot", () =>
    {
        const card = new MetricCard(makeOptions({
            cssClass: "kpi-strip-card my-card",
        }));
        const root = card.getRootElement()!;
        expect(root.classList.contains("kpi-strip-card")).toBe(true);
        expect(root.classList.contains("my-card")).toBe(true);
        card.destroy();
    });

    test("Id_AppliedToRoot", () =>
    {
        const card = new MetricCard(makeOptions({ id: "card-active" }));
        expect(card.getRootElement()!.id).toBe("card-active");
        card.destroy();
    });
});

// ============================================================================
// DESTROY
// ============================================================================

describe("MetricCard destroy", () =>
{
    test("Destroy_RemovesRootFromDom", () =>
    {
        const card = new MetricCard(makeOptions());
        expect(container.querySelector(".metriccard")).not.toBeNull();
        card.destroy();
        expect(container.querySelector(".metriccard")).toBeNull();
    });

    test("Destroy_ClearsHandle", () =>
    {
        const card = new MetricCard(makeOptions());
        card.destroy();
        expect(card.getRootElement()).toBeNull();
    });

    test("Destroy_RemovesClickListener", () =>
    {
        const onClick = vi.fn();
        const card = new MetricCard(makeOptions({ onClick }));
        const root = card.getRootElement() as HTMLButtonElement;
        card.destroy();
        // After destroy the element is detached; clicking it directly
        // should not invoke the handler.
        root.click();
        expect(onClick).not.toHaveBeenCalled();
    });

    test("Destroy_Twice_DoesNotThrow", () =>
    {
        const card = new MetricCard(makeOptions());
        card.destroy();
        expect(() => card.destroy()).not.toThrow();
    });
});
