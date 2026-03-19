<!-- AGENT: Instructions for coding agents in consumer repositories on how to discover and use the enterprise theme and its components from the CDN. -->

# Using the Enterprise Theme from the CDN

This document is intended for **coding agents and developers working in other repositories** that consume this theme. Copy the relevant sections into your project's `CLAUDE.md`, `AGENTS.md`, or equivalent agent instruction file so that agents know how to discover and use the theme and its components.

---

## 1. CDN Base URLs

The theme is built and deployed automatically on every push. All assets from the `dist/` directory are available at:

**CDN base URL:** `https://theme.priyavijai-kalyan2007.workers.dev/`

---

## 2. Asset Map

All paths below are relative to the CDN base URL.

### Core Assets (Required)

| Asset | CDN Path | Purpose |
|-------|----------|---------|
| Theme CSS | `css/custom.css` | All Bootstrap overrides, custom classes, enterprise styling |
| Bootstrap JS | `js/bootstrap.bundle.min.js` | Bootstrap 5 JavaScript (modals, dropdowns, tooltips, etc.) |
| Bootstrap Icons | `icons/bootstrap-icons.css` | Icon font for UI icons (chevrons, close, clipboard, etc.) |
| Icon Fonts | `icons/fonts/bootstrap-icons.woff2` | Icon font files (loaded automatically by the Icons CSS) |

### Component Assets (Include Only What You Use)

| Component | CSS | JS | Requires Bootstrap JS? |
|-----------|-----|-----|----------------------|
| EditableComboBox | `components/editablecombobox/editablecombobox.css` | `components/editablecombobox/editablecombobox.js` | No |
| ErrorDialog | `components/errordialog/errordialog.css` | `components/errordialog/errordialog.js` | Yes (Modal API) |

### Documentation (Machine-Readable)

| Document | CDN Path | Contents |
|----------|----------|----------|
| Component Reference | `docs/COMPONENT_REFERENCE.md` | Full API docs for every component: options, methods, events, HTML examples |
| Agent Quick Reference | `docs/AGENT_QUICK_REF.md` | Machine-parseable reference: all dist paths, design tokens, CSS classes, component APIs |
| Design Tokens | `docs/DESIGN_TOKENS.md` | All SCSS variable names and resolved values (colours, spacing, fonts, etc.) |
| Custom Classes | `docs/CUSTOM_CLASSES.md` | All custom CSS classes beyond standard Bootstrap |

---

## 3. HTML Boilerplate

### Minimal Setup (Theme Only)

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Application</title>

    <!-- Google Fonts: Open Sans (body) + JetBrains Mono (code) -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,300;0,400;0,600;0,700;1,400;1,700&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">

    <!-- Enterprise Theme -->
    <link rel="stylesheet" href="https://theme.priyavijai-kalyan2007.workers.dev/css/custom.css">
    <link rel="stylesheet" href="https://theme.priyavijai-kalyan2007.workers.dev/icons/bootstrap-icons.css">
</head>
<body>
    <!-- Your application markup here -->

    <!-- Bootstrap JS (required for modals, dropdowns, tooltips, etc.) -->
    <script src="https://theme.priyavijai-kalyan2007.workers.dev/js/bootstrap.bundle.min.js"></script>
</body>
</html>
```

### With Components

Add component CSS in the `<head>` and component JS before the closing `</body>`, after the Bootstrap JS:

```html
<head>
    <!-- ... theme CSS as above ... -->
    <link rel="stylesheet" href="https://theme.priyavijai-kalyan2007.workers.dev/components/editablecombobox/editablecombobox.css">
    <link rel="stylesheet" href="https://theme.priyavijai-kalyan2007.workers.dev/components/errordialog/errordialog.css">
</head>
<body>
    <!-- ... -->
    <script src="https://theme.priyavijai-kalyan2007.workers.dev/js/bootstrap.bundle.min.js"></script>
    <script src="https://theme.priyavijai-kalyan2007.workers.dev/components/editablecombobox/editablecombobox.js"></script>
    <script src="https://theme.priyavijai-kalyan2007.workers.dev/components/errordialog/errordialog.js"></script>
</body>
```

---

## 4. Agent Discovery Protocol

Coding agents working in consumer repositories should follow this protocol to discover what is available in the theme and how to use it.

### Step 1: Fetch the Agent Quick Reference

Fetch `https://theme.priyavijai-kalyan2007.workers.dev/docs/AGENT_QUICK_REF.md` and parse it. This file contains:

- All `dist/` asset paths (CSS, JS, icons, components)
- All SCSS design tokens with resolved values (colours, spacing, fonts, border radius, etc.)
- All custom CSS classes beyond standard Bootstrap
- All component names with their CSS and JS paths

This is the fastest way to orient yourself.

### Step 2: Fetch the Component Reference

If you need to use a specific component, fetch `https://theme.priyavijai-kalyan2007.workers.dev/docs/COMPONENT_REFERENCE.md`. This file contains:

- An index table listing every component with its CSS and JS paths
- Full documentation for each component: purpose, quick start examples, configuration options with types and defaults, instance methods, keyboard interactions, accessibility notes, and dependencies

This is the single source of truth for component APIs.

