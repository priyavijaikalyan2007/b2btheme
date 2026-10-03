# Four pickers fabricate a setting value when they fail to mount

**From:** the apps repo (`knobbyio/apps`).
**Type:** bug report, with specific lines.
**Severity:** data loss in a consuming app, not a visual defect.
**Context:** `2026-10-03-fail-fast-over-fallback.md` explains why we went looking.
That report asked for a policy change. This one names code.

---

## Summary

When a picker cannot find its container it returns a null-object API. Four of those
return a **plausible fabricated value** from `getValue()`. A host that reads
`getValue()` to persist the user's setting saves the fabrication instead, and the
user's real setting is overwritten.

This is the same shape that destroyed production data in our repo last week, where
a mock graph answered `serialize()` with an empty document and the autosave wrote
it over live sessions.

## The four

| File | Line | `getValue()` returns |
|---|---|---|
| `components/orientationpicker/orientationpicker.ts` | 576 | `"portrait"` |
| `components/columnspicker/columnspicker.ts` | 624 | `{ name: "One", columns: 1, widths: [1] }` |
| `components/spacingpicker/spacingpicker.ts` | 588 | `nullPreset` |
| `components/toolcolorpicker/toolcolorpicker.ts` | 734 | `nullColor` |

`orientationpicker` is the clearest, so take it as the worked example:

```ts
// orientationpicker.ts:187
const container = resolveContainer(options.container);
if (!container)
{
    logError("container not found:", options.container);
    return createNullPicker();
}

// orientationpicker.ts:576
function createNullPicker(): OrientationPicker
{
    const noop = createElement("div", []);
    return {
        getValue: () => "portrait",   // <-- fabricated
        setValue: () => {},
        ...
    };
}
```

## Why this is a correctness problem and not a tidiness one

A host saving a page setup does roughly this:

```ts
await api.savePageSetup({ orientation: picker.getValue() });
```

If the picker failed to mount, that call persists `"portrait"` over a user's
landscape setting. The host has no way to know: the returned object satisfies
`OrientationPicker` completely, so it is indistinguishable from a working picker
by type, by shape, and by behaviour at the call site.

**The deciding question is whether a caller can tell "the user chose portrait"
from "I could not find out what the user chose".** Here it cannot, and the second
answer gets persisted as the first.

`setValue()` being a no-op makes it worse rather than better. A host that sets the
stored value into the picker on load, then reads it back on save, sees its own
write silently discarded and replaced with the default.

## What is right about the current code

Worth saying, because the fix is narrow.

`logError` / `logWarn` is called before returning. That satisfies the first of the
two clauses — it does not claim success. Our `createFallbackGraph` logged
`initialized`, which was worse. The remaining problem is purely the second clause:
**a component that failed to initialize must not participate in a write**, and
answering `getValue()` is participating.

## Not a problem, listed so nobody spends time on it

These six are also null-object factories and are fine. They build a **visible
degraded DOM element** — a plain badge instead of a styled one, an initials avatar
instead of a photo. They announce themselves on screen and nothing reads a setting
back out of them.

```
components/graphlegend/graphlegend.ts:309          buildFallbackBadge
components/markdownrenderer/markdownrenderer.ts:644 buildFallbackHandle
components/peoplepicker/peoplepicker.ts:190        buildFallbackChip
components/peoplepicker/peoplepicker.ts:210        buildFallbackAvatar
components/presenceindicator/presenceindicator.ts:168 buildFallbackAvatar
components/visualtableeditor/visualtableeditor.ts:3046 buildFallbackToolbar
```

`layoutpicker.ts:1147` is in between: it fabricates only `getElement()`, returning
a detached div. No setting is invented, so it cannot cause the write above, but a
host appending that element gets nothing and no error. Lower priority, same
direction of fix.

## Suggested fix

Any of these three would close it. Our preference is the first.

**1. Throw instead of returning a stand-in.** A missing container is a host
programming error — a selector that does not match, or a call before the element
exists. It is not a runtime condition to absorb, and throwing puts the failure
where it can be fixed.

```ts
if (!container)
{
    throw new Error(
        `[OrientationPicker] container not found: ${String(options.container)}`);
}
```

**2. If a factory must not throw, make the failure part of the return type**, so
the host has to handle it:

```ts
export type PickerResult<T> =
    | { ok: true; picker: T }
    | { ok: false; reason: string };
```

**3. If the null object stays, `getValue()` must refuse rather than answer.**

```ts
getValue: () => { throw new Error('[OrientationPicker] not mounted'); },
```

This keeps the current signature but makes the dangerous read impossible. It is
the smallest change and it is what we did on our side — our canvas now throws from
`serialize()` rather than reporting an empty document.

## One test will need updating, and it is worth looking at

`components/orientationpicker/orientationpicker.test.ts:86`
(`Factory_InvalidContainer_LogsError`) constructs a picker with a bad container,
asserts the error is logged, and then calls `picker.destroy()`.

To be accurate about this: **it does not assert the dangerous read.** It never
checks `getValue()` after a failed mount. But it does depend on the factory
returning an object, so fix option 1 above would break it, and the fix is to
expect a throw instead.

We mention it because of how the equivalent defect survived on our side. A test in
our repo *was* asserting the buggy behaviour — it expected a usable graph when the
library was absent — so the bug was pinned in place by a passing test. Yours is
not that, but it is adjacent to it, and the shape is worth recognising.

## What we would ask beyond the four

A test per picker asserting that a failed mount **cannot** produce a value, rather
than only that it logs. "Logs an error" and "cannot be read from" are different
properties, and only the second one prevents the write described above.
