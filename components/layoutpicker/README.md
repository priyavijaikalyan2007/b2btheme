# LayoutPicker

A visually rich dropdown picker for selecting graph layout algorithms. Each option shows an inline SVG thumbnail depicting the spatial arrangement the algorithm produces (nodes as dots, edges as lines). Designed for use in Diagrams, Thinker, and Ontology Visualizer apps.

## Usage

```html
<link rel="stylesheet" href="components/layoutpicker/layoutpicker.css">
<script src="components/layoutpicker/layoutpicker.js"></script>

<div id="my-layout"></div>

<script>
var picker = createLayoutPicker({
    container: "my-layout",
    value: "elk-layered-tb",
    onChange: function(algo) {
        console.log("Layout:", algo.id, algo.category);
    }
});
</script>
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `container` | `HTMLElement \| string` | *required* | Container element or ID |
| `value` | `string` | first algorithm | Initial selected algorithm ID |
| `algorithms` | `string[]` | all 25 | Subset of algorithm IDs to show |
| `groupByCategory` | `boolean` | `false` | Group items by category with headers |
| `showCategoryAccent` | `boolean` | `true` | Use category accent colours on thumbnails |
| `onChange` | `(algo) => void` | | Callback on selection change |
| `ribbonMode` | `boolean` | `false` | Compact 22px trigger, no descriptions |
| `customAlgorithms` | `CustomAlgorithmDefinition[]` | | Custom algorithms beyond built-in set |

## Built-in Algorithms (25)

| ID | Label | Category |
|----|-------|----------|
| `smart` | Smart (Auto) | Smart |
| `ai-driven` | AI-Driven | Smart |
| `elk-layered-tb` | ELK Layered ↓ | Hierarchical |
| `elk-layered-lr` | ELK Layered → | Hierarchical |
| `elk-tree` | ELK Tree | Tree |
| `elk-force` | ELK Force | Force |
| `elk-stress` | ELK Stress | Force |
| `elk-radial` | ELK Radial | Radial |
| `dagre-tb` | Dagre ↓ | Hierarchical |
| `dagre-lr` | Dagre → | Hierarchical |
| `dagre-bt` | Dagre ↑ | Hierarchical |
| `dagre-rl` | Dagre ← | Hierarchical |
| `hierarchical` | Hierarchical | Hierarchical |
| `organic` | Organic (Force) | Force |
| `circle` | Circle | Circular |
| `compact-tree` | Compact Tree | Tree |
| `radial-tree` | Radial Tree | Radial |
| `partition` | Partition | Grid |
| `stack-horizontal` | Stack → | Linear |
| `stack-vertical` | Stack ↓ | Linear |
| `grid` | Grid | Grid |
| `force` | Force | Force |
| `radial` | Radial | Radial |
| `dagre` | Dagre | Hierarchical |
| `group-by-namespace` | Group by Namespace | Custom |

## API

| Method | Description |
|--------|-------------|
| `getValue()` | Returns the currently selected `LayoutAlgorithm` or `null` |
| `setValue(id)` | Select an algorithm by ID |
| `setAlgorithms(ids)` | Replace the set of available algorithms |
| `registerAlgorithm(def)` | Register a custom algorithm |
| `show()` | Open the dropdown |
| `hide()` | Close the dropdown |
| `destroy()` | Remove from DOM and clean up |
| `getElement()` | Get the root DOM element |

## App Examples

### Diagrams (full set, grouped)

```javascript
var picker = createLayoutPicker({
    container: "#layout-host",
    value: "elk-layered-tb",
    groupByCategory: true,
    onChange: function(algo) { engine.applyLayout(algo.id); }
});
```

### Thinker (subset)

```javascript
var picker = createLayoutPicker({
    container: "#thinker-layout",
    value: "hierarchical",
    algorithms: ["grid", "hierarchical", "organic", "circle", "compact-tree"],
    onChange: function(algo) { thinker.setLayout(algo.id); }
});
```

### Ontology Visualizer (custom algorithm)

```javascript
var picker = createLayoutPicker({
    container: "#onto-layout",
    value: "group-by-namespace",
    algorithms: ["group-by-namespace", "force", "hierarchical", "radial", "dagre"],
    onChange: function(algo) { ontology.applyLayout(algo.id); }
});
```

### Ribbon Mode

```javascript
var picker = createLayoutPicker({
    container: ribbonHost,
    value: "elk-layered-tb",
    algorithms: ["elk-layered-tb", "elk-layered-lr", "elk-force", "circle"],
    ribbonMode: true,
    onChange: function(algo) { engine.applyLayout(algo.id); }
});
```

## Keyboard

| Key | Action |
|-----|--------|
| `Arrow Down` / `Arrow Up` | Navigate items |
| `Enter` / `Space` | Select focused item or open panel |
| `Escape` | Close dropdown |
| `Home` / `End` | Focus first / last item |
| `Tab` | Close dropdown |

## CSS Classes

| Class | Purpose |
|-------|---------|
| `.layoutpicker` | Root container |
| `.layoutpicker--ribbon` | Ribbon mode modifier |
| `.layoutpicker-trigger` | Dropdown button |
| `.layoutpicker-panel` | Dropdown panel |
| `.layoutpicker-item` | Algorithm item |
| `.layoutpicker-item--selected` | Selected state (3px blue left border) |
| `.layoutpicker-item--focused` | Keyboard focus state |
| `.layoutpicker-thumb` | 48x48 SVG thumbnail |
| `.layoutpicker-node` | SVG node circle |
| `.layoutpicker-edge` | SVG edge line |
| `.layoutpicker-category` | Category header (grouped mode) |
| `.layoutpicker-empty` | Empty-state message |

## Dark Mode

All colours use `var(--theme-*)` CSS custom properties. SVG thumbnails use theme tokens for fills and strokes. Category accent colours are set via `--lp-accent` CSS custom property per item.
