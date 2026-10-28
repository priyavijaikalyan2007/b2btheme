/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: DynamicFormSwitcher / ConformanceGlue
 * PURPOSE: Supplies the minimum options this component needs to MOUNT during
 *    the conformance run.
 *
 *    `variants` and `initialVariant` are required and the factory throws
 *    without them, so they cannot live in the manifest's defaultOptions: that
 *    field ships to consumers in capability-manifest.json and is what the
 *    canvas passes when a host supplies nothing. A variant catalogue there
 *    would put a made-up form in front of real users.
 *
 *    THE FIXTURE IS LOAD-BEARING, and it is load-bearing for the mount rather
 *    than for the render: `createDynamicFormSwitcher` throws
 *    "'variants' is required" before it builds anything. That puts this
 *    component in the data-changes-render group that passes because the bare
 *    mount cannot construct at all, alongside docviewer, multiselectcombo,
 *    stepper and timeline.
 *
 *    Two variants rather than one, because a single-variant switcher never
 *    renders its selector and the run would walk a form rather than a
 *    switcher.
 * RELATES: [[DynamicFormSwitcher]], [[Conformance]]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker dynamicformswitcher-conformance-glue

/** Minimal view of the handle, limited to what the trigger needs. */
interface DynamicFormSwitcherLike
{
    getElement(): HTMLElement;
}

/**
 * Two variants keyed by the sampler's first two strings, so G3's sampled
 * initialVariant names one of them.
 */
const SAMPLED_VARIANTS = {
    a: { label: "First", fields: [{ name: "endpoint", label: "Endpoint", type: "url" }] },
    b: { label: "Second", fields: [{ name: "region", label: "Region", type: "text" }] },
};

export const CONFORMANCE_GLUE =
{
    options:
    {
        variants:
        {
            primary:
            {
                label: "Primary",
                fields: [
                    { name: "endpoint", label: "Endpoint", type: "url", required: true },
                    { name: "token", label: "Token", type: "password" },
                ],
            },
            secondary:
            {
                label: "Secondary",
                fields: [
                    { name: "region", label: "Region", type: "text" },
                ],
            },
        },
        initialVariant: "primary",
        showSelector: true,
    },

    heldProps: { variants: SAMPLED_VARIANTS },

    trigger: (
        channel: string,
        handle: Record<string, unknown>): boolean =>
    {
        const field = (handle as unknown as DynamicFormSwitcherLike).getElement()
            .querySelector<HTMLInputElement>("input[name]");

        if (channel !== "change" || !field) { return false; }

        field.value = "https://fixture.example";
        field.dispatchEvent(new Event("input", { bubbles: true }));

        return true;
    },
};
