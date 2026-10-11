<!--
SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
SPDX-FileCopyrightText: 2026 Outcrop Inc
SPDX-License-Identifier: MIT
Repository: enterprise-bootstrap-theme
File GUID: 4c1f93a7-6e0b-4a52-8d31-7f5b2ac9e014
Created: 2026
-->

<!-- AGENT: Migration guide for the required seventh host function, onResolveAnchor (ADR-161). -->

# Migration guide: the host interface now has seven functions

**Date:** 11 October 2026
**Change:** `DynamicUIHost.onResolveAnchor` is required (ADR-161)
**Audience:** the apps team
**Priority:** act before you implement `DynamicUIHost`, not after

## What changed

`DynamicUIHost` declared six functions. It now declares seven. The new member
is required:

```typescript
onResolveAnchor(anchor: EntityAnchor, nodeId: string): HTMLElement | null;
```

The canvas uses it to turn a content anchor into the element that holds that
content now. A content anchor is `{ kind: "entity", entityId, selector? }`, and
it is the only anchor that survives a reflow. The runtime accepted this anchor
before 11 October 2026 and then ignored it, so an annotation that used it was
attached to nothing.

## Who this affects, and when

Nobody is broken today. No code in the theme repository implements
`DynamicUIHost`, and the apps team has not implemented it yet. A search for the
type finds the declaration, two specifications and two guides.

The change was made now for that reason. Adding a required member before the
first implementation costs one function in that implementation. Adding it after
costs a migration across every host.

If you have started a host since 11 October 2026, TypeScript will report the
missing member. That report is the whole migration.

## What to write

Return the element that currently displays the content the anchor names. The
simplest honest implementation looks in your own rendered DOM:

```typescript
onResolveAnchor(anchor, nodeId)
{
    // `nodeId` is the ANNOTATED node, the comment itself. A content anchor
    // names no target component, which is why you are being asked.
    const quote = anchor.selector?.quote as string | undefined;

    return document.querySelector<HTMLElement>(
        `[data-entity-id="${anchor.entityId}"]`)
        ?? (quote ? findByQuote(quote) : null);
}
```

Four rules govern what you return.

1. **Be synchronous.** Overlay positions are refined on every scroll frame, so
   the signature returns an element rather than a promise. Resolve from state
   you already hold. The canvas calls this once per render, reuses the element
   while it stays in the DOM, and never calls it from the scroll path, so a
   `querySelector` is affordable and a network call is not.
2. **Return `null` when you cannot find the content.** Do not return a
   substitute element. `null` is a supported answer with a defined result: the
   canvas marks the note orphaned, keeps it visible, keeps it in the document,
   and asks again on the next render.
3. **Return an element inside a mounted canvas component.** The canvas refuses
   an element that is outside its own frames, inside another canvas, or inside
   the annotated node's own frame.
4. **Use `selector` when one `entityId` can appear twice.** If your application
   can mount the same record in two components at once, the id alone cannot say
   which one a comment was attached to. Put whatever distinguishes them in
   `selector`; the runtime passes it to you verbatim and never reads it.

## What your users will see

A note whose content cannot be found is shown as orphaned: a dashed outline, a
warning glyph and a visually hidden sentence that reads "The content this note
was attached to cannot be found." The note stays on the canvas and stays in the
document.

This is deliberate. A comment must not disappear because the data it discussed
was deleted. The person who wrote the comment decides what happens to it.

Do not treat an orphan as an error to clean up. It clears by itself when your
resolver finds the content again.

## One limit to plan around

An orphaned note keeps its last resolved position only while the canvas is
open. After a reload, nothing records where the content used to be, so the
packer places the note by its stored placement. Component-owned region names
shipped the same day (ADR-162), so a geometric anchor no longer has this
problem. Narrowing it for a CONTENT anchor needs a region and a spot recorded
as a hint, which is approach C in
`specs/2026-10-10-durable-anchors.prd.md` and is not built.

## Checklist

1. Add `onResolveAnchor` to your `DynamicUIHost` implementation.
2. Give the elements that can be annotated a stable attribute to find them by.
3. Return `null` rather than a substitute when the content is gone.
4. Check that an orphaned note renders acceptably in your own styling.
5. Run `tsc`. A missing member is a compile error, which is the point.
