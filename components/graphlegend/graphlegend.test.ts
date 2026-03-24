/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: GraphLegend
 * Spec-based tests for the GraphLegend collapsible legend panel component.
 * Tests cover: factory, node types, edge types, collapse/expand,
 * show/hide, count badges, click/hover callbacks, accessibility, destroy.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import {
    createGraphLegend
} from "./graphlegend";
import type {
    GraphLegendOptions,
    GraphLegend,
    LegendNodeType,
    LegendEdgeType
} from "./graphlegend";

// ============================================================================
// TEST DATA
// ============================================================================

const SAMPLE_NODE_TYPES: LegendNodeType[] = [
    {
        typeKey: "strategy.okr",
        displayName: "OKR",
        icon: "crosshair",
        color: "#C0392B",
        count: 5
    },
    {
        typeKey: "org.team",
        displayName: "Team",
        icon: "people",
        color: "#2980B9",
        count: 3
    },
    {
        typeKey: "tech.service",
        displayName: "Service",
        icon: "hdd-network",
        color: "#27AE60"
    }
];

const SAMPLE_EDGE_TYPES: LegendEdgeType[] = [
    {
        relationshipKey: "owned_by",
        displayName: "owned by",
        color: "#94a3b8",
        style: "solid",
        count: 8
    },
    {
        relationshipKey: "depends_on",
        displayName: "depends on",
        color: "#f59e0b",
        style: "dashed",
        count: 4
    }
];

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLDivElement;

function defaultOptions(
    overrides?: Partial<GraphLegendOptions>
): GraphLegendOptions
{
    return {
        container,
        nodeTypes: SAMPLE_NODE_TYPES,
        edgeTypes: SAMPLE_EDGE_TYPES,
        ...overrides
    };
}

function getRoot(): HTMLElement | null
{
    return container.querySelector(".graphlegend");
}

function getHeader(): HTMLElement | null
{
    return container.querySelector(".graphlegend-header");
}

function getBody(): HTMLElement | null
{
    return container.querySelector(".graphlegend-body");
}

function getToggleBtn(): HTMLElement | null
{
    return container.querySelector(".graphlegend-toggle") as HTMLElement | null;
}

function getNodeItems(): HTMLElement[]
{
    return Array.from(
        container.querySelectorAll(".graphlegend-node-item")
    );
}

function getEdgeItems(): HTMLElement[]
{
    return Array.from(
        container.querySelectorAll(".graphlegend-edge-item")
    );
}

function getAllItems(): HTMLElement[]
{
    return Array.from(
        container.querySelectorAll(".graphlegend-item")
    );
}

function getCountBadges(): HTMLElement[]
{
    return Array.from(
        container.querySelectorAll(".graphlegend-count")
    );
}

function getTitleText(): string
{
    const el = container.querySelector(".graphlegend-title");
    return el?.textContent ?? "";
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    container = document.createElement("div");
    document.body.appendChild(container);
});

afterEach(() =>
{
    container.remove();
});

// ============================================================================
// FACTORY — createGraphLegend
// ============================================================================

describe("createGraphLegend", () =>
{
    test("withValidOptions_CreatesRootElement", () =>
    {
        createGraphLegend(defaultOptions());
        const root = getRoot();

        expect(root).not.toBeNull();
        expect(root?.parentElement).toBe(container);
    });

    test("withValidOptions_ReturnsHandleObject", () =>
    {
        const handle = createGraphLegend(defaultOptions());

        expect(handle).toBeDefined();
        expect(typeof handle.show).toBe("function");
        expect(typeof handle.hide).toBe("function");
        expect(typeof handle.toggle).toBe("function");
        expect(typeof handle.destroy).toBe("function");
        expect(typeof handle.setNodeTypes).toBe("function");
        expect(typeof handle.setEdgeTypes).toBe("function");
        expect(typeof handle.updateCounts).toBe("function");
        expect(typeof handle.setCollapsed).toBe("function");
        expect(typeof handle.isVisible).toBe("function");
    });

    test("withNoContainer_ThrowsError", () =>
    {
        expect(() =>
        {
            createGraphLegend({
                container: null as unknown as HTMLElement,
                nodeTypes: []
            });
        }).toThrow("GraphLegend requires a container element");
    });

    test("withDefaultTitle_RendersLegendTitle", () =>
    {
        createGraphLegend(defaultOptions());

        expect(getTitleText()).toBe("Legend");
    });

    test("withCustomTitle_RendersCustomTitle", () =>
    {
        createGraphLegend(defaultOptions({ title: "Graph Key" }));

        expect(getTitleText()).toBe("Graph Key");
    });

    test("withDefaultOptions_SetsComplementaryRole", () =>
    {
        createGraphLegend(defaultOptions());
        const root = getRoot();

        expect(root?.getAttribute("role")).toBe("complementary");
        expect(root?.getAttribute("aria-label")).toBe("Graph legend");
    });

    test("withPosition_AppliesPositionClass", () =>
    {
        createGraphLegend(defaultOptions({ position: "top-right" }));
        const root = getRoot();

        expect(root?.classList.contains("graphlegend-top-right")).toBe(true);
    });

    test("withDefaultPosition_AppliesBottomLeft", () =>
    {
        createGraphLegend(defaultOptions());
        const root = getRoot();

        expect(root?.classList.contains("graphlegend-bottom-left")).toBe(true);
    });
});

