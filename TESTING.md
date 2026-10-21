<!-- AGENT: Testing guidelines for the Bootstrap 5 theme and component library. -->

# Testing Guidelines

This document defines testing standards for the Bootstrap 5 theme and component library. Because this is a **static asset library** (SCSS, TypeScript components, HTML templates, SVG icons) rather than a backend application, the testing strategy focuses on build integrity, component correctness, and visual verification.

---

## Core Philosophy

Every change to the theme or a component must be verified before it is committed. The three pillars of testing in this repository are:

1. **Build integrity** — the SCSS compiles without errors and produces valid CSS.
2. **Component correctness** — TypeScript components behave as specified.
3. **Visual verification** — the rendered output looks correct in a browser.

---

## 1. Build Integrity Tests

### 1.1 SCSS Compilation

The most fundamental test: does the theme build?

```bash
npm run build
```

This must complete with exit code 0 and produce `dist/css/custom.css`. Run this after every change to any `.scss` file.

**What to check:**
- No Sass compilation errors (syntax errors, missing variables, import failures).
- No PostCSS/autoprefixer errors.
- The output file `dist/css/custom.css` exists and is non-empty.
- Bootstrap JavaScript is copied to `dist/js/`.

### 1.2 CSS Validation (Optional)

For significant theme changes, validate the compiled CSS:

```bash
npx w3c-css-validator dist/css/custom.css
```

This catches invalid property values, malformed selectors, and other CSS specification violations.

### 1.3 Automated Build Check

Consider adding a CI step that runs `npm run build` on every push. If the build fails, the commit is rejected. This is the single most important automated check for this repository.

---

## 2. Component Unit Tests

### 2.1 When to Write Unit Tests

Unit tests are required for **TypeScript components** — code that accepts input, manipulates the DOM, and produces output. Pure SCSS styling does not require unit tests (it is verified visually and via build integrity).

Write unit tests for:
- Component initialisation with valid and invalid inputs.
- DOM manipulation logic (correct elements created, correct classes applied).
- Event handling (click handlers, keyboard navigation).
- Edge cases (missing DOM containers, null options, empty data).

### 2.2 Test Framework

Use **Jest** or **Vitest** with **jsdom** for DOM simulation.

```bash
# Install (if not already present)
npm install --save-dev jest ts-jest @types/jest

# Or for Vitest
npm install --save-dev vitest
```

### 2.3 Test Structure

Follow the **Arrange-Act-Assert** pattern. Use descriptive names following the `MethodName_Scenario_ExpectedBehavior` convention.

```typescript
/**
 * Tests for the ErrorDialog component.
 * Covers: initialisation, rendering, fallback behaviour, error handling.
 */
describe("ErrorDialog", () =>
{
    beforeEach(() =>
    {
        // Arrange: set up a clean DOM container
        document.body.innerHTML = '<div id="dialog-container"></div>';
    });

    test("showErrorDialog_WithValidOptions_RendersDialogInContainer", () =>
    {
        // Arrange
        const options = {
            title: "Save Failed",
            message: "The document could not be saved.",
            suggestion: "Check your network connection."
        };

        // Act
        showErrorDialog("dialog-container", options);

        // Assert
        const container = document.getElementById("dialog-container");
        expect(container?.querySelector(".errordialog-title")?.textContent)
            .toBe("Save Failed");
        expect(container?.querySelector(".errordialog-message")?.textContent)
            .toBe("The document could not be saved.");
    });

    test("showErrorDialog_WithMissingContainer_LogsErrorAndReturns", () =>
    {
        // Arrange
        const errorSpy = jest.spyOn(console, "error").mockImplementation();
        const options = { title: "Error", message: "Something broke." };

        // Act
        showErrorDialog("nonexistent-id", options);

        // Assert
        expect(errorSpy).toHaveBeenCalledWith(
            "[ErrorDialog] Container element not found:",
            "nonexistent-id"
        );
        errorSpy.mockRestore();
    });

    test("showErrorDialog_WithNoSuggestion_HidesSuggestionSection", () =>
    {
        // Arrange
        const options = { title: "Error", message: "Something broke." };

        // Act
        showErrorDialog("dialog-container", options);

        // Assert
        const suggestion = document.querySelector(".errordialog-suggestion");
        expect(suggestion).toBeNull();
    });
});
```

