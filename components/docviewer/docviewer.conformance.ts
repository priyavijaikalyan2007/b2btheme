/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: DocViewer / ConformanceGlue
 * 📜 PURPOSE: The mount fixture, and the pages G3 holds fixed while it
 *    varies the other create-time props: activePage must name one of them, or
 *    the viewer rightly throws (readiness step 2 P1, ADR-230).
 * 🔗 RELATES: [[DocViewer]], [[Conformance]]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker docviewer-conformance-glue

/** Two pages whose ids are the sampler's first two strings. */
const PAGES = [{ id: "a", title: "First", markdown: "One" }, { id: "b", title: "Second", markdown: "Two" }];

export const CONFORMANCE_GLUE =
{
    options: { pages: PAGES },

    heldProps: { pages: PAGES },
};
