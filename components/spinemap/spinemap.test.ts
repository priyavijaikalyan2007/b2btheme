/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: SpineMap
 * Security-focused tests for the SpineMap component.
 * Covers: SEC-2 inert text extraction, label rendering, factory function,
 * options, handle methods, node rendering, selection, layout,
 * data management, ARIA accessibility, and edge cases.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { createSpineMap } from "./spinemap";
import type { SpineMapData, SpineHub, SpineBranch } from "./spinemap";

// ============================================================================
// HELPERS
// ============================================================================

/** Build minimal valid SpineMapData for testing. */
function buildTestData(): SpineMapData
{
    return {
        hubs: [
            {
                id: "hub-1",
                label: "Hub One",
                status: "available",
                branches: [
                    {
                        id: "branch-1",
                        label: "Branch A",
                        status: "in-progress"
                    },
                    {
                        id: "branch-2",
                        label: "Branch B",
                        status: "planned"
                    }
                ]
            },
            {
                id: "hub-2",
                label: "Hub Two",
                status: "planned",
                branches: []
            }
        ],
        connections: [
            {
                from: "branch-1",
                to: "branch-2",
                type: "depends-on"
            }
        ]
    };
}

/** Build data with a single hub and no connections. */
function buildMinimalData(): SpineMapData
{
    return {
        hubs: [
            {
                id: "solo",
                label: "Solo Hub",
                status: "available",
                branches: []
            }
        ]
    };
}

/** Find the SVG element inside the SpineMap root. */
function getSvg(root: HTMLElement): SVGSVGElement | null
{
    return root.querySelector("svg") as SVGSVGElement | null;
}

