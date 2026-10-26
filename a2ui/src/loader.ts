/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 * File GUID: 030762fb-0ede-49bc-a5a5-e81b0987b801
 * Created: 2026-10-26
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: A2uiAdapter / Loader
 * 📜 PURPOSE: Loads a component's classic script and stylesheet once per
 *    page from the host-supplied assetBaseUrl, and the base theme only when
 *    the host opts in (spec §6.1). There is no default origin (D2).
 * 🔗 RELATES: [[A2uiAdapter]], [[CdnContract]]
 * ⚡ FLOW: [element] -> [loadAssets] -> [<script>/<link> in head] -> [load]
 * 🔒 SECURITY: Loads only from the origin the host names; the host's CSP
 *    must allow it for script-src and style-src.
 * ----------------------------------------------------------------------------
 */

// @semantic-marker a2ui-adapter-loader

/** The base theme stylesheet, relative to assetBaseUrl. */
const BASE_THEME = "css/custom.css";

/** One load per URL for the life of the page. */
let loads = new Map<string, Promise<void>>();

/**
 * Loads a component's assets (and the base theme, when asked).
 *
 * @param baseUrl         - Absolute http(s): or file: URL with no trailing slash.
 * @param assets          - Paths relative to baseUrl.
 * @param injectBaseTheme - Also load css/custom.css (spec §6.1).
 * @returns Resolves when every asset has loaded; rejects naming the first that failed.
 * @throws When baseUrl is not an acceptable base.
 */
export function loadAssets(baseUrl: string, assets: { js: string; css?: string }, injectBaseTheme: boolean): Promise<void>
{
    checkBase(baseUrl);

    const paths = [...(injectBaseTheme ? [BASE_THEME] : []), assets.js, ...(assets.css ? [assets.css] : [])];

    return Promise.all(paths.map((p) => loadOnce(`${baseUrl}/${p}`, baseUrl))).then(() => undefined);
}

/** Forgets every load. Tests only. */
export function resetLoaderForTests(): void
{
    loads = new Map();
}

function checkBase(baseUrl: string): void
{
    let url: URL;

    try { url = new URL(baseUrl); }
    catch { url = new URL("invalid:"); }

    if (!["http:", "https:", "file:"].includes(url.protocol))
    {
        throw new Error(`assetBaseUrl "${baseUrl}" must be an absolute http(s): or file: URL, such as `
            + "\"https://static.outcrop.us\". Pass the origin (and path) that serves the library's dist/ tree.");
    }

    if (baseUrl.endsWith("/"))
    {
        throw new Error(`assetBaseUrl "${baseUrl}" has a trailing slash. Remove it; asset paths are joined with "/".`);
    }
}

function loadOnce(url: string, baseUrl: string): Promise<void>
{
    const existing = loads.get(url);

    if (existing) { return existing; }

    const load = inject(url, baseUrl);
    loads.set(url, load);

    return load;
}

function inject(url: string, baseUrl: string): Promise<void>
{
    return new Promise((resolve, reject) =>
    {
        const el = url.endsWith(".js") ? scriptFor(url) : stylesheetFor(url);

        el.addEventListener("load", () => resolve(), { once: true });
        el.addEventListener("error", () => reject(new Error(`Could not load ${url}. Check that assetBaseUrl `
            + `(${baseUrl}) serves the library's dist/ tree and that the page's CSP allows that origin.`)), { once: true });
        document.head.appendChild(el);
    });
}

function scriptFor(url: string): HTMLScriptElement
{
    const script = document.createElement("script");

    // Components are classic IIFE scripts: not modules, and executed in order.
    script.async = false;
    script.src = url;

    return script;
}

function stylesheetFor(url: string): HTMLLinkElement
{
    const link = document.createElement("link");

    link.rel = "stylesheet";
    link.href = url;

    return link;
}
