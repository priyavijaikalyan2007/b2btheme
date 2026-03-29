#!/usr/bin/env bash
# SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
# SPDX-License-Identifier: MIT
# Minifies all component CSS files in dist/components using postcss + cssnano.
# Runs after SCSS compilation for components.

set -euo pipefail

DIST_DIR="dist/components"

COPYRIGHT_BANNER="/* Enterprise Bootstrap Theme | MIT License | (c) 2026 Priya Vijai Kalyan */"

for cssfile in $(find "$DIST_DIR" -name '*.css'); do
    npx postcss "$cssfile" --replace
    # Prepend copyright banner
    tmpfile=$(mktemp)
    echo "$COPYRIGHT_BANNER" > "$tmpfile"
    cat "$cssfile" >> "$tmpfile"
    mv "$tmpfile" "$cssfile"
    echo "[minify-css] minified: $cssfile"
done
