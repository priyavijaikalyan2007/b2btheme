/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: The vendored CodeMirror 6 bundle works, not merely loads. ADR-211.
 *
 * WHY THIS EXISTS
 * ---------------
 * DEBT-SEC-9 replaced fourteen `import("https://esm.sh/...")` calls with one
 * hashed file served from this origin. The demo-page smoke gate (ADR-205)
 * asserts a page loads with no console error, which a page with a silently
 * broken editor also does. The risk of this change is not a load failure.
 * It is a bundle that publishes the wrong names, or publishes functions that
 * throw when composed.
 *
 * So these assert the two things the swap could have broken:
 *
 *   1. The THIRTY global names CodeEditor probes for are present and are
 *      functions. A namespace bundle would have published none of them.
 *   2. The editor built from them actually edits — type, read it back, undo,
 *      read it back. `undo` needs `cmHistory` to have been composed in, so
 *      this is also the check that the two deliberate renames survived.
 *
 * THE RENAMES ARE THE SUBTLE PART. `history` and `search` are republished as
 * `cmHistory` and `cmSearch`. `window.history` is the browser's own and is a
 * read-only accessor on Window, so assigning CodeMirror's `history` over it
 * SILENTLY FAILS. The README told consumers to do exactly that for months,
 * which is why anyone following it lost undo. `undoRestoresTypedText` is the
 * regression test for that defect.
 */

import { test, expect } from "@playwright/test";

const PROBED_GLOBALS = [
    "EditorView", "EditorState", "keymap", "lineNumbers", "drawSelection",
    "dropCursor", "highlightActiveLine", "highlightSelectionMatches",
    "cmHistory", "historyKeymap", "defaultKeymap", "undo", "redo",
    "indentSelection", "syntaxHighlighting", "indentOnInput",
    "bracketMatching", "cmSearch", "searchKeymap", "closeBrackets",
    "closeBracketsKeymap", "setDiagnostics", "javascript", "json", "html",
    "css", "sql", "python", "markdown",
];

test.describe("vendored CodeMirror 6", () =>
{
    test("publishesEveryGlobalCodeEditorProbesFor", async ({ page }) =>
    {
        await page.goto("/demo/components/codeeditor.html");
        const missing = await page.evaluate((names) =>
            names.filter((n) => typeof (window as never as Record<string, unknown>)[n] !== "function"
                && typeof (window as never as Record<string, unknown>)[n] !== "object"),
        PROBED_GLOBALS);
        expect(missing).toEqual([]);
    });

    // Scoped to the CODE HOSTS this change was about. The page still
    // reaches fonts.googleapis.com and fonts.gstatic.com for webfonts,
    // which is a separate population and a separate decision. Asserting
    // "no foreign request at all" would fail on that and say nothing
    // about CodeMirror.
    test("loadsNoCodeFromAThirdPartyCdn", async ({ page }) =>
    {
        const CODE_HOSTS = ["esm.sh", "unpkg.com", "cdn.jsdelivr.net", "cdnjs.cloudflare.com"];
        const foreign: string[] = [];
        page.on("request", (r) =>
        {
            const host = new URL(r.url()).hostname;
            if (CODE_HOSTS.some((h) => host === h || host.endsWith(`.${h}`)))
            {
                foreign.push(r.url());
            }
        });
        await page.goto("/demo/components/codeeditor.html");
        await page.locator(".cm-editor").first().waitFor();
        expect(foreign).toEqual([]);
    });

    test("undoRestoresTypedText", async ({ page }) =>
    {
        await page.goto("/demo/components/codeeditor.html");
        const editor = page.locator(".cm-content").first();
        await editor.waitFor();

        const before = await editor.textContent();
        await editor.click();
        await page.keyboard.type("ZZTOP");
        const typed = await editor.textContent();
        expect(typed).not.toBe(before);
        expect(typed).toContain("ZZTOP");

        // ControlOrMeta, because CodeMirror binds Mod-z and Mod is Cmd on
        // macOS. A plain Control+z passes on Linux CI and fails here, which
        // is the worst shape a test can have.
        await page.keyboard.press("ControlOrMeta+z");
        await expect.poll(() => editor.textContent()).toBe(before);
    });
});
