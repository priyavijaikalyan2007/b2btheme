/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: A2uiPlayground / KeyStore. The user's API key lives in memory by
 *    default; "remember for this tab" uses sessionStorage only; localStorage
 *    is never touched; a storage failure keeps the key in memory and says so
 *    (#30 spec §6.5).
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { KEY_STORAGE_NAME, KeyStore, STORAGE_FAILED } from "./key-store";

const KEY = "sk-ant-test-123";

beforeEach(() =>
{
    sessionStorage.clear();
    localStorage.clear();
});

afterEach(() => vi.restoreAllMocks());

describe("KeyStore", () =>
{
    test("keeps the key in memory by default and touches no storage", () =>
    {
        const store = new KeyStore();

        expect(store.set(KEY, false)).toBeNull();
        expect(store.get()).toBe(KEY);
        expect(sessionStorage.length).toBe(0);
    });

    test("remember writes to sessionStorage, and a new store restores it", () =>
    {
        new KeyStore().set(KEY, true);

        expect(sessionStorage.getItem(KEY_STORAGE_NAME)).toBe(KEY);
        expect(new KeyStore().get()).toBe(KEY);
        expect(new KeyStore().remembered()).toBe(true);
    });

    test("setting without remember forgets a remembered key", () =>
    {
        const store = new KeyStore();

        store.set(KEY, true);
        store.set("other", false);

        expect(sessionStorage.getItem(KEY_STORAGE_NAME)).toBeNull();
    });

    test("clear forgets the key everywhere", () =>
    {
        const store = new KeyStore();

        store.set(KEY, true);
        store.clear();

        expect(store.get()).toBe("");
        expect(sessionStorage.getItem(KEY_STORAGE_NAME)).toBeNull();
    });

    test("a failing sessionStorage keeps the key in memory and says so", () =>
    {
        const blocked = () => { throw new Error("blocked"); };

        vi.stubGlobal("sessionStorage", { getItem: blocked, setItem: blocked, removeItem: blocked });
        const store = new KeyStore();

        expect(store.set(KEY, true)).toBe(STORAGE_FAILED);
        expect(store.get()).toBe(KEY);
        expect(store.remembered()).toBe(false);
        vi.unstubAllGlobals();
    });

    test("never writes the key to localStorage", () =>
    {
        const store = new KeyStore();

        store.set(KEY, true);
        store.clear();
        store.set(KEY, false);

        expect(localStorage.length).toBe(0);
    });
});
