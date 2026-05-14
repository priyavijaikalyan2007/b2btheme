/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 *
 * TESTS: DynamicFormSwitcher
 *
 * Drives Acceptance Criteria 1–18 from specs/dynamicformswitcher.req.md.
 * Each criterion maps to one or more tests; sections are labelled accordingly.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import {
    createDynamicFormSwitcher,
    registerDynamicFormFieldProvider,
    unregisterDynamicFormFieldProvider,
} from "./dynamicformswitcher";
import type {
    DynamicFormSwitcherHandle,
    DynamicFormSwitcherOptions,
    DynamicFormVariant,
} from "./dynamicformswitcher";

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

let container: HTMLDivElement;

function makeVariants(): Record<string, DynamicFormVariant>
{
    return {
        api_key: {
            label: "API Key",
            icon: "bi-key",
            description: "Pass an API key in a header on every request.",
            fields: [
                { name: "base_url",    label: "Base URL",    type: "url",      required: true },
                { name: "api_key",     label: "API Key",     type: "password", required: true },
                { name: "header_name", label: "Header Name", type: "text",     placeholder: "X-Api-Key" },
            ],
        },
        basic: {
            label: "Basic Auth",
            icon: "bi-person-lock",
            fields: [
                { name: "base_url", label: "Base URL", type: "url",      required: true },
                { name: "username", label: "Username", type: "text",     required: true },
                { name: "password", label: "Password", type: "password", required: true },
            ],
        },
        none: {
            label: "None",
            fields: [
                { name: "base_url", label: "Base URL", type: "url", required: true },
            ],
        },
    };
}

function build(overrides?: Partial<DynamicFormSwitcherOptions>): DynamicFormSwitcherHandle
{
    const opts: DynamicFormSwitcherOptions = {
        variants: makeVariants(),
        initialVariant: "api_key",
        ...overrides,
    };
    return createDynamicFormSwitcher(container, opts);
}

function fieldEl(name: string): HTMLElement | null
{
    return container.querySelector(`[data-field-name="${name}"]`);
}

function input(name: string): HTMLInputElement | null
{
    return container.querySelector(`[name="${name}"]`) as HTMLInputElement | null;
}

function setValue(name: string, value: string): void
{
    const el = input(name)!;
    el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
}

function check(name: string, checked: boolean): void
{
    const el = input(name)!;
    el.checked = checked;
    el.dispatchEvent(new Event("change", { bubbles: true }));
}

// ---------------------------------------------------------------------------
// SETUP / TEARDOWN
// ---------------------------------------------------------------------------

beforeEach(() =>
{
    container = document.createElement("div");
    container.id = "dfs-host";
    document.body.appendChild(container);
});

afterEach(() =>
{
    container.remove();
});

// ===========================================================================
// FACTORY
// ===========================================================================

describe("createDynamicFormSwitcher", () =>
{
    test("returnsHandleObject", () =>
    {
        const handle = build();
        expect(typeof handle.getVariant).toBe("function");
        expect(typeof handle.setVariant).toBe("function");
        expect(typeof handle.getValues).toBe("function");
        expect(typeof handle.getAllValues).toBe("function");
        expect(typeof handle.setValues).toBe("function");
        expect(typeof handle.clearValues).toBe("function");
        expect(typeof handle.validate).toBe("function");
        expect(typeof handle.reset).toBe("function");
        expect(typeof handle.resetAll).toBe("function");
        expect(typeof handle.refresh).toBe("function");
        expect(typeof handle.destroy).toBe("function");
        handle.destroy();
    });

    test("throwsWhenInitialVariantUnknown", () =>
    {
        expect(() =>
            createDynamicFormSwitcher(container, {
                variants: makeVariants(),
                initialVariant: "nonexistent",
            }),
        ).toThrow();
    });
});

// ===========================================================================
// AC #1: renders initial variant's fields on first render
// ===========================================================================

describe("initialRender", () =>
{
    test("rendersFieldsOfInitialVariant", () =>
    {
        const handle = build({ initialVariant: "basic" });

        expect(fieldEl("base_url")).not.toBeNull();
        expect(fieldEl("username")).not.toBeNull();
        expect(fieldEl("password")).not.toBeNull();
        expect(fieldEl("api_key")).toBeNull();

        handle.destroy();
    });

    test("rendersVariantDescriptionAboveFields", () =>
    {
        const handle = build({ initialVariant: "api_key" });
        const desc = container.querySelector(".dynamicformswitcher-description");
        expect(desc?.textContent).toContain("API key in a header");
        handle.destroy();
    });

    test("emptyFieldsVariantRendersWithoutCrash", () =>
    {
        const handle = createDynamicFormSwitcher(container, {
            variants: {
                empty: { label: "Empty", description: "nothing here", fields: [] },
            },
            initialVariant: "empty",
        });
        expect(container.querySelector(".dynamicformswitcher-description")?.textContent)
            .toContain("nothing here");
        handle.destroy();
    });
});

