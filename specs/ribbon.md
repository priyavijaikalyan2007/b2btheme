# Ribbon — Component Progress

## 2026-03-06: statusBar Slot
- Added `statusBar` option to `RibbonOptions` (HTMLElement | factory)
- Added `setStatusBar()` and `getStatusBarElement()` to public API
- `.ribbon-tabbar-status` wrapper inserted between tabs and collapse button
- `margin-left: auto` on status bar absorbs flex space; collapse button auto margin becomes 0
- `populateTabBar()` re-creates wrapper on rebuild; consumer element cached on instance
- Demo shows user name, entity, version badge with toggle button
- Build: zero errors
