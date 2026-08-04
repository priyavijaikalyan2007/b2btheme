<!-- AGENT: Reference for the Surface contract — the three conformance levels, the additive emitChannel pattern, and how to make an existing component canvas-capable. -->

# Surface Contract

The uniform contract a canvas-mounted component satisfies. Defined by **ADR-141**, enforced by `runtime/fleet-conformance.test.ts`, which runs as part of `npm test`.

---

## 1. The three levels

| Level | Handle must expose | Applies to |
|---|---|---|
| `display` | `destroy()` | Renderers and chrome with no value and no events |
| `field` | `display` + `getValue` / `setValue` / `onChange` (ADR-134) | Value-bearing controls |
| `surface` | `display` + `setData` / `on` / `getState` / `setState` | Anything the canvas wires to another component |

> The level is **verified by the conformance suite, never self-declared.** A manifest claiming `surface` while failing the suite fails the build.

Pick the lowest level that is honest. A component declared `display` is still resolvable, mountable and virtualizable — it simply cannot be wired. Over-declaring produces a failing build; under-declaring produces a component the canvas cannot bind, which is a smaller problem and easily corrected later.

---

## 2. The contract

```typescript
interface Surface
{
    /** Fill a declared slot. Must be idempotent for equal input. */
    setData(slot: string, value: unknown): void;

    /** Subscribe to a declared channel. Returns an unsubscribe function. */
    on(channel: string, handler: (payload: unknown) => void): () => void;

    /** Serialisable view state, limited to the manifest's stateKeys. */
    getState(): Record<string, unknown>;

    /** Restore state produced by getState(). Partial input allowed. */
    setState(state: Record<string, unknown>): void;

    /** Tear down listeners and remove DOM. MUST be idempotent. */
    destroy(): void;
}
```

### What "state" means

**What is needed to restore the view — not everything the component knows.**

Declare the keys in the manifest's `stateKeys`; `getState()` must return only those keys, and every value must be JSON-serialisable because the host persists it. Scroll position, sort, expansion, selection — declared, not discovered.

This bound is what makes the obligation finite. Without it, "capture the state" is an unbounded request.

---

## 3. The additive guarantee (CRITICAL)

Adding the Surface contract to an existing component **must not change any existing behaviour**. Constructor callbacks (`onSelect`, `onChange`, …) are permanent public API and must keep firing **first**.

The pattern, used identically by DataGrid and TreeView:

```typescript
private emitChannel(
    channel: string,
    legacy: () => void,
    payload: unknown): void
{
    legacy();   // subscriber zero, unguarded — never let a channel displace it

    for (const handler of this.channelHandlers.get(channel) ?? [])
    {
        try { handler(payload); }
        catch (err) { logError(`Channel "${channel}" handler threw`, err); }
    }
}
```

Then replace each callback site:

```typescript
// Before
this.options.onRowSelect?.(Array.from(this.selectedIds));

// After
this.emitChannel(
    "selection",
    () => this.options.onRowSelect?.(Array.from(this.selectedIds)),
    this.getSelectedRows());
```

Note the payloads may legitimately differ: the legacy callback keeps its exact historical contract (row IDs), while the channel carries what a binding actually wants (records). Existing consumers see no change, which is the point.

Declare the pairing in the manifest so the suite can assert it:

```typescript
emits: [
    { name: "selection", payload: "record", multi: true,
      legacyOption: "onRowSelect" }
]
```

That `legacyOption` is what turns "additive" from a claim into a test.

---

## 4. Retrofitting an existing component

The shape is mechanical and was identical across two very different components.

1. **Add a channel map** beside the other private state:
   ```typescript
   private readonly channelHandlers =
       new Map<string, Set<(payload: unknown) => void>>();
   ```
2. **Add `on()`** returning an unsubscribe closure.
3. **Add `emitChannel()`** and route every existing callback site through it.
4. **Add `setData()`** delegating to the component's own domain method. If the manifest claims the slot accepts a `collection`, `setData` must genuinely accept a plain collection — adapt the shape rather than weakening the claim.
5. **Add `getState()`/`setState()`** over the declared `stateKeys`.
6. **Clear the channel map in `destroy()`**, and make `destroy()` idempotent.
7. **Write the manifest**, remove the component from `EXEMPT`, run `npm test`.

For a `field`-level component that already satisfies ADR-134, steps 1–6 are usually unnecessary: `setValue` already *is* `setData("value", …)`.

---

## 5. Things the gate will catch

Learned the hard way during the pilot:

- **Unbound `this`.** The checker calls handle methods with `this` bound to the handle. Class instances work; a method extracted and called detached does not.
- **A manifest that lies.** Declaring `accepts: collection` while requiring an internal envelope fails the slot-fill check.
- **DOM left behind.** `destroy()` must remove everything the component added — the canvas mounts and unmounts continuously, so a leak compounds.
- **A non-idempotent `destroy()`.** Lifecycle may call it on an already-demoted node.
- **Undeclared state keys**, or state that JSON silently discards (functions, `undefined`).
- **Fixtures in `defaultOptions`.** That field is *shipped*; mount fixtures belong in `<name>.conformance.ts`.

---

## 6. Conformance glue

Some components need help being tested. Add `components/<name>/<name>.conformance.ts`:

```typescript
export const CONFORMANCE_GLUE =
{
    /** Mount fixture. NOT in the manifest — defaultOptions is shipped data. */
    options: { columns: [{ id: "id", label: "ID" }] },

    /** Drive a channel so the suite can verify it. */
    trigger: (channel: string, handle: Record<string, unknown>): boolean =>
    {
        if (channel === "selection")
        {
            (handle as { selectRow(id: string): void }).selectRow("r1");
            return true;
        }

        // Returning false records a visible warning rather than a false pass.
        return false;
    }
};
```

Returning `false` is the honest answer for a channel with no programmatic entry point — DataGrid's `activate` fires only from a row double-click. The gate records a warning, so the gap stays visible instead of silently passing.

---

## 7. Components that are not canvas-capable

A service, an element builder, a boot script, or a modal overlay belongs in `NOT_MOUNTABLE` in the gate **with a written rationale** — not in `EXEMPT`, which means "migration pending" and is expected to reach zero.

MarkdownRenderer is the canonical example: `createMarkdownRenderer(opts)` returns `{render, toHtml}`. It has no host, owns no DOM, and has no lifecycle. It is a service that consumers call, not a component a canvas can mount.

---

## Related

- [DYNAMIC_UI_GUIDE.md](DYNAMIC_UI_GUIDE.md) — concepts and the host contract
- [CAPABILITY_MANIFEST.md](CAPABILITY_MANIFEST.md) — authoring the manifest
- `AGENTS.md` — the new-component checklist
- ADR-134 (field contract), ADR-141 (this contract), ADR-144 (factory styles)
