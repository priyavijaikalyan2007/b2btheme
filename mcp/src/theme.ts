/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 * File GUID: 5792dcf8-c34e-4fe3-ad00-9054914c4be5
 * Created: 2026-11-05
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: McpViewTheme
 * 📜 PURPOSE: Makes the view look native in its host (spec §6): the host's
 *    theme, colours, fonts and radii become the library's tokens, and the
 *    host's container height becomes --outcrop-layout-height (ADR-238).
 *    Our tokens are the value; a host variable overrides one only while the
 *    host sends it.
 * 🔗 RELATES: [[McpView]], [[A2uiAdapter]]
 * ⚡ FLOW: [host context] -> [applyHostContext] -> [<html> attributes,
 *          inline custom properties, host font <style>]
 * ----------------------------------------------------------------------------
 */

import type { McpUiHostContext } from "@modelcontextprotocol/ext-apps";

/**
 * Host style variable → the library tokens it sets. Status colours, type
 * sizes, weights, line heights and shadows stay unmapped in v1 (spec §6).
 */
export const THEME_MAP: ReadonlyArray<readonly [string, readonly string[]]> = [
    ["--color-background-primary", ["--theme-surface-bg"]],
    ["--color-background-secondary", ["--theme-surface-raised-bg"]],
    ["--color-background-tertiary", ["--theme-surface-sunken-bg"]],
    ["--color-background-inverse", ["--theme-surface-inverse-bg"]],
    ["--color-text-primary", ["--theme-text-primary"]],
    ["--color-text-secondary", ["--theme-text-secondary"]],
    ["--color-text-tertiary", ["--theme-text-muted"]],
    ["--color-text-inverse", ["--theme-text-on-inverse"]],
    ["--color-border-primary", ["--theme-border-color"]],
    ["--font-sans", ["--bs-font-sans-serif", "--bs-body-font-family"]],
    ["--font-mono", ["--bs-font-monospace"]],
    ["--border-radius-sm", ["--bs-border-radius-sm"]],
    ["--border-radius-md", ["--bs-border-radius"]],
    ["--border-radius-lg", ["--bs-border-radius-lg"]],
];

/** The layout-height token the adapter reads (ADR-238). */
const LAYOUT_HEIGHT = "--outcrop-layout-height";
const FONTS_ID = "outcrop-mcp-host-fonts";

/** Library token → value, for the host variables that were sent. */
export function themeDeclarations(variables: Readonly<Record<string, string | undefined>> | undefined)
    : Map<string, string>
{
    const out = new Map<string, string>();

    for (const [host, tokens] of THEME_MAP)
    {
        const value = variables?.[host];

        if (value !== undefined) { tokens.forEach((token) => out.set(token, value)); }
    }

    return out;
}

/** --outcrop-layout-height: the viewport in fullscreen, else the container's height limit; null when the host gives none. */
export function layoutHeight(ctx: McpUiHostContext): string | null
{
    if (ctx.displayMode === "fullscreen") { return "100vh"; }

    const dims = ctx.containerDimensions as { height?: number; maxHeight?: number } | undefined;
    const px = dims?.maxHeight ?? dims?.height;

    return px === undefined ? null : `${px}px`;
}

/**
 * Applies the whole host context. Pass the merged context (App.getHostContext()),
 * not a change notification's partial one: a token absent here is removed.
 */
export function applyHostContext(root: HTMLElement, ctx: McpUiHostContext): void
{
    applyTheme(root, ctx.theme);

    const declared = themeDeclarations(ctx.styles?.variables);

    for (const token of THEME_MAP.flatMap(([, tokens]) => tokens))
    {
        const value = declared.get(token);

        if (value === undefined) { root.style.removeProperty(token); }
        else { root.style.setProperty(token, value); }
    }

    const height = layoutHeight(ctx);

    if (height === null) { root.style.removeProperty(LAYOUT_HEIGHT); }
    else { root.style.setProperty(LAYOUT_HEIGHT, height); }

    applyFonts(ctx.styles?.css?.fonts);
}

/** data-bs-theme and color-scheme; without a host theme, the library's light default. */
function applyTheme(root: HTMLElement, theme: McpUiHostContext["theme"]): void
{
    if (theme === undefined)
    {
        root.removeAttribute("data-bs-theme");
        root.style.removeProperty("color-scheme");
        return;
    }

    root.setAttribute("data-bs-theme", theme);
    root.style.colorScheme = theme;
}

/** The host's @font-face CSS in one style element; removed when the host stops sending it. */
function applyFonts(css: string | undefined): void
{
    const existing = document.getElementById(FONTS_ID);

    if (css === undefined) { existing?.remove(); return; }

    const style = existing ?? document.head.appendChild(Object.assign(document.createElement("style"), { id: FONTS_ID }));

    style.textContent = css;
}
