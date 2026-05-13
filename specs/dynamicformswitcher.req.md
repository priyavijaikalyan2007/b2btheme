<!-- AGENT: Feature request for the DynamicFormSwitcher CDN component. Written for the UI/components team to intake and build. -->

# Feature Request: DynamicFormSwitcher CDN Component

**Date:** May 5, 2026
**Status:** Requested
**Requestor:** Platform Engineering Team
**For:** UI / Components Team (CDN component implementation)
**Priority:** Medium — Unblocks the Integrations Install/Configure auth UX (currently a JSON `CodeEditor` stopgap on `frontend/admin/integrations.html`)

---

## 1. Summary

We need a new CDN component called **DynamicFormSwitcher** — a reusable container that holds **N pre-defined forms** ("variants") and shows exactly **one at a time**. The active variant is chosen either:

- programmatically via `setVariant(id)` (caller controls the dropdown / segmented control / tabs elsewhere), **or**
- via an optional built-in selector (dropdown) the component renders itself.

The component **retains values per variant** as the user switches between them: filling in fields under variant A, switching to B, then back to A must restore A's values. This is non-negotiable — losing user input on switch is the entire reason we're not solving this with `display:none`/`display:block` of separate FormDialog instances.

Each variant is a **full FormDialog field schema** — every input type FormDialog supports must work inside a variant unchanged.

---

## 2. Motivation

The first concrete consumer is the **Integrations Install Wizard** (and Configure dialog) on the Tenant Admin. The connection step needs an "Auth Method" choice that drives a different set of fields:

| Auth Method | Fields |
|-------------|--------|
| API Key | Base URL, API Key (password), optional Header Name |
| Basic | Base URL, Username, Password |
| OAuth2 Client Credentials | Base URL, Client ID, Client Secret, Token URL, Scope |
| OAuth2 Authorization Code | Base URL, Client ID, Client Secret, Auth URL, Token URL, Scope, Redirect URI |
| Bearer Token | Base URL, Token (password) |
| AWS SigV4 | Access Key, Secret Key, Region, optional Session Token, optional Role ARN |
| GCP Service Account | Service Account JSON (textarea/file), Scopes |
| mTLS | Base URL, Client Cert (textarea), Client Key (password), CA Cert (optional) |
| HMAC Signed | Base URL, Public Key ID, Shared Secret, Signing Algorithm |
| None | Base URL only |

We considered specialising the component as `createAuthConfigForm` with a built-in catalog of auth methods. We rejected that approach because:

1. **The catalog isn't closed.** New auth methods show up every quarter (new SaaS provider, new cloud, new internal service). Each addition would be a UI team change + CDN deploy. Wrong velocity contract for an integrations platform.
2. **Auth shapes are vendor-specific.** Workday's `oauth2_client_credentials` differs from Jira's, which differs from Salesforce's (tenant URL placement, scope syntax, optional fields). A generic "OAuth2 CC" form is always almost-right.
3. **The pattern recurs beyond auth.** Webhook event-type configuration, sync filter expressions, condition builders, payment method selection, notification channel config — they all want "pick from N shapes, render the right form." A generic primitive earns its keep across the platform.

The DynamicFormSwitcher inverts ownership: the UI team maintains **one primitive**; the calling app owns the variant definitions. New variant = new local form definition. The CDN never has to know.

### Other anticipated consumers

| Consumer | Variants |
|----------|---------|
| Webhook event-type config (Tenant Admin → Integrations → Edit) | "Per-resource event", "Resource-set event", "Audit event", "Custom payload" |
| Sync filter builder (per-adapter) | "Date range", "Status enum", "JQL/SoQL expression", "None" |
| Notification channel config (future) | "Email", "Slack webhook", "Teams webhook", "PagerDuty", "Custom HTTP" |
| Property value editor in Schema Browser (future) | One variant per JSON Schema `type` (string, integer, array, object, enum) |

---

## 3. Component Specification

### 3.1 CDN Slug & Files

```
https://static.knobby.io/components/dynamicformswitcher/dynamicformswitcher.css
https://static.knobby.io/components/dynamicformswitcher/dynamicformswitcher.js
```

### 3.2 Window Factory

