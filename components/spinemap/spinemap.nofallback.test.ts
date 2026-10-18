/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: SpineMap field adapters refuse to stand in for a missing picker
 * 📜 PURPOSE: Proves FALLBACK-1. Nine adapters used to answer a missing
 * library factory with a bare text input whose getValue() a host could not
 * tell apart from a real selection. They now throw a literate error.
 * 🔗 RELATED: AGENTS.md "No Fabricated Reads", LITERATE_ERRORS.md, ADR-184
 */

import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { createSpineMap } from "./spinemap";
import type { SpineMapData, SpinePopoverFieldType } from "./spinemap";

// The edit popover is built by a private method. A structural cast reaches it
// without an event, because jsdom reports a listener throw as an uncaught
// error instead of propagating it to the dispatch caller.
interface EditablePopover
{
    showPopover(nodeId: string, editMode: boolean): void;
}

/** Every adapter that used to carry a fallback, with the factory it needs. */
const PICKER_ADAPTERS: ReadonlyArray<[SpinePopoverFieldType, string]> = [
    ["sprintpicker", "createSprintPicker"],
    ["fontdropdown", "createFontDropdown"],
    ["editablecombobox", "createEditableComboBox"],
    ["multiselectcombo", "createMultiselectCombo"],
    ["tagger", "createTagger"],
    ["peoplepicker", "createPeoplePicker"],
    ["richtextinput", "RichTextInput"],
    ["markdowneditor", "MarkdownEditor"],
    ["symbolpicker", "createSymbolPicker"]
];

function buildData(): SpineMapData
{
    return {
        hubs: [{
            id: "solo", label: "Solo Hub", status: "available", branches: []
        }],
        connections: []
    };
}

function openEditor(container: HTMLElement, type: SpinePopoverFieldType): void
{
    const map = createSpineMap({
        container,
        data: buildData(),
        editable: true,
        popoverFields: [{ key: "f1", label: "Field One", type }]
    });
    (map as unknown as EditablePopover).showPopover("solo", true);
}

describe("SpineMap adapters without their library factory", () =>
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
        for (const name of planted.splice(0))
        {
            delete (window as unknown as Record<string, unknown>)[name];
        }
    });

    // The guard for the whole file. If a factory leaks into the global from
    // another suite, the throw tests below would pass for the wrong reason.
    test("noPickerFactoryIsDefined_SoTheAbsentBranchIsTheOneUnderTest", () =>
    {
        const win = window as unknown as Record<string, unknown>;
        for (const [, factory] of PICKER_ADAPTERS)
        {
            expect(typeof win[factory]).not.toBe("function");
        }
    });

    test.each(PICKER_ADAPTERS)(
        "%s_ThrowsNamingTheMissingFactoryInsteadOfSubstitutingAnInput",
        (type, factory) =>
        {
            expect(() => openEditor(container, type)).toThrow(factory);
        });

    test.each(PICKER_ADAPTERS)(
        "%s_ErrorTellsTheIntegratorWhatToLoad",
        (type) =>
        {
            let message = "";
            try { openEditor(container, type); }
            catch (e) { message = (e as Error).message; }

            // LITERATE_ERRORS.md: name what is missing and how to fix it.
            expect(message).toMatch(/load/i);
            expect(message).toMatch(/spinemap/i);
        });

    test("noStandInInputIsLeftInTheDom_WhenTheFactoryIsAbsent", () =>
    {
        expect(() => openEditor(container, "sprintpicker")).toThrow();

        // Every edit popover carries a real Label text input, so the count
        // of inputs is never zero. What matters is the picker's own slot:
        // the fallback used to append a text box there, and a host that
        // caught the throw and carried on must not find one pretending to
        // be a picker.
        const slots = Array.from(
            document.body.querySelectorAll(".spinemap-edit-field"));
        const pickerSlot = slots.find(
            el => el.querySelector("label")?.textContent === "Field One");

        expect(pickerSlot).toBeTruthy();
        expect(pickerSlot!.querySelectorAll("input, textarea").length)
            .toBe(0);
    });

    test("aFactoryThatThrows_PropagatesWithItsCauseAttached", () =>
    {
        const boom = new Error("picker blew up during construction");
        const win = window as unknown as Record<string, unknown>;
        win["createSprintPicker"] = () => { throw boom; };
        planted.push("createSprintPicker");

        let caught: Error | null = null;
        try { openEditor(container, "sprintpicker"); }
        catch (e) { caught = e as Error; }

        expect(caught).not.toBeNull();
        // The old bare `catch { this.fallback(...) }` discarded this entirely.
        expect(caught?.cause).toBe(boom);
    });

    test("aWorkingFactoryStillMounts_SoTheGuardIsNotTooBroad", () =>
    {
        // DEBT-TEST-1b. "Still mounts" is the claim this control makes,
        // and a bare not.toThrow() never checked that anything mounted.
        // The factory is called once, and the editor renders.
        let mounted = 0;
        const win = window as unknown as Record<string, unknown>;
        win["createSprintPicker"] = () =>
        {
            mounted++;
            return {
                getValue: () => "sprint-7",
                destroy: () => { /* no-op */ }
            };
        };
        planted.push("createSprintPicker");

        openEditor(container, "sprintpicker");

        expect(mounted).toBe(1);
        expect(document.querySelector(".spinemap-popover-body")).not.toBeNull();
    });
});
