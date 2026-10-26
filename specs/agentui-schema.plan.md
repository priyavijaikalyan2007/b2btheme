<!--
SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
SPDX-FileCopyrightText: 2026 Outcrop Inc
SPDX-License-Identifier: MIT
Repository: enterprise-bootstrap-theme
File GUID: 5b0c6f0e-2a7d-4d8e-9f31-7c4e8a1d2b60
Created: 2026
-->

<!-- AGENT: Implementation plan for Agent UI sub-project 0 (GitHub #17). Spec: specs/agentui-schema.prd.md. Execute task by task, TDD, one commit per task except Task 12, which is one commit by rule D9. -->

# Agent UI 0: Option Schemas, Protocol Generators, Conformance Gate — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every canvas-mountable component yields a validated JSON Schema for its options and an entry in a versioned A2UI v0.9.1 catalog, or it is listed, loudly, as pending. A computed required-level gate holds every new component to this from its first commit.

**Architecture:** A TypeScript-checker **classifier** (`classify.mjs`) sorts every option of every factory into data / function / element / too-broad, and finds hazards nested inside data. A pure **resolver** (`resolve.mjs`) checks that sorting against the manifest's declarations (`emits`, `protocol.providers`, `protocol.hostOnly`, …). Only approved data members reach **typia 12.2.1** (`schema.mjs`), whose output is normalised to JSON Schema 2020-12 (`normalise.mjs`) and post-checked (`checks.mjs`). Pure builders then assemble the A2UI catalog (`catalog.mjs`), diff it against the committed baseline (`catalog-diff.mjs`) and emit the MCP renderer metadata (`mcp-descriptors.mjs`). `generate.mjs` orchestrates and writes atomically. Separately, the runtime conformance suite gains a computed **required level**.

**Tech Stack:** Node ≥ 24 ESM scripts (`.mjs`), the TypeScript 5.9.3 compiler API, typia 12.2.1, Ajv 8.20.0 (draft 2020-12 mode), vitest 4 (jsdom), bash (`test-local.sh`).

## Global Constraints

- **Spec:** `specs/agentui-schema.prd.md` (approved 2026-10-24, amended 2026-10-25). Where this plan and the spec disagree, stop and ask.
- **AGENTS.md applies in full:**
  - TDD: the test is seen failing before the implementation.
  - **No fallback code**: when something is broken, throw a literate error.
  - **No fabricated reads.**
  - Allman braces; methods ≤ 30 lines; nesting ≤ 3.
  - LITERATE_ERRORS.md message shape: what happened, where, how to fix.
- **Every new file starts with the SPDX header** used by `scripts/factory-census.mjs`, with a `⚓ COMPONENT` / `📜 PURPOSE` / `🔗 RELATES` / `⚡ FLOW` block (MARKERS.md). Test files use the `factory-census.test.ts` header style.
- **Dependencies are exact pins** with no range: `typia` **12.2.1**, `ajv` **8.20.0**, both `devDependencies`. Neither is served to consumers. Do not upgrade typia to 15.x (spec §4).
- **The scripts convention:** `.mjs` files under `scripts/agentui/`, plus colocated `*.test.ts` files that import the `.mjs`. vitest already includes `scripts/**/*.test.ts`. There is no TS runner, so use the `typescript` compiler API.
- **The generator's cache directory is `node_modules/.cache/agentui/`**, so generated entry files resolve `typia` through the repo's `node_modules`.
- **Constants:**
  - A2UI basic catalog ID: `https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json`
  - common types ID: `https://a2ui.org/specification/v0_9/common_types.json`
  - our catalog ID: `https://static.outcrop.us/a2ui/catalog/v<N>.json` with `N = 1`
  - CSP origins: `https://static.outcrop.us`, `https://fonts.googleapis.com`, `https://fonts.gstatic.com`
- **Host neutrality (D2/D13):** no emitted file may contain `knobby`.
- **Additive only (D11):** do not change any factory, handle, options interface or legacy callback.
- **GitHub:** every `gh` call is prefixed with `GH_TOKEN="$(gh auth token --user priyavijaikalyan2007)"` against `-R priyavijaikalyan2007/b2btheme`. Never run `gh auth switch`.
- **Commits** end with the attribution lines from the session's system reminder. Do not push.

---

## File Structure

| Path | Responsibility |
|---|---|
| `runtime/src/types.ts` | + `ProtocolSpec`, `ProviderSpec`, `CapabilityManifest.protocol` |
| `runtime/src/registry.ts` | + `validateProtocol`, called from `validateManifest` |
| `runtime/src/conformance.ts` | + `requiredLevel`, `LEVEL_ORDER`, check `level-meets-required` |
| `runtime/fleet-conformance.test.ts` | applies `BELOW_REQUIRED`; hygiene for the list |
| `scripts/agentui/classify.mjs` | TS program, factory options type, member classification, hazard paths |
| `scripts/agentui/resolve.mjs` | pure: members + manifest → protocol surface + violations; `VIOLATION` registry |
| `scripts/agentui/schema.mjs` | writes typia entry files, emits schema units |
| `scripts/agentui/normalise.mjs` | pure: typia unit → standalone 2020-12 schema; `mapRefs` |
| `scripts/agentui/checks.mjs` | post-checks: member presence, JSDoc parity, `defaultOptions` via Ajv |
| `scripts/agentui/catalog.mjs` | pure: catalog naming, ID, entries, basic re-exports, guidance text |
| `scripts/agentui/catalog-diff.mjs` | pure: breaking/additive diff, version rule |
| `scripts/agentui/mcp-descriptors.mjs` | pure: renderer `_meta.ui` |
| `scripts/agentui/migration.mjs` | `PENDING_CLASSIFICATION`, `BELOW_REQUIRED` (measured, shrink-only) |
| `scripts/agentui/generate.mjs` | orchestration, CLI (`--measure`, `--write-baseline`), atomic writes, `measureClassification` |
| `scripts/agentui/check-dist.mjs` | structure check `[29]`; reads only `dist/`, vendored files and the baseline; shares no code with the generator |
| `scripts/agentui/fixtures/` | `tsconfig.json`, `widget.ts`, `panel.ts`: synthetic components for unit tests |
| `scripts/agentui/vendor/a2ui-v0_9_1/` | `common_types.json`, `catalogs/basic/catalog.json`, `SOURCE.md` |
| `specs/agentui/published/catalog-v1.json` | committed baseline (Task 12) |

---

### Task 1: The `protocol` manifest field

**Files:**
- Modify: `runtime/src/types.ts` (before `export interface CapabilityManifest`; add a member at the end of the interface)
- Modify: `runtime/src/registry.ts` (`validateManifest`, plus a new `validateProtocol`)
- Test: `runtime/src/registry.test.ts`

**Interfaces:**
- Produces: `ProtocolSpec { name?; providers?; hostOnly?; schemas?; bindAs? }`, `ProviderSpec { request; params; response }`, `CapabilityManifest.protocol?: ProtocolSpec`. Every later task reads `manifest.protocol`.

- [ ] **Step 1: Write the failing tests.** Append to `runtime/src/registry.test.ts`. If the file already has a full-manifest helper, reuse it; otherwise add `base()` below.

```ts
// ============================================================================
// PROTOCOL FIELD (ADR-219)
// ============================================================================

describe("validateManifest — protocol field", () =>
{
    function base(protocol?: unknown): Record<string, unknown>
    {
        return {
            name: "fake", factory: "createFake", label: "Fake", icon: "bi-square",
            category: "data", affords: [], emits: [], accepts: [], actions: [],
            stateKeys: [], weight: { js: 1, mountCost: "light", holdsResources: false },
            defaultSize: { w: 10, h: 10 }, defaultOptions: {}, conformance: "display",
            priority: 50,
            ...(protocol === undefined ? {} : { protocol }),
        };
    }

    test("a manifest without protocol stays valid", () =>
    {
        expect(validateManifest(base()).ok).toBe(true);
    });

    test("a complete protocol is valid", () =>
    {
        const protocol = {
            name: "Fake",
            providers: { onSearch: { request: "search", params: "searchQuery", response: "searchResults" } },
            hostOnly: { renderCell: "Takes a DOM element, which JSON cannot carry." },
            schemas: { extra: { type: "object" } },
            bindAs: { selection: "selectedRows" },
        };

        expect(validateManifest(base(protocol)).ok).toBe(true);
    });

    test("protocol must be an object", () =>
    {
        expect(validateManifest(base("yes")).ok).toBe(false);
    });

    test("protocol.name must be a UAX #31 identifier", () =>
    {
        expect(validateManifest(base({ name: "user-card" })).ok).toBe(false);
    });

    test("a provider needs request, params and response", () =>
    {
        expect(validateManifest(base({ providers: { onSearch: { request: "search" } } })).ok).toBe(false);
    });

    test("hostOnly reasons must be strings", () =>
    {
        expect(validateManifest(base({ hostOnly: { renderCell: 3 } })).ok).toBe(false);
    });

    test("schemas values must be objects", () =>
    {
        expect(validateManifest(base({ schemas: { extra: "object" } })).ok).toBe(false);
    });

    test("bindAs values must be identifiers", () =>
    {
        expect(validateManifest(base({ bindAs: { selection: "" } })).ok).toBe(false);
    });
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npx vitest run runtime/src/registry.test.ts -t "protocol field"`
Expected: FAIL. "protocol must be an object" and the four tests after it fail, because nothing validates `protocol` yet.

- [ ] **Step 3: Add the types.** Insert into `runtime/src/types.ts` immediately before `export interface CapabilityManifest`:

```ts
/**
 * A function-typed option that asks the host for data (ADR-219, spec §3.2).
 * Over A2UI it becomes three catalog properties: `<params>` (the component
 * writes the request there), `on<Request>` (fired after the write) and
 * `<response>` (the agent answers there with updateDataModel).
 */
export interface ProviderSpec
{
    /** Catalog name of the request, e.g. "search". UAX #31. */
    readonly request: string;

    /** Data-prop name the component writes the request parameters to. */
    readonly params: string;

    /** Data-prop name the agent binds the answer to. */
    readonly response: string;
}

/** How this component appears to agent protocols (A2UI, MCP Apps). ADR-219. */
export interface ProtocolSpec
{
    /** Catalog name when the derived one collides. UAX #31. */
    readonly name?: string;

    /** Function-typed options that ask the host for data, keyed by option. */
    readonly providers?: Readonly<Record<string, ProviderSpec>>;

    /**
     * Options, or parts of options, with no protocol equivalent. The value is
     * the reason: what the member needs that JSON cannot carry. A key is an
     * option name, or a path into a data option using `.prop` and `[]` for
     * array items and index signatures (`columns[].renderer`). A key covers
     * every hazard at or below its path. A bare option name on a MIXED member
     * (data | function) means "its non-data arms"; on any other member it
     * means "the whole member".
     */
    readonly hostOnly?: Readonly<Record<string, string>>;

    /**
     * Explicit JSON Schemas for data props whose TypeScript type is too broad
     * to generate from (`unknown`, `Record<string, unknown>`), keyed by option.
     */
    readonly schemas?: Readonly<Record<string, Readonly<Record<string, unknown>>>>;

    /** Catalog prop name for a channel's bindable value, keyed by channel. */
    readonly bindAs?: Readonly<Record<string, string>>;
}
```

At the end of `CapabilityManifest`, after `priority`:

```ts
    /** Agent-protocol declarations (ADR-219). Optional; absent means none. */
    readonly protocol?: ProtocolSpec;
```

- [ ] **Step 4: Add the validation.** In `runtime/src/registry.ts`, add `validateProtocol(m, issues);` after `validateConformance(m, issues);` in `validateManifest`, and add these functions after `validateConformance`:

```ts
/** UAX #31 identifier, the A2UI v1.0 rule for names (spec §5.1). */
const UAX31 = /^[\p{XID_Start}_][\p{XID_Continue}]*$/u;

/**
 * Validates the optional agent-protocol declarations (ADR-219).
 *
 * @param m      - The candidate manifest.
 * @param issues - Accumulator appended to in place.
 */
function validateProtocol(
    m: Record<string, unknown>,
    issues: ValidationIssue[]): void
{
    if (m.protocol === undefined)
    {
        return;
    }

    if (!isObject(m.protocol))
    {
        issues.push(typeIssue("protocol", "an object of protocol declarations", m.protocol));
        return;
    }

    const p = m.protocol;

    if (p.name !== undefined && !(isNonEmptyString(p.name) && UAX31.test(p.name)))
    {
        issues.push(typeIssue("protocol.name", "a UAX #31 identifier such as \"DataGrid\"", p.name));
    }

    validateProviderMap(p.providers, issues);
    validateStringMap("protocol.hostOnly", p.hostOnly, "a reason string", issues);
    validateStringMap("protocol.bindAs", p.bindAs, "a UAX #31 prop name", issues, UAX31);
    validateSchemaMap(p.schemas, issues);
}

/**
 * Validates `protocol.providers`: every entry names its request, params and
 * response props.
 */
function validateProviderMap(v: unknown, issues: ValidationIssue[]): void
{
    if (v === undefined)
    {
        return;
    }

    if (!isObject(v))
    {
        issues.push(typeIssue("protocol.providers", "an object keyed by option name", v));
        return;
    }

    for (const [option, spec] of Object.entries(v))
    {
        for (const key of ["request", "params", "response"])
        {
            const field = isObject(spec) ? spec[key] : undefined;

            if (!(isNonEmptyString(field) && UAX31.test(field)))
            {
                issues.push(typeIssue(`protocol.providers.${option}.${key}`, "a UAX #31 identifier", field));
            }
        }
    }
}

/** Validates a map whose values must be strings (optionally matching a pattern). */
function validateStringMap(
    path: string,
    v: unknown,
    expected: string,
    issues: ValidationIssue[],
    pattern?: RegExp): void
{
    if (v === undefined)
    {
        return;
    }

    if (!isObject(v))
    {
        issues.push(typeIssue(path, "an object", v));
        return;
    }

    for (const [key, value] of Object.entries(v))
    {
        if (!isNonEmptyString(value) || (pattern !== undefined && !pattern.test(value)))
        {
            issues.push(typeIssue(`${path}.${key}`, expected, value));
        }
    }
}

/** Validates `protocol.schemas`: every value is a JSON Schema object. */
function validateSchemaMap(v: unknown, issues: ValidationIssue[]): void
{
    if (v === undefined)
    {
        return;
    }

    if (!isObject(v))
    {
        issues.push(typeIssue("protocol.schemas", "an object keyed by option name", v));
        return;
    }

    for (const [key, value] of Object.entries(v))
    {
        if (!isObject(value))
        {
            issues.push(typeIssue(`protocol.schemas.${key}`, "a JSON Schema object", value));
        }
    }
}
```

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `npx vitest run runtime/src/registry.test.ts && npm run typecheck:runtime`
Expected: PASS, and the typecheck is clean.

- [ ] **Step 6: Commit**

```bash
git add runtime/src/types.ts runtime/src/registry.ts runtime/src/registry.test.ts
git commit -m "feat(agentui): add the protocol manifest field and its validation" -m "ProtocolSpec carries the declarations the agent-protocol gate needs: providers, host-only members, schema overrides, channel renames. Optional, so every existing manifest stays valid (D11). ADR-219, #17."
```

---

### Task 2: The classifier

**Files:**
- Create: `scripts/agentui/fixtures/tsconfig.json`, `scripts/agentui/fixtures/widget.ts`, `scripts/agentui/fixtures/panel.ts`
- Create: `scripts/agentui/classify.mjs`
- Test: `scripts/agentui/classify.test.ts`

**Interfaces:**
- Produces:
  - `MEMBER_CLASS` (`DATA`, `FUNCTION`, `ELEMENT`, `TOO_BROAD`, with values `"data"`, `"function"`, `"element"`, `"too-broad"`)
  - `createClassifier(tsconfigPath, cacheDir, extraRoots?) → ctx`
  - `readTsconfig(tsconfigPath) → ParsedCommandLine`
  - `optionsParameterIndex(manifest) → 0 | 1`
  - `factoryOptionsType(ctx, file, factoryName, paramIndex) → { type, location }`
  - `classifyMembers(ctx, type, location) → MemberReport[]`, where `MemberReport = { name, cls, optional, arity, mixedArms: string[], hazards: {path, cls}[], jsdoc }`

- [ ] **Step 1: Create the fixtures**

`scripts/agentui/fixtures/tsconfig.json`:

```json
{
    "compilerOptions": {
        "target": "ES2020",
        "module": "ESNext",
        "moduleResolution": "node",
        "strict": true,
        "lib": ["ES2020", "DOM"],
        "skipLibCheck": true,
        "noEmit": true
    },
    "include": ["*.ts"]
}
```

`scripts/agentui/fixtures/widget.ts` (SPDX header, then):

```ts
/** A column of the synthetic widget. */
export interface Column
{
    /** Column id. */
    id: string;

    /** Renders a cell. */
    renderer?: (value: string) => string;
}

/** A component instance: every member is a method. */
export interface Slot
{
    mount(): void;
    unmount(): void;
}

/** Options for the synthetic widget used by the agent-UI generator tests. */
export interface WidgetOptions
{
    /** Rows per page. */
    pageSize?: number;

    /** Columns to show. */
    columns: Column[];

    /** Selected date. */
    value?: Date;

    /** Title text or a builder. */
    title?: string | (() => string);

    /** Host element. */
    container?: HTMLElement;

    /** Extra bag. */
    extra?: Record<string, unknown>;

    /** Slot instance. */
    slot?: Slot;

    /** Fires on selection. */
    onSelect?: (ids: string[]) => void;

    /** Fires when the value changes. */
    onChange?: (value: Date) => void;

    /** Looks names up. */
    onSearch?: (query: string) => Promise<string[]>;

    /** Two-argument provider. */
    onLookup?: (a: string, b: number) => Promise<string>;
}

/** Synthetic container-first factory. */
export function createWidget(containerId: string, options: WidgetOptions): { destroy(): void }
{
    void containerId;
    void options;
    return { destroy: () => undefined };
}
```

`scripts/agentui/fixtures/panel.ts` (SPDX header, then):

```ts
/** Options for the synthetic options-only panel. */
export interface PanelOptions
{
    /** Host element. */
    container: HTMLElement;

    heading?: string;
}

/** Synthetic options-only factory. */
export function createPanel(options: PanelOptions): { destroy(): void }
{
    void options;
    return { destroy: () => undefined };
}
```

- [ ] **Step 2: Write the failing tests.** In `scripts/agentui/classify.test.ts` (header, then):

```ts
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, test } from "vitest";

import {
    MEMBER_CLASS, classifyMembers, createClassifier, factoryOptionsType, optionsParameterIndex,
} from "./classify.mjs";

const FIXTURES = path.join(__dirname, "fixtures");

type Member = { name: string; cls: string; arity: number | null; mixedArms: string[];
    hazards: { path: string; cls: string }[]; jsdoc: string };

let widget: Map<string, Member>;
let panel: Map<string, Member>;

beforeAll(() =>
{
    const cache = fs.mkdtempSync(path.join(os.tmpdir(), "agentui-classify-"));
    const ctx = createClassifier(path.join(FIXTURES, "tsconfig.json"), cache);
    const read = (file: string, factory: string, index: number) =>
    {
        const { type, location } = factoryOptionsType(ctx, path.join(FIXTURES, file), factory, index);
        return new Map((classifyMembers(ctx, type, location) as Member[]).map((m) => [m.name, m]));
    };

    widget = read("widget.ts", "createWidget", 1);
    panel = read("panel.ts", "createPanel", 0);
});

describe("classify — member classes", () =>
{
    test("a number is data", () => { expect(widget.get("pageSize")!.cls).toBe(MEMBER_CLASS.DATA); });
    test("a Date is data", () => { expect(widget.get("value")!.cls).toBe(MEMBER_CLASS.DATA); });
    test("a callback is a function", () => { expect(widget.get("onSelect")!.cls).toBe(MEMBER_CLASS.FUNCTION); });
    test("an HTMLElement is an element", () => { expect(widget.get("container")!.cls).toBe(MEMBER_CLASS.ELEMENT); });
    test("Record<string, unknown> is too broad", () => { expect(widget.get("extra")!.cls).toBe(MEMBER_CLASS.TOO_BROAD); });
    test("an all-method instance is a function", () => { expect(widget.get("slot")!.cls).toBe(MEMBER_CLASS.FUNCTION); });
});

describe("classify — mixed members and hazards", () =>
{
    test("a data|function union is data", () => { expect(widget.get("title")!.cls).toBe(MEMBER_CLASS.DATA); });
    test("its function arm is recorded", () => { expect(widget.get("title")!.mixedArms).toEqual([MEMBER_CLASS.FUNCTION]); });
    test("a nested callback is a hazard at its path", () =>
    {
        expect(widget.get("columns")!.hazards).toEqual([{ path: "columns[].renderer", cls: MEMBER_CLASS.FUNCTION }]);
    });
    test("a Date is not walked into", () => { expect(widget.get("value")!.hazards).toEqual([]); });
});

describe("classify — arity and JSDoc", () =>
{
    test("a one-parameter provider has arity 1", () => { expect(widget.get("onSearch")!.arity).toBe(1); });
    test("a two-parameter provider has arity 2", () => { expect(widget.get("onLookup")!.arity).toBe(2); });
    test("data members carry arity null", () => { expect(widget.get("pageSize")!.arity).toBeNull(); });
    test("JSDoc text is read", () => { expect(widget.get("pageSize")!.jsdoc).toBe("Rows per page."); });
    test("a member without JSDoc reads as empty", () => { expect(panel.get("heading")!.jsdoc).toBe(""); });
});

describe("classify — factory resolution", () =>
{
    test("container-first options are parameter 1", () =>
    {
        expect(optionsParameterIndex({ factoryStyle: "container-first" })).toBe(1);
    });
    test("an absent factoryStyle means container-first", () => { expect(optionsParameterIndex({})).toBe(1); });
    test("options-only options are parameter 0", () =>
    {
        expect(optionsParameterIndex({ factoryStyle: "options-only" })).toBe(0);
    });
    test("an unexported factory is a literate error", () =>
    {
        const cache = fs.mkdtempSync(path.join(os.tmpdir(), "agentui-classify-"));
        const ctx = createClassifier(path.join(FIXTURES, "tsconfig.json"), cache);

        expect(() => factoryOptionsType(ctx, path.join(FIXTURES, "widget.ts"), "createNothing", 1))
            .toThrow(/does not export createNothing/);
    });
});
```

- [ ] **Step 3: Run the tests and confirm they fail**

Run: `npx vitest run scripts/agentui/classify.test.ts`
Expected: FAIL with "Failed to load url ./classify.mjs" (the module does not exist).

- [ ] **Step 4: Implement `scripts/agentui/classify.mjs`.** Header (`⚓ COMPONENT: AgentUiClassifier`; purpose: classify every factory option by the TypeScript checker, spec §3, ADR-219; relates `[[AgentProtocolSchema]]`, `[[NoFallbackCode]]`; flow `[tsconfig] -> [ts.Program] -> [factory parameter type] -> [classifyMembers] -> [resolve.mjs]`), then:

```js
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

// ⚓ AgentProtocolSchema
export const MEMBER_CLASS = Object.freeze({
    DATA: "data",
    FUNCTION: "function",
    ELEMENT: "element",
    TOO_BROAD: "too-broad",
});

/** Non-data classes, strongest first, for a member with no data arm. */
const STRENGTH = [MEMBER_CLASS.FUNCTION, MEMBER_CLASS.ELEMENT, MEMBER_CLASS.TOO_BROAD];

/** `any`, `unknown`, `object` and `never` cannot be described to an agent. */
const BROAD_FLAGS = ts.TypeFlags.Any | ts.TypeFlags.Unknown | ts.TypeFlags.NonPrimitive | ts.TypeFlags.Never;

/** Declares one value of each reference type the classifier compares against. */
const PROBE_SOURCE = "declare const agentuiNodeProbe: Node;\n"
    + "declare const agentuiDateProbe: Date;\n"
    + "export {};\n";

/**
 * Builds the TypeScript program the classifier reads.
 *
 * @param tsconfigPath - Absolute path of the tsconfig whose files to load.
 * @param cacheDir     - Writable directory for the probe file.
 * @param extraRoots   - Additional root files.
 * @returns The classifier context.
 */
// @entrypoint
export function createClassifier(tsconfigPath, cacheDir, extraRoots = [])
{
    const config = readTsconfig(tsconfigPath);
    fs.mkdirSync(cacheDir, { recursive: true });
    const probePath = path.join(cacheDir, "classifier-probe.ts");
    fs.writeFileSync(probePath, PROBE_SOURCE);

    const program = ts.createProgram([...config.fileNames, ...extraRoots, probePath], config.options);
    const checker = program.getTypeChecker();
    const [nodeType, dateType] = probeTypes(program, checker, probePath);

    return { program, checker, nodeType, dateType };
}

/**
 * Reads a tsconfig, throwing a literate error when it cannot be read.
 *
 * @param tsconfigPath - Absolute path of the tsconfig.
 * @returns The parsed command line.
 */
export function readTsconfig(tsconfigPath)
{
    const host = {
        ...ts.sys,
        onUnRecoverableConfigFileDiagnostic: (d) =>
        {
            throw new Error(`Cannot read ${tsconfigPath}: ${ts.flattenDiagnosticMessageText(d.messageText, " ")}`);
        },
    };
    const parsed = ts.getParsedCommandLineOfConfigFile(tsconfigPath, {}, host);

    if (!parsed)
    {
        throw new Error(`TypeScript returned no configuration for ${tsconfigPath}.`);
    }

    return parsed;
}

/** Reads the Node and Date types out of the probe file. */
function probeTypes(program, checker, probePath)
{
    const statements = program.getSourceFile(probePath).statements;

    return [0, 1].map((i) => checker.getTypeAtLocation(statements[i].declarationList.declarations[0].name));
}

/**
 * Which factory parameter holds the options, per the manifest's factoryStyle.
 *
 * @param manifest - The capability manifest.
 * @returns 1 for container-first (the default), otherwise 0.
 */
export function optionsParameterIndex(manifest)
{
    return (manifest.factoryStyle ?? "container-first") === "container-first" ? 1 : 0;
}

/**
 * The options type of an exported factory, read from its first signature.
 *
 * @param ctx         - Classifier context.
 * @param file        - Absolute path of the component's entry module.
 * @param factoryName - The exported factory, e.g. "createDataGrid".
 * @param paramIndex  - Which parameter holds the options.
 * @returns The non-nullable options type and the location to resolve it at.
 */
export function factoryOptionsType(ctx, file, factoryName, paramIndex)
{
    const source = ctx.program.getSourceFile(file);

    if (!source)
    {
        throw new Error(`${file} is not in the TypeScript program, so ${factoryName}'s options `
            + "cannot be read. Add the file to the tsconfig \"include\".");
    }

    const factory = findExport(ctx, source, factoryName);
    const signature = ctx.checker.getTypeOfSymbolAtLocation(factory, source).getCallSignatures()[0];
    const parameter = signature?.parameters[paramIndex];

    if (!parameter)
    {
        throw new Error(`${factoryName} in ${file} has no parameter ${paramIndex}, which the manifest's `
            + "factoryStyle says holds the options. Correct factoryStyle in the manifest.");
    }

    const type = ctx.checker.getTypeOfSymbolAtLocation(parameter, source);

    return { type: ctx.checker.getNonNullableType(type), location: source };
}

