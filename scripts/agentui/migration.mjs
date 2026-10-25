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
 * gate fails if a listed component no longer needs to be listed.
 */

/** Components with at least one §3.3 violation, excluded from the catalog loudly. */
export const PENDING_CLASSIFICATION = new Set([
    // Measured 2026-10-25 by `node scripts/agentui/generate.mjs --measure`: 96 of 101.
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
    "columnspicker",
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
    "fontdropdown",
    "gauge",
    "gradientpicker",
    "graphcanvas",
    "graphminimap",
    "gridlayout",
    "helpdrawer",
    "inlinetoolbar",
    "latexeditor",
    "layerlayout",
    "layoutpicker",
    "lineendingpicker",
    "lineshapepicker",
    "linetypepicker",
    "linewidthpicker",
    "logconsole",
    "marginspicker",
    "markdowneditor",
    "marketinghero",
    "maskedentry",
    "metriccard",
    "multiselectcombo",
    "navrail",
    "notificationcenter",
    "orientationpicker",
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
    "sizespicker",
    "slider",
    "spacingpicker",
    "spinemap",
    "splitlayout",
    "sprintpicker",
    "stacklayout",
    "statusbadge",
    "stepper",
    "stickynote",
    "symbolpicker",
    "tabbedpanel",
    "tagger",
    "tenantswitcher",
    "themetoggle",
    "timeline",
    "timepicker",
    "timezonepicker",
    "toolcolorpicker",
    "treegrid",
    "treeview",
    "usermenu",
    "visualtableeditor",
]);

/** Components whose declared conformance is below the computed required level (§7). */
export const BELOW_REQUIRED = new Set([]);