// ============================================================================
// NODE TYPE RENDERING
// ============================================================================

describe("node type rendering", () =>
{
    test("rendersAllNodeTypes", () =>
    {
        createGraphLegend(defaultOptions());
        const items = getNodeItems();

        expect(items.length).toBe(3);
    });

    test("setsDataTypeKeyAttribute", () =>
    {
        createGraphLegend(defaultOptions());
        const items = getNodeItems();

        expect(items[0].getAttribute("data-type-key")).toBe("strategy.okr");
        expect(items[1].getAttribute("data-type-key")).toBe("org.team");
        expect(items[2].getAttribute("data-type-key")).toBe("tech.service");
    });

    test("rendersNodeSectionLabel", () =>
    {
        createGraphLegend(defaultOptions());
        const label = container.querySelector(
            ".graphlegend-nodes-section .graphlegend-section-label"
        );

        expect(label?.textContent).toBe("Node Types");
    });

    test("plannedStatus_AppliesDashedBorder", () =>
    {
        const planned: LegendNodeType = {
            typeKey: "draft.concept",
            displayName: "Concept",
            icon: "lightbulb",
            color: "#8B5CF6",
            status: "planned"
        };

        createGraphLegend(defaultOptions({
            nodeTypes: [planned]
        }));

        const items = getNodeItems();

        expect(items[0].classList.contains("graphlegend-status-planned"))
            .toBe(true);
    });

    test("deprecatedStatus_AppliesReducedOpacity", () =>
    {
        const deprecated: LegendNodeType = {
            typeKey: "legacy.widget",
            displayName: "Widget",
            icon: "archive",
            color: "#6B7280",
            status: "deprecated"
        };

        createGraphLegend(defaultOptions({
            nodeTypes: [deprecated]
        }));

        const items = getNodeItems();

        expect(items[0].classList.contains("graphlegend-status-deprecated"))
            .toBe(true);
    });

    test("externalStatus_RendersExternalIcon", () =>
    {
        const external: LegendNodeType = {
            typeKey: "ext.api",
            displayName: "API",
            icon: "cloud",
            color: "#EF4444",
            status: "external"
        };

        createGraphLegend(defaultOptions({
            nodeTypes: [external]
        }));

        const icon = container.querySelector(".graphlegend-external-icon");

        expect(icon).not.toBeNull();
    });

    test("withEmptyNodeTypes_RendersNoNodeItems", () =>
    {
        createGraphLegend(defaultOptions({ nodeTypes: [] }));
        const items = getNodeItems();

        expect(items.length).toBe(0);
    });
});

// ============================================================================
// EDGE TYPE RENDERING
// ============================================================================

