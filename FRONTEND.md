<!-- AGENT: Frontend development guidelines for the Bootstrap 5 theme and component library. -->

# Frontend Development Guidelines

This document defines how code is written in this repository. This is a **reusable Bootstrap 5 theme and component library** — not a standalone application. All guidelines are scoped to building SCSS theme customisations and TypeScript/HTML/CSS components that consumers embed in their own projects.

---

# 1. General Principles

## 1.1. Standards Compliance

- Use HTML5 and modern ECMAScript standards.
- Prioritise native HTML capabilities over complex JavaScript solutions.
- Ensure cross-browser compatibility (latest Chrome, Firefox, Safari, Edge).
- Maintain semantic HTML structure in all component templates and demo pages.

## 1.2. Technology Stack

This repository uses a deliberately simple stack:

| Layer | Technology | Notes |
|-------|-----------|-------|
| Styling | SCSS (Sass) compiled to CSS | Bootstrap 5 variable overrides + custom component styles |
| Logic | TypeScript compiled to JavaScript | For interactive components only |
| Structure | HTML5 | Component templates and demo pages |
| Build | npm scripts, Sass CLI, PostCSS | No bundler (Webpack/Vite) unless components require it |
| Deployment | Cloudflare Pages via Wrangler | Static asset hosting |

**Do not introduce:**
- JavaScript frameworks (React, Vue, Angular, Svelte)
- CSS-in-JS solutions (styled-components, Emotion)
- Complex bundlers unless a component genuinely requires module resolution

## 1.3. Code Quality

- Use clear, descriptive naming conventions.
  - Functions: descriptive, verb-based names (e.g., `validateUserInput()`)
  - Variables: meaningful, context-specific names
  - Loop/temporary variables: short, standard names (`i`, `j`, `k`)
  - CSS classes: lowercase hyphenated (e.g., `metric-card`, `toolbar-actions`)
- Keep code simple and readable.
- Avoid unnecessary complexity or "clever" programming tricks.

## 1.4. Structure and Organisation

- Modular design: one folder per component under `./components/`.
- Functions should be focused and do one task well.
- Maximum function length: 25 lines.
- Maximum line length: 120 characters.
- Limit nesting depth to 3 levels.
- Use Allman brace style for TypeScript (see `CODING_STYLE.md`).

## 1.5. Performance Considerations

- Minimise DOM manipulations in component JavaScript.
- Use efficient selector methods (`getElementById`, `querySelector`).
- Leverage CSS for animations and transitions — avoid JavaScript animation where CSS suffices.
- Keep the compiled CSS output small; avoid generating redundant selectors.
- Do not import the entirety of a library when only a small part is needed.

## 1.6. Accessibility

- Implement WCAG 2.1 AA guidelines.
- Provide clear focus states on all interactive elements.
- Use semantic HTML elements (`<button>`, `<nav>`, `<table>`, not styled `<div>`s).
- Include appropriate ARIA attributes in component templates.
- Ensure keyboard navigability for all interactive components.

## 1.7. Error Handling

- Use try-catch blocks in component TypeScript where DOM operations could fail.
- Log errors using `console.error` with the `[ComponentName]` prefix (see `LOGGING.md`).
- Never use `window.alert()` or `window.confirm()` in component code.
- Fail gracefully: if a component cannot initialise, log the error and leave the DOM unchanged.

---

# 2. SCSS and Styling

## 2.1. Theme Architecture

The theme is built on Bootstrap 5 variable overrides:

```
src/scss/
├── _variables.scss    # All Bootstrap variable overrides
└── custom.scss        # Imports variables, then Bootstrap, then custom styles
```

The build pipeline: `SCSS → CSS → PostCSS (autoprefixer) → dist/css/custom.css`

## 2.2. Styling Rules

1. **Override Bootstrap variables first.** Change colours, spacing, fonts, and radii via `_variables.scss` rather than writing custom CSS that fights Bootstrap defaults.
2. **Write custom CSS only when Bootstrap provides no variable.** For example, the `.metric-card` and `.toolbar` styles have no Bootstrap equivalent, so custom SCSS is appropriate.
3. **Use Bootstrap's semantic variable names** (`$primary`, `$gray-100`, `$font-size-sm`) in custom styles. Never hardcode hex codes or pixel values that have a variable equivalent.
4. **Use consistent units.** Follow the spacing scale defined in `_variables.scss`. Do not introduce arbitrary pixel values.
5. **Prefer composition over complexity.** Combine existing Bootstrap utility classes in HTML rather than writing new CSS when possible.

## 2.3. Component Styling

Each custom component in `./components/<name>/` should have its own SCSS file:

