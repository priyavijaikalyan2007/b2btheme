/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ CHECK: the agent knowledge base parses. Structure check [8], AUDIT-2.
 *
 * WHY THIS IS NODE AND NOT PYTHON. It was two lines of inline python
 * calling PyYAML, and on 2026-10-22 a Homebrew `python3` came first on
 * PATH without that module, so the check called three valid files
 * malformed. The module could not be installed either: Homebrew's
 * python is externally managed (PEP 668) and there is no `pyyaml`
 * formula, so the honest options were a virtualenv nobody would
 * remember or `--break-system-packages`.
 *
 * PyYAML was the ONLY non-stdlib Python dependency in this repository
 * — every other script under `scripts/` imports stdlib alone. It was
 * also a dependency nothing could declare: there is no requirements
 * file here, and CI passed only because the GitHub Ubuntu image
 * happens to ship PyYAML. `package.json` can state `js-yaml`, so the
 * requirement is now written down where this project keeps the rest
 * of them. Python is still required, and stdlib-only is a promise any
 * `python3` keeps.
 *
 * Exit 0 when every file parses, 1 otherwise, with the parser's own
 * message on stderr.
 */

import { load } from "js-yaml";
import { readFileSync } from "node:fs";

const FILES = [
    "agentknowledge/concepts.yaml",
    "agentknowledge/entities.yaml",
    "agentknowledge/decisions.yaml",
];

let failed = 0;

for (const file of FILES)
{
    try
    {
        const parsed = load(readFileSync(file, "utf8"));

        // A file of comments parses to `undefined` and is not the
        // knowledge base. ADR-196: a check that passes on no input has
        // not been written yet.
        if (parsed === undefined || parsed === null)
        {
            throw new Error("parsed to nothing — the file holds no documents");
        }

        console.log(`${file} is valid YAML`);
    }
    catch (err)
    {
        const detail = String(err?.message ?? err).split("\n")[0];
        console.error(`${file} is not valid YAML: ${detail}`);
        failed += 1;
    }
}

process.exit(failed === 0 ? 0 : 1);
