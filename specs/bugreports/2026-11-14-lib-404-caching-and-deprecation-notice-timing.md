# /lib/ 404s are cached for a year, and a deprecation notice can arrive before its deploy

**From:** knobby.io apps, while checking `2026-11-14-katex-0.19.0-deprecated.md` (knobbyio/apps#378)
**Date:** 14 November 2026
**Component:** CDN (`/lib/` caching), `LIB_MAINTENANCE.md` Operation A, `/icons/bootstrap-icons.css`
**Severity:** Medium for item 1. Low for items 2 and 3. Item 4 is a question.
**Status:** Items 1 to 3 fixed (`fix/cdn-404-cors-notice-timing`). Item 4: the owner chose to serve licence texts, in a follow-up PR.

Your deprecation policy works well for us. The `deprecated` list in the manifest, the `Deprecation`, `Sunset` and `Link` headers, and `/docs/lib-deprecations.html` give us everything we need. We will build a check on the manifest list (knobbyio/apps#378). The four items below are what we found around it.

## 1. A 404 under /lib/ is cached as immutable for a year

A path under `/lib/` that does not exist answers like this:

```
$ curl -sI https://static.knobby.io/lib/does-not-exist-9.9.9.js
HTTP/2 404
cache-control: public, max-age=31536000, immutable
```

The 0.19.1 KaTeX files answered the same way before your deploy, on 14 November:

```
/lib/katex-0.19.1.js                 404  public, max-age=31536000, immutable
/lib/katex-css-0.19.1/katex.min.css  404  public, max-age=31536000, immutable
```

**Why it matters.** `immutable` is right for a file whose bytes never change. It is wrong for an error. A browser may keep a cached 404 for the full year. Then a page that asked for a new version too early stays broken for that user after the file exists. The edge cache recovered this time: both files now answer `200` with `cf-cache-status: HIT`. A browser cache is not something you or we can clear.

The risk is highest on the path your own notices create. A consumer reads "replace it with `/lib/katex-0.19.1.js`" and loads it at once, before the deploy (item 2).

**What we would expect.** Send `immutable` and the year only with a `200`. Give a 404 a short lifetime, or `no-store`.

## 2. The notice reaches us before the deploy it describes

In `LIB_MAINTENANCE.md`, Operation A writes the apps-team note in **step 4**. The merge, which deploys, is **step 6**. The check that the deploy worked is **step 7**.

This is how it went for KaTeX on 14 November:

| Time (UTC) | What happened |
|---|---|
| 15:22 | `bda5eaf4` deprecates 0.19.0 on the Dependabot branch. The note is written to the apps repo. |
| 15:22 to 16:45 | The note says to take 0.19.1 from the manifest. The manifest still lists 0.19.0, its `deprecated` list is empty, and 0.19.1 returns 404. |
| 16:45 | PR #168 is merged. |
| 16:53 | The manifest is regenerated with 0.19.1 and both deprecations. |

In that window the note could not be followed. Following it anyway would have hit item 1.

**What we would expect.** Write the apps-team note after step 7 confirms the deploy, or put it in its own step after step 7. A note that comes from a branch could also say so: "not live yet, PR #168".

## 3. /icons/bootstrap-icons.css still sends no CORS header

Your 8 November note said this file is unchanged, and that pages needing neither a hash nor the rules can keep it. That is true. But it is a trap:

- A page that adds `crossorigin` to that link, to read the icon rules, gets no error. The browser just drops the stylesheet, and every icon disappears.
- The other `/icons/` paths already send `access-control-allow-origin: *`. These include the Fluent, AWS, Azure and GCP packs (`CDN_CONTRACT.md` §3, the caching policy). So this one file behaves differently from its neighbours.

```
$ curl -sI -H "Origin: https://app.knobby.io" https://static.knobby.io/icons/bootstrap-icons.css
HTTP/2 200
(no access-control-allow-origin)
```

**What we would expect.** Send CORS on `/icons/bootstrap-icons.css` like its neighbours do. If you would rather not, say in `CDN_CONTRACT.md` that `crossorigin` must not be used on it.

## 4. Question: can the CDN serve each library's licence text?

The apps generate their third-party notices page with `scripts/generate-third-party-notices.mjs`. It reads each library's licence file from jsdelivr at build time, by package and version. No page loads anything from there, but it is the last thing we fetch from a public CDN.

The manifest assets have no licence field today. Could each `/lib/` asset name its licence file, or could the CDN serve one beside it? Then our build would read only from you. If you would rather not, tell us, and we will decide on our side whether build-time reads fall under the policy.

## Links

- `LIB_MAINTENANCE.md`, Operation A, steps 4 to 7
- `CDN_CONTRACT.md`, §3 (caching policy) and "Dependency closure — `/lib/`" (deprecated versions)
- `specs/bugreports/2026-11-08-bootstrap-icons-lib-shipped.md` (your note)
- knobbyio/apps#378: moving the last public CDN load, and a check on deprecated URLs
