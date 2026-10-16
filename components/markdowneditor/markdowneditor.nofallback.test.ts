/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: MarkdownEditor refuses to render without Vditor
 * 📜 PURPOSE: Proves FALLBACK-5. With Vditor absent, display mode injected
 * the RAW MARKDOWN as HTML and then called fireDisplayReady(), so a
 * degraded component reported success. AGENTS.md forbids exactly that.
 * 🔗 RELATED: AGENTS.md "No Fallback Code", ADR-148 clause 1, ADR-185
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { MarkdownEditor } from "./markdowneditor";

type Globals = Record<string, unknown>;

const MARKDOWN = "# Heading\n\nSome **bold** text.";

describe("MarkdownEditor display mode with no Vditor", () =>
{
    let container: HTMLElement;

    beforeEach(() =>
    {
        container = document.createElement("div");
        document.body.appendChild(container);
    });

    afterEach(() =>
    {
        container.remove();
        delete (window as Globals)["Vditor"];
    });

    // Guards the file. With Vditor present the refusal branch is
    // unreachable and every case below would pass for the wrong reason.
    test("vditorIsAbsent_SoTheRefusalBranchIsUnderTest", () =>
    {
        expect((window as Globals)["Vditor"]).toBeUndefined();
    });

    test("displayMode_ThrowsInsteadOfInjectingRawMarkdownAsHtml", () =>
    {
        expect(() => new MarkdownEditor(container, {
            mode: "display", value: MARKDOWN
        })).toThrow(/Vditor/);
    });

    test("theErrorTellsTheIntegratorWhatToLoad", () =>
    {
        let message = "";

        try { new MarkdownEditor(container, { mode: "display", value: MARKDOWN }); }
        catch (e) { message = (e as Error).message; }

        expect(message).toMatch(/load/i);
        expect(message).toMatch(/markdowneditor|vditor/i);
    });

    test("onReadyNeverFires_BecauseADegradedComponentMayNotReportSuccess", () =>
    {
        const onReady = vi.fn();

        try
        {
            new MarkdownEditor(container, {
                mode: "display", value: MARKDOWN, onReady
            });
        }
        catch { /* the throw is the point, asserted above */ }

        // This is the ADR-148 clause the old branch broke: it called
        // fireDisplayReady() after rendering markdown as literal HTML.
        expect(onReady).not.toHaveBeenCalled();
    });

    test("theRawMarkdownIsNotLeftInTheDom", () =>
    {
        try
        {
            new MarkdownEditor(container, { mode: "display", value: MARKDOWN });
        }
        catch { /* expected */ }

        expect(container.textContent || "").not.toContain("**bold**");
    });
});
