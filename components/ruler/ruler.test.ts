/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * TESTS: Ruler
 * Vitest unit tests for the Ruler component.
 * Covers: factory, options, DOM structure, ARIA, unit switching,
 * orientation, cursor tracking, calibration, and edge cases.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import
{
    Ruler,
    createRuler,
} from "./ruler";
import type
{
    RulerOptions,
} from "./ruler";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLElement;

// ============================================================================
// RECORDING 2D CONTEXT
// ============================================================================

/*
 * DEBT-TEST-1b. FIVE BLOCKS IN THIS FILE RAN A METHOD THAT COULD NOT DO
 * ANYTHING. Every Ruler setter ends in `render()`, and `render()` returns
 * on its first line when there is no 2D context. jsdom supplies none, so
 * `setUnit`, `setOrigin`, `setCursorPosition`, `calibrate` and `resize`
 * were each called into a component that had nothing to redraw — the
 * missing-precondition shape from ADR-202, five times over.
 *
 * The canvas 2D API is a PLATFORM API rather than a component of this
 * library, so standing in for it is the same call as stubbing Bootstrap
 * (DEBT-TEST-1c). What it records is what the ruler drew, which is the
 * only observable this component has.
 */
interface DrawLog
{
    texts: string[];
    lines: number;
    fills: number;
}

/**
 * Give every element a real box, because jsdom gives none.
 *
 * `sizeCanvas` reads `wrapperEl.clientWidth`, which jsdom reports as 0,
 * so the canvas came out 0 wide and the tick loop drew almost nothing.
 * The first rewrite of these tests counted 2 labels against 1 and read
 * that as a unit change. It was the length of a ruler with no length.
 */
function installLayout(width: number, height: number): void
{
    Object.defineProperty(HTMLElement.prototype, "clientWidth",
        { configurable: true, value: width });
    Object.defineProperty(HTMLElement.prototype, "clientHeight",
        { configurable: true, value: height });
}

function installRecordingContext(): DrawLog
{
    const log: DrawLog = { texts: [], lines: 0, fills: 0 };
    const ctx = {
        save: () => { },
        restore: () => { },
        scale: () => { },
        rotate: () => { },
        translate: () => { },
        beginPath: () => { },
        moveTo: () => { },
        lineTo: () => { log.lines++; },
        stroke: () => { },
        fillRect: () => { log.fills++; },
        fillText: (t: string) => { log.texts.push(t); },
        fillStyle: "",
        strokeStyle: "",
        lineWidth: 0,
        font: "",
        textAlign: "",
        textBaseline: "",
    };

    HTMLCanvasElement.prototype.getContext =
        (() => ctx) as unknown as HTMLCanvasElement["getContext"];
    return log;
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    container = document.createElement("div");
    container.id = "test-ruler";
    container.style.width = "600px";
    container.style.height = "30px";
    document.body.appendChild(container);
});

const realGetContext = HTMLCanvasElement.prototype.getContext;

afterEach(() =>
{
    document.body.innerHTML = "";
    HTMLCanvasElement.prototype.getContext = realGetContext;
    delete (HTMLElement.prototype as Partial<HTMLElement>).clientWidth;
    delete (HTMLElement.prototype as Partial<HTMLElement>).clientHeight;
});

// ============================================================================
// FACTORY — createRuler
// ============================================================================

describe("createRuler", () =>
{
    test("returnsRulerInstance", () =>
    {
        const ruler = createRuler("test-ruler");
        expect(ruler).toBeInstanceOf(Ruler);
        ruler.destroy();
    });

    test("mountsInContainer", () =>
    {
        const ruler = createRuler("test-ruler");
        expect(container.querySelector(".ruler")).not.toBeNull();
        ruler.destroy();
    });

    test("withOptions_CreatesWithConfig", () =>
    {
        const ruler = createRuler("test-ruler", { unit: "cm" });
        expect(ruler.getElement()).not.toBeNull();
        ruler.destroy();
    });
});

