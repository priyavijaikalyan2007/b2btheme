/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: DiagramEngine Page Frames
 * PURPOSE: Predefined page frame sizes, margin presets, and SVG rendering
 *    helpers for non-exportable guide overlays on the canvas. Frames show
 *    print-area boundaries, margin guides, and frame number badges.
 * RELATES: [[DiagramEngine]], [[RenderEngine]], [[PageFrame]]
 * FLOW: [Engine.addPageFrame()] -> [renderPageFrame()] -> [SVG overlay]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// CONSTANTS
// ============================================================================

/** Log prefix for page frame messages. */
const PF_LOG = "[DiagramEngine:PageFrames]";

/** Default border colour for page frames. */
const PF_DEFAULT_BORDER_COLOR = "rgba(100, 100, 200, 0.6)";

/** Default border width for page frames. */
const PF_DEFAULT_BORDER_WIDTH = 1;

/** Default background colour for page frames. */
const PF_DEFAULT_BG_COLOR = "rgba(100, 100, 200, 0.04)";

/** Frame number badge radius. */
const PF_BADGE_RADIUS = 12;

/** Frame number badge font size. */
const PF_BADGE_FONT_SIZE = 10;

/** Margin guide dash pattern. */
const PF_MARGIN_DASH = "4 3";

/** Margin guide line width. */
const PF_MARGIN_LINE_WIDTH = 0.5;

/** Margin guide colour. */
const PF_MARGIN_COLOR = "rgba(150, 150, 200, 0.4)";

/** Lock icon size. */
const PF_LOCK_ICON_SIZE = 14;

// ============================================================================
// PREDEFINED SIZES (96 DPI)
// ============================================================================