/** Finds an exported symbol by name, resolving re-export aliases. */
function findExport(ctx, source, name)
{
    const moduleSymbol = ctx.checker.getSymbolAtLocation(source);
    const found = moduleSymbol?.exports && ctx.checker.getExportsOfModule(moduleSymbol).find((s) => s.name === name);

    if (!found)
    {
        throw new Error(`${source.fileName} does not export ${name}. `
            + "The manifest's factory field must name a function exported from <name>/<name>.ts.");
    }

    return (found.flags & ts.SymbolFlags.Alias) ? ctx.checker.getAliasedSymbol(found) : found;
}

/**
 * Classifies every member of an options type (spec §3.1).
 *
 * @param ctx         - Classifier context.
 * @param optionsType - The options type.
 * @param location    - Node to resolve member types at.
 * @returns One report per member.
 */
// @entrypoint
export function classifyMembers(ctx, optionsType, location)
{
    return ctx.checker.getPropertiesOfType(optionsType).map((symbol) => classifyMember(ctx, symbol, location));
}

/** Classifies one member: its class, mixed arms, nested hazards and JSDoc. */
function classifyMember(ctx, symbol, location)
{
    const type = ctx.checker.getNonNullableType(ctx.checker.getTypeOfSymbolAtLocation(symbol, location));
    const arms = unionArms(type);
    const classes = arms.map((arm) => armClass(ctx, arm));
    const dataArms = arms.filter((_, i) => classes[i] === MEMBER_CLASS.DATA);
    const cls = dataArms.length > 0 ? MEMBER_CLASS.DATA : STRENGTH.find((c) => classes.includes(c));
    const hazards = dataArms.flatMap((arm) => childHazards(ctx, arm, symbol.name, new Set([arm])));

    return {
        name: symbol.name,
        cls,
        optional: (symbol.flags & ts.SymbolFlags.Optional) !== 0,
        arity: cls === MEMBER_CLASS.FUNCTION ? arityOf(type) : null,
        mixedArms: cls === MEMBER_CLASS.DATA ? unique(classes.filter((c) => c !== MEMBER_CLASS.DATA)) : [],
        hazards: uniqueBy(hazards, (h) => `${h.path}|${h.cls}`),
        jsdoc: ts.displayPartsToString(symbol.getDocumentationComment(ctx.checker)).trim(),
    };
}

/** The class of one union arm. Order matters: Date before methods, methods before Node. */
function armClass(ctx, t)
{
    if (t.flags & BROAD_FLAGS) { return MEMBER_CLASS.TOO_BROAD; }

    if (isDate(ctx, t)) { return MEMBER_CLASS.DATA; }

    if (t.getCallSignatures().length > 0 || isInstance(ctx, t)) { return MEMBER_CLASS.FUNCTION; }

    if (ctx.checker.isTypeAssignableTo(t, ctx.nodeType)) { return MEMBER_CLASS.ELEMENT; }

    if (isOpenBag(ctx, t)) { return MEMBER_CLASS.TOO_BROAD; }

    return MEMBER_CLASS.DATA;
}

/** True for `Date` itself (mutually assignable), which is emitted as a date-time string. */
function isDate(ctx, t)
{
    return (t.flags & ts.TypeFlags.Object) !== 0
        && ctx.checker.isTypeAssignableTo(t, ctx.dateType)
        && ctx.checker.isTypeAssignableTo(ctx.dateType, t);
}

/** True for a component instance: an object whose every property is callable. */
function isInstance(ctx, t)
{
    if ((t.flags & ts.TypeFlags.Object) === 0 || ctx.checker.isArrayType(t) || ctx.checker.isTupleType(t))
    {
        return false;
    }

    const props = ctx.checker.getPropertiesOfType(t);

    return props.length > 0 && props.every((p) =>
        ctx.checker.getNonNullableType(ctx.checker.getTypeOfSymbol(p)).getCallSignatures().length > 0);
}

/** True for `{}` and for index signatures of `any`/`unknown`. */
function isOpenBag(ctx, t)
{
    if ((t.flags & ts.TypeFlags.Object) === 0 || ctx.checker.getPropertiesOfType(t).length > 0)
    {
        return false;
    }

    const indexes = ctx.checker.getIndexInfosOfType(t);

    return indexes.length === 0
        || indexes.some((i) => (i.type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) !== 0);
}

/** Hazards strictly below a data type: every non-data arm reachable through it. */
function childHazards(ctx, type, basePath, ancestors)
{
    return children(ctx, type, basePath).flatMap(([childPath, child]) =>
        hazardsAt(ctx, child, childPath, ancestors));
}

/** Hazards at a path: its non-data arms, plus hazards below its data arms. */
function hazardsAt(ctx, type, at, ancestors)
{
    if (ancestors.has(type)) { return []; }

    const next = new Set(ancestors).add(type);

    return unionArms(type).flatMap((arm) =>
    {
        const cls = armClass(ctx, arm);
        return cls === MEMBER_CLASS.DATA ? childHazards(ctx, arm, at, next) : [{ path: at, cls }];
    });
}

/** Child paths of an object, array, tuple or index signature, with their types. */
function children(ctx, t, at)
{
    if ((t.flags & ts.TypeFlags.Object) === 0 || isDate(ctx, t)) { return []; }

    if (ctx.checker.isArrayType(t) || ctx.checker.isTupleType(t))
    {
        return ctx.checker.getTypeArguments(t).map((a) => [`${at}[]`, ctx.checker.getNonNullableType(a)]);
    }

    const props = ctx.checker.getPropertiesOfType(t).map((p) =>
        [`${at}.${p.name}`, ctx.checker.getNonNullableType(ctx.checker.getTypeOfSymbol(p))]);
    const indexes = ctx.checker.getIndexInfosOfType(t).map((i) => [`${at}[]`, i.type]);

    return [...props, ...indexes];
}

/** Parameter count of the first call signature among a type's arms. */
function arityOf(type)
{
    const signature = unionArms(type).flatMap((arm) => arm.getCallSignatures())[0];

    return signature ? signature.parameters.length : 0;
}

/** The arms of a union, or the type itself. */
function unionArms(t)
{
    return t.isUnion() ? t.types : [t];
}

function unique(values)
{
    return [...new Set(values)];
}

function uniqueBy(values, keyOf)
{
    const seen = new Map(values.map((v) => [keyOf(v), v]));
    return [...seen.values()];
}
```

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `npx vitest run scripts/agentui/classify.test.ts`
Expected: PASS, all 19 tests. If `title`'s `mixedArms` or `columns`' hazards differ, fix the classifier, not the test.

- [ ] **Step 6: Commit**

```bash
git add scripts/agentui/classify.mjs scripts/agentui/classify.test.ts scripts/agentui/fixtures
git commit -m "feat(agentui): classify factory options with the TypeScript checker" -m "Every option becomes data, function, element or too-broad, with nested hazard paths and mixed arms recorded. This is the gate that keeps the schema tool from seeing anything undeclared. Spec §3, #17."
```

---

### Task 3: The resolver

**Files:**
- Create: `scripts/agentui/resolve.mjs`
- Test: `scripts/agentui/resolve.test.ts`

**Interfaces:**
- Consumes: `MemberReport` from Task 2, and `MEMBER_CLASS`.
- Produces:
  - `VIOLATION` (codes: `unclassified`, `double-classified`, `stale-declaration`, `short-reason`, `undeclared-mixed`, `undeclared-hazard`, `too-broad`, `missing-jsdoc`, `provider-arity`, `value-below-field`, `name-invalid`, `name-collision`, `prop-collision`)
  - `MIN_REASON_LENGTH = 20`
  - `pascal(s)`
  - `resolveSurface(manifest, members) → Surface`, where:
    - `Surface = { name, dataProps: MemberReport[], twoWayValue, events, providers, actions, hostOnly, violations }`
    - `events: { channel, option, bindProp, actionProp, payload }[]`
    - `providers: { option, request, params, response, actionProp }[]`
    - `actions: { id, label, actionProp }[]`
    - `violations: { component, member, code, message }[]`

- [ ] **Step 1: Write the failing tests.** `scripts/agentui/resolve.test.ts` (header, then):

```ts
import { describe, expect, test } from "vitest";

import { MIN_REASON_LENGTH, VIOLATION, pascal, resolveSurface } from "./resolve.mjs";

type M = Record<string, unknown>;

function member(name: string, cls: string, over: M = {}): M
{
    return { name, cls, optional: true, arity: cls === "function" ? 1 : null,
        mixedArms: [], hazards: [], jsdoc: `${name} docs.`, ...over };
}

function manifest(over: M = {}): M
{
    return { name: "widget", factory: "createWidget", emits: [], accepts: [], actions: [],
        conformance: "surface", ...over };
}

const REASON = "Needs a DOM node, which JSON cannot carry.";

function codes(m: M, members: M[]): string[]
{
    return resolveSurface(m, members).violations.map((v: { code: string }) => v.code);
}

describe("resolve — classes", () =>
{
    test("a documented data member is a data prop", () =>
    {
        expect(resolveSurface(manifest(), [member("pageSize", "data")]).dataProps.map((d: M) => d.name))
            .toEqual(["pageSize"]);
    });
    test("an undeclared function is unclassified", () =>
    {
        expect(codes(manifest(), [member("onX", "function")])).toEqual([VIOLATION.UNCLASSIFIED]);
    });
    test("a legacyOption callback is an event", () =>
    {
        const m = manifest({ emits: [{ name: "selection", payload: "collection", multi: true, legacyOption: "onSelect" }] });
        expect(codes(m, [member("onSelect", "function")])).toEqual([]);
    });
    test("an event gets a bind prop and an action prop", () =>
    {
        const m = manifest({ emits: [{ name: "selection", payload: "collection", multi: true, legacyOption: "onSelect" }] });
        expect(resolveSurface(m, [member("onSelect", "function")]).events[0])
            .toMatchObject({ bindProp: "selection", actionProp: "onSelection" });
    });
    test("bindAs renames the bind prop", () =>
    {
        const m = manifest({ emits: [{ name: "selection", payload: "collection", multi: true }],
            protocol: { bindAs: { selection: "selectedRows" } } });
        expect(resolveSurface(m, []).events[0].bindProp).toBe("selectedRows");
    });
    test("onChange beside value is the two-way write-back", () =>
    {
        expect(resolveSurface(manifest(), [member("value", "data"), member("onChange", "function")]).twoWayValue)
            .toBe(true);
    });
    test("an element declared host-only is excluded", () =>
    {
        const m = manifest({ protocol: { hostOnly: { container: REASON } } });
        expect(resolveSurface(m, [member("container", "element")]).dataProps).toEqual([]);
    });
    test("the options-only container key is implicitly host-only", () =>
    {
        const m = manifest({ factoryStyle: "options-only" });
        expect(codes(m, [member("container", "element")])).toEqual([]);
    });
    test("a too-broad member with a schema override is data", () =>
    {
        const m = manifest({ protocol: { schemas: { extra: { type: "object" } } } });
        expect(resolveSurface(m, [member("extra", "too-broad")]).dataProps.map((d: M) => d.name)).toEqual(["extra"]);
    });
    test("a too-broad member without an override fails", () =>
    {
        expect(codes(manifest(), [member("extra", "too-broad")])).toEqual([VIOLATION.TOO_BROAD]);
    });
});

describe("resolve — mixed members and hazards", () =>
{
    test("an undeclared mixed member fails", () =>
    {
        expect(codes(manifest(), [member("title", "data", { mixedArms: ["function"] })]))
            .toEqual([VIOLATION.UNDECLARED_MIXED]);
    });
    test("a declared mixed member stays data", () =>
    {
        const m = manifest({ protocol: { hostOnly: { title: REASON } } });
        expect(resolveSurface(m, [member("title", "data", { mixedArms: ["function"] })]).dataProps.length).toBe(1);
    });
    test("an undeclared hazard fails", () =>
    {
        const c = member("columns", "data", { hazards: [{ path: "columns[].renderer", cls: "function" }] });
        expect(codes(manifest(), [c])).toEqual([VIOLATION.UNDECLARED_HAZARD]);
    });
    test("a parent path covers the hazards below it", () =>
    {
        const c = member("columns", "data", { hazards: [{ path: "columns[].renderer", cls: "function" }] });
        const m = manifest({ protocol: { hostOnly: { "columns[]": REASON } } });
        expect(codes(m, [c])).toEqual([]);
    });
});

describe("resolve — declarations", () =>
{
    test("a stale hostOnly key fails", () =>
    {
        expect(codes(manifest({ protocol: { hostOnly: { gone: REASON } } }), [])).toEqual([VIOLATION.STALE_DECLARATION]);
    });
    test("a short reason fails", () =>
    {
        const m = manifest({ protocol: { hostOnly: { container: "n/a" } } });
        expect(codes(m, [member("container", "element")])).toEqual([VIOLATION.SHORT_REASON]);
    });
    test("the reason floor is 20 characters", () => { expect(MIN_REASON_LENGTH).toBe(20); });
    test("an event option also declared host-only is double-classified", () =>
    {
        const m = manifest({ emits: [{ name: "selection", payload: "record", multi: false, legacyOption: "onSelect" }],
            protocol: { hostOnly: { onSelect: REASON } } });
        expect(codes(m, [member("onSelect", "function")])).toEqual([VIOLATION.DOUBLE_CLASSIFIED]);
    });
    test("a stale bindAs key fails", () =>
    {
        expect(codes(manifest({ protocol: { bindAs: { nope: "x" } } }), [])).toEqual([VIOLATION.STALE_DECLARATION]);
    });
    test("a data member without JSDoc fails", () =>
    {
        expect(codes(manifest(), [member("label", "data", { jsdoc: "" })])).toEqual([VIOLATION.MISSING_JSDOC]);
    });
    test("a value prop on a display component fails", () =>
    {
        expect(codes(manifest({ conformance: "display" }), [member("value", "data")]))
            .toEqual([VIOLATION.VALUE_BELOW_FIELD]);
    });
});

