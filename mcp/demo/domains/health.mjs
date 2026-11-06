/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: McpDemoHealth
 * 📜 PURPOSE: The operations domain: one service's health as status,
 *    metric cards, an error-budget gauge, line and bar charts and a
 *    deploy timeline. Refresh goes to the server; Explain goes to the
 *    model as a user turn.
 * 🔗 RELATES: [[McpDemoServer]], [[McpDemoResults]]
 */

import { button, outcrop, surface, toolError, update } from "./a2ui.mjs";

export const SURFACE = "health";

const HOURS = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"];

/** The two readings Refresh moves between, so the update is visible. */
const READINGS = [
    { status: "degraded", label: "Checkout degraded", p95: [180, 190, 210, 460, 520, 480, 300, 240],
        p50: [80, 82, 85, 140, 160, 150, 110, 95], errors: "2.4%", budget: 41, latency: "480 ms" },
    { status: "operational", label: "Checkout operational", p95: [180, 190, 210, 460, 520, 480, 300, 190],
        p50: [80, 82, 85, 140, 160, 150, 110, 78], errors: "0.3%", budget: 44, latency: "190 ms" },
];

/** The components that change between readings. */
function reading(index)
{
    const r = READINGS[index];

    return [
        { id: "status", component: "StatusBadge", status: r.status, label: r.label, variant: "pill",
            pulse: r.status !== "operational" },
        { id: "latency", component: "MetricCard", label: "p95 latency", value: r.latency, icon: "bi-stopwatch",
            size: "sm", sparkline: r.p95,
            trend: { direction: index === 0 ? "up" : "down", text: index === 0 ? "+170% since 11:00" : "back to baseline",
                intent: index === 0 ? "negative" : "positive" } },
        { id: "errors", component: "MetricCard", label: "Error rate", value: r.errors, icon: "bi-exclamation-octagon",
            size: "sm" },
        { id: "budget", component: "Gauge", shape: "ring", size: "sm", mode: "value", value: r.budget, min: 0, max: 100,
            unit: "%", title: "Error budget left", thresholds: [{ value: 25, color: "var(--bs-danger)" },
                { value: 50, color: "var(--bs-warning)" }, { value: 100, color: "var(--bs-success)" }] },
        { id: "latencyChart", component: "ChartPanel", kind: "line", height: "200px",
            ariaLabel: "Checkout latency, 09:00 to 16:00", categories: HOURS,
            series: [{ id: "p95", label: "p95 (ms)", data: r.p95, intent: "warning" },
                { id: "p50", label: "p50 (ms)", data: r.p50, intent: "primary" }], yAxis: { label: "ms", min: 0 } },
        { id: "refreshed", component: "Text", text: index === 0 ? "Reading at 16:00." : "Reading at 16:05, after Refresh." },
    ];
}

/** The checkout service's health dashboard. */
export function show()
{
    const components = [
        { id: "root", component: "Column", children: ["head", "cards", "latencyChart", "regions", "deploys", "buttons", "refreshed"] },
        { id: "head", component: "Row", align: "center", children: ["title", "status"] },
        { id: "title", component: "Text", variant: "h3", text: "Checkout service" },
        { id: "cards", component: "Row", children: ["latency", "errors", "budget"] },
        { id: "regions", component: "ChartPanel", kind: "bar", height: "180px",
            ariaLabel: "Checkout requests by region, last hour", categories: ["us-east", "us-west", "eu-west", "ap-south"],
            series: [{ id: "ok", label: "Succeeded (k)", data: [412, 268, 305, 122], intent: "success" },
                { id: "failed", label: "Failed (k)", data: [11, 3, 9, 2], intent: "danger" }] },
        { id: "deploys", component: "Timeline", start: "2026-11-06T09:00:00Z", end: "2026-11-06T16:00:00Z",
            height: "130px", tickInterval: "1h", timezone: "UTC",
            groups: [{ id: "deploy", label: "Deploys" }, { id: "alert", label: "Alerts" }],
            items: [
                { id: "d1", type: "point", start: "2026-11-06T10:40:00Z", label: "checkout 4.12.0", group: "deploy" },
                { id: "a1", type: "span", start: "2026-11-06T11:05:00Z", end: "2026-11-06T14:30:00Z",
                    label: "p95 over SLO", group: "alert" },
                { id: "d2", type: "point", start: "2026-11-06T14:20:00Z", label: "Cache warm-up fix", group: "deploy" },
            ] },
        { id: "buttons", component: "Row", children: ["refresh", "explain"] },
        ...button("refresh", "Refresh", "refresh", {}, "primary"),
        ...button("explain", "Explain the spike", "explain", { service: "checkout" }),
        ...reading(0),
    ];

    return outcrop("Checkout is degraded: p95 latency 480 ms, error rate 2.4%, 41% of the error budget left.",
        surface(SURFACE, components), { default: { tool: "demo_action" }, byName: { explain: "message" } });
}

/** Refresh: the next reading. */
export function act(name)
{
    if (name === "refresh") { return outcrop("Checkout is operational again: p95 190 ms.", [update(SURFACE, reading(1))]); }

    return toolError(`The health view has no action ${JSON.stringify(name)}.`);
}