### 2.4 Test File Location

Place test files alongside the component they test:

```
components/
├── errordialog/
│   ├── errordialog.ts
│   ├── errordialog.test.ts    # Unit tests
│   ├── errordialog.scss
│   └── errordialog.html
```

### 2.5 What Not to Unit Test

- Pure SCSS styling (verified visually and by build integrity).
- Bootstrap's own behaviour (it is already tested upstream).
- Trivial DOM queries with no logic.
- Anything jsdom cannot carry out. jsdom runs no layout, loads no image, and
  fires no event handler from a resource load. A unit test that asserts "the
  handler did not fire" or "the element has a visible box" passes in jsdom
  whether or not the code is correct. Put that assertion in a Playwright spec
  under `tests/` and say in both files which half lives where. SEC-2 and SEC-3
  are both split this way (ADR-164, ADR-165).

### 2.6 Check That a Test Reaches the Code

A test block named after a defect, a ticket, or a function is a claim of
coverage, and the claim outlives anyone's memory of whether it was ever true.
Before trusting inherited coverage, break the function on purpose and run the
suite:

```ts
// Replace the body with something obviously wrong, then run the file.
function stripHtmlTags(html: string): string
{
    return html;          // no extraction at all
}
```

If nothing fails, no test reaches that function, whatever the heading says.
This takes seconds and it has been wrong twice: six tests named after SEC-2
checked a neighbouring code path, and three named after SEC-3 checked a
different input. Run the probe on the **unfixed** code, before you change
anything, or you measure your new tests instead of the old ones.

Apply the same probe to a new test you have just written, one assertion at a
time. An assertion that shares a test with a stronger one can ride on it and
look load-bearing when it is not.

### 2.6b An Assertion That Never RUNS Is a Different Fault

2.6 asks whether an assertion could fail. Ask separately whether it ever
executes. The two faults share a symptom — a green test proving nothing —
and only the first can be read off the text.

```ts
const cells = root.querySelectorAll(".palette-cell");
if (cells.length > 0)
{
    expect(cells[0].getAttribute("aria-label")).toBeTruthy();
}
```

Whether that guard ever opens depends on what the component renders, so
there is no static answer. **Put a must-fail assertion inside each guarded
body and run the suite.** A block whose guards never open stays green.

`guardedAssertions` in `scripts/audit-counts.mjs` counts the population the
sweep has to cover — 74 sites across 66 blocks on 2026-10-21 — and
`guardedAssertions()` in `scripts/test-assertions.mjs` returns the OFFSET of
each guarded body so the sweep and the ceiling read the same forms. It is a
ceiling, not a backlog: a guard written round a selector is cheap to add and
costs nothing to leave wrong.

The sweep found two on the day it was written, and **neither existing
ceiling could see either**. `testsWithoutAssertion` counts the text
`expect(` and both blocks had one. `testsThatCannotFail` read the matcher —
`toHaveBeenCalled()`, `not.toContain()` — and called both honest.
`applauncher :: OnSelect_FiresCallback` queried a class the component has
never written, so its **only** assertion never ran and `onSelect` had never
been exercised.

Three traps, all of which cost a wrong result first:

- **Do not probe a loop that DECLARES blocks.** `CASES.forEach(c =>
  test(...))` is a table; a failing assertion at suite level removed 75
  tests from the run and looked like a finding.
- **Locate a block by a cursor, not by `indexOf(body)`.** Two blocks in one
  file can have byte-identical bodies under different names, and both probes
  then land in the first of the pair.
- **The body brace is not the next brace.** `for (const f of check({ ok:
  true }))` opens an object literal first, which dropped four blocks.

A `for (const m of ["a", "b"])` is not a guard: the collection is written
out in the test, so a reader can see it is not empty. Only a collection the
COMPONENT produced can come back empty.

### 2.6c Idempotence Is Not Survival, and a Probe Only Sees Half of It

`expect(() => h.destroy()).not.toThrow()` answers "did it survive".
Almost no test is named for survival. Deleting
`if (this.destroyed) { return; }` from `BannerBar.destroy()` entirely
leaves `Destroy_CalledTwice_IsIdempotent` green, because a second call
fires `onClose` twice and the block cannot see it.

