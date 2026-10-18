/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: CodeEditor never shows a copy tick it has not earned
 * 📜 PURPOSE: Proves FALLBACK-6. The removed execCommand path called
 * showCopyFeedback() unconditionally and never read the boolean
 * execCommand returns, so the tick appeared whether or not anything
 * reached the clipboard.
 * 🔗 RELATED: AGENTS.md "No Fallback Code", ADR-148 clause 1, ADR-185
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { createCodeEditor } from "./codeeditor";
import { installCodeMirrorMock, removeCodeMirrorMock } from "./codeeditor.cm.mock";

interface Copyable { copyToClipboard(): void }

describe("CodeEditor copy with no Clipboard API", () =>
{
    let container: HTMLElement;
    let original: unknown;

    beforeEach(() =>
    {
        container = document.createElement("div");
        container.id = "codeeditor-nofallback";
        document.body.appendChild(container);
        original = Object.getOwnPropertyDescriptor(navigator, "clipboard");

        // ADR-201. These cases want a WORKING editor and a broken
        // clipboard. Without the mock the editor never mounts, and
        // since getValue() began refusing that rather than answering
        // "", copyToClipboard() stopped reaching the clipboard check
        // at all and the tests passed on the wrong refusal.
        installCodeMirrorMock();
    });

    afterEach(() =>
    {
        container.remove();
        removeCodeMirrorMock();
        if (original)
        {
            Object.defineProperty(
                navigator, "clipboard",
                original as PropertyDescriptor);
        }
    });

    function withClipboard(value: unknown): void
    {
        Object.defineProperty(navigator, "clipboard", {
            value, configurable: true, writable: true
        });
    }

    test("noClipboardApi_RefusesInsteadOfShowingAnUnearnedTick", () =>
    {
        withClipboard(undefined);

        const editor = createCodeEditor("codeeditor-nofallback",
            { value: "const a = 1;" });

        expect(() => (editor as unknown as Copyable).copyToClipboard())
            .toThrow(/clipboard/i);
    });

    test("theErrorNamesTheSecureContextRequirement", () =>
    {
        withClipboard(undefined);

        const editor = createCodeEditor("codeeditor-nofallback",
            { value: "const a = 1;" });
        let message = "";

        try { (editor as unknown as Copyable).copyToClipboard(); }
        catch (e) { message = (e as Error).message; }

        expect(message).toMatch(/https|secure context/i);
    });

    test("noTickIsShown_WhenTheCopyWasRefused", () =>
    {
        withClipboard(undefined);

        const editor = createCodeEditor("codeeditor-nofallback",
            { value: "const a = 1;" });

        try { (editor as unknown as Copyable).copyToClipboard(); }
        catch { /* expected */ }

        // The old path left a bi-check here with nothing in the clipboard.
        expect(container.querySelector(".bi-check")).toBeNull();
    });

    test("aWorkingClipboard_StillCopies_SoTheGuardIsNotTooBroad", async () =>
    {
        const writeText = vi.fn().mockResolvedValue(undefined);
        withClipboard({ writeText });

        const editor = createCodeEditor("codeeditor-nofallback",
            { value: "const a = 1;" });
        (editor as unknown as Copyable).copyToClipboard();
        await Promise.resolve();

        // What this proves is that the guard lets a real clipboard
        // through. The exact text depends on the CodeMirror backend,
        // which jsdom does not start, so the call itself is the assertion.
        expect(writeText).toHaveBeenCalled();
    });
});