describe("edge type rendering", () =>
{
    test("rendersAllEdgeTypes", () =>
    {
        createGraphLegend(defaultOptions());
        const items = getEdgeItems();

        expect(items.length).toBe(2);
    });

    test("rendersEdgeSectionLabel", () =>
    {
        createGraphLegend(defaultOptions());
        const label = container.querySelector(
            ".graphlegend-edges-section .graphlegend-section-label"
        );

        expect(label?.textContent).toBe("Edge Types");
    });

    test("rendersEdgeDisplayName", () =>
    {
        createGraphLegend(defaultOptions());
        const labels = container.querySelectorAll(".graphlegend-edge-label");

        expect(labels[0]?.textContent).toBe("owned by");
        expect(labels[1]?.textContent).toBe("depends on");
    });

    test("rendersInlineSvgLineSample", () =>
    {
        createGraphLegend(defaultOptions());
        const svgs = container.querySelectorAll(".graphlegend-edge-line");

        expect(svgs.length).toBe(2);
        expect(svgs[0].tagName.toLowerCase()).toBe("svg");
    });

    test("dashedEdge_SetsDashArray", () =>
    {
        createGraphLegend(defaultOptions());
        const svgs = container.querySelectorAll(".graphlegend-edge-line");
        const dashedLine = svgs[1]?.querySelector("line");

        expect(dashedLine?.getAttribute("stroke-dasharray")).toBe("4 3");
    });

    test("solidEdge_NoDashArray", () =>
    {
        createGraphLegend(defaultOptions());
        const svgs = container.querySelectorAll(".graphlegend-edge-line");
        const solidLine = svgs[0]?.querySelector("line");

        expect(solidLine?.getAttribute("stroke-dasharray")).toBeNull();
    });

    test("showEdgeTypesFalse_HidesEdgeSection", () =>
    {
        createGraphLegend(defaultOptions({ showEdgeTypes: false }));
        const section = container.querySelector(".graphlegend-edges-section");

        expect(section).toBeNull();
    });

    test("edgeTypeWithDefaultColor_UsesGrayDefault", () =>
    {
        const edge: LegendEdgeType = {
            relationshipKey: "related_to",
            displayName: "related to"
        };

        createGraphLegend(defaultOptions({
            edgeTypes: [edge]
        }));

        const line = container.querySelector(
            ".graphlegend-edge-line line"
        );

        expect(line?.getAttribute("stroke")).toBe("#94a3b8");
    });

    test("dottedEdge_SetsDotDashArray", () =>
    {
        const dotted: LegendEdgeType = {
            relationshipKey: "may_use",
            displayName: "may use",
            style: "dotted"
        };

        createGraphLegend(defaultOptions({
            edgeTypes: [dotted]
        }));

        const line = container.querySelector(
            ".graphlegend-edge-line line"
        );

        expect(line?.getAttribute("stroke-dasharray")).toBe("2 2");
    });
});

// ============================================================================
// COLLAPSE / EXPAND
// ============================================================================

describe("collapse and expand", () =>
{
    test("defaultNotCollapsed_BodyIsVisible", () =>
    {
        createGraphLegend(defaultOptions());
        const body = getBody();

        expect(body?.style.display).not.toBe("none");
    });

    test("collapsedTrue_BodyIsHidden", () =>
    {
        createGraphLegend(defaultOptions({ collapsed: true }));
        const body = getBody();

        expect(body?.style.display).toBe("none");
    });

    test("toggleClick_CollapsesExpandedBody", () =>
    {
        createGraphLegend(defaultOptions());
        const toggleBtn = getToggleBtn();

        toggleBtn?.click();

        const body = getBody();

        expect(body?.style.display).toBe("none");
    });

    test("toggleClickTwice_ReExpandsBody", () =>
    {
        createGraphLegend(defaultOptions());
        const toggleBtn = getToggleBtn();

        toggleBtn?.click();
        toggleBtn?.click();

        const body = getBody();

        expect(body?.style.display).not.toBe("none");
    });

    test("setCollapsed_ProgrammaticallyCollapsesBody", () =>
    {
        const handle = createGraphLegend(defaultOptions());

        handle.setCollapsed(true);

        const body = getBody();

        expect(body?.style.display).toBe("none");
    });

    test("setCollapsed_ProgrammaticallyExpandsBody", () =>
    {
        const handle = createGraphLegend(defaultOptions({
            collapsed: true
        }));

        handle.setCollapsed(false);

        const body = getBody();

        expect(body?.style.display).not.toBe("none");
    });

    test("collapsed_ChevronPointsRight", () =>
    {
        createGraphLegend(defaultOptions({ collapsed: true }));
        const chevron = container.querySelector(".graphlegend-chevron");

        expect(chevron?.classList.contains("bi-chevron-right")).toBe(true);
        expect(chevron?.classList.contains("bi-chevron-down")).toBe(false);
    });

    test("expanded_ChevronPointsDown", () =>
    {
        createGraphLegend(defaultOptions());
        const chevron = container.querySelector(".graphlegend-chevron");

        expect(chevron?.classList.contains("bi-chevron-down")).toBe(true);
        expect(chevron?.classList.contains("bi-chevron-right")).toBe(false);
    });

    test("collapsed_ToggleAriaExpandedFalse", () =>
    {
        createGraphLegend(defaultOptions({ collapsed: true }));
        const toggleBtn = getToggleBtn();

        expect(toggleBtn?.getAttribute("aria-expanded")).toBe("false");
    });

    test("expanded_ToggleAriaExpandedTrue", () =>
    {
        createGraphLegend(defaultOptions());
        const toggleBtn = getToggleBtn();

        expect(toggleBtn?.getAttribute("aria-expanded")).toBe("true");
    });
});

