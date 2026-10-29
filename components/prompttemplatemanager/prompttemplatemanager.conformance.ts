/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: PromptTemplateManager / ConformanceGlue
 * 📜 PURPOSE: The mount fixture and channel triggers for the conformance gate
 *    and A2UI G3: clicks a list item, then the Save, Delete and Duplicate
 *    buttons (readiness step 2 B7).
 * 🔗 RELATES: [[PromptTemplateManager]], [[Conformance]]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker prompttemplatemanager-conformance-glue

/** Minimal view of the handle, limited to what the trigger needs. */
interface PromptTemplateManagerLike
{
    getElement(): HTMLElement;
}

/** A spy the gate injects for a legacy option; it records the value and returns what push() returns. */
type Spy = (value: unknown) => unknown;

/** Two templates with variables, so a list click selects something other than the first. */
const TEMPLATES = [
    { id: "t1", name: "Greeting", content: "Hello {{name}}, welcome to {{place}}.", category: "General" },
    { id: "t2", name: "Farewell", content: "Goodbye {{name}}.", category: "General" },
];

/** The button each detail channel's click comes from; it acts on the selected template. */
const BUTTONS: Record<string, string> = {
    save: ".promptmanager-btn-save",
    delete: ".promptmanager-btn-delete",
    duplicate: ".promptmanager-btn-duplicate",
};

export const CONFORMANCE_GLUE =
{
    options: { templates: TEMPLATES, categories: ["General"] },

    // What an agent sets for a library it can edit.
    eventProps: { templates: TEMPLATES, categories: ["General"] },

    // The round trip refills the slot after the triggers: rows that keep the selected id ("t2", clicked by the
    // select trigger; the delete only lands after the gate's synchronous checks), because the slot keeps the
    // user's selection by design and setState refuses an id that is gone. With the selection kept nothing
    // observable changes, so the round trip records a warning rather than a pass.
    slotSamples: { templates: [...TEMPLATES].reverse() },

    // The gate's legacy spies return a number, but onSave, onDelete and onDuplicate return a Promise of the saved
    // template, a go-ahead and the copy, and the component reads the answer. Each spy still runs first and
    // synchronously, and the host answer the contract asks for is returned, so the gate is a well-behaved host.
    invoke: (
        factory: unknown,
        hostId: string,
        options: Record<string, unknown>): unknown =>
    {
        const create = factory as (opts: Record<string, unknown>, containerId: string) => unknown;

        return create({
            ...options,
            onSave: (t: unknown) => { (options.onSave as Spy)(t); return Promise.resolve(t); },
            onDelete: (id: unknown) => { (options.onDelete as Spy)(id); return Promise.resolve(true); },
            onDuplicate: (t: unknown) => { (options.onDuplicate as Spy)(t); return Promise.resolve(t); },
        }, hostId);
    },

    trigger: (
        channel: string,
        handle: Record<string, unknown>): boolean | "async" =>
    {
        const root = (handle as unknown as PromptTemplateManagerLike).getElement();

        if (channel === "select")
        {
            const item = root.querySelector<HTMLElement>('.promptmanager-list-item[data-template-id="t2"]');
            item?.click();
            return item !== null;
        }

        const selector = BUTTONS[channel];
        const button = selector ? root.querySelector<HTMLElement>(selector) : null;
        if (!button) { return false; }

        // The legacy callback is awaited before the channel fires; with none (over A2UI) it fires at once.
        button.click();
        return "async";
    },
};
