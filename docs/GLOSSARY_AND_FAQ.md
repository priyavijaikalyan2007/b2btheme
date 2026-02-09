<!-- AGENT: Glossary of frontend terms and frequently asked questions about the theme. -->

# Glossary and Frequently Asked Questions

## Glossary of Terms

This section explains all the technical terms you'll encounter.

### Web Development Terms

**HTML (HyperText Markup Language)**
- The structure/skeleton of a webpage
- Uses tags like `<div>`, `<p>`, `<button>` to define content
- Example: `<h1>Hello World</h1>` creates a heading

**CSS (Cascading Style Sheets)**
- Controls how HTML elements look (colors, sizes, spacing, etc.)
- Example: `color: blue;` makes text blue
- "Cascading" means later styles override earlier ones

**JavaScript**
- Makes webpages interactive (clicking, animations, dynamic content)
- Runs in the web browser
- Example: Showing/hiding a menu when you click a button

**Webpage vs Website**
- **Webpage**: A single page (like `index.html`)
- **Website**: Collection of linked webpages

**Browser**
- Program that displays webpages (Chrome, Firefox, Safari, Edge)
- Reads HTML, applies CSS, runs JavaScript

---

### SCSS/Sass Terms

**SCSS (Sassy CSS)**
- Enhanced version of CSS with extra features
- Has to be "compiled" into regular CSS
- File extension: `.scss`

**Sass (Syntactically Awesome Style Sheets)**
- The compiler that converts SCSS to CSS
- Also refers to the programming language

**Variable**
- A name that stores a value
- Example: `$primary: blue;` - now you can use `$primary` anywhere instead of typing `blue`
- Like a labeled container: the label (variable name) stays the same, but you can change what's inside

**Nesting**
- Putting CSS rules inside other CSS rules
- Mirrors your HTML structure
```scss
.card {
  .title {
    // Styles for .title inside .card
  }
}
```

**Mixin**
- A reusable block of styles
- Like a recipe: define once, use multiple times
```scss
@mixin rounded {
  border-radius: 10px;
}

.button {
  @include rounded;
}
```

**Import**
- Brings code from another file into your current file
- Example: `@import 'variables';` brings in `_variables.scss`

**Partial**
- A SCSS file meant to be imported (not compiled on its own)
- Starts with underscore: `_variables.scss`

**Compile/Compilation**
- Converting SCSS to CSS
- SCSS (human-friendly) → Compiler → CSS (browser-friendly)

---

### Bootstrap Terms

**Bootstrap**
- A pre-made CSS framework with ready-to-use components
- Created by Twitter
- Saves you from writing CSS from scratch

**Component**
- A reusable UI element (button, card, navbar, etc.)
- Bootstrap provides many pre-styled components

**Utility Class**
- A CSS class that does one specific thing
- Example: `text-center` centers text, `p-3` adds padding

**Grid System**
- Bootstrap's layout system using rows and columns
- Makes responsive layouts easy
```html
<div class="row">
  <div class="col-md-6">Left half</div>
  <div class="col-md-6">Right half</div>
</div>
```

**Responsive**
- Design that adapts to different screen sizes
- Looks good on phone, tablet, desktop

**Breakpoint**
- Screen width where layout changes
- Example: Mobile (< 768px) vs Desktop (≥ 768px)

---

### NPM/Node Terms

**Node.js (or just "Node")**
- Runs JavaScript outside the browser
- We use it to run build tools
- Not JavaScript in the browser

**NPM (Node Package Manager)**
- Tool for installing code libraries
- Like an app store for code packages
- Command: `npm install`

**Package**
- A library or tool you can install
- Example: "bootstrap" package contains Bootstrap code

**package.json**
- File listing your project's packages and settings
- Tells NPM what to install
- Contains scripts you can run

**node_modules**
- Folder containing installed packages
- Created by `npm install`
- Can get very large - don't edit files here!

**Script**
- A command defined in package.json that you can run
- Example: `"build": "sass src/scss:dist/css"`
- Run with: `npm run build`

