/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * E2E: layouts with A2UI children (readiness step 4, ADR-238), under
 * @a2ui/lit and @a2ui/react. A layout's panels hold other A2UI components by
 * id; the agent changing the panels rebuilds the layout and keeps every
 * child's element and the layout's own state.
 */

import { expect, test, type Page } from "@playwright/test";

import { actions, errors, open, send, useHarness, V } from "../a2ui/adapter-page";

useHarness();

const CATALOG = "https://static.outcrop.us/a2ui/catalog/v1.json";

/** Opens `renderer` and sends a surface with every component in `components` (the first is the root). */
async function mount(page: Page, renderer: "lit" | "react", components: Record<string, unknown>[],
    tag = "outcrop-stack-layout"): Promise<void>
{
    await open(page, renderer);
    await send(page, [
        { version: V, createSurface: { surfaceId: "s", catalogId: CATALOG } },
        { version: V, updateComponents: { surfaceId: "s", components } },
        { version: V, updateDataModel: { surfaceId: "s", path: "/", value: {} } },
    ]);
    await page.waitForFunction((t) =>
        (window as unknown as { handleOf(x: string): unknown }).handleOf(t) !== undefined, tag);
}

/** Marks an element so a later check can tell it was kept, not rebuilt. */
async function mark(page: Page, selector: string): Promise<void>
{
    await page.evaluate((sel) => { document.querySelector<HTMLElement>(sel)!.dataset.kept = "yes"; }, selector);
}

/** The actions sent so far, as [name, context.p]. */
async function sent(page: Page): Promise<unknown[][]>
{
    return (await actions(page)).map((a) => [a.name, (a.context as { p: unknown }).p]);
}

/** A stack of a Text panel and a TextField panel, as an agent writes it. */
const PANELS = [{ id: "notes", title: "Notes", content: "note" }, { id: "form", title: "Form", content: "field" }];
const STACK = { id: "root", component: "StackLayout", panels: PANELS };
const CHILDREN = [{ id: "note", component: "Text", text: "Hello from a child" },
    { id: "field", component: "TextField", label: "Name", value: "" }];

/** Renders the stack, collapses Notes, adds a third panel, and checks the children and the collapse survived. */
async function addAPanelKeepingChildren(page: Page, renderer: "lit" | "react"): Promise<void>
{
    await mount(page, renderer, [STACK, ...CHILDREN]);

    const stack = page.locator(".stacklayout");
    await expect(stack.getByText("Hello from a child")).toBeVisible();
    await expect(stack.locator("a2ui-basic-textfield")).toHaveCount(1);
    await page.evaluate(() => { document.querySelector<HTMLElement>("a2ui-basic-textfield")!.dataset.kept = "yes"; });
    await stack.locator(".stacklayout-header", { hasText: "Notes" }).click();
    await expect(stack.locator(".stacklayout-panel-collapsed")).toHaveCount(1);

    await send(page, [{ version: V, updateComponents: { surfaceId: "s", components: [
        { ...STACK, panels: [...PANELS, { id: "more", title: "More", content: "extra" }] },
        { id: "extra", component: "Text", text: "A third child" }] } }]);

    await expect(stack.getByText("A third child")).toBeVisible();
    await expect(page.locator("a2ui-basic-textfield[data-kept='yes']")).toHaveCount(1);
    await expect(page.locator(".stacklayout-panel-collapsed")).toHaveCount(1);
    expect(await errors(page)).toEqual([]);
}

