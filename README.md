<!-- AGENT: Project README — overview, setup, build, and deployment for the enterprise Bootstrap 5 theme. -->

# Enterprise Bootstrap Theme

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![Built with Bootstrap 5](https://img.shields.io/badge/Bootstrap-5.3-purple.svg)
![Components](https://img.shields.io/badge/Components-95-green.svg)
![Tests](https://img.shields.io/badge/Tests-2476-brightgreen.svg)
![CI](https://img.shields.io/badge/CI-GitHub%20Actions-orange.svg)

A compact, professional Bootstrap 5 theme with 95 vanilla TypeScript components, optimized for enterprise SaaS applications. Reduces default Bootstrap spacing, sizes, and rounded corners to save screen real estate while maintaining WCAG AA accessibility standards.

**CDN:** `https://theme.priyavijai-kalyan2007.workers.dev/`

## Features

- **Compact Design**: 14px base font with reduced padding (15-20% smaller) to maximize screen real estate
- **Square Design**: Zero border radius on all components for a sharp, professional appearance
- **Inter + JetBrains Mono**: Google Fonts loaded for clean body text and clear monospace code
- **Enterprise Color Palette**: Professional blues, grays, blacks, reds, and greens instead of default bright colors
- **Accessibility First**: WCAG AA compliant with proper contrast ratios, focus states, and legible typography
- **95 JavaScript Components**: Pickers, editors, layout containers, data grids, diagram engine, and more
- **Dark Mode**: Full dark mode support via `data-bs-theme="dark"` attribute
- **2,476 Unit Tests**: Comprehensive Vitest test suite across 98 test files

## Quick Start

### Installation

```bash
npm install
```

### Build

```bash
npm run build
```

This will:
1. Compile SCSS to CSS with autoprefixer
2. Bundle and compile TypeScript components
3. Wrap compiled JS in IIFEs for browser use
4. Minify CSS and JS
5. Copy Bootstrap JS and icons to dist/
6. Generate documentation and demo files

### Development Mode

```bash
npm run dev
```

### Run Tests

```bash
npm run test:unit          # Run all tests
npm run test:unit:coverage # Run with coverage report
```

### View Demo

Open `demo/index.html` in your browser, or visit the [live demo](https://theme.priyavijai-kalyan2007.workers.dev/docs/demo/).

## Project Structure

```
.
├── src/scss/                    # Theme SCSS source
│   ├── _variables.scss          # Custom variable overrides
│   ├── _dark-mode.scss          # Dark mode token overrides
│   └── custom.scss              # Main theme file (imports Bootstrap + overrides)
├── components/                  # 94 TypeScript components
│   ├── <name>/
│   │   ├── <name>.ts            # Component source (vanilla TS, IIFE-wrapped)
│   │   ├── <name>.scss          # Component styles
│   │   ├── <name>.test.ts       # Vitest unit tests
│   │   └── README.md            # Component API documentation
│   └── ...
├── demo/                        # Demo pages
│   ├── index.html               # Component gallery
│   └── components/              # Standalone demo per component
├── docs/                        # Documentation (copied to dist/docs/ on build)
│   ├── COMPONENT_REFERENCE.md   # Full API docs for all components
│   ├── AGENT_QUICK_REF.md       # Machine-parseable reference for agents
│   ├── DESIGN_TOKENS.md         # All SCSS variables and resolved values
│   └── CUSTOM_CLASSES.md        # All custom CSS classes
├── cloud-icons/                 # AWS, Azure, GCP architecture icons
├── agentknowledge/              # Structured knowledge base (YAML/JSONL)
├── specs/                       # PRD and plan files for components
├── dist/                        # Build output (generated, gitignored)
├── scripts/                     # Build, bundle, and deploy scripts
│
│   # Agent instruction files (repo root)
├── CLAUDE.md                    # Primary agent instructions (entrypoint)
├── AGENTS.md                    # Agent workflow, conventions, checklists
├── ADDITIONAL_INSTRUCTIONS.md   # Supplementary agent directives
├── GEMINI.md                    # Gemini-specific agent instructions
├── CODING_STYLE.md              # Code style rules (Allman, 30-line max, etc.)
├── COMMENTING.md                # JSDoc and comment standards
├── MARKERS.md                   # Semantic marker format for file headers
├── TESTING.md                   # Test strategy and patterns
├── TEST_PLAN.md                 # Test plan and coverage targets
├── LOGGING.md                   # Console logging conventions
├── DARKMODE.md                  # Dark mode implementation guide
├── KEYBOARD.md                  # Keyboard interaction standards
├── LITERATE_ERRORS.md           # Error dialog content guidelines
├── UX_UI_GUIDELINES.md          # UX/UI design principles
├── LANGUAGE.md                  # Terminology and naming conventions
├── FRONTEND.md                  # Frontend architecture patterns
├── CONVERSATION.md              # Conversation component design notes
├── DOCUMENTATION.md             # Documentation standards
├── KNOWLEDGE_ARCHITECTURE.md    # Knowledge base structure guide
├── COPYRIGHT_HEADER.md          # SPDX copyright header template
├── COPYRIGHT_INFO.md            # Copyright and licensing details
├── RIBBON_SETUP_GUIDE.md        # Ribbon toolbar setup guide
│
│   # Project indexes and references
├── COMPONENT_INDEX.md           # Categorised component index
├── MASTER_COMPONENT_LIST.md     # Full 162-component roadmap
├── MASTER_COMPONENT_INDEX.md    # Alphabetical component lookup
├── COMPONENTS.md                # Component architecture overview
├── USAGE.md                     # CDN integration guide for consumers
├── QUICK_START.md               # Beginner-friendly setup guide
├── NOTICE.md                    # Third-party icon attribution
├── SECURITY.md                  # Vulnerability disclosure policy
├── CONTRIBUTING.md              # Contribution guidelines
├── CODE_OF_CONDUCT.md           # Community code of conduct
├── DISCLAIMER.md                # Independent project disclaimer
├── CHANGELOG.md                 # Release history
├── CODEBASE_FIXES.md            # Record of codebase-wide fixes
├── DEPRECATION_WARNINGS_FIXED.md # Resolved SCSS deprecation warnings
├── FONT_UPDATE_SUMMARY.md       # Inter font migration summary
└── ULTRA_COMPACT_THEME_CHANGES.md # Theme compactness design rationale
```

## Components

The theme includes 95 production-ready vanilla TypeScript components across 15 categories. Each component:

- Uses factory functions (e.g., `createDatePicker()`) exposed on `window`
- Has its own CSS and JS files loadable via `<link>` and `<script>` tags
- Requires no bundler — works directly in the browser
- Includes full API documentation in its README.md

### Component Categories

| Category | Components |
|----------|-----------|
| **Date, Time & Pickers** | AnglePicker, ColorPicker, CronPicker, DatePicker, DurationPicker, FontDropdown, GradientPicker, LineEndingPicker, LineShapePicker, LineTypePicker, LineWidthPicker, PeriodPicker, SprintPicker, SymbolPicker, TimePicker, TimezonePicker |
| **Inputs & Selection** | EditableComboBox, MultiSelectCombo, PeoplePicker, SearchBox |
| **Content & Editing** | CodeEditor, CommentOverlay, FileUpload, MarkdownEditor, RichTextInput, SmartTextInput |
| **Data Display** | DataGrid, PropertyInspector, TreeGrid |
| **Layout Containers** | DockLayout, LayerLayout, SplitLayout, TabbedPanel, CardLayout, StackLayout, FlowLayout, GridLayout, ScrollLayout, OverlayLayout, AccordionLayout |
| **Dialogs & Feedback** | ConfirmDialog, ErrorDialog, FormDialog, ProgressModal, Toast |
| **Bars & Navigation** | Ribbon, RibbonBuilder, Sidebar, StatusBar, Toolbar |
| **Data Visualization** | GraphCanvas, DiagramEngine, SpineMap |
| **AI & ML** | Conversation, PromptTemplateManager, ReasoningAccordion |
| **Governance** | AuditLogViewer, PermissionMatrix |

Full categorised list: [`COMPONENT_INDEX.md`](COMPONENT_INDEX.md) | [CDN](https://theme.priyavijai-kalyan2007.workers.dev/docs/COMPONENT_INDEX.md)

## CDN & Agent Discovery

The theme is deployed to Cloudflare Workers on every push.

**CDN base URL:** `https://theme.priyavijai-kalyan2007.workers.dev/`

### Key CDN Paths

All paths below are relative to the CDN base URL.

| Asset | CDN Path |
|-------|----------|
| Theme CSS | [`css/custom.css`](https://theme.priyavijai-kalyan2007.workers.dev/css/custom.css) |
| Bootstrap JS | [`js/bootstrap.bundle.min.js`](https://theme.priyavijai-kalyan2007.workers.dev/js/bootstrap.bundle.min.js) |
| Bootstrap Icons | [`icons/bootstrap-icons.css`](https://theme.priyavijai-kalyan2007.workers.dev/icons/bootstrap-icons.css) |
| Component JS/CSS | `components/<name>/<name>.js` |
| Agent Quick Ref | [`docs/AGENT_QUICK_REF.md`](https://theme.priyavijai-kalyan2007.workers.dev/docs/AGENT_QUICK_REF.md) |
| Component Reference | [`docs/COMPONENT_REFERENCE.md`](https://theme.priyavijai-kalyan2007.workers.dev/docs/COMPONENT_REFERENCE.md) |
| Design Tokens | [`docs/DESIGN_TOKENS.md`](https://theme.priyavijai-kalyan2007.workers.dev/docs/DESIGN_TOKENS.md) |
| Custom Classes | [`docs/CUSTOM_CLASSES.md`](https://theme.priyavijai-kalyan2007.workers.dev/docs/CUSTOM_CLASSES.md) |
| Live Demo | [`docs/demo/`](https://theme.priyavijai-kalyan2007.workers.dev/docs/demo/) |

### For Coding Agents

Agents working in consumer repositories should fetch [`docs/AGENT_QUICK_REF.md`](https://theme.priyavijai-kalyan2007.workers.dev/docs/AGENT_QUICK_REF.md) from the CDN to discover available assets, design tokens, and component APIs. See [`USAGE.md`](USAGE.md) for full integration instructions and HTML boilerplate.

## Customization

### Color Palette

Defined in `src/scss/_variables.scss`:

| Token | Value | Use |
|-------|-------|-----|
| `$primary` (Blue 600) | `#1c7ed6` | Primary actions, links |
| `$gray-900` | `#0f172a` | Body text, headings |
| `$gray-100` | `#f1f5f9` | Light backgrounds |
| `$success` | `#52b788` | Success states |
| `$danger` | `#dc2626` | Error states |
| `$warning` | `#f59e0b` | Warning states |

### Key Design Tokens

| Token | Value | Bootstrap Default |
|-------|-------|-------------------|
| Base font size | `0.875rem` (14px) | 16px |
| Base spacer | `0.75rem` (12px) | 16px |
| Border radius | `0` (square) | 0.375rem |
| Font family | Inter | system-ui |
| Monospace font | JetBrains Mono | monospace |

See [docs/DESIGN_TOKENS.md](docs/DESIGN_TOKENS.md) for the complete token reference.

## Build Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Full build (CSS + TS + JS + icons + docs + demo) |
| `npm run build:css` | SCSS compilation + autoprefixer |
| `npm run build:ts` | TypeScript compilation + IIFE wrapping + minification |
| `npm run test:unit` | Run Vitest test suite |
| `npm run test:unit:coverage` | Run tests with coverage report |
| `npm run dev` | Build and watch for SCSS changes |

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

MIT License - See [LICENSE](LICENSE) for details.

## Disclaimer

This is an independent personal project, not affiliated with or endorsed by any
employer of its contributors. See [DISCLAIMER.md](DISCLAIMER.md) for details.

## Credits

Built on top of these open-source projects:

| Project | Use | License |
|---------|-----|---------|
| [Bootstrap 5](https://getbootstrap.com/) | Core CSS framework and grid system | MIT |
| [Bootstrap Icons](https://icons.getbootstrap.com/) | Icon library | MIT |
| [marked](https://marked.js.org/) | Markdown parsing for HelpDrawer, DocViewer | MIT |
| [highlight.js](https://highlightjs.org/) | Code syntax highlighting in rendered markdown | BSD-3-Clause |
| [KaTeX](https://katex.org/) | LaTeX math rendering in markdown | MIT |
| [Mermaid](https://mermaid.js.org/) | Diagram rendering in markdown | MIT |
| [Vditor](https://b3log.org/vditor/) | Full-featured markdown editor (MarkdownEditor component) | MIT |
| [maxGraph](https://maxgraph.github.io/maxGraph/) | Optional layout algorithms for DiagramEngine | Apache-2.0 |
| [@viz-js/viz](https://viz-js.com/) | Client-side Graphviz/dot rendering (WASM) | MIT |
| [Inter](https://rsms.me/inter/) | Primary UI typeface | OFL-1.1 |
| [JetBrains Mono](https://www.jetbrains.com/lp/mono/) | Monospace typeface for code | OFL-1.1 |

### Cloud Provider Icons

The `cloud-icons/` directory contains a curated subset of architecture icons from
AWS, Microsoft Azure, and Google Cloud, redistributed on this CDN strictly for
use as diagram stencils in the DiagramEngine component. The icons have been
reorganised into a subset relevant to diagramming but are otherwise faithfully
reproduced with no modifications. See [NOTICE.md](NOTICE.md) for full attribution
and terms.