**Dependency**
- A package your project needs to work
- Listed in package.json
- Example: This project depends on Bootstrap

---

### File/Folder Terms

**Directory**
- Same as "folder"
- Contains files and other directories

**Path**
- Location of a file
- Example: `src/scss/_variables.scss`
- Absolute path: Full location from root (`/home/user/project/src/scss/_variables.scss`)
- Relative path: Location from current file (`../scss/_variables.scss`)

**Root**
- Top-level folder of your project
- Contains package.json

**Source (src)**
- Folder with your original code (before building)
- You edit files here

**Distribution (dist)**
- Folder with compiled/built files
- Generated automatically - don't edit!

**Extension**
- Part of filename after the dot
- `.html`, `.css`, `.scss`, `.js`
- Tells you what type of file it is

---

### CSS Terms

**Selector**
- Targets which HTML elements to style
```css
p { }              /* All <p> elements */
.button { }        /* Elements with class="button" */
#header { }        /* Element with id="header" */
```

**Property**
- What aspect to style
- Example: `color`, `padding`, `border`

**Value**
- What to set the property to
- Example: `blue`, `10px`, `solid`

**Rule/Rule Set**
- Complete CSS statement
```css
.button {           /* Selector */
  color: blue;      /* Property: value; */
  padding: 10px;
}
```

**Class**
- Reusable identifier for HTML elements
```html
<div class="card">
<p class="card">
```
Multiple elements can have the same class.

**ID**
- Unique identifier for ONE HTML element
```html
<div id="header">
```
Only one element should have a specific ID.

**Declaration**
- One property-value pair
- Example: `color: blue;`

**Pseudo-class**
- Special state of an element
```css
a:hover { }        /* When hovering over link */
a:focus { }        /* When link is focused */
input:disabled { } /* When input is disabled */
```

**Media Query**
- CSS that applies only at certain screen sizes
```css
@media (min-width: 768px) {
  /* Styles for screens 768px and wider */
}
```

---

### Color Terms

**Hex Code**
- Color written as 6 characters after #
- Example: `#ff0000` is red
- Format: `#RRGGBB` (Red Red Green Green Blue Blue)

**RGB (Red Green Blue)**
- Color defined by amounts of red, green, blue
- Example: `rgb(255, 0, 0)` is red
- Values: 0-255 for each color

**RGBA (Red Green Blue Alpha)**
- RGB plus transparency
- Example: `rgba(255, 0, 0, 0.5)` is semi-transparent red
- Alpha: 0 (fully transparent) to 1 (fully opaque)

**Opacity**
- How see-through something is
- 0 = invisible, 1 = solid, 0.5 = half transparent

**Contrast**
- Difference between colors
- High contrast: Easy to read (black on white)
- Low contrast: Hard to read (light gray on white)

---

### Size/Measurement Terms