// ===========================================================================
// AC #2 & AC #5: setVariant + state retention
// ===========================================================================

describe("setVariant", () =>
{
    test("swapsRenderedFields", () =>
    {
        const handle = build();
        expect(fieldEl("api_key")).not.toBeNull();

        handle.setVariant("basic");
        expect(fieldEl("api_key")).toBeNull();
        expect(fieldEl("username")).not.toBeNull();
        expect(handle.getVariant()).toBe("basic");
        handle.destroy();
    });

    test("throwsForUnknownVariant", () =>
    {
        const handle = build();
        expect(() => handle.setVariant("xyz")).toThrow();
        handle.destroy();
    });

    test("settingToCurrentVariantIsNoOp", () =>
    {
        const onVariantChange = vi.fn();
        const handle = build({ onVariantChange });

        handle.setVariant("api_key");      // already api_key
        expect(onVariantChange).not.toHaveBeenCalled();
        handle.destroy();
    });

    test("retainsValuesAcrossSwitches", () =>
    {
        const handle = build();

        setValue("base_url", "https://a.example.com");
        setValue("api_key", "secret123");

        handle.setVariant("basic");
        setValue("username", "alice");

        handle.setVariant("api_key");
        expect(input("base_url")!.value).toBe("https://a.example.com");
        expect(input("api_key")!.value).toBe("secret123");

        handle.setVariant("basic");
        expect(input("username")!.value).toBe("alice");

        handle.destroy();
    });

    test("retainStateAcrossSwitchesFalseWipesPriorVariant", () =>
    {
        const handle = build({ retainStateAcrossSwitches: false });

        setValue("base_url", "https://x.com");
        handle.setVariant("basic");
        handle.setVariant("api_key");

        expect(input("base_url")!.value).toBe("");
        handle.destroy();
    });
});

// ===========================================================================
// AC #3 & AC #4: built-in selectors (dropdown, segmented, tabs)
// ===========================================================================

describe("builtInSelector", () =>
{
    test("dropdownStyleRendersSelect", () =>
    {
        const handle = build({ showSelector: true, selectorStyle: "dropdown" });
        const sel = container.querySelector(".dynamicformswitcher-selector select") as HTMLSelectElement;
        expect(sel).not.toBeNull();
        expect(sel.options.length).toBe(3);
        expect(sel.value).toBe("api_key");
        handle.destroy();
    });

    test("dropdownChangeSwitchesVariant", () =>
    {
        const onVariantChange = vi.fn();
        const handle = build({ showSelector: true, selectorStyle: "dropdown", onVariantChange });

        const sel = container.querySelector(".dynamicformswitcher-selector select") as HTMLSelectElement;
        sel.value = "basic";
        sel.dispatchEvent(new Event("change", { bubbles: true }));

        expect(handle.getVariant()).toBe("basic");
        expect(onVariantChange).toHaveBeenCalledWith("basic", "api_key");
        handle.destroy();
    });

    test("segmentedStyleRendersButtons", () =>
    {
        const handle = build({ showSelector: true, selectorStyle: "segmented" });
        const buttons = container.querySelectorAll(".dynamicformswitcher-segment");
        expect(buttons.length).toBe(3);

        const second = buttons[1] as HTMLButtonElement;
        second.click();
        expect(handle.getVariant()).toBe("basic");
        handle.destroy();
    });

    test("tabsStyleRendersTablist", () =>
    {
        const handle = build({ showSelector: true, selectorStyle: "tabs" });
        const tablist = container.querySelector('[role="tablist"]');
        expect(tablist).not.toBeNull();

        const tabs = container.querySelectorAll('[role="tab"]');
        expect(tabs.length).toBeGreaterThanOrEqual(3);
        (tabs[2] as HTMLElement).click();
        expect(handle.getVariant()).toBe("none");
        handle.destroy();
    });

    test("selectorLabelAndHelpTextRender", () =>
    {
        const handle = build({
            showSelector: true,
            selectorLabel: "Auth Method",
            selectorHelpText: "Pick one",
        });
        expect(container.textContent).toContain("Auth Method");
        expect(container.textContent).toContain("Pick one");
        handle.destroy();
    });

    test("showSelectorDefaultsToFalse", () =>
    {
        const handle = build();
        expect(container.querySelector(".dynamicformswitcher-selector")).toBeNull();
        handle.destroy();
    });
});

