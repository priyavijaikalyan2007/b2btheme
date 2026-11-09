# CommandPalette cannot show results that come from a server

**Date**: 2026-11-09
**Component**: CommandPalette
**Severity**: Medium (blocks `Ctrl+K` search in the apps, a planned surface)
**Status**: Fixed in #133: the `source` option (shown as given, after the matching commands)
**Filed by**: Apps team (knobby.io apps repo)

---

## Summary

The apps want `Ctrl+K` to search everything a person can see, with results
inline as they type. The results come from our search API, ranked by it.
CommandPalette searches a fixed list of commands it already holds, and it
cannot show results it is handed, as they are ranked. We ask for a source the
palette calls as the person types, whose results it shows in the order given.

Tracked in the apps as knobbyio/apps#375, part 1.

## Why the current options do not work

`onSearch(query)` tells us what was typed, and `setCommands(cmds)` can replace
the list. Together they look enough, and they are not:

| Code | What happens |
|---|---|
| `commandpalette.ts:705` `onInputChange()` | Renders at once from the commands it holds, before any fetch from `onSearch` can return |
| The fuzzy search (README, "Fuzzy Search") | Filters and reorders every command by how well its label matches the query |

So a result found by the words inside a document, whose title does not
contain them, is filtered out after we hand it over. Our ranking is replaced
by a label match. And a slow response can land after a newer query's.

## What we ask for

A source option, beside `commands`:

```ts
interface CommandPaletteOptions {
    // ...
    /**
     * Called as the person types, after a short debounce. Its results are
     * shown as given: not filtered, not reordered, and not highlighted by
     * label match. A result for an older query than the input holds is dropped.
     */
    source?: (query: string, signal: AbortSignal) => Promise<PaletteResult[]>;
    /** Shown while the source has not answered, and when it answers with none. */
    sourceLoadingText?: string;
    sourceEmptyText?: string;
}

interface PaletteResult {
    id: string;
    label: string;
    description?: string;     // such as where the item lives
    icon?: string;            // a full class, such as "bi bi-diagram-3"
    category?: string;        // grouping, such as "Diagrams"
    action: () => void | Promise<void>;
}
```

- **Shown as given.** The source has already ranked them.
- **Commands still work.** Registered commands show alongside, matched as
  today, so "Open Settings" and a document can appear in one palette. Their
  order relative to each other is your call. Commands first is fine.
- **Stale answers dropped.** Abort the previous call's `signal` when the query
  changes, and ignore an answer for a query the input no longer holds.
- **A failure is said, not swallowed.** If the promise rejects, show a short
  message in the list. The apps log their own error.
- **Highlighting is optional.** We can send no highlight, or a list of matched
  ranges, if you would like to support that later.

## Done when

- [ ] A `source` option, called with the query and an `AbortSignal`, after a debounce
- [ ] Its results are shown in the order given, with no fuzzy filtering
- [ ] A slower answer for an older query never replaces a newer one
- [ ] Loading, empty and failed states are shown in the list
- [ ] Registered commands still match and show alongside
