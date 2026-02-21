/**
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: DocGenerator
 * 📜 PURPOSE: Auto-generates design token catalogue, component reference, and
 *             agent quick reference from source files. Converts all Markdown
 *             docs to themed HTML using the `marked` library.
 * 🔗 RELATES: [[EnterpriseTheme]], [[CustomComponents]], [[ErrorDialog]]
 * ⚡ FLOW: [_variables.scss + custom.scss + component READMEs] -> [docs/*.md + dist/docs/*.html]
 * ----------------------------------------------------------------------------
 */

// @entrypoint
// Uses `marked` (devDependency) for Markdown-to-HTML conversion.

const fs = require("fs");
const path = require("path");
const { marked, Renderer, Parser } = require("marked");

const ROOT = path.resolve(__dirname, "..");
const DOCS_DIR = path.join(ROOT, "docs");
const DIST_DOCS_DIR = path.join(ROOT, "dist", "docs");
const VARIABLES_FILE = path.join(ROOT, "src", "scss", "_variables.scss");
const CUSTOM_FILE = path.join(ROOT, "src", "scss", "custom.scss");
const COMPONENTS_DIR = path.join(ROOT, "components");

const AUTO_HEADER_MD = "<!-- AGENT: Auto-generated — do not edit. Run `npm run build` to regenerate. -->\n\n";

// ---------------------------------------------------------------------------
// Configure marked with a custom renderer for enterprise-themed HTML
// ---------------------------------------------------------------------------

const renderer = new Renderer();

// Tables: add Bootstrap enterprise table classes, render inline tokens properly
renderer.table = function(tableData)
{
    let headerHtml = "";
    let bodyHtml = "";

    if (tableData.header && tableData.header.length > 0)
    {
        headerHtml = "<thead><tr>";
        for (const cell of tableData.header)
        {
            headerHtml += `<th>${Parser.parseInline(cell.tokens)}</th>`;
        }
        headerHtml += "</tr></thead>";
    }

    if (tableData.rows && tableData.rows.length > 0)
    {
        bodyHtml = "<tbody>";
        for (const row of tableData.rows)
        {
            bodyHtml += "<tr>";
            for (const cell of row)
            {
                bodyHtml += `<td>${Parser.parseInline(cell.tokens)}</td>`;
            }
            bodyHtml += "</tr>";
        }
        bodyHtml += "</tbody>";
    }

    return `<div class="table-responsive"><table class="table table-sm table-enterprise">${headerHtml}${bodyHtml}</table></div>\n`;
};

// Blockquotes: Bootstrap-styled with left border
renderer.blockquote = function(quoteData)
{
    return `<blockquote class="blockquote border-start border-primary border-3 ps-3 my-3">${quoteData.text}</blockquote>\n`;
};

marked.setOptions({
    renderer,
    gfm: true,
    breaks: false,
});

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

function ensureDir(dir)
{
    if (!fs.existsSync(dir))
    {
        fs.mkdirSync(dir, { recursive: true });
    }
}

/** Escape HTML special characters for safe rendering. */
function escapeHtml(str)
{
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

/**
 * Convert Markdown to HTML using the `marked` library.
 * Strips the <!-- AGENT: ... --> header before conversion so it doesn't
 * render as visible text.
 */
function convertMarkdown(md)
{
    // Strip AGENT header comments — they're for agents, not for rendered HTML
    const cleaned = md.replace(/^<!--\s*AGENT:.*?-->\s*\n*/gm, "");
    let html = marked(cleaned);

    // Rewrite .md links to .html for the rendered HTML output.
    // INDEX.md -> index.html (special case), others -> SAME_NAME.html
    html = html.replace(/href="([^"]*?)\.md"/g, function(match, base)
    {
        // Don't rewrite external URLs or anchors
        if (base.startsWith("http") || base.startsWith("#"))
        {
            return match;
        }
        const htmlName = base === "INDEX" ? "index" : base;
        return `href="${htmlName}.html"`;
    });

    return html;
}

/**
 * Wrap converted HTML body in a full page using the enterprise theme.
 * The page loads the theme CSS, Google Fonts, and Bootstrap Icons.
 */
