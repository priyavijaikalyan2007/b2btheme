/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: FixtureWidget
 * 📜 PURPOSE: Synthetic container-first factory whose options exercise every classifier branch.
 * 🔗 RELATES: [[AgentUiClassifier]]
 * ⚡ FLOW: [classify.test.ts] -> [createClassifier] -> [widget.ts]
 */
/** A column of the synthetic widget. */
export interface Column
{
    /** Column id. */
    id: string;

    /** Renders a cell. */
    renderer?: (value: string) => string;
}

/** A component instance: every member is a method. */
export interface Slot
{
    mount(): void;
    unmount(): void;
}

/** Options for the synthetic widget used by the agent-UI generator tests. */
export interface WidgetOptions
{
    /** Rows per page. */
    pageSize?: number;

    /** Columns to show. */
    columns: Column[];

    /** Selected date. */
    value?: Date;

    /** Title text or a builder. */
    title?: string | (() => string);

    /** Host element. */
    container?: HTMLElement;

    /** Extra bag. */
    extra?: Record<string, unknown>;

    /** Slot instance. */
    slot?: Slot;

    /** Fires on selection. */
    onSelect?: (ids: string[]) => void;

    /** Fires when the value changes. */
    onChange?: (value: Date) => void;

    /** Looks names up. */
    onSearch?: (query: string) => Promise<string[]>;

    /** Two-argument provider. */
    onLookup?: (a: string, b: number) => Promise<string>;
}

/** Synthetic container-first factory. */
export function createWidget(containerId: string, options: WidgetOptions): { destroy(): void }
{
    void containerId;
    void options;
    return { destroy: () => undefined };
}
