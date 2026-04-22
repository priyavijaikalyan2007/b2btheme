# GraphCanvas edge labels stack illegibly at hub nodes

**Component:** `GraphCanvas` (CDN — `static.knobby.io/components/graphcanvas/graphcanvas.js`)
**Reported:** 2026-04-21
**Severity:** P2 — readability regression at hub types; no functional break.
**Area:** schema mode rendering, edge label placement.

## What happens

When a node has many incident edges (a "hub"), on-canvas edge labels are all rendered at roughly the same position — centered at the hub end of each edge — and stack on top of one another. The result is an illegible smudge such as `Mirrors`, `Is…`, `Sourced From`, `+5 more` overlapping the node icon and each other.

This is reproducible on any schema graph that contains a type with > ~4 incident relationship edges. In Knobby's ontology, `strukture.org_unit` is a clear offender: `mirrors`, `is_part_of`, `sourced_from`, `described_by`, `references`, `has_member`, `has_relationship`, etc. all converge on it.

![Stacked labels near the Organizational Unit hub](../../weird.png)

The screenshot shows `Mirrors`, `Is…`, `Sourced From`, and `+5 more` piled onto the left edge of the node at roughly the same pixel position, visibly overlapping the node's icon and title.

## Expected

Edge labels should remain readable regardless of hub degree. Any of these would be acceptable, in order of preference:

1. **Label collision avoidance**: when two edge labels would occupy the same space, offset them along the edge (closer to the edge midpoint) or stack them vertically with a small gap.
2. **Label clustering**: near a hub, fold overlapping labels into a single `N relationships` chip that expands on click/hover to show the constituent labels.
3. **Hover-only labels on hub edges**: suppress on-canvas rendering for edges whose endpoint degree exceeds a threshold; rely on the edge HoverCard we already wire up (`onEdgeHover`) for discovery.
4. **Label routing along the edge**: render each label at a distinct point along its edge (nearer the midpoint or the non-hub end) so no two labels share a position.

## Actual

All edge labels are placed at (or near) the endpoint anchor, with no collision detection. No runtime option appears to disable only the edge labels on dense endpoints while keeping them on sparse edges — `showEdgeLabels: false` turns them off globally, which then loses the at-a-glance relationship readability on non-hub edges (a regression we rolled back on 2026-04-21 for exactly this reason).

## Reproduction

1. Open the Ontology Visualizer in schema mode.
2. Load a tenant with the platform ontology seeded (every tenant).
3. Scroll / pan to `strukture.org_unit`.
4. Observe the label cluster at the node's left edge.

## Why this matters

On-canvas labels carry a lot of the schema-mode's "at-a-glance" value — the user understands how types relate without clicking. For hub types, which tend to be the most important to understand, the labels become actively anti-informative. We currently have no app-side mitigation that preserves at-a-glance labels on the rest of the graph while de-stacking the hub ones.

## Suggested fix (CDN)

A combination of (3) and (1) would cover the common case cheaply:

- For edges where *either endpoint* has degree ≥ 5, render only the icon or a short 2-letter code on canvas and require hover for the full label.
- For edges that still render full labels, apply a simple label-placement loop (SAT-based or greedy) so colliding labels step along the edge until they no longer overlap.

Both behaviors should be opt-out-able via `GraphCanvasOptions` (`edgeLabelDensity: 'hub-compact' | 'all' | 'none'`) so apps can restore the current behavior if their graphs are sparse enough not to need it.

## App-side workaround (current)

None viable without losing readability elsewhere. We tried `showEdgeLabels: false` with the edge HoverCard as the replacement channel, but the user explicitly preferred at-a-glance labels over hub legibility — see 2026-04-21 conversation. Reverted to `showEdgeLabels: true`.

## References

- App code: `typescript/apps/ontologyvisualizer/app/ontology-schema-view.ts` — the `createGraphCanvas` call site (search for `showEdgeLabels`).
- Related: the edge HoverCard we wire in `ontology-hover-card.ts` (node/edge hover → CDN HoverCard) is the intended fallback for detail on demand; the CDN's on-canvas labels should co-exist with it, not compete.
