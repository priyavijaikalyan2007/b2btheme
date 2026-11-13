<!-- AGENT: Spec for retaining, deprecating and retiring old /lib/ vendored versions (#147). Read before changing scripts/vendor-closure.mjs, cdn/lib-versions.json or cdn/lib-retained/. -->

# `/lib/` version retention: deprecate, notify, retire (#147)

**Status:** approved design, 2026-11-13. Not yet implemented.
**Issue:** #147. **Related:** ADR-149 (the dependency closure), `CDN_CONTRACT.md` "Dependency closure — `/lib/`".

## 1. Problem

A build serves only the current version of each `/lib/` asset. When a version moves, the old URL returns 404 on the next deploy. Consumers pin these URLs with SRI hashes:

- The apps load `/lib/font-awesome-6.5.1/` on most pages, `/lib/signalr-8.0.0.js` on the diagrams page and `/lib/cytoscape-3.26.0.js` on the strukture page.
- MCP servers fetch `/mcp/renderer.html` once at startup, and it names the current `a2ui-runtime`.

`CDN_CONTRACT.md` "Bumping a version" says the old path keeps serving. The build does not do that. Four served versions moved since 2026-02 (marked twice, A2UI once, DOMPurify once). Four Dependabot bumps of served packages were closed because merging them would break pinned consumers (#145, #149, #158, #161).

## 2. Goals and non-goals

**Goals**
- A version that a bump replaces keeps serving its exact bytes for 60 days.
- Every build tells people and agents what is current, what is deprecated, how many days each has left, and what was retired recently.
- A bump cannot skip deprecation, and a deprecated version cannot outstay its date unnoticed.
- A served file can never change bytes under the same URL.

**Non-goals**
- Usage analytics. A `lib:usage` report against Cloudflare's analytics is a follow-up issue. The free plan's analytics retention is not yet known.
- Git LFS. See §9.
- Versioned component releases (`/r/<version>/`), still deferred.
- Removing the Dependabot ignore rules for SignalR and Font Awesome majors. Each can go once its bump is done through this process.

## 3. Decisions

| # | Decision | Choice | Source |
|---|---|---|---|
| D1 | Policy | Deprecate on bump, retire after 60 days | Owner, 2026-11-12 |
| D2 | Old bytes | Frozen in the repo under `cdn/lib-retained/`, verified by hash on every build | Owner, 2026-11-13 |
| D3 | Usage data | Out of scope, as a follow-up issue | Owner, 2026-11-13 |
| D4 | Notices | Generated on every build, in human and agent-readable forms | Owner, 2026-11-13 |
| D5 | Advisory on a deprecated version | Retire at once, or record an exception, as for a current version | Design |
| D6 | Overdue retirement | Fails `test:structure` in CI, never `npm run build` | Design |
| D7 | Git LFS | Not used | Owner, 2026-11-13 |

## 4. Lifecycle

A version is in one of three states.

1. **Current.** Built from `node_modules` by `scripts/vendor-closure.mjs`, as today.
2. **Deprecated.** A newer version replaced it. Its frozen bytes serve at the same URL until `retireAfter`, which is `deprecatedOn` plus 60 days (UTC dates).
3. **Retired.** Its frozen bytes are deleted, so the next deploy stops serving it. It stays listed for 90 days after `retiredOn`, so a consumer who meets a 404 can find out why.

## 5. The record: `cdn/lib-versions.json`

One committed file drives every gate and every notice.

An illustration, with a SignalR move that has not happened:

```json
{
  "current": {
    "signalr": {
      "version": "10.0.11",
      "files": { "/lib/signalr-10.0.11.js": "sha384-…" }
    }
  },
  "deprecated": [
    {
      "asset": "signalr",
      "version": "8.0.0",
      "url": "/lib/signalr-8.0.0.js",
      "integrity": "sha384-…",
      "files": { "/lib/signalr-8.0.0.js": "sha384-…" },
      "packages": { "@microsoft/signalr": "8.0.0" },
      "deprecatedOn": "2026-12-01",
      "retireAfter": "2027-01-30",
      "replacement": "/lib/signalr-10.0.11.js",
      "reason": "Client 10 matches the apps' .NET 10 server (#145)"
    }
  ],
  "retired": [
    { "asset": "a2ui-runtime", "version": "0.14.0", "url": "/lib/a2ui-runtime-0.14.0.js",
      "retiredOn": "2026-11-12", "replacement": "/lib/a2ui-runtime-0.15.0.js",
      "reason": "Moved to 0.15 before this policy existed (#155)" }
  ]
}
```

- `current.<asset>.files` lists **every** served file of the asset with its SHA-384, in SRI form. That is one file for most assets, and 419 for vditor.
- `deprecated[].url`, `integrity` and `packages` are copied from the asset's `/lib-manifest.json` entry at deprecation time, so consumers and the vendor audit read what they read today.
- Paths are the served paths. Frozen files live at `cdn/lib-retained/<path without /lib/>`.

## 6. Gates

All gates fail with a message that names the fix.

1. **Bytes match the record.** The build compares each current asset it produced with `current`. The same version with different bytes fails. This catches a tool upgrade, such as esbuild, that changes a served file under an unchanged URL.
2. **No silent bump.** A new version of an asset fails unless the old version has a `deprecated` entry. The message says to run `npm run lib:deprecate -- <asset>`.
3. **Frozen bytes match.** The build copies `cdn/lib-retained/` into `dist/lib/` and checks every file against its `deprecated[].files` hash. A missing, extra or changed file fails.
4. **No silent overstay.** `test:structure` fails when today (UTC) is past any `retireAfter`. The message says to run `npm run lib:retire -- <asset>@<version>`. It never fails `npm run build`, so a deploy is never blocked by the calendar.
5. **Advisories.** `npm run audit:vendor` covers deprecated versions through their recorded `packages`, with the same exceptions file (`scripts/audit-exceptions.mjs`).

## 7. Tools

**`npm run lib:record`** writes `current` from a clean build. It is used once to create the record, and by `lib:deprecate`. The first record is verified against the live CDN: every recorded file must match the bytes `https://static.knobby.io` serves.

**`npm run lib:deprecate -- <asset> [--reason "<text>"]`** runs on the bump branch, a Dependabot branch included:
1. Reads the old version's paths and hashes from `current`.
2. Downloads each file from the live CDN and checks it against the recorded hash. Any mismatch stops the command with no changes. It never guesses or substitutes.
3. Writes the files under `cdn/lib-retained/`.
4. Moves the entry to `deprecated`, with today's date, `retireAfter`, the replacement URL and the reason.
5. Records the new version as `current` (through `lib:record`).
6. Prints a CHANGELOG line and the text of an apps-team note for `~/Work/knobby/apps/specs/bugreports/`. The owner commits the note in the apps repo.

**`npm run lib:retire -- <asset>@<version>`** deletes the frozen files, moves the entry to `retired` with today's date, and prunes `retired` entries older than 90 days. It prints a CHANGELOG line.

## 8. Notices, generated on every build

All notices are generated from `cdn/lib-versions.json` at build time. None is committed, because `daysRemaining` changes daily. All notices agree, because they share one source.

**Agent-readable**
- **`/lib-manifest.json`** keeps `assets` unchanged, and gains:
  - `deprecated`: each entry with `url`, `integrity`, `deprecatedOn`, `retireAfter`, `daysRemaining` as of `generated`, `replacement` and `reason`
  - `retired`: the entries retired in the last 90 days
- **`/lib-deprecations.json`**: `generated`, `policy` (`{ "retainDays": 60, "listRetiredDays": 90 }`), `current` (asset to version and URL), `deprecated` and `retired`. A consumer can poll this one small file.
- **HTTP headers** on each deprecated path, added to `dist/_headers` after `copy:cdn`:
  - `Deprecation: @<deprecatedOn as Unix seconds>` (RFC 9745)
  - `Sunset: <retireAfter as an HTTP-date>` (RFC 8594)
  - `Link: <replacement URL>; rel="successor-version"`

  A frozen file's bytes cannot carry a warning, so the headers are the only per-request signal. A directory asset gets one wildcard rule. The plan checks Cloudflare's `_headers` rule limit against the 18 rules in use.

**Human-readable**
- **`/docs/lib-deprecations.html`**, through the docs generator's Markdown-to-HTML conversion. It holds:
  - a table of current versions
  - a table of deprecated versions, with days left, replacement and reason
  - recent retirements
  - the policy, in two sentences
- **`/lib-deprecations.md`**, the same content as Markdown with an `<!-- AGENT: -->` header.
- **The build log** prints a summary block on every build: the counts, each deprecated version with its days left, and a warning line for each version within 14 days of retiring.

**Committed documentation**
- `CDN_CONTRACT.md` "Bumping a version" is rewritten to state this policy. It points to `/lib-deprecations.json` and the HTML page, and does not copy their tables.
- `docs/CDN_INTEGRATION_GUIDE.md` gains a "Deprecations" section: how to read the headers and the JSON, and that a consumer has 60 days to move.
- `AGENTS.md` gains a rule: a bump of a served package goes through `lib:deprecate`, and the gates enforce it.
- Each deprecation and retirement gets a CHANGELOG line.

## 9. Storage and cost

- **Files.** Most deprecated versions add one file each for 60 days. A deploy holds 15,652 files today, under the free tier's 20,000. The worst case is vditor, at 419 files per version.
- **Repository size.** Single files are at most about 650 KB. A vditor deprecation would add about 22 MB to git history once.
- **No Git LFS.** Every CI and Cloudflare build would download the frozen files, and GitHub meters LFS bandwidth. It is not confirmed that Cloudflare's build fetches LFS objects. If it did not, the deploy would serve pointer files.
- **If vditor's size matters when it moves,** its old bytes can come from npm through an alias dependency (`"vditor-<old>": "npm:vditor@<old>"`). Its tree is copied byte for byte from the npm release, and npm tarballs do not change. The record's hashes would still verify every file. This is not built now.

## 10. Initial state

- `current` is created by `lib:record` and verified against the live CDN.
- `deprecated` starts empty.
- `retired` lists the versions removed before this policy, with their dates:
  - `dompurify` 3.4.16, retired 2026-10-23 for a critical advisory (`6b26b8bb`)
  - `a2ui-runtime` 0.14.0, retired 2026-11-12 (#155)
  - `marked` 18.0.12, retired 2026-11-13 (#164)

  Each stays listed until 90 days after its date.

## 11. Testing

- Unit tests for each gate in §6, for the date arithmetic (UTC, 60 and 90 days, `daysRemaining` on the boundary days), and for header formatting.
- Unit tests for `lib:deprecate` with a stubbed fetch: a hash mismatch leaves the repo unchanged.
- A build test: a fixture record with one deprecated asset produces the frozen file in `dist/lib/`, the manifest fields, `/lib-deprecations.json`, the Markdown and HTML pages, and the `_headers` rules.
- An e2e test: a deprecated path served by the local server returns the frozen bytes, and the browser accepts them under the recorded SRI hash.
- `test:structure` gains the overstay check, with a unit test on a fixed date.

## 12. Follow-ups

- Usage analytics (`lib:usage`) against Cloudflare, once the free plan's retention is known. A separate issue.
- SignalR 8 to 10 (#145, #147) and Font Awesome 7 (#158) through this process, then their Dependabot ignore rules come out.
