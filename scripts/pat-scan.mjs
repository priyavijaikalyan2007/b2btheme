#!/usr/bin/env node
/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ CHECK: PAT-1, the factory functions that leak an implementation class.
 *
 * WHY THIS EXISTS. PAT-1 asks for an audit of every component factory,
 * to find the ones that return a class instance rather than a handle
 * interface. The audit is cheap to run and expensive to re-derive, and
 * the last time it was described in prose the count was wrong, so it
 * lives here as code.
 *
 * WHAT IT LOOKS FOR. Two things, because they are different failures.
 *
 * A factory whose return type is a class the file does not export is the
 * severe case. The consumer receives a value and has no name for its
 * type at all. DiagramEngine was in this state until 2026-10-15.
 *
 * A factory whose return type is a class the file does export is the
 * ordinary PAT-1 case. The consumer can name the type, and the name is
 * an implementation class, so every method on it reads as API.
 *
 * WHAT IT DELIBERATELY DOES NOT FLAG. A private implementation class on
 * its own is correct encapsulation and is the point of the handle
 * pattern. STD-2 was closed because it flagged exactly that and called
 * it a violation. Read the return type, not the class.
 *
 * This reports and does not gate. The remaining case is a design
 * question about which methods are public surface.
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";

const components = readdirSync("components", { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name);

const unnameable = [];
const classReturns = [];
let factories = 0;

for (const slug of components)
{
    const path = `components/${slug}/${slug}.ts`;
    if (!existsSync(path)) { continue; }

    const text = readFileSync(path, "utf8");
    const privateClasses = new Set(
        [...text.matchAll(/^class (\w+)/gm)].map(match => match[1]));
    const exportedClasses = new Set(
        [...text.matchAll(/^export class (\w+)/gm)].map(match => match[1]));

    for (const match of text.matchAll(/^export function (create\w+)\([^)]*\)\s*:\s*([\w<>[\]| ]+)/gm))
    {
        factories += 1;

        for (const name of match[2].split(/[<>[\]|]/).map(part => part.trim()))
        {
            if (privateClasses.has(name))
            {
                unnameable.push(`${slug}: ${match[1]}() returns ${name}, which ${slug}.ts does not export`);
            }
            else if (exportedClasses.has(name))
            {
                classReturns.push(`${slug}: ${match[1]}() returns the class ${name} rather than a handle interface`);
            }
        }
    }
}

console.log(`  exported factories scanned: ${factories} across ${components.length} components`);
console.log(`  returning a class the file does not export: ${unnameable.length}`);
for (const leak of unnameable) { console.log(`    - ${leak}`); }
console.log(`  returning an exported class rather than a handle: ${classReturns.length}`);
for (const leak of classReturns) { console.log(`    - ${leak}`); }
