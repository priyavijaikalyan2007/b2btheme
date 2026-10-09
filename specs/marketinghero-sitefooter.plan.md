<!--
SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
SPDX-FileCopyrightText: 2026 Outcrop Inc
SPDX-License-Identifier: MIT
File GUID: d401ce86-b559-4b98-9e52-52b33af264db
Created: 2026-09-01
-->

<!-- AGENT: Task-by-task implementation plan for MarketingHero and SiteFooter. Execute with superpowers:subagent-driven-development. -->

<!-- ⚓ PLAN: MarketingHeroAndSiteFooter -->
<!-- 📜 PURPOSE: The bite-sized TDD tasks that build the two components the PRD designed. -->
<!-- 🔗 RELATES: [[MarketingHero]], [[SiteFooter]], specs/marketinghero-sitefooter.prd.md, ADR-146 -->

# MarketingHero and SiteFooter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build two public-surface components — a marketing hero and a semantic site footer — where the stylesheet is the contract and a thin factory earns the library's discovery surfaces.

**Architecture:** Each component is a `<name>.scss` that works on hand-authored markup with no script on the page, plus a `create<Name>(containerId, options)` factory that renders exactly the markup the README documents. A canonical-structure test asserts that equality. Both are `display`-conformance, `container-first`, and carry no dark-mode rules — the `--theme-*` tokens already switch under `data-bs-theme`.

**Tech Stack:** TypeScript compiled by `tsc` to `dist/components/`, Sass compiled by `sass components/:dist/components/`, Vitest with jsdom for unit tests, Playwright for end to end. No new dependencies — the "No New Toys" rule in `ADDITIONAL_INSTRUCTIONS.md` applies.

## Global Constraints

Every task's requirements implicitly include this section.

- **Read `AGENTS.md` first.** It overrides anything here.
- **No new dependencies.** Not one. Bootstrap 5, Sass, PostCSS, Wrangler is the whole list.
- **No UI frameworks.** React, Vue, Angular, and jQuery are prohibited by architecture.
- **Colours come from `var(--theme-*)` tokens only.** No hex literals in component SCSS. See the token table in `DARKMODE.md`.
- **Sizes come from the existing scale.** `$spacer` and `$spacers` for spacing, `$font-size-*` for type, `$font-weight-semibold`, `$line-height-lg`. All are in `src/scss/_variables.scss`. No new scale tokens (PRD decision D2).
- **`rem` for sizing, `px` only for borders.**
- **Allman braces, methods at most 30 lines, at most 3 nesting levels, guard clauses.** See `CODING_STYLE.md`.
- **Every file carries the SPDX header and the `⚓ COMPONENT` / `📜 PURPOSE` / `🔗 RELATES` marker block.** Copy the shape from `components/emptystate/emptystate.ts:1-15`.
- **Every file carries the logging shim** verbatim from `components/emptystate/emptystate.ts:21-29`, with `LOG_PREFIX` changed.
- **All user-supplied strings render through `textContent`.** Never `innerHTML`. Element-typed options (`aside`, `logo`) are appended as nodes.
- **Test names follow `Method_Condition_Expectation`.** See `components/emptystate/emptystate.test.ts`.
- **Class names are prefixed with the component name.** No generic names that could collide with Bootstrap or a host app.
- **Commit after every task.** Conventional messages: `feat:`, `fix:`, `test:`, `docs:`.

**Environment note:** `node_modules` is not installed in this working copy. Task 1, Step 1 installs it. Nothing else in the plan will run until that is done.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/scss/_variables.scss` | **Modify.** Add `$grid-breakpoints` so components can name a breakpoint instead of hardcoding pixels. |
| `components/marketinghero/marketinghero.scss` | The MarketingHero contract. Layout, modifiers, breakpoint classes. |
| `components/marketinghero/marketinghero.ts` | `MarketingHero` class and `createMarketingHero` factory. |
| `components/marketinghero/marketinghero.manifest.ts` | Capability manifest, `display` level. |
| `components/marketinghero/marketinghero.test.ts` | Unit and canonical-structure tests. |
| `components/marketinghero/README.md` | Markup contract, options, and the class table. |
| `components/sitefooter/sitefooter.scss` | The SiteFooter contract. Grid columns, link states, legal row. |
| `components/sitefooter/sitefooter.ts` | `SiteFooter` class and `createSiteFooter` factory. |
| `components/sitefooter/sitefooter.manifest.ts` | Capability manifest, `display` level. |
| `components/sitefooter/sitefooter.test.ts` | Unit and canonical-structure tests. |
| `components/sitefooter/README.md` | Markup contract, options, and the visited-link note. |
| `demo/components/marketinghero.html` | Demo page. All three layouts, both themes. |
| `demo/index.html` | **Modify.** Register both demo cards — the gallery's only index. |
| `demo/components/sitefooter.html` | Demo page. One, three, and four columns, both themes. |
| `components/diagramengine/src/stencils-ui-components.ts` | **Modify.** Two custom SVG wireframe stencils. |
| `demo/studio/component-studio.html` | **Modify.** Two entries plus two `COMPONENT_HELP` blocks. |
| `tests/website-components.spec.ts` | Playwright end-to-end for both demo pages. |

Nothing needs a build-config change: `tsconfig.json` includes `components/**/*.ts` and the SCSS build globs `components/`. A new folder is picked up automatically.

---

### Task 1: Name the breakpoints

The PRD calls for a Sass loop over Bootstrap's `$grid-breakpoints`, but `src/scss/_variables.scss` never defines that map and imports nothing, so component SCSS cannot see it. Today `components/applauncher/applauncher.scss:451` hardcodes `@media (min-width: 768px)`, which is exactly what `ADDITIONAL_INSTRUCTIONS.md` forbids. Defining the map with Bootstrap's own values and `!default` makes the names available to every component and changes no compiled output, because Bootstrap's later `!default` declaration cannot override an already-set value of the same content.

**Files:**
- Modify: `src/scss/_variables.scss`

**Interfaces:**
- Consumes: nothing.
- Produces: `$grid-breakpoints` — a Sass map with keys `xs, sm, md, lg, xl, xxl` mapping to `0, 576px, 768px, 992px, 1200px, 1400px`. Tasks 2 and 6 read it with `map-get`.

- [ ] **Step 1: Install dependencies**

```bash
npm install
```

Expected: `node_modules/` appears. Without this nothing else runs.

- [ ] **Step 2: Capture the current compiled CSS as a baseline**

```bash
npm run build:css
cp dist/css/custom.css /tmp/custom-baseline.css
```

Expected: the build succeeds. This baseline is the test for this task — the change must alter nothing.

- [ ] **Step 3: Add the map**

In `src/scss/_variables.scss`, immediately after the `$spacers` map block, add:

```scss
// =============================================================================
// GRID BREAKPOINTS
// =============================================================================
// Bootstrap's own values, declared here so component SCSS — which imports this
// file and NOT Bootstrap — can name a breakpoint instead of hardcoding pixels.
// `!default` means Bootstrap's identical later declaration is a no-op, so the
// compiled output is unchanged.

$grid-breakpoints: (
  xs: 0,
  sm: 576px,
  md: 768px,
  lg: 992px,
  xl: 1200px,
  xxl: 1400px
) !default;
```

- [ ] **Step 4: Prove the compiled CSS is byte-identical**

```bash
npm run build:css && diff /tmp/custom-baseline.css dist/css/custom.css && echo "IDENTICAL"
```

Expected: `IDENTICAL`. If the files differ, the values do not match Bootstrap's and the change is not safe — stop and reconcile before continuing.

- [ ] **Step 5: Commit**

```bash
git add src/scss/_variables.scss
git commit -m "feat(theme): name the grid breakpoints so components can use them"
```

---

### Task 2: MarketingHero — styles, component, and tests

**Files:**
- Create: `components/marketinghero/marketinghero.scss`
- Create: `components/marketinghero/marketinghero.ts`
- Create: `components/marketinghero/marketinghero.test.ts`

**Interfaces:**
- Consumes: `$grid-breakpoints` from Task 1.
- Produces:
  - `interface MarketingHeroAction { text: string; href?: string; onClick?: () => void; }`
  - `interface MarketingHeroOptions { title: string; eyebrow?: string; lede?: string; layout?: "stacked" | "centered" | "split"; stackBelow?: "sm" | "md" | "lg" | "xl"; primaryAction?: MarketingHeroAction; secondaryAction?: MarketingHeroAction; aside?: HTMLElement; cssClass?: string; }`
  - `class MarketingHero` with `show(containerId?: string): void`, `hide(): void`, `destroy(): void`, `getElement(): HTMLElement | null`
  - `function createMarketingHero(containerId: string, options: MarketingHeroOptions): MarketingHero`
  - Globals: `window.MarketingHero`, `window.createMarketingHero`

- [ ] **Step 1: Write the failing tests**

Create `components/marketinghero/marketinghero.test.ts`:

```typescript
/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: MarketingHero
 * Unit tests for the MarketingHero component. Covers the canonical structure
 * contract, layout modifiers, breakpoint classes, actions, the aside slot,
 * escaping, and teardown.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { MarketingHero, createMarketingHero } from "./marketinghero";
import type { MarketingHeroOptions } from "./marketinghero";

let container: HTMLElement;

function makeOptions(overrides?: Partial<MarketingHeroOptions>): MarketingHeroOptions
{
    return {
        title: "Ship enterprise UI faster",
        lede: "A compact Bootstrap 5 theme and component library.",
        ...overrides,
    };
}

beforeEach(() =>
{
    container = document.createElement("div");
    container.id = "marketinghero-test-container";
    document.body.appendChild(container);
});

afterEach(() =>
{
    container.remove();
});

// ============================================================================
// CANONICAL STRUCTURE — the contract the stylesheet depends on
// ============================================================================

