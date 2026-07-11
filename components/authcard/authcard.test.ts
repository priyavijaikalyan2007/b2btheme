/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: eb2f4902-8cfb-4215-b74f-5ed95a74dd64
 *
 * ⚓ TESTS: AuthCard
 * Vitest unit tests for the AuthCard component (Keycloak parity R5).
 * The "canonical structure" describe-block is the drift guard for the frozen
 * parity contract (spec Appendix A): if the emitted class structure changes,
 * these tests fail before the Keycloak FreeMarker mirror silently diverges.
 * Covers: factory, canonical markup, providers, error surface (XSS-safe),
 * optional sections, destroy idempotence.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import
{
    createAuthCard,
} from "./authcard";
import type
{
    AuthCardOptions,
    AuthCardHandle,
} from "./authcard";

// ============================================================================
// HELPERS
// ============================================================================

const GOOGLE_SVG = '<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><path d="M1 1h1"/></svg>';

let container: HTMLElement;
let handle: AuthCardHandle | null;

function makeOptions(overrides?: Partial<AuthCardOptions>): AuthCardOptions
{
    return {
        logoUrl: "/logo.png",
        brandTitle: "knobby.io",
        brandSubtitle: "Engineering & Organizational Productivity",
        heading: "Welcome back",
        subheading: "Continue with your account",
        providers: [
            { id: "google", label: "Continue with Google", iconSvg: GOOGLE_SVG },
            { id: "microsoft-oidc", label: "Continue with Microsoft" },
        ],
        dividerText: "New to knobby.io?",
        footerLink: { text: "Create an account", href: "/auth/signup.html" },
        ...overrides,
    };
}

function render(overrides?: Partial<AuthCardOptions>): AuthCardHandle
{
    handle = createAuthCard(container, makeOptions(overrides));
    return handle;
}

function q(selector: string): HTMLElement | null
{
    return container.querySelector<HTMLElement>(selector);
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    container = document.createElement("div");
    container.id = "authcard-test-container";
    document.body.appendChild(container);
    handle = null;
});

afterEach(() =>
{
    handle?.destroy();
    container.remove();
});

// ============================================================================
// FACTORY
// ============================================================================

describe("createAuthCard factory", () =>
{
    test("ValidOptions_ReturnsHandle", () =>
    {
        const h = render();
        expect(typeof h.showError).toBe("function");
        expect(typeof h.clearError).toBe("function");
        expect(typeof h.getElement).toBe("function");
        expect(typeof h.destroy).toBe("function");
    });

    test("ContainerIdString_ResolvesHostElement", () =>
    {
        handle = createAuthCard("authcard-test-container", makeOptions());
        expect(container.querySelector(".auth-card")).not.toBeNull();
    });

    test("UnknownContainerId_Throws", () =>
    {
        expect(() => createAuthCard("no-such-host", makeOptions())).toThrow(/no-such-host/);
    });

    test("GetElement_ReturnsRootInsideContainer", () =>
    {
        const h = render();
        expect(container.contains(h.getElement())).toBe(true);
    });
});

// ============================================================================
// CANONICAL STRUCTURE — frozen parity contract (spec Appendix A drift guard)
// ============================================================================

describe("canonical structure", () =>
{
    beforeEach(() => { render(); });

    test("Root_IsAuthContainer", () =>
    {
        expect(handle?.getElement().classList.contains("auth-container")).toBe(true);
    });

    test("Card_HasCanonicalClasses", () =>
    {
        const card = q(".auth-container > .auth-card");
        expect(card?.className).toContain("card");
        expect(card?.className).toContain("shadow-lg");
        expect(card?.className).toContain("p-4");
    });

    test("BrandLogo_HasCanonicalClasses", () =>
    {
        const img = q("img.brand-logo") as HTMLImageElement;
        expect(img.classList.contains("lg")).toBe(true);
        expect(img.classList.contains("brand-logo-img")).toBe(true);
        expect(img.getAttribute("src")).toBe("/logo.png");
        expect(img.getAttribute("alt")).toBe("knobby.io");
    });

    test("BrandTitle_IsH1WithCanonicalClasses", () =>
    {
        const h1 = q("h1.h3.fw-bold.mb-1");
        expect(h1?.textContent).toBe("knobby.io");
    });

    test("BrandSubtitle_IsMutedSmall", () =>
    {
        const p = q("p.text-muted.small");
        expect(p?.textContent).toBe("Engineering & Organizational Productivity");
    });

    test("ErrorAlert_PresentAndHidden", () =>
    {
        const alert = q(".alert.alert-danger");
        expect(alert?.classList.contains("d-none")).toBe(true);
    });

    test("AuthStep_PresentAndActive", () =>
    {
        expect(q(".auth-step.active")).not.toBeNull();
    });

    test("Heading_IsH2WithCanonicalClasses", () =>
    {
        const h2 = q("h2.h5.fw-semibold.mb-1.text-center");
        expect(h2?.textContent).toBe("Welcome back");
    });

    test("Subheading_IsMutedCentered", () =>
    {
        const p = q(".auth-step p.text-muted.text-center.mb-4");
        expect(p?.textContent).toBe("Continue with your account");
    });

    test("ProviderButtons_HaveCanonicalClasses", () =>
    {
        const buttons = container.querySelectorAll(".idp-button");
        expect(buttons.length).toBe(2);
        for (const btn of buttons)
        {
            expect(btn.classList.contains("btn")).toBe(true);
            expect(btn.classList.contains("btn-outline-secondary")).toBe(true);
            expect(btn.classList.contains("w-100")).toBe(true);
            expect(btn.classList.contains("mb-2")).toBe(true);
        }
    });

    test("ProviderIcon_IsSvgWithIdpIconClass", () =>
    {
        const icon = q("#authcard-idp-google svg.idp-icon");
        expect(icon).not.toBeNull();
        expect(icon?.getAttribute("aria-hidden")).toBe("true");
    });

    test("ProviderLabel_Rendered", () =>
    {
        expect(q("#authcard-idp-google")?.textContent?.trim()).toBe("Continue with Google");
    });

    test("Divider_HasCanonicalStructure", () =>
    {
        const divider = q(".divider.mt-3");
        expect(divider?.querySelector("span.divider-text")?.textContent).toBe("New to knobby.io?");
    });

    test("FooterLink_HasCanonicalClasses", () =>
    {
        const a = q("a.link-primary.text-decoration-none.fw-semibold.small.d-block.text-center") as HTMLAnchorElement;
        expect(a?.getAttribute("href")).toBe("/auth/signup.html");
        expect(a?.textContent?.trim()).toBe("Create an account");
    });
});

