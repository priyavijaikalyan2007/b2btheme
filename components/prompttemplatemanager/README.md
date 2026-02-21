# PromptTemplateManager

Two-pane CRUD interface for creating, editing, organising, and testing prompt templates with `{{variable}}` extraction, preview, tags, categories, and import/export.

## Assets

| File | Purpose |
|------|---------|
| `prompttemplatemanager.ts` | TypeScript source |
| `prompttemplatemanager.scss` | Component styles |
| `prompttemplatemanager.js` | Compiled JS (IIFE-wrapped) |
| `prompttemplatemanager.css` | Compiled CSS |

## Usage

```html
<link rel="stylesheet" href="components/prompttemplatemanager/prompttemplatemanager.css">
<script src="components/splitlayout/splitlayout.js"></script>
<script src="components/prompttemplatemanager/prompttemplatemanager.js"></script>
```

### Basic

```javascript
var manager = createPromptTemplateManager({
    templates: [
        {
            id: "tpl-1",
            name: "Customer Support",
            content: "You are a support agent for {{company}}. Help {{customer}} with: {{issue}}",
            category: "Support",
            tags: ["support", "customer"],
            version: 1
        }
    ],
    categories: ["Support", "Sales", "Engineering"],
    onSave: function(tpl) {
        console.log("Saving:", tpl);
        return Promise.resolve(tpl);
    },
    onDelete: function(id) {
        console.log("Deleting:", id);
        return Promise.resolve(true);
    }
}, "my-container");
```

### Read-Only Mode

```javascript
var manager = createPromptTemplateManager({
    templates: myTemplates,
    readOnly: true
}, "container");
```

## Interfaces

### PromptVariable

```typescript
interface PromptVariable {
    name: string;
    defaultValue?: string;
    description?: string;
    type?: "text" | "number" | "select" | "textarea";
    options?: string[];
    required?: boolean;
}
```

### PromptTemplate

```typescript
interface PromptTemplate {
    id: string;
    name: string;
    description?: string;
    content: string;
    category?: string;
    tags?: string[];
    variables?: PromptVariable[];
    version?: number;
    createdAt?: string;
    updatedAt?: string;
    author?: string;
    metadata?: Record<string, unknown>;
}
```

### PromptTemplateManagerOptions

```typescript
interface PromptTemplateManagerOptions {
    templates?: PromptTemplate[];
    categories?: string[];
    showPreview?: boolean;           // Default: true
    showVariableEditor?: boolean;    // Default: true
    showImportExport?: boolean;      // Default: true
    showSearch?: boolean;            // Default: true
    editorHeight?: string;           // Default: "300px"
    listWidth?: number;              // Default: 300
    height?: string;                 // Default: "600px"
    readOnly?: boolean;              // Default: false
    cssClass?: string;
    onSave?: (template: PromptTemplate) => Promise<PromptTemplate>;
    onDelete?: (templateId: string) => Promise<boolean>;
    onDuplicate?: (template: PromptTemplate) => Promise<PromptTemplate>;
    onPreview?: (content: string, variables: Record<string, string>) => Promise<string>;
    onLoadTemplates?: () => Promise<PromptTemplate[]>;
    onSelect?: (template: PromptTemplate) => void;
    onChange?: (template: PromptTemplate) => void;
}
```

## API

| Method | Description |
|--------|-------------|
| `show(containerId)` | Mount into a container element |
| `hide()` | Remove from DOM, preserve state |
| `destroy()` | Full cleanup |
| `getElement()` | Returns the root DOM element |
| `getTemplates()` | Returns a copy of all templates |
| `setTemplates(templates)` | Replace all templates |
| `getSelectedTemplate()` | Returns the selected template or null |
| `selectTemplate(id)` | Select a template by ID |
| `createTemplate()` | Create and select a new blank template |
| `deleteTemplate(id)` | Delete a template by ID |
| `duplicateTemplate(id)` | Duplicate a template by ID |
| `exportTemplates()` | Export all templates as JSON download |
| `importTemplates(json)` | Import templates from JSON string |
| `refresh()` | Reload via onLoadTemplates callback |
| `getPreviewContent(variables?)` | Get substituted preview text |
| `createPromptTemplateManager(opts, id)` | Create, show, and return instance |

## Keyboard

| Key | Action |
|-----|--------|
| Ctrl+S | Save current template |
| Ctrl+N | Create new template |
| Ctrl+P | Toggle preview |
| Enter / Comma | Add tag (in tags input) |
| Backspace | Remove last tag (when tags input empty) |
| Escape | Clear search / return focus to list |

## Variable Extraction

Templates use `{{variableName}}` syntax. Variables are extracted automatically from content using `/\{\{(\w+)\}\}/g`. Detected variables appear as editable fields below the prompt editor.

## Dependencies

- **Required:** Bootstrap 5 CSS, Bootstrap Icons, SplitLayout component
