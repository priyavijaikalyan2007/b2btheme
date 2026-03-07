<!-- AGENT: Integration guide for developers consuming the enterprise Bootstrap theme. -->

# Getting Started

A guide for integrating the Enterprise Bootstrap Theme into your project.

## What You Get

The `dist/` directory contains everything you need:

| Path | Purpose |
|------|---------|
| `css/custom.css` | Compiled theme CSS (Bootstrap 5 + enterprise overrides) |
| `js/bootstrap.bundle.min.js` | Bootstrap 5 JavaScript bundle (includes Popper.js) |
| `icons/bootstrap-icons.css` | Bootstrap Icons CSS |
| `icons/fonts/` | Bootstrap Icons font files |
| `components/errordialog/errordialog.css` | ErrorDialog component styles |
| `components/errordialog/errordialog.js` | ErrorDialog component script |
| `docs/` | This documentation (HTML) |

## Minimal HTML Boilerplate

Copy this into your HTML file to start using the theme:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My App</title>

    <!-- Google Fonts: Inter (body) + JetBrains Mono (code) -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">

    <!-- Bootstrap Icons -->
    <link rel="stylesheet" href="icons/bootstrap-icons.css">

    <!-- Enterprise Theme CSS -->
    <link rel="stylesheet" href="css/custom.css">
</head>
<body>
    <div class="container py-4">
        <h1>Hello, Enterprise Theme</h1>
        <p>Your content here.</p>
        <button class="btn btn-primary">Action</button>
    </div>

    <!-- Bootstrap JS -->
    <script src="js/bootstrap.bundle.min.js"></script>
</body>
</html>
```

## Loading Order

The load order matters:

1. **Google Fonts** — must come before any CSS so fonts are available when styles are parsed.
2. **Bootstrap Icons CSS** — if you use icons anywhere.
3. **Theme CSS** (`custom.css`) — contains Bootstrap 5 + all enterprise overrides.
4. **Component CSS** — load per-component CSS only if you use that component.
5. **Bootstrap JS** — at the end of `<body>` for modals, dropdowns, tooltips, etc.
6. **Component JS** — after Bootstrap JS, since components depend on its Modal/Collapse APIs.

## Adding a Component (ErrorDialog example)

```html
<!-- Additional CSS in <head> -->
<link rel="stylesheet" href="components/errordialog/errordialog.css">

<!-- Additional JS before </body> -->
<script src="components/errordialog/errordialog.js"></script>

<!-- Container element somewhere in <body> -->
<div id="error-dialog-container"></div>

<!-- Trigger an error dialog -->
<script>
    showErrorDialog("error-dialog-container", {
        title: "Connection Lost",
        message: "The server is not responding. Your changes have been saved locally.",
        suggestion: "Check your network connection and try again.",
        errorCode: "NET_TIMEOUT",
        correlationId: "a1b2c3d4-e5f6-7890"
    });
</script>
```

See the [Component Reference](COMPONENT_REFERENCE.md) for full API documentation.

## Verification Checklist

After integrating, verify these items:

- [ ] Page renders with Inter body text (not browser default serif/sans-serif)
- [ ] Code blocks render in JetBrains Mono
- [ ] Buttons, cards, and inputs have square corners (no border radius)
- [ ] The base font size is 14px (check with DevTools > Computed styles)
- [ ] Bootstrap Icons display correctly (e.g. `<i class="bi bi-check-circle"></i>`)
- [ ] Bootstrap JS works (test a dropdown or modal)
- [ ] No console errors related to missing fonts or scripts

## Theme Design Principles

This theme is designed for enterprise SaaS applications with these characteristics:

- **14px base font** — compact but readable with Inter
- **0.75rem spacer** — tighter than Bootstrap default for data-dense layouts
- **Zero border radius** — sharp, professional edges on all components
- **Enterprise colour palette** — muted blues, grays, and status colours
- **WCAG AA accessible** — proper contrast ratios, focus states, and semantic markup

See [DESIGN_TOKENS.md](DESIGN_TOKENS.md) for every customisable variable.

## Next Steps

- [Design Tokens](DESIGN_TOKENS.md) — all SCSS variables and their values
- [Custom Classes](CUSTOM_CLASSES.md) — enterprise CSS classes reference
- [Component Reference](COMPONENT_REFERENCE.md) — component APIs and usage
- [Font Guide](FONT_GUIDE.md) — font setup, loading, and swapping
- [Customization Guide](CUSTOMIZATION_GUIDE.md) — how to override the theme
