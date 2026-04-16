# Feature Request: GraphCanvas Edge Routing for Multi-Edge Node Pairs

**Date**: 2026-04-16
**Component**: CDN GraphCanvas
**Severity**: UX improvement
**Reporter**: Ontology Visualizer team

## Problem

When multiple relationship edges exist between the same pair of nodes (e.g., `strukture.org_unit` has both `parent_of` and `member_of` edges), the edge paths overlap exactly and the edge labels are placed on top of each other, making them unreadable.

This is especially noticeable in the Ontology Visualizer's schema mode where relationship definitions frequently create multiple edges between the same type pairs.

## Expected Behavior

When multiple edges connect the same node pair:
1. **Offset edge paths** — Each edge should follow a slightly different curve/arc so they're visually distinguishable
2. **Stagger labels** — Edge labels should be positioned at different points along their respective paths to avoid overlapping text
3. **Direction indicators** — For directed edges in the same direction, the arrowheads should remain visible on each offset path

## Current Behavior

All edges between the same node pair follow the exact same straight-line path. Labels are centered at the midpoint and stack on top of each other, making them illegible.

## References

- Similar to how draw.io handles parallel edges (curved offsets)
- d3-force-graph uses link curvature for multi-edge pairs
- Cytoscape.js `curve-style: 'bezier'` with `control-point-step-size` for multi-edges

## Impact

The Ontology Visualizer schema graph becomes hard to read when relationship-rich types (like `strukture.org_unit`) have 5+ edges to other types. Users cannot distinguish which edge represents which relationship.
