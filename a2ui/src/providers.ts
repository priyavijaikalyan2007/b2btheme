/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: A2uiAdapter / Providers
 * 📜 PURPOSE: A component's data requests answered by the agent (ADR-225,
 *    spec §3). One outstanding request per provider correlates answers with
 *    no request ids: the next valid write to the result path answers it.
 * 🔗 RELATES: [[A2uiAdapter]], [[ProviderConcurrency]]
 * ⚡ FLOW: [component calls option] -> [delete result, write request,
 *          dispatch on<Request>] -> [agent writes result] -> [validate]
 *          -> [resolve] -> [next waiting request]
 * 🔒 SECURITY: An answer reaches the component only after its compiled
 *    validator accepts it, and as a copy.
 * ----------------------------------------------------------------------------
 */

// @semantic-marker a2ui-adapter-providers

import { ERROR_CODES, reportError } from "./errors";
import { logDebug } from "./log";
import { dispatchActionProp } from "./roundtrip";
import { bindingPath, toWire } from "./values";
import type { AdapterDescriptor, AdapterProvider, ComponentContextLike, Sub, Validator, Validators } from "./types";

/** The provider callbacks to pass to the factory, and how to let them go. */
export interface WiredProviders
{
    readonly options: Record<string, (request: unknown) => Promise<unknown>>;
    release(): void;
}

interface Settle { resolve(value: unknown): void; reject(error: Error): void }
interface Pending { readonly request: unknown; readonly settles: Settle[] }

/**
 * Wires every provider whose action, result binding and eventData binding
 * are all set; without them the agent could neither see a request nor answer
 * it. Read once, at construct time.
 *
 * @param ctx        - The component's context.
 * @param descriptor - The component's descriptor.
 * @param validators - The bundle's compiled validators.
 * @param timeoutMs  - How long a request waits for its answer.
 * @returns The factory options for the wired providers, and their release.
 */
export function wireProviders(ctx: ComponentContextLike, descriptor: AdapterDescriptor, validators: Validators,
    timeoutMs: number): WiredProviders
{
    const props = ctx.componentModel.properties;
    const eventPath = bindingPath(props.eventData);

    if (eventPath === undefined) { return { options: {}, release: () => undefined }; }

    const channels = descriptor.providers
        .filter((p) => props[p.actionProp] !== undefined && bindingPath(props[p.resultProp]) !== undefined)
        .map((p) => new ProviderChannel(ctx, p, validators[`${descriptor.name}.${p.resultProp}`],
            `${descriptor.name}.${p.resultProp}`, { timeoutMs, eventPath }));

    return {
        options: Object.fromEntries(channels.map((c) => [c.option, (r: unknown) => c.ask(r)])),
        release: () => channels.forEach((c) => c.release()),
    };
}

/** One provider's requests: at most one outstanding, the rest waiting by its concurrency. */
class ProviderChannel
{
    readonly option: string;
    readonly #ctx: ComponentContextLike;
    readonly #p: AdapterProvider;
    readonly #validate: Validator | undefined;
    readonly #key: string;
    readonly #timeoutMs: number;
    readonly #requestPath: string;
    readonly #resultPath: string;
    readonly #sub: Sub;
    #outstanding: Pending | undefined;
    #waiting: Pending[] = [];
    #timer: ReturnType<typeof setTimeout> | undefined;

    constructor(ctx: ComponentContextLike, p: AdapterProvider, validate: Validator | undefined, key: string,
        where: { timeoutMs: number; eventPath: string })
    {
        this.option = p.option;
        this.#ctx = ctx;
        this.#p = p;
        this.#validate = validate;
        this.#key = key;
        this.#timeoutMs = where.timeoutMs;
        this.#requestPath = `${where.eventPath}/${p.request}`;
        this.#resultPath = bindingPath(ctx.componentModel.properties[p.resultProp]) as string;
        this.#sub = ctx.dataContext.subscribeDynamicValue({ path: this.#resultPath }, (v) => this.#onResult(v));
    }

    /** The callback the component calls: a promise of the agent's answer. */
    ask(request: unknown): Promise<unknown>
    {
        return new Promise((resolve, reject) =>
        {
            const own: Settle = { resolve, reject };

            if (!this.#outstanding) { this.#send({ request, settles: [own] }); return; }

            if (this.#p.concurrency === "queue") { this.#waiting.push({ request, settles: [own] }); return; }

            // latest: the replaced request is answered with its replacement's answer.
            this.#waiting = [{ request, settles: [...(this.#waiting[0]?.settles ?? []), own] }];
        });
    }

    /**
     * Teardown: pending promises are dropped, never settled into a torn-down
     * component. Unsubscribing stops late answers and clearing the timer stops
     * a late timeout, so nothing can call back after this.
     */
    release(): void
    {
        clearTimeout(this.#timer);
        this.#sub.unsubscribe();
        this.#outstanding = undefined;
        this.#waiting = [];
    }

    #send(pending: Pending): void
    {
        this.#outstanding = pending;
        // Cleared first, so an answer equal to the last one is still a change.
        this.#ctx.dataContext.set(this.#resultPath, undefined);
        this.#ctx.dataContext.set(this.#requestPath, toWire(pending.request));
        dispatchActionProp(this.#ctx, this.#p.actionProp);
        this.#timer = setTimeout(() => this.#onTimeout(), this.#timeoutMs);
    }

    #onResult(value: unknown): void
    {
        if (!this.#outstanding || value === undefined)
        {
            logDebug("provider", this.#key, "ignored a write that is not an answer");
            return;
        }

        const problem = this.#problem(value);

        if (problem !== undefined)
        {
            reportError(this.#ctx, ERROR_CODES.VALIDATION_FAILED, problem, this.#resultPath);
            return;
        }

        const done = this.#finish();
        const copy = structuredClone(value);

        done.settles.forEach((s) => s.resolve(copy));
        this.#next();
    }

    #problem(value: unknown): string | undefined
    {
        if (!this.#validate)
        {
            return `${this.#key} has no compiled validator; the adapter bundle is out of date. Rebuild it.`;
        }

        return this.#validate(value) ? undefined : `${this.#key} received ${JSON.stringify(value)}, which does not `
            + `match #/$defs/${this.#key.replace(".", "__")} in the catalog.`;
    }

    #onTimeout(): void
    {
        const done = this.#finish();
        const message = `${this.#key}: the agent did not answer ${this.#p.actionProp} within ${this.#timeoutMs} ms. `
            + `Answer each request once, with updateDataModel at ${this.#resultPath}.`;

        reportError(this.#ctx, ERROR_CODES.PROVIDER_TIMEOUT, message, this.#resultPath);
        done.settles.forEach((s) => s.reject(new Error(message)));
        this.#next();
    }

    #finish(): Pending
    {
        const done = this.#outstanding as Pending;

        clearTimeout(this.#timer);
        this.#outstanding = undefined;

        return done;
    }

    #next(): void
    {
        const next = this.#waiting.shift();

        if (next) { this.#send(next); }
    }
}
