# Ribbon Component Enhancements Needed

> Items identified during Diagrams magnifier feature integration (2026-03-10).
> These require changes to the CDN Ribbon component at `static.knobby.io/components/ribbon/`.
>
> **Design principle**: CDN components should work correctly out-of-the-box for
> multi-app consumption. Consumers should not need workarounds for basic state
> management. The whole point of modularizing components is to enable the UI team
> to produce reusable components that work directly — zero workarounds.

---

## 1. Deferred State: `setControlDisabled` / `setControlActive` Must Queue for Unrendered Tabs

**Priority:** Critical
**Affects:** Any app using Ribbon with multi-tab layout + dynamic enable/disable

### Problem

The Ribbon component lazily renders tab panel DOM — a tab's controls are only
created when that tab is activated for the first time. Calls to
`setControlDisabled(controlId, value)` and `setControlActive(controlId, value)`
**silently do nothing** when the target control's tab has not been rendered yet.

This means any state change triggered while a different tab is active is lost.

### Real-World Scenario

In the Diagrams app, the View tab has a "Magnify" toggle button that should be
disabled when no diagram is open and enabled when a diagram is loaded. The Home
tab is active by default. When the user opens a diagram:

1. `updateDiagramUI()` calls `ribbon.setControlDisabled('tool-magnify', false)`
2. The View tab has never been activated — its DOM doesn't exist
3. The call silently does nothing
4. User switches to View tab → Magnify button is still disabled

The same issue affects `setControlActive` — if the magnifier is turned off
programmatically (e.g. when closing a diagram), the active state change is lost
if the View tab isn't currently visible.

### Current Workaround (Consuming App)

The Diagrams app maintains a parallel `magnifierControlsEnabled` boolean in
module state. It re-applies the state via `applyMagnifierControlsState()` both
when `setMagnifierControlsEnabled()` is called AND in the `onTabChange` callback
when the View tab is activated. This is ~30 lines of workaround code that every
app would need to duplicate.

### Proposed Fix

The Ribbon should internally queue `setControlDisabled` and `setControlActive`
calls for controls that don't exist in the DOM yet. When a tab is lazily
rendered, it should replay any queued state onto the newly created controls.

```typescript
// Internal to Ribbon — pseudocode
class Ribbon {
    private pendingState = new Map<string, { disabled?: boolean; active?: boolean }>();

    setControlDisabled(controlId: string, disabled: boolean): void {
        const el = this.findControl(controlId);
        if (el) {
            // Control exists in DOM — apply immediately
            this.applyDisabled(el, disabled);
        } else {
            // Tab not rendered yet — queue for deferred application
            const pending = this.pendingState.get(controlId) ?? {};
            pending.disabled = disabled;
            this.pendingState.set(controlId, pending);
        }
    }

    setControlActive(controlId: string, active: boolean): void {
        const el = this.findControl(controlId);
        if (el) {
            this.applyActive(el, active);
        } else {
            const pending = this.pendingState.get(controlId) ?? {};
            pending.active = active;
            this.pendingState.set(controlId, pending);
        }
    }

    // Called internally after lazy tab render
    private onTabRendered(tabId: string): void {
        for (const [controlId, state] of this.pendingState) {
            const el = this.findControl(controlId);
            if (el) {
                if (state.disabled !== undefined) this.applyDisabled(el, state.disabled);
                if (state.active !== undefined) this.applyActive(el, state.active);
                this.pendingState.delete(controlId);
            }
        }
    }
}
```

### Acceptance Criteria

- `setControlDisabled('x', true)` called before tab render → control is disabled when tab first opens
- `setControlActive('x', true)` called before tab render → control shows active state when tab first opens
- Multiple calls before render → last value wins (no stale intermediate states)
- Once a tab is rendered, `setControlDisabled` / `setControlActive` apply immediately (no behavioral change for current apps)

---