// ============================================================================
// SHOW / HIDE / TOGGLE
// ============================================================================

describe("show, hide, toggle", () =>
{
    test("hide_SetsDisplayNone", () =>
    {
        const handle = createGraphLegend(defaultOptions());

        handle.hide();

        const root = getRoot();

        expect(root?.style.display).toBe("none");
        expect(handle.isVisible()).toBe(false);
    });

    test("show_RemovesDisplayNone", () =>
    {
        const handle = createGraphLegend(defaultOptions());

        handle.hide();
        handle.show();

        const root = getRoot();

        expect(root?.style.display).not.toBe("none");
        expect(handle.isVisible()).toBe(true);
    });

    test("toggle_HidesWhenVisible", () =>
    {
        const handle = createGraphLegend(defaultOptions());

        handle.toggle();

        expect(handle.isVisible()).toBe(false);
    });

    test("toggle_ShowsWhenHidden", () =>
    {
        const handle = createGraphLegend(defaultOptions());

        handle.hide();
        handle.toggle();

        expect(handle.isVisible()).toBe(true);
    });

    test("isVisible_DefaultTrue", () =>
    {
        const handle = createGraphLegend(defaultOptions());

        expect(handle.isVisible()).toBe(true);
    });
});

// ============================================================================
// COUNT BADGES
// ============================================================================

describe("count badges", () =>
{
    test("showCountsFalse_NoCountBadgesRendered", () =>
    {
        createGraphLegend(defaultOptions({ showCounts: false }));
        const badges = getCountBadges();

        expect(badges.length).toBe(0);
    });

    test("showCountsTrue_RendersCountBadges", () =>
    {
        createGraphLegend(defaultOptions({ showCounts: true }));
        const badges = getCountBadges();

        // 2 node types with count + 2 edge types with count = 4
        expect(badges.length).toBe(4);
    });

    test("showCountsTrue_DisplaysCorrectValues", () =>
    {
        createGraphLegend(defaultOptions({ showCounts: true }));
        const badges = getCountBadges();
        const values = badges.map(b => b.textContent);

        expect(values).toContain("5");
        expect(values).toContain("3");
        expect(values).toContain("8");
        expect(values).toContain("4");
    });

    test("updateCounts_ChangesExistingBadges", () =>
    {
        const handle = createGraphLegend(defaultOptions({
            showCounts: true
        }));

        handle.updateCounts(
            { "strategy.okr": 10, "org.team": 7 },
            { "owned_by": 15 }
        );

        const okrRow = container.querySelector(
            '[data-type-key="strategy.okr"] .graphlegend-count'
        );
        const teamRow = container.querySelector(
            '[data-type-key="org.team"] .graphlegend-count'
        );
        const ownedRow = container.querySelector(
            '[data-type-key="owned_by"] .graphlegend-count'
        );

        expect(okrRow?.textContent).toBe("10");
        expect(teamRow?.textContent).toBe("7");
        expect(ownedRow?.textContent).toBe("15");
    });

    test("updateCounts_CreatesNewBadgesForPreviouslyUncounted", () =>
    {
        const handle = createGraphLegend(defaultOptions({
            showCounts: false
        }));

        handle.updateCounts(
            { "strategy.okr": 12 },
            {}
        );

        const badge = container.querySelector(
            '[data-type-key="strategy.okr"] .graphlegend-count'
        );

        expect(badge?.textContent).toBe("12");
    });

    test("nodeTypeWithNoCount_ShowCountsTrue_NoBadge", () =>
    {
        createGraphLegend(defaultOptions({
            showCounts: true,
            nodeTypes: [
                {
                    typeKey: "no.count",
                    displayName: "No Count",
                    icon: "dash",
                    color: "#888888"
                    // count: undefined
                }
            ],
            edgeTypes: []
        }));

        const badges = getCountBadges();

        expect(badges.length).toBe(0);
    });
});

