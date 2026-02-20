# ReasoningAccordion

Collapsible accordion for displaying AI chain-of-thought reasoning steps with status indicators, shimmer animation, timing metadata, confidence bars, and Vditor markdown rendering.

## Assets

| File | Purpose |
|------|---------|
| `reasoningaccordion.ts` | TypeScript source |
| `reasoningaccordion.scss` | Component styles |
| `reasoningaccordion.js` | Compiled JS (IIFE-wrapped) |
| `reasoningaccordion.css` | Compiled CSS |

## Usage

```html
<link rel="stylesheet" href="dist/components/reasoningaccordion/reasoningaccordion.css">
<script src="dist/components/reasoningaccordion/reasoningaccordion.js"></script>
```

### Basic — Static Steps

```javascript
var acc = createReasoningAccordion("container-id", {
    title: "Reasoning",
    steps: [
        { id: "s1", title: "Analyzing input", status: "complete", duration: 820, content: "Parsed query entities." },
        { id: "s2", title: "Querying sources", status: "complete", duration: 1540, content: "Retrieved 12 documents." },
        { id: "s3", title: "Generating response", status: "complete", duration: 950, content: "Synthesized final answer." }
    ]
});
```

### Streaming — Add Steps Over Time

```javascript
var acc = createReasoningAccordion("container-id", {
    title: "AI Reasoning",
    autoExpandActive: true,
    autoCollapseCompleted: true
});

// Step 1 starts thinking
acc.addStep({ id: "s1", title: "Parsing query", status: "thinking" });

// Later — step 1 completes, step 2 starts
acc.updateStep("s1", { status: "complete", duration: 800, content: "Parsed OK." });
acc.addStep({ id: "s2", title: "Searching", status: "thinking" });
```

## Interfaces

### ReasoningStep

```typescript
interface ReasoningStep {
    id: string;
    title: string;
    content?: string;               // Markdown rendered via Vditor
    status: "pending" | "thinking" | "complete" | "error";
    duration?: number;               // Milliseconds
    confidence?: number;             // 0-1
    icon?: string;                   // Bootstrap icon class override
    metadata?: Record<string, unknown>;
}
```

### ReasoningAccordionOptions

```typescript
interface ReasoningAccordionOptions {
    id?: string;
    steps?: ReasoningStep[];
    title?: string;                  // Default: "Reasoning"
    expandAll?: boolean;
    showTimings?: boolean;           // Default: true
    showStepNumbers?: boolean;       // Default: true
    showConfidence?: boolean;        // Default: false
    showExpandAllButton?: boolean;   // Default: true
    autoExpandActive?: boolean;      // Default: true
    autoCollapseCompleted?: boolean; // Default: false
    size?: "sm" | "default" | "lg"; // Default: "default"
    cssClass?: string;
    onStepClick?: (step: ReasoningStep) => void;
    onExpandChange?: (stepId: string, expanded: boolean) => void;
}
```

## API

| Method | Description |
|--------|-------------|
| `show(containerId)` | Mount into a container element |
| `hide()` | Remove from DOM (preserves state) |
| `destroy()` | Full cleanup |
| `getElement()` | Returns root HTMLElement |
| `addStep(step)` | Append a new step |
| `updateStep(stepId, changes)` | Partial update |
| `removeStep(stepId)` | Remove and renumber |
| `getSteps()` | Returns copy of steps array |
| `clear()` | Remove all steps |
| `expandStep(stepId)` | Expand a step panel |
| `collapseStep(stepId)` | Collapse a step panel |
| `expandAll()` | Expand all steps |
| `collapseAll()` | Collapse all steps |
| `setStepStatus(stepId, status)` | Update step status |
| `setStepContent(stepId, markdown)` | Set/replace step markdown content |
| `getTotalDuration()` | Sum of all step durations (ms) |

## Keyboard

| Key | Action |
|-----|--------|
| Enter / Space | Toggle expand/collapse on focused step |
| Arrow Down | Focus next step header |
| Arrow Up | Focus previous step header |
| Home | Focus first step header |
| End | Focus last step header |

## Status States

| Status | Icon | Colour | Animation |
|--------|------|--------|-----------|
| pending | `bi-circle` | Gray | None |
| thinking | `bi-arrow-repeat` | Blue | Spin + shimmer header |
| complete | `bi-check-circle-fill` | Green | None |
| error | `bi-exclamation-triangle-fill` | Red | None |

## Size Variants

- **sm** — Compact padding, smaller fonts
- **default** — Standard sizing
- **lg** — Generous padding, larger fonts

## Dependencies

- **Required:** Bootstrap 5 CSS, Bootstrap Icons
- **Optional:** Vditor (markdown rendering), DOMPurify (additional sanitisation)
