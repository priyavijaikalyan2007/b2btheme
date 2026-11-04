/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */

/**
 * ⚓ TESTS: SymbolPicker icon packs. Icons from a loaded CDN icon-pack
 *    stylesheet (docs/ICON_PACKS.md) are discovered, filed by their pack
 *    folder and drawn with their class. Its own file because icon discovery
 *    is cached per module.
 */

import { afterEach, describe, expect, test } from "vitest";
import { SymbolPicker } from "./symbolpicker";

const PACK_CSS = `[class^="fluent-ui-"],[class*=" fluent-ui-"]{display:inline-block;width:1em;height:1em}
.fluent-ui-table-24-color{background-image:url("data-charts/table-24-color.svg")}
.fluent-ui-cut-16-regular{background-color:currentColor;mask:url("text-editing/cut-16-regular.svg") center/contain no-repeat}
.unrelated-rule{color:red}`;

function mount(): HTMLDivElement
{
    const el = document.createElement("div");
    el.id = "sp-packs";
    document.body.appendChild(el);
    return el;
}

afterEach(() =>
{
    document.body.innerHTML = "";
    document.head.querySelectorAll("style").forEach((s) => s.remove());
});

describe("SymbolPicker icon packs", () =>
{
    test("discovers pack icons from a loaded stylesheet and draws them with their class", () =>
    {
        const style = document.createElement("style");
        style.textContent = PACK_CSS;
        document.head.appendChild(style);
        mount();
        const picker = new SymbolPicker({ mode: "icons", inline: true, showRecent: false });
        picker.show("sp-packs");
        const root = picker.getElement() as HTMLElement;
        const icons = [...root.querySelectorAll(".symbolpicker-cell-icon i")].map((i) => i.className);
        expect(icons).toEqual(expect.arrayContaining(["fluent-ui-table-24-color", "fluent-ui-cut-16-regular"]));
        expect(icons).not.toContain("unrelated-rule");
        const table = root.querySelector('.symbolpicker-cell-icon[data-code="fluent-ui-table-24-color"]');
        expect(table?.getAttribute("title")).toBe("Table (24 color)");
        expect(root.textContent).toContain("Data Charts (fluent-ui)");
        picker.destroy();
    });

    test("a consumer item whose char is a loaded pack class is drawn as that icon", () =>
    {
        const style = document.createElement("style");
        style.textContent = PACK_CSS;
        document.head.appendChild(style);
        mount();
        const item = { char: "fluent-ui-table-24-color", name: "Table", code: "fluent-ui-table-24-color",
            category: "ico-mine" };
        const picker = new SymbolPicker({ mode: "icons", inline: true, showRecent: false,
            categories: [{ id: "ico-mine", label: "Mine", items: [item] }] });
        picker.show("sp-packs");
        const cell = (picker.getElement() as HTMLElement).querySelector(".symbolpicker-cell-icon i");
        expect(cell?.className).toBe("fluent-ui-table-24-color");
        picker.destroy();
    });
});