`tests/destroy-probe.ts` counts the teardown primitives a component
performs — `removeChild`, `.remove()`, `removeEventListener`,
`clearTimeout`, `clearInterval`, `cancelAnimationFrame`, enumerated
from every `destroy()` in `components/`. A block calls the terminal
method, records the count, calls it again, and asserts the count did
not move:

```ts
const probe = destroyProbe();

h.destroy();
const first = probe.total();
h.destroy();

expect(first).toBeGreaterThan(0);
expect(probe.total()).toBe(first);
probe.restore();
```

**The first count is the positive control.** A component the probe
cannot observe fails loudly rather than passing silently, which is how
two suites were caught destroying something they had never shown.

**The probe is half the instrument.** Run against BannerBar with its
guard deleted, the count does not move — its second `destroy()` calls
no probed primitive, because `clearAutoDismiss` checks its timer and
`releaseReferences` has already nulled the DOM. What it does is fire
the callback again. So:

- the **probe** answers *did the body re-run*, which is a convention
  question, and a repeated `removeEventListener` changes nothing a
  user can see;
- the **callback spy** answers *did an effect repeat*, which is where
  the defects are.

Put both in the block wherever the options carry a destroy-time
callback. Sidebar and TabbedPanel were found by the spy.

**A guarded component cannot be made red by deleting its guard, and
that is not a vacuous test.** Where every teardown step is
independently conditional — `hide()` checks visibility,
`parentNode?.removeChild` short-circuits once detached — the property
is held twice over. Establish the assertion's non-vacuity somewhere it
can fail rather than demanding a red mutation from every member.

### 2.7 Test the Classifier Behind a Count

A check that counts something is only as good as the rule it uses to decide
what counts. That rule is code, so it gets tests like any other code.

`scripts/audit-counts.mjs` reports how many `console.log` violations the tree
holds. After LOG-2 the honest answer is zero, out of 136 lines containing the
token: 123 are the body of a logging shim where `console.log` is the correct
mapping for INFO, 10 sit in doc comments, 2 are sample code drawn on a canvas
as string data, and one is the log utility's own fallthrough. A count that
skipped the classification would report 136 and be wrong in every digit.
(Written as 122 of 135 on 2026-10-13, which the script never reported at any
commit. Re-derived with `node scripts/audit-counts.mjs` on 2026-10-14.)

So `scripts/audit-counts.test.ts` gives every outcome a case, and the probe in
2.6 applies here too — mutate the classifier and confirm the tests notice:

| Mutation | Tests that fail |
|---|---|
| Treat every line as a shim body | 7 |
| Count lines instead of occurrences | 2 |
| Stop detecting string literals | 5 |
| Forget the engine logging factory | 1 |

Five of the cases in that file are regressions for real bugs. One probe
searched shipped bundles for API names and kept the trailing `()` the
documentation writes, reporting 17 real names as missing. One used `grep -oc`,
where `-c` silently overrides `-o` and counts matching lines, which turns two
casts on one line into one. One tracked each quote type's parity separately, so
an apostrophe inside a double-quoted string filed a real call site as string
data. One had no string-literal awareness at all in the logging-pattern
classifier, so a component that draws sample source onto a canvas was reported
as a standards violation for a line of pixels.

**The fifth is the one worth studying, because the check went green.** When the
DiagramEngine modules moved to a shared factory they stopped containing the
token the classifier looked for, so 17 files holding 57 log calls classified
as "no-logging" and the count fell to zero. The ratchet passed. Nothing failed.
A count can be right by accident, and refactoring the code a classifier reads
is how that happens. **When you change the shape of what a check measures,
re-derive the classification by hand on at least one file before trusting the
number.**

**Gate a count with a baseline, not a target.** Each count in that script
carries the value measured on a stated date, and check `[20]` fails when one
rises. The suite runs both locally through `./test-local.sh` and in CI through
`npm run test:structure` (ADR-169). It ran locally only until 2026-10-13, which
made the ratchet true on one machine — a gate nothing runs is a gate that
cannot fail. The number can only fall, and lowering a baseline is how progress gets
recorded. A baseline stops silent growth. It does not claim the count is
acceptable.

