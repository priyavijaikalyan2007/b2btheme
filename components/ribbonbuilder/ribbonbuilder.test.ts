/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * TESTS: RibbonBuilder
 * Vitest unit tests for the RibbonBuilder component.
 * Covers: factory, options, DOM structure, ARIA, config management,
 * export (JSON/Markdown), import, handle methods, and edge cases.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import
{
    createRibbonBuilder,
} from "./ribbonbuilder";
// DEBT-TEST-1c. Side-effect import: Ribbon registers
// `window.createRibbon`, which RibbonBuilder resolves its preview
// through. Importing the real one keeps this suite out of the
// stand-in census (ADR-203).
import "../ribbon/ribbon";
import type
{
    RibbonBuilderOptions,
    RibbonBuilderHandle,
    RibbonOptions,
} from "./ribbonbuilder";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLElement;

function makeOptions(
    overrides?: Partial<RibbonBuilderOptions>
): RibbonBuilderOptions
{
    return {
        container: container,
        ...overrides,
    };
}

function makeConfig(): RibbonOptions
{
    return {
        tabs: [
            {
                id: "home",
                label: "Home",
                groups: [
                    {
                        id: "clipboard",
                        label: "Clipboard",
                        controls: [
                            { type: "button", id: "paste", label: "Paste", icon: "bi-clipboard" },
                            { type: "button", id: "copy", label: "Copy", icon: "bi-files" },
                        ],
                    },
                ],
            },
        ],
    };
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    container = document.createElement("div");
    container.id = "test-ribbonbuilder";
    document.body.appendChild(container);
});

afterEach(() =>
{
    document.body.innerHTML = "";
});

// ============================================================================
// FACTORY — createRibbonBuilder
// ============================================================================

describe("createRibbonBuilder", () =>
{
    test("withContainerId_MountsInContainer", () =>
    {
        const builder = createRibbonBuilder(makeOptions(), "test-ribbonbuilder");
        expect(container.querySelector(".ribbonbuilder")).not.toBeNull();
        builder.destroy();
    });

    test("withoutContainerId_ReturnsUnmountedHandle", () =>
    {
        const builder = createRibbonBuilder(makeOptions());
        expect(typeof builder.getConfig).toBe("function");
        builder.destroy();
    });

    test("returnsRibbonBuilderHandle", () =>
    {
        const builder = createRibbonBuilder(makeOptions());
        expect(typeof builder.show).toBe("function");
        expect(typeof builder.exportMarkdown).toBe("function");
        expect(typeof builder.exportJSON).toBe("function");
        builder.destroy();
    });
});

// ============================================================================
// DOM STRUCTURE
// ============================================================================

describe("DOM structure", () =>
{
    test("rootElement_HasRibbonbuilderClass", () =>
    {
        const builder = createRibbonBuilder(makeOptions(), "test-ribbonbuilder");
        expect(container.querySelector(".ribbonbuilder")).not.toBeNull();
        builder.destroy();
    });

    test("rendersStructureTree", () =>
    {
        const builder = createRibbonBuilder(makeOptions(), "test-ribbonbuilder");
        // Should have a tree-like panel
        const tree = container.querySelector(
            ".ribbonbuilder-tree, [class*='tree']"
        );
        expect(tree).not.toBeNull();
        builder.destroy();
    });

    test("rendersPreviewArea", () =>
    {
        const builder = createRibbonBuilder(makeOptions(), "test-ribbonbuilder");
        const preview = container.querySelector(
            ".ribbonbuilder-preview, [class*='preview']"
        );
        expect(preview).not.toBeNull();
        builder.destroy();
    });
});

// ============================================================================
// ARIA / ACCESSIBILITY
// ============================================================================

describe("accessibility", () =>
{
    test("rootHasRibbonbuilderClass", () =>
    {
        const builder = createRibbonBuilder(makeOptions(), "test-ribbonbuilder");
        const root = container.querySelector(".ribbonbuilder");
        expect(root).not.toBeNull();
        builder.destroy();
    });
});

// ============================================================================
// CONFIG MANAGEMENT
// ============================================================================

describe("config management", () =>
{
    test("getConfig_ReturnsDefaultConfig", () =>
    {
        const builder = createRibbonBuilder(makeOptions(), "test-ribbonbuilder");
        const config = builder.getConfig();
        expect(config.tabs).toBeDefined();
        expect(config.tabs.length).toBeGreaterThan(0);
        builder.destroy();
    });

    test("setConfig_UpdatesInternalConfig", () =>
    {
        const builder = createRibbonBuilder(makeOptions(), "test-ribbonbuilder");
        const newConfig = makeConfig();
        builder.setConfig(newConfig);
        const config = builder.getConfig();
        expect(config.tabs[0].id).toBe("home");
        builder.destroy();
    });

    test("initialConfig_UsedIfProvided", () =>
    {
        const initialConfig = makeConfig();
        const builder = createRibbonBuilder(
            makeOptions({ initialConfig }), "test-ribbonbuilder"
        );
        const config = builder.getConfig();
        expect(config.tabs[0].id).toBe("home");
        builder.destroy();
    });
});