describe("MarketingHero canonical structure", () =>
{
    test("Render_Always_RootIsSectionWithHeroClass", () =>
    {
        const hero = createMarketingHero("marketinghero-test-container", makeOptions());
        const root = container.querySelector(".marketinghero");
        expect(root?.tagName.toLowerCase()).toBe("section");
        hero.destroy();
    });

    test("Render_Always_ContentPrecedesAside", () =>
    {
        const aside = document.createElement("div");
        const hero = createMarketingHero("marketinghero-test-container",
            makeOptions({ aside }));
        const root = container.querySelector(".marketinghero") as HTMLElement;
        const children = Array.from(root.children).map((c) => c.className);
        expect(children).toEqual(["marketinghero-content", "marketinghero-aside"]);
        hero.destroy();
    });

    test("Render_WithEyebrow_TitleIsFirstInDocumentOrder", () =>
    {
        const hero = createMarketingHero("marketinghero-test-container",
            makeOptions({ eyebrow: "New" }));
        const content = container.querySelector(".marketinghero-content") as HTMLElement;
        expect(content.children[0].classList.contains("marketinghero-title")).toBe(true);
        expect(content.children[1].classList.contains("marketinghero-eyebrow")).toBe(true);
        hero.destroy();
    });

    test("Render_Always_TitleIsH1WithIdReferencedByAriaLabelledby", () =>
    {
        const hero = createMarketingHero("marketinghero-test-container", makeOptions());
        const root = container.querySelector(".marketinghero") as HTMLElement;
        const title = container.querySelector(".marketinghero-title") as HTMLElement;
        expect(title.tagName.toLowerCase()).toBe("h1");
        expect(root.getAttribute("aria-labelledby")).toBe(title.id);
        expect(title.id).not.toBe("");
        hero.destroy();
    });
});

// ============================================================================
// LAYOUT MODIFIERS
// ============================================================================

describe("MarketingHero layout", () =>
{
    test("Layout_Omitted_IsStackedWithNoModifier", () =>
    {
        const hero = createMarketingHero("marketinghero-test-container", makeOptions());
        const root = container.querySelector(".marketinghero") as HTMLElement;
        expect(root.classList.contains("marketinghero-split")).toBe(false);
        expect(root.classList.contains("marketinghero-centered")).toBe(false);
        hero.destroy();
    });

    test("Layout_Centered_AddsCenteredClass", () =>
    {
        const hero = createMarketingHero("marketinghero-test-container",
            makeOptions({ layout: "centered" }));
        const root = container.querySelector(".marketinghero") as HTMLElement;
        expect(root.classList.contains("marketinghero-centered")).toBe(true);
        hero.destroy();
    });

    test("Layout_Split_AddsSplitAndDefaultStackLgClass", () =>
    {
        const hero = createMarketingHero("marketinghero-test-container",
            makeOptions({ layout: "split" }));
        const root = container.querySelector(".marketinghero") as HTMLElement;
        expect(root.classList.contains("marketinghero-split")).toBe(true);
        expect(root.classList.contains("marketinghero-stack-lg")).toBe(true);
        hero.destroy();
    });

    test("StackBelow_Md_AddsStackMdClass", () =>
    {
        const hero = createMarketingHero("marketinghero-test-container",
            makeOptions({ layout: "split", stackBelow: "md" }));
        const root = container.querySelector(".marketinghero") as HTMLElement;
        expect(root.classList.contains("marketinghero-stack-md")).toBe(true);
        hero.destroy();
    });

    test("StackBelow_WithoutSplit_AddsNoStackClass", () =>
    {
        const hero = createMarketingHero("marketinghero-test-container",
            makeOptions({ stackBelow: "md" }));
        const root = container.querySelector(".marketinghero") as HTMLElement;
        expect(root.className).not.toContain("marketinghero-stack");
        hero.destroy();
    });
});

// ============================================================================
// OPTIONAL PARTS — omitted renders nothing, not an empty element
// ============================================================================

describe("MarketingHero optional parts", () =>
{
    test("Eyebrow_Omitted_RendersNoEyebrowElement", () =>
    {
        const hero = createMarketingHero("marketinghero-test-container", makeOptions());
        expect(container.querySelector(".marketinghero-eyebrow")).toBeNull();
        hero.destroy();
    });

    test("Lede_Omitted_RendersNoLedeElement", () =>
    {
        const hero = createMarketingHero("marketinghero-test-container",
            makeOptions({ lede: undefined }));
        expect(container.querySelector(".marketinghero-lede")).toBeNull();
        hero.destroy();
    });

    test("Actions_Omitted_RendersNoActionsElement", () =>
    {
        const hero = createMarketingHero("marketinghero-test-container", makeOptions());
        expect(container.querySelector(".marketinghero-actions")).toBeNull();
        hero.destroy();
    });

    test("Aside_Omitted_RendersNoAsideElement", () =>
    {
        const hero = createMarketingHero("marketinghero-test-container", makeOptions());
        expect(container.querySelector(".marketinghero-aside")).toBeNull();
        hero.destroy();
    });

    test("Aside_Provided_ContainsTheGivenElement", () =>
    {
        const aside = document.createElement("img");
        aside.id = "hero-shot";
        const hero = createMarketingHero("marketinghero-test-container",
            makeOptions({ aside }));
        expect(container.querySelector(".marketinghero-aside #hero-shot")).not.toBeNull();
        hero.destroy();
    });
});

// ============================================================================
// ACTIONS
// ============================================================================

describe("MarketingHero actions", () =>
{
    test("PrimaryAction_WithHref_RendersAnchor", () =>
    {
        const hero = createMarketingHero("marketinghero-test-container",
            makeOptions({ primaryAction: { text: "Get started", href: "/signup" } }));
        const el = container.querySelector(".marketinghero-actions a") as HTMLAnchorElement;
        expect(el.getAttribute("href")).toBe("/signup");
        expect(el.textContent).toBe("Get started");
        expect(el.classList.contains("btn-primary")).toBe(true);
        hero.destroy();
    });

    test("PrimaryAction_WithOnClickOnly_RendersButtonAndFires", () =>
    {
        const onClick = vi.fn();
        const hero = createMarketingHero("marketinghero-test-container",
            makeOptions({ primaryAction: { text: "Open", onClick } }));
        const el = container.querySelector(".marketinghero-actions button") as HTMLElement;
        el.click();
        expect(onClick).toHaveBeenCalledOnce();
        hero.destroy();
    });

    test("SecondaryAction_Provided_RendersOutlineVariantAfterPrimary", () =>
    {
        const hero = createMarketingHero("marketinghero-test-container", makeOptions({
            primaryAction: { text: "Get started", href: "/signup" },
            secondaryAction: { text: "Read the docs", href: "/docs" },
        }));
        const actions = container.querySelector(".marketinghero-actions") as HTMLElement;
        expect(actions.children.length).toBe(2);
        expect(actions.children[1].classList.contains("btn-outline-secondary")).toBe(true);
        hero.destroy();
    });

    test("SecondaryAction_WithoutPrimary_StillRenders", () =>
    {
        const hero = createMarketingHero("marketinghero-test-container",
            makeOptions({ secondaryAction: { text: "Read the docs", href: "/docs" } }));
        const actions = container.querySelector(".marketinghero-actions") as HTMLElement;
        expect(actions.children.length).toBe(1);
        hero.destroy();
    });
});

// ============================================================================
// SAFETY AND LIFECYCLE
// ============================================================================

