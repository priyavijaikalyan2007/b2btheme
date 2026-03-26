/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: SymbolPicker
 * 📜 PURPOSE: Grid-based symbol/icon picker for inserting Unicode characters
 *             and Bootstrap Icons, with search, categories, and recent items.
 * 🔗 RELATES: [[EnterpriseTheme]], [[ColorPicker]], [[FontDropdown]]
 * ⚡ FLOW: [Consumer App] -> [createSymbolPicker()] -> [DOM Grid + Popup]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// S1: INTERFACES
// ============================================================================

/** A single symbol or icon entry. */
export interface SymbolItem
{
    /** The character ("α") or icon class ("bi-house"). */
    char: string;
    /** Human-readable name ("Greek Small Letter Alpha"). */
    name: string;
    /** Unicode point ("U+03B1") or icon class ("bi-house"). */
    code: string;
    /** Category id ("greek", "common"). */
    category: string;
}

/** A group of symbols under a named tab. */
export interface SymbolCategory
{
    /** Machine id used for filtering. */
    id: string;
    /** Human label for the tab. */
    label: string;
    /** Optional Bootstrap Icon class for the tab. */
    icon?: string;
    /** Items belonging to this category. */
    items: SymbolItem[];
}

/** Configuration options for the SymbolPicker component. */
export interface SymbolPickerOptions
{
    /** Display mode. Default: "both". */
    mode?: "unicode" | "icons" | "both";
    /** Override default categories. */
    categories?: SymbolCategory[];
    /** Initially selected symbol code. */
    value?: string;
    /** Show recently used section. Default: true. */
    showRecent?: boolean;
    /** Maximum recent items to remember. Default: 20. */
    maxRecent?: number;
    /** Show enlarged preview on hover/select. Default: true. */
    showPreview?: boolean;
    /** Show search input. Default: true. */
    showSearch?: boolean;
    /** Grid columns. Default: 12. */
    columns?: number;
    /** Cell size in px. Default: 32. */
    cellSize?: number;
    /** Render inline (true) or popup (false). Default: false. */
    inline?: boolean;
    /** Popup position relative to trigger. Default: "bottom-start". */
    popupPosition?: "bottom-start" | "bottom-end" | "top-start" | "top-end";
    /** Custom trigger element (popup mode). */
    triggerElement?: HTMLElement;
    /** Size variant. Default: "default". */
    size?: "mini" | "sm" | "default" | "lg";
    /** Disable the component. Default: false. */
    disabled?: boolean;
    /** Fired when a symbol is highlighted. */
    onSelect?: (symbol: SymbolItem) => void;
    /** Fired when a symbol is inserted (double-click or button). */
    onInsert?: (symbol: SymbolItem) => void;
    /** Fired when popup opens. */
    onOpen?: () => void;
    /** Fired when popup closes. */
    onClose?: () => void;
    /** Override default keyboard bindings. */
    keyBindings?: Partial<Record<string, string>>;
}

// ============================================================================
// S2: CONSTANTS
// ============================================================================

const LOG_PREFIX = "[SymbolPicker]";
const CLS = "symbolpicker";
const POPUP_Z_INDEX = 1050;
const DEFAULT_COLUMNS = 12;
const DEFAULT_CELL_SIZE = 32;
const DEFAULT_MAX_RECENT = 20;
const RECENT_STORAGE_KEY = "symbolpicker-recent";
const ICON_PREFIX_BI = "bi-";
const ICON_PREFIX_FA = "fa-";
const FA_STYLE_CLASSES = ["fa-solid", "fa-regular", "fa-brands", "fa-light", "fa-thin"];
let instanceCounter = 0;

/** Module-level cache for discovered icon categories. */
let discoveredIconCache: SymbolCategory[] | null = null;

/** Cached Font Awesome style class (e.g. "fa-solid"). */
let cachedFaStyle: string | null = null;

const DEFAULT_KEY_BINDINGS: Record<string, string> =
{
    moveLeft: "ArrowLeft",
    moveRight: "ArrowRight",
    moveUp: "ArrowUp",
    moveDown: "ArrowDown",
    confirmInsert: "Enter",
    closePopup: "Escape",
    jumpToFirst: "Home",
    jumpToLast: "End",
    focusSearch: "Ctrl+F",
};

// ============================================================================
// S3: DOM HELPERS
// ============================================================================

/** Create an element with optional CSS classes and text. */
function createElement(tag: string, classes: string[], text?: string): HTMLElement
{
    const el = document.createElement(tag);
    if (classes.length > 0) { el.classList.add(...classes); }
    if (text) { el.textContent = text; }
    return el;
}

/** Set multiple attributes on an element. */
function setAttr(el: HTMLElement, attrs: Record<string, string>): void
{
    for (const key of Object.keys(attrs))
    {
        el.setAttribute(key, attrs[key]);
    }
}

/** Invoke callback safely, catching and logging errors. */
function safeCallback<T extends unknown[]>(
    fn: ((...a: T) => void) | undefined, ...args: T
): void
{
    if (!fn) { return; }
    try { fn(...args); }
    catch (err) { console.error(LOG_PREFIX, "callback error:", err); }
}

// ============================================================================
// S4: UNICODE SYMBOL DATA
// ============================================================================

/** Build a single SymbolItem from character, name, and hex code point. */
function sym(char: string, name: string, hex: string, category: string): SymbolItem
{
    return { char, name, code: `U+${hex}`, category };
}

/** Latin Extended characters. */
function buildLatinExtended(): SymbolItem[]
{
    const cat = "latin";
    return [
        sym("À", "Latin Capital A with Grave", "00C0", cat),
        sym("Á", "Latin Capital A with Acute", "00C1", cat),
        sym("Â", "Latin Capital A with Circumflex", "00C2", cat),
        sym("Ã", "Latin Capital A with Tilde", "00C3", cat),
        sym("Ä", "Latin Capital A with Diaeresis", "00C4", cat),
        sym("Å", "Latin Capital A with Ring Above", "00C5", cat),
        sym("Æ", "Latin Capital AE", "00C6", cat),
        sym("Ç", "Latin Capital C with Cedilla", "00C7", cat),
        sym("È", "Latin Capital E with Grave", "00C8", cat),
        sym("É", "Latin Capital E with Acute", "00C9", cat),
        sym("Ê", "Latin Capital E with Circumflex", "00CA", cat),
        sym("Ë", "Latin Capital E with Diaeresis", "00CB", cat),
        sym("Ì", "Latin Capital I with Grave", "00CC", cat),
        sym("Í", "Latin Capital I with Acute", "00CD", cat),
        sym("Î", "Latin Capital I with Circumflex", "00CE", cat),
        sym("Ï", "Latin Capital I with Diaeresis", "00CF", cat),
        sym("Ð", "Latin Capital Eth", "00D0", cat),
        sym("Ñ", "Latin Capital N with Tilde", "00D1", cat),
        sym("Ò", "Latin Capital O with Grave", "00D2", cat),
        sym("Ó", "Latin Capital O with Acute", "00D3", cat),
        sym("Ô", "Latin Capital O with Circumflex", "00D4", cat),
        sym("Õ", "Latin Capital O with Tilde", "00D5", cat),
        sym("Ö", "Latin Capital O with Diaeresis", "00D6", cat),
        sym("Ø", "Latin Capital O with Stroke", "00D8", cat),
        sym("Ù", "Latin Capital U with Grave", "00D9", cat),
        sym("Ú", "Latin Capital U with Acute", "00DA", cat),
        sym("Û", "Latin Capital U with Circumflex", "00DB", cat),
        sym("Ü", "Latin Capital U with Diaeresis", "00DC", cat),
        sym("Ý", "Latin Capital Y with Acute", "00DD", cat),
        sym("Þ", "Latin Capital Thorn", "00DE", cat),
        sym("ß", "Latin Small Sharp S", "00DF", cat),
        sym("à", "Latin Small A with Grave", "00E0", cat),
        sym("á", "Latin Small A with Acute", "00E1", cat),
        sym("â", "Latin Small A with Circumflex", "00E2", cat),
        sym("ã", "Latin Small A with Tilde", "00E3", cat),
        sym("ä", "Latin Small A with Diaeresis", "00E4", cat),
        sym("å", "Latin Small A with Ring Above", "00E5", cat),
        sym("æ", "Latin Small AE", "00E6", cat),
        sym("ç", "Latin Small C with Cedilla", "00E7", cat),
        sym("è", "Latin Small E with Grave", "00E8", cat),
        sym("é", "Latin Small E with Acute", "00E9", cat),
        sym("ê", "Latin Small E with Circumflex", "00EA", cat),
        sym("ë", "Latin Small E with Diaeresis", "00EB", cat),
        sym("ì", "Latin Small I with Grave", "00EC", cat),
        sym("í", "Latin Small I with Acute", "00ED", cat),
        sym("î", "Latin Small I with Circumflex", "00EE", cat),
        sym("ï", "Latin Small I with Diaeresis", "00EF", cat),
        sym("ð", "Latin Small Eth", "00F0", cat),
        sym("ñ", "Latin Small N with Tilde", "00F1", cat),
        sym("ò", "Latin Small O with Grave", "00F2", cat),
        sym("ó", "Latin Small O with Acute", "00F3", cat),
        sym("ô", "Latin Small O with Circumflex", "00F4", cat),
        sym("õ", "Latin Small O with Tilde", "00F5", cat),
        sym("ö", "Latin Small O with Diaeresis", "00F6", cat),
        sym("ø", "Latin Small O with Stroke", "00F8", cat),
        sym("ù", "Latin Small U with Grave", "00F9", cat),
        sym("ú", "Latin Small U with Acute", "00FA", cat),
        sym("û", "Latin Small U with Circumflex", "00FB", cat),
        sym("ü", "Latin Small U with Diaeresis", "00FC", cat),
        sym("ý", "Latin Small Y with Acute", "00FD", cat),
        sym("þ", "Latin Small Thorn", "00FE", cat),
        sym("ÿ", "Latin Small Y with Diaeresis", "00FF", cat),
        sym("Œ", "Latin Capital OE", "0152", cat),
        sym("œ", "Latin Small OE", "0153", cat),
        sym("Š", "Latin Capital S with Caron", "0160", cat),
        sym("š", "Latin Small S with Caron", "0161", cat),
        sym("Ž", "Latin Capital Z with Caron", "017D", cat),
        sym("ž", "Latin Small Z with Caron", "017E", cat),
        sym("Ÿ", "Latin Capital Y with Diaeresis", "0178", cat),
        sym("ƒ", "Latin Small F with Hook", "0192", cat),
    ];
}

