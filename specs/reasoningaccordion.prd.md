<!-- AGENT: Product Requirements Document for the ReasoningAccordion component — collapsible accordion for displaying AI chain-of-thought reasoning steps with streaming, status indicators, and timing metadata. -->

# ReasoningAccordion Component — Product Requirements

**Status:** Draft
**Component name:** ReasoningAccordion
**Folder:** `./components/reasoningaccordion/`
**Spec author:** Agent
**Date:** 2026-02-20

---

## 1. Overview

### 1.1 What Is It

A collapsible accordion component for displaying AI chain-of-thought reasoning steps in enterprise B2B and B2C SaaS applications. Designed to make opaque AI decision-making transparent by presenting each reasoning step with a title, status indicator, rich markdown content, timing metadata, and optional confidence scores.

The ReasoningAccordion supports:

- **Step-by-step display** of AI reasoning with four status states: pending, thinking, complete, and error.
- **Shimmer/pulse animation** on step headers in the "thinking" state, providing visual feedback that the AI is actively processing.
- **Incremental step addition** (streaming) — steps can be added one at a time as AI reasoning progresses, matching the streaming nature of modern AI inference.
- **Rich markdown rendering** of step content via `Vditor.preview()` — the same rendering pipeline used by the Conversation and MarkdownEditor components.
- **DOMPurify sanitisation** for all rendered content, with graceful degradation when DOMPurify is not available.
- **Expand all / Collapse all** controls for quick navigation through reasoning chains.
- **Step numbering** (optional) for ordered reasoning sequences.
- **Timing display** — per-step duration and total duration across all steps.
- **Confidence indicators** (optional) — a horizontal progress bar per step showing a 0-1 confidence score.
- **Summary header** showing total step count, overall status, and aggregate timing.
- **Auto-expand active step** — the currently "thinking" or most recently added step can auto-expand for immediate visibility.
- **Auto-collapse completed steps** (optional) — completed steps collapse automatically to reduce visual noise during long reasoning chains.
- **Size variants** (sm, default, lg) with consistent scaling across all dimensions.

### 1.2 Why Build It

Modern AI systems — large language models, agent frameworks, retrieval-augmented generation pipelines, and multi-step reasoning chains — increasingly expose their intermediate reasoning to users. This transparency:

- **Builds trust** — users can verify that the AI considered relevant factors before reaching a conclusion.
- **Enables debugging** — developers and operators can inspect which reasoning step failed or produced unexpected output.
- **Supports compliance** — regulated industries (finance, healthcare, legal) require audit trails of AI decision-making.
- **Improves UX** — showing progress through multiple steps reduces perceived wait time for long-running AI operations.

No existing component in this project or in the evaluated open-source ecosystem provides a Bootstrap 5 compatible, vanilla TypeScript, IIFE-wrapped accordion purpose-built for AI reasoning display with streaming step addition, status animations, and timing metadata.

### 1.3 Open Source Evaluation

| Library | Verdict | Reason |
|---------|---------|--------|
| Bootstrap 5 Accordion | Foundation | Native collapse/expand; no streaming, no status indicators, no timing, no markdown |
| react-accessible-accordion | Not recommended | React dependency; no streaming, no status indicators |
| Chakra UI Accordion | Not recommended | React dependency; Chakra design system conflicts with Bootstrap |
| Ant Design Collapse | Not recommended | React dependency; no streaming, no confidence bars, no timing |
| PatternFly Accordion | Not recommended | React dependency; PatternFly design system conflicts with Bootstrap |
| Radix Accordion | Not recommended | React dependency; headless but no reasoning-specific features |
| Shoelace `<sl-details>` | Not recommended | Web component; Shadow DOM conflicts with Bootstrap theming |

**Decision:** No library covers more than 30% of requirements. The Bootstrap 5 Accordion provides the foundational collapse/expand pattern, but every reasoning-specific feature (status indicators, shimmer animation, streaming step addition, timing, confidence bars, markdown rendering, auto-expand/collapse) must be built custom. Build as a standalone component to ensure alignment with the project's zero-dependency, IIFE-wrapped, Bootstrap-themed architecture.

### 1.4 Design Inspiration

| Source | Key Pattern Adopted |
|--------|---------------------|
| OpenAI o1/o3 reasoning display | Collapsible thinking steps, step-by-step reveal, status transitions |
| Claude thinking blocks | Expandable reasoning sections, timing metadata, streaming reveal |
| Google Gemini Deep Research | Multi-step research display, progress through stages, confidence indicators |
| Perplexity step-by-step | Numbered reasoning steps, source citations, expand/collapse per step |
| Chain of Thought Prompting papers | Sequential reasoning decomposition, intermediate step visibility |
| GitHub Actions workflow logs | Collapsible job steps, status icons (pending/running/pass/fail), timing per step |
| VS Code Test Runner | Hierarchical pass/fail display, duration per test, expand to see details |

---

## 2. Use Cases

| Use Case | Features Needed |
|----------|-----------------|
| LLM chain-of-thought display | Streaming steps, thinking shimmer, markdown content, timing |
| Agent workflow transparency | Status indicators, step numbering, error display, confidence |
| RAG pipeline inspection | Step-by-step source retrieval display, timing per retrieval step |
| Multi-model ensemble reasoning | Confidence bars per model step, aggregate timing |
| Compliance audit trail | All steps visible, expand all, step metadata for logging |
| Developer debugging console | Error status, technical detail in markdown, timing analysis |
| Research assistant progress | Streaming steps as research progresses, auto-expand active |

---

## 3. Anatomy

### 3.1 Full Component

