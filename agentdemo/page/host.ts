/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: A2uiPlaygroundHost
 * 📜 PURPOSE: The playground's A2UI host (#30 spec §5.2): one MessageProcessor,
 *    one labelled frame per surface, and one apply path for every source.
 *    It is also the reference for what a real host does: it removes a
 *    surface's element after deleteSurface (the #18 guide's rule) and turns
 *    actions and surface errors into the A2UI messages an agent receives.
 * 🔗 RELATES: [[A2uiPlayground]], [[A2uiAdapter]], [[AgentUiMessageChecker]]
 * ⚡ FLOW: [messages] -> [checkSchema] -> [processMessages, one at a time]
 *          -> [frames + action/error streams]
 * ----------------------------------------------------------------------------
 */

import { MessageProcessor } from "@a2ui/web_core/v0_9";
import type { ActionPayload, A2uiErrorPayload, SurfaceModel } from "@a2ui/web_core/v0_9";

import { A2UI_VERSION } from "./types";
import type { A2uiActionMessage, A2uiErrorMessage, ApplyResult, CheckSchema } from "./types";

export interface HostOptions
{
    /** Where surface frames are appended. */
    readonly surfacesEl: HTMLElement;
    /** A web_core catalog: createOutcropCatalog's result in the page. */
    readonly catalog: unknown;
    /** The checker's schema layer. */
    readonly checkSchema: CheckSchema;
}

type Listener<T> = (value: T) => void;

/**
 * `duringApply` is true for an error raised while `apply` ran: that error is
 * also in apply's result. An error raised later (a component's asset
 * failing to load, a bound value lost) is false, and only these need
 * reporting on their own.
 */
export type ErrorListener = (message: A2uiErrorMessage, duringApply: boolean) => void;

export class Host
{
    readonly #opts: HostOptions;
    readonly #processor: MessageProcessor;
    readonly #frames = new Map<string, HTMLElement>();
    readonly #actionListeners = new Set<Listener<A2uiActionMessage>>();
    readonly #errorListeners = new Set<ErrorListener>();
    #batch: A2uiErrorMessage[] | null = null;

    constructor(opts: HostOptions)
    {
        this.#opts = opts;
        // The catalog is built by the adapter or the checker; web_core's types cannot see that it is a Catalog.
        this.#processor = new MessageProcessor([opts.catalog as never], (a: ActionPayload) => this.#action(a));
        this.#processor.onSurfaceCreated((s) => this.#mount(s));
        this.#processor.onSurfaceDeleted((id) => this.#unmount(id));
    }

    /**
     * Applies a batch. Schema findings reject the whole batch; otherwise each
     * message is processed in turn, and one web_core rejects becomes an A2UI
     * error without stopping the rest.
     */
    apply(messages: readonly unknown[]): ApplyResult
    {
        const findings = this.#opts.checkSchema(messages);

        if (findings.length > 0) { return { applied: false, findings, errors: [] }; }

        const errors: A2uiErrorMessage[] = [];

        this.#batch = errors;

        try
        {
            for (const message of messages) { this.#processOne(message); }
        }
        finally
        {
            this.#batch = null;
        }

        return { applied: true, findings: [], errors };
    }

    /** Subscribes to actions, as A2UI action messages; returns an unsubscribe function. */
    onAction(listener: Listener<A2uiActionMessage>): () => void
    {
        this.#actionListeners.add(listener);

        return () => this.#actionListeners.delete(listener);
    }

    /** Subscribes to errors, as A2UI error messages; returns an unsubscribe function. */
    onError(listener: ErrorListener): () => void
    {
        this.#errorListeners.add(listener);

        return () => this.#errorListeners.delete(listener);
    }

    /** The whole data model of one surface. */
    dataModel(surfaceId: string): unknown
    {
        return this.#processor.getSurface(surfaceId)?.dataModel.get("/");
    }

    /** The IDs of the live surfaces, in creation order. */
    surfaces(): string[]
    {
        return [...this.#frames.keys()];
    }

    /** Deletes every surface, through the protocol's own deleteSurface. */
    reset(): void
    {
        for (const surfaceId of this.surfaces())
        {
            this.#processor.processMessages([{ version: A2UI_VERSION, deleteSurface: { surfaceId } }] as never);
        }
    }

    #processOne(message: unknown): void
    {
        try
        {
            this.#processor.processMessages([message] as never);
        }
        catch (err)
        {
            this.#error({ code: "MESSAGE_REJECTED", message: err instanceof Error ? err.message : String(err) });
        }
    }

    #mount(surface: SurfaceModel): void
    {
        const frame = document.createElement("section");
        const caption = document.createElement("header");
        const view = document.createElement("a2ui-surface") as HTMLElement & { surface?: unknown };

        frame.className = "a2ui-frame";
        frame.dataset.surface = surface.id;
        caption.textContent = `surface "${surface.id}"`;
        view.surface = surface;
        frame.append(caption, view);
        this.#opts.surfacesEl.append(frame);
        this.#frames.set(surface.id, frame);
        surface.onError.subscribe((e: A2uiErrorPayload) => this.#error({ surfaceId: surface.id, ...e }));
    }

    #unmount(surfaceId: string): void
    {
        this.#frames.get(surfaceId)?.remove();
        this.#frames.delete(surfaceId);
    }

    #action(action: ActionPayload): void
    {
        const message: A2uiActionMessage = { version: A2UI_VERSION, action };

        for (const listener of this.#actionListeners) { listener(message); }
    }

    #error(error: Record<string, unknown>): void
    {
        const message: A2uiErrorMessage = { version: A2UI_VERSION, error };

        this.#batch?.push(message);
        for (const listener of this.#errorListeners) { listener(message, this.#batch !== null); }
    }
}