/** Greek letter symbols. */
function buildGreekLetters(): SymbolItem[]
{
    const cat = "greek";
    return [
        sym("Α", "Greek Capital Alpha", "0391", cat),
        sym("Β", "Greek Capital Beta", "0392", cat),
        sym("Γ", "Greek Capital Gamma", "0393", cat),
        sym("Δ", "Greek Capital Delta", "0394", cat),
        sym("Ε", "Greek Capital Epsilon", "0395", cat),
        sym("Ζ", "Greek Capital Zeta", "0396", cat),
        sym("Η", "Greek Capital Eta", "0397", cat),
        sym("Θ", "Greek Capital Theta", "0398", cat),
        sym("Ι", "Greek Capital Iota", "0399", cat),
        sym("Κ", "Greek Capital Kappa", "039A", cat),
        sym("Λ", "Greek Capital Lambda", "039B", cat),
        sym("Μ", "Greek Capital Mu", "039C", cat),
        sym("Ν", "Greek Capital Nu", "039D", cat),
        sym("Ξ", "Greek Capital Xi", "039E", cat),
        sym("Ο", "Greek Capital Omicron", "039F", cat),
        sym("Π", "Greek Capital Pi", "03A0", cat),
        sym("Ρ", "Greek Capital Rho", "03A1", cat),
        sym("Σ", "Greek Capital Sigma", "03A3", cat),
        sym("Τ", "Greek Capital Tau", "03A4", cat),
        sym("Υ", "Greek Capital Upsilon", "03A5", cat),
        sym("Φ", "Greek Capital Phi", "03A6", cat),
        sym("Χ", "Greek Capital Chi", "03A7", cat),
        sym("Ψ", "Greek Capital Psi", "03A8", cat),
        sym("Ω", "Greek Capital Omega", "03A9", cat),
        sym("α", "Greek Small Alpha", "03B1", cat),
        sym("β", "Greek Small Beta", "03B2", cat),
        sym("γ", "Greek Small Gamma", "03B3", cat),
        sym("δ", "Greek Small Delta", "03B4", cat),
        sym("ε", "Greek Small Epsilon", "03B5", cat),
        sym("ζ", "Greek Small Zeta", "03B6", cat),
        sym("η", "Greek Small Eta", "03B7", cat),
        sym("θ", "Greek Small Theta", "03B8", cat),
        sym("ι", "Greek Small Iota", "03B9", cat),
        sym("κ", "Greek Small Kappa", "03BA", cat),
        sym("λ", "Greek Small Lambda", "03BB", cat),
        sym("μ", "Greek Small Mu", "03BC", cat),
        sym("ν", "Greek Small Nu", "03BD", cat),
        sym("ξ", "Greek Small Xi", "03BE", cat),
        sym("ο", "Greek Small Omicron", "03BF", cat),
        sym("π", "Greek Small Pi", "03C0", cat),
        sym("ρ", "Greek Small Rho", "03C1", cat),
        sym("σ", "Greek Small Sigma", "03C3", cat),
        sym("τ", "Greek Small Tau", "03C4", cat),
        sym("υ", "Greek Small Upsilon", "03C5", cat),
        sym("φ", "Greek Small Phi", "03C6", cat),
        sym("χ", "Greek Small Chi", "03C7", cat),
        sym("ψ", "Greek Small Psi", "03C8", cat),
        sym("ω", "Greek Small Omega", "03C9", cat),
        sym("ϕ", "Greek Phi Symbol", "03D5", cat),
        sym("ϑ", "Greek Theta Symbol", "03D1", cat),
        sym("ϖ", "Greek Pi Symbol", "03D6", cat),
    ];
}

/** Mathematical symbols. */
function buildMathSymbols(): SymbolItem[]
{
    const cat = "math";
    return [
        sym("±", "Plus-Minus Sign", "00B1", cat),
        sym("×", "Multiplication Sign", "00D7", cat),
        sym("÷", "Division Sign", "00F7", cat),
        sym("=", "Equals Sign", "003D", cat),
        sym("≠", "Not Equal To", "2260", cat),
        sym("≈", "Almost Equal To", "2248", cat),
        sym("≡", "Identical To", "2261", cat),
        sym("<", "Less-Than Sign", "003C", cat),
        sym(">", "Greater-Than Sign", "003E", cat),
        sym("≤", "Less-Than or Equal To", "2264", cat),
        sym("≥", "Greater-Than or Equal To", "2265", cat),
        sym("≪", "Much Less-Than", "226A", cat),
        sym("≫", "Much Greater-Than", "226B", cat),
        sym("∞", "Infinity", "221E", cat),
        sym("√", "Square Root", "221A", cat),
        sym("∛", "Cube Root", "221B", cat),
        sym("∑", "N-Ary Summation", "2211", cat),
        sym("∏", "N-Ary Product", "220F", cat),
        sym("∫", "Integral", "222B", cat),
        sym("∬", "Double Integral", "222C", cat),
        sym("∂", "Partial Differential", "2202", cat),
        sym("∇", "Nabla", "2207", cat),
        sym("∈", "Element Of", "2208", cat),
        sym("∉", "Not an Element Of", "2209", cat),
        sym("∋", "Contains as Member", "220B", cat),
        sym("⊂", "Subset Of", "2282", cat),
        sym("⊃", "Superset Of", "2283", cat),
        sym("⊆", "Subset of or Equal To", "2286", cat),
        sym("⊇", "Superset of or Equal To", "2287", cat),
        sym("∪", "Union", "222A", cat),
        sym("∩", "Intersection", "2229", cat),
        sym("∧", "Logical And", "2227", cat),
        sym("∨", "Logical Or", "2228", cat),
        sym("¬", "Not Sign", "00AC", cat),
        sym("∀", "For All", "2200", cat),
        sym("∃", "There Exists", "2203", cat),
        sym("∅", "Empty Set", "2205", cat),
        sym("∝", "Proportional To", "221D", cat),
        sym("∠", "Angle", "2220", cat),
        sym("⊥", "Up Tack (Perpendicular)", "22A5", cat),
        sym("∥", "Parallel To", "2225", cat),
        sym("ℵ", "Alef Symbol", "2135", cat),
        sym("ℏ", "Planck Constant over 2Pi", "210F", cat),
        sym("ℜ", "Black-Letter Capital R", "211C", cat),
        sym("ℑ", "Black-Letter Capital I", "2111", cat),
        sym("℘", "Script Capital P", "2118", cat),
        sym("⊗", "Circled Times", "2297", cat),
        sym("⊕", "Circled Plus", "2295", cat),
        sym("⊖", "Circled Minus", "2296", cat),
        sym("⊘", "Circled Division Slash", "2298", cat),
        sym("⊙", "Circled Dot Operator", "2299", cat),
        sym("°", "Degree Sign", "00B0", cat),
        sym("′", "Prime", "2032", cat),
        sym("″", "Double Prime", "2033", cat),
        sym("‰", "Per Mille Sign", "2030", cat),
        sym("‱", "Per Ten Thousand Sign", "2031", cat),
        sym("⁰", "Superscript Zero", "2070", cat),
        sym("¹", "Superscript One", "00B9", cat),
        sym("²", "Superscript Two", "00B2", cat),
        sym("³", "Superscript Three", "00B3", cat),
        sym("⁴", "Superscript Four", "2074", cat),
        sym("⁵", "Superscript Five", "2075", cat),
        sym("⁶", "Superscript Six", "2076", cat),
        sym("⁷", "Superscript Seven", "2077", cat),
        sym("⁸", "Superscript Eight", "2078", cat),
        sym("⁹", "Superscript Nine", "2079", cat),
        sym("₀", "Subscript Zero", "2080", cat),
        sym("₁", "Subscript One", "2081", cat),
        sym("₂", "Subscript Two", "2082", cat),
        sym("₃", "Subscript Three", "2083", cat),
        sym("₄", "Subscript Four", "2084", cat),
        sym("₅", "Subscript Five", "2085", cat),
        sym("₆", "Subscript Six", "2086", cat),
        sym("₇", "Subscript Seven", "2087", cat),
        sym("₈", "Subscript Eight", "2088", cat),
        sym("₉", "Subscript Nine", "2089", cat),
    ];
}

/** Arrow symbols. */
function buildArrows(): SymbolItem[]
{
    const cat = "arrows";
    return [
        sym("←", "Leftwards Arrow", "2190", cat),
        sym("→", "Rightwards Arrow", "2192", cat),
        sym("↑", "Upwards Arrow", "2191", cat),
        sym("↓", "Downwards Arrow", "2193", cat),
        sym("↔", "Left Right Arrow", "2194", cat),
        sym("↕", "Up Down Arrow", "2195", cat),
        sym("↖", "North West Arrow", "2196", cat),
        sym("↗", "North East Arrow", "2197", cat),
        sym("↘", "South East Arrow", "2198", cat),
        sym("↙", "South West Arrow", "2199", cat),
        sym("↩", "Leftwards Arrow with Hook", "21A9", cat),
        sym("↪", "Rightwards Arrow with Hook", "21AA", cat),
        sym("⇐", "Leftwards Double Arrow", "21D0", cat),
        sym("⇒", "Rightwards Double Arrow", "21D2", cat),
        sym("⇑", "Upwards Double Arrow", "21D1", cat),
        sym("⇓", "Downwards Double Arrow", "21D3", cat),
        sym("⇔", "Left Right Double Arrow", "21D4", cat),
        sym("⇕", "Up Down Double Arrow", "21D5", cat),
        sym("⟵", "Long Leftwards Arrow", "27F5", cat),
        sym("⟶", "Long Rightwards Arrow", "27F6", cat),
        sym("⟷", "Long Left Right Arrow", "27F7", cat),
        sym("➔", "Heavy Wide-Headed Rightwards Arrow", "2794", cat),
        sym("➜", "Heavy Round-Tipped Rightwards Arrow", "279C", cat),
        sym("➝", "Drafting Point Rightwards Arrow", "279D", cat),
        sym("➞", "Heavy Triangle-Headed Rightwards Arrow", "279E", cat),
        sym("➡", "Black Rightwards Arrow", "27A1", cat),
        sym("⬅", "Leftwards Black Arrow", "2B05", cat),
        sym("⬆", "Upwards Black Arrow", "2B06", cat),
        sym("⬇", "Downwards Black Arrow", "2B07", cat),
        sym("↻", "Clockwise Open Circle Arrow", "21BB", cat),
        sym("↺", "Anticlockwise Open Circle Arrow", "21BA", cat),
        sym("↵", "Downwards Arrow with Corner Left", "21B5", cat),
        sym("↳", "Downwards Arrow with Tip Right", "21B3", cat),
        sym("↰", "Upwards Arrow with Tip Left", "21B0", cat),
        sym("↱", "Upwards Arrow with Tip Right", "21B1", cat),
        sym("⇠", "Leftwards Dashed Arrow", "21E0", cat),
        sym("⇢", "Rightwards Dashed Arrow", "21E2", cat),
        sym("⇡", "Upwards Dashed Arrow", "21E1", cat),
        sym("⇣", "Downwards Dashed Arrow", "21E3", cat),
        sym("⤴", "Arrow Pointing Rightwards Then Curving Up", "2934", cat),
        sym("⤵", "Arrow Pointing Rightwards Then Curving Down", "2935", cat),
    ];
}

