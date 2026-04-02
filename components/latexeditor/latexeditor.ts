/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * Repository: theme
 * File GUID: 877fa754-87dd-4960-844c-9b75c367a225
 * Created: 2026
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: LatexEditor
 * 📜 PURPOSE: WYSIWYG + source LaTeX equation editor with symbol palette,
 *    live KaTeX preview, styling controls, and DiagramEngine embeddability.
 * 🔗 RELATES: [[EnterpriseTheme]], [[KaTeX]], [[MathLive]], [[DiagramEngine]]
 * ⚡ FLOW: [Consumer] -> [createLatexEditor(opts)] -> [textarea + KaTeX preview]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// CONSTANTS + LOGGING
// ============================================================================

/** Log prefix for all console messages from this component. */
const LOG_PREFIX = "[LatexEditor]";

const _lu = (typeof (window as any).createLogUtility === "function")
    ? (window as any).createLogUtility().getLogger(LOG_PREFIX.slice(1, -1))
    : null;
function logInfo(...a: unknown[]): void
{
    _lu ? _lu.info(...a) : console.log(new Date().toISOString(), "[INFO]", LOG_PREFIX, ...a);
}
function logWarn(...a: unknown[]): void
{
    _lu ? _lu.warn(...a) : console.warn(new Date().toISOString(), "[WARN]", LOG_PREFIX, ...a);
}
function logError(...a: unknown[]): void
{
    _lu ? _lu.error(...a) : console.error(new Date().toISOString(), "[ERROR]", LOG_PREFIX, ...a);
}
function logDebug(...a: unknown[]): void
{
    _lu ? _lu.debug(...a) : console.debug(new Date().toISOString(), "[DEBUG]", LOG_PREFIX, ...a);
}
function logTrace(...a: unknown[]): void
{
    _lu ? _lu.trace(...a) : console.debug(new Date().toISOString(), "[TRACE]", LOG_PREFIX, ...a);
}

/** Default minimum width in px. */
const DEFAULT_MIN_WIDTH = 400;

/** Default minimum height in px. */
const DEFAULT_MIN_HEIGHT = 300;

/** Debounce interval for preview updates in source mode (ms). */
const PREVIEW_DEBOUNCE_MS = 150;

/** Debounce interval for search filtering (ms). */
const SEARCH_DEBOUNCE_MS = 100;

/** Instance counter for unique IDs. */
let _instanceId = 0;

// ============================================================================
// EXPORTED INTERFACES
// ============================================================================

/** Configuration options for the LatexEditor component. */
export interface LatexEditorOptions
{
    /** Container element or CSS selector. */
    container: HTMLElement | string;

    /** Initial LaTeX expression. Default: "". */
    expression?: string;

    /** Initial editing mode. Default: "visual". */
    editMode?: "visual" | "source";

    /** Display mode (block) or inline mode. Default: true (display). */
    displayMode?: boolean;

    /** Show the styling toolbar. Default: true. */
    showToolbar?: boolean;

    /** Show the symbol palette. Default: true. */
    showSymbolPalette?: boolean;

    /** Show the live preview pane. Default: true. */
    showPreview?: boolean;

    /** Contained mode (for DiagramEngine embedding). Default: false. */
    contained?: boolean;

    /** Minimum width in px. Default: 400. */
    minWidth?: number;

    /** Minimum height in px. Default: 300. */
    minHeight?: number;

    /** Additional CSS class on root element. */
    cssClass?: string;

    /** Read-only mode. Default: false. */
    readOnly?: boolean;

    /** Enable mhchem chemistry extension. Default: true. */
    enableChemistry?: boolean;

    /** Enable cancel/strikethrough commands. Default: true. */
    enableCancel?: boolean;

    /** Callback when expression changes. */
    onChange?: (latex: string) => void;

    /** Callback when user confirms (e.g. Ctrl+Enter). */
    onConfirm?: (latex: string, mathml: string) => void;
}

/** Public API surface for the LatexEditor component. */
export interface LatexEditor
{
    /** Get current LaTeX expression. */
    getLatex(): string;

    /** Get MathML output (converted from current LaTeX). */
    getMathML(): string;

    /** Get both formats at once. */
    getValue(): { latex: string; mathml: string };

    /** Set LaTeX expression programmatically. */
    setExpression(latex: string): void;

    /** Switch editing mode. */
    setEditMode(mode: "visual" | "source"): void;

    /** Get current editing mode. */
    getEditMode(): "visual" | "source";

    /** Insert LaTeX at cursor position. */
    insertAtCursor(latex: string): void;

    /** Set read-only state. */
    setReadOnly(readOnly: boolean): void;

    /** Focus the editor. */
    focus(): void;

    /** Destroy the component and clean up. */
    destroy(): void;

    /** Get the root DOM element. */
    getElement(): HTMLElement;
}

// ============================================================================
// INTERNAL STATE
// ============================================================================

/** Internal mutable state for the editor instance. */
interface InternalState
{
    /** Unique instance ID. */
    id: number;

    /** Resolved options with defaults applied. */
    options: Required<Pick<LatexEditorOptions, "displayMode" | "showToolbar" |
        "showSymbolPalette" | "showPreview" | "contained" | "minWidth" |
        "minHeight" | "readOnly" | "enableChemistry" | "enableCancel">> &
        Pick<LatexEditorOptions, "cssClass" | "onChange" | "onConfirm">;

    /** Current LaTeX expression. */
    expression: string;

    /** Current editing mode. */
    editMode: "visual" | "source";

    /** Root DOM element. */
    rootEl: HTMLElement | null;

    /** Container that was resolved. */
    containerEl: HTMLElement | null;

    /** Source textarea element. */
    sourceEl: HTMLTextAreaElement | null;

    /** Preview pane element. */
    previewEl: HTMLElement | null;

    /** Editor area wrapper. */
    editorEl: HTMLElement | null;

    /** Debounce timer for preview updates. */
    previewTimer: ReturnType<typeof setTimeout> | null;

    /** Whether the component has been destroyed. */
    destroyed: boolean;

    /** Palette tab bar element. */
    paletteTabsEl: HTMLElement | null;

    /** Palette grid element. */
    paletteGridEl: HTMLElement | null;

    /** Palette search input element. */
    paletteSearchEl: HTMLInputElement | null;

    /** Active palette category index. */
    paletteActiveTab: number;

    /** Search debounce timer. */
    searchTimer: ReturnType<typeof setTimeout> | null;

    /** Toolbar element. */
    toolbarEl: HTMLElement | null;

