# Versioned, hashed copies of the components, alongside the unversioned URLs

**Date**: 2026-11-07
**Component**: CDN, `/components/*`, `/css/custom.css`, `/js/theme-init.js`
**Severity**: Medium (the largest part of apps issue #212 still open)
**Status**: Deferred 2026-11-08 until the component library is stable. See the apps note `2026-11-08-components-versioned-urls-deferred.md`
**Filed by**: Apps team (knobby.io apps repo)

---

## Summary

The apps now load every third-party library from `/lib/` with its integrity
hash. Thank you for that work. What is left without a hash is your own code:
the components, the theme stylesheet and `theme-init.js`.

The apps load 69 components across 32 pages, in 647 `<script>` and `<link>`
tags. None of them can carry `integrity`, because each URL is unversioned and
served with `max-age=300`. A hash taken today breaks the page at your next
deploy.

The apps team asks for an **additional** way to load the same files: immutable
copies at versioned URLs, with their hashes in a manifest. The unversioned URLs
stay exactly as they are.

## Your contract already weighs this, and the request keeps your reasons

`CDN_CONTRACT.md` §1 chooses "latest + contract" over pinning and SRI. Its
reasons are about Keycloak:

- a hash on the login page would break sign-in on any byte change; and
- pinning would force an IdP image rebuild for every theme release.

Neither reason changes under this request. Keycloak keeps the unversioned URLs
and needs no change. The request adds a second path for consumers that can pin,
and the apps can, because the apps deploy their own pages often.

The contract also says integrity rests on Cloudflare account controls, since
both origins belong to the same organisation. That holds for who may deploy.
It does not cover a deploy that ships the wrong bytes, or a token that is
misused. For those, the apps want the browser to check what it runs, as it now
does for `/lib/`. A component runs with the session of a tenant owner or a
platform operator on the admin pages, including the audit trail.

## What the apps team needs

1. **An immutable copy of each release.** For example
   `/r/<package-version>/components/<name>/<name>.js`, and the same for each
   component's `.css`, `/css/custom.css` and `/js/theme-init.js`. Serve them with
   `max-age=31536000, immutable` and CORS `*`, as `/lib/` is. The version is the
   one `build.json` already reports.
2. **A manifest per release.** For example `/r/<package-version>/manifest.json`,
   giving each file's path and SHA-384 hash, in the shape of `lib-manifest.json`.
3. **Old releases stay.** A page cached mid-rollout must still resolve, as the
   `/lib/` contract promises. If keeping every release costs too much, say how
   many you can keep. The apps can bump at least monthly.
4. **A pointer to the newest release** in `build.json`, so the apps' tooling can
   find it without scraping.

Fonts and images that a stylesheet pulls in cannot carry a hash. That residual
is the same one `/lib/` states for Font Awesome, and it is acceptable here too.

## What the apps team does with it

The apps will pin one release for every page and move all tags in one change.
A script will read the manifest and write each URL and hash together. The
apps' `external-assets.test.ts` will then require a hash on every
`static.knobby.io` script and stylesheet, not only on `/lib/`.

**The cost, stated:** a component fix reaches the apps when the apps bump the
release, not five minutes after you deploy. The apps team accepts that. A fix
that cannot wait is one bump and one app deploy.

## Not in scope

- Changing anything Keycloak loads.
- The icon packs under `/icons/`. They are SVG images, and they are already
  served with a `default-src 'none'` CSP.
