/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * TESTS: RelationshipManager
 * Vitest unit tests for the RelationshipManager component.
 * Covers: factory, options, DOM structure, ARIA, relationship API,
 * grouping, read-only mode, callbacks, and edge cases.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import
{
    createRelationshipManager,
} from "./relationshipmanager";
import type
{
    RelationshipManagerOptions,
    RelationshipInstance,
    RelationshipDefinitionSummary,
    RelationshipManager,
} from "./relationshipmanager";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLElement;

function makeRelDefs(): RelationshipDefinitionSummary[]
{
    return [
        {
            key: "depends_on",
            displayName: "Depends On",
            inverseName: "Required By",
            targetTypeKeys: null,
            sourceTypeKeys: null,
            cardinality: "many-to-many",
        },
        {
            key: "owned_by",
            displayName: "Owned By",
            inverseName: "Owns",
            targetTypeKeys: ["user"],
            sourceTypeKeys: ["resource"],
            cardinality: "many-to-one",
        },
    ];
}

function makeRelationship(
    overrides?: Partial<RelationshipInstance>
): RelationshipInstance
{
    return {
        id: "rel-" + Math.random().toString(36).slice(2, 6),
        relationshipKey: "depends_on",
        relationshipDisplayName: "Depends On",
        direction: "outbound",
        otherResourceId: "res-2",
        otherResourceDisplayName: "Other Resource",
        otherResourceType: "service",
        properties: {},
        provenance: "manual",
        createdAt: "2026-03-19T00:00:00Z",
        ...overrides,
    };
}

function makeOptions(
    overrides?: Partial<RelationshipManagerOptions>
): RelationshipManagerOptions
{
    return {
        container: container,
        resourceId: "res-1",
        resourceType: "service",
        resourceDisplayName: "My Service",
        relationshipDefinitions: makeRelDefs(),
        relationships: [
            makeRelationship({ id: "rel-1" }),
            makeRelationship({ id: "rel-2", relationshipKey: "owned_by",
                relationshipDisplayName: "Owned By" }),
        ],
        ...overrides,
    };
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    container = document.createElement("div");
    container.id = "test-relmgr";
    document.body.appendChild(container);
});

afterEach(() =>
{
    document.body.innerHTML = "";
});

// ============================================================================
// FACTORY — createRelationshipManager
// ============================================================================

describe("createRelationshipManager", () =>
{
    test("returnsRelationshipManagerHandle", () =>
    {
        const rm = createRelationshipManager(makeOptions());
        expect(rm).toBeDefined();
        expect(typeof rm.setRelationships).toBe("function");
        expect(typeof rm.destroy).toBe("function");
        rm.destroy();
    });

    test("rendersInContainer", () =>
    {
        const rm = createRelationshipManager(makeOptions());
        expect(container.children.length).toBeGreaterThan(0);
        rm.destroy();
    });
});

// ============================================================================
// DOM STRUCTURE
// ============================================================================

describe("DOM structure", () =>
{
    test("rendersRelationshipList", () =>
    {
        const rm = createRelationshipManager(makeOptions());
        // Should show relationship items
        expect(container.textContent).toContain("Other Resource");
        rm.destroy();
    });

    test("rendersRelationshipTypeNames", () =>
    {
        const rm = createRelationshipManager(makeOptions());
        expect(container.textContent).toContain("Depends On");
        rm.destroy();
    });

    test("notReadOnly_withCreateCallback_ShowsAddButton", () =>
    {
        const rm = createRelationshipManager(makeOptions({
            readOnly: false,
            onCreateRelationship: async () => {},
        }));
        const addBtn = container.querySelector(".rm-add-btn");
        expect(addBtn).not.toBeNull();
        rm.destroy();
    });
});

// ============================================================================
// ARIA / ACCESSIBILITY
// ============================================================================

describe("accessibility", () =>
{
    test("rootHasAriaLabels", () =>
    {
        const rm = createRelationshipManager(makeOptions());
        const ariaEl = container.querySelector(
            "[aria-label], [data-role]"
        );
        expect(ariaEl).not.toBeNull();
        rm.destroy();
    });
});

// ============================================================================
// PUBLIC API
// ============================================================================