```
components/
├── errordialog/
│   ├── errordialog.scss      # Component-specific styles
│   ├── errordialog.html      # Template / demo markup
│   └── errordialog.ts        # Component logic
```

Component SCSS rules:
- Prefix all custom classes with the component name (e.g., `.errordialog-header`, `.errordialog-body`).
- Import shared theme variables from `../../src/scss/variables` if needed.
- Keep component styles self-contained; do not modify global Bootstrap styles from a component file.

---

# 3. TypeScript Components

## 3.1. When to Use TypeScript

TypeScript is used only for **interactive components** that require logic beyond what CSS and HTML provide. Examples:

- An error dialog that accepts structured error data and renders it
- An editable combo box with filtering and keyboard navigation
- A tree-view checkbox component with expand/collapse logic

If a component is purely visual (styling only), it needs no TypeScript.

## 3.2. Component Pattern

```typescript
/*
 * ⚓ COMPONENT: ErrorDialog
 * 📜 PURPOSE: Renders literate error messages in a Bootstrap modal.
 * 🔗 RELATES: [[LiterateErrors]]
 */

/**
 * Configuration options for the ErrorDialog component.
 */
interface ErrorDialogOptions
{
    title: string;
    message: string;
    suggestion?: string;
    technicalDetail?: string;
    errorCode?: string;
}

/**
 * Displays a structured error dialog using Bootstrap's modal.
 *
 * @param containerId - The DOM element ID where the modal will be injected
 * @param options - The error information to display
 */
function showErrorDialog(containerId: string, options: ErrorDialogOptions): void
{
    const container = document.getElementById(containerId);
    if (!container)
    {
        console.error("[ErrorDialog] Container element not found:", containerId);
        return;
    }

    console.log("[ErrorDialog] Initialised");
    console.debug("[ErrorDialog] Options:", options);

    // Component logic here
}
```

## 3.3. TypeScript Rules

- All component JavaScript must be written in TypeScript and compiled to JavaScript.
- Use strict mode (`"strict": true` in `tsconfig.json`).
- Export a clear public API; keep internals private.
- Do not import logging frameworks — use `console.*` directly (see `LOGGING.md`).
- Do not import UI frameworks (React, Vue, jQuery).
- Bootstrap's JavaScript API (`bootstrap.Modal`, `bootstrap.Dropdown`, etc.) is available and should be used where appropriate.

---

# 4. Component Output and Distribution

## 4.1. Build Output

All component outputs are combined into `./dist/`:

```
dist/
├── css/
│   └── custom.css              # Compiled theme CSS
├── js/
│   └── bootstrap.bundle.min.js # Bootstrap JS (copied from node_modules)
├── components/
│   └── errordialog/
│       ├── errordialog.css     # Component CSS
│       └── errordialog.js      # Component JS (compiled from TS)
└── cloud-icons/                # SVG icon sets (AWS, Azure, GCP)
```

## 4.2. Integration by Consumers

Consumers of this library include the theme CSS and any component files they need:

```html
<!-- Google Fonts -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap"
      rel="stylesheet">

<!-- Theme CSS -->
<link rel="stylesheet" href="path/to/dist/css/custom.css">

<!-- Bootstrap JS -->
<script src="path/to/dist/js/bootstrap.bundle.min.js"></script>

<!-- Component JS (only if using that component) -->
<script src="path/to/dist/components/errordialog/errordialog.js"></script>
```

---

# 5. Demo Pages

## 5.1. Purpose

The `demo/` folder contains HTML pages that showcase the theme and all components. These pages serve as:

- Visual verification that the theme renders correctly after changes.
- Living documentation for consumers of the library.
- A test surface for visual regression checks.

## 5.2. Demo Page Rules

- Every custom component must have a demo section in `demo/index.html` or its own demo page.
- Demo pages must load the compiled CSS from `dist/`, not import SCSS directly.
- Demo pages must include the Google Fonts link for Atkinson Hyperlegible.
- Demo pages must be functional without a web server (open directly in a browser via `file://`).

---

# 6. Browser Compatibility

Support the latest versions of:

- Chrome
- Firefox
- Safari
- Edge

Do not support Internet Explorer. Use modern CSS features (Grid, Flexbox, custom properties) freely. The PostCSS autoprefixer handles vendor prefixes for supported browsers.

---

# 7. Security Considerations

Even as a static library, security matters:

- Sanitise any user-provided content before injecting it into the DOM in component TypeScript. Use `textContent` instead of `innerHTML` where possible.
- Do not include inline event handlers (`onclick="..."`) in component HTML templates.
- Do not embed external scripts or load resources from third-party domains (except Google Fonts).
- Do not store or transmit any data. This is a presentation library.