```
+------------------------------------------------------------+
|  Reasoning                     3 steps . 2.4s  [+/-] [v/^] | <- summary header
+------------------------------------------------------------+
| v 1. [check] Analyzing the input data                0.8s  | <- complete step (expanded)
|   +--------------------------------------------------------+|
|   | First, I need to parse the user's query and identify   ||
|   | the key entities: **customer name** and **date range** ||
|   +--------------------------------------------------------+|
| v 2. [spin] Querying relevant sources...     [====] 1.2s   | <- thinking step (shimmer)
|   +--------------------------------------------------------+|
|   | Searching across 3 data sources for matching records   ||
|   |                                                        ||
|   +--------------------------------------------------------+|
| > 3. [circle] Generating final response              --    | <- pending step (collapsed)
+------------------------------------------------------------+
```

### 3.2 Element Breakdown

| Element | Required | Description |
|---------|----------|-------------|
| Root container | Yes | `role="region"` with `aria-label="Reasoning steps"` |
| Summary header | Yes | Title text, step count, total duration, expand/collapse controls |
| Header title | Yes | Configurable text (default: "Reasoning") |
| Header stats | Yes | Step count badge and total duration |
| Expand all button | Optional | Expands all steps; toggled via `showExpandAllButton` |
| Collapse all button | Optional | Collapses all steps; shares toggle with expand all |
| Step list | Yes | Ordered container for step items |
| Step item | Yes (1+) | Individual reasoning step with header and content panel |
| Step header | Yes | Clickable row with toggle chevron, number, status icon, title, timing |
| Step toggle | Yes | Chevron indicating expanded/collapsed state |
| Step number | Optional | Sequential number (1-based); toggled via `showStepNumbers` |
| Step status icon | Yes | Visual indicator of step status (pending/thinking/complete/error) |
| Step title | Yes | Short descriptive text for the step |
| Step timing | Optional | Duration in human-readable format; toggled via `showTimings` |
| Step confidence bar | Optional | Horizontal progress bar (0-100%); toggled via `showConfidence` |
| Step content panel | Yes | Collapsible panel containing rendered markdown |
| Step content | Yes | Markdown rendered via `Vditor.preview()` |

---

## 4. API

### 4.1 Types

```typescript
/** Status of a reasoning step. */
type ReasoningStepStatus = "pending" | "thinking" | "complete" | "error";

/** Size variant for the ReasoningAccordion component. */
type ReasoningAccordionSize = "sm" | "default" | "lg";
```

### 4.2 Interfaces

```typescript
/** A single reasoning step within the accordion. */
interface ReasoningStep
{
    /** Unique identifier for this step. */
    id: string;

    /** Short title displayed in the step header. */
    title: string;

    /** Markdown content displayed in the collapsible panel. */
    content?: string;

    /** Current status of this step. */
    status: ReasoningStepStatus;

    /** Duration of this step in milliseconds. */
    duration?: number;

    /** Confidence score between 0 and 1 for the optional confidence bar. */
    confidence?: number;

    /** Bootstrap Icons class for a custom step icon (e.g., "bi-search"). Overrides the status icon. */
    icon?: string;

    /** Arbitrary consumer metadata attached to this step. */
    metadata?: Record<string, unknown>;
}

/** Configuration options for the ReasoningAccordion component. */
interface ReasoningAccordionOptions
{
    /** Unique identifier. Auto-generated if omitted. */
    id?: string;

    /** Initial set of reasoning steps. Default: []. */
    steps?: ReasoningStep[];

    /** Title text displayed in the summary header. Default: "Reasoning". */
    title?: string;

    /** Whether all steps start expanded. Default: false. */
    expandAll?: boolean;

    /** Show per-step and total timing information. Default: true. */
    showTimings?: boolean;

    /** Show sequential step numbers (1, 2, 3...). Default: true. */
    showStepNumbers?: boolean;

    /** Show confidence progress bars on steps that have a confidence value. Default: false. */
    showConfidence?: boolean;

    /** Show the expand all / collapse all toggle button. Default: true. */
    showExpandAllButton?: boolean;

    /** Auto-expand the currently thinking or most recently added step. Default: true. */
    autoExpandActive?: boolean;

    /** Auto-collapse steps when their status changes to complete. Default: false. */
    autoCollapseCompleted?: boolean;

    /** Size variant. Default: "default". */
    size?: ReasoningAccordionSize;

    /** Additional CSS class(es) for the root element. */
    cssClass?: string;

    /** Called when a step header is clicked. */
    onStepClick?: (step: ReasoningStep) => void;

    /** Called when a step is expanded or collapsed. */
    onExpandChange?: (stepId: string, expanded: boolean) => void;
}
```

### 4.3 Class: ReasoningAccordion

| Method | Description |
|--------|-------------|
| `constructor(options)` | Creates the accordion DOM from `options`. Does not attach to the page. |
| `show(containerId)` | Appends to the container element identified by ID string. |
| `hide()` | Removes from DOM without destroying state. |
| `destroy()` | Hides, releases all references and event listeners. |
| `getElement()` | Returns the root DOM element. |
| `addStep(step)` | Appends a new step to the accordion. Updates the summary header. If `autoExpandActive` is true and the step status is "thinking", auto-expands it. |
| `updateStep(stepId, changes)` | Updates properties of an existing step (title, content, status, duration, confidence, icon, metadata). Partial update — only specified fields change. |
| `removeStep(stepId)` | Removes a step by ID. Updates the summary header and re-numbers if `showStepNumbers` is true. |
| `getSteps()` | Returns a copy of the current steps array. |
| `expandAll()` | Expands all steps. |
| `collapseAll()` | Collapses all steps. |
| `expandStep(stepId)` | Expands a specific step by ID. |
| `collapseStep(stepId)` | Collapses a specific step by ID. |
| `setStepStatus(stepId, status)` | Updates the status of a step. Triggers status icon change, shimmer animation start/stop, and auto-collapse if applicable. |
| `setStepContent(stepId, markdown)` | Sets or replaces the markdown content of a step. Triggers `Vditor.preview()` re-render. |
| `getTotalDuration()` | Returns the sum of all step durations in milliseconds. Returns 0 if no durations are set. |
| `clear()` | Removes all steps. Resets the summary header to zero steps. |