**A ceiling cannot see an absence. Ask which direction the failure moves
in before you write the check.** Every count in that script was a ceiling
until 2026-10-15, which is the right shape for a defect you can count, such
as a cast or a bare `console.log`. It is the wrong shape for a defect that
is something missing. DiagramEngine published one type name out of 138
because the build script deleted the export keywords, and no ceiling could
ever have gone up in response. `FLOORS` in the same script holds counts
that fail when they FALL, and `diagramengineBundleExports` is the first.

Two details from that case are worth carrying. **A substitution costs no
lines**, so `s/^export //g` left `diagramengineLines` unchanged at 30,482
through the entire regression, and a line-count ratchet is blind to any
edit that trades one token for another. And **mutation-prove a floor the
same way you mutation-prove a ceiling**: restoring the strip drops the
count to 0 and fails the check, which is the evidence that the floor is
wired to the thing it names.

### 2.7a A Count of Call Sites Cannot Tell You Output Reached a Console

LOG-4 added 268 `logTrace` calls across 96 components, and
`scripts/trace-scan.mjs` counts them. That count is worth exactly what it
measures, which is the presence of a call. It cannot see a gate that never
opens, a flag read at the wrong moment, or a payload that is empty.

That is the STD-1 mistake in a different costume. The published `.d.ts` was
200 OK for months and served one usable name, and the test that would have
caught it had to read the artifact rather than count the source.

So trace coverage is held by two different kinds of check:

| Check | What it can prove | What it cannot |
|---|---|---|
| `tracedComponents` floor, 3 ceilings | A component stopped calling its shim | That calling it produces output |
| `magnifier.trace.test.ts` | A real mousemove on a real component writes a real `[TRACE]` line, and the payload is exactly `{ x, y }` | Anything about the other 95 |

Neither is enough. The floor covers the fleet and proves nothing about
behaviour; the emission test proves behaviour on one component. Both were
mutation-probed: deleting magnifier's single trace call fails two counts and
two tests.

**Capture the arguments, not a string of them.** The first version of the
emission test did `args.map(String).join(" ")`, which renders the payload as
`[object Object]`. The case named "the payload carries the pointer position
and no content" then asserted nothing about either and passed for the same
reason as the case above it. A privacy assertion that cannot fail is worse
than no assertion, because it reads like the rule is enforced.

### 2.7b A Test That Cannot Fail the Old Way Proves Nothing About the New

LOG-6 changed WHEN a flag is read, not what it means. `_dbg` and `_trc`
were constants evaluated at script load and are now `_dbg()` and `_trc()`,
read on every call. Nothing about the output changes. Only the timing does.

A test for that has to be built so the old code fails it, and two separate
things can quietly make it pass either way.

**The first is re-importing.** `magnifier.trace.test.ts` calls
`vi.resetModules()` between cases, because when the gate was a const a fresh
module was the only way to vary it. A timing test written in that shape
passes against the captured const, since every case gets a module evaluated
after the flag was set. `magnifier.flag.test.ts` therefore imports the
component ONCE, in `beforeAll`, and every case flips the flag afterwards.
That single difference is the whole experiment.

**The second is taking the wrong branch.** Each component logs through
LogUtility when `window.createLogUtility` exists and through a console shim
when it does not. The shim is what LOG-6 changed. `isGlobalFlagSet` on the
LogUtility side was always read per call. So if anything in the environment
defines `createLogUtility`, every case passes while testing the branch that
never had the bug. The file asserts its absence in its first test, for the
same reason the payload case captures raw arguments: an assertion that
cannot fail reads like a rule being enforced.

**Then measure it.** The file was run against the pre-LOG-6 gate before
being trusted: **9 of 17 cases fail**, and the 8 that pass are the ones that
assert silence, which a frozen `false` also delivers. That number is the
evidence the test works, not the green run afterwards.

| Check | What it can prove | What it cannot |
|---|---|---|
| `dynamicVerboseShims` floor, `ungatedVerboseShims` ceiling | The call form is present in 213 shims and a shim was not deleted | That calling it reads the flag now rather than at load |
| `magnifier.flag.test.ts` | A flag set after import changes the next call's output, both ways, on both levels | Anything about the other 116 components |

