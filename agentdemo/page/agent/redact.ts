/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: A2uiReferenceAgent / Redact
 * 📜 PURPOSE: Scrub the user's API key out of any provider text before it is
 *    shown (#30 spec §6.5, §14.1). OpenAI's 401 body echoes the key, either
 *    whole or as a visible prefix followed by asterisks.
 * 🔗 RELATES: [[A2uiReferenceAgent]]
 * ----------------------------------------------------------------------------
 */

const MASKED = "[redacted key]";
const MIN_PREFIX = 8;

/** `text` with every occurrence of `key`, and of any masked prefix of it, replaced. */
export function redactKey(text: string, key: string): string
{
    if (key.length === 0) { return text; }

    let out = text.split(key).join(MASKED);

    for (let n = key.length - 1; n >= MIN_PREFIX; n--)
    {
        const prefix = key.slice(0, n);

        out = out.replace(new RegExp(`${escape(prefix)}[A-Za-z0-9_*-]*`, "g"), MASKED);
    }

    // A masked form that shows the key's last characters after asterisks: "sk-…****abcd".
    return key.length > 12 ? out.replace(new RegExp(`\\*+${escape(key.slice(-4))}`, "g"), MASKED) : out;
}

function escape(s: string): string
{
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
