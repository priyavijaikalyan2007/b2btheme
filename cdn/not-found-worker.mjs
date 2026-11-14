/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: NotFoundWorker
 * 📜 PURPOSE: Answer a request that matches no file in dist/ with a 404
 *    that no cache keeps. specs/bugreports/2026-11-14-lib-404-caching-
 *    and-deprecation-notice-timing.md, item 1.
 * 🔗 RELATES: [[CdnHeaders]], [[LibRetention]]
 * ⚡ FLOW: [request] -> [file in dist/? served as an asset, never reaches here]
 *          -> [no file] -> [404, Cache-Control: no-store]
 *
 * WHY A WORKER
 * ------------
 * Cloudflare applies cdn/_headers to a 404 as well as to a file. So a miss
 * under /lib/ was sent as `public, max-age=31536000, immutable`, and a
 * browser could keep that 404 for a year, after the file was deployed.
 * _headers cannot depend on the status. Cloudflare serves every matching
 * file without calling a Worker, and calls the Worker only when no file
 * matches. _headers does not apply to a Worker's own response.
 */

/** Headers on every 404. CORS is open so an SRI request (crossorigin) sees the 404, not a CORS error. */
export const NOT_FOUND_HEADERS = Object.freeze({
    "Cache-Control": "no-store",
    "Content-Type": "text/plain; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "X-Content-Type-Options": "nosniff",
});

export default {
    /**
     * Answers a request that matched no deployed file.
     *
     * @param {Request} request - The request Cloudflare could not serve from dist/.
     * @returns {Response} A 404 that no browser or shared cache stores.
     */
    fetch(request)
    {
        const body = request.method === "HEAD" ? null : "Not Found\n";

        return new Response(body, { status: 404, headers: NOT_FOUND_HEADERS });
    },
};
