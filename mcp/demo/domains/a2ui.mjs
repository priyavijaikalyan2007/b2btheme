/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: McpDemoResults
 * 📜 PURPOSE: The tool-result shapes every demo domain returns (spec §5.1):
 *    an `outcrop` payload of A2UI messages, its routes, and the plain text
 *    summary models and UI-less hosts read.
 * 🔗 RELATES: [[McpDemoServer]], [[ExampleDeals]]
 */

/** A2UI message version and the catalog every demo surface uses. */
export const A2UI = "v0.9.1";
export const CATALOG = "https://static.outcrop.us/a2ui/catalog/v1.json";

/**
 * A result for the view.
 *
 * @param {string} summary
 * @param {unknown[]} messages
 * @param {unknown} [routes] Omitted: the surface keeps the routes it has.
 */
export function outcrop(summary, messages, routes)
{
    return { content: [{ type: "text", text: summary }],
        structuredContent: { outcrop: { version: 1, messages, ...(routes === undefined ? {} : { routes }) } } };
}

/** A tool error the view shows on the surface whose action called it. */
export function toolError(text)
{
    return { content: [{ type: "text", text }], isError: true };
}

/** A new surface with its components and, optionally, its initial data model. */
export function surface(surfaceId, components, data)
{
    return [
        { version: A2UI, createSurface: { surfaceId, catalogId: CATALOG } },
        { version: A2UI, updateComponents: { surfaceId, components } },
        ...(data === undefined ? [] : [{ version: A2UI, updateDataModel: { surfaceId, path: "/", value: data } }]),
    ];
}

/** Replaces some of a surface's components. */
export function update(surfaceId, components)
{
    return { version: A2UI, updateComponents: { surfaceId, components } };
}

/** Writes one value into a surface's data model. */
export function write(surfaceId, path, value)
{
    return { version: A2UI, updateDataModel: { surfaceId, path, value } };
}

/** A button: its label is a Text child, its action an event with a context. */
export function button(id, label, name, context = {}, variant)
{
    return [
        { id, component: "Button", child: `${id}Label`, ...(variant ? { variant } : {}),
            action: { event: { name, context } } },
        { id: `${id}Label`, component: "Text", text: label },
    ];
}
