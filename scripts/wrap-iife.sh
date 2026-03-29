#!/usr/bin/env bash
# SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
# SPDX-License-Identifier: MIT
# ⚓ COMPONENT: BuildPipeline
# 📜 PURPOSE: Wraps each compiled component JS file in an IIFE to prevent
#    global scope collisions when multiple components are loaded via <script> tags.
# 🔗 RELATES: [[EditableComboBox]], [[ErrorDialog]], [[DatePicker]], [[TimePicker]], [[DurationPicker]], [[ProgressModal]], [[TimezonePicker]], [[CronPicker]], [[MarkdownEditor]], [[StatusBar]], [[Sidebar]], [[BannerBar]], [[Toolbar]], [[Gauge]], [[Conversation]], [[Timeline]], [[TabbedPanel]], [[TreeView]]

set -euo pipefail

DIST_DIR="dist/components"

for jsfile in $(find "$DIST_DIR" -name '*.js'); do
    # Strip all export keywords from declarations (both line-start and mid-line)
    sed -i 's/^export //g; s/\bexport class /class /g; s/\bexport function /function /g; s/\bexport const /const /g; s/\bexport let /let /g; s/\bexport interface /interface /g; s/\bexport type /type /g; s/\bexport enum /enum /g' "$jsfile"

    # Wrap in an IIFE
    tmpfile=$(mktemp)
    {
        echo '"use strict";(function() {'
        cat "$jsfile"
        echo '})();'
    } > "$tmpfile"
    mv "$tmpfile" "$jsfile"

    echo "[wrap-iife] wrapped: $jsfile"
done
