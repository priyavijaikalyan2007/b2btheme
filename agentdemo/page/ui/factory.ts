/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: A2uiPlayground / Factories
 * 📜 PURPOSE: The library components the playground's chrome is built from,
 *    looked up on `window` (their scripts publish them) and typed with only
 *    the members the playground uses. A missing script is a literate error.
 * 🔗 RELATES: [[A2uiPlayground]], [[Toolbar]], [[SplitLayout]], [[CodeEditor]],
 *    [[TabbedPanel]], [[LogConsole]], [[Conversation]], [[ThemeToggle]]
 * ----------------------------------------------------------------------------
 */

export interface SplitLayoutHandle
{
    getPaneElement(paneId: string): HTMLElement | null;
}

export interface ToolbarHandle
{
    setToolState(id: string, state: { disabled?: boolean; active?: boolean; label?: string; icon?: string;
        value?: string }): void;
}

export interface CodeEditorHandle
{
    getValue(): string;
    setValue(value: string): void;
}

export interface TabbedPanelHandle
{
    selectTab(id: string): void;
    setHeight(px: number): void;
}

export interface LogConsoleHandle
{
    info(message: string): void;
    warn(message: string): void;
    error(message: string): void;
    clear(): void;
    getElement(): HTMLElement;
}

export interface ConversationHandle
{
    addUserMessage(text: string): unknown;
    addAssistantMessage(text: string): unknown;
    addSystemMessage(text: string): unknown;
    addError(e: { title: string; message: string }): unknown;
    showTypingIndicator(): void;
    hideTypingIndicator(): void;
    setDisabled(disabled: boolean): void;
    clearSession(): void;
}

/**
 * The factory `name`, published on window by its component's script.
 *
 * @throws When the script is not loaded.
 */
export function factory<F>(name: `create${string}`): F
{
    const f = window[name];

    if (typeof f !== "function")
    {
        throw new Error(`${name} is not on window: its component script is missing from the playground's index.html.`);
    }

    return f as F;
}

/** A pane element by id, or a literate error. */
export function pane(layout: SplitLayoutHandle, id: string): HTMLElement
{
    const el = layout.getPaneElement(id);

    if (!el) { throw new Error(`SplitLayout has no pane "${id}".`); }

    return el;
}