test.describe("Layouts with A2UI children", () =>
{
    test("StackLayout: panels render their A2UI children, and adding a panel keeps them and the collapse (Lit)",
        async ({ page }) => { await addAPanelKeepingChildren(page, "lit"); });

    test("StackLayout: panels render their A2UI children, and adding a panel keeps them and the collapse (React)",
        async ({ page }) => { await addAPanelKeepingChildren(page, "react"); });

    test("StackLayout: a child that arrives after the layout fills its panel", async ({ page }) =>
    {
        await mount(page, "lit", [STACK, CHILDREN[0]]);
        await expect(page.locator(".outcrop-child-pending")).toHaveCount(1);

        await send(page, [{ version: V, updateComponents: { surfaceId: "s", components: [CHILDREN[1]] } }]);

        await expect(page.locator(".stacklayout a2ui-basic-textfield")).toHaveCount(1);
        await expect(page.locator(".outcrop-child-pending")).toHaveCount(0);
        expect(await errors(page)).toEqual([]);
    });

    test("StackLayout: collapsing a panel sends onCollapse, and dragging a divider sends onResize", async ({ page }) =>
    {
        await mount(page, "lit", [{ ...STACK, eventData: { path: "/ev" },
            onCollapse: { event: { name: "fold", context: { p: { path: "/ev/collapse" } } } },
            onResize: { event: { name: "size", context: { p: { path: "/ev/resize" } } } } }, ...CHILDREN]);

        await page.locator(".stacklayout-header", { hasText: "Notes" }).click();
        await expect.poll(async () => (await actions(page)).map((a) => [a.name, (a.context as { p: unknown }).p]))
            .toEqual([["fold", { panelId: "notes", collapsed: true }]]);

        await page.locator(".stacklayout-header", { hasText: "Notes" }).click();
        const box = (await page.locator(".stacklayout-divider").boundingBox())!;
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 40, { steps: 4 });
        await page.mouse.up();

        await expect.poll(async () => (await actions(page)).filter((a) => a.name === "size").length)
            .toBeGreaterThan(0);
        const size = (await actions(page)).find((a) => a.name === "size")!;
        expect((size.context as { p: number[] }).p).toHaveLength(2);
        expect(await errors(page)).toEqual([]);
    });

    test("StackLayout: two layouts that hold each other are reported, not built forever", async ({ page }) =>
    {
        await open(page, "lit");
        await send(page, [
            { version: V, createSurface: { surfaceId: "s", catalogId: CATALOG } },
            { version: V, updateComponents: { surfaceId: "s", components: [
                { id: "root", component: "StackLayout", panels: [{ id: "a", title: "A", content: "inner" }] },
                { id: "inner", component: "StackLayout", panels: [{ id: "b", title: "B", content: "root" }] }] } },
        ]);

        await expect.poll(() => errors(page)).toEqual([expect.objectContaining({ code: "VALIDATION_FAILED",
            message: expect.stringMatching(/lists "root", which contains it, as a child/) })]);
        await expect(page.locator(".stacklayout")).toHaveCount(2);
    });
});

// ============================================================================
// L1: BorderLayout, SplitLayout, TabbedPanel (ADR-239)
// ============================================================================

const HEADER = { id: "head", component: "Text", text: "A header child" };
const FIELD = { id: "field", component: "TextField", label: "Name", value: "" };

/** A border layout with a header and a TextField in the center; replacing the header keeps the field. */
async function borderKeepsChildren(page: Page, renderer: "lit" | "react"): Promise<void>
{
    const border = { id: "root", component: "BorderLayout", north: "head", center: "field" };
    await mount(page, renderer, [border, HEADER, FIELD], "outcrop-border-layout");

    const layout = page.locator(".borderlayout");
    await expect(layout.getByText("A header child")).toBeVisible();
    await expect(layout.locator("a2ui-basic-textfield")).toBeVisible();
    await mark(page, "a2ui-basic-textfield");

    await send(page, [{ version: V, updateComponents: { surfaceId: "s", components: [
        { ...border, north: "head2", south: "foot" },
        { id: "head2", component: "Text", text: "A new header" },
        { id: "foot", component: "Text", text: "A footer child" }] } }]);

    await expect(layout.getByText("A new header")).toBeVisible();
    await expect(layout.getByText("A footer child")).toBeVisible();
    await expect(page.locator("a2ui-basic-textfield[data-kept='yes']")).toHaveCount(1);
    expect(await errors(page)).toEqual([]);
}

const PANES = [{ id: "left", collapsible: true, content: "head" }, { id: "right", content: "field" }];
const SPLIT = { id: "root", component: "SplitLayout", orientation: "horizontal", panes: PANES };

/** A tabbed panel with a Text tab and a TextField tab. */
const TABS = [{ id: "notes", title: "Notes", content: "head" }, { id: "form", title: "Form", closable: true,
    content: "field" }];
const TABBED = { id: "root", component: "TabbedPanel", tabs: TABS };

/** Selects the Form tab, adds a tab, and checks the active tab and the TextField survived the rebuild. */
async function tabbedKeepsChildrenAndTab(page: Page, renderer: "lit" | "react"): Promise<void>
{
    await mount(page, renderer, [TABBED, HEADER, FIELD], "outcrop-tabbed-panel");

    const panel = page.locator(".tabbedpanel");
    await expect(panel.getByText("A header child")).toBeVisible();
    await panel.getByRole("tab", { name: "Form" }).click();
    await expect(panel.locator("a2ui-basic-textfield")).toBeVisible();
    await mark(page, "a2ui-basic-textfield");

    await send(page, [{ version: V, updateComponents: { surfaceId: "s", components: [
        { ...TABBED, tabs: [...TABS, { id: "more", title: "More", content: "extra" }] },
        { id: "extra", component: "Text", text: "A third child" }] } }]);

    await expect(panel.getByRole("tab", { name: "More" })).toBeVisible();
    await expect(panel.getByRole("tab", { name: "Form" })).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("a2ui-basic-textfield[data-kept='yes']")).toBeVisible();
    expect(await errors(page)).toEqual([]);
}

