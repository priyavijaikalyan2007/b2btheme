/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * E2E helper: build the A2UI playground once and serve /playground/* from
 * agentdemo/.out by route, next to the dist/ tree the Playwright web server
 * already serves at :8000. The page then loads the adapter and components
 * from dist/ exactly as it does under `npm run demo:a2ui`.
 */

import fs from "node:fs";
import path from "node:path";
import type { Page } from "@playwright/test";

const REPO = path.join(__dirname, "..", "..");
export const ORIGIN = "http://localhost:8000";
const TYPES: Record<string, string> = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
    ".json": "application/json", ".jsonl": "application/x-ndjson", ".map": "application/json" };

let built: Promise<string> | null = null;

/** Builds the playground (once per worker); returns its output directory. */
export function buildOnce(): Promise<string>
{
    built ??= import(path.join(REPO, "agentdemo", "build.mjs")).then((m) => m.buildPlayground(REPO) as Promise<string>);

    return built;
}

/** Routes /playground/* to the build, records CSP violations, opens the page and waits for it. */
export async function openPlayground(page: Page): Promise<void>
{
    const out = await buildOnce();

    await page.route(`${ORIGIN}/playground/**`, async (route) =>
    {
        const rel = new URL(route.request().url()).pathname.slice("/playground/".length) || "index.html";
        const file = path.join(out, rel);

        if (!fs.existsSync(file)) { await route.fulfill({ status: 404, body: "" }); return; }

        await route.fulfill({ contentType: TYPES[path.extname(file)] ?? "application/octet-stream",
            body: fs.readFileSync(file) });
    });
    await page.addInitScript(() =>
    {
        const w = window as unknown as { __csp: string[] };

        w.__csp = [];
        document.addEventListener("securitypolicyviolation",
            (e) => w.__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
    });
    await page.goto(`${ORIGIN}/playground/`);
    await page.waitForFunction(() => !!(window as unknown as { a2uiPlayground?: unknown }).a2uiPlayground);
}

/** The CSP violations recorded so far. */
export function cspViolations(page: Page): Promise<string[]>
{
    return page.evaluate(() => (window as unknown as { __csp: string[] }).__csp);
}
