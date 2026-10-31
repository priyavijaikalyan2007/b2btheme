/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 * File GUID: 6f2c1d84-3a9e-4b57-8e10-c4d92b7a5f63
 * Created: 2026-10-31
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: A2uiAdapter / ChildElements
 * 📜 PURPOSE: A layout's children over A2UI (readiness step 4, ADR-238). The
 *    options hold component ids at the manifest's child slots; this puts each
 *    referenced component's element there instead, created from the host's
 *    own catalog and ComponentContext, where the layout already takes an
 *    HTMLElement. Elements are kept by id, so a rebuild moves the same element
 *    into the new layout and the child keeps its state.
 * 🔗 RELATES: [[A2uiAdapter]], [[ComponentContext]]
 * ⚡ FLOW: [options with ids] -> [withElements] -> [options with elements]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker a2ui-adapter-children

import { ERROR_CODES } from "./errors";
import type { ChildSlot, ComponentContextLike, SurfaceComponentsLike } from "./types";

/** Reports a problem to the agent. */
type Report = (code: string, message: string) => void;

/** The element of a child that is referenced but not yet in the surface, or that cannot be shown. */
function placeholder(id: string): HTMLElement
{
    const el = document.createElement("div");

    el.className = "outcrop-child-pending";
    el.dataset.outcropChild = id;

    return el;
}

/** Holds one layout's child elements, keyed by component id. */
export class ChildElements
{
    readonly #ctx: ComponentContextLike;
    readonly #report: Report;
    readonly #byId = new Map<string, HTMLElement>();
    #wanted = new Set<string>();

    constructor(ctx: ComponentContextLike, report: Report)
    {
        this.#ctx = ctx;
        this.#report = report;
    }

    /** The ids the last withElements call referred to, present in the surface or not. */
    get wanted(): ReadonlySet<string> { return this.#wanted; }

    /**
     * A copy of `options` with every id at a child slot replaced by its
     * element. An id not yet in the surface gets an empty placeholder (a
     * "one" slot) or is left out (a "many" slot); it fills in when the
     * component arrives. An id used twice is reported and placed once.
     */
    withElements(options: Record<string, unknown>, slots: readonly ChildSlot[]): Record<string, unknown>
    {
        const seen = new Set<string>();
        let out = options;

        this.#wanted = new Set();

        for (const slot of slots)
        {
            out = mapAtPath(out, segmentsOf(slot.path), (ids) => (slot.cardinality === "many"
                ? (Array.isArray(ids) ? ids : []).map((id) => this.#take(id, seen, slot)).filter((el) => el !== null)
                : this.#take(ids, seen, slot) ?? placeholder(String(ids))));
        }

        for (const id of [...this.#byId.keys()].filter((id) => !this.#wanted.has(id))) { this.#byId.delete(id); }

        return out;
    }

    /** Forgets every element; their own disconnect handling tears them down. */
    release(): void
    {
        this.#byId.clear();
        this.#wanted = new Set();
    }

    /** The element for one id, or null when it cannot be placed. */
    #take(id: unknown, seen: Set<string>, slot: ChildSlot): HTMLElement | null
    {
        if (typeof id !== "string") { return null; }

        this.#wanted.add(id);

        if (id === this.#ctx.componentModel.id)
        {
            this.#report(ERROR_CODES.VALIDATION_FAILED, `${this.#where()}: it lists itself as a child at `
                + `${slot.path}, which would place it inside itself forever.`);
            return null;
        }

        if (seen.has(id))
        {
            this.#report(ERROR_CODES.VALIDATION_FAILED, `${this.#where()}: the child "${id}" is referenced more `
                + `than once (again at ${slot.path}); one element cannot be in two places. Give each slot its own `
                + "component.");
            return null;
        }

        seen.add(id);

        // A component deleted from the surface leaves its slot, even if its element is still kept.
        if (!this.#components()?.get(id))
        {
            this.#byId.delete(id);
            return null;
        }

        return this.#byId.get(id) ?? this.#create(id);
    }

    /** The surface's components. */
    #components(): SurfaceComponentsLike | undefined
    {
        return this.#ctx.dataContext.surface?.componentsModel as SurfaceComponentsLike | undefined;
    }

    /** Creates the element for a component in the surface, or null when it is not there yet or cannot render. */
    #create(id: string): HTMLElement | null
    {
        const surface = this.#ctx.dataContext.surface;
        const model = this.#components()?.get(id);

        if (!surface || !model) { return null; }

        const entry = model.catalog?.components.get(model.type);

        if (!entry?.tagName || typeof entry.element !== "function")
        {
            this.#report(ERROR_CODES.MOUNT_FAILED, `${this.#where()}: the child "${id}" is a ${model.type}, whose `
                + "catalog entry has no element to render, so it cannot be placed in this layout.");
            return null;
        }

        // As web_core's renderA2uiNode does: a universal element is defined the first time it is rendered.
        if (!customElements.get(entry.tagName)) { customElements.define(entry.tagName, entry.element); }

        const el = document.createElement(entry.tagName) as HTMLElement & { context?: unknown };
        const Context = this.#ctx.constructor as new (s: unknown, id: string, path: string) => unknown;

        el.context = new Context(surface, id, this.#ctx.dataContext.path);
        this.#byId.set(id, el);

        return el;
    }

    #where(): string
    {
        return `${this.#ctx.componentModel.type} ${this.#ctx.componentModel.id}`;
    }
}

/** "panels[].content" as ["panels", "[]", "content"]. */
function segmentsOf(path: string): string[]
{
    return path.split(/(?=\[\])|\.|(?<=\[\])/).filter(Boolean);
}

/** A copy of `value` with the node at `segments` replaced by `fn(node)`; absent nodes are left alone. */
function mapAtPath(value: unknown, segments: readonly string[], fn: (node: unknown) => unknown): Record<string, unknown>
{
    return mapNode(value, segments, fn) as Record<string, unknown>;
}

function mapNode(value: unknown, segments: readonly string[], fn: (node: unknown) => unknown): unknown
{
    if (segments.length === 0) { return fn(value); }

    const [head, ...rest] = segments;

    if (head === "[]")
    {
        return Array.isArray(value) ? value.map((item) => mapNode(item, rest, fn)) : value;
    }

    if (value === null || typeof value !== "object" || !(head in value)) { return value; }

    const record = value as Record<string, unknown>;

    return { ...record, [head]: mapNode(record[head], rest, fn) };
}
