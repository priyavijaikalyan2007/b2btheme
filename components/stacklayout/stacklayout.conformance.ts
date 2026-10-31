/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: StackLayout / ConformanceGlue
 * PURPOSE: Supplies the minimum options this component needs to MOUNT during
 *    the conformance run.
 *
 *    These are test fixtures and deliberately do NOT live in the manifest's
 *    defaultOptions: that field is shipped to consumers via
 *    capability-manifest.json and is what the canvas passes when a host
 *    supplies nothing. A fixture there would put placeholder content in front
 *    of real users.
 *
 *    `content` is an HTMLElement, so the fixture has to build one. It cannot be
 *    expressed in defaultOptions at all — JSON carries no elements.
 *
 *    MEASURED 2026-10-10: the gate passes with no panels too, because the
 *    stacklayout root div is itself content as far as renders-content is
 *    concerned. One panel is what makes the check build a divider and a header.
 * RELATES: [[StackLayout]], [[Conformance]]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker stacklayout-conformance-glue

/** The slice of the handle the trigger drives. */
interface StackLayoutLike
{
    getElement(): HTMLElement;
}

/** Drags the first divider down 50px. jsdom lays nothing out and has no pointer capture; a browser has both. */
function dragDivider(root: HTMLElement): boolean
{
    const divider = root.querySelector<HTMLElement>(".stacklayout-divider");

    if (!divider) { return false; }

    Element.prototype.setPointerCapture ??= () => undefined;
    Element.prototype.releasePointerCapture ??= () => undefined;
    root.getBoundingClientRect = () => ({ x: 0, y: 0, top: 0, left: 0, right: 400, bottom: 600, width: 400,
        height: 600, toJSON: () => ({}) });

    divider.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, clientY: 100 }));
    document.dispatchEvent(new MouseEvent("pointermove", { bubbles: true, clientY: 150 }));
    document.dispatchEvent(new MouseEvent("pointerup", { bubbles: true, clientY: 150 }));

    return true;
}

export const CONFORMANCE_GLUE =
{
    options:
    {
        panels:
        [
            { id: "first", title: "First", content: document.createElement("div") },
            { id: "second", title: "Second", content: document.createElement("div") },
        ],
    },

    // Two panels as an agent writes them: content is a component id, which the adapter renders (ADR-238).
    eventProps: { panels: [{ id: "first", title: "First", content: "first-child" },
        { id: "second", title: "Second", content: "second-child" }] },

    /** Clicks the first header (collapse) or drags the divider (resize) (readiness step 4). */
    trigger: (
        channel: string,
        handle: Record<string, unknown>): boolean =>
    {
        const root = (handle as unknown as StackLayoutLike).getElement();

        if (channel === "collapse")
        {
            const header = root.querySelector<HTMLElement>(".stacklayout-header");

            header?.click();

            return header != null;
        }

        return channel === "resize" && dragDivider(root);
    },
};