// ===========================================================================
// AC #6 & AC #7: getAllValues / getValues
// ===========================================================================

describe("valueAccess", () =>
{
    test("getValuesReturnsActiveVariantOnly", () =>
    {
        const handle = build();
        setValue("base_url", "https://a.example.com");
        setValue("api_key", "k1");

        const v = handle.getValues();
        expect(v.base_url).toBe("https://a.example.com");
        expect(v.api_key).toBe("k1");
        expect("username" in v).toBe(false);
        handle.destroy();
    });

    test("getAllValuesReturnsPerVariantNestedMap", () =>
    {
        const handle = build();
        setValue("base_url", "https://a.com");
        handle.setVariant("basic");
        setValue("username", "alice");

        const all = handle.getAllValues();
        expect(all.api_key.base_url).toBe("https://a.com");
        expect(all.basic.username).toBe("alice");
        handle.destroy();
    });

    test("nativeTypedValuesNotStrings", () =>
    {
        const handle = createDynamicFormSwitcher(container, {
            variants: {
                v: {
                    label: "v",
                    fields: [
                        { name: "count",  label: "Count", type: "number" },
                        { name: "enabled",label: "Enabled", type: "toggle" },
                        { name: "tags",   label: "Tags",  type: "multiselect",
                          options: [{ value: "a", label: "A" }, { value: "b", label: "B" }] },
                    ],
                },
            },
            initialVariant: "v",
        });

        setValue("count", "42");
        check("enabled", true);
        const sel = input("tags") as unknown as HTMLSelectElement;
        for (const o of Array.from(sel.options))
        {
            o.selected = (o.value === "a" || o.value === "b");
        }
        sel.dispatchEvent(new Event("change", { bubbles: true }));

        const v = handle.getValues();
        expect(v.count).toBe(42);
        expect(typeof v.count).toBe("number");
        expect(v.enabled).toBe(true);
        expect(typeof v.enabled).toBe("boolean");
        expect(Array.isArray(v.tags)).toBe(true);
        expect(v.tags).toEqual(["a", "b"]);

        handle.destroy();
    });

    test("emptyNumberReturnsNull", () =>
    {
        const handle = createDynamicFormSwitcher(container, {
            variants: { v: { label: "v", fields: [{ name: "n", label: "N", type: "number" }] } },
            initialVariant: "v",
        });
        expect(handle.getValues().n).toBeNull();
        handle.destroy();
    });
});

// ===========================================================================
// AC #8: setValues populates a non-active variant
// ===========================================================================

describe("setValues", () =>
{
    test("populatesInactiveVariant", () =>
    {
        const handle = build();
        handle.setValues("basic", { username: "carol" });

        handle.setVariant("basic");
        expect(input("username")!.value).toBe("carol");
        handle.destroy();
    });

    test("rerendersActiveVariant", () =>
    {
        const handle = build();
        handle.setValues("api_key", { base_url: "https://b.example" });
        expect(input("base_url")!.value).toBe("https://b.example");
        handle.destroy();
    });

    test("clearValuesRemovesStoredValues", () =>
    {
        const handle = build();
        setValue("base_url", "https://x");
        handle.setVariant("basic");
        handle.clearValues("api_key");

        handle.setVariant("api_key");
        expect(input("base_url")!.value).toBe("");
        handle.destroy();
    });

    test("clearValuesWithoutIdClearsAll", () =>
    {
        const handle = build();
        setValue("base_url", "https://x");
        handle.setVariant("basic");
        setValue("username", "y");
        handle.clearValues();

        handle.setVariant("api_key");
        expect(input("base_url")!.value).toBe("");
        handle.setVariant("basic");
        expect(input("username")!.value).toBe("");
        handle.destroy();
    });
});

// ===========================================================================
// AC #9 & AC #10: validate + onValidate veto
// ===========================================================================

