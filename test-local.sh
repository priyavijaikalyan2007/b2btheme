#!/bin/bash
# ============================================================================
# test-local.sh — Verify file structure, links, and references for local dev
# Run after `npm run build`. Validates that run.sh serves a working site.
# ============================================================================

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
    for href in $(grep -oP 'href="components/[^"]+\.html"' demo/index.html | sed 's/href="//;s/"//'); do
        if [ ! -f "demo/$href" ]; then
            fail "demo/$href referenced but missing"
            DEMO_MISSING=$((DEMO_MISSING + 1))
        fi
    done
    if [ "$DEMO_MISSING" -eq 0 ]; then
        pass "All demo page links resolve"
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
    for ref in $(grep -oP 'href="\.\./\.\./dist/[^"]+\.css"' "$demo" 2>/dev/null | sed 's/href="//;s/"//'); do
        resolved="demo/components/$ref"
        # Normalize path
        actual=$(cd "demo/components" 2>/dev/null && realpath -m "$ref" 2>/dev/null || echo "")
        if [ -n "$actual" ] && [ ! -f "$actual" ]; then
            fail "$demo references missing CSS: $ref"
            ASSET_ERRORS=$((ASSET_ERRORS + 1))
        fi
    done
    # Check JS references
    for ref in $(grep -oP 'src="\.\./\.\./dist/[^"]+\.js"' "$demo" 2>/dev/null | sed 's/src="//;s/"//'); do
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
    for link in $(grep -oP '\(components/[^)]+/README\.md\)' COMPONENT_INDEX.md | tr -d '()'); do
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

for f in agentknowledge/concepts.yaml agentknowledge/entities.yaml agentknowledge/decisions.yaml; do
    if python3 -c "import yaml,sys; yaml.safe_load(open('$f'))" 2>/dev/null; then
        pass "$(basename "$f") is valid YAML"
    else
        fail "$(basename "$f") is not valid YAML"
    fi
done
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
