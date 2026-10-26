/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 * File GUID: 3e09090d-9b20-4b25-a4d0-56f5e652a3ef
 * Created: 2026-10-26
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: A2uiAdapter / VirtualModules
 * 📜 PURPOSE: Types for the modules scripts/agentui/adapter-bundle.mjs
 *    resolves at build time, so the entry typechecks without them on disk.
 * 🔗 RELATES: [[A2uiAdapter]], [[AgentUiAdapterBundle]]
 * ⚡ FLOW: [esbuild virtual plugin] -> [index.ts imports]
 * ----------------------------------------------------------------------------
 */

declare module "virtual:outcrop/catalog"
{
    /** The catalog file's exact text, as the generator writes it. */
    const catalogText: string;
    export default catalogText;
}

declare module "virtual:outcrop/descriptors"
{
    import type { AdapterDescriptor } from "./types";

    const descriptors: readonly AdapterDescriptor[];
    export default descriptors;
}

declare module "virtual:outcrop/validators"
{
    import type { Validators } from "./types";

    export const validators: Validators;
}
