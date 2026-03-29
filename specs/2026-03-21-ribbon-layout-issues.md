# Bug Report: CDN Ribbon Layout Issues

> **Date:** 2026-03-21
> **Severity:** Medium (UI/UX — functional but visually incorrect)
> **Component:** CDN Ribbon (`static.knobby.io/components/ribbon/`)
> **Affected Tabs:** Edge, Shadow, Frames (and potentially any tab with custom/CDN picker controls)

---

## Summary

Multiple ribbon layout issues caused by the CDN Ribbon component not correctly sizing `type: 'custom'` controls. The `size` property (`'large'` / `'small'` / `'mini'`) is ignored or inconsistently applied on custom controls, causing CDN picker containers to render at default (large) size regardless of configuration.

---

## Issue 1: `size` property on `type: 'custom'` controls is ignored

### Description
When a `RibbonControl` of `type: 'custom'` specifies `size: 'small'` or `size: 'mini'`, the ribbon renders the control at its default size instead. This causes CDN pickers (ColorPicker, LineWidthPicker, LineTypePicker) to render too large, breaking the intended column layout.

### Reproduction
```typescript
// This control renders at default size, NOT small:
{
    type: 'custom',
    id: 'border-color',
    label: 'Color',
    size: 'mini',  // ← IGNORED by the ribbon
    element: () => { ... },
}
```

### Affected Controls
- Border group: Color, Width, Type pickers (Edge tab)
- Edge group: Color, Routing, Width, Style, Start Arrow, End Arrow pickers (Edge tab)
- Frame group: Edge color, Background color, Width pickers (Frames tab)

### Workaround Attempted
- Spread operator override: `{ ...buildCdnPickerControl('id', 'Label'), size: 'small' }` — **does not work** because the helper casts to `RibbonControl` internally, stripping the structural type before the spread can add `size`.
- Inline definition with explicit `size: 'small'`: **still ignored by the CDN ribbon**.
- Created `smallPicker()` factory function that inlines `size: 'small'` in the object literal — ribbon still doesn't respect it.

### Expected Behavior
Custom controls should respect the `size` property just like button and dropdown controls do. `size: 'small'` should cause the control to render in the ribbon's 3-per-column vertical stack layout. `size: 'mini'` should render even more compact.

---

## Issue 2: Object spread on `buildCdnPickerControl()` / `buildColorCustomControl()` result doesn't override properties

### Description
The helper functions `buildCdnPickerControl()` and `buildColorCustomControl()` return objects cast `as RibbonControl`. When spreading and overriding properties:

```typescript
{ ...buildCdnPickerControl('line-width', 'Width'), size: 'small' } as RibbonControl
```

The `size` property IS present on the resulting object (verified in debugger), but the CDN ribbon component does not apply it. This is either because:
1. The ribbon reads properties before the spread occurs (unlikely with object literals)
2. The ribbon ignores `size` on `type: 'custom'` controls entirely (see Issue 1)

### Impact
Cannot change sizing of reusable picker controls without rewriting them inline, and even inline definitions don't work (see Issue 1).

---

## Issue 3: `disabled: true` in config overrides runtime `setControlDisabled(false)` (ADR-029, existing)

### Description
Documented in ADR-029. Controls configured with `disabled: true` in the initial ribbon config cannot be re-enabled via `setControlDisabled(id, false)` at runtime. The config-level disabled state takes permanent precedence.

### Workaround
Omit `disabled: true` from config entirely. Manage disabled state via runtime calls only. Call `setControlDisabled` from tab activation handlers (since lazily-rendered tabs create controls fresh).

### Status
Enhancement request filed at `docs/plans/2026-03-10-ribbon-enhancements-needed.md`. CDN team implemented a `pendingState` queue but config-level `disabled: true` still overrides queued state.

---

## Issue 4: `setControlDisabled()` silently fails for controls on lazily-rendered tabs

### Description
Ribbon tabs are rendered lazily (DOM created on first tab activation). Calling `setControlDisabled(id, disabled)` for a control on a tab that hasn't been rendered yet silently does nothing. When the tab is later activated, the control appears in its default (enabled) state.

### Workaround
Call `setControlDisabled` from each tab's `onXxxTabActivated` handler to re-apply state after lazy DOM creation. OR use contextual tabs (`showContextualTab`/`hideContextualTab`) to hide entire tabs when irrelevant — this is the approach now used in the Diagrams app.

---

## Issue 5: `type: 'gallery'` control type has no documented API

### Description
The `RibbonControl` type union includes `'gallery'` as a valid type, but the `RibbonControl` interface has no gallery-specific properties (no `items`, `galleryItems`, `thumbnails`, etc.). There's no way to use the gallery control type without guessing the API.

### Impact
Cannot implement a proper gallery control for frame size selection or margin preset visualization. Forced to use `split-button` with `menuItems` or `type: 'custom'` with manual DOM.

### Request
Document the gallery control API: what properties configure it, how items are specified, how selection callbacks work.

---

## Issue 6: Controls inside groups with empty labels still show label space

### Description
When a `RibbonGroup` has `label: ''` (empty string), the ribbon still allocates vertical space for the label area below the controls, causing inconsistent heights across groups.

### Request
Groups with empty or undefined labels should collapse the label area.

---

## Recommendations for CDN Team

1. **High priority**: Fix `size` property on `type: 'custom'` controls (Issue 1). This blocks correct layout for all CDN picker integrations.
2. **Medium priority**: Document `type: 'gallery'` API (Issue 5). Multiple features need gallery controls.
3. **Low priority**: Allow `setControlDisabled` to queue state for unrendered tabs (Issue 4 enhancement).
4. **Low priority**: Collapse empty group labels (Issue 6).

---

## Current Workarounds in Diagrams App

| Issue | Workaround | Location |
|-------|-----------|----------|
| Custom control sizing | Inline `size: 'small'` (partially works) | `diagrams-toolbar.ts` |
| Config disabled override | Omit `disabled` from config | ADR-029 pattern |
| Lazy tab state | Contextual tabs (show/hide entire tabs) | `updateContextualTabs()` |
| Gallery control | Split-button with menuItems | Frame insert, margin presets |
| Per-control enable/disable | Contextual tab visibility instead | `diagrams-app-canvas.ts` |