    /** Size dropdown element (shown/hidden). */
    sizeDropdownEl: HTMLElement | null;
}

// ============================================================================
// SYMBOL DATA MODEL
// ============================================================================

/** A single symbol entry in the palette. */
interface SymbolEntry
{
    /** Rendered character for display. */
    char: string;

    /** LaTeX command to insert. */
    latex: string;

    /** Human-readable name for search and tooltips. */
    name: string;
}

/** A category of symbols with a tab label. */
interface SymbolCategory
{
    /** Tab label. */
    label: string;

    /** Symbols in this category. */
    symbols: SymbolEntry[];
}

// ============================================================================
// SYMBOL DATA — 12 CATEGORIES
// ============================================================================

/** Build lowercase Greek letter symbols. */
function buildGreekLowercase(): SymbolEntry[]
{
    return [
        { char: "\u03B1", latex: "\\alpha", name: "alpha" },
        { char: "\u03B2", latex: "\\beta", name: "beta" },
        { char: "\u03B3", latex: "\\gamma", name: "gamma" },
        { char: "\u03B4", latex: "\\delta", name: "delta" },
        { char: "\u03B5", latex: "\\epsilon", name: "epsilon" },
        { char: "\u03B6", latex: "\\zeta", name: "zeta" },
        { char: "\u03B7", latex: "\\eta", name: "eta" },
        { char: "\u03B8", latex: "\\theta", name: "theta" },
        { char: "\u03B9", latex: "\\iota", name: "iota" },
        { char: "\u03BA", latex: "\\kappa", name: "kappa" },
        { char: "\u03BB", latex: "\\lambda", name: "lambda" },
        { char: "\u03BC", latex: "\\mu", name: "mu" },
        { char: "\u03BD", latex: "\\nu", name: "nu" },
        { char: "\u03BE", latex: "\\xi", name: "xi" },
        { char: "\u03C0", latex: "\\pi", name: "pi" },
        { char: "\u03C1", latex: "\\rho", name: "rho" },
        { char: "\u03C3", latex: "\\sigma", name: "sigma" },
        { char: "\u03C4", latex: "\\tau", name: "tau" },
        { char: "\u03C5", latex: "\\upsilon", name: "upsilon" },
        { char: "\u03C6", latex: "\\phi", name: "phi" },
        { char: "\u03C7", latex: "\\chi", name: "chi" },
        { char: "\u03C8", latex: "\\psi", name: "psi" },
        { char: "\u03C9", latex: "\\omega", name: "omega" },
    ];
}

/** Build uppercase and variant Greek letter symbols. */
function buildGreekUppercase(): SymbolEntry[]
{
    return [
        { char: "\u0393", latex: "\\Gamma", name: "Gamma" },
        { char: "\u0394", latex: "\\Delta", name: "Delta" },
        { char: "\u0398", latex: "\\Theta", name: "Theta" },
        { char: "\u039B", latex: "\\Lambda", name: "Lambda" },
        { char: "\u039E", latex: "\\Xi", name: "Xi" },
        { char: "\u03A0", latex: "\\Pi", name: "Pi" },
        { char: "\u03A3", latex: "\\Sigma", name: "Sigma" },
        { char: "\u03A6", latex: "\\Phi", name: "Phi" },
        { char: "\u03A8", latex: "\\Psi", name: "Psi" },
        { char: "\u03A9", latex: "\\Omega", name: "Omega" },
        { char: "\u03B5", latex: "\\varepsilon", name: "varepsilon" },
        { char: "\u03D1", latex: "\\vartheta", name: "vartheta" },
        { char: "\u03C6", latex: "\\varphi", name: "varphi" },
    ];
}

/** Build all Greek letter symbols. */
function buildGreekSymbols(): SymbolEntry[]
{
    return [...buildGreekLowercase(), ...buildGreekUppercase()];
}

/** Build operator symbols. */
function buildOperatorSymbols(): SymbolEntry[]
{
    return [
        { char: "+", latex: "+", name: "plus" },
        { char: "\u2212", latex: "-", name: "minus" },
        { char: "\u00D7", latex: "\\times", name: "times" },
        { char: "\u00F7", latex: "\\div", name: "divide" },
        { char: "\u00B7", latex: "\\cdot", name: "center dot" },
        { char: "\u00B1", latex: "\\pm", name: "plus minus" },
        { char: "\u2213", latex: "\\mp", name: "minus plus" },
        { char: "\u222A", latex: "\\cup", name: "union" },
        { char: "\u2229", latex: "\\cap", name: "intersection" },
        { char: "\u2295", latex: "\\oplus", name: "direct sum" },
        { char: "\u2297", latex: "\\otimes", name: "tensor product" },
        { char: "\u2218", latex: "\\circ", name: "compose" },
        { char: "\u2219", latex: "\\bullet", name: "bullet" },
        { char: "\u2605", latex: "\\star", name: "star" },
        { char: "\u2020", latex: "\\dagger", name: "dagger" },
        { char: "\u2021", latex: "\\ddagger", name: "double dagger" },
        { char: "\u2240", latex: "\\wr", name: "wreath product" },
        { char: "\u25B3", latex: "\\triangle", name: "triangle" },
    ];
}

/** Build relation symbols. */
function buildRelationSymbols(): SymbolEntry[]
{
    return [
        { char: "=", latex: "=", name: "equals" },
        { char: "\u2260", latex: "\\neq", name: "not equal" },
        { char: "\u2261", latex: "\\equiv", name: "equivalent" },
        { char: "\u2248", latex: "\\approx", name: "approximately" },
        { char: "\u2245", latex: "\\cong", name: "congruent" },
        { char: "\u223C", latex: "\\sim", name: "similar" },
        { char: "<", latex: "<", name: "less than" },
        { char: ">", latex: ">", name: "greater than" },
        { char: "\u2264", latex: "\\leq", name: "less or equal" },
        { char: "\u2265", latex: "\\geq", name: "greater or equal" },
        { char: "\u226A", latex: "\\ll", name: "much less" },
        { char: "\u226B", latex: "\\gg", name: "much greater" },
        { char: "\u2208", latex: "\\in", name: "element of" },
        { char: "\u2209", latex: "\\notin", name: "not element" },
        { char: "\u2282", latex: "\\subset", name: "subset" },
        { char: "\u2283", latex: "\\supset", name: "superset" },
        { char: "\u2286", latex: "\\subseteq", name: "subset or equal" },
        { char: "\u2287", latex: "\\supseteq", name: "superset or equal" },
        { char: "\u221D", latex: "\\propto", name: "proportional" },
        { char: "\u22A5", latex: "\\perp", name: "perpendicular" },
    ];
}

