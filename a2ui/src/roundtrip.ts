/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 * File GUID: ea6c302a-aedc-48af-8b22-f3d84b1b4381
 * Created: 2026-10-26
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: A2uiAdapter / RoundTrip
 * 📜 PURPOSE: Wires a live handle back to the agent. A two-way edit goes to
 *    the element (which writes the path bound to `value`); any other event's
 *    payload is written to <eventData>/<channel> and then its on<Channel>
 *    action is dispatched, in that order (spec §5.6, §5.7). A change the
 *    agent itself caused is not a user event and is dropped.
 * 🔗 RELATES: [[A2uiAdapter]], [[Surface]]
 * ⚡ FLOW: [handle.on(channel)] -> [eventData write] -> [dispatchAction]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker a2ui-adapter-roundtrip

import { logError } from "./log";
import { bindingPath, toWire } from "./values";
import type { AdapterDescriptor, AdapterEvent, ComponentContextLike } from "./types";

/** Releases a handle's event listeners. */
export interface RoundTrip
{
    release(): void;
}

/** What the element supplies to the round trip. */
export interface RoundTripHooks
{
    /** A user edit of the two-way value. */
    onUserValue(value: unknown): void;
    /** True while the element applies an agent-caused change to the handle. */
    isApplying(): boolean;
}

type On = (channel: string, handler: (payload: unknown) => void) => unknown;

/**
 * The legacy change option a field component reports user edits through.
 *
 * @param descriptor  - The component's descriptor.
 * @param onUserValue - Receives each edit.
 * @returns `{ [changeOption]: callback }`, or {} when the component has none.
 */
export function changeOptions(
    descriptor: AdapterDescriptor, onUserValue: (value: unknown) => void): Record<string, unknown>
{
    return descriptor.changeOption ? { [descriptor.changeOption]: (value: unknown) => onUserValue(value) } : {};
}

/**
 * Subscribes to every declared channel on a live handle.
 *
 * @throws When the descriptor declares channels and the handle has no on().
 */
export function wireRoundTrip(ctx: ComponentContextLike, descriptor: AdapterDescriptor,
    handle: Record<string, unknown>, hooks: RoundTripHooks): RoundTrip
{
    if (descriptor.events.length === 0) { return { release: () => undefined }; }

    if (typeof handle.on !== "function")
    {
        const channels = descriptor.events.map((e) => e.channel).join(", ");

        throw new Error(`${descriptor.name} declares channels [${channels}], but its handle has no on() method, so `
            + "its events could never reach the agent. Implement the Surface contract's on().");
    }

    const offs = descriptor.events.map((e) => subscribe(handle, e, (payload) => onEvent(ctx, e, payload, hooks)));

    return { release: () => offs.forEach((off) => off()) };
}

/**
 * Dispatches the action an agent put in an action prop, if it put one there.
 * A functionCall action runs locally inside resolveAction; an event action is
 * sent to the agent.
 */
export function dispatchActionProp(ctx: ComponentContextLike, actionProp: string): void
{
    const raw = ctx.componentModel.properties[actionProp];

    if (raw === undefined) { return; }

    ctx.dispatchAction(ctx.dataContext.resolveAction(raw))
        .catch((err: unknown) => logError(`Dispatching ${actionProp} failed:`, err));
}

function subscribe(handle: Record<string, unknown>, e: AdapterEvent, handler: (payload: unknown) => void): () => void
{
    const off = (handle.on as On).call(handle, e.channel, handler);

    if (typeof off !== "function")
    {
        throw new Error(`on("${e.channel}") returned ${typeof off}, not an unsubscribe function, so the listener could `
            + "never be released. Return the Surface contract's Unsubscribe from on().");
    }

    return off as () => void;
}

function onEvent(ctx: ComponentContextLike, e: AdapterEvent, payload: unknown, hooks: RoundTripHooks): void
{
    if (hooks.isApplying()) { return; }

    if (e.payloadInValue)
    {
        hooks.onUserValue(payload);
        return;
    }

    const path = bindingPath(ctx.componentModel.properties.eventData);

    if (path !== undefined) { ctx.dataContext.set(`${path}/${e.channel}`, toWire(payload)); }

    dispatchActionProp(ctx, e.actionProp);
}
