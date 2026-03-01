# SprintPicker — Product Requirements Document

## Overview

SprintPicker is an agile sprint selector computed from configuration (anchor date, sprint length, week start day). Supports list view and calendar view with colored sprint band overlays. Configurable sprint naming.

## Use Cases

1. **Sprint assignment** — Assign work items to specific sprints.
2. **Sprint planning** — Select target sprint for delivery.
3. **Velocity tracking** — Filter metrics by sprint period.

## Sprint Computation

```
anchor = anchorDate (must align to weekStartDay)
for i = 0..maxSprints-1:
    start = anchor + (i × sprintLength × 7) days
    end   = start + (sprintLength × 7 - 3) days   // Friday of last week
```

## Naming Modes

- `"sprint"` → "Sprint 1", "Sprint 2", ...
- `"short"` → "S1", "S2", ...
- `"monthly"` → "Jan Sprint 1", "Feb Sprint 2", ...
- `callback(index, startDate, endDate)` → custom string.

## View Modes

### List View

Scrollable sprint list with name and date range.

### Calendar View

Month grid with 8-color cycling sprint band overlays. Sprint boundaries get left/right border markers.

## Key Features

- Sprint length 1–8 weeks.
- Configurable anchor date and week start day.
- Two view modes: list and calendar with toggle.
- Start/end mode for date resolution.
- Configurable sprint naming (4 modes).
- Size variants (sm, md, lg).
- Full keyboard navigation.
- Accessibility compliance.
- Dropdown at `z-index: 2050`.

## Public API

`getValue()`, `setValue()`, `getFormattedValue()`, `open()`, `close()`, `enable()`, `disable()`, `setReadonly()`, `setMode()`, `setSprintLength()`, `setAnchorDate()`, `getSprintAtDate()`, `getSprints()`, `destroy()`.

## Files

| File | Purpose |
|------|---------|
| `components/sprintpicker/sprintpicker.ts` | TypeScript source |
| `components/sprintpicker/sprintpicker.scss` | Styles |
| `components/sprintpicker/README.md` | API documentation |