### 2.7c Do Not Run the Suite While a Build Is in Flight

Two consecutive full runs during LOG-4a reported `1 failed | 5064 passed`
and named nothing. Six sequential runs afterwards were clean. An
intermittent failure in a suite with no async tests is worth stopping for,
because the usual causes are shared state and ordering.

It was neither. `scripts/audit-counts.test.ts` reads
`components/diagramengine/diagramengine.ts` to check the export floor
against the real bundle, and `scripts/bundle-diagramengine.sh` REWRITES
that file during `npm run build`. A build was running in the background.
The test read the file mid-write.

Reproduced deliberately: re-bundling in a loop while running that one file
fails 5 times out of 5, and the same file passes 6 times out of 6 on a
quiet tree.

**A test that reads a generated artifact is correct and not self-contained.**
Reading the artifact is the point, and section 2.8 argues for more of it,
not less. In CI the build completes before the tests start, so the order is
safe there. Locally it is only safe if nothing else is writing. Before
treating an intermittent failure as flakiness, check what else was running.

### 2.7d Mutation-Prove a Structure Check Against the Code It Missed

A structure check has no unit test here, because the scripts run their work
at module load and cannot be imported. The evidence that an extended gate
catches anything is therefore a mutation, and the best mutation is already
in the history: the code the gate failed to catch.

For `check-fabricated-reads.mjs` on 2026-10-16 that was a three-step run.
Copy the fixed file aside, restore the shipped one with
`git show HEAD:<path>`, run the gate, then put the fixed file back and run
it again. The first run must fail and name the lines, the second must pass.

```bash
cp components/spinemap/spinemap.ts "$SCRATCH/fixed.ts"
git show HEAD:components/spinemap/spinemap.ts > components/spinemap/spinemap.ts
node scripts/check-fabricated-reads.mjs          # must FAIL
cp "$SCRATCH/fixed.ts" components/spinemap/spinemap.ts
node scripts/check-fabricated-reads.mjs          # must PASS
```

**Report the count the mutation actually produced.** That run caught 9 of
the 10 removed fallbacks. SymbolPicker escaped, because it fabricated
through a field rather than an object literal. Recording 10 would have
described the gate as complete, and a gate described as complete stops being
re-examined.

**A gate extension also needs the clean run.** Passing on 137 sources with
no new violation is what separates a gate from a tripwire, and it has to be
observed after the extension rather than assumed from the fix.

### 2.7e Test a Refusal That Is Thrown Out of Band

A throw only reaches `expect(...).toThrow()` when the test is on the call
stack. Two of the refusals added for FALLBACK-9 are not.

- **RibbonBuilder** throws inside the icon button's `click` listener.
  jsdom catches a listener exception and reports it rather than letting
  it escape `element.click()`.
- **DiagramEngine** throws inside a `requestAnimationFrame` callback,
  because an embed mounts after the `foreignObject` is in the DOM.

In both cases the error arrives as an uncaught one on `window`. Vitest
counts an uncaught error as a run failure and exits 1 **with every test
reported green**, which is the `4cbea9e` failure class. The test must
therefore capture it:

```ts
const errors: unknown[] = [];
const onError = (e: ErrorEvent): void =>
{
    e.preventDefault();
    errors.push(e.error);
};

window.addEventListener("error", onError);
// ... click, or await two animation frames ...
window.removeEventListener("error", onError);

expect((errors[0] as Error).message).toMatch(/what it should say/);
```

`preventDefault()` is the part that matters: it marks the error handled so
the runner does not fail the file. Register the listener **before** the
action and remove it after, or an unrelated error later in the file lands
in the same array.

Two frames, not one. The mount is scheduled from inside a frame callback,
so the work happens on the frame after the one the test schedules.

**The check is the exit code of `vitest run --coverage`, not the tick next
to the test name.** A test that asserts a refusal can pass while the run
it belongs to fails.

### 2.7f A Generated Preamble Makes the Source a Hypothesis

`scripts/bundle-diagramengine.sh` concatenates thirty files from
`components/diagramengine/src/` into one IIFE. Thirty files cannot each
declare `const CLS`, so the script emits its OWN preamble of sixteen shared
constants and then greps each module to strip that module's declaration of
the same name. The build works. The cost is that a constant in a `src` file
is deleted before it ships, and nothing compared the two values.

