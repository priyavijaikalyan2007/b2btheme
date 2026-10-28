/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: MarkdownEditor / ConformanceGlue
 * 📜 PURPOSE: Channel trigger for the conformance gate and A2UI G3, and a
 *    jsdom stand-in for Vditor. Real Vditor loads its markdown engine (Lute)
 *    through a <script> it injects, which jsdom never runs, so the suites that
 *    mount without a browser install this instead (jsdomStandIns); the browser
 *    suite loads the real one. It lives here, not in a .mock.ts, because the
 *    build excludes glue files and would ship a mock (readiness step 2 B5).
 * 🔗 RELATES: [[MarkdownEditor]], [[Conformance]]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker markdowneditor-conformance-glue

/** The options MarkdownEditor passes Vditor that the stand-in acts on. */
interface StandInOptions
{
    value?: string;
    after?: () => void;
    ctrlEnter?: (value: string) => void;
}

class VditorStandIn
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

export const CONFORMANCE_GLUE =
{
    // Libraries jsdom cannot run, replaced for the suites that mount without a browser (ADR-230).
    jsdomStandIns: { vditor: installVditorStandIn },

    trigger: (channel: string): boolean =>
    {
        const editor = VditorStandIn.instances.at(-1);

        if (channel !== "save" || !editor) { return false; }

        editor.pressCtrlEnter();

        return true;
    },
};
