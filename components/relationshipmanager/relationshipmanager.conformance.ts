/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: RelationshipManager / ConformanceGlue
 * 📜 PURPOSE: The mount fixture, channel triggers and search request for the
 *    conformance gate and A2UI G3: the Add flow, a row's delete, navigate,
 *    confirm and dismiss buttons, and typing a target search (readiness step 2
 *    B7). The fixture lives here rather than in the manifest, because manifest
 *    defaultOptions ship to consumers and this is placeholder content.
 * 🔗 RELATES: [[RelationshipManager]], [[Conformance]]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker relationshipmanager-conformance-glue

/**
 * Minimal view of the handle, limited to what the triggers need. renderSearchResults is private: no provider
 * answers in the gate or in G3's event test, so the createRelationship trigger shows a result the way an
 * answered search does and then clicks it like the user.
 */
interface RelationshipManagerLike
{
    getElement(): HTMLElement | null;
    renderSearchResults(results: unknown[]): void;
}

/** A spy the gate injects for a legacy option; it records the value and returns what push() returns. */
type Spy = (value: unknown) => unknown;

/** A complete relationship: every field RelationshipInstance requires, as an agent sends it. */
function relationship(id: string, name: string, provenance: string, extra: object = {}): Record<string, unknown>
{
    return {
        id, relationshipKey: "depends_on", relationshipDisplayName: "Depends On", direction: "outbound",
        otherResourceId: `res-${id}`, otherResourceDisplayName: name, otherResourceType: "service",
        properties: {}, provenance, createdAt: "2026-10-29T09:00:00.000Z", ...extra,
    };
}

/** A manual relationship and an AI-inferred one, so every row button exists. */
const RELATIONSHIPS = [
    relationship("r1", "Billing API", "manual"),
    relationship("r2", "Ledger", "ai_inferred", { confidence: 0.8 }),
];

/** One definition that creates as soon as a target is picked, and one with a properties form. */
const DEFINITIONS = [
    { key: "depends_on", displayName: "Depends On", targetTypeKeys: ["service"], sourceTypeKeys: null,
        cardinality: "many-to-many" },
    { key: "documented_by", displayName: "Documented By", targetTypeKeys: ["doc"], sourceTypeKeys: null,
        cardinality: "many-to-one", propertiesSchema: { section: { title: "Section", type: "string" } } },
];

/** What an agent sets: the resource, its definitions and relationships, and the Add button (no callback). */
const FIXTURE = {
    resourceId: "svc-checkout",
    resourceType: "service",
    resourceDisplayName: "Checkout",
    relationshipDefinitions: DEFINITIONS,
    relationships: RELATIONSHIPS,
    showAddButton: true,
};

/** The root element; every gesture re-renders the list, so elements are looked up afresh. */
function rootOf(handle: Record<string, unknown>): HTMLElement
{
    return (handle as unknown as RelationshipManagerLike).getElement()!;
}

/** Clicks + Add, then the "Depends On" definition, which opens the target search (step 2). */
function openSearch(root: HTMLElement): HTMLInputElement | null
{
    root.querySelector<HTMLElement>(".rm-add-btn")?.click();
    root.querySelector<HTMLElement>(".rm-def-item")?.click();

    return root.querySelector<HTMLInputElement>(".rm-search-input");
}

/** Clicks a button on the row for `name`. */
function clickRowButton(root: HTMLElement, name: string, selector: string): boolean
{
    const row = Array.from(root.querySelectorAll<HTMLElement>(".rm-item"))
        .find((item) => item.querySelector(".rm-item-name")?.textContent === name);
    const button = row?.querySelector<HTMLElement>(selector);

    button?.click();

    return button != null;
}

/**
 * Clicks the row's delete button and says yes: in ConfirmDialog when it is loaded (G3 loads it as a declared
 * dependency), whose answer arrives after its promise settles, else to window.confirm, which jsdom lacks.
 */
function deleteRow(root: HTMLElement): boolean | "async"
{
    if ("showConfirmDialog" in window)
    {
        if (!clickRowButton(root, "Billing API", ".rm-more-btn")) { return false; }
        const yes = Array.from(root.ownerDocument.querySelectorAll<HTMLElement>(".confirmdialog-confirm")).pop();
        yes?.click();
        return yes ? "async" : false;
    }

    const confirm = window.confirm;
    window.confirm = () => true;

    try { return clickRowButton(root, "Billing API", ".rm-more-btn"); }
    finally { window.confirm = confirm; }
}

export const CONFORMANCE_GLUE =
{
    options: FIXTURE,

    // What an agent sets for a list the user edits: showAddButton, since over A2UI no callback is passed.
    eventProps: FIXTURE,

    /** Create-time props a search request needs: the Add button and a definition to search for. */
    requestProps: { showAddButton: true, relationshipDefinitions: DEFINITIONS },

    // The generic { id, name } rows lack what a relationship requires (createdAt, properties, ...). The slot
    // keeps the sort and the collapsed groups by design, so nothing observable changes and the round trip
    // records a warning rather than a pass.
    slotSamples: { relationships: [RELATIONSHIPS[1], relationship("r3", "Audit Log", "manual")] },

    // The gate's legacy spies return a number, but onCreateRelationship returns a Promise the component waits
    // for before it closes the panel and emits. The spy still runs first and synchronously, and the settled
    // promise the contract asks for is returned, so the gate is a well-behaved host. Options-only: the
    // container goes in the options, as the manifest's factoryStyle says.
    invoke: (
        factory: unknown,
        hostId: string,
        options: Record<string, unknown>): unknown =>
    {
        const create = factory as (opts: Record<string, unknown>) => unknown;

        return create({
            ...options,
            container: document.getElementById(hostId),
            onCreateRelationship: (r: unknown) =>
            {
                (options.onCreateRelationship as Spy)(r);
                return Promise.resolve();
            },
        });
    },

    trigger: (
        channel: string,
        handle: Record<string, unknown>): boolean | "async" =>
    {
        const root = rootOf(handle);

        switch (channel)
        {
            case "createRelationship":
            {
                if (!openSearch(root)) { return false; }
                (handle as unknown as RelationshipManagerLike).renderSearchResults(
                    [{ id: "svc-ledger", displayName: "Ledger", typeKey: "service" }]);
                const result = root.querySelector<HTMLElement>(".rm-search-item");
                if (!result) { return false; }
                // The legacy callback is awaited before the channel fires; with none (over A2UI) it fires at once.
                result.click();
                return "async";
            }
            case "deleteRelationship":
                return deleteRow(root);
            case "navigate":
                return clickRowButton(root, "Billing API", '[aria-label="Navigate to resource"]');
            case "confirmInferred":
                return clickRowButton(root, "Ledger", ".rm-confirm-btn");
            case "dismissInferred":
                return clickRowButton(root, "Ledger", ".rm-dismiss-btn");
            default:
                return false;
        }
    },

    /** Makes the component ask its provider (ADR-225): type a target search; it is sent after the debounce. */
    request: (
        request: string,
        handle: Record<string, unknown>): boolean =>
    {
        if (request !== "search") { return false; }

        const input = openSearch(rootOf(handle));

        if (!input) { return false; }

        input.value = "led";
        input.dispatchEvent(new Event("input", { bubbles: true }));

        return true;
    },
};
