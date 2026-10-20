/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: the documentation generator's public-surface extractors
 *
 * DEBT-DOC-1 (ADR-166). The generator built each component's published
 * "Exports" line by running `/(?:class|function)\s+\w+/` over its README
 * PROSE, so any sentence containing either word became an API name. Of the
 * 54 names it published across 32 components, exactly one was real.
 *
 * There were no tests for this file at all, which is why a defect that
 * published `class on` 17 times to the CDN survived for months. These cover
 * the two extractors that replaced the prose regex, and the factory column
 * that was fed from the same prose.
 */

import { describe, test, expect } from "vitest";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { extractGlobals, extractExports, extractFactory } =
    require("./generate-docs.js");

describe("extractGlobals — the names a CDN consumer can call", () =>
{
    test("castWithDotAccess_IsFound", () =>
    {
        const src = "(window as unknown as Record<string, unknown>)"
            + ".createSpineMap = createSpineMap;";

        expect(extractGlobals(src)).toEqual(["createSpineMap"]);
    });

    test("castWithBracketAccess_IsFound", () =>
    {
        const src = '(window as unknown as Record<string, unknown>)'
            + '["createMarkdownEditor"] = createMarkdownEditor;';

        expect(extractGlobals(src)).toEqual(["createMarkdownEditor"]);
    });

    test("bareWindowAssignment_IsFound", () =>
    {
        expect(extractGlobals("window.mcpBridge = {};")).toEqual(["mcpBridge"]);
    });

    test("reading one property off window is not an alias of window", () =>
    {
        // The LOG-6 gate puts `const f = window.__ebt_debug_logging;` in
        // every component. `f` is a boolean, so a later `f.action = x` on an
        // unrelated local must not publish `action` as CDN API.
        const src = "const f = window.__ebt_debug_logging;\n"
            + "const filters = {};\nfilters.action = 1;\nf.action = 2;\n"
            + "window.createThing = createThing;";
        expect(extractGlobals(src)).toEqual(["createThing"]);
        expect(extractGlobals("globalThis.createThing = fn;"))
            .toEqual(["createThing"]);
    });

    // Regression, WIN-1 phase B (ADR-173). Dropping the cast from
    // `(window as any)["Toolbar"] = Toolbar` leaves a line the cast rule
    // cannot match, because that rule requires the parentheses, and the bare
    // rule read dot access only. Measured before the conversion ran: this
    // form returned nothing, so 38 published names across 14 components
    // would have vanished from the reference without a check failing.
    test("bareBracketAssignment_IsFound", () =>
    {
        expect(extractGlobals('window["Toolbar"] = Toolbar;')).toEqual(["Toolbar"]);
        expect(extractGlobals('    window["createDockedToolbar"] = createDockedToolbar;'))
            .toEqual(["createDockedToolbar"]);
        expect(extractGlobals("globalThis['createThing'] = fn;")).toEqual(["createThing"]);
    });

    test("bareBracketComparison_IsNotARegistration", () =>
    {
        const src = 'if (typeof window["createHoverCard"] === "function") { return; }';

        expect(extractGlobals(src)).toEqual([]);
    });

    test("internalDoubleUnderscoreSlot_IsNotPublished", () =>
    {
        // SidebarManager writes its singleton to window for debugging. The
        // quick reference listed `__sidebarManager()` as callable API until
        // WIN-1 phase B. It is still declared in globals.d.ts, because it is
        // genuinely there at run time. It is not part of the public surface.
        const src = "window.__sidebarManager = SidebarManager.instance;\n"
            + "window.createSidebar = createSidebar;";

        expect(extractGlobals(src)).toEqual(["createSidebar"]);
    });

    test("castHeldInALocal_IsFound", () =>
    {
        // How the eight layout components register. A first version of the
        // extractor missed this and reported them as having no public
        // surface at all.
        const src = "const w = window as unknown as Record<string, unknown>;\n"
            + '    w["AnchorLayout"] = AnchorLayout;\n'
            + '    w["createAnchorLayout"] = createAnchorLayout;';

        expect(extractGlobals(src))
            .toEqual(["AnchorLayout", "createAnchorLayout"]);
    });

    test("comparison_IsNotARegistration", () =>
    {
        // This line is in every component's logging preamble. Treating it as
        // a registration would publish createLogUtility 111 times.
        const src = 'const lu = (typeof (window as any).createLogUtility'
            + ' === "function") ? 1 : 0;';

        expect(extractGlobals(src)).toEqual([]);
    });

    test("readingAWindowApi_IsNotARegistration", () =>
    {
        const src = "return window.matchMedia(\"(min-width: 40em)\").matches;\n"
            + "window.setTimeout(() => this.close(), 200);";

        expect(extractGlobals(src)).toEqual([]);
    });

    test("duplicates_AreCollapsedAndTheListIsSorted", () =>
    {
        const src = "(window as any).createB = createB;\n"
            + "(window as any).createA = createA;\n"
            + "(window as any).createB = createB;";

        expect(extractGlobals(src)).toEqual(["createA", "createB"]);
    });

    test("readmeProse_YieldsNothing", () =>
    {
        // The sentence that started DEBT-DOC-1, and the one that published
        // an export called "class of" during the SEC-3 close-out.
        const prose = "| `cssClass` | `string` | — | Additional CSS class on"
            + " root |\nIt removes the whole class of script injection, and"
            + " the function that does it is small.";

        expect(extractGlobals(prose)).toEqual([]);
        expect(extractExports(prose)).toEqual([]);
    });
});

