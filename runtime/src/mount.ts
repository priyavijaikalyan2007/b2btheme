/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 * File GUID: 99de1393-d72c-4eb6-97ea-57fbf6cfb59a
 * Created: 2026-10-26
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: DynamicUIRuntime / Mount
 * 📜 PURPOSE: The manifest's factory argument order (factoryStyle) and attach
 *    method (mountMethod), in one place. The conformance suite and the A2UI
 *    adapter both mount through it, so the two cannot drift apart.
 * 🔗 RELATES: [[DynamicUIRuntime]], [[Conformance]], [[A2uiAdapter]]
 * ⚡ FLOW: [manifest] -> [invokerFor()] -> [handle] -> [attachHandle()]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker dynamicui-mount

import type { CapabilityManifest } from "./types";

/** The manifest fields that decide how a component is constructed and attached. */
export type MountSpec = Pick<CapabilityManifest, "factoryStyle" | "containerOption" | "containerAs" | "mountMethod">;

/** Calls a factory with the host's id and the options, in the declared order. */
export type Invoker = (factory: unknown, hostId: string, options: Record<string, unknown>) => unknown;

/**
 * Builds the factory invoker for a declared argument order.
 *
 * @param spec - Declares factoryStyle and, for options-only, the option key
 *               carrying the host element (or its id, with containerAs "id").
 * @returns An invoker matching that convention.
 */
export function invokerFor(spec: MountSpec): Invoker
{
    if (spec.factoryStyle === "options-first")
    {
        return (f, id, o) => (f as (a: unknown, b: string) => unknown)(o, id);
    }

    if (spec.factoryStyle === "options-only")
    {
        const key = spec.containerOption ?? "container";
        const asId = spec.containerAs === "id";

        return (f, id, o) => (f as (a: unknown) => unknown)(
            { ...o, [key]: asId ? id : document.getElementById(id) });
    }

    return (f, id, o) => (f as (a: string, b: unknown) => unknown)(id, o);
}

/**
 * Attaches a component that does not attach itself.
 *
 * @param handle - The freshly constructed handle.
 * @param spec   - Declares how attachment works.
 * @param host   - The host element.
 * @throws When the declared method is missing or returns a non-Element.
 */
export function attachHandle(handle: Record<string, unknown>, spec: MountSpec, host: HTMLElement): void
{
    const method = spec.mountMethod;

    if (!method || method === "auto")
    {
        return;
    }

    if (typeof handle[method] !== "function")
    {
        throw new Error(`The manifest declares mountMethod "${method}", but the handle has no ${method}() method, `
            + `so the component would never be attached. Add ${method}() to the handle, or correct mountMethod `
            + "in the manifest.");
    }

    if (method === "show")
    {
        (handle.show as (h: HTMLElement) => void).call(handle, host);
        return;
    }

    const el = (handle.getElement as () => unknown).call(handle);

    if (!(el instanceof Element))
    {
        throw new Error(`The manifest declares mountMethod "getElement", but getElement() returned ${typeof el}, `
            + "not an Element, so there is nothing to attach. Return the component's root element from getElement().");
    }

    host.appendChild(el);
}
