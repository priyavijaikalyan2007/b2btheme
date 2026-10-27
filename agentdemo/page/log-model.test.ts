/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: A2uiPlayground / LogModel. Entries keep their order and index,
 *    statuses change in place, and every change notifies listeners.
 */

import { describe, expect, test, vi } from "vitest";

import { LogModel } from "./log-model";

describe("LogModel", () =>
{
    test("add returns consecutive indices and keeps order", () =>
    {
        const log = new LogModel();

        expect(log.add("scenario", { a: 1 }, "pending")).toBe(0);
        expect(log.add("agent", { b: 2 }, "applied")).toBe(1);
        expect(log.entries()).toEqual([
            { index: 0, source: "scenario", message: { a: 1 }, status: "pending" },
            { index: 1, source: "agent", message: { b: 2 }, status: "applied" },
        ]);
    });

    test("setStatus changes one entry", () =>
    {
        const log = new LogModel();

        log.add("file", {}, "pending");
        log.setStatus(0, "rejected");

        expect(log.entries()[0].status).toBe("rejected");
    });

    test("setStatus on a missing entry throws", () =>
    {
        expect(() => new LogModel().setStatus(3, "applied")).toThrow("there is no entry 3");
    });

    test("entries returns a copy", () =>
    {
        const log = new LogModel();

        log.add("file", {}, "pending");
        log.entries().pop();

        expect(log.entries()).toHaveLength(1);
    });

    test("every change notifies, and unsubscribe stops it", () =>
    {
        const log = new LogModel();
        const listener = vi.fn();
        const off = log.onChange(listener);

        log.add("file", {}, "pending");
        log.setStatus(0, "applied");
        log.clear();
        off();
        log.add("file", {}, "pending");

        expect(listener).toHaveBeenCalledTimes(3);
        expect(log.entries()).toHaveLength(1);
    });
});