`MAX_ZOOM` read `4.0` in `render-engine.ts` and ships as `32.0`.
`ROTATION_HANDLE_OFFSET` read `24` there against `25` in `tool-select.ts`.
The README, the bundle and the suite all agreed on 32x. **One source
constant disagreed with every other record of the same fact, and the
constant is what a reader opens first.**

`bundlePreambleMismatches` in `scripts/audit-counts.mjs` reads the `echo`
lines of the bundler, reads every `^const NAME = VALUE;$` in `src/`, and
reports each pair that shares a name and not a value. It is a **ceiling at
0**, not a floor. A module that stops declaring a local copy is fine, and a
module that declares one is fine. What must never happen is a local copy
that lies.

**Mutation-proven** by setting `MAX_ZOOM` back to `4.0`, which fails the
gate by name, and by renaming the bundler's `echo` so the pair no longer
matches, which passes and is correct.

A gate that reads a generated artifact belongs with 2.7c: run it on a quiet
tree, because the artifact is rewritten during `npm run build`.

### 2.8 Verify a Type-Only Change by Its Compiled Output

Some changes are supposed to leave the program alone. A cast removed, a symbol
renamed, an `import type` added, a line reflowed. The usual evidence is a green
test suite, and for this class of change it is weaker than it looks. A passing
suite says the paths the tests cover still behave the same way. It says nothing
about the paths they do not cover, and a refactor that touches 110 files
touches plenty of those.

**Build before, build after, and diff the emitted output.**

```bash
npm run build:ts
cp -R dist/components /tmp/before-components
# ... make the change ...
npm run build:ts
diff -rq /tmp/before-components dist/components
```

WIN-1 phase A ran this across 110 files and all 126 bundles came back
byte-for-byte identical. That is a different kind of claim from "the tests
pass". It says no path changed, because the program the browser downloads is
the same program. When the diff is not empty, the change was not type-only and
the suite would not have told you.

Two limits. The output has to be deterministic, so a build that stamps a
timestamp or a hash into the bundle needs that file excluded or the stamp
pinned. And an empty diff proves only that behavior did not change. It does not
prove the change was correct, so the compiler and the suite still have to run.

**The same method covers generated documentation, and there it caught a real
one.** WIN-1 phase B removed the cast from 38 `(window as any)["Name"] = Name`
registrations. `extractGlobals` in `scripts/generate-docs.js` recognized a cast
by its parentheses and a bare `window` by dot access, so the converted line
matched neither rule. Snapshot, convert, regenerate, diff: 14 components would
have reported `Globals: none` and 38 published names would have vanished from
`docs/AGENT_QUICK_REF.md`.

Check `[19]` passed through all of it. It verifies that every published name
exists in the built artifact, which is a guard against fiction and not against
silence — a name that stops being published is not a name it checks. **A check
that validates the entries on a list cannot tell you the list got shorter.**
Pair it with a snapshot diff of the generated file, and require every
difference to be one you can name out loud. The three that survived here were
`__sidebarManager`, `__tabbedPanelManager` and `__navRailManager`, removed on
purpose because a debugging slot is not public API.

---

### 2.9 Confirm a Surprising Measurement With a Second Method

A check script is code, and an inline one is code nobody read.

While closing WIN-2 an inline `node -e` check reported that 25
alias-published names were missing from `docs/AGENT_QUICK_REF.md`. That
matched a prediction made minutes earlier, so 11 files were edited to fix it
and 11 bundles changed. All 25 names were present. `extractGlobals` had
handled aliases since WIN-1, at `scripts/generate-docs.js:421`. The check was
broken: `\\b` written inside a single-quoted bash string arrives at the
`RegExp` constructor as a literal `\b`, which matches a backspace character,
so nothing could ever match. A `grep` for one name would have shown it.

Two properties should have stopped it. The result **confirmed a prediction**,
and it was **too clean**: exactly 25 of 25, with nothing partial. A real gap
in a generated document is almost never total.

The rule:

1. **Write a check to a file.** Escaping that passes through a shell twice is
   invisible at the point where it matters. A file can be read back.