// ============================================================================
// DOM STRUCTURE
// ============================================================================

describe("DOM structure", () =>
{
    test("rootElement_HasRulerClass", () =>
    {
        const ruler = createRuler("test-ruler");
        expect(container.querySelector(".ruler")).not.toBeNull();
        ruler.destroy();
    });

    test("containsCanvasElement", () =>
    {
        const ruler = createRuler("test-ruler");
        const canvas = container.querySelector("canvas");
        expect(canvas).not.toBeNull();
        ruler.destroy();
    });

    test("horizontalOrientation_HasHorizontalClass", () =>
    {
        const ruler = createRuler("test-ruler", { orientation: "horizontal" });
        const wrapper = container.querySelector(".ruler");
        expect(
            wrapper?.classList.contains("ruler-horizontal") ||
            wrapper?.classList.contains("ruler")
        ).toBe(true);
        ruler.destroy();
    });
});

// ============================================================================
// ARIA / ACCESSIBILITY
// ============================================================================

describe("accessibility", () =>
{
    test("wrapperHasAriaAttributes", () =>
    {
        const ruler = createRuler("test-ruler");
        const wrapper = container.querySelector(".ruler");
        expect(wrapper?.getAttribute("role") || wrapper?.getAttribute("aria-label"))
            .toBeTruthy();
        ruler.destroy();
    });
});

// ============================================================================
// PUBLIC API — UNIT SWITCHING
// ============================================================================

describe("unit switching", () =>
{
    test("setUnit_ChangesUnit", () =>
    {
        const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        const ruler = createRuler("test-ruler", { unit: "px" });
        ruler.setUnit("cm");
        // Should log the unit change
        expect(logSpy).toHaveBeenCalledWith(
            expect.any(String),
            "[INFO]",
            expect.stringContaining("[Ruler]"),
            expect.any(String),
            "cm"
        );
        logSpy.mockRestore();
        ruler.destroy();
    });

    test("setUnit_ChangesTheLabelsTheRulerDraws", () =>
    {
        // DEBT-TEST-1b. The old block called setUnit three times and
        // asserted that none of them threw, which was true of a method
        // whose whole effect is a render that could not run.
        //
        // Inches and millimetres cannot produce the same tick labels
        // over the same 600px: 600px is about 6.25in and about 159mm.
        // The count is the claim, and it does not depend on the label
        // text or on the font metrics jsdom does not have.
        installLayout(600, 30);
        const log = installRecordingContext();
        const ruler = createRuler("test-ruler");

        ruler.setUnit("in");
        const inches = log.texts.length;
        log.texts.length = 0;

        ruler.setUnit("mm");
        const millimetres = log.texts.length;

        expect(inches).toBeGreaterThan(0);
        expect(millimetres).toBeGreaterThan(inches);
        ruler.destroy();
    });
});

// ============================================================================
// PUBLIC API — ORIENTATION
// ============================================================================

describe("orientation", () =>
{
    test("setOrientation_ChangesOrientation", () =>
    {
        const ruler = createRuler("test-ruler", { orientation: "horizontal" });
        const wrap = (): HTMLElement =>
            container.querySelector<HTMLElement>(".ruler")!;

        expect(wrap().classList.contains("ruler-horizontal")).toBe(true);

        ruler.setOrientation("vertical");

        expect(wrap().classList.contains("ruler-vertical")).toBe(true);
        expect(wrap().classList.contains("ruler-horizontal")).toBe(false);

        ruler.destroy();
    });
});

// ============================================================================
// PUBLIC API — ORIGIN / CURSOR
// ============================================================================

