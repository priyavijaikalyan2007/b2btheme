# Touch, shell part 2 of 3: popups and menus

> Executed inline. The owner asked for no subagents.

**Goal:** Part 2 of 3 of #181. ContextMenu, AppLauncher, UserMenu, TenantSwitcher, NotificationCenter and CommandPalette follow `TOUCH_EXPERIENCE.md`, as `specs/2026-11-18-touch-ux-review.md` sections 4, 5.1 and the family's decisions say.

## Decisions

- **The owner, 18 November 2026:** ContextMenu opens as a sheet at the bottom of the screen on a compact viewport, by default. A host option keeps the menu at the pointer. Larger screens do not change.
- **This plan:**
  - The option is `sheetOnCompact?: boolean`, default `true`. `false` keeps the menu at the pointer on every screen.
  - A compact viewport is one less than 768 CSS pixels wide (`TOUCH_EXPERIENCE.md` section 2). The menu reads it when it opens.
  - The sheet has a backdrop. A tap on the backdrop closes the sheet, and the tap reaches nothing under it.
  - In the sheet, a submenu replaces the list, with a **Back** row first. `ArrowRight` opens it, and `ArrowLeft` or **Back** returns.
  - A click or a tap on a submenu row opens the submenu at once, on every screen. Hover still opens it after 200 milliseconds.
  - `attachLongPress` keeps its own timer. Moving it onto GestureRecognizer would make every page that calls it load `gesturerecognizer.js`, which breaks them.

## Work

### Task 1: ContextMenu

- The sheet, the backdrop, drill-in submenus, a submenu that opens on a click or a tap, and the `sheetOnCompact` option.
- Styles:
  - the sheet at the bottom, full width, at most 70 percent of `100dvh`;
  - `overscroll-behavior: contain`, and the safe-area inset at the bottom;
  - hover styles in `@media (hover: hover)`;
  - items of 44 px under a coarse pointer, and 48 px in the sheet;
  - `-webkit-touch-callout: none`.
- Unit tests: the sheet below 768 px and not above it, the option, the backdrop's tap, drill-in and Back, the keys in the sheet, and the click on a submenu row.

### Task 2: AppLauncher, UserMenu, TenantSwitcher and NotificationCenter

- The outside press closes the popup from `pointerdown` on the document, in place of `mousedown`. Safari on iOS sends no `mousedown` for a tap on blank space.
- Section 4 work:
  - hover styles in `@media (hover: hover)`;
  - targets of 44 px under a coarse pointer;
  - `overscroll-behavior: contain` on each inner scroll area;
  - NotificationCenter's `100vh` becomes `100dvh`.
- Unit tests: a `pointerdown` outside closes each popup, and one inside or on the trigger does not.

### Task 3: CommandPalette

- The rows highlight on `pointerenter` in place of `mouseenter`.
- The section 4 work.

### Task 4: Browser tests

`tests/touch-popups.spec.ts`, with a touch screen:

- ContextMenu at a phone width opens as a sheet at the bottom, with items of at least 44 px, and a tap on the backdrop closes it. At a desktop width it opens at the pointer.
- Each popup closes on a tap outside, measured with a real touch.
- Each component's targets are 44 px.

### Task 5: Counts and documents

- Lower the `touchHoverRules` and `touchMousedownOnly` ratchets in `scripts/audit-counts.mjs`.
- Each README gets a **Pointer and touch** section.
- CHANGELOG, one history line, the references, and the demo pages where a sheet needs showing.

### Task 6: Verify and open the PR

- `npm run build`, `npm test`, `npm run test:structure`, then `npm run test:e2e` alone.
- Push, open the PR with "Part 2 of 3 of #181", and wait for CI.
