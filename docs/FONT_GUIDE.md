<!-- AGENT: Font loading, configuration, and swapping guide for the enterprise theme. -->

# Font Guide

The enterprise theme uses two Google Fonts for optimal screen readability at compact sizes.

## Current Fonts

| Role | Font | Why |
|------|------|-----|
| Body text | **Inter** | Screen-optimised variable sans-serif with excellent legibility at 14px. Designed specifically for computer screens by Rasmus Andersson. Used by Figma, GitHub, Linear. |
| Monospace / code | **JetBrains Mono** | Clear distinction between similar characters (0/O, 1/l/I). Designed for developers. |

Both fonts fall back to system fonts if Google Fonts is unavailable.

### SCSS Variables

```scss
// src/scss/_variables.scss
$font-family-sans-serif: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI",
                          Roboto, "Helvetica Neue", Arial, sans-serif !default;

$font-family-monospace:  "JetBrains Mono", "SF Mono", Monaco, "Cascadia Code",
                          "Roboto Mono", Consolas, "Courier New", monospace !default;
```

## Loading Fonts

Add this to the `<head>` of every HTML page **before** the theme CSS:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
```

The `preconnect` hints tell the browser to establish connections early, reducing font load time. The `display=swap` parameter ensures text is visible immediately with fallback fonts, then swaps to the loaded font.

Inter is a variable font — the single file supports all weights from 100 to 900, plus an optical size axis (`opsz`) that automatically optimises letterforms for different sizes.

## How to Swap to a Different Font

### Step 1: Update the Google Fonts link

Replace the `href` in the `<link>` tag. Use [Google Fonts](https://fonts.google.com/) to generate the URL for your chosen font.

### Step 2: Update `_variables.scss`

Change the font family variable to your new font name:

```scss
// Example: switching body text to DM Sans
$font-family-sans-serif: "DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI",
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
| DM Sans | Sans-serif | Geometric, clean, excellent at small UI sizes |
| Public Sans | Sans-serif | Neutral, high-trust corporate/government feel |
| Geist Sans | Sans-serif | Vercel's font, modern and technical |
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
    font-family: "Inter";
    src: url("../fonts/Inter-Variable.woff2") format("woff2");
    font-weight: 100 900;
    font-style: normal;
    font-display: swap;
}
// Repeat for italic if needed.
```

4. Remove the Google Fonts `<link>` tags from your HTML.
5. Rebuild: `npm run build`.

## Decision Record

The font choice is documented in **ADR-009** (`agentknowledge/decisions.yaml`). The previous font (Open Sans) was superseded for Inter's superior screen optimisation, variable font support, and modern SaaS alignment.