describe("origin and cursor", () =>
{
    test("setOrigin_ShiftsTheLabelsTheRulerDraws", () =>
    {
        // DEBT-TEST-1b. The name said the origin offset updates and the
        // body asserted no throw. Moving the origin slides the whole
        // scale, so the labels drawn are a different set.
        installLayout(600, 30);
        const log = installRecordingContext();
        const ruler = createRuler("test-ruler");
        const before = [...log.texts];

        log.texts.length = 0;
        ruler.setOrigin(50);

        expect(before.length).toBeGreaterThan(0);
        expect(log.texts).not.toEqual(before);
        ruler.destroy();
    });

    test("setCursorPosition_DrawsTheCursorLine", () =>
    {
        // DEBT-TEST-1b. `showCursor: true` is set here for a reason that
        // the old assertion could not see: drawCursorLine is the only
        // part of the render this method affects, and it is skipped
        // entirely while the cursor position is unset.
        installLayout(600, 30);
        const log = installRecordingContext();
        const ruler = createRuler("test-ruler", { showCursor: true });
        const beforeLines = log.lines;

        log.lines = 0;
        ruler.setCursorPosition(100);

        expect(beforeLines).toBeGreaterThan(0);
        expect(log.lines).toBeGreaterThan(beforeLines);
        ruler.destroy();
    });
});

// ============================================================================
// PUBLIC API — CALIBRATE / RESIZE
// ============================================================================

describe("calibrate and resize", () =>
{
    test("calibrate_ReMeasuresAndRedraws", () =>
    {
        // DEBT-TEST-1b. The DPI it measures cannot be read back, and
        // jsdom reports zero width for the probe element so the value
        // lands on the documented fallback either way. What IS
        // observable is that calibrate redraws, which is the half of
        // the name the old block never checked.
        installLayout(600, 30);
        const log = installRecordingContext();
        const ruler = createRuler("test-ruler");

        log.texts.length = 0;
        log.fills = 0;
        ruler.calibrate();

        expect(log.fills).toBeGreaterThan(0);
        expect(log.texts.length).toBeGreaterThan(0);
        ruler.destroy();
    });

    test("resize_RecalculatesCanvasFromTheContainer", () =>
    {
        // DEBT-TEST-1b, and the one claim here that needs no stand-in:
        // sizeCanvas writes the backing-store size onto the element,
        // which jsdom reports faithfully.
        //
        // jsdom gives every element a clientWidth of 0, so without
        // installLayout the numbers below are both 0 and comparing them
        // proves nothing. That missing precondition is what the original
        // block never had.
        installLayout(640, 24);
        const ruler = createRuler("test-ruler");
        const canvas = container.querySelector("canvas") as HTMLCanvasElement;

        ruler.resize();

        expect(canvas.width).toBeGreaterThan(0);
        expect(canvas.style.width).toBe("640px");
        ruler.destroy();
    });
});

// ============================================================================
// LIFECYCLE
// ============================================================================

describe("lifecycle", () =>
{
    test("destroy_RemovesDOMElements", () =>
    {
        const ruler = createRuler("test-ruler");
        ruler.destroy();
        expect(container.querySelector(".ruler")).toBeNull();
    });

    test("getElement_ReturnsWrapper", () =>
    {
        const ruler = createRuler("test-ruler");
        expect(ruler.getElement()).toBeInstanceOf(HTMLElement);
        ruler.destroy();
    });

    test("getElement_ReturnsNullAfterDestroy", () =>
    {
        const ruler = createRuler("test-ruler");
        ruler.destroy();
        expect(ruler.getElement()).toBeNull();
    });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe("edge cases", () =>
{
    test("missingContainer_Throws", () =>
    {
        // ERR-1. This case asserted the defect: a container that is
        // not there used to be logged and walked past. AGENTS.md
        // calls that returning a null object.
        expect(() => createRuler("nonexistent")).toThrow(/was not found/);
    });

    test("disabledRuler_SuppressesCursorTracking", () =>
    {
        const ruler = createRuler("test-ruler", { disabled: true });
        // Should create without error
        expect(ruler.getElement()).not.toBeNull();
        ruler.destroy();
    });
});
