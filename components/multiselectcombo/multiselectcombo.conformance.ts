/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: MultiselectCombo / ConformanceGlue
 * PURPOSE: Supplies the minimum options this component needs to MOUNT during
 *    the conformance run.
 *
 *    These are test fixtures and deliberately do NOT live in the manifest's
 *    defaultOptions: that field is shipped to consumers via
 *    capability-manifest.json and is what the canvas passes when a host
 *    supplies nothing. A fixture there would put placeholder content in front
 *    of real users.
 * RELATES: [[MultiselectCombo]], [[Conformance]]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker multiselectcombo-conformance-glue

/** The slice of the handle the trigger drives. */
interface MultiselectComboLike
{
    open(): void;
    getElement(): HTMLElement;
}

const ITEMS = [
    { value: "one", label: "One" },
    { value: "two", label: "Two" },
];

export const CONFORMANCE_GLUE =
{
    options: { items: ITEMS },

    // The options to pick from; an agent sets these too.
    eventProps: { items: ITEMS },

    // A rewrite that keeps the picked options, as an agent's does: a selection whose option was removed is
    // dropped, so it cannot be restored.
    slotSamples: { items: [...ITEMS, { value: "three", label: "Three" }] },

    /** Opens the dropdown and clicks the first option (readiness step 3). */
    trigger: (
        channel: string,
        handle: Record<string, unknown>): boolean =>
    {
        if (channel !== "change") { return false; }

        const combo = handle as unknown as MultiselectComboLike;

        combo.open();
        const row = combo.getElement().querySelector<HTMLElement>(".multiselectcombo-item");

        row?.click();

        return row != null;
    },
};
