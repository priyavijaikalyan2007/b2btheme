/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: RuntimeMount. The declared factory argument order and attach
 *    method, shared by the conformance suite and the A2UI adapter. A declared
 *    method the handle lacks is an error, never a silent skip.
 */

import { describe, expect, test, vi } from "vitest";

import { attachHandle, invokerFor } from "./mount";

describe("invokerFor", () =>
{
    test("container-first (the default) calls f(id, options)", () =>
    {
        const f = vi.fn(() => ({}));

        invokerFor({})(f, "h1", { a: 1 });

        expect(f).toHaveBeenCalledWith("h1", { a: 1 });
    });

    test("options-first calls f(options, id)", () =>
    {
        const f = vi.fn(() => ({}));

        invokerFor({ factoryStyle: "options-first" })(f, "h1", { a: 1 });

        expect(f).toHaveBeenCalledWith({ a: 1 }, "h1");
    });

    test("options-only passes the host element under containerOption", () =>
    {
        document.body.innerHTML = `<div id="h1"></div>`;
        const f = vi.fn(() => ({}));

        invokerFor({ factoryStyle: "options-only", containerOption: "parent" })(f, "h1", { a: 1 });

        expect(f).toHaveBeenCalledWith({ a: 1, parent: document.getElementById("h1") });
    });

    test("options-only with containerAs id passes the id string under container", () =>
    {
        const f = vi.fn(() => ({}));

        invokerFor({ factoryStyle: "options-only", containerAs: "id" })(f, "h1", {});

        expect(f).toHaveBeenCalledWith({ container: "h1" });
    });
});

describe("attachHandle", () =>
{
    test("auto and an absent mountMethod attach nothing", () =>
    {
        const host = document.createElement("div");

        attachHandle({}, {}, host);
        attachHandle({}, { mountMethod: "auto" }, host);

        expect(host.childElementCount).toBe(0);
    });

    test("show calls handle.show(host)", () =>
    {
        const host = document.createElement("div");
        const show = vi.fn();

        attachHandle({ show }, { mountMethod: "show" }, host);

        expect(show).toHaveBeenCalledWith(host);
    });

    test("getElement appends the returned element", () =>
    {
        const host = document.createElement("div");
        const el = document.createElement("span");

        attachHandle({ getElement: () => el }, { mountMethod: "getElement" }, host);

        expect(host.firstChild).toBe(el);
    });

    test("a declared method the handle lacks throws a literate error", () =>
    {
        const host = document.createElement("div");

        expect(() => attachHandle({}, { mountMethod: "show" }, host))
            .toThrow(/mountMethod "show".*no show\(\) method/);
        expect(() => attachHandle({}, { mountMethod: "getElement" }, host))
            .toThrow(/mountMethod "getElement".*no getElement\(\) method/);
    });

    test("getElement returning a non-Element throws, naming the type", () =>
    {
        const host = document.createElement("div");

        expect(() => attachHandle({ getElement: () => "x" }, { mountMethod: "getElement" }, host))
            .toThrow(/getElement\(\) returned string, not an Element/);
    });
});
