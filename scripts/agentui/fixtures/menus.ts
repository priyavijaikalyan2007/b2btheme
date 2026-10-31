/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: FixtureMenuHost
 * 📜 PURPOSE: Synthetic options whose objects need host code to be usable (readiness step 3).
 * 🔗 RELATES: [[AgentUiClassifier]]
 * ⚡ FLOW: [classify.test.ts] -> [createClassifier] -> [menus.ts]
 */
/** A menu item that cannot run without its action. */
export interface MenuItem
{
    /** Item id. */
    id: string;

    /** Runs the item. */
    action: (ids: string[]) => void;
}

/** A tool whose callback is optional, so data alone is a usable tool. */
export interface Tool
{
    /** Tool id. */
    id: string;

    /** Fires on use. */
    onUse?: () => void;
}

/** A panel whose content is a DOM element. */
export interface Panel
{
    /** Panel id. */
    id: string;

    /** Panel content. */
    content: HTMLElement;
}

/** Options for the synthetic menu host. */
export interface MenuHostOptions
{
    /** Items, or a function returning them. */
    items?: MenuItem[] | (() => MenuItem[]);

    /** Items only. */
    fixedItems?: MenuItem[];

    /** Tools. */
    tools?: Tool[];

    /** Panels. */
    panels?: Panel[];
}

/** Synthetic options-first factory. */
export function createMenuHost(options: MenuHostOptions): { destroy(): void }
{
    void options;
    return { destroy: () => undefined };
}

/** Synthetic overloaded factory: the classifier must refuse it (#29). */
export function createOverloaded(options: MenuHostOptions): { destroy(): void };
export function createOverloaded(id: string, options: MenuHostOptions): { destroy(): void };
export function createOverloaded(a: MenuHostOptions | string, b?: MenuHostOptions): { destroy(): void }
{
    void a;
    void b;
    return { destroy: () => undefined };
}
