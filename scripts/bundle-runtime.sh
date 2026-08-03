#!/usr/bin/env bash
# SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
# SPDX-License-Identifier: MIT
# ⚓ COMPONENT: DynamicUIRuntime / BuildPipeline
# 📜 PURPOSE: Concatenates the modular Dynamic UI runtime sources into a single
#    TypeScript file for compilation, mirroring bundle-diagramengine.sh
#    (ADR-083). This keeps one-concern-per-file organisation while remaining
#    compatible with the IIFE-wrapped single-file build pipeline.
#
#    The bundle exposes window.EnterpriseRuntime. Components consume the
#    runtime through that global rather than importing it, because the build
#    wraps each component in its own IIFE and cannot resolve cross-tree
#    imports — the same external-globals pattern as ADR-028.
# 🔗 RELATES: [[DynamicUIRuntime]], [[DynamicCanvas]], [[BuildPipeline]]

set -euo pipefail

SRC_DIR="runtime/src"
OUT_FILE="runtime/runtime.ts"

# Concatenation order matters: vocabulary first, then pure helpers, then the
# modules that depend on them.
FILES=(
    "types.ts"
    "constants.ts"
    "errors.ts"
    "predicates.ts"
    "document.ts"
    "registry.ts"
    "resolver.ts"
    "wiring.ts"
    "packer.ts"
    "lifecycle.ts"
    "conformance.ts"
)

{
    echo "/*"
    echo " * ----------------------------------------------------------------------------"
    echo " * ⚓ COMPONENT: DynamicUIRuntime"
    echo " * 📜 PURPOSE: Headless runtime for the Dynamic UI layer — CanvasDocument"
    echo " *    validation and folding, declarative wiring, intent resolution, the"
    echo " *    allowlisted component registry, deterministic packing, and mount"
    echo " *    lifecycle with virtualization."
    echo " * 🔗 RELATES: [[DynamicCanvas]], [[WorkspaceShell]], [[ChatDock]]"
    echo " * ⚡ FLOW: [host] -> [window.EnterpriseRuntime] -> [canvas]"
    echo " * 🔒 SECURITY: Allowlist-only factory resolution (ADR-143). Documents are"
    echo " *    untrusted input and validated before any mount."
    echo " * 📦 BUILD: Concatenated from runtime/src by scripts/bundle-runtime.sh"
    echo " * ----------------------------------------------------------------------------"
    echo " */"
    echo ""
    echo "// @entrypoint"
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
        # Strip import statements and export keywords; the bundle is one
        # scope. Uses python rather than sed because a sed line-range spanning
        # `import` to `} from "...";` also swallows any declaration that
        # happens to sit between two import blocks.
        python3 scripts/strip-module-syntax.py "$filepath"
    done

    # Publish the public surface as a single global.
    echo ""
    echo "// ========================================================================"
    echo "// GLOBAL REGISTRATION"
    echo "// ========================================================================"
    echo ""
    echo "(window as unknown as Record<string, unknown>)[\"EnterpriseRuntime\"] = {"
    echo "    createEmptyDocument, validateDocument, validatePatch, applyPatch,"
    echo "    fold, foldTo, branch,"
    echo "    registerComponent, registerComponents, getManifest, getAllManifests,"
    echo "    isRegistered, clearRegistry, validateManifest, resolveFactory,"
    echo "    lookupFactory,"
    echo "    resolve, registerPresentationPreference, recordUserChoice,"
    echo "    clearPresentationPreferences, RESOLVER_WEIGHTS,"
    echo "    createWiringEngine, registerTransform, getTransform, clearTransforms,"
    echo "    packDocument,"
    echo "    createLifecycleManager,"
    echo "    runConformance, blockingFailures, formatConformance, sampleFor,"
    echo "};"
} > "$OUT_FILE"

echo "[bundle-runtime] bundled ${#FILES[@]} files -> $OUT_FILE"