/** Currency symbols. */
function buildCurrency(): SymbolItem[]
{
    const cat = "currency";
    return [
        sym("$", "Dollar Sign", "0024", cat),
        sym("¢", "Cent Sign", "00A2", cat),
        sym("£", "Pound Sign", "00A3", cat),
        sym("¤", "Currency Sign", "00A4", cat),
        sym("¥", "Yen Sign", "00A5", cat),
        sym("€", "Euro Sign", "20AC", cat),
        sym("₠", "Euro-Currency Sign", "20A0", cat),
        sym("₡", "Colon Sign", "20A1", cat),
        sym("₢", "Cruzeiro Sign", "20A2", cat),
        sym("₣", "French Franc Sign", "20A3", cat),
        sym("₤", "Lira Sign", "20A4", cat),
        sym("₥", "Mill Sign", "20A5", cat),
        sym("₦", "Naira Sign", "20A6", cat),
        sym("₧", "Peseta Sign", "20A7", cat),
        sym("₨", "Rupee Sign", "20A8", cat),
        sym("₩", "Won Sign", "20A9", cat),
        sym("₪", "New Sheqel Sign", "20AA", cat),
        sym("₫", "Dong Sign", "20AB", cat),
        sym("₭", "Kip Sign", "20AD", cat),
        sym("₮", "Tugrik Sign", "20AE", cat),
        sym("₯", "Drachma Sign", "20AF", cat),
        sym("₰", "German Penny Sign", "20B0", cat),
        sym("₱", "Peso Sign", "20B1", cat),
        sym("₲", "Guarani Sign", "20B2", cat),
        sym("₳", "Austral Sign", "20B3", cat),
        sym("₴", "Hryvnia Sign", "20B4", cat),
        sym("₵", "Cedi Sign", "20B5", cat),
        sym("₸", "Tenge Sign", "20B8", cat),
        sym("₹", "Indian Rupee Sign", "20B9", cat),
        sym("₺", "Turkish Lira Sign", "20BA", cat),
        sym("₼", "Manat Sign", "20BC", cat),
        sym("₽", "Ruble Sign", "20BD", cat),
        sym("₾", "Lari Sign", "20BE", cat),
        sym("₿", "Bitcoin Sign", "20BF", cat),
    ];
}

/** Punctuation and typographic symbols. */
function buildPunctuation(): SymbolItem[]
{
    const cat = "punctuation";
    return [
        sym("—", "Em Dash", "2014", cat),
        sym("–", "En Dash", "2013", cat),
        sym("…", "Horizontal Ellipsis", "2026", cat),
        sym("·", "Middle Dot", "00B7", cat),
        sym("•", "Bullet", "2022", cat),
        sym("¶", "Pilcrow Sign", "00B6", cat),
        sym("§", "Section Sign", "00A7", cat),
        sym("†", "Dagger", "2020", cat),
        sym("‡", "Double Dagger", "2021", cat),
        sym("©", "Copyright Sign", "00A9", cat),
        sym("®", "Registered Sign", "00AE", cat),
        sym("™", "Trade Mark Sign", "2122", cat),
        sym("℗", "Sound Recording Copyright", "2117", cat),
        sym("℠", "Service Mark", "2120", cat),
        sym("°", "Degree Sign", "00B0", cat),
        sym("′", "Prime", "2032", cat),
        sym("″", "Double Prime", "2033", cat),
        sym("‹", "Single Left Angle Quotation", "2039", cat),
        sym("›", "Single Right Angle Quotation", "203A", cat),
        sym("«", "Left Double Angle Quotation", "00AB", cat),
        sym("»", "Right Double Angle Quotation", "00BB", cat),
        sym("\u2018", "Left Single Quotation Mark", "2018", cat),
        sym("\u2019", "Right Single Quotation Mark", "2019", cat),
        sym("\u201C", "Left Double Quotation Mark", "201C", cat),
        sym("\u201D", "Right Double Quotation Mark", "201D", cat),
        sym("‚", "Single Low-9 Quotation Mark", "201A", cat),
        sym("„", "Double Low-9 Quotation Mark", "201E", cat),
        sym("¡", "Inverted Exclamation Mark", "00A1", cat),
        sym("¿", "Inverted Question Mark", "00BF", cat),
        sym("¦", "Broken Bar", "00A6", cat),
        sym("‖", "Double Vertical Line", "2016", cat),
        sym("⁂", "Asterism", "2042", cat),
        sym("※", "Reference Mark", "203B", cat),
        sym("✓", "Check Mark", "2713", cat),
        sym("✗", "Ballot X", "2717", cat),
        sym("✕", "Multiplication X", "2715", cat),
        sym("✔", "Heavy Check Mark", "2714", cat),
        sym("✘", "Heavy Ballot X", "2718", cat),
        sym("☐", "Ballot Box", "2610", cat),
        sym("☑", "Ballot Box with Check", "2611", cat),
        sym("☒", "Ballot Box with X", "2612", cat),
        sym("♩", "Quarter Note", "2669", cat),
        sym("♪", "Eighth Note", "266A", cat),
        sym("♫", "Beamed Eighth Notes", "266B", cat),
        sym("♬", "Beamed Sixteenth Notes", "266C", cat),
        sym("♭", "Music Flat Sign", "266D", cat),
        sym("♮", "Music Natural Sign", "266E", cat),
        sym("♯", "Music Sharp Sign", "266F", cat),
        sym("✦", "Black Four Pointed Star", "2726", cat),
        sym("✧", "White Four Pointed Star", "2727", cat),
        sym("✶", "Six Pointed Black Star", "2736", cat),
        sym("✴", "Eight Pointed Black Star", "2734", cat),
        sym("✵", "Eight Pointed Pinwheel Star", "2735", cat),
    ];
}

/** Box drawing and geometric shapes. */
function buildBoxDrawing(): SymbolItem[]
{
    const cat = "box";
    return [
        sym("─", "Box Drawings Light Horizontal", "2500", cat),
        sym("│", "Box Drawings Light Vertical", "2502", cat),
        sym("┌", "Box Drawings Light Down and Right", "250C", cat),
        sym("┐", "Box Drawings Light Down and Left", "2510", cat),
        sym("└", "Box Drawings Light Up and Right", "2514", cat),
        sym("┘", "Box Drawings Light Up and Left", "2518", cat),
        sym("├", "Box Drawings Light Vertical and Right", "251C", cat),
        sym("┤", "Box Drawings Light Vertical and Left", "2524", cat),
        sym("┬", "Box Drawings Light Down and Horizontal", "252C", cat),
        sym("┴", "Box Drawings Light Up and Horizontal", "2534", cat),
        sym("┼", "Box Drawings Light Vertical and Horizontal", "253C", cat),
        sym("═", "Box Drawings Double Horizontal", "2550", cat),
        sym("║", "Box Drawings Double Vertical", "2551", cat),
        sym("╔", "Box Drawings Double Down and Right", "2554", cat),
        sym("╗", "Box Drawings Double Down and Left", "2557", cat),
        sym("╚", "Box Drawings Double Up and Right", "255A", cat),
        sym("╝", "Box Drawings Double Up and Left", "255D", cat),
        sym("╠", "Box Drawings Double Vertical and Right", "2560", cat),
        sym("╣", "Box Drawings Double Vertical and Left", "2563", cat),
        sym("╦", "Box Drawings Double Down and Horizontal", "2566", cat),
        sym("╩", "Box Drawings Double Up and Horizontal", "2569", cat),
        sym("╬", "Box Drawings Double Vertical and Horizontal", "256C", cat),
        sym("▀", "Upper Half Block", "2580", cat),
        sym("▄", "Lower Half Block", "2584", cat),
        sym("█", "Full Block", "2588", cat),
        sym("▌", "Left Half Block", "258C", cat),
        sym("▐", "Right Half Block", "2590", cat),
        sym("░", "Light Shade", "2591", cat),
        sym("▒", "Medium Shade", "2592", cat),
        sym("▓", "Dark Shade", "2593", cat),
        sym("■", "Black Square", "25A0", cat),
        sym("□", "White Square", "25A1", cat),
        sym("▪", "Black Small Square", "25AA", cat),
        sym("▫", "White Small Square", "25AB", cat),
        sym("▲", "Black Up-Pointing Triangle", "25B2", cat),
        sym("△", "White Up-Pointing Triangle", "25B3", cat),
        sym("▶", "Black Right-Pointing Triangle", "25B6", cat),
        sym("▷", "White Right-Pointing Triangle", "25B7", cat),
        sym("▼", "Black Down-Pointing Triangle", "25BC", cat),
        sym("▽", "White Down-Pointing Triangle", "25BD", cat),
        sym("◀", "Black Left-Pointing Triangle", "25C0", cat),
        sym("◁", "White Left-Pointing Triangle", "25C1", cat),
        sym("◆", "Black Diamond", "25C6", cat),
        sym("◇", "White Diamond", "25C7", cat),
        sym("○", "White Circle", "25CB", cat),
        sym("●", "Black Circle", "25CF", cat),
        sym("◎", "Bullseye", "25CE", cat),
        sym("◉", "Fisheye", "25C9", cat),
        sym("★", "Black Star", "2605", cat),
        sym("☆", "White Star", "2606", cat),
        sym("♠", "Black Spade Suit", "2660", cat),
        sym("♣", "Black Club Suit", "2663", cat),
        sym("♥", "Black Heart Suit", "2665", cat),
        sym("♦", "Black Diamond Suit", "2666", cat),
        sym("♤", "White Spade Suit", "2664", cat),
        sym("♧", "White Club Suit", "2667", cat),
        sym("♡", "White Heart Suit", "2661", cat),
        sym("♢", "White Diamond Suit", "2662", cat),
    ];
}

/** Emoji and dingbat symbols. */
function buildEmojiDingbats(): SymbolItem[]
{
    const cat = "emoji";
    return [
        sym("☺", "White Smiling Face", "263A", cat),
        sym("☻", "Black Smiling Face", "263B", cat),
        sym("☹", "White Frowning Face", "2639", cat),
        sym("❤", "Heavy Black Heart", "2764", cat),
        sym("♡", "White Heart Suit", "2661", cat),
        sym("☀", "Black Sun with Rays", "2600", cat),
        sym("☁", "Cloud", "2601", cat),
        sym("☂", "Umbrella", "2602", cat),
        sym("☃", "Snowman", "2603", cat),
        sym("⚡", "High Voltage Sign", "26A1", cat),
        sym("✨", "Sparkles", "2728", cat),
        sym("⭐", "White Medium Star", "2B50", cat),
        sym("☾", "Last Quarter Moon", "263E", cat),
        sym("☽", "First Quarter Moon", "263D", cat),
        sym("☄", "Comet", "2604", cat),
        sym("⚙", "Gear", "2699", cat),
        sym("⚠", "Warning Sign", "26A0", cat),
        sym("☠", "Skull and Crossbones", "2620", cat),
        sym("⚑", "Black Flag", "2691", cat),
        sym("⚐", "White Flag", "2690", cat),
        sym("♻", "Black Universal Recycling Symbol", "267B", cat),
        sym("♿", "Wheelchair Symbol", "267F", cat),
        sym("☮", "Peace Symbol", "262E", cat),
        sym("☯", "Yin Yang", "262F", cat),
        sym("✝", "Latin Cross", "271D", cat),
        sym("☪", "Star and Crescent", "262A", cat),
        sym("✡", "Star of David", "2721", cat),
        sym("☸", "Wheel of Dharma", "2638", cat),
        sym("⚛", "Atom Symbol", "269B", cat),
        sym("⚕", "Staff of Aesculapius", "2695", cat),
        sym("⌚", "Watch", "231A", cat),
        sym("⌛", "Hourglass", "231B", cat),
        sym("☎", "Black Telephone", "260E", cat),
        sym("✉", "Envelope", "2709", cat),
        sym("✏", "Pencil", "270F", cat),
        sym("✒", "Black Nib", "2712", cat),
        sym("✂", "Black Scissors", "2702", cat),
        sym("⚓", "Anchor", "2693", cat),
        sym("⚔", "Crossed Swords", "2694", cat),
        sym("⚖", "Scales", "2696", cat),
        sym("⚗", "Alembic", "2697", cat),
        sym("⚘", "Flower", "2698", cat),
        sym("⛏", "Pick", "26CF", cat),
        sym("⛑", "Helmet with White Cross", "26D1", cat),
        sym("⛓", "Chains", "26D3", cat),
        sym("⛔", "No Entry", "26D4", cat),
        sym("⛩", "Shinto Shrine", "26E9", cat),
        sym("⛪", "Church", "26EA", cat),
        sym("♲", "Universal Recycling Symbol", "267A", cat),
        sym("⛵", "Sailboat", "26F5", cat),
        sym("⛺", "Tent", "26FA", cat),
        sym("⛽", "Fuel Pump", "26FD", cat),
        sym("☕", "Hot Beverage", "2615", cat),
        sym("⚾", "Baseball", "26BE", cat),
        sym("⛄", "Snowman Without Snow", "26C4", cat),
        sym("✈", "Airplane", "2708", cat),
        sym("⚜", "Fleur-de-Lis", "269C", cat),
        sym("♾", "Permanent Paper Sign", "267E", cat),
        sym("⛰", "Mountain", "26F0", cat),
        sym("⛱", "Umbrella on Ground", "26F1", cat),
    ];
}

