/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: FixturePickers
 * 📜 PURPOSE: Synthetic two-way factories whose onChange is NOT their value,
 *    one per protocol.change shape the classifier's value fit distinguishes
 *    (ADR-222, #39).
 * 🔗 RELATES: [[AgentUiClassifier]]
 * ⚡ FLOW: [classify.test.ts] -> [valueFit] -> [pickers.ts]
 */

/** One swatch: the payload carries its value one level down. */
export interface Swatch
{
    /** Colour hex. */
    hex: string;
    /** Colour name. */
    label: string;
}

/** Options of a picker whose onChange passes the item. */
export interface SwatchPickerOptions
{
    /** Selected hex. */
    value?: string;
    /** Fires with the chosen swatch. */
    onChange?: (swatch: Swatch) => void;
}

/** Item payload: value is `swatch.hex`. */
export function createSwatchPicker(options: SwatchPickerOptions): { setValue(hex: string): void }
{
    void options;
    return { setValue: () => undefined };
}

/** Options of a picker whose onChange passes null when cleared. */
export interface ClearableOptions
{
    /** Selected day. */
    value?: Date;
    /** Fires with the day, or null when cleared. */
    onChange?: (day: Date | null) => void;
}

/** Nullable payload, and a handle that accepts null. */
export function createClearable(options: ClearableOptions): { setValue(day: Date | null): void }
{
    void options;
    return { setValue: () => undefined };
}
