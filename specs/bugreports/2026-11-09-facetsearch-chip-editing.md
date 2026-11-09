# FacetSearch: editing one chip, labels learned later, and quotes in a value

**From:** knobby.io apps, search results page (knobbyio/apps#375)
**Date:** 9 November 2026
**Component:** `components/facetsearch`
**Severity:** Low. The apps work around all three today, and each workaround costs something.
**Status:** Fixed in #137: the writer escapes quotes, `removeFacet(key, value?)`, and `learnLabels(key, values)` (the second option). The `showKeysOnFocus` observation was not built

The apps' search page now draws every filter as a FacetSearch chip. The bar's text goes to the apps' API, which reads it and says what it applied, with a label for each value. The page then shows chips for what the API applied. Three gaps showed up while building it.

## 1. A value with a quote is written so it does not read back

`buildRawFromChipsAndInput` quotes a value that holds a space. It does not escape a `"` inside the value. `parseFacetQuery` already reads `\"` inside quotes as a quote, so only the writer is missing it.

**Steps.** `addFacet("title", 'say "hi"')`, then `getValue()`.

**Seen.** `title:say "hi"`. Parsed back, that is the facet `title:say` and the text `"hi"`.

**Expected.** `title:"say \"hi\""`, which `parseFacetQuery` reads back as the one facet with the value `say "hi"`.

**Asked.** In the writer, quote a value that holds a space **or** a quote, and write each `"` inside it as `\"`.

## 2. `removeFacet` takes a key, so one of several chips on a key cannot be removed

With `multiple: true`, a key can hold several chips, such as `type:a type:b`. `removeFacet(key)` removes all of them. The apps' type buttons toggle one type each. To take out only `type:b`, the page has to write the whole bar again without it.

**Asked.** `removeFacet(key, value?)`. With a value, remove only the chips on that key with that value. Without one, behave as today. Fire `onFacetRemove` once per call, as today.

## 3. A label learned after the bar was made cannot be given to it

Labels come from `values` when the bar is made, or from a `loadValues` answer. The apps learn a value's label later, from their API's answer to a search, such as the name of a folder in a shared link. The only way to show it is to destroy the bar and make it again with the label in `values`. That loses focus and the caret, and the apps have to put them back.

**Asked.** One of these, whichever fits the component better:

- `setValues(key, values: FacetValue[])`, which replaces a facet's `values` and relabels its chips, or
- `learnLabels(key, values: FacetValue[])`, which only adds labels and relabels the chips that match.

Either way, the chips already in the bar should show the new labels at once, and no `onFacetAdd`, `onFacetRemove` or `onChange` should fire, because nothing the person chose has changed.

## An observation, not a request

Focusing an empty bar opens the list of filter keys. On the apps' results page that list covered the type buttons below the bar, so a click on a button landed on the list. The page no longer focuses the bar when it loads. If a host may want focus without the list, a `showKeysOnFocus` option (default `true`) would allow it.