/** Predefined page frame sizes at 96 DPI. */
export const PAGE_FRAME_SIZES: PageFrameSize[] = [
    // Paper
    { name: "A4 Portrait",       category: "Paper",        width: 794,  height: 1123 },
    { name: "A4 Landscape",      category: "Paper",        width: 1123, height: 794  },
    { name: "Letter Portrait",   category: "Paper",        width: 816,  height: 1056 },
    { name: "Letter Landscape",  category: "Paper",        width: 1056, height: 816  },
    { name: "A3 Portrait",       category: "Paper",        width: 1123, height: 1587 },
    { name: "Legal Portrait",    category: "Paper",        width: 816,  height: 1344 },
    // B-series paper
    { name: "B4 Portrait",      category: "Paper",        width: 958,  height: 1354 },
    { name: "B4 Landscape",     category: "Paper",        width: 1354, height: 958  },
    { name: "B5 Portrait",      category: "Paper",        width: 693,  height: 979  },
    { name: "B5 Landscape",     category: "Paper",        width: 979,  height: 693  },
    { name: "B6 Portrait",      category: "Paper",        width: 489,  height: 693  },
    // Cards
    { name: "Business Card",     category: "Cards",        width: 336,  height: 192  },
    { name: "Anki Card",         category: "Cards",        width: 480,  height: 336  },
    { name: "Index Card 3x5",    category: "Cards",        width: 480,  height: 288  },
    { name: "Index Card 4x6",    category: "Cards",        width: 576,  height: 384  },
    // Photo
    { name: "4x6",               category: "Photo",        width: 384,  height: 576  },
    { name: "5x7",               category: "Photo",        width: 480,  height: 672  },
    { name: "8x10",              category: "Photo",        width: 768,  height: 960  },
    { name: "11x14",             category: "Photo",        width: 1056, height: 1344 },
    { name: "16x20",             category: "Photo",        width: 1536, height: 1920 },
    { name: "16x24",             category: "Photo",        width: 1536, height: 2304 },
    // Presentation
    { name: "16:9 HD",           category: "Presentation",  width: 960,  height: 540  },
    { name: "4:3 Standard",      category: "Presentation",  width: 960,  height: 720  },
    // Social
    { name: "Instagram Post",    category: "Social",        width: 480,  height: 480  },
    { name: "Twitter Header",    category: "Social",        width: 576,  height: 192  },
    // Mobile screens
    { name: "iPhone SE",         category: "Mobile",        width: 375,  height: 667  },
    { name: "iPhone 15",         category: "Mobile",        width: 393,  height: 852  },
    { name: "iPhone 15 Pro Max", category: "Mobile",        width: 430,  height: 932  },
    { name: "Pixel 8",           category: "Mobile",        width: 412,  height: 915  },
    { name: "Galaxy S24",        category: "Mobile",        width: 360,  height: 780  },
    // Tablet screens
    { name: "iPad Mini",         category: "Tablet",        width: 744,  height: 1133 },
    { name: "iPad Air",          category: "Tablet",        width: 820,  height: 1180 },
    { name: "iPad Pro 11",       category: "Tablet",        width: 834,  height: 1194 },
    { name: "iPad Pro 12.9",     category: "Tablet",        width: 1024, height: 1366 },
    { name: "Surface Pro",       category: "Tablet",        width: 912,  height: 1368 },
    // Laptop screens
    { name: "MacBook Air 13",    category: "Laptop",        width: 1280, height: 800  },
    { name: "MacBook Pro 14",    category: "Laptop",        width: 1512, height: 982  },
    { name: "MacBook Pro 16",    category: "Laptop",        width: 1728, height: 1117 },
    // Desktop screens
    { name: "Full HD (1080p)",   category: "Screen",        width: 1920, height: 1080 },
    { name: "QHD (1440p)",       category: "Screen",        width: 2560, height: 1440 },
    { name: "4K UHD",            category: "Screen",        width: 3840, height: 2160 },
    // App Icons
    { name: "Icon 16x16",        category: "Icons",         width: 16,   height: 16   },
    { name: "Icon 24x24",        category: "Icons",         width: 24,   height: 24   },
    { name: "Icon 32x32",        category: "Icons",         width: 32,   height: 32   },
    { name: "Icon 48x48",        category: "Icons",         width: 48,   height: 48   },
    { name: "Icon 64x64",        category: "Icons",         width: 64,   height: 64   },
    { name: "Icon 96x96",        category: "Icons",         width: 96,   height: 96   },
    { name: "Icon 128x128",      category: "Icons",         width: 128,  height: 128  },
    { name: "Icon 256x256",      category: "Icons",         width: 256,  height: 256  },
    { name: "Icon 512x512",      category: "Icons",         width: 512,  height: 512  },
    { name: "Favicon 16x16",     category: "Icons",         width: 16,   height: 16   },
    { name: "Apple Touch 180x180", category: "Icons",       width: 180,  height: 180  },
];

// ============================================================================
// PREDEFINED MARGIN PRESETS
// ============================================================================

/** Named margin presets for page frames. */
export const PAGE_FRAME_MARGIN_PRESETS: Record<string, PageFrameMargins> = {
    /** Normal: 72px all sides (1 inch at 96 DPI). */
    normal: { top: 72, right: 72, bottom: 72, left: 72 },
    /** Narrow: 36px all sides (0.5 inch at 96 DPI). */
    narrow: { top: 36, right: 36, bottom: 36, left: 36 },
    /** Wide: 144px left/right, 72px top/bottom. */
    wide:   { top: 72, right: 144, bottom: 72, left: 144 },
    /** None: zero margins. */
    none:   { top: 0, right: 0, bottom: 0, left: 0 },
};

// ============================================================================
// LOOKUP HELPERS
// ============================================================================

/**
 * Finds a predefined page frame size by name.
 *
 * @param name - The size preset name (e.g. "A4 Portrait").
 * @returns The matching PageFrameSize, or null if not found.
 */
export function findPageFrameSize(name: string): PageFrameSize | null
{
    return PAGE_FRAME_SIZES.find((s) => s.name === name) ?? null;
}

