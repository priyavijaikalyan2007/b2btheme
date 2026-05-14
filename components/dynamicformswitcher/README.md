<!-- AGENT: Documentation for the DynamicFormSwitcher CDN component (variant form switcher with retained per-variant state). -->

# DynamicFormSwitcher

A reusable container that holds **N pre-defined forms ("variants")** and shows exactly **one at a time**. The active variant is chosen either programmatically via `setVariant(id)` or via an optional built-in selector. Field values entered in a variant are **retained when the user switches away and back**.

Designed for use cases like Integrations Install/Configure (auth method drives different field shapes), webhook event-type config, sync filter builders, notification channel config, and JSON Schema property editors — places where the calling app owns the variant catalog and the CDN owns the primitive.

## Assets

| Asset | Path |
|-------|------|
| CSS | `components/dynamicformswitcher/dynamicformswitcher.css` |
| JS | `components/dynamicformswitcher/dynamicformswitcher.js` |
| Types | `components/dynamicformswitcher/dynamicformswitcher.d.ts` |

## Requirements

- **Enterprise theme CSS** — `css/custom.css` (provides `--theme-*` variables for dark mode)
- **Bootstrap Icons** — only if your variants set an `icon`
- Does **not** require Bootstrap JS, FormDialog JS, CodeEditor JS, RichTextInput JS, or ColorPicker JS to load. Variants with `type: "code"` / `type: "richtext"` / `type: "color"` degrade to a styled textarea / contenteditable / native colour input respectively.

## Quick Start

```html
<link rel="stylesheet" href="css/custom.css">
<link rel="stylesheet" href="components/dynamicformswitcher/dynamicformswitcher.css">
<div id="auth-host"></div>
<script src="components/dynamicformswitcher/dynamicformswitcher.js"></script>
<script>
    const switcher = createDynamicFormSwitcher("auth-host", {
        variants: {
            api_key: {
                label: "API Key", icon: "bi-key",
                description: "Pass an API key in a header on every request.",
                fields: [
                    { name: "base_url",    label: "Base URL",    type: "url",      required: true },
                    { name: "api_key",     label: "API Key",     type: "password", required: true },
                    { name: "header_name", label: "Header Name", type: "text",     placeholder: "X-Api-Key" }
                ]
            },
            basic: {
                label: "Basic Auth", icon: "bi-person-lock",
                fields: [
                    { name: "base_url", label: "Base URL", type: "url",      required: true },
                    { name: "username", label: "Username", type: "text",     required: true },
                    { name: "password", label: "Password", type: "password", required: true }
                ]
            }
        },
        initialVariant: "api_key",
        showSelector: true,
        selectorStyle: "dropdown",
        selectorLabel: "Auth Method"
    });
</script>
```

## API

### Factory