describe("MarketingHero safety and lifecycle", () =>
{
    test("Title_ContainingMarkup_RendersAsText", () =>
    {
        const hero = createMarketingHero("marketinghero-test-container",
            makeOptions({ title: "<script>alert(1)</script>" }));
        const title = container.querySelector(".marketinghero-title") as HTMLElement;
        expect(title.querySelector("script")).toBeNull();
        expect(title.textContent).toBe("<script>alert(1)</script>");
        hero.destroy();
    });

    test("Constructor_MissingTitle_LogsAndDoesNotThrow", () =>
    {
        const spy = vi.spyOn(console, "error").mockImplementation(() => {});
        expect(() => new MarketingHero({ title: "" })).not.toThrow();
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });

    test("Show_UnknownContainer_LogsAndDoesNotThrow", () =>
    {
        const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const hero = new MarketingHero(makeOptions());
        expect(() => hero.show("no-such-container")).not.toThrow();
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
        hero.destroy();
    });

    test("Destroy_AfterShow_RemovesFromDOM", () =>
    {
        const hero = createMarketingHero("marketinghero-test-container", makeOptions());
        expect(container.querySelector(".marketinghero")).not.toBeNull();
        hero.destroy();
        expect(container.querySelector(".marketinghero")).toBeNull();
    });

    test("Destroy_CalledTwice_IsIdempotent", () =>
    {
        const hero = createMarketingHero("marketinghero-test-container", makeOptions());
        hero.destroy();
        expect(() => hero.destroy()).not.toThrow();
    });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npx vitest run components/marketinghero/marketinghero.test.ts
```

Expected: FAIL — `Failed to resolve import "./marketinghero"`.

- [ ] **Step 3: Write the component**

Create `components/marketinghero/marketinghero.ts`:

```typescript
/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: MarketingHero
 * 📜 PURPOSE: Public-page introduction area — eyebrow, heading, lede, up to two
 *             actions, and an optional media slot, in stacked, centered, or
 *             split layouts.
 * 🔗 RELATES: [[EnterpriseTheme]], [[SiteFooter]], [[AuthCard]]
 * ⚡ FLOW: [Static page] -> [marketinghero.css] -> [Rendered hero]
 *         [Consumer App] -> [createMarketingHero()] -> [Rendered hero]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// CONSTANTS
// ============================================================================

/** Log prefix for all console messages from this component. */
const LOG_PREFIX = "[MarketingHero]";

const _lu = (typeof (window as any).createLogUtility === "function") ? (window as any).createLogUtility().getLogger(LOG_PREFIX.slice(1, -1)) : null;
function logInfo(...a: unknown[]): void { _lu ? _lu.info(...a) : console.log(new Date().toISOString(), "[INFO]", LOG_PREFIX, ...a); }
function logWarn(...a: unknown[]): void { _lu ? _lu.warn(...a) : console.warn(new Date().toISOString(), "[WARN]", LOG_PREFIX, ...a); }
function logError(...a: unknown[]): void { _lu ? _lu.error(...a) : console.error(new Date().toISOString(), "[ERROR]", LOG_PREFIX, ...a); }
function logDebug(...a: unknown[]): void { _lu ? _lu.debug(...a) : console.debug(new Date().toISOString(), "[DEBUG]", LOG_PREFIX, ...a); }
function logTrace(...a: unknown[]): void { _lu ? _lu.trace(...a) : console.debug(new Date().toISOString(), "[TRACE]", LOG_PREFIX, ...a); }

/** Breakpoint below which a split hero stacks, when the caller says nothing. */
const DEFAULT_STACK_BELOW = "lg";

/** Instance counter for unique IDs. */
let instanceCounter = 0;

// ============================================================================
// INTERFACES
// ============================================================================

/** One call to action. `href` renders an anchor; otherwise a button. */
export interface MarketingHeroAction
{
    /** Visible label. Rendered as text. */
    text: string;
    /** Destination. Present means the action navigates. */
    href?: string;
    /** Click handler. Used alone for in-page actions. */
    onClick?: () => void;
}

/** Configuration options for the MarketingHero component. */
export interface MarketingHeroOptions
{
    /** Heading text. Required. */
    title: string;
    /** Small label shown above the heading. */
    eyebrow?: string;
    /** Supporting paragraph below the heading. */
    lede?: string;
    /** Layout variant. Default: "stacked". */
    layout?: "stacked" | "centered" | "split";
    /** Breakpoint below which a split hero stacks. Default: "lg". */
    stackBelow?: "sm" | "md" | "lg" | "xl";
    /** Primary call to action. */
    primaryAction?: MarketingHeroAction;
    /** Secondary call to action. */
    secondaryAction?: MarketingHeroAction;
    /** Media, illustration, or callout. Appended as a node, never parsed. */
    aside?: HTMLElement;
    /** Additional CSS class(es) on the root. */
    cssClass?: string;
}

// ============================================================================
// DOM HELPERS
// ============================================================================

/** Create an element with optional class name. */
function createElement(tag: string, className?: string): HTMLElement
{
    const el = document.createElement(tag);
    if (className)
    {
        el.className = className;
    }
    return el;
}

// ============================================================================
// COMPONENT CLASS
// ============================================================================

/**
 * ⚓ COMPONENT: MarketingHero
 *
 * The introduction area for a public page.
 *
 * The stylesheet is the contract: this factory renders exactly the markup the
 * README documents, so a static page can hand-author the same HTML and load no
 * script at all. `marketinghero.test.ts` asserts that equality.
 *
 * @example
 * var hero = createMarketingHero("hero-host", {
 *     eyebrow: "New",
 *     title: "Ship enterprise UI faster",
 *     lede: "A compact Bootstrap 5 theme and component library.",
 *     layout: "split",
 *     primaryAction: { text: "Get started", href: "/signup" }
 * });
 */
export class MarketingHero
{
    private readonly instanceId!: string;
    private readonly options!: MarketingHeroOptions;

    private rootEl: HTMLElement | null = null;
    private destroyed = false;
    private readonly boundHandlers: Array<[HTMLElement, () => void]> = [];

    constructor(options: MarketingHeroOptions)
    {
        if (!options.title)
        {
            logError("title is required");
            return;
        }

        instanceCounter++;
        this.instanceId = `marketinghero-${instanceCounter}`;
        this.options = options;
        this.rootEl = this.buildRoot();
        logInfo("Created instance", this.instanceId);
    }

    // ========================================================================
    // PUBLIC API
    // ========================================================================

    /** Append to the container element, or to body when no id is given. */
    show(containerId?: string): void
    {
        if (this.destroyed || !this.rootEl) { return; }

        const container = containerId
            ? document.getElementById(containerId)
            : document.body;

        if (!container)
        {
            logWarn("Container not found:", containerId);
            return;
        }

        container.appendChild(this.rootEl);
    }

    /** Remove from the DOM but keep state. */
    hide(): void
    {
        if (this.rootEl?.parentNode)
        {
            this.rootEl.parentNode.removeChild(this.rootEl);
        }
    }

    /** Tear down listeners and DOM. Idempotent. */
    destroy(): void
    {
        if (this.destroyed) { return; }
        this.destroyed = true;

        for (const [el, handler] of this.boundHandlers)
        {
            el.removeEventListener("click", handler);
        }
        this.boundHandlers.length = 0;

        this.hide();
        this.rootEl = null;
        logInfo("Destroyed", this.instanceId);
    }

    /** Return the root DOM element. */
    getElement(): HTMLElement | null
    {
        return this.rootEl;
    }

    // ========================================================================
    // DOM CONSTRUCTION
    // ========================================================================

    /** Build the root element tree. */
    private buildRoot(): HTMLElement
    {
        const root = createElement("section", this.buildRootClasses());
        root.id = this.instanceId;

        const content = this.buildContent();
        root.appendChild(content);

        if (this.options.aside)
        {
            const aside = createElement("aside", "marketinghero-aside");
            aside.appendChild(this.options.aside);
            root.appendChild(aside);
        }

        root.setAttribute("aria-labelledby", `${this.instanceId}-title`);
        return root;
    }

    /** Build the root class string from the layout options. */
    private buildRootClasses(): string
    {
        const parts = ["marketinghero"];
        const layout = this.options.layout ?? "stacked";

        if (layout === "centered")
        {
            parts.push("marketinghero-centered");
        }

        if (layout === "split")
        {
            const stackBelow = this.options.stackBelow ?? DEFAULT_STACK_BELOW;
            parts.push("marketinghero-split", `marketinghero-stack-${stackBelow}`);
        }

        if (this.options.cssClass)
        {
            parts.push(this.options.cssClass);
        }

        return parts.join(" ");
    }

    /**
     * Build the text column.
     *
     * The title is appended BEFORE the eyebrow deliberately. The eyebrow is
     * lifted above it with `order: -1` in the stylesheet, which keeps the
     * heading first in document order without nesting the eyebrow inside it
     * and polluting the heading's accessible name. Nothing here is focusable,
     * so displaced visual order carries no keyboard hazard. See ADR-146, D4.
     */
    private buildContent(): HTMLElement
    {
        const content = createElement("div", "marketinghero-content");

        const title = createElement("h1", "marketinghero-title");
        title.id = `${this.instanceId}-title`;
        title.textContent = this.options.title;
        content.appendChild(title);

        if (this.options.eyebrow)
        {
            const eyebrow = createElement("p", "marketinghero-eyebrow");
            eyebrow.textContent = this.options.eyebrow;
            content.appendChild(eyebrow);
        }

        if (this.options.lede)
        {
            const lede = createElement("p", "marketinghero-lede");
            lede.textContent = this.options.lede;
            content.appendChild(lede);
        }

        this.appendActions(content);
        return content;
    }

    /** Append the actions row, when there is at least one action. */
    private appendActions(content: HTMLElement): void
    {
        const { primaryAction, secondaryAction } = this.options;
        if (!primaryAction && !secondaryAction) { return; }

        const actions = createElement("div", "marketinghero-actions");

        if (primaryAction)
        {
            actions.appendChild(this.buildAction(primaryAction, "btn-primary"));
        }

        if (secondaryAction)
        {
            actions.appendChild(
                this.buildAction(secondaryAction, "btn-outline-secondary"));
        }

        content.appendChild(actions);
    }

    /** Build one action. An href renders an anchor; otherwise a button. */
    private buildAction(action: MarketingHeroAction, variant: string): HTMLElement
    {
        const tag = action.href ? "a" : "button";
        const el = createElement(tag, `btn ${variant}`);
        el.textContent = action.text;

        if (action.href)
        {
            el.setAttribute("href", action.href);
        }
        else
        {
            el.setAttribute("type", "button");
        }

        if (action.onClick)
        {
            const handler = action.onClick;
            el.addEventListener("click", handler);
            this.boundHandlers.push([el, handler]);
        }

        return el;
    }
}

// ============================================================================
// CONVENIENCE FUNCTION
// ============================================================================

/**
 * ⚓ FUNCTION: createMarketingHero
 * Create, show, and return a MarketingHero in one call.
 */
export function createMarketingHero(
    containerId: string, options: MarketingHeroOptions
): MarketingHero
{
    const hero = new MarketingHero(options);
    hero.show(containerId);
    return hero;
}

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

(window as any).MarketingHero = MarketingHero;
(window as any).createMarketingHero = createMarketingHero;
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npx vitest run components/marketinghero/marketinghero.test.ts
```

Expected: PASS, all tests.

- [ ] **Step 5: Write the stylesheet**

Create `components/marketinghero/marketinghero.scss`:

```scss
/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ⚓ COMPONENT: MarketingHeroStyles
 * 📜 PURPOSE: Styles for the public-page hero. This file is the contract —
 *    it works on hand-authored markup with no script on the page.
 * 🔗 RELATES: [[MarketingHero]], [[EnterpriseTheme]]
 */

// @dependency: ../../src/scss/variables
@import '../../src/scss/variables';

// ============================================================================
// ROOT
// ============================================================================

.marketinghero {
    display: flex;
    flex-direction: column;
    gap: $spacer * 1.5;
    padding: $spacer * 2.5 $spacer * 1.5;
    background-color: var(--theme-body-bg);
    color: var(--theme-text-primary);
}

// ============================================================================
// TEXT COLUMN
// ============================================================================

.marketinghero-content {
    display: flex;
    flex-direction: column;
    // min-width: 0 lets a long unbroken word shrink instead of widening the
    // flex item past its share.
    min-width: 0;
}

// The eyebrow follows the title in the DOM and is lifted above it here, so the
// heading stays first in document order. See ADR-146, D4.
.marketinghero-eyebrow {
    order: -1;
    margin: 0 0 $spacer * 0.25;
    color: var(--theme-text-secondary);
    font-size: $font-size-sm;
    font-weight: $font-weight-semibold;
    letter-spacing: 0.06em;
    text-transform: uppercase;
}

.marketinghero-title {
    margin: 0 0 $spacer * 0.5;
    color: var(--theme-text-primary);
    font-weight: $font-weight-semibold;
}

.marketinghero-lede {
    // A measure of roughly 60 characters stays readable at the widths a hero
    // reaches on a desktop.
    max-width: 60ch;
    margin: 0;
    color: var(--theme-text-secondary);
    line-height: $line-height-lg;
}

.marketinghero-actions {
    display: flex;
    flex-wrap: wrap;
    gap: $spacer * 0.5;
    margin-top: $spacer;
}

// ============================================================================
// MEDIA SLOT
// ============================================================================

.marketinghero-aside {
    min-width: 0;

    > img,
    > svg {
        max-width: 100%;
        height: auto;
    }
}

// ============================================================================
// LAYOUT — CENTERED
// ============================================================================

.marketinghero-centered {
    align-items: center;
    text-align: center;

    .marketinghero-content {
        align-items: center;
    }

    .marketinghero-lede {
        margin-left: auto;
        margin-right: auto;
    }

    .marketinghero-actions {
        justify-content: center;
    }
}

// ============================================================================
// LAYOUT — SPLIT
// ============================================================================
// One class per breakpoint, naming the width at and above which the two
// columns sit side by side. Below it the hero stays stacked, which is the
// single-column rendering with no extra rules.

@each $name, $min in $grid-breakpoints {
    @if $min != 0 {
        .marketinghero-split.marketinghero-stack-#{$name} {
            @media (min-width: $min) {
                flex-direction: row;
                align-items: center;
                gap: $spacer * 3;

                > .marketinghero-content,
                > .marketinghero-aside {
                    flex: 1 1 0;
                }
            }
        }
    }
}

// ============================================================================
// FORCED COLOURS
// ============================================================================
// When the system palette replaces ours, the aside loses whatever separation
// its content provided. A system-coloured border keeps it a distinct region.

@media (forced-colors: active) {
    .marketinghero-aside {
        border: 1px solid CanvasText;
    }
}
```

- [ ] **Step 6: Verify the stylesheet compiles**

```bash
npm run build:components:css && ls -la dist/components/marketinghero/marketinghero.css
```

Expected: the file exists and is non-empty. A Sass error here means `$grid-breakpoints` did not resolve — re-check Task 1.

- [ ] **Step 7: Verify the whole suite still passes**

```bash
npm test
```

Expected: PASS. Read the output, not just the exit code — `npm test` chains three commands and a pipe would hide a failure in the first.

- [ ] **Step 8: Commit**

```bash
git add components/marketinghero/
git commit -m "feat(marketinghero): public-page hero where the stylesheet is the contract"
```

---

### Task 3: MarketingHero — capability manifest

**Files:**
- Create: `components/marketinghero/marketinghero.manifest.ts`

**Interfaces:**
- Consumes: `createMarketingHero` from Task 2; `CapabilityManifest` from `runtime/src/types`.
- Produces: `MARKETINGHERO_MANIFEST`, aggregated by the build into `dist/capability-manifest.json`.

- [ ] **Step 1: Run the conformance gate to see it fail**

```bash
npx vitest run runtime/fleet-conformance.test.ts
```

Expected: FAIL — `marketinghero` has neither a manifest nor an exemption. This is the gate doing its job.

- [ ] **Step 2: Write the manifest**

Create `components/marketinghero/marketinghero.manifest.ts`:

```typescript
/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: MarketingHero / CapabilityManifest
 * 📜 PURPOSE: Declares what MarketingHero can render, so the Dynamic UI canvas
 *    can resolve, mount, and budget it. See ADR-142 and ADR-146.
 * 🔗 RELATES: [[MarketingHero]], [[DynamicUIRuntime]], [[Resolver]]
 * ⚡ FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker marketinghero-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * MarketingHero is a `display` component: it mounts, renders, and tears down,
 * but carries no value and emits nothing the canvas wires.
 *
 * It is excluded from the ADR-134 field convention for the reason Sidebar and
 * Toolbar are — it is chrome, and nothing in it round-trips as a JSON value.
 */
export const MARKETINGHERO_MANIFEST: CapabilityManifest =
{
    name: "marketinghero",
    factory: "createMarketingHero",
    label: "Marketing Hero",
    icon: "bi-megaphone",
    category: "content",

    affords: [
        {
            shape: "document",
            intents: ["browse"],
            cardinality: { min: 1, max: 1 },
            minViewport: { w: 360, h: 200 },
        },
    ],

    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 4_000, mountCost: "trivial", holdsResources: false },

    defaultSize: { w: 720, h: 320 },
    defaultOptions: { title: "Ship enterprise UI faster" },

    factoryStyle: "container-first",
    conformance: "display",
    priority: 30,
};
```

- [ ] **Step 3: Run the gate to verify it passes**

```bash
npx vitest run runtime/fleet-conformance.test.ts
```

Expected: PASS. If `factoryStyle` is rejected, read `runtime/src/types.ts` for the exact field name and correct the manifest — the type is the authority, not this plan.

- [ ] **Step 4: Confirm the component is not exempt**

```bash
grep -n 'marketinghero' runtime/fleet-conformance.test.ts
```

Expected: no output. A match means someone added it to `EXEMPT` or `NOT_MOUNTABLE`, which the PRD forbids.

- [ ] **Step 5: Commit**

```bash
git add components/marketinghero/marketinghero.manifest.ts
git commit -m "feat(marketinghero): declare the display-level capability manifest"
```

---

### Task 4: MarketingHero — README and demo page

**Files:**
- Create: `components/marketinghero/README.md`
- Create: `demo/components/marketinghero.html`

**Interfaces:**
- Consumes: everything from Tasks 2 and 3.
- Produces: the documented markup contract that Task 10's end-to-end tests drive.

- [ ] **Step 1: Read an existing README and demo page for the house shape**

```bash
sed -n '1,60p' components/emptystate/README.md
sed -n '1,60p' demo/components/emptystate.html
```

Match their structure — header block, files table, markup, options table, notes.

- [ ] **Step 2: Write the README**

`components/marketinghero/README.md` must contain, in this order:

1. The SPDX header and the `⚓ COMPONENT` / `📜 PURPOSE` / `🔗 RELATES` marker block.
2. A one-paragraph statement that **the CSS is the contract and the JS is a convenience**, with the sentence: "A static page links the stylesheet, writes the markup below, and loads no script."
3. The canonical markup block, copied verbatim from `specs/marketinghero-sitefooter.prd.md` section 5.1.
4. The class table from PRD section 5.2.
5. The options table for `MarketingHeroOptions`, one row per field, with defaults.
6. A **Document order** note explaining that the eyebrow follows the heading in source and is lifted with `order: -1`, and why (ADR-146, D4). Anyone reformatting the markup needs this or they will "fix" it.
7. A **Scope notes** section stating that the component is excluded from the ADR-134 field convention because it is chrome, and that it is `display` conformance.

- [ ] **Step 3: Write the demo page**

`demo/components/marketinghero.html` must render, each in its own labelled section:

- A stacked hero with eyebrow, title, lede, and both actions.
- A centered hero with title and lede only.
- A split hero with an `aside` holding an SVG placeholder, at the default `lg` breakpoint.
- A split hero with `stackBelow: "md"`, so the two collapse points are visible side by side.
- One hero written as **hand-authored HTML with no factory call**, under a heading that says so. This is the page that proves the contract.

Load order in `<head>`: `dist/css/custom.css`, then `dist/components/marketinghero/marketinghero.css`. Scripts at the end of `<body>`: `dist/js/theme-init.js`, then `dist/components/marketinghero/marketinghero.js`. Include the ThemeToggle so both themes can be checked by hand.

- [ ] **Step 4: Verify the page renders**

```bash
npm run build && ./run.sh
```

Open `http://localhost:8000/demo/components/marketinghero.html`. Confirm by eye: all five sections render, the hand-authored section is indistinguishable from the factory-rendered one, and both themes look correct. Stop the server when done.

