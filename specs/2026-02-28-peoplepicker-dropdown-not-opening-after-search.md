# Bug Report: PeoplePicker Dropdown Does Not Open After Search Results Arrive

**Date:** 2026-02-28
**Reporter:** Platform team (via Claude agent)
**Status:** RESOLVED — UI team has fixed both issues in the CDN component
**Affects:** PeoplePicker CDN component (`static.knobby.io/components/peoplepicker/`)

---

## Summary

When using the PeoplePicker component, typing a search query correctly triggered `onSearch`
and results were rendered into `.peoplepicker-listbox-results`, but the `.peoplepicker-dropdown`
remained `display: none`. The component appeared completely non-functional.

## Root Causes (Both Fixed by UI Team)

### 1. `executeSearch()` never called `openDropdown()`

**Fix applied:** `executeSearch()` now calls `ensureDropdownVisible()` which conditionally
calls `openDropdown()` when search results exist.

### 2. CSS Containing Block Trap with FormDialog

The dropdown used `position: fixed` inside the component tree. FormDialog's entrance animation
applied a `transform` to `.formdialog-dialog`, creating a new containing block that clipped
the dropdown.

**Fixes applied:**
- PeoplePicker dropdown now **appends to `document.body`** (portal pattern), avoiding all
  containing-block traps regardless of where the component is placed
- FormDialog entrance animation is now **CSS-class-based only** with no inline transforms

## Workaround Removed

The consuming app had a `MutationObserver` + `positionAndShow()` workaround in
`strukture-ui.ts` and `strukture-main.ts`. This workaround has been fully removed
as of 2026-02-28 since the CDN fixes address both root causes.

## Additional Change: PersonChip Dependency

PeoplePicker now recommends loading PersonChip beforehand for richer person display.
Added `personchip.css` and `personchip.js` to `strukture/index.html` (loaded before
PeoplePicker, per the loading order in the ShareDialog docs).
