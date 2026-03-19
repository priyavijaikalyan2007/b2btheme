#!/bin/bash
# ============================================================================
# test-cdn.sh — Verify that dist/ assets are accessible on the CDN
# Usage: ./test-cdn.sh [CDN_BASE_URL]
# Default CDN: https://theme.priyavijai-kalyan2007.workers.dev
# On the CDN, dist/ content is served at the root (no dist/ prefix in URLs).
# ============================================================================

set -e

CDN_BASE="${1:-https://theme.priyavijai-kalyan2007.workers.dev}"
CDN_BASE="${CDN_BASE%/}"  # strip trailing slash

PASS=0
FAIL=0
TIMEOUT=10

pass() { PASS=$((PASS + 1)); echo "  PASS: $1"; }
fail() { FAIL=$((FAIL + 1)); echo "  FAIL: $1"; }

check_url() {
    local url="$1"
    local label="$2"
    local status
    status=$(curl -L -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" "$url" 2>/dev/null)
    if [ "$status" = "200" ]; then
        pass "$label ($url)"
    else
        fail "$label → HTTP $status ($url)"
    fi
}

echo "=== CDN Structure Tests ==="
echo "CDN Base: $CDN_BASE"
echo ""

# ── 1. Core CSS/JS ──
echo "[1] Core assets"
check_url "$CDN_BASE/css/custom.css" "custom.css"
check_url "$CDN_BASE/js/bootstrap.bundle.min.js" "bootstrap.bundle.min.js"
check_url "$CDN_BASE/icons/bootstrap-icons.css" "bootstrap-icons.css"
echo ""

# ── 2. Component assets (sample 10) ──
echo "[2] Component assets (sample)"
for comp in toast datepicker timepicker colorpicker toolbar sidebar treeview slider symbolpicker helpdrawer; do
    check_url "$CDN_BASE/components/$comp/$comp.js" "$comp.js"
    check_url "$CDN_BASE/components/$comp/$comp.css" "$comp.css"
done
echo ""

# ── 3. Demo pages ──
# Demo pages live under dist/demo/, served at /demo/ on the CDN.
echo "[3] Demo pages"
check_url "$CDN_BASE/demo/index.html" "demo index"
for page in toast datepicker timepicker colorpicker toolbar themetoggle; do
    check_url "$CDN_BASE/demo/components/$page.html" "demo: $page"
done
echo ""

# ── 4. Demo shared assets ──
echo "[4] Demo shared assets"
check_url "$CDN_BASE/demo/shared/demo-shell.css" "demo-shell.css"
check_url "$CDN_BASE/demo/shared/demo-shell.js" "demo-shell.js"
echo ""

# ── 5. Documentation ──
echo "[5] Documentation"
check_url "$CDN_BASE/docs/index.html" "docs index"
check_url "$CDN_BASE/docs/COMPONENT_REFERENCE.html" "COMPONENT_REFERENCE.html"
check_url "$CDN_BASE/docs/COMPONENT_INDEX.html" "COMPONENT_INDEX.html"
echo ""

# ── 6. Build info ──
echo "[6] Build info"
check_url "$CDN_BASE/build.json" "build.json"
echo ""

# ── Summary ──
echo "==============================="
echo "  PASS: $PASS"
echo "  FAIL: $FAIL"
echo "==============================="

if [ "$FAIL" -gt 0 ]; then
    echo "RESULT: SOME CDN ASSETS MISSING"
    exit 1
else
    echo "RESULT: ALL CDN ASSETS OK"
    exit 0
fi
