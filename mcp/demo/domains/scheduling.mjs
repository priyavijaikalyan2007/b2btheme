/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: McpDemoScheduling
 * 📜 PURPOSE: The pickers domain: a meeting set up with date, time, time
 *    zone, duration, recurrence and people pickers, all bound to one data
 *    model. People search goes to the server; Book sends every picked
 *    value to the model as a user turn.
 * 🔗 RELATES: [[McpDemoServer]], [[McpDemoResults]]
 */

import { button, outcrop, surface, toolError, write } from "./a2ui.mjs";

export const SURFACE = "meeting";

const PEOPLE = [
    { id: "u-ana", name: "Ana Ruiz", email: "ana.ruiz@example.com", role: "Product lead", status: "online" },
    { id: "u-ben", name: "Ben Okafor", email: "ben.okafor@example.com", role: "Design", status: "busy" },
    { id: "u-chen", name: "Chen Wei", email: "chen.wei@example.com", role: "Engineering manager", status: "online" },
    { id: "u-dara", name: "Dara Novak", email: "dara.novak@example.com", role: "Research", status: "away" },
];

/** A picker under a caption: the column takes `id`, the picker `<id>Picker`. */
function field(id, caption, picker)
{
    return [
        { id, component: "Column", children: [`${id}Caption`, `${id}Picker`] },
        { id: `${id}Caption`, component: "Text", variant: "caption", text: caption },
        { id: `${id}Picker`, ...picker },
    ];
}

/** A meeting form with six pickers. */
export function show()
{
    const components = [
        { id: "root", component: "Column", children: ["title", "when", "zone", "length", "repeat", "who", "buttons"] },
        { id: "title", component: "Text", variant: "h3", text: "Plan the design review" },
        { id: "when", component: "Row", children: ["date", "time"] },
        ...field("date", "Date", { component: "DatePicker", value: { path: "/meeting/date" }, showTodayButton: true }),
        ...field("time", "Start", { component: "TimePicker", value: { path: "/meeting/time" }, showSeconds: false,
            minuteStep: 15 }),
        ...field("zone", "Time zone", { component: "TimezonePicker", value: { path: "/meeting/zone" },
            showTimePreview: true }),
        ...field("length", "Length", { component: "DurationPicker", pattern: "h-m",
            value: { path: "/meeting/length" } }),
        ...field("repeat", "Repeats", { component: "CronPicker", mode: "dropdown", value: { path: "/meeting/repeat" },
            showDescription: true }),
        ...field("who", "Invitees", { component: "PeoplePicker", eventData: { path: "/ev" }, multiple: true,
            value: { path: "/meeting/people" }, placeholder: "Invite people", debounceMs: 0,
            onSearch: { event: { name: "peopleSearch", context: { q: { path: "/ev/search" } } } },
            searchResult: { path: "/answers/people" } }),
        { id: "buttons", component: "Row", children: ["book"] },
        ...button("book", "Book it", "book", { meeting: { path: "/meeting" } }, "primary"),
    ];
    const meeting = { date: "2026-11-12T00:00:00Z", time: { hours: 10, minutes: 30 }, zone: "Europe/London",
        length: { h: 1, m: 0 }, repeat: "0 0 10 * * 4", people: [PEOPLE[0]] };

    return outcrop("A design review form: date, time, time zone, length, recurrence and invitees.",
        surface(SURFACE, components, { meeting }), { default: { tool: "demo_action" }, byName: { book: "message" } });
}

/** People search: everyone whose name or role contains the query. */
export function act(name, context)
{
    if (name !== "peopleSearch") { return toolError(`The meeting view has no action ${JSON.stringify(name)}.`); }

    const q = String(context.q ?? "").toLowerCase();
    const found = PEOPLE.filter((p) => `${p.name} ${p.role}`.toLowerCase().includes(q));

    return outcrop(`${found.length} people match ${JSON.stringify(q)}.`, [write(SURFACE, "/answers/people", found)]);
}
