/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: AuditExceptions
 * 📜 PURPOSE: The advisories audit:vendor excuses, each one a recorded,
 *    exact, expiring decision (ADR-252). Everything else it finds fails.
 * 🔗 RELATES: [[VendorAudit]], [[PublicationGate]]
 * ⚡ FLOW: [npm audit hit] -> [findException] -> [excused | fail]
 *
 * WHAT AN EXCEPTION IS FOR
 * ------------------------
 * An advisory the project has judged not to apply to what this origin
 * serves, on evidence a reader can check. It is not a way to ship a known
 * vulnerability on a deadline. Each entry names:
 *
 *   advisory | via   either one GHSA id, or one dependency through which
 *                    npm reports a chain (`via`) that the asset does not
 *                    bundle. Exactly one of the two.
 *   package, version the served copy it excuses, at one exact version. A
 *                    bump or another advisory is audited normally.
 *   reason, evidence why, and at least one https link to the evidence.
 *   decided, reviewBy  ISO dates, at most MAX_REVIEW_DAYS apart. After
 *                    reviewBy the advisory fails again until someone
 *                    re-decides with fresh evidence or removes the entry.
 *   adr              the decision record in agentknowledge/decisions.yaml.
 *
 * The audit prints every exception it applies, on every run, and fails on
 * an exception that matched nothing: a withdrawn advisory or a bumped
 * version leaves a stale entry, and stale exceptions are how a list like
 * this grows into a filter nobody reads (user decision, 2026-11-05).
 */

/** The longest an exception may run before it is reviewed (user decision, 2026-11-05). */
export const MAX_REVIEW_DAYS = 90;

/** @type {ReadonlyArray<AuditException>} */
export const AUDIT_EXCEPTIONS = [
    {
        advisory: "GHSA-mrhx-c7xc-m3w5",
        package: "zod",
        version: "3.25.76",
        reason: "The advisory's only source, CVE-2023-54404, was rejected by its CNA (VulnCheck) on 2026-10-28: "
            + "\"memory use only grows in proportion to input already allocated by JSON.parse before Zod runs ... "
            + "expected validator behavior rather than a defect in Zod\". NVD shows it rejected. GitHub has not yet "
            + "withdrawn the advisory. zod 3 is served inside a2ui-runtime, required by @a2ui/web_core.",
        evidence: [
            "https://www.cve.org/CVERecord?id=CVE-2023-54404",
            "https://nvd.nist.gov/vuln/detail/CVE-2023-54404",
            "https://github.com/github/advisory-database/pull/10750",
        ],
        decided: "2026-11-05",
        reviewBy: "2027-02-03",
        adr: "ADR-252",
    },
    {
        via: "@a2ui/markdown-it",
        package: "@a2ui/lit",
        version: "0.14.0",
        reason: "npm reports @a2ui/lit through its dependency @a2ui/markdown-it, which npm flags through its peer "
            + "@a2ui/web_core and that package's zod chain. Its nested dompurify is overridden to the served copy in "
            + "package.json. a2ui-runtime does not bundle @a2ui/markdown-it: its package list, read from esbuild's "
            + "metafile, does not have it, and the audit refuses this exception if it ever does.",
        evidence: ["https://github.com/priyavijaikalyan2007/b2btheme/issues/36"],
        decided: "2026-11-05",
        reviewBy: "2027-02-03",
        adr: "ADR-252",
    },
];

/**
 * @typedef {object} AuditException
 * @property {string} [advisory] A GHSA id.
 * @property {string} [via] A dependency named in a `via` chain that the asset does not bundle.
 * @property {string} package The served package.
 * @property {string} version Its exact served version.
 * @property {string} reason
 * @property {string[]} evidence
 * @property {string} decided ISO date.
 * @property {string} reviewBy ISO date.
 * @property {string} adr
 */

const GHSA = /^GHSA(-[23456789cfghjmpqrvwx]{4}){3}$/;
const EXACT = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

/** The problems with one entry; empty when it is well formed. */
function entryProblems(entry, adrIds)
{
    const problems = [];
    const hasAdvisory = typeof entry.advisory === "string";

    if (hasAdvisory === (typeof entry.via === "string")) { problems.push("needs exactly one of advisory or via"); }
    if (hasAdvisory && !GHSA.test(entry.advisory)) { problems.push(`advisory ${entry.advisory} is not a GHSA id`); }
    if (typeof entry.package !== "string" || entry.package === "") { problems.push("needs a package"); }
    if (!EXACT.test(entry.version ?? "")) { problems.push(`version ${entry.version} is not one exact version`); }
    if (typeof entry.reason !== "string" || entry.reason.trim() === "") { problems.push("needs a reason"); }
    if (!Array.isArray(entry.evidence) || entry.evidence.length === 0
        || entry.evidence.some((url) => !String(url).startsWith("https://")))
    {
        problems.push("needs at least one https evidence link");
    }
    if (!adrIds.has(entry.adr)) { problems.push(`adr ${entry.adr} is not in agentknowledge/decisions.yaml`); }
    if (!DAY.test(entry.decided ?? "") || !DAY.test(entry.reviewBy ?? ""))
    {
        problems.push("decided and reviewBy must be YYYY-MM-DD");
    }
    else
    {
        const days = (Date.parse(entry.reviewBy) - Date.parse(entry.decided)) / DAY_MS;

        if (!(days > 0 && days <= MAX_REVIEW_DAYS))
        {
            problems.push(`reviewBy is ${days} days after decided; it must be 1 to ${MAX_REVIEW_DAYS}`);
        }
    }

    return problems;
}

/** The identity two entries must not share. */
export function exceptionKey(entry)
{
    return `${entry.advisory ?? `via ${entry.via}`} on ${entry.package}@${entry.version}`;
}

/**
 * Throws on any malformed or duplicate entry. A malformed exception is
 * not ignored: an entry that cannot be read as written must not excuse
 * anything.
 *
 * @param {ReadonlyArray<AuditException>} exceptions
 * @param {Set<string>} adrIds The ADR ids recorded in decisions.yaml.
 */
export function validateExceptions(exceptions, adrIds)
{
    const seen = new Set();
    const problems = exceptions.flatMap((entry) =>
    {
        const key = exceptionKey(entry);
        const own = entryProblems(entry, adrIds);

        if (seen.has(key)) { own.push("duplicates an earlier entry"); }
        seen.add(key);

        return own.map((problem) => `${key}: ${problem}`);
    });

    if (problems.length > 0) { throw new Error(`audit exceptions are malformed:\n  ${problems.join("\n  ")}`); }
}

/**
 * The exception for a direct advisory or a `via` link on one served copy.
 *
 * @param {ReadonlyArray<AuditException>} exceptions
 * @param {{advisory?: string, via?: string}} target
 * @param {string} name The served package.
 * @param {string} version Its served version.
 * @returns {AuditException | undefined}
 */
export function findException(exceptions, target, name, version)
{
    return exceptions.find((entry) => entry.package === name && entry.version === version
        && (target.advisory !== undefined ? entry.advisory === target.advisory : entry.via === target.via));
}

/** True once `today` (YYYY-MM-DD) is past the entry's review date. */
export function isExpired(entry, today)
{
    return today > entry.reviewBy;
}
