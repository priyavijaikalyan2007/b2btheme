#!/bin/bash
# ============================================================================
# test-local.sh — Verify file structure, links, and references for local dev
# Run after `npm run build`. Validates that run.sh serves a working site.
# ============================================================================
#
# USE `grep -oE`, NEVER `grep -oP`.
#
# BSD grep on macOS — the primary development machine — has no -P. Four loops
# here were written with it: checks [4], [5] (twice) and [6]. On CI's GNU grep
# they worked; locally the grep aborted, the `for` list came out EMPTY, the
# loop body never ran, the error counter stayed at zero, and the check
# reported PASS. Two of them had `2>/dev/null` attached, so they did it in
# silence. Every pattern involved was plain enough for POSIX ERE, so the -P
# bought nothing and cost three vacuous checks on the machine where they are
# actually run. A check that cannot fail is not a check (AGENT_INSIGHTS 6.35).

set -e

PASS=0
FAIL=0
WARN=0

pass() { PASS=$((PASS + 1)); echo "  PASS: $1"; }
fail() { FAIL=$((FAIL + 1)); echo "  FAIL: $1"; }
warn() { WARN=$((WARN + 1)); echo "  WARN: $1"; }

echo "=== Local Structure Tests ==="
echo ""

# ── 1. dist/ directory exists ──
echo "[1] Build output"
if [ -d "dist" ]; then pass "dist/ exists"; else fail "dist/ missing — run npm run build"; fi
if [ -f "dist/css/custom.css" ]; then pass "dist/css/custom.css exists"; else fail "dist/css/custom.css missing"; fi
if [ -f "dist/js/bootstrap.bundle.min.js" ]; then pass "dist/js/bootstrap.bundle.min.js exists"; else fail "dist/js/bootstrap.bundle.min.js missing"; fi
echo ""

# ── 2. Component build outputs ──
echo "[2] Component build outputs"
COMP_COUNT=0
COMP_MISSING=0
for dir in components/*/; do
    name=$(basename "$dir")
    [ "$name" = "diagramengine" ] && continue  # has submodules, skip
    COMP_COUNT=$((COMP_COUNT + 1))
    if [ ! -f "dist/components/$name/$name.js" ]; then
        fail "dist/components/$name/$name.js missing"
        COMP_MISSING=$((COMP_MISSING + 1))
    fi
done
if [ "$COMP_MISSING" -eq 0 ]; then
    pass "All $COMP_COUNT components have JS in dist/"
fi
echo ""

# ── 3. Component READMEs ──
echo "[3] Component READMEs"
README_MISSING=0
for dir in components/*/; do
    name=$(basename "$dir")
    if [ ! -f "components/$name/README.md" ]; then
        fail "components/$name/README.md missing"
        README_MISSING=$((README_MISSING + 1))
    fi
done
if [ "$README_MISSING" -eq 0 ]; then
    pass "All components have README.md"
fi
echo ""

# ── 4. Demo pages ──
echo "[4] Demo pages"
if [ ! -f "demo/index.html" ]; then
    fail "demo/index.html missing"