/** Build all default Unicode categories. */
function buildDefaultUnicodeCategories(): SymbolCategory[]
{
    return [
        { id: "latin",       label: "Latin Extended",    icon: "bi-fonts",         items: buildLatinExtended() },
        { id: "greek",       label: "Greek Letters",     icon: "bi-translate",     items: buildGreekLetters() },
        { id: "math",        label: "Math Symbols",      icon: "bi-calculator",    items: buildMathSymbols() },
        { id: "arrows",      label: "Arrows",            icon: "bi-arrow-right",   items: buildArrows() },
        { id: "currency",    label: "Currency",           icon: "bi-currency-dollar", items: buildCurrency() },
        { id: "punctuation", label: "Punctuation",        icon: "bi-type",          items: buildPunctuation() },
        { id: "box",         label: "Box & Geometric",    icon: "bi-grid-3x3",     items: buildBoxDrawing() },
        { id: "emoji",       label: "Emoji & Dingbats",   icon: "bi-emoji-smile",  items: buildEmojiDingbats() },
    ];
}

// ============================================================================
// S5: BOOTSTRAP ICONS DATA
// ============================================================================

/** Build a single icon SymbolItem. */
function ico(cls: string, name: string, category: string): SymbolItem
{
    return { char: cls, name, code: cls, category };
}

/** Build all default Bootstrap Icon categories. */
function buildDefaultIconCategories(): SymbolCategory[]
{
    return [
        {
            id: "ico-common", label: "Common Actions", icon: "bi-hand-index",
            items: [
                ico("bi-house", "House", "ico-common"),
                ico("bi-search", "Search", "ico-common"),
                ico("bi-plus-lg", "Plus", "ico-common"),
                ico("bi-dash-lg", "Minus", "ico-common"),
                ico("bi-x-lg", "Close", "ico-common"),
                ico("bi-check-lg", "Check", "ico-common"),
                ico("bi-pencil", "Pencil", "ico-common"),
                ico("bi-trash", "Trash", "ico-common"),
                ico("bi-gear", "Gear", "ico-common"),
                ico("bi-sliders", "Sliders", "ico-common"),
                ico("bi-funnel", "Funnel", "ico-common"),
                ico("bi-download", "Download", "ico-common"),
                ico("bi-upload", "Upload", "ico-common"),
                ico("bi-share", "Share", "ico-common"),
                ico("bi-link-45deg", "Link", "ico-common"),
                ico("bi-clipboard", "Clipboard", "ico-common"),
                ico("bi-printer", "Printer", "ico-common"),
                ico("bi-save", "Save", "ico-common"),
                ico("bi-three-dots", "More Horizontal", "ico-common"),
                ico("bi-three-dots-vertical", "More Vertical", "ico-common"),
                ico("bi-eye", "Eye", "ico-common"),
                ico("bi-eye-slash", "Eye Slash", "ico-common"),
                ico("bi-lock", "Lock", "ico-common"),
                ico("bi-unlock", "Unlock", "ico-common"),
                ico("bi-star", "Star", "ico-common"),
            ],
        },
        {
            id: "ico-arrows", label: "Arrows & Navigation", icon: "bi-arrow-left-right",
            items: [
                ico("bi-arrow-left", "Arrow Left", "ico-arrows"),
                ico("bi-arrow-right", "Arrow Right", "ico-arrows"),
                ico("bi-arrow-up", "Arrow Up", "ico-arrows"),
                ico("bi-arrow-down", "Arrow Down", "ico-arrows"),
                ico("bi-arrow-clockwise", "Arrow Clockwise", "ico-arrows"),
                ico("bi-arrow-counterclockwise", "Arrow Counterclockwise", "ico-arrows"),
                ico("bi-arrow-repeat", "Arrow Repeat", "ico-arrows"),
                ico("bi-box-arrow-right", "Box Arrow Right", "ico-arrows"),
                ico("bi-box-arrow-in-right", "Box Arrow In Right", "ico-arrows"),
                ico("bi-chevron-left", "Chevron Left", "ico-arrows"),
                ico("bi-chevron-right", "Chevron Right", "ico-arrows"),
                ico("bi-chevron-up", "Chevron Up", "ico-arrows"),
                ico("bi-chevron-down", "Chevron Down", "ico-arrows"),
                ico("bi-caret-left-fill", "Caret Left", "ico-arrows"),
                ico("bi-caret-right-fill", "Caret Right", "ico-arrows"),
                ico("bi-caret-up-fill", "Caret Up", "ico-arrows"),
                ico("bi-caret-down-fill", "Caret Down", "ico-arrows"),
                ico("bi-arrows-fullscreen", "Fullscreen", "ico-arrows"),
                ico("bi-arrows-move", "Move", "ico-arrows"),
                ico("bi-arrow-bar-up", "Arrow Bar Up", "ico-arrows"),
            ],
        },
        {
            id: "ico-files", label: "Files & Folders", icon: "bi-folder",
            items: [
                ico("bi-file-earmark", "File", "ico-files"),
                ico("bi-file-earmark-text", "File Text", "ico-files"),
                ico("bi-file-earmark-code", "File Code", "ico-files"),
                ico("bi-file-earmark-pdf", "File PDF", "ico-files"),
                ico("bi-file-earmark-image", "File Image", "ico-files"),
                ico("bi-file-earmark-music", "File Music", "ico-files"),
                ico("bi-file-earmark-zip", "File Zip", "ico-files"),
                ico("bi-file-earmark-spreadsheet", "File Spreadsheet", "ico-files"),
                ico("bi-file-earmark-plus", "File Plus", "ico-files"),
                ico("bi-file-earmark-minus", "File Minus", "ico-files"),
                ico("bi-folder", "Folder", "ico-files"),
                ico("bi-folder-fill", "Folder Fill", "ico-files"),
                ico("bi-folder-plus", "Folder Plus", "ico-files"),
                ico("bi-folder2-open", "Folder Open", "ico-files"),
                ico("bi-files", "Files", "ico-files"),
                ico("bi-journal", "Journal", "ico-files"),
                ico("bi-journal-text", "Journal Text", "ico-files"),
                ico("bi-archive", "Archive", "ico-files"),
                ico("bi-box", "Box", "ico-files"),
                ico("bi-database", "Database", "ico-files"),
            ],
        },
        {
            id: "ico-comm", label: "Communication", icon: "bi-chat",
            items: [
                ico("bi-chat", "Chat", "ico-comm"),
                ico("bi-chat-dots", "Chat Dots", "ico-comm"),
                ico("bi-chat-text", "Chat Text", "ico-comm"),
                ico("bi-envelope", "Envelope", "ico-comm"),
                ico("bi-envelope-open", "Envelope Open", "ico-comm"),
                ico("bi-telephone", "Telephone", "ico-comm"),
                ico("bi-megaphone", "Megaphone", "ico-comm"),
                ico("bi-bell", "Bell", "ico-comm"),
                ico("bi-bell-slash", "Bell Slash", "ico-comm"),
                ico("bi-send", "Send", "ico-comm"),
                ico("bi-reply", "Reply", "ico-comm"),
                ico("bi-at", "At", "ico-comm"),
                ico("bi-inbox", "Inbox", "ico-comm"),
                ico("bi-rss", "RSS", "ico-comm"),
                ico("bi-broadcast", "Broadcast", "ico-comm"),
            ],
        },
        {
            id: "ico-media", label: "Media", icon: "bi-play-circle",
            items: [
                ico("bi-play-fill", "Play", "ico-media"),
                ico("bi-pause-fill", "Pause", "ico-media"),
                ico("bi-stop-fill", "Stop", "ico-media"),
                ico("bi-skip-forward-fill", "Skip Forward", "ico-media"),
                ico("bi-skip-backward-fill", "Skip Backward", "ico-media"),
                ico("bi-volume-up", "Volume Up", "ico-media"),
                ico("bi-volume-mute", "Volume Mute", "ico-media"),
                ico("bi-camera", "Camera", "ico-media"),
                ico("bi-camera-video", "Camera Video", "ico-media"),
                ico("bi-image", "Image", "ico-media"),
                ico("bi-film", "Film", "ico-media"),
                ico("bi-music-note", "Music Note", "ico-media"),
                ico("bi-mic", "Microphone", "ico-media"),
                ico("bi-headphones", "Headphones", "ico-media"),
                ico("bi-easel", "Easel", "ico-media"),
            ],
        },
        {
            id: "ico-people", label: "People & Social", icon: "bi-people",
            items: [
                ico("bi-person", "Person", "ico-people"),
                ico("bi-person-fill", "Person Fill", "ico-people"),
                ico("bi-person-plus", "Person Plus", "ico-people"),
                ico("bi-person-dash", "Person Dash", "ico-people"),
                ico("bi-people", "People", "ico-people"),
                ico("bi-person-circle", "Person Circle", "ico-people"),
                ico("bi-person-badge", "Person Badge", "ico-people"),
                ico("bi-person-workspace", "Person Workspace", "ico-people"),
                ico("bi-hand-thumbs-up", "Thumbs Up", "ico-people"),
                ico("bi-hand-thumbs-down", "Thumbs Down", "ico-people"),
                ico("bi-emoji-smile", "Smile", "ico-people"),
                ico("bi-emoji-frown", "Frown", "ico-people"),
                ico("bi-emoji-heart-eyes", "Heart Eyes", "ico-people"),
                ico("bi-heart", "Heart", "ico-people"),
                ico("bi-globe", "Globe", "ico-people"),
            ],
        },
        {
            id: "ico-charts", label: "Charts & Data", icon: "bi-bar-chart",
            items: [
                ico("bi-bar-chart", "Bar Chart", "ico-charts"),
                ico("bi-bar-chart-line", "Bar Chart Line", "ico-charts"),
                ico("bi-graph-up", "Graph Up", "ico-charts"),
                ico("bi-graph-down", "Graph Down", "ico-charts"),
                ico("bi-pie-chart", "Pie Chart", "ico-charts"),
                ico("bi-speedometer", "Speedometer", "ico-charts"),
                ico("bi-kanban", "Kanban", "ico-charts"),
                ico("bi-calendar", "Calendar", "ico-charts"),
                ico("bi-calendar-event", "Calendar Event", "ico-charts"),
                ico("bi-table", "Table", "ico-charts"),
                ico("bi-list-task", "List Task", "ico-charts"),
                ico("bi-clipboard-data", "Clipboard Data", "ico-charts"),
                ico("bi-activity", "Activity", "ico-charts"),
                ico("bi-diagram-3", "Diagram", "ico-charts"),
                ico("bi-grid", "Grid", "ico-charts"),
            ],
        },
        {
            id: "ico-alerts", label: "Alerts & Status", icon: "bi-exclamation-triangle",
            items: [
                ico("bi-check-circle", "Check Circle", "ico-alerts"),
                ico("bi-x-circle", "X Circle", "ico-alerts"),
                ico("bi-exclamation-circle", "Exclamation Circle", "ico-alerts"),
                ico("bi-exclamation-triangle", "Exclamation Triangle", "ico-alerts"),
                ico("bi-info-circle", "Info Circle", "ico-alerts"),
                ico("bi-question-circle", "Question Circle", "ico-alerts"),
                ico("bi-shield-check", "Shield Check", "ico-alerts"),
                ico("bi-shield-exclamation", "Shield Exclamation", "ico-alerts"),
                ico("bi-bug", "Bug", "ico-alerts"),
                ico("bi-lightning", "Lightning", "ico-alerts"),
                ico("bi-clock", "Clock", "ico-alerts"),
                ico("bi-hourglass-split", "Hourglass", "ico-alerts"),
                ico("bi-circle-fill", "Circle Fill", "ico-alerts"),
                ico("bi-dash-circle", "Dash Circle", "ico-alerts"),
                ico("bi-patch-check", "Patch Check", "ico-alerts"),
            ],
        },
        {
            id: "ico-tech", label: "Technology", icon: "bi-cpu",
            items: [
                ico("bi-cpu", "CPU", "ico-tech"),
                ico("bi-gpu-card", "GPU", "ico-tech"),
                ico("bi-hdd", "HDD", "ico-tech"),
                ico("bi-usb-drive", "USB Drive", "ico-tech"),
                ico("bi-wifi", "WiFi", "ico-tech"),
                ico("bi-bluetooth", "Bluetooth", "ico-tech"),
                ico("bi-router", "Router", "ico-tech"),
                ico("bi-cloud", "Cloud", "ico-tech"),
                ico("bi-cloud-upload", "Cloud Upload", "ico-tech"),
                ico("bi-cloud-download", "Cloud Download", "ico-tech"),
                ico("bi-terminal", "Terminal", "ico-tech"),
                ico("bi-code-slash", "Code", "ico-tech"),
                ico("bi-braces", "Braces", "ico-tech"),
                ico("bi-laptop", "Laptop", "ico-tech"),
                ico("bi-phone", "Phone", "ico-tech"),
                ico("bi-display", "Display", "ico-tech"),
                ico("bi-server", "Server", "ico-tech"),
                ico("bi-qr-code", "QR Code", "ico-tech"),
                ico("bi-robot", "Robot", "ico-tech"),
                ico("bi-key", "Key", "ico-tech"),
            ],
        },
        {
            id: "ico-misc", label: "Miscellaneous", icon: "bi-grid-3x3-gap",
            items: [
                ico("bi-bookmark", "Bookmark", "ico-misc"),
                ico("bi-tag", "Tag", "ico-misc"),
                ico("bi-flag", "Flag", "ico-misc"),
                ico("bi-pin", "Pin", "ico-misc"),
                ico("bi-paperclip", "Paperclip", "ico-misc"),
                ico("bi-scissors", "Scissors", "ico-misc"),
                ico("bi-map", "Map", "ico-misc"),
                ico("bi-compass", "Compass", "ico-misc"),
                ico("bi-signpost", "Signpost", "ico-misc"),
                ico("bi-building", "Building", "ico-misc"),
                ico("bi-shop", "Shop", "ico-misc"),
                ico("bi-cart", "Cart", "ico-misc"),
                ico("bi-gift", "Gift", "ico-misc"),
                ico("bi-trophy", "Trophy", "ico-misc"),
                ico("bi-puzzle", "Puzzle", "ico-misc"),
                ico("bi-palette", "Palette", "ico-misc"),
                ico("bi-brush", "Brush", "ico-misc"),
                ico("bi-tools", "Tools", "ico-misc"),
                ico("bi-wrench", "Wrench", "ico-misc"),
                ico("bi-magic", "Magic", "ico-misc"),
            ],
        },
    ];
}