// ============================================================================
// CLICK CALLBACKS
// ============================================================================

describe("click callbacks", () =>
{
    test("onTypeClick_CalledWithNodeTypeKey", () =>
    {
        const clickFn = vi.fn();
        const handle = createGraphLegend(defaultOptions());

        handle.onTypeClick = clickFn;

        // Re-render to wire events with the callback
        handle.setNodeTypes(SAMPLE_NODE_TYPES);

        const items = getNodeItems();
        items[0].click();

        expect(clickFn).toHaveBeenCalledWith("strategy.okr");
    });

    test("onTypeClick_CalledWithEdgeTypeKey", () =>
    {
        const clickFn = vi.fn();
        const handle = createGraphLegend(defaultOptions());

        handle.onTypeClick = clickFn;
        handle.setEdgeTypes(SAMPLE_EDGE_TYPES);

        const items = getEdgeItems();
        items[0].click();

        expect(clickFn).toHaveBeenCalledWith("owned_by");
    });

    test("onTypeClick_KeyboardEnterActivates", () =>
    {
        const clickFn = vi.fn();
        const handle = createGraphLegend(defaultOptions());

        handle.onTypeClick = clickFn;
        handle.setNodeTypes(SAMPLE_NODE_TYPES);

        const items = getNodeItems();
        items[0].dispatchEvent(
            new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
        );

        expect(clickFn).toHaveBeenCalledWith("strategy.okr");
    });

    test("onTypeClick_KeyboardSpaceActivates", () =>
    {
        const clickFn = vi.fn();
        const handle = createGraphLegend(defaultOptions());

        handle.onTypeClick = clickFn;
        handle.setNodeTypes(SAMPLE_NODE_TYPES);

        const items = getNodeItems();
        items[0].dispatchEvent(
            new KeyboardEvent("keydown", { key: " ", bubbles: true })
        );

        expect(clickFn).toHaveBeenCalledWith("strategy.okr");
    });

    test("onTypeHover_CalledOnMouseEnter", () =>
    {
        const hoverFn = vi.fn();
        const handle = createGraphLegend(defaultOptions());

        handle.onTypeHover = hoverFn;
        handle.setNodeTypes(SAMPLE_NODE_TYPES);

        const items = getNodeItems();
        items[0].dispatchEvent(
            new MouseEvent("mouseenter", { bubbles: true })
        );

        expect(hoverFn).toHaveBeenCalledWith("strategy.okr");
    });

    test("onTypeHover_CalledWithNullOnMouseLeave", () =>
    {
        const hoverFn = vi.fn();
        const handle = createGraphLegend(defaultOptions());

        handle.onTypeHover = hoverFn;
        handle.setNodeTypes(SAMPLE_NODE_TYPES);

        const items = getNodeItems();
        items[0].dispatchEvent(
            new MouseEvent("mouseleave", { bubbles: true })
        );

        expect(hoverFn).toHaveBeenCalledWith(null);
    });
});

// ============================================================================
// SET NODE TYPES / SET EDGE TYPES
// ============================================================================

