/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: A2uiAdapter / Errors. Every adapter failure reaches the agent as
 *    an A2UI error through the host's surface, and is logged. A context with
 *    no surface cannot report, so that is a literate throw (spec §8).
 */

import { describe, expect, test, vi } from "vitest";

import { ERROR_CODES, reportError } from "./errors";
import type { ComponentContextLike } from "./types";

function ctx(surface: unknown): ComponentContextLike
{
    return { componentModel: { id: "c1", type: "StickyNote" }, dataContext: { surface } } as unknown as ComponentContextLike;
}

describe("reportError", () =>
{
    test("the four codes are the spec's", () =>
    {
        expect(ERROR_CODES).toEqual({ VALIDATION_FAILED: "VALIDATION_FAILED", BINDING_LOST: "OUTCROP_BINDING_LOST",
            ASSET_LOAD_FAILED: "OUTCROP_ASSET_LOAD_FAILED", MOUNT_FAILED: "OUTCROP_MOUNT_FAILED" });
    });

    test("dispatches code, message and path through the surface", () =>
    {
        const dispatchError = vi.fn(async () => undefined);
        vi.spyOn(console, "error").mockImplementation(() => undefined);

        reportError(ctx({ id: "s1", dispatchError }), ERROR_CODES.VALIDATION_FAILED, "bad", "/items");

        expect(dispatchError).toHaveBeenCalledWith({ code: "VALIDATION_FAILED", message: "bad", path: "/items" });
    });

    test("omits path when there is none", () =>
    {
        const dispatchError = vi.fn(async () => undefined);
        vi.spyOn(console, "error").mockImplementation(() => undefined);

        reportError(ctx({ id: "s1", dispatchError }), ERROR_CODES.MOUNT_FAILED, "boom");

        expect(dispatchError).toHaveBeenCalledWith({ code: "OUTCROP_MOUNT_FAILED", message: "boom" });
    });

    test("logs the error", () =>
    {
        const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);

        reportError(ctx({ id: "s1", dispatchError: async () => undefined }), ERROR_CODES.MOUNT_FAILED, "boom");

        expect(spy.mock.calls.some((c) => c.includes("[A2UI]") && c.includes("OUTCROP_MOUNT_FAILED"))).toBe(true);
    });

    test("a context without a surface is a literate throw", () =>
    {
        vi.spyOn(console, "error").mockImplementation(() => undefined);

        expect(() => reportError(ctx(undefined), ERROR_CODES.MOUNT_FAILED, "boom"))
            .toThrow(/DataContext has no surface.*SurfaceModel/);
    });
});
