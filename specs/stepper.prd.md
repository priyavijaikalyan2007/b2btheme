<!-- AGENT: PRD specification for the Multi-Stage Stepper (Wizard) component (MASTER_COMPONENT_LIST §18.2). -->

# Multi-Stage Stepper (Wizard) — PRD

## 1. Overview

Linear or non-linear step progression UI for complex multi-step processes with validation gates, save-as-draft, step summary, and completion percentage.

**MASTER_COMPONENT_LIST §18.2** | **ADR-044**

## 2. Use Cases

- Account onboarding flows
- Campaign setup wizards
- Integration configuration (OAuth, API keys, webhooks)
- Compliance questionnaires
- Multi-step form submissions

## 3. References

- Material UI Stepper
- Stripe Connect onboarding
- AWS service creation wizards

## 4. Functional Requirements

### 4.1 Step Display
- Horizontal or vertical step indicator bar
- Each step: number/icon, label, optional description
- States: pending, active, completed, error, skipped
- Progress line connecting steps with fill for completion
- Completion percentage display

### 4.2 Navigation
- Linear mode: can only go forward (or back to completed steps)
- Non-linear mode: can click any step freely
- Next/Back/Finish buttons in footer
- Optional "Save as Draft" button

### 4.3 Validation
- Per-step validation callback before advancing
- Error state on step indicator when validation fails
- Optional step summary below completed steps

### 4.4 Content Area
- Container slot for each step's content
- Only active step's content is visible
- Consumer provides content elements per step

### 4.5 API
- `goToStep(index)` — navigate to step
- `nextStep()` / `prevStep()` — sequential navigation
- `getActiveStep()` — current step index
- `setStepState(index, state)` — set step status
- `getCompletionPercent()` — calculate progress
- `destroy()` — clean up

### 4.6 Size Variants
- `sm` / `md` (default) / `lg`

## 5. Status

| Phase | Status |
|-------|--------|
| PRD | Complete |
| TypeScript | Complete |
| SCSS | Complete |
| README | Complete |
| Demo | Complete |
| Build | Complete |