describe("validate", () =>
{
    test("runsActiveVariantOnly", () =>
    {
        const handle = build();
        // api_key requires base_url + api_key. Fill them; validate true.
        setValue("base_url", "https://a.example");
        setValue("api_key", "k");
        expect(handle.validate()).toBe(true);

        // Switch to basic with empty username/password — should fail.
        handle.setVariant("basic");
        expect(handle.validate()).toBe(false);
        handle.destroy();
    });

    test("requiredFieldEmptyShowsError", () =>
    {
        const handle = build();
        expect(handle.validate()).toBe(false);
        expect(fieldEl("base_url")?.classList.contains("dynamicformswitcher-group-invalid"))
            .toBe(true);
        handle.destroy();
    });

    test("perFieldValidatorReturnsErrorStringBlocks", () =>
    {
        const handle = createDynamicFormSwitcher(container, {
            variants: {
                v: {
                    label: "v",
                    fields: [
                        { name: "n", label: "N", type: "text",
                          validate: (val) => (val === "ok" ? null : "must be ok") },
                    ],
                },
            },
            initialVariant: "v",
        });
        setValue("n", "bad");
        expect(handle.validate()).toBe(false);

        setValue("n", "ok");
        expect(handle.validate()).toBe(true);
        handle.destroy();
    });

    test("onValidateCanVetoPassingVariant", () =>
    {
        const onValidate = vi.fn(() => "cross-field error");
        const handle = build({ onValidate });
        setValue("base_url", "https://a.example");
        setValue("api_key", "k");
        expect(handle.validate()).toBe(false);
        expect(onValidate).toHaveBeenCalled();
        handle.destroy();
    });

    test("onValidateNullDoesNotBlock", () =>
    {
        const onValidate = vi.fn(() => null);
        const handle = build({ onValidate });
        setValue("base_url", "https://a.example");
        setValue("api_key", "k");
        expect(handle.validate()).toBe(true);
        handle.destroy();
    });
});

// ===========================================================================
// AC #11: every FormDialog field type works inside a variant
// ===========================================================================

describe("fieldTypes", () =>
{
    function variantWithFields(fields: DynamicFormVariant["fields"]): Record<string, DynamicFormVariant>
    {
        return { v: { label: "v", fields } };
    }

    test("textEmailPasswordUrlNumber", () =>
    {
        const handle = createDynamicFormSwitcher(container, {
            variants: variantWithFields([
                { name: "t", label: "T", type: "text" },
                { name: "e", label: "E", type: "email" },
                { name: "p", label: "P", type: "password" },
                { name: "u", label: "U", type: "url" },
                { name: "n", label: "N", type: "number" },
            ]),
            initialVariant: "v",
        });
        expect(input("t")?.type).toBe("text");
        expect(input("e")?.type).toBe("email");
        expect(input("p")?.type).toBe("password");
        expect(input("u")?.type).toBe("url");
        expect(input("n")?.type).toBe("number");
        handle.destroy();
    });

    test("textareaToggleCheckboxSelectRadio", () =>
    {
        const handle = createDynamicFormSwitcher(container, {
            variants: variantWithFields([
                { name: "ta", label: "TA", type: "textarea" },
                { name: "tg", label: "TG", type: "toggle" },
                { name: "cb", label: "CB", type: "checkbox" },
                { name: "sl", label: "SL", type: "select",
                  options: [{ value: "x", label: "X" }] },
                { name: "rd", label: "RD", type: "radio",
                  options: [{ value: "a", label: "A" }, { value: "b", label: "B" }] },
            ]),
            initialVariant: "v",
        });
        expect(container.querySelector('textarea[name="ta"]')).not.toBeNull();
        expect((input("tg") as HTMLInputElement).type).toBe("checkbox");
        expect((input("cb") as HTMLInputElement).type).toBe("checkbox");
        expect(container.querySelector('select[name="sl"]')).not.toBeNull();
        const radios = container.querySelectorAll('input[type="radio"][name="rd"]');
        expect(radios.length).toBe(2);
        handle.destroy();
    });

    test("dateDatetimeTimeFileColor", () =>
    {
        const handle = createDynamicFormSwitcher(container, {
            variants: variantWithFields([
                { name: "d",  label: "D",  type: "date" },
                { name: "dt", label: "DT", type: "datetime" },
                { name: "tm", label: "TM", type: "time" },
                { name: "f",  label: "F",  type: "file" },
                { name: "c",  label: "C",  type: "color" },
            ]),
            initialVariant: "v",
        });
        expect(input("d")?.type).toBe("date");
        expect(["datetime-local", "datetime"].includes(input("dt")!.type)).toBe(true);
        expect(input("tm")?.type).toBe("time");
        expect(input("f")?.type).toBe("file");
        expect(input("c")?.type).toBe("color");
        handle.destroy();
    });

    test("multiselectRendersMultipleSelect", () =>
    {
        const handle = createDynamicFormSwitcher(container, {
            variants: variantWithFields([
                { name: "m", label: "M", type: "multiselect",
                  options: [{ value: "a", label: "A" }, { value: "b", label: "B" }] },
            ]),
            initialVariant: "v",
        });
        const sel = container.querySelector('select[name="m"]') as HTMLSelectElement;
        expect(sel.multiple).toBe(true);
        handle.destroy();
    });

    test("codeAndRichtextDegradeGracefully", () =>
    {
        // CDN deps not loaded in jsdom — component must fall back to textarea/editable div.
        const handle = createDynamicFormSwitcher(container, {
            variants: variantWithFields([
                { name: "code", label: "Code", type: "code" },
                { name: "rtx",  label: "Rich", type: "richtext" },
            ]),
            initialVariant: "v",
        });
        expect(fieldEl("code")).not.toBeNull();
        expect(fieldEl("rtx")).not.toBeNull();
        handle.destroy();
    });

    test("customFieldAttachesElement", () =>
    {
        const probe = document.createElement("div");
        probe.id = "probe";
        probe.textContent = "custom!";
        (probe as unknown as { getValue: () => unknown }).getValue = () => ({ hello: "world" });

        const handle = createDynamicFormSwitcher(container, {
            variants: {
                v: { label: "v", fields: [
                    { name: "x", label: "X", type: "custom", customElement: probe },
                ] },
            },
            initialVariant: "v",
        });
        expect(container.querySelector("#probe")).not.toBeNull();
        expect(handle.getValues().x).toEqual({ hello: "world" });
        handle.destroy();
    });
});

