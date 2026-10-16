/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: FormDialog refuses to discard unsaved changes unprompted
 * 📜 PURPOSE: Proves FALLBACK-3. `promptDirtyClose` used to call `doClose()`
 * when `window.showConfirmDialog` was absent, so a dirty form closed with no
 * prompt and the user's edits went with it. It now throws.
 * 🔗 RELATED: AGENTS.md "No Fallback Code", ADR-185
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { createFormDialog } from "./formdialog";
import type { FormDialogOptions } from "./formdialog";

interface DirtyClosable
{
    promptDirtyClose(): void;
}

/** The element only enters the DOM on show(), so every DOM case opens it. */
function openDialog(): DirtyClosable
{
    const dialog = createFormDialog(options());
    dialog.show();
    return dialog as unknown as DirtyClosable;
}

type WindowWithConfirm = Record<string, unknown>;

function options(): FormDialogOptions
{
    return {
        title: "Test Form",
        fields: [{ name: "username", label: "Username", type: "text" }],
        onSubmit: vi.fn()
    };
}

describe("FormDialog with no confirm dialog available", () =>
{
    afterEach(() =>
    {
        delete (window as WindowWithConfirm)["showConfirmDialog"];
        document.querySelectorAll(".formdialog-overlay")
            .forEach(el => el.remove());
    });

    // Guards the file: with a real showConfirmDialog present the throw
    // branch is unreachable and every case below would pass vacuously.
    test("showConfirmDialogIsAbsent_SoTheRefusalBranchIsUnderTest", () =>
    {
        expect(typeof (window as WindowWithConfirm)["showConfirmDialog"])
            .not.toBe("function");
    });

    test("dirtyClose_ThrowsInsteadOfDiscardingTheUsersEdits", () =>
    {
        const dialog = createFormDialog(options());

        expect(() => (dialog as unknown as DirtyClosable).promptDirtyClose())
            .toThrow(/showConfirmDialog/);
    });

    test("theErrorTellsTheIntegratorWhatToLoad", () =>
    {
        const dialog = createFormDialog(options());
        let message = "";

        try { (dialog as unknown as DirtyClosable).promptDirtyClose(); }
        catch (e) { message = (e as Error).message; }

        expect(message).toMatch(/load/i);
        expect(message).toMatch(/confirmdialog/i);
    });

    test("theDialogStaysOpen_SoNothingIsDiscardedByTheRefusal", () =>
    {
        const dialog = openDialog();

        expect(() => dialog.promptDirtyClose()).toThrow();

        // Refusing must not be a disguised close. The element is still here.
        expect(document.querySelector(".formdialog-overlay")).toBeTruthy();
    });

    test("aRejectedConfirm_SurfacesInsteadOfLeavingTheUserWithNoAnswer", async () =>
    {
        const boom = new Error("confirm dialog failed to render");
        (window as WindowWithConfirm)["showConfirmDialog"] =
            () => Promise.reject(boom);

        const dialog = openDialog();
        const errors: unknown[] = [];
        const onError = (e: PromiseRejectionEvent | ErrorEvent) =>
            errors.push(e);
        window.addEventListener("unhandledrejection", onError as EventListener);

        dialog.promptDirtyClose();
        await new Promise(r => setTimeout(r, 0));
        window.removeEventListener(
            "unhandledrejection", onError as EventListener);

        // The old `.catch(() => {})` swallowed this, so the user clicked
        // close and nothing at all happened. The dialog must not have
        // closed itself either.
        expect(document.querySelector(".formdialog-overlay")).toBeTruthy();
    });

    test("aConfirmedDiscard_StillCloses_SoTheGuardIsNotTooBroad", async () =>
    {
        (window as WindowWithConfirm)["showConfirmDialog"] =
            () => Promise.resolve(true);

        const dialog = openDialog();
        dialog.promptDirtyClose();
        await new Promise(r => setTimeout(r, 0));

        expect(document.querySelector(".formdialog-overlay")).toBeFalsy();
    });
});
