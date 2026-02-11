<!-- AGENT: Product Requirements Document for the CronPicker component — structure, behaviour, API, and accessibility requirements. -->

# CRON Picker Component

**Status:** Draft
**Component name:** CronPicker
**Folder:** `./components/cronpicker/`
**Spec author:** Agent
**Date:** 2026-02-11

---

## 1. Overview

### 1.1 What Is It

A visual builder for extended 6-field CRON expressions (second, minute, hour, day-of-month, month, day-of-week). It renders inline (not as a dropdown) and provides:

1. A preset dropdown with common schedules
2. A field builder with mode selectors and value editors for each CRON field
3. A human-readable description of the expression
4. A raw expression input with bidirectional synchronisation
5. A format hint showing the field order

### 1.2 Why Build It

CRON expressions are powerful but opaque. Enterprise applications need CRON scheduling for:

- Background job configuration
- Report generation schedules
- Alert and notification rules
- Data sync intervals
- Automated workflow triggers

Most users cannot author CRON expressions from memory. A visual builder eliminates syntax errors and makes schedules self-documenting.

### 1.3 Design Inspiration

| Source | Key Pattern Adopted |
|--------|---------------------|
| Crontab Guru | Human-readable description, field-by-field editing |
| Jenkins CRON UI | Visual mode selectors per field |
| AWS EventBridge | Preset dropdown for common schedules |

---

## 2. CRON Expression Format

### 2.1 Six-Field Extended Format

```
second  minute  hour  day-of-month  month  day-of-week
```

### 2.2 Field Domains

| Field | Range | Display Labels |
|-------|-------|----------------|
| Second | 0–59 | Numeric |
| Minute | 0–59 | Numeric |
| Hour | 0–23 | Numeric |
| Day of Month | 1–31 | Numeric |
| Month | 1–12 | Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec |
| Day of Week | 0–6 | Sun, Mon, Tue, Wed, Thu, Fri, Sat |

### 2.3 Supported Syntax

| Syntax | Meaning | Example |
|--------|---------|---------|
| `*` | Every value | Every second |
| `N` | Specific value | `30` = at 30 |
| `N,M,O` | List of values | `1,15` = on 1st and 15th |
| `N-M` | Range | `1-5` = Monday through Friday |
| `*/N` | Step from 0 | `*/15` = every 15 |
| `N/M` | Step from N | `5/10` = at 5, 15, 25, 35, 45, 55 |

---

## 3. Functional Requirements

### 3.1 Visual Layout (Top to Bottom)

1. **Preset dropdown** — `<select>` element with common schedules
2. **Field builder** — 6 rows, one per CRON field, each containing:
   - Field label (Second, Minute, Hour, Day of Month, Month, Day of Week)
   - Mode selector: 4 buttons — Every (`*`), Specific (multi-select), Range (from–to), Step (`*/N`)
   - Value editor that changes based on selected mode
3. **Human-readable description** — styled block
4. **Raw expression input** — monospace input with the CRON string
5. **Format hint** — "second minute hour day month weekday"

### 3.2 Mode Editors

| Mode | Editor UI | Generates |
|------|-----------|-----------|
| Every | No editor, shows "Every value" text | `*` |
| Specific | Clickable chip grid of valid values | `N` or `N,M,O` |
| Range | Two number inputs (from, to) | `N-M` |
| Step | Two number inputs (start, every N) | `N/M` or `*/N` |

### 3.3 Chip Grid for Specific Mode

- Month field: 12 chips labelled Jan–Dec
- Day of Week field: 7 chips labelled Sun–Sat
- Numeric fields: chips for all valid values (0–59 for seconds/minutes, 0–23 for hours, 1–31 for days, 1–12 for months)
- Selected chips are visually highlighted
- Multiple chips can be selected

### 3.4 Bidirectional Sync

- Editing the visual builder updates the raw expression input in real time
- Editing the raw expression input updates the visual builder on blur or Enter
- Invalid raw expressions show a validation error message

### 3.5 Default Presets