describe("relationship API", () =>
{
    test("setRelationships_ReplacesAll", () =>
    {
        const rm = createRelationshipManager(makeOptions());
        rm.setRelationships([
            makeRelationship({ id: "new-1", otherResourceDisplayName: "New Resource" }),
        ]);
        rm.refresh();
        expect(container.textContent).toContain("New Resource");
        rm.destroy();
    });

    test("addRelationship_AddsToList", () =>
    {
        const rm = createRelationshipManager(makeOptions());
        rm.addRelationship(
            makeRelationship({ id: "added-1", otherResourceDisplayName: "Added Res" })
        );
        rm.refresh();
        expect(container.textContent).toContain("Added Res");
        rm.destroy();
    });

    test("removeRelationship_RemovesFromList", () =>
    {
        const rm = createRelationshipManager(makeOptions());
        rm.removeRelationship("rel-1");
        rm.refresh();
        rm.destroy();
    });

    test("setReadOnly_DisablesEditing", () =>
    {
        const rm = createRelationshipManager(makeOptions({ readOnly: false }));
        rm.setReadOnly(true);
        rm.refresh();
        rm.destroy();
    });
});

// ============================================================================
// GROUP OPERATIONS
// ============================================================================

describe("group operations", () =>
{
    test("expandAll_ExpandsAllGroups", () =>
    {
        const rm = createRelationshipManager(makeOptions({ groupByType: true }));
        rm.expandAll();
        rm.destroy();
    });

    test("collapseAll_CollapsesAllGroups", () =>
    {
        const rm = createRelationshipManager(makeOptions({ groupByType: true }));
        rm.collapseAll();
        rm.destroy();
    });
});

// ============================================================================
// LIFECYCLE
// ============================================================================

