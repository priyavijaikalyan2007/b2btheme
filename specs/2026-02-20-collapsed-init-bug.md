# Bug Report: Components Don't Render Correctly When Starting Collapsed

**Date:** 2026-02-20
**Reporter:** Platform team (via Claude agent)
**Severity:** High — forces workaround of starting expanded then manually collapsing
**Affects:** TabbedPanel, Sidebar (both CDN components from `theme.priyavijai-kalyan2007.workers.dev`)
**Workaround:** Set `collapsed: false` at init; users must manually collapse

---

## Bug 1: TabbedPanel — Shows "Panel" Title and Blank Content When `collapsed: true`

### Expected Behaviour
When creating a TabbedPanel with `collapsed: true`, the panel should start in its
collapsed state showing the collapsed strip with the correct title (from the active
tab or `options.title`). Clicking to expand should reveal properly rendered tabs
with their content.

### Actual Behaviour
The panel shows a collapsed strip with the hardcoded default title **"Panel"** instead
of the active tab's title. The tab bar, tab titles, and content area do not display
correctly. In some cases, the panel appears fully blank with just the "Panel" text.

### Root Cause Hypothesis
In the constructor, `buildDOM()` (which calls `buildCollapsedStrip()`) executes
**before** `addInitialTabs()`:

```javascript
// Constructor order:
this.buildDOM();                          // 1. Builds collapsed strip — calls resolveTitle()
this.addInitialTabs(this.options.tabs);   // 2. Adds tabs and sets activeTabId
if (this.options.collapsed) {
    this.applyCollapsedState();           // 3. Shows collapsed strip, hides tab bar
}
```

`resolveTitle()` falls through to the hardcoded default because no tabs or
activeTabId exist yet when the strip is first built:

```javascript
resolveTitle() {
    if (this.options.title) return this.options.title;               // No title set
    const activeTab = this.tabs.find(t => t.id === this.activeTabId); // No tabs yet
    return activeTab?.title || "Panel";                               // Falls through to "Panel"
}
```

The collapsed strip title is never re-evaluated after tabs are added.

### Reproduction Steps
```javascript
const panel = createDockedTabbedPanel({
    dockPosition: 'bottom',
    height: 200,
    collapsible: true,
    collapsed: true,            // <-- This triggers the bug
    resizable: true,
    tabs: [
        { id: 'console', title: 'Console', icon: 'bi-terminal' },
        { id: 'log', title: 'Log', icon: 'bi-bug' },
    ],
});
// Result: Shows "Panel" in collapsed strip, not "Console" or "Log"
```

### Suggested Fix
After `addInitialTabs()`, update the collapsed strip title:

```javascript
this.buildDOM();
if (this.options.tabs && this.options.tabs.length > 0) {
    this.addInitialTabs(this.options.tabs);
}
// Update collapsed strip title now that tabs exist
if (this.collapsedStripTitleEl) {
    this.collapsedStripTitleEl.textContent = this.resolveTitle();
}
if (this.options.collapsed) {
    this.applyCollapsedState();
}
```

### Affected Apps
All 4 apps (Thinker, Diagrams, Checklists, Strukture) use TabbedPanel for bottom
panels. Currently all set `collapsed: false` as a workaround.

---

## Bug 2: Sidebar — `collapsed: true` Not Respected When Used Inside DockLayout

### Expected Behaviour
When creating a Sidebar with `collapsed: true` and passing it to DockLayout, the
sidebar should start in its collapsed state (narrow icon strip, content hidden).

### Actual Behaviour
The Strukture app's right sidebar (Details panel) starts **fully expanded** despite
being initialized with `collapsed: true`. The sidebar content is visible and takes
up its full configured width.

### Root Cause Hypothesis
The Sidebar component's `applyCollapsedState()` sets `contentEl.style.display = "none"`
and shows the collapsed strip. However, when DockLayout receives the sidebar and mounts
it into its grid layout, it may:

1. Re-measure the sidebar dimensions without checking collapsed state
2. Apply its own width/display styles that override the sidebar's collapsed styles
3. Call `show()` which may reset the collapsed state

The collapsed state is applied during Sidebar construction, but DockLayout mounting
happens after, potentially overwriting the inline styles.

### Reproduction Steps
```javascript
const sidebar = createDockedSidebar({
    title: 'Details',
    icon: 'bi-info-circle',
    dockPosition: 'right',
    width: 300,
    collapsible: true,
    collapsed: true,            // <-- Not respected when mounted in DockLayout
});

const layout = createDockLayout({
    rightSidebar: sidebar,      // Sidebar appears expanded despite collapsed: true
    content: document.getElementById('main-content'),
});
```

### Suggested Fix
Options to investigate:

**Option A:** DockLayout should check `sidebar.isCollapsed()` during mount and apply
collapsed layout dimensions accordingly.

**Option B:** DockLayout should call `sidebar.collapse()` after mounting if the
sidebar reports `isCollapsed() === true`, re-applying the collapsed state after
mount styles are set.

**Option C:** Sidebar's `show()` method (if called by DockLayout) should preserve
collapsed state rather than resetting to expanded.

### Affected Apps
Strukture app — right sidebar (Details panel) should start collapsed in graph mode.
Currently starts expanded as a workaround.

---

## General Note

Both bugs share a common theme: **collapsed state set at construction time is lost
or incorrectly rendered when the component is subsequently mounted into the DOM or
into a DockLayout container.** The fix should ensure that collapsed state survives
the full lifecycle: construction -> DOM mounting -> DockLayout integration -> display.

## Priority

These bugs block the platform team from shipping the intended UX where bottom panels
and sidebars start collapsed to maximise canvas/content area. The current workaround
(`collapsed: false`) means users see panels expanded on load and must manually
collapse them.