// ============================================================================
// PROVIDERS — behavior
// ============================================================================

describe("provider interaction", () =>
{
    test("Click_FiresProviderOnClickWithId", () =>
    {
        const onClick = vi.fn();
        render({ providers: [{ id: "google", label: "Continue with Google", onClick }] });
        q("#authcard-idp-google")?.click();
        expect(onClick).toHaveBeenCalledWith("google");
    });

    test("Click_FiresOnProviderSelect", () =>
    {
        const onProviderSelect = vi.fn();
        render({
            providers: [{ id: "google", label: "Continue with Google" }],
            onProviderSelect,
        });
        q("#authcard-idp-google")?.click();
        expect(onProviderSelect).toHaveBeenCalledWith("google");
    });

    test("HrefProvider_RendersAnchorWithSameClasses", () =>
    {
        render({ providers: [{ id: "google", label: "Continue with Google", href: "/kc?hint=google" }] });
        const a = q("a#authcard-idp-google") as HTMLAnchorElement;
        expect(a?.getAttribute("href")).toBe("/kc?hint=google");
        expect(a?.classList.contains("idp-button")).toBe(true);
    });

    test("InvalidIconSvg_IsIgnored", () =>
    {
        render({ providers: [{ id: "x", label: "X", iconSvg: '<img src=x onerror="alert(1)">' }] });
        expect(q("#authcard-idp-x svg")).toBeNull();
        expect(q("#authcard-idp-x img")).toBeNull();
    });
});

// ============================================================================
// ERROR SURFACE
// ============================================================================

describe("error surface", () =>
{
    test("ShowError_RevealsAlertWithMessage", () =>
    {
        const h = render();
        h.showError("Sign-in failed. Try again.");
        const alert = q(".alert.alert-danger");
        expect(alert?.classList.contains("d-none")).toBe(false);
        expect(alert?.textContent).toBe("Sign-in failed. Try again.");
    });

    test("ShowError_HtmlIsNotInterpreted", () =>
    {
        const h = render();
        h.showError('<img src=x onerror="x()">boom');
        const alert = q(".alert.alert-danger");
        expect(alert?.children.length).toBe(0);
    });

    test("ClearError_HidesAndEmptiesAlert", () =>
    {
        const h = render();
        h.showError("oops");
        h.clearError();
        const alert = q(".alert.alert-danger");
        expect(alert?.classList.contains("d-none")).toBe(true);
        expect(alert?.textContent).toBe("");
    });

    test("Alert_HasAlertRole", () =>
    {
        render();
        expect(q(".alert.alert-danger")?.getAttribute("role")).toBe("alert");
    });
});

// ============================================================================
// OPTIONAL SECTIONS
// ============================================================================

describe("optional sections", () =>
{
    test("NoLogo_OmitsImg", () =>
    {
        render({ logoUrl: undefined });
        expect(q("img.brand-logo")).toBeNull();
    });

    test("NoBrandTitle_OmitsH1", () =>
    {
        render({ brandTitle: undefined });
        expect(q("h1")).toBeNull();
    });

    test("NoDividerText_OmitsDivider", () =>
    {
        render({ dividerText: undefined });
        expect(q(".divider")).toBeNull();
    });

    test("NoFooterLink_OmitsAnchor", () =>
    {
        render({ footerLink: undefined });
        expect(q(".auth-step a")).toBeNull();
    });
});

// ============================================================================
// DESTROY
// ============================================================================

describe("destroy", () =>
{
    test("Destroy_RemovesRenderedDom", () =>
    {
        const h = render();
        h.destroy();
        expect(container.querySelector(".auth-container")).toBeNull();
    });

    test("Destroy_IsIdempotent", () =>
    {
        const h = render();
        h.destroy();
        expect(() => h.destroy()).not.toThrow();
    });
});
