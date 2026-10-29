/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * E2E: the seven B5 editors and forms under @a2ui/lit (readiness step 2 B5,
 * ADR-231), with the real libraries the adapter loads first: Vditor for
 * MarkdownEditor, KaTeX for LatexEditor, CodeMirror 6 for CodeEditor
 * (ADR-230). Each event reaches the agent with its payload under eventData;
 * DynamicFormSwitcher's values wait under eventData for the agent's own
 * submit, and a field type that needs host code is rejected.
 */

import { expect, test, type Page } from "@playwright/test";

import { actions, dm, errors, open, send, surface, useHarness } from "../a2ui/adapter-page";

useHarness();

const tagOf = (name: string) => `outcrop-${name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase()}`;

/** Where the surface components write each event's payload. */
const EV = { eventData: { path: "/ev" } };

/** An action prop that sends `name` with the channel's payload as `p`. */
const act = (name: string, channel: string) => ({ event: { name, context: { p: { path: `/ev/${channel}` } } } });

/** Mounts `name` with `props` and `data`, and waits for its handle. */
async function mount(page: Page, name: string, props: Record<string, unknown>, data: Record<string, unknown> = {}):
    Promise<void>
{
    await open(page, "lit");
    await send(page, surface("s", { id: "root", component: name, ...props }, data));
    await page.waitForFunction((t) => (window as unknown as { handleOf(x: string): unknown }).handleOf(t) !== undefined,
        tagOf(name));
}

test.describe("B5 editors and forms under @a2ui/lit", () =>
{
    test("RichTextInput: Ctrl+Enter sends onSubmit with the text", async ({ page }) =>
    {
        await mount(page, "RichTextInput", { ...EV, submitOnCtrlEnter: true, onSubmit: act("send", "submit") });

        await page.locator(".richtextinput-editable").click();
        await page.keyboard.type("Ship it");
        await page.keyboard.press("Control+Enter");

        await expect.poll(() => actions(page)).toEqual([expect.objectContaining({ name: "send",
            context: { p: expect.stringContaining("Ship it") } })]);
        expect(await errors(page)).toEqual([]);
    });

    test("MarkdownEditor: Ctrl+Enter in the real Vditor sends onSave with the markdown", async ({ page }) =>
    {
        await mount(page, "MarkdownEditor", { ...EV, value: "# Notes", onSave: act("save", "save") });

        const editable = page.locator(`${tagOf("MarkdownEditor")} .vditor-ir .vditor-reset`);
        await expect(editable).toBeVisible();
        await editable.click();
        // Vditor reads Cmd on macOS and Ctrl elsewhere.
        await page.keyboard.press("ControlOrMeta+Enter");

        await expect.poll(() => actions(page)).toEqual([expect.objectContaining({ name: "save",
            context: { p: expect.stringContaining("# Notes") } })]);
        await expect(page.locator('head link[href$="/lib/vditor-css-3.11.2/index.css"]'))
            .toHaveAttribute("integrity", /^sha384-/);
        expect(await errors(page)).toEqual([]);
    });

    test("LatexEditor: renders with KaTeX; Ctrl+Enter sends onConfirm with the expression", async ({ page }) =>
    {
        await mount(page, "LatexEditor", { ...EV, value: "x^2", onConfirm: act("math", "confirm") });

        await expect(page.locator(`${tagOf("LatexEditor")} .katex`).first()).toBeVisible();
        await page.locator(".le-source").fill("\\frac{a}{b}");
        await page.locator(".le-source").press("Control+Enter");

        await expect.poll(() => actions(page)).toEqual([expect.objectContaining({ name: "math",
            context: { p: { latex: "\\frac{a}{b}", mathml: "" } } })]);
        expect(await errors(page)).toEqual([]);
    });

    test("CodeEditor: typing in the real CodeMirror writes the value; Save sends onSave", async ({ page }) =>
    {
        await mount(page, "CodeEditor", { ...EV, value: { path: "/v" }, language: "javascript",
            onSave: act("save", "save") }, { v: "let a = 1;" });

        await page.locator(".cm-content").click();
        await page.keyboard.press("End");
        await page.keyboard.type(" // done");
        await expect.poll(() => dm(page, "s", "/v")).toBe("let a = 1; // done");

        await page.locator('[data-action="save"]').click();
        await expect.poll(() => actions(page)).toEqual([expect.objectContaining({ name: "save",
            context: { p: "let a = 1; // done" } })]);
        expect(await errors(page)).toEqual([]);
    });

    test("Stepper: Next sends onStepChange, Save as Draft and Finish send theirs", async ({ page }) =>
    {
        await mount(page, "Stepper", { ...EV, showSaveAsDraft: true, steps: [{ label: "Plan" }, { label: "Review" }],
            onStepChange: act("step", "stepChange"), onSaveDraft: act("draft", "saveDraft"),
            onFinish: act("done", "finish") });

        await page.getByRole("button", { name: "Next" }).click();
        await page.getByRole("button", { name: "Save as Draft" }).click();
        await page.getByRole("button", { name: "Finish" }).click();

        await expect.poll(() => actions(page)).toEqual([
            expect.objectContaining({ name: "step", context: { p: { from: 0, to: 1 } } }),
            expect.objectContaining({ name: "draft", context: { p: 1 } }),
            expect.objectContaining({ name: "done", context: { p: 1 } })]);
        expect(await errors(page)).toEqual([]);
    });

    test("DynamicFormSwitcher: typing leaves the variant and values under eventData for the agent's submit", async ({ page }) =>
    {
        await mount(page, "DynamicFormSwitcher", { ...EV, initialVariant: "contact", variants: {
            contact: { label: "Contact", fields: [{ name: "email", label: "Email", type: "email" }] } } });

        await page.locator('input[name="email"]').fill("ada@example.com");

        await expect.poll(() => dm(page, "s", "/ev/change"))
            .toEqual({ variantId: "contact", values: { email: "ada@example.com" } });
        expect(await errors(page)).toEqual([]);
    });

    test("DynamicFormSwitcher: a field type that needs host code is rejected", async ({ page }) =>
    {
        await open(page, "lit");
        await send(page, surface("s", { id: "root", component: "DynamicFormSwitcher", initialVariant: "x",
            variants: { path: "/variants" } }, { variants: { x: { label: "X",
            fields: [{ name: "doc", label: "Document", type: "file" }] } } }));

        await expect.poll(() => errors(page)).toEqual([expect.objectContaining({ code: "VALIDATION_FAILED",
            path: "/variants" })]);
    });

    test("InlineToolbar: pressing a toggle sends onItemClick with its id and state", async ({ page }) =>
    {
        await mount(page, "InlineToolbar", { ...EV, onItemClick: act("tool", "itemClick"),
            items: [{ id: "bold", icon: "type-bold", tooltip: "Bold", type: "toggle" }] });

        await page.getByRole("button", { name: "Bold" }).click();

        await expect.poll(() => actions(page)).toEqual([expect.objectContaining({ name: "tool",
            context: { p: { id: "bold", active: true } } })]);
        expect(await errors(page)).toEqual([]);
    });
});
