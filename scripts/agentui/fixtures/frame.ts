/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: FixtureFrame
 * 📜 PURPOSE: Synthetic layout whose options hold children (readiness step 4, ADR-238).
 * 🔗 RELATES: [[AgentUiClassifier]], [[AgentUiGenerator]]
 * ⚡ FLOW: [generate.test.ts] -> [runPipeline] -> [frame.ts]
 */
/** A titled panel holding one child. */
export interface FramePanel
{
    /** Panel id. */
    id: string;

    /** Panel title. */
    title: string;

    /** The panel's content. */
    content: HTMLElement;
}

/** Options for the synthetic frame. */
export interface FrameOptions
{
    /** The panels, in order. */
    panels: FramePanel[];

    /** The region beside the panels. */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    aside?: HTMLElement | any;

    /** Items along the bottom. */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    footer?: Array<HTMLElement | any>;

    /** Gap between panels in pixels. */
    gap?: number;
}

/** Synthetic container-first factory. */
export function createFrame(containerId: string, options: FrameOptions): { destroy(): void }
{
    void containerId;
    void options;
    return { destroy: () => undefined };
}