/** Build arrow symbols. */
function buildArrowSymbols(): SymbolEntry[]
{
    return [
        { char: "\u2192", latex: "\\rightarrow", name: "right arrow" },
        { char: "\u2190", latex: "\\leftarrow", name: "left arrow" },
        { char: "\u2194", latex: "\\leftrightarrow", name: "left right arrow" },
        { char: "\u21D2", latex: "\\Rightarrow", name: "implies" },
        { char: "\u21D0", latex: "\\Leftarrow", name: "implied by" },
        { char: "\u21D4", latex: "\\Leftrightarrow", name: "iff" },
        { char: "\u2191", latex: "\\uparrow", name: "up arrow" },
        { char: "\u2193", latex: "\\downarrow", name: "down arrow" },
        { char: "\u21A6", latex: "\\mapsto", name: "maps to" },
        { char: "\u2197", latex: "\\nearrow", name: "northeast arrow" },
        { char: "\u2198", latex: "\\searrow", name: "southeast arrow" },
        { char: "\u27F6", latex: "\\longrightarrow", name: "long right arrow" },
        { char: "\u27F9", latex: "\\Longrightarrow", name: "long implies" },
        { char: "\u21A9", latex: "\\hookleftarrow", name: "hook left arrow" },
        { char: "\u21AA", latex: "\\hookrightarrow", name: "hook right arrow" },
    ];
}

/** Build bracket/delimiter symbols. */
function buildBracketSymbols(): SymbolEntry[]
{
    return [
        { char: "(", latex: "\\left(", name: "left paren" },
        { char: ")", latex: "\\right)", name: "right paren" },
        { char: "[", latex: "\\left[", name: "left bracket" },
        { char: "]", latex: "\\right]", name: "right bracket" },
        { char: "{", latex: "\\left\\{", name: "left brace" },
        { char: "}", latex: "\\right\\}", name: "right brace" },
        { char: "\u27E8", latex: "\\langle", name: "left angle" },
        { char: "\u27E9", latex: "\\rangle", name: "right angle" },
        { char: "\u230A", latex: "\\lfloor", name: "left floor" },
        { char: "\u230B", latex: "\\rfloor", name: "right floor" },
        { char: "\u2308", latex: "\\lceil", name: "left ceiling" },
        { char: "\u2309", latex: "\\rceil", name: "right ceiling" },
        { char: "|", latex: "|", name: "vertical bar" },
        { char: "\u2016", latex: "\\|", name: "double vertical bar" },
    ];
}

/** Build calculus symbols. */
function buildCalculusSymbols(): SymbolEntry[]
{
    return [
        { char: "\u222B", latex: "\\int", name: "integral" },
        { char: "\u222C", latex: "\\iint", name: "double integral" },
        { char: "\u222D", latex: "\\iiint", name: "triple integral" },
        { char: "\u222E", latex: "\\oint", name: "contour integral" },
        { char: "\u2211", latex: "\\sum", name: "summation" },
        { char: "\u220F", latex: "\\prod", name: "product" },
        { char: "lim", latex: "\\lim", name: "limit" },
        { char: "sup", latex: "\\sup", name: "supremum" },
        { char: "inf", latex: "\\inf", name: "infimum" },
        { char: "d", latex: "\\mathrm{d}", name: "differential d" },
        { char: "\u2202", latex: "\\partial", name: "partial derivative" },
        { char: "\u2207", latex: "\\nabla", name: "nabla gradient" },
        { char: "\u2210", latex: "\\coprod", name: "coproduct" },
    ];
}

/** Build structure template symbols. */
function buildStructureSymbols(): SymbolEntry[]
{
    return [
        { char: "a/b", latex: "\\frac{a}{b}", name: "fraction" },
        { char: "\u221A", latex: "\\sqrt{x}", name: "square root" },
        { char: "\u207F\u221A", latex: "\\sqrt[n]{x}", name: "nth root" },
        { char: "x\u207F", latex: "^{n}", name: "superscript" },
        { char: "x\u2099", latex: "_{n}", name: "subscript" },
        { char: "C(n,k)", latex: "\\binom{n}{k}", name: "binomial" },
        { char: "\u2211\u2093", latex: "\\sum_{i=0}^{n}", name: "sum with limits" },
        { char: "\u222B\u2093", latex: "\\int_{a}^{b}", name: "integral with limits" },
        { char: "[2\u00D72]", latex: "\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}", name: "matrix 2x2" },
        { char: "{cases}", latex: "\\begin{cases}a&b\\\\c&d\\end{cases}", name: "cases" },
        { char: "\u0305x", latex: "\\overline{x}", name: "overline" },
        { char: "x\u0332", latex: "\\underline{x}", name: "underline" },
        { char: "\u23DE", latex: "\\overbrace{x}^{n}", name: "overbrace" },
        { char: "\u0338x", latex: "\\cancel{x}", name: "cancel" },
        { char: "\u25A1", latex: "\\boxed{x}", name: "boxed" },
    ];
}

/** Build function symbols. */
function buildFunctionSymbols(): SymbolEntry[]
{
    return [
        { char: "sin", latex: "\\sin", name: "sine" },
        { char: "cos", latex: "\\cos", name: "cosine" },
        { char: "tan", latex: "\\tan", name: "tangent" },
        { char: "cot", latex: "\\cot", name: "cotangent" },
        { char: "sec", latex: "\\sec", name: "secant" },
        { char: "csc", latex: "\\csc", name: "cosecant" },
        { char: "arcsin", latex: "\\arcsin", name: "arc sine" },
        { char: "arccos", latex: "\\arccos", name: "arc cosine" },
        { char: "arctan", latex: "\\arctan", name: "arc tangent" },
        { char: "sinh", latex: "\\sinh", name: "hyperbolic sine" },
        { char: "cosh", latex: "\\cosh", name: "hyperbolic cosine" },
        { char: "tanh", latex: "\\tanh", name: "hyperbolic tangent" },
        { char: "log", latex: "\\log", name: "logarithm" },
        { char: "ln", latex: "\\ln", name: "natural logarithm" },
        { char: "exp", latex: "\\exp", name: "exponential" },
        { char: "det", latex: "\\det", name: "determinant" },
        { char: "dim", latex: "\\dim", name: "dimension" },
        { char: "ker", latex: "\\ker", name: "kernel" },
        { char: "gcd", latex: "\\gcd", name: "greatest common divisor" },
        { char: "arg", latex: "\\arg", name: "argument" },
        { char: "min", latex: "\\min", name: "minimum" },
        { char: "max", latex: "\\max", name: "maximum" },
    ];
}

