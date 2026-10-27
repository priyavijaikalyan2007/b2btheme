/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: A2uiPlayground / Agent bar
 * 📜 PURPOSE: The agent's controls (#30 spec §5.1, §6.4, §6.5): provider,
 *    key (a password field, never written anywhere else in the DOM), model
 *    (required for OpenAI), remember-for-this-tab, Stop, Retry, New session,
 *    Save session, and the token usage the provider reports.
 * 🔗 RELATES: [[A2uiPlayground]], [[A2uiReferenceAgent]]
 * ----------------------------------------------------------------------------
 */

import type { Provider, Usage } from "../agent/types";
import type { KeyStore } from "./key-store";

export interface AgentBarActions
{
    defaultModel(id: Provider["id"]): string;
    changed(): void;
    stop(): void;
    retry(): void;
    newSession(): void;
    save(): void;
}

export interface AgentBar
{
    provider(): Provider["id"];
    providerLabel(): string;
    model(): string;
    ready(): boolean;
    onInput(listener: () => void): void;
    busy(on: boolean): void;
    canRetry(on: boolean): void;
    usage(u: Usage): void;
}

const LABELS: Record<Provider["id"], string> = { anthropic: "Claude", openai: "OpenAI" };

/** Builds the bar at the top of `el`. */
export function buildAgentBar(el: HTMLElement, keys: KeyStore, on: AgentBarActions): AgentBar
{
    const bar = node("div", "a2ui-agent-bar");
    const provider = select();
    const key = input("password", "API key", "a2ui-key");
    const model = input("text", "Model", "a2ui-model");
    const remember = checkbox();
    const [stop, retry, fresh, save] = [btn("Stop", on.stop), btn("Retry", on.retry), btn("New session", on.newSession),
        btn("Save session", on.save)];
    const usage = node("span", "a2ui-usage");
    const note = node("span", "a2ui-usage");

    key.value = keys.get();
    remember.box.checked = keys.remembered();
    model.value = on.defaultModel("anthropic");
    note.textContent = "Use a key with a spending limit. It is sent only to the provider you choose.";
    stop.disabled = true;
    retry.disabled = true;
    bar.append(provider, key, model, remember.label, stop, retry, fresh, save, usage, note);
    el.append(bar);
    wireKey(key, remember.box, keys, on, provider, model);

    return api(provider, model, key, stop, retry, usage);
}

function wireKey(key: HTMLInputElement, box: HTMLInputElement, keys: KeyStore, on: AgentBarActions,
    provider: HTMLSelectElement, model: HTMLInputElement): void
{
    const store = () =>
    {
        const warning = keys.set(key.value.trim(), box.checked);

        key.title = warning ?? "";
    };

    key.addEventListener("input", store);
    box.addEventListener("change", store);
    provider.addEventListener("change", () =>
    {
        model.value = on.defaultModel(provider.value as Provider["id"]);
        on.changed();
    });
}

function api(provider: HTMLSelectElement, model: HTMLInputElement, key: HTMLInputElement, stop: HTMLButtonElement,
    retry: HTMLButtonElement, usage: HTMLElement): AgentBar
{
    return {
        provider: () => provider.value as Provider["id"],
        providerLabel: () => LABELS[provider.value as Provider["id"]],
        model: () => model.value.trim(),
        ready: () => key.value.trim() !== "" && model.value.trim() !== "",
        onInput: (l) => { for (const e of [key, model, provider]) { e.addEventListener("input", l); } },
        busy: (on) => { stop.disabled = !on; },
        canRetry: (on) => { retry.disabled = !on; },
        usage: (u) => { usage.textContent = `in ${u.input} · out ${u.output} · cached ${u.cached}`; },
    };
}

function node(tag: string, className: string): HTMLElement
{
    const el = document.createElement(tag);

    el.className = className;

    return el;
}

function select(): HTMLSelectElement
{
    const el = document.createElement("select");

    el.className = "form-select form-select-sm w-auto";
    el.setAttribute("aria-label", "Provider");
    for (const [value, label] of Object.entries(LABELS)) { el.append(new Option(label, value)); }

    return el;
}

function input(type: "password" | "text", label: string, id: string): HTMLInputElement
{
    const el = document.createElement("input");

    el.type = type;
    el.id = id;
    el.className = "form-control form-control-sm";
    el.placeholder = label;
    el.autocomplete = "off";
    el.spellcheck = false;
    el.setAttribute("aria-label", label);

    return el;
}

function checkbox(): { label: HTMLLabelElement; box: HTMLInputElement }
{
    const label = document.createElement("label");
    const box = document.createElement("input");

    label.className = "form-check-label d-flex gap-1 align-items-center";
    box.type = "checkbox";
    box.className = "form-check-input";
    label.append(box, "Remember for this tab");

    return { label, box };
}

function btn(text: string, act: () => void): HTMLButtonElement
{
    const b = document.createElement("button");

    b.type = "button";
    b.className = "btn btn-sm btn-outline-secondary";
    b.textContent = text;
    b.addEventListener("click", act);

    return b;
}
