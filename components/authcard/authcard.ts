/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 2e6e3694-6eb8-40d0-a20b-8e47d21d651e
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: AuthCard
 * 📜 PURPOSE: Factory that renders the canonical login-card markup (brand
 *    header, error alert, IdP buttons, divider, footer link) exactly as
 *    frozen in the Keycloak parity contract (spec Appendix A). The knobby
 *    app consumes this factory; the Keycloak FreeMarker theme mirrors the
 *    same markup server-side and links only authcard.css. The unit tests'
 *    "canonical structure" block is the drift guard for that contract.
 * 🔗 RELATES: [[ThemeInit]], [[ThemeToggle]], [[DarkMode]],
 *    specs/keycloak-theme-parity-requirements.md (R5)
 * ⚡ FLOW: [App init] -> createAuthCard(containerOrId, opts) -> AuthCardHandle
 *    -> user clicks IdP button -> provider.onClick + onProviderSelect
 * ----------------------------------------------------------------------------
 */

// @entrypoint
// NOTE: Excluded from the DynamicFormSwitcher field convention (ADR-134):
// a workflow surface like FormDialog, not a value-bearing field control.

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = "[AuthCard]";

const _lu = (typeof (window as any).createLogUtility === "function") ? (window as any).createLogUtility().getLogger(LOG_PREFIX.slice(1, -1)) : null;
function logInfo(...a: unknown[]): void { _lu ? _lu.info(...a) : console.log(new Date().toISOString(), "[INFO]", LOG_PREFIX, ...a); }
function logWarn(...a: unknown[]): void { _lu ? _lu.warn(...a) : console.warn(new Date().toISOString(), "[WARN]", LOG_PREFIX, ...a); }
function logError(...a: unknown[]): void { _lu ? _lu.error(...a) : console.error(new Date().toISOString(), "[ERROR]", LOG_PREFIX, ...a); }
function logDebug(...a: unknown[]): void { _lu ? _lu.debug(...a) : console.debug(new Date().toISOString(), "[DEBUG]", LOG_PREFIX, ...a); }

// ============================================================================
// TYPES
// ============================================================================

/** One identity-provider entry rendered as a `.idp-button`. */
export interface AuthCardProvider
{
    /** Stable provider id (e.g. "google", "microsoft-oidc"). */
    id: string;

    /** Visible button label (e.g. "Continue with Google"). */
    label: string;

    /**
     * Trusted, static inline SVG markup for the 20×20 provider icon.
     * SECURITY: must be an application-authored literal, never user input —
     * anything that does not parse to a single <svg> root is discarded.
     */
    iconSvg?: string;

    /** Renders the button as an <a href> (top-level navigation hand-off). */
    href?: string;

    /** Fires on activation, after onProviderSelect. */
    onClick?: (id: string) => void;
}

export interface AuthCardFooterLink
{
    text: string;
    href: string;
}

export interface AuthCardOptions
{
    /** Brand logo URL; omitted → no <img> is rendered. */
    logoUrl?: string;

    /** Logo alt text; defaults to brandTitle. */
    logoAlt?: string;

    /** Brand heading (h1); omitted → not rendered. */
    brandTitle?: string;

    /** Muted tagline under the brand heading. */
    brandSubtitle?: string;

    /** Step heading (h2), e.g. "Welcome back". */
    heading?: string;

    /** Muted line under the step heading. */
    subheading?: string;

    /** Identity providers, one button each, in order. */
    providers: AuthCardProvider[];

    /** Divider label (e.g. "New to knobby.io?"); omitted → no divider. */
    dividerText?: string;

    /** Footer link (e.g. "Create an account"); omitted → not rendered. */
    footerLink?: AuthCardFooterLink;

    /** Fires with the provider id on any IdP button activation. */
    onProviderSelect?: (id: string) => void;
}

export interface AuthCardHandle
{
    /** Shows the error alert with the given plain-text message. */
    showError(message: string): void;

    /** Hides and empties the error alert. */
    clearError(): void;

    /** Returns the root `.auth-container` element. */
    getElement(): HTMLElement;

    /** Removes the rendered DOM. Idempotent. */
    destroy(): void;
}

// ============================================================================
// DOM HELPERS
// ============================================================================