describe("resolve — providers", () =>
{
    const spec = { onSearch: { request: "search", params: "searchQuery", response: "searchResults" } };

    test("a one-parameter provider resolves", () =>
    {
        expect(resolveSurface(manifest({ protocol: { providers: spec } }), [member("onSearch", "function")]).providers[0])
            .toMatchObject({ actionProp: "onSearch", params: "searchQuery", response: "searchResults" });
    });
    test("a two-parameter provider fails", () =>
    {
        expect(codes(manifest({ protocol: { providers: spec } }), [member("onSearch", "function", { arity: 2 })]))
            .toEqual([VIOLATION.PROVIDER_ARITY]);
    });
    test("pascal capitalises each word", () => { expect(pascal("row-activate")).toBe("RowActivate"); });
});

describe("resolve — messages", () =>
{
    test("a violation names the manifest file to edit", () =>
    {
        const [v] = resolveSurface(manifest(), [member("onX", "function")]).violations;
        expect(v.message).toContain("components/widget/widget.manifest.ts");
    });
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npx vitest run scripts/agentui/resolve.test.ts`
Expected: FAIL, because `./resolve.mjs` is missing.

- [ ] **Step 3: Implement `scripts/agentui/resolve.mjs`.** Header (`⚓ COMPONENT: AgentUiResolver`; purpose: check the classifier's findings against the manifest's declarations and produce the protocol surface, spec §3.2–3.3), then:

```js
import { MEMBER_CLASS } from "./classify.mjs";

export const VIOLATION = Object.freeze({
    UNCLASSIFIED: "unclassified",
    DOUBLE_CLASSIFIED: "double-classified",
    STALE_DECLARATION: "stale-declaration",
    SHORT_REASON: "short-reason",
    UNDECLARED_MIXED: "undeclared-mixed",
    UNDECLARED_HAZARD: "undeclared-hazard",
    TOO_BROAD: "too-broad",
    MISSING_JSDOC: "missing-jsdoc",
    PROVIDER_ARITY: "provider-arity",
    VALUE_BELOW_FIELD: "value-below-field",
    NAME_INVALID: "name-invalid",
    NAME_COLLISION: "name-collision",
    PROP_COLLISION: "prop-collision",
});

/** "n/a" is not a reason (spec §3.3). */
export const MIN_REASON_LENGTH = 20;

/** "row-activate" → "RowActivate". */
export function pascal(s)
{
    return s.split(/[-_\s]+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("");
}

/**
 * Resolves one component's protocol surface (spec §3).
 *
 * @param manifest - The capability manifest.
 * @param members  - MemberReport[] from classify.mjs.
 * @returns The surface, with every violation found.
 */
// @entrypoint
export function resolveSurface(manifest, members)
{
    const protocol = manifest.protocol ?? {};
    const ctx = { manifest, protocol, byName: new Map(members.map((m) => [m.name, m])), violations: [] };
    const events = resolveEvents(ctx);
    const providers = resolveProviders(ctx);
    const twoWayValue = ctx.byName.has("value") && ctx.byName.get("onChange")?.cls === MEMBER_CLASS.FUNCTION;
    const claimed = claimedNames(ctx, events, twoWayValue);
    const dataProps = members.filter((m) => !claimed.has(m.name)).flatMap((m) => resolveMember(ctx, m));

    checkDoubleClaims(ctx, claimed);
    checkStaleDeclarations(ctx, members);
    checkValueLevel(ctx, dataProps);

    return { name: manifest.name, dataProps, twoWayValue, events, providers,
        actions: resolveActions(manifest), hostOnly: protocol.hostOnly ?? {}, violations: ctx.violations };
}

/** Records one violation, with the file the author has to edit. */
export function violate(ctx, member, code, message)
{
    const { name } = ctx.manifest;

    ctx.violations.push({ component: name, member, code,
        message: `${name}.${member}: ${message} (components/${name}/${name}.manifest.ts)` });
}

/** One event per emits channel: a bindable prop plus an on<Channel> action. */
function resolveEvents(ctx)
{
    return ctx.manifest.emits.map((c) => ({
        channel: c.name,
        option: c.legacyOption && ctx.byName.has(c.legacyOption) ? c.legacyOption : null,
        bindProp: ctx.protocol.bindAs?.[c.name] ?? c.name,
        actionProp: `on${pascal(c.name)}`,
        payload: c.payload,
    }));
}

/** Providers that name a one-parameter function member. */
function resolveProviders(ctx)
{
    return Object.entries(ctx.protocol.providers ?? {}).flatMap(([option, spec]) =>
    {
        const m = ctx.byName.get(option);

        if (!m || m.cls !== MEMBER_CLASS.FUNCTION)
        {
            return [];   // reported by checkStaleDeclarations
        }

        if (m.arity !== 1)
        {
            violate(ctx, option, VIOLATION.PROVIDER_ARITY, `provider takes ${m.arity} parameters; a provider `
                + `takes exactly one, which becomes the "${spec.params}" prop. Declare it in protocol.hostOnly `
                + "instead, or give the component an additive single-object variant.");
            return [];
        }

        return [{ option, ...spec, actionProp: `on${pascal(spec.request)}` }];
    });
}

/**
 * Members that something other than the data rule has claimed. Every declared
 * provider key that names a function is claimed, even one rejected for its
 * arity, so it is reported once (provider-arity), not twice.
 */
function claimedNames(ctx, events, twoWayValue)
{
    const { manifest } = ctx;
    const implicit = manifest.factoryStyle === "options-only" ? [manifest.containerOption ?? "container"] : [];
    const providerKeys = Object.keys(ctx.protocol.providers ?? {})
        .filter((k) => ctx.byName.get(k)?.cls === MEMBER_CLASS.FUNCTION);

    return new Set([
        ...events.map((e) => e.option).filter(Boolean),
        ...providerKeys,
        ...(twoWayValue ? ["onChange"] : []),
        ...implicit,
    ]);
}

/** Resolves an unclaimed member: data prop, host-only, or a violation. */
function resolveMember(ctx, m)
{
    const declared = ctx.protocol.hostOnly?.[m.name] !== undefined;

    if (declared && m.mixedArms.length === 0) { return []; }

    if (m.cls === MEMBER_CLASS.FUNCTION || m.cls === MEMBER_CLASS.ELEMENT)
    {
        violate(ctx, m.name, VIOLATION.UNCLASSIFIED, `is ${m.cls}-typed and unclassified. Over A2UI or MCP it `
            + "would vanish without a trace. Name it in an emits[].legacyOption, protocol.providers, or "
            + "protocol.hostOnly with a reason.");
        return [];
    }

    if (m.cls === MEMBER_CLASS.TOO_BROAD && ctx.protocol.schemas?.[m.name] === undefined)
    {
        violate(ctx, m.name, VIOLATION.TOO_BROAD, "is typed too broadly to describe (unknown, any, object or an "
            + "open record). Give it a JSON Schema in protocol.schemas, or declare it in protocol.hostOnly.");
        return [];
    }

    return checkDataMember(ctx, m, declared) ? [m] : [];
}

/** Mixed arms, nested hazards and JSDoc for a data member. True when clean. */
function checkDataMember(ctx, m, declared)
{
    const before = ctx.violations.length;

    if (m.mixedArms.length > 0 && !declared)
    {
        violate(ctx, m.name, VIOLATION.UNDECLARED_MIXED, `mixes data with ${m.mixedArms.join(" and ")}. Only the `
            + "data arms cross the protocol; say so with a protocol.hostOnly entry for this member.");
    }

    for (const h of m.hazards.filter((h) => !isCovered(h.path, ctx.protocol.hostOnly)))
    {
        violate(ctx, m.name, VIOLATION.UNDECLARED_HAZARD, `contains a ${h.cls} at ${h.path}. Every schema tool `
            + `drops such parts silently, so declare "${h.path}" (or a parent path) in protocol.hostOnly.`);
    }

    if (m.jsdoc === "")
    {
        violate(ctx, m.name, VIOLATION.MISSING_JSDOC, "has no JSDoc. Its description is what the agent reads; "
            + "add a /** … */ comment on its own line above the member in the options interface.");
    }

    return ctx.violations.length === before;
}

/** True when a hostOnly key equals the path or is a parent of it. */
export function isCovered(path, hostOnly = {})
{
    return Object.keys(hostOnly).some((k) => path === k || path.startsWith(`${k}.`) || path.startsWith(`${k}[`));
}

/** A hostOnly entry that also names an event, provider or write-back member. */
function checkDoubleClaims(ctx, claimed)
{
    for (const key of Object.keys(ctx.protocol.hostOnly ?? {}).filter((k) => claimed.has(k)))
    {
        violate(ctx, key, VIOLATION.DOUBLE_CLASSIFIED, "is declared host-only and is also an event, provider or "
            + "value write-back. Remove one of the two declarations.");
    }
}

/** Keys that name nothing, and reasons too short to be reasons. */
function checkStaleDeclarations(ctx, members)
{
    const { protocol } = ctx;
    const isMember = (k) => ctx.byName.has(k);
    const isPath = (k) => members.some((m) => m.hazards.some((h) => isCovered(h.path, { [k]: "" })));
    const channels = new Set(ctx.manifest.emits.map((e) => e.name));

    staleKeys(ctx, protocol.hostOnly, (k) => isMember(k) || isPath(k), "protocol.hostOnly");
    staleKeys(ctx, protocol.providers, (k) => ctx.byName.get(k)?.cls === MEMBER_CLASS.FUNCTION, "protocol.providers");
    staleKeys(ctx, protocol.schemas, isMember, "protocol.schemas");
    staleKeys(ctx, protocol.bindAs, (k) => channels.has(k), "protocol.bindAs");

    for (const [key, reason] of Object.entries(protocol.hostOnly ?? {}).filter(([, r]) => r.length < MIN_REASON_LENGTH))
    {
        violate(ctx, key, VIOLATION.SHORT_REASON, `has the reason "${reason}". Write what the member needs that `
            + `JSON cannot carry, in at least ${MIN_REASON_LENGTH} characters.`);
    }
}

/** Reports every key of a declaration map that fails the test. */
function staleKeys(ctx, map, isLive, where)
{
    for (const key of Object.keys(map ?? {}).filter((k) => !isLive(k)))
    {
        violate(ctx, key, VIOLATION.STALE_DECLARATION, `is named in ${where} but matches nothing in the options `
            + "type. Stale declarations hide renames; remove it or correct the name.");
    }
}

/** A `value` data prop requires at least field level (spec §7.1). */
function checkValueLevel(ctx, dataProps)
{
    if (ctx.manifest.conformance === "display" && dataProps.some((d) => d.name === "value"))
    {
        violate(ctx, "value", VIOLATION.VALUE_BELOW_FIELD, "is a data prop, so an agent will read it back, but the "
            + "manifest declares conformance \"display\". Raise it to \"field\" and pass the field checks.");
    }
}

/** One on<Id> action prop per declared manifest action. */
function resolveActions(manifest)
{
    return manifest.actions.map((a) => ({ id: a.id, label: a.label, actionProp: `on${pascal(a.id)}` }));
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npx vitest run scripts/agentui/resolve.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/agentui/resolve.mjs scripts/agentui/resolve.test.ts
git commit -m "feat(agentui): resolve classified options against manifest declarations" -m "Produces the protocol surface (data props, events as bind+action pairs, providers, actions). Every undeclared hazard, stale key or short reason becomes a literate violation naming the manifest to edit. Spec §3.2-3.3, #17."
```

---

### Task 4: Schema emission, normalisation and post-checks

**Files:**
- Modify: `package.json` (dev dependencies)
- Create: `scripts/agentui/schema.mjs`, `scripts/agentui/normalise.mjs`, `scripts/agentui/checks.mjs`
- Test: `scripts/agentui/normalise.test.ts`, `scripts/agentui/schema.test.ts`, `scripts/agentui/checks.test.ts`

**Interfaces:**
- Consumes: `readTsconfig` (Task 2).
- Produces:
  - `entrySource(entry, cacheDir) → string`
  - `emitSchemas(entries, { tsconfigPath, cacheDir }) → Map<id, { unit } | { error }>`, where `entry = { id, alias, file, factory, paramIndex, pick: string[], providers: { option, params, response }[] }`
  - `DRAFT_2020_12`, `mapRefs(node, fn)`, `normaliseTypiaUnit(unit) → schema`
  - `missingDataMembers(schema, names) → string[]`
  - `missingDescriptions(schema, members) → string[]`
  - `defaultOptionsErrors(schema, defaults) → string[]`

- [ ] **Step 1: Add the pinned dependencies**

Run: `npm install --save-dev --save-exact typia@12.2.1 ajv@8.20.0`
Then confirm: `node -e 'const p=require("./package.json").devDependencies; console.log(p.typia, p.ajv)'`
Expected: `12.2.1 8.20.0`, with no `^` or `~`.

- [ ] **Step 2: Write the failing normalise tests.** `scripts/agentui/normalise.test.ts`. The input is typia 12.2.1's real output shape, observed 2026-10-25:

```ts
import { describe, expect, test } from "vitest";

import { DRAFT_2020_12, mapRefs, normaliseTypiaUnit } from "./normalise.mjs";

const UNIT = {
    version: "3.1",
    components: { schemas: {
        Opts: { type: "object", properties: {
            pageSize: { type: "number", description: "Rows per page." },
            columns: { type: "array", items: { $ref: "#/components/schemas/Col" } },
        }, required: ["columns"] },
        Col: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
    } },
    schema: { $ref: "#/components/schemas/Opts" },
};

describe("normaliseTypiaUnit", () =>
{
    test("declares draft 2020-12", () => { expect(normaliseTypiaUnit(UNIT).$schema).toBe(DRAFT_2020_12); });
    test("inlines the root", () =>
    {
        expect(Object.keys(normaliseTypiaUnit(UNIT).properties)).toEqual(["pageSize", "columns"]);
    });
    test("rewrites refs to $defs", () =>
    {
        expect(normaliseTypiaUnit(UNIT).properties.columns.items.$ref).toBe("#/$defs/Col");
    });
    test("drops an unreferenced root definition", () =>
    {
        expect(Object.keys(normaliseTypiaUnit(UNIT).$defs)).toEqual(["Col"]);
    });
    test("closes open objects", () =>
    {
        expect(normaliseTypiaUnit(UNIT).additionalProperties).toBe(false);
    });
    test("closes nested definitions", () =>
    {
        expect(normaliseTypiaUnit(UNIT).$defs.Col.additionalProperties).toBe(false);
    });
    test("keeps a self-referenced root definition", () =>
    {
        const tree = { version: "3.1", schema: { $ref: "#/components/schemas/T" }, components: { schemas: {
            T: { type: "object", properties: { kids: { type: "array", items: { $ref: "#/components/schemas/T" } } } },
        } } };
        expect(Object.keys(normaliseTypiaUnit(tree).$defs)).toEqual(["T"]);
    });
    test("refuses a shape it does not recognise", () =>
    {
        expect(() => normaliseTypiaUnit({ version: "3.0" })).toThrow(/typia output shape changed/);
    });
    test("mapRefs rewrites every $ref", () =>
    {
        expect(mapRefs({ a: [{ $ref: "x" }] }, () => "y")).toEqual({ a: [{ $ref: "y" }] });
    });
});
```

- [ ] **Step 3: Run the tests and confirm they fail**

Run: `npx vitest run scripts/agentui/normalise.test.ts`
Expected: FAIL, because the module is missing.

- [ ] **Step 4: Implement `scripts/agentui/normalise.mjs`.** Header (`⚓ COMPONENT: AgentUiNormalise`; purpose: turn a typia OpenAPI 3.1 unit into a standalone JSON Schema 2020-12 document, spec §4), then:

```js
export const DRAFT_2020_12 = "https://json-schema.org/draft/2020-12/schema";

const TYPIA_PREFIX = "#/components/schemas/";
const DEFS_PREFIX = "#/$defs/";

/**
 * Rewrites every `$ref` string in a JSON value.
 *
 * @param node - Any JSON value.
 * @param fn   - Maps an old ref to a new one.
 * @returns A rewritten copy.
 */
export function mapRefs(node, fn)
{
    if (Array.isArray(node)) { return node.map((n) => mapRefs(n, fn)); }

    if (node === null || typeof node !== "object") { return node; }

    return Object.fromEntries(Object.entries(node).map(([k, v]) =>
        [k, k === "$ref" && typeof v === "string" ? fn(v) : mapRefs(v, fn)]));
}

/**
 * Normalises a typia 12 `json.schema<T, "3.1">()` unit (spec §4).
 *
 * @param unit - `{ version: "3.1", components: { schemas }, schema }`.
 * @returns A standalone draft 2020-12 schema with `$defs`.
 */
// @entrypoint
export function normaliseTypiaUnit(unit)
{
    if (!unit || unit.version !== "3.1" || !unit.schema)
    {
        throw new Error("Expected a typia 3.1 JSON schema unit, got "
            + `${JSON.stringify(unit)?.slice(0, 200)}. The typia output shape changed; `
            + "see specs/agentui-schema.prd.md §4 before adapting this function.");
    }

    const toDefs = (ref) => (ref.startsWith(TYPIA_PREFIX) ? DEFS_PREFIX + ref.slice(TYPIA_PREFIX.length) : ref);
    const defs = closeObjects(mapRefs(unit.components?.schemas ?? {}, toDefs));
    const root = inlineRoot(closeObjects(mapRefs(unit.schema, toDefs)), defs);

    return { $schema: DRAFT_2020_12, ...root, ...(Object.keys(defs).length > 0 ? { $defs: defs } : {}) };
}

/** Replaces a bare root `$ref` by its definition, dropping the definition if nothing else uses it. */
function inlineRoot(root, defs)
{
    const keys = Object.keys(root);

    if (keys.length !== 1 || typeof root.$ref !== "string" || !root.$ref.startsWith(DEFS_PREFIX))
    {
        return root;
    }

    const name = root.$ref.slice(DEFS_PREFIX.length);

    if (!(name in defs))
    {
        throw new Error(`typia's root ref ${root.$ref} names no definition. Its output shape changed; see spec §4.`);
    }

    const inlined = defs[name];

    if (!JSON.stringify(defs).includes(JSON.stringify(DEFS_PREFIX + name)))
    {
        delete defs[name];
    }

    return inlined;
}

/** Adds `additionalProperties: false` to every object schema that leaves it unset. */
function closeObjects(node)
{
    if (Array.isArray(node)) { return node.map(closeObjects); }

    if (node === null || typeof node !== "object") { return node; }

    const out = Object.fromEntries(Object.entries(node).map(([k, v]) => [k, closeObjects(v)]));

    if (out.type === "object" && out.properties && !("additionalProperties" in out))
    {
        out.additionalProperties = false;
    }

    return out;
}
```

- [ ] **Step 5: Run the normalise tests and confirm they pass**

Run: `npx vitest run scripts/agentui/normalise.test.ts`
Expected: PASS.

- [ ] **Step 6: Write the failing schema and checks tests.** `scripts/agentui/schema.test.ts`:

```ts
import path from "node:path";
import { beforeAll, describe, expect, test } from "vitest";

import { emitSchemas, entrySource } from "./schema.mjs";
import { normaliseTypiaUnit } from "./normalise.mjs";

const FIXTURES = path.join(__dirname, "fixtures");
const CACHE = path.join(__dirname, "..", "..", "node_modules", ".cache", "agentui-test");
const ENTRY = {
    id: "widget", alias: "AgentUiWidget", file: path.join(FIXTURES, "widget.ts"), factory: "createWidget",
    paramIndex: 1, pick: ["pageSize", "columns", "value", "title"],
    providers: [{ option: "onSearch", params: "searchQuery", response: "searchResults" }],
};

let schema: Record<string, any>;

beforeAll(() =>
{
    const result = emitSchemas([ENTRY], { tsconfigPath: path.join(FIXTURES, "tsconfig.json"), cacheDir: CACHE })
        .get("widget");
    schema = normaliseTypiaUnit(result.unit);
}, 60_000);

describe("emitSchemas — typia 12.2.1 on the fixture widget", () =>
{
    test("emits exactly the picked members and provider props", () =>
    {
        expect(Object.keys(schema.properties).sort())
            .toEqual(["columns", "pageSize", "searchQuery", "searchResults", "title", "value"]);
    });
    test("drops the declared nested callback", () =>
    {
        const col = schema.$defs[schema.properties.columns.items.$ref.slice("#/$defs/".length)];
        expect(Object.keys(col.properties)).toEqual(["id"]);
    });
    test("narrows the mixed member to its data arm", () => { expect(schema.properties.title.type).toBe("string"); });
    test("emits Date as a date-time string", () => { expect(schema.properties.value.format).toBe("date-time"); });
    test("carries JSDoc written on its own line", () =>
    {
        expect(schema.properties.pageSize.description).toBe("Rows per page.");
    });
    test("derives provider params from the parameter", () => { expect(schema.properties.searchQuery.type).toBe("string"); });
    test("derives provider response from the awaited return", () =>
    {
        expect(schema.properties.searchResults.type).toBe("array");
    });
});

describe("entrySource", () =>
{
    test("imports the factory as a type, never by interface name", () =>
    {
        expect(entrySource(ENTRY, CACHE)).toContain("import type { createWidget } from");
    });
    test("an empty pick picks never", () =>
    {
        expect(entrySource({ ...ENTRY, pick: [], providers: [] }, CACHE)).toContain("Pick<Options, never>");
    });
});
```

`scripts/agentui/checks.test.ts`:

```ts
import { describe, expect, test } from "vitest";

import { defaultOptionsErrors, missingDataMembers, missingDescriptions } from "./checks.mjs";

const SCHEMA = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    type: "object",
    properties: { pageSize: { type: "number", description: "Rows." }, columns: { type: "array" } },
    required: ["columns"],
    additionalProperties: false,
};

describe("post-checks", () =>
{
    test("reports a data member the schema lacks", () =>
    {
        expect(missingDataMembers(SCHEMA, ["pageSize", "height"])).toEqual(["height"]);
    });
    test("reports a JSDoc'd member without a description", () =>
    {
        expect(missingDescriptions(SCHEMA, [{ name: "columns", jsdoc: "Columns." }])).toEqual(["columns"]);
    });
    test("ignores a member that had no JSDoc", () =>
    {
        expect(missingDescriptions(SCHEMA, [{ name: "columns", jsdoc: "" }])).toEqual([]);
    });
    test("partial defaults validate (required is not enforced on defaults)", () =>
    {
        expect(defaultOptionsErrors(SCHEMA, { pageSize: 25 })).toEqual([]);
    });
    test("a wrongly typed default is reported", () =>
    {
        expect(defaultOptionsErrors(SCHEMA, { pageSize: "25" }).length).toBe(1);
    });
    test("a default for a non-data key is reported", () =>
    {
        expect(defaultOptionsErrors(SCHEMA, { container: "x" }).length).toBe(1);
    });
});
```

- [ ] **Step 7: Run the tests and confirm they fail**

Run: `npx vitest run scripts/agentui/schema.test.ts scripts/agentui/checks.test.ts`
Expected: FAIL, because the modules are missing.

- [ ] **Step 8: Implement `scripts/agentui/schema.mjs`.** Header (`⚓ COMPONENT: AgentUiSchemaEmitter`; purpose: emit JSON Schema for approved data members with typia 12.2.1, spec §4), then:

```js
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";

import { readTsconfig } from "./classify.mjs";

const require = createRequire(import.meta.url);

// @dependency: typia 12.2.1 (devDependency, exact pin). Do not move to 15.x
// without the nested-hazard gate: 15 inlines DOM types silently (spec §4).
const typiaTransform = require("typia/lib/transform").default;

/**
 * The TypeScript source of one typia entry file.
 *
 * @param entry    - { alias, file, factory, paramIndex, pick, providers }.
 * @param cacheDir - Directory the entry file is written to.
 * @returns The source text.
 */
export function entrySource(entry, cacheDir)
{
    const pick = entry.pick.length > 0 ? entry.pick.map((n) => JSON.stringify(n)).join(" | ") : "never";
    const extras = entry.providers.flatMap((p) => [
        `    ${p.params}?: Parameters<NonNullable<Options[${JSON.stringify(p.option)}]>>[0];`,
        `    ${p.response}?: Awaited<ReturnType<NonNullable<Options[${JSON.stringify(p.option)}]>>>;`,
    ]);
    const shape = extras.length > 0 ? [`Pick<Options, ${pick}> & {`, ...extras, "}"] : [`Pick<Options, ${pick}>`];

    return [
        "import typia from \"typia\";",
        `import type { ${entry.factory} } from ${JSON.stringify(importPath(cacheDir, entry.file))};`,
        `type Options = NonNullable<Parameters<typeof ${entry.factory}>[${entry.paramIndex}]>;`,
        `export type ${entry.alias} = ${shape.join("\n")};`,
        `export default typia.json.schema<${entry.alias}, "3.1">();`,
        "",
    ].join("\n");
}

/** A relative, extensionless import path from the cache directory to a module. */
function importPath(cacheDir, file)
{
    const rel = path.relative(cacheDir, file).replace(/\.ts$/, "").split(path.sep).join("/");

    return rel.startsWith(".") ? rel : `./${rel}`;
}

/**
 * Emits a typia schema unit for every entry, in one TypeScript program.
 *
 * @param entries - Entry descriptors (see entrySource).
 * @param opts    - { tsconfigPath, cacheDir }.
 * @returns Map from entry id to { unit } or { error }.
 */
// @entrypoint
export function emitSchemas(entries, { tsconfigPath, cacheDir })
{
    fs.mkdirSync(cacheDir, { recursive: true });
    const files = entries.map((entry) =>
    {
        const file = path.join(cacheDir, `entry-${entry.id}.ts`);
        fs.writeFileSync(file, entrySource(entry, cacheDir));
        return file;
    });
    const config = readTsconfig(tsconfigPath);
    const program = ts.createProgram([...config.fileNames, ...files], emitOptions(config.options));

    return new Map(entries.map((entry, i) => [entry.id, emitOne(program, files[i])]));
}

/** The repo's compiler options, switched to emitting CommonJS. */
function emitOptions(options)
{
    return { ...options, module: ts.ModuleKind.CommonJS, noEmit: false, declaration: false,
        sourceMap: false, outDir: undefined, rootDir: undefined, noUnusedLocals: false };
}

/** Emits one entry through typia's transformer and evaluates it. */
function emitOne(program, file)
{
    const diagnostics = [];
    let js = "";
    const before = [typiaTransform(program, {}, { addDiagnostic: (d) => diagnostics.push(d) })];

    program.emit(program.getSourceFile(file), (name, text) =>
    {
        if (name.endsWith(".js")) { js = text; }
    }, undefined, false, { before });

    if (diagnostics.length > 0)
    {
        return { error: diagnostics.map((d) => ts.flattenDiagnosticMessageText(d.messageText, " ")).join(" | ") };
    }

    const out = file.replace(/\.ts$/, ".cjs");
    fs.writeFileSync(out, js);
    delete require.cache[out];

    return { unit: require(out).default };
}
```

`scripts/agentui/checks.mjs` (header `⚓ COMPONENT: AgentUiPostChecks`; purpose: catch a schema tool's silent drops, spec §4), then:

```js
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Ajv2020 = require("ajv/dist/2020").default;

/**
 * Data members absent from the schema's top-level properties.
 *
 * @param schema - Normalised schema.
 * @param names  - Member names the classifier called data.
 * @returns The missing names.
 */
export function missingDataMembers(schema, names)
{
    const props = schema.properties ?? {};

    return names.filter((n) => !(n in props));
}

/**
 * Members with JSDoc whose schema property has no description. typia 12.2.1
 * ignores JSDoc on the same line as the member (spec §4).
 *
 * @param schema  - Normalised schema.
 * @param members - MemberReport[] for the data props.
 * @returns The names that lost their description.
 */
export function missingDescriptions(schema, members)
{
    const props = schema.properties ?? {};

    return members.filter((m) => m.jsdoc !== "" && props[m.name] && !props[m.name].description).map((m) => m.name);
}

/**
 * Validates manifest defaults against the schema. `required` is not enforced,
 * because defaults are partial by nature.
 *
 * @param schema   - Normalised schema.
 * @param defaults - The manifest's defaultOptions.
 * @returns One message per error; empty when valid.
 */
export function defaultOptionsErrors(schema, defaults)
{
    const { required, ...relaxed } = schema;
    void required;
    const validate = new Ajv2020({ strict: false, validateFormats: false, allErrors: true }).compile(relaxed);

    return validate(defaults) ? [] : validate.errors.map((e) => `${e.instancePath || "/"} ${e.message}`);
}
```

- [ ] **Step 9: Run the tests and confirm they pass**

Run: `npx vitest run scripts/agentui/schema.test.ts scripts/agentui/checks.test.ts scripts/agentui/normalise.test.ts`
Expected: PASS. If the schema test's root properties come back under a differently named definition, `normaliseTypiaUnit` handles it. If typia reports a diagnostic, print `result.error` and fix the entry source, not the test.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json scripts/agentui/schema.mjs scripts/agentui/normalise.mjs scripts/agentui/checks.mjs scripts/agentui/schema.test.ts scripts/agentui/normalise.test.ts scripts/agentui/checks.test.ts
git commit -m "feat(agentui): emit option schemas with typia behind post-checks" -m "typia 12.2.1 and ajv 8.20.0, exact pins, build-only. Normalises to draft 2020-12, and catches the two silent failures the spike found: a dropped member and a dropped same-line JSDoc. Spec §4, #17."
```

---

### Task 5: Vendored A2UI schemas and the catalog builder

**Files:**
- Create: `scripts/agentui/vendor/a2ui-v0_9_1/common_types.json`, `scripts/agentui/vendor/a2ui-v0_9_1/catalogs/basic/catalog.json`, `scripts/agentui/vendor/a2ui-v0_9_1/SOURCE.md`
- Create: `scripts/agentui/catalog.mjs`
- Test: `scripts/agentui/catalog.test.ts`

**Interfaces:**
- Consumes: `Surface` (Task 3), the normalised schema (Task 4), `mapRefs` and `DRAFT_2020_12`, `VIOLATION`.
- Produces:
  - `CATALOG_ORIGIN`, `CATALOG_MAJOR = 1`, `BASIC_CATALOG_ID`, `COMMON_TYPES_ID`
  - `catalogId(major)`, `catalogName(manifest)`, `describeComponent(manifest)`
  - `relocateDefs(schema, prefix)`
  - `buildCatalog({ basic, components: { manifest, surface, schema }[], major }) → { catalog, violations }`

- [ ] **Step 1: Vendor the files.** Copy from a2ui-project/a2ui at commit `409ded2`:

```bash
TMP=$(mktemp -d) && git clone -q https://github.com/a2ui-project/a2ui.git "$TMP/a2ui" && git -C "$TMP/a2ui" checkout -q 409ded2
mkdir -p scripts/agentui/vendor/a2ui-v0_9_1/catalogs/basic
cp "$TMP/a2ui/specification/v0_9_1/json/common_types.json" scripts/agentui/vendor/a2ui-v0_9_1/
cp "$TMP/a2ui/specification/v0_9_1/catalogs/basic/catalog.json" scripts/agentui/vendor/a2ui-v0_9_1/catalogs/basic/
node -e 'const c=require("./scripts/agentui/vendor/a2ui-v0_9_1/catalogs/basic/catalog.json"); console.log(c.catalogId)'
```

Expected output: `https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json`

Write `SOURCE.md`:

```markdown
<!-- SPDX header as in COPYRIGHT_HEADER.md -->
# Vendored A2UI v0.9.1 schemas

Copied verbatim from https://github.com/a2ui-project/a2ui at commit `409ded2`
(2026-10-24): `specification/v0_9_1/json/common_types.json` and
`specification/v0_9_1/catalogs/basic/catalog.json`. These are data, not served,
and never fetched at build time. To update, re-copy at a new commit, record it
here, and expect the catalog-diff gate to report what changed.

The basic catalog declares the `v0_9` ID (not `v0_9_1`); `@a2ui/web_core`
0.14.0 matches it by exact string equality (`message-processor.js:932`).
```

- [ ] **Step 2: Write the failing tests.** `scripts/agentui/catalog.test.ts`:

```ts
import { describe, expect, test } from "vitest";

import basic from "./vendor/a2ui-v0_9_1/catalogs/basic/catalog.json";
import {
    BASIC_CATALOG_ID, COMMON_TYPES_ID, buildCatalog, catalogId, catalogName, describeComponent, relocateDefs,
} from "./catalog.mjs";
import { VIOLATION } from "./resolve.mjs";

const MANIFEST = {
    name: "widget", factory: "createWidget", label: "Widget",
    affords: [{ shape: "collection", intents: ["browse", "compare"], cardinality: { min: 2, max: 500 } }],
    emits: [], accepts: [], actions: [{ id: "export", label: "Export CSV" }], conformance: "surface",
};
const SCHEMA = {
    $schema: "https://json-schema.org/draft/2020-12/schema", type: "object", additionalProperties: false,
    properties: {
        pageSize: { type: "number", description: "Rows per page." },
        columns: { type: "array", items: { $ref: "#/$defs/Col" } },
        searchResults: { type: "array", items: { type: "string" } },
    },
    required: ["columns"],
    $defs: { Col: { type: "object", properties: { id: { type: "string" } }, additionalProperties: false } },
};
const SURFACE = {
    name: "widget",
    dataProps: [{ name: "pageSize", jsdoc: "Rows per page." }, { name: "columns", jsdoc: "Columns." }],
    twoWayValue: false,
    events: [{ channel: "selection", option: "onSelect", bindProp: "selection", actionProp: "onSelection", payload: "collection" }],
    providers: [{ option: "onSearch", request: "search", params: "searchQuery", response: "searchResults", actionProp: "onSearch" }],
    actions: [{ id: "export", label: "Export CSV", actionProp: "onExport" }],
    hostOnly: {}, violations: [],
};

function build(components = [{ manifest: MANIFEST, surface: SURFACE, schema: SCHEMA }])
{
    return buildCatalog({ basic, components, major: 1 });
}

function ownProps(catalog: any, name: string): Record<string, any>
{
    return catalog.components[name].allOf[2].properties;
}

describe("catalog — identity and layout", () =>
{
    test("the ID lives on static.outcrop.us at the dist root", () =>
    {
        expect(catalogId(1)).toBe("https://static.outcrop.us/a2ui/catalog/v1.json");
    });
    test("$id equals catalogId", () => { expect(build().catalog.$id).toBe(build().catalog.catalogId); });
    test("top-level keys mirror the basic catalog file", () =>
    {
        expect(Object.keys(build().catalog).sort()).toEqual(Object.keys(basic).sort());
    });
    test("the name drops create", () => { expect(catalogName(MANIFEST)).toBe("Widget"); });
    test("protocol.name overrides", () => { expect(catalogName({ ...MANIFEST, protocol: { name: "Grid" } })).toBe("Grid"); });
});

describe("catalog — basic re-exports", () =>
{
    test("re-exports every basic component", () =>
    {
        expect(Object.keys(basic.components).every((n) => n in build().catalog.components)).toBe(true);
    });
    test("re-exports through allOf, never a bare $ref", () =>
    {
        expect(build().catalog.components.Text).toEqual(
            { type: "object", allOf: [{ $ref: `${BASIC_CATALOG_ID}#/components/Text` }] });
    });
    test("re-exports every basic function", () =>
    {
        expect(Object.keys(build().catalog.functions)).toEqual(Object.keys(basic.functions).sort());
    });
    test("anyComponent lists every component", () =>
    {
        const { catalog } = build();
        expect(catalog.$defs.anyComponent.oneOf.length).toBe(Object.keys(catalog.components).length);
    });
});

