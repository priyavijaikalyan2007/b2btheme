# CDN Line Pickers — maxGraph Alignment Enhancement Request

**Date**: 2026-03-11
**Priority**: High
**Affects**: `createLineShapePicker`, `createLineEndingPicker`, `createLineTypePicker`
**Context**: Diagrams app uses maxGraph 0.22.0 (loaded from CDN) for canvas rendering. The CDN line picker components offer options that don't map cleanly to maxGraph's native capabilities, requiring fragile translation layers and producing inconsistent behavior.

---

## 1. LineShapePicker — Routing Styles

### Current CDN Options (assumed from usage)
| CDN Value | Label |
|-----------|-------|
| `orthogonal` | Orthogonal |
| `straight` | Straight |
| `curved` | Curved |
| `bezier` | Bezier |
| `spline` | Spline |

### maxGraph 0.22.0 EdgeStyleRegistry (actual registered styles)
| Style Function | Behavior | User Waypoints? |
|---------------|----------|-----------------|
| `orthogonalEdgeStyle` | Right-angle routing with rounded corners | No (algorithmic) |
| `segmentEdgeStyle` | User-defined waypoints, straight segments between points | **Yes** |
| `elbowEdgeStyle` | Single-elbow orthogonal connector | No (algorithmic) |
| `entityRelationEdgeStyle` | ER-diagram connector (midpoint turn) | No (algorithmic) |
| `manhattanEdgeStyle` | Shortest orthogonal path, avoids obstacles | No (algorithmic) |
| `sideToSideEdgeStyle` | Horizontal connection, side-to-side | No (algorithmic) |
| `topToBottomEdgeStyle` | Vertical connection, top-to-bottom | No (algorithmic) |
| `loopEdgeStyle` | Self-referencing loop | No (algorithmic) |
| _(no edgeStyle)_ | Direct straight line, no routing | N/A (straight line) |

### Problems

1. **"Straight"** — maxGraph has no `edgeStyle=none` or `edgeStyle=straight`. A true straight line requires **omitting** the `edgeStyle` key entirely. We currently output an empty routing prefix which works, but the CDN picker's "straight" concept doesn't directly map to any named maxGraph style.

2. **"Curved" vs "Bezier"** — Both currently map to `segmentEdgeStyle;curved=1;` because it's the only style supporting user-draggable waypoints with smooth curves. Having two options that produce identical behavior is confusing.

3. **"Spline"** — No true spline rendering exists in maxGraph 0.22.0. We map it to `orthogonalEdgeStyle;rounded=1;curved=1;` (orthogonal with rounded corners), which is NOT a spline. This is misleading.

4. **Missing useful styles** — maxGraph offers `manhattanEdgeStyle` (obstacle-avoiding orthogonal), `entityRelationEdgeStyle` (ER connectors), `sideToSideEdgeStyle`, and `topToBottomEdgeStyle` which are not exposed.

### Recommended CDN Options

Replace the current 5 options with options that map 1:1 to maxGraph capabilities:

| CDN Value | Label | maxGraph Style | Description |
|-----------|-------|---------------|-------------|
| `straight` | Straight | _(no edgeStyle)_ | Direct line, no routing |
| `orthogonal` | Orthogonal | `orthogonalEdgeStyle;rounded=1;` | Right-angle routing with rounded corners |
| `segment` | Segment (Bezier) | `segmentEdgeStyle;curved=1;` | User-draggable waypoints with smooth curves |
| `manhattan` | Manhattan | `manhattanEdgeStyle;` | Shortest orthogonal path |
| `elbow` | Elbow | `elbowEdgeStyle;` | Single-elbow orthogonal connector |
| `entity` | Entity Relation | `entityRelationEdgeStyle;` | ER-diagram style connector |

