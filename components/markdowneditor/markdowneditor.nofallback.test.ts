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

/**
 * FALLBACK-15. Display mode has refused since FALLBACK-5, and the EDIT modes
 * next to it went on substituting a plain textarea for the editor. The sweeps
 * that found the display branch matched its shape, not this file.
 *
 * The substitution was not inert. It carried the caller's markdown, accepted
 * typing, and read back through `getValue()`, so an editor with no toolbar,
 * no preview, no shortcuts and no markdown awareness looked like a deliberate
 * minimal mode. The only signal was a console line the user never sees.
 */
describe("MarkdownEditor edit mode with no Vditor", () =>
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

    // Guards the block. With Vditor present every case below passes for the
    // wrong reason, which is how the GraphToolbar defect read as nine
    // passing assertions.
    test("vditorIsAbsent_SoTheSubstitutionBranchIsUnderTest", () =>
    {
        expect((window as Globals)["Vditor"]).toBeUndefined();
    });

    test("noTextareaStandsInForTheEditor", () =>
    {
        const editor = new MarkdownEditor(container, { value: MARKDOWN });

        expect(container.querySelector("textarea")).toBeNull();

        editor.destroy();
    });

    test("theHostSaysOutLoudThatVditorIsMissing", () =>
    {
        const editor = new MarkdownEditor(container, { value: MARKDOWN });
        const notice = container.querySelector(".markdowneditor-error");

        expect(notice).not.toBeNull();
        expect(notice?.textContent ?? "").toMatch(/vditor/i);
        expect(notice?.textContent ?? "").toMatch(/load/i);

        editor.destroy();
    });

    test("getValueRefusesInsteadOfReadingTheStandIn", () =>
    {
        const editor = new MarkdownEditor(container, { value: MARKDOWN });

        // The old branch returned the textarea's value, and before the
        // textarea existed it returned "". A caller cannot tell either from
        // an empty document.
        expect(() => editor.getValue()).toThrow(/Vditor/);

        editor.destroy();
    });

    test("setValueRefusesInsteadOfWritingToTheStandIn", () =>
    {
        const editor = new MarkdownEditor(container, { value: MARKDOWN });

        // The old branch returned normally, so a caller who set content and
        // never read it back believed the write had landed in an editor.
        expect(() => editor.setValue("## New")).toThrow(/Vditor/);

        editor.destroy();
    });

    test("theRefusalNamesWhatToLoad", () =>
    {
        const editor = new MarkdownEditor(container, { value: MARKDOWN });
        let message = "";

        try { editor.getValue(); }
        catch (e) { message = (e as Error).message; }

        expect(message).toMatch(/load/i);
        expect(message).toMatch(/vditor/i);

        editor.destroy();
    });
});
