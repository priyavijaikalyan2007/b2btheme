<!-- AGENT: Product Requirements Document for the PromptTemplateManager component — CRUD interface for managing prompt templates with variable extraction, preview, and import/export. -->

# PromptTemplateManager Component — Product Requirements

**Status:** Draft
**Component name:** PromptTemplateManager
**Folder:** `./components/prompttemplatemanager/`
**Spec author:** Agent
**Date:** 2026-02-20

---

## 1. Overview

### 1.1 What Is It

A two-pane CRUD interface for creating, editing, organising, and testing prompt templates used across AI features in enterprise SaaS applications. The component provides a master-detail layout: a searchable, filterable template list on the left and a full-featured editor/detail panel on the right, connected by a draggable SplitLayout divider.

The PromptTemplateManager supports:

- **Template CRUD** — create, read, update, and delete prompt templates via callback-driven persistence.
- **Variable extraction** — automatic detection of `{{variableName}}` placeholders in prompt text using `/\{\{(\w+)\}\}/g`, with live updates as the user types.
- **Variable editor** — auto-detected variables displayed as labelled form fields for testing, with support for text, number, select, and textarea field types.
- **Preview mode** — render the prompt template with test variable values substituted into placeholders, showing the final prompt as it would be sent to an AI backend.
- **Template categories and tags** — organise templates into categories (single-select) and tags (multi-value) for filtering and grouping.
- **Search and filter** — real-time search across template names, descriptions, categories, and tags.
- **Duplicate** — clone an existing template as a starting point for a new variant.
- **Import/export** — bulk import and export of templates as JSON for sharing and backup.
- **Version history** (stretch goal) — display a list of previous versions with optional diff view.
- **Callback-driven persistence** — all save, delete, duplicate, and load operations are delegated to consumer-provided callbacks. The component never makes API calls or writes to storage directly.

### 1.2 Why Build It

Enterprise SaaS applications increasingly embed AI-powered features: document summarisation, customer support bots, data analysis copilots, code review assistants, and content generation. Each of these features requires carefully crafted prompt templates that:

- Are iterated on by product teams, prompt engineers, and domain experts.
- Contain variables that are filled at runtime with user-specific or context-specific data.
- Need version control and testing before deployment.
- Must be shareable across team members and environments.

Without a dedicated management UI, prompt templates live in code repositories, spreadsheets, or ad-hoc admin pages — scattered, untested, and hard to iterate on. A purpose-built PromptTemplateManager solves this by providing a unified interface for the full prompt lifecycle.

### 1.3 Design Inspiration

| Source | Key Pattern Adopted |
|--------|---------------------|
| PromptLayer | Template list with variable extraction, version tracking, playground testing |
| Humanloop | Two-pane prompt editor with variable detection and preview |
| Vercel AI SDK Prompt Management | Structured prompt templates with typed variables |
| LangChain Hub | Template sharing, import/export, category organisation |
| OpenAI Playground (Saved Prompts) | Prompt editor with variable substitution and live preview |
| VS Code Settings Editor | Two-pane master-detail layout with search/filter |

### 1.4 Open Source Evaluation

| Library | Verdict | Reason |
|---------|---------|--------|
| PromptLayer (SaaS) | Not applicable | Commercial SaaS; not an embeddable component |
| Humanloop (SaaS) | Not applicable | Commercial SaaS; not an embeddable component |
| LangChain Hub | Not applicable | Python/JS SDK; no embeddable UI component |
| Promptfoo | Useful reference | MIT; CLI-focused evaluation tool; no embeddable editor UI |
| Prompt Studio | Not recommended | React-only; no vanilla JS support |

**Decision:** Build custom. No embeddable, framework-agnostic, Bootstrap 5 compatible prompt template management component exists. Building custom ensures alignment with the project's zero-dependency, IIFE-wrapped, Bootstrap-themed architecture.

---

## 2. Use Cases

| Use Case | Features Needed |
|----------|-----------------|
| Prompt engineer iterating on templates | CRUD, variable editor, preview, version history |
| Product manager reviewing prompt library | Search, filter by category/tag, read-only mode |
| Developer testing prompt with sample data | Variable editor, preview, export |
| Team lead sharing prompts across projects | Import/export JSON, categories, tags |
| Admin auditing prompt usage | Template list, metadata display, read-only |
| QA engineer validating prompt output | Variable editor, preview callback, duplicate for variants |

---

## 3. Anatomy

### 3.1 Full Component

```
+---------------------------------------------------------------------------+
| Prompt Templates                          [+ New] [Import] [Export]        |
+---------------+-----------------------------------------------------------+
| [Search...  ] |  Template: Customer Support Response     [Save] [Copy] [X]|
|---------------|-----------------------------------------------------------|
| * Customer    |  Category: [Support v]  Tags: [helpful, cs]               |
|   Support     |                                                           |
|   Response    |  +-----------------------------------------------------+ |
| o Sales       |  | You are a helpful customer support agent for         | |
|   Outreach    |  | {{company_name}}. The customer's name is             | |
| o Code        |  | {{customer_name}} and their issue is:                | |
|   Review      |  | {{issue_description}}                                | |
| o Summariz-   |  |                                                     | |
|   ation       |  | Please respond with empathy and provide a solution. | |
|               |  +-----------------------------------------------------+ |
|               |                                                           |
|               |  Variables (3 detected):                                  |
|               |  company_name:      [Acme Corp            ]              |
|               |  customer_name:     [Jane Doe              ]             |
|               |  issue_description: [Login not working      ]            |
|               |                                                           |
|               |  [Preview]                                                |
|               |  +-----------------------------------------------------+ |
|               |  | You are a helpful customer support agent for         | |
|               |  | Acme Corp. The customer's name is Jane Doe and      | |
|               |  | their issue is: Login not working                    | |
|               |  |                                                     | |
|               |  | Please respond with empathy and provide a solution. | |
|               |  +-----------------------------------------------------+ |
+---------------+-----------------------------------------------------------+
| v3  |  Last saved 2 minutes ago  |  3 variables                          |
+---------------------------------------------------------------------------+
```