### 4.4 Convenience Functions

| Function | Description |
|----------|-------------|
| `createReasoningAccordion(options, containerId?)` | Create, show, and return a ReasoningAccordion instance. |

### 4.5 Global Exports

```
window.ReasoningAccordion
window.createReasoningAccordion
```

---

## 5. Behaviour

### 5.1 Lifecycle

1. **Construction** — Builds the DOM tree from `options`. Creates the summary header, initialises any provided steps, attaches internal event listeners. Does not attach to the page.
2. **show(containerId)** — Resolves the container element by ID, appends the root element. Renders any step content via `Vditor.preview()`.
3. **hide()** — Removes from DOM. State (steps, expanded/collapsed) is preserved.
4. **destroy()** — Calls hide, removes all event listeners, nulls DOM references. Sets destroyed flag. No further method calls are valid.

### 5.2 Step Status Lifecycle

Steps transition through statuses in a predictable sequence, though any transition is valid:

```
pending -> thinking -> complete
pending -> thinking -> error
pending -> complete (skipped thinking)
pending -> error (immediate failure)
```

Each status has distinct visual indicators:

| Status | Icon | Header Style | Animation |
|--------|------|-------------|-----------|
| `pending` | `bi-circle` (open circle) | Muted text (`$gray-500`) | None |
| `thinking` | `bi-arrow-repeat` (rotating arrows) | Normal text with shimmer background | CSS shimmer/pulse on header |
| `complete` | `bi-check-circle-fill` (filled check) | Normal text | None |
| `error` | `bi-exclamation-triangle-fill` (warning) | Error text (`$red-600`) | None |

### 5.3 Shimmer Animation (Thinking State)

When a step enters the "thinking" status:

1. The step header receives the `.reasoning-step-thinking` class.
2. A CSS shimmer animation sweeps a translucent gradient highlight across the header background from left to right.
3. The status icon receives a CSS spin animation (`bi-arrow-repeat` rotates 360 degrees continuously).
4. Both animations respect `prefers-reduced-motion: reduce` — when reduced motion is preferred, the shimmer is replaced with a static subtle background highlight, and the icon spin is disabled.

When the step transitions away from "thinking", the animations are removed immediately.

### 5.4 Incremental Step Addition (Streaming)

The `addStep()` method supports the streaming AI reasoning pattern:

1. Consumer calls `addStep({ id, title, status: "thinking" })` as each reasoning step begins.
2. The accordion appends the step, updates the summary header count, and (if `autoExpandActive` is true) expands the new step.
3. As content becomes available, consumer calls `setStepContent(stepId, markdown)` to populate the step body.
4. When the step completes, consumer calls `setStepStatus(stepId, "complete")` and optionally `updateStep(stepId, { duration })`.
5. If `autoCollapseCompleted` is true, the step collapses automatically upon reaching "complete" status.
6. The next step is then added via `addStep()`, repeating the cycle.

This pattern allows the accordion to grow dynamically as the AI processes, providing real-time visibility into reasoning progress.

### 5.5 Content Rendering

Step content is rendered using the same `Vditor.preview()` pipeline as the Conversation component:

1. If `Vditor` is available on `window`, call `Vditor.preview(contentEl, markdown, { sanitize: true })` for rich markdown rendering including tables, code blocks, Mermaid diagrams, LaTeX math, and syntax highlighting.
2. If DOMPurify is available on `window`, apply it as an additional sanitisation layer after Vditor rendering.
3. If Vditor is not loaded, fall back to rendering the content via `textContent` with CSS `white-space: pre-wrap`. Log a warning with `LOG_PREFIX`.
4. If DOMPurify is not loaded, log an info-level note. Vditor's built-in `sanitize: true` serves as the primary sanitisation layer.

### 5.6 Expand/Collapse Behaviour

**Individual steps:**
- Clicking a step header toggles its expanded/collapsed state.
- The chevron rotates to indicate state (down = expanded, right = collapsed).
- The content panel height transitions smoothly using CSS `max-height` and `overflow: hidden` (200ms ease-out).
- `expandStep(stepId)` and `collapseStep(stepId)` provide programmatic control.
- Each toggle fires the `onExpandChange` callback.

**All steps:**
- The "Expand all / Collapse all" toggle button in the summary header expands or collapses every step.
- The button icon toggles between `bi-arrows-expand` (when steps are collapsed) and `bi-arrows-collapse` (when steps are expanded).
- `expandAll()` and `collapseAll()` provide programmatic control.
- Each individual step fires `onExpandChange` during bulk operations.

**Auto-expand active:**
- When `autoExpandActive` is true (default), adding a step with status "thinking" or calling `setStepStatus(stepId, "thinking")` automatically expands that step.
- If another step was previously auto-expanded, it is not auto-collapsed (that requires `autoCollapseCompleted`).

**Auto-collapse completed:**
- When `autoCollapseCompleted` is true, a step that transitions to "complete" status is automatically collapsed after a brief delay (300ms) to allow the user to see the completion.

