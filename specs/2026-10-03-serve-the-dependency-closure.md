# Serve the frontend dependency closure from static.knobby.io

**From:** the apps repo (`knobbyio/apps`).
**Tracked there as:** #232, and the same programme as #212 (subresource integrity).
**Companion report:** `2026-10-03-fail-fast-over-fallback.md` — read that one first.
It covers the incident. This one is the infrastructure ask.

---

## The ask

Build and serve the **closure** of frontend third-party dependencies from
`static.knobby.io`, the way you already serve the component library.

The apps currently fetch libraries from public CDNs at page load:

| Asset | Host |
|---|---|
| `@maxgraph/core@0.22.0` | cdn.jsdelivr.net |
| `dompurify@3.2.4` | cdn.jsdelivr.net |
| `vditor@3.11.2` | cdn.jsdelivr.net |
| `chart.js@4.4.6` | cdn.jsdelivr.net |
| `bootstrap-icons@1.11.3`, `bootstrap@5.3.3` | cdn.jsdelivr.net |
| `signalr@8.0.0` | cdnjs.cloudflare.com |
| `font-awesome@6.4.0` | cdnjs.cloudflare.com |

## Why a CDN and not bundling

This was considered and rejected, so the reasoning is worth stating — the answer
is not "bundle everything".

- **Several apps share the same library.** Thinker and Diagrams both use
  maxGraph. Bundled, each ships its own copy. One URL means the browser caches it
  once and both apps reuse it.
- **Cache invalidation granularity, which is the stronger reason.** With a
  library inside an app bundle, every app deploy invalidates it. Thinker's bundle
  went from 462KB to 2.0MB when maxGraph was bundled, so each deploy would have
  re-pushed 1.4MB of unchanged library. As a separate immutable URL, an app
  deploy invalidates only the app bundle.

So runtime loading is correct. The question is whose infrastructure.

## Why your origin and not a public CDN

Three distinct properties, and conflating them is what sent us down the bundling
path in the first place:

| Property | Question | Fixed by |
|---|---|---|
| **Integrity** | Is this the file that was published? | SRI hashes |
| **Provenance** | Whose infrastructure do we trust? | This request |
| **Presence** | Is it here right now? | Nothing — only handled |

A public CDN serving arbitrary package content is a trust boundary we do not
control. jsdelivr has had compromised-package incidents. Anything it serves runs
with the session of whoever is looking at the page, which for admin pages is a
tenant owner or a platform operator.

**DOMPurify is the one to do first.** It is the sanitizer. Every other asset
degrades or disappears when substituted; a substituted DOMPurify *becomes the
attack*.

## What would help most

1. **One canonical immutable versioned URL per asset.** The path must never
   change content, so a browser can hold it indefinitely and every app can share
   the same cache entry. Please keep the URL identical across apps — two URLs for
   one library defeats the point.
2. **Long `max-age`, plus `immutable`.** Safe precisely because the path is
   versioned.
3. **The full closure, not just direct dependencies.** A library that itself
   fetches something at runtime leaves the same hole one level down. This is the
   part that makes it durable rather than a one-time cleanup.
4. **Published hashes for each artifact.** This is what unblocks #212. Pages need
   to carry `integrity="sha384-..."` and `crossorigin="anonymous"`, and a hash
   can only be recorded against a pinned immutable URL.

5. **Each artifact must be one self-contained file, loaded via `src`.** This is a
   hard constraint rather than a preference, and it is the part we got wrong on
   our first pass at the request.

   `integrity` attaches to a `<script src>` tag, including `type="module"`. It
   **cannot** attach to a bare import specifier inside a module:

   ```html
   <!-- SRI works -->
   <script type="module" src="https://static.knobby.io/vendor/maxgraph-0.22.0.js"
           integrity="sha384-..." crossorigin="anonymous"></script>

   <!-- SRI impossible: nowhere to put a hash -->
   <script type="module">
       import * as maxgraph from 'https://.../@maxgraph/core@0.22.0/+esm';
   </script>
   ```

   So an artifact that resolves further imports at runtime defeats the point —
   each of those is a second asset arriving unverified. **Serving the full closure
   and applying SRI are the same requirement**, not two separate ones.

   Where a library needs to be reachable as a global, the artifact should make
   that assignment itself. Our canvas code already reads `window.maxgraph`, so an
   artifact that sets it is a drop-in and needs no consumer change beyond the tag.
6. **A note on how a version bump is rolled out**, since consumers must update
   both the URL and the hash together.

## One thing this does not fix, stated plainly

On 3 October 2026, four `static.knobby.io` stylesheets failed to load in the same
session that jsdelivr failed — `custom.css`, `tabbedpanel.css`, `toast.css`,
`confirmdialog.css`. The cause may well have been client-side, and your deploy
was in flight.

The point is that **moving an asset to your origin gives us control and a fixable
host, not a guarantee of presence.** Any runtime fetch can be absent. What makes
absence safe rather than destructive is fail-fast behaviour in the consumer, which
is the subject of the companion report and has now shipped on the apps side.

So please do not read this request as making load failures impossible. It removes
third-party trust and fixes caching. The consumer still has to handle absence, and
must never answer it with a stand-in.