### Step 3: Fetch Design Tokens (if styling)

If you are writing custom CSS that should be consistent with the theme, fetch `https://theme.priyavijai-kalyan2007.workers.dev/docs/DESIGN_TOKENS.md` to get all variable names and values. Use the same colour values, spacing scale, font sizes, and border radius (zero) to maintain visual consistency.

### Step 4: Check Custom Classes

Before writing custom CSS, fetch `https://theme.priyavijai-kalyan2007.workers.dev/docs/CUSTOM_CLASSES.md` to check whether a utility class already exists for what you need. Classes like `.metric-card`, `.toolbar`, `.table-enterprise`, `.card-compact`, `.badge-status`, etc. may already solve your use case.

---

## 5. Instructions for Consumer CLAUDE.md / AGENTS.md

Copy and adapt the following block into your project's agent instruction file:

```markdown
## Enterprise Theme

This application uses the enterprise Bootstrap 5 theme hosted on our CDN.

**CDN base URL:** `https://theme.priyavijai-kalyan2007.workers.dev/`

**Before writing any frontend code:**
1. Fetch `https://theme.priyavijai-kalyan2007.workers.dev/docs/AGENT_QUICK_REF.md` to understand
   available assets, design tokens, CSS classes, and components.
2. If you need a component (combo box, error dialog, etc.), fetch
   `https://theme.priyavijai-kalyan2007.workers.dev/docs/COMPONENT_REFERENCE.md` for the full API
   documentation including options, methods, and usage examples.

**When writing HTML pages:**
- Always include the theme CSS: `https://theme.priyavijai-kalyan2007.workers.dev/css/custom.css`
- Always include Bootstrap Icons: `https://theme.priyavijai-kalyan2007.workers.dev/icons/bootstrap-icons.css`
- Always include Bootstrap JS: `https://theme.priyavijai-kalyan2007.workers.dev/js/bootstrap.bundle.min.js`
- Include the Google Fonts link for Open Sans and JetBrains Mono.
- Include component CSS and JS only for components you actually use.

**When writing custom CSS:**
- Use the design token values from DESIGN_TOKENS.md (do not invent colours or sizes).
- Border radius is always 0 (square corners).
- Base font size is 14px (0.875rem). Base spacer is 12px (0.75rem).
- Check CUSTOM_CLASSES.md before writing new utility classes.

**Component usage pattern (script tag):**
- Components expose global functions on `window` (e.g., `createEditableComboBox`,
  `showErrorDialog`).
- Include the component's CSS in `<head>` and JS before `</body>`.
- Each component's JS file is self-contained; no bundler required.
```

---

## 6. Component Usage Examples

### EditableComboBox

```html
<div id="country-selector"></div>

<script src="https://theme.priyavijai-kalyan2007.workers.dev/components/editablecombobox/editablecombobox.js"></script>
<script>
    var combo = createEditableComboBox("country-selector", {
        items: [
            { label: "Australia" },
            { label: "Canada" },
            { label: "Germany" },
            { label: "United Kingdom" }
        ],
        placeholder: "Select a country...",
        onSelect: function(item) {
            console.log("User selected:", item.label);
        }
    });

    // Programmatic access
    combo.getValue();           // Returns current input text
    combo.getSelectedItem();    // Returns selected ComboBoxItem or null
    combo.setValue("Canada");    // Set value programmatically
    combo.setItems([...]);      // Replace items dynamically
</script>
```

### ErrorDialog

```html
<div id="error-container"></div>

<script src="https://theme.priyavijai-kalyan2007.workers.dev/js/bootstrap.bundle.min.js"></script>
<script src="https://theme.priyavijai-kalyan2007.workers.dev/components/errordialog/errordialog.js"></script>
<script>
    showErrorDialog("error-container", {
        title: "Upload Failed",
        message: "The file could not be uploaded to the server.",
        suggestion: "Check your connection and try again.",
        errorCode: "UPLOAD_TIMEOUT",
        correlationId: "a1b2c3d4-e5f6-7890",
        onRetry: function() {
            retryUpload();
        }
    });
</script>
```

---

## 7. TypeScript Consumers

The CDN also serves TypeScript declaration files (`.d.ts`) for each component:

- `components/editablecombobox/editablecombobox.d.ts`
- `components/errordialog/errordialog.d.ts`

These can be referenced in a `tsconfig.json` for type checking:

```json
{
    "compilerOptions": {
        "typeRoots": [],
        "paths": {
            "editablecombobox": ["./types/editablecombobox.d.ts"]
        }
    }
}
```

Download the `.d.ts` files into your project's type definitions folder, or reference them directly if your toolchain supports URL-based type resolution.

---

## 8. Versioning and Cache

- The CDN serves the latest build. There is no versioned URL scheme at this time.
- Cloudflare Pages handles caching and cache invalidation automatically on deploy.
- If you need to force a fresh fetch during development, append a cache-busting query parameter: `?v=20260210`.

---

## 9. Live Demo

A live demonstration of all theme components is available at:

- `https://theme.priyavijai-kalyan2007.workers.dev/` (the demo `index.html` is deployed as the root page)

Agents and developers can reference this page to see how components look and behave.
