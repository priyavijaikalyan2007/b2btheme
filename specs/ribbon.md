# Ribbon — Component Progress

## 2026-03-06: statusBar Slot
- Added `statusBar` option to `RibbonOptions` (HTMLElement | factory)
- Added `setStatusBar()` and `getStatusBarElement()` to public API
- `.ribbon-tabbar-status` wrapper inserted between tabs and collapse button
- `margin-left: auto` on status bar absorbs flex space; collapse button auto margin becomes 0
- `populateTabBar()` re-creates wrapper on rebuild; consumer element cached on instance
- Demo shows user name, entity, version badge with toggle button
- Build: zero errors

## 2026-03-10: Deferred State, Toggle Sync, getControlState API
- Added `pendingState` Map to queue state changes for controls on lazily-rendered tabs
- `setControlDisabled`, `setControlHidden`, `setControlActive`, `setControlValue` now queue when control element absent
- `getControlValue` returns queued value for unrendered controls
- `applyPendingState()` replays queued state after first tab render in `swapTabContent()`
- `findControlConfig()` helper looks up control config by ID (Map first, then walks tabs)
- `setControlActive` syncs config `active` field so toggle buttons stay consistent after programmatic state changes
- Added `getControlState(id)` API returning `{ disabled, active, visible }` or `null`
- Updated `Ribbon` interface with `getControlState` method
- README: added getControlState to methods table, added "Deferred State" section
- ADR-065 in decisions.yaml
- Build: zero errors
