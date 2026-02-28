<!-- AGENT: Documentation for the Multi-Stage Stepper (Wizard) component. -->

# Multi-Stage Stepper (Wizard)

Linear or non-linear step progression UI for complex multi-step processes with validation gates, save-as-draft, step summary, and completion percentage.

## Assets

| Asset | Path |
|-------|------|
| CSS | `components/stepper/stepper.css` |
| JS | `components/stepper/stepper.js` |
| Types | `components/stepper/stepper.d.ts` |

## Requirements

- **Bootstrap CSS** — SCSS variables and `.btn-*` classes
- **Bootstrap Icons** — step state icons (`bi-check-lg`, `bi-exclamation-lg`)
- Does **not** require Bootstrap JS.

## Quick Start

```html
<link rel="stylesheet" href="components/stepper/stepper.css">
<script src="components/stepper/stepper.js"></script>
<script>
    var stepper = createStepper({
        container: document.getElementById("my-wizard"),
        steps: [
            { label: "Account", description: "Create your account", content: step1El },
            { label: "Profile", description: "Set up your profile", content: step2El },
            { label: "Confirm", description: "Review and submit", content: step3El }
        ],
        onFinish: function() { console.log("Done!"); }
    });
</script>
```

## API

### `createStepper(options): StepperHandle`

### StepperOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `container` | `HTMLElement` | **required** | Mount target element |
| `steps` | `StepConfig[]` | **required** | Step definitions |
| `orientation` | `"horizontal" \| "vertical"` | `"horizontal"` | Layout direction |
| `nonLinear` | `boolean` | `false` | Allow clicking any step freely |
| `showProgress` | `boolean` | `true` | Show completion percentage bar |
| `showSaveAsDraft` | `boolean` | `false` | Show "Save as Draft" button |
| `finishLabel` | `string` | `"Finish"` | Label for final step's button |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Size variant |
| `cssClass` | `string` | — | Extra CSS class(es) |
| `onStepChange` | `(from, to) => void` | — | Step change callback |
| `onFinish` | `() => void` | — | Final step completion callback |
| `onSaveAsDraft` | `() => void` | — | Save-as-draft callback |

### StepConfig

| Property | Type | Description |
|----------|------|-------------|
| `label` | `string` | Display label (required) |
| `description` | `string` | Description text below label |
| `icon` | `string` | Bootstrap Icons class for indicator |
| `content` | `HTMLElement` | Content element for this step's body |
| `summary` | `string` | Summary text shown when step is completed |
| `validate` | `() => boolean \| Promise<boolean>` | Validation gate before advancing |
| `optional` | `boolean` | Whether the step can be skipped |

### StepperHandle

| Method | Returns | Description |
|--------|---------|-------------|
| `goToStep(index)` | `Promise<boolean>` | Navigate to step (validates in linear mode) |
| `nextStep()` | `Promise<boolean>` | Advance to next step (validates) |
| `prevStep()` | `void` | Go back one step |
| `getActiveStep()` | `number` | Current step index |
| `setStepState(i, state)` | `void` | Set step to pending/active/completed/error/skipped |
| `getCompletionPercent()` | `number` | Percentage of completed steps |
| `getElement()` | `HTMLElement` | Root DOM element |
| `destroy()` | `void` | Tear down DOM |

## Step States

| State | Marker | Description |
|-------|--------|-------------|
| `pending` | Grey number | Not yet reached |
| `active` | Blue filled | Current step |
| `completed` | Green check | Successfully completed |
| `error` | Red exclamation | Validation failed |
| `skipped` | Grey dashed | Skipped (optional step) |

## Keyboard

| Key | Action |
|-----|--------|
| `Enter` / `Space` | Click focused step indicator |
| `Tab` | Move focus between step indicators and buttons |

## Accessibility

- Root: `role="group"`, `aria-label="Progress"`
- Step indicator: `<nav aria-label="Steps">`
- Active step: `aria-current="step"`
- Content panes: `role="tabpanel"`, `aria-label`
