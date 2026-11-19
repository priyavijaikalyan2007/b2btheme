/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: the touch counts classifier (#202)
 *
 * Tests for scripts/touch-counts.mjs. The review of #202 names components
 * from these counts, so a wrong answer puts a component in the review that
 * complies, or leaves out one that does not. Each judgment the classifier
 * makes has a case here. Three of them were wrong while the script was
 * written, and each wrong one is a case:
 *
 *   - a synthetic `new PointerEvent("pointerdown", {` read as a listener
 *   - DiagramEngine reads GestureRecognizer from `window`, not by a call
 *   - ActionItems sets `draggable` through its own `setAttr` helper
 *
 * A fourth was a definition, not a pattern. Movement alone read as a drag,
 * so FacetSearch's hover over a problem mark needed a `touch-action`.
 */

import { describe, expect, test } from "vitest";
import
{
    classifyComponent,
    codeLines,
    hoverOutsideHoverMedia,
    listensFor,
    runsDrag,
    startsHtmlDrag,
    usesGestureRecognizer,
} from "./touch-counts.mjs";

describe("listensFor", () =>
{
    test("DirectRegistration_IsFound", () =>
    {
        expect(listensFor('el.addEventListener("pointerdown", onDown);', "pointerdown")).toBe(true);
    });

    test("RegistrationThroughAWrapper_IsFound", () =>
    {
        expect(listensFor("this.listen(el, 'mousedown', fn);", "mousedown")).toBe(true);
    });

    test("PropertyHandler_IsFound", () =>
    {
        expect(listensFor("el.oncontextmenu = (e) => open(e);", "contextmenu")).toBe(true);
    });

    test("SyntheticEvent_IsNotAListener", () =>
    {
        expect(listensFor('return new PointerEvent("pointerdown", {', "pointerdown")).toBe(false);
    });

    test("LongerEventName_IsNotThePrefix", () =>
    {
        // "pointerdownoutside" is not "pointerdown".
        expect(listensFor('el.addEventListener("pointerdownoutside", fn);', "pointerdown")).toBe(false);
    });
});

describe("codeLines", () =>
{
    test("CommentLines_AreDropped", () =>
    {
        const text = [
            "// el.addEventListener(\"mousedown\", fn);",
            " * el.addEventListener(\"mousedown\", fn);",
            "el.addEventListener(\"pointerdown\", fn);",
        ].join("\n");
        const code = codeLines(text);
        expect(listensFor(code, "mousedown")).toBe(false);
        expect(listensFor(code, "pointerdown")).toBe(true);
    });
});

describe("usesGestureRecognizer", () =>
{
    test("DirectCall_IsFound", () =>
    {
        expect(usesGestureRecognizer("const g = createGestureRecognizer(el, {});")).toBe(true);
    });

    test("FactoryReadFromWindow_IsFound", () =>
    {
        expect(usesGestureRecognizer("return window.createGestureRecognizer;")).toBe(true);
    });

    test("TypeReferenceOnly_IsNotUse", () =>
    {
        expect(usesGestureRecognizer('type F = Window["createGestureRecognizer"];')).toBe(false);
    });
});

describe("runsDrag", () =>
{
    test("MoveAndLift_IsADrag", () =>
    {
        expect(runsDrag('h.addEventListener("pointermove", m); h.addEventListener("pointerup", u);')).toBe(true);
    });

    test("MoveAndCapture_IsADrag", () =>
    {
        expect(runsDrag('h.setPointerCapture(e.pointerId); h.addEventListener("pointermove", m);')).toBe(true);
    });

    test("MoveAlone_IsAHoverNotADrag", () =>
    {
        // FacetSearch, Ruler and Magnifier follow a mouse that is up.
        expect(runsDrag('input.addEventListener("pointermove", hover);')).toBe(false);
    });

    test("GestureRecognizer_IsADrag", () =>
    {
        expect(runsDrag("createGestureRecognizer(el, { onDragMove });")).toBe(true);
    });
});

describe("startsHtmlDrag", () =>
{
    test("DragstartListener_IsASource", () =>
    {
        expect(startsHtmlDrag('row.addEventListener("dragstart", fn);')).toBe(true);
    });

    test("DraggableProperty_IsASource", () =>
    {
        expect(startsHtmlDrag("row.draggable = true;")).toBe(true);
    });

    test("DraggableAttributeThroughAHelper_IsASource", () =>
    {
        expect(startsHtmlDrag('setAttr(handle, "draggable", "true");')).toBe(true);
    });

    test("DraggableOptionName_IsNotASource", () =>
    {
        // Sidebar's `draggable` option moves a floating panel with Pointer Events.
        expect(startsHtmlDrag("if (this.options.draggable) { this.wireTitleBar(); }")).toBe(false);
    });
});

describe("hoverOutsideHoverMedia", () =>
{
    test("TopLevelHover_Counts", () =>
    {
        expect(hoverOutsideHoverMedia(".a:hover { color: red; }")).toBe(1);
    });

    test("NestedHoverInsideTheMediaBlock_DoesNotCount", () =>
    {
        const scss = "@media (hover: hover) { .a { &:hover { color: red; } } }";
        expect(hoverOutsideHoverMedia(scss)).toBe(0);
    });

    test("AnyHoverQuery_IsAccepted", () =>
    {
        expect(hoverOutsideHoverMedia("@media (any-hover: hover) { .a:hover { color: red; } }")).toBe(0);
    });

    test("HoverAfterTheMediaBlockCloses_Counts", () =>
    {
        const scss = "@media (hover: hover) { .a:hover { color: red; } } .b:hover { color: blue; }";
        expect(hoverOutsideHoverMedia(scss)).toBe(1);
    });

    test("OtherMediaQuery_DoesNotCover", () =>
    {
        expect(hoverOutsideHoverMedia("@media (min-width: 768px) { .a:hover { color: red; } }")).toBe(1);
    });

    test("HoverInAComment_DoesNotCount", () =>
    {
        expect(hoverOutsideHoverMedia("/* .a:hover { color: red; } */ .b { color: blue; }")).toBe(0);
    });

    test("HoverInADeclarationValue_DoesNotCount", () =>
    {
        // A prelude resets at each `;`, so text before a declaration's end is not a selector.
        expect(hoverOutsideHoverMedia('.a { content: ":hover"; } .b { color: red; }')).toBe(0);
    });
});

describe("classifyComponent", () =>
{
    test("PointerdownWithoutCancel_IsAFinding", () =>
    {
        const c = classifyComponent('el.addEventListener("pointerdown", fn);', "");
        expect(c.pointerdownNoCancel).toBe(true);
    });

    test("PointerdownWithCancel_IsNotAFinding", () =>
    {
        const code = 'el.addEventListener("pointerdown", a); el.addEventListener("pointercancel", b);';
        expect(classifyComponent(code, "").pointerdownNoCancel).toBe(false);
    });

    test("GestureRecognizerHandlesCancel", () =>
    {
        const code = 'el.addEventListener("pointerdown", a); createGestureRecognizer(el, {});';
        expect(classifyComponent(code, "").pointerdownNoCancel).toBe(false);
    });

    test("MousedownBesidePointerdown_IsNotMousedownOnly", () =>
    {
        const code = 'el.addEventListener("pointerdown", a); el.addEventListener("mousedown", b);';
        expect(classifyComponent(code, "").mousedownOnly).toBe(false);
    });

    test("ContextmenuWithAttachLongPress_IsNotContextmenuOnly", () =>
    {
        const code = 'el.addEventListener("contextmenu", a); attachLongPress(el, open);';
        const c = classifyComponent(code, "");
        expect(c.contextmenu).toBe(true);
        expect(c.contextmenuOnly).toBe(false);
    });

    test("DragWithoutCancel_IsAFinding", () =>
    {
        const code = 'el.addEventListener("pointermove", m); el.addEventListener("pointerup", u);';
        expect(classifyComponent(code, "").dragNoCancel).toBe(true);
    });

    test("PressWithoutCancel_IsOnlyInSectionOnesCount", () =>
    {
        // A close on a press outside has nothing to restore on a cancel.
        const c = classifyComponent('document.addEventListener("pointerdown", closeOutside);', "");
        expect(c.pointerdownNoCancel).toBe(true);
        expect(c.dragNoCancel).toBe(false);
    });

    test("DragWithoutTouchAction_IsAFinding", () =>
    {
        const code = 'el.addEventListener("pointermove", m); el.addEventListener("pointerup", u);';
        expect(classifyComponent(code, ".a { color: red; }").dragNoTouchAction).toBe(true);
    });

    test("TouchActionInScssOrCode_Clears", () =>
    {
        const code = 'el.addEventListener("pointermove", m); el.addEventListener("pointerup", u);';
        expect(classifyComponent(code, ".a { touch-action: none; }").dragNoTouchAction).toBe(false);
        expect(classifyComponent(`${code} el.style.touchAction = "none";`, "").dragNoTouchAction).toBe(false);
    });

    test("FileDropZone_IsNotADragSource", () =>
    {
        const c = classifyComponent('zone.addEventListener("drop", onDrop);', "");
        expect(c.htmlDrag).toBe(false);
        expect(c.fileDropOnly).toBe(true);
    });
});
