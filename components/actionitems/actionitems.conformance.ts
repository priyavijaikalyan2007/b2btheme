/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: ActionItems / ConformanceGlue
 * 📜 PURPOSE: The mount fixture and channel triggers for the conformance gate
 *    and A2UI G3: the + Add button, an inline edit, the status icon, a
 *    keyboard move, the assignee chip, row clicks and the bulk toolbar
 *    (readiness step 2 B7).
 * 🔗 RELATES: [[ActionItems]], [[Conformance]]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker actionitems-conformance-glue

/** Minimal view of the handle, limited to what the trigger needs. */
interface ActionItemsLike
{
    getElement(): HTMLElement;
}

/** A complete item: every field ActionItem requires, as an agent sends it. */
function item(id: string, order: number, content: string, status: string): Record<string, unknown>
{
    return {
        id, index: order, order, content, status, tags: [], commentCount: 0,
        createdAt: "2026-10-29T09:00:00.000Z", updatedAt: "2026-10-29T09:00:00.000Z",
    };
}

/**
 * Two siblings to move between, and items in each other section. The triggers run in manifest order on one
 * instance: the edits and moves first, then the deletes, which leave i1 and i2.
 */
const ITEMS = [
    item("i1", 1, "Draft the agenda", "not-started"),
    item("i2", 2, "Book the room", "not-started"),
    item("i3", 3, "Collect the slides", "in-progress"),
    item("i4", 4, "Send the invite", "done"),
];

/** The root element; every gesture re-renders, which replaces it, so it is looked up afresh each time. */
type Root = () => HTMLElement;

/** The row for an item id. */
function row(root: Root, id: string): HTMLElement | null
{
    return root().querySelector<HTMLElement>(`.actionitems-item[data-id="${id}"]`);
}

/** Clicks a row as the user does: a plain click selects it alone, a Ctrl+click adds it. */
function clickRow(root: Root, id: string, add = false): boolean
{
    const target = row(root, id);
    target?.dispatchEvent(new MouseEvent("click", { bubbles: true, ctrlKey: add }));
    return target !== null;
}

/**
 * Clicks + Add, which creates an empty item in an edit box (itemCreate), then leaves the box empty, which
 * removes the item again (itemDelete). Leaving it open would block every later keyboard gesture.
 */
function addAndAbandon(root: Root): boolean
{
    root().querySelector<HTMLElement>(".actionitems-add")?.click();
    const input = root().querySelector<HTMLInputElement>(".actionitems-edit-input");
    input?.dispatchEvent(new Event("blur"));
    return input !== null;
}

export const CONFORMANCE_GLUE =
{
    options: { items: ITEMS },

    // What an agent sets for a list the user works through.
    eventProps: { items: ITEMS },

    // The round trip refills the slot after the triggers: rows that keep the ids the triggers left selected
    // ("i2", clicked by the selection trigger), because the slot keeps the user's selection by design and
    // setState keeps only ids that exist. With the selection kept nothing observable changes, so the round
    // trip records a warning rather than a pass.
    slotSamples: { items: [ITEMS[1], ITEMS[0], item("i5", 5, "Print the handouts", "in-progress")] },

    trigger: (
        channel: string,
        handle: Record<string, unknown>): boolean =>
    {
        const root: Root = () => (handle as unknown as ActionItemsLike).getElement();

        switch (channel)
        {
            case "itemCreate":
            case "itemDelete":
                return addAndAbandon(root);
            case "itemUpdate":
            {
                row(root, "i1")?.querySelector<HTMLElement>(".actionitems-content")?.click();
                const input = row(root, "i1")?.querySelector<HTMLInputElement>(".actionitems-edit-input");
                if (!input) { return false; }
                input.value = "Draft the agenda and minutes";
                input.dispatchEvent(new Event("blur"));
                return true;
            }
            case "statusChange":
            {
                const status = row(root, "i4")?.querySelector<HTMLElement>(".actionitems-status-indicator");
                status?.click();
                return status != null;
            }
            case "itemReorder":
                if (!clickRow(root, "i1")) { return false; }
                root().dispatchEvent(new KeyboardEvent("keydown",
                    { key: "ArrowDown", ctrlKey: true, shiftKey: true, bubbles: true }));
                return true;
            case "assignmentRequest":
            {
                const chip = row(root, "i2")?.querySelector<HTMLElement>(".actionitems-assignee");
                chip?.click();
                return chip != null;
            }
            case "bulkDelete":
            {
                if (!clickRow(root, "i3") || !clickRow(root, "i4", true)) { return false; }
                const button = root().querySelector<HTMLElement>(".actionitems-bulk-btn-danger");
                if (!button) { return false; }
                // The bulk Delete asks window.confirm first; jsdom has none, so the user's OK is stubbed.
                const confirm = window.confirm;
                window.confirm = () => true;
                try { button.click(); }
                finally { window.confirm = confirm; }
                return true;
            }
            case "bulkAssign":
            {
                if (!clickRow(root, "i1") || !clickRow(root, "i2", true)) { return false; }
                const assign = Array.from(root().querySelectorAll<HTMLElement>(".actionitems-bulk-btn"))
                    .find((b) => b.textContent === "Assign");
                assign?.click();
                return assign !== undefined;
            }
            case "selection":
                return clickRow(root, "i2");
            default:
                return false;
        }
    },
};