// ============================================================================
// SVG RENDERING — FRAME
// ============================================================================

/**
 * Renders a page frame as an SVG group element containing the outer
 * border, optional background fill, margin guides, number badge,
 * and lock indicator.
 *
 * @param frame - The page frame to render.
 * @param defsEl - SVG defs element (reserved for future use).
 * @returns An SVG group element representing the frame.
 */
export function renderPageFrame(
    frame: PageFrame,
    defsEl: SVGElement
): SVGElement
{
    const g = svgCreate("g", {
        "data-page-frame-id": frame.id,
        class: `${CLS}-page-frame`,
    }) as SVGGElement;

    g.appendChild(createFrameBackground(frame));
    g.appendChild(createFrameBorder(frame));
    appendMarginGuides(g, frame);
    g.appendChild(createFrameBadge(frame));

    if (frame.locked)
    {
        g.appendChild(createLockIndicator(frame));
    }

    if (frame.label)
    {
        g.appendChild(createFrameLabel(frame));
    }

    return g;
}

// ============================================================================
// SVG RENDERING — BACKGROUND
// ============================================================================

/**
 * Creates the semi-transparent background rectangle for a frame.
 *
 * @param frame - The page frame.
 * @returns An SVG rect element.
 */
function createFrameBackground(frame: PageFrame): SVGElement
{
    return svgCreate("rect", {
        x: String(frame.x),
        y: String(frame.y),
        width: String(frame.width),
        height: String(frame.height),
        fill: frame.backgroundColor || PF_DEFAULT_BG_COLOR,
        "pointer-events": "none",
    });
}

// ============================================================================
// SVG RENDERING — BORDER
// ============================================================================

/**
 * Creates the outer border rectangle for a frame.
 *
 * @param frame - The page frame.
 * @returns An SVG rect element with configurable stroke.
 */
function createFrameBorder(frame: PageFrame): SVGElement
{
    return svgCreate("rect", {
        x: String(frame.x),
        y: String(frame.y),
        width: String(frame.width),
        height: String(frame.height),
        fill: "none",
        stroke: frame.borderColor || PF_DEFAULT_BORDER_COLOR,
        "stroke-width": String(frame.borderWidth || PF_DEFAULT_BORDER_WIDTH),
        "pointer-events": "none",
    });
}

// ============================================================================
// SVG RENDERING — MARGIN GUIDES
// ============================================================================

/**
 * Appends dashed margin guide lines inside the frame boundary.
 * Draws one line per non-zero margin edge.
 *
 * @param g - Parent SVG group to append lines to.
 * @param frame - The page frame with margin data.
 */
function appendMarginGuides(g: SVGGElement, frame: PageFrame): void
{
    const m = frame.margins;
    const attrs = buildMarginLineAttrs();

    if (m.top > 0)
    {
        g.appendChild(createHLine(frame.x, frame.y + m.top, frame.width, attrs));
    }

    if (m.bottom > 0)
    {
        const y = frame.y + frame.height - m.bottom;
        g.appendChild(createHLine(frame.x, y, frame.width, attrs));
    }

    if (m.left > 0)
    {
        g.appendChild(createVLine(frame.x + m.left, frame.y, frame.height, attrs));
    }

    if (m.right > 0)
    {
        const x = frame.x + frame.width - m.right;
        g.appendChild(createVLine(x, frame.y, frame.height, attrs));
    }
}

/**
 * Builds common SVG attributes for margin guide lines.
 *
 * @returns Attribute record for dashed margin lines.
 */
function buildMarginLineAttrs(): Record<string, string>
{
    return {
        stroke: PF_MARGIN_COLOR,
        "stroke-width": String(PF_MARGIN_LINE_WIDTH),
        "stroke-dasharray": PF_MARGIN_DASH,
        "pointer-events": "none",
    };
}