describe("setNodeTypes and setEdgeTypes", () =>
{
    test("setNodeTypes_ReRendersWithNewTypes", () =>
    {
        const handle = createGraphLegend(defaultOptions());

        handle.setNodeTypes([
            {
                typeKey: "new.type",
                displayName: "New",
                icon: "star",
                color: "#FF0000"
            }
        ]);

        const items = getNodeItems();

        expect(items.length).toBe(1);
        expect(items[0].getAttribute("data-type-key")).toBe("new.type");
    });

    test("setEdgeTypes_ReRendersWithNewTypes", () =>
    {
        const handle = createGraphLegend(defaultOptions());

        handle.setEdgeTypes([
            {
                relationshipKey: "links_to",
                displayName: "links to",
                color: "#00FF00",
                style: "dotted"
            }
        ]);

        const items = getEdgeItems();

        expect(items.length).toBe(1);
        expect(items[0].getAttribute("data-type-key")).toBe("links_to");
    });

    test("setNodeTypes_PreservesEdgeTypes", () =>
    {
        const handle = createGraphLegend(defaultOptions());

        handle.setNodeTypes([
            {
                typeKey: "solo.node",
                displayName: "Solo",
                icon: "dot",
                color: "#111111"
            }
        ]);

        const edges = getEdgeItems();

        expect(edges.length).toBe(2);
    });

    test("setEdgeTypes_PreservesNodeTypes", () =>
    {
        const handle = createGraphLegend(defaultOptions());

        handle.setEdgeTypes([]);

        const nodes = getNodeItems();

        expect(nodes.length).toBe(3);
    });
});

// ============================================================================
// MAX HEIGHT
// ============================================================================

describe("maxHeight", () =>
{
    test("defaultMaxHeight_SetsBodyMaxHeightTo300", () =>
    {
        createGraphLegend(defaultOptions());
        const body = getBody();

        expect(body?.style.maxHeight).toBe("300px");
    });

    test("customMaxHeight_SetsBodyMaxHeight", () =>
    {
        createGraphLegend(defaultOptions({ maxHeight: 500 }));
        const body = getBody();

        expect(body?.style.maxHeight).toBe("500px");
    });
});

// ============================================================================
// DESTROY
// ============================================================================

describe("destroy", () =>
{
    test("destroy_RemovesRootFromDOM", () =>
    {
        const handle = createGraphLegend(defaultOptions());

        handle.destroy();

        const root = getRoot();

        expect(root).toBeNull();
    });

    test("destroyTwice_DoesNotThrow", () =>
    {
        const handle = createGraphLegend(defaultOptions());

        handle.destroy();

        expect(() => handle.destroy()).not.toThrow();
    });
});

// ============================================================================
// ACCESSIBILITY
// ============================================================================

describe("accessibility", () =>
{
    test("root_HasComplementaryRole", () =>
    {
        createGraphLegend(defaultOptions());
        const root = getRoot();

        expect(root?.getAttribute("role")).toBe("complementary");
    });

    test("root_HasAriaLabel", () =>
    {
        createGraphLegend(defaultOptions());
        const root = getRoot();

        expect(root?.getAttribute("aria-label")).toBe("Graph legend");
    });

    test("toggleButton_HasAriaExpanded", () =>
    {
        createGraphLegend(defaultOptions());
        const btn = getToggleBtn();

        expect(btn?.getAttribute("aria-expanded")).toBe("true");
    });

    test("toggleButton_HasAriaLabel", () =>
    {
        createGraphLegend(defaultOptions());
        const btn = getToggleBtn();

        expect(btn?.getAttribute("aria-label")).toBe("Collapse legend");
    });

    test("collapsedToggle_HasExpandAriaLabel", () =>
    {
        createGraphLegend(defaultOptions({ collapsed: true }));
        const btn = getToggleBtn();

        expect(btn?.getAttribute("aria-label")).toBe("Expand legend");
    });
});

// ============================================================================
// FALLBACK BADGE (TypeBadge not loaded)
// ============================================================================

describe("fallback badge", () =>
{
    test("withoutTypeBadge_RendersFallbackBadge", () =>
    {
        // TypeBadge is not loaded in vitest environment
        createGraphLegend(defaultOptions());
        const fallbacks = container.querySelectorAll(
            ".graphlegend-fallback-badge"
        );

        expect(fallbacks.length).toBe(3);
    });

    test("fallbackBadge_HasColorDot", () =>
    {
        createGraphLegend(defaultOptions());
        const dots = container.querySelectorAll(".graphlegend-color-dot");

        expect(dots.length).toBe(3);
    });

    test("fallbackBadge_DisplaysNodeName", () =>
    {
        createGraphLegend(defaultOptions({
            nodeTypes: [
                {
                    typeKey: "test.thing",
                    displayName: "Thing",
                    icon: "box",
                    color: "#123456"
                }
            ]
        }));

        const badge = container.querySelector(".graphlegend-fallback-badge");

        expect(badge?.textContent).toContain("Thing");
    });
});
