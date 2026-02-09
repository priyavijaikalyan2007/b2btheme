<!-- AGENT: Documentation index — entry point for all user-facing guides and references. -->

# Documentation Index

Welcome to the Enterprise Bootstrap Theme documentation! This index will help you find the information you need.

## Getting Started

If you're new to web development or this project, start here:

### 1. **[BEGINNERS_GUIDE.md](BEGINNERS_GUIDE.md)** - START HERE!
**Read this first if you're new to web development.**

Learn about:
- What HTML, CSS, JavaScript, and SCSS are
- How Bootstrap works
- How NPM and build tools work
- How this project is structured
- Your first customizations
- Step-by-step examples

**Time to read:** 45-60 minutes
**Difficulty:** Beginner
**Prerequisites:** None

---

## Customization Guides

Once you understand the basics, these guides show you how to customize everything:

### 2. **[CUSTOMIZATION_GUIDE.md](CUSTOMIZATION_GUIDE.md)**
**Complete guide to customizing every aspect of your theme.**

Learn how to:
- Change colors and create color schemes
- Customize typography (fonts, sizes)
- Adjust spacing and layouts
- Modify Bootstrap components (buttons, forms, tables, etc.)
- Create your own custom components
- Make designs responsive
- Use advanced SCSS techniques

**Time to read:** 60-90 minutes
**Difficulty:** Beginner to Intermediate
**Prerequisites:** Read BEGINNERS_GUIDE.md first

---

## Problem Solving

When something goes wrong, check these resources:

### 3. **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)**
**Solutions to common problems and errors.**

Find solutions for:
- Installation problems
- Build errors
- Styles not applying
- Browser compatibility issues
- Understanding error messages

**Time to read:** Use as reference when needed
**Difficulty:** All levels
**Prerequisites:** None - use when you have a problem

### 4. **[GLOSSARY_AND_FAQ.md](GLOSSARY_AND_FAQ.md)**
**Definitions of terms and answers to common questions.**

Includes:
- Complete glossary of web development terms
- Frequently asked questions
- Quick reference guides

**Time to read:** Use as reference
**Difficulty:** All levels
**Prerequisites:** None - use whenever you need clarification

### 5. **[ABOUT_DEPRECATION_WARNINGS.md](ABOUT_DEPRECATION_WARNINGS.md)**
**Understanding Sass deprecation warnings (technical deep-dive).**

Explains:
- What deprecation warnings are and why they appeared
- Why it's safe to suppress them
- The future of Sass and Bootstrap
- Technical details for developers

**Time to read:** 10-15 minutes
**Difficulty:** Intermediate to Advanced
**Prerequisites:** Optional - only if you're curious about the technical details

### 6. **[ATKINSON_HYPERLEGIBLE_FONT.md](ATKINSON_HYPERLEGIBLE_FONT.md)**
**Complete guide to the Atkinson Hyperlegible font.**

Explains:
- What Atkinson Hyperlegible is and why it's used
- Benefits for accessibility and readability
- How it's implemented in the theme
- How to self-host if needed
- Alternative fonts and how to change

**Time to read:** 15-20 minutes
**Difficulty:** Beginner to Intermediate
**Prerequisites:** None - useful for anyone wanting to understand the font choice

---

## Code Reference

These files show you the actual code:

### 7. **[README.md](../README.md)**
**Project overview and quick reference.**

Contains:
- Project description
- Quick start guide
- Component examples
- Build commands

**Time to read:** 15 minutes
**Difficulty:** All levels
**Prerequisites:** None

### 8. **[src/scss/_variables-commented.scss](../src/scss/_variables-commented.scss)**
**Heavily commented variables file for learning.**

This is a special version of `_variables.scss` with extensive comments explaining:
- What each variable does
- How to customize it
- What happens when you change it
- Recommendations and tips

**Time to read:** 30-45 minutes
**Difficulty:** Beginner to Intermediate
**Prerequisites:** Basic understanding from BEGINNERS_GUIDE.md

**Note:** This is for learning. Use the regular `_variables.scss` for your actual customizations.

---

## Learning Paths

### Path 1: Complete Beginner
**"I've never done web development before"**

1. Read **BEGINNERS_GUIDE.md** (all sections)
2. Open `demo/index.html` in your browser to see what the theme looks like
3. Follow the "Your First Steps" section in BEGINNERS_GUIDE
4. Try the "Common Tasks" examples
5. When ready, read **CUSTOMIZATION_GUIDE.md** (Colors and Typography sections)
6. Keep **GLOSSARY_AND_FAQ.md** open as you work for reference

**Estimated time:** 4-6 hours spread over several days

---

### Path 2: Some Web Experience
**"I know some HTML/CSS but not SCSS or Bootstrap"**

1. Skim **BEGINNERS_GUIDE.md** (focus on SCSS and Bootstrap sections)
2. Read **CUSTOMIZATION_GUIDE.md** (all sections)
3. Study `src/scss/_variables-commented.scss`
4. Try customizing colors and spacing
5. Create a custom component following the examples
6. Refer to **TROUBLESHOOTING.md** if you hit issues

**Estimated time:** 2-3 hours

---

### Path 3: Experienced Developer
**"I know web development, just new to this project"**

1. Read **README.md** for project overview
2. Skim **CUSTOMIZATION_GUIDE.md** (Advanced Techniques section)
3. Review `src/scss/_variables.scss` and `src/scss/custom.scss`
4. Run `npm run build` and test
5. Keep **TROUBLESHOOTING.md** and **GLOSSARY_AND_FAQ.md** handy for reference

