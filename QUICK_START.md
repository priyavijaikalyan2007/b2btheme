<!-- AGENT: Beginner quick-start guide for getting the theme running in 30 minutes. -->

# Quick Start Guide - Your First 30 Minutes

This guide gets you up and running in 30 minutes, even if you've never done web development before.

## What You'll Do

1. View the demo page
2. Make your first color change
3. See your change in the browser
4. Learn where to go next

Let's go! 🚀

---

## Step 1: View the Demo (5 minutes)

### Windows
1. Open File Explorer
2. Navigate to your project folder
3. Go into the `demo` folder
4. Find `index.html`
5. Double-click it (it should open in your web browser)

### Mac
1. Open Finder
2. Navigate to your project folder
3. Go into the `demo` folder
4. Find `index.html`
5. Double-click it (it should open in your web browser)

### What You See
A demo page showing buttons, forms, tables, and other components. This is your theme!

**Tip:** Keep this browser window open - you'll refresh it to see your changes.

---

## Step 2: Install Node.js (10 minutes) - ONE TIME ONLY

You need Node.js to build the theme. If you already have it, skip to Step 3.

### Check If You Have It
Open a terminal/command prompt and type:
```bash
node --version
```

If you see a version number like `v20.10.0`, you have it! Skip to Step 3.

If you see "command not found" or an error, install it:

### Install Node.js
1. Go to https://nodejs.org/
2. Click the big green button that says "LTS" (Long Term Support)
3. Download the installer
4. Run the installer
5. Click "Next" through all the steps (keep all defaults)
6. Restart your computer (important!)
7. Try `node --version` again to verify

---

## Step 3: Install Packages (5 minutes) - ONE TIME ONLY

Open a terminal/command prompt in your project folder.

### Windows - Opening Terminal
1. Open File Explorer to your project folder
2. Click in the address bar at the top
3. Type `cmd` and press Enter
4. A black window appears - this is your terminal!

### Mac - Opening Terminal
1. Open Finder to your project folder
2. Right-click the folder
3. Select "Services" → "New Terminal at Folder"
4. A window appears - this is your terminal!

### Run This Command
Type this and press Enter:
```bash
npm install
```

**What happens:**
- You'll see lots of text scrolling
- It downloads all the tools you need
- Takes 30-60 seconds
- When done, you'll see your cursor again

**Only do this once!** You won't need to do it again unless you delete the `node_modules` folder.

---

## Step 4: Make Your First Change (5 minutes)

Let's change the primary blue color to purple!

