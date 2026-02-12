#!/usr/bin/env bash
# ⚓ COMPONENT: BuildPipeline
# 📜 PURPOSE: Wraps each compiled component JS file in an IIFE to prevent
#    global scope collisions when multiple components are loaded via <script> tags.
# 🔗 RELATES: [[EditableComboBox]], [[ErrorDialog]], [[DatePicker]], [[TimePicker]], [[DurationPicker]], [[ProgressModal]], [[TimezonePicker]], [[CronPicker]], [[MarkdownEditor]], [[StatusBar]], [[Sidebar]], [[BannerBar]], [[Toolbar]]

set -euo pipefail

DIST_DIR="dist/components"

for jsfile in $(find "$DIST_DIR" -name '*.js'); do
    # Strip export keywords (class, function, interface)
    sed -i 's/^export class /class /; s/^export function /function /; s/^export interface /interface /' "$jsfile"

    # Wrap in an IIFE to isolate all top-level let/const/function declarations
    tmpfile=$(mktemp)
    {
        echo '"use strict";(function() {'
        cat "$jsfile"
        echo '})();'
    } > "$tmpfile"
    mv "$tmpfile" "$jsfile"

    echo "[wrap-iife] wrapped: $jsfile"
done
