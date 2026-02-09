<!-- AGENT: Project README — overview, setup, build, and deployment for the enterprise Bootstrap 5 theme. -->

# Enterprise Bootstrap Theme

A compact, professional Bootstrap 5 theme optimized for enterprise SaaS applications. This theme reduces the default Bootstrap spacing, sizes, and rounded corners to save screen real estate while maintaining accessibility standards.

## 📚 New to Web Development?

**This project includes extensive beginner-friendly documentation!**

If you're new to HTML, CSS, SCSS, Bootstrap, or web development in general:

### 🚀 **[QUICK START](QUICK_START.md)** - Get up and running in 30 minutes!
Follow this step-by-step guide to make your first customization, even if you've never coded before.

### 📖 **[Complete Documentation](docs/INDEX.md)** - Your learning roadmap

**Recommended starting points:**
- **Complete Beginner?** Start with [BEGINNERS_GUIDE.md](docs/BEGINNERS_GUIDE.md) - Explains everything from scratch
- **Know some web dev?** Go to [CUSTOMIZATION_GUIDE.md](docs/CUSTOMIZATION_GUIDE.md) - Deep dive into customization
- **Having problems?** Check [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) - Common issues and solutions
- **Need definitions?** See [GLOSSARY_AND_FAQ.md](docs/GLOSSARY_AND_FAQ.md) - Terms and FAQs

All documentation is written for beginners with detailed explanations, examples, and step-by-step instructions.

---

## Features

- **Compact Design**: 14px base font with reduced padding (15-20% smaller) to maximize screen real estate
- **Square Design**: Zero border radius on all components for a sharp, professional appearance
- **Open Sans + JetBrains Mono**: Google Fonts loaded for clean body text and clear monospace code
- **Enterprise Color Palette**: Professional blues, grays, blacks, reds, and greens instead of default bright colors
- **Accessibility First**: WCAG AA compliant with proper contrast ratios, focus states, and legible typography
- **Custom Components**: Additional enterprise-focused components like metric cards, toolbars, and status badges
- **Responsive**: Mobile-first approach with responsive breakpoints

## Quick Start

### Installation

```bash
npm install
```

### Build the Theme

```bash
npm run build
```

This will:
1. Compile SCSS to CSS
2. Add vendor prefixes with autoprefixer
3. Copy Bootstrap JavaScript files to dist/

**Note:** Build runs cleanly without deprecation warnings. See [ABOUT_DEPRECATION_WARNINGS.md](docs/ABOUT_DEPRECATION_WARNINGS.md) for technical details.

### Development Mode

For active development with file watching:

```bash
npm run dev
```

This will build the theme and watch for SCSS changes.

### View Demo

Open `demo/index.html` in your browser to see all components in action.

## Project Structure

```
.
├── src/
│   └── scss/
│       ├── _variables.scss    # Custom variable overrides
│       └── custom.scss         # Main theme file
├── dist/
│   ├── css/
│   │   └── custom.css         # Compiled CSS (generated)
│   └── js/
│       └── bootstrap.bundle.min.js  # Bootstrap JS (copied)
├── demo/
│   └── index.html             # Demo page
├── package.json
├── postcss.config.js
└── README.md
```

## Customization Guide

### Color Palette

The theme uses an enterprise-focused color palette defined in `src/scss/_variables.scss`:

**Primary Blues**: For primary actions and links
- Blue 900: `#0a2540` (darkest)
- Blue 600: `#1c7ed6` (primary)
- Blue 300: `#74c0fc` (lightest)

**Grays**: For text, backgrounds, and borders
- Gray 900: `#0f172a` (almost black)
- Gray 500: `#64748b` (medium)
- Gray 100: `#f1f5f9` (light background)

**Status Colors**:
- Success (Green): `#52b788`
- Error (Red): `#dc2626`
- Warning (Yellow): `#f59e0b`

### Spacing Scale

The spacing scale is reduced from Bootstrap's default:

- Spacer base: `0.75rem` (12px) instead of `1rem` (16px)
- Spacer 1: `3px`
- Spacer 2: `6px`
- Spacer 3: `12px`
- Spacer 4: `18px`
- Spacer 5: `24px`

### Typography

**Font Sizes** (reduced from default):
- Base: `0.875rem` (14px) instead of 16px
- Small: `0.75rem` (12px)
- Large: `1rem` (16px)

**Headings**:
- H1: `1.575rem` (~25px)
- H2: `1.35rem` (~22px)
- H3: `1.17rem` (~19px)
- H4: `1.035rem` (~17px)
- H5: `1rem` (16px)
- H6: `0.875rem` (14px)

### Border Radius

- Default: `0` (square) — no rounded corners
- Small: `0` (square)
- Large: `0` (square)
- Pill: `0` (square)

### Component Sizes

All components have reduced padding:

**Buttons**:
- Padding: `0.375rem 0.75rem` (6px 12px)
- Small: `0.25rem 0.5rem` (4px 8px)
- Large: `0.5rem 1rem` (8px 16px)

**Form Inputs**:
- Padding: `0.375rem 0.75rem`
- Border radius: `0` (square)

**Tables**:
- Cell padding: `0.375rem 0.75rem`
- Small: `0.25rem 0.5rem`

