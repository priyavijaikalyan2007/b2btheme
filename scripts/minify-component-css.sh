#!/usr/bin/env bash
# Minifies all component CSS files in dist/components using postcss + cssnano.
# Runs after SCSS compilation for components.

set -euo pipefail

DIST_DIR="dist/components"

for cssfile in $(find "$DIST_DIR" -name '*.css'); do
    npx postcss "$cssfile" --replace
    echo "[minify-css] minified: $cssfile"
done