2. **Confirm a surprising negative with a different tool.** If a script says
   something is missing, `grep` for it before acting.
3. **Treat agreement with your hypothesis as a reason to look harder**, not
   as a reason to stop. The counterfactual probe in section 2.8 is the same
   method pointed the other way: break the thing and require the check to
   notice. Here the check was already broken and nothing required it to
   prove otherwise.

This is the second escaping failure of its kind in one work stream. The first
mangled a regex inside a counterfactual probe and failed loudly with
`AssertionError`. This one failed silently and produced a plausible number,
which is the more expensive of the two.

## 3. Visual Verification

### 3.1 Manual Visual Checks

After every theme or component change:

1. Run `npm run build`.
2. Open `demo/index.html` in a browser.
3. Hard refresh (`Ctrl+Shift+R` / `Cmd+Shift+R`) to clear cached CSS.
4. Verify:
   - All existing components still render correctly (no regressions).
   - New components render as specified.
   - Colours, spacing, typography, and border radius are consistent.
   - Focus states are visible on interactive elements.
   - The page is usable at different viewport widths.

### 3.2 Cross-Browser Checks

For significant theme changes, open the demo page in all supported browsers (Chrome, Firefox, Safari, Edge) and verify consistent rendering.

### 3.3 Visual Regression Testing (Optional)

For automated visual regression, consider using Playwright's screenshot comparison:

```typescript
import { test, expect } from "@playwright/test";

test("theme demo page renders consistently", async ({ page }) =>
{
    await page.goto("file:///path/to/demo/index.html");

    // Full page screenshot comparison
    await expect(page).toHaveScreenshot("demo-page.png", {
        maxDiffPixelRatio: 0.01
    });
});

test("buttons section renders correctly", async ({ page }) =>
{
    await page.goto("file:///path/to/demo/index.html");

    const buttonsSection = page.locator("#buttons-section");
    await expect(buttonsSection).toHaveScreenshot("buttons.png");
});
```

This is useful for catching unintended visual regressions when modifying theme variables.

---

## 4. Accessibility Testing

### 4.1 Automated Checks

Use axe-core with Playwright or a browser extension to check for accessibility violations:

```typescript
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("demo page has no accessibility violations", async ({ page }) =>
{
    await page.goto("file:///path/to/demo/index.html");

    const results = await new AxeBuilder({ page }).analyze();

    expect(results.violations).toEqual([]);
});
```

### 4.2 Manual Checks

- Verify that all text meets WCAG AA contrast ratios (4.5:1 minimum).
- Tab through all interactive elements in the demo page and verify visible focus states.
- Verify that the page is usable with browser zoom at 200%.

---

## 5. Test Naming and Documentation

### 5.1 Naming Convention

Use the pattern: `FunctionName_Scenario_ExpectedBehavior`

Good names:
- `showErrorDialog_WithValidOptions_RendersDialogInContainer`
- `showErrorDialog_WithMissingContainer_LogsErrorAndReturns`
- `initComboBox_WithEmptyItems_RendersEmptyDropdown`

Avoid:
- `test1`, `dialogTest`, `itWorks`
- Names longer than 80 characters

### 5.2 Comments in Tests

Comment the **why**, not the **what**. Explain non-obvious business rules or edge cases.

```typescript
test("showErrorDialog_WithoutTitle_UsesDefaultTitle", () =>
{
    // The spec requires a fallback title of "Error" when none is provided,
    // so that the dialog is never rendered with an empty header.
    const options = { message: "Something went wrong." };

    showErrorDialog("dialog-container", options);

    const title = document.querySelector(".errordialog-title");
    expect(title?.textContent).toBe("Error");
});
```

---

## 6. CI Integration

### 6.1 Minimum CI Pipeline

At minimum, the CI pipeline should:

1. Install dependencies: `npm ci`
2. Build the theme: `npm run build`
3. Run component unit tests: `npm test`

If any step fails, the pipeline fails.

### 6.2 Extended CI Pipeline (Optional)

For more rigorous checks:

1. Install dependencies: `npm ci`
2. Build the theme: `npm run build`
3. Run component unit tests: `npm test`
4. Run visual regression tests: `npx playwright test`
5. Run accessibility tests: `npx playwright test --grep accessibility`