## Custom Components

### Metric Cards

Display key metrics in a compact, professional format:

```html
<div class="metric-card">
  <div class="metric-label">Total Users</div>
  <div class="metric-value">24,589</div>
  <div class="metric-change positive">+12.5% from last month</div>
</div>
```

### Status Badges

Enterprise status indicators:

```html
<span class="badge badge-status status-active">Active</span>
<span class="badge badge-status status-pending">Pending</span>
<span class="badge badge-status status-inactive">Inactive</span>
<span class="badge badge-status status-error">Error</span>
```

### Toolbar

Action bars for pages:

```html
<div class="toolbar">
  <h5 class="toolbar-title">User Management</h5>
  <div class="toolbar-actions">
    <input type="search" class="form-control form-control-sm" placeholder="Search...">
    <button class="btn btn-sm btn-primary">Add User</button>
  </div>
</div>
```

### Enterprise Tables

Data-focused table styling:

```html
<table class="table table-enterprise table-striped table-hover">
  <thead>
    <tr>
      <th>Column 1</th>
      <th>Column 2</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Data 1</td>
      <td>Data 2</td>
    </tr>
  </tbody>
</table>
```

### Sidebar Navigation

Professional sidebar layout:

```html
<nav class="sidebar">
  <ul class="nav flex-column">
    <li class="nav-item">
      <a class="nav-link active" href="#">Dashboard</a>
    </li>
    <li class="nav-item">
      <a class="nav-link" href="#">Users</a>
    </li>
  </ul>
</nav>
```

### Compact Cards

Reduced padding for dense layouts:

```html
<div class="card card-compact">
  <div class="card-header">Header</div>
  <div class="card-body">
    <p>Content with reduced padding</p>
  </div>
</div>
```

### Modal with Enterprise Header

```html
<div class="modal-header modal-header-enterprise">
  <h5 class="modal-title">Modal Title</h5>
  <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
</div>
```

## Accessibility Features

This theme maintains WCAG AA accessibility standards:

1. **Contrast Ratios**: All text colors meet minimum 4.5:1 contrast ratio
2. **Focus States**: Clear focus indicators with outline for keyboard navigation
3. **Skip Links**: Built-in skip link for keyboard users
4. **Semantic HTML**: Proper use of ARIA labels and semantic elements
5. **Screen Reader Support**: Descriptive labels and proper heading hierarchy

### Testing Focus States

All interactive elements have visible focus states:

```css
:focus-visible {
  outline: 2px solid $primary;
  outline-offset: 2px;
}
```

## Build Scripts

Available npm scripts:

- `npm run build` - Full build (CSS + JS)
- `npm run build:css` - Build CSS only
- `npm run scss` - Compile SCSS to CSS
- `npm run css` - Run postcss/autoprefixer
- `npm run copy:js` - Copy Bootstrap JS
- `npm run watch` - Watch SCSS files for changes
- `npm run dev` - Build and watch

## Browser Support

This theme supports all modern browsers:

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Customizing Further

To customize the theme:

1. Edit `src/scss/_variables.scss` to change colors, spacing, typography, etc.
2. Add custom styles to `src/scss/custom.scss` after the Bootstrap import
3. Run `npm run build` to recompile
4. Test changes in `demo/index.html`

### Example: Changing Primary Color

In `src/scss/_variables.scss`:

```scss
$primary: #your-color !default;
```

### Example: Adjusting Spacing

In `src/scss/_variables.scss`:

```scss
$spacer: 1rem !default; // Increase base spacing
```

### Example: Adding Custom Component

In `src/scss/custom.scss`:

```scss
.my-custom-component {
  padding: $spacer;
  background-color: $gray-100;
  border-radius: $border-radius;
}
```

## Integration into Your Project

### Option 1: Copy Compiled CSS

Copy `dist/css/custom.css` and `dist/js/bootstrap.bundle.min.js` into your project.

```html
<link rel="stylesheet" href="path/to/custom.css">
<script src="path/to/bootstrap.bundle.min.js"></script>
```

### Option 2: Import SCSS

Install as dependency and import the SCSS:

```scss
@import 'path/to/src/scss/custom.scss';
```

### Option 3: Use as Starting Point

Clone this repository and customize it as your project's theme foundation.

## Tips for Enterprise Applications

1. **Use Compact Components**: Leverage `.card-compact`, `.table-sm`, and `.btn-sm` for data-heavy pages
2. **Consistent Spacing**: Stick to the spacing scale (spacer-1 through spacer-8)
3. **Status Indicators**: Use status badges for clear visual feedback
4. **Data Tables**: Use `.table-enterprise` for improved readability
5. **Toolbars**: Standardize action areas with `.toolbar`
6. **Metrics**: Display KPIs with `.metric-card`

## Performance

This theme is optimized for performance:

- Google Fonts (Open Sans, JetBrains Mono) with system font fallbacks
- Minimal custom CSS on top of Bootstrap
- Single CSS file output
- Autoprefixed for browser compatibility

## License

MIT License - Feel free to use in personal or commercial projects.

## Support

For issues or questions, please refer to the demo page or Bootstrap's official documentation.

## Credits

Built on top of [Bootstrap 5](https://getbootstrap.com/) by Twitter.