describe("catalog — component entry", () =>
{
    test("starts with ComponentCommon", () =>
    {
        expect(build().catalog.components.Widget.allOf[0]).toEqual({ $ref: `${COMMON_TYPES_ID}#/$defs/ComponentCommon` });
    });
    test("a data prop accepts a literal or a binding", () =>
    {
        expect(ownProps(build().catalog, "Widget").pageSize.oneOf[1]).toEqual({ $ref: `${COMMON_TYPES_ID}#/$defs/DataBinding` });
    });
    test("a channel's bind prop is binding-only", () =>
    {
        expect(ownProps(build().catalog, "Widget").selection.$ref).toBe(`${COMMON_TYPES_ID}#/$defs/DataBinding`);
    });
    test("a channel has an on<Channel> Action", () =>
    {
        expect(ownProps(build().catalog, "Widget").onSelection.$ref).toBe(`${COMMON_TYPES_ID}#/$defs/Action`);
    });
    test("a provider gets params, action and response", () =>
    {
        expect(["searchQuery", "onSearch", "searchResults"].every((p) => p in ownProps(build().catalog, "Widget"))).toBe(true);
    });
    test("a manifest action gets an on<Id> Action", () => { expect("onExport" in ownProps(build().catalog, "Widget")).toBe(true); });
    test("required carries component and required data props", () =>
    {
        expect(build().catalog.components.Widget.allOf[2].required).toEqual(["component", "columns"]);
    });
    test("component-local defs are relocated under a prefix", () =>
    {
        expect(Object.keys(build().catalog.$defs)).toContain("Widget__Col");
    });
    test("relocateDefs rewrites refs to the prefix", () =>
    {
        expect(relocateDefs(SCHEMA, "Widget").root.properties.columns.items.$ref).toBe("#/$defs/Widget__Col");
    });
});

describe("catalog — guidance", () =>
{
    test("describes affordances in words", () =>
    {
        expect(describeComponent(MANIFEST)).toBe("Widget. Use it to browse, compare a collection of 2 to 500 items. Actions: Export CSV.");
    });
    test("the catalog description lists the component", () => { expect(build().catalog.description).toContain("- Widget: Widget."); });
});

describe("catalog — violations", () =>
{
    test("a name colliding with the basic catalog fails", () =>
    {
        const m = { ...MANIFEST, protocol: { name: "Text" } };
        expect(build([{ manifest: m, surface: SURFACE, schema: SCHEMA }]).violations[0].code).toBe(VIOLATION.NAME_COLLISION);
    });
    test("a non-UAX31 name fails", () =>
    {
        const m = { ...MANIFEST, protocol: { name: "my-widget" } };
        expect(build([{ manifest: m, surface: SURFACE, schema: SCHEMA }]).violations[0].code).toBe(VIOLATION.NAME_INVALID);
    });
    test("a generated prop colliding with a data prop fails", () =>
    {
        const s = { ...SURFACE, events: [{ ...SURFACE.events[0], bindProp: "pageSize" }] };
        expect(build([{ manifest: MANIFEST, surface: s, schema: SCHEMA }]).violations[0].code).toBe(VIOLATION.PROP_COLLISION);
    });
});
```

- [ ] **Step 3: Run the tests and confirm they fail**

Run: `npx vitest run scripts/agentui/catalog.test.ts`
Expected: FAIL, because the module is missing.

- [ ] **Step 4: Implement `scripts/agentui/catalog.mjs`.** Header (`⚓ COMPONENT: AgentUiCatalog`; purpose: assemble the A2UI v0.9.1 catalog file from manifests, surfaces and schemas, spec §5), then:

```js
import { DRAFT_2020_12, mapRefs } from "./normalise.mjs";
import { VIOLATION } from "./resolve.mjs";

// @config: CatalogIdentity — changing these changes a permanent public identifier (D7, D12).
export const CATALOG_ORIGIN = "https://static.outcrop.us";
export const CATALOG_MAJOR = 1;
export const BASIC_CATALOG_ID = "https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json";
export const COMMON_TYPES_ID = "https://a2ui.org/specification/v0_9/common_types.json";

const TITLE = "Enterprise Bootstrap Theme";
const UAX31 = /^[\p{XID_Start}_][\p{XID_Continue}]*$/u;
const BINDING = { $ref: `${COMMON_TYPES_ID}#/$defs/DataBinding` };
const ACTION_REF = `${COMMON_TYPES_ID}#/$defs/Action`;
const PREAMBLE = "Components of the Enterprise Bootstrap Theme, plus the A2UI basic catalog's components and "
    + "functions, which this catalog re-exports. Every data property accepts a literal or a {\"path\": …} "
    + "binding. For each event a component emits, it has a binding property it writes each emission to, and an "
    + "on<Event> action property. Bind the first to a path and read that path in the action's context; the "
    + "context is resolved after the write.";

/** The permanent catalog ID for a catalog major version. */
export function catalogId(major)
{
    return `${CATALOG_ORIGIN}/a2ui/catalog/v${major}.json`;
}

/** Catalog name: protocol.name, else the factory without "create". */
export function catalogName(manifest)
{
    return manifest.protocol?.name ?? manifest.factory.replace(/^create/, "");
}

/**
 * Builds the catalog file (spec §5).
 *
 * @param input - { basic, components: { manifest, surface, schema }[], major }.
 * @returns { catalog, violations }.
 */
// @entrypoint
export function buildCatalog({ basic, components, major })
{
    const violations = nameViolations(basic, components);
    const ours = components.map(entryFor);
    const id = catalogId(major);
    const all = sortKeys({ ...reexport(basic.components, "components"), ...Object.fromEntries(ours.map((o) => [o.name, o.entry])) });
    const functions = sortKeys(reexportFunctions(basic.functions));

    return {
        catalog: {
            $schema: DRAFT_2020_12, $id: id, title: TITLE, description: guidance(components), catalogId: id,
            components: all, functions, $defs: rootDefs(all, functions, ours),
        },
        violations: [...violations, ...ours.flatMap((o) => o.violations)],
    };
}

/** Re-exports basic components through allOf (a bare $ref derives an empty strict object). */
function reexport(map, section)
{
    return Object.fromEntries(Object.keys(map).map((n) =>
        [n, { type: "object", allOf: [{ $ref: `${BASIC_CATALOG_ID}#/${section}/${n}` }] }]));
}

