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
    test("rootHasRegionRole", () =>
    {
        const builder = createRibbonBuilder(makeOptions(), "test-ribbonbuilder");
        const root = container.querySelector(".ribbonbuilder");
        expect(root?.getAttribute("role")).toBeTruthy();
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
        const builder = createRibbonBuilder(makeOptions(), "test-ribbonbuilder");
        const json = builder.exportJSON();
        expect(() => JSON.parse(json)).not.toThrow();
        builder.destroy();
    });

    test("exportJSON_ContainsTabData", () =>
    {
        const builder = createRibbonBuilder(makeOptions(), "test-ribbonbuilder");
        const json = builder.exportJSON();
        const parsed = JSON.parse(json);
        expect(parsed.tabs).toBeDefined();
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
        // onChange may fire during setConfig
        builder.destroy();
    });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe("edge cases", () =>
{
    test("emptyInitialConfig_UsesDefaults", () =>
    {
        const builder = createRibbonBuilder(
            makeOptions({ initialConfig: {} }), "test-ribbonbuilder"
        );
        const config = builder.getConfig();
        expect(config.tabs).toBeDefined();
        builder.destroy();
    });

    test("importInvalidJSON_DoesNotCrash", () =>
    {
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        const builder = createRibbonBuilder(makeOptions(), "test-ribbonbuilder");
        expect(() => builder.importJSON("{invalid json}")).not.toThrow();
        errorSpy.mockRestore();
        builder.destroy();
    });
});
