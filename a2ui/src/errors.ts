/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 * File GUID: 10e205b1-e86a-45fd-8204-e828236c5b6a
 * Created: 2026-10-26
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: A2uiAdapter / Errors
 * 📜 PURPOSE: The adapter's A2UI error codes and the one way to report them:
 *    log, then dispatch through the host's surface, which turns the payload
 *    into a v0.9.1 `error` message for the agent (spec §8). Nothing is
 *    swallowed and nothing falls back.
 * 🔗 RELATES: [[A2uiAdapter]], [[LiterateErrors]]
 * ⚡ FLOW: [element failure] -> [reportError] -> [log + surface.dispatchError]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker a2ui-adapter-errors

import { logError } from "./log";
import type { ComponentContextLike } from "./types";

/** The A2UI error codes the adapter sends (spec §8). */
export const ERROR_CODES = Object.freeze({
    VALIDATION_FAILED: "VALIDATION_FAILED",
    BINDING_LOST: "OUTCROP_BINDING_LOST",
    ASSET_LOAD_FAILED: "OUTCROP_ASSET_LOAD_FAILED",
    MOUNT_FAILED: "OUTCROP_MOUNT_FAILED",
});

/**
 * Logs an adapter failure and sends it to the agent as an A2UI error.
 *
 * @param ctx     - The component's context.
 * @param code    - One of ERROR_CODES.
 * @param message - What happened, where, and how to fix it.
 * @param path    - The data-model path involved, when there is one.
 * @throws When the context has no surface, so the error could never reach the agent.
 */
export function reportError(ctx: ComponentContextLike, code: string, message: string, path?: string): void
{
    const model = ctx.componentModel;
    const surface = ctx.dataContext.surface;

    logError(code, `${model.type}#${model.id}:`, message, ...(path ? [`(path ${path})`] : []));

    if (!surface)
    {
        throw new Error(`${model.type}#${model.id}: the host's DataContext has no surface, so A2UI errors cannot reach `
            + "the agent. The host renderer must create component contexts from a SurfaceModel.");
    }

    surface.dispatchError({ code, message, ...(path ? { path } : {}) })
        .catch((err: unknown) => logError("The host surface rejected an A2UI error:", code, err));
}
