/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 * File GUID: dc879466-9bb9-4f8f-84d4-62b5786634ac
 * Created: 2026-10-26
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: A2uiAdapter / PropTracker
 * 📜 PURPOSE: Follows a component's raw props: literals are delivered as they
 *    are, bindings and function calls through the host's
 *    subscribeDynamicValue. A prop whose raw value is unchanged keeps its
 *    subscription; a removed prop is delivered as removed (spec §5.1, §5.3).
 * 🔗 RELATES: [[A2uiAdapter]]
 * ⚡ FLOW: [componentModel.properties] -> [refresh] -> [onValue(name, value, delivery)]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker a2ui-adapter-props

import { isDynamic } from "./values";
import type { AdapterDescriptor, ComponentContextLike, Sub } from "./types";

/** How a value reached the tracker. */
export interface Delivery
{
    /** True when the prop is a binding or function call. */
    readonly bound: boolean;
    /** True when the agent removed the prop. */
    readonly removed: boolean;
}

/** Receives each delivered value. */
export type OnValue = (name: string, value: unknown, delivery: Delivery) => void;

export class PropTracker
{
    readonly #ctx: ComponentContextLike;
    readonly #names: readonly string[];
    readonly #onValue: OnValue;
    readonly #raw = new Map<string, string>();
    readonly #subs = new Map<string, Sub>();
    readonly #bound = new Set<string>();
    readonly #resolved = new Set<string>();

    constructor(ctx: ComponentContextLike, descriptor: AdapterDescriptor, onValue: OnValue)
    {
        this.#ctx = ctx;
        this.#names = Object.keys(descriptor.props);
        this.#onValue = onValue;
    }

    /** Re-reads the component's properties, delivering whatever changed. */
    refresh(): void
    {
        const props = this.#ctx.componentModel.properties;

        for (const name of this.#names)
        {
            if (props[name] !== undefined) { this.#track(name, props[name]); }
            else if (this.#raw.has(name)) { this.#drop(name); }
        }
    }

    /** True when the prop is currently a binding or function call. */
    isBound(name: string): boolean
    {
        return this.#bound.has(name);
    }

    /** The raw value of a prop, as the agent sent it. */
    raw(name: string): unknown
    {
        return this.#ctx.componentModel.properties[name];
    }

    /** True when every bound prop has delivered a value other than undefined. */
    allBoundResolved(): boolean
    {
        return [...this.#bound].every((n) => this.#resolved.has(n));
    }

    /** Releases every subscription. */
    dispose(): void
    {
        for (const sub of this.#subs.values()) { sub.unsubscribe(); }

        this.#subs.clear();
        this.#raw.clear();
        this.#bound.clear();
        this.#resolved.clear();
    }

    #track(name: string, raw: unknown): void
    {
        const json = JSON.stringify(raw);

        if (this.#raw.get(name) === json) { return; }

        this.#release(name);
        this.#raw.set(name, json);

        if (!isDynamic(raw))
        {
            this.#bound.delete(name);
            this.#resolved.delete(name);
            this.#onValue(name, raw, { bound: false, removed: false });
            return;
        }

        this.#bound.add(name);
        const sub = this.#ctx.dataContext.subscribeDynamicValue(raw, (v) => this.#deliver(name, v));
        this.#subs.set(name, sub);
        this.#deliver(name, sub.value);
    }

    #deliver(name: string, value: unknown): void
    {
        if (value === undefined) { this.#resolved.delete(name); }
        else { this.#resolved.add(name); }

        this.#onValue(name, value, { bound: true, removed: false });
    }

    #drop(name: string): void
    {
        this.#release(name);
        this.#raw.delete(name);
        this.#bound.delete(name);
        this.#resolved.delete(name);
        this.#onValue(name, undefined, { bound: false, removed: true });
    }

    #release(name: string): void
    {
        this.#subs.get(name)?.unsubscribe();
        this.#subs.delete(name);
    }
}
