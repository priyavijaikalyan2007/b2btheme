/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: AppLauncher / ConformanceGlue
 * 📜 PURPOSE: The mount fixture, channel triggers and search request for the
 *    conformance gate and A2UI G3 (readiness step 2 B8). The fixture renders
 *    in place ("fullpage"), so the tiles are inside the component.
 * 🔗 RELATES: [[AppLauncher]], [[Conformance]]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker applauncher-conformance-glue

/** Minimal view of the handle, limited to what the triggers need. */
interface AppLauncherLike
{
    getElement(): HTMLElement | null;
}

const APPS = [
    { id: "a1", name: "Dashboard", icon: "bi-speedometer2" },
    { id: "a2", name: "Projects", icon: "bi-kanban" },
];

/** The element `selector` names inside the launcher. */
function find(handle: Record<string, unknown>, selector: string): HTMLElement | null
{
    return (handle as unknown as AppLauncherLike).getElement()?.querySelector<HTMLElement>(selector) ?? null;
}

export const CONFORMANCE_GLUE =
{
    options: { apps: APPS, mode: "fullpage" },

    // The apps to open, rendered in place; an agent sets these too.
    eventProps: { apps: APPS, mode: "fullpage" },

    trigger: (
        channel: string,
        handle: Record<string, unknown>): boolean =>
    {
        const target = channel === "select" ? find(handle, ".applauncher-tile[data-app-id='a2']")
            : channel === "favoriteToggle" ? find(handle, ".applauncher-tile-fav")
                : null;

        target?.click();

        return target != null;
    },

    /** Create-time props a search request needs: the search box, in place. */
    requestProps: { mode: "fullpage" },

    /** Makes the component ask its provider (ADR-225): type a search; it is sent after the debounce. */
    request: (
        request: string,
        handle: Record<string, unknown>): boolean =>
    {
        if (request !== "search") { return false; }

        const input = find(handle, ".applauncher-search-input") as HTMLInputElement | null;

        if (!input) { return false; }

        input.value = "pro";
        input.dispatchEvent(new Event("input", { bubbles: true }));

        return true;
    },
};
