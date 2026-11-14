/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: LibRetentionCheck. Structure check [32] fails once a deprecated
 *    version is past its date, and warns in the 14 days before (#147).
 */

import { describe, expect, test } from "vitest";

import { checkRetention } from "./check-lib-retention.mjs";

const RECORD = { current: {}, retired: [], deprecated: [
    { asset: "signalr", version: "8.0.0", retireAfter: "2027-01-30" },
] };

describe("checkRetention", () =>
{
    test("nothing to report before the warning window", () =>
    {
        expect(checkRetention(RECORD, "2027-01-15")).toEqual({ problems: [], warnings: [] });
    });

    test("warns within 14 days, including the retire date itself", () =>
    {
        expect(checkRetention(RECORD, "2027-01-16").warnings).toEqual(["signalr 8.0.0 retires in 14 days (after 2027-01-30)."]);
        expect(checkRetention(RECORD, "2027-01-30")).toEqual({ problems: [],
            warnings: ["signalr 8.0.0 retires in 0 days (after 2027-01-30)."] });
    });

    test("fails the day after, naming lib:retire", () =>
    {
        expect(checkRetention(RECORD, "2027-01-31")).toEqual({ warnings: [], problems: [
            "signalr 8.0.0 was due to retire after 2027-01-30. Run `npm run lib:retire -- signalr@8.0.0` and commit the result."] });
    });
});
