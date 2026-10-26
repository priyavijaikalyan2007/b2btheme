/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * E2E harness: Google's Lit renderer (@a2ui/lit 0.14.0) hosting outcrop
 * components through the built adapter.
 */

import { A2uiSurface } from "@a2ui/lit/v0_9";

import { startHost } from "./harness-shared";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

// Referenced so the side-effectful <a2ui-surface> definition is kept.
(window as Any).__A2uiSurface = A2uiSurface;

await startHost(
    (surface) =>
    {
        const el = document.createElement("a2ui-surface") as Any;
        el.id = `surface-${surface.id}`;
        el.surface = surface;
        document.body.append(el);
    },
    (id) => document.getElementById(`surface-${id}`)?.remove());