/** Build accent symbols. */
function buildAccentSymbols(): SymbolEntry[]
{
    return [
        { char: "\u0302x", latex: "\\hat{x}", name: "hat" },
        { char: "\u0304x", latex: "\\bar{x}", name: "bar" },
        { char: "\u20D7x", latex: "\\vec{x}", name: "vector" },
        { char: "\u0307x", latex: "\\dot{x}", name: "dot" },
        { char: "\u0308x", latex: "\\ddot{x}", name: "double dot" },
        { char: "\u0303x", latex: "\\tilde{x}", name: "tilde" },
        { char: "\u0306x", latex: "\\breve{x}", name: "breve" },
        { char: "\u030Cx", latex: "\\check{x}", name: "check" },
        { char: "\u0301x", latex: "\\acute{x}", name: "acute" },
        { char: "\u0300x", latex: "\\grave{x}", name: "grave" },
        { char: "\u0305ab", latex: "\\overline{x}", name: "overline" },
        { char: "\u0302ab", latex: "\\widehat{x}", name: "wide hat" },
        { char: "\u0303ab", latex: "\\widetilde{x}", name: "wide tilde" },
        { char: "\u20D7ab", latex: "\\overrightarrow{x}", name: "over right arrow" },
    ];
}

/** Build chemistry symbols (mhchem). */
function buildChemistrySymbols(): SymbolEntry[]
{
    return [
        { char: "H\u2082O", latex: "\\ce{H2O}", name: "water" },
        { char: "CO\u2082", latex: "\\ce{CO2}", name: "carbon dioxide" },
        { char: "NaCl", latex: "\\ce{NaCl}", name: "sodium chloride" },
        { char: "\u2192", latex: "\\ce{->}", name: "reaction arrow" },
        { char: "\u21CC", latex: "\\ce{<=>}", name: "equilibrium" },
        { char: "\u2193", latex: "\\ce{v}", name: "precipitate" },
        { char: "\u2191", latex: "\\ce{^}", name: "gas evolution" },
        { char: "(aq)", latex: "\\ce{(aq)}", name: "aqueous" },
        { char: "(s)", latex: "\\ce{(s)}", name: "solid" },
        { char: "(l)", latex: "\\ce{(l)}", name: "liquid" },
        { char: "(g)", latex: "\\ce{(g)}", name: "gas state" },
        { char: "\u00B9\u2074C", latex: "\\ce{^{14}_{6}C}", name: "carbon-14 isotope" },
        { char: "SO\u2084\u00B2\u207B", latex: "\\ce{SO4^2-}", name: "sulfate ion" },
        { char: "H\u2014H", latex: "\\ce{H-H}", name: "single bond" },
        { char: "O=O", latex: "\\ce{O=O}", name: "double bond" },
        { char: "N\u2261N", latex: "\\ce{N#N}", name: "triple bond" },
    ];
}

/** Build logic and set theory symbols. */
function buildLogicSymbols(): SymbolEntry[]
{
    return [
        { char: "\u2200", latex: "\\forall", name: "for all" },
        { char: "\u2203", latex: "\\exists", name: "exists" },
        { char: "\u2204", latex: "\\nexists", name: "not exists" },
        { char: "\u00AC", latex: "\\neg", name: "negation" },
        { char: "\u2227", latex: "\\land", name: "logical and" },
        { char: "\u2228", latex: "\\lor", name: "logical or" },
        { char: "\u22A2", latex: "\\vdash", name: "proves" },
        { char: "\u22A8", latex: "\\models", name: "models" },
        { char: "\u22A4", latex: "\\top", name: "tautology" },
        { char: "\u22A5", latex: "\\bot", name: "contradiction" },
        { char: "\u2115", latex: "\\mathbb{N}", name: "naturals" },
        { char: "\u2124", latex: "\\mathbb{Z}", name: "integers" },
        { char: "\u211A", latex: "\\mathbb{Q}", name: "rationals" },
        { char: "\u211D", latex: "\\mathbb{R}", name: "reals" },
        { char: "\u2102", latex: "\\mathbb{C}", name: "complex numbers" },
    ];
}

/** Build miscellaneous symbols. */
function buildMiscSymbols(): SymbolEntry[]
{
    return [
        { char: "\u221E", latex: "\\infty", name: "infinity" },
        { char: "\u2135", latex: "\\aleph", name: "aleph" },
        { char: "\u2205", latex: "\\emptyset", name: "empty set" },
        { char: "\u210F", latex: "\\hbar", name: "h-bar" },
        { char: "\u2113", latex: "\\ell", name: "ell" },
        { char: "\u2202", latex: "\\partial", name: "partial" },
        { char: "\u2118", latex: "\\wp", name: "Weierstrass p" },
        { char: "\u2026", latex: "\\ldots", name: "horizontal dots" },
        { char: "\u22EF", latex: "\\cdots", name: "center dots" },
        { char: "\u22EE", latex: "\\vdots", name: "vertical dots" },
        { char: "\u22F1", latex: "\\ddots", name: "diagonal dots" },
        { char: "\u2003", latex: "\\quad", name: "quad space" },
        { char: "\u2005", latex: "\\,", name: "thin space" },
        { char: "\u2004", latex: "\\;", name: "thick space" },
        { char: "\u00B0", latex: "^{\\circ}", name: "degree" },
    ];
}

/** Build all 12 symbol categories. */
function buildAllCategories(): SymbolCategory[]
{
    return [
        { label: "Greek", symbols: buildGreekSymbols() },
        { label: "Operators", symbols: buildOperatorSymbols() },
        { label: "Relations", symbols: buildRelationSymbols() },
        { label: "Arrows", symbols: buildArrowSymbols() },
        { label: "Brackets", symbols: buildBracketSymbols() },
        { label: "Calculus", symbols: buildCalculusSymbols() },
        { label: "Structures", symbols: buildStructureSymbols() },
        { label: "Functions", symbols: buildFunctionSymbols() },
        { label: "Accents", symbols: buildAccentSymbols() },
        { label: "Chemistry", symbols: buildChemistrySymbols() },
        { label: "Logic", symbols: buildLogicSymbols() },
        { label: "More", symbols: buildMiscSymbols() },
    ];
}

/** Cached categories (built once). */
let _cachedCategories: SymbolCategory[] | null = null;

/** Get all categories (lazy build). */
function getAllCategories(): SymbolCategory[]
{
    if (!_cachedCategories)
    {
        _cachedCategories = buildAllCategories();
    }
    return _cachedCategories;
}

