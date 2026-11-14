<!-- AGENT: Implementation plan for specs/lib-retention.prd.md (#147). Inline execution, no subagents. -->

# `/lib/` Version Retention Implementation Plan

> **For agentic workers:** executed inline (owner's rule: no subagents). Steps use checkbox (`- [ ]`) syntax.

**Goal:** a version that a bump replaces keeps serving its exact bytes for 60 days, every build publishes what is current, deprecated and retired, and gates make the process impossible to skip.

**Architecture:** one pure module, `scripts/lib-retention.mjs`, holds the record format, the date rules, the gates and the notice renderers. `vendor-closure.mjs` calls it to check the record and copy frozen files. Three small CLIs (`lib-deprecate.mjs`, `lib-retire.mjs`, `lib-verify-live.mjs`) change the record. `lib-notices.mjs` writes the notices after the docs step. A structure check fails CI once a version is overdue.

**Tech stack:** Node ESM scripts, vitest, the existing `generate-docs.js` Markdown converter.

## Global constraints

- Retain 60 days. List retired versions for 90 days. Warn 14 days before a retirement. All dates are UTC `YYYY-MM-DD`.
- Hashes are SHA-384 in SRI form (`sha384-<base64>`), the same as `lib-manifest.json`.
- The live origin is `https://static.knobby.io`.
- No fallback code. Every gate throws or fails with a message that names the fix.
- `lib-manifest.json`'s `assets` stays byte-compatible. New keys are added beside it.
- The overdue check runs in `test:structure`, never in `npm run build`.
- Gated assets (`--gated`) are outside the record.
- Prose follows LANGUAGE.md.

## Files

| File | Responsibility |
|---|---|
| `scripts/lib-retention.mjs` (new) | Record I/O, date math, SRI, gates, notice data and renderers. Pure, with no network. |
| `scripts/lib-retention.test.ts` (new) | Unit tests for the module. |
| `scripts/vendor-closure.mjs` | Collects each built asset's files, runs the gates (or `--record`), copies frozen files, and adds `deprecated` and `retired` to the manifest. |
| `scripts/lib-deprecate.mjs` (new) | Freezes the old version from the live CDN and records the deprecation. |
| `scripts/lib-retire.mjs` (new) | Deletes frozen files and moves the entry to `retired`. |
| `scripts/lib-verify-live.mjs` (new) | Checks every recorded current file against the live CDN. |
| `scripts/lib-notices.mjs` (new) | Writes `lib-deprecations.json`, `.md`, the HTML page and `_headers` rules, and prints the summary. |
| `scripts/check-lib-retention.mjs` (new) | Structure check `[32]`: overdue entries fail, near ones warn. |
| `scripts/generate-docs.js` | Exports `convertMarkdown` and `wrapHtml`. |
| `scripts/vendor-audit.mjs` | Audits deprecated versions' packages too. |
| `cdn/lib-versions.json` (new) | The record. |
| `cdn/lib-retained/` (new, empty at first) | Frozen bytes. |
| `package.json`, `test-local.sh` | Scripts and the new check. |
| Docs | `CDN_CONTRACT.md`, `docs/CDN_INTEGRATION_GUIDE.md`, `AGENTS.md`, `CHANGELOG.md`, ADR-261, history. |

---

### Task 1: `scripts/lib-retention.mjs`, tested

**Produces** (every later task uses these exact names):
- `RETAIN_DAYS = 60`, `LIST_RETIRED_DAYS = 90`, `WARN_DAYS = 14`, `RECORD_PATH = "cdn/lib-versions.json"`, `RETAINED_DIR = "cdn/lib-retained"`, `LIVE_ORIGIN = "https://static.knobby.io"`
- `todayUtc(): string`, `addDays(date: string, days: number): string`, `daysUntil(from: string, to: string): number`
- `sriOf(bytes: Buffer): string`
- `readRecord(path?): Record`, `writeRecord(record, path?)`. A Record is `{ current: { [asset]: { version, files: { [servedPath]: sri } } }, deprecated: Entry[], retired: Retired[] }`.
- `retainedPath(servedPath: string): string`, mapping `/lib/x` to `cdn/lib-retained/x`
- `currentProblems(record, built: { [asset]: { version, files } }): string[]` (gates 1 and 2, plus an added or removed asset)
- `retainedProblems(record, readFile: (path) => Buffer | null, listDir: () => string[]): string[]` (gate 3)
- `overdue(record, today): Entry[]`, `dueSoon(record, today): Entry[]`
- `noticeData(record, manifestAssets, today, generated): Notice`
- `headerRules(notice): string`, `noticeMarkdown(notice): string`, `summaryLines(notice): string[]`

- [ ] **Step 1:** Write `scripts/lib-retention.test.ts`, covering:
  - date math: `addDays("2026-12-01", 60)` is `"2027-01-30"`, across a year boundary and a leap day, and `daysUntil` on and around the retire date;
  - `currentProblems`:
    - the same version with a changed hash fails, naming the file;
    - a new version without a deprecation fails, naming `npm run lib:deprecate -- <asset>`;
    - an asset not in the record fails, naming `npm run lib:record`;
    - a recorded asset not built fails, naming `lib:deprecate`;
    - a matching build gives `[]`;
  - `retainedProblems`: a missing file, a changed file and an extra file each fail, and a match gives `[]`;
  - `overdue` and `dueSoon` on fixed dates;
  - `noticeData`:
    - `daysRemaining`;
    - retired entries older than 90 days dropped;
    - `current` taken from the manifest's `url`;
  - `headerRules`:
    - one exact-path rule for a single file;
    - a `/lib/<asset>-<version>/*` rule for a tree;
    - `Deprecation: @<seconds>`, `Sunset` as an HTTP-date, `Link` with `rel="successor-version"`;
    - no `Link` when `replacement` is null;
  - `noticeMarkdown`: starts with the `<!-- AGENT:` header, and lists each deprecated entry with its days left.
- [ ] **Step 2:** Run `npx vitest run scripts/lib-retention.test.ts`. It fails because the module is missing.
- [ ] **Step 3:** Write the module.
- [ ] **Step 4:** Run the tests, and they pass.
- [ ] **Step 5:** Commit.

### Task 2: The build checks the record, and the first record

**Consumes:** Task 1.

- [ ] **Step 1:** In `vendor-closure.mjs`, record every file each plain-run asset writes:
  - `copy`, `bundle` and `patch`: the one output file;
  - `tree`: every file under `<outDir>/<name>-<version>/`.

  Each is keyed by served path, with `sriOf`, giving a `built` map.
- [ ] **Step 2:** After the loop, for a plain run:
  - With `--record`, write `record.current = built` and keep `deprecated` and `retired`.
  - Otherwise, throw on `currentProblems(record, built)`.
- [ ] **Step 3:** Copy each `deprecated` entry's files from `cdn/lib-retained/` into `dist/lib/`, after checking `retainedProblems`.
- [ ] **Step 4:** Add `manifest.deprecated` and `manifest.retired`, from `noticeData(record, manifest.assets, today, generated)`.
- [ ] **Step 5:** Add `"lib:record": "node scripts/vendor-closure.mjs --record"`. Create `cdn/lib-versions.json` with the three retired seeds from spec §10. Run `npm run lib:record`.
- [ ] **Step 6:** Write `scripts/lib-verify-live.mjs` (`npm run lib:verify-live`). It fetches every recorded current file from `LIVE_ORIGIN` and compares hashes. Run it, so the first record is proved against what is served.
- [ ] **Step 7:** `npm run build:vendor` passes. Changing one recorded hash fails it with the file named. Commit.

### Task 3: `lib:deprecate` and `lib:retire`

**Consumes:** Task 1 and `--record` from Task 2.

- [ ] **Step 1:** Write tests with a stubbed `fetch` and a temporary directory. `deprecate(asset, { fetch, today, reason, root })`:
  - downloads each recorded file and the live `lib-manifest.json` entry;
  - stops with no changes on a hash mismatch, or when the live entry's version differs from the record's;
  - writes the frozen files and the `deprecated` entry, with `retireAfter = today + 60` and the live entry's `url`, `integrity` and `packages`.

  `retire(asset, version, { today, root })` deletes the frozen files, moves the entry to `retired`, and prunes retired entries past 90 days.
- [ ] **Step 2:** Implement `scripts/lib-deprecate.mjs` and `scripts/lib-retire.mjs`, exporting those functions. Each CLI:
  - `deprecate` then runs `vendor-closure.mjs --record`, sets `replacement` from the new manifest (null if the asset is gone), and prints a CHANGELOG line and the apps-team note text;
  - `retire` prints a CHANGELOG line.
- [ ] **Step 3:** Add `"lib:deprecate"` and `"lib:retire"` to `package.json`. The tests pass. Commit.

### Task 4: Notices on every build

**Consumes:** Task 1 and the manifest fields from Task 2.

- [ ] **Step 1:** Export `convertMarkdown` and `wrapHtml` from `scripts/generate-docs.js`.
- [ ] **Step 2:** Write `scripts/lib-notices.mjs`, which writes:
  - `dist/lib-deprecations.json` (`noticeData` plus `policy`);
  - `dist/lib-deprecations.md`;
  - `dist/docs/lib-deprecations.html` (through `wrapHtml(convertMarkdown(md))`);
  - `headerRules` appended to `dist/_headers`. It throws above Cloudflare's 100-rule limit.

  It then prints `summaryLines`.
- [ ] **Step 3:** Add `"build:lib-notices"` to `package.json`, and to `build` after `build:docs`.
- [ ] **Step 4:** Add a test that runs the notices against a fixture record and manifest in a temporary `dist`, and checks all four outputs. Commit.

### Task 5: The audit and the overdue check

- [ ] **Step 1:** In `vendor-audit.mjs`'s `manifestAssets`, also return each `manifest.deprecated` entry as the asset `<asset>@<version>`, with its `packages`. Add a test.
- [ ] **Step 2:** Write `scripts/check-lib-retention.mjs`:
  - it exits 1 listing each `overdue` entry, with the `lib:retire` command;
  - it prints a warning for each `dueSoon` entry;
  - it takes `--today` for its test.

  Add it to `test-local.sh` as `[32]`. Commit.

### Task 6: Documentation and verification

- [ ] **Step 1:** Rewrite `CDN_CONTRACT.md` "Bumping a version" to state the policy. It links `/lib-deprecations.json` and `/docs/lib-deprecations.html`.
- [ ] **Step 2:** Add a "Deprecations" section to `docs/CDN_INTEGRATION_GUIDE.md`, covering the headers, the JSON and the 60 days.
- [ ] **Step 3:** Add the rule to `AGENTS.md`. Write ADR-261 in `agentknowledge/decisions.yaml`, a history line, and a CHANGELOG entry.
- [ ] **Step 4:** Stage everything. Run `npm run build`, `npm test`, `npm run test:structure` and `npm run test:e2e`. Push, open the PR, and wait for CI.

## Deviation from the spec

Spec §11 asks for an e2e test of a deprecated path. No version is deprecated yet, and a test over an empty list could not fail. Task 1's tests check the frozen bytes against their recorded SRI hash. The first real deprecation (SignalR, #145) adds the browser check, with a real entry.