```typescript
createDynamicFormSwitcher(
    containerId: string | HTMLElement,
    options: DynamicFormSwitcherOptions,
): DynamicFormSwitcherHandle;
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `variants` | `Record<string, DynamicFormVariant>` | required | The set of forms; insertion order drives selector order. |
| `initialVariant` | `string` | required | Must be a key of `variants`. Throws otherwise. |
| `showSelector` | `boolean` | `false` | Render the built-in selector. When false, caller drives via `setVariant()`. |
| `selectorLabel` | `string` | `"Type"` | Label above the built-in selector. |
| `selectorStyle` | `"dropdown" \| "segmented" \| "tabs"` | `"dropdown"` | Visual style. Segmented is best for ≤4 variants. |
| `selectorHelpText` | `string` | — | Help text shown under the selector. |
| `value` | flat or nested object | — | Pre-fill values. See **Value seeding** below. |
| `retainStateAcrossSwitches` | `boolean` | `true` | When `false`, switching wipes the prior variant's values. |
| `onChange` | `(variantId, values) => void` | — | Fires on each field edit. |
| `onVariantChange` | `(newId, prevId) => void` | — | Fires on variant switch. |
| `onValidate` | `(variantId, values) => string \| null` | — | Cross-variant validator. Runs after per-field validators pass. |
| `size` | `"sm" \| "md" \| "lg" \| "xl" \| "auto"` | `"auto"` | Max-width preset. `auto` fills the container. |
| `className` | `string` | — | Extra class added to the outer wrapper. |

### `DynamicFormVariant`

| Property | Type | Description |
|----------|------|-------------|
| `label` | `string` | Display label in the selector + region aria-label. |
| `description` | `string?` | Optional context shown above the fields. |
| `icon` | `string?` | Bootstrap icon class (e.g. `bi-key`) shown next to the label. |
| `fields` | `DynamicFormField[]` | The fields rendered when this variant is active. |

### `DynamicFormField`

Field schema. Supported `type` values and their stored value types:

| `type` | Stored value type | Notes |
|--------|-------------------|-------|
| `text`, `email`, `password`, `url`, `textarea`, `date`, `datetime`, `time` | `string` | `email`/`url` get cheap built-in validation when value is non-empty. |
| `number` | `number \| null` | Empty input → `null`. No `String→Number` coercion. |
| `select`, `radio` | `string \| null` | Radio with nothing checked → `null`. |
| `multiselect` | `string[]` | Backed by `<select multiple>`. |
| `checkbox`, `toggle` | `boolean` | |
| `color` | `string` (hex) | |
| `file` | `File[]` | Native `<input type=file>`. Not programmatically writable. |
| `code` | `string` | Renders as a monospace textarea. |
| `richtext` | `string` (HTML) | Renders as `contenteditable`. |
| `custom` | whatever `customElement.getValue()` returns | Caller provides the element. Optional `getValue` / `setValue` contract. |

Field-level options:

| Option | Type | Description |
|--------|------|-------------|
| `name`, `label`, `type` | — | Required. |
| `required` | `boolean` | Empty → "This field is required". |
| `placeholder`, `helpText`, `autocomplete` | `string` | |
| `value` | `unknown` | Default value when not yet stored. Type should match the row above. |
| `options` | `{ value, label }[]` | For `select`, `multiselect`, `radio`. |
| `rows` | `number` | For `textarea`, `code`. |
| `min`, `max`, `step` | `number` | For `number`. |
| `width` | `"full" \| "half" \| "third"` | Lays the field group out in a row. |
| `validate` | `(value: unknown) => string \| null` | Per-field validator. |
| `customElement` | `HTMLElement` | For `type: "custom"`. |

### Handle methods

| Method | Description |
|--------|-------------|
| `getVariant()` | Current active variant id. |
| `setVariant(id)` | Switch active variant. Throws on unknown id. No-op when id is already active. |
| `getValues()` | The active variant's values, natively typed. |
| `getAllValues()` | `{ variantId: values }` for every variant the user has touched, plus seeded variants. |
| `setValues(variantId, values)` | Store values for the named variant; re-renders if it is active. |
| `clearValues(variantId?)` | Remove stored values for one variant (or all if omitted). |
| `validate()` | Validate the active variant. Returns `true` iff every required field is populated, every per-field validator passes, and `onValidate` (if any) returns `null`. |
| `reset()` | Reset the active variant only. |
| `resetAll()` | Reset every variant. |
| `refresh()` | Commit current values and re-render the active variant. |
| `destroy()` | Detach listeners and remove DOM. Idempotent. |

## Value seeding (`value` option)

Two shapes are accepted:

- **Flat:** `{ field1: v1, field2: v2 }` — applied to the **initial variant**.
- **Nested:** `{ variantA: { field1: v1 }, variantB: { field2: v2 } }` — populates multiple variants.

The two shapes are disambiguated automatically: if at least one top-level key matches a variant id **and** its value is an object (not an array), the seed is treated as nested; otherwise flat.

## Embedding inside FormDialog

The most common embedding is as a `custom` field in a FormDialog where the host renders the selector itself:

```typescript
const host = document.createElement("div");
const switcher = createDynamicFormSwitcher(host, {
    variants: { api_key: { /* … */ }, basic: { /* … */ }, oauth2_cc: { /* … */ } },
    initialVariant: "api_key",
    showSelector: false,        // caller renders its own select
});

