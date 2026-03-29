#!/usr/bin/env bash
# SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
# SPDX-License-Identifier: MIT
# Minifies all component JS files in dist/components using terser.
# Runs after TypeScript compilation and IIFE wrapping.

set -euo pipefail

DIST_DIR="dist/components"
COPYRIGHT_BANNER="/* Enterprise Bootstrap Theme | MIT License | (c) 2026 Priya Vijai Kalyan */"

for jsfile in $(find "$DIST_DIR" -name '*.js' -not -path '*/src/*'); do
    npx terser "$jsfile" --compress --mangle -o "$jsfile" 2>/dev/null || {
        echo "[minify-js] WARN: skipped (terser error): $jsfile"
        continue
    }
    # Prepend copyright banner after minification
    tmpfile=$(mktemp)
    echo "$COPYRIGHT_BANNER" > "$tmpfile"
    cat "$jsfile" >> "$tmpfile"
    mv "$tmpfile" "$jsfile"
    echo "[minify-js] minified: $jsfile"
done
