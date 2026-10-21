/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: SiteFooter
 * Unit tests for the SiteFooter component. Covers the canonical structure
 * contract, column derivation, navigation-group naming, optional parts,
 * escaping, and teardown.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { destroyProbe } from "../../tests/destroy-probe";
import { SiteFooter, createSiteFooter } from "./sitefooter";
import type { SiteFooterOptions } from "./sitefooter";

let container: HTMLElement;

beforeEach(() =>
{
    container = document.createElement("div");
    container.id = "sitefooter-test-container";
    document.body.appendChild(container);
});

afterEach(() =>
{
    container.remove();
});

function makeOptions(overrides?: Partial<SiteFooterOptions>): SiteFooterOptions
{
    return {
        organization: { name: "Outcrop Inc", description: "Enterprise software." },
        groups: [
            { title: "Product", links: [{ text: "Overview", href: "/overview" }] },
            { title: "Company", links: [{ text: "About", href: "/about" }] },
        ],
        legal: { copyright: "© 2026 Outcrop Inc" },
        ...overrides,
    };
}

// ============================================================================
// CANONICAL STRUCTURE
// ============================================================================

describe("SiteFooter canonical structure", () =>
{
    test("Render_Always_RootIsFooterWithSiteFooterClass", () =>
    {
        const footer = createSiteFooter("sitefooter-test-container", makeOptions());
        const root = container.querySelector(".sitefooter");
        expect(root?.tagName.toLowerCase()).toBe("footer");
        footer.destroy();
    });

    test("Render_Always_GridPrecedesLegal", () =>
    {
        const footer = createSiteFooter("sitefooter-test-container", makeOptions());
        const root = container.querySelector(".sitefooter") as HTMLElement;
        const children = Array.from(root.children).map((c) => c.className);
        expect(children).toEqual(["sitefooter-grid sitefooter-cols-3",
                                  "sitefooter-legal"]);
        footer.destroy();
    });

    test("Render_Organization_UsesAddressElementForContact", () =>
    {
        const footer = createSiteFooter("sitefooter-test-container",
            makeOptions({ contact: { email: "hello@example.test" } }));
        const contact = container.querySelector(".sitefooter-contact");
        expect(contact?.tagName.toLowerCase()).toBe("address");
        footer.destroy();
    });
});

// ============================================================================
// COLUMNS
// ============================================================================

describe("SiteFooter columns", () =>
{
    test("Columns_Omitted_DerivedFromBlockCount", () =>
    {
        const footer = createSiteFooter("sitefooter-test-container", makeOptions());
        const grid = container.querySelector(".sitefooter-grid") as HTMLElement;
        expect(grid.classList.contains("sitefooter-cols-3")).toBe(true);
        footer.destroy();
    });

    test("Columns_Explicit_OverridesDerivedValue", () =>
    {
        const footer = createSiteFooter("sitefooter-test-container",
            makeOptions({ columns: 2 }));
        const grid = container.querySelector(".sitefooter-grid") as HTMLElement;
        expect(grid.classList.contains("sitefooter-cols-2")).toBe(true);
        footer.destroy();
    });

    test("Columns_MoreThanFourBlocks_CapsAtFour", () =>
    {
        const groups = ["A", "B", "C", "D", "E"].map((t) => ({
            title: t, links: [{ text: t, href: `/${t}` }],
        }));
        const footer = createSiteFooter("sitefooter-test-container",
            makeOptions({ groups }));
        const grid = container.querySelector(".sitefooter-grid") as HTMLElement;
        expect(grid.classList.contains("sitefooter-cols-4")).toBe(true);
        footer.destroy();
    });
});

// ============================================================================
// NAVIGATION GROUPS
// ============================================================================

describe("SiteFooter navigation groups", () =>
{
    test("Group_Always_IsNavLabelledByItsOwnHeading", () =>
    {
        const footer = createSiteFooter("sitefooter-test-container", makeOptions());
        const nav = container.querySelector(".sitefooter-group") as HTMLElement;
        const heading = nav.querySelector(".sitefooter-grouptitle") as HTMLElement;
        expect(nav.tagName.toLowerCase()).toBe("nav");
        expect(nav.getAttribute("aria-labelledby")).toBe(heading.id);
        expect(heading.id).not.toBe("");
        footer.destroy();
    });

    test("HeadingLevel_Omitted_RendersH2", () =>
    {
        const footer = createSiteFooter("sitefooter-test-container", makeOptions());
        const heading = container.querySelector(".sitefooter-grouptitle") as HTMLElement;
        expect(heading.tagName.toLowerCase()).toBe("h2");
        footer.destroy();
    });

    test("HeadingLevel_Four_RendersH4", () =>
    {
        const footer = createSiteFooter("sitefooter-test-container", makeOptions({
            groups: [{ title: "Product", headingLevel: 4,
                       links: [{ text: "Overview", href: "/overview" }] }],
        }));
        const heading = container.querySelector(".sitefooter-grouptitle") as HTMLElement;
        expect(heading.tagName.toLowerCase()).toBe("h4");
        footer.destroy();
    });

    test("Group_TwoGroups_HeadingIdsAreUnique", () =>
    {
        const footer = createSiteFooter("sitefooter-test-container", makeOptions());
        const ids = Array.from(container.querySelectorAll(".sitefooter-grouptitle"))
            .map((h) => h.id);
        expect(new Set(ids).size).toBe(ids.length);
        footer.destroy();
    });

    test("Group_TwoInstances_HeadingIdsDoNotCollide", () =>
    {
        const a = createSiteFooter("sitefooter-test-container", makeOptions());
        const b = createSiteFooter("sitefooter-test-container", makeOptions());
        const ids = Array.from(container.querySelectorAll(".sitefooter-grouptitle"))
            .map((h) => h.id);
        expect(new Set(ids).size).toBe(ids.length);
        a.destroy();
        b.destroy();
    });

    test("Links_Rendered_AsListItemsWithHrefs", () =>
    {
        const footer = createSiteFooter("sitefooter-test-container", makeOptions());
        const link = container.querySelector(".sitefooter-links li a") as HTMLAnchorElement;
        expect(link.getAttribute("href")).toBe("/overview");
        expect(link.textContent).toBe("Overview");
        footer.destroy();
    });
});

