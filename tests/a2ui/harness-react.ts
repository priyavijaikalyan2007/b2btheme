/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * E2E harness: Google's React renderer (@a2ui/react 0.14.0) hosting outcrop
 * components through the built adapter.
 */

import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { A2uiSurface } from "@a2ui/react/v0_9";

import { startHost } from "./harness-shared";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

const roots = new Map<string, Root>();

await startHost(
    (surface) =>
    {
        const host = document.createElement("div");
        host.id = `surface-${surface.id}`;
        document.body.append(host);
        const root = createRoot(host);
        root.render(createElement(A2uiSurface as Any, { surface }));
        roots.set(surface.id, root);
    },
    (id) =>
    {
        roots.get(id)?.unmount();
        roots.delete(id);
        document.getElementById(`surface-${id}`)?.remove();
    });