### 3.2 Element Breakdown

| Element | Required | Description |
|---------|----------|-------------|
| Root container | Yes | `role="region"` with `aria-label="Prompt Template Manager"` |
| Header bar | Yes | Title, New/Import/Export action buttons |
| SplitLayout | Yes | Two-pane resizable layout |
| Template list pane | Yes | Left pane with search input and scrollable template list |
| Search input | Conditional | Shown when `showSearch: true` (default) |
| Template list | Yes | `role="listbox"` with selectable template items |
| Template item | Yes (1+) | `role="option"` with name, category badge |
| Detail pane | Yes | Right pane with editor and controls |
| Template name input | Yes | Editable name field |
| Category dropdown | Optional | Single-select category selector |
| Tags input | Optional | Multi-value tag entry |
| Prompt editor | Yes | `<textarea>` for prompt content with `{{variable}}` syntax |
| Variable section | Conditional | Auto-detected variables with labelled form fields |
| Variable field | Auto | Input for each extracted variable |
| Preview button | Conditional | Toggles preview display |
| Preview panel | Conditional | Rendered template with substituted variable values |
| Status bar | Yes | `role="status"` with version, save time, variable count |

---

## 4. API

### 4.1 Types

```typescript
/** Type of variable input field. */
type PromptVariableType = "text" | "number" | "select" | "textarea";
```

### 4.2 Interfaces

```typescript
/** A variable extracted from a prompt template's {{placeholder}} syntax. */
interface PromptVariable
{
    /** Variable name, extracted from {{name}} in the prompt content. */
    name: string;

    /** Default value used in the variable editor for testing. */
    defaultValue?: string;

    /** Human-readable description shown as a label or tooltip. */
    description?: string;

    /** Input field type for the variable editor. Default: "text". */
    type?: PromptVariableType;

    /** Options for "select" type variables. */
    options?: string[];

    /** Whether the variable must have a value for preview. Default: false. */
    required?: boolean;
}

/** A single prompt template. */
interface PromptTemplate
{
    /** Unique identifier for this template. */
    id: string;

    /** Human-readable template name. */
    name: string;

    /** Optional description of the template's purpose. */
    description?: string;

    /** The prompt text with {{variable}} placeholders. */
    content: string;

    /** Category for organisational grouping. */
    category?: string;

    /** Tags for filtering and search. */
    tags?: string[];

    /** Variable definitions. Auto-extracted from content; can be enriched by consumers. */
    variables?: PromptVariable[];

    /** Version number (incremented on each save). */
    version?: number;

    /** ISO 8601 creation timestamp. */
    createdAt?: string;

    /** ISO 8601 last update timestamp. */
    updatedAt?: string;

    /** Author name or identifier. */
    author?: string;

    /** Arbitrary consumer metadata. */
    metadata?: Record<string, unknown>;
}

/** Configuration options for the PromptTemplateManager component. */
interface PromptTemplateManagerOptions
{
    /** Initial set of templates to display. Default: []. */
    templates?: PromptTemplate[];

    /** Available category values for the category dropdown. Default: []. */
    categories?: string[];

    /** Show the preview panel and button. Default: true. */
    showPreview?: boolean;

    /** Show the variable editor section. Default: true. */
    showVariableEditor?: boolean;

    /** Show the version history panel (stretch goal). Default: false. */
    showVersionHistory?: boolean;

    /** Show import/export buttons in the header. Default: true. */
    showImportExport?: boolean;

    /** Show the search input in the list pane. Default: true. */
    showSearch?: boolean;

    /** Height of the prompt editor textarea (CSS value). Default: "300px". */
    editorHeight?: string;

    /** Width of the left list pane in pixels. Default: 300. */
    listWidth?: number;

    /** Overall component height (CSS value). Default: "600px". */
    height?: string;

    /** Read-only mode: disables editing, hides New/Delete buttons. Default: false. */
    readOnly?: boolean;

    /** Additional CSS class(es) for the root element. */
    cssClass?: string;

    // -- Callbacks --

    /** Called when the user saves a template. Consumer persists and returns the saved template. */
    onSave?: (template: PromptTemplate) => Promise<PromptTemplate>;

    /** Called when the user deletes a template. Consumer deletes and returns success. */
    onDelete?: (templateId: string) => Promise<boolean>;

    /** Called when the user duplicates a template. Consumer creates a copy and returns it. */
    onDuplicate?: (template: PromptTemplate) => Promise<PromptTemplate>;

    /**
     * Called when the user requests a preview. Consumer may process the prompt server-side
     * (e.g., through an AI backend) or return the simple variable-substituted content.
     * If not provided, the component performs local variable substitution.
     */
    onPreview?: (content: string, variables: Record<string, string>) => Promise<string>;

    /** Called to load/reload templates from a backend. */
    onLoadTemplates?: () => Promise<PromptTemplate[]>;

    /** Called when a template is selected in the list. */
    onSelect?: (template: PromptTemplate) => void;

    /** Called when any field of the currently selected template changes. */
    onChange?: (template: PromptTemplate) => void;
}
```

### 4.3 Class: PromptTemplateManager

| Method | Description |
|--------|-------------|
| `constructor(options)` | Creates the component DOM tree but does not attach to the page. |
| `show(containerId)` | Appends to the element with `containerId`. |
| `hide()` | Removes from DOM without destroying state. |
| `destroy()` | Hides, releases all event listeners, nulls DOM references. |
| `getElement()` | Returns the root DOM element. |
| `getTemplates()` | Returns a copy of the current template array. |
| `setTemplates(templates)` | Replaces the template list with the provided array. Re-renders the list. |
| `getSelectedTemplate()` | Returns the currently selected `PromptTemplate` or `null`. |
| `selectTemplate(id)` | Programmatically selects a template by ID. |
| `createTemplate()` | Creates a new blank template, adds it to the list, and selects it. |
| `deleteTemplate(id)` | Deletes a template by ID. Fires `onDelete` callback. |
| `duplicateTemplate(id)` | Duplicates a template by ID. Fires `onDuplicate` callback. |
| `exportTemplates()` | Returns all templates as a JSON string and triggers a browser download. |
| `importTemplates(json)` | Parses a JSON string, validates templates, and adds them to the list. |
| `refresh()` | Calls `onLoadTemplates` and replaces the template list with the result. |
| `getPreviewContent(variables?)` | Returns the selected template's content with variables substituted. |

