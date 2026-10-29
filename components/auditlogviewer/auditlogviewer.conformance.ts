/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: AuditLogViewer / ConformanceGlue
 * 📜 PURPOSE: The mount fixture and channel trigger for the conformance gate
 *    and A2UI G3: clicks the first row (readiness step 2 B6).
 * 🔗 RELATES: [[AuditLogViewer]], [[Conformance]]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker auditlogviewer-conformance-glue

/** Minimal view of the handle, limited to what the trigger needs. */
interface AuditLogViewerLike
{
    getElement(): HTMLElement;
}

/** One entry, so there is a row to click. */
const ENTRIES = [{ id: "a1", timestamp: "2026-10-29T10:00:00.000Z", actor: "ada", action: "update",
    resource: "invoice/42", severity: "info" }];

export const CONFORMANCE_GLUE =
{
    // The gate passes options as they are, so timestamps are Dates; over A2UI the adapter revives the strings.
    options: { entries: ENTRIES.map((x) => ({ ...x, timestamp: new Date(x.timestamp) })) },

    eventProps: { entries: ENTRIES },

    trigger: (
        channel: string,
        handle: Record<string, unknown>): boolean =>
    {
        const row = (handle as unknown as AuditLogViewerLike).getElement().querySelector<HTMLElement>(".auditlog-row");

        if (channel !== "rowClick" || !row) { return false; }

        row.click();

        return true;
    },
};
