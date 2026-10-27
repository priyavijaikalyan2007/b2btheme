#!/usr/bin/env node
/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: A2uiPlaygroundServer
 * 📜 PURPOSE: Serve the A2UI playground locally (#30 spec §4.2): `dist/` at
 *    `/`, so the page loads the adapter and the components exactly as a
 *    third-party host would, and the built page at `/playground/`. Binds
 *    127.0.0.1 only and refuses any path that escapes its roots. Dev tooling:
 *    nothing here is deployed.
 * 🔗 RELATES: [[A2uiPlayground]], [[A2uiAdapter]]
 * ⚡ FLOW: [GET path] -> [resolveRequest] -> [file | 403 | 404]
 *
 * Usage: node agentdemo/serve.mjs   (PORT=8124 by default)
 */

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PREFIX = "/playground/";
const TYPES = {
    ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8", ".jsonl": "application/x-ndjson; charset=utf-8",
    ".svg": "image/svg+xml", ".png": "image/png", ".woff": "font/woff", ".woff2": "font/woff2",
    ".ttf": "font/ttf", ".map": "application/json; charset=utf-8",
};

/**
 * The file a request path names, or why there is none.
 *
 * @param {string} url - The request URL path, possibly with a query.
 * @param {{distDir: string, outDir: string}} roots - The two served trees.
 * @returns {{file: string} | {status: 403 | 404}}
 */
export function resolveRequest(url, roots)
{
    let decoded;

    try { decoded = decodeURIComponent(url.split("?")[0]); }
    catch { return { status: 403 }; }

    if (decoded.includes("\0") || decoded.split("/").includes("..") || decoded.startsWith("//"))
    {
        return { status: 403 };
    }

    const inPage = decoded.startsWith(PREFIX);
    const root = path.resolve(inPage ? roots.outDir : roots.distDir);
    const rel = inPage ? decoded.slice(PREFIX.length) : decoded.slice(1);
    const file = path.resolve(root, rel === "" ? "index.html" : rel);

    if (file !== root && !file.startsWith(`${root}${path.sep}`)) { return { status: 403 }; }

    return fs.existsSync(file) && fs.statSync(file).isFile() ? { file } : { status: 404 };
}

/**
 * A server for the two trees; the caller listens.
 *
 * @param {{distDir: string, outDir: string}} roots - The two served trees.
 * @returns {http.Server}
 */
export function createServer(roots)
{
    return http.createServer((req, res) =>
    {
        const found = resolveRequest(req.url ?? "/", roots);

        if ("status" in found)
        {
            res.writeHead(found.status, { "content-type": "text/plain; charset=utf-8" });
            res.end(found.status === 403 ? "Forbidden" : "Not found");
            return;
        }

        res.writeHead(200, { "content-type": TYPES[path.extname(found.file)] ?? "application/octet-stream",
            "cache-control": "no-store" });
        fs.createReadStream(found.file).pipe(res);
    });
}

function main()
{
    const here = path.dirname(fileURLToPath(import.meta.url));
    const repo = process.env.PLAYGROUND_ROOT ?? path.resolve(here, "..");
    const roots = { distDir: path.join(repo, "dist"), outDir: path.join(repo, "agentdemo", ".out") };
    const port = Number(process.env.PORT ?? 8124);

    if (!fs.existsSync(roots.distDir)) { fail("dist/ is absent. Run `npm run build` first."); }
    if (!fs.existsSync(path.join(roots.outDir, "index.html")))
    {
        fail("agentdemo/.out/index.html is absent. Run `npm run build:demo:a2ui` first.");
    }

    const server = createServer(roots);

    server.on("error", (err) => fail(err.code === "EADDRINUSE"
        ? `Port ${port} is in use. Stop whatever holds it, or run with PORT=<another port>.` : String(err)));
    server.listen(port, "127.0.0.1", () => console.log(`A2UI playground: http://127.0.0.1:${port}${PREFIX}`));
}

function fail(message)
{
    console.error(`[playground] ${message}`);
    process.exit(1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) { main(); }
