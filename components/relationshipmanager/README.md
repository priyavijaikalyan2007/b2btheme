# RelationshipManager

Component for creating, viewing, and managing typed relationships between entities. Embeddable in any resource detail view as a "Relationships" section.

## Usage

```html
<link rel="stylesheet" href="components/relationshipmanager/relationshipmanager.css" />
<script src="components/relationshipmanager/relationshipmanager.js"></script>
<!-- Optional: TypeBadge for rich type display -->
<script src="components/typebadge/typebadge.js"></script>
```

```javascript
const rm = createRelationshipManager({
    container: document.getElementById("relationships"),
    resourceId: "proj-123",
    resourceType: "work.project",
    resourceDisplayName: "Payment Redesign",
    relationshipDefinitions: [
        {
            key: "aligns_to",
            displayName: "aligns to",
            inverseName: "aligned by",
            targetTypeKeys: ["strategy.okr", "strategy.goal"],
            sourceTypeKeys: null,
            cardinality: "MANY_TO_MANY"
        }
    ],
    relationships: [
        {
            id: "rel-1",
            relationshipKey: "aligns_to",
            relationshipDisplayName: "aligns to",
            direction: "outbound",
            otherResourceId: "okr-456",
            otherResourceDisplayName: "Q2 Revenue Growth OKR",
            otherResourceType: "strategy.okr",
            properties: {},
            provenance: "manual",
            createdAt: "2026-02-15"
        }
    ],
    onCreateRelationship: async (req) => { /* POST to API */ },
    onDeleteRelationship: async (id) => { /* DELETE from API */ },
    onSearchResources: async (query, types) => { /* GET search results */ },
    onNavigate: (resourceId) => { /* Navigate to resource */ }
});
```

## Features

- **Grouped list** — Relationships grouped by type with collapsible sections
- **AI suggestions** — Special section for AI-inferred relationships with confirm/dismiss
- **3-step add flow** — Inline panel (not modal): select type, search target, set properties
- **TypeBadge integration** — Uses `window.createTypeBadge` if available, fallback to plain text
- **ConfirmDialog integration** — Uses `window.showConfirmDialog` if available, fallback to `confirm()`

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `container` | `HTMLElement` | — | Mount point |
| `resourceId` | `string` | — | Current resource ID |
| `resourceType` | `string` | — | Current resource type key |
| `resourceDisplayName` | `string` | — | Display name |
| `relationshipDefinitions` | `RelationshipDefinitionSummary[]` | — | Available relationship types |
| `relationships` | `RelationshipInstance[]` | — | Current relationships |
| `readOnly` | `boolean` | `false` | Disable add/delete |
| `allowedRelationshipKeys` | `string[]` | all | Restrict creatable types |
| `showProvenance` | `boolean` | `true` | Show provenance badges |
| `showConfidence` | `boolean` | `true` | Show AI confidence % |
| `groupByType` | `boolean` | `true` | Group by relationship type |

## Public API

- `setRelationships(rels)` — Replace all relationships
- `addRelationship(rel)` — Add one relationship
- `removeRelationship(id)` — Remove by ID
- `setReadOnly(readOnly)` — Toggle read-only mode
- `expandAll()` / `collapseAll()` — Group expand/collapse
- `refresh()` — Re-render
- `destroy()` — Clean up

## Global

```javascript
window.createRelationshipManager(options)
```