**Key change**: Remove "curved" and "spline" (which don't exist in maxGraph), replace with actual maxGraph styles. The "Segment (Bezier)" option is the one that supports user waypoint editing.

---

## 2. LineEndingPicker — Arrow Types

### Current CDN Options
| CDN Value | Maps To maxGraph |
|-----------|-----------------|
| `none` | `none` (fill=0) |
| `arrow` | `block` (fill=1) |
| `arrow-narrow` | `block` (fill=1) — **same as arrow, no narrow support** |
| `arrow-wide` | `block` (fill=1) — **same as arrow, no wide support** |
| `arrow-open` | `open` (fill=0) |
| `diamond` | `diamond` (fill=1) |
| `diamond-open` | `diamond` (fill=0) |
| `circle` | `oval` (fill=1) |
| `circle-open` | `oval` (fill=0) |

### maxGraph Native Arrow Types (from constants)
| Arrow Name | Description |
|-----------|-------------|
| `none` | No arrow |
| `block` | Filled triangular block |
| `classic` | Classic pointed arrow (like ▶ but thinner) |
| `classicThin` | Thinner classic arrow |
| `open` | Open (unfilled) arrow |
| `openThin` | Thinner open arrow |
| `diamond` | Diamond shape |
| `diamondThin` | Thinner diamond |
| `oval` | Circle/oval |
| `dash` | Short perpendicular dash (—) |
| `cross` | X mark |
| `circlePlus` | Circle with plus sign (⊕) |
| `ERone` | ER: "one" notation (|) |
| `ERmandOne` | ER: "mandatory one" (||) |
| `ERmany` | ER: "many" notation (crow's foot) |
| `ERoneToMany` | ER: "one to many" |
| `ERzeroToOne` | ER: "zero to one" (o|) |
| `ERzeroToMany` | ER: "zero to many" (o<) |

### Problems

1. **`arrow-narrow` and `arrow-wide`** both map to `block` — maxGraph doesn't have width variants of block arrows. These three CDN options (`arrow`, `arrow-narrow`, `arrow-wide`) all produce identical results.

2. **Missing useful arrows** — `classic` (the most common arrow), `classicThin`, `dash`, `cross`, `circlePlus`, and all ER notation arrows are not exposed.

3. **No ER notation support** — Diagrams commonly need crow's foot notation for ER diagrams. maxGraph supports 6 ER arrow types natively but none are available in the picker.

### Recommended CDN Options

**Standard arrows** (always shown):
| CDN Value | maxGraph Arrow | Fill | Description |
|-----------|---------------|------|-------------|
| `none` | `none` | 0 | No arrow |
| `block` | `block` | 1 | Filled triangular block |
| `block-open` | `block` | 0 | Open triangular block |
| `classic` | `classic` | 1 | Classic filled arrow |
| `classic-open` | `classic` | 0 | Classic open arrow |
| `open` | `open` | 0 | Open (thin) arrow |
| `diamond` | `diamond` | 1 | Filled diamond |
| `diamond-open` | `diamond` | 0 | Open diamond |
| `oval` | `oval` | 1 | Filled circle |
| `oval-open` | `oval` | 0 | Open circle |
| `dash` | `dash` | 0 | Perpendicular dash |
| `cross` | `cross` | 0 | X mark |

**ER notation arrows** (shown when diagram type is "er" or via a toggle):
| CDN Value | maxGraph Arrow | Description |
|-----------|---------------|-------------|
| `er-one` | `ERone` | One (single line) |
| `er-mandatory-one` | `ERmandOne` | Mandatory one (double line) |
| `er-many` | `ERmany` | Many (crow's foot) |
| `er-one-to-many` | `ERoneToMany` | One to many |
| `er-zero-to-one` | `ERzeroToOne` | Zero to one |
| `er-zero-to-many` | `ERzeroToMany` | Zero to many |

**Key change**: Remove `arrow-narrow`/`arrow-wide` (no maxGraph support), add `classic`, `dash`, `cross`, and ER notation. CDN values should map 1:1 to maxGraph constants, eliminating the translation layer.

---

## 3. LineTypePicker — Dash Patterns

### Current State

The CDN picker returns SVG dash-array strings (e.g., `"6 4"`, `"12 4"`). maxGraph accepts these directly via `dashPattern` style property with `dashed=1`. This mapping works correctly.

### Current CDN Options (12 dash patterns)
| Label | SVG Value | Works in maxGraph? |
|-------|-----------|-------------------|
| Solid | `""` | Yes |
| Dotted | `"2 2"` | Yes |
| Dashed | `"6 4"` | Yes |
| Dash-Dot | `"6 4 2 4"` | Yes |
| Long Dash | `"12 4"` | Yes |
| Short Dash | `"4 2"` | Yes |
| Double Dot | `"2 2 6 2"` | Yes |
| Double Dash | `"6 2 6 2"` | Yes |
| Narrow Dot | `"1 2"` | Yes |
| Narrow Dash | `"3 2"` | Yes |
| Wide Dot | `"2 6"` | Yes |
| Wide Dash | `"8 6"` | Yes |

### Assessment

**No changes needed.** maxGraph renders arbitrary SVG dash-array strings correctly. The 12 options provide good coverage. The only consideration: 12 options may be excessive for a mini-sized picker. Consider reducing to 5-6 most useful patterns (Solid, Dotted, Dashed, Dash-Dot, Long Dash, Short Dash).

---

## 4. Suggested Implementation Approach

### For the UI team

1. **LineShapePicker**: Accept an `options` array in the constructor so the consuming app can specify which routing styles to show. Default to the 6 recommended above.

2. **LineEndingPicker**: Accept an `options` array and/or a `showERNotation: boolean` flag. This lets the Diagrams app show ER arrows only for ER diagram types.

3. **CDN values should match maxGraph constants directly** — no translation layer. The consuming app should not need to maintain a CDN→maxGraph mapping table.

### For the Diagrams app (after CDN updates)

1. Remove `mapCdnArrowToMaxGraph()` — CDN values will be maxGraph values directly
2. Remove `getRoutingStyle()` routing map — CDN values will be maxGraph style strings
3. Remove `SVG_TO_DASH_ENUM` / `DASH_ENUM_TO_SVG` if CDN dash values stay as SVG strings (which is fine)
4. Simplify `buildEdgeStyleWithDirection()` — no translation needed

---

## 5. Migration Path

Since the CDN picker values are persisted in the database (via `customLine_*` → `EdgePresentation`), changing CDN values requires either:

**Option A (recommended)**: Keep backward-compatible deserialization in the backend tolerant converters (already in place), update the CDN to emit new values, and the frontend converts old→new on read.

**Option B**: Database migration to update stored values. More work, but cleaner long-term.
