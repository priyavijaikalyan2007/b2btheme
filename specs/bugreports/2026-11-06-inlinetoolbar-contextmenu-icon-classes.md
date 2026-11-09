# InlineToolbar, ContextMenu and GraphCanvas cannot show icon-pack icons

**Date**: 2026-11-06
**Component**: InlineToolbar, ContextMenu, GraphCanvas (CDN components)
**Severity**: Medium (blocks adoption of the icon packs outside the Ribbon)
**Status**: Fixed and live. InlineToolbar and ContextMenu in #115: `icon` takes a class string or a bare name, as proposed. GraphCanvas in #117: a node's `icon` takes a class string (Font Awesome, icon packs)
**Filed by**: Apps team (knobby.io apps repo)

---

## Summary

InlineToolbar and ContextMenu build the icon class themselves, as
`bi bi-${item.icon}`. So they can only show Bootstrap Icons. A pack class such
as `fluent-ui-folder-add-16-regular` becomes `bi bi-fluent-ui-folder-add-16-regular`,
which matches no rule, and the button shows no icon.

The apps team is moving its ribbons to the Fluent UI pack (see
`docs/ICON_PACKS.md`). The same commands also appear in inline toolbars and
right-click menus. Without this change, a command such as Refresh or New
Folder shows a Fluent icon in the ribbon and a Bootstrap icon beside it in the
sidebar.

## Where

| Component | Code | What it does |
|---|---|---|
| InlineToolbar | `components/inlinetoolbar/inlinetoolbar.ts:172` | `createElement("i", \`bi bi-${item.icon}\`)` |
| InlineToolbar | `components/inlinetoolbar/inlinetoolbar.ts:72` | Documents `icon` as "Bootstrap icon name without the bi- prefix" |
| ContextMenu | `components/contextmenu/contextmenu.ts:453` | `createElement("i", \`bi bi-${item.icon}\`)` |
| ContextMenu | `components/contextmenu/contextmenu.ts:91` | Documents `icon` as "Bootstrap icon name (without bi- prefix)" |

`docs/ICON_PACKS.md`, section "In components: Ribbon, SymbolPicker, Toolbar",
says any component whose `icon` takes CSS classes shows pack icons. These two
take a name, not a class, so the doc does not cover them. Nothing says so.

## What the apps team needs

`icon` should accept a full class string, as the Ribbon does, while bare names
keep working:

- If `icon` contains whitespace, or starts with `bi-` or a pack prefix
  (`fluent-ui-`, `fluent-emoji-`, `aws-`, `azure-`, `gcp-`), add its classes as
  given. The Ribbon already has a helper for this: `addIconClasses` at
  `components/ribbon/ribbon.ts:577`.
- Otherwise, prefix `bi bi-` as today. Every current caller passes a bare name,
  so none of them changes.

A separate `iconClass` field would also work, if you prefer no guessing. Then
please make it the documented way in both components, and say which field wins
when both are set.

Either way:

- A disabled InlineToolbar button should grey its icon, as the Ribbon does.
- ContextMenu's checked state (`bi bi-check-lg`) is unaffected.
- Please update the two interface comments and the "In components" section of
  `docs/ICON_PACKS.md` to list InlineToolbar and ContextMenu.

## GraphCanvas: needed too

The apps let an admin choose the icon for an ontology type, and the Ontology
Visualizer draws that icon on its GraphCanvas. The apps team wants the choice
to include Font Awesome and the Fluent UI pack. That is blocked today:

- `components/graphcanvas/graphcanvas.ts:618` (`lookupCssIconContent`) builds
  `bi bi-${biName}` and reads that element's `::before` glyph. A Font Awesome
  icon has a glyph, but not under a `bi` class. A Fluent UI icon is a CSS mask
  and has no glyph at all.
- So GraphCanvas needs to draw an icon from a full class: a font glyph for
  Bootstrap Icons and Font Awesome, and the mask image for a pack icon.

Until this ships, the apps offer only Bootstrap Icons for ontology types.

## Same pattern elsewhere, for your judgement

The apps team does not need these now. They follow the same pattern, so the
doc's claim does not hold for them either:

- `components/typebadge/typebadge.ts:228` builds `bi bi-${icon}`.
- The docked Toolbar adds `"bi"` and the icon as two separate classes
  (`components/toolbar/toolbar.ts:2741` and others). A single pack class works.
  A class string with a space, such as `"bi bi-plus"`, throws in
  `classList.add`. The Ribbon accepts that form, so the two components disagree
  on what `icon` means.

## How to verify

1. Load `fluent-ui-16-regular.css` on the InlineToolbar and ContextMenu demo
   pages.
2. Add an item with `icon: "fluent-ui-folder-add-16-regular"` to each.
3. The icon draws, follows the text colour in light and dark themes, and greys
   when disabled.
4. An item with `icon: "folder-plus"` still draws the Bootstrap icon.

## Who uses this in the apps

- Explorer sidebar: InlineToolbar (New folder, Expand all, Collapse all, Sort,
  Refresh) and two ContextMenus (the item menu and the Sort menu).
- Thinker sidebar: InlineToolbar (Expand all, Collapse all, Sort).

These move to Fluent once this ships. The ribbons move now.
