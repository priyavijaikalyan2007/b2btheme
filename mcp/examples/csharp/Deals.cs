// SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
// SPDX-FileCopyrightText: 2026 Outcrop Inc
// SPDX-License-Identifier: MIT

using System.ComponentModel;
using System.Text.Json;
using System.Text.Json.Nodes;
using ModelContextProtocol.Extensions.Apps;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;

namespace OutcropExample;

/// <summary>The view's tool arguments for a routed action (spec §5.2).</summary>
public sealed record OutcropArgs(int Version, string SurfaceId, OutcropAction Action);

public sealed record OutcropAction(string Version, A2uiAction Action);

public sealed record A2uiAction(string Name, string SourceComponentId, JsonObject Context);

/// <summary>show_deal returns one A2UI surface and its routes; deal_action answers the actions the view routes to it.</summary>
[McpServerToolType]
public sealed class DealTools
{
    private const string A2ui = "v0.9.1";
    private const string Catalog = "https://static.outcrop.us/a2ui/catalog/v1.json";
    private const string Surface = "deal";

    [McpServerTool(Name = "show_deal"), Description("Show deal 7 for approval, with its documents.")]
    [McpAppUi(ResourceUri = Renderer.Uri)]
    public static CallToolResult ShowDeal()
    {
        var components = JsonNode.Parse("""
            [
              { "id": "root", "component": "Column", "children": ["status", "documents", "buttons"] },
              { "id": "status", "component": "Text", "text": "Deal 7: awaiting approval" },
              { "id": "documents", "component": "TreeView", "eventData": { "path": "/ev" },
                "roots": [{ "id": "contracts", "label": "Contracts", "kind": "folder", "children": null, "lazy": true }],
                "onLoadChildren": { "event": { "name": "load", "context": { "node": { "path": "/ev/loadChildren" } } } },
                "loadChildrenResult": { "path": "/answers/children" } },
              { "id": "buttons", "component": "Row", "children": ["approve", "explain"] },
              { "id": "approve", "component": "Button", "child": "approveLabel",
                "action": { "event": { "name": "approve", "context": { "deal": 7 } } } },
              { "id": "approveLabel", "component": "Text", "text": "Approve" },
              { "id": "explain", "component": "Button", "child": "explainLabel",
                "action": { "event": { "name": "explain", "context": { "deal": 7 } } } },
              { "id": "explainLabel", "component": "Text", "text": "Explain" }
            ]
            """);

        // Approve and the folder's load go to deal_action, a fast deterministic call;
        // Explain goes to the model as a user turn.
        var routes = JsonNode.Parse("""{ "default": { "tool": "deal_action" }, "byName": { "explain": "message" } }""");

        return Outcrop("Deal 7 is awaiting approval.", [
            new JsonObject { ["version"] = A2ui,
                ["createSurface"] = new JsonObject { ["surfaceId"] = Surface, ["catalogId"] = Catalog } },
            new JsonObject { ["version"] = A2ui,
                ["updateComponents"] = new JsonObject { ["surfaceId"] = Surface, ["components"] = components } },
        ], routes);
    }

    /// <summary>Answers an action the view routed here. A result without routes keeps the surface's routes.</summary>
    [McpServerTool(Name = "deal_action"), Description("Apply an action from the deal view.")]
    [McpAppUi(ResourceUri = Renderer.Uri, Visibility = [McpUiToolVisibility.App])]
    public static CallToolResult DealAction(OutcropArgs outcrop)
    {
        var action = outcrop.Action.Action;

        if (action.Name == "approve")
        {
            return Outcrop("Deal 7 approved.", [Status("Deal 7: approved")]);
        }

        if (action.Name == "load")
        {
            var node = action.Context["node"]?["id"]?.GetValue<string>();

            if (node != "contracts")
            {
                return ToolError($"No folder {JsonSerializer.Serialize(node)} in deal 7.");
            }

            // The provider's answer: its result path, which TreeView bound with loadChildrenResult.
            var children = JsonNode.Parse("""
                [
                  { "id": "msa", "label": "Master services agreement.pdf", "kind": "item" },
                  { "id": "sow", "label": "Statement of work.pdf", "kind": "item" }
                ]
                """);

            return Outcrop("Deal 7 has two contracts.", [new JsonObject { ["version"] = A2ui,
                ["updateDataModel"] = new JsonObject { ["surfaceId"] = Surface, ["path"] = "/answers/children",
                    ["value"] = children } }]);
        }

        return ToolError($"deal_action does not handle the action {JsonSerializer.Serialize(action.Name)}.");
    }

    /// <summary>A result for the view, with the plain summary every result needs for models and UI-less hosts.</summary>
    private static CallToolResult Outcrop(string summary, JsonArray messages, JsonNode? routes = null)
    {
        var outcrop = new JsonObject { ["version"] = 1, ["messages"] = messages };

        if (routes is not null)
        {
            outcrop["routes"] = routes;
        }

        return new CallToolResult
        {
            Content = [new TextContentBlock { Text = summary }],
            StructuredContent = JsonSerializer.SerializeToElement(new JsonObject { ["outcrop"] = outcrop }),
        };
    }

    private static CallToolResult ToolError(string text) => new()
    {
        Content = [new TextContentBlock { Text = text }],
        IsError = true,
    };

    private static JsonObject Status(string text) => new()
    {
        ["version"] = A2ui,
        ["updateComponents"] = new JsonObject { ["surfaceId"] = Surface,
            ["components"] = new JsonArray(new JsonObject { ["id"] = "status", ["component"] = "Text", ["text"] = text }) },
    };
}