### 5.7 Summary Header

The summary header displays aggregate information:

- **Title** — configurable text (default: "Reasoning").
- **Step count** — "{n} steps" or "{n} step" (singular when n = 1). Updated on `addStep()` and `removeStep()`.
- **Total duration** — sum of all step durations, formatted in human-readable form (e.g., "2.4s", "1m 12s"). Hidden if no steps have duration values or if `showTimings` is false.
- **Overall status indicator** — a small icon reflecting the aggregate status:
  - All complete: `bi-check-circle-fill` in `$green-600`.
  - Any thinking: `bi-arrow-repeat` with spin animation.
  - Any error: `bi-exclamation-triangle-fill` in `$red-600`.
  - All pending: `bi-circle` in `$gray-500`.
  - Mixed (some complete, some pending, none thinking/error): `bi-circle-half` in `$blue-600`.
- **Expand/collapse toggle button** — if `showExpandAllButton` is true.

### 5.8 Timing Display

When `showTimings` is true:

- Each step with a `duration` value shows the formatted duration right-aligned in the step header.
- Duration formatting:
  - < 1000ms: `"{n}ms"` (e.g., "450ms")
  - < 60000ms: `"{n.n}s"` (e.g., "2.4s", "12.0s")
  - >= 60000ms: `"{m}m {s}s"` (e.g., "1m 12s")
- Steps without a duration show an em-dash ("--") as a placeholder.
- The summary header shows the total duration using the same formatting rules.

### 5.9 Confidence Bar

When `showConfidence` is true and a step has a `confidence` value (0 to 1):

- A thin horizontal progress bar renders below the step title in the header.
- The bar width represents the confidence percentage (0% to 100%).
- Bar colour:
  - confidence >= 0.7: `$green-600` (high confidence).
  - confidence >= 0.4: `$yellow-600` (moderate confidence).
  - confidence < 0.4: `$red-600` (low confidence).
- The bar includes `role="progressbar"`, `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`, and `aria-label="Confidence: {n}%"`.
- Steps without a confidence value do not render the bar.

### 5.10 Step Numbering

When `showStepNumbers` is true (default):

- Each step header displays its 1-based sequential number before the status icon.
- Numbers update when steps are added or removed (renumbering occurs on every mutation).
- Numbering follows DOM order (insertion order).

---

## 6. DOM Structure

### 6.1 Full Component

```html
<div class="reasoning reasoning-default"
     id="reasoning-1"
     role="region"
     aria-label="Reasoning steps">

    <div class="reasoning-header">
        <div class="reasoning-header-left">
            <span class="reasoning-header-status" aria-hidden="true">
                <i class="bi bi-arrow-repeat reasoning-spin"></i>
            </span>
            <h3 class="reasoning-header-title">Reasoning</h3>
        </div>
        <div class="reasoning-header-right">
            <span class="reasoning-header-stats">
                <span class="reasoning-header-count">3 steps</span>
                <span class="reasoning-header-separator" aria-hidden="true">.</span>
                <span class="reasoning-header-duration">2.4s</span>
            </span>
            <button class="reasoning-btn reasoning-btn-expand-all"
                    type="button"
                    aria-label="Expand all steps"
                    title="Expand all steps">
                <i class="bi bi-arrows-expand"></i>
            </button>
        </div>
    </div>

    <div class="reasoning-steps" role="list">

        <!-- Complete step (expanded) -->
        <div class="reasoning-step reasoning-step-complete"
             role="listitem"
             data-step-id="step-1">
            <div class="reasoning-step-header"
                 role="button"
                 tabindex="0"
                 aria-expanded="true"
                 aria-controls="reasoning-1-step-1-content">
                <i class="bi bi-chevron-down reasoning-step-toggle"
                   aria-hidden="true"></i>
                <span class="reasoning-step-number">1.</span>
                <span class="reasoning-step-status" aria-label="Complete">
                    <i class="bi bi-check-circle-fill"></i>
                </span>
                <span class="reasoning-step-title">Analyzing the input data</span>
                <span class="reasoning-step-timing">0.8s</span>
            </div>
            <div class="reasoning-step-content"
                 id="reasoning-1-step-1-content"
                 role="region"
                 aria-label="Step 1 details">
                <div class="reasoning-step-body">
                    <!-- Vditor-rendered markdown content -->
                </div>
            </div>
        </div>

        <!-- Thinking step (expanded, shimmer active) -->
        <div class="reasoning-step reasoning-step-thinking"
             role="listitem"
             data-step-id="step-2">
            <div class="reasoning-step-header"
                 role="button"
                 tabindex="0"
                 aria-expanded="true"
                 aria-controls="reasoning-1-step-2-content">
                <i class="bi bi-chevron-down reasoning-step-toggle"
                   aria-hidden="true"></i>
                <span class="reasoning-step-number">2.</span>
                <span class="reasoning-step-status" aria-label="Thinking">
                    <i class="bi bi-arrow-repeat reasoning-spin"></i>
                </span>
                <span class="reasoning-step-title">Querying relevant sources...</span>
                <div class="reasoning-step-confidence"
                     role="progressbar"
                     aria-valuenow="60"
                     aria-valuemin="0"
                     aria-valuemax="100"
                     aria-label="Confidence: 60%">
                    <div class="reasoning-step-confidence-bar"
                         style="width: 60%;"></div>
                </div>
                <span class="reasoning-step-timing">1.2s</span>
            </div>
            <div class="reasoning-step-content"
                 id="reasoning-1-step-2-content"
                 role="region"
                 aria-label="Step 2 details">
                <div class="reasoning-step-body">
                    <!-- Vditor-rendered markdown content -->
                </div>
            </div>
        </div>

        <!-- Pending step (collapsed) -->
        <div class="reasoning-step reasoning-step-pending"
             role="listitem"
             data-step-id="step-3">
            <div class="reasoning-step-header"
                 role="button"
                 tabindex="0"
                 aria-expanded="false"
                 aria-controls="reasoning-1-step-3-content">
                <i class="bi bi-chevron-right reasoning-step-toggle"
                   aria-hidden="true"></i>
                <span class="reasoning-step-number">3.</span>
                <span class="reasoning-step-status" aria-label="Pending">
                    <i class="bi bi-circle"></i>
                </span>
                <span class="reasoning-step-title">Generating final response</span>
                <span class="reasoning-step-timing">--</span>
            </div>
            <div class="reasoning-step-content"
                 id="reasoning-1-step-3-content"
                 role="region"
                 aria-label="Step 3 details"
                 style="display: none;">
                <div class="reasoning-step-body">
                    <!-- Empty until content is set -->
                </div>
            </div>
        </div>

    </div>
</div>
```

