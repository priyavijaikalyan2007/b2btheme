# A query language for search: the search bar's text form, and an expression builder

**From:** knobby.io apps, search and the Ontology Query API (knobbyio/apps#379, #376)
**Date:** 16 November 2026
**Component:** `components/facetsearch`, and a new expression builder component
**Severity:** A request for new work, not a defect. The apps build the API side first, so nothing here blocks them today.
**Status:** Open

The apps now have one query language for search, the Ontology Query API and legal holds. Its spec is `specs/search/query-language.spec.md` in knobbyio/apps. It extends the syntax FacetSearch already reads (#375) with `and`, `or`, `not`, brackets, nested searches and variables. The apps ask for two components that let a person write a query in it. The two are separate, and both edit the same query.

## The rule both components follow

The API decides what a query means. The components never do. The API has two calls for the components' host:

- **Parse** takes text and returns the query as a tree in JSON, plus each error with its start and end position in the text.
- **Print** takes a tree and returns its text.

The host calls these and hands the results to the components. A component may color text and suggest names as a person types, but an error shown to the person always comes from the API.

## 1. The search bar's text form

The bar shows text, never JSON. These are the parts of the language that the bar meets. The spec's §5 has the full grammar.

```
type:checklists.instance  created_at greater-or-equal 2026-11-01@kolkata
(rel.parent_of:X and rel.child_of:Y) or rel.stakeholder_of:Z
-"draft"  rel.signed_off_by where ( -rel.member_of:?org )
```

- **Only `and`, `or` and `not` are reserved.** Every other operator word, such as `in`, `on` and `after`, is a keyword only after a key. So `meeting in march` is three words of text.
- **Every operator has a word form,** and multi-word operators join with `-`, such as `starts-with` and `greater-or-equal`. Short forms and symbols also exist, such as `gte` and `>=`.
- **Values can be quoted text, numbers, dates with a zone suffix, variables (`?name`) or parameters (`$name`).**

**Asked:**

1. **Syntax coloring** from a TypeScript parser generated from the apps' ANTLR 4 grammar. The apps commit the grammar files in `querylanguage/` in knobbyio/apps. The TypeScript side is yours, and the ANTLR runtime comes from your CDN, under your library rule. How do you want to receive grammar changes: do you copy the `.g4` files, or should the apps publish them somewhere?
2. **Error marks from the host.** A call such as `setDiagnostics(errors)`, where each error has a start, an end and a sentence. The bar underlines each range and shows the sentence on hover or focus.
3. **Suggestions from the host** for keys, values and time zones, in the style of today's `loadValues`. Zones are IANA names, offered by city as a person types, so `kol` offers `Asia/Kolkata`.
4. **Chips and complex text.** Today each top-level filter becomes a chip. A query with `or`, brackets or nested searches does not fit one chip per filter. Please decide how the bar shows such a query, and tell the apps. One choice is chips for top-level filters joined by `and`, and plain colored text for the rest.
5. **Theme tokens for syntax colors.** Keywords, keys, operators, values, variables and errors each need a token. The apps never add their own colors.

## 2. An expression builder

A visual editor for the same query, for people who would rather not type it. It edits the tree that Parse returns. The spec's §11 lists the node kinds:

| Node | Fields |
|---|---|
| `and`, `or` | `children` |
| `not` | `child` |
| `text` | `phrase` |
| `filter` | `key`, `op`, `value` or `values`, optional `link` |
| `nested` | `key`, `where`, optional `link` |
| `compare` | `left`, `op`, `right`, each a variable |

**Asked:**

1. **Groups.** Add, remove and nest `and`, `or` and `not` groups.
2. **Filters.** Pick a key, then an operator that fits the key's type, then a value. The host supplies the key catalog. Each key comes with its type, its allowed operators by name, and a value loader.
3. **Nested searches and `link ( … )` conditions,** each of which holds its own group.
4. **Variables.** Most people never type a variable. The builder offers "the same person as…" and creates the `?name` itself.
5. **An event when the tree changes.** The host then calls Print and updates the bar. When the person types in the bar, the host calls Parse and gives the builder the new tree.

The builder needs no checking of its own beyond the catalog. The host sends Parse's errors to it with each node's position.

## 3. What the apps' search page needs before it switches

The apps' search page keeps today's FacetSearch and today's syntax until the new bar ships. The apps then switch the page and the API together. Two things in today's FacetSearch block the switch:

1. **Several values on one key.** With `multiple: true`, two chips on one key write `type:a type:b`. In the new language, two filters on one key mean `and`, so that finds nothing. The bar needs to write `type in (a, b)` for "either", and draw it as one chip or as one chip per value, whichever reads better.
2. **The API's text for the query.** After each search, the page shows the API's own text for what it applied. That text now uses the standard spelling, such as `type equals "thinker.session" and created_at on-or-after 2026-11-01@Asia/Kolkata`. FacetSearch cannot draw a chip from `type equals "x"`. The new bar needs to read the standard spelling, and draw chips from it where it can.

The page also has buttons outside the bar, for types and for starred items. Each button adds or removes one value of one filter. The bar needs a way to do that without the host rewriting the bar's text, such as `addValue(key, value)` and `removeValue(key, value)`. The page then sends the bar's text to the API, which does all the reading.

**Asked:** please tell the apps when a bar with these three abilities is ready, so they can plan the switch.

## 4. A time-zone choice next to the bar

A date in a query depends on the time zone. The page starts with the browser's zone, and the person can change it. The apps ask for the `TimezonePicker` to sit next to the bar, or inside it, in a compact form. The page sends the chosen zone with each search.

## Timing

The apps build the API first: the parser, the printer, and the compiler for nested searches and variables. The two calls above will exist before the components need them. The apps will add a note to this folder when the calls ship, with their exact request and response shapes.

The apps' search page does not change until the new bar is ready. Today's FacetSearch keeps working as it does now.
