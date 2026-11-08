/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */

/**
 * ⚓ TESTS: SymbolPicker Font Awesome brands. A rule after the brands
 *    @font-face is a brand icon, filed under "Brands (FA)" and drawn and
 *    stored as "fa-brands fa-<name>"; a consumer's char may be a full Font
 *    Awesome class. Its own file because icon discovery is cached per module.
 */

import { afterEach, describe, expect, test } from "vitest";
import { SymbolPicker } from "./symbolpicker";

// The layout of Font Awesome 6's all.min.css: icon rules, then the brands
// face and the brand rules, then the free faces.
const FA_CSS = `.fa-user::before{content:"\\f007"}
.fa-house::before{content:"\\f015"}
@font-face{font-family:"Font Awesome 6 Brands";src:url(fa-brands-400.woff2)}
.fa-brands,.fab{font-weight:400}
.fa-github::before{content:"\\f09b"}
.fa-gitlab::before{content:"\\f296"}
@font-face{font-family:"Font Awesome 6 Free";font-weight:900;src:url(fa-solid-900.woff2)}
.fa-solid,.fas{font-weight:900}`;

function mount(): void
{
    const el = document.createElement("div");
    el.id = "sp-brands";
    document.body.appendChild(el);
}

function addStyle(css: string): void
{
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
}

function cellClass(root: HTMLElement, code: string): string | undefined
{
    return root.querySelector(`.symbolpicker-cell-icon[data-code="${code}"] i`)?.className;
}

afterEach(() =>
{
    document.body.innerHTML = "";
    document.head.querySelectorAll("style").forEach((s) => s.remove());
});

describe("SymbolPicker Font Awesome brands", () =>
{
    test("files brand rules under Brands (FA) and draws and stores them as fa-brands", () =>
    {
        addStyle(FA_CSS);
        mount();
        const picker = new SymbolPicker({ mode: "icons", inline: true, showRecent: false });
        picker.show("sp-brands");
        const root = picker.getElement() as HTMLElement;

        expect(root.textContent).toContain("Brands (FA)");
        expect(cellClass(root, "fa-brands fa-github")).toBe("fa-brands fa-github");
        expect(cellClass(root, "fa-brands fa-gitlab")).toBe("fa-brands fa-gitlab");
        expect(root.querySelector('.symbolpicker-cell-icon[data-code="fa-github"]')).toBeNull();

        // Icon rules outside the brands section keep their bare code and probed style.
        expect(cellClass(root, "fa-user")).toMatch(/^fa-\w+ fa-user$/);
        expect(cellClass(root, "fa-user")).not.toContain("fa-brands");

        picker.setValue("fa-brands fa-github");
        expect(picker.getValue()).toBe("fa-brands fa-github");
        picker.destroy();
    });

    test("a consumer item whose char is a full Font Awesome class is drawn with it", () =>
    {
        mount();
        const items = [
            { char: "fa-brands fa-github", name: "GitHub", code: "fa-brands fa-github", category: "ico-mine" },
            { char: "fa-regular fa-calendar", name: "Calendar", code: "fa-regular fa-calendar",
                category: "ico-mine" },
        ];
        const picker = new SymbolPicker({ mode: "icons", inline: true, showRecent: false,
            categories: [{ id: "ico-mine", label: "Mine", items }] });
        picker.show("sp-brands");
        const root = picker.getElement() as HTMLElement;
        expect(cellClass(root, "fa-brands fa-github")).toBe("fa-brands fa-github");
        expect(cellClass(root, "fa-regular fa-calendar")).toBe("fa-regular fa-calendar");
        picker.destroy();
    });
});