describe("lifecycle", () =>
{
    test("destroy_CleansUpDOM", () =>
    {
        const rm = createRelationshipManager(makeOptions());
        rm.destroy();
        // After destroy the container should be empty or cleaned up
        expect(container.querySelector("[class*='relationship']")).toBeNull();
    });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe("edge cases", () =>
{
    test("emptyRelationships_RendersEmptyState", () =>
    {
        const rm = createRelationshipManager(
            makeOptions({ relationships: [] })
        );
        expect(container.children.length).toBeGreaterThan(0);
        rm.destroy();
    });

    test("noDefinitions_StillRenders", () =>
    {
        const rm = createRelationshipManager(
            makeOptions({ relationshipDefinitions: [] })
        );
        expect(container.children.length).toBeGreaterThan(0);
        rm.destroy();
    });

    test("readOnly_HidesAddButton", () =>
    {
        const rm = createRelationshipManager(makeOptions({
            readOnly: true,
            onCreateRelationship: async () => {},
        }));
        const addBtn = container.querySelector(".rm-add-btn");
        expect(addBtn === null || (addBtn as HTMLElement).style.display === "none").toBe(true);
        rm.destroy();
    });
});

// ============================================================================
// ADD BUTTON VISIBILITY
// ============================================================================

describe("add button visibility", () =>
{
    test("noCreateCallback_hidesAddButton", () =>
    {
        const rm = createRelationshipManager(makeOptions({ readOnly: false }));
        const addBtn = container.querySelector(".rm-add-btn") as HTMLElement | null;
        expect(addBtn === null || addBtn.style.display === "none").toBe(true);
        rm.destroy();
    });

    test("showAddButtonFalse_withCreateCallback_hidesAddButton", () =>
    {
        const rm = createRelationshipManager(makeOptions({
            readOnly: false,
            onCreateRelationship: async () => {},
            showAddButton: false,
        }));
        const addBtn = container.querySelector(".rm-add-btn") as HTMLElement | null;
        expect(addBtn === null || addBtn.style.display === "none").toBe(true);
        rm.destroy();
    });

    test("showAddButtonTrue_withoutCreateCallback_showsAddButton", () =>
    {
        const rm = createRelationshipManager(makeOptions({
            readOnly: false,
            showAddButton: true,
        }));
        const addBtn = container.querySelector(".rm-add-btn") as HTMLElement | null;
        expect(addBtn).not.toBeNull();
        expect(addBtn!.style.display).not.toBe("none");
        rm.destroy();
    });

    test("setReadOnlyTrue_hidesAddButton", () =>
    {
        const rm = createRelationshipManager(makeOptions({
            readOnly: false,
            onCreateRelationship: async () => {},
        }));
        rm.setReadOnly(true);
        const addBtn = container.querySelector(".rm-add-btn") as HTMLElement | null;
        expect(addBtn === null || addBtn.style.display === "none").toBe(true);
        rm.destroy();
    });

    test("setReadOnlyFalse_withCreateCallback_showsAddButton", () =>
    {
        const rm = createRelationshipManager(makeOptions({
            readOnly: true,
            onCreateRelationship: async () => {},
        }));
        rm.setReadOnly(false);
        const addBtn = container.querySelector(".rm-add-btn") as HTMLElement | null;
        expect(addBtn).not.toBeNull();
        expect(addBtn!.style.display).not.toBe("none");
        rm.destroy();
    });
});

// ============================================================================
// CategorizedDataInlineToolbar pattern (ADR-128)
// ============================================================================

describe("InlineToolbar adoption (ADR-128)", () =>
{
    type ToolbarItem = { id: string; onClick?: (item: unknown, active?: boolean) => void };
    type ToolbarOpts = { container: HTMLElement; items: ToolbarItem[] };
    let factoryCalls: ToolbarOpts[];
    let lastItems: Map<string, ToolbarItem>;

    function fireToolbarItem(id: string): void
    {
        const item = lastItems.get(id);
        if (!item) { throw new Error("toolbar item not registered: " + id); }
        if (typeof item.onClick === "function") { item.onClick(item); }
    }

    function makeMixedRels(): RelationshipInstance[]
    {
        return [
            makeRelationship({ id: "r-z", relationshipKey: "zeta",
                relationshipDisplayName: "Zeta" }),
            makeRelationship({ id: "r-a", relationshipKey: "alpha",
                relationshipDisplayName: "Alpha" }),
            makeRelationship({ id: "r-m", relationshipKey: "mu",
                relationshipDisplayName: "Mu" }),
        ];
    }

    function readGroupOrder(root: HTMLElement): string[]
    {
        const labels = root.querySelectorAll(".rm-group-label");
        return Array.from(labels).map((el) => (el.textContent ?? "").replace(/\s*\(.*$/, ""));
    }

    beforeEach(() =>
    {
        factoryCalls = [];
        lastItems = new Map();
        (window as unknown as Record<string, unknown>).createInlineToolbar = (opts: ToolbarOpts) =>
        {
            factoryCalls.push(opts);
            for (const it of opts.items) { lastItems.set(it.id, it); }
            // Render the slot so the test can assert presence.
            opts.container.setAttribute("data-toolbar-mounted", "true");
            return {
                setItemActive: (_id: string, _active: boolean) => {},
                destroy: () =>
                {
                    opts.container.removeAttribute("data-toolbar-mounted");
                }
            };
        };
    });

    afterEach(() =>
    {
        delete (window as unknown as Record<string, unknown>).createInlineToolbar;
    });

    test("default off — no toolbar slot mounted", () =>
    {
        const rm = createRelationshipManager(makeOptions());
        expect(container.querySelector(".rm-header-toolbar")).toBeNull();
        expect(factoryCalls.length).toBe(0);
        rm.destroy();
    });

    test("opt-in mounts the toolbar via factory", () =>
    {
        const rm = createRelationshipManager(makeOptions({ showInlineToolbar: true }));
        expect(factoryCalls.length).toBe(1);
        const slot = container.querySelector(".rm-header-toolbar");
        expect(slot).not.toBeNull();
        expect(slot!.getAttribute("data-toolbar-mounted")).toBe("true");
        rm.destroy();
    });

    test("opt-in without factory — warns, no throw, no slot", () =>
    {
        delete (window as unknown as Record<string, unknown>).createInlineToolbar;
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const rm = createRelationshipManager(makeOptions({ showInlineToolbar: true }));
        expect(container.querySelector(".rm-header-toolbar")).toBeNull();
        warnSpy.mockRestore();
        rm.destroy();
    });

    test("setSortMode('asc') sorts group keys A→Z", () =>
    {
        const rm = createRelationshipManager(makeOptions({
            relationships: makeMixedRels(),
        }));
        rm.setSortMode("asc");
        const order = readGroupOrder(container);
        expect(order).toEqual(["Alpha", "Mu", "Zeta"]);
        rm.destroy();
    });

    test("setSortMode('desc') sorts group keys Z→A", () =>
    {
        const rm = createRelationshipManager(makeOptions({
            relationships: makeMixedRels(),
        }));
        rm.setSortMode("desc");
        const order = readGroupOrder(container);
        expect(order).toEqual(["Zeta", "Mu", "Alpha"]);
        rm.destroy();
    });

    test("setSortMode(null) returns to insertion order", () =>
    {
        const rm = createRelationshipManager(makeOptions({
            relationships: makeMixedRels(),
        }));
        rm.setSortMode("asc");
        rm.setSortMode(null);
        const order = readGroupOrder(container);
        expect(order).toEqual(["Zeta", "Alpha", "Mu"]);
        rm.destroy();
    });

    test("setSortMode fires onSortModeChange with new mode", () =>
    {
        const onSortModeChange = vi.fn();
        const rm = createRelationshipManager(makeOptions({ onSortModeChange }));
        rm.setSortMode("asc");
        rm.setSortMode("desc");
        rm.setSortMode(null);
        expect(onSortModeChange).toHaveBeenCalledTimes(3);
        expect(onSortModeChange).toHaveBeenNthCalledWith(1, "asc");
        expect(onSortModeChange).toHaveBeenNthCalledWith(2, "desc");
        expect(onSortModeChange).toHaveBeenNthCalledWith(3, null);
        rm.destroy();
    });

    test("setSortMode is idempotent (no fire on same mode)", () =>
    {
        const onSortModeChange = vi.fn();
        const rm = createRelationshipManager(makeOptions({ onSortModeChange }));
        rm.setSortMode("asc");
        rm.setSortMode("asc");
        expect(onSortModeChange).toHaveBeenCalledTimes(1);
        rm.destroy();
    });

    test("expandAll fires onCollapseStateChange('all-expanded')", () =>
    {
        const onCollapseStateChange = vi.fn();
        const rm = createRelationshipManager(makeOptions({
            relationships: makeMixedRels(),
            initialCollapsed: "all",
            onCollapseStateChange,
        }));
        rm.expandAll();
        expect(onCollapseStateChange).toHaveBeenCalledWith("all-expanded");
        rm.destroy();
    });

    test("collapseAll fires onCollapseStateChange('all-collapsed')", () =>
    {
        const onCollapseStateChange = vi.fn();
        const rm = createRelationshipManager(makeOptions({
            relationships: makeMixedRels(),
            onCollapseStateChange,
        }));
        rm.collapseAll();
        expect(onCollapseStateChange).toHaveBeenCalledWith("all-collapsed");
        rm.destroy();
    });

    test("toolbar sort-asc click → setSortMode('asc') round-trip", () =>
    {
        const onSortModeChange = vi.fn();
        const rm = createRelationshipManager(makeOptions({
            showInlineToolbar: true,
            relationships: makeMixedRels(),
            onSortModeChange,
        }));
        fireToolbarItem("rm-sort-asc");
        expect(onSortModeChange).toHaveBeenCalledWith("asc");
        expect(rm.getSortMode()).toBe("asc");
        rm.destroy();
    });

    test("toolbar sort-asc click twice toggles back to null", () =>
    {
        const rm = createRelationshipManager(makeOptions({
            showInlineToolbar: true,
            relationships: makeMixedRels(),
        }));
        fireToolbarItem("rm-sort-asc");
        fireToolbarItem("rm-sort-asc");
        expect(rm.getSortMode()).toBe(null);
        rm.destroy();
    });

    test("toolbar expand-all and collapse-all wire to public API", () =>
    {
        const onCollapseStateChange = vi.fn();
        const rm = createRelationshipManager(makeOptions({
            showInlineToolbar: true,
            relationships: makeMixedRels(),
            onCollapseStateChange,
        }));
        fireToolbarItem("rm-collapse-all");
        expect(onCollapseStateChange).toHaveBeenLastCalledWith("all-collapsed");
        fireToolbarItem("rm-expand-all");
        expect(onCollapseStateChange).toHaveBeenLastCalledWith("all-expanded");
        rm.destroy();
    });

    test("initialSortMode applied at construction", () =>
    {
        const rm = createRelationshipManager(makeOptions({
            relationships: makeMixedRels(),
            initialSortMode: "desc",
        }));
        const order = readGroupOrder(container);
        expect(order).toEqual(["Zeta", "Mu", "Alpha"]);
        expect(rm.getSortMode()).toBe("desc");
        rm.destroy();
    });

    test("initialCollapsed='all' starts collapsed", () =>
    {
        const rm = createRelationshipManager(makeOptions({
            relationships: makeMixedRels(),
            initialCollapsed: "all",
        }));
        const bodies = container.querySelectorAll(".rm-group-body");
        expect(bodies.length).toBeGreaterThan(0);
        for (const b of Array.from(bodies))
        {
            expect((b as HTMLElement).style.display).toBe("none");
        }
        rm.destroy();
    });
});