- [ ] **Step 5: Commit**

```bash
git add components/marketinghero/README.md demo/components/marketinghero.html
git commit -m "docs(marketinghero): document the markup contract and add the demo page"
```

---

### Task 5: MarketingHero — stencil and Component Studio entry

**Files:**
- Modify: `components/diagramengine/src/stencils-ui-components.ts`
- Modify: `demo/studio/component-studio.html`

**Interfaces:**
- Consumes: `createMarketingHero` and the class names from Task 2.
- Produces: nothing other tasks read.

- [ ] **Step 1: Add the stencil renderer**

In `components/diagramengine/src/stencils-ui-components.ts`, find the `switch` that contains `case "emptystate":` (around line 2239) and add a new case beside it, following the same helper vocabulary (`uiText`, `uiButton`, `uiIcon`, `uiRect` — read the neighbouring cases for the exact signatures available):

```typescript
        case "marketinghero":
            return (g, x, y, w, h) =>
            {
                uiText(g, x + 16, y + h * 0.22, "NEW", {
                    size: 8, fill: C_TEXT_MUT
                });
                uiText(g, x + 16, y + h * 0.40, "Ship enterprise UI faster", {
                    size: 15, fill: C_TEXT_SEC
                });
                uiText(g, x + 16, y + h * 0.55, "A compact Bootstrap 5 theme.", {
                    size: 9, fill: C_TEXT_MUT
                });
                uiButton(g, x + 16, y + h * 0.66, 76, 22, "Get started", {
                    fill: C_PRIMARY, textFill: C_BG
                });
                uiRect(g, x + w * 0.58, y + h * 0.18, w * 0.36, h * 0.64, {
                    fill: C_BG, stroke: C_TEXT_MUT
                });
            };
```

If `uiRect` is not the helper name in this file, use whatever the neighbouring cases use to draw a bordered box. The helpers are the authority, not this snippet.

- [ ] **Step 2: Add the Component Studio entry**

In `demo/studio/component-studio.html`, beside the `emptystate` entry (around line 1121), add:

```javascript
            { name: "marketinghero", label: "MarketingHero", icon: "bi-megaphone",
              category: "Content", factory: "createMarketingHero", width: 600, height: 260,
              pattern: "id-opts",
              defaults: { eyebrow: "New", title: "Ship enterprise UI faster",
                          lede: "A compact Bootstrap 5 theme and component library.",
                          primaryAction: { text: "Get started", href: "#" } } },
```

`pattern: "id-opts"` is the container-first calling convention, the same one `emptystate` uses.

- [ ] **Step 3: Add the help block**

Beside `COMPONENT_HELP["emptystate"]` (around line 2232), add a `COMPONENT_HELP["marketinghero"]` entry in the same string-concatenation style, listing `title`, `eyebrow`, `lede`, `layout`, `stackBelow`, `primaryAction`, `secondaryAction`, and `aside`.

- [ ] **Step 4: Verify both studios**

```bash
npm run build && ./run.sh
```

Open `http://localhost:8000/demo/studio/component-studio.html`, find MarketingHero under Content, and place it — it must render, not error. Then open `layout-studio.html` and confirm the stencil draws a recognisable hero wireframe. Stop the server.

- [ ] **Step 5: Commit**

```bash
git add components/diagramengine/src/stencils-ui-components.ts demo/studio/component-studio.html
git commit -m "feat(marketinghero): add the Layout Studio stencil and Component Studio entry"
```

---

### Task 6: SiteFooter — styles, component, and tests