```typescript
window.createDynamicFormSwitcher?: (
    containerId: string | HTMLElement,
    options: DynamicFormSwitcherOptions,
) => DynamicFormSwitcherHandle;
```

### 3.3 Configuration Options

```typescript
interface DynamicFormSwitcherOptions {
    // ── Variants (the core data model) ────────────────────────────────
    /**
     * The set of forms the user can switch between. Order matters — it
     * drives the order of options in the built-in selector (when shown).
     * Object form (preserves insertion order) is required so we can
     * preserve order across browsers reliably; do NOT accept an array
     * of [id, variant] tuples (different mental model).
     */
    variants: Record<string, DynamicFormVariant>;

    /**
     * Which variant is active on first render. Must be a key of `variants`.
     * Required.
     */
    initialVariant: string;

    // ── Selector ──────────────────────────────────────────────────────
    /**
     * If true, the component renders its own selector (a dropdown by
     * default) above the active form. If false, the caller is
     * responsible for switching variants via `setVariant()` (e.g. the
     * caller has its own segmented control elsewhere in the layout).
     * Default: false — the most common usage in Integrations is for the
     * caller to render an Auth Method dropdown that's part of a wider
     * FormDialog field set.
     */
    showSelector?: boolean;

    /**
     * Label for the built-in selector. Only used when showSelector:true.
     * Default: 'Type'.
     */
    selectorLabel?: string;

    /**
     * Visual style of the built-in selector.
     * - 'dropdown' (default): a <select> styled to match FormDialog
     * - 'segmented': horizontal segmented control (best for ≤4 variants)
     * - 'tabs': tab strip across the top
     */
    selectorStyle?: 'dropdown' | 'segmented' | 'tabs';

    /**
     * Help text shown under the selector. Only used when showSelector:true.
     */
    selectorHelpText?: string;

    // ── Initial Values ────────────────────────────────────────────────
    /**
     * Pre-fill values, optionally per variant. Two shapes accepted:
     *   1. Flat object — applied to the initial variant's fields whose
     *      names match keys. Convenient when loading a saved config that
     *      only knows the active variant's values.
     *   2. Nested object — `{ variantId: { fieldName: value } }`. Lets
     *      the caller pre-populate multiple variants at once (e.g. when
     *      editing a previously-saved config that included partial
     *      values for non-active variants).
     */
    value?: Record<string, unknown> | Record<string, Record<string, unknown>>;

    // ── State Retention ───────────────────────────────────────────────
    /**
     * When true (default), values entered into a variant are kept in
     * component state across switches. Switching back restores them.
     * When false, switching wipes the previous variant's values.
     * Default: true. Setting this to false defeats the main purpose of
     * the component, so it should only be used when the variants are
     * conceptually unrelated and prior values would mislead.
     */
    retainStateAcrossSwitches?: boolean;

    // ── Callbacks ─────────────────────────────────────────────────────
    /**
     * Fires whenever a field value or the active variant changes.
     * Receives the active variant id and that variant's current values.
     * For complete state across all variants use the handle's
     * getAllValues() instead.
     */
    onChange?: (variantId: string, values: Record<string, unknown>) => void;

    /**
     * Fires when the active variant changes (selector click or
     * setVariant() call). Includes the previous variant id so callers
     * can persist values to a separate store if needed.
     */
    onVariantChange?: (newVariantId: string, previousVariantId: string) => void;

    /**
     * Optional cross-variant validator. Runs after the per-field
     * validators in the active variant pass; can return a string error
     * to block validate() from returning true.
     */
    onValidate?: (variantId: string, values: Record<string, unknown>) => string | null;

    // ── Layout ────────────────────────────────────────────────────────
    /**
     * Width preset for the form column. Mirrors FormDialog's `size`.
     * Default: 'auto' — fills the container.
     */
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'auto';

    /**
     * Optional CSS class for the outer wrapper.
     */
    className?: string;
}

interface DynamicFormVariant {
    /**
     * Display label for this variant — shown in the built-in selector
     * (when shown) and in the FormDialog's review summaries.
     */
    label: string;

    /**
     * Optional short description rendered above the form. Useful for
     * "what is this variant for" context (e.g. "Use OAuth2 Client
     * Credentials when the integration runs as a service, not on
     * behalf of a user.").
     */
    description?: string;

    /**
     * Optional Bootstrap icon class (e.g. 'bi-key') shown next to the
     * label in the selector.
     */
    icon?: string;

    /**
     * The fields. **Use the exact same field-schema vocabulary as
     * FormDialog.** All FormDialog field types must work here unchanged:
     * text, textarea, password, url, email, number, select, multiselect,
     * toggle, checkbox, radio, date, datetime, time, file, color,
     * code (CodeEditor), richtext (RichTextInput), custom (escape hatch
     * with `customElement: HTMLElement`). Field-level `validate`,
     * `helpText`, `placeholder`, `width`, `required`, `value`, `options`
     * must all be honoured identically.
     */
    fields: FormDialogField[];      // same type alias FormDialog exports
}
```

