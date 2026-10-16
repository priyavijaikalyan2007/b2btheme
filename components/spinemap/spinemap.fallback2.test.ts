/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: SpineMap's remaining fallbacks refuse instead of substituting
 * 📜 PURPOSE: Proves FALLBACK-4, the three shapes FALLBACK-1 left behind.
 * A corrupt stored value no longer presents as an empty field, a missing
 * danger dialog no longer silently becomes a native confirm(), and a
 * widget whose destroy() throws no longer vanishes into `catch { }`.
 * 🔗 RELATED: AGENTS.md "No Fallback Code", ADR-185
 */

import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { createSpineMap } from "./spinemap";
import type { SpineMapData } from "./spinemap";

interface Internals
{
    showPopover(nodeId: string, editMode: boolean): void;
    hidePopover(): void;
    confirmRemove(message: string): Promise<boolean>;
}

type Globals = Record<string, unknown>;

function dataWith(notes: string): SpineMapData
{
    return {
        hubs: [{
            id: "solo", label: "Solo Hub", status: "available",
            branches: [], metadata: { notes }
        }],
        connections: []
    };
}

describe("SpineMap, the fallbacks FALLBACK-1 left behind", () =>
{
    let container: HTMLElement;
    const planted: string[] = [];

    beforeEach(() =>
    {
        container = document.createElement("div");
        document.body.appendChild(container);
    });

    afterEach(() =>
    {
        container.remove();
        document.body.querySelectorAll(".spinemap-popover")
            .forEach(el => el.remove());
        for (const n of planted.splice(0))
        {
            delete (window as Globals)[n];
        }
    });

    // ── defaultDeserialize ──────────────────────────────────────────────

    test("corruptStoredJson_ThrowsInsteadOfPresentingTheFieldAsEmpty", () =>
    {
        // `tagger` is a structured type, so its stored value is parsed as
        // JSON. The old catch returned the raw string, isRawFallback then
        // declined to hand it to the widget, and the user saw an empty
        // field. Saving the popover wrote that emptiness over their data.
        const map = createSpineMap({
            container, data: dataWith("{not valid json"), editable: true,
            popoverFields: [{
                key: "notes", label: "Notes", type: "tagger",
                source: "metadata"
            }]
        });

        expect(() => (map as unknown as Internals).showPopover("solo", true))
            .toThrow(/notes|JSON|parse/i);
    });

    test("validStoredJson_StillOpens_SoTheGuardIsNotTooBroad", () =>
    {
        (window as Globals)["createTagger"] = () => ({
            getTags: () => ["a"], destroy: () => { /* no-op */ }
        });
        planted.push("createTagger");

        const map = createSpineMap({
            container, data: dataWith('["a","b"]'), editable: true,
            popoverFields: [{
                key: "notes", label: "Notes", type: "tagger",
                source: "metadata"
            }]
        });

        expect(() => (map as unknown as Internals).showPopover("solo", true))
            .not.toThrow();
    });

    // ── confirmRemove ───────────────────────────────────────────────────

    test("noDangerDialog_RefusesRatherThanQuietlyUsingNativeConfirm", () =>
    {
        const map = createSpineMap({
            container, data: dataWith(""), editable: true
        });

        expect(typeof (window as Globals)["showDangerConfirmDialog"])
            .not.toBe("function");
        expect(() => (map as unknown as Internals).confirmRemove("Delete?"))
            .toThrow(/showDangerConfirmDialog/);
    });

    test("aConfiguredCallbackStillWins_SoTheHostKeepsControl", async () =>
    {
        const map = createSpineMap({
            container, data: dataWith(""), editable: true,
            onConfirmRemove: () => Promise.resolve(true)
        });

        await expect((map as unknown as Internals).confirmRemove("Delete?"))
            .resolves.toBe(true);
    });

    // ── raw value reaching a structured widget ──────────────────────────

    test("aDeserializerReturningARawString_IsRefusedNotDroppedSilently", () =>
    {
        (window as Globals)["createPeriodPicker"] = () => ({
            getValue: () => null, destroy: () => { /* no-op */ }
        });
        planted.push("createPeriodPicker");

        const map = createSpineMap({
            container, data: dataWith("Q1"), editable: true,
            popoverFields: [{
                key: "notes", label: "Notes", type: "periodpicker",
                source: "metadata",
                // Returns the wrong shape for a structured field. This used
                // to be dropped, so the field opened empty and saving wrote
                // the emptiness over the stored value.
                deserialize: (raw: string) => raw
            }]
        });

        expect(() => (map as unknown as Internals).showPopover("solo", true))
            .toThrow(/raw string/i);
    });

    test("anEmptyStoredValue_IsNotTreatedAsAFailure", () =>
    {
        (window as Globals)["createPeriodPicker"] = () => ({
            getValue: () => null, destroy: () => { /* no-op */ }
        });
        planted.push("createPeriodPicker");

        // An empty structured field is a field the user cleared, not a
        // deserializer that went wrong. It must still open.
        const map = createSpineMap({
            container, data: dataWith(""), editable: true,
            popoverFields: [{
                key: "notes", label: "Notes", type: "periodpicker",
                source: "metadata"
            }]
        });

        expect(() => (map as unknown as Internals).showPopover("solo", true))
            .not.toThrow();
    });

    // ── adapter teardown ────────────────────────────────────────────────

    test("aThrowingDestroy_SurfacesAfterEveryAdapterIsTornDown", () =>
    {
        const destroyed: string[] = [];
        (window as Globals)["createTagger"] = () => ({
            getTags: () => [],
            destroy: () =>
            {
                destroyed.push("tagger");
                throw new Error("widget destroy blew up");
            }
        });
        planted.push("createTagger");

        const map = createSpineMap({
            container, data: dataWith("[]"), editable: true,
            popoverFields: [{
                key: "notes", label: "Notes", type: "tagger",
                source: "metadata"
            }]
        });
        const internals = map as unknown as Internals;
        internals.showPopover("solo", true);

        // The nine `catch { /* safe */ }` made a broken destroy invisible.
        expect(() => internals.hidePopover()).toThrow(/destroy/i);

        // Teardown still completed: the label adapter and the tagger both
        // ran, so refusing does not leak the rest of the popover.
        expect(destroyed).toContain("tagger");
        expect(document.body.querySelectorAll(".spinemap-edit-widget").length)
            .toBe(0);
    });

    test("aCleanTeardown_DoesNotThrow", () =>
    {
        (window as Globals)["createTagger"] = () => ({
            getTags: () => [], destroy: () => { /* no-op */ }
        });
        planted.push("createTagger");

        const map = createSpineMap({
            container, data: dataWith("[]"), editable: true,
            popoverFields: [{
                key: "notes", label: "Notes", type: "tagger",
                source: "metadata"
            }]
        });
        const internals = map as unknown as Internals;
        internals.showPopover("solo", true);

        expect(() => internals.hidePopover()).not.toThrow();
    });
});
