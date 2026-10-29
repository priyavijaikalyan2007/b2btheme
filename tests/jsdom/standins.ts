/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: JsdomStandIns
 * 📜 PURPOSE: Stand-ins for vendored libraries jsdom cannot run, for the
 *    suites that mount components without a browser: the conformance gate
 *    (runtime/fleet-conformance.test.ts) and A2UI G3 (a2ui/fleet-adapter.test.ts).
 *    Real Vditor loads its markdown engine (Lute) through a <script> it
 *    injects, which jsdom never runs; the browser suite loads the real one.
 *    Keyed by dist/lib-manifest.json name (ADR-230). They live under tests/,
 *    not beside a component: a component file that writes a library's global
 *    would read as owning it (readiness step 2 B5).
 * 🔗 RELATES: [[A2uiAdapter]], [[Conformance]], [[MarkdownEditor]]
 * ----------------------------------------------------------------------------
 */

/** The options MarkdownEditor passes Vditor that the stand-in acts on. */
interface StandInOptions
{
    value?: string;
    after?: () => void;
    ctrlEnter?: (value: string) => void;
}

export class VditorStandIn
{
    /** Every instance, newest last, so a trigger can reach the one it mounted. */
    static readonly instances: VditorStandIn[] = [];

    /** Display mode's renderer: the markdown as text, then Vditor's after callback. */
    static preview(el: HTMLElement, markdown: string, options: { after?: () => void } = {}): void
    {
        el.textContent = markdown;
        options.after?.();
    }

    readonly options: StandInOptions;
    private value: string;

    constructor(el: HTMLElement | string, options: StandInOptions)
    {
        const host = typeof el === "string" ? document.getElementById(el) : el;

        if (!host) { throw new Error(`VditorStandIn: no element ${String(el)}.`); }

        this.options = options;
        this.value = options.value ?? "";
        host.appendChild(Object.assign(document.createElement("div"), { className: "vditor" }));
        VditorStandIn.instances.push(this);

        if (options.after) { setTimeout(options.after, 0); }
    }

    getValue(): string { return this.value; }
    setValue(v: string): void { this.value = v; }
    getHTML(): string { return `<p>${this.value}</p>`; }
    destroy(): void { /* nothing held */ }
    focus(): void { /* nothing to focus */ }
    blur(): void { /* nothing to blur */ }
    disabled(): void { /* stays editable */ }
    enable(): void { /* already editable */ }

    /** Presses Ctrl+Enter, as Vditor does when the user saves. */
    pressCtrlEnter(): void { this.options.ctrlEnter?.(this.value); }
}

/** Puts the stand-in where MarkdownEditor looks for Vditor. */
function installVditorStandIn(): void
{
    (window as unknown as { Vditor: unknown }).Vditor = VditorStandIn;
}

/** Installers by library name; a library without one runs its built file. */
export const JSDOM_STANDINS: Readonly<Record<string, () => void>> = { vditor: installVditorStandIn };