function reexportFunctions(map)
{
    return Object.fromEntries(Object.keys(map).map((n) => [n, { allOf: [{ $ref: `${BASIC_CATALOG_ID}#/functions/${n}` }] }]));
}

/** The catalog's $defs: basic common defs, the any* unions, and relocated component defs. */
function rootDefs(components, functions, ours)
{
    return {
        CatalogComponentCommon: { type: "object", allOf: [{ $ref: `${BASIC_CATALOG_ID}#/$defs/CatalogComponentCommon` }] },
        theme: { type: "object", allOf: [{ $ref: `${BASIC_CATALOG_ID}#/$defs/theme` }] },
        anyComponent: { oneOf: Object.keys(components).map((n) => ({ $ref: `#/components/${n}` })) },
        anyFunction: { oneOf: Object.keys(functions).map((n) => ({ $ref: `#/functions/${n}` })) },
        ...sortKeys(Object.assign({}, ...ours.map((o) => o.defs))),
    };
}

/** One component entry plus its relocated defs and prop-collision violations. */
function entryFor({ manifest, surface, schema })
{
    const name = catalogName(manifest);
    const { root, defs } = relocateDefs(schema, name);
    const groups = [dataProps(surface, root), channelProps(surface), providerProps(surface, root), actionProps(surface)];
    const props = Object.assign({ component: { const: name } }, ...groups);
    const dataNames = new Set(surface.dataProps.map((d) => d.name));

    return {
        name, defs,
        violations: propCollisions(manifest, groups),
        entry: {
            type: "object",
            description: describeComponent(manifest),
            allOf: [
                { $ref: `${COMMON_TYPES_ID}#/$defs/ComponentCommon` },
                { $ref: "#/$defs/CatalogComponentCommon" },
                { type: "object", properties: props,
                    required: ["component", ...(root.required ?? []).filter((n) => dataNames.has(n))] },
            ],
            unevaluatedProperties: false,
        },
    };
}

/**
 * Moves a standalone schema's $defs under `<prefix>__` keys so they can live
 * at the catalog root, rewriting refs to match.
 */
export function relocateDefs(schema, prefix)
{
    const { $schema, $defs = {}, ...root } = schema;
    void $schema;
    const rewrite = (node) => mapRefs(node, (ref) =>
        (ref.startsWith("#/$defs/") ? `#/$defs/${prefix}__${ref.slice("#/$defs/".length)}` : ref));

    return { root: rewrite(root), defs: Object.fromEntries(Object.entries($defs).map(([k, v]) => [`${prefix}__${k}`, rewrite(v)])) };
}

/** Data props: literal-or-binding, description outside the oneOf. */
function dataProps(surface, root)
{
    return Object.fromEntries(surface.dataProps.map((d) =>
    {
        const { description, ...schema } = root.properties[d.name];
        const twoWay = d.name === "value" && surface.twoWayValue
            ? " Two-way: when bound to a path, the component writes the user's changes there." : "";

        return [d.name, { description: `${description ?? d.jsdoc}${twoWay}`, oneOf: [schema, BINDING] }];
    }));
}

/** Each channel: a binding-only prop the component writes, and an on<Channel> Action. */
function channelProps(surface)
{
    return Object.fromEntries(surface.events.flatMap((e) => [
        [e.bindProp, { description: `Bind to a path. The component writes each "${e.channel}" emission `
            + `(a ${e.payload}) there before sending ${e.actionProp}.`, ...BINDING }],
        [e.actionProp, { description: `Sent when "${e.channel}" emits. Read the emission through the path `
            + `bound to ${e.bindProp}.`, $ref: ACTION_REF }],
    ]));
}

/** Each provider: params (component writes), on<Request> Action, response (agent answers). */
function providerProps(surface, root)
{
    return Object.fromEntries(surface.providers.flatMap((p) =>
    {
        const { description, ...response } = root.properties[p.response];
        void description;

        return [
            [p.params, { description: `Bind to a path. The component writes the "${p.request}" request there `
                + `before sending ${p.actionProp}.`, ...BINDING }],
            [p.actionProp, { description: `Sent when the component needs "${p.request}" answered.`, $ref: ACTION_REF }],
            [p.response, { description: `Bind to the path you will answer ${p.actionProp} at with updateDataModel.`,
                oneOf: [response, BINDING] }],
        ];
    }));
}

function actionProps(surface)
{
    return Object.fromEntries(surface.actions.map((a) =>
        [a.actionProp, { description: `Sent when the user invokes "${a.label}".`, $ref: ACTION_REF }]));
}

/** A generated prop name used twice within one component. */
function propCollisions(manifest, groups)
{
    const names = ["component", ...groups.flatMap((g) => Object.keys(g))];
    const dupes = [...new Set(names.filter((n, i) => names.indexOf(n) !== i))];

    return dupes.map((n) => ({
        component: manifest.name, member: n, code: VIOLATION.PROP_COLLISION,
        message: `${manifest.name}.${n}: two catalog properties would share the name "${n}". Rename the `
            + `channel's prop with protocol.bindAs, or the provider's params/response, in `
            + `components/${manifest.name}/${manifest.name}.manifest.ts`,
    }));
}

/** Invalid names, and names that collide with ours or the basic catalog's. */
function nameViolations(basic, components)
{
    const seen = new Set(Object.keys(basic.components));

    return components.flatMap(({ manifest }) =>
    {
        const name = catalogName(manifest);
        const where = `components/${manifest.name}/${manifest.name}.manifest.ts`;

        if (!UAX31.test(name))
        {
            return [{ component: manifest.name, member: "protocol.name", code: VIOLATION.NAME_INVALID,
                message: `${manifest.name}: catalog name "${name}" is not a UAX #31 identifier. Set protocol.name in ${where}` }];
        }

        if (seen.has(name))
        {
            return [{ component: manifest.name, member: "protocol.name", code: VIOLATION.NAME_COLLISION,
                message: `${manifest.name}: catalog name "${name}" is already taken. Set a distinct protocol.name in ${where}` }];
        }

        seen.add(name);
        return [];
    });
}

/** "Data Grid. Use it to browse, compare a collection of 2 to 100000 items. Actions: Export CSV." */
export function describeComponent(manifest)
{
    const uses = manifest.affords.map((a) =>
        `Use it to ${a.intents.join(", ")} a ${a.shape}${a.cardinality ? ` of ${a.cardinality.min} to ${a.cardinality.max} items` : ""}.`);
    const actions = manifest.actions.length > 0 ? [`Actions: ${manifest.actions.map((a) => a.label).join(", ")}.`] : [];

    return [`${manifest.label}.`, ...uses, ...actions].join(" ");
}

/** The catalog description: preamble, then one line per component. */
function guidance(components)
{
    const lines = components.map(({ manifest }) => `- ${catalogName(manifest)}: ${describeComponent(manifest)}`);

    return [PREAMBLE, "", ...lines.sort()].join("\n");
}

function sortKeys(obj)
{
    return Object.fromEntries(Object.entries(obj).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}
```

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `npx vitest run scripts/agentui/catalog.test.ts`
Expected: PASS. vitest supports the default import of a JSON module.

- [ ] **Step 6: Commit**

```bash
git add scripts/agentui/vendor scripts/agentui/catalog.mjs scripts/agentui/catalog.test.ts
git commit -m "feat(agentui): build the A2UI v0.9.1 catalog file" -m "Mirrors the vendored basic catalog's layout and re-exports its primitives (one catalog per surface in v0.9.1). Channels become a binding prop plus an on<Channel> action, providers three props, so no reserved keys. Spec §5, #17."
```

---

### Task 6: The catalog diff and version rule

**Files:**
- Create: `scripts/agentui/catalog-diff.mjs`
- Test: `scripts/agentui/catalog-diff.test.ts`

**Interfaces:**
- Produces:
  - `diffCatalogs(previous, next) → { breaking: string[], additive: string[] }`
  - `versionProblem(diff, previousMajor, nextMajor) → string | null`

- [ ] **Step 1: Write the failing tests.** `scripts/agentui/catalog-diff.test.ts`:

```ts
import { describe, expect, test } from "vitest";

import { diffCatalogs, versionProblem } from "./catalog-diff.mjs";

function cat(props: Record<string, unknown>, required: string[] = ["component"], extra: Record<string, unknown> = {})
{
    return {
        components: {
            Text: { type: "object", allOf: [{ $ref: "basic#/components/Text" }] },
            Widget: { type: "object", allOf: [{}, {}, { type: "object", properties: { component: { const: "Widget" }, ...props }, required }] },
            ...extra,
        },
        functions: {},
        $defs: { anyComponent: { oneOf: [] }, anyFunction: { oneOf: [] } },
    };
}

const BASE = cat({ pageSize: { description: "Rows.", oneOf: [{ type: "number" }] } });

describe("diffCatalogs", () =>
{
    test("an identical catalog has no changes", () => { expect(diffCatalogs(BASE, BASE)).toEqual({ breaking: [], additive: [] }); });
    test("a removed component is breaking", () =>
    {
        const next = { ...BASE, components: { Text: BASE.components.Text } };
        expect(diffCatalogs(BASE, next).breaking).toEqual(["component Widget removed"]);
    });
    test("an added component is additive", () =>
    {
        const next = cat({ pageSize: { description: "Rows.", oneOf: [{ type: "number" }] } }, ["component"], { New: { type: "object" } });
        expect(diffCatalogs(BASE, next).additive).toEqual(["component New added"]);
    });
    test("a removed prop is breaking", () => { expect(diffCatalogs(BASE, cat({})).breaking).toEqual(["Widget.pageSize removed"]); });
    test("a retyped prop is breaking", () =>
    {
        expect(diffCatalogs(BASE, cat({ pageSize: { description: "Rows.", oneOf: [{ type: "string" }] } })).breaking)
            .toEqual(["Widget.pageSize changed"]);
    });
    test("a description-only change is not breaking", () =>
    {
        expect(diffCatalogs(BASE, cat({ pageSize: { description: "Rows per page.", oneOf: [{ type: "number" }] } })).breaking)
            .toEqual([]);
    });
    test("a newly required prop is breaking", () =>
    {
        const next = cat({ pageSize: { description: "Rows.", oneOf: [{ type: "number" }] } }, ["component", "pageSize"]);
        expect(diffCatalogs(BASE, next).breaking).toEqual(["Widget.pageSize became required"]);
    });
    test("an added optional prop is additive", () =>
    {
        const next = cat({ pageSize: { description: "Rows.", oneOf: [{ type: "number" }] }, height: { oneOf: [] } });
        expect(diffCatalogs(BASE, next).additive).toEqual(["Widget.height added"]);
    });
    test("a changed component def is breaking", () =>
    {
        const prev = { ...BASE, $defs: { ...BASE.$defs, Widget__Col: { type: "object" } } };
        const next = { ...BASE, $defs: { ...BASE.$defs, Widget__Col: { type: "array" } } };
        expect(diffCatalogs(prev, next).breaking).toEqual(["$defs.Widget__Col changed"]);
    });
});

describe("versionProblem", () =>
{
    const breaking = { breaking: ["Widget.pageSize removed"], additive: [] };

    test("breaking without a bump is a problem", () => { expect(versionProblem(breaking, 1, 1)).toMatch(/CATALOG_MAJOR/); });
    test("breaking with a bump is fine", () => { expect(versionProblem(breaking, 1, 2)).toBeNull(); });
    test("additive without a bump is fine", () => { expect(versionProblem({ breaking: [], additive: ["x"] }, 1, 1)).toBeNull(); });
    test("skipping a major is a problem", () => { expect(versionProblem(breaking, 1, 3)).toMatch(/one step/); });
    test("going back is a problem", () => { expect(versionProblem(breaking, 2, 1)).toMatch(/one step/); });
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npx vitest run scripts/agentui/catalog-diff.test.ts`
Expected: FAIL, because the module is missing.

- [ ] **Step 3: Implement `scripts/agentui/catalog-diff.mjs`.** Header (`⚓ COMPONENT: AgentUiCatalogDiff`; purpose: classify catalog changes as breaking or additive so hosts we cannot see are never broken without a version bump, spec §5.3), then:

```js
/** Derived unions, rebuilt from components every time. */
const DERIVED_DEFS = new Set(["anyComponent", "anyFunction"]);

/**
 * Compares two catalog files.
 *
 * @param previous - The committed baseline.
 * @param next     - The freshly generated catalog.
 * @returns Human-readable breaking and additive changes.
 */
// @entrypoint
export function diffCatalogs(previous, next)
{
    const out = { breaking: [], additive: [] };

    diffMap(previous.components, next.components, "component", out, (n) =>
        diffComponent(n, previous.components[n], next.components[n], out));
    diffMap(previous.functions ?? {}, next.functions ?? {}, "function", out, (n) =>
        sameish(previous.functions[n], next.functions[n]) || out.breaking.push(`function ${n} changed`));
    diffDefs(previous.$defs ?? {}, next.$defs ?? {}, out);

    return out;
}

/** Removed keys are breaking, added keys additive, shared keys compared by `onShared`. */
function diffMap(prev, next, label, out, onShared)
{
    for (const n of Object.keys(prev).filter((k) => !(k in next))) { out.breaking.push(`${label} ${n} removed`); }
    for (const n of Object.keys(next).filter((k) => !(k in prev))) { out.additive.push(`${label} ${n} added`); }
    for (const n of Object.keys(prev).filter((k) => k in next)) { onShared(n); }
}

/** Compares one component: props, then required. Re-exports compare whole. */
function diffComponent(name, prev, next, out)
{
    const p = ownBlock(prev);
    const n = ownBlock(next);

    if (!p || !n)
    {
        if (!sameish(prev, next)) { out.breaking.push(`${name} changed`); }
        return;
    }

    diffMap(p.properties ?? {}, n.properties ?? {}, "", out, (prop) =>
        sameish(p.properties[prop], n.properties[prop]) || out.breaking.push(`${name}.${prop} changed`));
    relabel(out, name);

    for (const r of (n.required ?? []).filter((k) => !(p.required ?? []).includes(k)))
    {
        out.breaking.push(`${name}.${r} became required`);
    }
}

/** diffMap labels props "" — turn " x removed" into "<Component>.x removed". */
function relabel(out, name)
{
    for (const list of [out.breaking, out.additive])
    {
        for (let i = 0; i < list.length; i += 1)
        {
            if (list[i].startsWith(" ")) { list[i] = `${name}.${list[i].slice(1)}`; }
        }
    }
}

/** Our own entries carry their properties in allOf[2]; re-exports have none. */
function ownBlock(entry)
{
    return entry?.allOf?.[2]?.properties ? entry.allOf[2] : null;
}

/** Component defs: removed or changed is breaking, added additive. */
function diffDefs(prev, next, out)
{
    const keep = (m) => Object.fromEntries(Object.entries(m).filter(([k]) => !DERIVED_DEFS.has(k)));

    diffMap(keep(prev), keep(next), "$defs", out, (k) =>
        sameish(prev[k], next[k]) || out.breaking.push(`$defs.${k} changed`));
    fixDefLabels(out);
}

/** "$defs X removed" → "$defs.X removed", for consistent messages. */
function fixDefLabels(out)
{
    for (const list of [out.breaking, out.additive])
    {
        for (let i = 0; i < list.length; i += 1) { list[i] = list[i].replace(/^\$defs /, "$defs."); }
    }
}

/** Equal once descriptions are ignored (a description is not a contract). */
function sameish(a, b)
{
    return canonical(a) === canonical(b);
}

function canonical(node, parentKey = "")
{
    if (Array.isArray(node)) { return `[${node.map((n) => canonical(n)).join(",")}]`; }

    if (node === null || typeof node !== "object") { return JSON.stringify(node); }

    const keys = Object.keys(node).filter((k) => parentKey === "properties" || k !== "description").sort();

    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonical(node[k], k)}`).join(",")}}`;
}

/**
 * The version rule (spec §5.3).
 *
 * @param diff          - Result of diffCatalogs.
 * @param previousMajor - Highest committed baseline major.
 * @param nextMajor     - CATALOG_MAJOR.
 * @returns A literate problem, or null.
 */
export function versionProblem(diff, previousMajor, nextMajor)
{
    if (nextMajor !== previousMajor && nextMajor !== previousMajor + 1)
    {
        return `CATALOG_MAJOR is ${nextMajor} but the highest published catalog is v${previousMajor}. `
            + "A major moves one step at a time, and only forward.";
    }

    if (diff.breaking.length > 0 && nextMajor === previousMajor)
    {
        return `The catalog changed in ways that break hosts that hard-coded v${previousMajor}:\n  `
            + `${diff.breaking.join("\n  ")}\nIncrement CATALOG_MAJOR in scripts/agentui/catalog.mjs `
            + `(v${previousMajor} stays published), or undo the change.`;
    }

    return null;
}
```

- [ ] **Step 4: Run the tests, confirm they pass, and refactor.** Run: `npx vitest run scripts/agentui/catalog-diff.test.ts`. Expected: PASS. Then refactor: replace the `relabel`/`fixDefLabels` post-passes by giving `diffMap` a `format(name)` parameter, so labels are built correctly the first time. Rerun and expect PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/agentui/catalog-diff.mjs scripts/agentui/catalog-diff.test.ts
git commit -m "feat(agentui): diff catalogs and enforce the major-version rule" -m "Removing, renaming, retyping or newly requiring anything breaks hosts that hard-coded the catalog ID, so it needs CATALOG_MAJOR + 1. Description edits do not. Spec §5.3, #17."
```

---

### Task 7: The MCP renderer metadata

**Files:**
- Create: `scripts/agentui/mcp-descriptors.mjs`
- Test: `scripts/agentui/mcp-descriptors.test.ts`
- Modify: `specs/agentui-schema.prd.md` §6 (drop `prefersBorder`, which #19 owns)

**Interfaces:**
- Produces: `FONT_ORIGINS`, `rendererMeta() → { csp: { resourceDomains: string[] } }`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, test } from "vitest";

import { rendererMeta } from "./mcp-descriptors.mjs";

describe("rendererMeta", () =>
{
    test("names the host-neutral origin first", () =>
    {
        expect(rendererMeta().csp.resourceDomains[0]).toBe("https://static.outcrop.us");
    });
    test("names both Google Fonts origins", () =>
    {
        expect(rendererMeta().csp.resourceDomains.slice(1)).toEqual(["https://fonts.googleapis.com", "https://fonts.gstatic.com"]);
    });
    test("declares no network access", () => { expect("connectDomains" in rendererMeta().csp).toBe(false); });
    test("carries origins, never paths", () =>
    {
        expect(rendererMeta().csp.resourceDomains.every((d: string) => new URL(d).pathname === "/")).toBe(true);
    });
});
```

- [ ] **Step 2: Run them and confirm they fail.** Run: `npx vitest run scripts/agentui/mcp-descriptors.test.ts`. Expected: FAIL.

- [ ] **Step 3: Implement.** Header (`⚓ COMPONENT: AgentUiMcpDescriptors`; spec §6), then:

```js
import { CATALOG_ORIGIN } from "./catalog.mjs";

/** Google Fonts serves CSS from one origin and font files from another. */
export const FONT_ORIGINS = Object.freeze(["https://fonts.googleapis.com", "https://fonts.gstatic.com"]);

/**
 * `_meta.ui` for the MCP renderer resource. CSP names ORIGINS; the pinned
 * path belongs in the view's own tags (#19). No connectDomains: a component
 * that fetches routes the call through tools/call (spec §6).
 *
 * @returns The `_meta.ui` object.
 */
export function rendererMeta()
{
    return { csp: { resourceDomains: [CATALOG_ORIGIN, ...FONT_ORIGINS] } };
}
```

- [ ] **Step 4: Amend the spec.** In `specs/agentui-schema.prd.md` §6's table, change the contents cell to `` `_meta.ui` for the renderer resource: `csp.resourceDomains` = … `` with **no** `prefersBorder`, and add an amendment-log row: `| 2026-10-2x | prefersBorder left to #19 | it describes the view's presentation, which #17 does not build |`.

- [ ] **Step 5: Run the tests, confirm they pass, and commit**

Run: `npx vitest run scripts/agentui/mcp-descriptors.test.ts`. Expected: PASS.

```bash
git add scripts/agentui/mcp-descriptors.mjs scripts/agentui/mcp-descriptors.test.ts specs/agentui-schema.prd.md
git commit -m "feat(agentui): emit the MCP renderer CSP metadata" -m "Origins only: static.outcrop.us and Google Fonts. No connect domains. Spec §6, #17."
```

---

### Task 8: The orchestrator and the measured classification list

**Files:**
- Create: `scripts/agentui/migration.mjs`
- Create: `scripts/agentui/generate.mjs`
- Test: `scripts/agentui/generate.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 2–7.
- Produces:
  - `PENDING_CLASSIFICATION: Set<string>` and `BELOW_REQUIRED: Set<string>` (from `migration.mjs`)
  - `runPipeline(input) → { errors, excluded, outputs: Map<string, unknown>, catalog, counts }`, where `input = { manifests, componentFile(name), tsconfigPath, cacheDir, pending, belowRequired, basic, baselines: Map<number, catalog>, major, writeBaseline }`
  - `writeOutputs(outputs, distDir)`
  - `measureClassification(repoRoot) → { unclassifiedOptions, protocolPropsMissingJsdoc }`
  - CLI: `node scripts/agentui/generate.mjs [--measure] [--write-baseline]`

- [ ] **Step 1: Create `scripts/agentui/migration.mjs` with empty sets.** They are filled by measurement in Step 7 and Task 9:

```js
/*
 * SPDX header
 *
 * ⚓ COMPONENT: AgentUiMigration
 * 📜 PURPOSE: The two shrink-only migration lists of the agent-protocol gate
 *    (spec §3.4, §7.2). Read by generate.mjs, runtime/fleet-conformance.test.ts
 *    and scripts/audit-counts.mjs, so there is exactly one copy.
 *
 * THESE LISTS MAY ONLY SHRINK. A component written after the gate landed is
 * held to the strict rule from its first commit; never add a name here to make
 * a new component pass. Removing a name is the reward for fixing it, and the
 * gate fails if a listed component no longer needs to be listed.
 */

/** Components with at least one §3.3 violation, excluded from the catalog loudly. */
export const PENDING_CLASSIFICATION = new Set([]);

/** Components whose declared conformance is below the computed required level (§7). */
export const BELOW_REQUIRED = new Set([]);
```

- [ ] **Step 2: Write the failing tests.** `scripts/agentui/generate.test.ts`:

```ts
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";

import basic from "./vendor/a2ui-v0_9_1/catalogs/basic/catalog.json";
import { runPipeline, writeOutputs } from "./generate.mjs";

const FIXTURES = path.join(__dirname, "fixtures");
const CACHE = path.join(__dirname, "..", "..", "node_modules", ".cache", "agentui-test-pipeline");
const REASON = "Takes a function, which JSON cannot carry.";

function widget(protocolOver: Record<string, unknown> = {})
{
    return {
        name: "widget", factory: "createWidget", factoryStyle: "container-first", label: "Widget",
        affords: [], emits: [{ name: "selection", payload: "collection", multi: true, legacyOption: "onSelect" }],
        accepts: [], actions: [], conformance: "surface", defaultOptions: { pageSize: 25 },
        protocol: {
            providers: { onSearch: { request: "search", params: "searchQuery", response: "searchResults" } },
            hostOnly: {
                "columns[].renderer": REASON, title: REASON, container: "Needs a DOM node, which JSON cannot carry.",
                slot: "A live component instance with methods.", onLookup: "Two-parameter lookup with no single-object form.",
            },
            schemas: { extra: { type: "object", additionalProperties: { type: "string" } } },
            ...protocolOver,
        },
    };
}

function run(manifests: unknown[], pending: string[] = [])
{
    return runPipeline({
        manifests, componentFile: (n: string) => path.join(FIXTURES, `${n}.ts`),
        tsconfigPath: path.join(FIXTURES, "tsconfig.json"), cacheDir: CACHE,
        pending: new Set(pending), belowRequired: new Set(), basic, baselines: new Map(), major: 1, writeBaseline: true,
    });
}

describe("runPipeline — fixture widget", () =>
{
    test("a fully declared component produces no errors", () => { expect(run([widget()]).errors).toEqual([]); }, 60_000);
    test("it emits its options schema", () => { expect(run([widget()]).outputs.has("schemas/widget.options.json")).toBe(true); }, 60_000);
    test("it appears in the catalog", () => { expect("Widget" in run([widget()]).catalog.components).toBe(true); }, 60_000);
    test("the override replaces the too-broad schema", () =>
    {
        const schema = run([widget()]).outputs.get("schemas/widget.options.json") as any;
        expect(schema.properties.extra.additionalProperties).toEqual({ type: "string" });
    }, 60_000);
    test("an undeclared hazard is an error", () =>
    {
        const m = widget({ hostOnly: { title: REASON, container: REASON, slot: REASON, onLookup: REASON } });
        expect(run([m]).errors.some((e: string) => e.includes("columns[].renderer"))).toBe(true);
    }, 60_000);
    test("a pending component with violations is excluded, not an error", () =>
    {
        const m = widget({ hostOnly: {} });
        expect(run([m], ["widget"]).errors).toEqual([]);
    }, 60_000);
    test("an excluded component is reported", () =>
    {
        expect(run([widget({ hostOnly: {} })], ["widget"]).excluded[0].name).toBe("widget");
    }, 60_000);
    test("a pending component with no violations is a stale-list error", () =>
    {
        expect(run([widget()], ["widget"]).errors[0]).toMatch(/PENDING_CLASSIFICATION/);
    }, 60_000);
});

describe("writeOutputs", () =>
{
    test("a failure before writing leaves dist byte-identical", () =>
    {
        const dist = fs.mkdtempSync(path.join(os.tmpdir(), "agentui-dist-"));
        fs.mkdirSync(path.join(dist, "mcp"));
        fs.writeFileSync(path.join(dist, "mcp", "renderer.meta.json"), "OLD");

        expect(() => writeOutputs(new Map<string, unknown>([["mcp/renderer.meta.json", { n: 1n }]]), dist)).toThrow();
        expect(fs.readFileSync(path.join(dist, "mcp", "renderer.meta.json"), "utf8")).toBe("OLD");
    });
});
```

- [ ] **Step 3: Run the tests and confirm they fail.** Run: `npx vitest run scripts/agentui/generate.test.ts`. Expected: FAIL, because the module is missing.

- [ ] **Step 4: Implement `scripts/agentui/generate.mjs`.** Header (`#!/usr/bin/env node`, SPDX, `⚓ COMPONENT: AgentUiGenerator`; purpose: classify → resolve → emit → check → catalog → diff, then write atomically; collect every problem, then fail once, spec §8; flow `[dist/capability-manifest.json] -> [runPipeline] -> [dist/schemas, dist/a2ui, dist/mcp, dist/agentui-report.json]`), then:

```js
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { CATALOG_MAJOR, buildCatalog, catalogId } from "./catalog.mjs";
import { diffCatalogs, versionProblem } from "./catalog-diff.mjs";
import { defaultOptionsErrors, missingDataMembers, missingDescriptions } from "./checks.mjs";
import { classifyMembers, createClassifier, factoryOptionsType, optionsParameterIndex } from "./classify.mjs";
import { rendererMeta } from "./mcp-descriptors.mjs";
import { BELOW_REQUIRED, PENDING_CLASSIFICATION } from "./migration.mjs";
import { normaliseTypiaUnit } from "./normalise.mjs";
import { VIOLATION, resolveSurface } from "./resolve.mjs";
import { emitSchemas } from "./schema.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PUBLISHED = path.join(REPO, "specs", "agentui", "published");
const OUTPUT_ROOTS = ["schemas", "a2ui", "mcp", "agentui-report.json"];
const UNCLASSIFIED_CODES = new Set([VIOLATION.UNCLASSIFIED, VIOLATION.UNDECLARED_MIXED,
    VIOLATION.UNDECLARED_HAZARD, VIOLATION.TOO_BROAD]);

/**
 * The whole generator, without touching dist (spec §§3–6, §8).
 *
 * @param input - See the Task 8 interface block.
 * @returns { errors, excluded, outputs, catalog, counts }.
 */
// @entrypoint
export function runPipeline(input)
{
    const errors = [];
    const classified = classifyFleet(input, errors);
    const { included, excluded } = partition(classified, input, errors);
    const schemas = emitAndCheck(included, input, errors);
    const ready = included.filter((c) => schemas.has(c.manifest.name));
    const { catalog, violations } = buildCatalog({ basic: input.basic,
        components: ready.map((c) => ({ ...c, schema: schemas.get(c.manifest.name) })), major: input.major });

    errors.push(...violations.map((v) => v.message));
    checkBaseline(catalog, input, errors);

    return { errors, excluded, catalog, outputs: outputsFor(ready, schemas, catalog, excluded, input),
        counts: countsFor(classified, ready, excluded) };
}

/** Classifies and resolves every manifest; a thrown literate error is collected. */
function classifyFleet(input, errors)
{
    const ctx = createClassifier(input.tsconfigPath, input.cacheDir);

    return input.manifests.flatMap((manifest) =>
    {
        try
        {
            const file = input.componentFile(manifest.name);
            const { type, location } = factoryOptionsType(ctx, file, manifest.factory, optionsParameterIndex(manifest));
            const members = classifyMembers(ctx, type, location);

            return [{ manifest, members, file, surface: resolveSurface(manifest, members) }];
        }
        catch (err)
        {
            errors.push(`${manifest.name}: ${err.message}`);
            return [];
        }
    });
}

/** Splits into included / excluded per PENDING_CLASSIFICATION, and polices the list. */
function partition(classified, input, errors)
{
    const included = [];
    const excluded = [];

    for (const c of classified)
    {
        const violations = blockingViolations(c, input);
        const pending = input.pending.has(c.manifest.name);

        if (pending && violations.length === 0)
        {
            errors.push(`${c.manifest.name} is in PENDING_CLASSIFICATION but has no violations. Remove it from `
                + "scripts/agentui/migration.mjs; it now ships in the catalog.");
        }

        if (violations.length === 0) { included.push(c); continue; }

        if (pending) { excluded.push({ name: c.manifest.name, violations: violations.map((v) => v.message) }); continue; }

        errors.push(...violations.map((v) => v.message));
    }

    return { included, excluded };
}

/** A component's violations, minus value-below-field while it is on BELOW_REQUIRED. */
function blockingViolations(c, input)
{
    return c.surface.violations.filter((v) =>
        !(v.code === VIOLATION.VALUE_BELOW_FIELD && input.belowRequired.has(c.manifest.name)));
}

/** typia entries for the included components; normalised, overridden, post-checked. */
function emitAndCheck(included, input, errors)
{
    const entries = included.map((c) => ({
        id: c.manifest.name, alias: `AgentUi_${c.manifest.name}`, file: c.file, factory: c.manifest.factory,
        paramIndex: optionsParameterIndex(c.manifest), pick: c.surface.dataProps.map((d) => d.name),
        providers: c.surface.providers,
    }));
    const results = emitSchemas(entries, { tsconfigPath: input.tsconfigPath, cacheDir: input.cacheDir });
    const out = new Map();

    for (const c of included)
    {
        const schema = schemaFor(c, results.get(c.manifest.name), errors);
        if (schema) { out.set(c.manifest.name, schema); }
    }

    return out;
}

/** One component's schema, or null with its problems recorded. */
function schemaFor(c, result, errors)
{
    const name = c.manifest.name;

    if (result.error) { errors.push(`${name}: typia could not describe the options: ${result.error}`); return null; }

    const schema = applyOverrides(normaliseTypiaUnit(result.unit), c.manifest.protocol?.schemas ?? {});
    const problems = [
        ...missingDataMembers(schema, c.surface.dataProps.map((d) => d.name)).map((m) =>
            `${name}.${m}: the schema tool dropped this data member without saying so. Report it on #17.`),
        ...missingDescriptions(schema, c.surface.dataProps).map((m) =>
            `${name}.${m}: has JSDoc but the schema lost it; typia ignores a comment on the member's own line. `
            + "Move the /** … */ onto the line above."),
        ...defaultOptionsErrors(schema, c.manifest.defaultOptions ?? {}).map((e) =>
            `${name}: defaultOptions ${e} against the generated schema. One of them is wrong; fix the manifest or the options type.`),
    ];

    errors.push(...problems);
    return problems.length === 0 ? schema : null;
}

