<!-- AGENT: QueryLanguage colors the apps' query language with a lexer and parser generated from the apps' ANTLR grammar. FacetSearch uses it with syntax "query". It never reports an error. -->

# QueryLanguage

The syntax colors of the apps' query language (#205). It reads text with a lexer and parser that ANTLR generated from the apps' own grammar, and says which ranges are keywords, keys, operators, values and variables. So the bar colors a query exactly as the API reads it: `in` after a key is an operator, and the `in` of `meeting in march` is plain text.

It renders nothing. FacetSearch uses it to color its text with `syntax: "query"`. It never reports an error. Errors come from the API's Parse call, which FacetSearch shows (#206).

## Quick Start

Load the ANTLR runtime from `/lib/` first, then this component:

```html
<script src="https://static.knobby.io/lib/antlr4-4.13.1.js"
        integrity="sha384-sjwAsKajwyLSsMXfBQL37gbVWSirPDfpidJvW0cp0DwACSyx2M5VK98dp0HPPzmr" crossorigin="anonymous"></script>
<script src="https://static.knobby.io/components/querylanguage/querylanguage.js"></script>
```

```js
colorQuery("type in (note, task) meeting in march");
// [{ start: 0, end: 4, kind: "key" }, { start: 5, end: 7, kind: "operator" },
//  { start: 9, end: 13, kind: "value" }, { start: 15, end: 19, kind: "value" }]
```

Without the runtime, `querylanguage.js` throws as it loads, and names the file to load.

## Assets

| Asset | Path |
|-------|------|
| JS    | `components/querylanguage/querylanguage.js` |
| ANTLR runtime | `/lib/antlr4-4.13.1.js`, with its SRI hash in `/lib-manifest.json` |

## API

| Function | Signature | Description |
|----------|-----------|-------------|
| `colorQuery` | `(text: string) => QueryColorRange[]` | The colored ranges of `text`, in order. Plain text has no range. It never throws for text a person has not finished: the parser recovers, and a token it could not place has no color |

A `QueryColorRange` is `{ start, end, kind }`. `start` and `end` count UTF-16 units, as a JavaScript string does, up to but not including `end`. `kind` is one of these, each with its theme token:

| `kind` | What it is | Token |
|--------|------------|-------|
| `keyword` | `and`, `or`, `not`, `-` and `!` before a term, `where`, `link`, `return` | `--theme-query-keyword` |
| `key` | The key of a filter, such as `type` or `rel.parent_of` | `--theme-query-key` |
| `operator` | `:`, a symbol such as `>=`, a word such as `on-or-after` or `contains`, and `in`, `is`, `exists` and `missing` after a key | `--theme-query-operator` |
| `value` | A filter's value: text, a number, a date with its zone, a relative date or a boolean | `--theme-query-value` |
| `variable` | A variable such as `?org`, or a parameter such as `$max` | `--theme-query-variable` |

## The grammar

The grammar is the apps' (`querylanguage/Grammar/` in knobbyio/apps). It is copied into `grammar/` here, and the lexer and parser in `generated/` are made from it with ANTLR 4.13.1, the version the apps use. Generated code must match its runtime, so `/lib/antlr4-4.13.1.js` is the same version.

**A grammar change reaches this repo as a request** in the apps' bugreports folder. It names the knobbyio/apps commit to copy the two `.g4` files from. Then:

1. Copy `QlLexer.g4` and `QlParser.g4` from that commit into `components/querylanguage/grammar/`.
2. Run `npm run generate:querylanguage`. It needs Java. It downloads the ANTLR 4.13.1 jar once, checks its checksum, and writes `generated/`.
3. Commit the grammar and `generated/` together.

`generated/grammar.stamp` holds a hash of the grammar and the ANTLR version, and a hash of the generated code. A unit test fails when the grammar changed without step 2, and when someone edited the generated code by hand. So CI needs no Java.

The grammar here was copied from knobbyio/apps commit `37b357a5` (16 November 2026).

## Dependencies

- The ANTLR 4.13.1 JavaScript runtime, from `/lib/antlr4-4.13.1.js` (BSD-3-Clause).
- Nothing else. It does not need Bootstrap.
