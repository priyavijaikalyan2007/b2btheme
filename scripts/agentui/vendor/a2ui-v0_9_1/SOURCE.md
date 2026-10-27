<!--
SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
SPDX-FileCopyrightText: 2026 Outcrop Inc
SPDX-License-Identifier: MIT
Repository: enterprise-bootstrap-theme
File GUID: 612141ea-7ae5-4dde-ae67-a6f31a7b8ade
Created: 2026
-->

# Vendored A2UI v0.9.1 schemas

Copied verbatim from https://github.com/a2ui-project/a2ui at commit `409ded2`
(2026-10-24): `specification/v0_9_1/json/common_types.json` and
`specification/v0_9_1/catalogs/basic/catalog.json`; and, for the message checker (#30),
`specification/v0_9_1/json/server_to_client.json` and `server_to_client_list.json`. These are data, not served,
and never fetched at build time. To update, re-copy at a new commit, record it
here, and expect the catalog-diff gate to report what changed.

The basic catalog declares the `v0_9` ID (not `v0_9_1`); `@a2ui/web_core`
0.14.0 matches it by exact string equality (`message-processor.js:932`).