## 2. `toggle: true` Button: Visual State Desyncs from Logical State

**Priority:** High
**Affects:** Any app using toggle buttons in Ribbon

### Problem

A Ribbon button configured with `toggle: true` auto-manages its visual
pressed/unpressed state on click. However, the visual state can desync from the
logical state in certain scenarios:

1. **After programmatic `setControlActive(id, false)`**: If the button was
   toggled on via click, then turned off programmatically (e.g. when closing a
   diagram), the next click may show the wrong visual state because the Ribbon's
   internal toggle boolean is out of sync with what was set via API.

2. **Combined with `disabled: true` initial state**: When a toggle button starts
   disabled and is later enabled, the first click may not correctly initialize
   the toggle cycle.

### Current Workaround

The Diagrams app removes `toggle: true` entirely and manages the toggle manually:

```typescript
{
    type: 'button',
    id: 'tool-magnify',
    // No toggle: true — manual management instead
    onClick: () => {
        magnifyActive = !magnifyActive;
        ribbon?.setControlActive('tool-magnify', magnifyActive);
        handlers.onMagnifyToggle?.(magnifyActive);
    },
}
```

This defeats the purpose of `toggle: true`.

### Proposed Fix

When `setControlActive(controlId, value)` is called on a `toggle: true` button,
the Ribbon should update its internal toggle state to match. The next click
should always produce the opposite of the last-known state, whether that state
was set by click or by API.

### Acceptance Criteria

- Click toggles: on → off → on → off (works today)
- `setControlActive(id, false)` while toggled on → next click produces `active: true`
- `setControlActive(id, true)` while toggled off → next click produces `active: false`
- Starting with `disabled: true`, then enabling via `setControlDisabled(id, false)` → first click produces `active: true`

---

## 3. `disabled: true` in Config Should Render Disabled Controls Regardless of Tab Visibility

**Priority:** Medium
**Affects:** Any app setting initial disabled state in config

### Problem

When a control is configured with `disabled: true` in the Ribbon config object
(at initialization time), the disabled state is correctly applied — but only if
that tab is visible on first render. For lazily-rendered tabs, the `disabled`
config property may not be applied when the tab DOM is first created.

### Expected Behavior

The `disabled: true` property in the control config should be respected when the
tab is lazily rendered, producing a disabled control on first view. This is
conceptually different from Enhancement #1 (which is about runtime API calls) —
this is about the declarative config.

### Acceptance Criteria

- Control with `disabled: true` in config → renders disabled when tab is first activated (even if that's minutes after Ribbon init)

---

## 4. `getControlState(controlId)` — Query Current Control State

**Priority:** Low
**Affects:** Apps that need to read control state for conditional logic

### Problem

There is no API to query whether a control is currently disabled or active.
Consuming apps must track this state themselves (parallel boolean variables).
This is error-prone and leads to state duplication.

### Proposed API

```typescript
interface Ribbon {
    getControlState(controlId: string): {
        disabled: boolean;
        active: boolean;
        visible: boolean;
    } | null;  // null if control ID not found
}
```

This should return the effective state — including any queued state from
Enhancement #1 if the tab hasn't been rendered yet.

### Acceptance Criteria

- Returns current disabled/active/visible state for rendered controls
- Returns queued state for unrendered tab controls (after Enhancement #1)
- Returns `null` for unknown control IDs

---

## Impact on Consuming Apps

Once Enhancements #1 and #2 are implemented, the Diagrams app can:

1. Remove `magnifierControlsEnabled` module variable and `applyMagnifierControlsState()` function
2. Remove `magnifyActive` module variable and manual toggle logic
3. Restore `toggle: true` on the Magnify button
4. Simplify `onViewTabActivated` to only handle slider initialization (not state replay)

Estimated removal: ~30 lines of workaround code.

Any future app using Ribbon with multi-tab layouts will avoid this class of bugs
entirely, rather than independently discovering and working around them.
