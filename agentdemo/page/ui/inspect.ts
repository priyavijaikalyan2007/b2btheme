/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: A2uiPlayground / Inspect
 * 📜 PURPOSE: The inspect panel (#30 spec §5.3): the live data model, every
 *    outgoing action and error as the exact A2UI JSON an agent receives, the
 *    checker's findings, and the paste box with Check and Apply.
 * 🔗 RELATES: [[A2uiPlayground]], [[TabbedPanel]], [[LogConsole]], [[CodeEditor]]
 * ----------------------------------------------------------------------------
 */

import { factory } from "./factory";
import type { CodeEditorHandle, LogConsoleHandle, TabbedPanelHandle } from "./factory";

type CreateTabbedPanel = (options: Record<string, unknown>, container: HTMLElement) => TabbedPanelHandle;
type CreateCodeEditor = (containerId: string, options: Record<string, unknown>) => CodeEditorHandle;
type CreateLogConsole = (options: Record<string, unknown>) => LogConsoleHandle;

export type InspectTab = "data" | "actions" | "errors" | "check" | "paste";

export interface InspectHandlers
{
    check(text: string): void;
    apply(text: string): void;
}

export interface Inspect
{
    showData(models: Readonly<Record<string, unknown>>): void;
    action(message: unknown, recorded: boolean): void;
    error(message: unknown): void;
    showFindings(text: string): void;
    select(tab: InspectTab): void;
    pasteText(): string;
    setPasteText(text: string): void;
    clear(): void;
}

/** Builds the inspect panel in `el`. */
export function buildInspect(el: HTMLElement, on: InspectHandlers): Inspect
{
    const contents = { data: host("a2ui-data"), actions: host(), errors: host(), check: host(), paste: host() };
    const panel = factory<CreateTabbedPanel>("createTabbedPanel")({ contained: true, collapsible: false,
        tabs: [tab("data", "Data model", contents.data), tab("actions", "Actions", contents.actions),
            tab("errors", "Errors", contents.errors), tab("check", "Check", contents.check),
            tab("paste", "Paste", contents.paste)] }, el);

    new ResizeObserver(() => panel.setHeight(el.clientHeight)).observe(el);

    const data = factory<CreateCodeEditor>("createCodeEditor")("a2ui-data",
        { language: "json", readOnly: true, height: "100%", lineNumbers: false, showToolbar: false });
    const actions = logConsole(contents.actions);
    const errors = logConsole(contents.errors);
    const findings = document.createElement("pre");
    const paste = buildPaste(contents.paste, on);
    const pasteFindings = contents.paste.querySelector<HTMLElement>(".a2ui-paste-findings");

    findings.className = "a2ui-findings";
    findings.setAttribute("aria-live", "polite");
    contents.check.append(findings);

    return { showData: (m) => data.setValue(JSON.stringify(m, null, 2)),
        action: (m, recorded) => actions.info(`${recorded ? "recorded " : ""}${JSON.stringify(m)}`),
        error: (m) => errors.error(JSON.stringify(m)),
        showFindings: (t) => { findings.textContent = t; if (pasteFindings) { pasteFindings.textContent = t; } },
        select: (t) => panel.selectTab(t), pasteText: () => paste.getValue(), setPasteText: (t) => paste.setValue(t),
        clear: () => { actions.clear(); errors.clear(); findings.textContent = ""; data.setValue("{}"); } };
}

function host(id?: string): HTMLElement
{
    const el = document.createElement("div");

    if (id) { el.id = id; }
    el.className = "a2ui-pane";

    return el;
}

function tab(id: InspectTab, title: string, content: HTMLElement): Record<string, unknown>
{
    return { id, title, content };
}

function logConsole(el: HTMLElement): LogConsoleHandle
{
    const log = factory<CreateLogConsole>("createLogConsole")({ contained: true, height: "100%", showHeader: false });

    el.append(log.getElement());

    return log;
}

/** The paste editor with its Check and Apply buttons. */
function buildPaste(el: HTMLElement, on: InspectHandlers): CodeEditorHandle
{
    const editorHost = document.createElement("div");
    const bar = document.createElement("div");
    const status = document.createElement("pre");

    editorHost.id = "a2ui-paste";
    editorHost.style.height = "calc(100% - 7rem)";
    bar.className = "d-flex gap-2 p-1";
    status.className = "a2ui-paste-findings";
    status.setAttribute("aria-live", "polite");
    el.append(editorHost, bar, status);

    const editor = factory<CreateCodeEditor>("createCodeEditor")("a2ui-paste", { language: "json", height: "100%",
        showToolbar: false,
        placeholder: "Paste a JSON array of A2UI messages, or JSON Lines" });

    bar.append(button("Check", "btn-outline-secondary", () => on.check(editor.getValue())),
        button("Apply", "btn-primary", () => on.apply(editor.getValue())));

    return editor;
}

function button(label: string, cls: string, act: () => void): HTMLButtonElement
{
    const b = document.createElement("button");

    b.type = "button";
    b.className = `btn btn-sm ${cls}`;
    b.textContent = label;
    b.addEventListener("click", act);

    return b;
}