// ===========================================================================
// AC #12: value accepts flat AND nested
// ===========================================================================

describe("valueOption", () =>
{
    test("flatShapeAppliesToInitialVariant", () =>
    {
        const handle = build({ value: { base_url: "https://flat.example", api_key: "K" } });
        expect(input("base_url")!.value).toBe("https://flat.example");
        expect(input("api_key")!.value).toBe("K");
        handle.destroy();
    });

    test("nestedShapePopulatesMultipleVariants", () =>
    {
        const handle = build({
            value: {
                api_key: { base_url: "https://a.example", api_key: "K" },
                basic:   { username: "alice" },
            },
        });
        expect(input("base_url")!.value).toBe("https://a.example");
        handle.setVariant("basic");
        expect(input("username")!.value).toBe("alice");
        handle.destroy();
    });
});

// ===========================================================================
// AC #13: retainStateAcrossSwitches:false covered in setVariant section above
// AC #14: embedding works (validate via getValues round-trip)
// ===========================================================================

describe("hostIntegration", () =>
{
    test("onChangeFiresOnFieldEditWithActiveVariantValues", () =>
    {
        const onChange = vi.fn();
        const handle = build({ onChange });
        setValue("base_url", "https://x.com");
        expect(onChange).toHaveBeenCalled();
        const [variantId, values] = onChange.mock.calls[onChange.mock.calls.length - 1];
        expect(variantId).toBe("api_key");
        expect((values as Record<string, unknown>).base_url).toBe("https://x.com");
        handle.destroy();
    });

    test("onVariantChangeFiresWithPreviousId", () =>
    {
        const onVariantChange = vi.fn();
        const handle = build({ onVariantChange });
        handle.setVariant("basic");
        expect(onVariantChange).toHaveBeenCalledWith("basic", "api_key");
        handle.destroy();
    });
});

// ===========================================================================
// AC #15: dark mode via data-bs-theme (no explicit prop)
// ===========================================================================

describe("darkMode", () =>
{
    test("inheritsDataBsTheme", () =>
    {
        document.documentElement.setAttribute("data-bs-theme", "dark");
        const handle = build();
        const wrapper = container.querySelector(".dynamicformswitcher") as HTMLElement;
        expect(wrapper).not.toBeNull();
        // Cleanup
        document.documentElement.removeAttribute("data-bs-theme");
        handle.destroy();
    });
});

// ===========================================================================
// AC #16 & AC #17: keyboard navigation + ARIA
// ===========================================================================

describe("a11y", () =>
{
    test("formRegionHasAriaLabel", () =>
    {
        const handle = build();
        const region = container.querySelector('[role="region"]');
        expect(region).not.toBeNull();
        expect(region?.getAttribute("aria-label")).toContain("API Key");
        handle.destroy();
    });

    test("ariaLiveOnVariantChange", () =>
    {
        const handle = build();
        const region = container.querySelector('[role="region"]');
        expect(region?.getAttribute("aria-live")).toBe("polite");
        handle.destroy();
    });

    test("segmentedKeyboardArrowNavigation", () =>
    {
        const handle = build({ showSelector: true, selectorStyle: "segmented" });
        const tablist = container.querySelector('[role="tablist"]') as HTMLElement;
        const segs = tablist.querySelectorAll<HTMLElement>('[role="tab"]');
        segs[0].focus();
        segs[0].dispatchEvent(new KeyboardEvent("keydown",
            { key: "ArrowRight", bubbles: true }));
        expect(handle.getVariant()).toBe("basic");
        handle.destroy();
    });

    test("tabsAriaSelectedReflectsActive", () =>
    {
        const handle = build({ showSelector: true, selectorStyle: "tabs" });
        const tabs = container.querySelectorAll<HTMLElement>('[role="tab"]');
        expect(tabs[0].getAttribute("aria-selected")).toBe("true");
        expect(tabs[1].getAttribute("aria-selected")).toBe("false");

        handle.setVariant("basic");
        expect(tabs[0].getAttribute("aria-selected")).toBe("false");
        expect(tabs[1].getAttribute("aria-selected")).toBe("true");
        handle.destroy();
    });
});