---

## 7. CSS Classes

| Class | Description |
|-------|-------------|
| `.reasoning` | Root container — `position: relative`, `display: flex`, `flex-direction: column`, `border: 1px solid $gray-300` |
| `.reasoning-sm` | Small size variant — compact padding, smaller fonts |
| `.reasoning-default` | Default size variant |
| `.reasoning-lg` | Large size variant — generous padding, larger fonts |
| `.reasoning-header` | Summary header bar — `display: flex`, `justify-content: space-between`, `align-items: center` |
| `.reasoning-header-left` | Left side of header — status icon and title |
| `.reasoning-header-right` | Right side of header — stats and expand/collapse button |
| `.reasoning-header-status` | Overall status icon container |
| `.reasoning-header-title` | Title `<h3>` — `$font-size-base`, `$font-weight-semibold`, `margin: 0` |
| `.reasoning-header-stats` | Step count and total duration container |
| `.reasoning-header-count` | Step count text (e.g., "3 steps") |
| `.reasoning-header-separator` | Dot separator between count and duration |
| `.reasoning-header-duration` | Total duration text (e.g., "2.4s") |
| `.reasoning-btn` | Base button style — transparent background, icon-sized |
| `.reasoning-btn-expand-all` | Expand/collapse all toggle button |
| `.reasoning-steps` | Step list container |
| `.reasoning-step` | Individual step container |
| `.reasoning-step-pending` | Step in pending status — muted styling |
| `.reasoning-step-thinking` | Step in thinking status — shimmer animation on header |
| `.reasoning-step-complete` | Step in complete status — standard styling |
| `.reasoning-step-error` | Step in error status — error accent styling |
| `.reasoning-step-header` | Clickable step header row — `display: flex`, `align-items: center`, `cursor: pointer` |
| `.reasoning-step-toggle` | Chevron icon for expand/collapse indication |
| `.reasoning-step-number` | Step number text (e.g., "1.") |
| `.reasoning-step-status` | Status icon container within step header |
| `.reasoning-step-title` | Step title text — `flex: 1`, `$font-weight-medium` |
| `.reasoning-step-timing` | Duration text right-aligned in step header |
| `.reasoning-step-confidence` | Confidence bar container — `role="progressbar"` |
| `.reasoning-step-confidence-bar` | Inner filled bar element with colour-coded width |
| `.reasoning-step-content` | Collapsible content panel — `overflow: hidden`, `transition: max-height 200ms ease-out` |
| `.reasoning-step-body` | Inner padding wrapper for markdown content |
| `.reasoning-spin` | CSS spin animation class for rotating icons |
| `.reasoning-shimmer` | CSS shimmer background animation (applied automatically to `.reasoning-step-thinking .reasoning-step-header`) |

---

## 8. Styling

### 8.1 Theme Integration

| Property | Value | Source |
|----------|-------|--------|
| Root background | `$gray-50` | Subtle surface differentiation |
| Root border | `1px solid $gray-300` | Consistent with cards and panels |
| Header background | `$gray-100` | Distinct from step content |
| Header border | `1px solid $gray-200` bottom | Separator |
| Header title colour | `$gray-900` | High contrast |
| Header stats colour | `$gray-500` | De-emphasised metadata |
| Step header background | `$gray-50` | Clean step surface |
| Step header hover | `$gray-100` | Subtle hover highlight |
| Step header border | `1px solid $gray-200` bottom | Step separation |
| Step title colour | `$gray-900` | High contrast |
| Step title (pending) | `$gray-500` | Muted for inactive steps |
| Step content background | `$gray-50` (transparent to root) | Continuous background |
| Step content border | `1px solid $gray-100` bottom | Subtle content separation |
| Status icon (pending) | `$gray-400` | Muted circle |
| Status icon (thinking) | `$blue-600` | Active processing |
| Status icon (complete) | `$green-600` | Success |
| Status icon (error) | `$red-600` | Error/failure |
| Step number colour | `$gray-500` | De-emphasised |
| Step timing colour | `$gray-500`, `$font-family-monospace` | Monospace for numeric alignment |
| Chevron colour | `$gray-500` | Subtle affordance |
| Chevron hover colour | `$gray-700` | Hover highlight |
| Confidence bar track | `$gray-200` | Background track |
| Confidence bar high (>=0.7) | `$green-600` | High confidence |
| Confidence bar moderate (>=0.4) | `$yellow-600` | Moderate confidence |
| Confidence bar low (<0.4) | `$red-600` | Low confidence |
| Shimmer gradient | `linear-gradient(90deg, transparent, rgba($gray-50, 0.8), transparent)` | Translucent sweep |
| Shimmer background | `$blue-50` mixed with header background | Subtle thinking indicator |
| Expand/collapse button | `$gray-500` icon | Standard button |
| Expand/collapse button hover | `$gray-700` icon | Hover highlight |