test.describe("Layouts with A2UI children, L1", () =>
{
    test("BorderLayout: regions render their A2UI children, and changing regions keeps the rest (Lit)",
        async ({ page }) => { await borderKeepsChildren(page, "lit"); });

    test("BorderLayout: regions render their A2UI children, and changing regions keeps the rest (React)",
        async ({ page }) => { await borderKeepsChildren(page, "react"); });

    test("SplitLayout: arrow keys on a divider send onResize, Home sends onCollapse, and orientation flips in place",
        async ({ page }) =>
        {
            await mount(page, "lit", [{ ...SPLIT, eventData: { path: "/ev" },
                onResize: { event: { name: "size", context: { p: { path: "/ev/resize" } } } },
                onCollapse: { event: { name: "fold", context: { p: { path: "/ev/collapse" } } } } }, HEADER, FIELD],
            "outcrop-split-layout");

            const layout = page.locator(".splitlayout");
            await expect(layout.getByText("A header child")).toBeVisible();
            await expect(layout.locator("a2ui-basic-textfield")).toBeVisible();

            const divider = layout.locator(".splitlayout-divider");
            await divider.focus();
            await page.keyboard.press("ArrowRight");
            await expect.poll(async () => (await sent(page)).filter(([n]) => n === "size").length).toBe(1);
            const size = (await sent(page)).find(([n]) => n === "size")![1] as Record<string, number>;
            expect(Object.keys(size).sort()).toEqual(["left", "right"]);

            await page.keyboard.press("Home");
            await expect.poll(async () => (await sent(page)).filter(([n]) => n === "fold"))
                .toEqual([["fold", { paneId: "left", collapsed: true }]]);

            // A rebuild would replace the layout's root; the state route keeps it.
            await mark(page, ".splitlayout");
            await mark(page, "a2ui-basic-textfield");
            await send(page, [{ version: V, updateComponents: { surfaceId: "s", components: [
                { ...SPLIT, orientation: "vertical" }] } }]);

            await expect(page.locator(".splitlayout-vertical[data-kept='yes']")).toHaveCount(1);
            await expect(page.locator("a2ui-basic-textfield[data-kept='yes']")).toHaveCount(1);
            expect(await errors(page)).toEqual([]);
        });

    test("TabbedPanel: tabs render their A2UI children, and adding a tab keeps them and the active tab (Lit)",
        async ({ page }) => { await tabbedKeepsChildrenAndTab(page, "lit"); });

    test("TabbedPanel: tabs render their A2UI children, and adding a tab keeps them and the active tab (React)",
        async ({ page }) => { await tabbedKeepsChildrenAndTab(page, "react"); });

    test("TabbedPanel: is contained, closing a tab sends onTabClose, and collapsing sends onCollapse",
        async ({ page }) =>
        {
            await mount(page, "lit", [{ ...TABBED, eventData: { path: "/ev" },
                onTabClose: { event: { name: "closed", context: { p: { path: "/ev/tabClose" } } } },
                onCollapse: { event: { name: "fold", context: { p: { path: "/ev/collapse" } } } } }, HEADER, FIELD],
            "outcrop-tabbed-panel");

            const panel = page.locator(".tabbedpanel");
            await expect(panel).toHaveClass(/tabbedpanel-contained/);
            await expect(panel.locator(".tabbedpanel-float-btn:visible, .tabbedpanel-close-btn:visible"))
                .toHaveCount(0);

            await panel.locator(".tabbedpanel-tab-close").click();
            await expect.poll(() => sent(page)).toEqual([["closed", { tabId: "form" }]]);
            await expect(panel.getByRole("tab", { name: "Form" })).toHaveCount(0);

            await panel.locator(".tabbedpanel-tabbar .tabbedpanel-collapse-btn").click();
            await expect.poll(async () => (await sent(page)).filter(([n]) => n === "fold"))
                .toEqual([["fold", { collapsed: true }]]);
            expect(await errors(page)).toEqual([]);
        });
});