// ===========================================================================
// AC #18: destroy() teardown + idempotency
// ===========================================================================

describe("lifecycle", () =>
{
    test("destroyRemovesDom", () =>
    {
        const handle = build();
        expect(container.querySelector(".dynamicformswitcher")).not.toBeNull();
        handle.destroy();
        expect(container.querySelector(".dynamicformswitcher")).toBeNull();
    });

    test("destroyIsIdempotent", () =>
    {
        const handle = build();
        handle.destroy();
        expect(() => handle.destroy()).not.toThrow();
    });

    test("refreshRerendersWithoutDataLoss", () =>
    {
        const handle = build();
        setValue("base_url", "https://x");
        handle.refresh();
        expect(input("base_url")!.value).toBe("https://x");
        handle.destroy();
    });

    test("resetClearsActiveVariantOnly", () =>
    {
        const handle = build();
        setValue("base_url", "https://a");
        handle.setVariant("basic");
        setValue("username", "alice");

        handle.reset();        // basic is active → wipes basic only
        expect(input("username")!.value).toBe("");

        handle.setVariant("api_key");
        expect(input("base_url")!.value).toBe("https://a");
        handle.destroy();
    });

    test("resetAllClearsEveryVariant", () =>
    {
        const handle = build();
        setValue("base_url", "https://a");
        handle.setVariant("basic");
        setValue("username", "alice");

        handle.resetAll();
        expect(input("username")!.value).toBe("");
        handle.setVariant("api_key");
        expect(input("base_url")!.value).toBe("");
        handle.destroy();
    });
});

// ===========================================================================
// Container resolution by id string
// ===========================================================================

describe("containerResolution", () =>
{
    test("acceptsStringId", () =>
    {
        const handle = createDynamicFormSwitcher("dfs-host", {
            variants: makeVariants(),
            initialVariant: "api_key",
        });
        expect(container.querySelector(".dynamicformswitcher")).not.toBeNull();
        handle.destroy();
    });

    test("throwsWhenContainerIdNotFound", () =>
    {
        expect(() =>
            createDynamicFormSwitcher("does-not-exist", {
                variants: makeVariants(),
                initialVariant: "api_key",
            }),
        ).toThrow();
    });
});

// ===========================================================================
// Component-field machinery: mount adapter, auto-discovery, registry,
// literate error rendering for missing factories (ADR-134).
// ===========================================================================

describe("mountAdapter", () =>
{
    test("customFieldWithMountReceivesHostAndReturnsAdapter", () =>
    {
        let captured = "";
        const handle = createDynamicFormSwitcher(container, {
            variants: {
                v: {
                    label: "v",
                    fields: [{
                        name: "x",
                        label: "X",
                        type: "custom",
                        mount: (host, name) =>
                        {
                            captured = name;
                            const input = document.createElement("input");
                            input.value = "seeded";
                            host.appendChild(input);
                            return {
                                getValue: () => input.value,
                                setValue: (v: unknown) => { input.value = String(v); },
                            };
                        },
                    }],
                },
            },
            initialVariant: "v",
        });
        expect(captured).toBe("x");
        expect(handle.getValues().x).toBe("seeded");

        handle.setValues("v", { x: "updated" });
        expect(handle.getValues().x).toBe("updated");
        handle.destroy();
    });

    test("mountAdapterDestroyCalledOnTeardown", () =>
    {
        const destroyed = vi.fn();
        const handle = createDynamicFormSwitcher(container, {
            variants: {
                v: { label: "v", fields: [{
                    name: "x", label: "X", type: "custom",
                    mount: () => ({ getValue: () => "x", destroy: destroyed }),
                }] },
            },
            initialVariant: "v",
        });
        handle.destroy();
        expect(destroyed).toHaveBeenCalledOnce();
    });

    test("mountAdapterValidateCanVeto", () =>
    {
        const handle = createDynamicFormSwitcher(container, {
            variants: {
                v: { label: "v", fields: [{
                    name: "x", label: "X", type: "custom",
                    mount: () => ({
                        getValue: () => "anything",
                        validate: () => "always invalid",
                    }),
                }] },
            },
            initialVariant: "v",
        });
        expect(handle.validate()).toBe(false);
        handle.destroy();
    });
});

