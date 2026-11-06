#!/usr/bin/env node
/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: McpDemoServe
 * 📜 PURPOSE: `npm run demo:mcp` (agentui-unblock §6): one local process
 *    that is the CDN (dist/ at /, with the CDN's CORS header, so the
 *    sandboxed view can load from it), the demo MCP server over Streamable
 *    HTTP at /rpc, and the host page at /host/. Binds 127.0.0.1 only. Dev
 *    tooling: nothing here is deployed.
 * 🔗 RELATES: [[McpDemoServer]], [[McpDemoHost]], [[A2uiPlaygroundServer]]
 * ⚡ FLOW: [/rpc] -> [createDemoServer] -> [WebStandardStreamableHTTPServerTransport]
 *          [/host/*] -> [host page]   [/*] -> [dist/]
 *
 * Usage: node mcp/demo/serve.mjs   (PORT=8125 by default)
 */

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";

import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/server";

import { resolveRequest, TYPES } from "../../agentdemo/serve.mjs";
import { createDemoServer, demoRenderer } from "./server.mjs";

export const HOST_PREFIX = "/host/";
export const RPC_PATH = "/rpc";

/** A Node request as the Web Request the SDK's transport takes. */
function webRequest(req, origin)
{
    const headers = new Headers();

    for (const [name, value] of Object.entries(req.headers))
    {
        for (const v of [value].flat()) { if (v !== undefined) { headers.append(name, v); } }
    }

    const body = req.method === "GET" || req.method === "HEAD" ? undefined : Readable.toWeb(req);

    return new Request(new URL(req.url ?? "/", origin), { method: req.method, headers, body, duplex: "half" });
}

/** Answers one /rpc request with a fresh server and transport (stateless Streamable HTTP). */
async function rpc(req, res, origin, renderer)
{
    const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined,
        enableJsonResponse: true });

    await createDemoServer(renderer).connect(transport);

    const response = await transport.handleRequest(webRequest(req, origin));

    res.writeHead(response.status, Object.fromEntries(response.headers));

    if (response.body) { Readable.fromWeb(response.body).pipe(res); }
    else { res.end(); }
}

/** Serves a file from dist/ or the host page. dist/ answers any origin, as the CDN does. */
function file(req, res, roots)
{
    const found = resolveRequest(req.url ?? "/", roots, HOST_PREFIX);

    if ("status" in found)
    {
        res.writeHead(found.status, { "content-type": "text/plain; charset=utf-8" });
        res.end(found.status === 403 ? "Forbidden" : "Not found");
        return;
    }

    const cdn = !found.file.startsWith(`${path.resolve(roots.outDir)}${path.sep}`);

    res.writeHead(200, { "content-type": TYPES[path.extname(found.file)] ?? "application/octet-stream",
        "cache-control": "no-store", ...(cdn ? { "access-control-allow-origin": "*" } : {}) });
    fs.createReadStream(found.file).pipe(res);
}

/**
 * Starts the demo on 127.0.0.1:`port` (0 picks a free one).
 *
 * @param {{repo: string, port: number}} options
 * @returns {Promise<{origin: string, close: () => Promise<void>}>}
 */
export async function startDemo({ repo, port })
{
    const roots = { distDir: path.join(repo, "dist"), outDir: path.join(repo, "mcp", "demo", ".out") };
    const manifest = JSON.parse(fs.readFileSync(path.join(roots.distDir, "lib-manifest.json"), "utf8"));
    let origin = "";
    let renderer;
    const server = http.createServer((req, res) =>
    {
        const url = (req.url ?? "/").split("?")[0];

        if (url === RPC_PATH)
        {
            rpc(req, res, origin, renderer).catch((err) =>
            {
                console.error("[mcp-demo] /rpc failed:", err);
                if (!res.headersSent) { res.writeHead(500, { "content-type": "text/plain; charset=utf-8" }); }
                res.end(String(err));
            });
            return;
        }

        if (url === "/") { res.writeHead(302, { location: HOST_PREFIX }); res.end(); return; }

        file(req, res, roots);
    });

    await new Promise((resolve, reject) =>
    {
        server.once("error", reject);
        server.listen(port, "127.0.0.1", () => resolve(undefined));
    });

    origin = `http://127.0.0.1:${/** @type {import("node:net").AddressInfo} */ (server.address()).port}`;
    renderer = demoRenderer(origin, manifest);

    return { origin, close: () => new Promise((resolve) => { server.close(() => resolve()); }) };
}

/** Serves the demo on PORT (8125); exits when dist/ or the host page is missing. */
async function main()
{
    const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
    const port = Number(process.env.PORT ?? 8125);

    if (!fs.existsSync(path.join(repo, "dist", "mcp", "view", "v1.js")))
    {
        fail("dist/mcp/view/v1.js is absent. Run `npm run build` first.");
    }
    if (!fs.existsSync(path.join(repo, "mcp", "demo", ".out", "index.html")))
    {
        fail("mcp/demo/.out/index.html is absent. Run `node mcp/demo/build.mjs` first.");
    }

    try
    {
        const { origin } = await startDemo({ repo, port });

        console.log(`MCP Apps demo: ${origin}${HOST_PREFIX}`);
    }
    catch (err)
    {
        fail(err.code === "EADDRINUSE"
            ? `Port ${port} is in use. Stop whatever holds it, or run with PORT=<another port>.` : String(err));
    }
}

/** Prints the message and exits with status 1. */
function fail(message)
{
    console.error(`[mcp-demo] ${message}`);
    process.exit(1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) { void main(); }