// ============================================================================
// OPTIONAL PARTS
// ============================================================================

describe("SiteFooter optional parts", () =>
{
    test("BuildInfo_Provided_RendersBuildElement", () =>
    {
        const footer = createSiteFooter("sitefooter-test-container",
            makeOptions({ buildInfo: "2026.09.01 · a1b2c3d" }));
        const build = container.querySelector(".sitefooter-build") as HTMLElement;
        expect(build.textContent).toBe("2026.09.01 · a1b2c3d");
        footer.destroy();
    });

    test("BuildInfo_Omitted_RendersNoBuildElement", () =>
    {
        const footer = createSiteFooter("sitefooter-test-container", makeOptions());
        expect(container.querySelector(".sitefooter-build")).toBeNull();
        footer.destroy();
    });

    test("Legal_Omitted_RendersNoLegalRow", () =>
    {
        const footer = createSiteFooter("sitefooter-test-container",
            makeOptions({ legal: undefined }));
        expect(container.querySelector(".sitefooter-legal")).toBeNull();
        footer.destroy();
    });

    test("Legal_OmittedButBuildInfoPresent_StillRendersLegalRow", () =>
    {
        const footer = createSiteFooter("sitefooter-test-container",
            makeOptions({ legal: undefined, buildInfo: "2026.09.01" }));
        expect(container.querySelector(".sitefooter-legal")).not.toBeNull();
        expect(container.querySelector(".sitefooter-copyright")).toBeNull();
        footer.destroy();
    });

    test("Groups_Omitted_RendersGridWithOrganizationOnly", () =>
    {
        const footer = createSiteFooter("sitefooter-test-container",
            makeOptions({ groups: undefined }));
        expect(container.querySelector(".sitefooter-group")).toBeNull();
        expect(container.querySelector(".sitefooter-org")).not.toBeNull();
        footer.destroy();
    });

    test("Logo_Provided_ContainsTheGivenElement", () =>
    {
        const logo = document.createElement("img");
        logo.id = "brand-mark";
        const footer = createSiteFooter("sitefooter-test-container", makeOptions({
            organization: { name: "Outcrop Inc", logo },
        }));
        expect(container.querySelector(".sitefooter-org #brand-mark")).not.toBeNull();
        footer.destroy();
    });

    test("Contact_EmailAndPhone_RenderAsMailtoAndTelLinks", () =>
    {
        const footer = createSiteFooter("sitefooter-test-container", makeOptions({
            contact: { email: "hello@example.test", phone: "+1 555 0100" },
        }));
        const hrefs = Array.from(
            container.querySelectorAll(".sitefooter-contact a"))
            .map((a) => a.getAttribute("href"));
        expect(hrefs).toEqual(["mailto:hello@example.test", "tel:+1 555 0100"]);
        footer.destroy();
    });
});

// ============================================================================
// SAFETY AND LIFECYCLE
// ============================================================================

describe("SiteFooter safety and lifecycle", () =>
{
    test("OrgName_ContainingMarkup_RendersAsText", () =>
    {
        const footer = createSiteFooter("sitefooter-test-container", makeOptions({
            organization: { name: "<img src=x onerror=alert(1)>" },
        }));
        const name = container.querySelector(".sitefooter-orgname") as HTMLElement;
        expect(name.querySelector("img")).toBeNull();
        expect(name.textContent).toBe("<img src=x onerror=alert(1)>");
        footer.destroy();
    });

    test("Show_UnknownContainer_Throws", () =>
    {
        // ERR-1. This case asserted the defect: a container that is
        // not there used to be logged and walked past. AGENTS.md
        // calls that returning a null object. The console spy
        // went with it, because nothing is logged any more.
        const footer = new SiteFooter(makeOptions());
        expect(() => footer.show("no-such-container")).toThrow(/was not found/);
        footer.destroy();
    });

    test("Constructor_EmptyOptions_RendersAFooterWithNoGroups", () =>
    {
        const footer = new SiteFooter({});
        const root = footer.getElement();

        // The title said "RendersEmptyFooter" and the assertion read
        // the constructor's survival, which would hold for a
        // constructor that rendered no footer at all.
        expect(root).not.toBeNull();
        expect(root!.classList.contains("sitefooter")).toBe(true);
        expect(root!.querySelectorAll(".sitefooter-group")).toHaveLength(0);
    });

    test("Destroy_AfterShow_RemovesFromDOM", () =>
    {
        const footer = createSiteFooter("sitefooter-test-container", makeOptions());
        expect(container.querySelector(".sitefooter")).not.toBeNull();
        footer.destroy();
        expect(container.querySelector(".sitefooter")).toBeNull();
    });

    test("Destroy_GetElement_ReturnsNull", () =>
    {
        const footer = createSiteFooter("sitefooter-test-container", makeOptions());
        footer.destroy();
        expect(footer.getElement()).toBeNull();
    });

    test("Destroy_CalledTwice_IsIdempotent", () =>
    {
        const footer = createSiteFooter("sitefooter-test-container", makeOptions());
        const probe = destroyProbe();

        footer.destroy();
        const first = probe.total();
        footer.destroy();

        expect(first).toBeGreaterThan(0);
        expect(probe.total()).toBe(first);
        probe.restore();
    });
});
