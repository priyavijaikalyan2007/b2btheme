# Enterprise Application theme feature requests

The Outcrop Inc website uses native Bootstrap navigation, cards, badges, buttons, containers, and responsive grid utilities.

The theme already provides ThemeToggle. The website does not need a duplicate component for any of these features.

The following components would remove reusable site-specific CSS that Bootstrap does not provide.

## Feature request: MarketingHero

### Problem

Bootstrap no longer provides a dedicated hero component. Public product sites need a consistent introduction area that uses the enterprise design tokens.

### Required behavior

- Render a semantic section with a heading, supporting text, and optional eyebrow text.
- Support one primary action and one optional secondary action.
- Provide an optional media, illustration, or callout slot.
- Support one-column and two-column layouts.
- Collapse to one column at a configurable Bootstrap breakpoint.
- Use only Enterprise Application theme tokens for colors, borders, spacing, and focus states.
- Respond automatically to `data-bs-theme="light"` and `data-bs-theme="dark"`.
- Require no JavaScript unless the consumer requests interactive content.
- Respect reduced-motion and high-contrast preferences.

### Proposed API

Provide a CSS-first component. Consumers should be able to use semantic HTML and documented classes.

```html
<section class="marketinghero marketinghero-split">
  <div class="marketinghero-content">...</div>
  <aside class="marketinghero-aside">...</aside>
</section>
```

### Acceptance criteria

- The component passes Web Content Accessibility Guidelines AA contrast checks in both themes.
- The heading remains the first item in document order.
- The layout works from 320 pixels through wide desktop screens.
- The component includes no fixed product wording, images, or analytics.
- The documentation includes light, dark, split, centered, and reduced-motion examples.

## Feature request: SiteFooter

### Problem

Bootstrap provides spacing and grid utilities, but it does not provide a semantic public-site footer component.

### Required behavior

- Render organization details, grouped navigation, legal links, contact details, and optional build information.
- Support one to four responsive columns.
- Stack columns in a logical reading order on small screens.
- Use Enterprise Application theme surface, text, border, and link tokens.
- Respond automatically to light and dark modes.
- Provide visible keyboard focus and clear visited-link states.
- Require no JavaScript.

### Proposed API

Provide semantic HTML classes and optional layout helpers.

```html
<footer class="sitefooter">
  <div class="sitefooter-grid">...</div>
  <div class="sitefooter-legal">...</div>
</footer>
```

### Acceptance criteria

- The component passes Web Content Accessibility Guidelines AA contrast checks in both themes.
- Navigation groups have accessible names.
- The mobile layout preserves the desktop reading order.
- Long organization names, translated text, and long email addresses wrap without overflow.
- The documentation includes one-column, three-column, legal, and build-information examples.
