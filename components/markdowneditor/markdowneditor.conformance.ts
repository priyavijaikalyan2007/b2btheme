/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: MarkdownEditor / ConformanceGlue
 * 📜 PURPOSE: Channel trigger for the conformance gate and A2UI G3: presses
 *    Ctrl+Enter on the newest editor through the jsdom Vditor stand-in the
 *    suites install (tests/jsdom/standins.ts; readiness step 2 B5).
 * 🔗 RELATES: [[MarkdownEditor]], [[Conformance]]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker markdowneditor-conformance-glue

import { VditorStandIn } from "../../tests/jsdom/standins";

export const CONFORMANCE_GLUE =
{
    trigger: (channel: string): boolean =>
    {
        const editor = VditorStandIn.instances[VditorStandIn.instances.length - 1];

        if (channel !== "save" || !editor) { return false; }

        editor.pressCtrlEnter();

        return true;
    },
};