else
    pass "demo/index.html exists"
    # Check that demo page links resolve
    DEMO_MISSING=0
    for href in $(grep -oE 'href="components/[^"]+\.html"' demo/index.html | sed 's/href="//;s/"//'); do
        if [ ! -f "demo/$href" ]; then
            fail "demo/$href referenced but missing"
            DEMO_MISSING=$((DEMO_MISSING + 1))
        fi
    done

    # SIBLING links, demo page to demo page. The loop above only walks DOWN
    # from the index, so a cross-reference between two component pages was
    # never checked — and one had rotted: workspaceshell.html pointed at
    # workspaceswitcher.html, a page the TenantSwitcher rename had renamed
    # away (DEBT-TS-1). A rename updates what the index lists; it does not
    # update what one page says about another.
    for demo in demo/components/*.html; do
        case "$(basename "$demo")" in _*) continue;; esac
        for href in $(grep -oE 'href="[A-Za-z0-9._-]+\.html"' "$demo" \
                      | sed 's/href="//;s/"//' | sort -u); do
            if [ ! -f "demo/components/$href" ]; then
                fail "$demo links to missing sibling: $href"
                DEMO_MISSING=$((DEMO_MISSING + 1))
            fi
        done
    done

    if [ "$DEMO_MISSING" -eq 0 ]; then
        pass "All demo page links resolve, index and sibling alike"
    fi
fi
echo ""

# ── 5. Demo pages reference valid dist/ assets ──
echo "[5] Demo asset references"
ASSET_ERRORS=0
for demo in demo/components/*.html; do
    # Skip template files
    case "$(basename "$demo")" in _*) continue;; esac
    # Check CSS references
    for ref in $(grep -oE 'href="\.\./\.\./dist/[^"]+\.css"' "$demo" | sed 's/href="//;s/"//'); do
        resolved="demo/components/$ref"
        # Normalize path
        actual=$(cd "demo/components" 2>/dev/null && realpath -m "$ref" 2>/dev/null || echo "")
        if [ -n "$actual" ] && [ ! -f "$actual" ]; then
            fail "$demo references missing CSS: $ref"
            ASSET_ERRORS=$((ASSET_ERRORS + 1))
        fi
    done
    # Check JS references
    for ref in $(grep -oE 'src="\.\./\.\./dist/[^"]+\.js"' "$demo" | sed 's/src="//;s/"//'); do
        resolved="demo/components/$ref"
        actual=$(cd "demo/components" 2>/dev/null && realpath -m "$ref" 2>/dev/null || echo "")
        if [ -n "$actual" ] && [ ! -f "$actual" ]; then
            fail "$demo references missing JS: $ref"
            ASSET_ERRORS=$((ASSET_ERRORS + 1))
        fi
    done
done
if [ "$ASSET_ERRORS" -eq 0 ]; then
    pass "All demo asset references resolve"
fi
echo ""

# ── 6. COMPONENT_INDEX.md links ──
echo "[6] COMPONENT_INDEX.md README links"
if [ -f "COMPONENT_INDEX.md" ]; then
    INDEX_BROKEN=0
    for link in $(grep -oE '\(components/[^)]+/README\.md\)' COMPONENT_INDEX.md | tr -d '()'); do
        if [ ! -f "$link" ]; then
            fail "COMPONENT_INDEX.md links to missing: $link"
            INDEX_BROKEN=$((INDEX_BROKEN + 1))
        fi
    done
    if [ "$INDEX_BROKEN" -eq 0 ]; then
        pass "All COMPONENT_INDEX.md README links resolve"
    fi
fi
echo ""

# ── 7. Required root files ──
echo "[7] Required root files"
for f in LICENSE README.md DISCLAIMER.md COMPONENT_INDEX.md package.json tsconfig.json .gitignore; do
    if [ -f "$f" ]; then pass "$f exists"; else fail "$f missing"; fi
done
echo ""

# ── 8. Agent knowledge base is machine-readable ──
# history.jsonl silently accumulated three malformed lines between 2026-02 and
# 2026-03 and nothing noticed for six months, because nothing ever parsed it.
# Two entries had been appended WITHOUT a trailing newline, so the next append
# landed on the same line; one carried a `\!` escape, which is not valid JSON
# and is the signature of bash history-expansion escaping leaking through a
# shell append. Both come from writing JSON with text tools instead of a JSON
# serializer. This check is what makes that fail loudly next time.
echo "[8] Agent knowledge base integrity"
if [ -f agentknowledge/history.jsonl ]; then
    if python3 - <<'PY'
import json, sys
bad = []
for n, line in enumerate(open("agentknowledge/history.jsonl", encoding="utf-8"), 1):
    if not line.strip():
        continue
    try:
        json.loads(line)
    except Exception as exc:
        bad.append(f"line {n}: {exc}")
if bad:
    print("\n".join(f"      {b}" for b in bad), file=sys.stderr)
    sys.exit(1)
PY
    then pass "history.jsonl is valid JSONL"
    else fail "history.jsonl has malformed lines (see above) — append with a JSON serializer, never echo/cat"
    fi
else
    fail "agentknowledge/history.jsonl missing"
fi

# AUDIT-2. This was inline python calling PyYAML with stderr sent to
# /dev/null, so it reported "is not valid YAML" for every non-zero
# exit — including the one where the interpreter has no PyYAML and the
# file was never opened. On 2026-10-22 a Homebrew `python3` came first
# on PATH here and the check called three valid files malformed.
#
# The module could not simply be installed: Homebrew's python is
# externally managed (PEP 668) and there is no `pyyaml` formula.
# PyYAML was also the only non-stdlib Python import in this repository
# and a dependency nothing could declare — CI passed because the
# GitHub Ubuntu image happens to ship it. `package.json` can state
# `js-yaml`, so the requirement now lives where the others do.
# A here-string, not a pipe: a piped `while` runs in a subshell and
# every `pass` it called would be lost, which is how this first went in
# with a hardcoded `PASS=$((PASS + 3))` beside it — a count that stops
# being true the moment the file list changes.
YAML_OK=0
YAML_OUT=$(node scripts/check-knowledge-yaml.mjs 2>&1) && YAML_OK=1

while IFS= read -r line; do
    [ -z "$line" ] && continue
    if [ "$YAML_OK" -eq 1 ]; then
        pass "$line"
    else
        case "$line" in
            *"is not valid YAML"*) fail "$line" ;;
            *) pass "$line" ;;
        esac
    fi
done <<< "$YAML_OUT"
echo ""

# ── 9. No stand-in component answers a read ──
# ADR-148. A component that failed to initialise must refuse a read, never
# answer it with a fabricated value — a host persisting that answer overwrites
# the user's own. Prose had already failed to prevent this twelve times, so
# the build checks. See the script header for what the check cannot see.
echo "[9] No fabricated reads (ADR-148)"
if [ -f scripts/check-stand-in-reads.py ]; then
    if python3 scripts/check-stand-in-reads.py; then
        PASS=$((PASS + 1))
    else
        fail "a stand-in factory answers a read (see above)"
    fi
else
    fail "scripts/check-stand-in-reads.py missing"
fi
echo ""

# ── 10. Vendored dependency closure matches its published hashes ──
# DEBT-SEC-4 / ADR-149. Consumers pin integrity="sha384-..." from the
# manifest; a hash that no longer matches its file is a hard load failure in
# the browser, which is the outage SRI exists to prevent rather than cause.
echo "[10] Dependency closure (ADR-149)"
if [ -f scripts/check-closure.mjs ]; then
    if node scripts/check-closure.mjs; then
        PASS=$((PASS + 1))
    else
        fail "vendored artifacts do not match the published manifest (see above)"
    fi
else
    fail "scripts/check-closure.mjs missing"
fi
echo ""

# ── 11. Every doc in docs/ is registered for publication ──
# A file in docs/ is published only if generate-docs.js lists it in
# HAND_WRITTEN_DOCS. Seven docs sat unregistered until 2026-10-04 — including
# the one written for consuming teams — and INDEX.md linked three of them, so
# the published site carried broken links nobody noticed. Creation plus
# registration is the deliverable (AGENT_INSIGHTS 6.7).
echo "[11] Docs are registered for publication"
UNREGISTERED=""
for f in docs/*.md; do
    b=$(basename "$f")
    case "$b" in
        AGENT_QUICK_REF.md|COMPONENT_REFERENCE.md|DESIGN_TOKENS.md) continue ;;
    esac
    if ! grep -q "\"$b\"" scripts/generate-docs.js; then
        UNREGISTERED="$UNREGISTERED $b"
    fi
done
if [ -z "$UNREGISTERED" ]; then
    pass "all hand-written docs are registered in generate-docs.js"
else
    fail "unregistered docs (will 404 if linked):$UNREGISTERED"
fi
echo ""

# ── 12. Surface ladder and text contrast ──
# DEBT-VR-5. Three AA problems shipped across ADR-147 and ADR-150 and every
# one was found by a hand-run browser audit AFTER the fact. All three were
# arithmetic. This is the gate that should have caught them. It prints the
# measured values on success too, so a pair sitting a hundredth above the
# floor is visible before it fails rather than after.
echo "[12] Surface contrast (ADR-150, DEBT-VR-5)"
if [ -f scripts/check-contrast.py ]; then
    if python3 scripts/check-contrast.py; then
        PASS=$((PASS + 1))
    else
        fail "surface ladder or text contrast regressed (see above)"
    fi
else
    fail "scripts/check-contrast.py missing"
fi
echo ""

# ── 13. Component colour palettes carry their own text ──
# DEBT-VR-7. Check [12] reads the compiled stylesheet, so it sees the THEME
# ladder and nothing else. Colours living in component TypeScript never reach
# :root and were invisible to it — nine avatar palettes carried white initials
# at ratios as low as 1.92, unreadable and shipped.
echo "[13] Component colour palettes (ADR-153)"
if [ -f scripts/check-component-palettes.py ]; then
    if python3 scripts/check-component-palettes.py; then
        PASS=$((PASS + 1))
    else
        fail "a component palette cannot carry its own text (see above)"
    fi
else
    fail "scripts/check-component-palettes.py missing"
fi
echo ""

# ── 14. The three elevation layers agree ──
# DEBT-VR-2. The shadow scale is declared three times — Sass $shadow-*, CSS
# --theme-shadow-*, and Bootstrap's own $box-shadow — and the copies drifted
# TWICE during ADR-147 to ADR-151, each time caught by a human noticing.
echo "[14] Elevation layers agree (ADR-155)"
if [ -f scripts/check-elevation.py ]; then
    if python3 scripts/check-elevation.py; then
        PASS=$((PASS + 1))
    else
        fail "the elevation layers disagree (see above)"
    fi
else
    fail "scripts/check-elevation.py missing"
fi
echo ""

# ── 15. Chart and status palettes survive colour-vision deficiency ──
# DEBT-VR-9. Check [13] asks whether a palette can carry TEXT; these carry
# none, so a different question applies — can two series be told apart? For
# roughly 1 in 12 men that has a different answer than it does for the author.
echo "[15] Series palettes under CVD (ADR-155)"
if [ -f scripts/check-series-palettes.py ]; then
    if python3 scripts/check-series-palettes.py; then
        PASS=$((PASS + 1))
    else
        fail "a series palette collapses for a colour-blind reader (see above)"
    fi
else
    fail "scripts/check-series-palettes.py missing"
fi
echo ""

# ── [16] ──
# check-stand-in-reads.py (check [9]) matches NAMES, so it sees only a stand-in
# that announces itself. ADR-148 found the worst instance in the whole audit was
# anonymous: DynamicFormSwitcher.fallbackDefault invented a typed value for a
# field that never mounted and fed it to getValues(). Whether a `return` sits
# INSIDE a catch is a structural question, and a regex answered it wrong 21
# times out of 25 — so this one walks the AST.
echo "[16] No fabricated reads in failure branches (ADR-157)"
if [ -f scripts/check-fabricated-reads.mjs ]; then
    if node scripts/check-fabricated-reads.mjs; then
        PASS=$((PASS + 1))
    else
        fail "a failure branch returns something readable (see above)"
    fi
else
    fail "scripts/check-fabricated-reads.mjs missing"
fi
echo ""

# ── [17] ──
# DEBT-PAR-2. AuthCard publishes GENERIC class names — .divider, .auth-card,
# .brand-logo — on a shared CDN, which would collide with any consumer that
# defines the same names. It cannot be namespaced: the Keycloak parity
# contract (ADR-138) requires these names verbatim, because a FreeMarker
# template mirrors them.
#
# So the collision risk is permanent and the MITIGATION is the whole defence:
# authcard.css is opt-in, loaded by its own <link>, and never bundled into
# custom.css. That mitigation was a sentence in a debt entry — nothing stopped
# a later @import from quietly ending it, and the symptom would appear in
# somebody else's application rather than here.
#
# The names are read from authcard.css rather than listed, so a tenth generic
# name is covered the day it is added.
echo "[17] AuthCard's generic names stay out of the shared bundle (DEBT-PAR-2)"
AUTHCARD_CSS="dist/components/authcard/authcard.css"
BUNDLE_CSS="dist/css/custom.css"
if [ ! -f "$AUTHCARD_CSS" ] || [ ! -f "$BUNDLE_CSS" ]; then
    fail "need both $AUTHCARD_CSS and $BUNDLE_CSS (run npm run build)"
else
    # Only names AuthCard OWNS — ones that START a selector. A class it
    # merely composes with (`.brand-logo.lg`, `.auth-step.active`) is
    # Bootstrap's, belongs in the bundle, and flagging it would make this
    # check cry wolf on its first run.
    GENERIC=$(grep -oE '(^|[}, ])\.[a-z][a-z0-9-]*' "$AUTHCARD_CSS" \
              | grep -oE '\.[a-z][a-z0-9-]*' | sort -u)
    if [ -z "$GENERIC" ]; then
        fail "no class names found in $AUTHCARD_CSS — the check would pass vacuously"
    else
        LEAKED=0
        for cls in $GENERIC; do
            # Match the class as a whole token: .divider must not match
            # .divider-text, and .dropdown-divider must not match .divider.
            if grep -qE "(^|[^a-zA-Z0-9_-])${cls}([^a-zA-Z0-9_-]|$)" "$BUNDLE_CSS"; then
                fail "AuthCard's '$cls' is in the shared bundle — DEBT-PAR-2's mitigation has lapsed"
                LEAKED=$((LEAKED + 1))
            fi
        done
        if [ "$LEAKED" -eq 0 ]; then
            pass "$(echo "$GENERIC" | wc -l | tr -d ' ') AuthCard class name(s) stay opt-in"
        fi
    fi
fi
echo ""

# ── [18] ──
# DEBT-DUI-5, approach B (ADR-162). A canvas anchor used to name a scrolling
# region by its INDEX in DOM order, and an index moves: isScrollable requires
# an element to be overflowing at the time of the test, so a styled region
# whose content fits drops out of the list and every later index shifts —
# same component, same version, same session.
#
# A region that names itself cannot move. The check reads each component's
# stylesheet for regions and its TypeScript for names, because the gate suite
# runs in jsdom, which has no layout and never loads these stylesheets, so a
# mounted-DOM check would find no scrolling region at all.
echo "[18] Every scrolling region a component creates declares a name (ADR-162)"
if [ -f scripts/check-region-names.mjs ]; then
    if node scripts/check-region-names.mjs; then
        PASS=$((PASS + 1))
    else
        fail "a scrolling region has no stable name (see above)"
    fi
else
    fail "scripts/check-region-names.mjs missing"
fi
echo ""

# ── [19] ──
# DEBT-DOC-1 (ADR-166). The documentation generator built each component's
# published "Exports" line by regexing its README PROSE for `class` or
# `function` followed by a word, so a sentence became an API name. Of the 54
# names it published across 32 components, exactly one was real: the quick
# reference listed `class on` 17 times and `function greet` twice, and greet
# is not a function this repository has.
#
# The check reads the BUILT ARTEFACTS rather than the generator's own
# extractors, because a check that shares an oracle with the thing it checks
# passes by construction. A d.ts comes from tsc and a bundle is what a
# consumer loads.
echo "[19] Every API name the documentation publishes exists (DEBT-DOC-1)"
if [ -f scripts/check-published-api.mjs ]; then
    if node scripts/check-published-api.mjs; then
        PASS=$((PASS + 1))
    else
        fail "the documentation publishes an API name that does not exist (see above)"
    fi
else
    fail "scripts/check-published-api.mjs missing"
fi
echo ""

# ── [20] Every tracker count is re-derivable ──
# The March 2026 audit recorded counts nobody can reproduce: LOG-1 said 406
# console.log occurrences where 161 of the 176 lines are a logging shim body,
# and WIN-1's re-measured 311-on-203-lines matches no file set in the tree.
# This states the file set and the pattern in code, and ratchets each count
# so it can only fall.
echo "[20] Every count in the tracker is re-derivable (AUDIT-1)"
if [ -f scripts/audit-counts.mjs ]; then
    if node scripts/audit-counts.mjs; then
        PASS=$((PASS + 1))
    else
        fail "a tracked count rose above its recorded baseline (see above)"
    fi
else
    fail "scripts/audit-counts.mjs missing"
fi
echo ""

# ── 21. Demos name a component the repository has ──
#
# Check [5] asks whether a demo's asset EXISTS in dist/. It cannot see a
# demo pointing at a path that exists only because a build step copies it
# there. `copy:compat` writes dist/components/workspaceswitcher/ from
# tenantswitcher, so demo/full-demo.html loaded the deprecated path, called
# the deprecated factory and printed its warning twice, for six months after
# the rename — and every gate was green (DEBT-TS-1, ADR-154).
#
# The oracle here is components/<name>/, which no build step writes.
# Check [5] also only ever opened demo/components/*.html; this one opens
# demo/*.html as well, which is where the flagship demo lives.
echo "[21] Demos name a component the repository has (DEBT-TS-1)"
DEMO_NAME_ERRORS=0
for demo in demo/*.html demo/components/*.html demo/studio/*.html; do
    [ -f "$demo" ] || continue
    case "$(basename "$demo")" in _*) continue;; esac
    for name in $(grep -oE 'dist/components/[a-z0-9-]+/' "$demo" | sed 's|dist/components/||;s|/||' | sort -u); do
        if [ ! -d "components/$name" ]; then
            fail "$demo loads dist/components/$name/, and components/$name/ does not exist"
            DEMO_NAME_ERRORS=$((DEMO_NAME_ERRORS + 1))
        fi
    done
done
if [ "$DEMO_NAME_ERRORS" -eq 0 ]; then
    pass "Every demo asset path names a component in components/"
fi
echo ""

# ── 22. The unused-code flags stay on ──
#
# UNUSED-1 ran from 414 to 0 and its last line was always "then enable
# the flags". A ratchet is not the same guarantee: `unusedLocals` had a
# documented baseline and the next person could raise it in one line,
# which is how it sat at 124 with four live defects inside it. A
# compiler flag cannot be raised, only turned off, and this check is
# what makes turning it off visible.
echo "[22] noUnusedLocals and noUnusedParameters are on (UNUSED-1)"
FLAG_ERRORS=0
for flag in noUnusedLocals noUnusedParameters; do
    if grep -qE "\"$flag\"[[:space:]]*:[[:space:]]*true" tsconfig.json; then
        :
    else
        fail "tsconfig.json does not set $flag to true"
        FLAG_ERRORS=$((FLAG_ERRORS + 1))
    fi
done
if [ "$FLAG_ERRORS" -eq 0 ]; then
    pass "tsconfig.json keeps both unused-code flags on"
fi
echo ""

# ── 23. No component warns about a no-op it promised ──
#
# LOG-7. A second `destroy()` is ADR-081's contract being HONOURED, and
# `logWarn("Already destroyed")` told the caller they had erred when
# they had not. 60 components guarded silently and 5 warned, for the
# same situation, with no rule written down until FRONTEND_LOGGING.md
# section 5 got one. This holds the sweep.
echo "[23] No component warns about a guarded no-op (LOG-7)"
NOOP_WARNS=$(grep -rEl 'logWarn\("Already destroyed"\)' components/ --include="*.ts" 2>/dev/null | wc -l | tr -d ' ')
if [ "$NOOP_WARNS" -eq 0 ]; then
    pass "No component warns on an idempotent destroy"
else
    fail "$NOOP_WARNS component(s) still warn on an idempotent destroy"
fi
echo ""

# ── 24. No component registers a class on window ──
#
# PAT-1. TypeScript removes `private` at compile time, so a class on
# `window` hands a plain-JavaScript consumer every instance field as an
# ordinary property. Measured on the shipped file before the change:
# `new window.SizesPicker(o)` returned an object carrying all 14 of its
# private fields. The factory is the whole public surface.
#
# A component may still register its FACTORIES. The pattern below
# matches only `window.X = X` and `window["X"] = X` where X is declared
# as a class in the same file, so `window["createX"] = createX` never
# trips it.
echo "[24] No component registers a class on window (PAT-1)"
CLASS_GLOBALS=0
for f in components/*/*.ts; do
    case "$f" in *.test.ts) continue ;; esac
    for cls in $(grep -oE '^(export )?class [A-Z][A-Za-z0-9_]*' "$f" | awk '{print $NF}'); do
        # The GLOBAL NAME is a wildcard, not the class name. This used to
        # require the two to match, and `window.WorkspaceSwitcher =
        # TenantSwitcher` therefore sailed past it — a class on `window`
        # that survived PAT-1's sweep, shipped on the CDN for fifteen
        # days, and was named in the migration guide as removed. What
        # makes a registration a defect is the VALUE being a class; the
        # name it is filed under is the thing nobody can predict.
        if grep -qE "^[[:space:]]*window(\[[[:space:]]*[\"'][A-Za-z_$][A-Za-z0-9_$]*[\"'][[:space:]]*\]|\.[A-Za-z_$][A-Za-z0-9_$]*)[[:space:]]*=[[:space:]]*${cls}[[:space:]]*;" "$f"; then
            fail "$f registers the class $cls on window"
            CLASS_GLOBALS=$((CLASS_GLOBALS + 1))
        fi
    done
