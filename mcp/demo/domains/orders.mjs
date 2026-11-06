/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: McpDemoOrders
 * 📜 PURPOSE: The data domain: an order DataGrid whose selection the
 *    server answers with the order's detail, and a TreeGrid of stock whose
 *    aisles load lazily from the server. Escalate goes to the model.
 * 🔗 RELATES: [[McpDemoServer]], [[McpDemoResults]]
 */

import { button, outcrop, surface, toolError, update, write } from "./a2ui.mjs";

export const SURFACE = "orders";

const ORDERS = [
    { id: "SO-4471", customer: "Northwind Traders", items: 12, total: "$4,820.00", status: "Awaiting stock",
        note: "Two lines wait on aisle B3; the rest is picked." },
    { id: "SO-4472", customer: "Contoso Pharma", items: 3, total: "$1,145.50", status: "Packed",
        note: "Packed at 14:10; the carrier collects at 17:00." },
    { id: "SO-4473", customer: "Fabrikam Bikes", items: 40, total: "$18,300.00", status: "Credit hold",
        note: "Over the customer's credit limit by $3,300; finance must release it." },
    { id: "SO-4474", customer: "Adventure Works", items: 7, total: "$960.25", status: "Shipped",
        note: "Shipped by ground, tracking 1Z 999 AA1 0123 4567 84." },
];

/** Each warehouse's aisles, loaded when the warehouse is first expanded. */
const AISLES = {
    reno: [
        { id: "reno-a1", label: "Aisle A1", icon: "bi-box-seam", data: { sku: 214, onHand: 18_420, reorder: "No" } },
        { id: "reno-b3", label: "Aisle B3", icon: "bi-box-seam", data: { sku: 96, onHand: 1_120, reorder: "Yes" } },
    ],
    leeds: [
        { id: "leeds-c2", label: "Aisle C2", icon: "bi-box-seam", data: { sku: 180, onHand: 9_870, reorder: "No" } },
    ],
};

/** The open orders and the stock behind them. */
export function show()
{
    const components = [
        { id: "root", component: "Column", children: ["title", "grid", "detail", "stock", "buttons"] },
        { id: "title", component: "Text", variant: "h3", text: "Open orders" },
        { id: "grid", component: "DataGrid", eventData: { path: "/ev" }, selectable: "single", dense: true,
            height: "200px",
            columns: [{ id: "id", label: "Order", sizeHint: "s" }, { id: "customer", label: "Customer", sizeHint: "l" },
                { id: "items", label: "Items", sizeHint: "s" }, { id: "total", label: "Total", sizeHint: "m" },
                { id: "status", label: "Status", sizeHint: "m" }],
            rows: ORDERS.map(({ note: _note, ...data }) => ({ id: data.id, data })),
            onSelection: { event: { name: "orderSelected", context: { selection: { path: "/ev/selection" } } } } },
        { id: "detail", component: "Text", text: "Select an order to see its detail." },
        { id: "stock", component: "TreeGrid", label: "Stock by warehouse", eventData: { path: "/ev" }, height: "180px",
            treeColumnLabel: "Location",
            columns: [{ id: "sku", label: "SKUs" }, { id: "onHand", label: "On hand" },
                { id: "reorder", label: "Reorder" }],
            nodes: [
                { id: "reno", label: "Reno, NV", icon: "bi-building", lazy: true, children: null,
                    data: { sku: 310, onHand: 19_540, reorder: "1 aisle" } },
                { id: "leeds", label: "Leeds, UK", icon: "bi-building", lazy: true, children: null,
                    data: { sku: 180, onHand: 9_870, reorder: "None" } },
            ],
            onLoadChildren: { event: { name: "loadAisles", context: { node: { path: "/ev/loadChildren" } } } },
            loadChildrenResult: { path: "/answers/aisles" } },
        { id: "buttons", component: "Row", children: ["escalate"] },
        ...button("escalate", "Escalate the credit hold", "escalate", { order: "SO-4473" }),
    ];

    return outcrop(`${ORDERS.length} open orders; SO-4473 is on credit hold.`, surface(SURFACE, components),
        { default: { tool: "demo_action" }, byName: { escalate: "message" } });
}

/** A selection gets the order's detail; a warehouse expansion gets its aisles. */
export function act(name, context)
{
    if (name === "orderSelected")
    {
        const selected = /** @type {Array<{id?: string}> | undefined} */ (context.selection)?.[0];
        const order = ORDERS.find((o) => o.id === selected?.id);

        if (!order) { return toolError(`No order ${JSON.stringify(selected?.id)}.`); }

        return outcrop(`${order.id}: ${order.note}`, [update(SURFACE, [
            { id: "detail", component: "Text", text: `${order.id}, ${order.customer}: ${order.note}` }])]);
    }

    if (name === "loadAisles")
    {
        const node = /** @type {{id?: string} | undefined} */ (context.node);
        const aisles = AISLES[/** @type {keyof typeof AISLES} */ (node?.id)];

        if (!aisles) { return toolError(`No warehouse ${JSON.stringify(node?.id)}.`); }

        return outcrop(`${node?.id} has ${aisles.length} aisles.`, [write(SURFACE, "/answers/aisles", aisles)]);
    }

    return toolError(`The orders view has no action ${JSON.stringify(name)}.`);
}