### 4.4 Convenience Functions

| Function | Description |
|----------|-------------|
| `createPromptTemplateManager(options, containerId)` | Create, show, and return a PromptTemplateManager instance. |

### 4.5 Global Exports

```typescript
window.PromptTemplateManager = PromptTemplateManager;
window.createPromptTemplateManager = createPromptTemplateManager;
```

---

## 5. Behaviour

### 5.1 Lifecycle

1. **Construction** — Builds the DOM tree from `options`. Creates the SplitLayout with two panes, populates the template list from `options.templates`, and registers internal event listeners. Does not attach to the page.
2. **show(containerId)** — Appends to the resolved container element. If templates exist, selects the first template. If `onLoadTemplates` is provided and `templates` is empty, calls it to load initial data.
3. **hide()** — Removes from DOM. All state (selected template, variable values, unsaved changes) is preserved.
4. **destroy()** — Calls `hide()`, destroys the internal SplitLayout, removes all event listeners, nulls DOM references. Sets a destroyed flag. No further method calls are valid.

### 5.2 Template List

The left pane displays a scrollable list of templates rendered as `role="option"` items within a `role="listbox"` container.

**List item display:** Each item shows the template name as the primary label and the category (if set) as a small badge below or beside the name.

**Selection:** Clicking a list item selects it. The detail pane updates to show the selected template's name, description, category, tags, content, and variables. The previously selected item is deselected.

**Empty state:** When no templates exist, the list pane shows a centered message: "No templates yet. Click + New to create one."

**Filtered empty state:** When a search query returns no results, the list pane shows: "No templates match your search."

### 5.3 Search and Filter

When `showSearch` is true, a search input appears at the top of the list pane.

**Search behaviour:**
1. Debounced by 200ms on `input` events.
2. Matches against template `name`, `description`, `category`, and `tags` (case-insensitive substring match).
3. Non-matching templates are hidden from the list via `display: none`.
4. The currently selected template remains selected even if it does not match the search (its list item stays visible with a muted style indicator).
5. Clearing the search input restores all templates.

### 5.4 Template Editor (Detail Pane)

The right pane contains the template editing interface, organised top-to-bottom:

1. **Template name** — editable text input.
2. **Description** — optional editable text input (single line or small textarea).
3. **Category dropdown** — `<select>` populated from `options.categories`. First option is empty ("No category").
4. **Tags** — comma-separated text input. Tags are parsed on blur or Enter. Individual tags are displayed as removable badge pills.
5. **Prompt content** — `<textarea>` with configurable height (`editorHeight`). Uses monospace font (`$font-family-monospace`) for clarity when writing templates with `{{variables}}`.
6. **Variable section** — auto-populated from extracted variables (see 5.5).
7. **Preview section** — rendered template with substituted values (see 5.6).
8. **Action buttons** — Save, Duplicate, Delete in the template header area.

**Dirty state tracking:** The component tracks whether any field has been modified since the last save. A visual indicator (e.g., dot or asterisk beside the template name in the list) marks unsaved changes. Switching templates while dirty shows no confirmation dialog (the component preserves the draft in memory but does not auto-save). The consumer can use `onChange` to implement auto-save or confirmation prompts.

### 5.5 Variable Extraction

Variables are automatically extracted from the prompt content using the regex `/\{\{(\w+)\}\}/g`.

**Extraction triggers:**
- On template selection (initial population).
- On every `input` event in the prompt textarea (debounced 300ms).

**Extraction algorithm:**
1. Run the regex against the content string.
2. Collect unique variable names (deduplicated, preserving first occurrence order).
3. Compare against the template's existing `variables` array.
4. **New variables** (found in content but not in `variables`): add with `type: "text"` and no default.
5. **Removed variables** (in `variables` but no longer in content): remove from the variable section.
6. **Existing variables**: preserve their `defaultValue`, `description`, `type`, `options`, and `required` settings.
7. Re-render the variable editor section.

**Variable editor display:**
- Each variable renders as a labelled form field.
- Label: the variable name (e.g., `company_name`).
- Field type depends on `variable.type`:
  - `"text"` — `<input type="text">`.
  - `"number"` — `<input type="number">`.
  - `"select"` — `<select>` with options from `variable.options`.
  - `"textarea"` — `<textarea rows="3">`.
- Default value pre-populates the field.
- Changing a field value triggers preview update (if preview is visible).

### 5.6 Preview

When `showPreview` is true, a "Preview" button appears below the variable section.

**Preview behaviour:**
1. Clicking "Preview" toggles the preview panel's visibility.
2. The preview panel shows the prompt content with all `{{variableName}}` placeholders replaced by the current values from the variable editor fields.
3. If `onPreview` is provided, the component calls it with the content and variable values. The callback may return server-processed output (e.g., an AI-rendered expansion). The component displays the returned string.
4. If `onPreview` is not provided, the component performs local substitution using a simple string replace: `content.replace(/\{\{(\w+)\}\}/g, (_, name) => variables[name] || "{{" + name + "}}")`.
5. Variables with empty values are left as `{{variableName}}` in the preview to indicate unfilled placeholders.
6. The preview panel uses `white-space: pre-wrap` and the same monospace font as the editor.

### 5.7 Save

The Save button (or Ctrl+S keyboard shortcut) triggers the save workflow:

1. Validate: template name must not be empty. If empty, show a validation message and focus the name field.
2. Collect current field values into a `PromptTemplate` object.
3. Re-extract variables from the content and merge with enriched variable data.
4. Set `updatedAt` to the current ISO 8601 timestamp.
5. Increment `version` by 1 (or set to 1 if not present).
6. Call `onSave(template)`.
7. If the callback resolves successfully, update the template in the internal list and refresh the list item display.
8. If the callback rejects, log the error and leave the template in its unsaved state.
9. Update the status bar with the save timestamp.

### 5.8 Delete

The Delete button (or Delete key shortcut) triggers the delete workflow:

1. No built-in confirmation dialog. The consumer should implement confirmation in the `onDelete` callback if needed (e.g., by showing an ErrorDialog or a confirm prompt before resolving).
2. Call `onDelete(templateId)`.
3. If the callback resolves with `true`, remove the template from the internal list, deselect it, and select the next available template (or show empty state).
4. If the callback resolves with `false` or rejects, log the result and leave the template in place.

### 5.9 Duplicate

The Duplicate button triggers the duplicate workflow:

1. Create a shallow copy of the selected template.
2. Clear the `id` (the consumer's `onDuplicate` callback is responsible for assigning a new ID).
3. Append " (Copy)" to the name.
4. Reset `version` to 1, set `createdAt` and `updatedAt` to now.
5. Call `onDuplicate(template)`.
6. If the callback resolves with a new template, add it to the list and select it.

### 5.10 Import

When `showImportExport` is true, the Import button appears in the header.

**Import workflow:**
1. Clicking Import opens a hidden `<input type="file" accept=".json">` element.
2. The user selects a `.json` file.
3. The component reads the file via `FileReader`.
4. Parses the JSON. Expected format: `{ "templates": PromptTemplate[] }` or a bare `PromptTemplate[]` array.
5. Validates each template: must have at least `name` and `content` fields. Invalid templates are skipped with a console warning.
6. Generates new IDs for imported templates to avoid collisions.
7. Adds valid templates to the internal list.
8. Selects the first imported template.
9. Fires `onChange` for each added template.

### 5.11 Export

When `showImportExport` is true, the Export button appears in the header.

**Export workflow:**
1. Clicking Export serialises all templates to JSON: `{ "templates": [...], "exportedAt": "ISO8601", "count": N }`.
2. Triggers a browser download of the JSON file named `prompt-templates-YYYY-MM-DD.json`.
3. Uses the same `createElement("a") + URL.createObjectURL + click()` download pattern established in the MarkdownEditor component.

### 5.12 Create New Template

The "+ New" button in the header creates a new template:

1. Generates a temporary ID (e.g., `"new-" + Date.now()`).
2. Creates a `PromptTemplate` with name `"Untitled Template"`, empty content, version 1, and current timestamps.
3. Adds the template to the top of the list.
4. Selects it and focuses the name input field for immediate renaming.

### 5.13 Version History (Stretch Goal)

When `showVersionHistory` is true, a collapsible "Version History" section appears at the bottom of the detail pane.

**Version history behaviour:**
- Displays a reverse-chronological list of previous versions (version number, timestamp, author).
- Clicking a version shows a read-only view of that version's content.
- Diff view between two versions is a future enhancement.
- Version data must be provided by the consumer via the template's `metadata` or a dedicated callback (out of scope for v1 implementation; the UI chrome is built but populated via consumer data).

---

## 6. DOM Structure

### 6.1 Full Component

```html
<div class="promptmanager"
     id="promptmanager-1"
     role="region"
     aria-label="Prompt Template Manager">

    <div class="promptmanager-header">
        <h3 class="promptmanager-title">Prompt Templates</h3>
        <div class="promptmanager-header-actions">
            <button class="promptmanager-btn promptmanager-btn-new"
                    type="button" aria-label="Create new template"
                    title="New template">
                <i class="bi bi-plus-lg"></i>
                <span>New</span>
            </button>
            <button class="promptmanager-btn promptmanager-btn-import"
                    type="button" aria-label="Import templates"
                    title="Import templates">
                <i class="bi bi-upload"></i>
                <span>Import</span>
            </button>
            <button class="promptmanager-btn promptmanager-btn-export"
                    type="button" aria-label="Export templates"
                    title="Export templates">
                <i class="bi bi-download"></i>
                <span>Export</span>
            </button>
        </div>
    </div>

    <!-- SplitLayout renders the two-pane body -->
    <div class="promptmanager-body">
        <div class="splitlayout splitlayout-horizontal">

            <!-- Left pane: template list -->
            <div class="splitlayout-pane promptmanager-list-pane">
                <div class="promptmanager-search">
                    <i class="bi bi-search promptmanager-search-icon"
                       aria-hidden="true"></i>
                    <input type="text"
                           class="promptmanager-search-input"
                           placeholder="Search templates..."
                           aria-label="Search templates">
                </div>
                <div class="promptmanager-list" role="listbox"
                     aria-label="Template list">
                    <div class="promptmanager-list-item promptmanager-list-item-selected"
                         role="option" aria-selected="true"
                         data-template-id="tpl-1">
                        <span class="promptmanager-list-item-name">
                            Customer Support Response
                        </span>
                        <span class="promptmanager-list-item-category">
                            Support
                        </span>
                    </div>
                    <div class="promptmanager-list-item"
                         role="option" aria-selected="false"
                         data-template-id="tpl-2">
                        <span class="promptmanager-list-item-name">
                            Sales Outreach
                        </span>
                        <span class="promptmanager-list-item-category">
                            Sales
                        </span>
                    </div>
                    <!-- More items... -->
                </div>
            </div>

            <!-- Divider (rendered by SplitLayout) -->

            <!-- Right pane: detail editor -->
            <div class="splitlayout-pane promptmanager-detail-pane">
                <div class="promptmanager-detail-header">
                    <input type="text"
                           class="promptmanager-name-input"
                           value="Customer Support Response"
                           aria-label="Template name">
                    <div class="promptmanager-detail-actions">
                        <button class="promptmanager-btn promptmanager-btn-save"
                                type="button" aria-label="Save template"
                                title="Save (Ctrl+S)">
                            <i class="bi bi-floppy"></i>
                        </button>
                        <button class="promptmanager-btn promptmanager-btn-duplicate"
                                type="button" aria-label="Duplicate template"
                                title="Duplicate">
                            <i class="bi bi-copy"></i>
                        </button>
                        <button class="promptmanager-btn promptmanager-btn-delete"
                                type="button" aria-label="Delete template"
                                title="Delete">
                            <i class="bi bi-trash3"></i>
                        </button>
                    </div>
                </div>

                <div class="promptmanager-detail-meta">
                    <div class="promptmanager-meta-field">
                        <label class="promptmanager-meta-label"
                               for="promptmanager-category">Category</label>
                        <select class="promptmanager-category-select"
                                id="promptmanager-category"
                                aria-label="Template category">
                            <option value="">No category</option>
                            <option value="support" selected>Support</option>
                            <option value="sales">Sales</option>
                        </select>
                    </div>
                    <div class="promptmanager-meta-field">
                        <label class="promptmanager-meta-label"
                               for="promptmanager-tags">Tags</label>
                        <div class="promptmanager-tags-container">
                            <span class="promptmanager-tag">
                                helpful
                                <button class="promptmanager-tag-remove"
                                        type="button"
                                        aria-label="Remove tag helpful">
                                    <i class="bi bi-x"></i>
                                </button>
                            </span>
                            <span class="promptmanager-tag">
                                cs
                                <button class="promptmanager-tag-remove"
                                        type="button"
                                        aria-label="Remove tag cs">
                                    <i class="bi bi-x"></i>
                                </button>
                            </span>
                            <input type="text"
                                   class="promptmanager-tags-input"
                                   id="promptmanager-tags"
                                   placeholder="Add tag..."
                                   aria-label="Add tag">
                        </div>
                    </div>
                </div>

                <div class="promptmanager-editor-section">
                    <label class="promptmanager-editor-label"
                           for="promptmanager-content">Prompt</label>
                    <textarea class="promptmanager-editor"
                              id="promptmanager-content"
                              rows="10"
                              aria-label="Prompt content">You are a helpful customer support agent for {{company_name}}. The customer's name is {{customer_name}} and their issue is: {{issue_description}}

Please respond with empathy and provide a solution.</textarea>
                </div>

                <div class="promptmanager-variables-section">
                    <h4 class="promptmanager-variables-title">
                        Variables (3 detected)
                    </h4>
                    <div class="promptmanager-variables-list">
                        <div class="promptmanager-variable-field">
                            <label class="promptmanager-variable-label"
                                   for="promptmanager-var-company_name">
                                company_name
                            </label>
                            <input type="text"
                                   class="promptmanager-variable-input"
                                   id="promptmanager-var-company_name"
                                   value="Acme Corp"
                                   data-variable="company_name">
                        </div>
                        <div class="promptmanager-variable-field">
                            <label class="promptmanager-variable-label"
                                   for="promptmanager-var-customer_name">
                                customer_name
                            </label>
                            <input type="text"
                                   class="promptmanager-variable-input"
                                   id="promptmanager-var-customer_name"
                                   value="Jane Doe"
                                   data-variable="customer_name">
                        </div>
                        <div class="promptmanager-variable-field">
                            <label class="promptmanager-variable-label"
                                   for="promptmanager-var-issue_description">
                                issue_description
                            </label>
                            <input type="text"
                                   class="promptmanager-variable-input"
                                   id="promptmanager-var-issue_description"
                                   value="Login not working"
                                   data-variable="issue_description">
                        </div>
                    </div>
                </div>

                <div class="promptmanager-preview-section">
                    <button class="promptmanager-btn promptmanager-btn-preview"
                            type="button"
                            aria-expanded="false"
                            aria-controls="promptmanager-preview-panel">
                        <i class="bi bi-eye"></i>
                        <span>Preview</span>
                    </button>
                    <div class="promptmanager-preview-panel"
                         id="promptmanager-preview-panel"
                         role="region"
                         aria-label="Template preview"
                         style="display: none;">
                        <!-- Rendered preview content via textContent -->
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="promptmanager-statusbar" role="status">
        <span class="promptmanager-status-version">v3</span>
        <span class="promptmanager-status-separator" aria-hidden="true">|</span>
        <span class="promptmanager-status-saved">Last saved 2 minutes ago</span>
        <span class="promptmanager-status-separator" aria-hidden="true">|</span>
        <span class="promptmanager-status-variables">3 variables</span>
    </div>

    <!-- Hidden file input for import -->
    <input type="file"
           class="promptmanager-import-file"
           accept=".json"
           aria-hidden="true"
           style="display: none;">
</div>
```

---

## 7. CSS Classes

| Class | Description |
|-------|-------------|
| `.promptmanager` | Root container -- `display: flex`, `flex-direction: column` |
| `.promptmanager-header` | Header bar -- `display: flex`, `justify-content: space-between`, `align-items: center` |
| `.promptmanager-title` | Title `<h3>` -- `$font-size-base`, `$font-weight-semibold`, `margin: 0` |
| `.promptmanager-header-actions` | Flex container for header action buttons |
| `.promptmanager-btn` | Base button style -- transparent background, compact padding |
| `.promptmanager-btn-new` | New template button |
| `.promptmanager-btn-import` | Import button |
| `.promptmanager-btn-export` | Export button |
| `.promptmanager-btn-save` | Save template button |
| `.promptmanager-btn-duplicate` | Duplicate template button |
| `.promptmanager-btn-delete` | Delete template button |
| `.promptmanager-btn-preview` | Preview toggle button |
| `.promptmanager-body` | Main content area containing the SplitLayout |
| `.promptmanager-list-pane` | Left pane -- template list container |
| `.promptmanager-search` | Search container with icon and input |
| `.promptmanager-search-icon` | Search icon (decorative) |
| `.promptmanager-search-input` | Search text input |
| `.promptmanager-list` | Scrollable template list -- `role="listbox"`, `overflow-y: auto` |
| `.promptmanager-list-item` | Individual template item -- `role="option"` |
| `.promptmanager-list-item-selected` | Selected template highlight |
| `.promptmanager-list-item-dirty` | Unsaved changes indicator (dot or asterisk) |
| `.promptmanager-list-item-name` | Template name text |
| `.promptmanager-list-item-category` | Category badge below template name |
| `.promptmanager-list-empty` | Empty state message container |
| `.promptmanager-detail-pane` | Right pane -- editor/detail container with `overflow-y: auto` |
| `.promptmanager-detail-header` | Template name input and action buttons row |
| `.promptmanager-name-input` | Template name editable input |
| `.promptmanager-detail-actions` | Save/Duplicate/Delete button group |
| `.promptmanager-detail-meta` | Category and tags metadata section |
| `.promptmanager-meta-field` | Labelled metadata field container |
| `.promptmanager-meta-label` | Metadata field label |
| `.promptmanager-category-select` | Category `<select>` dropdown |
| `.promptmanager-tags-container` | Tags display and input container |
| `.promptmanager-tag` | Individual tag badge pill |
| `.promptmanager-tag-remove` | Tag removal X button |
| `.promptmanager-tags-input` | Inline text input for adding tags |
| `.promptmanager-editor-section` | Prompt editor section wrapper |
| `.promptmanager-editor-label` | "Prompt" label above the textarea |
| `.promptmanager-editor` | Prompt content `<textarea>` -- monospace font |
| `.promptmanager-variables-section` | Variable editor section wrapper |
| `.promptmanager-variables-title` | "Variables (N detected)" heading |
| `.promptmanager-variables-list` | Container for variable fields |
| `.promptmanager-variable-field` | Individual variable label + input row |
| `.promptmanager-variable-label` | Variable name label |
| `.promptmanager-variable-input` | Variable value input field |
| `.promptmanager-variable-select` | Variable value select field (for "select" type) |
| `.promptmanager-variable-textarea` | Variable value textarea (for "textarea" type) |
| `.promptmanager-preview-section` | Preview section wrapper |
| `.promptmanager-preview-panel` | Rendered preview content area |
| `.promptmanager-statusbar` | Status bar at the bottom -- `role="status"` |
| `.promptmanager-status-version` | Version number display |
| `.promptmanager-status-saved` | Last saved relative timestamp |
| `.promptmanager-status-variables` | Variable count display |
| `.promptmanager-status-separator` | Visual pipe separator between status items |
| `.promptmanager-readonly` | Read-only mode modifier on root |
| `.promptmanager-import-file` | Hidden file input for import |

---

## 8. Styling

### 8.1 Theme Integration

| Property | Value | Source |
|----------|-------|--------|
| Root background | `$gray-50` | Light, neutral surface |
| Root border | `1px solid $gray-300` | Consistent with cards and panels |
| Header background | `$gray-100` | Subtle differentiation |
| Header border | `1px solid $gray-200` bottom | Separator |
| List pane background | `$gray-50` | Clean list surface |
| List item default | `transparent` background | Clean |
| List item hover | `$gray-100` background | Subtle highlight |
| List item selected | `$blue-50` background, `$blue-600` left border (3px) | Clear selection indicator |
| List item dirty indicator | `$orange-500` dot | Unsaved changes visual |
| List item category badge | `$gray-200` background, `$gray-600` text, `$font-size-sm` | Subdued metadata |
| Search input border | `1px solid $gray-300` | Standard input border |
| Search input focus | `$blue-600` border, Bootstrap focus ring | Standard focus state |
| Detail pane background | `$gray-50` | Consistent with root |
| Name input | `$font-size-lg`, `$font-weight-semibold` | Prominent template name |
| Category select border | `1px solid $gray-300` | Standard select border |
| Tag badge | `$blue-100` background, `$blue-800` text, `$font-size-sm` | Distinct from category |
| Tag remove button | `$gray-500` icon, `$red-600` on hover | Destructive hint on hover |
| Editor textarea background | `$gray-50` | Clean editing surface |
| Editor textarea font | `$font-family-monospace`, `$font-size-sm` | Code-like prompt editing |
| Editor textarea border | `1px solid $gray-300` | Standard border |
| Editor textarea focus | `$blue-600` border, Bootstrap focus ring | Standard focus state |
| Variable section heading | `$gray-600`, `$font-size-sm`, `$font-weight-semibold` | Subdued section header |
| Variable label | `$gray-700`, `$font-family-monospace`, `$font-size-sm` | Code-like variable names |
| Variable input border | `1px solid $gray-300` | Standard input border |
| Preview panel background | `$gray-100` | Distinct from editor |
| Preview panel border | `1px solid $gray-300` | Visual boundary |
| Preview panel font | `$font-family-monospace`, `$font-size-sm`, `white-space: pre-wrap` | Matches editor |
| Preview button default | `$gray-600` icon and text | Subdued toggle |
| Preview button active | `$blue-600` icon and text | Active state |
| Status bar background | `$gray-100` | Footer differentiation |
| Status bar text | `$gray-500`, `$font-size-sm` | De-emphasised metadata |
| Status bar border | `1px solid $gray-200` top | Separator |
| Action button default | `$gray-500` icon | Inactive |
| Action button hover | `$gray-700` icon | Hover highlight |
| Save button hover | `$blue-600` icon | Primary action hint |
| Delete button hover | `$red-600` icon | Destructive action hint |
| Read-only mode | `$gray-400` text on disabled inputs, `.promptmanager-readonly` root modifier | Standard disabled pattern |

### 8.2 Dimensions

| Element | Size | Notes |
|---------|------|-------|
| Root default height | `600px` (configurable via `height`) | Fits common layout scenarios |
| List pane default width | `300px` (configurable via `listWidth`) | Readable template names |
| List pane min width | `200px` | Prevents unusably narrow list |
| Detail pane min width | `350px` | Ensures editor is usable |
| Editor textarea default height | `300px` (configurable via `editorHeight`) | Comfortable editing area |
| Tag badge padding | `2px 8px` | Compact pill |
| Variable field height | `32px` | Consistent input height |
| Status bar height | `28px` | Compact footer |

### 8.3 Z-Index

The PromptTemplateManager does not use fixed positioning or global z-index values. It participates in its parent container's stacking context. Internal dropdowns (category select) use the browser's native stacking.

### 8.4 SCSS Import

```scss
@import '../../src/scss/variables';
```

---

## 9. Keyboard Interaction

### 9.1 Global Shortcuts

| Key | Context | Action |
|-----|---------|--------|
| **Ctrl+S** | Anywhere in component | Save current template |
| **Ctrl+N** | Anywhere in component | Create new template |
| **Ctrl+P** | Anywhere in component | Toggle preview |
| **Delete** | Template selected, focus not in text input | Delete selected template |

### 9.2 Template List Navigation

| Key | Action |
|-----|--------|
| **Up Arrow** | Select previous template in list |
| **Down Arrow** | Select next template in list |
| **Enter** | Confirm selection (moves focus to detail pane) |
| **Home** | Select first template |
| **End** | Select last template |

### 9.3 Detail Pane Navigation

| Key | Action |
|-----|--------|
| **Tab** | Moves focus through: name input, category select, tags input, editor textarea, variable fields, preview button, action buttons |
| **Shift+Tab** | Reverse tab order |
| **Escape** | Returns focus to template list |

### 9.4 Tags Input

| Key | Action |
|-----|--------|
| **Enter** | Adds the current text as a tag |
| **Comma** | Adds the current text as a tag |
| **Backspace** | When input is empty, removes the last tag |

### 9.5 Search Input

| Key | Action |
|-----|--------|
| **Escape** | Clears search and returns focus to template list |
| **Down Arrow** | Moves focus to the first visible template in the list |

---

## 10. Accessibility

### 10.1 ARIA Roles and Attributes

| Element | Attribute | Value |
|---------|-----------|-------|
| Root | `role="region"` | Landmark region |
| Root | `aria-label` | `"Prompt Template Manager"` |
| Template list | `role="listbox"` | Selection list |
| Template list | `aria-label` | `"Template list"` |
| Template item | `role="option"` | Selectable item |
| Template item | `aria-selected` | `"true"` or `"false"` |
| Search input | `aria-label` | `"Search templates"` |
| Name input | `aria-label` | `"Template name"` |
| Category select | `aria-label` | `"Template category"` |
| Tags input | `aria-label` | `"Add tag"` |
| Tag remove button | `aria-label` | `"Remove tag {tagName}"` |
| Editor textarea | `aria-label` | `"Prompt content"` |
| Variable input | `aria-label` | Variable name (via `<label>`) |
| Preview button | `aria-expanded` | `"true"` or `"false"` |
| Preview button | `aria-controls` | ID of preview panel |
| Preview panel | `role="region"` | Content region |
| Preview panel | `aria-label` | `"Template preview"` |
| Status bar | `role="status"` | Live status region |
| Import file input | `aria-hidden="true"` | Hidden from assistive tech |
| Action buttons | `aria-label` | Descriptive label for each action |

### 10.2 Focus Management

- On `show()`, focus moves to the search input (if visible) or the template list.
- On template selection, focus moves to the name input in the detail pane.
- On "New", focus moves to the name input of the new template.
- After save, focus remains on the current field.
- After delete, focus moves to the next template in the list (or previous if last was deleted).
- All interactive elements are reachable via Tab key.

### 10.3 Screen Reader Announcements

- Status bar updates are announced via `role="status"` and `aria-live="polite"`.
- Template selection changes are announced via `aria-selected` updates on list items.
- Variable count changes are announced via status bar text updates.

---

## 11. Edge Cases

| Scenario | Behaviour |
|----------|-----------|
| Empty template list | Shows empty state message in list pane. Detail pane shows placeholder. |
| Template with no variables | Variable section shows "No variables detected". |
| Template with 50+ variables | Variable section scrolls independently within the detail pane. |
| Duplicate variable names in content | Deduplicated; only the first occurrence counts. |
| Variable name with special characters | Only `\w+` matches are extracted; `{{foo-bar}}` is not detected (only `{{foo_bar}}`). |
| Very long template content (10,000+ chars) | Textarea scrolls; variable extraction debounced to prevent performance issues. |
| Import file with invalid JSON | Logs warning, shows no error to user, no templates imported. |
| Import file with 1000+ templates | All valid templates imported; list virtualisation is not in v1 (may scroll slowly). |
| Export with zero templates | Exports valid JSON with empty templates array. |
| Save fails (callback rejects) | Template remains in unsaved state; error logged. |
| Delete fails (callback rejects) | Template remains in list; error logged. |
| `onPreview` callback rejects | Preview panel shows error message: "Preview failed". |
| `onLoadTemplates` callback rejects | List shows empty state; error logged. |
| Switching templates with unsaved changes | No confirmation dialog; draft values are lost. Consumer uses `onChange` for auto-save. |
| `show()` called after `destroy()` | Logs warning, no-op. |
| Multiple `show()` calls without `hide()` | Logs warning, no-op on second call. |
| Read-only mode | New, Save, Delete, Duplicate buttons hidden; all inputs disabled; editor is readonly. |
| Search with no matches | Shows "No templates match your search" message. |
| Rapid typing in editor | Variable extraction debounced to 300ms; no performance degradation. |
| Category list is empty | Category select shows only "No category" option. |
| Template name is empty on save | Validation error shown; focus moves to name input. |
| Container removed from DOM externally | Component detects orphaned state on next interaction; logs warning. |

---

## 12. Security

### 12.1 Content Rendering

- **Template names, descriptions, categories, tags** — Always rendered via `textContent`. Never parsed as HTML.
- **Prompt content** — Displayed in a `<textarea>` (native text mode). No HTML parsing.
- **Preview output** — Rendered via `textContent` into the preview panel. No `innerHTML`. This prevents injection even if variable values contain HTML or script.
- **Variable values** — Rendered via `textContent` in input fields. No HTML parsing.

### 12.2 Import Validation

- Imported JSON is parsed via `JSON.parse()` and structurally validated. No `eval()` or `Function()`.
- Template `id` values are regenerated on import to prevent ID collision attacks.
- Template `content`, `name`, and `description` are treated as plain text; no executable content.

### 12.3 Event Handling

- No inline event handlers (`onclick`, `onload`, etc.) in generated HTML.
- All event listeners are attached programmatically via `addEventListener()`.
- All consumer callbacks are wrapped in try/catch blocks. Errors are logged but do not break component state.

---

## 13. Dependencies

| Dependency | Type | Purpose |
|------------|------|---------|
| Bootstrap 5 CSS | Required | `$gray-*`, `$blue-*`, `$font-family-monospace` variables |
| Bootstrap Icons | Required | Icon classes for buttons (`bi-plus-lg`, `bi-floppy`, `bi-copy`, `bi-trash3`, `bi-upload`, `bi-download`, `bi-search`, `bi-eye`, `bi-x`) |
| SplitLayout component | Required | Two-pane resizable layout |
| No JavaScript framework | -- | Vanilla TypeScript; zero framework dependencies |

---

## 14. Files

| File | Purpose |
|------|---------|
| `specs/prompttemplatemanager.prd.md` | This specification |
| `components/prompttemplatemanager/prompttemplatemanager.ts` | TypeScript source |
| `components/prompttemplatemanager/prompttemplatemanager.scss` | Styles |
| `components/prompttemplatemanager/README.md` | Documentation |

---

## 15. Implementation Notes

### 15.1 Variable Extraction

```typescript
private extractVariables(content: string): string[]
{
    const regex = /\{\{(\w+)\}\}/g;
    const names: string[] = [];
    const seen = new Set<string>();
    let match: RegExpExecArray | null;

    while ((match = regex.exec(content)) !== null)
    {
        const name = match[1];
        if (!seen.has(name))
        {
            seen.add(name);
            names.push(name);
        }
    }

    return names;
}
```

### 15.2 Preview Substitution

```typescript
private substituteVariables(
    content: string,
    variables: Record<string, string>
): string
{
    return content.replace(
        /\{\{(\w+)\}\}/g,
        (_, name) => variables[name] || "{{" + name + "}}"
    );
}
```

### 15.3 SplitLayout Integration

The component creates a SplitLayout instance internally:

```typescript
const splitLayout = new SplitLayout({
    orientation: "horizontal",
    panes:
    [
        {
            id: "template-list",
            initialSize: options.listWidth || 300,
            minSize: 200,
            collapsible: false
        },
        {
            id: "template-detail",
            initialSize: "1fr",
            minSize: 350,
            collapsible: false
        }
    ],
    dividerSize: 4,
    dividerStyle: "line"
});
```

The SplitLayout element is appended to the `.promptmanager-body` container. Template list and detail pane content are placed into the SplitLayout pane elements via `setPaneContent()`.

### 15.4 ID Generation

Template IDs for new and imported templates are generated using a monotonic counter:

```typescript
private nextId(): string
{
    return "tpl-" + Date.now() + "-" + (++this.idCounter);
}
```

### 15.5 Debounced Search and Variable Extraction

Both search filtering and variable extraction use a debounce utility:

```typescript
private debounce(fn: () => void, delayMs: number): () => void
{
    let timer: number | undefined;
    return () =>
    {
        clearTimeout(timer);
        timer = window.setTimeout(fn, delayMs);
    };
}
```

Search is debounced at 200ms. Variable extraction is debounced at 300ms.

### 15.6 Export Download

```typescript
private downloadJson(data: string, filename: string): void
{
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
```

### 15.7 Callback Safety

All consumer callbacks (`onSave`, `onDelete`, `onDuplicate`, `onPreview`, `onLoadTemplates`, `onSelect`, `onChange`) are wrapped in try/catch blocks. Errors are logged with `LOG_PREFIX = "[PromptTemplateManager]"` but do not break internal component state.

### 15.8 Performance

- DOM updates for template list filtering use `display: none` toggling, not DOM removal/recreation.
- Variable extraction is debounced to avoid regex execution on every keystroke.
- Template list items are created once and reused; only content is updated on data changes.
- The SplitLayout divider drag uses `requestAnimationFrame` (handled by SplitLayout internally).
- Preview rendering is triggered on demand (button click), not automatically on every change.

### 15.9 Target Size

The implementation targets approximately 260-300 lines of TypeScript, consistent with medium-complexity components in this project. Helper functions should be extracted aggressively to keep individual functions under 25-30 lines per CODING_STYLE.md.

---

## 16. Future Considerations (Out of Scope for v1)

These features are explicitly deferred:

- **Version history diff view** — side-by-side comparison of two template versions.
- **Template folders** — hierarchical organisation beyond flat categories.
- **Collaborative editing** — multiple users editing the same template simultaneously.
- **AI-assisted prompt writing** — inline suggestions and auto-completion for prompt content.
- **Template testing harness** — integration with actual AI backends for live prompt testing.
- **Syntax highlighting** — colour-coded `{{variable}}` syntax in the editor textarea (would require a code editor dependency).
- **Template permissions** — role-based access control for template editing.
- **Template analytics** — usage tracking and performance metrics per template.
- **Drag-and-drop reordering** — reordering templates within the list via drag-and-drop.