// ============================================================================
// EXPORT — JSON / MARKDOWN
// ============================================================================

describe("export", () =>
{
    test("exportJSON_ReturnsValidJSON", () =>
    {
        // DEBT-TEST-1b. "Valid JSON" was asserted as "JSON.parse did
        // not throw", which `"null"` and `"0"` both satisfy. What the
        // caller needs is the CONFIG back, so that is what is read
        // (ADR-215).
        const builder = createRibbonBuilder(
            makeOptions({ config: makeConfig() }), "test-ribbonbuilder");
        const parsed = JSON.parse(builder.exportJSON());

        expect(parsed.tabs).toHaveLength(1);
        expect(parsed.tabs[0]).toMatchObject({ id: "home", label: "Home" });

        builder.destroy();
    });

    // "ContainsTabData" is a claim about the DATA. An empty array
    // is defined, and so is the `tabs` key of a default config that
    // never saw the one passed in.
    //
    // THE FIXTURE IS DELIBERATELY NOT `makeConfig()`. Its tab is
    // `home` / "Home", which is also the first tab of
    // DEFAULT_STARTER_CONFIG -- so an export that had silently
    // fallen back to the starter would match it exactly. A tab the
    // default does not have is what makes this read the config that
    // was passed in.
    test("exportJSON_ContainsTabData", () =>
    {
        const builder = createRibbonBuilder(makeOptions({
            initialConfig: { tabs: [{ id: "review", label: "Review", groups: [] }] },
        }), "test-ribbonbuilder");

        const parsed = JSON.parse(builder.exportJSON());

        expect(parsed.tabs).toMatchObject([{ id: "review", label: "Review" }]);
        builder.destroy();
    });

    test("exportMarkdown_ReturnsNonEmptyString", () =>
    {
        const builder = createRibbonBuilder(makeOptions(), "test-ribbonbuilder");
        const md = builder.exportMarkdown();
        expect(md.length).toBeGreaterThan(0);
        builder.destroy();
    });
});

// ============================================================================
// IMPORT — JSON
// ============================================================================

describe("import", () =>
{
    test("importJSON_LoadsConfig", () =>
    {
        const builder = createRibbonBuilder(makeOptions(), "test-ribbonbuilder");
        const config = makeConfig();
        builder.importJSON(JSON.stringify(config));
        const result = builder.getConfig();
        expect(result.tabs[0].id).toBe("home");
        builder.destroy();
    });
});

// ============================================================================
// LIFECYCLE
// ============================================================================

describe("lifecycle", () =>
{
    test("show_MountsIntoContainer", () =>
    {
        const builder = createRibbonBuilder(makeOptions());
        builder.show("test-ribbonbuilder");
        expect(container.querySelector(".ribbonbuilder")).not.toBeNull();
        builder.destroy();
    });

    test("destroy_RemovesDOMElements", () =>
    {
        const builder = createRibbonBuilder(makeOptions(), "test-ribbonbuilder");
        builder.destroy();
        expect(container.querySelector(".ribbonbuilder")).toBeNull();
    });
});

// ============================================================================
// CALLBACKS
// ============================================================================