**Files:**
- Create: `components/sitefooter/sitefooter.scss`
- Create: `components/sitefooter/sitefooter.ts`
- Create: `components/sitefooter/sitefooter.test.ts`

**Interfaces:**
- Consumes: `$grid-breakpoints` from Task 1.
- Produces:
  - `interface SiteFooterLink { text: string; href: string; }`
  - `interface SiteFooterGroup { title: string; headingLevel?: 2 | 3 | 4 | 5 | 6; links: SiteFooterLink[]; }`
  - `interface SiteFooterOptions { organization?: { name: string; description?: string; logo?: HTMLElement }; contact?: { email?: string; phone?: string; address?: string }; groups?: SiteFooterGroup[]; legal?: { copyright?: string; links?: SiteFooterLink[] }; buildInfo?: string; columns?: 1 | 2 | 3 | 4; cssClass?: string; }`
  - `class SiteFooter` with `show`, `hide`, `destroy`, `getElement`
  - `function createSiteFooter(containerId: string, options: SiteFooterOptions): SiteFooter`
  - Globals: `window.SiteFooter`, `window.createSiteFooter`

- [ ] **Step 1: Write the failing tests**

Create `components/sitefooter/sitefooter.test.ts`:

```typescript
/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: SiteFooter
 * Unit tests for the SiteFooter component. Covers the canonical structure
 * contract, column derivation, navigation-group naming, optional parts,
 * escaping, and teardown.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { SiteFooter, createSiteFooter } from "./sitefooter";
import type { SiteFooterOptions } from "./sitefooter";

let container: HTMLElement;

beforeEach(() =>
{
    container = document.createElement("div");
    container.id = "sitefooter-test-container";
    document.body.appendChild(container);
});

afterEach(() =>
{
    container.remove();
});

function makeOptions(overrides?: Partial<SiteFooterOptions>): SiteFooterOptions
{
    return {
        organization: { name: "Outcrop Inc", description: "Enterprise software." },
        groups: [
            { title: "Product", links: [{ text: "Overview", href: "/overview" }] },
            { title: "Company", links: [{ text: "About", href: "/about" }] },
        ],
        legal: { copyright: "© 2026 Outcrop Inc" },
        ...overrides,
    };
}

// ============================================================================
// CANONICAL STRUCTURE
// ============================================================================

describe("SiteFooter canonical structure", () =>
{
    test("Render_Always_RootIsFooterWithSiteFooterClass", () =>
    {
        const footer = createSiteFooter("sitefooter-test-container", makeOptions());
        const root = container.querySelector(".sitefooter");
        expect(root?.tagName.toLowerCase()).toBe("footer");
        footer.destroy();
    });

    test("Render_Always_GridPrecedesLegal", () =>
    {
        const footer = createSiteFooter("sitefooter-test-container", makeOptions());
        const root = container.querySelector(".sitefooter") as HTMLElement;
        const children = Array.from(root.children).map((c) => c.className);
        expect(children).toEqual(["sitefooter-grid sitefooter-cols-3",
                                  "sitefooter-legal"]);
        footer.destroy();
    });

    test("Render_Organization_UsesAddressElementForContact", () =>
    {
        const footer = createSiteFooter("sitefooter-test-container",
            makeOptions({ contact: { email: "hello@example.test" } }));
        const contact = container.querySelector(".sitefooter-contact");
        expect(contact?.tagName.toLowerCase()).toBe("address");
        footer.destroy();
    });
});

// ============================================================================
// COLUMNS
// ============================================================================

describe("SiteFooter columns", () =>
{
    test("Columns_Omitted_DerivedFromBlockCount", () =>
    {
        const footer = createSiteFooter("sitefooter-test-container", makeOptions());
        const grid = container.querySelector(".sitefooter-grid") as HTMLElement;
        expect(grid.classList.contains("sitefooter-cols-3")).toBe(true);
        footer.destroy();
    });

    test("Columns_Explicit_OverridesDerivedValue", () =>
    {
        const footer = createSiteFooter("sitefooter-test-container",
            makeOptions({ columns: 2 }));
        const grid = container.querySelector(".sitefooter-grid") as HTMLElement;
        expect(grid.classList.contains("sitefooter-cols-2")).toBe(true);
        footer.destroy();
    });

    test("Columns_MoreThanFourBlocks_CapsAtFour", () =>
    {
        const groups = ["A", "B", "C", "D", "E"].map((t) => ({
            title: t, links: [{ text: t, href: `/${t}` }],
        }));
        const footer = createSiteFooter("sitefooter-test-container",
            makeOptions({ groups }));
        const grid = container.querySelector(".sitefooter-grid") as HTMLElement;
        expect(grid.classList.contains("sitefooter-cols-4")).toBe(true);
        footer.destroy();
    });
});

// ============================================================================
// NAVIGATION GROUPS
// ============================================================================

describe("SiteFooter navigation groups", () =>
{
    test("Group_Always_IsNavLabelledByItsOwnHeading", () =>
    {
        const footer = createSiteFooter("sitefooter-test-container", makeOptions());
        const nav = container.querySelector(".sitefooter-group") as HTMLElement;
        const heading = nav.querySelector(".sitefooter-grouptitle") as HTMLElement;
        expect(nav.tagName.toLowerCase()).toBe("nav");
        expect(nav.getAttribute("aria-labelledby")).toBe(heading.id);
        expect(heading.id).not.toBe("");
        footer.destroy();
    });

    test("HeadingLevel_Omitted_RendersH2", () =>
    {
        const footer = createSiteFooter("sitefooter-test-container", makeOptions());
        const heading = container.querySelector(".sitefooter-grouptitle") as HTMLElement;
        expect(heading.tagName.toLowerCase()).toBe("h2");
        footer.destroy();
    });

    test("HeadingLevel_Four_RendersH4", () =>
    {
        const footer = createSiteFooter("sitefooter-test-container", makeOptions({
            groups: [{ title: "Product", headingLevel: 4,
                       links: [{ text: "Overview", href: "/overview" }] }],
        }));
        const heading = container.querySelector(".sitefooter-grouptitle") as HTMLElement;
        expect(heading.tagName.toLowerCase()).toBe("h4");
        footer.destroy();
    });

    test("Group_TwoGroups_HeadingIdsAreUnique", () =>
    {
        const footer = createSiteFooter("sitefooter-test-container", makeOptions());
        const ids = Array.from(container.querySelectorAll(".sitefooter-grouptitle"))
            .map((h) => h.id);
        expect(new Set(ids).size).toBe(ids.length);
        footer.destroy();
    });

    test("Links_Rendered_AsListItemsWithHrefs", () =>
    {
        const footer = createSiteFooter("sitefooter-test-container", makeOptions());
        const link = container.querySelector(".sitefooter-links li a") as HTMLAnchorElement;
        expect(link.getAttribute("href")).toBe("/overview");
        expect(link.textContent).toBe("Overview");
        footer.destroy();
    });
});

// ============================================================================
// OPTIONAL PARTS
// ============================================================================

describe("SiteFooter optional parts", () =>
{
    test("BuildInfo_Provided_RendersBuildElement", () =>
    {
        const footer = createSiteFooter("sitefooter-test-container",
            makeOptions({ buildInfo: "2026.09.01 · a1b2c3d" }));
        const build = container.querySelector(".sitefooter-build") as HTMLElement;
        expect(build.textContent).toBe("2026.09.01 · a1b2c3d");
        footer.destroy();
    });

    test("BuildInfo_Omitted_RendersNoBuildElement", () =>
    {
        const footer = createSiteFooter("sitefooter-test-container", makeOptions());
        expect(container.querySelector(".sitefooter-build")).toBeNull();
        footer.destroy();
    });

    test("Legal_Omitted_RendersNoLegalRow", () =>
    {
        const footer = createSiteFooter("sitefooter-test-container",
            makeOptions({ legal: undefined }));
        expect(container.querySelector(".sitefooter-legal")).toBeNull();
        footer.destroy();
    });

    test("Groups_Omitted_RendersGridWithOrganizationOnly", () =>
    {
        const footer = createSiteFooter("sitefooter-test-container",
            makeOptions({ groups: undefined }));
        expect(container.querySelector(".sitefooter-group")).toBeNull();
        expect(container.querySelector(".sitefooter-org")).not.toBeNull();
        footer.destroy();
    });

    test("Logo_Provided_ContainsTheGivenElement", () =>
    {
        const logo = document.createElement("img");
        logo.id = "brand-mark";
        const footer = createSiteFooter("sitefooter-test-container", makeOptions({
            organization: { name: "Outcrop Inc", logo },
        }));
        expect(container.querySelector(".sitefooter-org #brand-mark")).not.toBeNull();
        footer.destroy();
    });
});

// ============================================================================
// SAFETY AND LIFECYCLE
// ============================================================================

describe("SiteFooter safety and lifecycle", () =>
{
    test("OrgName_ContainingMarkup_RendersAsText", () =>
    {
        const footer = createSiteFooter("sitefooter-test-container", makeOptions({
            organization: { name: "<img src=x onerror=alert(1)>" },
        }));
        const name = container.querySelector(".sitefooter-orgname") as HTMLElement;
        expect(name.querySelector("img")).toBeNull();
        expect(name.textContent).toBe("<img src=x onerror=alert(1)>");
        footer.destroy();
    });

    test("Show_UnknownContainer_LogsAndDoesNotThrow", () =>
    {
        const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const footer = new SiteFooter(makeOptions());
        expect(() => footer.show("no-such-container")).not.toThrow();
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
        footer.destroy();
    });

    test("Constructor_EmptyOptions_RendersEmptyFooterWithoutThrowing", () =>
    {
        expect(() => new SiteFooter({})).not.toThrow();
    });

    test("Destroy_AfterShow_RemovesFromDOM", () =>
    {
        const footer = createSiteFooter("sitefooter-test-container", makeOptions());
        expect(container.querySelector(".sitefooter")).not.toBeNull();
        footer.destroy();
        expect(container.querySelector(".sitefooter")).toBeNull();
    });

    test("Destroy_CalledTwice_IsIdempotent", () =>
    {
        const footer = createSiteFooter("sitefooter-test-container", makeOptions());
        footer.destroy();
        expect(() => footer.destroy()).not.toThrow();
    });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npx vitest run components/sitefooter/sitefooter.test.ts
```

Expected: FAIL — `Failed to resolve import "./sitefooter"`.

- [ ] **Step 3: Write the component**

Create `components/sitefooter/sitefooter.ts`:

```typescript
/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: SiteFooter
 * 📜 PURPOSE: Semantic public-site footer — organization details, grouped
 *             navigation, contact details, legal links, and optional build
 *             information, in one to four responsive columns.
 * 🔗 RELATES: [[EnterpriseTheme]], [[MarketingHero]], [[AuthCard]]
 * ⚡ FLOW: [Static page] -> [sitefooter.css] -> [Rendered footer]
 *         [Consumer App] -> [createSiteFooter()] -> [Rendered footer]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// CONSTANTS
// ============================================================================

/** Log prefix for all console messages from this component. */
const LOG_PREFIX = "[SiteFooter]";

const _lu = (typeof (window as any).createLogUtility === "function") ? (window as any).createLogUtility().getLogger(LOG_PREFIX.slice(1, -1)) : null;
function logInfo(...a: unknown[]): void { _lu ? _lu.info(...a) : console.log(new Date().toISOString(), "[INFO]", LOG_PREFIX, ...a); }
function logWarn(...a: unknown[]): void { _lu ? _lu.warn(...a) : console.warn(new Date().toISOString(), "[WARN]", LOG_PREFIX, ...a); }
function logError(...a: unknown[]): void { _lu ? _lu.error(...a) : console.error(new Date().toISOString(), "[ERROR]", LOG_PREFIX, ...a); }
function logDebug(...a: unknown[]): void { _lu ? _lu.debug(...a) : console.debug(new Date().toISOString(), "[DEBUG]", LOG_PREFIX, ...a); }
function logTrace(...a: unknown[]): void { _lu ? _lu.trace(...a) : console.debug(new Date().toISOString(), "[TRACE]", LOG_PREFIX, ...a); }

/** Widest column count the grid supports. */
const MAX_COLUMNS = 4;

/** Heading level used for a navigation group when the caller says nothing. */
const DEFAULT_HEADING_LEVEL = 2;

/** Instance counter for unique IDs. */
let instanceCounter = 0;

// ============================================================================
// INTERFACES
// ============================================================================

/** One footer link. */
export interface SiteFooterLink
{
    /** Visible label. Rendered as text. */
    text: string;
    /** Destination. */
    href: string;
}

/** One named group of navigation links. */
export interface SiteFooterGroup
{
    /** Group heading. Also supplies the group's accessible name. */
    title: string;
    /**
     * Heading level for the group title. Default: 2.
     *
     * Configurable because a footer that hardcodes `h2` can break the heading
     * outline of a page whose main content stops at `h3`.
     */
    headingLevel?: 2 | 3 | 4 | 5 | 6;
    /** Links in the group. */
    links: SiteFooterLink[];
}

/** Configuration options for the SiteFooter component. */
export interface SiteFooterOptions
{
    /** Organization block. `logo` is appended as a node, never parsed. */
    organization?: { name: string; description?: string; logo?: HTMLElement };
    /** Contact details. Rendered inside an `<address>`. */
    contact?: { email?: string; phone?: string; address?: string };
    /** Navigation groups. */
    groups?: SiteFooterGroup[];
    /** Legal row. */
    legal?: { copyright?: string; links?: SiteFooterLink[] };
    /**
     * Build information, e.g. "2026.09.01 · a1b2c3d".
     *
     * A string the caller passes. This component performs no fetch and reads
     * no global — the value is produced at build time by `npm run build:info`.
     */
    buildInfo?: string;
    /** Column count. Default: derived from the number of rendered blocks. */
    columns?: 1 | 2 | 3 | 4;
    /** Additional CSS class(es) on the root. */
    cssClass?: string;
}

// ============================================================================
// DOM HELPERS
// ============================================================================

/** Create an element with optional class name. */
function createElement(tag: string, className?: string): HTMLElement
{
    const el = document.createElement(tag);
    if (className)
    {
        el.className = className;
    }
    return el;
}

/** Create an anchor with text and destination, both set safely. */
function createLink(link: SiteFooterLink): HTMLElement
{
    const a = createElement("a");
    a.textContent = link.text;
    a.setAttribute("href", link.href);
    return a;
}

/** Create a paragraph holding one anchor, for a contact line. */
function createContactLine(scheme: string, value: string): HTMLElement
{
    const p = createElement("p");
    p.appendChild(createLink({ text: value, href: `${scheme}:${value}` }));
    return p;
}

// ============================================================================
// COMPONENT CLASS
// ============================================================================

/**
 * ⚓ COMPONENT: SiteFooter
 *
 * The footer for a public page.
 *
 * The stylesheet is the contract: this factory renders exactly the markup the
 * README documents, so a static page can hand-author the same HTML and load no
 * script at all. `sitefooter.test.ts` asserts that equality.
 *
 * @example
 * var footer = createSiteFooter("footer-host", {
 *     organization: { name: "Outcrop Inc", description: "Enterprise software." },
 *     groups: [{ title: "Product", links: [{ text: "Overview", href: "/overview" }] }],
 *     legal: { copyright: "© 2026 Outcrop Inc" }
 * });
 */
export class SiteFooter
{
    private readonly instanceId: string;
    private readonly options: SiteFooterOptions;

    private rootEl: HTMLElement | null = null;
    private destroyed = false;

    constructor(options: SiteFooterOptions)
    {
        instanceCounter++;
        this.instanceId = `sitefooter-${instanceCounter}`;
        this.options = options;
        this.rootEl = this.buildRoot();
        logInfo("Created instance", this.instanceId);
    }

    // ========================================================================
    // PUBLIC API
    // ========================================================================

    /** Append to the container element, or to body when no id is given. */
    show(containerId?: string): void
    {
        if (this.destroyed || !this.rootEl) { return; }

        const container = containerId
            ? document.getElementById(containerId)
            : document.body;

        if (!container)
        {
            logWarn("Container not found:", containerId);
            return;
        }

        container.appendChild(this.rootEl);
    }

    /** Remove from the DOM but keep state. */
    hide(): void
    {
        if (this.rootEl?.parentNode)
        {
            this.rootEl.parentNode.removeChild(this.rootEl);
        }
    }

    /**
     * Tear down the DOM. Idempotent.
     *
     * Every action in this component is a link, so there are no listeners to
     * detach — nothing here binds a handler.
     */
    destroy(): void
    {
        if (this.destroyed) { return; }
        this.destroyed = true;
        this.hide();
        this.rootEl = null;
        logInfo("Destroyed", this.instanceId);
    }

    /** Return the root DOM element. */
    getElement(): HTMLElement | null
    {
        return this.rootEl;
    }

    // ========================================================================
    // DOM CONSTRUCTION
    // ========================================================================

    /** Build the root element tree. */
    private buildRoot(): HTMLElement
    {
        const parts = ["sitefooter"];
        if (this.options.cssClass)
        {
            parts.push(this.options.cssClass);
        }

        const root = createElement("footer", parts.join(" "));
        root.id = this.instanceId;
        root.appendChild(this.buildGrid());

        const legal = this.buildLegal();
        if (legal)
        {
            root.appendChild(legal);
        }

        return root;
    }

    /** Build the column grid: the organization block, then one nav per group. */
    private buildGrid(): HTMLElement
    {
        const grid = createElement(
            "div", `sitefooter-grid sitefooter-cols-${this.columnCount()}`);

        if (this.options.organization)
        {
            grid.appendChild(this.buildOrg());
        }

        const groups = this.options.groups ?? [];
        groups.forEach((group, index) =>
        {
            grid.appendChild(this.buildGroup(group, index));
        });

        return grid;
    }

    /**
     * Decide how many columns the grid gets.
     *
     * An explicit `columns` wins. Otherwise count the blocks that will
     * actually render and clamp to what the stylesheet defines, so a footer
     * with six groups does not ask for a `sitefooter-cols-6` class that has
     * no rule behind it.
     */
    private columnCount(): number
    {
        if (this.options.columns)
        {
            return this.options.columns;
        }

        const blocks = (this.options.organization ? 1 : 0)
            + (this.options.groups?.length ?? 0);

        return Math.min(Math.max(blocks, 1), MAX_COLUMNS);
    }

    /** Build the organization block. */
    private buildOrg(): HTMLElement
    {
        const org = this.options.organization!;
        const block = createElement("div", "sitefooter-org");

        if (org.logo)
        {
            block.appendChild(org.logo);
        }

        const name = createElement("p", "sitefooter-orgname");
        name.textContent = org.name;
        block.appendChild(name);

        if (org.description)
        {
            const desc = createElement("p", "sitefooter-orgdesc");
            desc.textContent = org.description;
            block.appendChild(desc);
        }

        const contact = this.buildContact();
        if (contact)
        {
            block.appendChild(contact);
        }

        return block;
    }

    /** Build the contact block, or null when there is nothing to show. */
    private buildContact(): HTMLElement | null
    {
        const contact = this.options.contact;
        if (!contact) { return null; }

        const address = createElement("address", "sitefooter-contact");

        if (contact.email)
        {
            address.appendChild(createContactLine("mailto", contact.email));
        }

        if (contact.phone)
        {
            address.appendChild(createContactLine("tel", contact.phone));
        }

        if (contact.address)
        {
            const line = createElement("p");
            line.textContent = contact.address;
            address.appendChild(line);
        }

        return address;
    }

    /**
     * Build one navigation group.
     *
     * The `<nav>` takes its accessible name from its own heading through
     * `aria-labelledby`, which is what distinguishes several footer navs from
     * each other for assistive technology.
     */
    private buildGroup(group: SiteFooterGroup, index: number): HTMLElement
    {
        const nav = createElement("nav", "sitefooter-group");
        const headingId = `${this.instanceId}-group-${index}`;
        const level = group.headingLevel ?? DEFAULT_HEADING_LEVEL;

        const heading = createElement(`h${level}`, "sitefooter-grouptitle");
        heading.id = headingId;
        heading.textContent = group.title;
        nav.setAttribute("aria-labelledby", headingId);
        nav.appendChild(heading);

        const list = createElement("ul", "sitefooter-links");
        for (const link of group.links)
        {
            const item = createElement("li");
            item.appendChild(createLink(link));
            list.appendChild(item);
        }

        nav.appendChild(list);
        return nav;
    }

    /** Build the legal row, or null when there is nothing to show. */
    private buildLegal(): HTMLElement | null
    {
        const legal = this.options.legal;
        const hasLegal = Boolean(legal?.copyright || legal?.links?.length);

        if (!hasLegal && !this.options.buildInfo) { return null; }

        const row = createElement("div", "sitefooter-legal");

        if (legal?.copyright)
        {
            const copyright = createElement("p", "sitefooter-copyright");
            copyright.textContent = legal.copyright;
            row.appendChild(copyright);
        }

        if (legal?.links?.length)
        {
            const list = createElement("ul", "sitefooter-legallinks");
            for (const link of legal.links)
            {
                const item = createElement("li");
                item.appendChild(createLink(link));
                list.appendChild(item);
            }
            row.appendChild(list);
        }

        if (this.options.buildInfo)
        {
            const build = createElement("p", "sitefooter-build");
            build.textContent = this.options.buildInfo;
            row.appendChild(build);
        }

        return row;
    }
}

// ============================================================================
// CONVENIENCE FUNCTION
// ============================================================================

/**
 * ⚓ FUNCTION: createSiteFooter
 * Create, show, and return a SiteFooter in one call.
 */
export function createSiteFooter(
    containerId: string, options: SiteFooterOptions
): SiteFooter
{
    const footer = new SiteFooter(options);
    footer.show(containerId);
    return footer;
}

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

(window as any).SiteFooter = SiteFooter;
(window as any).createSiteFooter = createSiteFooter;
```

