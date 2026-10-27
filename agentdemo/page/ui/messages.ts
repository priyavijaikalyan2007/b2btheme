/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: A2uiPlayground / Messages view
 * 📜 PURPOSE: The message log beside the surfaces (#30 spec §5.3): number,
 *    type and status of every message, and the selected one as JSON. This is
 *    the "under the hood" view developers asked to see (P2).
 * 🔗 RELATES: [[A2uiPlayground]], [[A2uiPlaygroundLogModel]], [[CodeEditor]]
 * ----------------------------------------------------------------------------
 */

import { factory } from "./factory";
import type { CodeEditorHandle } from "./factory";
import type { LogEntry, LogModel } from "../log-model";

type CreateCodeEditor = (containerId: string, options: Record<string, unknown>) => CodeEditorHandle;

const TYPES = ["createSurface", "updateComponents", "updateDataModel", "deleteSurface"];

/** Renders `log` into `el` and keeps it current; the newest entry is selected after every change. */
export function buildMessagesView(el: HTMLElement, log: LogModel): void
{
    const list = document.createElement("ol");
    const editorHost = document.createElement("div");

    list.className = "a2ui-log";
    list.setAttribute("aria-label", "Messages");
    editorHost.id = "a2ui-message-json";
    editorHost.style.height = "55%";
    list.style.maxHeight = "45%";
    list.style.overflow = "auto";
    el.append(list, editorHost);

    const editor = factory<CreateCodeEditor>("createCodeEditor")("a2ui-message-json",
        { language: "json", readOnly: true, height: "100%", lineNumbers: false, wordWrap: true,
            showToolbar: false });
    const show = (entry: LogEntry | undefined) => editor.setValue(entry ? JSON.stringify(entry.message, null, 2) : "");

    log.onChange(() =>
    {
        const entries = log.entries();

        list.replaceChildren(...entries.map((e) => item(e, () => select(list, e, show))));
        if (entries.length > 0) { select(list, entries[entries.length - 1], show); }
        else { show(undefined); }
    });
}

function item(entry: LogEntry, onClick: () => void): HTMLLIElement
{
    const li = document.createElement("li");

    li.dataset.index = String(entry.index);
    li.dataset.status = entry.status;
    li.textContent = `#${entry.index} ${typeOf(entry.message)} · ${entry.source}`;
    li.addEventListener("click", onClick);

    return li;
}

function select(list: HTMLElement, entry: LogEntry, show: (e: LogEntry) => void): void
{
    for (const li of list.children)
    {
        li.setAttribute("aria-current", String(li.getAttribute("data-index") === String(entry.index)));
    }
    show(entry);
}

function typeOf(message: unknown): string
{
    const keys = message !== null && typeof message === "object" ? Object.keys(message) : [];

    return TYPES.find((t) => keys.includes(t)) ?? "(not an A2UI message)";
}