// ============================================================================
// S5b: ICON AUTO-DISCOVERY
// ============================================================================

/** Heuristic category map for auto-classifying discovered icons. */
interface IconCategoryRule
{
    id: string;
    label: string;
    icon: string;
    pattern: RegExp;
}

const ICON_CATEGORY_MAP: IconCategoryRule[] =
[
    { id: "ico-arrows",   label: "Arrows & Nav",     icon: "bi-arrow-right",          pattern: /arrow|chevron|caret|sort|skip|forward|backward|expand|collapse/ },
    { id: "ico-files",    label: "Files & Folders",   icon: "bi-file-earmark",         pattern: /file|folder|journal|archive|document|copy|paste/ },
    { id: "ico-comm",     label: "Communication",     icon: "bi-chat-dots",            pattern: /chat|envelope|phone|bell|inbox|comment|message|mail|send|reply|broadcast/ },
    { id: "ico-media",    label: "Media",             icon: "bi-play-circle",          pattern: /play|pause|stop|camera|music|volume|headphone|mic|film|video|image/ },
    { id: "ico-people",   label: "People & Social",   icon: "bi-people",               pattern: /person|people|user|emoji|heart|hand|group|team/ },
    { id: "ico-charts",   label: "Charts & Data",     icon: "bi-bar-chart",            pattern: /chart|graph|pie|calendar|table|clipboard|list|grid|kanban|diagram/ },
    { id: "ico-alerts",   label: "Alerts & Status",   icon: "bi-exclamation-triangle", pattern: /check|exclamation|info|shield|bug|warning|alert|question|patch/ },
    { id: "ico-tech",     label: "Technology",         icon: "bi-cpu",                  pattern: /cpu|gpu|hdd|wifi|cloud|terminal|code|laptop|display|server|database|usb|bluetooth|router|robot/ },
    { id: "ico-commerce", label: "Commerce",           icon: "bi-cart",                 pattern: /cart|bag|shop|store|credit|receipt|currency|money|coin|gift|tag/ },
    { id: "ico-places",   label: "Places",             icon: "bi-geo-alt",              pattern: /map|geo|globe|compass|pin|signpost|house|building/ },
    { id: "ico-general",  label: "General",            icon: "bi-grid-3x3-gap",         pattern: /.*/ },
];

/** Scan all loaded stylesheets for Bootstrap Icon and Font Awesome class names. */
function discoverIcons(): { bi: string[]; fa: string[] }
{
    const bi: string[] = [];
    const fa: string[] = [];

    for (let i = 0; i < document.styleSheets.length; i++)
    {
        extractIconsFromSheet(document.styleSheets[i], bi, fa);
    }

    return { bi, fa };
}

/** Extract icon class names from a single stylesheet's CSS rules. */
function extractIconsFromSheet(
    sheet: CSSStyleSheet, bi: string[], fa: string[]
): void
{
    let rules: CSSRuleList;

    try
    {
        rules = sheet.cssRules;
    }
    catch
    {
        // Cross-origin stylesheet — skip silently
        return;
    }

    for (let i = 0; i < rules.length; i++)
    {
        const rule = rules[i];

        if (rule instanceof CSSStyleRule)
        {
            extractIconFromSelector(rule.selectorText, bi, fa);
        }
    }
}

/** Parse a CSS selector for Bootstrap Icon or Font Awesome icon class names. */
function extractIconFromSelector(
    selector: string, bi: string[], fa: string[]
): void
{
    // Match `.bi-some-name::before` pattern
    const biMatch = selector.match(/\.(bi-[\w-]+)::before/);

    if (biMatch)
    {
        const cls = biMatch[1];

        if (cls !== "bi-" && !bi.includes(cls))
        {
            bi.push(cls);
        }

        return;
    }

    // Match `.fa-some-name::before` pattern
    const faMatch = selector.match(/\.(fa-[\w-]+)::before/);

    if (faMatch)
    {
        const cls = faMatch[1];
        const isStyleCls = FA_STYLE_CLASSES.includes(cls);

        if (!isStyleCls && cls !== "fa-" && !fa.includes(cls))
        {
            fa.push(cls);
        }
    }
}

/** Convert an icon class name to a human-readable label. */
function humanizeName(iconClass: string): string
{
    const raw = iconClass.replace(/^(bi-|fa-)/, "");

    return raw
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
}

/** Determine which category id an icon belongs to based on heuristics. */
function categorizeIcon(iconName: string): string
{
    const lower = iconName.toLowerCase();

    for (const rule of ICON_CATEGORY_MAP)
    {
        if (rule.pattern.test(lower))
        {
            return rule.id;
        }
    }

    return "ico-general";
}

/** Build SymbolCategory[] from a flat list of icon class names. */
function buildDiscoveredCategories(
    classNames: string[], prefix: string
): SymbolCategory[]
{
    const buckets: Record<string, SymbolItem[]> = {};

    for (const cls of classNames)
    {
        const name = humanizeName(cls);
        const catId = categorizeIcon(cls);

        if (!buckets[catId])
        {
            buckets[catId] = [];
        }

        buckets[catId].push({ char: cls, name, code: cls, category: catId });
    }

    return ICON_CATEGORY_MAP
        .filter((rule) => buckets[rule.id] && buckets[rule.id].length > 0)
        .map((rule) => ({
            id: rule.id,
            label: `${rule.label} (${prefix})`,
            icon: rule.icon,
            items: buckets[rule.id],
        }));
}

/** Discover icons from stylesheets, categorize, and cache the result. */
function discoverAndCacheIcons(): SymbolCategory[]
{
    if (discoveredIconCache)
    {
        return discoveredIconCache;
    }

    const { bi, fa } = discoverIcons();
    const categories: SymbolCategory[] = [];

    if (bi.length > 0)
    {
        const biCats = buildDiscoveredCategories(bi, "BI");
        categories.push(...biCats);
        console.log(LOG_PREFIX, "discovered", bi.length, "Bootstrap Icons");
    }

    if (fa.length > 0)
    {
        const faCats = buildDiscoveredCategories(fa, "FA");
        categories.push(...faCats);
        console.log(LOG_PREFIX, "discovered", fa.length, "Font Awesome icons");
    }

    if (categories.length > 0)
    {
        discoveredIconCache = categories;
    }

    return categories;
}

/** Probe the DOM to detect which Font Awesome style class is available. */
function detectAvailableFaStyle(): string
{
    const testEl = document.createElement("i");
    testEl.style.position = "absolute";
    testEl.style.left = "-9999px";
    testEl.classList.add("fa-circle");
    document.body.appendChild(testEl);

    for (const style of FA_STYLE_CLASSES)
    {
        testEl.className = `${style} fa-circle`;
        const computed = window.getComputedStyle(testEl);

        if (computed.fontFamily && computed.fontFamily.toLowerCase().includes("awesome"))
        {
            testEl.remove();
            return style;
        }
    }

    testEl.remove();
    return "fa-solid";
}