### 3.4 Instance API (Runtime Control)

```typescript
interface DynamicFormSwitcherHandle {
    // ── Variant control ───────────────────────────────────────────────
    /** The currently active variant id. */
    getVariant(): string;

    /**
     * Switch the active variant programmatically. Triggers
     * onVariantChange. If the id is not a known variant, throws.
     */
    setVariant(id: string): void;

    // ── Value access ──────────────────────────────────────────────────
    /**
     * Values for the active variant only. Field names → values, with
     * the same coercion rules FormDialog uses (toggles → boolean,
     * number fields → number, etc.).
     */
    getValues(): Record<string, unknown>;

    /**
     * Values for every variant the user has interacted with. Useful
     * for persisting partial state across sessions.
     */
    getAllValues(): Record<string, Record<string, unknown>>;

    /**
     * Replace values for a specific variant. Does NOT switch the active
     * variant. If `variantId === current`, the active form re-renders
     * with the new values. If different, the values are stored and will
     * appear when the user switches to that variant.
     */
    setValues(variantId: string, values: Record<string, unknown>): void;

    /**
     * Clear stored values for a specific variant (or all variants if
     * variantId is omitted).
     */
    clearValues(variantId?: string): void;

    // ── Validation ────────────────────────────────────────────────────
    /**
     * Validate the currently active variant. Returns true iff every
     * required field is populated, every per-field validator passes,
     * and onValidate (if provided) returns null.
     * Inline error markers are rendered next to failing fields in the
     * same style FormDialog uses.
     */
    validate(): boolean;

    /**
     * Reset all fields in the active variant to their declared default
     * values (clearing any user input). Does not affect other variants.
     */
    reset(): void;

    // ── Lifecycle ─────────────────────────────────────────────────────
    /** Re-render the currently active variant from scratch. */
    refresh(): void;

    /** Tear down event listeners and remove DOM. Idempotent. */
    destroy(): void;
}
```

---

## 4. Layout & Anatomy

### 4.1 With built-in selector (`showSelector: true`, `selectorStyle: 'dropdown'`)

