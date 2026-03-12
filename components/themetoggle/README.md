<!-- AGENT: Component documentation for ThemeToggle -->

# ThemeToggle

Compact three-state theme switcher — **Light**, **Auto** (OS preference), and **Dark**.  Sets `data-bs-theme` on `<html>` for Bootstrap 5 dark mode.  Does not persist preferences; the host application controls storage via `defaultTheme` and the `onChange` callback.

## Assets

| Asset | Path |
|-------|------|
| CSS   | `components/themetoggle/themetoggle.css` |
| JS    | `components/themetoggle/themetoggle.js` |
| Types | `components/themetoggle/themetoggle.d.ts` |

## Requirements

- Bootstrap Icons (for `bi-sun`, `bi-circle-half`, `bi-moon-fill`)
- Enterprise theme CSS (`custom.css` which includes dark-mode tokens)

## Quick Start

```html
<link rel="stylesheet" href="components/themetoggle/themetoggle.css">
<script src="components/themetoggle/themetoggle.js"></script>

<div id="theme-toggle"></div>

<script>
    var toggle = createThemeToggle({
        container: document.getElementById("theme-toggle"),
        defaultTheme: "auto",
        onChange: function(theme, mode) {
            console.log("Theme:", theme, "Mode:", mode);
            // Persist `mode` to localStorage, cookie, or server
        }
    });
</script>
```

### FOUC Prevention

Place this inline script in `<head>` **before** any CSS to prevent a flash of unstyled content:

```html
<script>
(function() {
    var mode = localStorage.getItem("theme-mode") || "auto";
    var dark = mode === "dark" ||
               (mode === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
    if (dark) document.documentElement.setAttribute("data-bs-theme", "dark");
})();
</script>
```

## API

### `createThemeToggle(options): ThemeToggleHandle`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `container` | `HTMLElement` | — | **Required.** Element to render the toggle into. |
| `defaultTheme` | `"light" \| "dark" \| "auto"` | `"auto"` | Initial mode. "auto" reads OS preference. |
| `onChange` | `(theme, mode) => void` | — | Fires when resolved theme changes. `theme` is `"light"` or `"dark"`; `mode` is the selected mode. |

### ThemeToggleHandle

| Method | Returns | Description |
|--------|---------|-------------|
| `getTheme()` | `"light" \| "dark"` | Current resolved theme. |
| `getMode()` | `"light" \| "dark" \| "auto"` | Current selected mode. |
| `setTheme(mode)` | `void` | Programmatically change mode. |
| `destroy()` | `void` | Remove DOM and event listeners. |

## Keyboard

| Key | Action |
|-----|--------|
| Tab | Move focus between toggle buttons |
| Enter / Space | Activate focused button |

## Accessibility

- Button group uses `role="group"` with `aria-label="Theme switcher"`
- Each button has `aria-pressed` and `aria-label`
- Focus ring visible via `:focus-visible`
- OS preference changes are detected in real-time when mode is "auto"