function el<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    className?: string,
    text?: string
): HTMLElementTagNameMap[K]
{
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

/**
 * Parses trusted, app-authored SVG icon markup. Returns null (and warns)
 * unless the markup is a single well-formed <svg> root — a defense-in-depth
 * guard, not a sanitizer; never pass user-controlled strings.
 */
function parseIconSvg(markup: string, providerId: string): SVGElement | null
{
    const doc = new DOMParser().parseFromString(markup, "image/svg+xml");
    const root = doc.documentElement;
    if (root.nodeName.toLowerCase() !== "svg" || doc.querySelector("parsererror"))
    {
        logWarn(`Provider "${providerId}" iconSvg is not a single <svg> root — icon skipped.`);
        return null;
    }

    const svg = document.importNode(root, true) as unknown as SVGElement;
    svg.classList.add("idp-icon");
    svg.setAttribute("aria-hidden", "true");
    return svg;
}

function resolveHost(containerOrId: string | HTMLElement): HTMLElement
{
    if (typeof containerOrId !== "string")
    {
        return containerOrId;
    }

    const found = document.getElementById(containerOrId);
    if (!found)
    {
        logError(`Container "#${containerOrId}" not found`);
        throw new Error(
            `${LOG_PREFIX} No element with id "${containerOrId}" exists in the DOM. ` +
            `Insert <div id="${containerOrId}"></div> into the page before calling createAuthCard.`
        );
    }
    return found;
}

// ============================================================================
// COMPONENT
// ============================================================================

class AuthCard
{
    private readonly root: HTMLElement;
    private readonly errorAlert: HTMLElement;
    private destroyed = false;

    constructor(host: HTMLElement, options: AuthCardOptions)
    {
        this.errorAlert = this.buildErrorAlert();
        this.root = this.buildRoot(options);
        host.appendChild(this.root);
        logDebug(`Rendered with ${options.providers.length} provider(s)`);
    }

    // ------------------------------------------------------------------ API

    showError(message: string): void
    {
        this.errorAlert.textContent = message;
        this.errorAlert.classList.remove("d-none");
        logInfo(`Error shown: ${message}`);
    }

    clearError(): void
    {
        this.errorAlert.textContent = "";
        this.errorAlert.classList.add("d-none");
    }

    getElement(): HTMLElement
    {
        return this.root;
    }

    destroy(): void
    {
        if (this.destroyed) return;
        this.destroyed = true;
        this.root.remove();
        logDebug("Destroyed");
    }

    // ------------------------------------------------------------- BUILDERS
    // Canonical structure per spec Appendix A — see authcard.test.ts
    // ("canonical structure") before changing anything here.

    private buildRoot(options: AuthCardOptions): HTMLElement
    {
        const container = el("div", "auth-container");
        const card = el("div", "auth-card card shadow-lg p-4");

        const brand = this.buildBrandHeader(options);
        if (brand) card.appendChild(brand);

        card.appendChild(this.errorAlert);
        card.appendChild(this.buildStep(options));
        container.appendChild(card);
        return container;
    }

    private buildBrandHeader(options: AuthCardOptions): HTMLElement | null
    {
        if (!options.logoUrl && !options.brandTitle && !options.brandSubtitle)
        {
            return null;
        }

        const header = el("div", "text-center mb-4");
        if (options.logoUrl)
        {
            const img = el("img", "brand-logo lg mx-auto mb-3 brand-logo-img");
            img.src = options.logoUrl;
            img.alt = options.logoAlt ?? options.brandTitle ?? "";
            header.appendChild(img);
        }
        if (options.brandTitle)
        {
            header.appendChild(el("h1", "h3 fw-bold mb-1", options.brandTitle));
        }
        if (options.brandSubtitle)
        {
            header.appendChild(el("p", "text-muted small", options.brandSubtitle));
        }
        return header;
    }

    private buildErrorAlert(): HTMLElement
    {
        const alert = el("div", "alert alert-danger d-none");
        alert.setAttribute("role", "alert");
        return alert;
    }

    private buildStep(options: AuthCardOptions): HTMLElement
    {
        const step = el("div", "auth-step active");
        if (options.heading)
        {
            step.appendChild(el("h2", "h5 fw-semibold mb-1 text-center", options.heading));
        }
        if (options.subheading)
        {
            step.appendChild(el("p", "text-muted text-center mb-4", options.subheading));
        }
        for (const provider of options.providers)
        {
            step.appendChild(this.buildProviderButton(provider, options.onProviderSelect));
        }
        this.appendFooter(step, options);
        return step;
    }

    private buildProviderButton(
        provider: AuthCardProvider,
        onProviderSelect?: (id: string) => void
    ): HTMLElement
    {
        const classes = "btn btn-outline-secondary w-100 idp-button mb-2";
        const button = provider.href ? el("a", classes) : el("button", classes);

        if (button instanceof HTMLAnchorElement && provider.href)
        {
            button.href = provider.href;
        }
        if (button instanceof HTMLButtonElement)
        {
            button.type = "button";
        }
        button.id = `authcard-idp-${provider.id}`;

        if (provider.iconSvg)
        {
            const icon = parseIconSvg(provider.iconSvg, provider.id);
            if (icon) button.appendChild(icon);
        }
        button.appendChild(document.createTextNode(provider.label));

        button.addEventListener("click", () =>
        {
            logInfo(`Provider selected: ${provider.id}`);
            onProviderSelect?.(provider.id);
            provider.onClick?.(provider.id);
        });
        return button;
    }

    private appendFooter(step: HTMLElement, options: AuthCardOptions): void
    {
        if (options.dividerText)
        {
            const divider = el("div", "divider mt-3");
            divider.appendChild(el("span", "divider-text", options.dividerText));
            step.appendChild(divider);
        }
        if (options.footerLink)
        {
            const link = el(
                "a",
                "link-primary text-decoration-none fw-semibold small d-block text-center",
                options.footerLink.text
            );
            link.href = options.footerLink.href;
            step.appendChild(link);
        }
    }
}

// ============================================================================
// FACTORY
// ============================================================================

// @entrypoint
export function createAuthCard(
    containerOrId: string | HTMLElement,
    options: AuthCardOptions
): AuthCardHandle
{
    if (!options || !Array.isArray(options.providers))
    {
        logError("Invalid options: providers array is required");
        throw new Error(`${LOG_PREFIX} options.providers must be an array (it may be empty).`);
    }

    const instance = new AuthCard(resolveHost(containerOrId), options);

    return {
        showError: (message: string) => instance.showError(message),
        clearError: () => instance.clearError(),
        getElement: () => instance.getElement(),
        destroy: () => instance.destroy(),
    };
}

// ============================================================================
// GLOBAL EXPORT
// ============================================================================

(window as unknown as Record<string, unknown>).createAuthCard = createAuthCard;