/** Replaces generated property schemas with protocol.schemas entries. */
function applyOverrides(schema, overrides)
{
    const properties = { ...schema.properties };

    for (const [name, override] of Object.entries(overrides))
    {
        properties[name] = { ...override, description: schema.properties[name]?.description };
    }

    return { ...schema, properties };
}

/** Breaking changes need a bump; any change needs the baseline committed. */
function checkBaseline(catalog, input, errors)
{
    const majors = [...input.baselines.keys()];

    if (majors.length === 0)
    {
        if (!input.writeBaseline) { errors.push("No published catalog baseline exists in specs/agentui/published/. Run `npm run build:agentui -- --write-baseline` and commit it."); }
        return;
    }

    const previousMajor = Math.max(...majors);
    const diff = diffCatalogs(input.baselines.get(previousMajor), catalog);
    const problem = versionProblem(diff, previousMajor, input.major);

    if (problem) { errors.push(problem); return; }

    if (input.major > previousMajor && !input.writeBaseline)
    {
        errors.push(`CATALOG_MAJOR is now ${input.major}. Commit its baseline with `
            + "`npm run build:agentui -- --write-baseline` in the same change; v" + previousMajor + " stays published.");
        return;
    }

    if (input.major === previousMajor && !input.writeBaseline
        && JSON.stringify(input.baselines.get(previousMajor)) !== JSON.stringify(catalog))
    {
        errors.push(`The catalog changed (${[...diff.additive, "descriptions"].join(", ")}). Run `
            + "`npm run build:agentui -- --write-baseline` and commit specs/agentui/published/catalog-v"
            + `${input.major}.json in the same change.`);
    }
}

/** Every file to write, keyed by path relative to dist/. */
function outputsFor(ready, schemas, catalog, excluded, input)
{
    const outputs = new Map(ready.map((c) => [`schemas/${c.manifest.name}.options.json`, schemas.get(c.manifest.name)]));

    outputs.set(`a2ui/catalog/v${input.major}.json`, catalog);

    for (const [major, older] of input.baselines)
    {
        if (major < input.major) { outputs.set(`a2ui/catalog/v${major}.json`, older); }
    }

    outputs.set("mcp/renderer.meta.json", rendererMeta());
    outputs.set("agentui-report.json", { catalogId: catalogId(input.major), excluded,
        hostOnly: Object.fromEntries(ready.map((c) => [c.manifest.name, c.surface.hostOnly])) });

    return outputs;
}

function countsFor(classified, ready, excluded)
{
    const all = classified.flatMap((c) => c.surface.violations);

    return {
        components: ready.length,
        excluded: excluded.length,
        dataProps: ready.reduce((n, c) => n + c.surface.dataProps.length, 0),
        events: ready.reduce((n, c) => n + c.surface.events.length, 0),
        providers: ready.reduce((n, c) => n + c.surface.providers.length, 0),
        hostOnly: ready.reduce((n, c) => n + Object.keys(c.surface.hostOnly).length, 0),
        unclassifiedOptions: all.filter((v) => UNCLASSIFIED_CODES.has(v.code)).length,
        protocolPropsMissingJsdoc: all.filter((v) => v.code === VIOLATION.MISSING_JSDOC).length,
    };
}

/**
 * Writes outputs atomically. Everything is serialised in memory first, so a
 * failure leaves dist/ untouched (spec §8).
 *
 * @param outputs - Map of dist-relative path to JSON value.
 * @param distDir - The dist directory.
 */
export function writeOutputs(outputs, distDir)
{
    const serialised = [...outputs].map(([rel, value]) => [rel, `${JSON.stringify(value, null, 2)}\n`]);
    const staging = fs.mkdtempSync(path.join(distDir, ".agentui-staging-"));

    try
    {
        for (const [rel, text] of serialised)
        {
            fs.mkdirSync(path.dirname(path.join(staging, rel)), { recursive: true });
            fs.writeFileSync(path.join(staging, rel), text);
        }

        for (const top of OUTPUT_ROOTS.filter((t) => fs.existsSync(path.join(staging, t))))
        {
            fs.rmSync(path.join(distDir, top), { recursive: true, force: true });
            fs.renameSync(path.join(staging, top), path.join(distDir, top));
        }
    }
    finally
    {
        fs.rmSync(staging, { recursive: true, force: true });
    }
}

/** Repo-level inputs: built manifests, vendored basic catalog, committed baselines. */
function repoInputs(repoRoot, writeBaseline)
{
    const manifestPath = path.join(repoRoot, "dist", "capability-manifest.json");

    if (!fs.existsSync(manifestPath))
    {
        throw new Error(`${manifestPath} does not exist. The generator reads the built manifests; run \`npm run build\` first.`);
    }

    return {
        manifests: JSON.parse(fs.readFileSync(manifestPath, "utf8")).components,
        componentFile: (n) => path.join(repoRoot, "components", n, `${n}.ts`),
        tsconfigPath: path.join(repoRoot, "tsconfig.json"),
        cacheDir: path.join(repoRoot, "node_modules", ".cache", "agentui"),
        pending: PENDING_CLASSIFICATION, belowRequired: BELOW_REQUIRED,
        basic: JSON.parse(fs.readFileSync(path.join(repoRoot, "scripts", "agentui", "vendor", "a2ui-v0_9_1", "catalogs", "basic", "catalog.json"), "utf8")),
        baselines: loadBaselines(), major: CATALOG_MAJOR, writeBaseline,
    };
}

/** Committed baselines, keyed by major. */
function loadBaselines()
{
    if (!fs.existsSync(PUBLISHED)) { return new Map(); }

    return new Map(fs.readdirSync(PUBLISHED).flatMap((f) =>
    {
        const m = /^catalog-v(\d+)\.json$/.exec(f);
        return m ? [[Number(m[1]), JSON.parse(fs.readFileSync(path.join(PUBLISHED, f), "utf8"))]] : [];
    }));
}

/**
 * Fleet classification counts for scripts/audit-counts.mjs (check [20]).
 *
 * @param repoRoot - Repository root.
 * @returns { unclassifiedOptions, protocolPropsMissingJsdoc }.
 */
export function measureClassification(repoRoot = REPO)
{
    const input = repoInputs(repoRoot, true);
    const errors = [];
    const classified = classifyFleet(input, errors);

    if (errors.length > 0) { throw new Error(`Classification failed:\n  ${errors.join("\n  ")}`); }

    const counts = countsFor(classified, [], []);

    return { unclassifiedOptions: counts.unclassifiedOptions, protocolPropsMissingJsdoc: counts.protocolPropsMissingJsdoc };
}

/** CLI. */
function main(argv)
{
    const writeBaseline = argv.includes("--write-baseline");
    const input = repoInputs(REPO, writeBaseline);

    if (argv.includes("--measure")) { return measure(input); }

    const result = runPipeline(input);

    if (result.errors.length > 0)
    {
        console.error(result.errors.map((e) => `[agentui] ${e}`).join("\n"));
        console.error(`[agentui] ${result.errors.length} problem(s); nothing was written to dist/.`);
        process.exit(1);
    }

    if (writeBaseline)
    {
        fs.mkdirSync(PUBLISHED, { recursive: true });
        fs.writeFileSync(path.join(PUBLISHED, `catalog-v${input.major}.json`), `${JSON.stringify(result.catalog, null, 2)}\n`);
    }

    writeOutputs(result.outputs, path.join(REPO, "dist"));
    const c = result.counts;
    console.log(`[agentui] ${c.components} components in the catalog (${c.excluded} pending classification), `
        + `${c.dataProps} data props, ${c.events} events, ${c.providers} providers, ${c.hostOnly} host-only members`);
}

/**
 * --measure: print the components that have violations, for PENDING_CLASSIFICATION.
 * Applies exactly the filter partition() applies, so a component whose only
 * violation is value-below-field while it sits on BELOW_REQUIRED is not listed.
 */
function measure(input)
{
    const errors = [];
    const classified = classifyFleet(input, errors);
    const failing = classified.filter((c) => blockingViolations(c, input).length > 0).map((c) => c.manifest.name).sort();

    console.log(JSON.stringify({ date: new Date().toISOString().slice(0, 10), errors, counts: countsFor(classified, [], []), failing }, null, 4));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1])
{
    main(process.argv.slice(2));
}
```

Keep every function at or under 30 lines (CODING_STYLE.md); `runPipeline` delegates each stage for that reason.

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `npx vitest run scripts/agentui/generate.test.ts`
Expected: PASS. A failure in "a fully declared component produces no errors" prints `errors`; fix the cause, which is usually a fixture declaration the resolver rejects.

- [ ] **Step 6: Run the full agentui suite**

Run: `npx vitest run scripts/agentui`
Expected: PASS.

- [ ] **Step 7: Measure the fleet and fill `PENDING_CLASSIFICATION`**

Run: `npm run build && node scripts/agentui/generate.mjs --measure > node_modules/.cache/agentui/measure.json; node -e 'const m=require("./node_modules/.cache/agentui/measure.json"); console.log(m.date, m.counts, m.failing.length, m.errors)'`

Expected: `errors` is `[]`. A non-empty `errors` means a factory could not be read. Fix those before going on: they are wrong `factory`/`factoryStyle` declarations, and the fix is in the manifest.

Paste `failing` into `PENDING_CLASSIFICATION` in `migration.mjs`, one name per line, under a comment `// Measured <date> by \`node scripts/agentui/generate.mjs --measure\`: <N> of 101.` Then record the counts on #17:

