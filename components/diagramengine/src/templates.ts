/*
 * ----------------------------------------------------------------------------
 * COMPONENT: DiagramEngine Templates
 * PURPOSE: Template engine for {{variable}} data binding. Resolves mustache-
 *    style template expressions in text content against a data context,
 *    supporting dot-path traversal and string filters.
 * RELATES: [[DiagramEngine]], [[DiagramDocument]], [[TextContent]]
 * FLOW: [resolveDocumentTemplates()] -> [Walk objects] -> [resolveTemplateVars()]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// CONSTANTS
// ============================================================================

/** Log prefix for template engine console messages. */
const TPL_LOG = "[DiagramEngine:Templates]";

/** Pattern matching {{expression}} placeholders in text. */
const TEMPLATE_PATTERN = /\{\{([^}]+)\}\}/g;

/** Separator between a variable path and its filter. */
const FILTER_SEPARATOR = "|";

// ============================================================================
// DOT-PATH RESOLUTION
// ============================================================================

/**
 * Walks a dot-separated property path on an object. Returns undefined
 * if any intermediate segment is missing or not an object.
 *
 * @param obj - Root object to traverse.
 * @param path - Dot-separated property path (e.g. "project.name").
 * @returns The resolved value, or undefined if the path is invalid.
 */
export function resolveDotPath(
    obj: Record<string, unknown>,
    path: string
): unknown
{
    const segments = path.split(".");
    let current: unknown = obj;

    for (const segment of segments)
    {
        if (current === null || current === undefined)
        {
            return undefined;
        }

        if (typeof current !== "object")
        {
            return undefined;
        }

        current = (current as Record<string, unknown>)[segment];
    }

    return current;
}

// ============================================================================
// FILTERS
// ============================================================================

/**
 * Applies a named string filter to a value. Unrecognised filters are
 * logged as warnings and the value is returned unchanged.
 *
 * Supported filters:
 * - `uppercase` — Converts to upper case.
 * - `lowercase` — Converts to lower case.
 * - `capitalize` — Upper-cases the first character of each word.
 * - `format` — Returns the value unchanged (placeholder for future formatters).
 *
 * @param value - The string value to filter.
 * @param filter - The filter name (trimmed, case-insensitive).
 * @returns The filtered string.
 */
export function applyFilter(value: string, filter: string): string
{
    const normalised = filter.trim().toLowerCase();

    if (normalised === "uppercase")
    {
        return value.toUpperCase();
    }

    if (normalised === "lowercase")
    {
        return value.toLowerCase();
    }

    if (normalised === "capitalize")
    {
        return capitalizeWords(value);
    }

    if (normalised === "format")
    {
        return value;
    }

    console.warn(TPL_LOG, "Unknown filter:", filter);
    return value;
}

/**
 * Capitalizes the first letter of each word in a string.
 *
 * @param text - Input text.
 * @returns Text with each word's first letter upper-cased.
 */
function capitalizeWords(text: string): string
{
    return text.replace(/\b\w/g, (ch) => ch.toUpperCase());
}

// ============================================================================
// TEMPLATE VARIABLE RESOLUTION
// ============================================================================

/**
 * Replaces all {{expression}} placeholders in a text string with values
 * from the data context. Expressions may use dot-paths and pipe filters:
 *   - `{{project.name}}` — resolves dot-path "project.name"
 *   - `{{title | uppercase}}` — resolves "title" then applies uppercase
 *
 * Unresolvable expressions are replaced with an empty string.
 *
 * @param text - Template text containing {{expressions}}.
 * @param data - Data context for variable resolution.
 * @returns The text with all expressions replaced.
 */
export function resolveTemplateVars(
    text: string,
    data: Record<string, unknown>
): string
{
    return text.replace(TEMPLATE_PATTERN, (_match, expr: string) =>
    {
        return resolveExpression(expr, data);
    });
}

/**
 * Resolves a single template expression (the content inside {{ }}).
 * Splits on the pipe character to separate the variable path from
 * any filter, resolves the path, and applies the filter.
 *
 * @param expr - Raw expression string (e.g. "title | uppercase").
 * @param data - Data context for resolution.
 * @returns The resolved and filtered string value.
 */
function resolveExpression(
    expr: string,
    data: Record<string, unknown>
): string
{
    const parts = expr.split(FILTER_SEPARATOR);
    const path = parts[0].trim();
    const filter = parts.length > 1 ? parts[1].trim() : null;

    const raw = resolveDotPath(data, path);
    const str = convertToString(raw);

    if (filter)
    {
        return applyFilter(str, filter);
    }

    return str;
}

/**
 * Converts an unknown value to a string for template output.
 * Objects are JSON-serialised; null/undefined become empty strings.
 *
 * @param value - The value to convert.
 * @returns A string representation.
 */
function convertToString(value: unknown): string
{
    if (value === null || value === undefined)
    {
        return "";
    }

    if (typeof value === "object")
    {
        return JSON.stringify(value);
    }

    return String(value);
}

// ============================================================================
// DOCUMENT-LEVEL TEMPLATE RESOLUTION
// ============================================================================

/**
 * Walks all objects in a document and resolves {{variable}} template
 * expressions in their text content. Uses the document's `data` field
 * as the binding context. No-ops if the document has no data context.
 *
 * @param doc - The DiagramDocument to process in place.
 */
export function resolveDocumentTemplates(doc: DiagramDocument): void
{
    const data = doc.data;

    if (!data)
    {
        console.log(TPL_LOG, "No data context; skipping template resolution");
        return;
    }

    for (const obj of doc.objects)
    {
        resolveObjectTemplates(obj, data);
    }

    console.log(TPL_LOG, "Resolved templates for", doc.objects.length, "objects");
}

/**
 * Resolves template expressions in a single object's text content.
 * Processes both flat runs and block-structured content.
 *
 * @param obj - The diagram object to process.
 * @param data - Data context for variable binding.
 */
function resolveObjectTemplates(
    obj: DiagramObject,
    data: Record<string, unknown>
): void
{
    const tc = obj.presentation.textContent;

    if (!tc)
    {
        return;
    }

    if (tc.runs)
    {
        resolveRunTemplates(tc.runs, data);
    }

    if (tc.blocks)
    {
        resolveBlockTemplates(tc.blocks, data);
    }
}

/**
 * Resolves template variables in an array of content runs.
 * Only TextRun entries (those with a `text` property) are processed.
 *
 * @param runs - Array of content runs.
 * @param data - Data context for variable binding.
 */
function resolveRunTemplates(
    runs: ContentRun[],
    data: Record<string, unknown>
): void
{
    for (const run of runs)
    {
        if ("text" in run)
        {
            (run as TextRun).text = resolveTemplateVars(
                (run as TextRun).text,
                data
            );
        }
    }
}

/**
 * Resolves template variables in block-structured text content.
 * Iterates each block's runs and delegates to resolveRunTemplates.
 *
 * @param blocks - Array of text blocks.
 * @param data - Data context for variable binding.
 */
function resolveBlockTemplates(
    blocks: TextBlock[],
    data: Record<string, unknown>
): void
{
    for (const block of blocks)
    {
        resolveRunTemplates(block.runs, data);
    }
}