### 8.2 Size Variants

| Property | sm | default | lg |
|----------|----|---------|----|
| Root padding | 0 | 0 | 0 |
| Header padding | 6px 10px | 8px 12px | 10px 16px |
| Header title font | `$font-size-sm` | `$font-size-base` | `$font-size-lg` |
| Step header padding | 6px 10px | 8px 12px | 10px 16px |
| Step title font | `$font-size-sm` | `$font-size-base` | `$font-size-base` |
| Step number font | `$font-size-sm` | `$font-size-sm` | `$font-size-base` |
| Step timing font | 10px | 11px | 12px |
| Step content padding | 8px 10px 8px 32px | 10px 12px 10px 40px | 12px 16px 12px 48px |
| Status icon size | 14px | 16px | 20px |
| Chevron size | 12px | 14px | 16px |
| Confidence bar height | 2px | 3px | 4px |
| Expand/collapse button size | 24px | 28px | 32px |

### 8.3 Shimmer Animation

```css
@keyframes reasoning-shimmer
{
    0%
    {
        background-position: -200% 0;
    }
    100%
    {
        background-position: 200% 0;
    }
}

.reasoning-step-thinking .reasoning-step-header
{
    background: linear-gradient(
        90deg,
        $gray-50 25%,
        rgba($blue-100, 0.4) 50%,
        $gray-50 75%
    );
    background-size: 200% 100%;
    animation: reasoning-shimmer 2s ease-in-out infinite;
}
```

### 8.4 Spin Animation

```css
@keyframes reasoning-spin
{
    0%
    {
        transform: rotate(0deg);
    }
    100%
    {
        transform: rotate(360deg);
    }
}

.reasoning-spin
{
    animation: reasoning-spin 1.2s linear infinite;
}
```

### 8.5 Reduced Motion

A `prefers-reduced-motion: reduce` media query:

- Disables the shimmer animation. The thinking header retains a static `$blue-50` background tint for visual distinction.
- Disables the spin animation. The `bi-arrow-repeat` icon remains static but visible.
- Disables the expand/collapse `max-height` transition. State changes are immediate.

### 8.6 Z-Index

| Element | Z-Index | Rationale |
|---------|---------|-----------|
| Reasoning root | `auto` | Participates in parent stacking context |
| All internal elements | `auto` | No elevated stacking within the component |

The ReasoningAccordion does not use fixed positioning or global z-index values. It participates in its parent container's stacking context.

---

## 9. Keyboard Interaction

### 9.1 Navigation

| Key | Context | Action |
|-----|---------|--------|
| **Tab** | Anywhere | Moves focus to the next focusable step header (or expand/collapse button) |
| **Shift+Tab** | Anywhere | Moves focus to the previous focusable step header (or expand/collapse button) |
| **Enter** | Step header focused | Toggles expand/collapse for the focused step |
| **Space** | Step header focused | Toggles expand/collapse for the focused step |
| **Home** | Step header focused | Moves focus to the first step header |
| **End** | Step header focused | Moves focus to the last step header |
| **Arrow Down** | Step header focused | Moves focus to the next step header |
| **Arrow Up** | Step header focused | Moves focus to the previous step header |

### 9.2 Focus Management

- Step headers are focusable via `tabindex="0"`.
- Arrow Up/Down moves focus between step headers without changing expand/collapse state.
- Home/End jump to the first/last step header respectively.
- The expand/collapse all button in the header is focusable and activated via Enter/Space.
- When a step is removed that currently has focus, focus moves to the next step header (or the previous step header if the removed step was last).

---

## 10. Accessibility

### 10.1 ARIA Attributes

| Element | Attribute | Value |
|---------|-----------|-------|
| Root | `role="region"` | Landmark region |
| Root | `aria-label` | "Reasoning steps" or consumer-provided label |
| Step list | `role="list"` | Ordered list of steps |
| Step item | `role="listitem"` | Individual step |
| Step header | `role="button"` | Clickable toggle |
| Step header | `aria-expanded` | `"true"` or `"false"` |
| Step header | `aria-controls` | ID of the step content panel |
| Step content | `role="region"` | Collapsible content area |
| Step content | `aria-label` | "Step {n} details" |
| Step status icon | `aria-label` | Status text ("Pending", "Thinking", "Complete", "Error") |
| Step toggle chevron | `aria-hidden` | `"true"` — decorative |
| Step number | `aria-hidden` | `"true"` — the number is visual only; ordering is conveyed by list semantics |
| Confidence bar | `role="progressbar"` | Progress indicator |
| Confidence bar | `aria-valuenow` | Current percentage (0-100) |
| Confidence bar | `aria-valuemin` | `"0"` |
| Confidence bar | `aria-valuemax` | `"100"` |
| Confidence bar | `aria-label` | "Confidence: {n}%" |
| Expand all button | `aria-label` | "Expand all steps" or "Collapse all steps" (toggles) |
| Header stats | `aria-live="polite"` | Announces step count and timing changes |

### 10.2 Status Announcements

When a step's status changes, the status icon's `aria-label` is updated. Because the summary header stats region has `aria-live="polite"`, screen readers announce changes to the step count and overall status without requiring user interaction. Individual step status changes are not announced via `aria-live` to avoid excessive interruptions during rapid streaming updates.