/** Cached wrapper for detectAvailableFaStyle(). */
function getFaStyle(): string
{
    if (!cachedFaStyle)
    {
        cachedFaStyle = detectAvailableFaStyle();
    }

    return cachedFaStyle;
}

/** Create an <i> element for an icon item (BI or FA). */
function createIconElement(item: SymbolItem): HTMLElement
{
    if (item.char.startsWith(ICON_PREFIX_FA))
    {
        return createElement("i", [getFaStyle(), item.char]);
    }

    return createElement("i", ["bi", item.char]);
}

// ============================================================================
// S6: CLASS SymbolPicker
// ============================================================================

export class SymbolPicker
{
    private readonly instanceId: string;
    private opts: SymbolPickerOptions;
    private activeMode: "unicode" | "icons";
    private unicodeCategories: SymbolCategory[];
    private iconCategories: SymbolCategory[];
    private activeCategoryId: string = "";
    private filterQuery: string = "";
    private filteredItems: SymbolItem[] = [];
    private selectedSymbol: SymbolItem | null = null;
    private highlightedIndex: number = -1;
    private recentItems: SymbolItem[] = [];
    private popupOpen: boolean = false;
    private isDisabled: boolean = false;
    private destroyed: boolean = false;

    // DOM references
    private rootEl: HTMLElement | null = null;
    private triggerEl: HTMLElement | null = null;
    private panelEl: HTMLElement | null = null;
    private searchInput: HTMLInputElement | null = null;
    private categoryBar: HTMLElement | null = null;
    private categorySelect: HTMLSelectElement | null = null;
    private gridWrap: HTMLElement | null = null;
    private gridEl: HTMLElement | null = null;
    private previewEl: HTMLElement | null = null;
    private previewChar: HTMLElement | null = null;
    private previewName: HTMLElement | null = null;
    private previewCode: HTMLElement | null = null;
    private insertBtn: HTMLElement | null = null;

    // Bound handlers for cleanup
    private boundOutsideClick: ((e: MouseEvent) => void) | null = null;
    private boundEscapeKey: ((e: KeyboardEvent) => void) | null = null;

    constructor(options?: SymbolPickerOptions)
    {
        instanceCounter++;
        this.instanceId = `${CLS}-${instanceCounter}`;
        this.opts = options ?? {};
        this.isDisabled = this.opts.disabled ?? false;
        this.activeMode = this.resolveInitialMode();
        this.unicodeCategories = this.resolveUnicodeCategories();
        this.iconCategories = this.resolveIconCategories();
        this.loadRecent();
        this.rootEl = this.buildRoot();
        this.initActiveCategory();
        this.renderGrid();
        console.log(LOG_PREFIX, "Created instance", this.instanceId);
    }

    // ── Mode Resolution ──

    /** Determine which mode to start in. */
    private resolveInitialMode(): "unicode" | "icons"
    {
        const mode = this.opts.mode ?? "both";
        if (mode === "icons") { return "icons"; }
        return "unicode";
    }

    /** Build Unicode categories from options or defaults. */
    private resolveUnicodeCategories(): SymbolCategory[]
    {
        if (this.opts.categories && this.opts.mode !== "icons")
        {
            return this.opts.categories.filter(c => !c.id.startsWith("ico-"));
        }
        return buildDefaultUnicodeCategories();
    }

    /** Build icon categories from options or defaults, with auto-discovery. */
    private resolveIconCategories(): SymbolCategory[]
    {
        if (this.opts.categories && this.opts.mode !== "unicode")
        {
            return this.opts.categories.filter(c => c.id.startsWith("ico-"));
        }

        const discovered = discoverAndCacheIcons();

        if (discovered.length > 0)
        {
            return discovered;
        }

        return buildDefaultIconCategories();
    }

    /** Set the initial active category based on mode. */
    private initActiveCategory(): void
    {
        this.activeCategoryId = "__all__";
    }

    /** Return categories for the current mode. */
    private getActiveCategories(): SymbolCategory[]
    {
        if (this.activeMode === "icons") { return this.iconCategories; }
        return this.unicodeCategories;
    }

    // ── Public API ──

    /** Mount the picker into a container element. */
    public show(containerId?: string): void
    {
        if (!this.rootEl) { return; }
        const container = containerId
            ? document.getElementById(containerId)
            : document.body;
        if (!container)
        {
            console.warn(LOG_PREFIX, "Container not found:", containerId);
            return;
        }
        container.appendChild(this.rootEl);
    }

    /** Remove from DOM, keep state. */
    public hide(): void
    {
        if (this.rootEl?.parentNode)
        {
            this.rootEl.parentNode.removeChild(this.rootEl);
        }
    }

    /** Destroy the component and clean up. */
    public destroy(): void
    {
        if (this.destroyed) { return; }
        this.destroyed = true;
        this.closePopup();
        this.hide();
        this.rootEl = null;
        console.log(LOG_PREFIX, "Destroyed", this.instanceId);
    }

    /** Get the currently selected symbol, or null. */
    public getSelectedSymbol(): SymbolItem | null
    {
        return this.selectedSymbol;
    }

    /** Get the selected symbol's code/char value. */
    public getValue(): string
    {
        return this.selectedSymbol?.code ?? "";
    }

    /** Return root DOM element. */
    public getElement(): HTMLElement | null
    {
        return this.rootEl;
    }

    /** Whether the popup is currently open. */
    public isOpen(): boolean
    {
        return this.popupOpen;
    }

    /** Enable the component. */
    public enable(): void
    {
        this.isDisabled = false;
        this.rootEl?.classList.remove(`${CLS}-disabled`);
    }

    /** Disable the component. Closes popup if open. */
    public disable(): void
    {
        this.isDisabled = true;
        this.closePopup();
        this.rootEl?.classList.add(`${CLS}-disabled`);
    }

    /** Programmatically set the active mode. */
    public setMode(mode: "unicode" | "icons"): void
    {
        this.switchMode(mode);
    }

    /** Open the popup panel. */
    public open(): void
    {
        this.openPopup();
    }

    /** Close the popup panel. */
    public close(): void
    {
        this.closePopup();
    }

    // ── Key Binding Helpers ──

    /** Resolve key combo for named action. */
    private resolveKeyCombo(action: string): string
    {
        return this.opts.keyBindings?.[action]
            ?? DEFAULT_KEY_BINDINGS[action] ?? "";
    }

    /** Check if keyboard event matches a named action combo. */
    private matchesKeyCombo(e: KeyboardEvent, action: string): boolean
    {
        const combo = this.resolveKeyCombo(action);
        if (!combo) { return false; }
        const parts = combo.split("+");
        const key = parts[parts.length - 1];
        const needCtrl = parts.includes("Ctrl");
        const needShift = parts.includes("Shift");
        const needAlt = parts.includes("Alt");
        return (e.key === key)
            && (e.ctrlKey === needCtrl)
            && (e.shiftKey === needShift)
            && (e.altKey === needAlt);
    }

    // ── DOM Building: Root & Trigger ──

    /** Build the root wrapper element. */
    private buildRoot(): HTMLElement
    {
        const root = createElement("div", [CLS]);
        setAttr(root, { id: this.instanceId });
        if (this.isDisabled) { root.classList.add(`${CLS}-disabled`); }
        const sizeClass = this.resolveSizeClass();
        if (sizeClass) { root.classList.add(sizeClass); }
        if (!this.opts.inline) { this.buildTrigger(root); }
        this.panelEl = this.buildPanel();
        root.appendChild(this.panelEl);
        if (this.opts.inline) { this.panelEl.style.display = "block"; }
        return root;
    }

    /** Resolve size CSS class. */
    private resolveSizeClass(): string
    {
        const size = this.opts.size ?? "default";
        if (size === "mini") { return `${CLS}-mini`; }
        if (size === "sm") { return `${CLS}-sm`; }
        if (size === "lg") { return `${CLS}-lg`; }
        return "";
    }

    /** Build the popup trigger button. */
    private buildTrigger(root: HTMLElement): void
    {
        const btn = createElement("button", [`${CLS}-trigger`]);
        setAttr(btn, {
            type: "button",
            "aria-haspopup": "true",
            "aria-expanded": "false",
            "aria-label": "Insert symbol",
        });
        const iconEl = createElement("i", ["bi", "bi-grid-3x3"]);
        btn.appendChild(iconEl);
        const label = createElement("span", [`${CLS}-trigger-label`], "Symbol");
        btn.appendChild(label);
        btn.addEventListener("click", () => this.togglePopup());
        this.triggerEl = btn;
        root.appendChild(btn);
    }

    // ── DOM Building: Panel Structure ──

    /** Build the full panel containing header, body, preview, footer. */
    private buildPanel(): HTMLElement
    {
        const panel = createElement("div", [`${CLS}-panel`]);
        if (!this.opts.inline) { panel.style.display = "none"; }
        panel.appendChild(this.buildHeader());
        panel.appendChild(this.buildBody());
        if (this.opts.showPreview !== false)
        {
            panel.appendChild(this.buildPreview());
        }
        panel.appendChild(this.buildFooter());
        return panel;
    }

    /** Build header with mode tabs and search input. */
    private buildHeader(): HTMLElement
    {
        const header = createElement("div", [`${CLS}-header`]);
        const mode = this.opts.mode ?? "both";
        if (mode === "both") { header.appendChild(this.buildModeTabs()); }
        if (this.opts.showSearch !== false)
        {
            header.appendChild(this.buildSearchInput());
        }
        return header;
    }

    /** Build the Unicode / Icons mode toggle tabs. */
    private buildModeTabs(): HTMLElement
    {
        const wrap = createElement("div", [`${CLS}-mode-tabs`]);
        setAttr(wrap, { role: "tablist", "aria-label": "Symbol mode" });
        const uniTab = this.buildModeTab("unicode", "Unicode");
        const icoTab = this.buildModeTab("icons", "Icons");
        wrap.appendChild(uniTab);
        wrap.appendChild(icoTab);
        return wrap;
    }

    /** Build a single mode tab button. */
    private buildModeTab(mode: "unicode" | "icons", label: string): HTMLElement
    {
        const btn = createElement("button", [`${CLS}-mode-tab`], label);
        setAttr(btn, {
            type: "button",
            role: "tab",
            "aria-selected": mode === this.activeMode ? "true" : "false",
        });
        if (mode === this.activeMode) { btn.classList.add("active"); }
        btn.addEventListener("click", () => this.switchMode(mode));
        return btn;
    }

    /** Build the search input field. */
    private buildSearchInput(): HTMLElement
    {
        const wrap = createElement("div", [`${CLS}-search-wrap`]);
        const input = document.createElement("input") as HTMLInputElement;
        input.type = "text";
        input.classList.add(`${CLS}-search`);
        input.placeholder = "Search symbols...";
        setAttr(input, {
            "aria-label": "Search symbols",
            autocomplete: "off",
        });
        input.addEventListener("input", () => this.applyFilter(input.value));
        this.searchInput = input;
        const icon = createElement("i", ["bi", "bi-search", `${CLS}-search-icon`]);
        wrap.appendChild(icon);
        wrap.appendChild(input);
        return wrap;
    }