| Label | Expression |
|-------|-----------|
| Every second | `* * * * * *` |
| Every minute | `0 * * * * *` |
| Every hour | `0 0 * * * *` |
| Daily at midnight | `0 0 0 * * *` |
| Daily at noon | `0 0 12 * * *` |
| Weekdays at 9am | `0 0 9 * * 1-5` |
| Weekly on Monday | `0 0 0 * * 1` |
| Monthly on the 1st | `0 0 0 1 * *` |
| Yearly on Jan 1 | `0 0 0 1 1 *` |

### 3.6 Human-Readable Description

Generated from the parsed expression. Examples:

- `0 * * * * *` → "Every minute"
- `0 0 9 * * 1-5` → "At 09:00:00 on Monday through Friday"
- `0 30 */2 * * *` → "At minute 30 of every 2nd hour"
- `0 0 0 1 1 *` → "At 00:00:00 on day 1 of January"

---

## 4. API

### 4.1 Constructor

```typescript
createCronPicker(containerId: string, options?: CronPickerOptions): CronPicker
```

### 4.2 Options Interface

```typescript
interface CronPickerOptions {
    value?: string;              // Default "0 * * * * *"
    showPresets?: boolean;       // Default true
    showDescription?: boolean;   // Default true
    showRawExpression?: boolean; // Default true
    allowRawEdit?: boolean;      // Default true
    showFormatHint?: boolean;    // Default true
    presets?: CronPreset[];      // Custom presets
    disabled?: boolean;          // Default false
    readonly?: boolean;          // Default false
    size?: "sm" | "default" | "lg";
    onChange?: (value: string) => void;
    onPresetSelect?: (preset: CronPreset) => void;
}

interface CronPreset {
    label: string;
    value: string;
}
```

### 4.3 Public Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getValue()` | `string` | Current CRON expression string |
| `getDescription()` | `string` | Human-readable description |
| `setValue(cron)` | `void` | Set expression programmatically |
| `clear()` | `void` | Reset to default expression |
| `enable()` | `void` | Enable the component |
| `disable()` | `void` | Disable the component |
| `destroy()` | `void` | Remove from DOM, clean up listeners |

---

## 5. Accessibility

- Preset select: standard `<select>` element
- Mode buttons: `role="radiogroup"` per field, buttons have `aria-pressed`
- Chip grid: `role="group"`, chips have `role="checkbox"` with `aria-checked`
- Range/step inputs: standard `<input type="number">` with `aria-label`
- Raw expression: `aria-label="CRON expression"`
- Description: `aria-live="polite"` for live updates
- Format hint: linked via `aria-describedby`

---

## 6. SCSS Classes

All classes prefixed with `cronpicker-`:

| Class | Element |
|-------|---------|
| `.cronpicker` | Wrapper |
| `.cronpicker-presets` | Preset dropdown wrapper |
| `.cronpicker-fields` | Fields container |
| `.cronpicker-field` | Single field row |
| `.cronpicker-field-header` | Field header (label + modes) |
| `.cronpicker-field-label` | Field name label |
| `.cronpicker-field-mode` | Mode button group |
| `.cronpicker-mode-btn` | Individual mode button |
| `.cronpicker-mode-btn-active` | Active mode button |
| `.cronpicker-field-value` | Value editor area |
| `.cronpicker-multi-select` | Chip grid container |
| `.cronpicker-value-chip` | Individual value chip |
| `.cronpicker-value-chip-selected` | Selected chip |
| `.cronpicker-range-inputs` | Range from/to inputs |
| `.cronpicker-step-inputs` | Step start/every inputs |
| `.cronpicker-description` | Description block |
| `.cronpicker-raw` | Raw expression wrapper |
| `.cronpicker-raw-input` | Raw expression input |
| `.cronpicker-hint` | Format hint |
| `.cronpicker-sm` | Small size variant |
| `.cronpicker-lg` | Large size variant |
| `.cronpicker-disabled` | Disabled state |
| `.cronpicker-invalid` | Invalid state |
