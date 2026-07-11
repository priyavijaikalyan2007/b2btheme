/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 0de26cd5-fa73-4584-b0c0-85a07d4e780d
 *
 * ⚓ TESTS: ThemeInit
 * Vitest unit tests for the pre-paint theme-init script (Keycloak parity R2/R3).
 * Covers: cookie parsing + strict validation, localStorage fallback,
 * prefers-color-scheme resolution, auto-mode live OS tracking, cleanup,
 * legacy matchMedia APIs, missing matchMedia.
 */

import { describe, test, expect } from "vitest";
import
{
    parseThemeCookie,
    readThemeMode,
    resolveThemeMode,
    runThemeInit,
} from "./themeinit";
import type
{
    ThemeInitEnvironment,
} from "./themeinit";

// ============================================================================
// HELPERS
// ============================================================================

interface MediaHarness
{
    matchMedia: (query: string) => MediaQueryList;
    setDark(dark: boolean): void;
    listenerCount(): number;
}

/** Builds a controllable matchMedia double supporting modern + legacy APIs. */
function makeMediaHarness(initialDark: boolean, legacyOnly = false): MediaHarness
{
    const listeners: Array<(e: { matches: boolean }) => void> = [];
    let dark = initialDark;

    const mql: Record<string, unknown> = {
        get matches() { return dark; },
        media: "(prefers-color-scheme: dark)",
    };

    const add = (_type: unknown, cb?: unknown): void =>
    {
        const fn = (typeof _type === "function" ? _type : cb) as (e: { matches: boolean }) => void;
        listeners.push(fn);
    };
    const remove = (_type: unknown, cb?: unknown): void =>
    {
        const fn = (typeof _type === "function" ? _type : cb) as (e: { matches: boolean }) => void;
        const idx = listeners.indexOf(fn);
        if (idx >= 0) listeners.splice(idx, 1);
    };

    if (legacyOnly)
    {
        mql.addListener = add;
        mql.removeListener = remove;
    }
    else
    {
        mql.addEventListener = add;
        mql.removeEventListener = remove;
    }

    return {
        matchMedia: () => mql as unknown as MediaQueryList,
        setDark(next: boolean): void
        {
            dark = next;
            for (const cb of [...listeners]) cb({ matches: next });
        },
        listenerCount: () => listeners.length,
    };
}

interface EnvHarness
{
    env: ThemeInitEnvironment;
    root: HTMLElement;
    media: MediaHarness;
}

/** Builds a full ThemeInitEnvironment against a detached root element. */
function makeEnv(overrides?: Partial<{
    cookie: string;
    storage: string | null | (() => string | null);
    osDark: boolean;
    noMatchMedia: boolean;
    legacyMedia: boolean;
}>): EnvHarness
{
    const root = document.createElement("div");
    const media = makeMediaHarness(overrides?.osDark ?? false, overrides?.legacyMedia ?? false);
    const storage = overrides?.storage ?? null;

    const env: ThemeInitEnvironment = {
        cookie: overrides?.cookie ?? "",
        readStorage: typeof storage === "function" ? storage : () => storage,
        matchMedia: overrides?.noMatchMedia ? undefined : media.matchMedia,
        root,
    };
    return { env, root, media };
}

function themeOf(root: HTMLElement): string | null
{
    return root.getAttribute("data-bs-theme");
}

// ============================================================================
// COOKIE PARSING (R3.2 — strict validation)
// ============================================================================

describe("parseThemeCookie", () =>
{
    test("DarkValue_ReturnsDark", () =>
    {
        expect(parseThemeCookie("knobby-theme=dark")).toBe("dark");
    });

    test("LightValue_ReturnsLight", () =>
    {
        expect(parseThemeCookie("knobby-theme=light")).toBe("light");
    });

    test("AutoValue_ReturnsAuto", () =>
    {
        expect(parseThemeCookie("knobby-theme=auto")).toBe("auto");
    });

    test("AmongOtherCookies_FindsTheme", () =>
    {
        expect(parseThemeCookie("a=1; knobby-theme=dark; b=2")).toBe("dark");
    });

    test("LeadingWhitespace_FindsTheme", () =>
    {
        expect(parseThemeCookie("a=1;   knobby-theme=light")).toBe("light");
    });

    test("SuffixCookieName_DoesNotMatch", () =>
    {
        expect(parseThemeCookie("xknobby-theme=dark")).toBeNull();
    });

    test("UnexpectedValue_ReturnsNull", () =>
    {
        expect(parseThemeCookie("knobby-theme=banana")).toBeNull();
    });

    test("EncodedInjectionValue_ReturnsNull", () =>
    {
        expect(parseThemeCookie("knobby-theme=dark%3Bevil")).toBeNull();
    });

    test("EmptyCookieString_ReturnsNull", () =>
    {
        expect(parseThemeCookie("")).toBeNull();
    });

    test("DuplicateCookie_FirstOccurrenceWins", () =>
    {
        expect(parseThemeCookie("knobby-theme=dark; knobby-theme=light")).toBe("dark");
    });
});

// ============================================================================
// PREFERENCE RESOLUTION ORDER (R2.2 — cookie → localStorage → null)
// ============================================================================

