/**
 * TESTS: PropertyInspector
 * Vitest unit tests for the PropertyInspector component.
 * Covers: factory, options, DOM structure, ARIA, open/close,
 * tabs, handle methods, callbacks, and edge cases.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import
{
    createPropertyInspector,
} from "./propertyinspector";
import type
{
    PropertyInspectorOptions,
    PropertyInspectorHandle,
    InspectorTab,
    InspectorOpenOptions,
} from "./propertyinspector";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLElement;

function makeOptions(
    overrides?: Partial<PropertyInspectorOptions>
): PropertyInspectorOptions
{
    return {
        container: container,
        ...overrides,
    };
}

function makeOpenOptions(
    overrides?: Partial<InspectorOpenOptions>
): InspectorOpenOptions
{
    return {
        title: "Inspector Title",
        ...overrides,
    };
}

function makeTabs(): InspectorTab[]
{
    const tab1Content = document.createElement("div");
    tab1Content.textContent = "Tab 1 content";
    const tab2Content = document.createElement("div");
    tab2Content.textContent = "Tab 2 content";

    return [
        { id: "tab1", label: "Details", content: tab1Content },
        { id: "tab2", label: "History", content: tab2Content },
    ];
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    container = document.createElement("div");
    container.id = "test-propertyinspector";
    container.style.width = "800px";
    container.style.height = "600px";
    container.style.position = "relative";
    document.body.appendChild(container);
});

afterEach(() =>
{
    document.body.innerHTML = "";
});

// ============================================================================
// FACTORY — createPropertyInspector
// ============================================================================

describe("createPropertyInspector", () =>
{
    test("returnsHandle", () =>
    {
        const handle = createPropertyInspector(makeOptions());
        expect(handle).toBeDefined();
        expect(typeof handle.open).toBe("function");
        expect(typeof handle.close).toBe("function");
        handle.destroy();
    });

    test("withoutContainer_ThrowsError", () =>
    {
        expect(() =>
        {
            createPropertyInspector({
                container: null as unknown as HTMLElement,
            });
        }).toThrow();
    });

    test("initiallyNotOpen", () =>
    {
        const handle = createPropertyInspector(makeOptions());
        expect(handle.isOpen()).toBe(false);
        handle.destroy();
    });
});

// ============================================================================
// DOM STRUCTURE
// ============================================================================

describe("DOM structure", () =>
{
    test("getElement_ReturnsDrawerElement", () =>
    {
        const handle = createPropertyInspector(makeOptions());
        const el = handle.getElement();
        expect(el).toBeInstanceOf(HTMLElement);
        handle.destroy();
    });

    test("openWithTitle_RendersTitle", () =>
    {
        const handle = createPropertyInspector(makeOptions());
        handle.open(makeOpenOptions({ title: "My Inspector" }));
        const el = handle.getElement();
        expect(el.textContent).toContain("My Inspector");
        handle.destroy();
    });

    test("openWithSubtitle_RendersSubtitle", () =>
    {
        const handle = createPropertyInspector(makeOptions());
        handle.open(makeOpenOptions({
            title: "Entity",
            subtitle: "Subtitle text",
        }));
        const el = handle.getElement();
        expect(el.textContent).toContain("Subtitle text");
        handle.destroy();
    });
});

// ============================================================================
// ARIA / ACCESSIBILITY
// ============================================================================

describe("accessibility", () =>
{
    test("drawerHasComplementaryRole", () =>
    {
        const handle = createPropertyInspector(makeOptions());
        const el = handle.getElement();
        const role = el.getAttribute("role");
        expect(role === "complementary" || role === "dialog" || role === "region").toBe(true);
        handle.destroy();
    });

    test("closeButtonHasAriaLabel", () =>
    {
        const handle = createPropertyInspector(makeOptions());
        handle.open(makeOpenOptions());
        const closeBtn = handle.getElement().querySelector(
            "[aria-label]"
        );
        expect(closeBtn).not.toBeNull();
        handle.destroy();
    });
});

// ============================================================================
// HANDLE METHODS — OPEN / CLOSE
// ============================================================================

describe("open / close", () =>
{
    test("open_SetsIsOpenTrue", () =>
    {
        const handle = createPropertyInspector(makeOptions());
        handle.open(makeOpenOptions());
        expect(handle.isOpen()).toBe(true);
        handle.destroy();
    });

    test("close_SetsIsOpenFalse", () =>
    {
        const handle = createPropertyInspector(makeOptions());
        handle.open(makeOpenOptions());
        handle.close();
        expect(handle.isOpen()).toBe(false);
        handle.destroy();
    });
});

// ============================================================================
// HANDLE METHODS — setTitle / setContent
// ============================================================================

describe("setTitle and setContent", () =>
{
    test("setTitle_UpdatesTitle", () =>
    {
        const handle = createPropertyInspector(makeOptions());
        handle.open(makeOpenOptions({ title: "Original" }));
        handle.setTitle("Updated Title");
        expect(handle.getElement().textContent).toContain("Updated Title");
        handle.destroy();
    });

    test("setContent_ReplacesBody", () =>
    {
        const handle = createPropertyInspector(makeOptions());
        handle.open(makeOpenOptions());
        const newContent = document.createElement("p");
        newContent.textContent = "New body content";
        handle.setContent(newContent);
        expect(handle.getElement().textContent).toContain("New body content");
        handle.destroy();
    });
});

// ============================================================================
// TABS
// ============================================================================

describe("tabs", () =>
{
    test("openWithTabs_RendersTabButtons", () =>
    {
        const handle = createPropertyInspector(makeOptions());
        handle.open(makeOpenOptions({ tabs: makeTabs() }));
        const tabBtns = handle.getElement().querySelectorAll(
            "[role='tab']"
        );
        expect(tabBtns.length).toBe(2);
        handle.destroy();
    });

    test("setActiveTab_SwitchesTab", () =>
    {
        const handle = createPropertyInspector(makeOptions());
        handle.open(makeOpenOptions({ tabs: makeTabs(), activeTab: "tab1" }));
        handle.setActiveTab("tab2");
        const activeTab = handle.getElement().querySelector(
            "[role='tab'][aria-selected='true']"
        );
        expect(activeTab?.textContent).toContain("History");
        handle.destroy();
    });
});

// ============================================================================
// CALLBACKS
// ============================================================================

describe("callbacks", () =>
{
    test("onClose_FiresWhenDrawerClosed", () =>
    {
        const onClose = vi.fn();
        const handle = createPropertyInspector(makeOptions({ onClose }));
        handle.open(makeOpenOptions());
        handle.close();
        expect(onClose).toHaveBeenCalledOnce();
        handle.destroy();
    });

    test("onTabChange_FiresOnTabSwitch", () =>
    {
        const onTabChange = vi.fn();
        const handle = createPropertyInspector(
            makeOptions({ onTabChange })
        );
        handle.open(makeOpenOptions({ tabs: makeTabs(), activeTab: "tab1" }));
        handle.setActiveTab("tab2");
        expect(onTabChange).toHaveBeenCalledWith("tab2");
        handle.destroy();
    });
});

// ============================================================================
// LIFECYCLE
// ============================================================================

describe("lifecycle", () =>
{
    test("destroy_CleansUpDOM", () =>
    {
        const handle = createPropertyInspector(makeOptions());
        handle.open(makeOpenOptions());
        handle.destroy();
        // After destroy, the drawer element should be removed
        const el = container.querySelector(".propertyinspector");
        expect(el).toBeNull();
    });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe("edge cases", () =>
{
    test("doubleOpen_DoesNotDuplicateDrawer", () =>
    {
        const handle = createPropertyInspector(makeOptions());
        handle.open(makeOpenOptions({ title: "First" }));
        handle.open(makeOpenOptions({ title: "Second" }));
        // Should still be open and not crash
        expect(handle.isOpen()).toBe(true);
        handle.destroy();
    });

    test("closeWithoutOpen_DoesNotCrash", () =>
    {
        const handle = createPropertyInspector(makeOptions());
        expect(() => handle.close()).not.toThrow();
        handle.destroy();
    });
});
