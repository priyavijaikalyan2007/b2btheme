<!-- AGENT: Agent knowledge base architecture using YAML/JSONL for the theme and component library. -->

# Agent Knowledge Base Architecture

To optimise agent performance, we use a **Structured Local Knowledge Base** rooted in the repository. This supplements `CONVERSATION.md` (human-readable change log) with a machine-readable, queryable structure that agents can ingest quickly at the start of each session.

---

## 1. The Challenge

- **Markdown files** are hard to query ("Find all components related to accessibility").
- **Git log** is verbose and hard to parse for specific changes.
- Agents need fast orientation when starting a new session.

## 2. The Solution: "Git-Native" Knowledge Graph

We use **Structured Text (YAML/JSONL)** files that agents read directly. For this library, the knowledge base is lightweight — it tracks components, design decisions, and change history.

### 2.1 Directory Structure

All knowledge artifacts reside in `./agentknowledge/`:

```
./agentknowledge/
├── concepts.yaml       # Components and design concepts mapped to files
├── decisions.yaml      # Architectural Decision Records (ADRs)
├── entities.yaml       # Data models mapped to code files (if applicable)
└── history.jsonl       # Append-only log of tasks and changes
```

### 2.2 File Formats

#### `concepts.yaml` (The Component and Concept Map)

Maps theme concepts and components to their primary files.

```yaml
- name: "EnterpriseTheme"
  definition: "Bootstrap 5 variable overrides for compact, square, enterprise styling."
  anchor_file: "src/scss/_variables.scss"
  related: ["CustomComponents", "AtkinsonFont"]

- name: "AtkinsonFont"
  definition: "Atkinson Hyperlegible font loaded from Google Fonts for maximum readability."
  anchor_file: "src/scss/_variables.scss"
  related: ["EnterpriseTheme"]

- name: "ErrorDialog"
  definition: "Modal dialog component for displaying literate error messages."
  anchor_file: "components/errordialog/errordialog.ts"
  related: ["LiterateErrors"]

- name: "MetricCard"
  definition: "Dashboard card for displaying key metrics with labels, values, and change indicators."
  anchor_file: "src/scss/custom.scss"
  related: ["EnterpriseTheme"]

- name: "CloudIcons"
  definition: "SVG icon sets for AWS, Azure, and GCP cloud services."
  anchor_file: "cloud-icons/"
  related: []
```

#### `decisions.yaml` (The "Why")

Tracks why design and architectural choices were made.

```yaml
- id: "ADR-001"
  title: "Use Bootstrap 5 with SCSS variable overrides instead of a custom CSS framework"
  date: "2025-01-01"
  status: "Accepted"
  context: "Need a well-supported, documented component framework. Custom CSS is harder to maintain."
  files: ["src/scss/_variables.scss", "src/scss/custom.scss"]

- id: "ADR-002"
  title: "Use Atkinson Hyperlegible as the primary font"
  date: "2025-01-15"
  status: "Accepted"
  context: "Optimised for readability at small sizes (12px). Designed by the Braille Institute."
  files: ["src/scss/_variables.scss"]

- id: "ADR-003"
  title: "Zero border radius for all components"
  date: "2025-01-15"
  status: "Accepted"
  context: "Square corners give a sharp, professional appearance suited to enterprise tools."
  files: ["src/scss/_variables.scss"]

- id: "ADR-004"
  title: "Use console.* directly instead of a logging framework"
  date: "2026-02-09"
  status: "Accepted"
  context: "This is a reusable library. Logging abstractions would conflict with host applications."
  files: ["LOGGING.md"]
```

#### `entities.yaml` (Data Models)

For this library, entities are minimal. Use this file if components introduce structured data models.

```yaml
- name: "LiterateError"
  file: "components/errordialog/errordialog.ts"
  description: "Structured error object with user-facing and technical facets."
  related: ["ErrorDialog"]
```

#### `history.jsonl` (The Memory)

An append-only log of what agents have done. One JSON object per line.

```json
{"date": "2025-01-01", "task": "initial_theme_setup", "files": ["src/scss/_variables.scss", "src/scss/custom.scss"], "summary": "Created Bootstrap 5 theme with compact spacing and enterprise colours."}
{"date": "2025-01-15", "task": "font_update", "files": ["src/scss/_variables.scss", "demo/index.html"], "summary": "Changed font to Atkinson Hyperlegible from Google Fonts."}
{"date": "2025-01-15", "task": "ultra_compact_changes", "files": ["src/scss/_variables.scss"], "summary": "Reduced font size to 12px, spacing by 17%, removed all border radius."}
```

---

## 3. Instructions for Agents

### Session Start — Read

At the beginning of every session, read these files to orient yourself:

1. `agentknowledge/concepts.yaml` — Locate code by concept name.
2. `agentknowledge/decisions.yaml` — Understand past architectural choices before proposing alternatives.
3. `agentknowledge/history.jsonl` — Understand recent changes.

### Session End — Update

Before your final commit, update these files if your work changed the codebase meaningfully:

| Trigger | Action |
|---------|--------|
| Created a new component | Add a concept entry to `concepts.yaml`. |
| Modified a data model or interface | Add or update an entry in `entities.yaml`. |
| Made a design or architectural decision | Add an ADR entry to `decisions.yaml`. |
| Completed any significant task | Append a JSON line to `history.jsonl`. |

### Rules

- **Never delete** existing entries — only add or update.
- **Never rewrite** `history.jsonl` — it is append-only.
- Keep concept names in PascalCase and stable; other files may reference them.
- If a decision is superseded, set its `status` to `Superseded` and add the replacement ADR id.
