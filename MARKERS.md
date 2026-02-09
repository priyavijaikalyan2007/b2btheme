<!-- AGENT: Marker guidance for fast navigation and shared conventions in the theme and component library. -->

# Agent Navigation Markers and Annotations

To accelerate agent comprehension and navigation, we use a standard system of **Semantic Markers**. These markers act as high-speed indexing tags, allowing agents to understand a file's purpose, dependencies, and flow without analysing the entire content.

---

## 0. Principles

- **Be consistent:** Use the same marker names everywhere.
- **Be minimal:** Add only markers that materially improve navigation.
- **Keep them current:** If you change responsibility or flow, update markers in the same edit.
- **Do not change logic:** Markers are comments or directives only.

---

## 1. The "Fast-Read" File Header

Every significant source file (TypeScript components, SCSS component files, HTML templates) must start with a **Structured Header Block**. This allows agents to read the first 20 lines of a file and immediately understand its context.

### TypeScript Format

```typescript
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: [ComponentName]
 * 📜 PURPOSE: [Concise description of what this file does]
 * 🔗 RELATES: [Reference to related files or specs, e.g., [[LiterateErrors]]]
 * ⚡ FLOW: [Inbound Caller] -> [This Component] -> [Outbound Dependency]
 * ----------------------------------------------------------------------------
 */
```

**Example:**

```typescript
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: ErrorDialog
 * 📜 PURPOSE: Renders literate error messages in a Bootstrap 5 modal dialog.
 * 🔗 RELATES: [[LiterateErrors]], [[ErrorDialogSpec]]
 * ⚡ FLOW: [Consumer App] -> [showErrorDialog()] -> [Bootstrap Modal API]
 * ----------------------------------------------------------------------------
 */
export function showErrorDialog(containerId: string, options: LiterateError): void
{
    // ...
}
```

### SCSS Format

Use `/* */` block comments so the header is preserved in unminified CSS output.

```scss
/*
 * ⚓ COMPONENT: MetricCard
 * 📜 PURPOSE: Styles for the metric card dashboard component.
 * 🔗 RELATES: [[EnterpriseTheme]], [[DashboardLayout]]
 */
```

### HTML Format

```html
<!--
  ⚓ COMPONENT: ErrorDialogDemo
  📜 PURPOSE: Demo markup showing all error dialog variants and configurations.
  🔗 RELATES: [[ErrorDialog]], [[LiterateErrors]]
-->
```

---

## 2. In-Code Semantic Tags

Use these tags within comments to map logic flow and decision history.

### 2.1 Navigation Tags

- `// @entrypoint`: Marks the start of a public API or execution flow.
- `// @dependency: [File/Component]`: Explicitly marks a hidden or key dependency.
- `// @config: [SettingName]`: Marks a dependency on a configuration value (SCSS variable, build option).

### 2.2 Logic Flow Indicators

- `// -> Dispatches: [EventName]`: Indicates an event emission (e.g., custom DOM events).
- `// <- Handles: [EventName]`: Indicates an event handler.
- `// >> Delegates to: [Component]`: Indicates a hand-off of responsibility (e.g., calling Bootstrap's Modal API).

### 2.3 Context Anchors

- `// ⚓ [ConceptName]`: Defines the canonical location for a design concept.
    - *Usage:* "If you are looking for how the enterprise colour palette is defined, look for `⚓ EnterpriseTheme`."

### 2.4 Agent Work Tags

Use these tags for targeted follow-up by other agents. Align with `COMMENTING.md`.

- `// @agent:test` — Requires tests or test coverage.
- `// @agent:security` — Requires security review (e.g., DOM injection risks).
- `// @agent:review` — Requires human verification.
- `// @agent:refactor` — Candidate for future refactor.

### 2.5 Annotation Alignment

The semantic markers above complement the standard annotations defined in `COMMENTING.md` (`TODO`, `FIXME`, `SECURITY`, `PERF`, etc.). Use annotations for *status* (what state is this code in?) and semantic markers for *navigation* (where does this code fit in the system?).

---

## 3. Global Concept Registry

We use **Wiki-Style Links** `[[ConceptName]]` in comments to reference shared concepts across the library.

- **Syntax:** `[[Concept]]`
- **Behaviour:** Agents should search for `⚓ Concept` to find the definition.

**Example:**

```typescript
// Renders the error message following the [[LiterateErrors]] guidelines.
function renderErrorMessage(container: HTMLElement, error: LiterateError): void
{
    // ...
}
```

```scss
// Metric label — uses the [[EnterpriseTheme]] small font size and muted colour
.metric-label {
    font-size: $font-size-sm;
    color: $gray-600;
}
```

---

## 4. Section Markers (Long Files)

Use clear section headers so agents can scan large files quickly.

**TypeScript:**

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

**SCSS:**

```scss
// ============================================================================
// CUSTOM COMPONENT STYLES
// ============================================================================

// ============================================================================
// UTILITY CLASSES
// ============================================================================
```

---

## 5. Documentation and Playbooks

Apply markers in Markdown and other documentation so agents can find intent quickly.

**Required (top of file):**

```markdown
<!-- AGENT: Short purpose and scope for this document. -->
```

**Optional inline anchors:**

```markdown
<!-- @entrypoint: Primary workflow start for this doc -->
<!-- ⚓ ConceptName: Canonical explanation lives here -->
```

---

## 6. Relationship to the Knowledge Base

Markers and the knowledge base (`KNOWLEDGE_ARCHITECTURE.md`) serve different purposes but reinforce each other:

| Artifact | Purpose | Lives In |
|----------|---------|----------|
| Semantic Markers | Fast in-file navigation and context | Source files (comments) |
| `concepts.yaml` | Cross-file concept registry | `./agentknowledge/` |
| `decisions.yaml` | Architectural decision log | `./agentknowledge/` |

When you add an `⚓ ConceptName` anchor to a source file, also ensure the concept is registered in `concepts.yaml` so agents can look it up without scanning every file.

---

## 7. Do and Do Not

**Do**
- Add headers to all non-trivial files you create or modify.
- Use `// @entrypoint` on public API functions in component TypeScript.
- Keep markers in sync with code changes.
- Update `concepts.yaml` when adding a new `⚓ ConceptName` anchor.

**Do Not**
- Add markers to tiny utility files unless they are core to a workflow.
- Duplicate headers; update the existing block instead.
- Use markers to hide TODO work; use `TODO` or `@agent:*` tags.
- Invent new marker tags outside this document; extend this list first so all agents share the same vocabulary.
