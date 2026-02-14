<!-- AGENT: Documentation index — entry point for all user-facing guides and references. -->

# Documentation Index

Welcome to the Enterprise Bootstrap Theme documentation. Start here to find the guide you need.

---

## Live Demo

### **[Component Demo](demo.html)**
Interactive demo page showcasing every component and Bootstrap theme override. Browse colours, typography, form elements, and all custom components (ErrorDialog, EditableComboBox, DatePicker, TimePicker, DurationPicker, ProgressModal, TimezonePicker, CronPicker, MarkdownEditor, StatusBar, Sidebar, BannerBar, Toolbar, Gauge, Conversation, Timeline) in the themed context.

---

## Integration and Reference

### 1. **[Getting Started](GETTING_STARTED.md)**
Integration guide for consumers. What `dist/` contains, minimal HTML boilerplate, loading fonts and icons, adding components, and a verification checklist.

### 2. **[Design Tokens](DESIGN_TOKENS.md)** (auto-generated)
Every SCSS variable from `_variables.scss` — colours, typography, spacing, borders, component padding — grouped by category with resolved values.

### 3. **[Component Reference](COMPONENT_REFERENCE.md)** (auto-generated)
Full API documentation for all custom components. Includes HTML examples, TypeScript interfaces, dependency lists, and dist paths.

### 4. **[Custom CSS Classes](CUSTOM_CLASSES.md)**
Reference for all enterprise CSS classes from `custom.scss` — tables, cards, sidebar, toolbar, metrics, badges, modals, forms, and accessibility utilities with markup examples.

### 5. **[Font Guide](FONT_GUIDE.md)**
Open Sans and JetBrains Mono setup. How to load from Google Fonts, how to swap to a different font, self-hosting instructions, and recommended alternatives.

### 6. **[Customization Guide](CUSTOMIZATION_GUIDE.md)**
Deep dive into overriding theme variables — colours, typography, spacing, and creating custom components.

---

## Problem Solving

### 7. **[Troubleshooting](TROUBLESHOOTING.md)**
Solutions for installation problems, build errors, styles not applying, and browser compatibility issues.

### 8. **[Glossary and FAQ](GLOSSARY_AND_FAQ.md)**
Definitions of web development terms and answers to common questions.

### 9. **[About Deprecation Warnings](ABOUT_DEPRECATION_WARNINGS.md)** (source-only)
Technical explanation of Sass deprecation warnings and why they are suppressed.

---

## For Coding Agents

### 10. **[Agent Quick Reference](AGENT_QUICK_REF.md)** (auto-generated)
Machine-parseable reference with dist paths, design tokens as key=value pairs, custom CSS class list, and component API signatures.

---

## Learning Paths

### Path 1: Complete Beginner
1. Read **[Beginners Guide](BEGINNERS_GUIDE.md)** (source-only, not shipped to consumers)
2. Open the **[Component Demo](demo.html)** in your browser
3. Follow the "Your First Steps" section
4. Move on to **Customization Guide**

### Path 2: Experienced Developer
1. Read **[Getting Started](GETTING_STARTED.md)** for the integration boilerplate
2. Skim **[Design Tokens](DESIGN_TOKENS.md)** for available variables
3. Review **[Custom CSS Classes](CUSTOM_CLASSES.md)** for enterprise components
4. Check **[Component Reference](COMPONENT_REFERENCE.md)** for component APIs
5. Customise via **[Customization Guide](CUSTOMIZATION_GUIDE.md)**

### Path 3: Coding Agent
1. Read **[Agent Quick Reference](AGENT_QUICK_REF.md)** for compact token/class/API data
2. Read **[Design Tokens](DESIGN_TOKENS.md)** for full variable details
3. Read **[Component Reference](COMPONENT_REFERENCE.md)** for component interfaces
4. Consult `agentknowledge/` for ADRs and concept mappings

---

## File Structure

### Documentation (docs/)
```
docs/
  INDEX.md                    -- You are here
  GETTING_STARTED.md          -- Integration guide
  DESIGN_TOKENS.md            -- Auto-generated design token catalogue
  COMPONENT_REFERENCE.md      -- Auto-generated component API reference
  CUSTOM_CLASSES.md            -- CSS class reference
  FONT_GUIDE.md               -- Font loading and swapping
  AGENT_QUICK_REF.md          -- Auto-generated agent quick reference
  CUSTOMIZATION_GUIDE.md      -- How to override the theme
  TROUBLESHOOTING.md          -- Common issues and solutions
  GLOSSARY_AND_FAQ.md         -- Terms and FAQs
  BEGINNERS_GUIDE.md          -- Beginner introduction (source-only)
  ABOUT_DEPRECATION_WARNINGS.md -- Sass warnings (source-only)
```

### Consumer Distribution (dist/docs/)
```
dist/docs/
  index.html                  -- Start here (HTML version of this index)
  demo.html                   -- Live component demo (all components + theme)
  GETTING_STARTED.html        -- Integration guide
  DESIGN_TOKENS.html          -- Design token catalogue
  COMPONENT_REFERENCE.html    -- Component API reference
  CUSTOM_CLASSES.html         -- CSS class reference
  FONT_GUIDE.html             -- Font guide
  AGENT_QUICK_REF.html        -- Agent quick reference
  CUSTOMIZATION_GUIDE.html    -- Customization guide
  TROUBLESHOOTING.html        -- Troubleshooting
  GLOSSARY_AND_FAQ.html       -- Glossary and FAQ
  *.md                        -- Markdown originals for agents
  components/
    errordialog/
      README.md               -- ErrorDialog documentation
```

---

## Auto-Generated Docs

Three documentation files are auto-generated from source code during `npm run build`:

| File | Source | Generator |
|------|--------|-----------|
| `DESIGN_TOKENS.md` | `src/scss/_variables.scss` | `scripts/generate-docs.js` Phase A |
| `COMPONENT_REFERENCE.md` | `components/*/README.md` | `scripts/generate-docs.js` Phase B |
| `AGENT_QUICK_REF.md` | Variables + custom.scss + components | `scripts/generate-docs.js` Phase C |

Do not edit these files by hand. They are overwritten on every build.

All `dist/docs/*.html` files are also generated during build using the enterprise theme CSS, providing a styled reading experience for consumers.

---

## Version Information

**Last Updated:** 2026-02-09
**Compatible with:** Bootstrap 5.3.x, Sass 1.x, Node.js 18+
