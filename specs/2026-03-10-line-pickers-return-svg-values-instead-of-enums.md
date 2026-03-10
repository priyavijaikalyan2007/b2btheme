# Bug Report: CDN Line Pickers Return SVG Rendering Values Instead of Semantic Enum Names

**Date**: 2026-03-10
**Priority**: Medium
**Components**: `linewidthpicker`, `linetypepicker`, `lineshapepicker`, `lineendingpicker`
**Status**: Fixed

## Problem

All four CDN line picker components return rendering-level values in their `onChange` callbacks instead of semantic enum names. This forces consumers to maintain SVG-to-enum mapping tables and convert at both serialization and deserialization boundaries.

### LineTypePicker (most impactful)

**Current behavior**: `onChange` returns SVG dash-array strings:
```javascript
onChange: function(item) {
    // item.value = "6 4 2 4" (SVG dash-array)
    // item.label = "Dash-Dot"
}
```

**Expected behavior**: Should return semantic enum names matching the label:
```javascript
onChange: function(item) {
    // item.value = "dash-dot" (enum name)
    // item.label = "Dash-Dot"
    // item.svgDashArray = "6 4 2 4" (optional, for direct SVG use)
}
```

The SVG dash-array values (`"6 4"`, `"6 4 2 4"`, `"2 2 6 2"`, etc.) are rendering implementation details that leak through the API. The backend stores these as typed enums (`DashPatternType`), so every consumer needs a bidirectional mapping table:

| SVG Value | Enum Name |
|-----------|-----------|
| `"2 2"` | `dotted` |
| `"6 4"` | `dashed` |
| `"6 4 2 4"` | `dash-dot` |
| `"12 4"` | `long-dash` |
| `"4 2"` | `short-dash` |
| `"2 2 6 2"` | `double-dot` |
| `"6 2 6 2"` | `double-dash` |
| `"1 2"` | `narrow-dot` |
| `"3 2"` | `narrow-dash` |
| `"2 6"` | `wide-dot` |
| `"8 6"` | `wide-dash` |

### LineWidthPicker, LineShapePicker, LineEndingPicker

These pickers return `{label, value}` objects, which is fine. However, the `onChange` callback type declarations initially suggested primitive parameters. The actual API is `onChange(item: {label, value})` — this should be clearly documented.

## Impact

- Consumer code needs duplicate mapping tables (one per module that serializes/deserializes)
- Diagrams app currently has the mapping duplicated in 3 places: `diagrams-line-format.ts`, `MaxGraphCanvas.ts`, `DiagramService.ts`
- Risk of mapping drift if new patterns are added to the picker but not to consumer code
- Violates separation of concerns: rendering details leak into business logic

## Suggested Fix

1. Change `LineTypePicker.onChange` to return enum names as `item.value` (e.g., `"dashed"` instead of `"6 4"`)
2. Optionally include the SVG dash-array as `item.svgDashArray` for consumers that need direct SVG rendering
3. Update `setValue()` to accept enum names, not SVG strings
4. Update `getValue()` to return enum names

### Backward Compatibility

If changing `value` is breaking, add a new `item.name` field with the enum name and deprecate the SVG value in `item.value` for a future major version.

## Current Workaround

The Diagrams app maintains `dashSvgToEnum()` / `dashEnumToSvg()` mapping functions at the serialization boundary. These are duplicated in `MaxGraphCanvas.ts` and `DiagramService.ts`.
