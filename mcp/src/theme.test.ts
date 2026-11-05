/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: McpViewTheme. The host context as library tokens (spec §6):
 *    the mapping table, theme, fonts and layout height, and that a value
 *    the host stops sending goes back to the library's own.
 */

import { existsSync, readFileSync } from "node:fs";

import { beforeEach, describe, expect, test } from "vitest";

import { applyHostContext, layoutHeight, THEME_MAP, themeDeclarations } from "./theme";

describe("themeDeclarations", () =>
{
    test("maps every host variable in the table to its library tokens", () =>
    {
        expect(Object.fromEntries(themeDeclarations({
            "--color-background-primary": "#101", "--color-background-secondary": "#102",
            "--color-background-tertiary": "#103", "--color-background-inverse": "#104",
            "--color-text-primary": "#201", "--color-text-secondary": "#202", "--color-text-tertiary": "#203",
            "--color-text-inverse": "#204", "--color-border-primary": "#301",
            "--font-sans": "Host Sans", "--font-mono": "Host Mono",
            "--border-radius-sm": "2px", "--border-radius-md": "4px", "--border-radius-lg": "8px",
        }))).toEqual({
            "--theme-surface-bg": "#101", "--theme-surface-raised-bg": "#102", "--theme-surface-sunken-bg": "#103",
            "--theme-surface-inverse-bg": "#104", "--theme-text-primary": "#201", "--theme-text-secondary": "#202",
            "--theme-text-muted": "#203", "--theme-text-on-inverse": "#204", "--theme-border-color": "#301",
            "--bs-font-sans-serif": "Host Sans", "--bs-body-font-family": "Host Sans", "--bs-font-monospace": "Host Mono",
            "--bs-border-radius-sm": "2px", "--bs-border-radius": "4px", "--bs-border-radius-lg": "8px",
        });
    });

    test("declares only what the host sent; unmapped host variables are ignored", () =>
    {
        expect(Object.fromEntries(themeDeclarations({ "--color-text-primary": "#201", "--color-text-danger": "#f00",
            "--color-border-primary": undefined }))).toEqual({ "--theme-text-primary": "#201" });
        expect(themeDeclarations(undefined).size).toBe(0);
    });
});

describe("THEME_MAP", () =>
{
    test("every library token it writes is one the theme CSS declares", () =>
    {
        const css = "dist/css/custom.css";

        if (!existsSync(css)) { throw new Error(`${css} is absent. Run npm run build.`); }

        const declared = new Set(readFileSync(css, "utf8").match(/--[\w-]+(?=:)/g));
        const undeclared = THEME_MAP.flatMap(([, tokens]) => tokens).filter((t) => !declared.has(t));

        expect(undeclared).toEqual([]);
    });
});

describe("layoutHeight", () =>
{
    test.each([
        [{ displayMode: "fullscreen", containerDimensions: { maxHeight: 400 } }, "100vh"],
        [{ containerDimensions: { maxHeight: 400 } }, "400px"],
        [{ containerDimensions: { height: 300 } }, "300px"],
        [{ containerDimensions: { maxWidth: 600 } }, null],
        [{}, null],
    ])("%j is %s", (ctx, height) =>
    {
        expect(layoutHeight(ctx as never)).toBe(height);
    });
});

describe("applyHostContext", () =>
{
    const root = document.documentElement;

    beforeEach(() =>
    {
        root.removeAttribute("style");
        root.removeAttribute("data-bs-theme");
        document.getElementById("outcrop-mcp-host-fonts")?.remove();
    });

    test("sets the theme, the color scheme, the mapped tokens and the layout height", () =>
    {
        applyHostContext(root, { theme: "dark", styles: { variables: { "--color-text-primary": "#eee" } as never },
            containerDimensions: { maxHeight: 500 } });

        expect([root.dataset.bsTheme, root.style.colorScheme, root.style.getPropertyValue("--theme-text-primary"),
            root.style.getPropertyValue("--outcrop-layout-height")]).toEqual(["dark", "dark", "#eee", "500px"]);
    });

    test("a token or height the host no longer sends goes back to the library's", () =>
    {
        applyHostContext(root, { styles: { variables: { "--color-text-primary": "#eee" } as never },
            containerDimensions: { maxHeight: 500 } });
        applyHostContext(root, { theme: "light" });

        expect([root.style.getPropertyValue("--theme-text-primary"),
            root.style.getPropertyValue("--outcrop-layout-height")]).toEqual(["", ""]);
    });

    test("host font CSS goes into one style element, replaced when it changes", () =>
    {
        applyHostContext(root, { styles: { css: { fonts: "@font-face { font-family: A; }" } } });
        applyHostContext(root, { styles: { css: { fonts: "@font-face { font-family: B; }" } } });

        expect([...document.querySelectorAll("#outcrop-mcp-host-fonts")].map((el) => el.textContent))
            .toEqual(["@font-face { font-family: B; }"]);
    });
});
