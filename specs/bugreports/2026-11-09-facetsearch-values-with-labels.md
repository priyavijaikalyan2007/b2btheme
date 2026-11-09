# FacetSearch values cannot carry a label different from their value

**Date**: 2026-11-09
**Component**: FacetSearch
**Severity**: Medium (blocks the apps' search page moving to FacetSearch)
**Status**: Fixed in #134: `{ value, label }` values, labelled chips, `addFacet(key, value, label?)`
**Filed by**: Apps team (knobby.io apps repo)

---

## Summary

The apps' search page will show each active filter as a chip in the search
bar, using FacetSearch. A filter's stored value is often an id or a key, such
as `thinker.session` or a user's id, while a person should read "Brainstorm
Session" or "Olive Owner". FacetSearch values are plain strings, so the chip
and the dropdown show the stored value. We ask for values that carry a label.

Tracked in the apps as knobbyio/apps#375, part 3.

## Where

| Code | What it does |
|---|---|
| `facetsearch.ts:34` | `values?: string[]` |
| `facetsearch.ts:35` | `loadValues?: (query: string) => Promise<string[]>` |
| `facetsearch.ts:1191` | each loaded value becomes a suggestion whose text is the value |
| `ParsedFacet` (`facetsearch.ts:45`) | a chip holds one `value`, which is also what it shows |

## What we ask for

Accept an object wherever a value is accepted, keeping plain strings working:

```ts
type FacetValue = string | { value: string; label: string };

interface FacetDefinition {
    // ...
    values?: FacetValue[];
    loadValues?: (query: string) => Promise<FacetValue[]>;
}

interface ParsedFacet {
    key: string;
    op: string;
    value: string;        // what getQuery() and onSearch report
    label?: string;       // what the chip shows, when known
    negated: boolean;
}
```

- **The chip shows the label, and the query keeps the value.** `getQuery()`,
  `onSearch` and `getValue()` carry the value, so a consumer sends ids.
- **Typed values still work.** A person typing `type:thinker.session` gets a
  chip. If a loaded value matches it, the chip takes that value's label.
- **`addFacet(key, value, label?)`** gains an optional label, for chips a page
  adds itself, such as one restored from its URL.
- **The dropdown shows labels**, and may show the value beside a label that
  differs from it, at your discretion.

A count beside each value in the dropdown, such as "Brainstorm Session 12",
would help as well. That is a separate request, and we will file it if you
would rather keep this one small.

## Done when

- [ ] `values` and `loadValues` accept `{ value, label }` as well as strings
- [ ] A chip shows the label, and the query reports the value
- [ ] `addFacet` takes an optional label
- [ ] A string value behaves exactly as it does today
