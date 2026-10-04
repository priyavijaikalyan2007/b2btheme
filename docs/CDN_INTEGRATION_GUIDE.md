<!-- AGENT: How a consuming app loads this library and its vendored dependencies safely. Covers SRI, the dependency closure, and the fail-fast contract. -->

# CDN Integration Guide

How to load this library and its vendored third-party dependencies from
`static.knobby.io`, verify what you loaded, and behave correctly when a load
fails.

Written for a consuming application. If you are working *inside* this
repository, the rules you must follow when writing components are in
[`AGENTS.md`](../AGENTS.md) and [`FRONTEND.md`](../FRONTEND.md); the caching
policy is in [`CDN_CONTRACT.md`](../CDN_CONTRACT.md).

---

## 1. The three surfaces

This origin serves three kinds of thing, with different guarantees. Mixing
them up is the most common integration mistake.

| Surface | Path | Versioned? | Cache | You should |
|---|---|---|---|---|
| **Theme + components** | `/css/`, `/js/`, `/components/`, `/icons/` | no — always latest | 5 min | link directly, never pin |
| **Dependency closure** | `/lib/<name>-<version>.js` | **yes** | 1 year, immutable | pin the URL *and* the hash |
| **Manifest** | `/lib-manifest.json` | n/a | `no-cache` | read at build or boot |

The first is deliberately unpinned: fixes propagate without every consumer
redeploying (ADR-139). The second is deliberately pinned: a version bump is a
new URL, which is what makes a one-year `immutable` cache honest.

## 2. Loading the theme

```html
<link rel="stylesheet" href="https://static.knobby.io/css/custom.css">
<link rel="stylesheet" href="https://static.knobby.io/icons/bootstrap-icons.css">
<script src="https://static.knobby.io/js/theme-init.js"></script>
```

`theme-init.js` must load **before** your first paint — it reads the stored
theme preference and sets `data-bs-theme` on `<html>`, so loading it late
causes a flash of the wrong theme.

Individual components are opt-in, one stylesheet and one script each:

```html
<link rel="stylesheet" href="https://static.knobby.io/components/toast/toast.css">
<script src="https://static.knobby.io/components/toast/toast.js"></script>
```

### Why these tags carry no `integrity`, and why that is not an oversight

SRI pins a hash to an exact sequence of bytes. These paths are deliberately
**unversioned and always-latest**, so their bytes change on every release —
an `integrity` attribute would brick every consuming page the moment we ship
a fix, which is the opposite of what it is for.

That trade-off was decided explicitly in ADR-139: for assets on an origin
inside the same trust boundary, "latest + an additive-only contract + CI drift
guards" preserves the ability to ship fixes without a fleet-wide redeploy.
The trust anchor here is the Cloudflare account, not the hash.

Third-party code is the opposite case — a different trust boundary, and a
version you chose rather than one we ship. That is why everything under
`/lib/` **is** versioned, immutable, and hash-published, and why you should
pin it. If you ever find yourself wanting SRI on `/css/custom.css`, what you
actually want is a pinned release channel; raise it rather than hand-rolling
a hash that our next deploy will invalidate.

## 3. Loading a vendored dependency

Read the manifest, then build the tag from it. **Do not transcribe hashes by
hand** — the whole reason the manifest exists is that a URL and its hash must
change together, and a human copying one and not the other produces a page
that cannot load at all.

```js
const lib = await fetch("https://static.knobby.io/lib-manifest.json")
    .then((r) => r.json());

function loadLib(name)
{
    const asset = lib.assets[name];

    if (!asset)
    {
        // There is no safe default here. See §5.
        throw new Error(`[lib] ${name} is not published; refusing to continue`);
    }

    return new Promise((resolve, reject) =>
    {
        const tag = document.createElement("script");

        tag.src = "https://static.knobby.io" + asset.url;
        tag.integrity = asset.integrity;    // sha384-…
        tag.crossOrigin = "anonymous";      // mandatory — see below
        tag.onload = () => resolve(window[asset.global]);
        tag.onerror = () => reject(new Error(`[lib] ${name} failed to load`));

        document.head.appendChild(tag);
    });
}

const DOMPurify = await loadLib("dompurify");
```

**`crossorigin="anonymous"` is not optional.** Setting `integrity` makes the
request CORS even for a `<script src>`. Omit the attribute and the browser
refuses the response before it checks the hash, so *every* protected tag fails.
That is also why `/lib/*` is served with `Access-Control-Allow-Origin: *`.

### What is published

Read `lib.assets` rather than this table — it is generated, this is not.

