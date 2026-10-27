/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: A2uiPlayground / KeyStore
 * 📜 PURPOSE: Where the user's own API key lives (#30 spec §6.5): in memory
 *    by default, so it is gone when the tab closes; in this tab's
 *    sessionStorage only when the user asks to remember it; never in
 *    localStorage. Every storage access is guarded, because storage can be
 *    blocked.
 * 🔗 RELATES: [[A2uiPlayground]], [[A2uiReferenceAgent]]
 * ----------------------------------------------------------------------------
 */

export const KEY_STORAGE_NAME = "a2ui-playground.key";
export const STORAGE_FAILED = "Could not use this tab's storage; the key is kept in memory only.";

export class KeyStore
{
    #key: string;

    constructor()
    {
        this.#key = read() ?? "";
    }

    /** The key, or "" when none is set. */
    get(): string
    {
        return this.#key;
    }

    /** True when the key is in this tab's storage. */
    remembered(): boolean
    {
        return read() !== null;
    }

    /**
     * Sets the key. `remember` stores it for this tab; otherwise any stored
     * copy is removed.
     *
     * @returns null, or STORAGE_FAILED when storage could not be used.
     */
    set(key: string, remember: boolean): string | null
    {
        this.#key = key;

        try
        {
            if (remember && key !== "") { sessionStorage.setItem(KEY_STORAGE_NAME, key); }
            else { sessionStorage.removeItem(KEY_STORAGE_NAME); }

            return null;
        }
        catch
        {
            return STORAGE_FAILED;
        }
    }

    /** Forgets the key, in memory and in storage. */
    clear(): void
    {
        this.#key = "";

        try { sessionStorage.removeItem(KEY_STORAGE_NAME); }
        catch { /* Blocked storage holds no copy to remove. */ }
    }
}

function read(): string | null
{
    try { return sessionStorage.getItem(KEY_STORAGE_NAME); }
    catch { return null; }
}
