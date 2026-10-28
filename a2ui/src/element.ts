/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 * File GUID: 7436f593-c42b-4b67-b6f0-f6b9e5a98531
 * Created: 2026-10-26
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: A2uiAdapter / Element
 * 📜 PURPOSE: OutcropComponentElement, the one generic custom element behind
 *    every outcrop-* tag. It binds from the context the host renderer assigns
 *    (spec §4.2), waits for its assets and bound data (§5.3), mounts the real
 *    factory through the shared mount logic (§6.2), routes each change by its
 *    descriptor (§5.2), rebuilds only for create-time props, and tears down
 *    on a real disconnect (§4.3).
 * 🔗 RELATES: [[A2uiAdapter]], [[RuntimeMount]], [[PropTracker]]
 * ⚡ FLOW: [renderer sets context] -> [Binding] -> [loadAssets + PropTracker]
 *          -> [factory] -> [routes]
 * 🔒 SECURITY: Bound values reach components only after their compiled
 *    validator accepts them (§5.4).
 * ----------------------------------------------------------------------------
 */

// @semantic-marker a2ui-adapter-element

import { attachHandle, invokerFor } from "../../runtime/src/mount";
import { ERROR_CODES, reportError } from "./errors";
import { loadAssets } from "./loader";
import { logDebug, logInfo } from "./log";
import { PropTracker, type Delivery } from "./props";
import { wireProviders, type WiredProviders } from "./providers";
import { changeOptions, dispatchActionProp, wireRoundTrip, type RoundTrip } from "./roundtrip";
import { bindingPath, fromWire, sameComponent, sameValue, toWire } from "./values";
import type { AdapterDescriptor, ComponentContextLike, Sub, Validators } from "./types";

/** What a per-tag subclass supplies. */
export interface ElementEnv
{
    readonly descriptor: AdapterDescriptor;
    readonly validators: Validators;
    readonly assetBaseUrl: () => string;
    readonly injectBaseTheme: () => boolean;
    readonly providerTimeoutMs: () => number;
}

/** The element contract: web_core's A2uiWebComponentElement, structurally. */
export interface OutcropComponentElement extends HTMLElement
{
    context: ComponentContextLike | undefined;
    node: unknown;
    /** The live component handle, or undefined while unmounted. */
    readonly handle: Record<string, unknown> | undefined;
}

type ElementClass = new () => OutcropComponentElement;

let base: ElementClass | undefined;

/** Distinct ids for the containers factories mount into. */
let containerCount = 0;

/**
 * The base element class, created on first use so that this module touches
 * no DOM when imported (spec §12.1).
 */
export function outcropElementBase(): ElementClass
{
    base ??= createBase();

    return base;
}

/**
 * Defines `tag` as a subclass of the base element bound to `env`.
 *
 * @returns The defined constructor.
 */
export function defineTestElement(tag: string, env: ElementEnv): CustomElementConstructor
{
    const cls = class extends outcropElementBase() { protected readonly env = env; };

    customElements.define(tag, cls);

    return cls;
}

/**
 * Applies the manifest's declared change mapping (ADR-222, #39). The build
 * proved the mapped type is assignable to value, so nothing is inferred here.
 * A `{ cleared: null }` component's null becomes undefined: an A2UI data model
 * cannot hold null (setting it deletes the key), so "cleared" is "absent".
 */
function mapChange(change: AdapterDescriptor["change"], payload: unknown): unknown
{
    if (change === undefined) { return payload; }

    if ("valueFrom" in change) { return (payload as Record<string, unknown>)[change.valueFrom]; }

    return payload === null ? undefined : payload;
}

/** True when an absent bound value means "cleared" rather than a lost binding (ADR-222). */
function clearsWhenAbsent(descriptor: AdapterDescriptor): boolean
{
    return descriptor.change !== undefined && "cleared" in descriptor.change;
}

