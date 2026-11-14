# Ontology category colours: eight tokens, so pages stop inventing their own

**From:** knobby.io apps, Tenant Admin › Relationship Types (knobbyio/apps#249)
**Date:** 13 November 2026
**Component:** theme tokens (no component)
**Severity:** Low. The page works. It shows every category in one neutral colour until tokens exist.
**Status:** Open

The Tenant Admin page that lists relationship types shows each one's category as a badge. There are eight categories: structural, ownership, strategic, knowledge, dependency, lifecycle, identity and custom.

## What the page did

It held its own table of hex colours, one for each category, such as `#6c757d` for structural and `#6610f2` for strategic. It then built each badge from that colour at three opacities. None of these came from the theme, so they did not change with dark mode or with a tenant's brand.

## What the page does now

The page uses one theme badge for every category: `bg-secondary-subtle text-secondary-emphasis border`. It adds no colour of its own. So every category now looks the same, and the colour no longer helps a person tell them apart.

## Asked

Eight category tokens, each with a background, a foreground and a border that work in light and dark mode. For example:

```
--theme-ontology-category-structural-bg / -fg / -border
--theme-ontology-category-ownership-bg / -fg / -border
… one set each for strategic, knowledge, dependency, lifecycle, identity and custom
```

Use whatever names fit the theme's own naming. The apps will use them as given.

## Where else this applies

The Ontology Visualizer and the Strukture relationship cards also show categories. The apps will move them to the same tokens once they exist.
