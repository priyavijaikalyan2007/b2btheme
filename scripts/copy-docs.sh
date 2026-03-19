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

# Copy root-level index files
for root_doc in COMPONENT_INDEX.md MASTER_COMPONENT_INDEX.md RIBBON_SETUP_GUIDE.md; do
    if [ -f "$ROOT/$root_doc" ]; then
        cp "$ROOT/$root_doc" "$DIST_DOCS/$root_doc"
        echo "[CopyDocs] copied $root_doc"
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

# Copy multi-page demo folder to dist/demo/
# The dev server (run.sh) serves from the project root so demo/ works as-is,
# but for dist/ consumers we copy the whole structure with rewritten paths.
DIST_DEMO="$ROOT/dist/demo"
DEMO_SRC="$ROOT/demo"

if [ -d "$DEMO_SRC" ]; then
    echo "[CopyDocs] copying demo/ folder to $DIST_DEMO"
    mkdir -p "$DIST_DEMO/shared"
    mkdir -p "$DIST_DEMO/components"

    # Copy index.html with path rewrite: ../dist/ -> ../
    if [ -f "$DEMO_SRC/index.html" ]; then
        sed 's|\.\./dist/|../|g' "$DEMO_SRC/index.html" > "$DIST_DEMO/index.html"
        echo "[CopyDocs] copied demo/index.html (paths rewritten)"
    fi

    # Copy top-level demo HTML files (all-components, full-demo, etc.)
    for top_html in "$DEMO_SRC"/*.html; do
        if [ -f "$top_html" ]; then
            base="$(basename "$top_html")"
            [ "$base" = "index.html" ] && continue  # already handled above
            sed 's|\.\./dist/|../|g' "$top_html" > "$DIST_DEMO/$base"
            echo "[CopyDocs] copied demo/$base (paths rewritten)"
        fi
    done

    # Copy shared assets (CSS/JS)
    for shared_file in "$DEMO_SRC/shared"/*; do
        if [ -f "$shared_file" ]; then
            cp "$shared_file" "$DIST_DEMO/shared/"
            echo "[CopyDocs] copied demo/shared/$(basename "$shared_file")"
        fi
    done

    # Copy component demo pages with path rewrite: ../../dist/ -> ../../
    for comp_page in "$DEMO_SRC/components"/*.html; do
        if [ -f "$comp_page" ]; then
            base="$(basename "$comp_page")"
            sed 's|\.\./\.\./dist/|../../|g' "$comp_page" > "$DIST_DEMO/components/$base"
            echo "[CopyDocs] copied demo/components/$base (paths rewritten)"
        fi
    done
fi

echo "[CopyDocs] done."
