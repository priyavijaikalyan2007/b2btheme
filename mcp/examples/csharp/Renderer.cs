// SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
// SPDX-FileCopyrightText: 2026 Outcrop Inc
// SPDX-License-Identifier: MIT

using System.Text.Json.Nodes;
using ModelContextProtocol.Extensions.Apps;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;

namespace OutcropExample;

/// <summary>The renderer page and its _meta.ui (CSP), both from the CDN.</summary>
public sealed record Renderer(string Html, JsonObject Meta)
{
    /// <summary>The ui:// URI the tools link to. Any URI under your server's name works.</summary>
    public const string Uri = "ui://outcrop-example/renderer";

    private const string Cdn = "https://static.outcrop.us/mcp/";

    /// <summary>Fetches the renderer once, at startup. A CDN error stops the server.</summary>
    public static async Task<Renderer> LoadAsync(HttpClient http)
    {
        var html = await GetAsync(http, "renderer.html");
        var meta = JsonNode.Parse(await GetAsync(http, "renderer.meta.json"))!.AsObject();

        return new Renderer(html, meta);
    }

    private static async Task<string> GetAsync(HttpClient http, string file)
    {
        using var response = await http.GetAsync(Cdn + file);

        if (!response.IsSuccessStatusCode)
        {
            throw new HttpRequestException($"{Cdn}{file} answered {(int)response.StatusCode}");
        }

        return await response.Content.ReadAsStringAsync();
    }
}

/// <summary>Serves the renderer page as the ui:// resource the host loads.</summary>
[McpServerResourceType]
public sealed class RendererResource
{
    [McpServerResource(UriTemplate = Renderer.Uri, Name = "Outcrop renderer", MimeType = McpApps.HtmlMimeType)]
    public static ResourceContents Read(Renderer renderer) => new TextResourceContents
    {
        Uri = Renderer.Uri,
        MimeType = McpApps.HtmlMimeType,
        Text = renderer.Html,
        Meta = new JsonObject { ["ui"] = renderer.Meta.DeepClone() },
    };
}