| Asset | Global | Notes |
|---|---|---|
| `dompurify` | `window.DOMPurify` | Served at **3.4.16**. See the warning in §6. |
| `maxgraph` | `window.maxgraph` | ESM bundled to IIFE; a drop-in for code already reading `window.maxgraph` |
| `signalr` | `window.signalR` | |
| `cytoscape` | `window.cytoscape` | |

Each is a **single self-contained file**. None of them fetches a further
module at runtime, which is asserted at build time from the bundler's own
dependency graph rather than claimed — see `specs/2026-10-04-dependency-closure.prd.md`.

### Upgrading

A version bump is a **new URL**. The old path keeps serving the old bytes
forever, so a page cached mid-rollout still resolves. Because you read the URL
and the hash from the same manifest fetch, you get both halves of the change
at once — which is the failure mode this design exists to prevent.

## 4. Static tags, if you cannot fetch the manifest at runtime

Generate them at build time from the manifest and commit the result. Never
hand-maintain the hash.

```html
<script src="https://static.knobby.io/lib/dompurify-3.4.16.js"
        integrity="sha384-a7SzOxErzJ3ZpQz0zJ32d67dSitNzPcbfybc/ykU9KJhMgZkwqfSxlhhdJRS+XGL"
        crossorigin="anonymous"></script>
```

If the hash and the file ever disagree the browser refuses to execute the
script — a hard failure, not a silent one. That is the intended behaviour, and
it is why §5 matters.

## 5. When a load fails — the part that actually matters

**Moving an asset to this origin gives you a fixable host, not a guarantee of
presence.** Any runtime fetch can be absent: a deploy in flight, a DNS blip, a
corporate proxy, an SRI mismatch. What makes absence safe rather than
destructive is what *your* code does next.

The rule this library follows internally, and the one we ask consumers to
follow (ADR-148):

> 1. **A degraded component may never report success.**
> 2. **A degraded component may never participate in a write.**

and its deciding question:

> **Can a caller tell "there is nothing" from "I could not find out"?**

If it cannot, the second answer eventually gets persisted as the first. That is
not hypothetical: a mock graph substituted for a failed CDN import answered
`serialize()` with an empty document, an autosave wrote it over live sessions,
and they were not recoverable.

```js
// WRONG — the shape that destroyed data.
let sanitizer;
try { sanitizer = await loadLib("dompurify"); }
catch { sanitizer = { sanitize: (s) => s }; }   // silently disables sanitizing

// RIGHT — the feature is unavailable and says so.
let sanitizer = null;
try { sanitizer = await loadLib("dompurify"); }
catch (err)
{
    logError("Sanitizer unavailable; rich text is disabled", err);
    disableRichTextEditing("Could not load the sanitizer. Reload to try again.");
}
```

A legitimate degraded mode **announces itself and withdraws from authority** —
read-only when the write path is down, a value labelled stale, an empty state
that says it could not load. What is prohibited is a stand-in indistinguishable
from the real thing.

### This library will now throw at you

Two consequences of ADR-148 that consuming code must handle:

```js
// A picker whose container does not resolve THROWS. It used to return an
// object whose getValue() answered with a fabricated setting, which a host
// then saved over the user's real one.
const picker = createOrientationPicker({ container: "#maybe-missing" });

// DynamicFormSwitcher refuses to return a partial form, naming the fields
// it could not read. Saving a partial form would overwrite stored values
// with defaults.
try { await api.save(form.getValues()); }
catch (err) { showError(err.message); }   // do NOT save anything
```

## 6. Pin your own dependencies, not just your hosts

Serving a library from this origin removes third-party *trust*. It does not
make the library safe.

Vendoring DOMPurify put it under this repository's `npm audit` for the first
time and surfaced **19 open advisories against 3.2.4** — the version several
apps pin — including cross-site-scripting bypasses. That is a sanitizer with
known holes, and moving where it is fetched from would not have closed one of
them.

**Check the version you depend on, not only the host you fetch it from.** This
origin serves DOMPurify at 3.4.16; if your application pins an older one
anywhere else, that pin is the exposure.

## 7. Related reading

- [`CDN_CONTRACT.md`](../CDN_CONTRACT.md) — caching policy, the `/lib/` contract, version-bump rules
- [`APPS_TEAM_USAGE_GUIDE.md`](APPS_TEAM_USAGE_GUIDE.md) — factory naming, renames, CI guards
- [`GETTING_STARTED.md`](GETTING_STARTED.md) — first integration
- [`TROUBLESHOOTING.md`](TROUBLESHOOTING.md) — common load failures
- `specs/2026-10-04-no-fabricated-reads.prd.md` — the fail-fast rule in full (ADR-148)
- `specs/2026-10-04-dependency-closure.prd.md` — why the closure is served this way (ADR-149)