```
┌─────────────────────────────────────────────────────────┐
│  Auth Method *                                          │  ← selectorLabel
│  ┌─────────────────────────────────────────────────┐    │
│  │  OAuth2 Client Credentials                  ▾   │    │  ← built-in dropdown
│  └─────────────────────────────────────────────────┘    │
│  Use OAuth2 CC when running as a service, not a user.   │  ← selectorHelpText
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  Use OAuth2 Client Credentials when the integration     │  ← variant.description
│  runs as a service, not on behalf of a user.            │
│                                                         │
│  Base URL *                                             │
│  ┌─────────────────────────────────────────────────┐    │
│  │  https://api.example.com                        │    │  ← variant.fields[]
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  Client ID *           Client Secret *                  │
│  ┌─────────────────┐   ┌─────────────────────────┐      │
│  │                 │   │  ●●●●●●●●●●●●           │      │
│  └─────────────────┘   └─────────────────────────┘      │
│                                                         │
│  Token URL *                                            │
│  ┌─────────────────────────────────────────────────┐    │
│  │  https://auth.example.com/oauth2/token          │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### 4.2 Without built-in selector (`showSelector: false`, the default)

The caller renders the selector wherever it makes sense in the surrounding form. The component renders only the active variant's body (description + fields).

```
Caller's surrounding FormDialog
┌─────────────────────────────────────────────────────────┐
│  Display Name *                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Jira Cloud Production                          │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  Auth Method *           ← caller's own select field    │
│  ┌─────────────────────────────────────────────────┐    │
│  │  OAuth2 Client Credentials                  ▾   │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ╭── DynamicFormSwitcher (active variant only) ──────╮  │
│  │                                                    │  │
│  │  Base URL *                                        │  │
│  │  ┌──────────────────────────────────────────────┐  │  │
│  │  │  https://api.example.com                     │  │  │
│  │  └──────────────────────────────────────────────┘  │  │
│  │                                                    │  │
│  │  Client ID *           Client Secret *             │  │
│  │  ┌─────────────────┐   ┌─────────────────────────┐ │  │
│  │  │                 │   │  ●●●●●●●●●●●●           │ │  │
│  │  └─────────────────┘   └─────────────────────────┘ │  │
│  │  ...                                               │  │
│  ╰────────────────────────────────────────────────────╯  │
└─────────────────────────────────────────────────────────┘
```

### 4.3 Segmented selector (`selectorStyle: 'segmented'`)

```
┌─────────────────────────────────────────────────────────┐
│  ┌──────────┬──────────┬──────────┬──────────┐         │
│  │ API Key  │  Basic   │ OAuth2 CC│   None   │         │  ← segmented control
│  └──────────┴──────────┴──────────┴──────────┘         │
│                  ▲ active                               │
│                                                         │
│  [active variant body renders below…]                   │
└─────────────────────────────────────────────────────────┘
```

Best when N ≤ 4 and labels are short.

### 4.4 Tab selector (`selectorStyle: 'tabs'`)

```
┌─────────────────────────────────────────────────────────┐
│  ╭──────────╮ ──────────  ──────────  ──────────        │
│  │ API Key  │   Basic     OAuth2 CC      None           │  ← tabs
│  ╰──────────╯─────────────────────────────────────      │
│  │                                                  │   │
│  │  [active variant body renders below…]            │   │
│  │                                                  │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## 5. Behavior Specification

### 5.1 State Retention

| Scenario | Behaviour |
|----------|-----------|
| User fills variant A, switches to B | A's values stored in component state; B renders empty (or pre-populated from `value`). |
| User fills B, switches back to A | A's previous values restored; user picks up where they left off. |
| User calls `getAllValues()` | Returns `{ A: { … }, B: { … } }` — every variant the user has touched. |
| User calls `getValues()` | Returns only the active variant's values — what most callers want at submit time. |
| `retainStateAcrossSwitches: false` | Switching always wipes the prior variant. Use rarely. |
| `clearValues('A')` | Removes A's stored values; if A becomes active, fields render empty. |