describe("autoDiscovery", () =>
{
    afterEach(() =>
    {
        delete (window as unknown as Record<string, unknown>).createTestPicker;
        delete (window as unknown as Record<string, unknown>).createHyphenAware;
    });

    test("locatesFactoryByKebabCasedTypeName", () =>
    {
        // Kebab type name maps to PascalCase factory by the convention.
        // Library convention: factory receives a container *id string*, not
        // an HTMLElement — DFS assigns a stable id to the host element and
        // passes that string.
        let createdHost: HTMLElement | null = null;
        let updateFromInside: ((v: unknown) => void) | null = null;
        (window as unknown as Record<string, unknown>).createTestPicker
            = (containerId: string, opts: Record<string, unknown>) =>
            {
                const host = document.getElementById(containerId)!;
                createdHost = host;
                let cur: unknown = opts.value ?? "initial";
                updateFromInside = (v: unknown) =>
                {
                    cur = v;
                    (opts.onChange as ((x: unknown) => void) | undefined)?.(v);
                };
                host.textContent = "TestPicker live";
                return {
                    getValue: () => cur,
                    setValue: (v: unknown) => { cur = v; },
                    destroy: () => { host.textContent = ""; },
                };
            };

        const handle = createDynamicFormSwitcher(container, {
            variants: {
                v: { label: "v", fields: [{
                    name: "thing", label: "Thing", type: "test-picker",
                    componentOptions: { foo: "bar" },
                }] },
            },
            initialVariant: "v",
        });

        expect(createdHost).not.toBeNull();
        expect(createdHost!.textContent).toBe("TestPicker live");
        expect(handle.getValues().thing).toBe("initial");

        // Picker internally changes its value and fires onChange — DFS
        // should re-read via the adapter.
        updateFromInside!("changed-from-inside");
        expect(handle.getValues().thing).toBe("changed-from-inside");

        handle.destroy();
        expect(createdHost!.textContent).toBe("");
    });

    test("locatesFactoryByLowercaseSingleTokenViaWindowScan", () =>
    {
        // Single-token lowercase type like "colorpicker" should match
        // a createColorPicker global through the lowercase-scan fallback.
        (window as unknown as Record<string, unknown>).createColorPicker
            = () => ({ getValue: () => "#abc123" });
        const handle = createDynamicFormSwitcher(container, {
            variants: {
                v: { label: "v", fields: [
                    { name: "c", label: "C", type: "colorpicker" },
                ] },
            },
            initialVariant: "v",
        });
        expect(handle.getValues().c).toBe("#abc123");
        handle.destroy();
        delete (window as unknown as Record<string, unknown>).createColorPicker;
    });

    test("pascalCaseSplitsHyphens", () =>
    {
        const calls: string[] = [];
        (window as unknown as Record<string, unknown>).createHyphenAware
            = (_host: HTMLElement) =>
            {
                calls.push("created");
                return { getValue: () => "ok", destroy: () => { /* noop */ } };
            };
        const handle = createDynamicFormSwitcher(container, {
            variants: {
                v: { label: "v", fields: [
                    { name: "h", label: "H", type: "hyphen-aware" },
                ] },
            },
            initialVariant: "v",
        });
        expect(calls.length).toBe(1);
        expect(handle.getValues().h).toBe("ok");
        handle.destroy();
    });

    test("missingFactoryRendersLiterateError", () =>
    {
        const handle = createDynamicFormSwitcher(container, {
            variants: {
                v: { label: "v", fields: [{
                    name: "z", label: "Z", type: "nosuch-picker",
                }] },
            },
            initialVariant: "v",
        });
        const missing = container.querySelector(".dynamicformswitcher-component-missing");
        expect(missing).not.toBeNull();
        expect(missing!.textContent).toContain("createNosuchPicker");
        expect(missing!.textContent).toContain("registerDynamicFormFieldProvider");
        handle.destroy();
    });

    test("autoDiscoveredHandleWithoutSetValueIsTolerated", () =>
    {
        (window as unknown as Record<string, unknown>).createTestPicker
            = (containerId: string, opts: Record<string, unknown>) =>
            {
                const host = document.getElementById(containerId)!;
                const cur = opts.value ?? "read-only";
                host.textContent = String(cur);
                return { getValue: () => cur, destroy: () => { /* noop */ } };
            };
        const handle = createDynamicFormSwitcher(container, {
            variants: {
                v: { label: "v", fields: [{
                    name: "ro", label: "RO", type: "test-picker",
                }] },
            },
            initialVariant: "v",
        });
        expect(handle.getValues().ro).toBe("read-only");
        expect(() => handle.setValues("v", { ro: "ignored" })).not.toThrow();
        handle.destroy();
    });
});