```bash
GH_TOKEN="$(gh auth token --user priyavijaikalyan2007)" gh issue comment 17 -R priyavijaikalyan2007/b2btheme --body "Measured $(date +%F): <counts JSON>. PENDING_CLASSIFICATION = <N> of 101."
```

- [ ] **Step 8: Commit**

```bash
git add scripts/agentui/generate.mjs scripts/agentui/generate.test.ts scripts/agentui/migration.mjs
git commit -m "feat(agentui): orchestrate the generator and measure the fleet" -m "Collects every problem, then fails once, and writes nothing on failure. Components with violations at the measured date go on PENDING_CLASSIFICATION (shrink-only) and are excluded from the catalog loudly. Not yet wired into the build (Task 12, D9). #17."
```

---

### Task 9: The computed required level in the conformance suite

**Files:**
- Modify: `runtime/src/conformance.ts` (`CONFORMANCE_CHECKS`; `runMounted`; new `requiredLevel`, `LEVEL_ORDER`, `checkRequiredLevel`)
- Modify: `runtime/fleet-conformance.test.ts` (import `BELOW_REQUIRED`; filter; hygiene tests)
- Modify: `scripts/agentui/migration.mjs` (`BELOW_REQUIRED`, measured; `PENDING_CLASSIFICATION`, reconciled)
- Modify: `docs/SURFACE_CONTRACT.md` §1, `AGENTS.md` (Surface Contract section), `agentknowledge/decisions.yaml` (ADR-219). The gate goes live in this commit, so the rule lands with it (D9).
- Test: `runtime/src/conformance.test.ts`

**Interfaces:**
- Produces:
  - `LEVEL_ORDER: Record<ConformanceLevel, number>`
  - `requiredLevel(manifest, handle) → ConformanceLevel`
  - conformance check id `"level-meets-required"`

- [ ] **Step 1: Write the failing tests.** Append to `runtime/src/conformance.test.ts`:

```ts
// ============================================================================
// REQUIRED LEVEL (ADR-219)
// ============================================================================

import { requiredLevel } from "./conformance";

function fieldFactory()
{
    return function create(hostId: string)
    {
        const el = document.createElement("div");
        el.textContent = "field";
        document.getElementById(hostId)?.appendChild(el);
        let value: unknown = null;
        return {
            getValue: () => value,
            setValue: (v: unknown) => { value = v; },
            destroy: () => { el.remove(); },
        };
    };
}

describe("requiredLevel", () =>
{
    test("emits require surface", () =>
    {
        expect(requiredLevel(manifest({ conformance: "display" }), {})).toBe("surface");
    });
    test("providers require surface", () =>
    {
        const m = manifest({ emits: [], accepts: [],
            protocol: { providers: { onSearch: { request: "search", params: "q", response: "r" } } } });
        expect(requiredLevel(m, {})).toBe("surface");
    });
    test("getValue and setValue require field", () =>
    {
        expect(requiredLevel(manifest({ emits: [], accepts: [] }), { getValue() {}, setValue() {} })).toBe("field");
    });
    test("nothing requires display", () =>
    {
        expect(requiredLevel(manifest({ emits: [], accepts: [] }), {})).toBe("display");
    });
});

describe("conformance — level-meets-required", () =>
{
    test("a field-shaped handle declared display fails", () =>
    {
        const findings = check(fieldFactory(), { conformance: "display", emits: [], accepts: [], stateKeys: [] });
        expect(failedChecks(findings)).toContain("level-meets-required");
    });
    test("a conforming surface component does not fail it", () =>
    {
        expect(failedChecks(check())).not.toContain("level-meets-required");
    });
});
```

Move the `import { requiredLevel }` line up into the file's existing import from `./conformance`, because ESM imports must be top-level. It is shown here only for clarity.

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npx vitest run runtime/src/conformance.test.ts -t "required"`
Expected: FAIL, because `requiredLevel` is not exported.

- [ ] **Step 3: Implement it.** In `runtime/src/conformance.ts`:

1. Add to `CONFORMANCE_CHECKS`, after `destroy-idempotent`:

```ts
    { id: "level-meets-required", minLevel: "display", description: "Declared level is at least what the handle and manifest require (ADR-219)." },
```

2. Add after the check registry:

```ts
/** Ordering of conformance levels, lowest first. */
export const LEVEL_ORDER: Readonly<Record<ConformanceLevel, number>> = { display: 0, field: 1, surface: 2 };

/**
 * The level the evidence requires (spec §7.1). Declarations the canvas wires
 * (emits, accepts, providers) require surface; a value-shaped handle requires
 * field. The generator separately requires field for a `value` data prop.
 *
 * @param manifest - The capability manifest.
 * @param handle   - The mounted handle.
 * @returns The required level.
 */
export function requiredLevel(
    manifest: CapabilityManifest,
    handle: Record<string, unknown>): ConformanceLevel
{
    const providers = Object.keys(manifest.protocol?.providers ?? {}).length;

    if (manifest.emits.length > 0 || manifest.accepts.length > 0 || providers > 0)
    {
        return "surface";
    }

    if (typeof handle.getValue === "function" && typeof handle.setValue === "function")
    {
        return "field";
    }

    return "display";
}

/**
 * Fails when the declared level is below the required one. Under-declaring is
 * a defect since ADR-219: an agent cannot read a value from a `display`.
 *
 * @param target - The component under test.
 * @param handle - The mounted handle.
 * @param out    - Findings accumulator.
 */
function checkRequiredLevel(
    target: ConformanceTarget,
    handle: Record<string, unknown>,
    out: ConformanceFailure[]): void
{
    const declared = target.manifest.conformance;
    const required = requiredLevel(target.manifest, handle);

    if (LEVEL_ORDER[declared] < LEVEL_ORDER[required])
    {
        fail(out, "level-meets-required",
            `Declared "${declared}" but the evidence requires "${required}". Raise conformance in `
            + `components/${target.manifest.name}/${target.manifest.name}.manifest.ts and make the handle `
            + `pass the ${required} checks (SURFACE_CONTRACT.md, ADR-219).`);
    }
}
```

3. In `runMounted`, call `checkRequiredLevel(target, handle, out);` right after `checkMethods(target, handle, out);`.

- [ ] **Step 4: Run the unit tests and confirm they pass**

Run: `npx vitest run runtime/src/conformance.test.ts && npm run typecheck:runtime`
Expected: PASS.

- [ ] **Step 5: Apply `BELOW_REQUIRED` in the fleet gate.** In `runtime/fleet-conformance.test.ts`:

1. Add the import beside the others:

```ts
import { BELOW_REQUIRED } from "../scripts/agentui/migration.mjs";
```

2. In the main loop, replace `const blocking = blockingFailures(findings);` with:

```ts
            const blocking = blockingFailures(findings).filter((f) =>
                !(BELOW_REQUIRED.has(name) && f.check === "level-meets-required"));
```

3. Add a new describe block after "manifest coverage":

```ts
describe("fleet gate — BELOW_REQUIRED hygiene (ADR-219)", () =>
{
    test("every listed component exists", () =>
    {
        const unknown = [...BELOW_REQUIRED].filter((n) => !COMPONENT_DIRS.includes(n));
        expect(unknown, `BELOW_REQUIRED names no such component: ${unknown.join(", ")}`).toEqual([]);
    });

    test.runIf(BELOW_REQUIRED.size > 0).each([...BELOW_REQUIRED])(
        "%s still needs to be on BELOW_REQUIRED",
        async (name: string) =>
        {
            const manifest = await loadManifest(name);
            const target = await buildTarget(name, manifest!);
            const findings = runConformance(target!);

            expect(findings.some((f) => f.check === "level-meets-required"),
                `${name} now meets its required level. Remove it from BELOW_REQUIRED in `
                + "scripts/agentui/migration.mjs; the list may only shrink.").toBe(true);
        });
});
```

- [ ] **Step 6: Measure and fill `BELOW_REQUIRED`**

```bash
npx vitest run runtime/fleet-conformance.test.ts --reporter=json --outputFile=node_modules/.cache/agentui/gate.json || true
node -e 'const r=require("./node_modules/.cache/agentui/gate.json"); const n=[]; for (const f of r.testResults) for (const a of f.assertionResults) if (a.status==="failed" && a.failureMessages.join(" ").includes("level-meets-required")) n.push(a.title.replace(" conforms to its declared level","")); console.log(JSON.stringify(n.sort(),null,4))'
```

Expected: a JSON array of names. Paste it into `BELOW_REQUIRED` under `// Measured <date>: <N> of 101 declared below their required level.`

Then confirm the gate is green: `npx vitest run runtime/fleet-conformance.test.ts`. Expected: PASS, with any failures other than `level-meets-required` unchanged from before this task. If an unrelated test was failing before, it is still failing; say so in the commit message, don't hide it.

- [ ] **Step 7: Reconcile `PENDING_CLASSIFICATION` with the new `BELOW_REQUIRED`**

Run: `node scripts/agentui/generate.mjs --measure > node_modules/.cache/agentui/measure.json; node -e 'console.log(require("./node_modules/.cache/agentui/measure.json").failing.length)'`

Remove from `PENDING_CLASSIFICATION` every name that is no longer in `failing`. A component whose only violation was `value-below-field` is now covered by `BELOW_REQUIRED` instead. Never add a name here.

- [ ] **Step 8: Land the rule with the gate (D9).** This commit makes `npm test` enforce the required level, so the documents that state the rule go in the same commit:
  - **`docs/SURFACE_CONTRACT.md` §1:** replace the sentence beginning "Pick the lowest level that is honest." through "easily corrected later." with: `Pick the level the evidence requires. Since ADR-219 the suite computes a required level — emits, accepts or providers require surface; a value-shaped handle requires field — and declaring less fails the gate, because an agent cannot read a value from a display component. Over-declaring still fails too. Components measured below their required level on the gate's landing date are listed in BELOW_REQUIRED (scripts/agentui/migration.mjs); the list may only shrink.`
  - **`AGENTS.md`**, in "(CRITICAL) Canvas-Capable Components — Surface Contract", directly under "The level is **verified by the conformance suite, never self-declared**.": `**And the minimum level is computed (ADR-219).** emits, accepts or a protocol provider require surface; a handle with getValue/setValue requires field. Declaring less fails the gate. BELOW_REQUIRED in scripts/agentui/migration.mjs holds the measured backlog and may only shrink — never add a new component to it.`
  - **`agentknowledge/decisions.yaml`:** append ADR-219 now, with the entry text given in Task 12 Step 7. Task 12 updates its context if anything changes. Never delete it.

- [ ] **Step 9: Commit**

```bash
git add runtime/src/conformance.ts runtime/src/conformance.test.ts runtime/fleet-conformance.test.ts scripts/agentui/migration.mjs docs/SURFACE_CONTRACT.md AGENTS.md agentknowledge/decisions.yaml
git commit -m "feat(agentui): compute the required conformance level" -m "Wiring declarations require surface, a value-shaped handle requires field. Under-declaring is now a defect (ADR-219). The measured BELOW_REQUIRED list may only shrink, and a listed component that no longer needs listing fails the gate. #17."
```

---

### Task 10: Interop evidence with the official A2UI library (scratch, nothing committed)

**Files:** none in the repo. The evidence is posted to #17.

- [ ] **Step 1: Generate a catalog without touching the repo's baseline.** Run: `npm run build && node scripts/agentui/generate.mjs --write-baseline`. Then **restore the baseline file**, because Task 12 commits it deliberately: `git checkout -- specs/agentui/published 2>/dev/null || rm -rf specs/agentui/published`.

- [ ] **Step 2: Load the catalog with `@a2ui/web_core` 0.14.0 in a scratch directory**

```bash
SCRATCH=$(mktemp -d) && cd "$SCRATCH" && npm init -y >/dev/null && npm install --silent @a2ui/web_core@0.14.0
cp "$OLDPWD/dist/a2ui/catalog/v1.json" catalog.json
cp "$OLDPWD/scripts/agentui/vendor/a2ui-v0_9_1/catalogs/basic/catalog.json" basic.json
cat > check.mjs <<'EOF'
import fs from "node:fs";
import { Catalog, linkCatalogs } from "@a2ui/web_core/v0_9";
// Cross-catalog $refs resolve only once catalogs are linked (MessageProcessor
// does this in its constructor). An unlinked Catalog.fromJson fails on our
// basic re-exports by design, which would be a false alarm.
const read = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
const [catalog] = linkCatalogs([Catalog.fromJson(read("catalog.json")), Catalog.fromJson(read("basic.json"))]);
const names = [...catalog.components.keys()];
console.log("components:", names.length, "has Text:", names.includes("Text"));
for (const n of names.filter((x) => !["Text","Row","Column"].includes(x)).slice(0, 5))
{
    const api = catalog.components.get(n);
    console.log(n, "schema ok:", typeof api.schema?.safeParse === "function");
}
EOF
node check.mjs; cd "$OLDPWD"
```

Expected: the component count equals the catalog's `components` count, `has Text: true`, and `schema ok: true` for each sampled component. Also call `api.schema.safeParse({ component: "<Name>", id: "x" })` on one sampled component of ours, to force the lazy Zod derivation. A failure **with linking in place**, such as rejected root `$defs` (relocated `<Name>__*` keys) or an unresolved cross-catalog ref, is the real signal. **Stop**: that is a spec-level problem (§5.4). Report the exact error to the user before Task 12.

- [ ] **Step 3: Record the result on #17**

```bash
GH_TOKEN="$(gh auth token --user priyavijaikalyan2007)" gh issue comment 17 -R priyavijaikalyan2007/b2btheme --body "Interop $(date +%F): our generated v1 catalog loaded with @a2ui/web_core 0.14.0 Catalog.fromJson. <paste output>."
```

---

### Task 11: Structure check `[29]` (independent of the generator)

**Files:**
- Create: `scripts/agentui/check-dist.mjs`
- Test: `scripts/agentui/check-dist.test.ts`

**Interfaces:**
- Produces: `checkDist(repoRoot) → string[]` (problems; empty means pass); CLI exit code 0 or 1.
- **Must not import any other `scripts/agentui/*.mjs` module** (the `[19]` lesson). It may import Ajv and read files.

- [ ] **Step 1: Write the failing tests.** `scripts/agentui/check-dist.test.ts` builds a minimal fake repo in a temp directory:

```ts
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";

import { checkDist } from "./check-dist.mjs";

const VENDOR = path.join(__dirname, "vendor", "a2ui-v0_9_1");
const ID = "https://static.outcrop.us/a2ui/catalog/v1.json";

function fakeRepo(mutate: (files: Record<string, unknown>) => void = () => undefined): string
{
    const basic = JSON.parse(fs.readFileSync(path.join(VENDOR, "catalogs", "basic", "catalog.json"), "utf8"));
    const catalog = {
        $schema: "https://json-schema.org/draft/2020-12/schema", $id: ID, title: "T", description: "D", catalogId: ID,
        components: { Text: { type: "object", allOf: [{ $ref: `${basic.catalogId}#/components/Text` }] },
            Widget: { type: "object", allOf: [{ type: "object", properties: { component: { const: "Widget" } } }] } },
        functions: {}, $defs: { anyComponent: { oneOf: [{ $ref: "#/components/Text" }, { $ref: "#/components/Widget" }] },
            anyFunction: { oneOf: [] }, CatalogComponentCommon: { type: "object" }, theme: { type: "object" } },
    };
    const files: Record<string, unknown> = {
        "dist/capability-manifest.json": { schemaVersion: 1, components: [{ name: "widget", factory: "createWidget" }, { name: "panel", factory: "createPanel" }] },
        "dist/a2ui/catalog/v1.json": catalog,
        "specs/agentui/published/catalog-v1.json": catalog,
        "dist/mcp/renderer.meta.json": { csp: { resourceDomains: ["https://static.outcrop.us", "https://fonts.googleapis.com", "https://fonts.gstatic.com"] } },
        "dist/agentui-report.json": { catalogId: ID, excluded: [{ name: "panel", violations: ["x"] }], hostOnly: {} },
    };
    mutate(files);
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "agentui-checkdist-"));
    for (const [rel, value] of Object.entries(files))
    {
        fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
        fs.writeFileSync(path.join(root, rel), typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`);
    }
    fs.cpSync(VENDOR, path.join(root, "scripts", "agentui", "vendor", "a2ui-v0_9_1"), { recursive: true });
    return root;
}

describe("checkDist ([29])", () =>
{
    test("a consistent dist passes", () => { expect(checkDist(fakeRepo())).toEqual([]); });
    test("a catalog differing from the committed baseline fails", () =>
    {
        expect(checkDist(fakeRepo((f) => { (f["dist/a2ui/catalog/v1.json"] as any).title = "X"; })).join()).toMatch(/baseline/);
    });
    test("a built major with no committed baseline fails", () =>
    {
        expect(checkDist(fakeRepo((f) => { f["dist/a2ui/catalog/v2.json"] = f["dist/a2ui/catalog/v1.json"]; })).join())
            .toMatch(/v2/);
    });
    test("a missing component entry fails", () =>
    {
        const root = fakeRepo((f) => { (f["dist/agentui-report.json"] as any).excluded = []; });
        expect(checkDist(root).join()).toMatch(/Panel/);
    });
    test("knobby in an emitted file fails", () =>
    {
        expect(checkDist(fakeRepo((f) => { (f["dist/mcp/renderer.meta.json"] as any).csp.resourceDomains[0] = "https://static.knobby.io"; })).join())
            .toMatch(/knobby/);
    });
    test("a layout that drifts from the basic catalog fails", () =>
    {
        const mutate = (f: Record<string, unknown>) =>
        {
            for (const k of ["dist/a2ui/catalog/v1.json", "specs/agentui/published/catalog-v1.json"]) { (f[k] as any).instructions = "x"; }
        };
        expect(checkDist(fakeRepo(mutate)).join()).toMatch(/layout/);
    });
    test("an unresolvable $ref fails", () =>
    {
        const mutate = (f: Record<string, unknown>) =>
        {
            for (const k of ["dist/a2ui/catalog/v1.json", "specs/agentui/published/catalog-v1.json"])
            {
                (f[k] as any).components.Widget.allOf.push({ $ref: "#/$defs/Nope" });
            }
        };
        expect(checkDist(fakeRepo(mutate)).join()).toMatch(/Nope|resolve/);
    });
    test("fixture vocabulary in an emitted file fails", () =>
    {
        expect(checkDist(fakeRepo((f) => { (f["dist/agentui-report.json"] as any).note = "lorem ipsum"; })).join()).toMatch(/fixture/);
    });
});
```

- [ ] **Step 2: Run them and confirm they fail.** Run: `npx vitest run scripts/agentui/check-dist.test.ts`. Expected: FAIL.

- [ ] **Step 3: Implement `scripts/agentui/check-dist.mjs`.** Header (`#!/usr/bin/env node`; `⚓ COMPONENT: AgentUiDistCheck`; purpose: structure check `[29]`, which reads only the emitted files, the vendored A2UI schemas and the committed baseline, and **imports nothing from the generator**, because a check that shares an oracle with what it checks passes by construction; ADR-219, spec §10), then:

```js
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const Ajv2020 = require("ajv/dist/2020").default;

const ORIGIN = "https://static.outcrop.us";
const EMITTED = ["dist/a2ui", "dist/schemas", "dist/mcp", "dist/agentui-report.json"];
const FIXTURE_WORDS = ["sample", "fixture", "lorem ipsum", "placeholder", "test user", "john doe", "jane doe", "example.com", "about:blank"];

/**
 * Every [29] problem in a built repository.
 *
 * @param root - Repository root.
 * @returns Problems; empty means pass.
 */
// @entrypoint
export function checkDist(root)
{
    const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
    const major = highestBaseline(root);
    const catalogRel = `dist/a2ui/catalog/v${major}.json`;

    return [
        ...baselineProblems(root, major),
        ...layoutProblems(read(catalogRel), read("scripts/agentui/vendor/a2ui-v0_9_1/catalogs/basic/catalog.json")),
        ...refProblems(root, read(catalogRel)),
        ...coverageProblems(read("dist/capability-manifest.json"), read(catalogRel), read("dist/agentui-report.json")),
        ...textProblems(root),
        ...cspProblems(read("dist/mcp/renderer.meta.json")),
    ];
}

function highestBaseline(root)
{
    const dir = path.join(root, "specs", "agentui", "published");

    if (!fs.existsSync(dir)) { throw new Error(`[29] ${dir} does not exist; the catalog has never been published.`); }

    const majors = fs.readdirSync(dir).flatMap((f) => { const m = /^catalog-v(\d+)\.json$/.exec(f); return m ? [Number(m[1])] : []; });

    if (majors.length === 0) { throw new Error(`[29] No baseline in ${dir}; the catalog has never been published.`); }

    return Math.max(...majors);
}

/**
 * Every built catalog must have a byte-identical committed twin, and the
 * highest built major must be the highest committed one. Otherwise a new
 * major could ship with no baseline and the check would compare the old one.
 */
function baselineProblems(root, major)
{
    const dir = path.join(root, "dist", "a2ui", "catalog");
    const built = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /^v\d+\.json$/.test(f)) : [];
    const problems = built.flatMap((f) =>
    {
        const twin = path.join(root, "specs", "agentui", "published", `catalog-${f}`);
        const same = fs.existsSync(twin) && fs.readFileSync(path.join(dir, f), "utf8") === fs.readFileSync(twin, "utf8");

        return same ? [] : [`dist/a2ui/catalog/${f} has no byte-identical committed baseline at specs/agentui/published/catalog-${f}. `
            + "Run `npm run build:agentui -- --write-baseline` and commit it."];
    });
    const highestBuilt = Math.max(0, ...built.map((f) => Number(f.slice(1, -5))));

    return highestBuilt === major ? problems : [...problems, `dist/ ships catalog v${highestBuilt} but the highest committed baseline is v${major}.`];
}

/** Top-level keys must equal the vendored basic catalog file's. */
function layoutProblems(catalog, basic)
{
    const want = Object.keys(basic).sort().join(",");
    const got = Object.keys(catalog).sort().join(",");

    return want === got ? [] : [`catalog layout is [${got}], but A2UI v0.9.1 catalog files are [${want}].`];
}

/** Compiles the catalog as a schema with the vendored files registered, so every $ref must resolve. */
function refProblems(root, catalog)
{
    const vendor = path.join(root, "scripts", "agentui", "vendor", "a2ui-v0_9_1");
    const ajv = new Ajv2020({ strict: false, validateFormats: false });

    ajv.addSchema(JSON.parse(fs.readFileSync(path.join(vendor, "common_types.json"), "utf8")));
    ajv.addSchema(JSON.parse(fs.readFileSync(path.join(vendor, "catalogs", "basic", "catalog.json"), "utf8")));

    try
    {
        ajv.addSchema(catalog);
        for (const name of Object.keys(catalog.components)) { ajv.getSchema(`${catalog.$id}#/components/${name}`); }
        return [];
    }
    catch (err)
    {
        return [`catalog does not compile: ${err.message}. Every $ref must resolve against the vendored A2UI files.`];
    }
}

