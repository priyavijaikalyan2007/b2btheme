# PeriodPicker — Product Requirements Document

## Overview

PeriodPicker is a coarse time-period selector for enterprise project planning. It lets users pick months, quarters, halves, or years (e.g., "Q1 2026", "H2 2028") instead of exact calendar dates. Returns the first or last day of the period depending on start/end mode.

## Use Cases

1. **Timeline estimation** — Set project start/end to "Q1 2026" or "H2 2027".
2. **Budget planning** — Allocate budgets by fiscal quarter or half-year.
3. **Roadmap milestones** — Target features at quarter or year granularity.

## UI Layout

```
         ◀  2026  ▶

   ┌──────── 2026 ────────┐     ← Year (1 cell, full width)
   ├──────────┬───────────┤
   │    H1    │    H2     │     ← Halves (2 cells)
   ├────┬─────┼────┬──────┤
   │ Q1 │ Q2  │ Q3 │ Q4  │     ← Quarters (4 cells)
   ├────┴─────┼────┴──────┤
   │ Jan  Feb  Mar  Apr   │     ← Months (4×3 grid)
   │ May  Jun  Jul  Aug   │
   │ Sep  Oct  Nov  Dec   │
   └──────────────────────┘
```

Granularities are configurable — consumers can show any subset.

## Date Resolution

- **Start mode** → first day of the period.
- **End mode** → last day of the period.

| Selection | Start Mode   | End Mode     |
|-----------|-------------|-------------|
| Jan 2026  | 2026-01-01  | 2026-01-31  |
| Q1 2026   | 2026-01-01  | 2026-03-31  |
| H2 2028   | 2028-07-01  | 2028-12-31  |
| 2026      | 2026-01-01  | 2026-12-31  |

## Key Features

- Configurable granularities (month, quarter, half, year).
- Start/end mode toggle.
- Year range constraints (minYear/maxYear).
- Size variants (sm, md, lg).
- Keyboard navigation (arrows, PageUp/PageDown for year, Enter/Space to select).
- Accessibility: `role="combobox"`, `aria-expanded`, `aria-label` on all cells.
- Dropdown rendered to `document.body` with `position: fixed`, `z-index: 2050`.

## Public API

`getValue()`, `setValue()`, `getFormattedValue()`, `open()`, `close()`, `enable()`, `disable()`, `setReadonly()`, `setMode()`, `setYear()`, `destroy()`.

## Files

| File | Purpose |
|------|---------|
| `components/periodpicker/periodpicker.ts` | TypeScript source |
| `components/periodpicker/periodpicker.scss` | Styles |
| `components/periodpicker/README.md` | API documentation |