/**
 * Creates a horizontal SVG line element.
 *
 * @param x - Start X coordinate.
 * @param y - Y coordinate.
 * @param w - Line width.
 * @param attrs - Additional SVG attributes.
 * @returns An SVG line element.
 */
function createHLine(
    x: number,
    y: number,
    w: number,
    attrs: Record<string, string>
): SVGElement
{
    return svgCreate("line", {
        x1: String(x),
        y1: String(y),
        x2: String(x + w),
        y2: String(y),
        ...attrs,
    });
}

/**
 * Creates a vertical SVG line element.
 *
 * @param x - X coordinate.
 * @param y - Start Y coordinate.
 * @param h - Line height.
 * @param attrs - Additional SVG attributes.
 * @returns An SVG line element.
 */
function createVLine(
    x: number,
    y: number,
    h: number,
    attrs: Record<string, string>
): SVGElement
{
    return svgCreate("line", {
        x1: String(x),
        y1: String(y),
        x2: String(x),
        y2: String(y + h),
        ...attrs,
    });
}

// ============================================================================
// SVG RENDERING — BADGE
// ============================================================================

/**
 * Creates a number badge at the top-left corner of the frame.
 * Displays the frame's sequential number inside a small circle.
 *
 * @param frame - The page frame.
 * @returns An SVG group containing the badge circle and text.
 */
function createFrameBadge(frame: PageFrame): SVGElement
{
    const cx = frame.x + PF_BADGE_RADIUS + 4;
    const cy = frame.y + PF_BADGE_RADIUS + 4;
    const g = svgCreate("g", { "pointer-events": "none" });

    const circle = svgCreate("circle", {
        cx: String(cx),
        cy: String(cy),
        r: String(PF_BADGE_RADIUS),
        fill: frame.borderColor || PF_DEFAULT_BORDER_COLOR,
        opacity: "0.8",
    });

    const text = svgCreate("text", {
        x: String(cx),
        y: String(cy + 1),
        "text-anchor": "middle",
        "dominant-baseline": "central",
        fill: "#ffffff",
        "font-size": String(PF_BADGE_FONT_SIZE),
        "font-family": "inherit",
    });

    text.textContent = String(frame.number);

    g.appendChild(circle);
    g.appendChild(text);

    return g;
}

// ============================================================================
// SVG RENDERING — LOCK INDICATOR
// ============================================================================

/**
 * Creates a small lock icon at the top-right corner of the frame.
 *
 * @param frame - The page frame.
 * @returns An SVG group containing the lock icon.
 */
function createLockIndicator(frame: PageFrame): SVGElement
{
    const x = frame.x + frame.width - PF_LOCK_ICON_SIZE - 6;
    const y = frame.y + 6;
    const g = svgCreate("g", { "pointer-events": "none" });

    const bg = svgCreate("rect", {
        x: String(x),
        y: String(y),
        width: String(PF_LOCK_ICON_SIZE),
        height: String(PF_LOCK_ICON_SIZE),
        rx: "2",
        fill: frame.borderColor || PF_DEFAULT_BORDER_COLOR,
        opacity: "0.7",
    });

    const icon = svgCreate("text", {
        x: String(x + PF_LOCK_ICON_SIZE / 2),
        y: String(y + PF_LOCK_ICON_SIZE / 2 + 1),
        "text-anchor": "middle",
        "dominant-baseline": "central",
        fill: "#ffffff",
        "font-size": "9",
        "font-family": "inherit",
    });

    icon.textContent = "\u{1F512}";

    g.appendChild(bg);
    g.appendChild(icon);

    return g;
}

// ============================================================================
// SVG RENDERING — FRAME LABEL
// ============================================================================

/**
 * Creates a text label centred at the top of the frame.
 *
 * @param frame - The page frame with a label property.
 * @returns An SVG text element.
 */
