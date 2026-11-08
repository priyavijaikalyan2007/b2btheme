# SymbolPicker offers Font Awesome brand icons that draw blank and are stored wrong

**Date**: 2026-11-08
**Component**: SymbolPicker
**Severity**: Low (a blank cell, and a picked brand icon that shows nothing)
**Status**: Fixed: brands are drawn as brands (the first option). A brand item is filed under "Brands (FA)", drawn with `fa-brands`, and its `code` is `"fa-brands fa-<name>"`; a custom `char` may be a full Font Awesome class
**Filed by**: Apps team (knobby.io apps repo)

---

## Summary

When a page loads Font Awesome's `all.min.css`, SymbolPicker's discovery lists
every `.fa-<name>::before` rule. That includes the 518 brand icons, such as
`fa-github`. SymbolPicker draws each Font Awesome item with one style class,
from `detectAvailableFaStyle()`, which finds `fa-solid` first. A brand icon in
the solid font has no glyph, so its cell is blank. Its code is the bare
`fa-github`, and a consumer that stores `fa-solid fa-github` draws nothing.

This comes from reading `symbolpicker.ts`, not from a test. The apps have not
seen a report from a person yet.

## Where

| Code | What it does |
|---|---|
| `symbolpicker.ts:1203` | `selector.match(/\.(fa-[\w-]+)::before/)` admits brand rules with the rest |
| `symbolpicker.ts:1313` | `detectAvailableFaStyle()` picks one style for every item, `fa-solid` first |
| `symbolpicker.ts:1357` | `createElement("i", [getFaStyle(), item.char])` draws every Font Awesome item in that style |

A consumer cannot work around it by passing `char: "fa-brands fa-github"` in a
custom category. `classList.add` refuses a token with a space, so the cell
throws.

## How to tell a brand rule

In `all.min.css` 6.5.1, the 1,950 solid and regular icon rules come first. Then
comes the `@font-face` for "Font Awesome 6 Brands", then the 518 brand rules,
then the Free faces. So a rule after the Brands `@font-face` and before the
next one is a brand icon. The apps' ontology picker uses this test today, in
`typescript/shared/icons/icon-categories.ts`, and leaves brands out.

## What the apps team needs

Either is fine:

- **Draw brands as brands.** Give a brand item the `fa-brands` style, and make
  its `code` the full class, `"fa-brands fa-github"`. Allow a full class in
  `char`, as icon-pack classes are already allowed.
- **Or leave brands out of discovery,** and say so in the README.

The first is more useful, because the apps' API already stores
`fa-brands fa-<name>`.
