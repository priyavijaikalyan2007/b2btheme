<!-- AGENT: Common problems and solutions for building and customising the Bootstrap theme. -->

# Troubleshooting Guide

This guide helps you solve common problems you might encounter while working with this Bootstrap theme.

## Table of Contents

1. [Installation Problems](#installation-problems)
2. [Build Problems](#build-problems)
3. [Style Problems](#style-problems)
4. [Browser Problems](#browser-problems)
5. [Understanding Error Messages](#understanding-error-messages)

---

## Installation Problems

### Problem: "npm: command not found"

**What it means:** Node.js and NPM are not installed.

**How to fix:**

1. Go to https://nodejs.org/
2. Download the **LTS version** (Long Term Support - the more stable option)
3. Run the installer
4. Follow the installation wizard (keep all default options)
5. **Restart your terminal/command prompt** (this is important!)
6. Verify installation:
   ```bash
   node --version
   ```
   Should show something like `v20.10.0`

   ```bash
   npm --version
   ```
   Should show something like `10.2.3`

**Still not working?**
- On Windows: Add Node.js to your PATH environment variable
- On Mac/Linux: You might need to use `sudo npm install` for permissions

---

### Problem: "npm install" fails with permission errors

**On Windows:**

Run Command Prompt as Administrator:
1. Search for "cmd" in Start Menu
2. Right-click → Run as Administrator
3. Navigate to your project folder
4. Run `npm install`

**On Mac/Linux:**

```bash
sudo npm install
```

Enter your password when prompted.

**Better solution (avoid sudo):**

Configure npm to use a different directory:
```bash
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH
```

Add the last line to your `~/.bashrc` or `~/.zshrc` file.

---

### Problem: "package.json not found"

**What it means:** You're not in the right directory.

**How to fix:**

1. Make sure you're in the project folder:
   ```bash
   pwd   # Mac/Linux - shows current directory
   cd    # Windows - shows current directory
   ```

2. Navigate to the project:
   ```bash
   cd /path/to/your/theme/folder
   ```

3. List files to verify:
   ```bash
   ls        # Mac/Linux
   dir       # Windows
   ```

   You should see `package.json` in the list.

---

## Build Problems

### Note: Deprecation Warnings (Already Fixed!)

**If you see orange "DEPRECATION WARNING" messages:**

These have been **suppressed** in the latest version. Your build should run cleanly without warnings.

**What they were:** Warnings from Sass about future changes (years away, not urgent)

**Why they appeared:** Bootstrap 5.3.x uses older Sass syntax that will be updated in future versions

**Are they harmful?** No! Everything works perfectly. They're just reminders about code that will be updated eventually.

**Want to know more?** Read the detailed explanation: [ABOUT_DEPRECATION_WARNINGS.md](ABOUT_DEPRECATION_WARNINGS.md)

**If you still see warnings:** Make sure you have the latest `package.json`. Run:
```bash
npm run build
```

The build should complete with just:
```
> enterprise-bootstrap-theme@1.0.0 build
> npm run build:css && npm run copy:js
...
(no warnings shown)
```

---

### Problem: Build runs but changes don't appear

**Checklist:**

**1. Did you save your file?**
- Make sure you saved the SCSS file after making changes
- Check the file modification time

**2. Did you run the build?**
```bash
npm run build
```

**3. Did you refresh the browser?**
- Regular refresh: F5 or Ctrl+R (Windows) / Cmd+R (Mac)
- **Hard refresh** (clears cache): Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)

**4. Did you edit the right file?**
- ✅ **CORRECT:** Edit `src/scss/_variables.scss` or `src/scss/custom.scss`
- ❌ **WRONG:** Edit `css/custom.css` (this gets overwritten!)

**5. Is your browser caching the CSS?**

Disable cache in browser DevTools:
1. Press F12 to open DevTools
2. Go to Network tab
3. Check "Disable cache"
4. Keep DevTools open while testing

**6. Are you looking at the right file?**

Make sure your HTML file links to the compiled CSS:
```html
<!-- Correct -->
<link rel="stylesheet" href="../css/custom.css">

<!-- Wrong - this doesn't exist -->
<link rel="stylesheet" href="../src/scss/custom.scss">
```

---

### Problem: "Error: File to import not found"

**Full error:**
```
Error: File to import not found or unreadable: variables
```

**What it means:** Sass can't find the file you're trying to import.

**Common causes:**

**1. Typo in filename:**
```scss
❌ @import 'variabls';     // Typo!
✅ @import 'variables';    // Correct
```

**2. Wrong path:**
```scss
❌ @import 'variables';    // Looking in same folder
✅ @import '../variables'; // If variables is in parent folder
```

**3. Missing underscore:**

In Sass, files starting with `_` are "partials". When importing:
```scss
// File is named: _variables.scss
❌ @import '_variables';   // Don't include the underscore
✅ @import 'variables';    // Correct
```

**How to fix:**

1. Check the file exists: `ls src/scss/` (Mac/Linux) or `dir src\scss` (Windows)
2. Verify the filename exactly
3. Check the path is correct relative to the importing file

---

### Problem: "Undefined variable"

**Full error:**
```
Error: Undefined variable: "$primary-color"
```

**What it means:** You're using a variable that hasn't been defined.

**Common causes:**

**1. Typo in variable name:**
```scss
// Defined as:
$primary: #1c7ed6;

// Used as:
color: $primery;  // ❌ Typo!
color: $primary;  // ✅ Correct
```

**2. Variable not defined yet:**
```scss
❌
.button {
  color: $my-color;  // Used before definition
}

$my-color: #ff0000;  // Defined after use

✅
$my-color: #ff0000;  // Define first

.button {
  color: $my-color;  // Use second
}
```

**3. Variable in wrong file:**

If you define a variable in `custom.scss`, you can't use it in `_variables.scss` because `_variables.scss` is imported first.

**File import order:**
```scss
// In custom.scss:
@import 'variables';        // 1. Variables loaded first
@import 'node_modules/bootstrap/scss/bootstrap';  // 2. Bootstrap second
// 3. Your custom styles here (can use variables)
```

---

### Problem: "Expected { after selector"

**Full error:**
```
Error: Expected { after selector
```

**What it means:** Syntax error in your SCSS.

**Common causes:**

**1. Missing opening bracket:**
```scss
❌
.button
  color: red;
}

✅
.button {
  color: red;
}
```

**2. Missing semicolon on previous line:**
```scss
❌
.button {
  color: red     // Missing semicolon!
  padding: 10px;
}

✅
.button {
  color: red;    // Added semicolon
  padding: 10px;
}
```

**3. Using CSS in a media query incorrectly:**
```scss
❌
@media (min-width: 768px)  // Missing opening bracket
  .button {
    padding: 20px;
  }
}

✅
@media (min-width: 768px) {
  .button {
    padding: 20px;
  }
}
```

---

### Problem: Build is very slow

**Causes and solutions:**

**1. Building too often:**

Instead of running `npm run build` after every change:
```bash
npm run watch
```
This watches your files and rebuilds automatically when you save.

**2. Large project:**

If you have many SCSS files, builds take longer. This is normal.

**3. Antivirus scanning:**

Some antivirus software scans every file created, slowing builds. Add your project folder to the antivirus exclusions.

---

### Problem: Watch mode not detecting changes

**Try these solutions:**

**1. Restart watch mode:**
```bash
# Stop watch mode: Ctrl+C
# Start it again:
npm run watch
```

**2. Save the file:**
Make sure you actually saved the file (check for unsaved indicator in your editor).

**3. Check file path:**
Watch mode only watches `src/scss/` folder. Make sure your file is there.

**4. Editor-specific issues:**

Some editors (like VS Code) have settings that affect file watching:
- VS Code: Try disabling "Files: Hot Exit"
- Try saving with Ctrl+S or Cmd+S explicitly

---

## Style Problems

### Problem: Colors look different than expected

**Possible causes:**

**1. Browser color profiles:**

Different monitors and browsers can display colors slightly differently. This is normal.

**2. Opacity/transparency:**

```scss
// Solid color
background-color: $primary;              // Solid blue

// Transparent color
background-color: rgba($primary, 0.5);  // 50% transparent blue
```

**3. Color mixing:**

```scss
// Pure color
background-color: $primary;

// Mixed color (lighter)
background-color: mix($primary, white, 70%);
```

**4. Browser DevTools:**

Check the actual color in DevTools:
1. Press F12
2. Click on the element
3. Look at the Styles panel
4. See what color is actually being applied

---

### Problem: Styles not applying to an element

**Debugging steps:**

**1. Check the selector:**

```scss
// Make sure your selector matches your HTML

// SCSS:
.my-button {
  color: red;
}

// HTML must have exactly this class:
<button class="my-button">Click Me</button>
```

**2. Check specificity:**

More specific selectors override less specific ones:

```scss
// Less specific (color: blue)
.button {
  color: blue;
}

// More specific (color: red wins)
.container .button {
  color: red;
}
```

**3. Check the cascade:**

Styles defined later override earlier ones:

```scss
.button {
  color: blue;   // Defined first
}

.button {
  color: red;    // Defined later - this wins
}
```

**4. Use !important (last resort):**

```scss
.button {
  color: red !important;  // Forces this to apply
}
```

**Warning:** Avoid `!important` if possible. It makes styles harder to maintain.

**5. Use browser DevTools:**

1. Press F12
2. Click the element inspector icon
3. Click on your element
4. Look at the Styles panel
5. See which styles are applied and which are crossed out

---

### Problem: Spacing is inconsistent

**Solution:** Use the spacing system consistently.

**Bad approach:**
```scss
.component1 {
  margin: 13px;
}

.component2 {
  margin: 15px;
}

.component3 {
  margin: 12px;
}
```

**Good approach:**
```scss
.component1 {
  margin: $spacer;
}

.component2 {
  margin: $spacer * 1.25;
}

.component3 {
  margin: $spacer;
}
```

Or use Bootstrap classes:
```html
<div class="m-3">Consistent spacing</div>
<div class="m-4">Also consistent</div>
```

---

### Problem: Borders not showing

**Common causes:**

**1. Border color same as background:**
```scss
❌
.box {
  background-color: white;
  border: 1px solid white;  // Same color - invisible!
}

✅
.box {
  background-color: white;
  border: 1px solid $gray-300;  // Visible contrast
}
```

**2. Missing border style:**
```scss
❌
.box {
  border-color: red;
  border-width: 2px;
  // Missing border-style!
}

✅
.box {
  border: 2px solid red;  // All three: width, style, color
}
```

**3. Border collapsed:**

On tables:
```html
<table style="border-collapse: collapse;">
  <!-- Borders might not show as expected -->
</table>
```

---

## Browser Problems

### Problem: Page looks different in different browsers

**What it is:** Browser inconsistencies.

**Solution:** This theme includes Autoprefixer, which handles most issues automatically.

**If problems persist:**

**1. Check browser version:**

Update to the latest version of:
- Chrome
- Firefox
- Safari
- Edge

**2. Check for browser-specific CSS:**

Some CSS properties need vendor prefixes:
```scss
// Don't write prefixes manually - Autoprefixer does this!
.box {
  display: flex;  // Autoprefixer adds -webkit-flex, etc.
}
```

**3. Test in multiple browsers:**

Use:
- Real devices
- Browser DevTools device emulation (F12 → Toggle Device Toolbar)
- Services like BrowserStack (for comprehensive testing)

---

### Problem: Page looks fine on desktop but broken on mobile

**Common causes:**

**1. Missing viewport meta tag:**

Make sure your HTML has this in the `<head>`:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

**2. Fixed widths:**

```scss
❌
.container {
  width: 1200px;  // Too wide for mobile!
}

✅
.container {
  width: 100%;
  max-width: 1200px;
}
```

**3. Not using Bootstrap grid:**

```html
✅ Responsive
<div class="row">
  <div class="col-md-6">Left</div>
  <div class="col-md-6">Right</div>
</div>

❌ Not responsive
<div style="width: 50%; float: left;">Left</div>
<div style="width: 50%; float: left;">Right</div>
```

**4. Test on actual mobile devices:**

Emulation isn't perfect. Test on real phones/tablets when possible.

---

### Problem: Fonts look different/wrong

**Possible causes:**

**1. Font not loaded:**

If using Google Fonts, make sure the `<link>` is in your HTML `<head>`:
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet">
```

**2. Font family typo:**

```scss
❌
$font-family-sans-serif: 'Interr', sans-serif;  // Typo!

✅
$font-family-sans-serif: 'Inter', sans-serif;
```

**3. Font not installed (for system fonts):**

```scss
// This font only works on Windows:
$font-family-sans-serif: 'Segoe UI', sans-serif;

// Better - fallbacks for all systems:
$font-family-sans-serif: 'Segoe UI', -apple-system, Arial, sans-serif;
```

**4. Browser using fallback font:**

Check in DevTools:
1. Press F12
2. Select the element
3. Look at "Computed" tab
4. Check "font-family" - which font is actually being used?

---

## Understanding Error Messages

### Sass Compilation Errors

**Error format:**
```
Error: [error message]
  ╷
5 │ @import 'variables';
  │         ^^^^^^^^^^^
  ╵
    src/scss/custom.scss 5:9  root stylesheet
```

**How to read it:**
- Error message: What went wrong
- Line number (5): Where the error is
- File (custom.scss): Which file has the error
- The arrow (^) points to the problem

**Common errors:**

**1. "Expected expression"**
```scss
❌
.button {
  color: ;  // No value!
}

✅
.button {
  color: red;
}
```

**2. "Invalid CSS after"**
```scss
❌
.button {
  color: red blue;  // Can't have two colors!
}

✅
.button {
  color: red;
}
```

**3. "Expected }"**
```scss
❌
.button {
  color: red;
  // Missing closing bracket!

✅
.button {
  color: red;
}  // Added closing bracket
```

---

### NPM Errors

**"Cannot find module"**

**Meaning:** A package isn't installed.

**Fix:**
```bash
npm install
```

**"EACCES: permission denied"**

**Meaning:** You don't have permission to write to the folder.

**Fix:**
- Windows: Run Command Prompt as Administrator
- Mac/Linux: Use `sudo npm install` or fix npm permissions

**"gyp ERR! stack Error: spawn ENOENT"**

**Meaning:** Build tools missing (usually on Windows).

**Fix:**
```bash
npm install --global windows-build-tools
```

---

## General Debugging Tips

### 1. Check One Thing at a Time

When something breaks:
1. Undo your last change
2. Does it work again?
3. Yes → The last change caused the problem
4. No → The problem was there before

### 2. Simplify

If something complex doesn't work:
1. Start with the simplest possible version
2. Get that working
3. Add complexity one piece at a time
4. Test after each addition

**Example:**
```scss
// Not working - too complex to debug:
.button {
  background: linear-gradient(45deg, $primary, darken($primary, 20%));
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

// Start simple:
.button {
  background-color: $primary;
}

// Works? Add one feature:
.button {
  background-color: $primary;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

// Still works? Add another:
// ... and so on
```

### 3. Use Console Logging

In SCSS, you can output debug information:

```scss
// Check variable value
@debug "Primary color is: #{$primary}";

// Check calculation result
@debug "Spacer times 2 is: #{$spacer * 2}";
```

This shows in your terminal when you build.

### 4. Comment Out Code

Find which part is causing problems:

```scss
.button {
  color: red;
  // padding: $spacer;           // Commented out
  // border: 1px solid $primary;  // Commented out
  // border-radius: $border-radius;  // Commented out
}
```

Uncomment one line at a time to find the culprit.

### 5. Compare with Working Code

Look at the demo files:
- `demo/index.html` - Working HTML
- `src/scss/custom.scss` - Working custom styles
- `src/scss/_variables.scss` - Working variables

Copy how they do things.

### 6. Google the Error

Copy the error message and search:
- "sass [error message]"
- "bootstrap [problem description]"
- "scss [what you're trying to do]"

Chances are someone else has had the same problem!

---

## Getting Unstuck

### Reset Everything

If things are really broken:

**1. Delete generated files:**
```bash
rm -rf dist/    # Mac/Linux
rmdir /s dist   # Windows

# Rebuild:
npm run build
```

**2. Reinstall packages:**
```bash
rm -rf node_modules    # Mac/Linux
rmdir /s node_modules  # Windows

npm install
npm run build
```

**3. Start from a clean state:**

If you have Git:
```bash
git status              # See what changed
git diff                # See exact changes
git checkout -- .       # Undo all changes (careful!)
```

---

## Still Stuck?

### Before asking for help, gather this information:

1. **What you're trying to do:**
   "I want to change the primary button color to purple"

2. **What you did:**
   "I changed `$primary: $blue-600;` to `$primary: #9333ea;` in _variables.scss"

3. **What you expected:**
   "Buttons should be purple"

4. **What actually happened:**
   "Buttons are still blue"

5. **Error messages (if any):**
   Copy the full error message from terminal

6. **What you've tried:**
   "I ran npm run build and refreshed the browser"

7. **Environment:**
   - Operating system (Windows 11, macOS Ventura, etc.)
   - Node version (`node --version`)
   - NPM version (`npm --version`)

### Where to get help:

1. **Read the docs:**
   - BEGINNERS_GUIDE.md
   - CUSTOMIZATION_GUIDE.md
   - README.md

2. **Search online:**
   - Bootstrap documentation: https://getbootstrap.com/docs/
   - Sass documentation: https://sass-lang.com/documentation
   - Stack Overflow: https://stackoverflow.com/

3. **Ask in communities:**
   - Bootstrap GitHub Discussions
   - Reddit: r/webdev, r/bootstrap
   - Discord/Slack communities for web development

---

Remember: Everyone gets stuck sometimes. Be patient with yourself, read error messages carefully, and test changes one at a time. You'll get through it!
