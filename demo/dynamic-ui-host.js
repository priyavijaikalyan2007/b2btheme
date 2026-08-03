/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: DemoHost-DynamicUI
 * PURPOSE: The reference DynamicUIHost implementation, backed by a lookup
 *    table instead of a model.
 *
 *    This file is the whole point of the demo. The Dynamic UI layer draws a
 *    hard boundary: the library ships the runtime and the contract, the
 *    application ships the intelligence and the persistence (ADR-140). If that
 *    boundary is real, a host should be able to substitute a lookup table for
 *    the model and have EVERYTHING ELSE still work — real resolver, real
 *    bindings, real components, real persistence. That is what this proves.
 *
 *    An application replaces resolveUtterance() with a model call and
 *    fetchSource() with a query engine. Nothing else changes.
 * RELATES: [[DynamicCanvas]], [[DynamicUIRuntime]]
 * FLOW: [utterance] -> [lookup] -> [CanvasPatch] -> [canvas.apply()]
 * ----------------------------------------------------------------------------
 */

/* global EnterpriseRuntime, createDynamicCanvas */

(function ()
{
    "use strict";

    var LOG_PREFIX = "[DynamicUIDemo]";
    var STORAGE_KEY = "dynamic-ui-demo-log";

    // ========================================================================
    // SAMPLE DATA
    // ========================================================================

    var TABLES = [
        { id: "orders", label: "orders", rows: 128_402 },
        { id: "customers", label: "customers", rows: 9_318 },
        { id: "products", label: "products", rows: 1_204 },
        { id: "regions", label: "regions", rows: 12 }
    ];

    var COLUMNS = {
        orders: [
            { id: "o1", data: { column: "order_id", type: "uuid", nullable: "no" } },
            { id: "o2", data: { column: "customer_id", type: "uuid", nullable: "no" } },
            { id: "o3", data: { column: "placed_at", type: "timestamptz", nullable: "no" } },
            { id: "o4", data: { column: "total_cents", type: "bigint", nullable: "no" } }
        ],
        customers: [
            { id: "c1", data: { column: "customer_id", type: "uuid", nullable: "no" } },
            { id: "c2", data: { column: "email", type: "citext", nullable: "no" } },
            { id: "c3", data: { column: "created_at", type: "timestamptz", nullable: "no" } }
        ],
        products: [
            { id: "p1", data: { column: "sku", type: "text", nullable: "no" } },
            { id: "p2", data: { column: "price_cents", type: "bigint", nullable: "yes" } }
        ],
        regions: [
            { id: "r1", data: { column: "region_id", type: "smallint", nullable: "no" } },
            { id: "r2", data: { column: "name", type: "text", nullable: "no" } }
        ]
    };

    // ========================================================================
    // MANIFEST REGISTRATION (ALLOWLIST)
    // ========================================================================

    /**
     * Registers the components this canvas may mount.
     *
     * Allowlist-only (ADR-143): a component that is not registered here can
     * never be mounted, however plausible its name looks in a document. The
     * manifests are inlined rather than imported because this demo runs from
     * built assets with no module loader.
     */
    function registerComponents()
    {
        EnterpriseRuntime.registerComponents([
            {
                name: "treeview",
                factory: "createTreeView",
                factoryStyle: "options-only",
                containerOption: "container",
                label: "Schema",
                icon: "bi-list-nested",
                category: "data",
                affords: [{
                    shape: "hierarchy",
                    intents: ["browse", "navigate", "inspect"],
                    cardinality: { min: 1, max: 20000 },
                    minViewport: { w: 220, h: 200 }
                }],
                emits: [
                    { name: "selection", payload: "record", multi: true, legacyOption: "onSelectionChange" }
                ],
                accepts: [{ name: "roots", payload: "hierarchy", required: true }],
                actions: [],
                stateKeys: ["expanded", "selection"],
                weight: { js: 60000, mountCost: "moderate", holdsResources: false },
                defaultSize: { w: 280, h: 340 },
                defaultOptions: { roots: [] },
                conformance: "surface",
                priority: 70
            },
            {
                name: "datagrid",
                factory: "createDataGrid",
                factoryStyle: "options-first",
                label: "Columns",
                icon: "bi-table",
                category: "data",
                affords: [{
                    shape: "collection",
                    intents: ["browse", "compare", "edit"],
                    cardinality: { min: 2, max: 100000 },
                    density: { min: 2, max: 60 },
                    minViewport: { w: 320, h: 200 }
                }],
                emits: [
                    { name: "selection", payload: "record", multi: true, legacyOption: "onRowSelect" }
                ],
                accepts: [{ name: "rows", payload: "collection", required: true }],
                actions: [],
                stateKeys: ["sort", "page", "pageSize", "selection"],
                weight: { js: 34000, mountCost: "moderate", holdsResources: false },
                defaultSize: { w: 420, h: 300 },
                defaultOptions: { columns: [] },
                conformance: "surface",
                priority: 70
            },
            {
                name: "stickynote",
                factory: "createStickyNote",
                factoryStyle: "container-first",
                label: "Note",
                icon: "bi-sticky",
                category: "annotation",
                affords: [{
                    shape: "document",
                    intents: ["author", "summarize"],
                    cardinality: { min: 1, max: 1 },
                    minViewport: { w: 120, h: 80 }
                }],
                emits: [{ name: "change", payload: "scalar", multi: false, legacyOption: "onChange" }],
                accepts: [{ name: "text", payload: "scalar", required: false }],
                actions: [],
                stateKeys: ["text", "color", "collapsed"],
                weight: { js: 6000, mountCost: "trivial", holdsResources: false },
                defaultSize: { w: 220, h: 180 },
                defaultOptions: {},
                conformance: "surface",
                priority: 30
            },
            {
                name: "annotation",
                factory: "createAnnotation",
                factoryStyle: "container-first",
                label: "Annotation",
                icon: "bi-pencil",
                category: "annotation",
                affords: [{
                    shape: "document",
                    intents: ["author"],
                    cardinality: { min: 1, max: 1 },
                    minViewport: { w: 80, h: 60 }
                }],
                emits: [{ name: "change", payload: "record", multi: false, legacyOption: "onChange" }],
                accepts: [{ name: "label", payload: "scalar", required: false }],
                actions: [],
                stateKeys: ["kind", "label", "color"],
                weight: { js: 7000, mountCost: "trivial", holdsResources: false },
                defaultSize: { w: 200, h: 140 },
                defaultOptions: {},
                conformance: "surface",
                priority: 25
            }
        ]);
    }

    // ========================================================================
    // THE "MODEL" — A LOOKUP TABLE
    // ========================================================================

    var nextId = 0;

    /** Mints a node id. */
    function id(prefix)
    {
        nextId += 1;
        return prefix + "-" + nextId;
    }

    /** Builds a node with sensible defaults. */
    function node(nodeId, component, region, size, options, source)
    {
        return {
            id: nodeId,
            component: component,
            placement: { kind: "intent", region: region, size: size },
            options: options || {},
            source: source || null,
            state: {},
            anchor: { kind: "canvas" },
            provenance: { turnId: "t", lastTouched: 0 },
            pinned: false,
            grants: []
        };
    }

    /**
     * The canned sessions. Each entry matches an utterance and returns the
     * patch operations that utterance should produce.
     *
     * An application replaces this function with a model call. The signature
     * and the return type stay exactly the same, which is the boundary
     * holding.
     */
    var SCRIPT = [
        {
            match: /table|schema|database/i,
            label: "show me the tables in the sales database",
            build: function (doc)
            {
                if (findByComponent(doc, "treeview"))
                {
                    return [];
                }

                var treeId = id("tree");
                var gridId = id("grid");

                return [
                    { op: "addNode", node: node(treeId, "treeview", "main", "tall", {
                        roots: TABLES.map(function (t)
                        {
                            return { id: t.id, label: t.label + "  (" + t.rows.toLocaleString() + ")" };
                        })
                    }) },
                    { op: "addNode", node: node(gridId, "datagrid", "main", "wide", {
                        columns: [
                            { id: "column", label: "Column" },
                            { id: "type", label: "Type" },
                            { id: "nullable", label: "Nullable" }
                        ]
                    }) },
                    // The interesting line: selecting in the tree retargets the
                    // grid. No glue code — a declarative binding in the document.
                    { op: "addBinding", binding: {
                        id: "b-" + treeId,
                        from: { node: treeId, channel: "selection" },
                        to: { node: gridId, slot: "rows" },
                        cardinality: "replace",
                        transform: "tableColumns"
                    } }
                ];
            }
        },
        {
            match: /note|remind|remember/i,
            label: "leave a note on the orders table",
            build: function ()
            {
                return [{ op: "addNode", node: node(id("note"), "stickynote", "side", "compact", {
                    text: "Check whether placed_at is indexed before the demo.",
                    color: "yellow"
                }) }];
            }
        },
        {
            match: /highlight|annotate|call ?out/i,
            label: "call out the orders table",
            build: function ()
            {
                return [{ op: "addNode", node: node(id("annot"), "annotation", "side", "compact", {
                    kind: "callout",
                    label: "Largest table",
                    color: "amber"
                }) }];
            }
        }
    ];

    /** Finds the first node using a component, or null. */
    function findByComponent(doc, component)
    {
        var ids = Object.keys(doc.nodes);

        for (var i = 0; i < ids.length; i += 1)
        {
            if (doc.nodes[ids[i]].component === component)
            {
                return doc.nodes[ids[i]];
            }
        }

        return null;
    }

    /**
     * Turns an utterance into patch operations.
     *
     * THIS is the seam an application replaces with a model. Everything
     * downstream — validation, folding, resolution, wiring, mounting — is the
     * real runtime and is untouched by the substitution.
     */
    function resolveUtterance(utterance, doc)
    {
        for (var i = 0; i < SCRIPT.length; i += 1)
        {
            if (SCRIPT[i].match.test(utterance))
            {
                return SCRIPT[i].build(doc);
            }
        }

        return null;
    }

    // ========================================================================
    // HOST WIRING
    // ========================================================================

    /** Escapes nothing — assigned via textContent only. */
    function setText(el, value)
    {
        el.textContent = value;
    }

    /** Starts the demo. */
    function startDynamicUiDemo()
    {
        if (!window.EnterpriseRuntime)
        {
            console.error(LOG_PREFIX, "runtime.js did not load");
            return;
        }

        registerComponents();

        // A named transform, not an inline expression. The document may only
        // reference a transform by name (ADR-143), so a scene document can
        // never carry executable code. This one maps the tree's selection —
        // an array of tree nodes — onto the selected table's column rows.
        EnterpriseRuntime.registerTransform("tableColumns", function (value)
        {
            var selected = Array.isArray(value) ? value[0] : value;

            if (!selected || !selected.id)
            {
                return [];
            }

            return COLUMNS[selected.id] || [];
        });

        var docEl = document.getElementById("dui-doc");
        var logEl = document.getElementById("dui-log");
        var explainEl = document.getElementById("dui-explain");
        var inputEl = document.getElementById("dui-input");
        var log = [];

        var canvas = createDynamicCanvas("dui-canvas", {
            mountCap: 12,
            onPatch: function (patch)
            {
                // A canvas-authored patch (drag, pin, close) persists exactly
                // like a model-authored one. User gestures are part of the
                // document, not ephemeral DOM state.
                record(patch);
            },
            onExplain: function (nodeId)
            {
                explain(nodeId);
            }
        });

        /** Appends a patch to the log and refreshes both panels. */
        function record(patch)
        {
            log.push(patch);
            refresh();

            try
            {
                sessionStorage.setItem(STORAGE_KEY, JSON.stringify(log));
            }
            catch (err)
            {
                console.warn(LOG_PREFIX, "could not persist log", err);
            }
        }

        /** Redraws the document and patch-log panels. */
        function refresh()
        {
            var doc = canvas.getDocument();

            setText(docEl, JSON.stringify({
                revision: doc.revision,
                nodes: Object.keys(doc.nodes).map(function (k)
                {
                    return { id: k, component: doc.nodes[k].component,
                             placement: doc.nodes[k].placement };
                }),
                bindings: doc.bindings
            }, null, 2));

            setText(logEl, log.map(function (p)
            {
                return "r" + p.revision + "  " + p.ops.map(function (o)
                {
                    return o.op;
                }).join(", ");
            }).join("\n"));
        }

        /** Shows the resolver's ranked candidates for a node's data shape. */
        function explain(nodeId)
        {
            var doc = canvas.getDocument();
            var target = doc.nodes[nodeId];

            if (!target)
            {
                return;
            }

            var manifest = EnterpriseRuntime.getManifest(target.component);
            var afford = manifest && manifest.affords[0];

            if (!afford)
            {
                setText(explainEl, target.component + " declares no affordance, "
                    + "so it was placed explicitly rather than resolved.");
                return;
            }

            var result = EnterpriseRuntime.resolve({
                intent: afford.intents[0],
                shape: afford.shape,
                cardinality: 50,
                viewport: { w: 1200, h: 800 }
            });

            renderExplain(result, target.component);
        }

        /** Renders a resolve result as a ranked, reasoned list. */
        function renderExplain(result, actual)
        {
            explainEl.replaceChildren();

            var head = document.createElement("p");
            head.className = "small mb-1";
            head.textContent = "Showing as " + actual + ". Ranked candidates:";
            explainEl.appendChild(head);

            var list = document.createElement("ul");
            list.className = "dui-reasons";

            result.candidates.forEach(function (c)
            {
                var item = document.createElement("li");
                item.textContent = c.component + "  " + c.score.toFixed(3)
                    + "  [" + c.reasons.map(function (r)
                    {
                        return r.factor + " " + r.delta.toFixed(2);
                    }).join(", ") + "]";
                list.appendChild(item);
            });

            explainEl.appendChild(list);
        }

        /** Handles one utterance. */
        function send(utterance)
        {
            if (!utterance)
            {
                return;
            }

            var doc = canvas.getDocument();
            var ops = resolveUtterance(utterance, doc);

            if (!ops)
            {
                setText(explainEl, "No canned session matches “" + utterance
                    + "”. Try one of the suggested prompts.");
                return;
            }

            if (ops.length === 0)
            {
                return;
            }

            var patch = {
                turnId: "turn-" + (log.length + 1),
                revision: doc.revision + 1,
                ops: ops
            };

            canvas.apply(patch);
            record(patch);
        }

        // -- Suggested prompts, driven from the script itself so they cannot
        //    drift from what actually works.
        var promptBar = document.getElementById("dui-prompts");

        SCRIPT.forEach(function (entry)
        {
            var btn = document.createElement("button");
            btn.type = "button";
            btn.className = "btn btn-sm btn-outline-secondary";
            btn.textContent = entry.label;
            btn.addEventListener("click", function ()
            {
                inputEl.value = entry.label;
                send(entry.label);
            });
            promptBar.appendChild(btn);
        });

        document.getElementById("dui-send").addEventListener("click", function ()
        {
            send(inputEl.value.trim());
        });

        inputEl.addEventListener("keydown", function (e)
        {
            if (e.key === "Enter")
            {
                send(inputEl.value.trim());
            }
        });

        document.getElementById("dui-clear").addEventListener("click", function ()
        {
            canvas.clear();
            log = [];
            refresh();
        });

        refresh();
        console.log(LOG_PREFIX, "ready");
    }

    window.startDynamicUiDemo = startDynamicUiDemo;
    window.DYNAMIC_UI_DEMO_COLUMNS = COLUMNS;
}());
