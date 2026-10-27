/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: A2uiPlayground / LogModel
 * 📜 PURPOSE: The playground's message log (#30 spec §5.3): every message
 *    from a scenario, a file or the agent, with whether it was applied.
 *    Pure state; ui/messages.ts renders it.
 * 🔗 RELATES: [[A2uiPlayground]], [[A2uiPlaygroundHost]]
 * ⚡ FLOW: [add / setStatus] -> [entries] -> [onChange listeners]
 * ----------------------------------------------------------------------------
 */

export type LogSource = "scenario" | "file" | "agent";
export type LogStatus = "pending" | "applied" | "rejected" | "applied-with-errors";

export interface LogEntry
{
    readonly index: number;
    readonly source: LogSource;
    readonly message: unknown;
    readonly status: LogStatus;
}

export class LogModel
{
    #entries: LogEntry[] = [];
    readonly #listeners = new Set<() => void>();

    /** Appends a message; returns its index. */
    add(source: LogSource, message: unknown, status: LogStatus): number
    {
        const index = this.#entries.length;

        this.#entries.push({ index, source, message, status });
        this.#emit();

        return index;
    }

    /** Changes one entry's status. */
    setStatus(index: number, status: LogStatus): void
    {
        const entry = this.#entries[index];

        if (!entry) { throw new Error(`LogModel.setStatus: there is no entry ${index}.`); }

        this.#entries[index] = { ...entry, status };
        this.#emit();
    }

    /** A copy of the entries, oldest first. */
    entries(): LogEntry[]
    {
        return [...this.#entries];
    }

    /** Removes every entry. */
    clear(): void
    {
        this.#entries = [];
        this.#emit();
    }

    /** Calls `listener` after every change; returns an unsubscribe function. */
    onChange(listener: () => void): () => void
    {
        this.#listeners.add(listener);

        return () => this.#listeners.delete(listener);
    }

    #emit(): void
    {
        for (const listener of this.#listeners) { listener(); }
    }
}