createFormDialog({
    title: "Install Integration",
    fields: [
        { name: "display_name", label: "Display Name", type: "text", required: true },
        {
            name: "auth_method", label: "Auth Method", type: "select", required: true,
            value: "api_key",
            options: [
                { value: "api_key",   label: "API Key" },
                { value: "basic",     label: "Basic Auth" },
                { value: "oauth2_cc", label: "OAuth2 Client Credentials" },
            ],
            onChange: (v) => switcher.setVariant(v),
        },
        { name: "_auth_host", label: "", type: "custom", customElement: host },
    ],
    onSubmit: async (values) =>
    {
        if (!switcher.validate()) { return; }
        const auth_method = switcher.getVariant();
        const auth_config = switcher.getValues();
        await api.installIntegration({ ...values, auth_method, connection_config: auth_config });
    },
});
```

## State retention semantics

| Scenario | Behaviour |
|----------|-----------|
| Fill A → switch to B | A's values committed to internal store; B renders empty (or pre-populated). |
| Fill B → switch back to A | A's values restored. |
| `getAllValues()` | Returns every variant the user has touched, plus seeded variants. |
| `getValues()` | Returns only the active variant. |
| `retainStateAcrossSwitches: false` | Switching wipes the prior variant. |
| `clearValues("A")` | Drops A's stored values; A renders empty when next active. |

State is keyed by `(variantId, fieldName)`. A field named `base_url` in variant A is stored independently from `base_url` in variant B — by design, since a base URL for one auth scheme is rarely identical to another.

## Accessibility

- The form region carries `role="region"`, `aria-label="{variant.label} configuration"`, and `aria-live="polite"`.
- Segmented and tabs selectors are `role="tablist"` / `role="tab"` and support arrow-key navigation, `Home`, and `End`.
- Required fields get `aria-required="true"`; invalid fields get `aria-invalid="true"`.
- Variant change moves focus to the first focusable field of the new variant.
- Transitions respect `prefers-reduced-motion`.

## Styling

Uses `--theme-*` CSS variables, so `data-bs-theme="dark"` on the document root flips the component to dark mode with no extra prop.

## Embedding library components as fields (ADR-134)

Beyond the built-in field types, **any value-bearing component in the library is usable as a field with zero adapter code** — provided the component conforms to the "Form-field-capable Components Convention" (AGENTS.md). DynamicFormSwitcher auto-discovers the component's factory at render time.

### Auto-discovery (the common case)

```typescript
createDynamicFormSwitcher(host, {
    initialVariant: "scheduled",
    variants: {
        scheduled: {
            label: "Scheduled",
            fields: [
                // type → window.create<PascalCase> mapping. Kebab-case is canonical.
                { name: "when",     label: "When",     type: "cron-picker" },
                { name: "tz",       label: "Timezone", type: "timezone-picker" },
                { name: "owners",   label: "Owners",   type: "people-picker",
                  componentOptions: { multiple: true } },
                { name: "schema",   label: "Payload",  type: "code-editor",
                  componentOptions: { language: "json" } },
            ],
        },
    },
});
```

Resolution order:
1. `create${PascalCase(type)}` — `cron-picker` → `createCronPicker` (canonical).
2. `create${type[0].toUpperCase()}${type.slice(1)}` — `cronPicker` → `createCronPicker`.
3. Window scan for `create*` globals whose suffix lowercases to the type — `cronpicker` → `createCronPicker`.
4. Registered provider override (see below).
5. Literate error rendered in-place naming the missing factory + the `registerDynamicFormFieldProvider` escape hatch.

### Registry — for non-conformant components

```typescript
registerDynamicFormFieldProvider("audit-summary", (host, field) =>
{
    const handle = window.createCustomAuditWidget!(host, field.componentOptions ?? {});
    return {
        getValue: () => handle.serialise(),
        setValue: (v) => handle.load(v),
        validate: () => handle.errorMessage(),
        destroy: () => handle.destroy(),
    };
});
```

Useful for: components whose value vocabulary doesn't fit the convention; component versions that exist before the convention retrofit lands; or tests that want to swap a real component for a mock.

### `mount` — for one-off rich layouts

When you need a composite UI (e.g. SplitLayout with CodeEditor + help pane) as a single field:

```typescript
{
    type: "custom", name: "schema", label: "Schema",
    mount: (host) =>
    {
        const split = window.createSplitLayout!(host, { orientation: "horizontal" });
        const editor = window.createCodeEditor!(split.getPane(0), { language: "json" });
        renderHelpInto(split.getPane(1));
        return {
            getValue: () => editor.getValue(),
            setValue: (v) => editor.setValue(String(v)),
            destroy: () => { editor.destroy(); split.destroy(); },
        };
    }
}
```

## Limitations

- `<input type="file">` cannot be set programmatically — `setValues()` will store the value but cannot push it into the DOM control.
- The built-in `type: "code"` and `type: "richtext"` are intentionally lightweight fallbacks (textarea / contenteditable). For the real CDN surfaces, use `type: "code-editor"` / `type: "rich-text-input"` (auto-discovery) or `type: "custom"` with `mount`.
- The CDN does not ship a variant catalog. The whole point of this primitive is that the calling app owns its own variant definitions.
