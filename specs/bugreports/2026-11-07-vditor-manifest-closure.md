# lib-manifest.json lists only vditor for a tree that serves more libraries

**Date**: 2026-11-07
**Component**: CDN, `/lib/vditor-3.11.2/` and `lib-manifest.json`
**Severity**: Low (a licence notice gap, not a security one)
**Status**: Fixed in #120, live 2026-11-08: `packages` adds diff-match-patch, and a new `bundled` field lists the prebuilt libraries (see `CDN_CONTRACT.md`). Lute is not on npm, so its entry carries `source`; plantuml-encoder's version is `null`. The apps generator needs a change to read `bundled`.
**Filed by**: Apps team (knobby.io apps repo)

---

## Summary

The apps build their third-party notices page from `lib-manifest.json`. Each
asset's `packages` field names the npm packages inside the file. For
`codemirror6` it names all 28, and that is exactly what the page needs.

For `vditor` and `vditor-css`, `packages` names only `vditor`. But the tree
also serves the libraries Vditor injects when a note needs them. These all
answer 200:

```
/lib/vditor-3.11.2/dist/js/lute/lute.min.js
/lib/vditor-3.11.2/dist/js/mermaid/mermaid.min.js
/lib/vditor-3.11.2/dist/js/katex/katex.min.js
/lib/vditor-3.11.2/dist/js/highlight.js/highlight.min.js
```

When a person writes a Mermaid block in Thinker, the browser runs Mermaid. The
apps owe Mermaid's notice, and they cannot see from the manifest that it
ships.

## What the apps team needs

List every library the tree serves under the vditor asset's `packages`, with
its version, as `codemirror6` does. Your contract already says the closure is
"the whole tree", so this records what is already there.

The apps' generator, `scripts/generate-third-party-notices.mjs`, will then
list them with no change on the apps side.