done
if [ "$CLASS_GLOBALS" -eq 0 ]; then
    pass "No component puts a class on window; factories only"
fi
echo ""

# ── 25. No demo page constructs a component class ──
#
# PAT-1b. Check [24] holds the LIBRARY side: no component registers a
# class on `window`. Nothing held the CONSUMER side, and three studio
# pages went on calling `new Sidebar(...)` and `new Toolbar(...)` after
# the classes were gone. They broke on the CDN and every gate passed,
# because [21] and tests/demo-pages.spec.ts both read
# demo/components/*.html and the studio pages live one directory over.
#
# The class list is read from the component sources, not from a table in
# a migration document, so a class added tomorrow is covered without
# anyone remembering to add it.
echo "[25] No demo page uses a component class (PAT-1)"
DEMO_CLASS_USES=0
COMPONENT_CLASSES=$(grep -hoE '^export class [A-Z][A-Za-z0-9_]*' components/*/*.ts \
    | awk '{print $NF}' | sort -u)
for demo in demo/*.html demo/components/*.html demo/studio/*.html; do
    [ -f "$demo" ] || continue
    case "$(basename "$demo")" in _*) continue;; esac
    for cls in $COMPONENT_CLASSES; do
        if grep -qE "new[[:space:]]+${cls}[[:space:]]*\(" "$demo"; then
            fail "$demo calls new ${cls}(); use the ${cls} factory instead"
            DEMO_CLASS_USES=$((DEMO_CLASS_USES + 1))
        fi
        # `new X(` was the only syntax this check read at first, and the
        # studio pages ALSO guarded on `typeof Sidebar !== "function"`
        # and returned early. Rewriting the constructors left the page
        # dead, because the guard above them never let the code run.
        # The second miss of the same kind in one change: a dependency
        # named in two syntaxes, and a search that knew one.
        if grep -qE "(typeof|instanceof)[[:space:]]+${cls}\b" "$demo"; then
            fail "$demo tests for the class ${cls}; test for its factory"
            DEMO_CLASS_USES=$((DEMO_CLASS_USES + 1))
        fi
    done
done
if [ "$DEMO_CLASS_USES" -eq 0 ]; then
    pass "Every demo page builds components through a factory"
fi
echo ""

# ── 26. No document claims a class is on window ──
#
# PAT-1b. 28 README lines said `window.TreeView — TreeView class` and
# similar, and the published API reference is collated from those
# READMEs, so static.knobby.io/docs told consumers to use a global that
# had been removed. ADR (decisions.yaml) names the published README as
# the source of truth for an API name, which is exactly why a wrong one
# is worse than none. Check [19] grades names the docs publish against
# the source; it passed, because `window.TreeView` is not a name it
# reads. This check reads the claim instead.
echo "[26] No document claims a component class on window (PAT-1)"
DOC_CLASS_CLAIMS=0
for cls in $COMPONENT_CLASSES; do
    HITS=$(grep -rlE "window\.${cls}\b|window\[[\"']${cls}[\"']\]" \
        components/*/README.md COMPONENTS.md KEYBOARD.md \
        MASTER_COMPONENT_LIST.md 2>/dev/null | tr '\n' ' ')
    if [ -n "$HITS" ]; then
        fail "documentation claims window.${cls}: $HITS"
        DOC_CLASS_CLAIMS=$((DOC_CLASS_CLAIMS + 1))
    fi
