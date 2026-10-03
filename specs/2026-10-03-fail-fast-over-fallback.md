# Fail fast over fallback

**From:** the apps repo (`knobbyio/apps`), after a production data-loss incident.
**Tracked there as:** #229 (incident), #230 (the defect), #233 (this rule).
**Asking for:** a standing change in how components answer a missing dependency.
Not a fix to one component.

---

## What happened

On 3 October 2026 the Thinker canvas rendered nothing in production. The cause was
`BaseGraphCanvas.createFallbackGraph`, written in the apps repo, so the defect is
ours and not yours. The pattern is what this report is about.

The canvas engine was imported from a CDN at runtime. When that import failed,
`initGraph` substituted a mock graph rather than failing:

```ts
insertVertex: () => ({ id: 'mock_' + Date.now(), ... }),   // discards the caller's id
getDataModel: () => ({ getChildCells: () => [], getCell: () => null, ... }),
```

The console said this:

```
[BaseGraphCanvas] maxGraph library not loaded
[BaseGraphCanvas] Creating fallback mock graph
[INFO] maxGraph canvas initialized          <-- reports success
```

Three things followed. The canvas rendered nothing, because `getChildCells`
returned an empty list. Every edge lookup failed, because `getCell` returned null.
And `serialize()` reported an empty canvas, which Thinker's autosave then wrote
over the stored session as a whole-document replacement.

Production sessions were destroyed. They were not recoverable, because Thinker had
no version history and point-in-time recovery had aged out.

## Why this is addressed to the components team

The pattern recurs in component work. It is worth being precise about why, because
the honest answer is that the instructions disagree with each other.

`ADDITIONAL_INSTRUCTIONS.md` prohibits it, under a heading that names the exact
situation:

> ### CDN Component Integration
> **Fallback Code Prohibition:** Do NOT write fallback code assuming shared UI
> components break... If there is an issue with a component, produce a bug report
> instead.

`FRONTEND.md` mandated the opposite, under *Storage Mechanisms*:

> - Design fallback mechanisms for storage failures

An agent reading the second has licence to build what the first forbids. Both
files are in the apps repo and both have been amended there. If the theme repo
carries its own copy of either instruction, it needs the same amendment, because
that is the actual mechanism keeping this alive.

## The rule

Not every degraded mode is wrong, and collapsing them all under "fallback" is what
makes this feel like a style argument. A legitimate degraded mode **announces
itself and withdraws from authority**: read-only when the write path is down, a
cached value labelled stale, an empty state that says it could not load.

So the rule is two clauses, both testable:

1. **A degraded component may never report success.** No log line, return value,
   or status that an intact component would also produce.
2. **A degraded component may never participate in a write.** It may render, it
   may read, it may not persist.

`createFallbackGraph` broke both. It logged `initialized`, and it stayed wired to
the autosave.

The deciding question for any such code is: **can a caller tell the difference
between "there is nothing" and "I could not find out"?** If not, the second answer
will eventually be persisted as the first.

## What we are asking for

1. **A missing dependency throws or returns a sentinel the caller must handle.**
   Never a stand-in object that satisfies the interface.
2. **No success log, event, or status from a failure branch.** This is the clause
   that made our incident invisible — the one line a human would read said the
   canvas was fine.
3. **A component that cannot initialize does not expose its write or serialize
   surface.** Ours answered `serialize()` with an empty document. It should have
   refused.
4. **Report the problem instead of absorbing it.** This is already what
   `ADDITIONAL_INSTRUCTIONS.md` asks for in the other direction, and it works
   both ways.

## One thing we would like checked

On the same page load, four stylesheets from `static.knobby.io` also failed:
`custom.css`, `tabbedpanel.css`, `toast.css` and `confirmdialog.css`. The cause
may well have been outside both repos, and the theme deploy was in flight at the
time.

Worth noting that this is not only cosmetic. `confirmdialog.css` and `toast.css`
style the confirmation and notification components. An unstyled confirmation
dialog can be invisible while remaining clickable, which is a correctness problem
rather than a visual one. If those components can render without their stylesheet
in a way that hides a destructive confirmation, that is worth a look independently
of what caused the fetch to fail.

## What we changed on our side

- `createFallbackGraph` is deleted. A canvas that cannot start stays inert, says
  so, and refuses to serialize.
- The canvas engine still loads at runtime, which is deliberate. Bundling it was
  tried and reverted: several apps share the library, and a bundled copy is
  duplicated per app and re-downloaded on every deploy of that app. Moving it to
  `static.knobby.io` is the separate request in
  `2026-10-03-serve-the-dependency-closure.md`.
- Thinker refuses to write a canvas it could not read, and the server refuses a
  replacement that would empty a session without saying so.
- `scripts/check-fallbacks.sh` flags the detectable shape of this pattern. Prose
  rules had already failed three times in the apps repo, so the build now checks.