    // ── DOM Building: Body ──

    /** Build the body with category bar and grid area. */
    private buildBody(): HTMLElement
    {
        const body = createElement("div", [`${CLS}-body`]);
        const catWrap = this.buildCategoryBarWrap();
        body.appendChild(catWrap);
        this.gridWrap = this.buildGridArea();
        body.appendChild(this.gridWrap);
        return body;
    }

    /** Build category dropdown selector (replaces scrollable tab bar). */
    private buildCategoryBarWrap(): HTMLElement
    {
        const wrap = createElement("div", [`${CLS}-categories-wrap`]);

        this.categorySelect = document.createElement("select");
        this.categorySelect.className = `${CLS}-category-select`;
        this.categorySelect.setAttribute("aria-label", "Symbol category");

        this.populateCategoryOptions();

        this.categorySelect.addEventListener("change", () =>
        {
            this.switchCategory(this.categorySelect!.value);
        });

        wrap.appendChild(this.categorySelect);

        // Keep legacy categoryBar reference for refreshCategoryTabStates
        this.categoryBar = wrap;

        return wrap;
    }

    /** Populate the category dropdown with options. */
    private populateCategoryOptions(): void
    {
        if (!this.categorySelect) { return; }

        this.categorySelect.innerHTML = "";
        this.addAllCategoryOption();

        const cats = this.getActiveCategories();

        for (const cat of cats)
        {
            this.addCategoryOption(cat);
        }
    }

    /** Add the "All" option to the category dropdown. */
    private addAllCategoryOption(): void
    {
        const opt = document.createElement("option");

        opt.value = "__all__";
        opt.textContent = "All";
        this.categorySelect!.appendChild(opt);
    }

    /** Add a single category option to the dropdown. */
    private addCategoryOption(cat: SymbolCategory): void
    {
        const opt = document.createElement("option");

        opt.value = cat.id;
        opt.textContent = `${cat.label} (${cat.items.length})`;

        if (cat.id === this.activeCategoryId)
        {
            opt.selected = true;
        }

        this.categorySelect!.appendChild(opt);
    }

    /** Stub: no-op, category tabs replaced by dropdown. */
    private appendCategoryTabContent(
        _btn: HTMLElement, _cat: SymbolCategory): void
    {
        // No-op: category selection is now via dropdown
    }

    /** Build the scrollable grid wrapper. */
    private buildGridArea(): HTMLElement
    {
        const wrap = createElement("div", [`${CLS}-grid-wrap`]);
        this.gridEl = createElement("div", [`${CLS}-grid`]);
        this.applyGridStyle();
        setAttr(this.gridEl, {
            role: "grid",
            tabindex: "0",
            "aria-label": "Symbol grid",
        });
        this.gridEl.addEventListener("keydown", (e) => this.onGridKeydown(e));
        wrap.appendChild(this.gridEl);
        return wrap;
    }

    /** Apply CSS grid column template from options. */
    private applyGridStyle(): void
    {
        if (!this.gridEl) { return; }
        const cols = this.opts.columns ?? DEFAULT_COLUMNS;
        const size = this.opts.cellSize ?? DEFAULT_CELL_SIZE;
        this.gridEl.style.gridTemplateColumns = `repeat(${cols}, ${size}px)`;
    }

    // ── DOM Building: Preview & Footer ──

    /** Build the preview area showing enlarged char, name, code. */
    private buildPreview(): HTMLElement
    {
        const wrap = createElement("div", [`${CLS}-preview`]);
        setAttr(wrap, { "aria-live": "polite" });
        this.previewChar = createElement("span", [`${CLS}-preview-char`]);
        this.previewName = createElement("span", [`${CLS}-preview-name`]);
        this.previewCode = createElement("span", [`${CLS}-preview-code`]);
        wrap.appendChild(this.previewChar);
        wrap.appendChild(this.previewName);
        wrap.appendChild(this.previewCode);
        this.previewEl = wrap;
        return wrap;
    }

    /** Build the footer with Insert button. */
    private buildFooter(): HTMLElement
    {
        const footer = createElement("div", [`${CLS}-footer`]);
        const btn = createElement("button", [`${CLS}-insert-btn`], "Insert");
        setAttr(btn, { type: "button", disabled: "true" });
        btn.addEventListener("click", () => this.onInsertClick());
        this.insertBtn = btn;
        footer.appendChild(btn);
        return footer;
    }

    // ── Rendering: Grid ──

    /** Rebuild the grid for the current category, filter, and mode. */
    private renderGrid(): void
    {
        if (!this.gridEl) { return; }
        this.gridEl.innerHTML = "";
        this.filteredItems = this.computeFilteredItems();
        this.highlightedIndex = -1;
        this.renderRecentSection();
        this.renderFilteredCells();
    }

    /** Compute filtered items for the active category and search query. */
    private computeFilteredItems(): SymbolItem[]
    {
        const cats = this.getActiveCategories();

        // "All" category or search query: return items from all categories
        if (this.activeCategoryId === "__all__" || this.filterQuery)
        {
            return this.computeAllCategoryItems(cats);
        }

        const cat = cats.find(c => c.id === this.activeCategoryId);

        if (!cat) { return []; }

        return [...cat.items];
    }

    /** Return items from all categories, optionally filtered by query. */
    private computeAllCategoryItems(
        cats: SymbolCategory[]): SymbolItem[]
    {
        const all: SymbolItem[] = [];

        for (const cat of cats)
        {
            for (const item of cat.items)
            {
                all.push(item);
            }
        }

        if (!this.filterQuery) { return all; }

        const q = this.filterQuery.toLowerCase();

        return all.filter(item => this.matchesFilter(item, q));
    }

    /** Check whether a single symbol item matches the search query. */
    private matchesFilter(item: SymbolItem, query: string): boolean
    {
        return item.name.toLowerCase().includes(query)
            || item.code.toLowerCase().includes(query)
            || item.char.toLowerCase().includes(query);
    }

    /** Render cells for the filtered items into the grid. */
    private renderFilteredCells(): void
    {
        if (!this.gridEl) { return; }
        for (let i = 0; i < this.filteredItems.length; i++)
        {
            const item = this.filteredItems[i];
            const cell = this.isIconItem(item)
                ? this.buildIconCell(item, i)
                : this.buildUnicodeCell(item, i);
            this.gridEl.appendChild(cell);
        }
    }

    /** Render recent items section above the main grid. */
    private renderRecentSection(): void
    {
        if (!this.gridEl) { return; }
        if (this.opts.showRecent === false) { return; }
        if (this.filterQuery) { return; }
        const modeRecent = this.getModeRecentItems();
        if (modeRecent.length === 0) { return; }
        const header = this.buildRecentHeader();
        this.gridEl.appendChild(header);
        this.appendRecentCells(modeRecent);
    }

    /** Get recent items filtered for the current mode. */
    private getModeRecentItems(): SymbolItem[]
    {
        if (this.activeMode === "icons")
        {
            return this.recentItems.filter(it => this.isIconItem(it));
        }
        return this.recentItems.filter(it => !this.isIconItem(it));
    }

    /** Build the "Recent" section header spanning all columns. */
    private buildRecentHeader(): HTMLElement
    {
        const cols = this.opts.columns ?? DEFAULT_COLUMNS;
        const header = createElement("div", [`${CLS}-recent-header`], "Recent");
        header.style.gridColumn = `1 / span ${cols}`;
        return header;
    }

    /** Append recent item cells to the grid. */
    private appendRecentCells(items: SymbolItem[]): void
    {
        if (!this.gridEl) { return; }
        for (const item of items)
        {
            const cell = this.isIconItem(item)
                ? this.buildIconCell(item, -1)
                : this.buildUnicodeCell(item, -1);
            cell.classList.add(`${CLS}-cell-recent`);
            this.gridEl.appendChild(cell);
        }
    }

    /** Determine if an item is an icon (Bootstrap Icons or Font Awesome). */
    private isIconItem(item: SymbolItem): boolean
    {
        return item.char.startsWith(ICON_PREFIX_BI)
            || item.char.startsWith(ICON_PREFIX_FA);
    }

    // ── Rendering: Cells ──

    /** Build a cell button for a Unicode character. */
    private buildUnicodeCell(item: SymbolItem, index: number): HTMLElement
    {
        const btn = createElement("button", [`${CLS}-cell`]);
        setAttr(btn, {
            type: "button",
            role: "gridcell",
            "data-code": item.code,
            "data-index": String(index),
            title: item.name,
        });
        btn.textContent = item.char;
        this.attachCellListeners(btn, item, index);
        return btn;
    }

    /** Build a cell button for an icon (Bootstrap Icons or Font Awesome). */
    private buildIconCell(item: SymbolItem, index: number): HTMLElement
    {
        const btn = createElement("button", [`${CLS}-cell`, `${CLS}-cell-icon`]);
        setAttr(btn, {
            type: "button",
            role: "gridcell",
            "data-code": item.code,
            "data-index": String(index),
            title: item.name,
        });
        btn.appendChild(createIconElement(item));
        this.attachCellListeners(btn, item, index);
        return btn;
    }

    /** Attach click, dblclick, and hover listeners to a cell. */
    private attachCellListeners(
        btn: HTMLElement, item: SymbolItem, index: number
    ): void
    {
        btn.addEventListener("click", () =>
        {
            this.selectSymbol(item);
            if (index >= 0) { this.setGridHighlight(index); }
        });
        btn.addEventListener("dblclick", () => this.insertSymbol(item));
        btn.addEventListener("mouseenter", () => this.updatePreview(item));
    }

    // ── State Management ──

    /** Switch between unicode and icons mode. */
    private switchMode(mode: "unicode" | "icons"): void
    {
        if (mode === this.activeMode) { return; }
        this.activeMode = mode;
        this.filterQuery = "";
        if (this.searchInput) { this.searchInput.value = ""; }
        this.initActiveCategory();
        this.refreshCategoryBar();
        this.renderGrid();
        this.updateModeTabs();
        this.clearPreview();
    }

    /** Update mode tab visual states. */
    private updateModeTabs(): void
    {
        if (!this.rootEl) { return; }
        const tabs = this.rootEl.querySelectorAll(`.${CLS}-mode-tab`);
        tabs.forEach((tab) =>
        {
            const el = tab as HTMLElement;
            const isUni = el.textContent === "Unicode";
            const active = (isUni && this.activeMode === "unicode")
                || (!isUni && this.activeMode === "icons");
            el.classList.toggle("active", active);
            el.setAttribute("aria-selected", active ? "true" : "false");
        });
    }

    /** Switch to a different category tab. */
    private switchCategory(categoryId: string): void
    {
        if (categoryId === this.activeCategoryId) { return; }
        this.activeCategoryId = categoryId;
        this.refreshCategoryTabStates();
        this.renderGrid();
        this.clearPreview();
    }

    /** Update active state on category dropdown. */
    private refreshCategoryTabStates(): void
    {
        if (this.categorySelect)
        {
            this.categorySelect.value = this.activeCategoryId;
            return;
        }

        if (!this.categoryBar) { return; }
        const tabs = this.categoryBar.querySelectorAll(`.${CLS}-category-tab`);
        tabs.forEach((tab) =>
        {
            const el = tab as HTMLElement;
            const catId = el.getAttribute("data-category") ?? "";
            el.classList.toggle("active", catId === this.activeCategoryId);
            el.setAttribute("aria-selected",
                catId === this.activeCategoryId ? "true" : "false");
        });
    }