---

## 11. Edge Cases

| Scenario | Behaviour |
|----------|-----------|
| Zero steps | Renders the header with "0 steps" and no step items. No error. |
| `addStep()` with duplicate ID | Logs warning, no-op. Step is not added. |
| `updateStep()` with non-existent ID | Logs warning, no-op. |
| `removeStep()` with non-existent ID | Logs warning, no-op. |
| `expandStep()` / `collapseStep()` with non-existent ID | Logs warning, no-op. |
| `setStepContent()` with empty string | Clears the step content body. No error. |
| `setStepContent()` with very long markdown (10,000+ chars) | Rendered fully via Vditor. Step content scrolls internally if needed. |
| `setStepStatus()` to current status | No-op. No animation restart. |
| Confidence value < 0 or > 1 | Clamped to 0-1 range. Logged as warning. |
| Duration value < 0 | Clamped to 0. Logged as warning. |
| Vditor not loaded (CDN failure) | Content rendered via `textContent` with `white-space: pre-wrap`. Warning logged. |
| DOMPurify not loaded | Vditor `sanitize: true` is the only sanitisation layer. Info logged. |
| `show()` called twice without `hide()` | Logs warning, no-op on second call. |
| `show()` after `destroy()` | Logs warning, no-op. |
| `destroy()` while steps have thinking status | Animations are cleaned up; no lingering intervals or animation frames. |
| Rapid `addStep()` calls (20+ in <1 second) | DOM updates are not batched (component is lightweight enough); each step appends immediately. Summary header updates on each call. |
| `expandAll()` when all are already expanded | No-op for each step. No callbacks fired. |
| `collapseAll()` when all are already collapsed | No-op for each step. No callbacks fired. |
| Consumer callback (`onStepClick`, `onExpandChange`) throws | Caught and logged; component state remains consistent. |
| Container element not found for `show()` | Logs error with container ID. No-op. |
| `clear()` called while steps are in thinking state | All steps removed; animations cleaned up; header resets. |
| `removeStep()` on the only remaining step | Step removed; header shows "0 steps". |
| Step with both `icon` and default status icon | Custom `icon` overrides the status-based icon. Status class still applies for styling. |
| `autoCollapseCompleted` with `autoExpandActive` both true | The thinking step expands; when it completes, it collapses after 300ms; the next thinking step then auto-expands. |

---

## 12. Security

### 12.1 Content Rendering

- **Step titles** — Always rendered via `textContent`. Never parsed as HTML. Prevents XSS from consumer-provided step titles.
- **Step content (markdown)** — Rendered via `Vditor.preview()` with `sanitize: true`. If DOMPurify is available, applied as an additional sanitisation layer after Vditor rendering. This double-sanitisation guards against markdown injection and HTML injection from AI model output.
- **Step numbers** — Generated internally. Not user-controllable.
- **Timing values** — Formatted internally from numeric millisecond values. No string injection path.
- **Confidence values** — Numeric only; clamped and formatted internally.
- **Metadata** — Stored by reference on the `ReasoningStep` object. Never rendered to the DOM.

### 12.2 Event Handling

- No inline event handlers (`onclick`, `onload`, etc.) in generated HTML.
- No `eval()`, `Function()`, or `setTimeout(string)`.
- All event listeners are attached programmatically via `addEventListener()`.

### 12.3 External Dependencies

- Vditor is expected but optional. The component degrades gracefully if absent.
- DOMPurify is expected but optional. The component logs a note if absent.
- Neither dependency is loaded by the component. The consumer includes them via `<script>` tags.

---

## 13. Dependencies

| Dependency | Required | Purpose | Fallback |
|------------|----------|---------|----------|
| Bootstrap 5 CSS | Yes | Base styling, utility classes | None — required for theme integration |
| Bootstrap Icons | Yes | Status icons, chevrons, expand/collapse icons | None — icons are visual indicators |
| Vditor | No (recommended) | Markdown rendering via `Vditor.preview()` | `textContent` with `white-space: pre-wrap` |
| DOMPurify | No (recommended) | Additional HTML sanitisation of rendered content | Vditor `sanitize: true` only |

---

## 14. Files

| File | Purpose |
|------|---------|
| `specs/reasoningaccordion.prd.md` | This specification |
| `components/reasoningaccordion/reasoningaccordion.ts` | TypeScript source |
| `components/reasoningaccordion/reasoningaccordion.scss` | Styles |
| `components/reasoningaccordion/README.md` | Documentation |

---

## 15. Implementation Notes

### 15.1 Vditor Integration

Reuses the same pattern established in the Conversation component:

```typescript
private renderMarkdown(contentEl: HTMLElement, markdown: string): void
{
    if (typeof Vditor !== "undefined")
    {
        Vditor.preview(contentEl, markdown, {
            mode: "dark",
            sanitize: true,
            cdn: "",
            math: { engine: "KaTeX" },
            hljs: { lineNumber: true }
        });

        if (typeof DOMPurify !== "undefined")
        {
            contentEl.innerHTML = DOMPurify.sanitize(contentEl.innerHTML);
        }
    }
    else
    {
        console.warn(LOG_PREFIX, "Vditor not loaded; falling back to plain text.");
        contentEl.textContent = markdown;
    }
}
```

### 15.2 Duration Formatting

```typescript
private formatDuration(ms: number): string
{
    if (ms < 1000)
    {
        return ms + "ms";
    }

    if (ms < 60000)
    {
        return (ms / 1000).toFixed(1) + "s";
    }

    const minutes = Math.floor(ms / 60000);
    const seconds = Math.round((ms % 60000) / 1000);

    return minutes + "m " + seconds + "s";
}
```