describe("readThemeMode", () =>
{
    test("ValidCookie_WinsOverStorage", () =>
    {
        const { env } = makeEnv({ cookie: "knobby-theme=dark", storage: "light" });
        expect(readThemeMode(env)).toBe("dark");
    });

    test("InvalidCookie_FallsBackToStorage", () =>
    {
        const { env } = makeEnv({ cookie: "knobby-theme=nope", storage: "dark" });
        expect(readThemeMode(env)).toBe("dark");
    });

    test("NoCookie_ValidStorage_ReturnsStorage", () =>
    {
        const { env } = makeEnv({ storage: "auto" });
        expect(readThemeMode(env)).toBe("auto");
    });

    test("InvalidStorageValue_ReturnsNull", () =>
    {
        const { env } = makeEnv({ storage: "system" });
        expect(readThemeMode(env)).toBeNull();
    });

    test("ThrowingStorage_ReturnsNull", () =>
    {
        const { env } = makeEnv({ storage: () => { throw new Error("denied"); } });
        expect(readThemeMode(env)).toBeNull();
    });

    test("NoPreferenceAnywhere_ReturnsNull", () =>
    {
        const { env } = makeEnv();
        expect(readThemeMode(env)).toBeNull();
    });
});

// ============================================================================
// MODE → RESOLVED THEME (R1.2 / R2.3)
// ============================================================================

describe("resolveThemeMode", () =>
{
    test("Light_IgnoresOsDark", () =>
    {
        expect(resolveThemeMode("light", true)).toBe("light");
    });

    test("Dark_IgnoresOsLight", () =>
    {
        expect(resolveThemeMode("dark", false)).toBe("dark");
    });

    test("Auto_OsDark_ReturnsDark", () =>
    {
        expect(resolveThemeMode("auto", true)).toBe("dark");
    });

    test("Auto_OsLight_ReturnsLight", () =>
    {
        expect(resolveThemeMode("auto", false)).toBe("light");
    });

    test("NoPreference_OsDark_ReturnsDark", () =>
    {
        expect(resolveThemeMode(null, true)).toBe("dark");
    });

    test("NoPreference_OsLight_ReturnsLight", () =>
    {
        expect(resolveThemeMode(null, false)).toBe("light");
    });
});

// ============================================================================
// END-TO-END INIT (R2.3 sync set + AC#3 live OS tracking)
// ============================================================================

describe("runThemeInit", () =>
{
    test("CookieDark_SetsAttributeDark", () =>
    {
        const { env, root } = makeEnv({ cookie: "knobby-theme=dark" });
        runThemeInit(env);
        expect(themeOf(root)).toBe("dark");
    });

    test("CookieLight_SetsAttributeLight", () =>
    {
        const { env, root } = makeEnv({ cookie: "knobby-theme=light", osDark: true });
        runThemeInit(env);
        expect(themeOf(root)).toBe("light");
    });

    test("CookieAuto_OsDark_SetsAttributeDark", () =>
    {
        const { env, root } = makeEnv({ cookie: "knobby-theme=auto", osDark: true });
        runThemeInit(env);
        expect(themeOf(root)).toBe("dark");
    });

    test("CookieAuto_OsFlips_AttributeFollows", () =>
    {
        const { env, root, media } = makeEnv({ cookie: "knobby-theme=auto" });
        runThemeInit(env);
        media.setDark(true);
        expect(themeOf(root)).toBe("dark");
    });

    test("CookieDark_OsFlips_AttributeUnchanged", () =>
    {
        const { env, root, media } = makeEnv({ cookie: "knobby-theme=dark" });
        runThemeInit(env);
        media.setDark(true);
        expect(themeOf(root)).toBe("dark");
    });

    test("ExplicitMode_AttachesNoOsListener", () =>
    {
        const { env, media } = makeEnv({ cookie: "knobby-theme=light" });
        runThemeInit(env);
        expect(media.listenerCount()).toBe(0);
    });

    test("NoPreference_OsFlips_AttributeFollows", () =>
    {
        const { env, root, media } = makeEnv();
        runThemeInit(env);
        media.setDark(true);
        expect(themeOf(root)).toBe("dark");
    });

    test("Cleanup_RemovesOsListener", () =>
    {
        const { env, root, media } = makeEnv({ cookie: "knobby-theme=auto" });
        const cleanup = runThemeInit(env);
        cleanup();
        media.setDark(true);
        expect(themeOf(root)).toBe("light");
    });

    test("Cleanup_LeavesNoListenerBehind", () =>
    {
        const { env, media } = makeEnv({ cookie: "knobby-theme=auto" });
        const cleanup = runThemeInit(env);
        cleanup();
        expect(media.listenerCount()).toBe(0);
    });

    test("LegacyMatchMediaApi_StillTracksOs", () =>
    {
        const { env, root, media } = makeEnv({ cookie: "knobby-theme=auto", legacyMedia: true });
        runThemeInit(env);
        media.setDark(true);
        expect(themeOf(root)).toBe("dark");
    });

    test("MissingMatchMedia_AutoDefaultsToLight", () =>
    {
        const { env, root } = makeEnv({ cookie: "knobby-theme=auto", noMatchMedia: true });
        runThemeInit(env);
        expect(themeOf(root)).toBe("light");
    });

    test("InvalidCookie_ValidStorage_UsesStorage", () =>
    {
        const { env, root } = makeEnv({ cookie: "knobby-theme=evil", storage: "dark" });
        runThemeInit(env);
        expect(themeOf(root)).toBe("dark");
    });
});
