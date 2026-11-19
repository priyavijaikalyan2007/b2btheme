#!/usr/bin/env node
/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ CHECK: the touch counts of TOUCH_EXPERIENCE.md section 1, re-derivable.
 *
 * WHY THIS EXISTS. Section 1 of TOUCH_EXPERIENCE.md and issue #181 quote
 * counts from a search made on 15 November 2026. Nobody wrote down the
 * file set or the patterns, so nobody can measure them again and get a
 * number that means the same thing. Issue #202 asks for each count with a
 * written file set and pattern, as audit-counts.mjs does. This script is
 * that record. It names the components in each count, because the review
 * in specs/2026-11-18-touch-ux-review.md works from the names.
 *
 * THE UNIT is a component directory under `components/`. A directory is in
 * a count when ANY of its files matches. DiagramEngine keeps most of its
 * code in `src/`, so a rule that read only `<name>/<name>.ts` would miss it.
 *
 * THE FILE SET, per directory: tracked `.ts` files, without `.test.ts`,
 * `.spec.ts`, `.mock.ts`, `.d.ts`, `.manifest.ts`, `.conformance.ts` and
 * the ANTLR output in `querylanguage/generated/`, and tracked `.scss`
 * files. A manifest describes options to agents and holds no listener. A
 * conformance file drives the component from the fleet-conformance gate,
 * so its list of event names to dispatch is not a listener. No component injects
 * a `:hover` rule from TypeScript on 18 November 2026, so the hover count
 * reads SCSS only.
 *
 * THE PATTERNS. A listener is an event name in quotes followed by a comma,
 * as in `addEventListener("pointerdown", fn)` and `this.listen(el,
 * "pointerdown", fn)`, or an `on<name> =` property. A line whose trimmed
 * text starts with `//`, `*` or `/*` is a comment and is skipped, the
 * convention classifyConsoleLog in audit-counts.mjs uses.
 *
 * WHAT IT CANNOT SEE. It counts directories, not surfaces. A component that
 * handles `pointercancel` on one surface and not on another counts as
 * handling it. A component that uses the shared GestureRecognizer counts as
 * handling `pointercancel`, because the recognizer turns it into
 * `onDragCancel`. The review reads the code where the difference matters.
 *
 * HOW IT GATES. audit-counts.mjs holds six of these counts as ratchets,
 * the `touch*` entries in its BASELINES. The owner chose them on 18
 * November 2026 (#202). The others are reported here and not gated.
 *
 * Run: node scripts/touch-counts.mjs
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
// audit-counts.mjs imports measureTouch from this file, so the two import each
// other. That is safe: each uses the other's functions only when called, never
// while the modules load.
import { stripScssComments } from "./audit-counts.mjs";

/** True when the line is a comment by the convention in the header. */
function isCommentLine(line)
{
    const t = line.trimStart();
    return t.startsWith("//") || t.startsWith("*") || t.startsWith("/*");
}

/** The source without its comment lines. */
export function codeLines(text)
{
    return text.split("\n").filter((line) => !isCommentLine(line)).join("\n");
}

/** True when the code registers a listener for `event`, by the pattern in the header. */
export function listensFor(code, event)
{
    // The lookbehind skips a synthetic event, as in `new PointerEvent("pointerdown", {`.
    const quoted = new RegExp(`(?<!Event\\(\\s*)(["'\`])${event}\\1\\s*,`);
    const property = new RegExp(`\\.on${event}\\s*=`);
    return quoted.test(code) || property.test(code);
}

/**
 * True when the code recognizes a long press: through GestureRecognizer's
 * `onLongPress`, through ContextMenu's `attachLongPress`, or with its own
 * `LONG_PRESS` timer, which section 9 item 3 forbids but which still counts.
 */
export function recognizesLongPress(code)
{
    return /\bonLongPress\b|\battachLongPress\b|\bLONG_PRESS/.test(code);
}

/** True when the code handles a two-finger touch gesture through GestureRecognizer. */
export function recognizesTwoFingers(code)
{
    return /\bonTwoFinger(Start|Move)\b/.test(code);
}

/**
 * True when the code drives the shared GestureRecognizer, by calling it or
 * by reading its factory from `window`, as DiagramEngine does.
 */
export function usesGestureRecognizer(code)
{
    return /\bcreateGestureRecognizer\s*\(|\bwindow\.createGestureRecognizer\b/.test(code);
}

/**
 * True when the code is the source side of HTML drag and drop. A drop
 * target alone, such as a file drop zone, is counted apart, because a file
 * from the desktop has no Pointer Events replacement.
 */
export function startsHtmlDrag(code)
{
    return listensFor(code, "dragstart") || /\bdraggable\s*=\s*true\b/.test(code)
        || /["']draggable["']\s*,\s*["']true["']/.test(code);
}

/** True when the SCSS or the code sets `touch-action`. */
export function declaresTouchAction(code, scss)
{
    return /\btouch-action\s*:/.test(scss) || /\btouchAction\b|["']touch-action["']/.test(code);
}

/** True when the SCSS holds a `(pointer: coarse)` or `(any-pointer: coarse)` query. */
export function hasCoarsePointerStyle(scss)
{
    return /\((any-)?pointer\s*:\s*coarse\)/.test(scss);
}

/**
 * Counts the `:hover` selectors that are not inside an `@media (hover:
 * hover)` block. It walks the blocks with a stack of their preludes, so a
 * nested `&:hover` inside the media block counts as inside it. Section 9
 * item 10 accepts `(any-hover: hover)` as well.
 */
export function hoverOutsideHoverMedia(scss)
{
    const text = stripScssComments(scss);
    const stack = [];
    let prelude = "";
    let count = 0;

    for (const c of text)
    {
        if (c === "{")
        {
            const insideHoverMedia = stack.some((p) => /@media[^{]*\((any-)?hover\s*:\s*hover\)/.test(p));
            if (!insideHoverMedia && prelude.includes(":hover")) { count += 1; }
            stack.push(prelude);
            prelude = "";
        }
        else if (c === "}")
        {
            stack.pop();
            prelude = "";
        }
        else if (c === ";")
        {
            prelude = "";
        }
        else
        {
            prelude += c;
        }
    }
    return count;
}

/** The tracked files of one component directory, split by kind. */
function filesOf(dir, tracked)
{
    const mine = tracked.filter((f) => f.startsWith(`components/${dir}/`));
    const ts = mine.filter((f) => f.endsWith(".ts"))
        .filter((f) => !/\.(test|spec|mock|manifest|conformance)\.ts$/.test(f))
        .filter((f) => !f.endsWith(".d.ts"))
        .filter((f) => !f.startsWith("components/querylanguage/generated/"));
    const scss = mine.filter((f) => f.endsWith(".scss"));
    return { ts, scss };
}

/** Reads one directory into its comment-free code and its SCSS. */
function readComponent(dir, tracked)
{
    const { ts, scss } = filesOf(dir, tracked);
    return {
        code: ts.map((f) => codeLines(readFileSync(f, "utf8"))).join("\n"),
        scss: scss.map((f) => readFileSync(f, "utf8")).join("\n"),
    };
}

/**
 * True when the code runs a drag: it follows a pointer's movement and also
 * waits for the pointer to lift or captures it, or it drives the shared
 * GestureRecognizer. Movement alone is not a drag. FacetSearch, Ruler and
 * Magnifier follow a mouse that is up, to show a hover state, and section 9
 * items 5 and 7 are about a pointer that is down.
 */
export function runsDrag(code)
{
    const moves = ["pointermove", "mousemove", "touchmove"].some((e) => listensFor(code, e));
    const ends = ["pointerup", "mouseup", "touchend"].some((e) => listensFor(code, e))
        || /\bsetPointerCapture\b/.test(code);
    return (moves && ends) || usesGestureRecognizer(code);
}

/** Classifies one component for every count. Exported for the test. */
export function classifyComponent(code, scss)
{
    const pointerdown = listensFor(code, "pointerdown");
    const mousedown = listensFor(code, "mousedown");
    const contextmenu = listensFor(code, "contextmenu");
    const drag = runsDrag(code);
    const handlesCancel = listensFor(code, "pointercancel") || usesGestureRecognizer(code);
    const longPress = recognizesLongPress(code);
    const hovers = hoverOutsideHoverMedia(scss);

    return {
        pointerdown,
        pointerdownNoCancel: pointerdown && !handlesCancel,
        mousedownOnly: mousedown && !pointerdown,
        contextmenu,
        contextmenuOnly: contextmenu && !longPress,
        longPress,
        gestureRecognizer: usesGestureRecognizer(code),
        twoFingers: recognizesTwoFingers(code),
        htmlDrag: startsHtmlDrag(code),
        fileDropOnly: !startsHtmlDrag(code) && listensFor(code, "drop"),
        hasHover: /:hover\b/.test(stripScssComments(scss)),
        hoverOutsideMedia: hovers > 0,
        hoverOutsideMediaRules: hovers,
        coarsePointer: hasCoarsePointerStyle(scss),
        drag,
        dragNoCancel: drag && !handlesCancel,
        dragNoTouchAction: drag && !declaresTouchAction(code, scss),
        keyBindings: /\bkeyBindings\b/.test(code),
    };
}

/**
 * The counts, in the order of TOUCH_EXPERIENCE.md section 1, then the ones
 * #202 added. `pointerdownNoCancel` keeps section 1's definition so the two
 * dates compare. It also holds a component that uses `pointerdown` for a
 * press, such as a close on a press outside, where a cancel changes
 * nothing. `dragNoCancel` is the count that section 9 item 5 is about.
 */
export const COUNTS = [
    ["pointerdown", "Listen for `pointerdown`"],
    ["pointerdownNoCancel", "Listen for `pointerdown` and do not handle `pointercancel`"],
    ["mousedownOnly", "Listen for `mousedown` and not for `pointerdown`"],
    ["contextmenu", "Listen for `contextmenu`"],
    ["contextmenuOnly", "Listen for `contextmenu` and recognize no long press"],
    ["longPress", "Recognize a long press"],
    ["gestureRecognizer", "Use the shared GestureRecognizer"],
    ["twoFingers", "Recognize a pinch or a two-finger drag"],
    ["htmlDrag", "Use the HTML drag-and-drop interface as a drag source"],
    ["fileDropOnly", "Accept an HTML drop and start no HTML drag"],
    ["hasHover", "Contain a `:hover` style"],
    ["hoverOutsideMedia", "Have a `:hover` style outside `@media (hover: hover)`"],
    ["coarsePointer", "Contain a `(pointer: coarse)` style"],
    ["drag", "Run a drag"],
    ["dragNoCancel", "Run a drag and do not handle `pointercancel`"],
    ["dragNoTouchAction", "Run a drag and declare no `touch-action`"],
    ["keyBindings", "Accept `keyBindings`"],
];

/** Measures every component directory. Returns each count's component names. */
export function measureTouch()
{
    const tracked = execFileSync("git", ["ls-files", "components"], { encoding: "utf8" })
        .split("\n").filter(Boolean);
    const dirs = [...new Set(tracked.map((f) => f.split("/")[1]).filter((d) => !d.includes(".")))].sort();

    const result = { directories: dirs.length, hoverRules: 0 };
    for (const [key] of COUNTS) { result[key] = []; }

    for (const dir of dirs)
    {
        const { code, scss } = readComponent(dir, tracked);
        const c = classifyComponent(code, scss);
        for (const [key] of COUNTS)
        {
            if (c[key]) { result[key].push(dir); }
        }
        result.hoverRules += c.hoverOutsideMediaRules;
    }
    return result;
}

if (import.meta.url === `file://${process.argv[1]}`)
{
    const r = measureTouch();
    console.log(`component directories: ${r.directories}`);
    console.log(`:hover rules outside @media (hover: hover): ${r.hoverRules}`);
    for (const [key, label] of COUNTS)
    {
        console.log(`\n${label}: ${r[key].length}`);
        console.log(`  ${r[key].join(", ")}`);
    }
}