**px (Pixels)**
- Fixed size unit
- `16px` is always 16 pixels
- Not accessible (user can't resize)

**rem (Root EM)**
- Relative to root font size
- `1rem` = 16px by default
- `2rem` = 32px
- Users can adjust (more accessible)

**em**
- Relative to parent element font size
- Can compound (get bigger/smaller through nesting)

**% (Percent)**
- Relative to parent element
- `width: 50%` = half the parent's width

**vh (Viewport Height)**
- Relative to browser window height
- `100vh` = full height of viewport

**vw (Viewport Width)**
- Relative to browser window width
- `100vw` = full width of viewport

---

### Layout Terms

**Box Model**
- How space around elements works
- From inside out: Content → Padding → Border → Margin

**Padding**
- Space inside an element (between content and border)
- Pushes content inward

**Margin**
- Space outside an element (between border and other elements)
- Pushes other elements away

**Border**
- Line around an element (between padding and margin)

**Flexbox**
- Layout system for arranging elements
- Good for rows and columns
- Example: `display: flex;`

**Grid**
- 2D layout system (rows AND columns)
- Example: Bootstrap's grid system

---

### Development Terms

**Build**
- Process of converting source code to production code
- SCSS → CSS, combine files, optimize, etc.
- Command: `npm run build`

**Compile**
- Converting code from one language to another
- SCSS → CSS

**Watch/Watch Mode**
- Automatically rebuild when files change
- Runs in background
- Command: `npm run watch`

**Terminal/Command Line**
- Text-based interface for running commands
- Windows: Command Prompt or PowerShell
- Mac: Terminal
- Linux: Terminal or Console

**IDE (Integrated Development Environment)**
- Code editor with extra features
- Examples: VS Code, Sublime Text, Atom

**Syntax**
- Grammar/rules of a programming language
- Correct syntax: Code works
- Syntax error: Code doesn't work

**Comment**
- Note in code that's ignored by computers
```scss
// This is a comment
/* This is also a comment */
```

---

## Frequently Asked Questions

### General Questions

**Q: Do I need to know how to code to use this?**

A: You need basic knowledge, but this documentation teaches you everything step-by-step. Start with the BEGINNERS_GUIDE.md.

**Q: Can I use this for commercial projects?**

A: Yes! This theme is MIT licensed, meaning you can use it for any purpose, including commercial projects.

**Q: Do I need an internet connection to develop?**

A: After initial setup (installing packages), you can develop offline. However, if using Google Fonts or CDN resources, those need internet.

**Q: Will this work with WordPress/React/Vue/etc?**

A: The compiled CSS (`dist/css/custom.css`) works with any framework or CMS. Just link to it like any CSS file.

---

### Installation Questions

**Q: Which version of Node.js should I install?**

A: Install the LTS (Long Term Support) version from nodejs.org. As of 2024, that's version 20.x.

**Q: How much disk space does this project need?**

A: About 200-300 MB after installing all packages (mostly in node_modules).

**Q: Can I delete node_modules to save space?**

A: Yes, but you'll need to run `npm install` again before you can build. Delete it when you're not working on the project if you need space.

**Q: Do I need to install Bootstrap separately?**

A: No! Running `npm install` installs Bootstrap and all other dependencies automatically.

---

### Customization Questions

**Q: Can I change just one color without affecting everything?**

A: Yes! Bootstrap uses specific variables. For example, to change only button colors, modify the button-specific variables without changing `$primary`.

**Q: How do I add my company's brand colors?**

A: Define your colors in `_variables.scss`, then assign them to Bootstrap's theme color variables:
```scss
$company-blue: #1a2b3c;
$primary: $company-blue;
```

**Q: Can I use images in my theme?**

A: Yes! Put images in a folder like `src/images/`, then reference them in CSS:
```scss
.hero {
  background-image: url('../images/hero-bg.jpg');
}
```

**Q: How do I make everything bigger/smaller?**

A: Change the base font size and spacer:
```scss
$font-size-base: 1rem;  // Bigger: 1.125rem, Smaller: 0.875rem
$spacer: 1rem;          // Bigger: 1.25rem, Smaller: 0.75rem
```

**Q: Can I use this theme with the regular Bootstrap CSS?**

A: No, this replaces Bootstrap's CSS. But you can use Bootstrap's JavaScript (bootstrap.bundle.min.js).

---

### Technical Questions

**Q: What's the difference between .css and .scss files?**

A:
- `.scss` files are source code (you edit these)
- `.css` files are compiled output (generated automatically)
- Browsers read `.css`, not `.scss`

**Q: Why do I need to build/compile?**

A: Browsers can't read SCSS files. Building converts your SCSS to CSS that browsers understand.

**Q: Can I edit the CSS file directly instead of SCSS?**

A: You can, but don't! The CSS file gets overwritten every time you build. Always edit SCSS files.

**Q: What does "!default" mean?**

A:
```scss
$primary: blue !default;
```
Means: "Use blue unless someone already defined $primary elsewhere." It allows overriding.

**Q: What's the difference between @import and @use?**

A:
- `@import` is old Sass syntax (being deprecated)
- `@use` is new syntax (better, but not fully compatible with Bootstrap yet)
- This project uses `@import` for Bootstrap compatibility

---

### Build Questions

**Q: Why does the build show deprecation warnings?**

A: These are warnings about future Sass versions. They don't affect functionality now. You can ignore them.

**Q: How long should a build take?**

A: First build: 5-15 seconds. Subsequent builds: 2-5 seconds. Watch mode rebuilds: 1-3 seconds.

**Q: Can I speed up builds?**

A: Watch mode (`npm run watch`) is fastest because it only rebuilds changed files.

**Q: Do I need to build before viewing the demo?**

A: The project comes pre-built, so you can view `demo/index.html` immediately. Build only when you make changes.

**Q: What if I get "out of memory" errors?**

A: Increase Node's memory limit:
```bash
export NODE_OPTIONS="--max-old-space-size=4096"
```
Then try building again.

---

### Styling Questions

**Q: Why doesn't my color look the same in different browsers?**

A: Monitor calibration and browser color profiles vary. This is normal. Colors should be very similar though.

**Q: What's a good contrast ratio for accessibility?**

A:
- Normal text: minimum 4.5:1
- Large text (18px+): minimum 3:1
- Use a contrast checker tool to verify

**Q: How do I know if my colors are accessible?**

A: Use online tools like WebAIM Contrast Checker. Input your foreground and background colors.

**Q: Should I use px or rem?**

A: Use rem for most things (better accessibility). Use px for:
- Borders (1px, 2px)
- Very small values where scaling isn't important

**Q: What's the difference between margin and padding?**

A:
- **Padding**: Space inside the element (between content and border)
- **Margin**: Space outside the element (between border and other elements)

---

### Responsive Design Questions

**Q: What screen sizes should I design for?**

A: Bootstrap's breakpoints:
- Mobile: < 576px
- Tablet: 576px - 992px
- Desktop: > 992px

Test all three ranges.

**Q: How do I make something only show on mobile?**

A:
```html
<div class="d-block d-md-none">Mobile only</div>
```

**Q: How do I make something only show on desktop?**

A:
```html
<div class="d-none d-md-block">Desktop only</div>
```

**Q: Can I add custom breakpoints?**

A: Yes, but it's complex. Better to use Bootstrap's existing breakpoints.

**Q: Why does my site look weird on iPhone/Android?**

A: Make sure you have the viewport meta tag:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

---

### Component Questions

**Q: How do I change button styles?**

A: Modify button variables in `_variables.scss`:
```scss
$btn-padding-y: 0.5rem;
$btn-padding-x: 1rem;
$btn-border-radius: 0.25rem;
```

**Q: Can I create custom button colors?**

A: Yes! Add to theme colors:
```scss
$theme-colors: (
  "primary": $primary,
  "my-custom": #ff6b6b
);
```
Then use: `<button class="btn btn-my-custom">Button</button>`

**Q: How do I make tables more compact?**

A: Use the `.table-sm` class:
```html
<table class="table table-sm">
```
Or change the table padding variables.

**Q: Can I change the navbar height?**

A: Yes, modify navbar padding:
```scss
$navbar-padding-y: 0.5rem;
```

---

### Workflow Questions

**Q: What's the best workflow for developing?**

A:
1. Open terminal, run `npm run watch`
2. Open demo/index.html in browser
3. Edit SCSS files
4. Save
5. Browser auto-rebuilds (refresh to see changes)

**Q: Should I edit demo/index.html?**

A: Yes, it's there for testing. Or create your own HTML files.

**Q: How do I add my HTML page?**

A:
1. Create `mypage.html` anywhere
2. Link to the CSS:
```html
<link rel="stylesheet" href="path/to/dist/css/custom.css">
```

**Q: Can I organize my SCSS files differently?**

A: Yes! Create more partial files and import them in `custom.scss`:
```scss
@import 'variables';
@import 'my-custom-file';
@import 'another-file';
```

---

### Deployment Questions

**Q: How do I use this theme on my live website?**

A:
1. Run `npm run build`
2. Copy `dist/css/custom.css` to your server
3. Copy `dist/js/bootstrap.bundle.min.js` to your server
4. Link to them in your HTML

**Q: Do I need to upload node_modules?**

A: No! Only upload the `dist` folder (or just the files in it).

**Q: Do I need to upload src folder?**

A: No, only if you want to edit SCSS on the server (unusual). Usually just upload `dist`.

**Q: Can I rename custom.css?**

A: Yes, but update the link in your HTML:
```html
<link rel="stylesheet" href="my-theme.css">
```

---

### Troubleshooting Questions

**Q: My changes aren't showing up. Why?**

A: Common causes:
1. Forgot to run `npm run build`
2. Browser cached old CSS (hard refresh: Ctrl+Shift+R)
3. Edited the CSS file instead of SCSS
4. Looking at the wrong page

**Q: I got an error. What do I do?**

A:
1. Read the error message - it often tells you exactly what's wrong
2. Check TROUBLESHOOTING.md for common errors
3. Undo your last change - does it work again?
4. Search for the error message online

**Q: How do I reset everything if I break something?**

A:
```bash
# Delete generated files
rm -rf dist node_modules

# Reinstall
npm install
npm run build
```

**Q: Can I undo my changes?**

A: If using Git:
```bash
git checkout -- path/to/file.scss
```
If not using Git, you'll need to manually revert or restore from backup.

---

### Best Practices Questions

**Q: Should I comment my code?**

A: Yes! Explain why you made changes:
```scss
// Increased button padding for better mobile touch targets
$btn-padding-y: 0.625rem;
```

**Q: How should I name custom classes?**

A: Use descriptive, lowercase names with hyphens:
```scss
.user-profile-card { }      // Good
.Card123 { }                // Bad
.usrPrflCrd { }             // Bad
```

**Q: Should I use !important?**

A: Avoid it if possible. It makes styles hard to override later. Use more specific selectors instead.

**Q: How do I organize my custom styles?**

A: Group related styles together with comments:
```scss
// =============================
// Custom Components
// =============================

// User Profile Card
.user-profile-card { }

// Dashboard Widgets
.dashboard-widget { }
```

---

### Learning Questions

**Q: I'm stuck. What should I learn first?**

A: In this order:
1. Basic HTML (structure)
2. Basic CSS (styling)
3. How to use Bootstrap classes
4. SCSS variables
5. Advanced SCSS features

**Q: What resources do you recommend?**

A:
- HTML/CSS: MDN Web Docs (developer.mozilla.org)
- Bootstrap: Official docs (getbootstrap.com)
- SCSS: sass-lang.com/guide
- General: freeCodeCamp.org

**Q: How long does it take to learn this?**

A: Basic customization (colors, spacing): 1-2 days
- Comfortable with all features: 1-2 weeks
- Expert level: A few months of practice

**Q: Is web development hard?**

A: The basics are easy. Advanced techniques take time. This documentation makes it easier!

---

## Quick Reference

### Common Commands

```bash
npm install          # Install all packages
npm run build        # Build once
npm run watch        # Build and watch for changes
npm run dev          # Build and watch
node --version       # Check Node version
npm --version        # Check NPM version
```

### Common File Paths

```
src/scss/_variables.scss     → Edit colors, sizes, spacing
src/scss/custom.scss         → Add custom styles
dist/css/custom.css          → Generated CSS (don't edit!)
demo/index.html              → Test page
package.json                 → Project configuration
```

### Common Variable Patterns

```scss
$variable-name: value !default;              // Define variable
property: $variable-name;                     // Use variable
property: $variable-name * 2;                 // Math with variable
property: darken($variable-name, 10%);        // Function with variable
```

### Common CSS Patterns

```scss
.class-name {                                // Class selector
  property: value;                           // Declaration
}

#id-name {                                   // ID selector
  property: value;
}

.parent .child {                             // Descendant selector
  property: value;
}

.element:hover {                             // Hover state
  property: value;
}

@media (min-width: 768px) {                  // Media query
  .responsive {
    property: value;
  }
}
```

---

This glossary should help you understand the terminology used throughout the documentation. Refer back to it whenever you encounter unfamiliar terms!