function createFrameLabel(frame: PageFrame): SVGElement
{
    const text = svgCreate("text", {
        x: String(frame.x + frame.width / 2),
        y: String(frame.y - 6),
        "text-anchor": "middle",
        fill: frame.borderColor || PF_DEFAULT_BORDER_COLOR,
        "font-size": "11",
        "font-family": "inherit",
        "pointer-events": "none",
    });

    text.textContent = frame.label ?? "";

    return text;
}

// ============================================================================
// THUMBNAIL HELPER
// ============================================================================

/**
 * Creates a scaled-down SVG element showing a page frame's bounds
 * and any diagram objects that fall within it.
 *
 * @param frame - The page frame to thumbnail.
 * @param objects - All diagram objects to filter and include.
 * @param scale - Scale factor (e.g. 0.1 for 10% size).
 * @returns An SVG element sized to the scaled frame dimensions.
 */
export function generateFrameThumbnail(
    frame: PageFrame,
    objects: DiagramObject[],
    scale: number
): SVGElement
{
    const w = frame.width * scale;
    const h = frame.height * scale;

    const svg = svgCreate("svg", {
        width: String(w),
        height: String(h),
        viewBox: `${frame.x} ${frame.y} ${frame.width} ${frame.height}`,
    }) as SVGSVGElement;

    svg.appendChild(createThumbnailBorder(frame));
    appendThumbnailObjects(svg, frame, objects);

    console.debug(PF_LOG, "Thumbnail generated for frame:", frame.id);
    return svg;
}

/**
 * Creates the border rectangle for a thumbnail.
 *
 * @param frame - The page frame.
 * @returns An SVG rect for the thumbnail border.
 */
function createThumbnailBorder(frame: PageFrame): SVGElement
{
    return svgCreate("rect", {
        x: String(frame.x),
        y: String(frame.y),
        width: String(frame.width),
        height: String(frame.height),
        fill: "#ffffff",
        stroke: frame.borderColor || PF_DEFAULT_BORDER_COLOR,
        "stroke-width": "2",
    });
}

/**
 * Appends simplified object placeholders inside the thumbnail
 * for objects whose bounds intersect the frame.
 *
 * @param svg - The thumbnail SVG element.
 * @param frame - The page frame.
 * @param objects - All diagram objects.
 */
function appendThumbnailObjects(
    svg: SVGElement,
    frame: PageFrame,
    objects: DiagramObject[]
): void
{
    const frameRect: Rect = {
        x: frame.x,
        y: frame.y,
        width: frame.width,
        height: frame.height,
    };

    for (const obj of objects)
    {
        if (!obj.presentation.visible)
        {
            continue;
        }

        const b = obj.presentation.bounds;
        const objRect: Rect = { x: b.x, y: b.y, width: b.width, height: b.height };

        if (thumbnailRectsOverlap(frameRect, objRect))
        {
            svg.appendChild(createThumbnailPlaceholder(b));
        }
    }
}

/**
 * Tests whether two rectangles overlap for thumbnail inclusion.
 *
 * @param a - First rectangle.
 * @param b - Second rectangle.
 * @returns true if the rectangles intersect.
 */
function thumbnailRectsOverlap(a: Rect, b: Rect): boolean
{
    return (
        a.x < b.x + b.width
        && a.x + a.width > b.x
        && a.y < b.y + b.height
        && a.y + a.height > b.y
    );
}

/**
 * Creates a simplified placeholder rectangle for an object
 * in the thumbnail view.
 *
 * @param b - Object bounds.
 * @returns An SVG rect representing the object.
 */
function createThumbnailPlaceholder(b: Rect): SVGElement
{
    return svgCreate("rect", {
        x: String(b.x),
        y: String(b.y),
        width: String(b.width),
        height: String(b.height),
        fill: "rgba(100, 150, 200, 0.3)",
        stroke: "rgba(100, 150, 200, 0.6)",
        "stroke-width": "1",
    });
}
