/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: FixturePanel
 * 📜 PURPOSE: Synthetic options-only factory.
 * 🔗 RELATES: [[AgentUiClassifier]]
 * ⚡ FLOW: [classify.test.ts] -> [createClassifier] -> [panel.ts]
 */
/** Options for the synthetic options-only panel. */
export interface PanelOptions
{
    /** Host element. */
    container: HTMLElement;

    heading?: string;
}

/** Synthetic options-only factory. */
export function createPanel(options: PanelOptions): { destroy(): void }
{
    void options;
    return { destroy: () => undefined };
}