describe("callbacks", () =>
{
    test("onChange_FiresOnConfigMutation", () =>
    {
        const onChange = vi.fn();
        const builder = createRibbonBuilder(
            makeOptions({ onChange }), "test-ribbonbuilder"
        );
        const config = makeConfig();

        builder.setConfig(config);

        // "may fire" was a hedge. setConfig calls mutateConfig, which
        // calls onChange unconditionally, and the test is named for it.
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange.mock.calls[0][0]).toMatchObject({ tabs: config.tabs });

        builder.destroy();
    });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe("edge cases", () =>
{
    // "UsesDefaults" names the defaults, and `config.tabs` being
    // defined would have held for the empty object passed IN.
    // `buildDefaultConfig` falls through to DEFAULT_STARTER_CONFIG
    // when no tab is supplied, and the Home tab is what that means.
    test("emptyInitialConfig_UsesDefaults", () =>
    {
        const builder = createRibbonBuilder(
            makeOptions({ initialConfig: {} }), "test-ribbonbuilder"
        );

        expect(builder.getConfig().tabs).toMatchObject([
            { id: "home", label: "Home", keyTip: "H" },
        ]);
        builder.destroy();
    });

    test("importInvalidJSON_DoesNotCrash", () =>
    {
        // DEBT-TEST-1b. Two things were missing and one of them was
        // already sitting in the body: `errorSpy` was created and
        // never asserted. The other is the invariant — a refused
        // import must leave the PREVIOUS config intact rather than
        // half-applying or emptying it (ADR-215).
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        const builder = createRibbonBuilder(
            makeOptions({ config: makeConfig() }), "test-ribbonbuilder");
        const before = builder.getConfig();

        builder.importJSON("{invalid json}");

        expect(errorSpy).toHaveBeenCalled();
        expect(builder.getConfig()).toEqual(before);

        errorSpy.mockRestore();
        builder.destroy();
    });
});

// ============================================================================
// PREVIEW COMPONENT LIFECYCLE — UNUSED-1
// ============================================================================

describe("components mounted in the preview are destroyed with it", () =>
{
    // `invokeComponentFactory` created a handle per `type:
    // "component"` control and dropped it -- the local was called
    // `instance`, assigned in both branches and never read, which
    // the compiler had been reporting since it was written.
    // `destroyPreview` tore down the ribbon and nothing inside it,
    // and `rebuildPreview` runs on a debounce after every config
    // edit, so editing left one undestroyed component per control
    // per batch, each still holding its document-level listeners.

    /** Waits for the requestAnimationFrame the element factory defers to. */
    function frame(): Promise<void>
    {
        return new Promise((r) => requestAnimationFrame(() => r()));
    }

    /** Waits past the preview debounce. */
    function timers(): Promise<void>
    {
        return new Promise((r) => setTimeout(r, 400));
    }

    function componentConfig(): RibbonOptions
    {
        return {
            tabs: [{
                id: "home", label: "Home",
                groups: [{
                    id: "g", label: "G",
                    controls: [{
                        type: "component", id: "c1", label: "Embedded",
                        componentFactory: "zzTestFactory",
                    } as unknown as RibbonOptions["tabs"][0]["groups"][0]["controls"][0]],
                }],
            }],
        };
    }

    afterEach(() =>
    {
        delete (window as unknown as Record<string, unknown>)["zzTestFactory"];
    });

    test("a rebuild destroys the component the previous one mounted", async () =>
    {
        // THE REAL RIBBON, imported at the top of this file for its
        // `window.createRibbon` registration. A stand-in here would
        // have to call `element()` itself, which is the Ribbon
        // behaviour this test depends on -- asserting it through a
        // stub that performs it proves nothing (ADR-203), and it
        // would be the seventh entry in a stand-in census whose
        // ceiling is six.
        const destroys: number[] = [];
        let made = 0;
        (window as unknown as Record<string, unknown>)["zzTestFactory"] =
            (_id: string, _o: unknown) =>
            {
                const n = made++;
                return { destroy: () => { destroys.push(n); } };
            };

        const builder = createRibbonBuilder(
            makeOptions({ initialConfig: componentConfig() }),
            "test-ribbonbuilder");

        // The FIRST preview is debounced too -- the constructor
        // schedules it rather than building inline.
        await timers();
        await frame();
        expect(made).toBe(1);
        expect(destroys).toEqual([]);

        builder.setConfig(componentConfig());
        await timers();
        await frame();

        expect(made).toBe(2);
        expect(destroys).toEqual([0]);

        builder.destroy();
        expect(destroys).toEqual([0, 1]);
    });
});

// ============================================================================
// SURFACE CONTRACT (additive, readiness step 2 B8)
// ============================================================================

describe("surface contract (B8)", () =>
{
    function toolbarButton(label: string): HTMLElement
    {
        return container.querySelector<HTMLElement>(`.ribbonbuilder-toolbar-btn[title="${label}"]`)!;
    }

    test("on_Change_HearsTheConfig_AfterOnChange_ExactlyOnce", () =>
    {
        const order: unknown[] = [];
        const builder = createRibbonBuilder(makeOptions({ initialConfig: makeConfig(),
            onChange: (c) => order.push(`option:${c.tabs.length}`) }), "test-ribbonbuilder");
        builder.on("change", (p) => order.push(p));

        toolbarButton("Add Tab").click();

        expect(order).toHaveLength(2);
        expect(order[0]).toBe("option:2");
        expect(order[1]).toEqual(builder.getConfig());
        builder.destroy();
    });

    test("on_Export_HearsTheMarkdown_AfterOnExport", () =>
    {
        const order: unknown[] = [];
        const builder = createRibbonBuilder(makeOptions({ initialConfig: makeConfig(),
            onExport: () => order.push("option") }), "test-ribbonbuilder");
        builder.on("export", (p) => order.push(p));

        toolbarButton("Export MD").click();

        expect(order).toEqual(["option", builder.exportMarkdown()]);
        builder.destroy();
    });

    test("on_Change_WithoutOnChange_StillEmits_AndUnsubscribeStopsIt", () =>
    {
        const heard = vi.fn();
        const builder = createRibbonBuilder(makeOptions(), "test-ribbonbuilder");
        const off = builder.on("change", heard);

        toolbarButton("Add Tab").click();
        off();
        toolbarButton("Add Tab").click();

        expect(heard).toHaveBeenCalledTimes(1);
        builder.destroy();
    });

    test("on_UnknownChannel_Throws_SetDataThrows_StateIsEmpty", () =>
    {
        const builder = createRibbonBuilder(makeOptions());

        builder.setState({ anything: 1 });

        expect(() => builder.on("import", vi.fn())).toThrow(/"change" and "export"/);
        expect(() => builder.setData("config", {})).toThrow(/no data slots/);
        expect(builder.getState()).toEqual({});
        builder.destroy();
    });
});
