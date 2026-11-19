/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: the paths that send a change to the full CI run
 *
 * ci.yml skips a change that touches only specs, the knowledge base or a
 * root guidance document. docs.yml checks those in about a minute. The
 * risk is a script that reads one of the skipped files: a change to that
 * file alone would then skip the step that reads it. So every file that a
 * tracked script names under a skipped path must be put back in ci.yml.
 *
 * The matcher follows GitHub's rule. The patterns are read in order, and
 * the last one that matches a file decides. A pattern with `!` drops it.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { load } from "js-yaml";
import { describe, expect, test } from "vitest";

interface Workflow
{
    on: Record<string, { paths: string[] }>;
}

function triggers(file: string): Workflow["on"]
{
    return (load(readFileSync(file, "utf8")) as Workflow).on;
}

const CI = triggers(".github/workflows/ci.yml");
const DOCS = triggers(".github/workflows/docs.yml");

/** The scripts that docs.yml runs, read from its `run:` lines. */
const DOCS_STEPS = [...readFileSync(".github/workflows/docs.yml", "utf8").matchAll(/run: .*?(scripts\/[\w./-]+)/g)]
    .map((m) => m[1]);

/** `**` crosses folders and `*` does not. Every other character is literal. */
function globToRegExp(glob: string): RegExp
{
    const body = glob.split("**").map((part) =>
        part.split("*").map((s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join("[^/]*")).join(".*");
    return new RegExp(`^${body}$`);
}

function runsFor(file: string, patterns: string[]): boolean
{
    let included = false;
    for (const pattern of patterns)
    {
        const negated = pattern.startsWith("!");
        if (globToRegExp(negated ? pattern.slice(1) : pattern).test(file))
        {
            included = !negated;
        }
    }
    return included;
}

function tracked(...globs: string[]): string[]
{
    return execFileSync("git", ["ls-files", ...globs], { encoding: "utf8" }).split("\n").filter(Boolean);
}

/**
 * The files under a skipped path that a script names. A JavaScript, TypeScript
 * or Python file must quote the path. A shell file may name a root document as
 * a bare word, as test-local.sh does in a `for` list. Shell comment lines are
 * skipped.
 */
function namedBySource(): [file: string, source: string][]
{
    const rootDocs = new Set(tracked("*.md").filter((f) => !f.includes("/")));
    const named: [string, string][] = [];
    const sources = tracked("*.ts", "*.mjs", "*.js", "*.sh", "*.py")
        .filter((f) => !f.startsWith("dist/") && f !== "scripts/ci-paths.test.ts");

    for (const source of sources)
    {
        const shell = source.endsWith(".sh");
        const lines = readFileSync(source, "utf8").split("\n")
            .filter((line) => !(shell && line.trimStart().startsWith("#")));
        const text = lines.join("\n");

        for (const m of text.matchAll(/["'`]((?:specs|agentknowledge)\/[\w./-]+)["'`]/g))
        {
            named.push([m[1].replace(/\/$/, ""), source]);
        }
        const rootDoc = shell ? /(?<![\w/.-])([A-Z][A-Z0-9_]*\.md)\b/g : /["'`/]([A-Z][A-Z0-9_]*\.md)["'`]/g;
        for (const m of text.matchAll(rootDoc))
        {
            if (rootDocs.has(m[1]))
            {
                named.push([m[1], source]);
            }
        }
    }
    return named;
}

describe("ci.yml paths", () =>
{
    test("a pull request and a push to main use the same paths", () =>
    {
        expect(CI.pull_request.paths).toEqual(CI.push.paths);
        expect(DOCS.pull_request.paths).toEqual(DOCS.push.paths);
    });

    test.each([
        "components/searchbox/searchbox.ts",
        "components/searchbox/README.md",
        "docs/INDEX.md",
        "package.json",
        ".github/workflows/ci.yml",
        ".gitignore",
        "specs/agentui/published/catalog-v1.json",
        "agentknowledge/decisions.yaml",
        "README.md",
        "COMPONENT_INDEX.md",
    ])("%s runs the full CI", (file) =>
    {
        expect(runsFor(file, CI.push.paths)).toBe(true);
    });

    test.each([
        "specs/2026-11-18-touch-ux-review.md",
        "specs/agentui-sweep.plan.md",
        "agentknowledge/history.jsonl",
        "agentknowledge/concepts.yaml",
        "TOUCH_EXPERIENCE.md",
        "LANGUAGE.md",
    ])("%s alone skips the full CI and runs docs.yml", (file) =>
    {
        expect(runsFor(file, CI.push.paths)).toBe(false);
        expect(runsFor(file, DOCS.push.paths)).toBe(true);
    });

    test("every file a script names under a skipped path runs the full CI, or its reader runs in docs.yml", () =>
    {
        // A name with no extension is a folder, such as specs/agentui/published.
        const fullRun = (file: string) =>
            runsFor(/\.\w+$/.test(file) ? file : `${file}/x`, CI.push.paths);
        const skipped = namedBySource()
            .filter(([file, source]) => !fullRun(file) && !DOCS_STEPS.includes(source))
            .map(([file, source]) => `${file} (named in ${source})`);

        expect(skipped).toEqual([]);
    });

    test("every file that ci.yml skips is checked by docs.yml", () =>
    {
        const unchecked = tracked().filter((f) => !runsFor(f, CI.push.paths) && !runsFor(f, DOCS.push.paths));

        expect(unchecked).toEqual([]);
    });
});
