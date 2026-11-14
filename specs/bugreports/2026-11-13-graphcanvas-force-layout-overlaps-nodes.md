# GraphCanvas: the force layout can leave two nodes on top of each other

**From:** knobby.io apps, Ontology Visualizer instance view (knobbyio/apps#249)
**Date:** 13 November 2026
**Component:** `components/graphcanvas` (as of `61a90abd`)
**Severity:** Medium. A person cannot click the node underneath, and the apps' graph tests fail some of the time.
**Status:** Open

## What happens

With `layout: "force"`, two nodes sometimes settle with their boxes overlapping. The node underneath can then no longer be clicked, because the box on top takes the click.

A real case from the apps' Playwright run on 13 November 2026, with the default 160 × 48 node size:

| Node | `transform` |
|---|---|
| Underneath | `translate(190.99, 158.99)` |
| On top | `translate(267.01, 136.01)` |

The centres are 76 px apart across and 23 px apart down. A box is 160 px wide and 48 px tall, so the two overlap by 84 × 25 px. Playwright retried the click 58 times over 30 seconds. Each time the node was stable, and each time the other node's `rect` "intercepts pointer events". So the layout had finished, with the overlap in place.

## Why

`runForceLayout` treats each node as a point:

- `initRandomPositions` seeds every node at a random spot.
- `applyRepulsion` pushes each pair apart by `FORCE_REPULSION / dist²`, measured between centres.
- `FORCE_ITERATIONS` is 150.

Nothing in it knows a node is 160 × 48. Two centres 80 px apart repel weakly, yet their boxes overlap. Because the start is random, a given graph overlaps on some loads and not others.

## Asked

After the force iterations, separate any two node boxes that overlap, using `nodeW` and `nodeH` plus a small gap. A few passes that push each overlapping pair apart along the shorter overlap axis are enough. That makes a settled layout one where every node can be clicked, whatever the random start.

A seeded start would also help tests get the same layout each run. That is a smaller request than the overlap fix.

## How the apps handle it until then

The apps' tests now choose nodes a person can actually click: a node counts only if the element at the centre of its box is that node. They no longer click whichever node the DOM lists first. People using the visualizer still meet the overlap.
