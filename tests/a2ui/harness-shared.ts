/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * E2E harness core: a host page exactly as the integration guide tells a host
 * to write one. It imports the BUILT adapter from the served dist tree, builds
 * the catalog with the host's own @a2ui/web_core, and exposes send() and dm()
 * to the Playwright spec. Query parameters: base (assetBaseUrl), inject
 * (injectBaseTheme=1), providerTimeoutMs (milliseconds).
 */

import { Catalog, MessageProcessor } from "@a2ui/web_core/v0_9";
import { BASIC_FUNCTIONS, basicCatalog } from "@a2ui/web_core/v0_9/basic_catalog";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

/** The adapter path on the served dist tree; a variable, so esbuild leaves the import alone. */
const ADAPTER = "/a2ui/adapter/v1.js";

/**
 * Builds the processor and wires surfaces to `mount`/`unmount`, which the
 * Lit and React harnesses supply.
 */
export async function startHost(mount: (surface: Any) => void, unmount: (surfaceId: string) => void): Promise<void>
{
    const w = window as Any;
    const params = new URLSearchParams(location.search);
    const base = params.get("base");

    if (!base) { throw new Error("The harness needs ?base=<assetBaseUrl>."); }

    const { createOutcropCatalog } = await import(/* @vite-ignore */ ADAPTER);
    const timeout = params.get("providerTimeoutMs");
    const catalog = createOutcropCatalog({ Catalog, basicCatalog, BASIC_FUNCTIONS },
        { assetBaseUrl: base, injectBaseTheme: params.get("inject") === "1",
            ...(timeout === null ? {} : { providerTimeoutMs: Number(timeout) }) });
    const processor = new (MessageProcessor as Any)([catalog], (a: Any) => w.__actions.push(a));

    w.__actions = [];
    w.__errors = [];
    processor.onSurfaceCreated((s: Any) =>
    {
        s.onError.subscribe((e: Any) => w.__errors.push(e));
        mount(s);
    });
    // The integration guide's rule: remove the surface element after deleteSurface.
    processor.onSurfaceDeleted((id: string) => unmount(id));
    w.send = (msgs: unknown[]) => processor.processMessages(msgs);
    w.dm = (surfaceId: string, p: string) => processor.getSurface(surfaceId).dataModel.get(p);
    w.handleOf = (tag: string) => (document.querySelector(tag) as Any)?.handle;
    w.ready = true;
}
