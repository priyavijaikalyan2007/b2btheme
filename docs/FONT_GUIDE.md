<!-- AGENT: Font loading, configuration, and swapping guide for the enterprise theme. -->

# Font Guide

The enterprise theme uses two Google Fonts for optimal screen readability at compact sizes.

## Current Fonts

| Role | Font | Why |
|------|------|-----|
| Body text | **Open Sans** | Clean, legible, optimised for screen readability at 14px. Wide language support. |
| Monospace / code | **JetBrains Mono** | Clear distinction between similar characters (0/O, 1/l/I). Designed for developers. |

Both fonts fall back to system fonts if Google Fonts is unavailable.

### SCSS Variables

```scss
// src/scss/_variables.scss
$font-family-sans-serif: "Open Sans", -apple-system, BlinkMacSystemFont, "Segoe UI",
                          Roboto, "Helvetica Neue", Arial, sans-serif !default;

$font-family-monospace:  "JetBrains Mono", "SF Mono", Monaco, "Cascadia Code",
                          "Roboto Mono", Consolas, "Courier New", monospace !default;
```

## Loading Fonts

Add this to the `<head>` of every HTML page **before** the theme CSS:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,300..800;1,300..800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
```

The `preconnect` hints tell the browser to establish connections early, reducing font load time. The `display=swap` parameter ensures text is visible immediately with fallback fonts, then swaps to the loaded font.

## How to Swap to a Different Font

### Step 1: Update the Google Fonts link

Replace the `href` in the `<link>` tag. Use [Google Fonts](https://fonts.google.com/) to generate the URL for your chosen font.

### Step 2: Update `_variables.scss`

Change the font family variable to your new font name:

```scss
// Example: switching body text to Inter
$font-family-sans-serif: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI",
                          Roboto, "Helvetica Neue", Arial, sans-serif !default;
```

### Step 3: Rebuild

```bash
npm run build
```

### Step 4: Test

Open `demo/index.html` and verify the new font renders correctly at 14px and smaller sizes. Check that character distinction is adequate for data-heavy tables and forms.

## Recommended Alternative Fonts

| Font | Type | Good For |
|------|------|----------|
| Inter | Sans-serif | Highly readable, excellent at small sizes |
| Roboto | Sans-serif | Clean, modern, wide language support |
| Source Sans 3 | Sans-serif | Adobe's open source workhorse |
| IBM Plex Sans | Sans-serif | Technical, professional feel |
| Fira Code | Monospace | Ligatures for code |
| Source Code Pro | Monospace | Adobe's code font, very clear |

## Self-Hosting Fonts

If your application cannot load from Google Fonts (offline, intranet, privacy):

1. Download the font files from Google Fonts or the font's official site.
2. Place `.woff2` files in a local directory (e.g. `dist/fonts/`).
3. Add `@font-face` declarations in `src/scss/custom.scss` after the Bootstrap import:

```scss
@font-face {
    font-family: "Open Sans";
    src: url("../fonts/OpenSans-Regular.woff2") format("woff2");
    font-weight: 400;
    font-style: normal;
    font-display: swap;
}
// Repeat for each weight/style combination you use.
```

4. Remove the Google Fonts `<link>` tags from your HTML.
5. Rebuild: `npm run build`.

## Decision Record

The font choice is documented in **ADR-009** (`agentknowledge/decisions.yaml`). The previous font (Atkinson Hyperlegible) was superseded — see ADR-002 for the historical context.