**Estimated time:** 30-60 minutes

---

## File Structure Reference

### Documentation Files
```
docs/
├── INDEX.md                    ← You are here!
├── BEGINNERS_GUIDE.md          ← Complete introduction for beginners
├── CUSTOMIZATION_GUIDE.md      ← How to customize everything
├── TROUBLESHOOTING.md          ← Solutions to common problems
└── GLOSSARY_AND_FAQ.md         ← Terms and frequently asked questions
```

### Source Files (What You Edit)
```
src/
└── scss/
    ├── _variables.scss         ← Customize colors, sizes, spacing
    ├── _variables-commented.scss ← Learning version with comments
    └── custom.scss             ← Custom styles and components
```

### Generated Files (Don't Edit!)
```
dist/
├── css/
│   └── custom.css              ← Generated CSS (overwritten on build)
└── js/
    └── bootstrap.bundle.min.js ← Bootstrap JavaScript
```

### Demo and Examples
```
demo/
└── index.html                  ← Test page showing all components
```

---

## Quick Reference Cards

### Most Common Tasks

**Change Primary Color:**
1. Open `src/scss/_variables.scss`
2. Find: `$primary: $blue-600 !default;`
3. Change to your color: `$primary: #YOUR_COLOR !default;`
4. Run: `npm run build`

**Make Everything Bigger:**
1. Open `src/scss/_variables.scss`
2. Find: `$font-size-base: 0.875rem !default;`
3. Change to: `$font-size-base: 1rem !default;`
4. Find: `$spacer: 0.75rem !default;`
5. Change to: `$spacer: 1rem !default;`
6. Run: `npm run build`

**Add Custom Component:**
1. Open `src/scss/custom.scss`
2. Add your styles at the bottom
3. Run: `npm run build`
4. Use in HTML with your class name

### Most Common Commands

```bash
npm install          # First time setup - install packages
npm run build        # Build once
npm run watch        # Build and watch for changes
npm run dev          # Build and watch (same as watch)
```

### Most Common Errors

**"npm: command not found"**
→ Install Node.js from nodejs.org

**Changes not showing**
→ Run `npm run build` and hard refresh browser (Ctrl+Shift+R)

**"Undefined variable"**
→ Check spelling and make sure variable is defined before use

**Build errors**
→ Check for missing semicolons, brackets, or quotes in SCSS

---

## Tips for Using This Documentation

### For Reading
- **Don't try to read everything at once** - Start with the beginner's guide
- **Follow your learning path** (above) based on your experience level
- **Use the glossary** whenever you encounter unfamiliar terms
- **Try examples as you read** - hands-on learning is best

### For Reference
- **Use the search function** (Ctrl+F / Cmd+F) to find specific topics
- **Bookmark this index** and the pages you reference most
- **Keep troubleshooting guide open** when working on customizations
- **Check FAQ first** before searching online

### For Learning
- **Make one change at a time** and see what happens
- **Comment your code** so you remember what you changed
- **Experiment!** You can always undo or rebuild
- **Take breaks** - learning takes time

---

## Additional Resources

### Official Documentation
- **Bootstrap:** https://getbootstrap.com/docs/
- **Sass/SCSS:** https://sass-lang.com/documentation
- **MDN Web Docs** (HTML/CSS): https://developer.mozilla.org/

### Learning Platforms
- **freeCodeCamp:** https://www.freecodecamp.org/ (Free)
- **Codecademy:** https://www.codecademy.com/ (Free & Paid)
- **W3Schools:** https://www.w3schools.com/ (Free)

### Tools
- **Color Contrast Checker:** https://webaim.org/resources/contrastchecker/
- **Color Palette Generator:** https://coolors.co/
- **Google Fonts:** https://fonts.google.com/

---

## Getting Help

### Before Asking for Help
1. Check the **TROUBLESHOOTING.md** guide
2. Check the **GLOSSARY_AND_FAQ.md** for answers
3. Search online for the error message
4. Try undoing your last change

### When Asking for Help
Include:
- What you're trying to do
- What you expected to happen
- What actually happened
- Any error messages (copy the full message)
- What you've already tried

### Where to Ask
- **Bootstrap:** GitHub Discussions or Stack Overflow with tag `bootstrap-5`
- **Sass:** Stack Overflow with tag `sass` or `scss`
- **General web dev:** Stack Overflow, Reddit r/webdev, or other forums

---

## Contributing to Documentation

If you find errors, unclear explanations, or have suggestions:

1. **Typos/small fixes:** Note them down and report
2. **Unclear sections:** Let us know what's confusing
3. **Missing information:** Tell us what you'd like to see documented
4. **Better examples:** Share your ideas!

Good documentation helps everyone learn better!

---

## Version Information

**Documentation Version:** 1.0
**Last Updated:** 2024
**Compatible with:**
- Bootstrap 5.3.x
- Sass 1.x
- Node.js 18+ / NPM 9+

---

## Next Steps

**If you haven't already:**
1. Make sure you've run `npm install` in the project directory
2. Run `npm run build` to compile the theme
3. Open `demo/index.html` in your browser to see the theme

**Then:**
1. Choose your learning path (above) based on your experience
2. Start with the recommended first document
3. Have fun customizing your theme!

---

Happy coding! Remember: everyone starts as a beginner. Take it step by step, and you'll be creating amazing custom themes in no time! 🚀