/** Find the live region element. */
function getLiveRegion(root: HTMLElement): HTMLElement | null
{
    return root.querySelector("[aria-live='polite']") as HTMLElement | null;
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

let container: HTMLElement;

beforeEach(() =>
{
    vi.useFakeTimers();
    container = document.createElement("div");
    container.style.width = "800px";
    container.style.height = "600px";
    document.body.appendChild(container);
});

afterEach(() =>
{
    // Clean up any SpineMap instances
    container.remove();
    vi.useRealTimers();
    vi.restoreAllMocks();
});

// ============================================================================
// NODE LABELS — MARKUP IN A LABEL IS SHOWN AS TEXT
// ============================================================================
//
// These tests check the label path, which reaches the SVG through
// `textContent` and parses nothing. They were named after SEC-2 and after
// `stripHtmlTags` until 12 October 2026, and they never reached either:
// reducing `stripHtmlTags` to `return html` left all fifty tests in this
// file passing. The property they do check is real, so they are kept under
// an accurate name. The function itself is covered further down.
//
describe("node labels — markup is shown as text", () =>
{
    test("imgOnerror_NotInjectedAsDomElement", () =>
    {
        const data = buildMinimalData();
        data.hubs[0].label = '<img onerror="alert(1)" src="x">';
        const map = createSpineMap({ container, data });
        const root = map.getElement();

        // The label should NOT inject actual <img> elements into the
        // SVG DOM. The label is set via textContent, which prevents
        // HTML injection. Verify no <img> elements exist.
        const injectedImgs = root.querySelectorAll("img");
        expect(injectedImgs.length).toBe(0);

        // No element should have an onerror handler
        const withOnerror = root.querySelectorAll("[onerror]");
        expect(withOnerror.length).toBe(0);
        map.destroy();
    });

    test("scriptTag_StrippedFromNodeLabels", () =>
    {
        const data = buildMinimalData();
        data.hubs[0].label = '<script>alert("xss")</script>Safe';
        const map = createSpineMap({ container, data });
        const root = map.getElement();

        const textElements = root.querySelectorAll("text");
        for (const textEl of textElements)
        {
            expect(textEl.textContent || "").not.toContain("<script>");
        }
        map.destroy();
    });

    test("nestedXssPayload_StoredVerbatimAndNeverParsed", () =>
    {
        const payload =
            '<div onmouseover="alert(1)"><img src=x onerror=alert(1)>Desc</div>';
        const data = buildMinimalData();
        data.hubs[0].description = payload;
        const map = createSpineMap({ container, data, editable: true });
        const root = map.getElement();

        // The description is kept verbatim in the data, because a consumer
        // reading it back must get what it put in. Nothing on the canvas
        // parses it, so no element from the payload exists.
        expect(map.getNode("solo")?.description).toBe(payload);
        expect(root.querySelectorAll("img").length).toBe(0);
        expect(root.querySelectorAll("[onmouseover]").length).toBe(0);
        map.destroy();
    });

    test("svgInjection_RenderedAsTextNotHtml", () =>
    {
        const data = buildMinimalData();
        data.hubs[0].label =
            '<svg onload="alert(1)"><circle r="50"/></svg>Label';
        const map = createSpineMap({ container, data });
        const root = map.getElement();

        // SVG text elements use textContent (not innerHTML), so the
        // label appears as literal escaped text — safe from injection.
        // The SVG should NOT have nested <svg> elements from the label.
        const nestedSvgs = root.querySelectorAll("svg svg");
        expect(nestedSvgs.length).toBe(0);

        // No element should have an onload handler injected
        const allEls = root.querySelectorAll("[onload]");
        expect(allEls.length).toBe(0);
        map.destroy();
    });

    test("multipleXssVectors_SafeRendering", () =>
    {
        const data: SpineMapData = {
            hubs: [
                {
                    id: "xss-hub",
                    label: '<a href="javascript:alert(1)">Click</a>',
                    status: "available",
                    branches: [
                        {
                            id: "xss-branch",
                            label: '<iframe src="evil"></iframe>Branch',
                            status: "planned"
                        }
                    ]
                }
            ]
        };
        const map = createSpineMap({ container, data });
        const root = map.getElement();

        // Labels with XSS vectors should not inject actual anchor
        // or iframe elements into the SVG DOM
        const injectedAnchors = root.querySelectorAll("svg a");
        expect(injectedAnchors.length).toBe(0);

        const injectedIframes = root.querySelectorAll("iframe");
        expect(injectedIframes.length).toBe(0);

        // THE LOOP THAT STOOD HERE RAN ZERO TIMES. SpineMap emits no
        // href at all for this data, so the `javascript:` claim was
        // never made against anything -- it read as a third vector
        // checked and was a third vector skipped. The two assertions
        // above are live, so the block passed on their strength and
        // neither ceiling could see the gap.
        //
        // Naming the list makes the emptiness a stated fact. The day
        // SpineMap grows a `<use href>` this asks for the claim to be
        // rewritten rather than passing in silence.
        const hrefs = [...root.querySelectorAll("[href]")]
            .map((el) => el.getAttribute("href") ?? "");

        expect(hrefs).toEqual([]);
        map.destroy();
    });

    test("encodedHtmlEntities_RenderedAsText", () =>
    {
        const data = buildMinimalData();
        data.hubs[0].label = "A &amp; B &lt;safe&gt;";
        const map = createSpineMap({ container, data });
        const node = map.getNode("solo");
        expect(node?.label).toBe("A &amp; B &lt;safe&gt;");
        map.destroy();
    });
});

// ============================================================================
// SEC-2: A RICH-TEXT FIELD VALUE IS PARSED IN AN INERT DOCUMENT
// ============================================================================
//
// `stripHtmlTags` reduces a stored rich-text or markdown value to plain text
// for the read-only popover. It is reached from exactly two places, the
// `renderView` of the richtextinput and markdowneditor field adapters, so
// these tests drive it the way a consumer does: a field of that type, a
// hostile stored value, and a click on the node to open the popover.
//
// What jsdom cannot show lives in `tests/spinemap-inert-parse.spec.ts`.
// jsdom starts no image load and runs no event handler, so "the handler did
// not fire" passes here whether or not the markup was parsed.
//

/**
 * Inputs compared against the old detached-div implementation on
 * 12 October 2026. All twenty-one produced identical text, which is why
 * the fix could change where parsing happens without changing what
 * consumers see. The twenty-first is the empty string, covered in its own
 * test below, because an empty field is skipped before the adapter runs.
 */
const EXTRACTION_CASES: { html: string; text: string }[] = [
    { html: '<img src=x onerror="alert(1)">', text: "" },
    { html: '<script>alert("xss")</script>Safe', text: 'alert("xss")Safe' },
    {
        html: '<div onmouseover="alert(1)">'
            + "<img src=x onerror=alert(1)>Desc</div>",
        text: "Desc"
    },
    { html: "A &amp; B &lt;safe&gt;", text: "A & B <safe>" },
    { html: "<p>a</p><p>b</p>", text: "ab" },
    { html: "<td>x</td>", text: "x" },
    { html: "<br>", text: "" },
    { html: "<title>x</title>y", text: "xy" },
    { html: "plain text", text: "plain text" },
    { html: "<b>bold</b> and <i>it</i>", text: "bold and it" },
    { html: "<!-- comment -->visible", text: "visible" },
    {
        html: "<svg onload=\"alert(1)\"><circle r='5'/></svg>Label",
        text: "Label"
    },
    { html: "<style>p{color:red}</style>After", text: "p{color:red}After" },
    { html: "<textarea><b>x</b></textarea>", text: "<b>x</b>" },
    {
        html: "<table><tr><td>cell</td></tr></table>",
        text: "cell"
    },
    { html: "a<br>b", text: "ab" },
    { html: "&#60;script&#62;", text: "<script>" },
    { html: "<iframe src=evil></iframe>Branch", text: "Branch" },
    {
        html: '<a href="javascript:alert(1)">Click</a>',
        text: "Click"
    },
    { html: "<form><input name=x></form>Tail", text: "Tail" }
];

/** Build data whose node carries `stored` in a metadata field. */
function buildFieldData(stored: string): SpineMapData
{
    const data = buildMinimalData();
    data.hubs[0].metadata = { notes: stored };
    return data;
}

/** Open the read-only popover for the one node and return it. */
function openPopover(map: ReturnType<typeof createSpineMap>): HTMLElement
{
    const g = map.getElement()
        .querySelector("[data-id='solo']") as SVGGElement | null;
    expect(g).not.toBeNull();
    g!.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    // The popover is appended to `document.body`, not to the map root, so
    // that it is never clipped by the canvas overflow.
    const all = document.body.querySelectorAll(".spinemap-popover");
    const popover = all[all.length - 1] as HTMLElement | undefined;
    expect(popover).toBeTruthy();
    return popover!;
}

/** Read the rendered value of the field labelled `label`. */
function readFieldText(popover: HTMLElement, label: string): string | null
{
    const rows = popover.querySelectorAll(".spinemap-popover-field");
    for (const row of rows)
    {
        const lbl = row.querySelector(".spinemap-popover-label");
        if ((lbl?.textContent || "") === `${label}:`)
        {
            return row.querySelector(".spinemap-popover-value")
                ?.textContent ?? "";
        }
    }
    return null;
}

/** Mount a map with one rich-text or markdown field and open its popover. */
function renderFieldView(
    stored: string,
    type: "richtextinput" | "markdowneditor" = "richtextinput"
): { map: ReturnType<typeof createSpineMap>; popover: HTMLElement }
{
    const map = createSpineMap({
        container,
        data: buildFieldData(stored),
        popoverFields: [
            {
                key: "notes",
                label: "Notes",
                type,
                source: "metadata"
            }
        ]
    });
    return { map, popover: openPopover(map) };
}

describe("stripHtmlTags — text extraction", () =>
{
    for (const sample of EXTRACTION_CASES)
    {
        test(`extracts ${JSON.stringify(sample.html)}`, () =>
        {
            const { map, popover } = renderFieldView(sample.html);
            expect(readFieldText(popover, "Notes")).toBe(sample.text);
            map.destroy();
        });
    }

    test("emptyValue_SkipsTheFieldEntirely", () =>
    {
        const { map, popover } = renderFieldView("");
        expect(readFieldText(popover, "Notes")).toBeNull();
        map.destroy();
    });

    test("markdownField_UsesTheSameExtraction", () =>
    {
        const { map, popover } = renderFieldView(
            '<img src=x onerror="alert(1)">Note', "markdowneditor"
        );
        expect(readFieldText(popover, "Notes")).toBe("Note");
        map.destroy();
    });

    test("scriptText_StillAppearsInTheValue_unchangedOnPurpose", () =>
    {
        // `textContent` includes the text of a script or style element, so
        // the body of one shows up in the extracted value. That was true
        // of the old code too. Output parity was the point of the fix, so
        // this is recorded rather than changed.
        const { map, popover } = renderFieldView(
            "<script>alert(1)</script>Tail"
        );
        expect(readFieldText(popover, "Notes")).toBe("alert(1)Tail");
        map.destroy();
    });
});

describe("SEC-2 — a hostile field value creates no elements", () =>
{
    test("hostileValue_ProducesNoImageAndNoHandlerAttribute", () =>
    {
        const { map, popover } = renderFieldView(
            '<img src="/does-not-exist.png" onerror="alert(1)">Desc'
        );
        const root = map.getElement();

        expect(readFieldText(popover, "Notes")).toBe("Desc");
        expect(popover.querySelectorAll("img").length).toBe(0);
        expect(popover.querySelectorAll("[onerror]").length).toBe(0);
        expect(root.querySelectorAll("img").length).toBe(0);
        expect(document.querySelectorAll("[onerror]").length).toBe(0);
        map.destroy();
    });

    test("value_IsInsertedAsTextSoTheMarkupIsVisible", () =>
    {
        // The extracted text is put in through `textContent`, so a payload
        // that survives extraction as text stays text and is never markup.
        const { map, popover } = renderFieldView("&lt;b&gt;not bold&lt;/b&gt;");

        expect(readFieldText(popover, "Notes")).toBe("<b>not bold</b>");
        expect(popover.querySelectorAll("b").length).toBe(0);
        map.destroy();
    });
});

// ============================================================================
// FACTORY — createSpineMap
// ============================================================================

describe("createSpineMap", () =>
{
    test("withContainer_CreatesInstance", () =>
    {
        const map = createSpineMap({ container });
        expect(map).toBeDefined();
        expect(map.getElement()).toBeInstanceOf(HTMLElement);
        map.destroy();
    });

    test("withData_RendersNodes", () =>
    {
        const map = createSpineMap({ container, data: buildTestData() });
        const root = map.getElement();
        const svg = getSvg(root);
        expect(svg).not.toBeNull();
        map.destroy();
    });

    test("rootElement_HasSpineMapClass", () =>
    {
        const map = createSpineMap({ container });
        expect(map.getElement().classList.contains("spinemap")).toBe(true);
        map.destroy();
    });

    test("withCssClass_AddsCustomClass", () =>
    {
        const map = createSpineMap({
            container,
            cssClass: "custom-map"
        });
        expect(map.getElement().classList.contains("custom-map")).toBe(true);
        map.destroy();
    });
});

// ============================================================================
// OPTIONS
// ============================================================================

describe("options", () =>
{
    test("defaultLayout_IsVertical", () =>
    {
        const map = createSpineMap({ container });
        expect(map.getLayout()).toBe("vertical");
        map.destroy();
    });

    test("horizontalLayout_SetsCorrectly", () =>
    {
        const map = createSpineMap({
            container,
            layout: "horizontal"
        });
        expect(map.getLayout()).toBe("horizontal");
        map.destroy();
    });

    test("radialLayout_SetsCorrectly", () =>
    {
        const map = createSpineMap({
            container,
            layout: "radial",
            data: buildTestData()
        });
        expect(map.getLayout()).toBe("radial");
        map.destroy();
    });

    test("windingLayout_SetsCorrectly", () =>
    {
        const map = createSpineMap({
            container,
            layout: "winding",
            data: buildTestData()
        });
        expect(map.getLayout()).toBe("winding");
        map.destroy();
    });

    test("editableTrue_AddsEditableClass", () =>
    {
        const map = createSpineMap({
            container,
            editable: true
        });
        expect(
            map.getElement().classList.contains("spinemap-editable")
        ).toBe(true);
        map.destroy();
    });

    test("showToolbarFalse_NoToolbar", () =>
    {
        const map = createSpineMap({
            container,
            showToolbar: false
        });
        const toolbar = map.getElement().querySelector(".spinemap-toolbar");
        expect(toolbar).toBeNull();
        map.destroy();
    });

    test("sizeSmall_AppliesSmClass", () =>
    {
        const map = createSpineMap({ container, size: "sm" });
        expect(
            map.getElement().classList.contains("spinemap-sm")
        ).toBe(true);
        map.destroy();
    });

    test("sizeLarge_AppliesLgClass", () =>
    {
        const map = createSpineMap({ container, size: "lg" });
        expect(
            map.getElement().classList.contains("spinemap-lg")
        ).toBe(true);
        map.destroy();
    });
});

// ============================================================================
// DATA MANAGEMENT
// ============================================================================

describe("data management", () =>
{
    test("loadData_StoresHubsAndConnections", () =>
    {
        const map = createSpineMap({ container });
        const data = buildTestData();
        map.loadData(data);

        const result = map.getData();
        expect(result.hubs.length).toBe(2);
        expect(result.connections?.length).toBe(1);
        map.destroy();
    });

    test("getData_ReturnsDeepCopy", () =>
    {
        const map = createSpineMap({
            container,
            data: buildTestData()
        });
        const data1 = map.getData();
        const data2 = map.getData();

        // Should be equal in value but different references
        expect(data1).toEqual(data2);
        expect(data1).not.toBe(data2);
        expect(data1.hubs).not.toBe(data2.hubs);
        map.destroy();
    });

    test("loadData_OverwritesPreviousData", () =>
    {
        const map = createSpineMap({
            container,
            data: buildTestData()
        });
        const newData = buildMinimalData();
        map.loadData(newData);

        expect(map.getData().hubs.length).toBe(1);
        map.destroy();
    });

    test("getNode_ReturnsNodeById", () =>
    {
        const map = createSpineMap({
            container,
            data: buildTestData()
        });
        const node = map.getNode("hub-1");
        expect(node).not.toBeNull();
        expect(node?.label).toBe("Hub One");
        map.destroy();
    });

    test("getNode_ReturnsNullForUnknownId", () =>
    {
        const map = createSpineMap({
            container,
            data: buildTestData()
        });
        expect(map.getNode("nonexistent")).toBeNull();
        map.destroy();
    });
});

// ============================================================================
// NODE OPERATIONS
// ============================================================================

describe("node operations", () =>
{
    test("addHub_IncreasesHubCount", () =>
    {
        const map = createSpineMap({
            container,
            data: buildMinimalData()
        });
        expect(map.getData().hubs.length).toBe(1);

        map.addHub({
            id: "new-hub",
            label: "New Hub",
            status: "planned",
            branches: []
        });
        expect(map.getData().hubs.length).toBe(2);
        map.destroy();
    });

    test("addBranch_AddsToBranchList", () =>
    {
        const map = createSpineMap({
            container,
            data: buildMinimalData()
        });
        map.addBranch(
            { id: "new-branch", label: "New Branch", status: "available" },
            "solo"
        );
        const hub = map.getNode("solo") as SpineHub;
        expect(hub.branches.length).toBe(1);
        map.destroy();
    });

    test("updateNode_ChangesNodeProperties", () =>
    {
        const map = createSpineMap({
            container,
            data: buildTestData()
        });
        map.updateNode("hub-1", { label: "Updated Hub" });
        const node = map.getNode("hub-1");
        expect(node?.label).toBe("Updated Hub");
        map.destroy();
    });

    test("removeNode_RemovesHub", () =>
    {
        const map = createSpineMap({
            container,
            data: buildTestData()
        });
        map.removeNode("hub-2");
        expect(map.getData().hubs.length).toBe(1);
        expect(map.getNode("hub-2")).toBeNull();
        map.destroy();
    });
});

// ============================================================================
// SELECTION
// ============================================================================

describe("selection", () =>
{
    test("selectNode_SetsSelectedId", () =>
    {
        const map = createSpineMap({
            container,
            data: buildTestData()
        });
        map.selectNode("hub-1");
        expect(map.getSelectedNode()).toBe("hub-1");
        map.destroy();
    });

    test("clearSelection_ResetsSelectedId", () =>
    {
        const map = createSpineMap({
            container,
            data: buildTestData()
        });
        map.selectNode("hub-1");
        map.clearSelection();
        expect(map.getSelectedNode()).toBeNull();
        map.destroy();
    });

    test("selectNode_CalledTwice_UpdatesSelection", () =>
    {
        const map = createSpineMap({
            container,
            data: buildTestData()
        });
        map.selectNode("hub-1");
        map.selectNode("hub-2");
        expect(map.getSelectedNode()).toBe("hub-2");
        map.destroy();
    });

    test("getSelectedNode_InitiallyNull", () =>
    {
        const map = createSpineMap({
            container,
            data: buildTestData()
        });
        expect(map.getSelectedNode()).toBeNull();
        map.destroy();
    });
});

// ============================================================================
// LAYOUT
// ============================================================================

describe("layout", () =>
{
    test("setLayout_ChangesLayout", () =>
    {
        const map = createSpineMap({
            container,
            data: buildTestData()
        });
        map.setLayout("horizontal");
        expect(map.getLayout()).toBe("horizontal");
        map.destroy();
    });

    test("relayout_DoesNotChangeMode", () =>
    {
        const map = createSpineMap({
            container,
            layout: "vertical",
            data: buildTestData()
        });
        map.relayout();
        expect(map.getLayout()).toBe("vertical");
        map.destroy();
    });

    test("setLayout_FiresOnLayoutChange", () =>
    {
        const onLayoutChange = vi.fn();
        const map = createSpineMap({
            container,
            data: buildTestData(),
            onLayoutChange
        });
        map.setLayout("radial");
        expect(onLayoutChange).toHaveBeenCalledWith("radial");
        map.destroy();
    });
});

// ============================================================================
// ZOOM
// ============================================================================

describe("zoom", () =>
{
    test("initialZoom_IsOne", () =>
    {
        const map = createSpineMap({ container });
        expect(map.getZoom()).toBe(1);
        map.destroy();
    });

    test("zoomIn_IncreasesZoom", () =>
    {
        const map = createSpineMap({ container });
        const initial = map.getZoom();
        map.zoomIn();
        expect(map.getZoom()).toBeGreaterThan(initial);
        map.destroy();
    });

    test("zoomOut_DecreasesZoom", () =>
    {
        const map = createSpineMap({ container });
        const initial = map.getZoom();
        map.zoomOut();
        expect(map.getZoom()).toBeLessThan(initial);
        map.destroy();
    });
});

// ============================================================================
// CONNECTIONS
// ============================================================================

describe("connections", () =>
{
    test("addConnection_IncreasesCount", () =>
    {
        const map = createSpineMap({
            container,
            data: buildTestData()
        });
        const initial = map.getConnections().length;
        map.addConnection({
            from: "hub-1",
            to: "hub-2",
            type: "works-with"
        });
        expect(map.getConnections().length).toBe(initial + 1);
        map.destroy();
    });

    test("removeConnection_DecreasesCount", () =>
    {
        const map = createSpineMap({
            container,
            data: buildTestData()
        });
        const initial = map.getConnections().length;
        map.removeConnection("branch-1", "branch-2");
        expect(map.getConnections().length).toBe(initial - 1);
        map.destroy();
    });

    test("getConnections_ReturnsDeepCopy", () =>
    {
        const map = createSpineMap({
            container,
            data: buildTestData()
        });
        const conns1 = map.getConnections();
        const conns2 = map.getConnections();
        expect(conns1).toEqual(conns2);
        expect(conns1).not.toBe(conns2);
        map.destroy();
    });
});

// ============================================================================
// CALLBACKS
// ============================================================================

describe("callbacks", () =>
{
    // THIS BLOCK QUERIED `[data-node-id]`, AND SPINEMAP HAS NEVER
    // WRITTEN THAT ATTRIBUTE. The groups carry `data-id`, so the
    // query returned nothing, the guard never opened, and the two
    // PointerEvents were never dispatched — which hid a second
    // mismatch, because `attachNodeEvents` listens for `click` and
    // not for pointerdown/pointerup. The block then asserted
    // `expect(map).toBeDefined()` and a comment said the callback
    // "may or may not be called". It was never called once. A guard
    // probe found it: a must-fail assertion placed inside the `if`
    // was the only one of seventeen in this sweep that stayed green.
    test("onNodeClick_CalledOnNodeClick", () =>
    {
        const onNodeClick = vi.fn();
        const map = createSpineMap({
            container,
            data: buildTestData(),
            onNodeClick
        });

        const group = map.getElement().querySelector("[data-id='branch-1']");

        group!.dispatchEvent(new MouseEvent("click", { bubbles: true }));

        // The handle gets the NODE, not its id, so asserting the
        // argument is what tells a reader which branch was hit.
        expect(onNodeClick).toHaveBeenCalledTimes(1);
        expect(onNodeClick.mock.calls[0][0]).toMatchObject({
            id: "branch-1",
            label: "Branch A",
        });

        map.destroy();
    });
});

// ============================================================================
// ARIA ACCESSIBILITY
// ============================================================================

describe("ARIA accessibility", () =>
{
    test("liveRegion_HasAriaLivePolite", () =>
    {
        const map = createSpineMap({ container });
        const live = getLiveRegion(map.getElement());
        expect(live).not.toBeNull();
        expect(live?.getAttribute("aria-live")).toBe("polite");
        map.destroy();
    });

    test("liveRegion_HasAriaAtomic", () =>
    {
        const map = createSpineMap({ container });
        const live = getLiveRegion(map.getElement());
        expect(live?.getAttribute("aria-atomic")).toBe("true");
        map.destroy();
    });
});

// ============================================================================
// DESTROY
// ============================================================================

describe("destroy", () =>
{
    test("destroy_RemovesRootFromDom", () =>
    {
        const map = createSpineMap({
            container,
            data: buildTestData()
        });
        expect(container.children.length).toBeGreaterThan(0);
        map.destroy();
        expect(container.querySelector(".spinemap")).toBeNull();
    });

    test("destroy_CalledTwice_NoThrow", () =>
    {
        const map = createSpineMap({ container });
        map.destroy();
        expect(() => map.destroy()).not.toThrow();
    });
});

// ============================================================================
// EXPORT
// ============================================================================

describe("export", () =>
{
    test("exportSVG_ReturnsSvgString", () =>
    {
        const map = createSpineMap({
            container,
            data: buildTestData()
        });
        const svg = map.exportSVG();
        expect(typeof svg).toBe("string");
        expect(svg).toContain("<svg");
        map.destroy();
    });

    test("exportJSON_ReturnsValidJsonString", () =>
    {
        const map = createSpineMap({
            container,
            data: buildTestData()
        });
        const json = map.exportJSON();
        expect(typeof json).toBe("string");
        const parsed = JSON.parse(json);
        expect(parsed.hubs).toBeDefined();
        map.destroy();
    });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe("edge cases", () =>
{
    test("emptyData_NoThrow", () =>
    {
        expect(() =>
        {
            const map = createSpineMap({
                container,
                data: { hubs: [] }
            });
            map.destroy();
        }).not.toThrow();
    });

    test("loadData_WithNullConnections_HandledGracefully", () =>
    {
        // DEBT-TEST-1b. "Handled gracefully" has to mean the hub
        // still RENDERED with the connections omitted — a loadData
        // that bailed on the missing key would also not throw
        // (ADR-215).
        const map = createSpineMap({ container });

        map.loadData({
            hubs: [
                {
                    id: "h",
                    label: "Hub",
                    status: "available",
                    branches: []
                }
            ]
            // connections omitted
        });

        expect(container.querySelectorAll(".spinemap-hub")).toHaveLength(1);
        expect(container.textContent).toContain("Hub");

        map.destroy();
    });

    test("addHub_WithoutId_GeneratesId", () =>
    {
        const map = createSpineMap({
            container,
            data: buildMinimalData()
        });
        map.addHub({
            id: "",
            label: "Auto ID Hub",
            status: "available",
            branches: []
        });
        // Should have 2 hubs total, and the new one should have an id
        const data = map.getData();
        expect(data.hubs.length).toBe(2);
        const newHub = data.hubs[1];
        expect(newHub.id).toBeTruthy();
        map.destroy();
    });
});