---

## 7. Summary Checklist

Before considering a change complete, verify:

- [ ] `npm run build` completes without errors
- [ ] `dist/css/custom.css` is generated and non-empty
- [ ] New TypeScript components have unit tests
- [ ] Unit tests pass: `npm test`
- [ ] `demo/index.html` renders correctly in a browser
- [ ] No existing components are visually broken
- [ ] Focus states are visible on interactive elements
- [ ] Text contrast meets WCAG AA (4.5:1 minimum)

## (CRITICAL) The Fleet Conformance Gate

`runtime/fleet-conformance.test.ts` enumerates every directory in `components/`
and enforces the Dynamic UI contract. It runs as part of `npm test`.

A component is one of three things, and nothing else:

1. **Migrated** — carries `<name>.manifest.ts` and passes the conformance suite.
2. **`EXEMPT`** — migration pending. Each entry carries its specific blocker
   inline. **This list reached zero on 2026-10-20 (ADR-214)** and the empty
   set stays in the file: it is where a new exemption would have to be
   written down, under the rule that a blocker states what was TRIED.
3. **`NOT_MOUNTABLE`** — permanently outside the contract (a service, an element
   builder, a boot script, a modal overlay, or a surface that renders before a
   model response can exist). Every entry MUST carry a written rationale; a test
   enforces that, so it cannot become a dumping ground.

**A new component that is not canvas-capable cannot land** without also editing
the exemption list, which is deliberately conspicuous in review.

### Writing checks that can actually fail

The conformance checker's own suite is adversarial: for every assertion it
makes there is a test proving it **fails** a component that breaks that
assertion. This is not ceremony. Two checks were silently useless until those
tests existed — `state-serialisable` compared `JSON.stringify` output on both
sides of a round trip, which discards functions identically and therefore could
never fail.

Apply the same standard to any gate you add. A gate that has never been
observed failing is not known to be a gate.

**Then mutate the fixtures too.** Mutating the thing under test proves the
gate; mutating the gate's own inputs proves the inputs, and the second
experiment is the one nobody runs. Emptying the conformance options for six
newly migrated components left three of them GREEN (ADR-160) — their shells
are chrome, and `renders-content` only asserts the host is not empty, so it is
satisfied before any data arrives.

**Swept across all seventeen glue files on 12 October 2026, seven of the
thirteen that carry mount data could be replaced with an inert key and no test
turned red.** `data-changes-render` closes that (ADR-167): it mounts a second
instance with the fixture's options stripped and compares the element sequence
and the text. A baseline that cannot mount at all is a pass, because a factory
that refuses to construct without data is the strongest proof there is that
the data reaches the DOM. All thirteen fixtures are now load-bearing.
**Eighty-four components still have nothing to compare** — of the 97
migrated, 80 have no glue file and four carry channel triggers without mount
data — so for those `renders-content` still proves only that the host is not
empty.

**Run the measurement on the real harness.** A first attempt at this sweep
reimplemented the gate's mount path in a probe file, and every component it
reported as insensitive to its fixture was the probe's own bug: three threw
because the options never reached the factory, two rendered nothing because
the probe's `mountMethod` handling was wrong, and a signature comparison reads
two identical failures as "no difference". The sweep that produced the real
answer changed one glue file at a time and ran the gate. Insight 6.54.

### Test the artifact, not just the modules

`runtime/bundle.test.ts` tests the concatenated bundle rather than its sources,
because concatenation has failure modes the module suites structurally cannot
see: a stripped import taking a declaration with it, two modules defining the
same helper, or a top-level binding shadowing a DOM global. All three occurred.

### Integration tests earn their keep at the seams

`runtime/integration.test.ts` mounts **real** components and drives a real
binding end to end. Every unit suite stubs the pieces either side of the one
under test, so none of them can catch a seam that only fails when two real
subsystems meet — which is exactly the bug writing the demo uncovered.

### Fixtures never belong in shipped data

A manifest's `defaultOptions` is published to consumers and is what the canvas
passes when a host supplies nothing. Mount fixtures belong in
`<name>.conformance.ts` under `options`. A guard test rejects fixture
vocabulary in `defaultOptions`.