### Find the File
1. Open a text editor (Notepad on Windows, TextEdit on Mac, or download VS Code - it's free and better!)
2. Open your project folder in the editor
3. Navigate to: `src/scss/_variables.scss`
4. Look for this line (around line 63):
   ```scss
   $primary: $blue-600 !default;
   ```

### Change It
Replace that line with:
```scss
$primary: #9333ea !default;
```

**What you did:** Changed the primary color from blue (`$blue-600`) to purple (`#9333ea`)

### Save the File
Press Ctrl+S (Windows) or Cmd+S (Mac)

---

## Step 5: Build the Theme (2 minutes)

Go back to your terminal (from Step 3) and type:
```bash
npm run build
```

**What happens:**
- Your SCSS files are converted to CSS
- Takes 5-10 seconds
- You might see some orange "DEPRECATION WARNING" messages - ignore them, they're harmless
- When done, you'll see your cursor again

---

## Step 6: See Your Change (2 minutes)

Go back to your browser with `demo/index.html` open.

### Refresh the Page
Press Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

**This is a "hard refresh" - it forces the browser to reload the CSS file.**

### What You Should See
- All the primary buttons are now purple!
- All the links are now purple!
- Any blue elements are now purple!

**🎉 Congratulations! You just customized your theme!**

---

## Step 7: Experiment! (5+ minutes)

Try changing other things:

### Make Everything Bigger
1. Open `src/scss/_variables.scss`
2. Find line ~114: `$spacer: 0.75rem !default;`
3. Change to: `$spacer: 1rem !default;`
4. Find line ~90: `$font-size-base: 0.875rem !default;`
5. Change to: `$font-size-base: 1rem !default;`
6. Save the file
7. Run `npm run build` in terminal
8. Hard refresh your browser

Everything is now bigger with more spacing!

### Change the Success Color to Teal
1. Open `src/scss/_variables.scss`
2. Find line ~65: `$success: $green-600 !default;`
3. Change to: `$success: #14b8a6 !default;`
4. Save, build, refresh

Success messages and buttons are now teal!

### Undo Your Changes
1. In your editor, press Ctrl+Z (Windows) or Cmd+Z (Mac) to undo
2. Save the file
3. Build again
4. Refresh browser

Back to the original!

---

## Common Problems

### "npm: command not found"
→ Node.js isn't installed. Go back to Step 2.

### Changes don't appear
→ Did you run `npm run build`?
→ Did you hard refresh (Ctrl+Shift+R)?
→ Did you save the file?

### Terminal/Command Prompt won't open
→ Windows: Search for "cmd" in Start Menu
→ Mac: Search for "Terminal" in Spotlight

### Can't find the file
→ Make sure you're looking in `src/scss/_variables.scss` (not in `dist`!)

### Build shows errors
→ Check that you didn't accidentally delete a semicolon (`;`)
→ Make sure quotes match (`"` or `'`)
→ Undo your changes and try again

---

## What You Learned

✅ How to open the demo page
✅ How to install Node.js and packages
✅ How to find and edit variables
✅ How to build the theme
✅ How to see your changes in the browser
✅ That changing one variable affects many things!

---

## Next Steps

### Want to Learn More?

**Read the full documentation:**
👉 [Start with docs/INDEX.md](docs/INDEX.md)

Choose your path:
- **Complete beginner?** → [docs/BEGINNERS_GUIDE.md](docs/BEGINNERS_GUIDE.md)
- **Want to customize more?** → [docs/CUSTOMIZATION_GUIDE.md](docs/CUSTOMIZATION_GUIDE.md)
- **Having problems?** → [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)

### Tips for Faster Development

Instead of running `npm run build` every time:
```bash
npm run watch
```

This watches your files and automatically rebuilds when you save! Keep it running in your terminal while you work.

To stop watch mode: Press Ctrl+C

### Make Your Own Page

1. Create a new file: `mypage.html` (anywhere you want)
2. Copy this into it:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Custom Page</title>
    <!-- Link to your custom theme -->
    <link rel="stylesheet" href="dist/css/custom.css">
</head>
<body>
    <div class="container mt-5">
        <h1>My First Custom Page</h1>
        <p>This uses my custom theme!</p>
        <button class="btn btn-primary">Click Me</button>
    </div>
</body>
</html>
```

3. Adjust the `href` path if needed (depends on where you put the file)
4. Open it in your browser!

---

## Keyboard Shortcuts to Remember

- **Save file:** Ctrl+S (Windows) or Cmd+S (Mac)
- **Undo:** Ctrl+Z (Windows) or Cmd+Z (Mac)
- **Hard refresh browser:** Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- **Find in file:** Ctrl+F (Windows) or Cmd+F (Mac)
- **Stop terminal command:** Ctrl+C

---

## Getting Help

**Before asking:**
1. Check [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)
2. Check [docs/GLOSSARY_AND_FAQ.md](docs/GLOSSARY_AND_FAQ.md)
3. Try undoing your change - does it work again?

**When asking for help, include:**
- What you're trying to do
- What you expected
- What actually happened
- Any error messages (copy the full message!)

---

## You Did It!

You've successfully:
- Set up a professional development environment
- Made your first theme customization
- Built a project using modern tools
- Seen your changes in the browser

**That's awesome!** Most people never even try. You're already ahead!

Now go explore, experiment, and have fun customizing your theme! Remember: you can always undo changes (Ctrl+Z) or rebuild from scratch.

Happy coding! 🎨