**State key invariant:** values are keyed by `(variantId, fieldName)`. Field-name collisions across variants do NOT share state — field `base_url` in variant A is separate from `base_url` in variant B. (This is by design: a user's base URL for one auth scheme is rarely the same for another.)

### 5.2 Validation

| Behaviour |
|-----------|
| `validate()` runs only the **active** variant's validators. Inactive variants are not validated. |
| Validation rules and inline error rendering MUST match FormDialog's behaviour exactly. |
| `onValidate(variantId, values)` runs **after** per-field validators pass and can veto the result with a string error. |
| Submitting a parent FormDialog should call `validate()` on every embedded DynamicFormSwitcher and short-circuit on the first failure. |

### 5.3 Switching Rules

| Trigger | Behaviour |
|---------|-----------|
| User clicks built-in selector option | Active variant changes. Previous values stored. New variant rendered. `onVariantChange` fires. |
| Caller calls `setVariant(id)` | Same as above. Throws if id is unknown. |
| `setVariant` to the current variant | No-op. `onVariantChange` does NOT fire. |
| Variant's fields are mid-edit when switching | Mid-edit values are committed to state before the switch. (No "are you sure" prompt.) |

### 5.4 Field Schema Compatibility

Every field type FormDialog supports MUST work inside a variant unchanged. Specifically:

| Field type | Required |
|-----------|----------|
| `text`, `textarea`, `password`, `url`, `email`, `number` | Yes |
| `select`, `multiselect`, `radio`, `checkbox`, `toggle` | Yes |
| `date`, `datetime`, `time` | Yes |
| `color` | Yes |
| `file` | Yes |
| `code` (wraps CDN CodeEditor) | Yes |
| `richtext` (wraps CDN RichTextInput) | Yes |
| `custom` (caller-provided `customElement: HTMLElement`) | Yes — required as the escape hatch for any future field type |

Field-level options (`required`, `placeholder`, `helpText`, `validate`, `width`, `value`, `options`, `rows`, `min`/`max`, etc.) must all be honoured identically to how FormDialog handles them. Implementers can (and should) reuse FormDialog's internal field-renderer module.

### 5.5 Error Handling

| Error | UX |
|-------|-----|
| `initialVariant` not in `variants` | Throw at construction with a clear error message. |
| `setVariant(id)` for unknown id | Throw. |
| `value` shape ambiguous (could be flat OR nested) | Disambiguate by checking whether keys match variant ids. If exactly one variant id is a key, treat as nested. Otherwise flat. Document this rule in the README. |
| Variant has zero fields | Render an empty body with the variant's description (if any). Don't crash. |

---

## 6. Accessibility

| Requirement | Implementation |
|-------------|---------------|
| **Keyboard navigation** | Tab through selector and fields in DOM order. Arrow keys navigate between segmented/tab options. Enter/Space activates a tab/segment. |
| **ARIA roles** | Selector: `role="tablist"` / `role="tab"` for tab and segmented styles; standard `<select>` for dropdown style. Form region: `role="region"` with `aria-label="{variant label} configuration"` and `aria-live="polite"` on variant change so screen readers announce the new context. |
| **Focus management** | On variant change, focus moves to the first focusable field of the new variant. |
| **Color contrast** | All text and selector states meet WCAG 2.1 AA (4.5:1 ratio). |
| **Reduced motion** | Variant transitions respect `prefers-reduced-motion` (instant swap, no fade). |
| **Screen reader announcements** | Variant change announces "{variant.label} selected. Form updated." |

---

## 7. Styling & Theming

The component should inherit the platform's existing design tokens (Bootstrap CSS variables — see `UI_UX_CONSISTENCY.md` §7.2 for the canonical mapping):

| Token | Usage |
|-------|-------|
| `--bs-body-bg` | Wrapper background |
| `--bs-body-color` | Field labels, body text |
| `--bs-secondary-color` | Help text, descriptions |
| `--bs-border-color` | Field borders, separator above active variant |
| `--bs-primary` | Active tab/segment indicator |
| `--bs-tertiary-bg` | Inactive segmented background |

**Dark mode:** must work via `data-bs-theme="dark"` on the document root. No explicit theme prop. (See ADR-119 — RelationshipManager dark mode.)

**Layout density:** match FormDialog's row spacing exactly. Inserting a DynamicFormSwitcher into a FormDialog should look like one continuous form, not a "panel inside a panel".

---

## 8. Integration with FormDialog

The most common usage will be embedded inside a FormDialog as a `custom` field. Here's the expected pattern:

```typescript
const switcher = window.createDynamicFormSwitcher(host, {
    variants: {
        api_key: {
            label: 'API Key',
            icon: 'bi-key',
            description: 'Pass an API key in a header on every request.',
            fields: [
                { name: 'base_url',    label: 'Base URL',    type: 'url',      required: true },
                { name: 'api_key',     label: 'API Key',     type: 'password', required: true },
                { name: 'header_name', label: 'Header Name', type: 'text',     placeholder: 'X-Api-Key' },
            ],
        },
        basic: {
            label: 'Basic Auth',
            icon: 'bi-person-lock',
            fields: [
                { name: 'base_url', label: 'Base URL', type: 'url',      required: true },
                { name: 'username', label: 'Username', type: 'text',     required: true },
                { name: 'password', label: 'Password', type: 'password', required: true },
            ],
        },
        oauth2_cc: {
            label: 'OAuth2 Client Credentials',
            icon: 'bi-shield-check',
            fields: [
                { name: 'base_url',      label: 'Base URL',      type: 'url',      required: true },
                { name: 'client_id',     label: 'Client ID',     type: 'text',     required: true },
                { name: 'client_secret', label: 'Client Secret', type: 'password', required: true },
                { name: 'token_url',     label: 'Token URL',     type: 'url',      required: true },
                { name: 'scope',         label: 'Scope',         type: 'text',     placeholder: 'read:all' },
            ],
        },
    },
    initialVariant: 'api_key',
    showSelector: false,    // caller renders its own auth_method dropdown
});

const dialog = window.createFormDialog({
    title: 'Install Integration',
    fields: [
        { name: 'display_name', label: 'Display Name', type: 'text', required: true },
        {
            name: 'auth_method', label: 'Auth Method', type: 'select', required: true,
            value: 'api_key',
            options: [
                { value: 'api_key',   label: 'API Key' },
                { value: 'basic',     label: 'Basic Auth' },
                { value: 'oauth2_cc', label: 'OAuth2 Client Credentials' },
            ],
            onChange: (v) => switcher.setVariant(v),
        },
        { name: '_auth_form_host', label: '', type: 'custom', customElement: host },
    ],
    onSubmit: async (values) => {
        if (!switcher.validate()) return;
        const auth_method = switcher.getVariant();
        const auth_config = switcher.getValues();
        await api.installIntegration({
            display_name: values.display_name,
            auth_method,
            connection_config: { ...auth_config },
        });
    },
});
dialog.show();
```

---

## 9. Stopgap Until Shipped

The Integrations Install/Configure flow currently uses a JSON `CodeEditor` as a fallback for connection_config. This is unblocked but ugly. When `createDynamicFormSwitcher` lands:

1. Replace the CodeEditor host in `frontend/admin/integrations.html` with a DynamicFormSwitcher host.
2. The `auth_method` select stays in the FormDialog (caller-rendered selector — option B above).
3. `connection_config` continues to be sent to the backend as a JSON object, so the wire format does NOT change. Only the editor widget is swapped.
4. The Configure dialog loads existing `connection_config` via `setValues(existingMethod, existingValues)` and `setVariant(existingMethod)`.

---

## 10. Acceptance Criteria

| # | Criterion | How to Verify |
|---|-----------|---------------|
| 1 | Renders the initial variant's fields on first render | Pass `initialVariant: 'b'` → variant B's fields appear |
| 2 | `setVariant(id)` swaps the rendered fields | Call `setVariant('c')` → variant C's fields appear, B's disappear |
| 3 | Built-in selector (`showSelector: true`) renders and works | Click selector option → active variant changes, `onVariantChange` fires |
| 4 | All three selector styles (`dropdown`, `segmented`, `tabs`) render correctly | Visual screenshot test per style |
| 5 | State retention: fill A, switch to B, back to A → A's values restored | Manual test + automated |
| 6 | `getAllValues()` returns the per-variant nested map of every touched variant | Fill A and B, call `getAllValues()` → both keys present |
| 7 | `getValues()` returns only the active variant's values | Fill A, switch to B, fill B → `getValues()` returns B's values |
| 8 | `setValues('A', { field1: 'x' })` populates A even when not active | Switch to A → field1 is 'x' |
| 9 | `validate()` runs the active variant's validators only | Required field missing in B; `validate()` returns false; in A returns true |
| 10 | `onValidate` cross-variant validator can veto a passing variant | Return string error → `validate()` returns false, error shown |
| 11 | Every FormDialog field type works inside a variant | One variant per field type; render and interact with each |
| 12 | `value` accepts both flat and nested shapes | Pass each shape; verify pre-population works |
| 13 | `retainStateAcrossSwitches: false` wipes on switch | Fill A, switch to B, back to A → A is empty |
| 14 | Embedded inside FormDialog, submission round-trips correctly | Submit → caller receives `{ variantId, values }`; round-trip via Configure |
| 15 | Dark mode: works via `data-bs-theme="dark"` with no explicit prop | Toggle theme; styles update |
| 16 | Keyboard navigation works for all three selector styles | Tab/arrow keys move between options; Enter activates |
| 17 | ARIA roles / `aria-live` announce variant change | Run axe DevTools → zero violations; screen reader announces correctly |
| 18 | `destroy()` removes DOM and detaches listeners | Call destroy() → wrapper gone; subsequent calls are no-ops |

---

## 11. Out of Scope

| Feature | Why Out of Scope |
|---------|-----------------|
| Async-loaded variants | Variants are declarative and known at construction. Async loading is a caller concern (load → call constructor when ready). |
| Cross-variant field linking ("when A.x = 5, set B.y = 10") | Caller can wire this via `onChange` and `setValues`. Avoids a config DSL. |
| Built-in "Save Draft" / persistence | Caller decides where to persist (localStorage, backend, in-memory). Component exposes `getAllValues()` for this. |
| Built-in "Test Connection" button | The auth-form use case is one of many. A "Test" button would have to know how to call the integration's endpoint, which is application-specific. Caller renders this button outside the switcher when relevant. |
| Visual diff between variants | If the caller wants to show "you changed X by switching", they implement it from `getAllValues()`. |
| Schema-driven catalog of pre-built variants (e.g. ship 10 auth methods out of the box) | Explicitly rejected — see §2 motivation. The whole point is that the CDN does not own the catalog. |

---

## 12. Dependencies

| Dependency | Status | Notes |
|-----------|--------|-------|
| FormDialog (§2.4) | Exists | Field renderer reused internally; field schema vocabulary inherited verbatim |
| CodeEditor | Exists | For `type: 'code'` fields |
| RichTextInput | Exists | For `type: 'richtext'` fields |
| ColorPicker | Exists | For `type: 'color'` fields |
| Bootstrap Icons | Exists | Variant icons (optional) |

**No new dependencies required.** The component should be self-contained within its CSS + JS files.

---

## 13. Type Definitions

After the CDN ships, the platform team will add:

```typescript
// typescript/shared/types/component-library.d.ts
interface DynamicFormVariant {
    label: string;
    description?: string;
    icon?: string;
    fields: FormDialogField[];
}

interface DynamicFormSwitcherOptions { /* … as §3.3 */ }

interface DynamicFormSwitcherHandle { /* … as §3.4 */ }

interface Window {
    createDynamicFormSwitcher?: (
        containerId: string | HTMLElement,
        options: DynamicFormSwitcherOptions,
    ) => DynamicFormSwitcherHandle;
}
```

The `FormDialogField` alias must already exist in `component-library.d.ts` (it does — used by FormDialog itself). The DynamicFormSwitcher reuses it without modification.

---

## 14. Timeline & Coordination

| Milestone | What | Who |
|-----------|------|-----|
| **Design review** | UI team reviews this spec, proposes changes (especially around state-retention semantics and selector ergonomics) | UI Team |
| **Implementation** | Build `dynamicformswitcher.css` + `dynamicformswitcher.js` | UI Team |
| **Type definitions** | Platform team adds `DynamicFormSwitcherOptions` / `DynamicFormSwitcherHandle` to `component-library.d.ts` | Platform Team |
| **Integration: Integrations Install/Configure** | Replace JSON CodeEditor stopgap with DynamicFormSwitcher; ship 5–6 auth methods as local variant definitions | Platform Team |
| **Documentation** | README in CDN repo with usage examples covering all three selector styles + custom-field escape hatch | UI Team |
| **Future integrations** | Webhook event-type config, sync filter builder, notification channels | Platform Team (incremental) |

**Blocker for:** Integration auth UX cleanup (currently filed as TD-011 in `TECH_DEBT.md`).

---

## 15. Open Questions for the UI Team

1. **Selector "default":** when `showSelector` is unspecified, should we default to `false` (caller-driven, the more common case) or `true` (out-of-the-box useful)? We'd suggest `false` because it's the common case for embedding inside FormDialog, but happy to defer.
2. **Tab style on overflow:** if the consumer ships 8+ variants and uses `selectorStyle: 'tabs'`, what's the overflow UX — horizontal scroll, dropdown overflow menu, or wrap to a second row? We'd prefer dropdown overflow but it's an implementation call.
3. **Animation on variant change:** instant swap (current proposal) vs. cross-fade. Instant is simpler and accessibility-friendlier; cross-fade is showier but can confuse users. We'd suggest instant.
4. **Field-level reset:** should `reset()` reset all fields in the active variant, or all variants? Proposal: active only; callers can loop variants if they need a full reset.
5. **`onSubmit` in variants:** FormDialog allows fields to have field-level submit handlers in some configurations. Do we mirror that here, or keep submission strictly at the FormDialog/host level? Proposal: keep at host level — variants don't submit, they're just field groups.
