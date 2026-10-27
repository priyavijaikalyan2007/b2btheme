/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: A2uiPlayground / Layout
 * 📜 PURPOSE: The page's regions (#30 spec §5.1): a toolbar, then messages |
 *    surfaces | inspect above the agent pane, from two nested SplitLayouts.
 * 🔗 RELATES: [[A2uiPlayground]], [[SplitLayout]]
 * ----------------------------------------------------------------------------
 */

import { factory, pane } from "./factory";
import type { SplitLayoutHandle } from "./factory";

type CreateSplitLayout = (options: Record<string, unknown>, containerId?: string) => SplitLayoutHandle;

export interface Regions
{
    readonly toolbarEl: HTMLElement;
    readonly messagesEl: HTMLElement;
    readonly surfacesEl: HTMLElement;
    readonly inspectEl: HTMLElement;
    readonly agentEl: HTMLElement;
}

/** Builds the regions inside #app. */
export function buildLayout(app: HTMLElement): Regions
{
    const toolbarEl = region("div", "a2ui-toolbar");
    const main = region("div", "a2ui-main");

    main.id = "a2ui-main";
    app.append(toolbarEl, main);

    const create = factory<CreateSplitLayout>("createSplitLayout");
    const outer = create({ orientation: "vertical", panes: [{ id: "top", initialSize: "70%" },
        { id: "agent", initialSize: "30%", minSize: 120 }] }, "a2ui-main");

    pane(outer, "top").id = "a2ui-top";

    const inner = create({ orientation: "horizontal", panes: [{ id: "messages", initialSize: "26%", minSize: 180 },
        { id: "surfaces", initialSize: "1fr", minSize: 240 }, { id: "inspect", initialSize: "30%", minSize: 220 }] },
    "a2ui-top");

    return { toolbarEl, messagesEl: fill(pane(inner, "messages")), surfacesEl: fill(pane(inner, "surfaces"), true),
        inspectEl: fill(pane(inner, "inspect")), agentEl: fill(pane(outer, "agent")) };
}

function region(tag: string, className: string): HTMLElement
{
    const el = document.createElement(tag);

    el.className = className;

    return el;
}

/** A full-size child of a pane, which the region's content mounts into. */
function fill(paneEl: HTMLElement, surfaces = false): HTMLElement
{
    const el = region("div", surfaces ? "a2ui-pane a2ui-surfaces" : "a2ui-pane");

    paneEl.append(el);

    return el;
}
