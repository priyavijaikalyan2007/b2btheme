# Complete Customization Guide

This guide shows you exactly how to customize every aspect of your Bootstrap theme. Each section includes detailed explanations and step-by-step instructions.

## Table of Contents

1. [Customizing Colors](#customizing-colors)
2. [Customizing Typography](#customizing-typography)
3. [Customizing Spacing](#customizing-spacing)
4. [Customizing Components](#customizing-components)
5. [Creating Custom Components](#creating-custom-components)
6. [Responsive Design](#responsive-design)
7. [Advanced Techniques](#advanced-techniques)

---

## Customizing Colors

### Understanding the Color System

Bootstrap and this theme use a color system with multiple shades of each color:

```
Color-100 = Lightest (good for backgrounds)
Color-200
Color-300
Color-400
Color-500 = Middle (good for text on light backgrounds)
Color-600
Color-700
Color-800
Color-900 = Darkest (good for text, headers)
```

### Step-by-Step: Change the Entire Color Scheme

Let's change from blue to teal as the primary color.

**Step 1: Define Teal Colors**

Open `src/scss/_variables.scss` and find the color definitions section (around line 10).

Add your teal colors:

```scss
// Teal colors (new!)
$teal-900: #0f5156;
$teal-800: #146169;
$teal-700: #13767e;
$teal-600: #0f8892;
$teal-500: #14b8a6;
$teal-400: #2dd4bf;
$teal-300: #5eead4;
$teal-200: #99f6e4;
$teal-100: #ccfbf1;
```

**How I created these:**
- Started with a middle teal color (#14b8a6)
- Made darker versions for 900-600 (subtracted from RGB values)
- Made lighter versions for 400-100 (added to RGB values)
- You can use online tools like "color palette generator" to help

**Step 2: Update Theme Colors**

Find the section that defines theme colors (around line 60):

Change from:
```scss
$primary: $blue-600 !default;
```

To:
```scss
$primary: $teal-600 !default;
```

**Step 3: Update Links**

Find the link color definition (around line 75):

Change from:
```scss
$link-color: $blue-700 !default;
```

To:
```scss
$link-color: $teal-700 !default;
```

**Step 4: Build and Test**

```bash
npm run build
```

Open `demo/index.html` and you'll see:
- All primary buttons are now teal
- All links are teal
- All "primary" components use teal

### Step-by-Step: Create a Custom Accent Color

Let's add an "accent" color for special buttons and components.

**Step 1: Define the Color**

In `src/scss/_variables.scss`, add:

```scss
// Custom accent color (purple)
$accent: #9333ea !default;
```

**Step 2: Create Accent Variants**

Bootstrap automatically creates light/dark variants for theme colors. Add this to create a full accent color system:

```scss
$accent: #9333ea !default;

// Create color variations (optional but recommended)
$accent-100: #f3e8ff;
$accent-200: #e9d5ff;
$accent-300: #d8b4fe;
$accent-600: #9333ea;
$accent-900: #581c87;
```

**Step 3: Add to Theme Colors Map**

Find the theme colors section and look for where colors are defined. After the existing theme colors, add:

```scss
// Add accent to the color system
$theme-colors: (
  "primary":    $primary,
  "secondary":  $secondary,
  "success":    $success,
  "info":       $info,
  "warning":    $warning,
  "danger":     $danger,
  "light":      $light,
  "dark":       $dark,
  "accent":     $accent
) !default;
```

**Note:** You need to add this BEFORE the `@import` of Bootstrap. Put it after all your variable definitions but before the line:
```scss
@import '../../node_modules/bootstrap/scss/bootstrap';
```

**Step 4: Build**

```bash
npm run build
```

**Step 5: Use Your New Color**

Now you can use accent in HTML:

```html
<button class="btn btn-accent">Accent Button</button>
<div class="bg-accent text-white p-3">Accent Background</div>
<span class="text-accent">Accent Text</span>
```

### Understanding Color Contrast for Accessibility

Colors need enough contrast to be readable:

**Good contrast (easy to read):**
- Dark text on light background: `$gray-900` on `$gray-100`
- Light text on dark background: `white` on `$gray-900`

**Bad contrast (hard to read):**
- Light text on light background: `$gray-300` on `$gray-100`
- Yellow text on white background: `$yellow-500` on `white`

**Tool to check:** Use the browser DevTools or websites like WebAIM Contrast Checker.

**Rule of thumb:**
- For body text: minimum 4.5:1 contrast ratio
- For large text (18px+): minimum 3:1 contrast ratio

---

## Customizing Typography

### Understanding Font Sizes

This theme uses `rem` units for font sizes:

```scss
$font-size-base: 0.875rem !default; // 14px
```

**How rem works:**
- `1rem` = 16px (browser default)
- `0.875rem` = 14px (0.875 × 16)
- `1.5rem` = 24px (1.5 × 16)

**Why use rem instead of px?**
- Accessibility: Users can change their browser's default font size
- Easier scaling: Change one value and everything scales proportionally

### Step-by-Step: Make All Text Larger

**Step 1:** Open `src/scss/_variables.scss`

**Step 2:** Find the typography section (around line 85):

```scss
$font-size-base: 0.875rem !default; // 14px instead of 16px
```

**Step 3:** Change to your desired size:

```scss
// For standard size (16px):
$font-size-base: 1rem !default;

// For larger text (18px):
$font-size-base: 1.125rem !default;

// For smaller text (13px):
$font-size-base: 0.8125rem !default;
```

**Step 4:** Build and test:

```bash
npm run build
```

Everything with text will scale proportionally!

### Step-by-Step: Customize Heading Sizes

**Step 1:** Open `src/scss/_variables.scss`

**Step 2:** Find the heading size definitions (around line 95):

```scss
$h1-font-size: 1.75rem !default;  // 28px
$h2-font-size: 1.5rem !default;   // 24px
$h3-font-size: 1.25rem !default;  // 20px
$h4-font-size: 1.125rem !default; // 18px
$h5-font-size: 1rem !default;     // 16px
$h6-font-size: 0.875rem !default; // 14px
```

**Step 3:** Adjust to your preference:

```scss
// For more dramatic size differences:
$h1-font-size: 2.5rem !default;   // 40px - much bigger
$h2-font-size: 2rem !default;     // 32px
$h3-font-size: 1.75rem !default;  // 28px
$h4-font-size: 1.5rem !default;   // 24px
$h5-font-size: 1.25rem !default;  // 20px
$h6-font-size: 1rem !default;     // 16px
```

**Step 4:** Build:

```bash
npm run build
```

### Step-by-Step: Change Fonts

**Step 1: Using System Fonts (Easiest)**

Open `src/scss/_variables.scss` and find:

```scss
$font-family-sans-serif: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !default;
```

This uses system fonts (already on user's computer, loads instantly).

To change the order or preference:

```scss
// Prefer Roboto
$font-family-sans-serif: Roboto, -apple-system, Arial, sans-serif !default;

// Prefer Segoe UI
$font-family-sans-serif: "Segoe UI", -apple-system, Arial, sans-serif !default;
```

**Step 2: Using Google Fonts (Custom Fonts)**

1. Go to https://fonts.google.com/
2. Choose a font (example: "Inter")
3. Click "Get font" then "Get embed code"
4. Copy the `<link>` tag

5. Open `demo/index.html` and add in the `<head>` section:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet">
```

6. Open `src/scss/_variables.scss` and change:
```scss
$font-family-sans-serif: 'Inter', -apple-system, sans-serif !default;
```

7. Build:
```bash
npm run build
```

**Note:** Custom fonts take time to download, so your page might be slower to load.

### Step-by-Step: Adjust Line Spacing

Line spacing (line-height) affects readability.

Open `src/scss/_variables.scss`:

```scss
$line-height-base: 1.5 !default;
```

**What the number means:**
- `1.5` = 1.5 times the font size
- If font is 16px, line height is 24px (16 × 1.5)

**Recommendations:**
```scss
// Tight spacing (compact, more text visible)
$line-height-base: 1.4 !default;

// Normal spacing (balanced)
$line-height-base: 1.5 !default;

// Loose spacing (easier to read, takes more space)
$line-height-base: 1.7 !default;
```

---

## Customizing Spacing

### Understanding the Spacing System

Bootstrap uses a spacing scale based on a multiplier:

```scss
$spacer: 0.75rem !default; // Base unit (12px)

$spacers: (
  0: 0,                    // No space
  1: $spacer * 0.25,      // 3px (very tight)
  2: $spacer * 0.5,       // 6px (tight)
  3: $spacer,             // 12px (normal)
  4: $spacer * 1.5,       // 18px (comfortable)
  5: $spacer * 2,         // 24px (spacious)
  6: $spacer * 2.5,       // 30px (very spacious)
  7: $spacer * 3,         // 36px
  8: $spacer * 4,         // 48px (large gaps)
) !default;
```

**How it's used in HTML:**
```html
<div class="p-3">Padding: 12px all sides</div>
<div class="p-5">Padding: 24px all sides</div>
<div class="pt-3">Padding top: 12px</div>
<div class="pb-2">Padding bottom: 6px</div>
<div class="px-4">Padding left and right: 18px</div>
<div class="py-3">Padding top and bottom: 12px</div>

<div class="m-3">Margin: 12px all sides</div>
<div class="mt-4">Margin top: 18px</div>
<div class="mb-5">Margin bottom: 24px</div>
<div class="mx-auto">Margin left and right: auto (centers)</div>
```

### Step-by-Step: Make Everything More Spacious

**Step 1:** Open `src/scss/_variables.scss`

**Step 2:** Find the spacer definition (around line 115):

```scss
$spacer: 0.75rem !default; // 12px instead of 16px
```

**Step 3:** Increase it:

```scss
$spacer: 1rem !default; // 16px (Bootstrap default)
// or
$spacer: 1.25rem !default; // 20px (very spacious)
```

**Step 4:** Build:

```bash
npm run build
```

**What changes:**
- All padding classes (p-1, p-2, etc.) use larger values
- All margin classes (m-1, m-2, etc.) use larger values
- All components have more breathing room

### Step-by-Step: Add Custom Spacing Sizes

You can add your own spacing sizes to the scale.

**Step 1:** Open `src/scss/_variables.scss`

**Step 2:** Find the spacers map (around line 120):

```scss
$spacers: (
  0: 0,
  1: $spacer * 0.25,
  2: $spacer * 0.5,
  3: $spacer,
  4: $spacer * 1.5,
  5: $spacer * 2,
  6: $spacer * 2.5,
  7: $spacer * 3,
  8: $spacer * 4,
) !default;
```

**Step 3:** Add custom sizes:

```scss
$spacers: (
  0: 0,
  1: $spacer * 0.25,
  2: $spacer * 0.5,
  3: $spacer,
  4: $spacer * 1.5,
  5: $spacer * 2,
  6: $spacer * 2.5,
  7: $spacer * 3,
  8: $spacer * 4,
  9: $spacer * 5,       // New! 60px
  10: $spacer * 6,      // New! 72px
) !default;
```

**Step 4:** Build and use:

```bash
npm run build
```

```html
<div class="p-9">Extra large padding</div>
<div class="mt-10">Huge top margin</div>
```

---

## Customizing Components

### Buttons

**Step-by-Step: Make Buttons Bigger**

1. Open `src/scss/_variables.scss`
2. Find button settings (around line 155):

```scss
$btn-padding-y: 0.375rem !default;  // Top/bottom padding
$btn-padding-x: 0.75rem !default;   // Left/right padding
$btn-font-size: $font-size-base !default;
```

3. Increase the padding:

```scss
$btn-padding-y: 0.5rem !default;   // Taller buttons
$btn-padding-x: 1.25rem !default;  // Wider buttons
$btn-font-size: 1rem !default;     // Bigger text
```

4. Build:

```bash
npm run build
```

**Step-by-Step: Change Button Shape**

1. Open `src/scss/_variables.scss`
2. Find:

```scss
$btn-border-radius: $border-radius !default;
```

3. Change to:

```scss
// Square buttons (no rounding)
$btn-border-radius: 0 !default;

// Very round buttons (pill shape)
$btn-border-radius: 50rem !default;

// Slightly rounded
$btn-border-radius: 0.5rem !default;
```

### Forms

**Step-by-Step: Make Form Fields Larger**

1. Open `src/scss/_variables.scss`
2. Find input settings (around line 175):

```scss
$input-btn-padding-y: 0.375rem !default;
$input-btn-padding-x: 0.75rem !default;
$input-btn-font-size: $font-size-base !default;
```

3. Increase padding:

```scss
$input-btn-padding-y: 0.625rem !default;  // Taller inputs
$input-btn-padding-x: 1rem !default;      // Wider inputs
```

**Step-by-Step: Change Form Field Borders**

1. Find:

```scss
$input-border-color: $gray-300 !default;
$input-border-width: $border-width !default;
```

2. Change:

```scss
// Darker border
$input-border-color: $gray-400 !default;

// Thicker border
$input-border-width: 2px !default;

// No border
$input-border-width: 0 !default;
```

**Step-by-Step: Change Focus Color**

When you click on an input field, it highlights. To change the color:

1. Find:

```scss
$input-focus-border-color: $primary !default;
```

2. Change to any color:

```scss
$input-focus-border-color: $success !default;  // Green
$input-focus-border-color: #9333ea !default;   // Purple
```

### Tables

**Step-by-Step: Make Tables More Compact**

1. Open `src/scss/_variables.scss`
2. Find:

```scss
$table-cell-padding-y: 0.375rem !default;
$table-cell-padding-x: 0.75rem !default;
```

3. Reduce:

```scss
$table-cell-padding-y: 0.25rem !default;
$table-cell-padding-x: 0.5rem !default;
```

**Step-by-Step: Change Table Stripes**

1. Find:

```scss
$table-striped-bg: $gray-50 !default;
```

2. Change:

```scss
// Darker stripes
$table-striped-bg: $gray-100 !default;

// Colored stripes (light blue)
$table-striped-bg: rgba($primary, 0.05) !default;
```

### Cards

**Step-by-Step: Adjust Card Spacing**

1. Open `src/scss/_variables.scss`
2. Find:

```scss
$card-spacer-y: 0.75rem !default;
$card-spacer-x: 1rem !default;
```

3. Change:

```scss
// More spacious cards
$card-spacer-y: 1.25rem !default;
$card-spacer-x: 1.5rem !default;

// Tighter cards
$card-spacer-y: 0.5rem !default;
$card-spacer-x: 0.75rem !default;
```

---

## Creating Custom Components

### Example 1: Info Box Component

Let's create a component for displaying tips and information.

**Step 1:** Open `src/scss/custom.scss`

**Step 2:** Add at the bottom:

```scss
// Info box component
// Usage: <div class="info-box">...</div>
.info-box {
  // Colors
  background-color: $blue-100;        // Light blue background
  border-left: 4px solid $blue-600;   // Blue left border accent

  // Spacing
  padding: $spacer * 1.5;             // 18px padding
  margin-bottom: $spacer * 2;         // 24px margin below

  // Shape
  border-radius: $border-radius;      // Rounded corners

  // Optional: Add a shadow
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  // Style for the title inside
  .info-title {
    font-weight: $font-weight-bold;   // Bold text
    color: $blue-900;                 // Dark blue
    margin-bottom: $spacer * 0.5;     // Space below
    font-size: $font-size-lg;         // Larger text
  }

  // Style for the text inside
  .info-text {
    color: $gray-700;                 // Dark gray text
    margin-bottom: 0;                 // No margin at bottom
  }
}
```

**Step 3:** Build:

```bash
npm run build
```

**Step 4:** Use in HTML:

```html
<div class="info-box">
  <div class="info-title">Did you know?</div>
  <p class="info-text">
    This is an informational message that stands out from regular text.
  </p>
</div>
```

**Understanding the code:**

```scss
background-color: $blue-100;
```
- Sets the background color using our color variable
- Variables ensure consistency across your site

```scss
padding: $spacer * 1.5;
```
- Uses our spacing system
- `* 1.5` means 1.5 times the base spacer (18px if spacer is 12px)
- If you change `$spacer`, this scales automatically

```scss
box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
```
- Adds a subtle shadow
- Format: `horizontal vertical blur color`
- `0 2px 4px` = No horizontal offset, 2px down, 4px blur
- `rgba(0, 0, 0, 0.1)` = Black at 10% opacity

### Example 2: Status Indicator Dots

Create colored dots to show status visually.

**Step 1:** Open `src/scss/custom.scss`

**Step 2:** Add:

```scss
// Status indicator dots
// Usage: <span class="status-dot status-dot-success"></span>
.status-dot {
  // Make it a circle
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;                 // 50% makes it circular
  margin-right: $spacer * 0.5;        // Space to the right

  // Align with text
  vertical-align: middle;

  // Color variants
  &.status-dot-success {
    background-color: $success;       // Green
  }

  &.status-dot-danger {
    background-color: $danger;        // Red
  }

  &.status-dot-warning {
    background-color: $warning;       // Yellow
  }

  &.status-dot-info {
    background-color: $info;          // Blue
  }

  // Add a pulsing animation (optional)
  &.status-dot-pulse {
    animation: pulse 2s infinite;
  }
}

// Pulse animation
@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
  100% {
    opacity: 1;
  }
}
```

**Step 3:** Build and use:

```bash
npm run build
```

```html
<p>
  <span class="status-dot status-dot-success"></span>
  System Online
</p>
<p>
  <span class="status-dot status-dot-danger status-dot-pulse"></span>
  Alert: Issue Detected
</p>
```

**Understanding the code:**

```scss
&.status-dot-success {
```
- The `&` means "the current selector"
- This creates `.status-dot.status-dot-success` (both classes on same element)
- It's a modifier - adds extra styling to the base `.status-dot`

```scss
@keyframes pulse {
```
- Defines an animation named "pulse"
- `0%` = start of animation
- `50%` = halfway through
- `100%` = end of animation
- The animation loops (plays repeatedly)

### Example 3: Pricing Card Component

Create cards for displaying pricing plans.

**Step 1:** Open `src/scss/custom.scss`

**Step 2:** Add:

```scss
// Pricing card component
.pricing-card {
  // Use Bootstrap's card as a base
  @extend .card;                      // Inherits all .card styles

  text-align: center;                 // Center all text
  padding: $spacer * 2;               // Generous padding

  // Optional: Add a hover effect
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-5px);      // Move up slightly
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);  // Bigger shadow
  }

  // Plan name
  .pricing-name {
    font-size: $h4-font-size;
    font-weight: $font-weight-bold;
    color: $gray-900;
    margin-bottom: $spacer;
  }

  // Price
  .pricing-amount {
    font-size: $h1-font-size * 1.5;   // Extra large
    font-weight: $font-weight-bold;
    color: $primary;
    margin-bottom: $spacer * 0.5;

    // Dollar sign styling
    .currency {
      font-size: $h3-font-size;
      vertical-align: super;
    }

    // "per month" styling
    .period {
      font-size: $font-size-base;
      color: $gray-600;
      font-weight: $font-weight-normal;
    }
  }

  // Features list
  .pricing-features {
    list-style: none;
    padding: 0;
    margin: $spacer * 1.5 0;

    li {
      padding: $spacer * 0.5 0;
      border-bottom: 1px solid $gray-200;

      &:last-child {
        border-bottom: none;
      }
    }
  }

  // Highlight featured plan
  &.pricing-featured {
    border: 2px solid $primary;
    background-color: rgba($primary, 0.02);

    .pricing-name {
      color: $primary;
    }
  }
}
```

**Step 3:** Build:

```bash
npm run build
```

**Step 4:** Use in HTML:

```html
<div class="row">
  <div class="col-md-4">
    <div class="pricing-card">
      <div class="pricing-name">Basic</div>
      <div class="pricing-amount">
        <span class="currency">$</span>9
        <span class="period">/mo</span>
      </div>
      <ul class="pricing-features">
        <li>10 Projects</li>
        <li>5 GB Storage</li>
        <li>Email Support</li>
      </ul>
      <button class="btn btn-outline-primary">Choose Plan</button>
    </div>
  </div>

  <div class="col-md-4">
    <div class="pricing-card pricing-featured">
      <div class="pricing-name">Professional</div>
      <div class="pricing-amount">
        <span class="currency">$</span>29
        <span class="period">/mo</span>
      </div>
      <ul class="pricing-features">
        <li>Unlimited Projects</li>
        <li>50 GB Storage</li>
        <li>Priority Support</li>
      </ul>
      <button class="btn btn-primary">Choose Plan</button>
    </div>
  </div>
</div>
```

**Understanding the code:**

```scss
@extend .card;
```
- Inherits all styles from Bootstrap's `.card` class
- Saves you from rewriting common styles
- Your pricing card gets all card features plus your custom additions

```scss
transition: transform 0.2s ease, box-shadow 0.2s ease;
```
- Makes changes smooth/animated
- `transform` and `box-shadow` will transition smoothly
- `0.2s` = transition takes 0.2 seconds
- `ease` = animation curve (starts slow, speeds up, slows down)

```scss
transform: translateY(-5px);
```
- Moves the element on the Y axis (vertical)
- Negative value moves up
- Positive value would move down

---

## Responsive Design

### Understanding Breakpoints

Bootstrap has built-in breakpoints for different screen sizes:

```scss
// Extra small (phones, less than 576px)
// No breakpoint needed - this is the default

// Small (sm) - tablets portrait (≥576px)
@media (min-width: 576px) { }

// Medium (md) - tablets landscape (≥768px)
@media (min-width: 768px) { }

// Large (lg) - desktops (≥992px)
@media (min-width: 992px) { }

// Extra large (xl) - large desktops (≥1200px)
@media (min-width: 1200px) { }

// Extra extra large (xxl) - larger desktops (≥1400px)
@media (min-width: 1400px) { }
```

### Making Components Responsive

**Example: Responsive Padding**

```scss
.my-component {
  // Small screens: less padding
  padding: $spacer;

  // Medium screens and up: more padding
  @media (min-width: 768px) {
    padding: $spacer * 2;
  }

  // Large screens: even more padding
  @media (min-width: 1200px) {
    padding: $spacer * 3;
  }
}
```

**Example: Responsive Text Size**

```scss
.hero-title {
  // Small screens: smaller text
  font-size: $h2-font-size;

  // Medium screens and up: larger text
  @media (min-width: 768px) {
    font-size: $h1-font-size;
  }

  // Large screens: even larger
  @media (min-width: 1200px) {
    font-size: $h1-font-size * 1.5;
  }
}
```

### Using Bootstrap's Responsive Classes

Instead of writing media queries, you can use Bootstrap's built-in responsive classes:

**Responsive Spacing:**
```html
<!-- Small padding on mobile, large padding on desktop -->
<div class="p-2 p-md-4">Content</div>

<!-- No margin on mobile, margin on desktop -->
<div class="m-0 m-lg-5">Content</div>
```

**Responsive Display:**
```html
<!-- Hidden on mobile, visible on desktop -->
<div class="d-none d-md-block">Desktop only content</div>

<!-- Visible on mobile, hidden on desktop -->
<div class="d-block d-md-none">Mobile only content</div>
```

**Responsive Text Alignment:**
```html
<!-- Center on mobile, left-align on desktop -->
<p class="text-center text-md-start">Text</p>
```

---

## Advanced Techniques

### Using SCSS Variables in Calculations

You can do math with variables:

```scss
.component {
  // Multiply
  padding: $spacer * 2;                    // Double the spacer

  // Divide
  font-size: $font-size-base / 1.2;        // Slightly smaller

  // Add
  margin-top: $spacer + 5px;               // Spacer plus 5px

  // Subtract
  width: 100% - ($spacer * 2);             // Full width minus padding

  // Combine operations
  padding: ($spacer * 2) + 5px;            // 29px (if spacer is 12px)
}
```

### Using SCSS Functions

**Lighten and Darken:**

```scss
.button-hover {
  background-color: $primary;

  &:hover {
    background-color: darken($primary, 10%);  // 10% darker
  }
}

.alert-background {
  background-color: lighten($danger, 40%);    // 40% lighter (pale red)
}
```

**Transparentize (Add Transparency):**

```scss
.overlay {
  background-color: rgba($gray-900, 0.5);     // 50% transparent
  // or
  background-color: transparentize($gray-900, 0.5);
}
```

**Mix Colors:**

```scss
.custom-color {
  // Mix 70% primary with 30% white
  background-color: mix($primary, white, 70%);
}
```

### Creating Mixins (Reusable Blocks of Styles)

Mixins let you define styles once and reuse them:

**Step 1:** Create a mixin in `src/scss/custom.scss`:

```scss
// Define the mixin
@mixin fancy-border {
  border: 2px solid $primary;
  border-radius: $border-radius-lg;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

// Use the mixin
.card-special {
  @include fancy-border;
  padding: $spacer * 2;
}

.alert-special {
  @include fancy-border;
  background-color: $warning-100;
}
```

**With Parameters:**

```scss
// Define mixin with parameters
@mixin colored-box($color, $size) {
  background-color: lighten($color, 40%);
  border-left: $size solid $color;
  padding: $spacer * 1.5;
}

// Use with different values
.info-box {
  @include colored-box($info, 4px);
}

.warning-box {
  @include colored-box($warning, 6px);
}
```

### Using Loops

Create multiple similar classes automatically:

```scss
// Create spacing classes from 1 to 10
@for $i from 1 through 10 {
  .gap-#{$i} {
    gap: #{$i * 4}px;  // Creates gap-1 (4px), gap-2 (8px), etc.
  }
}

// Create color variations
$status-colors: (
  'online': $success,
  'away': $warning,
  'offline': $gray-400,
  'busy': $danger
);

@each $name, $color in $status-colors {
  .status-#{$name} {
    background-color: $color;
    border-color: darken($color, 10%);
  }
}
```

This creates:
- `.status-online` (green)
- `.status-away` (yellow)
- `.status-offline` (gray)
- `.status-busy` (red)

---

## Best Practices

### 1. Use Variables for Consistency

**Bad:**
```scss
.button-special {
  color: #1c7ed6;  // Hard-coded color
  padding: 8px 16px;  // Hard-coded sizes
}

.link-special {
  color: #1c7ed6;  // Same color, but duplicated
}
```

**Good:**
```scss
.button-special {
  color: $primary;              // Use variable
  padding: $spacer $spacer * 2; // Use spacing system
}

.link-special {
  color: $primary;              // Consistent
}
```

**Why:** If you need to change the color, you only change it in one place!

### 2. Follow the Spacing System

**Bad:**
```scss
.component {
  margin-top: 13px;     // Random number
  padding: 7px;         // Another random number
}
```

**Good:**
```scss
.component {
  margin-top: $spacer;      // Uses system
  padding: $spacer * 0.5;   // Half spacer
}
```

**Why:** Consistent spacing looks more professional and is easier to maintain.

### 3. Keep Specificity Low

**Bad:**
```scss
div.container .card .card-body .card-title h3 {
  color: $primary;
}
```

**Good:**
```scss
.card-title-primary {
  color: $primary;
}
```

**Why:** Simpler selectors are easier to override and maintain.

### 4. Mobile First

Write styles for mobile, then add larger-screen styles:

**Good:**
```scss
.component {
  // Mobile: stack vertically
  display: flex;
  flex-direction: column;

  // Desktop: side by side
  @media (min-width: 768px) {
    flex-direction: row;
  }
}
```

### 5. Comment Your Code

```scss
// This increases button size for better touch targets on mobile
.btn-touch-friendly {
  min-height: 44px;
  min-width: 44px;
}

// Status indicator for user online/offline state
// Used in user profile cards and member lists
.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}
```

---

## Testing Your Changes

### Browser Testing Checklist

After making changes:

1. **Desktop browsers:**
   - Chrome
   - Firefox
   - Safari (if on Mac)
   - Edge

2. **Mobile (or browser DevTools):**
   - Chrome DevTools (F12 → Toggle Device Toolbar)
   - Test different screen sizes (phone, tablet)

3. **Check:**
   - Do colors have enough contrast?
   - Is text readable at all sizes?
   - Do buttons look clickable?
   - Are touch targets big enough (44px minimum)?
   - Does layout work at different widths?

### Quick Testing with Browser DevTools

1. Open your demo page
2. Press F12 (opens DevTools)
3. Click the device icon (Toggle Device Toolbar)
4. Select different devices to test
5. Try different screen widths

---

## Getting Help

If something doesn't work:

1. **Check the terminal output** for error messages
2. **Validate your SCSS syntax** - missing semicolons, brackets, quotes
3. **Clear browser cache** - Hard refresh (Ctrl+Shift+R)
4. **Check the generated CSS** - Look at `dist/css/custom.css` to see what was compiled
5. **Use browser DevTools** - Inspect elements to see what styles are applied

Common error messages:

- "Expected {" → Missing opening bracket
- "Undefined variable" → Variable not defined or typo in name
- "Invalid CSS" → Syntax error in your SCSS

---

This guide covers most common customization scenarios. Experiment, make changes, and see what happens - that's the best way to learn!
