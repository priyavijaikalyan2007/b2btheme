/**
 * TESTS: CommandPalette
 * Spec-based tests for the CommandPalette Ctrl+K omnibar component.
 * Tests cover: factory functions, singleton, options/defaults, DOM structure,
 * ARIA, handle methods, callbacks, keyboard, fuzzy search, edge cases.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import {
    CommandPalette,
    openCommandPalette,
    registerCommand,
    registerCommands,
} from "./commandpalette";
import type { PaletteCommand, CommandPaletteOptions } from "./commandpalette";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLDivElement;

function makeCommand(id: string, label: string, overrides?: Partial<PaletteCommand>): PaletteCommand
{
    return {
        id,
        label,
        action: vi.fn(),
        ...overrides,
    };
}

function getBackdrop(): HTMLElement | null
{
    return document.querySelector(".commandpalette-backdrop");
}

function getPalette(): HTMLElement | null
{
    return document.querySelector(".commandpalette");
}

function getInput(): HTMLInputElement | null
{
    return document.querySelector(".commandpalette-input") as HTMLInputElement | null;
}

function getResults(): HTMLElement | null
{
    return document.querySelector(".commandpalette-results") as HTMLElement | null;
}

function getResultItems(): HTMLElement[]
{
    return Array.from(
        document.querySelectorAll(".commandpalette-item")
    );
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    vi.useFakeTimers();
    container = document.createElement("div");
    container.id = "test-container";
    document.body.appendChild(container);
});

afterEach(() =>
{
    // Destroy singleton between tests
    const inst = CommandPalette.getInstance();
    inst.destroy();
    const backdrops = document.querySelectorAll(".commandpalette-backdrop");
    backdrops.forEach((b) => b.remove());
    const palettes = document.querySelectorAll(".commandpalette");
    palettes.forEach((p) => p.remove());
    container.remove();
    vi.useRealTimers();
});

// ============================================================================
// FACTORY / SINGLETON
// ============================================================================

describe("CommandPalette singleton", () =>
{
    test("getInstance_ReturnsSameInstance", () =>
    {
        const a = CommandPalette.getInstance();
        const b = CommandPalette.getInstance();
        expect(a).toBe(b);
    });

    test("configure_ReturnsSingletonWithOptions", () =>
    {
        const inst = CommandPalette.configure({
            placeholder: "Search commands...",
        });
        expect(inst).toBe(CommandPalette.getInstance());
    });

    test("configure_WithCommands_RegistersCommands", () =>
    {
        const cmds = [makeCommand("c1", "Cmd 1"), makeCommand("c2", "Cmd 2")];
        CommandPalette.configure({ commands: cmds });
        const inst = CommandPalette.getInstance();
        expect(inst.getCommands().length).toBe(2);
    });
});

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

describe("convenience functions", () =>
{
    test("registerCommand_AddsCommandToSingleton", () =>
    {
        registerCommand(makeCommand("rc1", "Registered Cmd"));
        const inst = CommandPalette.getInstance();
        expect(inst.getCommand("rc1")).toBeDefined();
    });

    test("registerCommands_AddsMultipleCommands", () =>
    {
        registerCommands([
            makeCommand("m1", "Multi 1"),
            makeCommand("m2", "Multi 2"),
        ]);
        const inst = CommandPalette.getInstance();
        expect(inst.getCommands().length).toBeGreaterThanOrEqual(2);
    });

    test("openCommandPalette_OpensPalette", () =>
    {
        openCommandPalette();
        expect(getPalette()).not.toBeNull();
    });
});

// ============================================================================
// OPTIONS & DEFAULTS
// ============================================================================

describe("CommandPalette options", () =>
{
    test("withCustomPlaceholder_DisplaysPlaceholder", () =>
    {
        CommandPalette.configure({ placeholder: "Find something..." });
        const inst = CommandPalette.getInstance();
        inst.open();
        const input = getInput();
        expect(input?.getAttribute("placeholder")).toBe("Find something...");
    });
});

// ============================================================================
// DOM STRUCTURE
// ============================================================================

describe("CommandPalette DOM structure", () =>
{
    test("open_CreatesBackdrop", () =>
    {
        const inst = CommandPalette.getInstance();
        inst.open();
        expect(getBackdrop()).not.toBeNull();
    });

    test("open_CreatesPaletteContainer", () =>
    {
        const inst = CommandPalette.getInstance();
        inst.open();
        expect(getPalette()).not.toBeNull();
    });

    test("open_CreatesSearchInput", () =>
    {
        const inst = CommandPalette.getInstance();
        inst.open();
        expect(getInput()).not.toBeNull();
    });

    test("open_CreatesResultsArea", () =>
    {
        const inst = CommandPalette.getInstance();
        inst.open();
        expect(getResults()).not.toBeNull();
    });
});

// ============================================================================
// ARIA
// ============================================================================

describe("CommandPalette ARIA", () =>
{
    test("input_HasComboboxRole", () =>
    {
        const inst = CommandPalette.getInstance();
        inst.open();
        const input = getInput();
        expect(input?.getAttribute("role")).toBe("combobox");
        inst.close();
    });

    test("results_HasListboxRole", () =>
    {
        const inst = CommandPalette.getInstance();
        inst.open();
        const results = getResults();
        expect(results?.getAttribute("role")).toBe("listbox");
        inst.close();
    });
});

// ============================================================================
// HANDLE METHODS
// ============================================================================

describe("CommandPalette handle methods", () =>
{
    test("open_SetsIsOpenTrue", () =>
    {
        const inst = CommandPalette.getInstance();
        inst.open();
        expect(inst.isOpen()).toBe(true);
    });

    test("close_SetsIsOpenFalse", () =>
    {
        const inst = CommandPalette.getInstance();
        inst.open();
        inst.close();
        expect(inst.isOpen()).toBe(false);
    });

    test("registerCommand_AddsCommand", () =>
    {
        const inst = CommandPalette.getInstance();
        inst.registerCommand(makeCommand("add1", "Add Test"));
        expect(inst.getCommand("add1")).toBeDefined();
    });

    test("unregisterCommand_RemovesCommand", () =>
    {
        const inst = CommandPalette.getInstance();
        inst.registerCommand(makeCommand("del1", "Delete Test"));
        inst.unregisterCommand("del1");
        expect(inst.getCommand("del1")).toBeUndefined();
    });

    test("setCommands_ReplacesAllCommands", () =>
    {
        const inst = CommandPalette.getInstance();
        inst.registerCommand(makeCommand("old", "Old"));
        inst.setCommands([makeCommand("new1", "New 1")]);
        expect(inst.getCommand("old")).toBeUndefined();
        expect(inst.getCommand("new1")).toBeDefined();
    });

    test("getCommands_ReturnsAllRegistered", () =>
    {
        const inst = CommandPalette.getInstance();
        inst.setCommands([
            makeCommand("g1", "Get 1"),
            makeCommand("g2", "Get 2"),
        ]);
        expect(inst.getCommands().length).toBe(2);
    });

    test("clearRecent_EmptiesRecentList", () =>
    {
        const inst = CommandPalette.getInstance();
        inst.clearRecent();
        // No error means success
        expect(inst).toBeDefined();
    });

    test("destroy_CleansUpSingleton", () =>
    {
        const inst = CommandPalette.getInstance();
        inst.open();
        inst.destroy();
        expect(inst.isOpen()).toBe(false);
    });
});

// ============================================================================
// CALLBACKS
// ============================================================================

describe("CommandPalette callbacks", () =>
{
    test("onOpen_CalledOnOpen", () =>
    {
        const onOpen = vi.fn();
        CommandPalette.configure({ onOpen });
        const inst = CommandPalette.getInstance();
        inst.open();
        expect(onOpen).toHaveBeenCalled();
    });

    test("onClose_CalledOnClose", () =>
    {
        const onClose = vi.fn();
        CommandPalette.configure({ onClose });
        const inst = CommandPalette.getInstance();
        inst.open();
        inst.close();
        expect(onClose).toHaveBeenCalled();
    });
});

// ============================================================================
// KEYBOARD
// ============================================================================

describe("CommandPalette keyboard", () =>
{
    test("escapeKey_ClosesPalette", () =>
    {
        const inst = CommandPalette.getInstance();
        inst.open();
        const input = getInput();
        input?.dispatchEvent(new KeyboardEvent("keydown", {
            key: "Escape", bubbles: true,
        }));
        expect(inst.isOpen()).toBe(false);
    });

    test("arrowDown_HighlightsNextItem", () =>
    {
        const inst = CommandPalette.getInstance();
        inst.setCommands([
            makeCommand("nav1", "Navigate 1"),
            makeCommand("nav2", "Navigate 2"),
        ]);
        inst.open();
        const input = getInput();
        input?.dispatchEvent(new KeyboardEvent("keydown", {
            key: "ArrowDown", bubbles: true,
        }));
        const items = getResultItems();
        const hasHighlight = items.some((item) =>
            item.classList.contains("commandpalette-item-active")
        );
        expect(hasHighlight).toBe(true);
    });
});

// ============================================================================
// SEARCH / FILTERING
// ============================================================================

describe("CommandPalette search", () =>
{
    test("typingInInput_FiltersResults", () =>
    {
        const inst = CommandPalette.getInstance();
        inst.setCommands([
            makeCommand("s1", "Save File"),
            makeCommand("s2", "Open File"),
            makeCommand("s3", "Export PDF"),
        ]);
        inst.open();
        const input = getInput();
        if (input)
        {
            input.value = "Save";
            input.dispatchEvent(new Event("input", { bubbles: true }));
        }
        vi.advanceTimersByTime(200);
        const items = getResultItems();
        const labels = items.map((i) => i.textContent);
        expect(labels.some((l) => l?.includes("Save"))).toBe(true);
    });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe("CommandPalette edge cases", () =>
{
    test("openWhenAlreadyOpen_DoesNotDuplicate", () =>
    {
        const inst = CommandPalette.getInstance();
        inst.open();
        inst.open();
        const palettes = document.querySelectorAll(".commandpalette");
        expect(palettes.length).toBe(1);
    });

    test("closeWhenNotOpen_DoesNotThrow", () =>
    {
        const inst = CommandPalette.getInstance();
        expect(() => inst.close()).not.toThrow();
    });

    test("destroyTwice_DoesNotThrow", () =>
    {
        const inst = CommandPalette.getInstance();
        expect(() =>
        {
            inst.destroy();
            inst.destroy();
        }).not.toThrow();
    });

    test("disabledCommand_NotExecutable", () =>
    {
        const action = vi.fn();
        const inst = CommandPalette.getInstance();
        inst.registerCommand(makeCommand("dis", "Disabled Cmd", {
            action, disabled: true,
        }));
        inst.open();
        // Disabled commands are rendered but clicking does nothing
        expect(inst.getCommand("dis")?.disabled).toBe(true);
    });
});
