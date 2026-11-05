// SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
// SPDX-FileCopyrightText: 2026 Outcrop Inc
// SPDX-License-Identifier: MIT

// The example MCP server (#19 M3) over stdio: the same server as
// mcp/examples/typescript, in C#. The renderer is fetched first; if the CDN
// does not serve it, the server does not start.

using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using ModelContextProtocol.Extensions.Apps;
using OutcropExample;

using var http = new HttpClient();
var renderer = await Renderer.LoadAsync(http);

var builder = Host.CreateApplicationBuilder(args);

// stdout carries the protocol, so every log goes to stderr.
builder.Logging.AddConsole(options => options.LogToStandardErrorThreshold = LogLevel.Trace);
builder.Services.AddSingleton(renderer);
builder.Services
    .AddMcpServer()
    .WithStdioServerTransport()
    .WithResources<RendererResource>()
    .WithTools<DealTools>()
    .WithMcpApps();

await builder.Build().RunAsync();