    /** Rebuild category dropdown for the current mode. */
    private refreshCategoryBar(): void
    {
        this.populateCategoryOptions();
    }

    /** Apply search filter to the current category. */
    private applyFilter(query: string): void
    {
        this.filterQuery = query.trim();
        this.renderGrid();
    }

    /** Select a symbol: highlight it, update preview. */
    private selectSymbol(item: SymbolItem): void
    {
        this.selectedSymbol = item;
        this.updatePreview(item);
        this.enableInsertButton();
        safeCallback(this.opts.onSelect, item);
    }

    /** Insert a symbol: push to recent, fire callback. */
    private insertSymbol(item: SymbolItem): void
    {
        this.selectedSymbol = item;
        this.pushRecent(item);
        safeCallback(this.opts.onInsert, item);
    }

    /** Handle Insert button click. */
    private onInsertClick(): void
    {
        if (!this.selectedSymbol) { return; }
        this.insertSymbol(this.selectedSymbol);
    }

    /** Enable the insert button. */
    private enableInsertButton(): void
    {
        if (this.insertBtn)
        {
            this.insertBtn.removeAttribute("disabled");
        }
    }

    // ── Preview ──

    /** Update the preview area with a symbol's details. */
    private updatePreview(item: SymbolItem): void
    {
        if (!this.previewChar || !this.previewName || !this.previewCode)
        {
            return;
        }
        if (this.isIconItem(item))
        {
            this.updateIconPreview(item);
        }
        else
        {
            this.updateCharPreview(item);
        }
        this.previewName.textContent = item.name;
        this.previewCode.textContent = item.code;
    }

    /** Set preview char content for a Unicode character. */
    private updateCharPreview(item: SymbolItem): void
    {
        if (!this.previewChar) { return; }
        this.previewChar.innerHTML = "";
        this.previewChar.textContent = item.char;
    }

    /** Set preview char content for an icon (BI or FA). */
    private updateIconPreview(item: SymbolItem): void
    {
        if (!this.previewChar) { return; }
        this.previewChar.innerHTML = "";
        this.previewChar.appendChild(createIconElement(item));
    }

    /** Clear the preview area. */
    private clearPreview(): void
    {
        if (this.previewChar) { this.previewChar.innerHTML = ""; }
        if (this.previewName) { this.previewName.textContent = ""; }
        if (this.previewCode) { this.previewCode.textContent = ""; }
    }

    // ── Keyboard Navigation ──

    /** Dispatch keyboard events on the grid. */
    private onGridKeydown(e: KeyboardEvent): void
    {
        if (this.matchesKeyCombo(e, "moveLeft"))
        {
            e.preventDefault();
            this.moveGridSelection(-1, 0);
        }
        else if (this.matchesKeyCombo(e, "moveRight"))
        {
            e.preventDefault();
            this.moveGridSelection(1, 0);
        }
        else if (this.matchesKeyCombo(e, "moveUp"))
        {
            e.preventDefault();
            this.moveGridSelection(0, -1);
        }
        else if (this.matchesKeyCombo(e, "moveDown"))
        {
            e.preventDefault();
            this.moveGridSelection(0, 1);
        }
        else
        {
            this.handleGridSpecialKeys(e);
        }
    }

    /** Handle non-arrow keyboard actions on the grid. */
    private handleGridSpecialKeys(e: KeyboardEvent): void
    {
        if (this.matchesKeyCombo(e, "confirmInsert"))
        {
            e.preventDefault();
            this.confirmGridSelection();
        }
        else if (this.matchesKeyCombo(e, "closePopup"))
        {
            e.preventDefault();
            this.closePopup();
            this.triggerEl?.focus();
        }
        else if (this.matchesKeyCombo(e, "jumpToFirst"))
        {
            e.preventDefault();
            this.setGridHighlight(0);
        }
        else if (this.matchesKeyCombo(e, "jumpToLast"))
        {
            e.preventDefault();
            this.setGridHighlight(this.filteredItems.length - 1);
        }
    }

    /** Confirm the currently highlighted grid item as an insert. */
    private confirmGridSelection(): void
    {
        if (this.highlightedIndex >= 0 && this.highlightedIndex < this.filteredItems.length)
        {
            this.insertSymbol(this.filteredItems[this.highlightedIndex]);
        }
    }

    /** Move grid selection by column/row offset. */
    private moveGridSelection(dCol: number, dRow: number): void
    {
        const cols = this.opts.columns ?? DEFAULT_COLUMNS;
        const total = this.filteredItems.length;
        if (total === 0) { return; }
        let idx = this.highlightedIndex;
        if (idx < 0) { idx = 0; }
        else { idx = idx + dCol + (dRow * cols); }
        idx = Math.max(0, Math.min(total - 1, idx));
        this.setGridHighlight(idx);
    }

    /** Set visual highlight on a grid cell and scroll into view. */
    private setGridHighlight(index: number): void
    {
        if (!this.gridEl) { return; }
        if (index < 0 || index >= this.filteredItems.length) { return; }
        this.clearGridHighlight();
        this.highlightedIndex = index;
        const cells = this.gridEl.querySelectorAll(
            `.${CLS}-cell:not(.${CLS}-cell-recent)`
        );
        if (index < cells.length)
        {
            const cell = cells[index] as HTMLElement;
            cell.classList.add(`${CLS}-cell-highlighted`);
            cell.scrollIntoView({ block: "nearest" });
        }
        this.selectSymbol(this.filteredItems[index]);
    }

    /** Remove highlight from all grid cells. */
    private clearGridHighlight(): void
    {
        if (!this.gridEl) { return; }
        const prev = this.gridEl.querySelector(`.${CLS}-cell-highlighted`);
        if (prev) { prev.classList.remove(`${CLS}-cell-highlighted`); }
    }

    // ── Popup Management ──

    /** Toggle popup open/close. */
    private togglePopup(): void
    {
        if (this.popupOpen) { this.closePopup(); }
        else { this.openPopup(); }
    }

    /** Open the popup panel. */
    private openPopup(): void
    {
        if (this.opts.inline || this.isDisabled || this.popupOpen) { return; }
        this.popupOpen = true;
        if (this.panelEl)
        {
            this.panelEl.style.display = "block";
            this.positionPopup();
        }
        this.renderGrid();
        this.addGlobalListeners();
        this.updateTriggerAria();
        safeCallback(this.opts.onOpen);
    }

    /** Close the popup panel. */
    private closePopup(): void
    {
        if (this.opts.inline || !this.popupOpen) { return; }
        this.popupOpen = false;
        if (this.panelEl) { this.panelEl.style.display = "none"; }
        this.removeGlobalListeners();
        this.updateTriggerAria();
        safeCallback(this.opts.onClose);
    }

    /** Update aria-expanded on the trigger button. */
    private updateTriggerAria(): void
    {
        if (this.triggerEl)
        {
            this.triggerEl.setAttribute(
                "aria-expanded", this.popupOpen ? "true" : "false"
            );
        }
    }

    /** Position the popup relative to the trigger element. */
    private positionPopup(): void
    {
        if (!this.panelEl || !this.triggerEl) { return; }
        const triggerRect = this.triggerEl.getBoundingClientRect();
        const pos = this.opts.popupPosition ?? "bottom-start";
        let top = 0;
        let left = 0;
        if (pos.startsWith("bottom"))
        {
            top = triggerRect.bottom + 4;
        }
        else
        {
            top = triggerRect.top - this.panelEl.offsetHeight - 4;
        }
        if (pos.endsWith("start"))
        {
            left = triggerRect.left;
        }
        else
        {
            left = triggerRect.right - this.panelEl.offsetWidth;
        }
        this.applyViewportCorrection(top, left);
    }

    /** Apply viewport overflow correction to panel position. */
    private applyViewportCorrection(top: number, left: number): void
    {
        if (!this.panelEl) { return; }
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        if (left < 4) { left = 4; }
        if (left + this.panelEl.offsetWidth > vw - 4)
        {
            left = vw - this.panelEl.offsetWidth - 4;
        }
        if (top + this.panelEl.offsetHeight > vh - 4)
        {
            top = top - this.panelEl.offsetHeight - 40;
        }
        if (top < 4) { top = 4; }
        this.panelEl.style.position = "fixed";
        this.panelEl.style.zIndex = String(POPUP_Z_INDEX);
        this.panelEl.style.top = `${top}px`;
        this.panelEl.style.left = `${left}px`;
    }

    // ── Global Listeners ──

    /** Add outside-click and escape listeners. */
    private addGlobalListeners(): void
    {
        this.boundOutsideClick = (e: MouseEvent) =>
        {
            if (this.rootEl && !this.rootEl.contains(e.target as Node))
            {
                this.closePopup();
            }
        };
        this.boundEscapeKey = (e: KeyboardEvent) =>
        {
            if (this.matchesKeyCombo(e, "closePopup"))
            {
                this.closePopup();
                this.triggerEl?.focus();
            }
        };
        setTimeout(() =>
        {
            document.addEventListener("mousedown", this.boundOutsideClick!);
            document.addEventListener("keydown", this.boundEscapeKey!);
        }, 0);
    }

    /** Remove global listeners. */
    private removeGlobalListeners(): void
    {
        if (this.boundOutsideClick)
        {
            document.removeEventListener("mousedown", this.boundOutsideClick);
            this.boundOutsideClick = null;
        }
        if (this.boundEscapeKey)
        {
            document.removeEventListener("keydown", this.boundEscapeKey);
            this.boundEscapeKey = null;
        }
    }

    // ── Recent Items (localStorage) ──

    /** Load recent items from localStorage. */
    private loadRecent(): void
    {
        try
        {
            const raw = localStorage.getItem(RECENT_STORAGE_KEY);
            if (raw)
            {
                this.recentItems = JSON.parse(raw) as SymbolItem[];
            }
        }
        catch (err)
        {
            console.warn(LOG_PREFIX, "Failed to load recent:", err);
        }
    }

    /** Save recent items to localStorage. */
    private saveRecent(): void
    {
        try
        {
            localStorage.setItem(
                RECENT_STORAGE_KEY, JSON.stringify(this.recentItems)
            );
        }
        catch (err)
        {
            console.warn(LOG_PREFIX, "Failed to save recent:", err);
        }
    }

    /** Push a symbol to the front of the recent list. */
    private pushRecent(item: SymbolItem): void
    {
        this.recentItems = this.recentItems.filter(r => r.code !== item.code);
        this.recentItems.unshift(item);
        const max = this.opts.maxRecent ?? DEFAULT_MAX_RECENT;
        if (this.recentItems.length > max)
        {
            this.recentItems.length = max;
        }
        this.saveRecent();
    }
}

// ============================================================================
// S7: FACTORY & GLOBAL EXPORTS
// ============================================================================

/** Create a SymbolPicker and optionally mount it in a container. */
export function createSymbolPicker(
    containerId: string, options?: SymbolPickerOptions
): SymbolPicker
{
    const picker = new SymbolPicker(options);
    picker.show(containerId);
    return picker;
}

(window as unknown as Record<string, unknown>)["SymbolPicker"] = SymbolPicker;
(window as unknown as Record<string, unknown>)["createSymbolPicker"] = createSymbolPicker;
