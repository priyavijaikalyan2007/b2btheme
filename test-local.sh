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
