/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: McpDemoBranding
 * 📜 PURPOSE: The design domain: a brand's colour, hero gradient and
 *    heading font picked with ColorPicker, GradientPicker and FontDropdown.
 *    Check goes to the server, which reads the picked values back; Apply
 *    sends them to the model.
 * 🔗 RELATES: [[McpDemoServer]], [[McpDemoResults]]
 */

import { button, outcrop, surface, toolError, update } from "./a2ui.mjs";

export const SURFACE = "brand";

const FONTS = [
    { label: "System sans", value: "system-ui, sans-serif", category: "sans-serif" },
    { label: "Georgia", value: "Georgia, serif", category: "serif" },
    { label: "Menlo", value: "Menlo, monospace", category: "monospace" },
];

/** The brand editor. */
export function show()
{
    const components = [
        { id: "root", component: "Column",
            children: ["title", "pickers", "fontCaption", "font", "verdict", "buttons"] },
        { id: "title", component: "Text", variant: "h3", text: "Brand for the spring campaign" },
        { id: "pickers", component: "Row", children: ["primary", "hero"] },
        { id: "primary", component: "ColorPicker", label: "Primary", value: { path: "/brand/primary" },
            swatches: ["#1D4ED8", "#047857", "#B91C1C", "#7C3AED"] },
        { id: "hero", component: "GradientPicker", label: "Hero", value: { path: "/brand/hero" }, showAngle: true },
        { id: "fontCaption", component: "Text", variant: "caption", text: "Heading font" },
        { id: "font", component: "FontDropdown", fonts: FONTS, value: { path: "/brand/font" }, showRecent: false },
        { id: "verdict", component: "Text", text: "Check the contrast before you apply." },
        { id: "buttons", component: "Row", children: ["check", "apply"] },
        ...button("check", "Check contrast", "check", { primary: { path: "/brand/primary" } }),
        ...button("apply", "Apply to the campaign", "apply", { brand: { path: "/brand" } }, "primary"),
    ];
    const brand = { primary: "#1D4ED8", font: FONTS[0].value,
        hero: { type: "linear", angle: 135, stops: [{ position: 0, color: "#1D4ED8", alpha: 1 },
            { position: 1, color: "#7C3AED", alpha: 1 }] } };

    return outcrop("A brand editor: primary colour, hero gradient and heading font.",
        surface(SURFACE, components, { brand }), { default: { tool: "demo_action" }, byName: { apply: "message" } });
}

/** The WCAG contrast of white text on a #RRGGBB colour. */
export function contrastOnWhiteText(hex)
{
    const channel = (i) =>
    {
        const c = parseInt(hex.slice(i, i + 2), 16) / 255;

        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    const luminance = 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);

    return 1.05 / (luminance + 0.05);
}

/** Check: the picked primary colour's contrast with white text. */
export function act(name, context)
{
    if (name !== "check") { return toolError(`The brand view has no action ${JSON.stringify(name)}.`); }

    const primary = String(context.primary ?? "");

    if (!/^#[0-9a-f]{6}$/i.test(primary)) { return toolError(`${JSON.stringify(primary)} is not a #RRGGBB colour.`); }

    const ratio = contrastOnWhiteText(primary);
    const text = `${primary.toUpperCase()} with white text: ${ratio.toFixed(1)}:1, `
        + (ratio >= 4.5 ? "passes WCAG AA." : "fails WCAG AA (needs 4.5:1).");

    return outcrop(text, [update(SURFACE, [{ id: "verdict", component: "Text", text }])]);
}
