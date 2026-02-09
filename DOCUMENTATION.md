<!-- AGENT: Documentation standards for the Bootstrap 5 theme and component library. -->

# Documentation Guidelines

This document defines the standards for generating and maintaining documentation in this repository. This is a **reusable Bootstrap 5 theme and component library**, so documentation is aimed at two audiences: agents working on the library and developers consuming it.

---

## Core Principles

1. **Audience-Centric:** Tailor content to the reader — whether they are an agent extending the library, a developer integrating it, or a beginner learning web development.
2. **Living Documentation:** Documentation must evolve with the code. When SCSS variables, component APIs, or build processes change, the corresponding documentation must be updated in the same commit.
3. **Language:** Strictly adhere to the guidelines in [LANGUAGE.md](./LANGUAGE.md).
4. **Visuals:** Use placeholders for screenshots and diagrams when needed. Agents cannot generate images but should mark where they are required.

---

## Documentation Categories

### 1. Library Consumer Documentation

**Audience:** Developers integrating the theme and components into their own projects.
**Location:** `/docs/`

Structure:
- **Getting Started:** Installation, build, and first integration steps (`QUICK_START.md`).
- **Customisation Guide:** How to override theme variables, change colours, fonts, spacing (`CUSTOMIZATION_GUIDE.md`).
- **Component Reference:** Usage instructions for each custom component, with HTML examples and configuration options.
- **Font Guide:** How the Atkinson Hyperlegible font is loaded and how to swap fonts (`ATKINSON_HYPERLEGIBLE_FONT.md`).
- **Troubleshooting:** Common issues and solutions (`TROUBLESHOOTING.md`).
- **Glossary and FAQ:** Definitions of terms and frequently asked questions (`GLOSSARY_AND_FAQ.md`).

### 2. Component Documentation

**Audience:** Developers using individual components.
**Location:** `COMPONENTS.md` (index) and `./components/<name>/README.md` (per component)

`COMPONENTS.md` must list every custom component with:
- Component name and brief description.
- Path to its CSS and JavaScript files in `dist/`.
- Whether it requires Bootstrap JavaScript.

Each component folder should contain a `README.md` with:
- Purpose and use cases.
- HTML markup example.
- Configuration options (TypeScript interface or attributes).
- Dependencies (Bootstrap JS modules, other components).
- Accessibility notes.

### 3. Internal Developer Documentation

**Audience:** Agents and developers working on the library itself.
**Location:** Root-level Markdown files.

These are the instruction files referenced by `AGENTS.md`:
- `CODING_STYLE.md` — formatting and naming rules.
- `FRONTEND.md` — technology stack and architecture.
- `COMMENTING.md` — how to comment code.
- `LOGGING.md` — how to log in components.
- `TESTING.md` — how to test changes.
- `MARKERS.md` — navigation markers for agents.
- `UX_UI_GUIDELINES.md` — design principles.

These files are documentation themselves and must be kept current.

### 4. Change Documentation

**Audience:** All stakeholders.
**Location:** Root-level files.

- `CONVERSATION.md` — Running log of agent interactions and changes (agentic memory).
- `FONT_UPDATE_SUMMARY.md` — Record of the font change to Atkinson Hyperlegible.
- `ULTRA_COMPACT_THEME_CHANGES.md` — Record of the ultra-compact spacing changes.

When significant changes are made, create or update a summary file describing what changed, why, and how to verify it.

---

## Demo Pages as Documentation

The `demo/index.html` file is a form of living documentation. It must:

- Showcase every Bootstrap component as styled by the theme.
- Include a section for each custom component.
- Use realistic content (not "Lorem ipsum" for key labels and data).
- Be viewable by opening the file directly in a browser (no server required).

When a new component is added, add a corresponding section to the demo page.

---

## Media Placeholders

Agents cannot generate screenshots or videos. When documentation requires visual media, use this placeholder:

```html
<div style="
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    padding: 24px;
    border: 1px solid #e5e7eb;
    background-color: #f9fafb;
    text-align: center;
    margin: 20px 0;
    font-family: sans-serif;
    color: #6b7280;">
    <strong>[MEDIA TYPE: Description of content]</strong><br>
    <em>(e.g., Screenshot of the metric card component in the demo page)</em>
</div>
```

Examples:
- `[SCREENSHOT: The error dialog component showing a network error]`
- `[DIAGRAM: The SCSS build pipeline from source to dist]`

---

## Style and Formatting

- **Hierarchy:** Use clear headings (`#`, `##`, `###`) to structure content logically.
- **Code blocks:** Use fenced code blocks with language hints (` ```html `, ` ```scss `, ` ```typescript `).
- **UI element references:** Use **bold** for UI elements, class names, and file paths.
- **Lists:** Use numbered lists for sequential steps, bullet lists for unordered items.
- **Links:** Use relative links to other files in the repository (e.g., `[CODING_STYLE.md](./CODING_STYLE.md)`).

---

## Workflow Integration

Documentation is part of the "Definition of Done". A change is not complete until:

1. The relevant documentation files are updated.
2. `COMPONENTS.md` is updated if a component was added or changed.
3. `demo/index.html` includes the new or changed component.
4. `CONVERSATION.md` records the change.
