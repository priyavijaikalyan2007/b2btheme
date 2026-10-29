/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: NotificationCenter / ConformanceGlue
 * 📜 PURPOSE: The mount fixture and channel triggers for the conformance gate
 *    and A2UI G3: clicks a notification, its dismiss button, and Mark all
 *    read, in the panel open() shows on document.body (readiness step 2 B6).
 * 🔗 RELATES: [[NotificationCenter]], [[Conformance]]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker notificationcenter-conformance-glue

/** Minimal view of the handle, limited to what the trigger needs. */
interface NotificationCenterLike
{
    getElement(): HTMLElement;
    open(): void;
}

/** Two unread notifications: one to click or dismiss, and one left for Mark all read. */
const NOTIFICATIONS = [
    { id: "n1", title: "Build failed", timestamp: "2026-10-29T10:00:00.000Z", read: false },
    { id: "n2", title: "Review requested", timestamp: "2026-10-29T10:05:00.000Z", read: false },
];

/** The element each channel's click comes from. */
const TARGETS: Record<string, string> = {
    notificationClick: ".notificationcenter-item-content",
    dismiss: ".notificationcenter-item-dismiss",
    markAllRead: ".notificationcenter-mark-all",
};

export const CONFORMANCE_GLUE =
{
    options: { notifications: NOTIFICATIONS },

    eventProps: { notifications: NOTIFICATIONS },

    trigger: (
        channel: string,
        handle: Record<string, unknown>): boolean =>
    {
        const selector = TARGETS[channel];
        const center = handle as unknown as NotificationCenterLike;

        if (!selector) { return false; }

        // The panel lives on document.body, outside the bell the handle returns.
        center.open();
        const el = center.getElement().ownerDocument
            .querySelector<HTMLElement>(`.notificationcenter-panel ${selector}`);
        el?.click();

        return el != null;
    },
};
