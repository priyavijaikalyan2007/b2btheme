/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: A2uiPlayground / Toolbar
 * 📜 PURPOSE: The playground's toolbar (#30 spec §5.1): scenario picker,
 *    step controls, load file, paste, check, and the theme toggle.
 * 🔗 RELATES: [[A2uiPlayground]], [[Toolbar]], [[ThemeToggle]]
 * ----------------------------------------------------------------------------
 */

import { factory } from "./factory";
import type { ToolbarHandle } from "./factory";

/** Scenario controls start disabled; main.ts enables them once a scenario is loaded. */
const REPLAY = new Set(["back", "step", "play", "reset"]);

type CreateToolbar = (options: Record<string, unknown>, container: HTMLElement) => ToolbarHandle;
type CreateThemeToggle = (options: { container: HTMLElement; defaultTheme: "auto" }) => unknown;

export interface ToolbarActions
{
    scenario(name: string): void;
    back(): void;
    step(): void;
    play(): void;
    reset(): void;
    loadFile(text: string, name: string): void;
    paste(): void;
    check(): void;
}

export interface ScenarioEntry
{
    readonly name: string;
    readonly title: string;
    readonly provenance: "live" | "scripted";
}

/** Builds the toolbar; returns its handle for enabling and disabling tools. */
export function buildToolbar(el: HTMLElement, scenarios: readonly ScenarioEntry[], on: ToolbarActions): ToolbarHandle
{
    const options = [{ value: "", label: "Scenario…" }, ...scenarios.map((s) =>
        ({ value: s.name, label: `${s.title}${s.provenance === "scripted" ? " (scripted)" : ""}` }))];
    // The tooltip becomes the accessible name, so it starts with the visible label (WCAG 2.5.3, label in name).
    const tool = (id: string, icon: string, label: string, hint: string, onClick: () => void) =>
        ({ id, icon, label, tooltip: `${label}: ${hint}`, onClick, disabled: REPLAY.has(id) });
    const themeEl = document.createElement("div");
    const toolbar = factory<CreateToolbar>("createToolbar")({ label: "A2UI Playground", contained: true,
        style: "icon-label", rightContent: themeEl, regions: [
            { id: "replay", title: "Scenario", items: [
                { type: "dropdown", id: "scenario", tooltip: "Load a saved session", options, width: "16rem",
                    onChange: (v: string) => v && on.scenario(v) },
                tool("back", "bi-skip-start", "Back", "step back one line", on.back),
                tool("step", "bi-skip-end", "Step", "apply the next line", on.step),
                tool("play", "bi-play", "Play", "play the rest of the scenario", on.play),
                tool("reset", "bi-arrow-counterclockwise", "Reset", "delete every surface and start over", on.reset)] },
            { id: "input", title: "Messages", items: [
                tool("load", "bi-folder2-open", "Load file", "a .json, .jsonl or scenario file", () => pick(on)),
                tool("paste", "bi-clipboard", "Paste", "paste messages to check and apply", on.paste),
                tool("check", "bi-check2-square", "Check", "run the checker on the pasted messages", on.check)] },
        ] }, el);
    factory<CreateThemeToggle>("createThemeToggle")({ container: themeEl, defaultTheme: "auto" });

    return toolbar;
}

/** Opens a file picker and hands the chosen file's text to `on.loadFile`. */
function pick(on: ToolbarActions): void
{
    const input = document.createElement("input");

    input.type = "file";
    input.accept = ".json,.jsonl";
    input.addEventListener("change", async () =>
    {
        const file = input.files?.[0];

        if (file) { on.loadFile(await file.text(), file.name); }
    });
    input.click();
}