describe("registry", () =>
{
    afterEach(() =>
    {
        unregisterDynamicFormFieldProvider("custompath");
        delete (window as unknown as Record<string, unknown>).createCustompath;
    });

    test("providerWinsOverAutoDiscovery", () =>
    {
        // Register a provider AND set up a window factory; provider should win.
        (window as unknown as Record<string, unknown>).createCustompath
            = () => ({ getValue: () => "from-window" });

        registerDynamicFormFieldProvider("custompath", (_host) => ({
            getValue: () => "from-registry",
        }));

        const handle = createDynamicFormSwitcher(container, {
            variants: {
                v: { label: "v", fields: [
                    { name: "p", label: "P", type: "custompath" },
                ] },
            },
            initialVariant: "v",
        });
        expect(handle.getValues().p).toBe("from-registry");
        handle.destroy();
    });

    test("providerReceivesFieldDefForOptions", () =>
    {
        let received: { name: string; componentOptions?: Record<string, unknown> } | null = null;
        registerDynamicFormFieldProvider("custompath", (_host, field) =>
        {
            received = { name: field.name, componentOptions: field.componentOptions };
            return { getValue: () => null };
        });
        const handle = createDynamicFormSwitcher(container, {
            variants: {
                v: { label: "v", fields: [{
                    name: "thing", label: "Thing", type: "custompath",
                    componentOptions: { mode: "advanced" },
                }] },
            },
            initialVariant: "v",
        });
        expect(received).not.toBeNull();
        expect(received!.name).toBe("thing");
        expect(received!.componentOptions).toEqual({ mode: "advanced" });
        handle.destroy();
    });
});

// ===========================================================================
// Retrofit round-trip: each retrofitted component should now route through
// DynamicFormSwitcher's auto-discovery path. We register a synthetic factory
// per component (not the real CDN one — those are heavy and out of scope for
// jsdom) and assert the convention contract (factory called with host+opts,
// adapter wires getValue/setValue/destroy).
// ===========================================================================

describe("retrofitCompliance", () =>
{
    // Each entry maps the type name (as a DFS field consumer would write it)
    // to the actual factory name shipped by the corresponding component.
    const components: { type: string; factory: string }[] = [
        // Small-fix retrofits — added setValue / value / onChange.
        { type: "latex-editor",       factory: "createLatexEditor" },
        { type: "symbol-picker",      factory: "createSymbolPicker" },
        { type: "sprint-picker",      factory: "createSprintPicker" },
        { type: "timezone-picker",    factory: "createTimezonePicker" },
        // Alias retrofits — getValue/setValue alias the domain methods.
        { type: "people-picker",      factory: "createPeoplePicker" },
        { type: "multiselect-combo",  factory: "createMultiselectCombo" },
        { type: "visual-table-editor",factory: "createVisualTableEditor" },
    ];

    for (const { type, factory } of components)
    {
        test(`autoDiscoveryWorksFor_${type}`, () =>
        {
            // Synthetic factory standing in for the real CDN component —
            // jsdom can't carry the real ones because most depend on
            // layout / canvas / fonts. The test verifies the convention
            // contract: factory called with (host, opts.value, opts.onChange)
            // and the returned handle drives the adapter cleanly.
            let driveChange: ((v: unknown) => void) | null = null;
            let capturedValue: unknown;
            (window as unknown as Record<string, unknown>)[factory]
                = (containerId: string, opts: Record<string, unknown>) =>
                {
                    const host = document.getElementById(containerId)!;
                    capturedValue = opts.value;
                    let cur: unknown = opts.value;
                    driveChange = (v: unknown) =>
                    {
                        cur = v;
                        (opts.onChange as ((x: unknown) => void) | undefined)?.(v);
                    };
                    host.textContent = "fake-" + type;
                    return {
                        getValue: () => cur,
                        setValue: (v: unknown) => { cur = v; },
                        destroy: () => { host.textContent = ""; },
                    };
                };

            const seed = "seed-" + type;
            const handle = createDynamicFormSwitcher(container, {
                variants: {
                    v: { label: "v", fields: [{
                        name: "f", label: "F", type, value: seed,
                    }] },
                },
                initialVariant: "v",
            });

            expect(capturedValue).toBe(seed);
            expect(handle.getValues().f).toBe(seed);

            driveChange!("changed");
            expect(handle.getValues().f).toBe("changed");

            handle.destroy();
            delete (window as unknown as Record<string, unknown>)[factory];
        });
    }
});