function createBase(): ElementClass
{
    return class OutcropComponentElementImpl extends HTMLElement implements OutcropComponentElement
    {
        declare protected readonly env: ElementEnv;
        #context: ComponentContextLike | undefined;
        #node: unknown;
        #binding: Binding | undefined;

        get context(): ComponentContextLike | undefined { return this.#context; }

        set context(next: ComponentContextLike | undefined)
        {
            if (this.#context && next && sameComponent(this.#context, next))
            {
                this.#context = next;
                return;
            }

            this.#binding?.dispose();
            this.#binding = undefined;
            this.#context = next;

            if (next) { this.#binding = new Binding(this, next, this.env); }
        }

        get node(): unknown { return this.#node; }

        set node(next: unknown) { this.#node = next; }

        get handle(): Record<string, unknown> | undefined { return this.#binding?.handle; }

        connectedCallback(): void
        {
            this.#binding?.tryMount();
        }

        disconnectedCallback(): void
        {
            // Lit and React re-parent elements; only a disconnect that outlives the task is real.
            queueMicrotask(() =>
            {
                if (this.isConnected) { return; }

                this.#binding?.dispose();
                this.#binding = undefined;
                this.#context = undefined;
            });
        }
    };
}

/** One element's life with one component context. */
class Binding
{
    readonly #host: HTMLElement;
    readonly #ctx: ComponentContextLike;
    readonly #env: ElementEnv;
    readonly #tracker: PropTracker;
    readonly #modelSub: Sub;
    readonly #values = new Map<string, unknown>();
    readonly #invalid = new Set<string>();
    #assets: "pending" | "ready" | "failed" = "pending";
    #handle: Record<string, unknown> | undefined;
    #container: HTMLElement | undefined;
    #roundTrip: RoundTrip | undefined;
    #providers: WiredProviders | undefined;
    #applying = false;
    #lastWritten: { value: unknown } | undefined;
    #disposed = false;

    constructor(host: HTMLElement, ctx: ComponentContextLike, env: ElementEnv)
    {
        this.#host = host;
        this.#ctx = ctx;
        this.#env = env;
        host.setAttribute("aria-busy", "true");
        this.#tracker = new PropTracker(ctx, env.descriptor, (n, v, d) => this.#onValue(n, v, d));
        this.#modelSub = ctx.componentModel.onUpdated.subscribe(() => this.#tracker.refresh());
        this.#tracker.refresh();
        this.#loadAssets();
    }

    get handle(): Record<string, unknown> | undefined { return this.#handle; }

    /** Mounts when connected, loaded, and every bound value is present and valid. */
    tryMount(): void
    {
        if (this.#handle || this.#disposed || this.#assets !== "ready" || !this.#host.isConnected) { return; }

        if (!this.#tracker.allBoundResolved() || this.#invalid.size > 0) { return; }

        if (this.#host.getRootNode() !== document)
        {
            this.#fail(`<${this.#host.localName}> is inside a shadow root, but outcrop components mount in the `
                + "light DOM (their factories find the container by id and their CSS lives in document.head). "
                + "Render this surface without shadow DOM.");
            return;
        }

        this.#mount();
    }

    /** Releases everything this binding holds. Idempotent. */
    dispose(): void
    {
        if (this.#disposed) { return; }

        this.#disposed = true;
        this.#tracker.dispose();
        this.#modelSub.unsubscribe();
        this.#unmount();
        logInfo("teardown", this.#where());
    }

    #loadAssets(): void
    {
        const env = this.#env;

        loadAssets(env.assetBaseUrl(), env.descriptor.assets, env.injectBaseTheme()).then(
            () => { this.#assets = "ready"; this.tryMount(); },
            (err: Error) =>
            {
                this.#assets = "failed";
                this.#host.removeAttribute("aria-busy");
                if (!this.#disposed) { reportError(this.#ctx, ERROR_CODES.ASSET_LOAD_FAILED, err.message); }
            });
    }

    #onValue(name: string, value: unknown, delivery: Delivery): void
    {
        if (this.#disposed || !this.#accept(name, value, delivery)) { return; }

        if (!this.#handle) { this.tryMount(); return; }

        if (name === "value" && this.#isEcho(value)) { return; }

        this.#route(name, this.#values.get(name));
    }

    /** True, once, for the value the element itself just wrote to the bound path (spec §5.6). */
    #isEcho(value: unknown): boolean
    {
        const echo = this.#lastWritten !== undefined && sameValue(value, this.#lastWritten.value);

        this.#lastWritten = undefined;

        return echo;
    }

    /** A user edit of the two-way value: write the bound path, then fire the change action. */
    #onUserValue(payload: unknown): void
    {
        if (this.#applying || this.#disposed) { return; }

        const value = mapChange(this.#env.descriptor.change, payload);
        const path = bindingPath(this.#tracker.raw("value"));

        if (path !== undefined)
        {
            this.#lastWritten = { value: toWire(value) };
            this.#ctx.dataContext.set(path, this.#lastWritten.value);
        }

        const change = this.#env.descriptor.events.find((e) => e.payloadInValue);

        if (change) { dispatchActionProp(this.#ctx, change.actionProp); }
    }

    /** Records an accepted value; reports and returns false for one that must not be applied. */
    #accept(name: string, value: unknown, delivery: Delivery): boolean
    {
        if (delivery.removed) { this.#values.delete(name); this.#invalid.delete(name); return true; }

        if (value === undefined && name === "value" && this.#handle && clearsWhenAbsent(this.#env.descriptor))
        {
            this.#invalid.delete(name);
            this.#values.set(name, null);
            return true;
        }

        if (value === undefined) { this.#lost(name); return false; }

        const message = this.#rejection(name, value, delivery.bound);

        if (message !== undefined)
        {
            this.#invalid.add(name);
            reportError(this.#ctx, ERROR_CODES.VALIDATION_FAILED, message, this.#pathOf(name));
            return false;
        }

        this.#invalid.delete(name);
        const wire = fromWire(value, this.#env.descriptor.dates.includes(name));

        if (wire.ok) { this.#values.set(name, wire.value); }

        return true;
    }

    /**
     * Why a value is unacceptable, or undefined when it is fine. Literals were
     * validated by the host; bound values were not (spec §5.4). Dates are
     * parsed either way (§5.5).
     */
    #rejection(name: string, value: unknown, bound: boolean): string | undefined
    {
        const d = this.#env.descriptor;
        const validate = this.#env.validators[`${d.name}.${name}`];

        if (bound && !validate)
        {
            return `${d.name}.${name} has no compiled validator; the adapter bundle is out of date. Rebuild it.`;
        }

        if (bound && !validate(value))
        {
            return `${d.name}.${name} received ${JSON.stringify(value)}, which does not match its schema `
                + "in the catalog.";
        }

        const wire = fromWire(value, d.dates.includes(name));

        return wire.ok ? undefined : `${d.name}.${name}: ${wire.reason}.`;
    }

    #lost(name: string): void
    {
        if (!this.#handle) { return; }

        const message = `${this.#env.descriptor.name}.${name} is bound, but its value is now undefined; the component `
            + "keeps its last value. Restore the data, or remove the binding.";

        reportError(this.#ctx, ERROR_CODES.BINDING_LOST, message, this.#pathOf(name));
    }

    #route(name: string, value: unknown): void
    {
        const route = this.#env.descriptor.props[name];

        if (route.route === "create") { this.#rebuild(name); return; }

        const [method, args] = route.route === "slot"
            ? (route.setter ? [route.setter, [value]] : ["setData", [route.slot, value]])
            : route.route === "state" ? ["setState", [{ [route.key]: value }]] : ["setValue", [value]];
        const fn = this.#handle?.[method];

        if (typeof fn !== "function")
        {
            this.#fail(`${this.#env.descriptor.name}'s handle has no ${method}(), but the manifest gives "${name}" the `
                + `${route.route} route. Add the method to the handle, or correct accepts/stateKeys in the manifest.`);
            return;
        }

        logDebug("route", this.#where(), name, method);
        this.#applying = true;

        try { fn.apply(this.#handle, args); }
        finally { this.#applying = false; }
    }

    #rebuild(prop: string): void
    {
        logInfo("rebuild", this.#where(), `create-time prop "${prop}" changed`);
        this.#unmount();
        this.tryMount();
    }

    #mount(): void
    {
        const d = this.#env.descriptor;
        const factory = window[d.factory];

        if (typeof factory !== "function")
        {
            this.#fail(`${d.factory} is not defined after loading ${this.#env.assetBaseUrl()}/${d.assets.js}; `
                + "that file is not "
                + "this component's script, or it failed to run. Check assetBaseUrl.");
            return;
        }

        const container = this.#host.appendChild(document.createElement("div"));
        container.className = "outcrop-host";
        container.id = `outcrop-${++containerCount}`;

        if (d.overlay)
        {
            // An overlay positions itself absolutely; without a positioned,
            // sized box it lands against the page and adds no height (#41).
            container.style.position = "relative";
            container.style.minHeight = `${d.overlay.height}px`;
        }

        try
        {
            this.#handle = this.#construct(factory, container);
            this.#container = container;
        }
        catch (err)
        {
            container.remove();
            this.#fail(`${d.factory} failed: ${err instanceof Error ? err.message : String(err)}`);
            return;
        }

        this.#host.removeAttribute("aria-busy");
        logInfo("mount", this.#where());
    }

    /** Builds the component with its provider callbacks, releasing them if the build fails (ADR-225). */
    #construct(factory: unknown, container: HTMLElement): Record<string, unknown>
    {
        const providers = wireProviders(this.#ctx, this.#env.descriptor, this.#env.validators,
            this.#env.providerTimeoutMs());

        try
        {
            const handle = this.#build(factory, container, providers);
            this.#providers = providers;
            return handle;
        }
        catch (err)
        {
            providers.release();
            throw err;
        }
    }

    #build(factory: unknown, container: HTMLElement, providers: WiredProviders): Record<string, unknown>
    {
        const d = this.#env.descriptor;
        const options = { ...Object.fromEntries(this.#values), ...changeOptions(d, (v) => this.#onUserValue(v)),
            ...providers.options };
        const handle = invokerFor(d)(factory, container.id, options) as Record<string, unknown> | null;

        if (!handle || typeof handle !== "object")
        {
            throw new Error(`it returned ${handle === null ? "null" : typeof handle}, expected a handle object`);
        }

        try
        {
            attachHandle(handle, d, container);
            this.#roundTrip = wireRoundTrip(this.#ctx, d, handle, {
                onUserValue: (v) => this.#onUserValue(v), isApplying: () => this.#applying });
        }
        catch (err)
        {
            (handle.destroy as (() => void) | undefined)?.call(handle);
            throw err;
        }

        return handle;
    }

    #unmount(): void
    {
        const handle = this.#handle;

        this.#handle = undefined;
        this.#roundTrip?.release();
        this.#roundTrip = undefined;
        this.#providers?.release();
        this.#providers = undefined;
        this.#container?.remove();
        this.#container = undefined;

        if (!handle) { return; }

        if (typeof handle.destroy !== "function")
        {
            throw new Error(`${this.#env.descriptor.name}'s handle has no destroy(), so it cannot be torn down. `
                + "Every component handle must implement destroy().");
        }

        (handle.destroy as () => void).call(handle);
    }

    #fail(message: string): void
    {
        this.#host.removeAttribute("aria-busy");
        reportError(this.#ctx, ERROR_CODES.MOUNT_FAILED, message);
    }

    #pathOf(name: string): string | undefined
    {
        return bindingPath(this.#tracker.raw(name));
    }

    #where(): string
    {
        const surface = String(this.#ctx.dataContext.surface?.id);

        return `<${this.#host.localName}> ${this.#ctx.componentModel.id} on surface ${surface}`;
    }
}
