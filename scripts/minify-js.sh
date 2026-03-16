#!/usr/bin/env bash
# Minifies all component JS files in dist/components using terser.
# Runs after TypeScript compilation and IIFE wrapping.

set -euo pipefail

DIST_DIR="dist/components"

for jsfile in $(find "$DIST_DIR" -name '*.js' -not -path '*/src/*'); do
    npx terser "$jsfile" --compress --mangle -o "$jsfile" 2>/dev/null || {
        echo "[minify-js] WARN: skipped (terser error): $jsfile"
        continue
    }
    echo "[minify-js] minified: $jsfile"
done
