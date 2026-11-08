# Bootstrap Icons on static.knobby.io cannot be loaded with crossorigin

**Date**: 2026-11-07
**Component**: CDN, `/icons/bootstrap-icons.css`
**Severity**: Medium (the last library the apps still load from a public CDN)
**Status**: Fixed on branch `fix/bootstrap-icons-lib`: the `bootstrap-icons` asset in `lib-manifest.json`, at `/lib/bootstrap-icons-1.13.1/bootstrap-icons.min.css` (the first option).
**Filed by**: Apps team (knobby.io apps repo)

---

## Summary

Thank you for vendoring the dependency closure. The apps now load every
library from `static.knobby.io/lib/` with its integrity hash, except one.

`CDN_CONTRACT.md` says to load Bootstrap Icons from
`https://static.knobby.io/icons/bootstrap-icons.css`. The apps cannot, for two
reasons:

1. **The stylesheet sends no CORS header.** The fonts under `/icons/fonts/`
   do. The stylesheet does not, even when the request carries an `Origin`.
2. **It has no published hash and no version in its path.** It is served with
   `max-age=0, must-revalidate`, so an integrity hash on it would break on
   the next deploy.

So 34 app pages still load
`https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css`.

## Why the apps need CORS on it

The apps' icon pickers group Bootstrap Icons into categories. They read the
category of each icon from the stylesheet's own rules, through
`document.styleSheets[n].cssRules`. A browser lets a page read the rules of a
cross-origin stylesheet only when it was loaded with `crossorigin` and the
server answered with `Access-Control-Allow-Origin`.

Without the header, `crossorigin` makes the browser drop the stylesheet, and no
icon draws. Without `crossorigin`, the picker cannot read the rules.

## How to check

```
$ curl -sI -H "Origin: https://apps.knobby.io" https://static.knobby.io/icons/bootstrap-icons.css
HTTP/2 200
cache-control: public, max-age=0, must-revalidate

$ curl -sI -H "Origin: https://apps.knobby.io" https://static.knobby.io/icons/fonts/bootstrap-icons.woff2
HTTP/2 200
access-control-allow-origin: *
```

## What the apps team needs

Either of these works. The first matches how every other library is served.

- **A `/lib/` entry.** For example `/lib/bootstrap-icons-1.13.1/bootstrap-icons.min.css`,
  with its fonts beside it, listed in `lib-manifest.json` with its hash. Serve it
  with CORS and `immutable`, as the other `/lib/` files are.
- **Or CORS on `/icons/bootstrap-icons.css`,** plus a published hash for a
  versioned copy.

When it ships, the apps will move all 34 pages in one change. They will then
remove the exception in `typescript/shared/security/external-assets.test.ts`.
