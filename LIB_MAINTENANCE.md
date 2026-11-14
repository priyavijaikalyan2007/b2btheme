<!-- AGENT: Step-by-step runbook for maintaining the vendored libraries this CDN serves at /lib/: upgrading one (Dependabot or by hand), retiring an old version after 60 days or at once for a security advisory, adding or removing a library, and every error message with its fix. Policy: specs/lib-retention.prd.md (#147, ADR-261). Rule: AGENTS.md "Served /lib/ Versions". -->

# Maintaining the libraries in `/lib/`

This guide is for anyone who has to upgrade, add, remove or retire a library that this repository serves under `/lib/`. Every operation is written as numbered steps. Do them in order, and do not skip one.

If you only want to know **why** this works the way it does, read `specs/lib-retention.prd.md`. If you want the short rules for agents, read the "Served `/lib/` Versions" section of `AGENTS.md`.

---

## 1. What this is about, in plain words

This repository is published as a website, `https://static.knobby.io`. Part of that website is a folder called `/lib/`. It holds copies of other people's libraries, such as SignalR, Chart.js and Font Awesome.

Other websites load these files directly. The knobby.io apps are the main ones. They load each file by its **exact address** and its **hash**. Here is a real example from the apps:

```html
<script src="https://static.knobby.io/lib/cytoscape-3.26.0.js"
        integrity="sha384-+4PsOx8pfCvP2QccNj+4PHhCkQFmbi69UlEi43BHbHopL1unxFMpqiPXNscfoiM5"
        crossorigin="anonymous"></script>
```

The `integrity` value is a fingerprint of the file. The browser refuses the file if even one byte is different. That protects users, but it gives us two rules we can never break:

1. **Never change the bytes of a file at an address that is already published.** Every page that pins its hash would break.
2. **Never delete a published file without warning.** Every page that loads it would get a "404 Not Found" error.

So when a library is upgraded, the new version gets a **new address**, such as `cytoscape-3.34.4.js`. The old address keeps working for **60 days**. During those 60 days, everyone is told that it will go away. After 60 days, we delete it.

The build checks all of this for you. If you try to skip a step, the build fails and tells you what to run.

---

## 2. Words used in this guide

| Word | What it means |
|---|---|
| **Asset** | One library as we serve it, such as `signalr` or `font-awesome`. Its name is the start of its address: `/lib/signalr-8.0.0.js`. |
| **Package** | The npm package the asset is built from, such as `@microsoft/signalr`. One package can make more than one asset. |
| **Version** | The number in the address, such as `8.0.0`. It always comes from one package (see section 12). |
| **Hash** | The `sha384-…` fingerprint of a file. Browsers check it. |
| **Current** | The version the build makes today from `node_modules`. |
| **Deprecated** | An old version that a newer one replaced. It still works, for 60 days. |
| **Retired** | A deprecated version whose 60 days are over. Its files are deleted, and its address returns 404. |
| **The record** | The file `cdn/lib-versions.json`. It lists every current file with its hash, every deprecated version and every recent retirement. |
| **Frozen files** | Exact copies of deprecated files, kept in `cdn/lib-retained/`, so they keep serving after `node_modules` moves on. |
| **Deploy** | Every push to `main` publishes the website. A deploy can delete a retired file. |

**Never edit `cdn/lib-versions.json` or anything in `cdn/lib-retained/` by hand.** The commands in this guide check every byte. A hand edit skips those checks.

---

## 3. Before you start (every time)

You need these tools. Check each one in a terminal.

| Tool | Check it with | You need |
|---|---|---|
| Node.js | `node --version` | `v24` or later |
| npm | `npm --version` | any recent version |
| git | `git --version` | any recent version |
| GitHub CLI | `gh auth status` | "Logged in to github.com" |

You also need an internet connection. Some commands download files from `https://static.knobby.io`.

Then, **every time** you start:

1. Open a terminal in the repository folder.
2. Go to the main branch and get the latest code:
   ```bash
   git checkout main
   git pull
   ```
3. Install exactly the packages the lock file lists:
   ```bash
   npm ci
   ```
4. Make sure the build works before you change anything:
   ```bash
   npm run build:vendor
   ```
   It should end with a line like `manifest -> dist/lib-manifest.json`. If it fails before you change anything, stop and tell the owner. Something is already wrong.

---

## 4. Which operation do I need?

Find your situation, then go to that section.

| Your situation | Go to |
|---|---|
| Dependabot opened a pull request that upgrades a library we serve, and its CI failed with "without a deprecation" | **Operation A** |
| You want to upgrade a library we serve yourself | **Operation B** |
| CI or the build says "changed bytes under the same URL", or `lib:deprecate` says "is still … in node_modules" | **Operation C** |
| CI fails check `[32]` with "was due to retire after" | **Operation D** |
| The audit says a **deprecated** version has a security advisory, or you are upgrading away from a vulnerable version | **Operation E** |
| You want to serve a new library that is not in `/lib/` yet | **Operation F** |
| You want to stop serving a library completely | **Operation G** |
| You want to check that the live website still matches the record | **Operation H** |
| You see an error and are not sure what it means | **Section 11** |

To see which assets we serve and which package each one comes from, look at the table in **section 12**.

---

## 5. Operation A: accept a Dependabot upgrade

Dependabot is a GitHub robot that opens pull requests to upgrade packages. When it upgrades a package we serve, its CI fails **on purpose**. That failure is the build telling you to keep the old version working for 60 days.

### Step 1. Read the failure

1. Open the pull request on GitHub.
2. Note its number. For example, `#161`.
3. Click **Checks**, then **build-and-test**, and find the red step.
4. Look for a line that starts with `[vendor-closure]`. It looks like this:
   ```
   [vendor-closure] cytoscape moved from 3.26.0 to 3.34.4 without a deprecation, so 3.26.0's URL
   would return 404 on deploy. Run `npm run lib:deprecate -- cytoscape` on this branch: it keeps the
   old bytes serving for 60 days.
   ```
5. Write down **every asset name** it gives. Here it is `cytoscape`. Some packages make more than one asset. A `vditor` upgrade names `vditor`, `vditor-css` and `vditor-integrity`, so you would write down all three.

If the line says **"changed bytes under the same URL"** instead, stop. Go to **Operation C**.

### Step 2. Get the pull request on your computer

1. Do section 3 first.
2. Check out the pull request's branch. Use its number:
   ```bash
   gh pr checkout 161
   ```
3. Install the upgraded packages:
   ```bash
   npm ci
   ```
4. Run the vendor build. It should fail with the same message you saw on GitHub:
   ```bash
   npm run build:vendor
   ```

### Step 3. Deprecate the old version

1. Run `lib:deprecate` with every asset name from step 1, and a one-sentence reason. Put the reason in double quotes:
   ```bash
   npm run lib:deprecate -- cytoscape --reason "Dependabot #161: upgrade to 3.34.4 for bug fixes."
   ```
   For a package that makes several assets, list them all in one command:
   ```bash
   npm run lib:deprecate -- vditor vditor-css vditor-integrity --reason "Dependabot #<number>: upgrade to <version>."
   ```
2. What it does, so you know what to expect:
   - It downloads every old file from `https://static.knobby.io`.
   - It checks each file against the hash in the record. **If any file does not match, it stops and changes nothing.**
   - It saves the old files in `cdn/lib-retained/`.
   - It writes the deprecation into the record, with a retire date 60 days from today.
   - It rebuilds, and checks everything again.
3. It ends by printing, for each asset:
   - `[lib:deprecate] cytoscape 3.26.0 is deprecated until 2027-01-13.`
   - a **CHANGELOG line**
   - an **apps-team note**

   Keep this terminal open. You need both texts in the next step.

If it prints an error instead, nothing was changed. Look the error up in **section 11**.

### Step 4. Write the two notes

1. Open `CHANGELOG.md`. Under `## [Unreleased]`, find `### Changed`. If it is not there, add it. Paste the CHANGELOG line under it.
2. Create a new file in the **apps repository**, not this one: `~/Work/knobby/apps/specs/bugreports/<today>-<asset>-<old version>-deprecated.md`. Paste the apps-team note into it. An example name is `2026-11-14-cytoscape-3.26.0-deprecated.md`. The owner commits that file in the apps repository. Do not commit it yourself.

### Step 5. Check your changes

1. Look at what changed:
   ```bash
   git status
   ```
   You should see exactly these:
   - `cdn/lib-versions.json`, modified
   - `cdn/lib-retained/`, new, holding the old files
   - `CHANGELOG.md`, modified

   `package.json` and `package-lock.json` are already changed in Dependabot's commit.
2. If you see anything else, stop and ask the owner before you continue.
3. Stage the files. The structure checks only see files git knows about:
   ```bash
   git add cdn/lib-versions.json cdn/lib-retained CHANGELOG.md
   ```
4. Run the checks. Each one must pass:
   ```bash
   npm run build
   npm test
   npm run test:structure
   ```

### Step 6. Commit, push and merge

1. Commit:
   ```bash
   git commit -m "chore(deps): deprecate cytoscape 3.26.0 for 60 days (#161)"
   ```
2. Push to the same pull request:
   ```bash
   git push
   ```
3. Wait for every check on the pull request to turn green. Then merge it. Merging deploys it.

Dependabot usually stops updating a pull request once someone else pushes to it. If anyone asks Dependabot to "recreate" the pull request, your commit is lost, and you must do this operation again.

### Step 7. Confirm it after the deploy

Wait a few minutes after the merge, then do both of these.

1. Check that the old file still serves, with its warning headers:
   ```bash
   curl -sI https://static.knobby.io/lib/cytoscape-3.26.0.js | grep -i -E "^(HTTP|deprecation|sunset|link)"
   ```
   You should see `HTTP/2 200`, a `deprecation:` line, a `sunset:` line and a `link:` line that names the new file.
2. Open `https://static.knobby.io/docs/lib-deprecations.html` in a browser. The old version should be listed with about 60 days left.

---

## 6. Operation B: upgrade a library yourself

Use this when Dependabot did not open a pull request, or when you need a specific version.

1. Do section 3.
2. Make a branch. Name it after the package and the new version:
   ```bash
   git checkout -b chore/cytoscape-3.34.4
   ```
3. Install the new version **exactly**, with no `^` or `~`. Check [28] fails on a range:
   ```bash
   npm install --save-exact cytoscape@3.34.4
   ```
   Use the **package** name, not the asset name. Section 12 lists both.
4. Run the vendor build. It must fail with "without a deprecation", naming each asset:
   ```bash
   npm run build:vendor
   ```
   If it says "changed bytes under the same URL" instead, go to **Operation C**.
5. Do **Operation A, steps 3 to 5**: deprecate, write the two notes, check.
6. Stage and commit everything, including the package files:
   ```bash
   git add package.json package-lock.json cdn/lib-versions.json cdn/lib-retained CHANGELOG.md
   git commit -m "chore(deps): cytoscape 3.26.0 to 3.34.4, with 3.26.0 deprecated for 60 days"
   git push -u origin chore/cytoscape-3.34.4
   ```
7. Open a pull request:
   ```bash
   gh pr create --fill
   ```
8. Wait for green checks, merge, then do **Operation A, step 7**.

The A2UI packages (`@a2ui/web_core`, `@a2ui/lit`, `@a2ui/react`) must always move together, to the same version.

---

## 7. Operation C: a package inside a bundle

Three assets are bundles. Each one holds many packages, but its version, and so its address, comes from **one** of them:

| Asset | Its version comes from | It also holds |
|---|---|---|
| `codemirror6` | `@codemirror/view` | 27 more packages, such as `@codemirror/lint` and `@lezer/highlight` |
| `a2ui-runtime` | `@a2ui/web_core` | 13 more packages, such as `@a2ui/lit`, `lit` and `zod` |
| `mcp-ext-apps` | `@modelcontextprotocol/ext-apps` | 7 more packages, such as `@modelcontextprotocol/client` |

Here is the problem. Say Dependabot upgrades only `@codemirror/lint`. The bundle's bytes change, but its version still comes from `@codemirror/view`, which did not move. So the new bytes would land at the **same address**. Every page that pins the old hash would break. The build refuses this with:

```
[vendor-closure] codemirror6 6.43.15: /lib/codemirror6-6.43.15.js changed bytes under the same URL ...
```

and `lib:deprecate` refuses it with:

```
lib:deprecate: codemirror6 is still 6.43.15 in node_modules, so its URL would not change ...
```

You have two choices. Pick one.

**Choice 1: close the upgrade (the usual answer).**

1. On the pull request, write a comment:
   > Closing: `@codemirror/lint` is bundled in `/lib/codemirror6-<version>.js`, whose address comes from `@codemirror/view`. It can only move when `@codemirror/view` moves. See LIB_MAINTENANCE.md, Operation C.
2. Close the pull request without merging.

**Choice 2: move the naming package too.** Only do this if the naming package has a newer release.

1. Check its newest version:
   ```bash
   npm view @codemirror/view version
   ```
2. If that version is newer than ours, check out the branch and do Operation A, step 2. If you are working by hand, do Operation B, steps 1 to 2.
3. Install the newer naming package exactly:
   ```bash
   npm install --save-exact @codemirror/view@<newer version>
   ```
4. Run `npm run build:vendor`. It should now say "moved from … without a deprecation".
5. Continue with **Operation A, step 3**.

The same message can also mean that a **build tool** changed, such as an esbuild upgrade that writes the bundle differently. If no bundled package moved, the tool upgrade is the cause. That upgrade cannot ship as it is. Close it, and tell the owner.

---

## 8. Operation D: retire a version after its 60 days

About 14 days before a retire date, every build prints a warning like this:

```
[lib] WARNING: cytoscape 3.26.0 retires in 8 days (after 2027-01-13)
```

The day after the date, check `[32]` fails every pull request until the version is retired:

```
cytoscape 3.26.0 was due to retire after 2027-01-13. Run `npm run lib:retire -- cytoscape@3.26.0` and commit the result.
```

1. Do section 3.
2. **Check that nobody still uses it.** Search the apps repository for the old file name:
   ```bash
   grep -rn "cytoscape-3.26.0" ~/Work/knobby/apps --include=*.html --include=*.ts --include=*.js --include=*.cshtml
   ```
   If anything is found, **stop**. Tell the owner, because those pages will break. There is no command to extend the 60 days.
3. Make a branch:
   ```bash
   git checkout -b chore/retire-cytoscape-3.26.0
   ```
4. Retire it. Use `<asset>@<version>`:
   ```bash
   npm run lib:retire -- cytoscape@3.26.0
   ```
   It deletes the frozen files and moves the version to the "retired" list. It prints a CHANGELOG line.
5. Paste the CHANGELOG line under `## [Unreleased]`, `### Changed`, in `CHANGELOG.md`.
6. Stage everything under `cdn/`, including the deleted files, then check:
   ```bash
   git add -A cdn CHANGELOG.md
   npm run build
   npm test
   npm run test:structure
   ```
7. Commit, push and open a pull request:
   ```bash
   git commit -m "chore(cdn): retire cytoscape 3.26.0 after its 60 days"
   git push -u origin chore/retire-cytoscape-3.26.0
   gh pr create --fill
   ```
8. Merge once the checks are green. The next deploy stops serving the file. It stays listed as retired for 90 days, so anyone who gets a 404 can find out why.

---

## 9. Operation E: retire at once for a security advisory

A deprecated version with a known security problem must not keep serving for 60 days. The audit, `npm run audit:vendor`, runs in CI and checks deprecated versions too. It fails like this:

```
cytoscape@3.26.0 [high] GHSA-xxxx-xxxx-xxxx in deprecated cytoscape 3.26.0. Retire it now with
`npm run lib:retire -- cytoscape@3.26.0`, or record an exception in scripts/audit-exceptions.mjs.
```

1. Do **Operation D**, but skip step 2. A vulnerable file goes away even if pages still use it.
2. In the CHANGELOG line, add the advisory and say that it was retired early. For example:
   > Retired at once for GHSA-xxxx-xxxx-xxxx.
3. Tell the owner, and send the apps team a note naming the replacement.

**Upgrading away from a vulnerable version.** If the **current** version has the advisory and you upgrade to a fixed one, do Operation A or B as usual. Then, on the same branch and before you commit, also run `lib:retire` for the old version. Otherwise the audit fails on the old vulnerable copy you just froze.

Only the owner decides whether an advisory may be excused instead. An exception is a recorded, dated decision in `scripts/audit-exceptions.mjs`. It is never a shortcut.

---

## 10. Operations F, G and H

### Operation F: serve a new library

1. Do section 3, then make a branch:
   ```bash
   git checkout -b feat/lib-<name>
   ```
2. Install the package exactly:
   ```bash
   npm install --save-exact <package>@<version>
   ```
3. Add an entry for it to the `ASSETS` list in `scripts/vendor-closure.mjs`. Copy an existing entry of the same kind and change it. The kinds are explained in the comment above the list:
   - `copy`: the package already ships one ready file.
   - `bundle`: esbuild combines it into one file.
   - `tree`: a whole folder, such as fonts.
4. Run the vendor build. It must fail with "is served but not in cdn/lib-versions.json":
   ```bash
   npm run build:vendor
   ```
5. Add it to the record:
   ```bash
   npm run lib:record
   ```
   This **only adds new assets**. It refuses any other change, so it cannot skip a deprecation.
6. Check that only your asset was added:
   ```bash
   git diff cdn/lib-versions.json
   ```
   If any other asset changed, stop and ask the owner.
7. Add a row for it to the "Currently served" table in `CDN_CONTRACT.md`, and a CHANGELOG line.
8. Stage, check, commit and open a pull request, as in Operation B, steps 6 to 8.

### Operation G: stop serving a library completely

This works like an upgrade, but nothing replaces the old version. It still serves for 60 days.

1. Do section 3, then make a branch.
2. Remove its entry from the `ASSETS` list in `scripts/vendor-closure.mjs`.
3. If nothing else in the repository uses the package, uninstall it:
   ```bash
   npm uninstall <package>
   ```
4. Run `npm run build:vendor`. It must fail with "is in cdn/lib-versions.json but no longer built".
5. Deprecate it:
   ```bash
   npm run lib:deprecate -- <asset> --reason "No longer served: <why>."
   ```
   Its replacement is "nothing", and the notices say so.
6. Remove its row from `CDN_CONTRACT.md`. Then continue with **Operation A, steps 4 to 7**.

### Operation H: check the live website against the record

This downloads every current file from `https://static.knobby.io` and compares each hash with the record.

```bash
npm run lib:verify-live
```

It should print `[lib-verify-live] all 505 current files match https://static.knobby.io.` The number grows as libraries are added.

Run it before a deprecation, or whenever you suspect the website and the repository disagree. It can also differ for a few minutes right after a merge, while the deploy finishes. If it still differs after that, stop and tell the owner.

---

## 11. Error messages and what to do

Find the start of the message in the left column.

| Message starts with | What it means | What to do |
|---|---|---|
| `… moved from A to B without a deprecation` | A served version changed, and the old address would break. | Operation A or B, step 3. List every asset the build names. |
| `… changed bytes under the same URL` | A file changed, but its address did not. | Operation C. |
| `… is served but not in cdn/lib-versions.json` | A new asset is in `vendor-closure.mjs`. | Operation F, step 5. |
| `… is in cdn/lib-versions.json but no longer built` | An asset was removed from `vendor-closure.mjs`. | Operation G, step 5. If you did not mean to remove it, put it back. |
| `… is both current and deprecated` | One address would have two hashes. This usually means a bundle (Operation C) was deprecated. | Undo your changes (see below), then do Operation C. |
| `cdn/lib-retained/… does not match its recorded hash` | Someone edited a frozen file. | Undo your changes to `cdn/` (see below). |
| `cdn/lib-retained/… is missing` | A frozen file was deleted. | Undo your changes to `cdn/` (see below). |
| `… is in cdn/lib-retained but no deprecated entry names it` | A stray file is in the frozen folder. | Undo your changes to `cdn/` (see below). |
| `lib:deprecate: … is still X in node_modules` | A bundle's address would not change. | Operation C. Nothing was changed. |
| `lib:deprecate: https://static.knobby.io serves … but … records …` | The website and the record disagree about the version. | Wait a few minutes if `main` was just merged, then retry. Otherwise run Operation H and tell the owner. Nothing was changed. |
| `… returned 404` or `… does not match its recorded hash` from `lib:deprecate` or `lib:verify-live` | A live file is missing or different. | Run Operation H. Do not continue. Tell the owner. Nothing was changed. |
| `lib:deprecate needs a reason` | You left out `--reason`. | Run it again with `--reason "<one sentence>"`. |
| `… is not a current asset in cdn/lib-versions.json` | You used a package name, or misspelled the asset. | Use the asset name from section 12 or from the build's message. |
| `… was due to retire after <date>` (check [32]) | The 60 days are over. | Operation D. |
| `… in deprecated … Retire it now` (audit) | A deprecated version has a security advisory. | Operation E. |
| `npm's advisory endpoint returned 5xx` | npm's server had a problem. | Wait a few minutes, then run `npm run audit:vendor` again. |
| `… _headers rules is over Cloudflare's limit of 100` | Too many header rules. | Retire a deprecated version, or ask the owner to merge rules in `cdn/_headers`. |

**Undo your changes before you commit.** If a command left things in a bad state, put `cdn/` back as it was on your branch:

```bash
git restore cdn/lib-versions.json
git clean -fd cdn/lib-retained
```

`git clean -fd cdn/lib-retained` deletes only the files in that folder that git does not know about yet. Check with `git status` that only the changes you expect are left.

---

## 12. Every asset we serve

| Asset | Its version comes from | Version today | Address |
|---|---|---|---|
| `dompurify` | `dompurify` | 3.4.17 | `/lib/dompurify-3.4.17.js` |
| `codemirror6` | `@codemirror/view` (bundle of 28) | 6.43.15 | `/lib/codemirror6-6.43.15.js` |
| `maxgraph` | `@maxgraph/core` | 0.22.0 | `/lib/maxgraph-0.22.0.js` |
| `a2ui-runtime` | `@a2ui/web_core` (bundle of 14) | 0.15.0 | `/lib/a2ui-runtime-0.15.0.js` |
| `mcp-ext-apps` | `@modelcontextprotocol/ext-apps` (bundle of 8) | 2.0.4 | `/lib/mcp-ext-apps-2.0.4.js` |
| `signalr` | `@microsoft/signalr` | 8.0.0 | `/lib/signalr-8.0.0.js` |
| `cytoscape` | `cytoscape` | 3.26.0 | `/lib/cytoscape-3.26.0.js` |
| `chart.js` | `chart.js` | 4.5.1 | `/lib/chart.js-4.5.1.js` |
| `vditor` | `vditor` | 3.11.2 | `/lib/vditor-3.11.2/` (419 files) |
| `vditor-css` | `vditor` | 3.11.2 | `/lib/vditor-css-3.11.2/index.css` |
| `vditor-integrity` | `vditor` | 3.11.2 | `/lib/vditor-integrity-3.11.2.js` |
| `bootstrap` | `bootstrap` | 5.3.8 | `/lib/bootstrap-5.3.8.js` |
| `marked` | `marked` | 18.1.3 | `/lib/marked-18.1.3.js` |
| `katex` | `katex` | 0.19.0 | `/lib/katex-0.19.0.js` |
| `katex-css` | `katex` | 0.19.0 | `/lib/katex-css-0.19.0/` |
| `font-awesome` | `@fortawesome/fontawesome-free` | 6.5.1 | `/lib/font-awesome-6.5.1/` |
| `bootstrap-icons` | `bootstrap-icons` | 1.13.1 | `/lib/bootstrap-icons-1.13.1/` |

This table is a snapshot from 2026-11-14. The live list is always at `https://static.knobby.io/lib-deprecations.json`, under `current`.

Some packages make more than one asset:
- `vditor` makes `vditor`, `vditor-css` and `vditor-integrity`.
- `katex` makes `katex` and `katex-css`.

When one of those packages moves, deprecate all of its assets in one `lib:deprecate` command.

A vditor deprecation is large. It freezes 419 files, about 22 MB, for 60 days. That is allowed, but tell the owner before you do it.

---

## 13. Where people and agents see the notices

Every build publishes these. You never edit them, because they are made from the record.

| Where | For | What it shows |
|---|---|---|
| `https://static.knobby.io/docs/lib-deprecations.html` | people | Current versions, deprecated versions with days left, and recent retirements |
| `https://static.knobby.io/lib-deprecations.json` | programs and agents | The same, as JSON |
| `https://static.knobby.io/lib-deprecations.md` | agents | The same, as Markdown |
| `https://static.knobby.io/lib-manifest.json` | programs | `assets` as before, plus `deprecated` and `retired` |
| The headers of each deprecated file | browsers and tools | `Deprecation`, `Sunset` (the last guaranteed day) and `Link` to the new file |
| The build log | you | `[lib] 17 current, 1 deprecated, …`, and a `WARNING` line 14 days before each retirement |

---

## 14. The rules, one more time

- Never change the bytes at a published `/lib/` address.
- Never delete a published version without its 60 days, except for a security advisory.
- Never edit `cdn/lib-versions.json` or `cdn/lib-retained/` by hand.
- Never push past a failing check. Each one names the fix.
- Always pin packages exactly (`--save-exact`).
- Always add a CHANGELOG line, and an apps-team note for each deprecation.