describe("extractExports — the names a TypeScript consumer can import", () =>
{
    test("everyDeclarationKind_IsFound", () =>
    {
        const src = [
            "export type NodeStatus = \"a\" | \"b\";",
            "export interface Options { x: number }",
            "export const LIMIT = 4;",
            "export enum Mode { One }",
            "export class SpineMap {}",
            "export function createSpineMap() {}",
        ].join("\n");

        expect(extractExports(src)).toEqual([
            "type NodeStatus",
            "interface Options",
            "const LIMIT",
            "enum Mode",
            "class SpineMap",
            "function createSpineMap",
        ]);
    });

    test("modifiers_AreAccepted", () =>
    {
        const src = "export async function load() {}\n"
            + "export abstract class Base {}\n"
            + "export declare const VERSION: string;";

        expect(extractExports(src)).toEqual([
            "function load", "class Base", "const VERSION"
        ]);
    });

    test("anythingNotAtTheStartOfALine_IsIgnored", () =>
    {
        // The old regex used `\s+`, which matches a newline, so "class" at
        // the end of one line joined the first word of the next.
        const src = "// export function notReal() {}\n"
            + "    export function indented() {}\n"
            + "const s = \"export class Quoted {}\";\n"
            + "a CSS class\ncategory label";

        expect(extractExports(src)).toEqual([]);
    });

    test("exportDefault_IsNotAName", () =>
    {
        expect(extractExports("export default thing;")).toEqual([]);
    });

    test("aFileWithNoExportKeyword_ReportsNone", () =>
    {
        // DiagramEngine's shape (STD-1). An empty list is informative, so the
        // generator prints "none" rather than omitting the line.
        expect(extractExports("class Hidden {}\nfunction alsoHidden() {}"))
            .toEqual([]);
    });
});

describe("extractFactory — the component index's factory column", () =>
{
    test("onlyCreateAndShowGlobals_AreFactories", () =>
    {
        const src = '(window as any).createThing = createThing;\n'
            + '(window as any).showThingModal = showThingModal;\n'
            + '(window as any).Thing = Thing;';

        expect(extractFactory(src))
            .toBe("`createThing()`, `showThingModal()`");
    });

    test("noGlobals_ReportsADash", () =>
    {
        expect(extractFactory("export function helper() {}")).toBe("—");
    });

    test("anOptionNamedShowSomething_IsNotAFactory", () =>
    {
        // 26 of the 179 names the prose version published were not
        // functions. Most were boolean options: showError, showColumn,
        // showLoading.
        const prose = "| `showError` | `boolean` | Show the error row |\n"
            + "Call showLoading() when the list is empty.";

        expect(extractFactory(prose)).toBe("—");
    });
});
