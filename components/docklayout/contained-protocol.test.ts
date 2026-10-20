/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: `setContained` is implemented only where it means something. DEBT-LAY-1 / ADR-212.
 *
 * WHAT `contained` MEANS, AND WHY FOUR LAYOUTS DO NOT HAVE IT
 * -----------------------------------------------------------
 * `contained` means "fill the parent instead of `document.body`". Toolbar and
 * Sidebar have a body-append path, so the flag decides where they render and
 * they both read it. AnchorLayout, BorderLayout, BoxLayout and CardLayout
 * have NO body-append path at all — measured, zero `document.body.appendChild`
 * between them — so they always fill the element they were given and the flag
 * has nothing to decide.
 *
 * Each of those four nevertheless declared `private contained = false` and a
 * public `setContained(value)` that assigned it, and NOT ONE of them read the
 * field. The method appeared in all four READMEs as "Set contained mode" and
 * set nothing. That is the silent no-op this repository removes on sight.
 *
 * WHY DELETING IT IS THE FIX RATHER THAN IMPLEMENTING IT
 * ------------------------------------------------------
 * Every caller is duck-typed: `if (typeof child.setContained === "function")`.
 * The protocol is built to ask whether a component HAS the capability, so a
 * component that does not implement the method reports "absent" correctly,
 * while one that implements it as a no-op reports "present" and lies.
 *
 * These tests therefore assert the ABSENCE as a contract. Re-adding a no-op
 * setter to any of the four fails `layoutsWithNoBodyPath_DoNotClaimTheCapability`,
 * which is the point: the next person to add one has to read this file first.
 */

import { describe, test, expect } from "vitest";

import { createAnchorLayout } from "../anchorlayout/anchorlayout";
import { createBorderLayout } from "../borderlayout/borderlayout";
import { createBoxLayout } from "../boxlayout/boxlayout";
import { createCardLayout } from "../cardlayout/cardlayout";
import { createToolbar } from "../toolbar/toolbar";

type Maybe = { setContained?: unknown };

function host(id: string): HTMLElement
{
    const el = document.createElement("div");
    el.id = id;
    document.body.appendChild(el);
    return el;
}

describe("the contained protocol", () =>
{
    test("layoutsWithNoBodyPath_DoNotClaimTheCapability", () =>
    {
        host("cp-anchor"); host("cp-border"); host("cp-box"); host("cp-card");

        const made: Array<[string, Maybe]> = [
            ["anchorlayout", createAnchorLayout({ containerId: "cp-anchor" }) as Maybe],
            ["borderlayout", createBorderLayout({ containerId: "cp-border" }) as Maybe],
            ["boxlayout", createBoxLayout({ containerId: "cp-box", direction: "row" }) as Maybe],
            ["cardlayout", createCardLayout({ containerId: "cp-card" }) as Maybe],
        ];

        const claiming = made
            .filter(([, c]) => typeof c.setContained === "function")
            .map(([name]) => name);

        expect(claiming).toEqual([]);
    });

    // The control. Without it the test above would also pass against a
    // codebase where NOTHING implements the protocol, which would mean the
    // assertion had stopped measuring anything.
    test("aComponentWithABodyPath_StillClaimsIt", () =>
    {
        host("cp-toolbar");
        const tb = createToolbar({
            containerId: "cp-toolbar",
            label: "Protocol control",
            regions: [{ id: "r", title: "Region", items: [] }],
        }) as Maybe;
        expect(typeof tb.setContained).toBe("function");
    });
});
