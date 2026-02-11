<!-- AGENT: Product Requirements Document for the TimezonePicker component — structure, behaviour, API, and accessibility requirements. -->

# Timezone Picker Component

**Status:** Draft
**Component name:** TimezonePicker
**Folder:** `./components/timezonepicker/`
**Spec author:** Agent
**Date:** 2026-02-11

---

## 1. Overview

### 1.1 What Is It

A searchable dropdown selector for IANA timezones, grouped by geographic region, with UTC offset display and a live clock showing the current time in the selected timezone. It combines a text input displaying the selected timezone with a dropdown panel containing a search field and a scrollable, grouped list of timezones.

This is a standalone extraction and enhancement of the timezone selector embedded within the TimePicker component.

### 1.2 Why Build It

Enterprise SaaS applications frequently need timezone selection independent of time input:

- User profile settings (preferred display timezone)
- Scheduling across time zones without picking a specific time
- Dashboard timezone switchers
- Report timezone filters
- Configuration panels for cron jobs and alerts

The embedded timezone selector in TimePicker is tightly coupled and cannot be reused independently. A standalone component fills this gap.

### 1.3 Design Inspiration

| Source | Key Pattern Adopted |
|--------|---------------------|
| TimePicker timezone selector | Searchable dropdown, grouped by region, offset display |
| Google Calendar timezone picker | Live time preview in selected timezone |
| Slack timezone settings | Clean input showing "Region/City (GMT offset)" format |

---

## 2. Functional Requirements

### 2.1 Input Display

- The input field shows the selected timezone in the format: `America/New_York (GMT-5)`
- A chevron toggle button opens/closes the dropdown
- The input itself is read-only (selection only via dropdown)

### 2.2 Dropdown Panel

1. **Search field** — filters timezones by name or offset substring match
2. **Grouped timezone list** — "Common" group first, then alphabetically by region (Americas, Europe, Asia, Pacific, Africa, Atlantic, Indian, Antarctica, Arctic, Other)
3. **Each option** displays: `Timezone/City (GMToffset)` with the selected item highlighted
4. **Time preview** (optional) — a footer section showing "Current time: HH:MM:SS" in the selected timezone, updated every second

### 2.3 Timezone Data

- Source: `Intl.supportedValuesOf("timeZone")` with fallback to a hardcoded common list
- Offsets: computed via `Intl.DateTimeFormat` with `timeZoneName: "shortOffset"`
- Validation: `Intl.DateTimeFormat` constructor test
- The `"local"` keyword resolves to the browser's timezone

### 2.4 Live Time Preview

- When `showTimePreview` is true and the dropdown is open, a footer displays the current time in the selected timezone
- Updated via `setInterval` every 1000ms
- Timer starts on dropdown open, stops on dropdown close and on `destroy()`
- Format: `HH:MM:SS` in the selected timezone via `Intl.DateTimeFormat`

### 2.5 Format Hint

- Below the input, show the IANA identifier (e.g., `America/New_York`)
- Help tooltip explains the timezone format

---

## 3. API

### 3.1 Constructor

```typescript
createTimezonePicker(containerId: string, options?: TimezonePickerOptions): TimezonePicker
```

### 3.2 Options Interface

```typescript
interface TimezonePickerOptions {
    timezone?: string;          // Default "UTC", accepts "local"
    showTimePreview?: boolean;  // Default true
    showFormatHint?: boolean;   // Default true
    showFormatHelp?: boolean;   // Default true
    formatHelpText?: string;    // Custom help text
    disabled?: boolean;         // Default false
    readonly?: boolean;         // Default false
    size?: "sm" | "default" | "lg";
    placeholder?: string;
    onSelect?: (timezone: string) => void;
    onChange?: (timezone: string) => void;
    onOpen?: () => void;
    onClose?: () => void;
}
```

### 3.3 Public Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getValue()` | `string` | Current IANA timezone string |
| `setValue(tz)` | `void` | Set timezone programmatically |
| `getOffset()` | `string` | Current UTC offset string (e.g., "GMT-5") |
| `open()` | `void` | Open the dropdown |
| `close()` | `void` | Close the dropdown |
| `enable()` | `void` | Enable the component |
| `disable()` | `void` | Disable the component |
| `destroy()` | `void` | Remove from DOM, clean up timers and listeners |

---

## 4. Keyboard Interaction

| Key | Context | Action |
|-----|---------|--------|
| `ArrowDown` | Input focused | Open dropdown |
| `ArrowDown` | Dropdown open | Move highlight down |
| `ArrowUp` | Dropdown open | Move highlight up |
| `Enter` | Dropdown open | Select highlighted timezone |
| `Escape` | Dropdown open | Close dropdown |
| Typing | Search field | Filter timezone list |

---

## 5. Accessibility

- Input: `role="combobox"`, `aria-haspopup="listbox"`, `aria-expanded`
- Dropdown: `role="listbox"`, `aria-label="Timezones"`
- Options: `role="option"`, `aria-selected`
- Group headers: `aria-hidden="true"`
- Search: `aria-label="Search timezones"`
- Format hint: linked via `aria-describedby`

---

## 6. SCSS Classes

All classes prefixed with `timezonepicker-`:

| Class | Element |
|-------|---------|
| `.timezonepicker` | Wrapper |
| `.timezonepicker-input` | Input field |
| `.timezonepicker-toggle` | Chevron toggle button |
| `.timezonepicker-dropdown` | Dropdown panel |
| `.timezonepicker-search` | Search wrapper |
| `.timezonepicker-list` | Scrollable list |
| `.timezonepicker-group-header` | Region group header |
| `.timezonepicker-option` | Timezone option |
| `.timezonepicker-option-selected` | Selected option |
| `.timezonepicker-option-highlighted` | Keyboard-highlighted option |
| `.timezonepicker-time-preview` | Live time preview footer |
| `.timezonepicker-hint` | Format hint wrapper |
| `.timezonepicker-help-icon` | Help icon button |
| `.timezonepicker-help-tooltip` | Help tooltip |
| `.timezonepicker-sm` | Small size variant |
| `.timezonepicker-lg` | Large size variant |
| `.timezonepicker-disabled` | Disabled state |
