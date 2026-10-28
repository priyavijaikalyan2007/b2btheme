/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: AgentUiMigration
 * 📜 PURPOSE: The two shrink-only migration lists of the agent-protocol gate
 *    (spec §3.4, §7.2). Read by generate.mjs, runtime/fleet-conformance.test.ts
 *    and scripts/audit-counts.mjs, so there is exactly one copy.
 * 🔗 RELATES: [[AgentUiGenerator]], [[AgentProtocolSchema]]
 * ⚡ FLOW: [measured fleet violations] -> [PENDING_CLASSIFICATION, BELOW_REQUIRED]
 *          -> [generate.mjs gate]
 *
 * THESE LISTS MAY ONLY SHRINK. A component written after the gate landed is
 * held to the strict rule from its first commit; never add a name here to make
 * a new component pass. Removing a name is the reward for fixing it, and the
 * gate fails if a listed component no longer needs to be listed. Both lengths
 * are pinned exactly by check [20] (a ceiling and a floor of the same value in
 * scripts/audit-counts.mjs), so removing a name means lowering that pin in the
 * same change.
 */

/** Components with at least one §3.3 violation, excluded from the catalog loudly. */
export const PENDING_CLASSIFICATION = new Set([
    // Measured 2026-10-25 by `node scripts/agentui/generate.mjs --measure`: 96 of 101;
    // reconciled 2026-10-25 after BELOW_REQUIRED landed: 94 of 101 (orientationpicker and
    // toolcolorpicker failed only value-below-field, now covered by BELOW_REQUIRED);
    // 93 of 101 on 2026-10-25: stickynote's only violation was onChange counted as both its
    // "change" channel and the value write-back, which is one callback in two roles (ADR-219).
    // 92 on 2026-10-28: treeview classified with two providers (readiness step 2 P0, ADR-225).
    // 82 on 2026-10-28: the ten B1 pickers classified (readiness step 2 B1, ADR-226).
    "actionitems",
    "activityfeed",
    "anchorlayout",
    "anglepicker",
    "annotation",
    "applauncher",
    "auditlogviewer",
    "borderlayout",
    "boxlayout",
    "breadcrumb",
    "cardlayout",
    "chartpanel",
    "codeeditor",
    "colorpicker",
    "commentoverlay",
    "conversation",
    "cronpicker",
    "datagrid",
    "datepicker",
    "diagramengine",
    "docklayout",
    "docviewer",
    "durationpicker",
    "dynamicformswitcher",
    "editablecombobox",
    "emptystate",
    "explorerpicker",
    "facetsearch",
    "fileexplorer",
    "fileupload",
    "flexgridlayout",
    "flowlayout",
    "gauge",
    "gradientpicker",
    "graphcanvas",
    "graphminimap",
    "gridlayout",
    "helpdrawer",
    "inlinetoolbar",
    "latexeditor",
    "layerlayout",
    "logconsole",
    "markdowneditor",
    "marketinghero",
    "maskedentry",
    "metriccard",
    "multiselectcombo",
    "navrail",
    "notificationcenter",
    "peoplepicker",
    "periodpicker",
    "permissionmatrix",
    "personchip",
    "pill",
    "presenceindicator",
    "prompttemplatemanager",
    "propertyinspector",
    "reasoningaccordion",
    "relationshipmanager",
    "ribbon",
    "ribbonbuilder",
    "richtextinput",
    "searchbox",
    "sitefooter",
    "slider",
    "spinemap",
    "splitlayout",
    "sprintpicker",
    "stacklayout",
    "statusbadge",
    "stepper",
    "symbolpicker",
    "tabbedpanel",
    "tagger",
    "tenantswitcher",
    "themetoggle",
    "timeline",
    "timepicker",
    "timezonepicker",
    "treegrid",
    "usermenu",
    "visualtableeditor",
]);

/** Components whose declared conformance is below the computed required level (§7). */
export const BELOW_REQUIRED = new Set([
    // Measured 2026-10-25: 40 of 101 declared below their required level.
    // 2026-10-25: 34 of 40 promoted after they already verified at their required level.
    // The 6 left require "surface" and declare no stateKeys, so declaring "surface" fails manifest
    // validation before any surface check runs; whether their handles then pass setData, on,
    // getState and setState is untested. Each needs stateKeys and possibly component work (#21-#26).
    "fileexplorer",
    "multiselectcombo",
    "permissionmatrix",
    "stacklayout",
    "timeline",
    "usermenu",
]);
