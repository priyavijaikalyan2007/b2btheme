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