### 15.3 Step Element Creation

```typescript
private createStepElement(step: ReasoningStep, index: number): HTMLElement
{
    const stepEl = createElement("div", {
        className: "reasoning-step reasoning-step-" + step.status,
        "data-step-id": step.id
    });
    stepEl.setAttribute("role", "listitem");

    const headerEl = this.createStepHeader(step, index);
    const contentEl = this.createStepContent(step);

    stepEl.appendChild(headerEl);
    stepEl.appendChild(contentEl);

    return stepEl;
}
```

Step header and step content creation are extracted into separate helper methods to keep each function under 25-30 lines.

### 15.4 Expand/Collapse Transition

```typescript
private toggleStep(stepId: string, expand: boolean): void
{
    const stepEl = this.getStepElement(stepId);
    if (!stepEl)
    {
        return;
    }

    const headerEl = stepEl.querySelector(".reasoning-step-header") as HTMLElement;
    const contentEl = stepEl.querySelector(".reasoning-step-content") as HTMLElement;

    if (expand)
    {
        contentEl.style.display = "";
        contentEl.style.maxHeight = contentEl.scrollHeight + "px";
        headerEl.setAttribute("aria-expanded", "true");
    }
    else
    {
        contentEl.style.maxHeight = "0";
        contentEl.style.display = "none";
        headerEl.setAttribute("aria-expanded", "false");
    }

    this.updateChevron(stepEl, expand);
    this.safeCallback(() => this.options.onExpandChange?.(stepId, expand));
}
```

### 15.5 Callback Safety

All consumer callbacks are wrapped in try/catch to prevent consumer errors from breaking internal component state:

```typescript
private safeCallback(fn: () => void): void
{
    try
    {
        fn();
    }
    catch (error)
    {
        console.error(LOG_PREFIX, "Callback error:", error);
    }
}
```

### 15.6 Performance

- DOM creation uses `createElement` and `setAttr` helpers from the project's shared utilities. No `innerHTML` for component structure.
- Step elements are cached in a `Map<string, HTMLElement>` for O(1) lookup by ID.
- `Vditor.preview()` is called once per `setStepContent()` call — not re-rendered on expand/collapse.
- Shimmer and spin animations are pure CSS — no JavaScript timers or animation frames.
- The summary header is updated via direct DOM manipulation (textContent assignments) — no full re-render.
- Auto-collapse delay (300ms) uses a single `setTimeout` per step, cleared if the step is removed or status changes again before the timeout fires.

### 15.7 Target Size

The TypeScript source should target approximately 200-240 lines. The component is structurally simpler than Conversation or Toolbar — it is an enhanced accordion with status management and markdown rendering. The SCSS file should target approximately 120-160 lines, covering the shimmer and spin animations, size variants, status-specific styling, and confidence bar colours.

---

## 16. Demo Scenarios

### 16.1 Static Complete Reasoning

Three pre-completed steps with content and timing, all expandable. Demonstrates the basic accordion layout, status icons, timing display, and markdown rendering.

### 16.2 Streaming Reasoning (Live Simulation)

A "Start Reasoning" button that simulates streaming AI reasoning:
1. Adds step 1 as "thinking" with shimmer animation.
2. After 1.5 seconds, sets step 1 content and status to "complete" with duration.
3. Adds step 2 as "thinking".
4. After 2 seconds, completes step 2.
5. Adds step 3 as "thinking".
6. After 1 second, completes step 3.

Demonstrates streaming step addition, shimmer animation, auto-expand active, status transitions, and progressive timing updates.

### 16.3 Error State

A reasoning chain where step 2 errors. Demonstrates the error status icon, error header styling, and how subsequent pending steps remain inactive.

### 16.4 Confidence Bars

Three steps with varying confidence values (0.9, 0.55, 0.2). Demonstrates the colour-coded confidence bars and the `showConfidence` option.

### 16.5 Auto-Collapse Completed

A streaming simulation with `autoCollapseCompleted: true`. Demonstrates how completed steps collapse automatically as the next thinking step opens.

### 16.6 Size Variants

Three accordions side-by-side using "sm", "default", and "lg" sizes with identical data. Demonstrates visual scaling differences.

### 16.7 Expand All / Collapse All

Interactive buttons to expand and collapse all steps. Also demonstrates the programmatic `expandAll()` and `collapseAll()` methods.

### 16.8 No Step Numbers / No Timings

An accordion with `showStepNumbers: false` and `showTimings: false` to demonstrate the minimal configuration.

---

## 17. Future Considerations (Out of Scope for v1)

These features are explicitly deferred:

- **Nested reasoning steps** — hierarchical sub-steps within a parent step (tree structure).
- **Step reordering** — drag-and-drop or programmatic reordering of steps.
- **Step content streaming** — token-by-token content streaming within a step (like Conversation's StreamHandle). V1 sets content atomically via `setStepContent()`.
- **Step linking** — visual connectors or dependency arrows between steps.
- **Branching reasoning** — forking at a step to show alternative reasoning paths.
- **Export** — exporting the reasoning chain as markdown, JSON, or PDF.
- **Search within steps** — searching/filtering across step titles and content.
- **Copy step content** — clipboard copy of individual step markdown.
- **Collapsible summary** — collapsing the entire accordion into the summary header only.
- **Custom step renderers** — consumer-provided DOM for step content instead of markdown.
- **Step annotations** — user-added notes or comments on individual steps.
