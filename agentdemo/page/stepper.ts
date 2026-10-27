/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: A2uiPlayground / Stepper
 * 📜 PURPOSE: The scenario cursor (#30 spec §5.2). A2UI state cannot be
 *    undone, so stepping back means resetting the host and re-applying the
 *    lines before the new cursor; `back` returns exactly those lines.
 * 🔗 RELATES: [[A2uiPlayground]], [[A2uiPlaygroundScenario]]
 * ----------------------------------------------------------------------------
 */

import type { ScenarioLine } from "./scenario";

export class Stepper
{
    readonly #lines: readonly ScenarioLine[];
    #cursor = 0;

    constructor(lines: readonly ScenarioLine[])
    {
        this.#lines = lines;
    }

    /** The index of the next line to apply. */
    get cursor(): number
    {
        return this.#cursor;
    }

    /** True when every line has been applied. */
    get done(): boolean
    {
        return this.#cursor >= this.#lines.length;
    }

    /** The next line, advancing the cursor; null at the end. */
    next(): ScenarioLine | null
    {
        if (this.done) { return null; }

        return this.#lines[this.#cursor++];
    }

    /** Moves back one line; returns the lines to re-apply after a reset. */
    back(): ScenarioLine[]
    {
        this.#cursor = Math.max(0, this.#cursor - 1);

        return this.#lines.slice(0, this.#cursor);
    }

    /** Returns to the start. */
    reset(): void
    {
        this.#cursor = 0;
    }
}
