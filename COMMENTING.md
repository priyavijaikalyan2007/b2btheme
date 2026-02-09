<!-- AGENT: Code commenting standards for the theme and component library. -->

# Code Commenting Guide

A reference for generating well-commented, maintainable code in this Bootstrap 5 theme and component library.

---

## 1. Core Philosophy

### 1.1 The Audience

Write comments for:

- **Future You** — You won't remember your reasoning in six months. Comments are documentation for your past self's thinking.
- **The Less Experienced** — Assume the reader is a capable but inexperienced developer who needs context, not hand-holding.
- **Posterity** — Someone will maintain this code long after you're gone. They deserve context.
- **Agents** — Other AI agents (review, security, testing, refactoring) will parse this code. Guide them.

### 1.2 The Tone

Comments must adhere to the style and tone guidelines defined in [LANGUAGE.md](./LANGUAGE.md). In summary:

- Simple, concise, and precise
- Neutral, unemotional, and objective
- Standard British English for business communication
- Free of technical jargon, profanity, or overly complex words
- Upleveled but accessible to non-native speakers

---

## 2. What to Comment

### 2.1 All Entities

Every named construct deserves a comment explaining its purpose and intended usage:

| Entity Type | Comment Should Include |
|-------------|------------------------|
| Classes | Purpose, responsibilities, key collaborators |
| Interfaces | Contract description, expected implementations |
| Functions / Methods | What it does, parameters, return value, side effects |
| SCSS Mixins | What it generates, parameters, where it is used |
| SCSS Variables (custom) | What it controls, valid values, units |
| Constants | Why this value, where it came from |

### 2.2 Significant Logic Blocks

Comment any non-trivial block of logic:

- DOM manipulation sequences
- Event handler registration and delegation
- Bootstrap JavaScript API interactions
- Complex SCSS calculations or selector chains
- Build pipeline steps

### 2.3 Non-Obvious Decisions

Comment when:

- The obvious approach wasn't taken (and why)
- A workaround exists for a browser bug or Bootstrap limitation
- Performance considerations drove the design
- Accessibility requirements influenced the code

---

## 3. How to Comment

### 3.1 What, Why — Not How

```typescript
// BAD: How (redundant with code)
// Loop through items and check if element exists
for (const item of items)
{
    if (document.getElementById(item.id)) { ... }
}

// GOOD: What and Why
// Remove stale dialog elements — components may leave orphaned modals after errors
for (const item of items)
{
    if (document.getElementById(item.id)) { ... }
}
```

### 3.2 Standard Annotations

Use consistent annotations to mark code states and intentions:

| Annotation | Purpose |
|------------|---------|
| `TODO` | Work to be completed |
| `FIXME` | Known broken code needing repair |
| `BUG` | Documents a known bug |
| `BUGFIX` | Explains why code exists to fix a bug |
| `HACK` | Temporary workaround, not ideal |
| `PERF` | Performance-related note or optimisation |
| `SECURITY` | Security-sensitive code |
| `DEPRECATED` | Scheduled for removal |
| `REVIEW` | Needs human review |

Format: `// ANNOTATION: Description with context`

```typescript
// TODO: Add keyboard navigation for arrow keys (spec section 3.2)
// BUGFIX: Chrome 120 requires explicit tabindex for focus — see issue #42
// HACK: Bootstrap 5.3 modal backdrop z-index conflict — revisit after upgrade
```

### 3.3 Agent Markers

Guide automated tools with explicit markers:

```typescript
// @agent:test — Cover edge case where container ID is null
// @agent:security — Verify this does not inject unsanitised HTML
// @agent:review — Complex selector logic, needs human verification
// @agent:refactor — Candidate for extraction once more components exist
```

### 3.4 Section Headers

For longer files, use section comments to create navigable structure:

```typescript
// ============================================================================
// PUBLIC API
// ============================================================================

// ============================================================================
// PRIVATE HELPERS
// ============================================================================

// ============================================================================
// EVENT HANDLERS
// ============================================================================
```

---

## 4. Language-Specific Conventions

### 4.1 TypeScript / JavaScript

Use JSDoc for functions and complex types:

```typescript
/**
 * Displays a structured error dialog using Bootstrap's modal.
 *
 * @param containerId - The DOM element ID where the modal will be injected
 * @param options - The error information to display
 * @returns void
 */
function showErrorDialog(containerId: string, options: ErrorDialogOptions): void
```

### 4.2 SCSS

Use `/* */` block comments for file headers and section markers (preserved in compiled CSS when not minified). Use `//` line comments for inline explanations (stripped during compilation).

```scss
/*
 * ⚓ COMPONENT: MetricCard
 * 📜 PURPOSE: Styles for the metric card dashboard component.
 * 🔗 RELATES: [[DashboardLayout]]
 */

// Card container — uses theme border and spacing variables
.metric-card {
    padding: $spacer;
    border: 1px solid $gray-300;
    // PERF: Using a simple border instead of box-shadow for rendering performance
    background: white;
}

// Value display — large, bold, high contrast for readability
.metric-value {
    font-size: 1.5rem;
    font-weight: $font-weight-bold;
    color: $gray-900;
}
```

### 4.3 HTML

Use HTML comments for component markers and agent navigation:

```html
<!--
  ⚓ COMPONENT: ErrorDialog
  📜 PURPOSE: Demo markup for the error dialog component.
  🔗 RELATES: [[LiterateErrors]]
-->
<div id="error-dialog-demo">
    <!-- Action buttons — see spec section 4.1 for required actions -->
    <div class="errordialog-actions">
        ...
    </div>
</div>
```

---

## 5. Maintaining Comments

### 5.1 Living Documentation

Comments must evolve with the code:

- Update comments when logic changes.
- Remove comments for deleted code.
- Mark outdated comments for review if uncertain.
- Treat comment rot as a code smell.

### 5.2 Review Checklist

When modifying code, verify:

- [ ] Entity comments still accurate
- [ ] Logic block comments reflect current behaviour
- [ ] Annotations are still relevant (TODOs completed? BUGFIXes still needed?)
- [ ] Agent markers still appropriate

---

## 6. What Not to Comment

### 6.1 Tutorials and Guides

Code comments are not the place for:
- Framework tutorials
- Bootstrap usage guides
- Build setup instructions

**Instead:** Create documents in `/docs/` or `/guides/` as needed.

### 6.2 Obvious Code

Don't comment self-evident operations:

```typescript
// BAD: States the obvious
// Increment the counter
counter++;

// Set the title text
titleElement.textContent = title;

// Return the result
return result;
```

---

## 7. Quick Reference

### Comment Decision Tree

```
Is this an entity (class, function, mixin, variable)?
  → YES: Add purpose and usage comment

Is this a significant logic block?
  → YES: Add what/why comment

Is this a non-obvious decision?
  → YES: Explain the reasoning

Is there work to be done or a known issue?
  → YES: Add appropriate annotation

Should an agent pay special attention here?
  → YES: Add agent marker

Would this need a tutorial to understand?
  → YES: Write a guide in /docs/, not a comment
```

### Annotation Quick Reference

```
TODO:       Future work
FIXME:      Broken, needs repair
BUG:        Known defect
BUGFIX:     Explains bug fix rationale
HACK:       Temporary workaround
PERF:       Performance note
SECURITY:   Security-sensitive
DEPRECATED: Removal planned
REVIEW:     Needs human eyes
```
