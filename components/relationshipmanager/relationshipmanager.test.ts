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
// DEBT-TEST-1c. Side-effect import: the ADR-128 block mounts the real
// InlineToolbar rather than a stub of it.
import "../inlinetoolbar/inlinetoolbar";
// The delete confirmation goes through the real ConfirmDialog when it is
// loaded, as it is here; the native confirm() block removes it for its test.
import "../confirmdialog/confirmdialog";
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
        expect(container.querySelectorAll(".rm-item")).toHaveLength(2);

        rm.removeRelationship("rel-1");
        rm.refresh();

        // DEBT-TEST-1. This asserted nothing, so it passed whether or
        // not the relationship was removed, which is the whole claim.
        const names = [...container.querySelectorAll(".rm-item-name")]
            .map((el) => el.textContent);
        expect(container.querySelectorAll(".rm-item")).toHaveLength(1);
        expect(names.join(" ")).not.toContain("rel-1");

        rm.destroy();
    });

    test("setReadOnly_DisablesEditing", () =>
    {
        const rm = createRelationshipManager(makeOptions({ readOnly: false }));
        expect(container.querySelectorAll(".rm-more-btn").length).toBeGreaterThan(0);

        rm.setReadOnly(true);
        rm.refresh();

        // Read-only removes the delete affordance and keeps navigation,
        // which is the right contract and was asserted nowhere. Writing
        // the assertion is how the contract got read: the first attempt
        // expected the whole .rm-item-actions row to go, and it does not.
        expect(container.querySelectorAll(".rm-more-btn")).toHaveLength(0);
        expect(container.querySelectorAll(".rm-item-actions").length).toBeGreaterThan(0);

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
        rm.collapseAll();
        expect([...container.querySelectorAll<HTMLElement>(".rm-group-body")]
            .every((x) => x.style.display === "none")).toBe(true);

        rm.expandAll();

        const bodies = [...container.querySelectorAll<HTMLElement>(".rm-group-body")];
        expect(bodies.length).toBeGreaterThan(0);
        expect(bodies.some((x) => x.style.display === "none")).toBe(false);

        rm.destroy();
    });

    test("collapseAll_CollapsesAllGroups", () =>
    {
        const rm = createRelationshipManager(makeOptions({ groupByType: true }));
        rm.collapseAll();

        const bodies = [...container.querySelectorAll<HTMLElement>(".rm-group-body")];
        expect(bodies.length).toBeGreaterThan(0);
        expect(bodies.every((b) => b.style.display === "none")).toBe(true);

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
    /*
     * DEBT-TEST-1c. The fake this block used to install called the
     * handler with ONE argument, and the real toolbar passes two: the
     * item and its new active state. A toggle that read the second one
     * would have behaved differently here than on a page, and nothing
     * in the suite could have shown it.
     *
     * The real factory arrives through the side-effect import at the
     * top of the file, which is how a CDN consumer gets it.
     */

    function toolbarButton(id: string): HTMLElement
    {
        const btn = container.querySelector<HTMLElement>(`[data-item-id="${id}"]`);
        if (btn === null) { throw new Error("no toolbar button rendered for " + id); }
        return btn;
    }

    function fireToolbarItem(id: string): void
    {
        toolbarButton(id).click();
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

    test("the real factory is registered, so these tests mount it", () =>
    {
        expect(typeof window.createInlineToolbar).toBe("function");
    });

    test("default off — no toolbar slot mounted", () =>
    {
        const rm = createRelationshipManager(makeOptions());
        expect(container.querySelector(".rm-header-toolbar")).toBeNull();
        expect(container.querySelector("[data-item-id]")).toBeNull();
        rm.destroy();
    });

    test("opt-in mounts the toolbar via factory", () =>
    {
        // The old version asserted an attribute its own fake had set,
        // which proved the fake ran. A real toolbar draws buttons.
        const rm = createRelationshipManager(makeOptions({ showInlineToolbar: true }));
        const slot = container.querySelector(".rm-header-toolbar");

        expect(slot).not.toBeNull();
        expect(slot!.querySelector("[role=\"toolbar\"]")).not.toBeNull();
        expect(slot!.querySelectorAll("[data-item-id]").length).toBeGreaterThan(0);
        rm.destroy();
    });

    test("opt-in without the component — refuses, naming what to load", () =>
    {
        // FALLBACK-14. This used to warn and carry on, so the page got
        // a header strip with nothing in it. `showInlineToolbar` is a
        // capability the caller named.
        //
        // The restore is in a `finally` because the construction now
        // throws, and the import registers the real factory once for
        // the whole file.
        const real = window.createInlineToolbar;
        delete (window as unknown as Record<string, unknown>).createInlineToolbar;

        try
        {
            expect(() => createRelationshipManager(
                makeOptions({ showInlineToolbar: true })))
                .toThrow(/createInlineToolbar is not loaded/);
        }
        finally
        {
            window.createInlineToolbar = real;
        }
    });


    test("a factory that throws — propagates with its cause attached", () =>
    {
        // FALLBACK-14. The old `catch` logged the error and set the
        // handle to null, so the original fault never reached the
        // caller and the toolbar silently did not exist.
        const real = window.createInlineToolbar;
        const boom = new Error("toolbar blew up during construction");
        (window as unknown as Record<string, unknown>).createInlineToolbar =
            () => { throw boom; };
        let caught: Error | null = null;

        try { createRelationshipManager(makeOptions({ showInlineToolbar: true })); }
        catch (e) { caught = e as Error; }
        finally { window.createInlineToolbar = real; }

        expect(caught).not.toBeNull();
        expect((caught as Error & { cause?: unknown }).cause).toBe(boom);
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

// ============================================================================
// PROVENANCE BADGE — UNUSED-1
// ============================================================================

describe("provenance renders as the badge the README documents", () =>
{
    // The provenance was pushed into the dot-separated meta line as
    // a bare uppercased string, and `buildProvenanceBadge` -- which
    // wraps it in the `.rm-provenance` span the SCSS styles -- had
    // no caller. The README calls the option "Show provenance
    // BADGES". The compiler had been reporting the builder as
    // unused since it was written.
    test("the badge span carries the provenance", () =>
    {
        const rm = createRelationshipManager(makeOptions({
            relationships: [makeRelationship({ provenance: "ai" })],
        }));

        const badge = container.querySelector(".rm-provenance");

        expect(badge?.textContent).toBe("AI");
        rm.destroy();
    });

    test("showProvenance false renders no badge", () =>
    {
        const rm = createRelationshipManager(makeOptions({
            relationships: [makeRelationship({ provenance: "ai" })],
            showProvenance: false,
        }));

        expect(container.querySelector(".rm-provenance")).toBeNull();
        rm.destroy();
    });

    test("the meta line still reads the same", () =>
    {
        // The badge replaces a text segment in place, so a reader
        // of `textContent` sees exactly what it did before.
        const rm = createRelationshipManager(makeOptions({
            relationships: [makeRelationship({ provenance: "manual" })],
        }));

        expect(container.querySelector(".rm-item-meta")?.textContent)
            .toBe("service · MANUAL · 2026-03-19");
        rm.destroy();
    });
});

// ============================================================================
// SURFACE CONTRACT (readiness step 2 B7)
// ============================================================================

describe("surface contract (B7)", () =>
{
    /** A manual relationship and an AI-inferred one, so every row action exists. */
    function surfaceRows(): RelationshipInstance[]
    {
        return [
            makeRelationship({ id: "rel-1", otherResourceId: "res-a", otherResourceDisplayName: "Alpha" }),
            makeRelationship({ id: "rel-2", relationshipKey: "owned_by", relationshipDisplayName: "Owned By",
                otherResourceId: "res-b", otherResourceDisplayName: "Beta" }),
            makeRelationship({ id: "rel-ai", provenance: "ai_inferred", confidence: 0.8,
                otherResourceId: "res-c", otherResourceDisplayName: "Gamma" }),
        ];
    }

    /** A definition with a properties form, beside the two without one. */
    function defsWithForm(): RelationshipDefinitionSummary[]
    {
        return [
            ...makeRelDefs(),
            {
                key: "linked_to", displayName: "Linked To", targetTypeKeys: ["doc"], sourceTypeKeys: null,
                cardinality: "many-to-many", propertiesSchema: { note: { title: "Note", type: "string" } },
            },
        ];
    }

    const TARGET = { id: "res-t", displayName: "Target", typeKey: "service" };

    /** Records every legacy call and channel payload, in order. */
    function recorder(): { log: unknown[][]; legacy(name: string): (...a: unknown[]) => Promise<void> }
    {
        const log: unknown[][] = [];

        return {
            log,
            legacy: (name: string) => (...a: unknown[]) => { log.push([name, ...a]); return Promise.resolve(); },
        };
    }

    /** Subscribes to every channel, recording into `log`. */
    function listen(rm: RelationshipManager, log: unknown[][]): void
    {
        for (const channel of ["createRelationship", "deleteRelationship", "navigate", "confirmInferred",
            "dismissInferred"])
        {
            rm.on(channel, (p) => log.push([`channel:${channel}`, p]));
        }
    }

    /** The row whose name is `name`. */
    function row(name: string): HTMLElement
    {
        return Array.from(container.querySelectorAll<HTMLElement>(".rm-item"))
            .find((i) => i.querySelector(".rm-item-name")?.textContent === name)!;
    }

    /** Opens the Add panel, picks the definition named `def`, types `query` and waits out the debounce. */
    async function searchFor(def: string, query: string): Promise<void>
    {
        container.querySelector<HTMLElement>(".rm-add-btn")!.click();
        Array.from(container.querySelectorAll<HTMLElement>(".rm-def-item"))
            .find((i) => i.querySelector(".rm-def-name")?.textContent === def)!.click();
        const input = container.querySelector<HTMLInputElement>(".rm-search-input")!;
        input.value = query;
        input.dispatchEvent(new Event("input"));
        await vi.advanceTimersByTimeAsync(300);
    }

    const panelOpen = (): boolean =>
        container.querySelector<HTMLElement>(".rm-add-panel")!.style.display !== "none";

    afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

    test("on() refuses an undeclared channel and returns a working unsubscribe", () =>
    {
        const rm = createRelationshipManager(makeOptions({ relationships: surfaceRows() }));
        const seen: unknown[] = [];

        expect(() => rm.on("select", () => undefined)).toThrow(/unknown channel/);
        const off = rm.on("navigate", (p) => seen.push(p));
        off();
        row("Alpha").querySelector<HTMLElement>('[aria-label="Navigate to resource"]')!.click();

        expect(seen).toEqual([]);
        rm.destroy();
    });

    test("navigate, confirmInferred and dismissInferred fire after their legacy callbacks, with the id", () =>
    {
        const { log, legacy } = recorder();
        const rm = createRelationshipManager(makeOptions({ relationships: surfaceRows(),
            onNavigate: legacy("onNavigate"), onConfirmInferred: legacy("onConfirmInferred"),
            onDismissInferred: legacy("onDismissInferred") }));
        listen(rm, log);

        row("Alpha").querySelector<HTMLElement>('[aria-label="Navigate to resource"]')!.click();
        row("Gamma").querySelector<HTMLElement>(".rm-confirm-btn")!.click();
        row("Gamma").querySelector<HTMLElement>(".rm-dismiss-btn")!.click();

        expect(log).toEqual([
            ["onNavigate", "res-a"], ["channel:navigate", "res-a"],
            ["onConfirmInferred", "rel-ai"], ["channel:confirmInferred", "rel-ai"],
            ["onDismissInferred", "rel-ai"], ["channel:dismissInferred", "rel-ai"],
        ]);
        rm.destroy();
    });

    test("the row channels fire without their legacy callbacks", () =>
    {
        const log: unknown[][] = [];
        const rm = createRelationshipManager(makeOptions({ relationships: surfaceRows() }));
        listen(rm, log);

        row("Beta").querySelector<HTMLElement>('[aria-label="Navigate to resource"]')!.click();
        row("Gamma").querySelector<HTMLElement>(".rm-confirm-btn")!.click();

        expect(log).toEqual([["channel:navigate", "res-b"], ["channel:confirmInferred", "rel-ai"]]);
        rm.destroy();
    });

    test("deleteRelationship fires after onDeleteRelationship once the native confirm says yes", () =>
    {
        const { log, legacy } = recorder();
        const dialog = window.showConfirmDialog;
        delete window.showConfirmDialog;

        try
        {
            const rm = createRelationshipManager(makeOptions({ relationships: surfaceRows(),
                onDeleteRelationship: legacy("onDeleteRelationship") }));
            listen(rm, log);
            const ask = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);

            row("Alpha").querySelector<HTMLElement>(".rm-more-btn")!.click();
            row("Alpha").querySelector<HTMLElement>(".rm-more-btn")!.click();

            expect(ask).toHaveBeenCalledTimes(2);
            expect(log).toEqual([["onDeleteRelationship", "rel-1"], ["channel:deleteRelationship", "rel-1"]]);
            rm.destroy();
        }
        finally
        {
            window.showConfirmDialog = dialog;
        }
    });

    test("deleteRelationship fires once the user confirms in ConfirmDialog, without a legacy callback", async () =>
    {
        const log: unknown[][] = [];
        const rm = createRelationshipManager(makeOptions({ relationships: surfaceRows() }));
        listen(rm, log);

        row("Beta").querySelector<HTMLElement>(".rm-more-btn")!.click();
        document.querySelector<HTMLElement>(".confirmdialog-cancel")!.click();
        await Promise.resolve();
        expect(log).toEqual([]);

        row("Beta").querySelector<HTMLElement>(".rm-more-btn")!.click();
        document.querySelector<HTMLElement>(".confirmdialog-confirm")!.click();
        await Promise.resolve();

        expect(log).toEqual([["channel:deleteRelationship", "rel-2"]]);
        rm.destroy();
    });

    test("with onCreateRelationship, the panel closes and createRelationship fires after its promise settles",
        async () =>
        {
            vi.useFakeTimers();
            const log: unknown[][] = [];
            let settle: () => void = () => undefined;
            const rm = createRelationshipManager(makeOptions({
                relationships: surfaceRows(),
                onSearchResources: (q, t) =>
                {
                    log.push(["onSearchResources", q, t]);
                    return Promise.resolve([TARGET]);
                },
                onCreateRelationship: (r) =>
                {
                    log.push(["onCreateRelationship", r]);
                    return new Promise<void>((resolve) => { settle = resolve; });
                },
            }));
            listen(rm, log);

            await searchFor("Owned By", "ta");
            container.querySelector<HTMLElement>(".rm-search-item")!.click();

            const request = { targetResourceId: "res-t", relationshipKey: "owned_by", properties: {} };
            expect(log).toEqual([["onSearchResources", "ta", ["user"]], ["onCreateRelationship", request]]);
            expect(panelOpen()).toBe(true);

            settle();
            await vi.advanceTimersByTimeAsync(0);

            expect(panelOpen()).toBe(false);
            expect(log.slice(2)).toEqual([["channel:createRelationship", request]]);
            rm.destroy();
        });

    test("without onCreateRelationship, a createRelationship subscriber hears the step 3 form and the panel closes",
        async () =>
        {
            vi.useFakeTimers();
            const log: unknown[][] = [];
            const rm = createRelationshipManager(makeOptions({
                relationships: surfaceRows(), relationshipDefinitions: defsWithForm(), showAddButton: true,
                onSearchTargets: (r) => { log.push(["onSearchTargets", r]); return Promise.resolve([TARGET]); },
            }));
            listen(rm, log);

            await searchFor("Linked To", "tar");
            container.querySelector<HTMLElement>(".rm-search-item")!.click();
            container.querySelector<HTMLInputElement>('.rm-props-form input[name="note"]')!.value = "weekly";
            container.querySelector<HTMLElement>(".rm-create-btn")!.click();

            expect(log).toEqual([
                ["onSearchTargets", { query: "tar", typeKeys: ["doc"] }],
                ["channel:createRelationship",
                    { targetResourceId: "res-t", relationshipKey: "linked_to", properties: { note: "weekly" } }],
            ]);
            expect(panelOpen()).toBe(false);
            rm.destroy();
        });

    test("with neither onCreateRelationship nor a subscriber, picking a target does nothing, as before", async () =>
    {
        vi.useFakeTimers();
        const rm = createRelationshipManager(makeOptions({ relationships: surfaceRows(), showAddButton: true,
            onSearchTargets: () => Promise.resolve([TARGET]) }));

        await searchFor("Depends On", "ta");
        container.querySelector<HTMLElement>(".rm-search-item")!.click();

        expect(panelOpen()).toBe(true);
        rm.destroy();
    });

    test("onSearchTargets gets { query, typeKeys }; an empty targetTypeKeys asks with []", async () =>
    {
        vi.useFakeTimers();
        const asked: unknown[] = [];
        const rm = createRelationshipManager(makeOptions({ showAddButton: true,
            onSearchTargets: (r) => { asked.push(r); return Promise.resolve([TARGET]); } }));

        await searchFor("Depends On", "t");
        await searchFor("Depends On", "targ");

        expect(asked).toEqual([{ query: "targ", typeKeys: [] }]);
        expect(container.querySelector(".rm-search-name")?.textContent).toBe("Target");
        rm.destroy();
    });

    test("passing both onSearchResources and onSearchTargets throws, naming both", () =>
    {
        expect(() => createRelationshipManager(makeOptions({
            onSearchResources: () => Promise.resolve([]),
            onSearchTargets: () => Promise.resolve([]),
        }))).toThrow(/onSearchResources.*onSearchTargets/);
    });

    test("setData(\"relationships\") replaces the rows silently, keeping the open Add panel, collapse, sort and scroll",
        async () =>
        {
            vi.useFakeTimers();
            const log: unknown[][] = [];
            const fired = (name: string) => (...a: unknown[]) => { log.push([name, ...a]); return Promise.resolve(); };
            const rm = createRelationshipManager(makeOptions({
                relationships: surfaceRows(),
                onSearchTargets: (r) => { log.push(["onSearchTargets", r]); return Promise.resolve([TARGET]); },
                onCreateRelationship: fired("onCreateRelationship"), onSortModeChange: fired("onSortModeChange"),
                onCollapseStateChange: fired("onCollapseStateChange"),
            }));
            rm.setSortMode("desc");
            container.querySelectorAll<HTMLElement>(".rm-group-header")[0].click();
            await searchFor("Owned By", "tar");
            container.querySelector<HTMLElement>(".rm-list")!.scrollTop = 40;
            log.length = 0;
            listen(rm, log);

            rm.setData("relationships", [
                ...surfaceRows().slice(1),
                makeRelationship({ id: "rel-new", otherResourceDisplayName: "Delta" }),
            ]);

            expect(log).toEqual([]);
            expect(container.textContent).toContain("Delta");
            expect(container.textContent).not.toContain("Alpha");
            expect(rm.getState()).toEqual({ sortMode: "desc", collapsed: ["Owned By"] });
            expect(container.querySelector(".rm-add-step")?.textContent).toBe("Step 2 of 3");
            expect(container.querySelector<HTMLInputElement>(".rm-search-input")!.value).toBe("tar");
            expect(container.querySelector(".rm-search-name")?.textContent).toBe("Target");
            expect(container.querySelector<HTMLElement>(".rm-list")!.scrollTop).toBe(40);

            // The add flow is still live: picking the target creates against the definition the user chose.
            container.querySelector<HTMLElement>(".rm-search-item")!.click();
            expect(log).toEqual([["onCreateRelationship",
                { targetResourceId: "res-t", relationshipKey: "owned_by", properties: {} }]]);
            rm.destroy();
        });

    test("setData refuses another slot, a non-array and a row without a string id", () =>
    {
        const rm = createRelationshipManager(makeOptions());

        expect(() => rm.setData("rows", [])).toThrow(/unknown slot "rows"/);
        expect(() => rm.setData("relationships", { id: "x" })).toThrow(/expected an array/);
        expect(() => rm.setData("relationships", [makeRelationship(), { name: "no id" }])).toThrow(/relationship 1/);
        rm.destroy();
    });

    test("getState reports sortMode and the collapsed groups; setState restores them silently", () =>
    {
        const log: unknown[][] = [];
        const rm = createRelationshipManager(makeOptions({ relationships: surfaceRows(),
            onSortModeChange: (m) => log.push(["onSortModeChange", m]),
            onCollapseStateChange: (s) => log.push(["onCollapseStateChange", s]) }));

        expect(rm.getState()).toEqual({ sortMode: null, collapsed: [] });

        rm.setState({ sortMode: "asc", collapsed: ["AI Suggested", "Depends On"] });

        expect(log).toEqual([]);
        expect(rm.getSortMode()).toBe("asc");
        expect(rm.getState()).toEqual({ sortMode: "asc", collapsed: ["AI Suggested", "Depends On"] });
        const labels = Array.from(container.querySelectorAll(".rm-group-label")).map((l) => l.textContent);
        expect(labels).toEqual(["Depends On (1)", "Owned By (1)", "AI Suggested (1)"]);
        const hidden = Array.from(container.querySelectorAll<HTMLElement>(".rm-group-body"))
            .map((b) => b.style.display === "none");
        expect(hidden).toEqual([true, false, true]);

        rm.setState({ collapsed: [] });
        expect(rm.getState()).toEqual({ sortMode: "asc", collapsed: [] });
        rm.setState(rm.getState());
        expect(rm.getState()).toEqual({ sortMode: "asc", collapsed: [] });
        rm.destroy();
    });

    test("setState refuses an unknown sortMode and a collapsed that is not an array of group names", () =>
    {
        const rm = createRelationshipManager(makeOptions());

        expect(() => rm.setState({ sortMode: "up" })).toThrow(/sortMode/);
        expect(() => rm.setState({ collapsed: "Depends On" })).toThrow(/collapsed/);
        expect(() => rm.setState({ collapsed: [1] })).toThrow(/collapsed/);
        rm.destroy();
    });

    test("getElement returns the root the component mounted", () =>
    {
        const rm = createRelationshipManager(makeOptions());

        expect(rm.getElement()).toBe(container.querySelector(".rm-root"));
        rm.destroy();
        expect(rm.getElement()).toBeNull();
    });
});
