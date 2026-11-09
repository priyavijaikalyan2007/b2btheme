# Integrity hashes for the renderers Vditor loads itself

**Date**: 2026-11-07
**Component**: CDN `/lib/vditor-3.11.2/`, MarkdownEditor
**Severity**: Low (the files come from your origin already; this closes the last unhashed step)
**Status**: Fixed in #125: the `vditor-integrity` asset, `/lib/vditor-integrity-3.11.2.js` (the proposal, as a new entry so the tree stays verbatim). `J` refuses MathJax
**Filed by**: Apps team (knobby.io apps repo)

---

## Summary

Thinker edits notes with MarkdownEditor, which wraps Vditor. The apps load
Vditor's entry file from `/lib/vditor-3.11.2/dist/index.min.js` with its
hash. When a note needs a renderer, Vditor adds that script to the page
itself. It does so with no `integrity` attribute.

`CDN_CONTRACT.md` already states this as a known residual: "vditor cannot reach the
same assurance as the single-file assets without patching it". This request
asks for that patch. It is small, because the entry file is already hashed.

## How Vditor loads its files today

Read from the served `index.min.js`. Vditor has three loaders:

| Loader | How it loads | What it loads |
|---|---|---|
| `G` | Adds `<script src async>` | Lute (3.9 MB, always), highlight.js, KaTeX, mhchem, Mermaid, ECharts, Graphviz, flowchart, markmap, abcjs, PlantUML encoder, smiles-drawer |
| `c` | Adds `<link rel="stylesheet">` | KaTeX's stylesheet, highlight.js themes, the content theme |
| `J` | Synchronous XHR, then an inline script from the text | MathJax only |

Each loader skips a file whose element id is already on the page.

## The proposal

When you vendor Vditor, compute the SHA-384 of every file in the tree that `G`
and `c` load, and write the table into the vendored `index.min.js`. Then patch
`G` and `c` so that each element they add gets:

```js
el.integrity = HASHES[pathWithinTree];
el.crossOrigin = "anonymous";
```

A path with no entry in the table should throw, not load unchecked. That
matches your fail-fast rule.

**Why the table can live inside the entry file:** the apps load
`index.min.js` with its hash. So the table is covered by that hash, and each
renderer is covered by the table. One hash in the page vouches for the whole
tree.

**`J` and MathJax.** A script inserted from text cannot be checked by the
browser. MarkdownEditor sets `math: { engine: "KaTeX" }`, so the apps never
take this path. Either patch `J` to throw, or note in the contract that MathJax
is unsupported over `/lib/`.

**The manifest.** Please also list every package the tree serves under the
`vditor` asset's `packages`, with versions. The apps build their licence
notices from that list. This is the same request as
`2026-11-07-vditor-manifest-closure.md`.

## Alternatives considered

- **MarkdownEditor adds the tags first, with hashes**, using the element ids
  Vditor checks for. This needs no patch to Vditor. But `G` treats a matching
  id as "already loaded" and returns at once, before the file has run. A
  renderer would then be called while it is still undefined. Not recommended.
- **Load every renderer up front, hashed.** Correct, but Mermaid and ECharts
  together are several megabytes that most notes never use.

## How the apps will check it

The apps' `VendoredLibraryTests` will open a Thinker note with a Mermaid block
and a KaTeX formula. It will check that each renderer request carries
`integrity`, and that the browser accepts it.