/** Every built manifest is in the catalog or listed as excluded. */
function coverageProblems(manifests, catalog, report)
{
    const excluded = new Set(report.excluded.map((e) => e.name));

    return manifests.components
        .filter((m) => !excluded.has(m.name))
        .map((m) => ({ m, name: m.protocol?.name ?? m.factory.replace(/^create/, "") }))
        .filter(({ name }) => !(name in catalog.components))
        .map(({ m, name }) => `${m.name}: neither in the catalog (as ${name}) nor in dist/agentui-report.json's excluded list.`);
}

/** No host-specific or fixture text in anything emitted (D2, D13). */
function textProblems(root)
{
    return EMITTED.flatMap((rel) => filesUnder(path.join(root, rel))).flatMap((file) =>
    {
        const text = fs.readFileSync(file, "utf8").toLowerCase();
        const bad = [...(text.includes("knobby") ? ["knobby"] : []), ...FIXTURE_WORDS.filter((w) => text.includes(w))];

        return bad.map((w) => `${path.relative(root, file)} contains "${w}"${w === "knobby" ? "" : " (fixture vocabulary)"}.`);
    });
}

function filesUnder(p)
{
    if (!fs.existsSync(p)) { return []; }

    if (fs.statSync(p).isFile()) { return [p]; }

    return fs.readdirSync(p).flatMap((f) => filesUnder(path.join(p, f)));
}

/** The CSP names the host-neutral origin first. */
function cspProblems(meta)
{
    return meta.csp?.resourceDomains?.[0] === ORIGIN ? [] : [`dist/mcp/renderer.meta.json must name ${ORIGIN} first in csp.resourceDomains.`];
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1])
{
    const problems = checkDist(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", ".."));
    for (const p of problems) { console.log(`      ${p}`); }
    process.exit(problems.length === 0 ? 0 : 1);
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npx vitest run scripts/agentui/check-dist.test.ts`
Expected: PASS. If the "unresolvable $ref" test passes for the wrong reason (a different error), tighten its regex to the actual Ajv message ("can't resolve reference").

- [ ] **Step 5: Commit**

```bash
git add scripts/agentui/check-dist.mjs scripts/agentui/check-dist.test.ts
git commit -m "feat(agentui): add an independent dist check for structure check [29]" -m "Reads only emitted files, the vendored A2UI schemas and the committed baseline; imports nothing from the generator. Not wired into test-local.sh until Task 12 (D9). #17."
```

---

### Task 12: Wire the gate in, and land the rule with it (ONE commit, D9)

**Files:**
- Modify: `package.json` (`build:agentui`, `build`)
- Modify: `scripts/audit-counts.mjs` (three counts)
- Modify: `test-local.sh` (check `[29]`)
- Modify: `cdn/_headers` (`/a2ui/*`, `/schemas/*`, `/mcp/*`)
- Create: `specs/agentui/published/catalog-v1.json` (baseline)
- Modify: `AGENTS.md`, `docs/SURFACE_CONTRACT.md`, `docs/CAPABILITY_MANIFEST.md`, `CDN_CONTRACT.md`, `docs/CDN_INTEGRATION_GUIDE.md`, `agentknowledge/decisions.yaml`, `agentknowledge/concepts.yaml`, `agentknowledge/history.jsonl`, `CHANGELOG.md`, `CONVERSATION.md`
- Test: `scripts/audit-counts.test.ts` (no new classifier there; the counts come from the generator's tested code)

- [ ] **Step 1: Wire the build.** In `package.json`, add `"build:agentui": "node scripts/agentui/generate.mjs",` beside `build:manifest`. In `"build"`, replace `npm run build:manifest && ` with `npm run build:manifest && npm run build:agentui && `.

- [ ] **Step 2: Write the baseline and build.**

Run: `npm run build:manifest && npm run build:agentui -- --write-baseline && npm run build`
Expected:
- the `[agentui] … components in the catalog …` summary line prints twice
- `specs/agentui/published/catalog-v1.json` exists
- `ls dist/a2ui/catalog dist/schemas | head` lists files
- `cmp dist/a2ui/catalog/v1.json specs/agentui/published/catalog-v1.json` prints nothing

- [ ] **Step 3: Add the CDN headers.** In `cdn/_headers`, append three disjoint rules, matching the `/components/*` caching policy:

```
# Agent-protocol artefacts (ADR-219): the A2UI catalog is a permanent public
# identifier that third-party tools fetch cross-origin, so CORS is open.
/a2ui/*
  Cache-Control: public, max-age=300, stale-while-revalidate=86400
  Access-Control-Allow-Origin: *

/schemas/*
  Cache-Control: public, max-age=300, stale-while-revalidate=86400
  Access-Control-Allow-Origin: *

/mcp/*
  Cache-Control: public, max-age=300, stale-while-revalidate=86400
  Access-Control-Allow-Origin: *
```

- [ ] **Step 4: Add the audit counts.** In `scripts/audit-counts.mjs`:

1. Add imports at the top:

```js
import { measureClassification } from "./agentui/generate.mjs";
import { BELOW_REQUIRED } from "./agentui/migration.mjs";
```

2. In `BASELINES`, add three entries. Use the values measured in Task 8 Step 7 and Task 9 Step 6, each with a dated comment:

```js
    // ADR-219 (2026-10-2x): options the agent-protocol gate cannot classify,
    // measured by scripts/agentui/generate.mjs over every built manifest.
    // May only fall; target 0. A new component that adds one fails [20].
    unclassifiedOptions: <measured>,
    // ADR-219 (2026-10-2x): protocol-visible data props without JSDoc. Target 0.
    protocolPropsMissingJsdoc: <measured>,
    // ADR-219 (2026-10-2x): length of BELOW_REQUIRED in scripts/agentui/migration.mjs. Target 0.
    componentsBelowRequiredLevel: <BELOW_REQUIRED.size>,
```

3. In `measure()`, add the three keys, zeroed, to the `counts` initialiser. Then, after the `bundlePreambleMismatches` assignment:

```js
    const protocol = measureClassification();
    counts.unclassifiedOptions = protocol.unclassifiedOptions;
    counts.protocolPropsMissingJsdoc = protocol.protocolPropsMissingJsdoc;
    counts.componentsBelowRequiredLevel = BELOW_REQUIRED.size;
```

Run: `node scripts/audit-counts.mjs`. Expected: exit 0, with the three new counts at their baselines.

- [ ] **Step 5: Add check `[29]`.** In `test-local.sh`, between check `[28]`'s closing `echo ""` and the `# ── Summary ──` line:

```bash
# ── 29. The agent-protocol artefacts are sound (ADR-219) ──
#
# Reads ONLY what the build emitted (dist/a2ui, dist/schemas, dist/mcp,
# dist/agentui-report.json), the vendored A2UI v0.9.1 schemas, and the
# committed baseline. It imports nothing from the generator: a check that
# shares an oracle with the thing it checks passes by construction ([19]).
echo "[29] The agent-protocol catalog is sound and host-neutral (ADR-219)"
if node scripts/agentui/check-dist.mjs; then
    pass "The A2UI catalog matches its baseline, resolves, covers the fleet and names no host"
else
    fail "the agent-protocol artefacts are inconsistent (see above)"
fi
echo ""
```

- [ ] **Step 6: Write the AGENTS.md section.** Insert after the "(CRITICAL) Canvas-Capable Components — Surface Contract" section and before "(CRITICAL) No Fabricated Reads":

```markdown
## (CRITICAL) Agent-Protocol-Capable Components

Every canvas-mountable component must be usable by AI agents over **A2UI**
and **MCP Apps** (epic #16, ADR-219, `specs/agentui-schema.prd.md`). That is
enforced by the build, not by this document: `npm run build` runs
`scripts/agentui/generate.mjs`, and `npm test` runs the conformance gate,
check `[20]`'s counts and check `[29]`.

**Every option of your factory is classified, or the build fails.** The
generator reads your `<Name>Options` type with the TypeScript checker, and each
member must be exactly one of:

| Class | How it is recognised | You do |
|---|---|---|
| data | JSON-serialisable (a `Date` counts; it is sent as an ISO string) | write a JSDoc comment **on its own line above the member** — it is what the agent reads, and typia ignores a comment on the member's line |
| event | named by an `emits[].legacyOption`, or the ADR-134 `onChange` beside `value` | nothing more |
| provider | asks the host for data | declare it in `protocol.providers`; exactly one parameter |
| host-only | needs something JSON cannot carry | declare it in `protocol.hostOnly` with a reason of at least 20 characters |

A data member that has a function, element or open record **nested inside it**
(`columns[].renderer`) must declare that path in `protocol.hostOnly`. Every schema
tool tried drops such parts silently, so an undeclared one fails the build.
`unknown` and open records need `protocol.schemas`.

**The conformance level is computed, not declared** (amends SURFACE_CONTRACT.md
§1). `emits`, `accepts` or a provider require `surface`; a handle with
`getValue`/`setValue` or a `value` option requires `field`. Declaring less fails
the gate. Under-declaring used to be "the smaller problem"; an agent cannot read
a value from a `display`, so it is now a defect.

**The A2UI catalog is a permanent public identifier.** Removing, renaming,
retyping or newly requiring anything in it breaks hosts that hard-coded
`https://static.outcrop.us/a2ui/catalog/v1.json`. The gate diffs every build
against `specs/agentui/published/`, and a breaking change needs `CATALOG_MAJOR`
raised in `scripts/agentui/catalog.mjs` (the old version stays published). Any
change, additive included, needs `npm run build:agentui -- --write-baseline`
and the baseline committed in the same change.

**`PENDING_CLASSIFICATION` and `BELOW_REQUIRED`** in `scripts/agentui/migration.mjs`
are the measured backlog of 2026-10-2x. They may only shrink. **Never add a new
component to either**; a component written after the gate landed conforms from
its first commit.

### Checklist for a new component (in addition to the Surface checklist)

- [ ] `npm run build` prints no `[agentui]` problem for it, and it appears in
      `dist/a2ui/catalog/v1.json`.
- [ ] Every protocol-visible option has JSDoc on its own line.
- [ ] Every non-data option is an event, a provider, or host-only with a reason.
- [ ] Its declared `conformance` meets the computed required level.
- [ ] The catalog baseline is rewritten and committed.
```

- [ ] **Step 7: Amend the other documents.**
  - **`docs/SURFACE_CONTRACT.md` §1:** already amended in Task 9 (D9). Check it still reads correctly.
  - **`docs/CAPABILITY_MANIFEST.md`:** add a section **"9. `protocol` — agent-protocol declarations (ADR-219)"** documenting `name`, `providers` (`request`/`params`/`response`, one parameter), `hostOnly` (key syntax, prefix coverage, mixed-member meaning, the 20-character reason), `schemas` and `bindAs`, with the DataGrid-style example from the spec. Add `- [ ] Every non-data option is classified (see §9).` to §8's checklist and renumber "Related".
  - **`CDN_CONTRACT.md`:** add a section **"2c. Agent-protocol artefacts"** listing `/a2ui/catalog/v<N>.json` (a permanent ID; additive within N; older majors stay served), `/schemas/<name>.options.json`, `/mcp/renderer.meta.json` and `/agentui-report.json`, with their cache rules. State that `static.outcrop.us` is the host-neutral name for the same origin (D13).
  - **`docs/CDN_INTEGRATION_GUIDE.md`:** add a short section **"Using the components from an AI agent"** that points to the catalog ID and the MCP metadata and says #18 and #19 deliver the runtime.
  - **`agentknowledge/decisions.yaml`:** ADR-219 was appended in Task 9. Update its `context` if anything changed since; this is the entry text:

```yaml
- id: ADR-219
  title: "Agent-protocol schemas: classifier-gated typia, computed conformance level, versioned A2UI catalog"
  date: "2026-10-2x"
  status: Accepted
  context: "Epic #16 makes every component usable over A2UI and MCP Apps. The library had manifests but no machine-readable option schema. A TypeScript-checker classifier sorts every factory option into data/function/element/too-broad and rejects undeclared nested hazards; typia 12.2.1 then emits schemas for approved data members only, because a 2026-10-25 trial showed ts-json-schema-generator, typescript-json-schema and ts-to-zod all dropping or garbling parts silently. The A2UI v0.9.1 catalog (https://static.outcrop.us/a2ui/catalog/v1.json) re-exports the basic catalog, models each channel as a binding prop plus an on<Channel> action, and is diffed against a committed baseline so a breaking change needs a major bump. Under-declaring a conformance level becomes a defect (amends SURFACE_CONTRACT.md §1, ADR-141). Migration lists PENDING_CLASSIFICATION and BELOW_REQUIRED may only shrink."
  files: ["scripts/agentui/", "runtime/src/conformance.ts", "runtime/src/types.ts", "runtime/fleet-conformance.test.ts", "specs/agentui-schema.prd.md", "AGENTS.md"]
```

  - **`agentknowledge/concepts.yaml`:** append an `AgentProtocolSchema` concept (definition: the generated option schemas, A2UI catalog and MCP metadata, plus the gate that keeps every component conforming; `anchor_file: scripts/agentui/generate.mjs`; related: CapabilityManifest, SurfaceContract, NoFallbackCode).
  - **`agentknowledge/history.jsonl`:** append with a serializer, never `echo`:

```bash
python3 -c 'import json; print(json.dumps({"date":"2026-10-2x","task":"Agent UI 0 (#17): option schemas, A2UI catalog, MCP metadata, required-level gate","files":["scripts/agentui/","runtime/src/conformance.ts","AGENTS.md"],"summary":"Classifier-gated typia schemas; v1 catalog on static.outcrop.us; computed conformance level; shrink-only migration lists. ADR-219."}))' >> agentknowledge/history.jsonl
```

  - **`CHANGELOG.md`**, under today's date, **Added:** `Agent-protocol artefacts — per-component option schemas, an A2UI v0.9.1 catalog (static.outcrop.us/a2ui/catalog/v1.json) and MCP renderer metadata, generated and gated at build time. ADR-219.` **Changed:** `Conformance level is now computed; under-declaring fails the gate. ADR-219.`
  - **`CONVERSATION.md`:** append the session's requests and a summary of the outcome.

- [ ] **Step 8: Run everything**

Run: `npm run build && npm test`
Expected: PASS, including `[20]` (three new counts at their baselines), `[29]`, `[8]` (YAML and JSONL parse) and `[11]` (doc registration; no new `docs/` file was added). If `[11]` flags anything, register the doc in `scripts/generate-docs.js`.

- [ ] **Step 9: Mutation proofs.** Each must turn red, then be reverted. Record each result in the commit body.

| # | Mutation | Command | Must fail with |
|---|---|---|---|
| 1 | In `components/datepicker/datepicker.manifest.ts`, add `protocol: { hostOnly: { nothing: "a reason that is long enough" } }` | `npm run build:agentui` | `stale-declaration` naming datepicker |
| 2 | In `specs/agentui/published/catalog-v1.json`, add `"ghost": { "type": "string" }` to one catalogued component's `allOf[2].properties`. The generated catalog now lacks a prop the baseline has, which is exactly what a removal looks like | `npm run build:agentui` | `<Name>.ghost removed` and the message naming `CATALOG_MAJOR` |
| 3 | Set `conformance: "display"` in `components/datepicker/datepicker.manifest.ts` | `npx vitest run runtime/fleet-conformance.test.ts -t datepicker` | `level-meets-required` |
| 4 | Edit `dist/mcp/renderer.meta.json` to say `static.knobby.io` | `node scripts/agentui/check-dist.mjs` | `contains "knobby"` |
| 5 | Delete one non-basic entry from `dist/a2ui/catalog/v1.json` | `node scripts/agentui/check-dist.mjs` | `differs from the committed baseline` |
| 6 | Remove the JSDoc from one data prop of a catalogued (non-pending) component | `npm run build:agentui` | `missing-jsdoc` |
| 7 | Add a name to `BELOW_REQUIRED` for a component that meets its level | `npx vitest run runtime/fleet-conformance.test.ts -t "BELOW_REQUIRED"` | "now meets its required level" |

After all seven, run `git status` and confirm only the intended Task 12 files are modified. Then `npm run build && npm test` again; it must PASS.

- [ ] **Step 10: Commit everything as one change (D9)**

```bash
git add package.json scripts/audit-counts.mjs test-local.sh cdn/_headers specs/agentui/published AGENTS.md docs/SURFACE_CONTRACT.md docs/CAPABILITY_MANIFEST.md CDN_CONTRACT.md docs/CDN_INTEGRATION_GUIDE.md agentknowledge CHANGELOG.md CONVERSATION.md
git commit -m "feat(agentui): gate every component on agent-protocol readiness" -m "<summary + the seven mutation proofs, each with what failed>. The AGENTS.md rule lands in the same commit as the gate it describes (D9). ADR-219, closes the build-tooling half of #17."
```

---

### Task 13: Promote what already verifies (checkpoint with the user first)

**Files:** `components/*/*.manifest.ts`, `scripts/agentui/migration.mjs`, `scripts/audit-counts.mjs`

- [ ] **Step 1: Try each `BELOW_REQUIRED` component at its required level.** For each name, set its manifest's `conformance` to the required level (from the Task 9 measurement message), then run `npx vitest run runtime/fleet-conformance.test.ts -t "<name> conforms"`. Keep the change if it passes; revert it if it does not, and note what failed, verbatim.

- [ ] **Step 2: Remove the promoted names** from `BELOW_REQUIRED`. Lower `componentsBelowRequiredLevel` in `audit-counts.mjs` to the new size, with a dated comment. Run `npm run build && npm test` and expect PASS (the catalog baseline may need `--write-baseline` if a promoted component left `PENDING_CLASSIFICATION`).

- [ ] **Step 3: Commit** with `feat(agentui): promote <n> components that already verify at their required level`.

- [ ] **Step 4: Checkpoint.** Report to the user how many remain on each list. Spec §7.3 says each remaining component gets a sub-issue under #17, written as what was tried and what happened. **Ask before creating them**, because the count may be large. On approval, create each with the token prefix and link it as a sub-issue of #17:

```bash
GH_TOKEN="$(gh auth token --user priyavijaikalyan2007)" gh issue create -R priyavijaikalyan2007/b2btheme --label agent-ui --title "Agent UI 0: <name> to <level>" --body "<what was tried, what failed verbatim>"
```

---

## Out of this plan

- Working through `PENDING_CLASSIFICATION` component by component (declaring providers, host-only members, JSDoc). That is the migration the ratchet spreads out; track it per component as sub-issues of #17.
- The A2UI adapter, codec and `A2UI.md` (#18). The MCP Apps view, theme bridge, versioned CDN tree and `MCPUI.md` (#19).
