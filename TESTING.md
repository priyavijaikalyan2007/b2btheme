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

---

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
