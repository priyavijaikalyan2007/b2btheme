#!/usr/bin/env bash
# ----------------------------------------------------------------------------
# ⚓ COMPONENT: CopyDocs
# 📜 PURPOSE: Copy consumer-facing Markdown docs and component READMEs to
#             dist/docs/. HTML conversion is handled by generate-docs.js.
# 🔗 RELATES: [[DocGenerator]], [[EnterpriseTheme]]
# ⚡ FLOW: [docs/*.md] -> [dist/docs/*.md] + [components/*/README.md] -> [dist/docs/components/*/README.md]
# ----------------------------------------------------------------------------

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST_DOCS="$ROOT/dist/docs"
DOCS_SRC="$ROOT/docs"

# Source-only docs — not shipped to consumers
EXCLUDE_FILES="BEGINNERS_GUIDE.md ABOUT_DEPRECATION_WARNINGS.md"

echo "[CopyDocs] copying consumer docs to $DIST_DOCS"
mkdir -p "$DIST_DOCS"

# Copy docs/ Markdown files (excluding source-only files)
for md_file in "$DOCS_SRC"/*.md; do
    base="$(basename "$md_file")"
    skip=false
    for ex in $EXCLUDE_FILES; do
        if [ "$base" = "$ex" ]; then
            skip=true
            break
        fi
    done
    if [ "$skip" = "false" ]; then
        cp "$md_file" "$DIST_DOCS/$base"
        echo "[CopyDocs] copied $base"
    fi
done

# Copy component READMEs
for comp_dir in "$ROOT/components"/*/; do
    if [ -f "${comp_dir}README.md" ]; then
        comp_name="$(basename "$comp_dir")"
        dest="$DIST_DOCS/components/$comp_name"
        mkdir -p "$dest"
        cp "${comp_dir}README.md" "$dest/README.md"
        echo "[CopyDocs] copied components/$comp_name/README.md"
    fi
done

# Copy demo page with rewritten asset paths
# demo/index.html uses ../dist/ paths; from dist/docs/ the dist root is ../
if [ -f "$ROOT/demo/index.html" ]; then
    sed 's|\.\./dist/|../|g' "$ROOT/demo/index.html" > "$DIST_DOCS/demo.html"
    echo "[CopyDocs] copied demo/index.html -> demo.html (paths rewritten)"
fi

echo "[CopyDocs] done."