// ============================================================================
// PRIVATE HELPERS — DOM
// ============================================================================

/** Create an element with optional class name. */
function createElement(tag: string, className?: string): HTMLElement
{
    const el = document.createElement(tag);
    if (className)
    {
        el.classList.add(...className.split(" "));
    }
    return el;
}

/** Set multiple attributes on an element. */
function setAttr(
    el: HTMLElement,
    attrs: Record<string, string>): void
{
    for (const key of Object.keys(attrs))
    {
        el.setAttribute(key, attrs[key]);
    }
}

/** Resolve a container element from a string selector or HTMLElement. */
function resolveContainer(input: HTMLElement | string): HTMLElement | null
{
    if (typeof input === "string")
    {
        return document.querySelector(input) as HTMLElement | null;
    }
    return input;
}

// ============================================================================
// PRIVATE HELPERS — KATEX
// ============================================================================

/** Reference to KaTeX global, if available. */
function getKaTeX(): any
{
    return (window as unknown as Record<string, unknown>)["katex"] || null;
}

/** Render LaTeX to HTML string using KaTeX. */
function renderKaTeX(
    latex: string,
    displayMode: boolean): string
{
    const katex = getKaTeX();
    if (!katex)
    {
        return escapeHtml(latex);
    }
    try
    {
        return katex.renderToString(latex, {
            displayMode,
            throwOnError: false,
            output: "html",
        });
    }
    catch (err)
    {
        logDebug("KaTeX render error:", err);
        return buildErrorHtml(latex, String(err));
    }
}

/** Build error display HTML for preview. */
function buildErrorHtml(latex: string, error: string): string
{
    const escaped = escapeHtml(latex);
    const msg = escapeHtml(error);
    return "<div class=\"le-preview-error\">" + msg + "</div>" +
           "<div class=\"le-preview-raw\">" + escaped + "</div>";
}

/** Check if MathLive is available. */
function hasMathLive(): boolean
{
    return typeof customElements !== "undefined" &&
           customElements.get("math-field") !== undefined;
}