Note one consequence of `buildLegal()`: a footer with only `buildInfo` and no `legal` still renders the legal row, because the build string has nowhere else to live. The test `Legal_Omitted_RendersNoLegalRow` passes `buildInfo: undefined` through `makeOptions`, so it exercises the genuinely empty case.

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npx vitest run components/sitefooter/sitefooter.test.ts
```

Expected: PASS, all tests.

- [ ] **Step 5: Write the stylesheet**

Create `components/sitefooter/sitefooter.scss` with the standard header and `@import '../../src/scss/variables';`, then:

```scss
// ============================================================================
// ROOT
// ============================================================================

.sitefooter {
    padding: $spacer * 2 $spacer * 1.5;
    border-top: 1px solid var(--theme-border-color);
    background-color: var(--theme-surface-bg);
    color: var(--theme-text-secondary);
}

// ============================================================================
// COLUMNS
// ============================================================================
// minmax(0, 1fr) is load-bearing: without the 0 minimum a long email address
// or a long translated compound forces its track wider than its share and the
// whole row overflows.

.sitefooter-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: $spacer * 1.5;
}

@each $count in (1, 2, 3, 4) {
    .sitefooter-cols-#{$count} {
        @media (min-width: map-get($grid-breakpoints, md)) {
            grid-template-columns: repeat($count, minmax(0, 1fr));
        }
    }
}

// ============================================================================
// ORGANIZATION BLOCK
// ============================================================================

.sitefooter-orgname {
    margin: 0 0 $spacer * 0.25;
    color: var(--theme-text-primary);
    font-weight: $font-weight-semibold;
}

.sitefooter-orgdesc {
    margin: 0 0 $spacer * 0.5;
    line-height: $line-height-lg;
}

.sitefooter-contact {
    margin: 0;
    font-style: normal;
    // Long addresses and translated compounds break rather than overflow.
    overflow-wrap: anywhere;

    p {
        margin: 0 0 $spacer * 0.25;
    }
}

// ============================================================================
// NAVIGATION GROUPS
// ============================================================================

.sitefooter-grouptitle {
    margin: 0 0 $spacer * 0.5;
    color: var(--theme-text-primary);
    font-size: $font-size-sm;
    font-weight: $font-weight-semibold;
    letter-spacing: 0.04em;
    text-transform: uppercase;
}

.sitefooter-links {
    margin: 0;
    padding: 0;
    list-style: none;

    li {
        margin-bottom: $spacer * 0.25;
    }
}

// ============================================================================
// LINKS
// ============================================================================
// Unvisited links are muted and visited links take the accent colour. This
// INVERTS the usual convention and is deliberate — see ADR-146, D5, and
// DEBT-WEB-2. Do not "correct" it without reading those. Colour is not the
// only signal: hover and focus add an underline.

.sitefooter-links a,
.sitefooter-legallinks a {
    color: var(--theme-text-secondary);
    text-decoration: none;
    overflow-wrap: anywhere;

    &:visited {
        color: var(--theme-primary);
    }

    &:hover {
        color: var(--theme-text-primary);
        text-decoration: underline;
    }

    &:focus-visible {
        outline: 2px solid $primary;
        outline-offset: 2px;
    }
}

// ============================================================================
// LEGAL ROW
// ============================================================================

.sitefooter-legal {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: $spacer * 0.5 $spacer;
    margin-top: $spacer * 1.5;
    padding-top: $spacer;
    border-top: 1px solid var(--theme-border-subtle);
    font-size: $font-size-sm;
}

.sitefooter-copyright,
.sitefooter-build {
    margin: 0;
}

.sitefooter-build {
    // Pushed to the end of the row where it reads as metadata, not content.
    margin-left: auto;
    color: var(--theme-text-muted);
}

.sitefooter-legallinks {
    display: flex;
    flex-wrap: wrap;
    gap: $spacer;
    margin: 0;
    padding: 0;
    list-style: none;
}
```

- [ ] **Step 6: Verify the stylesheet compiles**

```bash
npm run build:components:css && ls -la dist/components/sitefooter/sitefooter.css
```

Expected: the file exists and is non-empty.

- [ ] **Step 7: Verify the whole suite still passes**

```bash
npm test
```

Expected: PASS. Read the output, not just the exit code.

- [ ] **Step 8: Commit**

```bash
git add components/sitefooter/
git commit -m "feat(sitefooter): semantic public-site footer with grid columns"
```

---

### Task 7: SiteFooter — capability manifest

**Files:**
- Create: `components/sitefooter/sitefooter.manifest.ts`

**Interfaces:**
- Consumes: `createSiteFooter` from Task 6.
- Produces: `SITEFOOTER_MANIFEST`.

- [ ] **Step 1: Run the conformance gate to see it fail**

```bash
npx vitest run runtime/fleet-conformance.test.ts
```

Expected: FAIL — `sitefooter` has neither a manifest nor an exemption.

- [ ] **Step 2: Write the manifest**

Create `components/sitefooter/sitefooter.manifest.ts`, identical in shape to Task 3's manifest with these values:

```typescript
export const SITEFOOTER_MANIFEST: CapabilityManifest =
{
    name: "sitefooter",
    factory: "createSiteFooter",
    label: "Site Footer",
    icon: "bi-layout-text-window-reverse",
    category: "navigation",

    affords: [
        {
            shape: "collection",
            intents: ["browse"],
            cardinality: { min: 1, max: 24 },
            minViewport: { w: 320, h: 160 },
        },
    ],

    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    weight: { js: 4_000, mountCost: "trivial", holdsResources: false },

    defaultSize: { w: 720, h: 240 },
    defaultOptions: { organization: { name: "Your organization" } },

    factoryStyle: "container-first",
    conformance: "display",
    priority: 20,
};
```

The `cardinality` maximum of 24 is a comfort estimate for total links, not a limit the component enforces.

- [ ] **Step 3: Run the gate to verify it passes**

```bash
npx vitest run runtime/fleet-conformance.test.ts
```

Expected: PASS.

- [ ] **Step 4: Confirm the component is not exempt**

```bash
grep -n 'sitefooter' runtime/fleet-conformance.test.ts
```

Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add components/sitefooter/sitefooter.manifest.ts
git commit -m "feat(sitefooter): declare the display-level capability manifest"
```

---

### Task 8: SiteFooter — README and demo page

**Files:**
- Create: `components/sitefooter/README.md`
- Create: `demo/components/sitefooter.html`

**Interfaces:**
- Consumes: Tasks 6 and 7.
- Produces: the markup contract Task 10 drives.

- [ ] **Step 1: Write the README**

Same seven-part structure as Task 4's README, using PRD section 6 for the markup and class content, plus one addition:

A **Link colours** section stating plainly that unvisited links are muted and visited links take the accent colour, that this inverts the usual convention, that it was chosen deliberately, and that ADR-146 D5 and DEBT-WEB-2 record why. Without this paragraph someone will file it as a bug and "fix" it.

- [ ] **Step 2: Write the demo page**

`demo/components/sitefooter.html` must render, each in its own labelled section:

- A three-column footer: organization with contact, two navigation groups, legal row with copyright and links.
- A one-column footer with organization only.
- A four-column footer with organization and three groups, including one group whose links carry deliberately long labels and one contact block with a very long email address, so the overflow behaviour is visible rather than assumed.
- A footer with `buildInfo` set.
- One footer written as **hand-authored HTML with no factory call**, under a heading that says so.

Same load order as Task 4's page, with `sitefooter.css` and `sitefooter.js`.

- [ ] **Step 3: Verify the page renders and does not overflow**

```bash
npm run build && ./run.sh
```

Open `http://localhost:8000/demo/components/sitefooter.html`. Narrow the window to 320px and confirm: nothing overflows horizontally, the long email wraps, columns stack in source order, and both themes look correct. Then check that visited links change colour — click one, go back, and look. Stop the server.

- [ ] **Step 4: Commit**

```bash
git add components/sitefooter/README.md demo/components/sitefooter.html
git commit -m "docs(sitefooter): document the markup contract and add the demo page"
```

---

### Task 9: SiteFooter — stencil and Component Studio entry

**Files:**
- Modify: `components/diagramengine/src/stencils-ui-components.ts`
- Modify: `demo/studio/component-studio.html`

**Interfaces:**
- Consumes: Task 6.
- Produces: nothing other tasks read.

- [ ] **Step 1: Add the stencil renderer**

Beside the `marketinghero` case from Task 5, add a `case "sitefooter":` that draws three columns of short text lines with a horizontal rule and a copyright line beneath, using the same helper vocabulary the neighbouring cases use.

- [ ] **Step 2: Add the Component Studio entry**

```javascript
            { name: "sitefooter", label: "SiteFooter", icon: "bi-layout-text-window-reverse",
              category: "Navigation", factory: "createSiteFooter", width: 600, height: 220,
              pattern: "id-opts",
              defaults: { organization: { name: "Outcrop Inc",
                                          description: "Enterprise software." },
                          groups: [{ title: "Product",
                                     links: [{ text: "Overview", href: "#" }] },
                                   { title: "Company",
                                     links: [{ text: "About", href: "#" }] }],
                          legal: { copyright: "© 2026 Outcrop Inc" } } },
```

