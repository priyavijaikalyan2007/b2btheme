// @vitest-environment node
/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: A2uiPlaygroundServer. The playground's local server (#30 spec
 *    §4.2, §9): dist/ at /, the built page at /playground/, 127.0.0.1 only,
 *    and no path may escape either root.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { createServer, resolveRequest } from "./serve.mjs";

let distDir = "";
let outDir = "";

beforeAll(() =>
{
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "playground-serve-"));

    distDir = path.join(root, "dist");
    outDir = path.join(root, "out");
    fs.mkdirSync(path.join(distDir, "a2ui", "adapter"), { recursive: true });
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(distDir, "a2ui", "adapter", "v1.js"), "export {};");
    fs.writeFileSync(path.join(distDir, "secret.txt"), "no");
    fs.writeFileSync(path.join(outDir, "index.html"), "<!doctype html>");
    fs.writeFileSync(path.join(outDir, "main.js"), "");
    fs.writeFileSync(path.join(root, "package.json"), "{}");
});

describe("resolveRequest", () =>
{
    const roots = () => ({ distDir, outDir });

    test("/playground/ is the page", () =>
    {
        expect(resolveRequest("/playground/", roots())).toEqual({ file: path.join(outDir, "index.html") });
    });

    test("/playground/main.js is the bundle", () =>
    {
        expect(resolveRequest("/playground/main.js", roots())).toEqual({ file: path.join(outDir, "main.js") });
    });

    test("other paths come from dist/", () =>
    {
        expect(resolveRequest("/a2ui/adapter/v1.js", roots()))
            .toEqual({ file: path.join(distDir, "a2ui", "adapter", "v1.js") });
    });

    test("a query string is ignored", () =>
    {
        expect(resolveRequest("/playground/main.js?v=1", roots())).toEqual({ file: path.join(outDir, "main.js") });
    });

    test.each([
        "/playground/../../package.json",
        "/../package.json",
        "/playground/%2e%2e/%2e%2e/package.json",
        "/%2e%2e/package.json",
        "/playground/..%2f..%2fpackage.json",
        "//etc/passwd",
    ])("%s is refused", (url) =>
    {
        expect(resolveRequest(url, roots())).toEqual({ status: 403 });
    });

    test("a missing file is 404", () =>
    {
        expect(resolveRequest("/nope.js", roots())).toEqual({ status: 404 });
    });
});

describe("createServer", () =>
{
    let server: ReturnType<typeof createServer>;
    let base = "";

    beforeAll(async () =>
    {
        server = createServer({ distDir, outDir });
        await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
        base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    });

    afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

    test.each([
        ["/playground/", "text/html; charset=utf-8"],
        ["/playground/main.js", "text/javascript; charset=utf-8"],
        ["/a2ui/adapter/v1.js", "text/javascript; charset=utf-8"],
    ])("%s is served as %s", async (url, type) =>
    {
        const res = await fetch(`${base}${url}`);

        expect(res.status).toBe(200);
        expect(res.headers.get("content-type")).toBe(type);
    });

    test("a traversal attempt is 403 over HTTP too (sent raw: fetch would normalise the dots away)", async () =>
    {
        const status = await new Promise<number>((resolve) => http.get({ host: "127.0.0.1",
            port: (server.address() as AddressInfo).port, path: "/playground/%2e%2e/%2e%2e/package.json" },
        (res) => { res.resume(); resolve(res.statusCode ?? 0); }));

        expect(status).toBe(403);
    });
});

describe("the command", () =>
{
    test("refuses to start without dist/ and names the build command", () =>
    {
        const empty = fs.mkdtempSync(path.join(os.tmpdir(), "playground-empty-"));
        let message = "";

        try
        {
            execFileSync("node", [path.join(__dirname, "serve.mjs")],
                { encoding: "utf8", stdio: "pipe", env: { ...process.env, PLAYGROUND_ROOT: empty } });
        }
        catch (err)
        {
            message = String((err as { stderr?: string }).stderr);
        }

        expect(message).toContain("dist/ is absent. Run `npm run build` first.");
    });
});
