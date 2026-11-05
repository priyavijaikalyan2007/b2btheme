/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 * File GUID: 5e2a9c41-7d3b-4f86-a0c2-8b1e6f4d9a37
 * Created: 2026-11-05
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: ExampleServerMain
 * 📜 PURPOSE: Runs the example MCP server over stdio. The renderer is
 *    fetched first; if the CDN does not serve it, the server does not start.
 * 🔗 RELATES: [[ExampleServer]]
 * ⚡ FLOW: [loadRenderer] -> [createServer] -> [StdioServerTransport]
 * ----------------------------------------------------------------------------
 */

import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";

import { createServer, loadRenderer } from "./server";

async function main(): Promise<void>
{
    await createServer(await loadRenderer()).connect(new StdioServerTransport());
}

main().catch((error: unknown) =>
{
    console.error("[outcrop-example]", error);
    process.exit(1);
});