/** Escape HTML special characters. */
function escapeHtml(text: string): string
{
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

// ============================================================================
// PRIVATE HELPERS — STATE
// ============================================================================

/** Apply default values to options. */
function resolveOptions(
    opts: LatexEditorOptions): InternalState["options"]
{
    return {
        displayMode: opts.displayMode !== false,
        showToolbar: opts.showToolbar !== false,
        showSymbolPalette: opts.showSymbolPalette !== false,
        showPreview: opts.showPreview !== false,
        contained: opts.contained === true,
        minWidth: opts.minWidth || DEFAULT_MIN_WIDTH,
        minHeight: opts.minHeight || DEFAULT_MIN_HEIGHT,
        readOnly: opts.readOnly === true,
        enableChemistry: opts.enableChemistry !== false,
        enableCancel: opts.enableCancel !== false,
        cssClass: opts.cssClass,
        onChange: opts.onChange,
        onConfirm: opts.onConfirm,
    };
}

/** Create initial internal state. */
function createState(opts: LatexEditorOptions): InternalState
{
    const wantsVisual = opts.editMode === "visual";
    const canVisual = hasMathLive();
    if (wantsVisual && !canVisual)
    {
        logWarn("MathLive not loaded, falling back to source mode");
    }

    return {
        id: ++_instanceId,
        options: resolveOptions(opts),
        expression: opts.expression || "",
        editMode: (wantsVisual && canVisual) ? "visual" : "source",
        rootEl: null,
        containerEl: null,
        sourceEl: null,
        previewEl: null,
        editorEl: null,
        previewTimer: null,
        destroyed: false,
        paletteTabsEl: null,
        paletteGridEl: null,
        paletteSearchEl: null,
        paletteActiveTab: 0,
        searchTimer: null,
        toolbarEl: null,
        sizeDropdownEl: null,
    };
}

// ============================================================================
// RENDER — ROOT
// ============================================================================

/** Build the root DOM structure. */
function renderRoot(state: InternalState): void
{
    const root = createElement("div", "le-root");
    setAttr(root, {
        role: "group",
        "aria-label": "LaTeX Equation Editor",
    });

    applyRootStyles(state, root);
    renderToolbar(state, root);
    renderEditorArea(state, root);
    renderPreview(state, root);
    renderPalette(state, root);

    state.rootEl = root;
    if (state.containerEl)
    {
        state.containerEl.appendChild(root);
    }
}

/** Apply styles and classes to the root element. */
function applyRootStyles(state: InternalState, root: HTMLElement): void
{
    if (state.options.cssClass)
    {
        root.classList.add(state.options.cssClass);
    }

    if (state.options.contained)
    {
        root.classList.add("le-root--contained");
    }
    else
    {
        root.style.minWidth = state.options.minWidth + "px";
        root.style.minHeight = state.options.minHeight + "px";
    }
}

// ============================================================================
// RENDER — TOOLBAR
// ============================================================================

/** Size commands for the size dropdown. */
const SIZE_COMMANDS: Array<{ label: string; latex: string }> = [
    { label: "Tiny", latex: "\\tiny" },
    { label: "Script", latex: "\\scriptsize" },
    { label: "Small", latex: "\\small" },
    { label: "Normal", latex: "\\normalsize" },
    { label: "Large", latex: "\\large" },
    { label: "Huge", latex: "\\huge" },
];

/** Build the styling toolbar. */
function renderToolbar(state: InternalState, root: HTMLElement): void
{
    if (!state.options.showToolbar)
    {
        return;
    }

    const toolbar = createElement("div", "le-toolbar");
    setAttr(toolbar, { role: "toolbar", "aria-label": "Equation formatting" });

    appendToolbarButtons(state, toolbar);
    appendToolbarDivider(toolbar);
    appendModeToggle(state, toolbar);

    root.appendChild(toolbar);
    state.toolbarEl = toolbar;
}

/** Add formatting action buttons to the toolbar. */
function appendToolbarButtons(
    state: InternalState,
    toolbar: HTMLElement): void
{
    appendActionButton(toolbar, "bold", "B", "Bold (Ctrl+B)");
    appendActionButton(toolbar, "size", "A\u2193", "Font size");
    appendActionButton(toolbar, "boxed", "\u25A1", "Boxed");

    if (state.options.enableCancel)
    {
        appendActionButton(toolbar, "cancel", "\u0338X", "Cancel (strikethrough)");
    }

    bindToolbarActions(state, toolbar);
}

/** Create and append a single action button. */
function appendActionButton(
    parent: HTMLElement,
    action: string,
    label: string,
    title: string): void
{
    const btn = createElement("button", "le-toolbar-btn");
    btn.textContent = label;
    setAttr(btn, {
        type: "button",
        "data-action": action,
        title,
        "aria-label": title,
    });
    parent.appendChild(btn);
}

/** Append a visual divider element. */
function appendToolbarDivider(toolbar: HTMLElement): void
{
    const div = createElement("div", "le-toolbar-divider");
    toolbar.appendChild(div);
}

/** Create a single mode toggle button. */
function createModeBtn(
    state: InternalState,
    mode: "visual" | "source",
    label: string): HTMLButtonElement
{
    const btn = createElement("button", "le-toolbar-btn") as HTMLButtonElement;
    btn.textContent = label;
    setAttr(btn, { type: "button", "data-mode": mode });
    btn.addEventListener("click", () => setModeViaToggle(state, mode));
    return btn;
}

/** Append the Visual/Source mode toggle. */
function appendModeToggle(
    state: InternalState,
    toolbar: HTMLElement): void
{
    const toggle = createElement("div", "le-mode-toggle");
    const visualBtn = createModeBtn(state, "visual", "Visual");
    const sourceBtn = createModeBtn(state, "source", "Source");

    if (!hasMathLive())
    {
        visualBtn.disabled = true;
        visualBtn.title = "MathLive not loaded";
    }

    const activeBtn = state.editMode === "source" ? sourceBtn : visualBtn;
    activeBtn.classList.add("active");

    toggle.appendChild(visualBtn);
    toggle.appendChild(sourceBtn);
    toolbar.appendChild(toggle);
}

/** Handle mode toggle click. */
function setModeViaToggle(
    state: InternalState,
    mode: "visual" | "source"): void
{
    state.editMode = mode;
    updateModeToggleUI(state);
    logDebug("Mode toggled:", mode);
}

/** Update the active class on mode toggle buttons. */
function updateModeToggleUI(state: InternalState): void
{
    if (!state.toolbarEl) { return; }
    const btns = state.toolbarEl.querySelectorAll("[data-mode]");
    for (const btn of Array.from(btns))
    {
        btn.classList.toggle("active", btn.getAttribute("data-mode") === state.editMode);
    }
}

/** Bind click handlers for toolbar action buttons. */
function bindToolbarActions(
    state: InternalState,
    toolbar: HTMLElement): void
{
    toolbar.addEventListener("click", (e: Event) =>
    {
        const target = (e.target as HTMLElement).closest("[data-action]");
        if (!target) { return; }
        const action = target.getAttribute("data-action")!;
        handleToolbarAction(state, action);
    });
}

/** Dispatch a toolbar action. */
function handleToolbarAction(
    state: InternalState,
    action: string): void
{
    if (state.options.readOnly || state.destroyed) { return; }

    switch (action)
    {
        case "bold":
            wrapSelection(state, "\\mathbf{", "}");
            break;
        case "boxed":
            wrapSelection(state, "\\boxed{", "}");
            break;
        case "cancel":
            wrapSelection(state, "\\cancel{", "}");
            break;
        case "size":
            toggleSizeDropdown(state);
            break;
        default:
            logDebug("Unknown action:", action);
    }
}

// ============================================================================
// TOOLBAR — WRAP SELECTION HELPER
// ============================================================================

/** Wrap the current textarea selection with before/after strings. */
function wrapSelection(
    state: InternalState,
    before: string,
    after: string): void
{
    if (!state.sourceEl || state.options.readOnly) { return; }

    const ta = state.sourceEl;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = ta.value.substring(start, end);
    const wrapped = before + selected + after;

    ta.value = ta.value.substring(0, start) + wrapped + ta.value.substring(end);
    state.expression = ta.value;

    // Position cursor inside the braces if no selection
    const newPos = start + before.length + selected.length;
    ta.selectionStart = newPos;
    ta.selectionEnd = newPos;

    updatePreview(state);
    fireOnChange(state);
}

// ============================================================================
// TOOLBAR — SIZE DROPDOWN
// ============================================================================

/** Toggle the size dropdown visibility. */
function toggleSizeDropdown(state: InternalState): void
{
    if (state.sizeDropdownEl)
    {
        closeSizeDropdown(state);
        return;
    }
    openSizeDropdown(state);
}

/** Open the size dropdown. */
function openSizeDropdown(state: InternalState): void
{
    const dd = createElement("div", "le-size-dropdown");
    for (const cmd of SIZE_COMMANDS)
    {
        const opt = createElement("button", "le-size-option");
        opt.textContent = cmd.label;
        setAttr(opt, { type: "button", "data-size-latex": cmd.latex });
        opt.addEventListener("click", () => applySizeCommand(state, cmd.latex));
        dd.appendChild(opt);
    }

    const sizeBtn = state.toolbarEl?.querySelector("[data-action='size']");
    if (sizeBtn)
    {
        sizeBtn.parentElement!.appendChild(dd);
    }
    state.sizeDropdownEl = dd;
}

/** Apply a size command and close the dropdown. */
function applySizeCommand(state: InternalState, latex: string): void
{
    wrapSelection(state, latex + "{", "}");
    closeSizeDropdown(state);
}

/** Close the size dropdown. */
function closeSizeDropdown(state: InternalState): void
{
    if (state.sizeDropdownEl)
    {
        state.sizeDropdownEl.remove();
        state.sizeDropdownEl = null;
    }
}

// ============================================================================
// RENDER — EDITOR AREA
// ============================================================================

/** Build the editor area with source textarea. */
function renderEditorArea(state: InternalState, root: HTMLElement): void
{
    const editor = createElement("div", "le-editor");
    root.appendChild(editor);
    state.editorEl = editor;

    renderSourceTextarea(state, editor);
}

/** Build the source mode textarea. */
function renderSourceTextarea(
    state: InternalState,
    parent: HTMLElement): void
{
    const textarea = createElement("textarea", "le-source") as HTMLTextAreaElement;
    textarea.value = state.expression;
    textarea.readOnly = state.options.readOnly;
    textarea.spellcheck = false;

    setAttr(textarea, {
        "aria-label": "LaTeX equation source",
        autocomplete: "off",
        autocorrect: "off",
        autocapitalize: "off",
    });

    textarea.addEventListener("input", () => handleSourceInput(state));
    textarea.addEventListener("keydown", (e) => handleKeyDown(state, e));

    parent.appendChild(textarea);
    state.sourceEl = textarea;
}

// ============================================================================
// RENDER — PREVIEW
// ============================================================================

/** Build the live preview pane. */
function renderPreview(state: InternalState, root: HTMLElement): void
{
    if (!state.options.showPreview)
    {
        return;
    }

    const preview = createElement("div", "le-preview");
    setAttr(preview, {
        role: "status",
        "aria-live": "polite",
        "aria-label": "Equation preview",
    });

    root.appendChild(preview);
    state.previewEl = preview;

    updatePreview(state);
}

/** Update the KaTeX preview from the current expression. */
function updatePreview(state: InternalState): void
{
    if (!state.previewEl || state.destroyed)
    {
        return;
    }

    const html = renderKaTeX(state.expression, state.options.displayMode);
    state.previewEl.innerHTML = html;
    logTrace("Preview updated");
}

/** Debounced preview update for source mode. */
function schedulePreviewUpdate(state: InternalState): void
{
    if (state.previewTimer)
    {
        clearTimeout(state.previewTimer);
    }

    state.previewTimer = setTimeout(
        () => updatePreview(state),
        PREVIEW_DEBOUNCE_MS
    );
}

// ============================================================================
// RENDER — SYMBOL PALETTE
// ============================================================================

/** Build the symbol palette UI. */
function renderPalette(state: InternalState, root: HTMLElement): void
{
    if (!state.options.showSymbolPalette)
    {
        return;
    }

    const palette = createElement("div", "le-palette");
    renderPaletteTabBar(state, palette);
    renderPaletteGrid(state, palette);
    renderPaletteSearch(state, palette);
    root.appendChild(palette);
}

/** Build the tab bar for symbol categories. */
function renderPaletteTabBar(
    state: InternalState,
    palette: HTMLElement): void
{
    const tabBar = createElement("div", "le-palette-tabs");
    setAttr(tabBar, { role: "tablist" });

    const categories = getAllCategories();
    for (let i = 0; i < categories.length; i++)
    {
        const tab = createPaletteTab(state, categories[i].label, i);
        tabBar.appendChild(tab);
    }

    palette.appendChild(tabBar);
    state.paletteTabsEl = tabBar;
}

/** Create a single palette tab button. */
function createPaletteTab(
    state: InternalState,
    label: string,
    index: number): HTMLElement
{
    const btn = createElement("button", "le-palette-tab");
    btn.textContent = label;
    setAttr(btn, { type: "button", role: "tab" });

    if (index === state.paletteActiveTab)
    {
        btn.classList.add("active");
    }

    btn.addEventListener("click", () => handleTabClick(state, index));
    return btn;
}

/** Build the symbol grid for the active category. */
function renderPaletteGrid(
    state: InternalState,
    palette: HTMLElement): void
{
    const grid = createElement("div", "le-palette-grid");
    palette.appendChild(grid);
    state.paletteGridEl = grid;

    populateGrid(state, getAllCategories()[state.paletteActiveTab].symbols);
}

/** Populate the grid with symbol cells. */
function populateGrid(
    state: InternalState,
    symbols: SymbolEntry[]): void
{
    if (!state.paletteGridEl)
    {
        return;
    }
    state.paletteGridEl.textContent = "";

    for (const sym of symbols)
    {
        const cell = createSymbolCell(state, sym);
        state.paletteGridEl.appendChild(cell);
    }
}

/** Create a single symbol cell button. */
function createSymbolCell(
    state: InternalState,
    sym: SymbolEntry): HTMLElement
{
    const cell = createElement("button", "le-palette-cell");
    cell.textContent = sym.char;

    setAttr(cell, {
        type: "button",
        role: "button",
        title: sym.latex,
        "aria-label": sym.name + " (" + sym.latex + ")",
        "data-latex": sym.latex,
    });

    cell.addEventListener("click", () => handleSymbolClick(state, sym));
    return cell;
}

/** Build the search input for the palette. */
function renderPaletteSearch(
    state: InternalState,
    palette: HTMLElement): void
{
    const wrapper = createElement("div", "le-palette-search");
    const input = createElement("input") as HTMLInputElement;
    input.type = "text";
    input.placeholder = "Search symbols\u2026";
    setAttr(input, { "aria-label": "Search symbols" });

    input.addEventListener("input", () => handleSearchInput(state));

    wrapper.appendChild(input);
    palette.appendChild(wrapper);
    state.paletteSearchEl = input;
}

/** Handle tab click to switch categories. */
function handleTabClick(state: InternalState, index: number): void
{
    if (state.destroyed)
    {
        return;
    }

    state.paletteActiveTab = index;
    updateActiveTabs(state);
    clearSearch(state);
    populateGrid(state, getAllCategories()[index].symbols);
    logTrace("Palette tab switched:", index);
}

/** Update active class on tab buttons. */
function updateActiveTabs(state: InternalState): void
{
    if (!state.paletteTabsEl)
    {
        return;
    }

    const tabs = state.paletteTabsEl.querySelectorAll(".le-palette-tab");
    for (let i = 0; i < tabs.length; i++)
    {
        tabs[i].classList.toggle("active", i === state.paletteActiveTab);
    }
}

/** Handle symbol cell click — insert LaTeX at cursor. */
function handleSymbolClick(
    state: InternalState,
    sym: SymbolEntry): void
{
    if (state.options.readOnly || state.destroyed)
    {
        return;
    }

    insertAtCursorInternal(state, sym.latex);
    logTrace("Symbol inserted:", sym.latex);
}

/** Handle search input in the palette. */
function handleSearchInput(state: InternalState): void
{
    if (state.searchTimer)
    {
        clearTimeout(state.searchTimer);
    }

    state.searchTimer = setTimeout(
        () => executeSearch(state),
        SEARCH_DEBOUNCE_MS
    );
}

/** Execute search across all categories. */
function executeSearch(state: InternalState): void
{
    if (!state.paletteSearchEl || state.destroyed)
    {
        return;
    }

    const query = state.paletteSearchEl.value.trim().toLowerCase();
    if (!query)
    {
        populateGrid(
            state,
            getAllCategories()[state.paletteActiveTab].symbols
        );
        return;
    }

    const results = searchSymbols(query);
    populateGrid(state, results);
}

/** Search all categories for matching symbols. */
function searchSymbols(query: string): SymbolEntry[]
{
    const results: SymbolEntry[] = [];
    const categories = getAllCategories();

    for (const cat of categories)
    {
        for (const sym of cat.symbols)
        {
            if (matchesQuery(sym, query))
            {
                results.push(sym);
            }
        }
    }
    return results;
}

/** Check if a symbol matches the search query. */
function matchesQuery(sym: SymbolEntry, query: string): boolean
{
    return sym.name.toLowerCase().includes(query) ||
           sym.latex.toLowerCase().includes(query) ||
           sym.char.toLowerCase().includes(query);
}

/** Clear the search input and reset grid. */
function clearSearch(state: InternalState): void
{
    if (state.paletteSearchEl)
    {
        state.paletteSearchEl.value = "";
    }
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

/** Handle input in the source textarea. */
function handleSourceInput(state: InternalState): void
{
    if (!state.sourceEl || state.destroyed)
    {
        return;
    }

    state.expression = state.sourceEl.value;
    schedulePreviewUpdate(state);
    fireOnChange(state);
}

/** Handle keydown events in the source textarea. */
function handleKeyDown(state: InternalState, e: KeyboardEvent): void
{
    if (state.destroyed) { return; }

    if (e.ctrlKey && e.key === "Enter")
    {
        e.preventDefault();
        fireOnConfirm(state);
    }
    else if (e.ctrlKey && !e.shiftKey && e.key === "b")
    {
        e.preventDefault();
        wrapSelection(state, "\\mathbf{", "}");
    }
    else if (e.ctrlKey && !e.shiftKey && e.key === "/")
    {
        e.preventDefault();
        insertAtCursorInternal(state, "\\frac{}{}");
    }
    else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "m")
    {
        e.preventDefault();
        toggleEditMode(state);
    }
}

/** Toggle between visual and source editing mode. */
function toggleEditMode(state: InternalState): void
{
    const next = state.editMode === "source" ? "visual" : "source";
    state.editMode = next;
    updateModeToggleUI(state);
    logDebug("Mode toggled via shortcut:", next);
}

/** Fire the onChange callback. */
function fireOnChange(state: InternalState): void
{
    if (state.options.onChange)
    {
        state.options.onChange(state.expression);
    }
}

/** Fire the onConfirm callback. */
function fireOnConfirm(state: InternalState): void
{
    if (state.options.onConfirm)
    {
        state.options.onConfirm(state.expression, getMathMLInternal(state));
    }
}

// ============================================================================
// MATHML CONVERSION
// ============================================================================

/** Get MathML from current expression (stub until MathLive Phase 4). */
function getMathMLInternal(_state: InternalState): string
{
    // MathML conversion requires MathLive (Phase 4).
    // For now, return empty string.
    return "";
}

// ============================================================================
// PUBLIC API — INSERT AT CURSOR
// ============================================================================

/** Insert LaTeX at the current cursor position in source mode. */
function insertAtCursorInternal(
    state: InternalState,
    latex: string): void
{
    if (!state.sourceEl || state.destroyed)
    {
        return;
    }

    const ta = state.sourceEl;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const before = ta.value.substring(0, start);
    const after = ta.value.substring(end);

    ta.value = before + latex + after;
    state.expression = ta.value;

    // Position cursor after inserted text
    const newPos = start + latex.length;
    ta.selectionStart = newPos;
    ta.selectionEnd = newPos;

    updatePreview(state);
    fireOnChange(state);
    logDebug("Inserted at cursor:", latex);
}

// ============================================================================
// PUBLIC API — FACTORY
// ============================================================================

// @entrypoint

/** Create a new LatexEditor instance. */
export function createLatexEditor(opts: LatexEditorOptions): LatexEditor
{
    const state = createState(opts);

    state.containerEl = resolveContainer(opts.container);
    if (!state.containerEl)
    {
        logWarn("Container not found:", opts.container);
    }

    renderRoot(state);
    logInfo("Initialised", { id: state.id, mode: state.editMode });

    return buildPublicHandle(state);
}

/** Set expression and sync all views. */
function setExpressionInternal(
    state: InternalState,
    latex: string): void
{
    state.expression = latex;
    if (state.sourceEl)
    {
        state.sourceEl.value = latex;
    }
    updatePreview(state);
    fireOnChange(state);
    logDebug("Expression set:", latex);
}

/** Set read-only state on the editor. */
function setReadOnlyInternal(
    state: InternalState,
    readOnly: boolean): void
{
    state.options.readOnly = readOnly;
    if (state.sourceEl)
    {
        state.sourceEl.readOnly = readOnly;
    }
    logDebug("Read-only:", readOnly);
}

/** Clean up timers during destroy. */
function clearTimers(state: InternalState): void
{
    if (state.previewTimer)
    {
        clearTimeout(state.previewTimer);
    }
    if (state.searchTimer)
    {
        clearTimeout(state.searchTimer);
    }
}

/** Remove DOM and null out references during destroy. */
function teardownDom(state: InternalState): void
{
    if (state.rootEl && state.rootEl.parentNode)
    {
        state.rootEl.parentNode.removeChild(state.rootEl);
    }
    state.rootEl = null;
    state.sourceEl = null;
    state.previewEl = null;
    state.editorEl = null;
    state.containerEl = null;
    state.paletteTabsEl = null;
    state.paletteGridEl = null;
    state.paletteSearchEl = null;
    state.toolbarEl = null;
    state.sizeDropdownEl = null;
    state.expression = "";
}

/** Set edit mode via public API. */
function setEditModePublic(
    state: InternalState, mode: "visual" | "source"): void
{
    state.editMode = mode;
    updateModeToggleUI(state);
    logDebug("Edit mode set:", mode);
}

/** Destroy the editor instance. */
function destroyEditor(state: InternalState): void
{
    if (state.destroyed) { return; }
    state.destroyed = true;
    clearTimers(state);
    teardownDom(state);
    logInfo("Destroyed", { id: state.id });
}

/** Build the public API handle. */
function buildPublicHandle(state: InternalState): LatexEditor
{
    return {
        getLatex: () => state.expression,
        getMathML: () => getMathMLInternal(state),
        getValue: () => ({ latex: state.expression, mathml: getMathMLInternal(state) }),
        setExpression: (latex: string) => setExpressionInternal(state, latex),
        setEditMode: (mode: "visual" | "source") => setEditModePublic(state, mode),
        getEditMode: () => state.editMode,
        insertAtCursor: (latex: string) => insertAtCursorInternal(state, latex),
        setReadOnly: (readOnly: boolean) => setReadOnlyInternal(state, readOnly),
        focus: () => { if (state.sourceEl && !state.destroyed) { state.sourceEl.focus(); } },
        destroy: () => destroyEditor(state),
        getElement: () => state.rootEl!,
    };
}

// ⚓ LatexEditor — register on window for IIFE consumers
(window as unknown as Record<string, unknown>)["createLatexEditor"] = createLatexEditor;
