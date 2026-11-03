/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: IconPackFetch
 * 📜 PURPOSE: Download one pinned upstream icon source into a temp directory,
 *    and refuse anything that is not exactly the pinned bytes: the npm tarball
 *    must match its recorded integrity, the git checkout its recorded commit.
 *    Dev-time only; the build never fetches. specs/icon-packs.plan.md.
 * 🔗 RELATES: [[IconPackRepack]]
 * ⚡ FLOW: [sources.json pin] -> [npm pack | git sparse fetch] -> [verified dir]
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

/** Runs a command without a shell; returns trimmed stdout. */
function run(cmd, args, cwd)
{
    return execFileSync(cmd, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }).trim();
}

/**
 * npm-packs the pinned version, checks its integrity and extracts it.
 * @param {{ npm: string, version: string, integrity: string }} pin
 * @param {string} workDir An empty temp directory.
 * @returns {string} The extracted "package" directory.
 */
export function fetchNpmTarball({ npm, version, integrity }, workDir)
{
    fs.mkdirSync(workDir, { recursive: true });
    const [packed] = JSON.parse(run("npm", ["pack", `${npm}@${version}`, "--pack-destination", workDir, "--json"]));
    if (packed.integrity !== integrity)
    {
        throw new Error(`${npm}@${version}: integrity ${packed.integrity} does not match the pin ${integrity}`);
    }
    run("tar", ["-xzf", path.join(workDir, packed.filename), "-C", workDir]);
    return path.join(workDir, "package");
}

/**
 * Sparse, blobless, depth-1 checkout of exactly the pinned commit.
 * @param {{ repo: string, commit: string, paths: string[] }} pin
 * @param {string} workDir An empty temp directory.
 * @returns {string} workDir, holding only the requested paths.
 */
export function sparseCheckout({ repo, commit, paths }, workDir)
{
    fs.mkdirSync(workDir, { recursive: true });
    run("git", ["init", "-q"], workDir);
    run("git", ["remote", "add", "origin", repo], workDir);
    run("git", ["sparse-checkout", "set", "--no-cone", ...paths], workDir);
    run("git", ["fetch", "-q", "--depth", "1", "--filter=blob:none", "origin", commit], workDir);
    run("git", ["checkout", "-q", "FETCH_HEAD"], workDir);
    const head = run("git", ["rev-parse", "HEAD"], workDir);
    if (head !== commit)
    {
        throw new Error(`${repo}: checked out ${head}, expected the pinned ${commit}`);
    }
    return workDir;
}
