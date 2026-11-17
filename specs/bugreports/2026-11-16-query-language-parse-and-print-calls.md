# The query language's parse and print calls now exist

**From:** knobby.io apps, search (knobbyio/apps#379)
**Date:** 16 November 2026
**Component:** `components/facetsearch`, and the expression builder
**Severity:** A note, not a defect. It follows the request of the same day, `2026-11-16-query-language-search-bar-and-expression-builder.md`.
**Status:** Open, for your reading

That request said the apps would write here when the two calls ship. They now exist in the apps' API. Nothing on the apps' search page uses them yet. The page keeps today's FacetSearch until your new bar is ready.

## The rule, again

The API decides what a query means. The bar and the builder show it and edit it. Every error a person sees comes from these calls.

## Parse

`POST /api/v1/search/query/parse`, with the session cookie, as every API call has.

The body:

```json
{ "text": "type:note created_at on 2026-11-15", "zone": "kolkata", "mode": "search" }
```

- `text` is what the person typed.
- `zone` is the zone the page carries, such as the browser's. A date with no zone of its own is read in it. It may be left out. A query with a date and no zone anywhere then answers with the error `QL_ZONE_REQUIRED`.
- `mode` is `search` or `ontology`, and `search` when left out.

The answer is always a 200, even with errors, because the bar sends text a person has not finished typing. It holds `tree`, `text`, `errors` and `warnings`. With errors, `tree` and `text` are left out. The API leaves out every field that has no value, as all its calls do.

This is the answer for the body above, from the running API:

```json
{
  "tree": {
    "root": {
      "kind": "and",
      "children": [
        { "kind": "filter", "key": "type", "op": "Equals", "value": { "text": "note" }, "span": { "start": 0, "end": 9 } },
        { "kind": "filter", "key": "created_at", "op": "On", "value": { "date": "2026-11-15", "zone": "Asia/Kolkata" }, "span": { "start": 10, "end": 34 } }
      ],
      "span": { "start": 0, "end": 34 }
    },
    "return": []
  },
  "text": "type equals \"note\" and created_at on 2026-11-15@Asia/Kolkata",
  "errors": [],
  "warnings": []
}
```

- `text` is the standard spelling. It is what the store keeps, and what the bar shows once the person stops typing.
- `tree` is the tree of the spec's §11. Each node from parse has a `span`, so the builder can place an error on the right node.

Text a person has not finished, such as `budget (type:`, answers like this:

```json
{
  "errors": [
    {
      "code": "QL_UNCLOSED_BRACKET",
      "title": "A bracket is not closed",
      "detail": "The `(` at column 8 is never closed.",
      "suggestion": "Add a `)` to close it.",
      "start": 7,
      "end": 8
    }
  ],
  "warnings": []
}
```

## Print

`POST /api/v1/search/query/print`, with this body:

```json
{ "tree": { "root": { "kind": "filter", "key": "type", "op": "Equals", "value": { "text": "note" } } }, "zone": "kolkata", "mode": "search" }
```

- `tree` is a tree in the shape parse answers with. Print ignores `span`.
- `zone` and `mode` mean what they mean for parse.

Print checks the tree exactly as parse checks text, so the builder cannot save a query the API would refuse. It answers in one of two ways:

- **A 200** with `text`, `tree` and `warnings`. For the tree that parse returned above, `text` is again `type equals "note" and created_at on 2026-11-15@Asia/Kolkata`.
- **A 400** with `message` and `errors`, when the tree is broken or does not check. A broken tree names the part that is wrong, such as ``The tree's node at root.children[1] has no `key`.``

## The error shape

Each error and each warning has these fields:

| Field | What it holds |
|---|---|
| `code` | A code such as `QL_UNKNOWN_KEY`. A code never changes once it ships. |
| `title` | A short summary. |
| `detail` | One sentence that says what is wrong, in plain words. |
| `suggestion` | What to do about it. Left out when there is none. |
| `start`, `end` | Where it is in the text, from `start` up to, but not including, `end`. Left out for an error with no position. |

`start` and `end` count UTF-16 characters, as a JavaScript string does. So `text.slice(start, end)` is the part to underline.

A warning never stops a query. One example is `QL_SEARCHED_AS_TEXT`: a word such as `typ:note` is not a filter, so it was searched as text, and the warning says "Did you mean `type`?".

## The grammar

The grammar files are `querylanguage/Grammar/QlLexer.g4` and `querylanguage/Grammar/QlParser.g4` in knobbyio/apps. The apps generate C# from them with ANTLR 4.13.1, the version NuGet's runtime has. Generated code must match its runtime, so use the 4.13 line for TypeScript too, and tell the apps which version you pick.

The first request asked how you want to receive changes to the grammar. That question is still open.
