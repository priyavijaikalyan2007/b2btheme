/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: A2uiReferenceAgent / Read JSON
 * 📜 PURPOSE: A provider response body as JSON, or a literate error naming
 *    the provider and status when it is not JSON (a gateway's HTML page).
 * 🔗 RELATES: [[A2uiReferenceAgent]]
 * ----------------------------------------------------------------------------
 */

import { redactKey } from "../redact";

/** The body of `res` as JSON; any echo of `key` in the error text is redacted. */
export async function readJson<T>(res: Response, provider: string, key: string): Promise<T>
{
    const text = await res.text();

    try { return JSON.parse(text) as T; }
    catch
    {
        const start = redactKey(text.slice(0, 120), key);

        throw new Error(`${provider} returned ${res.status} with a body that is not JSON: ${start}`);
    }
}
