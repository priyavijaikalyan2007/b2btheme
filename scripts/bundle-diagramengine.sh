#!/usr/bin/env bash
# SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
# SPDX-License-Identifier: MIT
# ⚓ COMPONENT: DiagramEngine
# 📜 PURPOSE: Concatenates the modular DiagramEngine source files into a
#    single TypeScript file for compilation. This enables proper code
#    organisation (separate files per concern) while maintaining
#    compatibility with the IIFE-wrapped single-file build pipeline.
# 🔗 RELATES: [[DiagramEngine]], [[BuildPipeline]]

set -euo pipefail

SRC_DIR="components/diagramengine/src"
OUT_FILE="components/diagramengine/diagramengine.ts"

# Concatenation order matters: types first, then utilities, then
# shapes, render engine, tools, templates, engine implementation,
# and finally the phase extension modules.
FILES=(
    "types.ts"
    "logging.ts"
    "event-bus.ts"
    "undo-stack.ts"
    "shape-registry.ts"
    "shapes-basic.ts"
    "shapes-extended.ts"
    "stencils-flowchart.ts"
    "stencils-uml.ts"
    "stencils-network.ts"
    "stencils-devices.ts"
    "stencils-ui-components.ts"
    "connectors.ts"
    "guides.ts"
    "render-engine.ts"
    "tool-select.ts"
    "tool-pan.ts"
    "tool-draw.ts"
    "tool-text.ts"
    "tool-connect.ts"
    "tool-pen.ts"
    "tool-brush.ts"
    "tool-paintbrush.ts"
    "tool-highlighter.ts"
    "tool-measure.ts"
    "tool-manager.ts"
    "templates.ts"
    "page-frames.ts"
    "embed-registry.ts"
    "engine.ts"
)

{
    echo "/*"
    echo " * ----------------------------------------------------------------------------"
    echo " * ⚓ COMPONENT: DiagramEngine"
    echo " * 📜 PURPOSE: Universal vector canvas engine for diagramming, graph"
    echo " *    visualisation, technical drawing, poster creation, and embedded"
    echo " *    document surfaces. SVG-based rendering with semantic/presentation"
    echo " *    split, pluggable shapes, tools, layouts, and collaboration support."
    echo " * 🔗 RELATES: [[GraphCanvas]], [[GraphCanvasMx]], [[Ruler]], [[Toolbar]]"
    echo " * ⚡ FLOW: [Consumer App] -> [createDiagramEngine()] -> [SVG canvas]"
    echo " * 🔒 SECURITY: No innerHTML for user content. SVG sanitised on export."
    echo " * 📦 BUILD: Concatenated from src/ modules by scripts/bundle-diagramengine.sh"
    echo " * ----------------------------------------------------------------------------"
    echo " */"
    echo ""
    echo "// @entrypoint"
    echo ""
    echo "// Shared constants (declared once for all modules)"
    echo "const LOG_PREFIX = \"[DiagramEngine]\";"
    echo "const SVG_NS = \"http://www.w3.org/2000/svg\";"
    echo "const CLS = \"de\";"
    echo "const VERSION = \"1.0\";"
    echo "const DEFAULT_ZOOM = 1;"
    echo "const MIN_ZOOM = 0.1;"
    echo "const MAX_ZOOM = 32.0;"
    echo "const ZOOM_STEP = 0.15;"
    echo "const HANDLE_SIZE = 8;"
    echo "const HANDLE_HIT_MARGIN = 4;"
    echo "const DEFAULT_GRID_SIZE = 20;"
    echo "const DEFAULT_LAYER_ID = \"default\";"
    echo "const DEFAULT_LAYER_NAME = \"Default\";"
    echo "const ROTATION_HANDLE_OFFSET = 25;"
    echo "const NUDGE_PX = 1;"
    echo "const NUDGE_SHIFT_PX = 10;"
    echo ""
    echo "// Structured logging lives in src/logging.ts, concatenated below, so the"
    echo "// factory and the twenty namespace prefixes have a single definition."
    echo ""
    for file in "${FILES[@]}"; do
        filepath="$SRC_DIR/$file"
        if [[ ! -f "$filepath" ]]; then
            echo "ERROR: Missing source file: $filepath" >&2
            exit 1
        fi
        echo ""
        echo "// ========================================================================"
        echo "// SOURCE: $file"
        echo "// ========================================================================"
        echo ""
        # Strip import statements and duplicate constant declarations.
        #
        # The `export` keywords are deliberately KEPT. tsc writes the published
        # .d.ts from this file, and a name without `export` does not reach it.
        # Stripping them here cost DiagramEngine its whole type surface: the
        # d.ts published one usable name out of 126 (STD-1). The browser bundle
        # is unaffected, because wrap-iife.sh removes every export keyword from
        # the emitted JS before minify-js.sh runs.
        sed 's/^import .*//' "$filepath" \
            | grep -v '^const LOG_PREFIX\b' \
            | grep -v '^const SVG_NS\b' \
            | grep -v '^const CLS\b' \
            | grep -v '^const VERSION\b' \
            | grep -v '^const DEFAULT_ZOOM\b' \
            | grep -v '^const MIN_ZOOM\b' \
            | grep -v '^const MAX_ZOOM\b' \
            | grep -v '^const ZOOM_STEP\b' \
            | grep -v '^const HANDLE_SIZE\b' \
            | grep -v '^const HANDLE_HIT_MARGIN\b' \
            | grep -v '^const DEFAULT_GRID_SIZE\b' \
            | grep -v '^const DEFAULT_LAYER_ID\b' \
            | grep -v '^const DEFAULT_LAYER_NAME\b' \
            | grep -v '^const ROTATION_HANDLE_OFFSET\b' \
            | grep -v '^const NUDGE_PX\b' \
            | grep -v '^const NUDGE_SHIFT_PX\b'
    done
} > "$OUT_FILE"

# The factory keeps the export it already carries in src/engine.ts. The
# single-symbol patch that used to live here is gone: every export now
# survives concatenation, so there is no one name left to rescue.

echo "[bundle-diagramengine] bundled ${#FILES[@]} files -> $OUT_FILE"
