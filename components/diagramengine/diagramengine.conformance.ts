/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: DiagramEngine / ConformanceGlue
 * 📜 PURPOSE: Channel triggers and the document slot sample for the
 *    conformance gate and A2UI G3 (readiness step 2 B9). The triggers drive
 *    the handle methods the tools call; change is reported after the edit,
 *    hence "async".
 * 🔗 RELATES: [[DiagramEngine]], [[Conformance]]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker diagramengine-conformance-glue

/** Minimal view of the handle, limited to what the triggers need. */
interface DiagramLike
{
    addObject(partial: { id?: string; presentation?: { bounds: { x: number; y: number; width: number;
        height: number } } }): { id: string };
    getViewport(): { x: number; y: number; zoom: number };
    getObjects(): { id: string }[];
    select(ids: string[]): void;
    getElement(): HTMLElement;
    getDocument(): Record<string, unknown>;
}

/** The first object, added for a gesture when the fixture has none. */
function anObject(d: DiagramLike): string
{
    return d.getObjects()[0]?.id ?? d.addObject({ id: "fixture" }).id;
}

/** An empty document as the engine writes one, which the generic sample is not. */
const DOCUMENT = {
    version: "1.0",
    metadata: { title: "Fixture", created: "2026-01-15T09:30:00.000Z", modified: "2026-01-15T09:30:00.000Z" },
    layers: [{ id: "default", name: "Default", visible: true, locked: false, printable: true, opacity: 1, order: 0 }],
    objects: [],
    connectors: [],
    comments: [],
    pageFrames: [],
    guides: [],
    grid: { size: 20, style: "dots", visible: true },
};

export const CONFORMANCE_GLUE =
{
    options: {},

    slotSamples: { document: DOCUMENT },

    trigger: (
        channel: string,
        handle: Record<string, unknown>): boolean | "async" =>
    {
        const d = handle as unknown as DiagramLike;

        switch (channel)
        {
            case "selection":
                d.select([anObject(d)]);
                return true;
            case "objectDoubleClick":
            {
                // An object of its own, at a known place: the engine hit-tests a double-click by its position.
                d.addObject({ presentation: { bounds: { x: 100, y: 100, width: 80, height: 60 } } });
                const svg = d.getElement();
                const rect = svg.getBoundingClientRect();
                const vp = d.getViewport();
                svg.dispatchEvent(new MouseEvent("dblclick", { bubbles: true,
                    clientX: rect.left + vp.x + 140 * vp.zoom, clientY: rect.top + vp.y + 130 * vp.zoom }));
                return true;
            }
            case "change":
                d.addObject({});
                return "async";
            default:
                return false;
        }
    },
};