function wrapHtml(title, bodyHtml)
{
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)} — Enterprise Bootstrap Theme</title>

    <!-- Google Fonts: Open Sans + JetBrains Mono -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,300..800;1,300..800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">

    <!-- Enterprise Theme CSS -->
    <link rel="stylesheet" href="../css/custom.css">
    <!-- Bootstrap Icons -->
    <link rel="stylesheet" href="../icons/bootstrap-icons.css">

    <style>
        .docs-container { max-width: 960px; margin: 0 auto; padding: 2rem 1.5rem; }
        .docs-container pre { background: #1e293b; color: #e2e8f0; padding: 1rem; overflow-x: auto; }
        .docs-container pre code { color: inherit; background: none; padding: 0; }
        .docs-container code { background: #f1f5f9; padding: 0.125rem 0.375rem; font-size: 0.85em; }
        .docs-nav { background: #0f172a; padding: 0.75rem 1.5rem; }
        .docs-nav a { color: #94a3b8; text-decoration: none; margin-right: 1rem; font-size: 0.875rem; }
        .docs-nav a:hover { color: #fff; }
        .docs-breadcrumb { font-size: 0.8rem; color: #64748b; margin-bottom: 1.5rem; }
        .docs-breadcrumb a { color: #1864ab; }
    </style>
</head>
<body>
    <nav class="docs-nav">
        <a href="index.html"><i class="bi bi-house-door"></i> Docs Home</a>
        <a href="GETTING_STARTED.html">Getting Started</a>
        <a href="DESIGN_TOKENS.html">Design Tokens</a>
        <a href="COMPONENT_REFERENCE.html">Components</a>
        <a href="CUSTOM_CLASSES.html">CSS Classes</a>
        <a href="FONT_GUIDE.html">Fonts</a>
    </nav>
    <div class="docs-container">
        <p class="docs-breadcrumb"><a href="index.html">Docs</a> / ${escapeHtml(title)}</p>
${bodyHtml}
    </div>

    <script src="../js/bootstrap.bundle.min.js"></script>
</body>
</html>`;
}

/**
 * Write a Markdown file to docs/ and its corresponding HTML file to dist/docs/.
 */
function writeMdAndHtml(mdPath, title, mdContent)
{
    // Write Markdown
    fs.writeFileSync(mdPath, mdContent, "utf8");
    console.log(`[DocGenerator] wrote ${path.relative(ROOT, mdPath)}`);

    // Write HTML to dist/docs/
    const baseName = path.basename(mdPath, ".md") + ".html";
    const htmlPath = path.join(DIST_DOCS_DIR, baseName);
    const bodyHtml = convertMarkdown(mdContent);
    fs.writeFileSync(htmlPath, wrapHtml(title, bodyHtml), "utf8");
    console.log(`[DocGenerator] wrote ${path.relative(ROOT, htmlPath)}`);
}

/**
 * Convert a hand-written Markdown file from docs/ to HTML in dist/docs/.
 * Does NOT write a Markdown file (it already exists in docs/).
 */
function convertHandWrittenDoc(mdFileName, title)
{
    const mdPath = path.join(DOCS_DIR, mdFileName);
    if (!fs.existsSync(mdPath))
    {
        console.log(`[DocGenerator] skipped ${mdFileName} (not found)`);
        return;
    }

    const md = fs.readFileSync(mdPath, "utf8");
    const htmlName = mdFileName === "INDEX.md" ? "index.html" : mdFileName.replace(".md", ".html");
    const htmlPath = path.join(DIST_DOCS_DIR, htmlName);
    const bodyHtml = convertMarkdown(md);
    fs.writeFileSync(htmlPath, wrapHtml(title, bodyHtml), "utf8");
    console.log(`[DocGenerator] converted ${mdFileName} -> ${htmlName}`);
}

// ---------------------------------------------------------------------------
// Phase A — Parse _variables.scss → DESIGN_TOKENS.md
// ---------------------------------------------------------------------------

function parseVariables()
{
    const raw = fs.readFileSync(VARIABLES_FILE, "utf8");
    const lines = raw.split("\n");

    const sections = [];
    let currentSection = null;
    // Simple variable map for resolving references like $blue-600 -> #1c7ed6
    const varMap = {};

    for (let i = 0; i < lines.length; i++)
    {
        const line = lines[i];

        // Detect section headers: // =====...===== followed by // TITLE
        if (/^\/\/ =+/.test(line) && i + 1 < lines.length)
        {
            const titleLine = lines[i + 1];
            const titleMatch = titleLine.match(/^\/\/\s+(.+)/);
            if (titleMatch)
            {
                currentSection = { title: titleMatch[1].trim(), vars: [] };
                sections.push(currentSection);
                i++; // skip title line
                // Skip closing === line if present
                if (i + 1 < lines.length && /^\/\/ =+/.test(lines[i + 1]))
                {
                    i++;
                }
                continue;
            }
        }

        // Detect variable: $name: value; or $name: value !default;
        const varMatch = line.match(/^\$([\w-]+):\s*(.+?)\s*(!default\s*)?;/);
        if (varMatch)
        {
            const name = "$" + varMatch[1];
            let value = varMatch[2].replace(/\s*!default\s*$/, "").trim();

            // Extract inline comment as description
            let description = "";
            const commentMatch = line.match(/;\s*\/\/\s*(.+)/);
            if (commentMatch)
            {
                description = commentMatch[1].trim();
            }
            else
            {
                // Check line above for a comment
                if (i > 0)
                {
                    const prevLine = lines[i - 1];
                    const prevComment = prevLine.match(/^\/\/\s+(.+)/);
                    if (prevComment && !/^\/\/ =+/.test(prevLine) && !/^\/\/ @/.test(prevLine))
                    {
                        description = prevComment[1].trim();
                    }
                }
            }

            // Resolve simple variable reference: e.g. $blue-600 -> #1c7ed6
            let resolved = value;
            const refMatch = value.match(/^\$([\w-]+)$/);
            if (refMatch && varMap["$" + refMatch[1]])
            {
                resolved = `${value} (${varMap["$" + refMatch[1]]})`;
            }

            varMap[name] = value;

            if (currentSection)
            {
                currentSection.vars.push({ name, value: resolved, description });
            }
        }
    }

    return sections;
}

function generateDesignTokensMd(sections)
{
    let md = AUTO_HEADER_MD;
    md += "# Design Tokens\n\n";
    md += "All design tokens defined in `src/scss/_variables.scss`, grouped by category.\n";
    md += "These are the SCSS variables that control every aspect of the enterprise theme.\n\n";

    for (const section of sections)
    {
        md += `## ${section.title}\n\n`;
        if (section.vars.length === 0)
        {
            md += "_No variables in this section._\n\n";
            continue;
        }
        md += "| Variable | Value | Description |\n";
        md += "|----------|-------|-------------|\n";
        for (const v of section.vars)
        {
            md += `| \`${v.name}\` | \`${v.value}\` | ${v.description} |\n`;
        }
        md += "\n";
    }

    return md;
}

// ---------------------------------------------------------------------------
// Phase B — Collate component READMEs → COMPONENT_REFERENCE.md
// ---------------------------------------------------------------------------

function gatherComponentReadmes()
{
    const components = [];
    if (!fs.existsSync(COMPONENTS_DIR))
    {
        return components;
    }

    const entries = fs.readdirSync(COMPONENTS_DIR, { withFileTypes: true });
    for (const entry of entries)
    {
        if (!entry.isDirectory()) continue;
        const readmePath = path.join(COMPONENTS_DIR, entry.name, "README.md");
        if (fs.existsSync(readmePath))
        {
            let content = fs.readFileSync(readmePath, "utf8");
            // Strip AGENT header line
            content = content.replace(/^<!--\s*AGENT:.*?-->\s*\n*/, "");
            components.push({
                name: entry.name,
                content,
                cssPath: `components/${entry.name}/${entry.name}.css`,
                jsPath: `components/${entry.name}/${entry.name}.js`,
            });
        }
    }
    return components;
}

function generateComponentReferenceMd(components)
{
    let md = AUTO_HEADER_MD;
    md += "# Component Reference\n\n";
    md += "Complete reference for all custom components shipped with the enterprise theme.\n\n";

    if (components.length === 0)
    {
        md += "_No components found._\n";
        return md;
    }

    // Table of contents
    md += "## Components\n\n";
    md += "| Component | CSS | JS |\n";
    md += "|-----------|-----|----|\n";
    for (const c of components)
    {
        md += `| [${c.name}](#${c.name}) | \`${c.cssPath}\` | \`${c.jsPath}\` |\n`;
    }
    md += "\n---\n\n";

    // Full content for each component
    for (const c of components)
    {
        md += `<a id="${c.name}"></a>\n\n`;
        md += c.content;
        md += "\n\n---\n\n";
    }

    return md;
}

// ---------------------------------------------------------------------------
// Phase C — Parse custom.scss → CSS class list + generate AGENT_QUICK_REF.md
// ---------------------------------------------------------------------------

function parseCustomClasses()
{
    const raw = fs.readFileSync(CUSTOM_FILE, "utf8");
    const classes = [];
    // Match class selectors: .class-name (but not nested inside selectors)
    const classRegex = /^\.([a-z][\w-]*)\s*[{,]/gm;
    let match;
    while ((match = classRegex.exec(raw)) !== null)
    {
        if (!classes.includes(match[1]))
        {
            classes.push(match[1]);
        }
    }
    return classes;
}

function generateAgentQuickRefMd(sections, components, customClasses)
{
    let md = AUTO_HEADER_MD;
    md += "# Agent Quick Reference\n\n";
    md += "Machine-parseable reference for coding agents. Combines dist paths, design tokens, CSS classes, and component APIs.\n\n";

    // Section 1: asset paths (relative to CDN root / dist/ folder)
    md += "## Asset Paths\n\n";
    md += "```\n";
    md += "css/custom.css               — Compiled theme CSS\n";
    md += "js/bootstrap.bundle.min.js   — Bootstrap 5 JS bundle\n";
    md += "icons/bootstrap-icons.css    — Bootstrap Icons CSS\n";
    md += "icons/fonts/                 — Bootstrap Icons font files\n";
    for (const c of components)
    {
        md += `components/${c.name}/${c.name}.css — ${c.name} component CSS\n`;
        md += `components/${c.name}/${c.name}.js  — ${c.name} component JS\n`;
    }
    md += "docs/                        — Consumer documentation (HTML)\n";
    md += "```\n\n";

    // Section 2: Design tokens as compact key=value
    md += "## Design Tokens\n\n";
    md += "```\n";
    for (const section of sections)
    {
        md += `# ${section.title}\n`;
        for (const v of section.vars)
        {
            md += `${v.name}=${v.value}\n`;
        }
    }
    md += "```\n\n";

    // Section 3: Custom CSS classes
    md += "## Custom CSS Classes (from custom.scss)\n\n";
    md += "```\n";
    for (const cls of customClasses)
    {
        md += `.${cls}\n`;
    }
    md += "```\n\n";

    // Section 4: Component function signatures
    md += "## Component APIs\n\n";
    for (const c of components)
    {
        md += `### ${c.name}\n\n`;
        md += `- CSS: \`${c.cssPath}\`\n`;
        md += `- JS: \`${c.jsPath}\`\n`;
        // Extract function/class signatures from README content
        const sigMatches = c.content.match(/(?:class|function)\s+\w+/g);
        if (sigMatches)
        {
            md += "- Exports: " + sigMatches.map(s => `\`${s}\``).join(", ") + "\n";
        }
        md += "\n";
    }

    return md;
}

// ---------------------------------------------------------------------------
// Phase D — Convert hand-written docs to HTML
// ---------------------------------------------------------------------------

/** Hand-written docs to convert (file -> title). */
const HAND_WRITTEN_DOCS = {
    "INDEX.md": "Documentation Index",
    "GETTING_STARTED.md": "Getting Started",
    "FONT_GUIDE.md": "Font Guide",
    "CUSTOM_CLASSES.md": "Custom CSS Classes",
    "CUSTOMIZATION_GUIDE.md": "Customization Guide",
    "TROUBLESHOOTING.md": "Troubleshooting",
    "GLOSSARY_AND_FAQ.md": "Glossary and FAQ",
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main()
{
    console.log("[DocGenerator] starting documentation generation...");

    ensureDir(DOCS_DIR);
    ensureDir(DIST_DOCS_DIR);

    // Phase A: Design tokens
    const sections = parseVariables();
    const tokensMd = generateDesignTokensMd(sections);
    writeMdAndHtml(path.join(DOCS_DIR, "DESIGN_TOKENS.md"), "Design Tokens", tokensMd);

    // Phase B: Component reference
    const components = gatherComponentReadmes();
    const compRefMd = generateComponentReferenceMd(components);
    writeMdAndHtml(path.join(DOCS_DIR, "COMPONENT_REFERENCE.md"), "Component Reference", compRefMd);

    // Phase C: Agent quick reference
    const customClasses = parseCustomClasses();
    const agentRefMd = generateAgentQuickRefMd(sections, components, customClasses);
    writeMdAndHtml(path.join(DOCS_DIR, "AGENT_QUICK_REF.md"), "Agent Quick Reference", agentRefMd);

    // Phase D: Convert hand-written docs to HTML
    for (const [file, title] of Object.entries(HAND_WRITTEN_DOCS))
    {
        convertHandWrittenDoc(file, title);
    }

    console.log("[DocGenerator] documentation generation complete.");
}

main();
