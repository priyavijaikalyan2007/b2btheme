# TypeBadge and GraphLegend cannot show Font Awesome or icon-pack icons

**Date**: 2026-11-07
**Component**: TypeBadge, GraphLegend (CDN components)
**Severity**: Medium (the last block on ontology types using every icon family)
**Status**: Fixed in #118 and #119, live 2026-11-08 (TypeBadge takes class strings; GraphLegend docs updated; ExplorerPicker takes them too)
**Filed by**: Apps team (knobby.io apps repo)

---

## Summary

Thank you for the GraphCanvas change. A graph node now draws
`fa-solid fa-user` and `fluent-ui-people-team-16-regular`.

The Ontology Visualizer draws each type's icon in three places:

1. the graph node (GraphCanvas);
2. the type list in the sidebar (TypeBadge);
3. the legend (GraphLegend, which draws each row with TypeBadge).

Only the first takes a class. TypeBadge still builds `bi bi-${icon}`. So a
type stored as `fa-solid fa-user` shows the right icon on the graph and no
icon in the sidebar or the legend. Until TypeBadge changes, the apps keep
ontology types on Bootstrap Icons.

## Where

| Component | Code | What it does |
|---|---|---|
| TypeBadge | `components/typebadge/typebadge.ts:228` | `class: \`bi bi-${icon} typebadge-icon ${sizeClass}\`` |
| TypeBadge | `components/typebadge/typebadge.ts:85`, `README.md` | Documents `icon` as "Bootstrap icon name (without bi bi- prefix)" |
| GraphLegend | `components/graphlegend/graphlegend.ts:335` | Passes `nodeType.icon` to TypeBadge |
| GraphLegend | `components/graphlegend/graphlegend.ts:100`, `README.md:67` | Documents `icon` as a Bootstrap icon name |

## What the apps team needs

The same rule GraphCanvas uses, so one stored value works in all three places:

- A value with a space, or one that starts with `fluent-ui-`, `fluent-emoji-`,
  `aws-`, `azure-` or `gcp-`, is a class string, used as given.
- Anything else is a Bootstrap name, as today. `"crosshair"` keeps working.

```js
createTypeBadge({ typeKey: "org.person", icon: "fa-solid fa-user" });
createTypeBadge({ typeKey: "org.team",   icon: "fluent-ui-people-team-16-regular" });
createTypeBadge({ typeKey: "work.doc",   icon: "fluent-ui-document-16-color" });
createTypeBadge({ typeKey: "goal.okr",   icon: "crosshair" });   // unchanged
```

- **Colour.** A monochrome icon follows the badge's icon colour. A colour icon
  keeps its own palette, as in GraphCanvas.
- **Size.** The `sm`, `md` and `lg` size classes size the icon for every
  family. The apps will store `16-` Fluent classes, as your GraphCanvas note
  asks.
- **GraphLegend.** It needs no code change if TypeBadge takes classes. Please
  update its `icon` docs and its fallback badge, if the fallback draws an icon.

## Why it matters

Tenant admins choose the icon for their own ontology types. The apps team
wants to offer Bootstrap Icons, Font Awesome and Fluent UI there, as every
other icon picker in the apps now does. A type whose icon shows on the graph
but not in the list beside it looks broken.
