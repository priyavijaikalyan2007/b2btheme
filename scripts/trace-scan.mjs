#!/usr/bin/env node
/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ CHECK: LOG-4, trace instrumentation against the components that need it.
 *
 * WHY THIS EXISTS. LOG-4 was a coverage gap rather than a bug: 108
 * components declared `logTrace` following the pattern in
 * FRONTEND_LOGGING.md, and 2 ever called it. A dragging or scrolling
 * bug in the other 106 produced no trace output at all, which is the
 * one level that would have shown it.
 *
 * Nothing could have caught that. Every count in audit-counts.mjs before
 * this one measured an unwanted thing and held it down. A missing
 * `logTrace` call is an absence, and a ceiling cannot see an absence.
 * That is the same shape as STD-1, where a stripped `export` kept the
 * published type surface at one name out of 138 for months.
 *
 * WHAT COUNTS AS HIGH FREQUENCY. A component qualifies when it registers
 * a listener for an event that repeats through a single gesture or a
 * stream, or when it observes layout or visibility. Both are the cases
 * FRONTEND_LOGGING.md section 4.5 reserves trace for.
 *
 * Deliberately NOT high frequency: a one-shot requestAnimationFrame used
 * to start a CSS transition, and setInterval, which in this repository is
 * a countdown tick rather than a frame loop. bannerbar, codeeditor and
 * gauge are the components that turn on this distinction.
 *
 * logconsole is traced anyway and this rule does not ask it to be. Its
 * requestAnimationFrame is a coalescing flush that reschedules itself
 * under a burst of entries, which is a frame loop in everything but
 * spelling. Instrumenting more than the rule requires is always allowed,
 * because the floor forbids less and never more. If that call is ever
 * deleted the scanner will report logconsole as a dead shim, which is the
 * wrong instruction: the right one is to put the trace back.
 *
 * diagramengine has no `function logTrace` and never will. It is the
 * multi-namespace bundle of FRONTEND_LOGGING.md section 1.1, and it takes
 * all five levels from `makeLogger` in src/logging.ts, which destructures
 * `trace: logTrace` once for the whole engine. countTraceCalls therefore
 * sees its calls and declaresTraceShim does not see a declaration, which
 * is the right answer by accident rather than by design: there is no
 * declaration to subtract, so the count is not off by one. If the engine's
 * trace calls are ever removed it is reported as hotWithoutShim rather
 * than as an untraced shim. That wording is literally true and still the
 * wrong instruction, because the fix is to put the calls back and not to
 * add a shim the engine does not use.
 *
 * WHAT IT REPORTS. Three populations, because they need different work.
 * A hot component whose shim is never called is the LOG-4 gap itself. A
 * cold component carrying a shim has a dead helper, which
 * FRONTEND_LOGGING.md says to drop. A hot component with no shim at all
 * was never in LOG-4, because LOG-4 was defined over the components that
 * declared one. LOG-4a closed that third population on 2026-10-15, so it
 * now sits at 0 and a new component that does high-frequency work without
 * a shim fails rather than being absorbed.
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";

/**
 * Events that repeat through one gesture or arrive as a stream. `click`
 * and `pointerdown` are absent on purpose: one gesture produces one.
 */
export const HIGH_FREQUENCY_EVENTS = [
    "mousemove", "pointermove", "touchmove", "scroll", "wheel", "input",
    "beforeinput", "keydown", "keyup", "keypress", "drag", "dragover",
    "resize", "selectionchange",
];

/** Observers that fire at frame rate while layout or visibility changes. */
export const FRAME_RATE_OBSERVERS = ["ResizeObserver", "IntersectionObserver", "MutationObserver"];

/**
 * True when the source registers a listener for a high-frequency event.
 *
 * Up to two leading arguments are allowed, because listeners are registered
 * directly and through helpers such as `addTracked(list, target, event, fn)`.
 *
 * The argument AFTER the event name has to look like a handler, which rules
 * out the two shapes that otherwise read as registrations: `htmlEl("input",
 * { type: "text" })` builds an element, and `hideCard(state, "scroll", true)`
 * passes an ordinary string that happens to spell an event.
 */
export function hasHighFrequencyListener(text)
{
    const names = HIGH_FREQUENCY_EVENTS.join("|");
    const pattern = `\\(\\s*(?:[A-Za-z_$][\\w.$]*\\s*,\\s*){0,2}["'](?:${names})["']\\s*,\\s*`
        + "(?!(?:true|false|null|undefined)\\s*[,)])"
        + "(?:function\\b|async\\b|\\(|[A-Za-z_$][\\w.$]*)";
    return new RegExp(pattern).test(text);
}

/** True when the source constructs an observer that fires at frame rate. */
export function hasFrameRateObserver(text)
{
    return FRAME_RATE_OBSERVERS.some(name => new RegExp(`new ${name}\\s*\\(`).test(text));
}

/** True when the component does work often enough to deserve trace. */
export function isHighFrequency(text)
{
    return hasHighFrequencyListener(text) || hasFrameRateObserver(text);
}

/** True when the component declares the logTrace shim. */
export function declaresTraceShim(text)
{
    return /function logTrace\(/.test(text);
}

/** How many times the component calls logTrace, not counting the declaration. */
export function countTraceCalls(text)
{
    const all = (text.match(/\blogTrace\(/g) ?? []).length;
    return declaresTraceShim(text) ? all - 1 : all;
}

/**
 * Sorts one component into exactly one bucket.
 *
 * @returns "traced", "untracedHotShim", "deadTraceShim", "hotWithoutShim" or "cold".
 */
export function classify(text)
{
    const hot = isHighFrequency(text);
    const declares = declaresTraceShim(text);
    const calls = countTraceCalls(text);

    if (calls > 0) { return "traced"; }
    if (hot && declares) { return "untracedHotShim"; }
    if (hot) { return "hotWithoutShim"; }
    if (declares) { return "deadTraceShim"; }
    return "cold";
}

/** Reads every component source and classifies it. Used by audit-counts.mjs. */
export function scanComponents(root = "components")
{
    const buckets = { traced: [], untracedHotShim: [], deadTraceShim: [], hotWithoutShim: [], cold: [] };
    let calls = 0;

    for (const entry of readdirSync(root, { withFileTypes: true }))
    {
        if (!entry.isDirectory()) { continue; }
        const path = `${root}/${entry.name}/${entry.name}.ts`;
        if (!existsSync(path)) { continue; }

        const text = readFileSync(path, "utf8");
        buckets[classify(text)].push(entry.name);
        calls += countTraceCalls(text);
    }
    return { ...buckets, calls };
}

if (import.meta.url === `file://${process.argv[1]}`)
{
    const r = scanComponents();
    console.log(`components traced:              ${r.traced.length} (${r.calls} logTrace calls)`);
    console.log(`high frequency, shim unused:    ${r.untracedHotShim.length}`);
    console.log(`not high frequency, dead shim:  ${r.deadTraceShim.length}`);
    console.log(`high frequency, no shim at all: ${r.hotWithoutShim.length}`);
    console.log(`not high frequency, no shim:    ${r.cold.length}`);
    for (const [name, list] of [["shim unused", r.untracedHotShim], ["dead shim", r.deadTraceShim], ["no shim", r.hotWithoutShim]])
    {
        if (list.length) { console.log(`  ${name}: ${list.join(", ")}`); }
    }
}