done
if [ "$DOC_CLASS_CLAIMS" -eq 0 ]; then
    pass "No document names a class global the library does not register"
fi
echo ""

# ── 27. A custom property may not carry a raw Sass variable ──
#
# DEBT-VR-12. Sass interpolates `$x` almost everywhere, and NOT inside a
# custom property value — `--pill-padding: $sp-2 $sp-8;` compiles to the
# literal text `$sp-2 $sp-8`, the browser rejects it, and
# `padding: var(--pill-padding)` falls back to nothing. The pill shipped
# with NO padding, text touching its rounded ends, for as long as that
# line existed. Six declarations across two components had it.
#
# It is invisible to every other gate here: the SCSS is valid, the build
# succeeds, the CSS parses, and the only symptom is a property that
# silently does nothing. The line above the pill's own bug had the
# `#{...}` wrapper, so the rule was known and applied inconsistently
# within one rule block.
echo "[27] No custom property carries a raw Sass variable (DEBT-VR-12)"
# SINGLE quotes: in a double-quoted pattern bash eats the backslash and
# grep then reads `$[a-z...]` as an end-of-line anchor, which matches
# nothing and passes. The first version of this check did exactly that
# and reported PASS against a file I had just broken on purpose.
RAW_VAR_HITS=$(grep -rnE '^[[:space:]]*--[a-z0-9-]+:[[:space:]]*[^;]*\$[a-z0-9-]+[^;]*;' \
    components/*/*.scss src/scss/*.scss 2>/dev/null | grep -v '#{' || true)
if [ -z "$RAW_VAR_HITS" ]; then
    pass "Every custom property interpolates its Sass variables"
else
    printf '%s\n' "$RAW_VAR_HITS" | head -5 | sed 's/^/      /'
    fail "$(printf '%s\n' "$RAW_VAR_HITS" | wc -l | tr -d ' ') custom propert(ies) compile to a literal name the browser drops"
fi
echo ""

# ── 28. A vendored package is pinned exactly ──
#
# DEBT-SEC-10. A vendored asset's VERSION IS PART OF ITS PUBLISHED
# FILENAME and of the SRI hash consumers pin against, so a caret lets an
# ordinary `npm install` change both silently — the new file appears,
# the documented integrity stops matching, and a consumer's browser
# refuses to run the script.
#
# This is the trap DEBT-SEC-3 recorded for sass ("the caret does NOT
# hold it back"), and it was sprung on 2026-10-23 by `npm install -D
# dompurify@3.4.17`, which rewrote an exact `3.4.16` to `^3.4.17`
# while fixing a critical advisory. The fix was right and the pin was
# collateral.
echo "[28] Every vendored package is pinned exactly (DEBT-SEC-10)"
VENDOR_RANGES=$(node -e '
const fs = require("fs");
const spec = fs.readFileSync("scripts/vendor-closure.mjs", "utf8");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const deps = Object.assign({}, pkg.dependencies, pkg.devDependencies);
const names = new Set();
for (const m of spec.matchAll(/pkg:\s*"([^"]+)"|from:\s*"node_modules\/((?:@[^\/"]+\/)?[^\/"]+)/g))
{ names.add((m[1] || m[2])); }
const bad = [];
for (const n of names)
{
    const v = deps[n];
    if (v && !/^[0-9]/.test(v)) { bad.push(n + " = " + v); }
}
process.stdout.write(bad.join("\n"));
')
if [ -z "$VENDOR_RANGES" ]; then
    pass "Every vendored package is pinned to an exact version"
else
    printf '%s\n' "$VENDOR_RANGES" | sed 's/^/      /'
    fail "a vendored package carries a RANGE; its filename and SRI hash can move under consumers"
fi
echo ""

# ── Summary ──
echo "==============================="
echo "  PASS: $PASS"
echo "  FAIL: $FAIL"
echo "  WARN: $WARN"
echo "==============================="

if [ "$FAIL" -gt 0 ]; then
    echo "RESULT: FAILED"
    exit 1
else
    echo "RESULT: PASSED"
    exit 0
fi