// ============================================================================
// L2: AnchorLayout, BoxLayout, CardLayout, FlexGridLayout, LayerLayout (ADR-240)
// ============================================================================

const BADGE = { id: "badge", component: "Text", text: "A pinned child" };

/** Mounts `root` with HEADER, FIELD and BADGE, and checks every text child it names renders inside `selector`. */
async function rendersChildren(page: Page, renderer: "lit" | "react", root: Record<string, unknown>, tag: string,
    selector: string, texts: string[]): Promise<void>
{
    await mount(page, renderer, [root, HEADER, FIELD, BADGE], tag);

    for (const text of texts) { await expect(page.locator(selector).getByText(text)).toBeVisible(); }
    expect(await errors(page)).toEqual([]);
}

const BOX = { id: "root", component: "BoxLayout", direction: "horizontal",
    children: [{ child: "head" }, { child: "field", flex: 1 }] };
const CARDS = { id: "root", component: "CardLayout", activeKey: "one",
    cards: [{ key: "one", child: "head" }, { key: "two", child: "field" }] };

test.describe("Layouts with A2UI children, L2", () =>
{
    test("AnchorLayout: anchored children render inside the layout", async ({ page }) =>
    {
        await rendersChildren(page, "lit", { id: "root", component: "AnchorLayout", children: [
            { child: "head", anchorTop: 0, anchorLeft: 0 }, { child: "badge", anchorBottom: 8, anchorRight: 8 }] },
        "outcrop-anchor-layout", ".anchorlayout", ["A header child", "A pinned child"]);
    });

    test("FlexGridLayout: cells render their children in the grid", async ({ page }) =>
    {
        await rendersChildren(page, "react", { id: "root", component: "FlexGridLayout", columns: ["1fr", "1fr"],
            cells: [{ child: "head", column: 0, row: 0 }, { child: "badge", column: 1, row: 0 }] },
        "outcrop-flex-grid-layout", ".flexgridlayout", ["A header child", "A pinned child"]);
    });

    test("LayerLayout: layers stack their children", async ({ page }) =>
    {
        await rendersChildren(page, "lit", { id: "root", component: "LayerLayout",
            layers: [{ child: "head", fill: true }, { child: "badge", align: "bottom-right" }] },
        "outcrop-layer-layout", ".layerlayout", ["A header child", "A pinned child"]);
    });

    test("BoxLayout: an agent's direction change sticks after the rebuild, and the children are kept (ADR-240)",
        async ({ page }) =>
        {
            await mount(page, "lit", [BOX, HEADER, FIELD], "outcrop-box-layout");
            await expect(page.locator(".boxlayout a2ui-basic-textfield")).toBeVisible();
            await mark(page, "a2ui-basic-textfield");

            await send(page, [{ version: V, updateComponents: { surfaceId: "s", components: [
                { ...BOX, direction: "vertical" }] } }]);

            await expect(page.locator(".boxlayout")).toHaveCSS("flex-direction", "column");
            await expect(page.locator("a2ui-basic-textfield[data-kept='yes']")).toHaveCount(1);
            expect(await errors(page)).toEqual([]);
        });

    test("CardLayout: an agent's activeKey switches cards in place, and a rebuild keeps the user's card (React)",
        async ({ page }) =>
        {
            await mount(page, "react", [CARDS, HEADER, FIELD], "outcrop-card-layout");
            const layout = page.locator(".cardlayout");
            await expect(layout.getByText("A header child")).toBeVisible();

            await mark(page, ".cardlayout");
            await send(page, [{ version: V, updateComponents: { surfaceId: "s", components: [
                { ...CARDS, activeKey: "two" }] } }]);
            await expect(layout.locator("a2ui-basic-textfield")).toBeVisible();
            await expect(page.locator(".cardlayout[data-kept='yes']")).toHaveCount(1);

            // The user arrows back to the first card; adding a card rebuilds and keeps it shown.
            await layout.focus();
            await page.keyboard.press("ArrowLeft");
            await expect(layout.getByText("A header child")).toBeVisible();
            await send(page, [{ version: V, updateComponents: { surfaceId: "s", components: [
                { ...CARDS, activeKey: "two", cards: [...CARDS.cards, { key: "three", child: "badge" }] },
                BADGE] } }]);
            await expect(page.locator(".cardlayout[data-kept='yes']")).toHaveCount(0);
            await expect(page.locator(".cardlayout").getByText("A header child")).toBeVisible();
            expect(await errors(page)).toEqual([]);
        });
});