- [ ] **Step 3: Add the help block**

A `COMPONENT_HELP["sitefooter"]` entry in the same style, listing `organization`, `contact`, `groups`, `legal`, `buildInfo`, and `columns`.

- [ ] **Step 4: Verify both studios**

Same procedure as Task 5, Step 4, for SiteFooter under Navigation.

- [ ] **Step 5: Commit**

```bash
git add components/diagramengine/src/stencils-ui-components.ts demo/studio/component-studio.html
git commit -m "feat(sitefooter): add the Layout Studio stencil and Component Studio entry"
```

---

### Task 10: End-to-end tests

Unit tests run in jsdom, which computes no layout. Everything about these two components that could actually break a page — whether the split collapses, whether the grid stacks, whether a focus ring is visible — is invisible to jsdom. That is what this task covers.

**Files:**
- Create: `tests/website-components.spec.ts`

**Interfaces:**
- Consumes: the demo pages from Tasks 4 and 8.
- Produces: nothing other tasks read.

- [ ] **Step 1: Read the existing Playwright conventions**

```bash
sed -n '1,50p' tests/placement.spec.ts
cat playwright.config.ts
```

Match the base URL handling and the readiness-wait idiom. Note the lesson recorded as DEBT-DE-1: navigate to a page that actually loads the component, and wait on the global rather than a bare selector.

- [ ] **Step 2: Write the failing tests**

Create `tests/website-components.spec.ts`:

```typescript
/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: MarketingHero and SiteFooter (end to end)
 * Layout behaviour that jsdom cannot see: breakpoint collapse, source-order
 * stacking, focus visibility, and both themes.
 */

import { test, expect } from "@playwright/test";

const HERO_PAGE = "/demo/components/marketinghero.html";
const FOOTER_PAGE = "/demo/components/sitefooter.html";

test.describe("MarketingHero layout", () =>
{
    test("split hero sits side by side above its breakpoint", async ({ page }) =>
    {
        await page.setViewportSize({ width: 1280, height: 900 });
        await page.goto(HERO_PAGE);
        await page.waitForFunction(() => typeof (window as any).createMarketingHero === "function");

        const hero = page.locator(".marketinghero-split.marketinghero-stack-lg").first();
        const content = hero.locator(".marketinghero-content").first();
        const aside = hero.locator(".marketinghero-aside").first();

        const contentBox = await content.boundingBox();
        const asideBox = await aside.boundingBox();
        expect(contentBox).not.toBeNull();
        expect(asideBox).not.toBeNull();

        // Side by side: the aside starts to the right of where the content ends.
        expect(asideBox!.x).toBeGreaterThanOrEqual(contentBox!.x + contentBox!.width - 1);
    });

    test("split hero stacks below its breakpoint", async ({ page }) =>
    {
        await page.setViewportSize({ width: 800, height: 900 });
        await page.goto(HERO_PAGE);
        await page.waitForFunction(() => typeof (window as any).createMarketingHero === "function");

        const hero = page.locator(".marketinghero-split.marketinghero-stack-lg").first();
        const contentBox = await hero.locator(".marketinghero-content").first().boundingBox();
        const asideBox = await hero.locator(".marketinghero-aside").first().boundingBox();

        // Stacked: the aside starts below where the content ends.
        expect(asideBox!.y).toBeGreaterThanOrEqual(contentBox!.y + contentBox!.height - 1);
    });

    test("the eyebrow paints above the heading it follows in source", async ({ page }) =>
    {
        await page.setViewportSize({ width: 1280, height: 900 });
        await page.goto(HERO_PAGE);
        await page.waitForFunction(() => typeof (window as any).createMarketingHero === "function");

        const content = page.locator(".marketinghero-content").first();
        const eyebrowBox = await content.locator(".marketinghero-eyebrow").boundingBox();
        const titleBox = await content.locator(".marketinghero-title").boundingBox();

        expect(eyebrowBox!.y).toBeLessThan(titleBox!.y);
    });
});

test.describe("SiteFooter layout", () =>
{
    test("columns stack in source order on a narrow viewport", async ({ page }) =>
    {
        await page.setViewportSize({ width: 320, height: 900 });
        await page.goto(FOOTER_PAGE);
        await page.waitForFunction(() => typeof (window as any).createSiteFooter === "function");

        const grid = page.locator(".sitefooter-cols-3").first();
        const blocks = grid.locator(":scope > *");
        const count = await blocks.count();
        expect(count).toBeGreaterThan(1);

        let previousBottom = -1;
        for (let i = 0; i < count; i++)
        {
            const box = await blocks.nth(i).boundingBox();
            expect(box!.y).toBeGreaterThanOrEqual(previousBottom - 1);
            previousBottom = box!.y + box!.height;
        }
    });

    test("nothing overflows the viewport at 320px", async ({ page }) =>
    {
        await page.setViewportSize({ width: 320, height: 900 });
        await page.goto(FOOTER_PAGE);
        await page.waitForFunction(() => typeof (window as any).createSiteFooter === "function");

        const overflows = await page.evaluate(() =>
            document.documentElement.scrollWidth > document.documentElement.clientWidth);
        expect(overflows).toBe(false);
    });

    test("each navigation group has an accessible name", async ({ page }) =>
    {
        await page.goto(FOOTER_PAGE);
        await page.waitForFunction(() => typeof (window as any).createSiteFooter === "function");

        const groups = page.locator(".sitefooter-group");
        const count = await groups.count();
        expect(count).toBeGreaterThan(0);

        for (let i = 0; i < count; i++)
        {
            const labelledBy = await groups.nth(i).getAttribute("aria-labelledby");
            expect(labelledBy).toBeTruthy();
            await expect(page.locator(`#${labelledBy}`)).toHaveCount(1);
        }
    });

    test("a focused footer link shows a visible outline", async ({ page }) =>
    {
        await page.goto(FOOTER_PAGE);
        await page.waitForFunction(() => typeof (window as any).createSiteFooter === "function");

        const link = page.locator(".sitefooter-links a").first();
        await link.focus();

        const outlineWidth = await link.evaluate((el) =>
            window.getComputedStyle(el).outlineWidth);
        expect(parseFloat(outlineWidth)).toBeGreaterThan(0);
    });
});

test.describe("Both themes", () =>
{
    for (const theme of ["light", "dark"])
    {
        test(`hero and footer render in ${theme}`, async ({ page }) =>
        {
            await page.goto(HERO_PAGE);
            await page.evaluate((t) =>
                document.documentElement.setAttribute("data-bs-theme", t), theme);
            await expect(page.locator(".marketinghero").first()).toBeVisible();

            await page.goto(FOOTER_PAGE);
            await page.evaluate((t) =>
                document.documentElement.setAttribute("data-bs-theme", t), theme);
            await expect(page.locator(".sitefooter").first()).toBeVisible();
        });
    }
});
```

- [ ] **Step 3: Run them to verify they fail for the right reason**

```bash
npm run build && npx playwright test tests/website-components.spec.ts
```

Expected: they should PASS if Tasks 2 through 9 are complete. If any fail, the failure is real — fix the component or the stylesheet, not the test. If they pass on the first run, prove the suite is not vacuous: temporarily delete the `@each` breakpoint block from `marketinghero.scss`, rebuild, and confirm the "side by side" test fails. Restore it afterwards.

- [ ] **Step 4: Commit**

```bash
git add tests/website-components.spec.ts
git commit -m "test(e2e): cover breakpoint collapse, stacking order, and focus for the website components"
```

---

### Task 11: Indexes, knowledge base, and close-out

**Files:**
- Modify: `COMPONENTS.md`, `COMPONENT_INDEX.md`, `MASTER_COMPONENT_LIST.md`
- Modify: `agentknowledge/concepts.yaml`, `agentknowledge/history.jsonl`
- Modify: `CHANGELOG.md`, `CONVERSATION.md`
- Create: `specs/marketinghero.md`, `specs/sitefooter.md`

**Interfaces:**
- Consumes: everything.
- Produces: nothing.

- [ ] **Step 1: Add both components to the three indexes**

Follow the existing row shape in each file. `COMPONENTS.md` needs the CSS and JS paths. `MASTER_COMPONENT_LIST.md` needs an entry pointing at `specs/marketinghero-sitefooter.prd.md`, because that file is what a future session greps before building UI — an approved design the master list does not know about is the duplicate-work failure the file exists to prevent.

- [ ] **Step 2: Add the concept entries**

Two entries in `agentknowledge/concepts.yaml`, PascalCase names `MarketingHero` and `SiteFooter`, each with `definition`, `anchor_file` pointing at the component `.ts`, and `related` naming `AuthCard` (the pattern both follow) and each other.

- [ ] **Step 3: Write the per-component progress specs**

`specs/marketinghero.md` and `specs/sitefooter.md`, each recording what shipped, the decisions that shaped it (pointing at ADR-146), and anything a future session resuming the component needs. These are the short-context files AGENTS.md asks for, distinct from the PRD.

- [ ] **Step 4: Append to the history and the changelog**

One JSON line appended to `agentknowledge/history.jsonl` — append only, never rewrite. One `CHANGELOG.md` entry under the current date, `### Added`, one line per component.

- [ ] **Step 5: Update CONVERSATION.md**

The request and an output summary, in the style of the existing entries.

- [ ] **Step 6: Full verification**

```bash
npm run build && npm test && npx playwright test
```

Expected: all three green. Read the output of each — do not chain them through a pipe and trust the exit code, which is how a missing `tsc` was nearly reported as a pass on 2026-09-01.

- [ ] **Step 7: Rebuild the repository index**

```bash
bash scripts/repo-index.sh build
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "docs: index MarketingHero and SiteFooter across the knowledge base"
```

---

## Deferred, deliberately

| Item | Why |
|---|---|
| Automated contrast checking | Fleet-wide work. All 123 components carry the same unverified AA claim. Tracked as DEBT-WEB-1. **Built since, by another arc** — checks `[12]`, `[13]`, `[15]`; DEBT-WEB-1 closed 2026-10-09. |
| Replacing `applauncher.scss`'s hardcoded `@media (min-width: 768px)` | Task 1 makes the named breakpoints available, which is the prerequisite. Changing AppLauncher is unrelated to this feature and belongs in its own commit. |
| Promoting either component above `display` conformance | Neither emits anything the canvas would wire. Raising the level would mean inventing channels nothing consumes. |
