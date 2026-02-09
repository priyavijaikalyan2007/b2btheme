<!-- AGENT: Additional context-specific instructions for coding agents working on the theme and component library. -->

# Additional Instructions for Coding Agents

These instructions supplement the primary guidelines in `AGENTS.md`, `CODING_STYLE.md`, and `FRONTEND.md`. They capture lessons learned and non-obvious rules specific to this Bootstrap 5 theme and component library.

---

## Coding

### Bootstrap Variable Discipline

- **"Override, don't overwrite."**
- **Variables First:** When changing the appearance of any Bootstrap element, modify `_variables.scss` before writing custom CSS. If Bootstrap provides a variable for the property, use it.
- **No Hardcoded Values:** Never hardcode hex colours (e.g., `#FF0000`), pixel sizes, or font stacks in component SCSS or HTML. Use the semantic names defined in `_variables.scss` (e.g., `$danger`, `$font-size-sm`, `$spacer`).
- **Unit Consistency:** Do not mix `px`, `rem`, `em`, and `%` arbitrarily. Follow the spacing scale in `_variables.scss`. Use `rem` for sizing, `px` only for borders and fine details (1px borders, box shadows).

### Component Self-Containment

- **"Components are guests, not owners."**
- **No Global Side Effects:** A component's SCSS must not modify global Bootstrap styles, override utility classes, or change the behaviour of elements outside its own scope.
- **Namespace Classes:** Prefix all custom classes with the component name (e.g., `.errordialog-header`, `.combobox-dropdown`). Do not use generic class names like `.header` or `.dropdown-list` that could collide with Bootstrap or the host application.
- **Explicit Dependencies:** If a component requires Bootstrap JavaScript (e.g., `bootstrap.Modal`), document this in the component's README and in `COMPONENTS.md`.

### Root Cause Refactoring (No Ad-Hoc Patches)

- **"Fix it right, don't just make it work."**
- **Consolidate, Don't Duplicate:** If you find duplicate or parallel implementations (e.g., two SCSS files styling the same element differently), do not patch the one that "works". Merge the logic into a single source of truth and delete the duplicate.
- **Deep Fixes:** Do not write workaround CSS to compensate for a broken variable. Fix the variable.

### Dependency Discipline (The "No New Toys" Rule)

- **"Use what is already there."**
- **Duplicate Check:** Before adding a new npm package, check `package.json`. This library has minimal dependencies by design (Bootstrap, Sass, PostCSS, Wrangler). Adding a dependency requires justification.
- **Triviality Check:** Do not add libraries for trivial one-line functions. Write the helper yourself.
- **No UI Frameworks:** Do not install React, Vue, Angular, jQuery, or any UI framework. This is explicitly prohibited by the project's architecture.

### Async Consistency

- **"One style, everywhere."**
- If the codebase uses `async/await`, use it exclusively. Do not mix `Promise.then()` chains with `async/await` in the same component.

### Code Hygiene

- **"Delete, don't disable."**
- **No Commented-Out Code:** Do not leave blocks of commented-out SCSS, TypeScript, or HTML "just in case". Rely on Git history.
- **Import Cleanup:** Unused SCSS imports, TypeScript imports, and variables are technical debt. Remove them before considering a task complete.
- **No Dead CSS:** If a refactor removes a component or class, delete the corresponding styles. Do not leave orphaned selectors.

---

## Testing

### SCSS Build Verification

You must verify that `npm run build` completes without errors after every change to SCSS files. A broken build is never acceptable.

### Component Testing

When building TypeScript components, add unit tests using Jest or Vitest that verify:
- The component initialises correctly with valid inputs.
- The component handles missing or invalid inputs gracefully (logs a warning/error, does not throw).
- The component produces the expected DOM structure.

### Visual Verification

After any theme or component change, open `demo/index.html` in a browser and visually verify that:
- No existing components are broken.
- New components render as specified.
- Colours, spacing, and typography are consistent with the theme.

---

## Clarification

### Clarifying Questions

When any aspect of a task is unclear or ambiguous, ask clarifying questions before proceeding. Present the various choices or interpretations you see. It is better to ask questions than to make potentially incorrect assumptions.

### UX First

Always consider the user experience before finalising component design or styling changes.
- Consult `UX_UI_GUIDELINES.md` for design principles.
- If the intended appearance or behaviour is unclear, ask for clarification.

---

## Memory

### CONVERSATION.md Updates

You must always update `CONVERSATION.md` with a brief description of changes made after each set of changes. This file serves as organisational and agentic memory tracking the evolution of the library. Do not skip this step.

---

## Changes

### `git commit`

You must always commit all changes to `git` with a concise description of changes made after each set of changes. This ensures that work is not lost.
