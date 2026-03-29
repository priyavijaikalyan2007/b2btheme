/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: DiagramEngine — DeviceStencils
 * PURPOSE: Twelve device frame shape definitions for interactive mockups
 *    and wireframes. Includes browser windows, mobile phones, tablets,
 *    desktop windows, dialogs, cards, sidebars, navbars, and footers.
 *    Each shape is a container with a defined content area for embedding
 *    child components.
 * RELATES: [[DiagramEngine]], [[ShapeRegistry]], [[ShapeDefinition]]
 * FLOW: [registerDeviceStencils()] -> [ShapeRegistry.register()] -> [Engine]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

const DEV_LOG_PREFIX = "[DeviceStencils]";

function logDevInfo(...args: unknown[]): void
{
    console.log(new Date().toISOString(), "[INFO]", DEV_LOG_PREFIX, ...args);
}

function logDevWarn(...args: unknown[]): void
{
    console.warn(new Date().toISOString(), "[WARN]", DEV_LOG_PREFIX, ...args);
}

function logDevError(...args: unknown[]): void
{
    console.error(new Date().toISOString(), "[ERROR]", DEV_LOG_PREFIX, ...args);
}

function logDevDebug(...args: unknown[]): void
{
    console.debug(new Date().toISOString(), "[DEBUG]", DEV_LOG_PREFIX, ...args);
}

/** Category identifier for device frame shapes in the stencil palette. */
const DEV_CATEGORY = "devices";

/** Total number of device shapes registered by this pack. */
const DEV_SHAPE_COUNT = 12;

// ============================================================================
// COLOUR CONSTANTS
// ============================================================================

/** Chrome browser title/tab bar background. */
const DEV_CHROME_BG = "#dee1e6";

/** Chrome browser active tab background. */
const DEV_CHROME_TAB_ACTIVE = "#ffffff";

/** Browser address bar background. */
const DEV_ADDRESS_BAR_BG = "#f1f3f4";

/** Title bar button colours (close, minimise, maximise). */
const DEV_BTN_CLOSE = "#ff5f57";
const DEV_BTN_MINIMISE = "#ffbd2e";
const DEV_BTN_MAXIMISE = "#28c840";

/** Generic title bar background. */
const DEV_TITLEBAR_BG = "#e8e8e8";

/** Mobile device frame background. */
const DEV_DEVICE_BG = "#1a1a1a";

/** Content area background (white). */
const DEV_CONTENT_BG = "#ffffff";

/** Stroke colour for schematic/sketch mode. */
const DEV_SKETCH_STROKE = "#666666";

/** Light border colour for cards and panels. */
const DEV_BORDER_LIGHT = "#dee2e6";

/** Nav/footer backgrounds. */
const DEV_NAV_BG = "#343a40";

/** Text colours. */
const DEV_TEXT_LIGHT = "#ffffff";
const DEV_TEXT_DARK = "#333333";
const DEV_TEXT_MUTED = "#6c757d";

// ============================================================================
// SHARED HELPERS
// ============================================================================

/**
 * Creates an inset copy of a rectangle, shrinking each edge.
 *
 * @param bounds - Original bounding rectangle.
 * @param inset - Number of pixels to inset on each side.
 * @returns A new Rect inset from the original.
 */
function devInsetRect(bounds: Rect, inset: number): Rect
{
    const doubleInset = inset * 2;

    return {
        x: bounds.x + inset,
        y: bounds.y + inset,
        width: Math.max(0, bounds.width - doubleInset),
        height: Math.max(0, bounds.height - doubleInset)
    };
}

/**
 * Returns the SVG path data for a rectangle outline.
 *
 * @param bounds - Current bounding rectangle.
 * @returns SVG path data string.
 */
function devRectOutlinePath(bounds: Rect): string
{
    const x = bounds.x;
    const y = bounds.y;
    const w = bounds.width;
    const h = bounds.height;

    return `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
}

/**
 * Returns the SVG path data for a rounded rectangle outline.
 *
 * @param x - Top-left x.
 * @param y - Top-left y.
 * @param w - Width.
 * @param h - Height.
 * @param r - Corner radius.
 * @returns SVG path data string.
 */
function devRoundedRectPath(
    x: number,
    y: number,
    w: number,
    h: number,
    r: number): string
{
    const clampR = Math.min(r, w / 2, h / 2);

    return (
        `M ${x + clampR} ${y} ` +
        `L ${x + w - clampR} ${y} ` +
        `A ${clampR} ${clampR} 0 0 1 ${x + w} ${y + clampR} ` +
        `L ${x + w} ${y + h - clampR} ` +
        `A ${clampR} ${clampR} 0 0 1 ${x + w - clampR} ${y + h} ` +
        `L ${x + clampR} ${y + h} ` +
        `A ${clampR} ${clampR} 0 0 1 ${x} ${y + h - clampR} ` +
        `L ${x} ${y + clampR} ` +
        `A ${clampR} ${clampR} 0 0 1 ${x + clampR} ${y} Z`
    );
}

/**
 * Checks whether the current render context is in sketch mode.
 *
 * @param ctx - Shape render context.
 * @returns true if sketch mode is active.
 */
function devIsSketch(ctx: ShapeRenderContext): boolean
{
    return ctx.renderStyle === "sketch";
}

/**
 * Applies sketch-mode stroke styling to an SVG element.
 *
 * @param el - The SVG element to style.
 */
function devApplySketchStroke(el: SVGElement): void
{
    el.setAttribute("stroke", DEV_SKETCH_STROKE);
    el.setAttribute("stroke-width", "1.5");
    el.setAttribute("stroke-dasharray", "6 3");
    el.setAttribute("fill", "none");
}

/**
 * Sets a data attribute marking this shape as a container.
 *
 * @param g - The SVG group element to mark.
 */
function devMarkContainer(g: SVGElement): void
{
    g.setAttribute("data-is-container", "true");
}

// ============================================================================
// BROWSER CHROME (800x600)
// ============================================================================

/** Height of the tab bar in the Chrome browser frame. */
const DEV_CHROME_TAB_H = 36;

/** Height of the address bar in the Chrome browser frame. */
const DEV_CHROME_ADDR_H = 32;

/** Total chrome height (tab bar + address bar). */
const DEV_CHROME_TOTAL_H = DEV_CHROME_TAB_H + DEV_CHROME_ADDR_H;

/**
 * Renders the tab bar portion of a Chrome browser frame.
 *
 * @param g - Parent SVG group.
 * @param x - Left coordinate.
 * @param y - Top coordinate.
 * @param w - Width of the frame.
 */
function renderChromeTabBar(
    g: SVGElement,
    x: number,
    y: number,
    w: number): void
{
    const tabBg = svgCreate("rect", {
        x: String(x), y: String(y),
        width: String(w), height: String(DEV_CHROME_TAB_H),
        fill: DEV_CHROME_BG
    });

    g.appendChild(tabBg);

    const tabShape = svgCreate("path", {
        d: `M ${x + 8} ${y + DEV_CHROME_TAB_H} ` +
           `L ${x + 16} ${y + 8} ` +
           `L ${x + 160} ${y + 8} ` +
           `L ${x + 168} ${y + DEV_CHROME_TAB_H} Z`,
        fill: DEV_CHROME_TAB_ACTIVE
    });

    g.appendChild(tabShape);

    const tabLabel = svgCreate("text", {
        x: String(x + 40), y: String(y + 24),
        "font-size": "11", fill: DEV_TEXT_DARK
    });

    tabLabel.textContent = "New Tab";
    g.appendChild(tabLabel);
}

/**
 * Renders the address bar portion of a Chrome browser frame.
 *
 * @param g - Parent SVG group.
 * @param x - Left coordinate.
 * @param y - Top coordinate (below tab bar).
 * @param w - Width of the frame.
 */
function renderChromeAddressBar(
    g: SVGElement,
    x: number,
    y: number,
    w: number): void
{
    const addrBg = svgCreate("rect", {
        x: String(x), y: String(y),
        width: String(w), height: String(DEV_CHROME_ADDR_H),
        fill: DEV_CHROME_TAB_ACTIVE
    });

    g.appendChild(addrBg);
    renderChromeNavButtons(g, x, y);
    renderChromeAddressField(g, x, y, w);
}

/**
 * Renders navigation buttons (back, forward, reload) in the address bar.
 *
 * @param g - Parent SVG group.
 * @param x - Left coordinate of the address bar.
 * @param y - Top coordinate of the address bar.
 */
function renderChromeNavButtons(
    g: SVGElement,
    x: number,
    y: number): void
{
    const btnY = y + (DEV_CHROME_ADDR_H / 2);
    const offsets = [16, 36, 56];

    for (const ox of offsets)
    {
        const circle = svgCreate("circle", {
            cx: String(x + ox), cy: String(btnY),
            r: "7", fill: "none",
            stroke: DEV_TEXT_MUTED, "stroke-width": "1.5"
        });

        g.appendChild(circle);
    }
}

/**
 * Renders the URL address field rectangle.
 *
 * @param g - Parent SVG group.
 * @param x - Left coordinate of the address bar.
 * @param y - Top coordinate of the address bar.
 * @param w - Width of the frame.
 */
function renderChromeAddressField(
    g: SVGElement,
    x: number,
    y: number,
    w: number): void
{
    const fieldX = x + 76;
    const fieldW = w - 100;
    const fieldH = 22;
    const fieldY = y + ((DEV_CHROME_ADDR_H - fieldH) / 2);

    const field = svgCreate("rect", {
        x: String(fieldX), y: String(fieldY),
        width: String(Math.max(0, fieldW)),
        height: String(fieldH),
        rx: "11", ry: "11",
        fill: DEV_ADDRESS_BAR_BG
    });

    g.appendChild(field);
}

/**
 * Renders a Chrome browser frame in clean (detailed) mode.
 *
 * @param ctx - Shape render context.
 * @returns SVG group with all browser chrome elements.
 */
function renderBrowserChromeClean(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    devMarkContainer(g);

    const outerRect = svgCreate("rect", {
        x: String(b.x), y: String(b.y),
        width: String(b.width), height: String(b.height),
        fill: DEV_CONTENT_BG,
        stroke: "#bdc3c7", "stroke-width": "1"
    });

    g.appendChild(outerRect);
    renderChromeTabBar(g, b.x, b.y, b.width);
    renderChromeAddressBar(g, b.x, b.y + DEV_CHROME_TAB_H, b.width);

    return g;
}

/**
 * Renders a Chrome browser frame in sketch (schematic) mode.
 *
 * @param ctx - Shape render context.
 * @returns SVG group with simplified browser outline.
 */
function renderBrowserChromeSketch(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    devMarkContainer(g);

    const outerRect = svgCreate("rect", {
        x: String(b.x), y: String(b.y),
        width: String(b.width), height: String(b.height)
    });

    devApplySketchStroke(outerRect);
    g.appendChild(outerRect);

    const divider = svgCreate("line", {
        x1: String(b.x), y1: String(b.y + DEV_CHROME_TOTAL_H),
        x2: String(b.x + b.width), y2: String(b.y + DEV_CHROME_TOTAL_H)
    });

    devApplySketchStroke(divider);
    g.appendChild(divider);

    const label = svgCreate("text", {
        x: String(b.x + 10), y: String(b.y + 22),
        "font-size": "11", fill: DEV_SKETCH_STROKE
    });

    label.textContent = "[browser]";
    g.appendChild(label);

    return g;
}

/**
 * Renders a Chrome browser frame, delegating to clean or sketch mode.
 *
 * @param ctx - Shape render context.
 * @returns SVG group representing the browser frame.
 */
function renderBrowserChrome(ctx: ShapeRenderContext): SVGElement
{
    if (devIsSketch(ctx))
    {
        return renderBrowserChromeSketch(ctx);
    }

    return renderBrowserChromeClean(ctx);
}

/**
 * Returns the content region for a Chrome browser frame.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single "content" text region below the chrome.
 */
function browserChromeTextRegions(bounds: Rect): TextRegion[]
{
    return [
        {
            id: "content",
            bounds: {
                x: bounds.x + 1,
                y: bounds.y + DEV_CHROME_TOTAL_H,
                width: bounds.width - 2,
                height: Math.max(0, bounds.height - DEV_CHROME_TOTAL_H - 1)
            }
        }
    ];
}

/**
 * Builds the browser-chrome ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for Chrome browser frames.
 */
function buildBrowserChromeShape(): ShapeDefinition
{
    return {
        type: "browser-chrome",
        category: DEV_CATEGORY,
        label: "Browser (Chrome)",
        icon: "bi-window",
        defaultSize: { w: 800, h: 600 },
        minSize: { w: 300, h: 200 },
        render: renderBrowserChrome,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => rectHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => browserChromeTextRegions(bounds),
        getOutlinePath: (bounds: Rect) => devRectOutlinePath(bounds)
    };
}

// ============================================================================
// BROWSER MINIMAL (800x600)
// ============================================================================

/** Height of the minimal browser address bar. */
const DEV_MINIMAL_ADDR_H = 36;

/**
 * Renders a minimal browser frame in clean mode.
 *
 * @param ctx - Shape render context.
 * @returns SVG group with minimal browser chrome.
 */
function renderBrowserMinimalClean(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    devMarkContainer(g);

    const outerRect = svgCreate("rect", {
        x: String(b.x), y: String(b.y),
        width: String(b.width), height: String(b.height),
        fill: DEV_CONTENT_BG,
        stroke: "#bdc3c7", "stroke-width": "1"
    });

    g.appendChild(outerRect);

    const addrBg = svgCreate("rect", {
        x: String(b.x), y: String(b.y),
        width: String(b.width), height: String(DEV_MINIMAL_ADDR_H),
        fill: DEV_CHROME_BG
    });

    g.appendChild(addrBg);
    renderChromeAddressField(g, b.x, b.y, b.width);

    return g;
}

/**
 * Renders a minimal browser frame in sketch mode.
 *
 * @param ctx - Shape render context.
 * @returns SVG group with simplified outline.
 */
function renderBrowserMinimalSketch(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    devMarkContainer(g);

    const outerRect = svgCreate("rect", {
        x: String(b.x), y: String(b.y),
        width: String(b.width), height: String(b.height)
    });

    devApplySketchStroke(outerRect);
    g.appendChild(outerRect);

    const divider = svgCreate("line", {
        x1: String(b.x), y1: String(b.y + DEV_MINIMAL_ADDR_H),
        x2: String(b.x + b.width), y2: String(b.y + DEV_MINIMAL_ADDR_H)
    });

    devApplySketchStroke(divider);
    g.appendChild(divider);

    const label = svgCreate("text", {
        x: String(b.x + 10), y: String(b.y + 22),
        "font-size": "11", fill: DEV_SKETCH_STROKE
    });

    label.textContent = "[url bar]";
    g.appendChild(label);

    return g;
}

/**
 * Renders a minimal browser frame, delegating by render style.
 *
 * @param ctx - Shape render context.
 * @returns SVG group representing the minimal browser frame.
 */
function renderBrowserMinimal(ctx: ShapeRenderContext): SVGElement
{
    if (devIsSketch(ctx))
    {
        return renderBrowserMinimalSketch(ctx);
    }

    return renderBrowserMinimalClean(ctx);
}

/**
 * Returns the content region for a minimal browser frame.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single "content" text region.
 */
function browserMinimalTextRegions(bounds: Rect): TextRegion[]
{
    return [
        {
            id: "content",
            bounds: {
                x: bounds.x + 1,
                y: bounds.y + DEV_MINIMAL_ADDR_H,
                width: bounds.width - 2,
                height: Math.max(0, bounds.height - DEV_MINIMAL_ADDR_H - 1)
            }
        }
    ];
}

/**
 * Builds the browser-minimal ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for minimal browser frames.
 */
function buildBrowserMinimalShape(): ShapeDefinition
{
    return {
        type: "browser-minimal",
        category: DEV_CATEGORY,
        label: "Browser (Minimal)",
        icon: "bi-browser-chrome",
        defaultSize: { w: 800, h: 600 },
        minSize: { w: 300, h: 150 },
        render: renderBrowserMinimal,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => rectHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => browserMinimalTextRegions(bounds),
        getOutlinePath: (bounds: Rect) => devRectOutlinePath(bounds)
    };
}

// ============================================================================
// MOBILE IPHONE (375x812)
// ============================================================================

/** Corner radius of the iPhone outer frame. */
const DEV_IPHONE_RADIUS = 40;

/** Height of the iPhone status bar area (includes notch). */
const DEV_IPHONE_STATUS_H = 44;

/** Height of the iPhone home indicator area. */
const DEV_IPHONE_HOME_H = 34;

/** Width of the iPhone notch. */
const DEV_IPHONE_NOTCH_W = 150;

/** Height of the iPhone notch. */
const DEV_IPHONE_NOTCH_H = 30;

/**
 * Renders the iPhone notch element.
 *
 * @param g - Parent SVG group.
 * @param cx - Centre X of the frame.
 * @param y - Top coordinate.
 */
function renderIphoneNotch(
    g: SVGElement,
    cx: number,
    y: number): void
{
    const notchPath = svgCreate("path", {
        d: devRoundedRectPath(
            cx - (DEV_IPHONE_NOTCH_W / 2), y,
            DEV_IPHONE_NOTCH_W, DEV_IPHONE_NOTCH_H, 14
        ),
        fill: DEV_DEVICE_BG
    });

    g.appendChild(notchPath);
}

/**
 * Renders the iPhone home indicator bar.
 *
 * @param g - Parent SVG group.
 * @param cx - Centre X of the frame.
 * @param bottomY - Bottom Y of the content area.
 */
function renderIphoneHomeIndicator(
    g: SVGElement,
    cx: number,
    bottomY: number): void
{
    const indicatorW = 134;
    const indicatorH = 5;
    const iy = bottomY + ((DEV_IPHONE_HOME_H - indicatorH) / 2);

    const indicator = svgCreate("rect", {
        x: String(cx - (indicatorW / 2)), y: String(iy),
        width: String(indicatorW), height: String(indicatorH),
        rx: "2.5", ry: "2.5",
        fill: DEV_TEXT_DARK
    });

    g.appendChild(indicator);
}

/**
 * Renders an iPhone frame in clean mode.
 *
 * @param ctx - Shape render context.
 * @returns SVG group with detailed iPhone chrome.
 */
function renderMobileIphoneClean(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    const cx = b.x + (b.width / 2);

    devMarkContainer(g);

    const frame = svgCreate("path", {
        d: devRoundedRectPath(b.x, b.y, b.width, b.height, DEV_IPHONE_RADIUS),
        fill: DEV_DEVICE_BG, stroke: "#333", "stroke-width": "2"
    });

    g.appendChild(frame);

    const screen = svgCreate("rect", {
        x: String(b.x + 4), y: String(b.y + DEV_IPHONE_STATUS_H),
        width: String(b.width - 8),
        height: String(Math.max(0, b.height - DEV_IPHONE_STATUS_H - DEV_IPHONE_HOME_H)),
        fill: DEV_CONTENT_BG
    });

    g.appendChild(screen);
    renderIphoneNotch(g, cx, b.y);

    const contentBottom = b.y + b.height - DEV_IPHONE_HOME_H;

    renderIphoneHomeIndicator(g, cx, contentBottom);

    return g;
}

/**
 * Renders an iPhone frame in sketch mode.
 *
 * @param ctx - Shape render context.
 * @returns SVG group with simplified iPhone outline.
 */
function renderMobileIphoneSketch(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    devMarkContainer(g);

    const frame = svgCreate("path", {
        d: devRoundedRectPath(b.x, b.y, b.width, b.height, DEV_IPHONE_RADIUS)
    });

    devApplySketchStroke(frame);
    g.appendChild(frame);

    const statusLine = svgCreate("line", {
        x1: String(b.x + 10), y1: String(b.y + DEV_IPHONE_STATUS_H),
        x2: String(b.x + b.width - 10), y2: String(b.y + DEV_IPHONE_STATUS_H)
    });

    devApplySketchStroke(statusLine);
    g.appendChild(statusLine);

    const label = svgCreate("text", {
        x: String(b.x + 20), y: String(b.y + 28),
        "font-size": "10", fill: DEV_SKETCH_STROKE
    });

    label.textContent = "[iPhone]";
    g.appendChild(label);

    return g;
}

/**
 * Renders an iPhone frame, delegating by render style.
 *
 * @param ctx - Shape render context.
 * @returns SVG group representing the iPhone frame.
 */
function renderMobileIphone(ctx: ShapeRenderContext): SVGElement
{
    if (devIsSketch(ctx))
    {
        return renderMobileIphoneSketch(ctx);
    }

    return renderMobileIphoneClean(ctx);
}

/**
 * Returns the content region for an iPhone frame.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single "content" region.
 */
function mobileIphoneTextRegions(bounds: Rect): TextRegion[]
{
    return [
        {
            id: "content",
            bounds: {
                x: bounds.x + 4,
                y: bounds.y + DEV_IPHONE_STATUS_H,
                width: bounds.width - 8,
                height: Math.max(0,
                    bounds.height - DEV_IPHONE_STATUS_H - DEV_IPHONE_HOME_H)
            }
        }
    ];
}

/**
 * Builds the mobile-iphone ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for iPhone frames.
 */
function buildMobileIphoneShape(): ShapeDefinition
{
    return {
        type: "mobile-iphone",
        category: DEV_CATEGORY,
        label: "iPhone",
        icon: "bi-phone",
        defaultSize: { w: 375, h: 812 },
        minSize: { w: 200, h: 400 },
        render: renderMobileIphone,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => rectHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => mobileIphoneTextRegions(bounds),
        getOutlinePath: (bounds: Rect) =>
            devRoundedRectPath(
                bounds.x, bounds.y, bounds.width, bounds.height,
                DEV_IPHONE_RADIUS
            )
    };
}

// ============================================================================
// MOBILE ANDROID (360x800)
// ============================================================================

/** Corner radius of the Android outer frame. */
const DEV_ANDROID_RADIUS = 24;

/** Height of the Android status bar. */
const DEV_ANDROID_STATUS_H = 24;

/** Height of the Android navigation bar. */
const DEV_ANDROID_NAV_H = 48;

/**
 * Renders the Android status bar with time and icons.
 *
 * @param g - Parent SVG group.
 * @param x - Left coordinate.
 * @param y - Top coordinate.
 * @param w - Width of the frame.
 */
function renderAndroidStatusBar(
    g: SVGElement,
    x: number,
    y: number,
    w: number): void
{
    const statusBg = svgCreate("rect", {
        x: String(x + 4), y: String(y + 4),
        width: String(w - 8), height: String(DEV_ANDROID_STATUS_H),
        fill: DEV_DEVICE_BG
    });

    g.appendChild(statusBg);

    const timeText = svgCreate("text", {
        x: String(x + 14), y: String(y + 20),
        "font-size": "10", fill: DEV_TEXT_LIGHT
    });

    timeText.textContent = "12:00";
    g.appendChild(timeText);
}

/**
 * Renders Android navigation bar buttons (back, home, recents).
 *
 * @param g - Parent SVG group.
 * @param cx - Centre X of the frame.
 * @param navY - Top Y of the navigation bar.
 */
function renderAndroidNavBar(
    g: SVGElement,
    cx: number,
    navY: number): void
{
    const btnY = navY + (DEV_ANDROID_NAV_H / 2);
    const btnSpacing = 40;

    const triangle = svgCreate("polygon", {
        points: `${cx - btnSpacing - 6},${btnY + 5} ` +
                `${cx - btnSpacing + 6},${btnY} ` +
                `${cx - btnSpacing - 6},${btnY - 5}`,
        fill: DEV_TEXT_LIGHT
    });

    g.appendChild(triangle);

    const circle = svgCreate("circle", {
        cx: String(cx), cy: String(btnY),
        r: "8", fill: "none",
        stroke: DEV_TEXT_LIGHT, "stroke-width": "1.5"
    });

    g.appendChild(circle);

    const square = svgCreate("rect", {
        x: String(cx + btnSpacing - 7), y: String(btnY - 7),
        width: "14", height: "14",
        fill: "none",
        stroke: DEV_TEXT_LIGHT, "stroke-width": "1.5"
    });

    g.appendChild(square);
}

/**
 * Renders an Android phone frame in clean mode.
 *
 * @param ctx - Shape render context.
 * @returns SVG group with detailed Android chrome.
 */
function renderMobileAndroidClean(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    const cx = b.x + (b.width / 2);

    devMarkContainer(g);

    const frame = svgCreate("path", {
        d: devRoundedRectPath(b.x, b.y, b.width, b.height, DEV_ANDROID_RADIUS),
        fill: DEV_DEVICE_BG, stroke: "#444", "stroke-width": "2"
    });

    g.appendChild(frame);

    const contentTop = b.y + DEV_ANDROID_STATUS_H + 4;
    const contentH = b.height - DEV_ANDROID_STATUS_H - DEV_ANDROID_NAV_H - 8;

    const screen = svgCreate("rect", {
        x: String(b.x + 4), y: String(contentTop),
        width: String(b.width - 8),
        height: String(Math.max(0, contentH)),
        fill: DEV_CONTENT_BG
    });

    g.appendChild(screen);
    renderAndroidStatusBar(g, b.x, b.y, b.width);
    renderAndroidNavBar(g, cx, b.y + b.height - DEV_ANDROID_NAV_H);

    return g;
}

/**
 * Renders an Android phone frame in sketch mode.
 *
 * @param ctx - Shape render context.
 * @returns SVG group with simplified Android outline.
 */
function renderMobileAndroidSketch(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    devMarkContainer(g);

    const frame = svgCreate("path", {
        d: devRoundedRectPath(b.x, b.y, b.width, b.height, DEV_ANDROID_RADIUS)
    });

    devApplySketchStroke(frame);
    g.appendChild(frame);

    const statusLine = svgCreate("line", {
        x1: String(b.x + 10), y1: String(b.y + DEV_ANDROID_STATUS_H + 4),
        x2: String(b.x + b.width - 10), y2: String(b.y + DEV_ANDROID_STATUS_H + 4)
    });

    devApplySketchStroke(statusLine);
    g.appendChild(statusLine);

    const navLine = svgCreate("line", {
        x1: String(b.x + 10), y1: String(b.y + b.height - DEV_ANDROID_NAV_H),
        x2: String(b.x + b.width - 10), y2: String(b.y + b.height - DEV_ANDROID_NAV_H)
    });

    devApplySketchStroke(navLine);
    g.appendChild(navLine);

    const label = svgCreate("text", {
        x: String(b.x + 20), y: String(b.y + 18),
        "font-size": "10", fill: DEV_SKETCH_STROKE
    });

    label.textContent = "[Android]";
    g.appendChild(label);

    return g;
}

/**
 * Renders an Android phone frame, delegating by render style.
 *
 * @param ctx - Shape render context.
 * @returns SVG group representing the Android frame.
 */
function renderMobileAndroid(ctx: ShapeRenderContext): SVGElement
{
    if (devIsSketch(ctx))
    {
        return renderMobileAndroidSketch(ctx);
    }

    return renderMobileAndroidClean(ctx);
}

/**
 * Returns the content region for an Android phone frame.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single "content" region.
 */
function mobileAndroidTextRegions(bounds: Rect): TextRegion[]
{
    const contentTop = DEV_ANDROID_STATUS_H + 4;
    const contentH = bounds.height - DEV_ANDROID_STATUS_H - DEV_ANDROID_NAV_H - 8;

    return [
        {
            id: "content",
            bounds: {
                x: bounds.x + 4,
                y: bounds.y + contentTop,
                width: bounds.width - 8,
                height: Math.max(0, contentH)
            }
        }
    ];
}

/**
 * Builds the mobile-android ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for Android phone frames.
 */
function buildMobileAndroidShape(): ShapeDefinition
{
    return {
        type: "mobile-android",
        category: DEV_CATEGORY,
        label: "Android Phone",
        icon: "bi-phone",
        defaultSize: { w: 360, h: 800 },
        minSize: { w: 200, h: 400 },
        render: renderMobileAndroid,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => rectHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => mobileAndroidTextRegions(bounds),
        getOutlinePath: (bounds: Rect) =>
            devRoundedRectPath(
                bounds.x, bounds.y, bounds.width, bounds.height,
                DEV_ANDROID_RADIUS
            )
    };
}

// ============================================================================
// TABLET IPAD (768x1024)
// ============================================================================

/** Corner radius of the iPad outer frame. */
const DEV_IPAD_RADIUS = 18;

/** Bezel width of the iPad frame. */
const DEV_IPAD_BEZEL = 20;

/**
 * Renders an iPad frame in clean mode.
 *
 * @param ctx - Shape render context.
 * @returns SVG group with detailed iPad chrome.
 */
function renderTabletIpadClean(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    devMarkContainer(g);

    const frame = svgCreate("path", {
        d: devRoundedRectPath(b.x, b.y, b.width, b.height, DEV_IPAD_RADIUS),
        fill: DEV_DEVICE_BG, stroke: "#555", "stroke-width": "1.5"
    });

    g.appendChild(frame);

    const screenX = b.x + DEV_IPAD_BEZEL;
    const screenY = b.y + DEV_IPAD_BEZEL;
    const screenW = b.width - (2 * DEV_IPAD_BEZEL);
    const screenH = b.height - (2 * DEV_IPAD_BEZEL);

    const screen = svgCreate("rect", {
        x: String(screenX), y: String(screenY),
        width: String(Math.max(0, screenW)),
        height: String(Math.max(0, screenH)),
        rx: "4", ry: "4",
        fill: DEV_CONTENT_BG
    });

    g.appendChild(screen);

    const camR = 3;
    const camera = svgCreate("circle", {
        cx: String(b.x + (b.width / 2)),
        cy: String(b.y + (DEV_IPAD_BEZEL / 2)),
        r: String(camR), fill: "#444"
    });

    g.appendChild(camera);

    return g;
}

/**
 * Renders an iPad frame in sketch mode.
 *
 * @param ctx - Shape render context.
 * @returns SVG group with simplified iPad outline.
 */
function renderTabletIpadSketch(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    devMarkContainer(g);

    const frame = svgCreate("path", {
        d: devRoundedRectPath(b.x, b.y, b.width, b.height, DEV_IPAD_RADIUS)
    });

    devApplySketchStroke(frame);
    g.appendChild(frame);

    const inner = devInsetRect(b, DEV_IPAD_BEZEL);
    const innerRect = svgCreate("rect", {
        x: String(inner.x), y: String(inner.y),
        width: String(inner.width), height: String(inner.height)
    });

    devApplySketchStroke(innerRect);
    g.appendChild(innerRect);

    const label = svgCreate("text", {
        x: String(b.x + 10), y: String(b.y + 14),
        "font-size": "10", fill: DEV_SKETCH_STROKE
    });

    label.textContent = "[iPad]";
    g.appendChild(label);

    return g;
}

/**
 * Renders an iPad frame, delegating by render style.
 *
 * @param ctx - Shape render context.
 * @returns SVG group representing the iPad frame.
 */
function renderTabletIpad(ctx: ShapeRenderContext): SVGElement
{
    if (devIsSketch(ctx))
    {
        return renderTabletIpadSketch(ctx);
    }

    return renderTabletIpadClean(ctx);
}

/**
 * Returns the content region for an iPad frame.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single "content" region.
 */
function tabletIpadTextRegions(bounds: Rect): TextRegion[]
{
    return [
        {
            id: "content",
            bounds: {
                x: bounds.x + DEV_IPAD_BEZEL,
                y: bounds.y + DEV_IPAD_BEZEL,
                width: Math.max(0, bounds.width - (2 * DEV_IPAD_BEZEL)),
                height: Math.max(0, bounds.height - (2 * DEV_IPAD_BEZEL))
            }
        }
    ];
}

/**
 * Builds the tablet-ipad ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for iPad frames.
 */
function buildTabletIpadShape(): ShapeDefinition
{
    return {
        type: "tablet-ipad",
        category: DEV_CATEGORY,
        label: "iPad",
        icon: "bi-tablet",
        defaultSize: { w: 768, h: 1024 },
        minSize: { w: 300, h: 400 },
        render: renderTabletIpad,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => rectHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => tabletIpadTextRegions(bounds),
        getOutlinePath: (bounds: Rect) =>
            devRoundedRectPath(
                bounds.x, bounds.y, bounds.width, bounds.height,
                DEV_IPAD_RADIUS
            )
    };
}

// ============================================================================
// DESKTOP WINDOW (600x400)
// ============================================================================

/** Height of the generic desktop window title bar. */
const DEV_DESKTOP_TITLEBAR_H = 32;

/**
 * Renders generic window control buttons (close, min, max).
 *
 * @param g - Parent SVG group.
 * @param x - Right-aligned starting X.
 * @param cy - Centre Y of the title bar.
 */
function renderDesktopWindowControls(
    g: SVGElement,
    x: number,
    cy: number): void
{
    const btnSize = 10;
    const spacing = 20;
    const colours = [DEV_BTN_CLOSE, DEV_BTN_MINIMISE, DEV_BTN_MAXIMISE];
    const startX = x - (colours.length * spacing);

    for (let i = 0; i < colours.length; i++)
    {
        const rect = svgCreate("rect", {
            x: String(startX + (i * spacing)),
            y: String(cy - (btnSize / 2)),
            width: String(btnSize), height: String(btnSize),
            rx: "1", ry: "1",
            fill: colours[i]
        });

        g.appendChild(rect);
    }
}

/**
 * Renders a generic desktop window in clean mode.
 *
 * @param ctx - Shape render context.
 * @returns SVG group with desktop window chrome.
 */
function renderDesktopWindowClean(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    devMarkContainer(g);

    const outerRect = svgCreate("rect", {
        x: String(b.x), y: String(b.y),
        width: String(b.width), height: String(b.height),
        fill: DEV_CONTENT_BG,
        stroke: "#bdc3c7", "stroke-width": "1"
    });

    g.appendChild(outerRect);

    const titleBar = svgCreate("rect", {
        x: String(b.x), y: String(b.y),
        width: String(b.width), height: String(DEV_DESKTOP_TITLEBAR_H),
        fill: DEV_TITLEBAR_BG
    });

    g.appendChild(titleBar);

    const titleLabel = svgCreate("text", {
        x: String(b.x + 12), y: String(b.y + 21),
        "font-size": "12", fill: DEV_TEXT_DARK
    });

    titleLabel.textContent = "Window";
    g.appendChild(titleLabel);

    const btnCy = b.y + (DEV_DESKTOP_TITLEBAR_H / 2);

    renderDesktopWindowControls(g, b.x + b.width - 10, btnCy);

    return g;
}

/**
 * Renders a generic desktop window in sketch mode.
 *
 * @param ctx - Shape render context.
 * @returns SVG group with simplified window outline.
 */
function renderDesktopWindowSketch(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    devMarkContainer(g);

    const outerRect = svgCreate("rect", {
        x: String(b.x), y: String(b.y),
        width: String(b.width), height: String(b.height)
    });

    devApplySketchStroke(outerRect);
    g.appendChild(outerRect);

    const divider = svgCreate("line", {
        x1: String(b.x), y1: String(b.y + DEV_DESKTOP_TITLEBAR_H),
        x2: String(b.x + b.width), y2: String(b.y + DEV_DESKTOP_TITLEBAR_H)
    });

    devApplySketchStroke(divider);
    g.appendChild(divider);

    const label = svgCreate("text", {
        x: String(b.x + 10), y: String(b.y + 21),
        "font-size": "11", fill: DEV_SKETCH_STROKE
    });

    label.textContent = "[Window]";
    g.appendChild(label);

    return g;
}

/**
 * Renders a generic desktop window, delegating by render style.
 *
 * @param ctx - Shape render context.
 * @returns SVG group representing the desktop window.
 */
function renderDesktopWindow(ctx: ShapeRenderContext): SVGElement
{
    if (devIsSketch(ctx))
    {
        return renderDesktopWindowSketch(ctx);
    }

    return renderDesktopWindowClean(ctx);
}

/**
 * Returns the content region for a desktop window.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single "content" region below the title bar.
 */
function desktopWindowTextRegions(bounds: Rect): TextRegion[]
{
    return [
        {
            id: "content",
            bounds: {
                x: bounds.x + 1,
                y: bounds.y + DEV_DESKTOP_TITLEBAR_H,
                width: bounds.width - 2,
                height: Math.max(0,
                    bounds.height - DEV_DESKTOP_TITLEBAR_H - 1)
            }
        }
    ];
}

/**
 * Builds the desktop-window ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for generic desktop windows.
 */
function buildDesktopWindowShape(): ShapeDefinition
{
    return {
        type: "desktop-window",
        category: DEV_CATEGORY,
        label: "Desktop Window",
        icon: "bi-window-stack",
        defaultSize: { w: 600, h: 400 },
        minSize: { w: 200, h: 100 },
        render: renderDesktopWindow,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => rectHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => desktopWindowTextRegions(bounds),
        getOutlinePath: (bounds: Rect) => devRectOutlinePath(bounds)
    };
}

// ============================================================================
// DESKTOP MACOS (600x400)
// ============================================================================

/** Height of the macOS title bar. */
const DEV_MACOS_TITLEBAR_H = 28;

/** Radius of macOS traffic light buttons. */
const DEV_MACOS_BTN_R = 6;

/**
 * Renders macOS traffic light buttons (close, minimise, maximise).
 *
 * @param g - Parent SVG group.
 * @param x - Left X of the title bar.
 * @param cy - Centre Y of the title bar.
 */
function renderMacosTrafficLights(
    g: SVGElement,
    x: number,
    cy: number): void
{
    const colours = [DEV_BTN_CLOSE, DEV_BTN_MINIMISE, DEV_BTN_MAXIMISE];
    const startX = x + 14;
    const spacing = 20;

    for (let i = 0; i < colours.length; i++)
    {
        const circle = svgCreate("circle", {
            cx: String(startX + (i * spacing)),
            cy: String(cy),
            r: String(DEV_MACOS_BTN_R),
            fill: colours[i]
        });

        g.appendChild(circle);
    }
}

/**
 * Renders a macOS window in clean mode.
 *
 * @param ctx - Shape render context.
 * @returns SVG group with macOS window chrome.
 */
function renderDesktopMacosClean(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    const radius = 8;

    devMarkContainer(g);

    const outerPath = svgCreate("path", {
        d: devRoundedRectPath(b.x, b.y, b.width, b.height, radius),
        fill: DEV_CONTENT_BG,
        stroke: "#c0c0c0", "stroke-width": "1"
    });

    g.appendChild(outerPath);

    const titleBar = svgCreate("rect", {
        x: String(b.x), y: String(b.y),
        width: String(b.width), height: String(DEV_MACOS_TITLEBAR_H),
        fill: DEV_TITLEBAR_BG
    });

    g.appendChild(titleBar);

    const titleCy = b.y + (DEV_MACOS_TITLEBAR_H / 2);

    renderMacosTrafficLights(g, b.x, titleCy);

    const titleLabel = svgCreate("text", {
        x: String(b.x + (b.width / 2)),
        y: String(b.y + 18),
        "font-size": "12", fill: DEV_TEXT_DARK,
        "text-anchor": "middle"
    });

    titleLabel.textContent = "Untitled";
    g.appendChild(titleLabel);

    return g;
}

/**
 * Renders a macOS window in sketch mode.
 *
 * @param ctx - Shape render context.
 * @returns SVG group with simplified macOS outline.
 */
function renderDesktopMacosSketch(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    devMarkContainer(g);

    const frame = svgCreate("path", {
        d: devRoundedRectPath(b.x, b.y, b.width, b.height, 8)
    });

    devApplySketchStroke(frame);
    g.appendChild(frame);

    const divider = svgCreate("line", {
        x1: String(b.x), y1: String(b.y + DEV_MACOS_TITLEBAR_H),
        x2: String(b.x + b.width), y2: String(b.y + DEV_MACOS_TITLEBAR_H)
    });

    devApplySketchStroke(divider);
    g.appendChild(divider);

    const dots = svgCreate("text", {
        x: String(b.x + 14), y: String(b.y + 18),
        "font-size": "10", fill: DEV_SKETCH_STROKE
    });

    dots.textContent = "o o o";
    g.appendChild(dots);

    return g;
}

/**
 * Renders a macOS window, delegating by render style.
 *
 * @param ctx - Shape render context.
 * @returns SVG group representing the macOS window.
 */
function renderDesktopMacos(ctx: ShapeRenderContext): SVGElement
{
    if (devIsSketch(ctx))
    {
        return renderDesktopMacosSketch(ctx);
    }

    return renderDesktopMacosClean(ctx);
}

/**
 * Returns the content region for a macOS window.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single "content" region below the title bar.
 */
function desktopMacosTextRegions(bounds: Rect): TextRegion[]
{
    return [
        {
            id: "content",
            bounds: {
                x: bounds.x + 1,
                y: bounds.y + DEV_MACOS_TITLEBAR_H,
                width: bounds.width - 2,
                height: Math.max(0,
                    bounds.height - DEV_MACOS_TITLEBAR_H - 1)
            }
        }
    ];
}

/**
 * Builds the desktop-macos ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for macOS windows.
 */
function buildDesktopMacosShape(): ShapeDefinition
{
    return {
        type: "desktop-macos",
        category: DEV_CATEGORY,
        label: "macOS Window",
        icon: "bi-window-desktop",
        defaultSize: { w: 600, h: 400 },
        minSize: { w: 200, h: 100 },
        render: renderDesktopMacos,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => rectHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => desktopMacosTextRegions(bounds),
        getOutlinePath: (bounds: Rect) =>
            devRoundedRectPath(
                bounds.x, bounds.y, bounds.width, bounds.height, 8
            )
    };
}

// ============================================================================
// DIALOG MODAL (400x300)
// ============================================================================

/** Height of the dialog title bar. */
const DEV_DIALOG_TITLEBAR_H = 40;

/** Height of the dialog button row at the bottom. */
const DEV_DIALOG_BUTTON_H = 52;

/**
 * Renders a dialog title bar with a close button.
 *
 * @param g - Parent SVG group.
 * @param x - Left coordinate.
 * @param y - Top coordinate.
 * @param w - Width of the dialog.
 */
function renderDialogTitleBar(
    g: SVGElement,
    x: number,
    y: number,
    w: number): void
{
    const titleBar = svgCreate("rect", {
        x: String(x), y: String(y),
        width: String(w), height: String(DEV_DIALOG_TITLEBAR_H),
        fill: DEV_TITLEBAR_BG
    });

    g.appendChild(titleBar);

    const titleLabel = svgCreate("text", {
        x: String(x + 16), y: String(y + 26),
        "font-size": "13", "font-weight": "600",
        fill: DEV_TEXT_DARK
    });

    titleLabel.textContent = "Dialog Title";
    g.appendChild(titleLabel);

    const closeX = x + w - 28;
    const closeY = y + 12;
    const closeBtn = svgCreate("text", {
        x: String(closeX), y: String(closeY + 12),
        "font-size": "16", fill: DEV_TEXT_MUTED
    });

    closeBtn.textContent = "\u00D7";
    g.appendChild(closeBtn);
}

/**
 * Renders the dialog button row with OK and Cancel buttons.
 *
 * @param g - Parent SVG group.
 * @param x - Left coordinate.
 * @param y - Top coordinate of button row.
 * @param w - Width of the dialog.
 */
function renderDialogButtonRow(
    g: SVGElement,
    x: number,
    y: number,
    w: number): void
{
    const rowBg = svgCreate("rect", {
        x: String(x), y: String(y),
        width: String(w), height: String(DEV_DIALOG_BUTTON_H),
        fill: "#f8f9fa"
    });

    g.appendChild(rowBg);

    const divider = svgCreate("line", {
        x1: String(x), y1: String(y),
        x2: String(x + w), y2: String(y),
        stroke: DEV_BORDER_LIGHT, "stroke-width": "1"
    });

    g.appendChild(divider);

    renderDialogButton(g, x + w - 170, y + 12, 70, "Cancel", "#6c757d");
    renderDialogButton(g, x + w - 90, y + 12, 70, "OK", "#0d6efd");
}

/**
 * Renders a single dialog button.
 *
 * @param g - Parent SVG group.
 * @param x - Left coordinate of the button.
 * @param y - Top coordinate of the button.
 * @param w - Button width.
 * @param label - Button text.
 * @param colour - Button fill colour.
 */
function renderDialogButton(
    g: SVGElement,
    x: number,
    y: number,
    w: number,
    label: string,
    colour: string): void
{
    const btn = svgCreate("rect", {
        x: String(x), y: String(y),
        width: String(w), height: "28",
        rx: "4", ry: "4",
        fill: colour
    });

    g.appendChild(btn);

    const text = svgCreate("text", {
        x: String(x + (w / 2)), y: String(y + 18),
        "font-size": "12", fill: DEV_TEXT_LIGHT,
        "text-anchor": "middle"
    });

    text.textContent = label;
    g.appendChild(text);
}

/**
 * Renders a modal dialog in clean mode.
 *
 * @param ctx - Shape render context.
 * @returns SVG group with detailed dialog chrome.
 */
function renderDialogModalClean(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    const radius = 8;

    devMarkContainer(g);

    const shadow = svgCreate("rect", {
        x: String(b.x + 4), y: String(b.y + 4),
        width: String(b.width), height: String(b.height),
        rx: String(radius), ry: String(radius),
        fill: "rgba(0,0,0,0.15)"
    });

    g.appendChild(shadow);

    const frame = svgCreate("path", {
        d: devRoundedRectPath(b.x, b.y, b.width, b.height, radius),
        fill: DEV_CONTENT_BG,
        stroke: DEV_BORDER_LIGHT, "stroke-width": "1"
    });

    g.appendChild(frame);
    renderDialogTitleBar(g, b.x, b.y, b.width);

    const btnRowY = b.y + b.height - DEV_DIALOG_BUTTON_H;

    renderDialogButtonRow(g, b.x, btnRowY, b.width);

    return g;
}

/**
 * Renders a modal dialog in sketch mode.
 *
 * @param ctx - Shape render context.
 * @returns SVG group with simplified dialog outline.
 */
function renderDialogModalSketch(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    devMarkContainer(g);

    const frame = svgCreate("rect", {
        x: String(b.x), y: String(b.y),
        width: String(b.width), height: String(b.height)
    });

    devApplySketchStroke(frame);
    g.appendChild(frame);

    const titleLine = svgCreate("line", {
        x1: String(b.x), y1: String(b.y + DEV_DIALOG_TITLEBAR_H),
        x2: String(b.x + b.width), y2: String(b.y + DEV_DIALOG_TITLEBAR_H)
    });

    devApplySketchStroke(titleLine);
    g.appendChild(titleLine);

    const btnLine = svgCreate("line", {
        x1: String(b.x),
        y1: String(b.y + b.height - DEV_DIALOG_BUTTON_H),
        x2: String(b.x + b.width),
        y2: String(b.y + b.height - DEV_DIALOG_BUTTON_H)
    });

    devApplySketchStroke(btnLine);
    g.appendChild(btnLine);

    const label = svgCreate("text", {
        x: String(b.x + 10), y: String(b.y + 26),
        "font-size": "11", fill: DEV_SKETCH_STROKE
    });

    label.textContent = "[Dialog]";
    g.appendChild(label);

    return g;
}

/**
 * Renders a modal dialog, delegating by render style.
 *
 * @param ctx - Shape render context.
 * @returns SVG group representing the modal dialog.
 */
function renderDialogModal(ctx: ShapeRenderContext): SVGElement
{
    if (devIsSketch(ctx))
    {
        return renderDialogModalSketch(ctx);
    }

    return renderDialogModalClean(ctx);
}

/**
 * Returns the content region for a modal dialog.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single "content" region between title and buttons.
 */
function dialogModalTextRegions(bounds: Rect): TextRegion[]
{
    const contentH = bounds.height - DEV_DIALOG_TITLEBAR_H - DEV_DIALOG_BUTTON_H;

    return [
        {
            id: "content",
            bounds: {
                x: bounds.x + 1,
                y: bounds.y + DEV_DIALOG_TITLEBAR_H,
                width: bounds.width - 2,
                height: Math.max(0, contentH)
            }
        }
    ];
}

/**
 * Builds the dialog-modal ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for modal dialogs.
 */
function buildDialogModalShape(): ShapeDefinition
{
    return {
        type: "dialog-modal",
        category: DEV_CATEGORY,
        label: "Modal Dialog",
        icon: "bi-window-plus",
        defaultSize: { w: 400, h: 300 },
        minSize: { w: 200, h: 150 },
        render: renderDialogModal,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => rectHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => dialogModalTextRegions(bounds),
        getOutlinePath: (bounds: Rect) =>
            devRoundedRectPath(
                bounds.x, bounds.y, bounds.width, bounds.height, 8
            )
    };
}

// ============================================================================
// CARD CONTAINER (350x250)
// ============================================================================

/** Height of the card header. */
const DEV_CARD_HEADER_H = 42;

/**
 * Renders a Bootstrap card container in clean mode.
 *
 * @param ctx - Shape render context.
 * @returns SVG group with card chrome.
 */
function renderCardContainerClean(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    const radius = 4;

    devMarkContainer(g);

    const frame = svgCreate("path", {
        d: devRoundedRectPath(b.x, b.y, b.width, b.height, radius),
        fill: DEV_CONTENT_BG,
        stroke: DEV_BORDER_LIGHT, "stroke-width": "1"
    });

    g.appendChild(frame);

    const header = svgCreate("rect", {
        x: String(b.x), y: String(b.y),
        width: String(b.width), height: String(DEV_CARD_HEADER_H),
        fill: "#f8f9fa"
    });

    g.appendChild(header);

    const headerDivider = svgCreate("line", {
        x1: String(b.x), y1: String(b.y + DEV_CARD_HEADER_H),
        x2: String(b.x + b.width), y2: String(b.y + DEV_CARD_HEADER_H),
        stroke: DEV_BORDER_LIGHT, "stroke-width": "1"
    });

    g.appendChild(headerDivider);

    const headerLabel = svgCreate("text", {
        x: String(b.x + 16), y: String(b.y + 27),
        "font-size": "13", "font-weight": "600",
        fill: DEV_TEXT_DARK
    });

    headerLabel.textContent = "Card Title";
    g.appendChild(headerLabel);

    return g;
}

/**
 * Renders a Bootstrap card container in sketch mode.
 *
 * @param ctx - Shape render context.
 * @returns SVG group with simplified card outline.
 */
function renderCardContainerSketch(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    devMarkContainer(g);

    const frame = svgCreate("rect", {
        x: String(b.x), y: String(b.y),
        width: String(b.width), height: String(b.height)
    });

    devApplySketchStroke(frame);
    g.appendChild(frame);

    const divider = svgCreate("line", {
        x1: String(b.x), y1: String(b.y + DEV_CARD_HEADER_H),
        x2: String(b.x + b.width), y2: String(b.y + DEV_CARD_HEADER_H)
    });

    devApplySketchStroke(divider);
    g.appendChild(divider);

    const label = svgCreate("text", {
        x: String(b.x + 10), y: String(b.y + 27),
        "font-size": "11", fill: DEV_SKETCH_STROKE
    });

    label.textContent = "[Card]";
    g.appendChild(label);

    return g;
}

/**
 * Renders a card container, delegating by render style.
 *
 * @param ctx - Shape render context.
 * @returns SVG group representing the card.
 */
function renderCardContainer(ctx: ShapeRenderContext): SVGElement
{
    if (devIsSketch(ctx))
    {
        return renderCardContainerSketch(ctx);
    }

    return renderCardContainerClean(ctx);
}

/**
 * Returns the content region for a card container.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single "content" region below the header.
 */
function cardContainerTextRegions(bounds: Rect): TextRegion[]
{
    return [
        {
            id: "content",
            bounds: {
                x: bounds.x + 1,
                y: bounds.y + DEV_CARD_HEADER_H,
                width: bounds.width - 2,
                height: Math.max(0,
                    bounds.height - DEV_CARD_HEADER_H - 1)
            }
        }
    ];
}

/**
 * Builds the card-container ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for Bootstrap cards.
 */
function buildCardContainerShape(): ShapeDefinition
{
    return {
        type: "card-container",
        category: DEV_CATEGORY,
        label: "Card",
        icon: "bi-card-heading",
        defaultSize: { w: 350, h: 250 },
        minSize: { w: 150, h: 100 },
        render: renderCardContainer,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => rectHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => cardContainerTextRegions(bounds),
        getOutlinePath: (bounds: Rect) => devRectOutlinePath(bounds)
    };
}

// ============================================================================
// SIDEBAR PANEL (250x500)
// ============================================================================

/** Height of the sidebar panel title area. */
const DEV_SIDEBAR_TITLE_H = 40;

/**
 * Renders a sidebar panel in clean mode.
 *
 * @param ctx - Shape render context.
 * @returns SVG group with sidebar chrome.
 */
function renderSidebarPanelClean(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    devMarkContainer(g);

    const frame = svgCreate("rect", {
        x: String(b.x), y: String(b.y),
        width: String(b.width), height: String(b.height),
        fill: DEV_CONTENT_BG,
        stroke: DEV_BORDER_LIGHT, "stroke-width": "1"
    });

    g.appendChild(frame);

    const titleBg = svgCreate("rect", {
        x: String(b.x), y: String(b.y),
        width: String(b.width), height: String(DEV_SIDEBAR_TITLE_H),
        fill: "#f8f9fa"
    });

    g.appendChild(titleBg);

    const titleDivider = svgCreate("line", {
        x1: String(b.x), y1: String(b.y + DEV_SIDEBAR_TITLE_H),
        x2: String(b.x + b.width), y2: String(b.y + DEV_SIDEBAR_TITLE_H),
        stroke: DEV_BORDER_LIGHT, "stroke-width": "1"
    });

    g.appendChild(titleDivider);

    const titleLabel = svgCreate("text", {
        x: String(b.x + 12), y: String(b.y + 26),
        "font-size": "13", "font-weight": "600",
        fill: DEV_TEXT_DARK
    });

    titleLabel.textContent = "Sidebar";
    g.appendChild(titleLabel);

    return g;
}

/**
 * Renders a sidebar panel in sketch mode.
 *
 * @param ctx - Shape render context.
 * @returns SVG group with simplified sidebar outline.
 */
function renderSidebarPanelSketch(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    devMarkContainer(g);

    const frame = svgCreate("rect", {
        x: String(b.x), y: String(b.y),
        width: String(b.width), height: String(b.height)
    });

    devApplySketchStroke(frame);
    g.appendChild(frame);

    const divider = svgCreate("line", {
        x1: String(b.x), y1: String(b.y + DEV_SIDEBAR_TITLE_H),
        x2: String(b.x + b.width), y2: String(b.y + DEV_SIDEBAR_TITLE_H)
    });

    devApplySketchStroke(divider);
    g.appendChild(divider);

    const label = svgCreate("text", {
        x: String(b.x + 10), y: String(b.y + 26),
        "font-size": "11", fill: DEV_SKETCH_STROKE
    });

    label.textContent = "[Sidebar]";
    g.appendChild(label);

    return g;
}

/**
 * Renders a sidebar panel, delegating by render style.
 *
 * @param ctx - Shape render context.
 * @returns SVG group representing the sidebar.
 */
function renderSidebarPanel(ctx: ShapeRenderContext): SVGElement
{
    if (devIsSketch(ctx))
    {
        return renderSidebarPanelSketch(ctx);
    }

    return renderSidebarPanelClean(ctx);
}

/**
 * Returns the content region for a sidebar panel.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single "content" region below the title.
 */
function sidebarPanelTextRegions(bounds: Rect): TextRegion[]
{
    return [
        {
            id: "content",
            bounds: {
                x: bounds.x + 1,
                y: bounds.y + DEV_SIDEBAR_TITLE_H,
                width: bounds.width - 2,
                height: Math.max(0,
                    bounds.height - DEV_SIDEBAR_TITLE_H - 1)
            }
        }
    ];
}

/**
 * Builds the sidebar-panel ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for sidebar panels.
 */
function buildSidebarPanelShape(): ShapeDefinition
{
    return {
        type: "sidebar-panel",
        category: DEV_CATEGORY,
        label: "Sidebar Panel",
        icon: "bi-layout-sidebar",
        defaultSize: { w: 250, h: 500 },
        minSize: { w: 150, h: 200 },
        render: renderSidebarPanel,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => rectHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => sidebarPanelTextRegions(bounds),
        getOutlinePath: (bounds: Rect) => devRectOutlinePath(bounds)
    };
}

// ============================================================================
// NAVBAR (800x60)
// ============================================================================

/** Padding for the navbar label area. */
const DEV_NAVBAR_PAD = 12;

/**
 * Renders a navigation bar in clean mode.
 *
 * @param ctx - Shape render context.
 * @returns SVG group with navbar chrome.
 */
function renderNavbarClean(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    devMarkContainer(g);

    const bg = svgCreate("rect", {
        x: String(b.x), y: String(b.y),
        width: String(b.width), height: String(b.height),
        fill: DEV_NAV_BG
    });

    g.appendChild(bg);

    const brandLabel = svgCreate("text", {
        x: String(b.x + 16), y: String(b.y + (b.height / 2) + 5),
        "font-size": "14", "font-weight": "700",
        fill: DEV_TEXT_LIGHT
    });

    brandLabel.textContent = "Brand";
    g.appendChild(brandLabel);

    renderNavbarLinks(g, b);

    return g;
}

/**
 * Renders placeholder navigation links in the navbar.
 *
 * @param g - Parent SVG group.
 * @param b - Navbar bounds.
 */
function renderNavbarLinks(g: SVGElement, b: Rect): void
{
    const links = ["Home", "About", "Contact"];
    const startX = b.x + 100;
    const cy = b.y + (b.height / 2) + 5;

    for (let i = 0; i < links.length; i++)
    {
        const linkText = svgCreate("text", {
            x: String(startX + (i * 70)),
            y: String(cy),
            "font-size": "12",
            fill: "rgba(255,255,255,0.7)"
        });

        linkText.textContent = links[i];
        g.appendChild(linkText);
    }
}

/**
 * Renders a navigation bar in sketch mode.
 *
 * @param ctx - Shape render context.
 * @returns SVG group with simplified navbar outline.
 */
function renderNavbarSketch(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    devMarkContainer(g);

    const frame = svgCreate("rect", {
        x: String(b.x), y: String(b.y),
        width: String(b.width), height: String(b.height)
    });

    devApplySketchStroke(frame);
    g.appendChild(frame);

    const label = svgCreate("text", {
        x: String(b.x + 10), y: String(b.y + (b.height / 2) + 4),
        "font-size": "11", fill: DEV_SKETCH_STROKE
    });

    label.textContent = "[Navbar]";
    g.appendChild(label);

    return g;
}

/**
 * Renders a navigation bar, delegating by render style.
 *
 * @param ctx - Shape render context.
 * @returns SVG group representing the navbar.
 */
function renderNavbar(ctx: ShapeRenderContext): SVGElement
{
    if (devIsSketch(ctx))
    {
        return renderNavbarSketch(ctx);
    }

    return renderNavbarClean(ctx);
}

/**
 * Returns the content region for a navbar.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single "content" region.
 */
function navbarTextRegions(bounds: Rect): TextRegion[]
{
    return [
        {
            id: "content",
            bounds: {
                x: bounds.x + DEV_NAVBAR_PAD,
                y: bounds.y + 2,
                width: Math.max(0, bounds.width - (2 * DEV_NAVBAR_PAD)),
                height: Math.max(0, bounds.height - 4)
            }
        }
    ];
}

/**
 * Builds the navbar ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for navigation bars.
 */
function buildNavbarShape(): ShapeDefinition
{
    return {
        type: "navbar",
        category: DEV_CATEGORY,
        label: "Navigation Bar",
        icon: "bi-menu-button-wide",
        defaultSize: { w: 800, h: 60 },
        minSize: { w: 300, h: 40 },
        render: renderNavbar,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => rectHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => navbarTextRegions(bounds),
        getOutlinePath: (bounds: Rect) => devRectOutlinePath(bounds)
    };
}

// ============================================================================
// FOOTER (800x100)
// ============================================================================

/** Padding for the footer label area. */
const DEV_FOOTER_PAD = 16;

/**
 * Renders a page footer in clean mode.
 *
 * @param ctx - Shape render context.
 * @returns SVG group with footer chrome.
 */
function renderFooterClean(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    devMarkContainer(g);

    const bg = svgCreate("rect", {
        x: String(b.x), y: String(b.y),
        width: String(b.width), height: String(b.height),
        fill: DEV_NAV_BG
    });

    g.appendChild(bg);

    const topBorder = svgCreate("line", {
        x1: String(b.x), y1: String(b.y),
        x2: String(b.x + b.width), y2: String(b.y),
        stroke: "#495057", "stroke-width": "1"
    });

    g.appendChild(topBorder);

    const copyright = svgCreate("text", {
        x: String(b.x + 16), y: String(b.y + 30),
        "font-size": "12", fill: DEV_TEXT_MUTED
    });

    copyright.textContent = "\u00A9 2026 Company Name";
    g.appendChild(copyright);

    renderFooterLinks(g, b);

    return g;
}

/**
 * Renders placeholder footer links.
 *
 * @param g - Parent SVG group.
 * @param b - Footer bounds.
 */
function renderFooterLinks(g: SVGElement, b: Rect): void
{
    const links = ["Privacy", "Terms", "Contact"];
    const startX = b.x + b.width - 250;
    const linkY = b.y + 30;

    for (let i = 0; i < links.length; i++)
    {
        const linkText = svgCreate("text", {
            x: String(startX + (i * 80)),
            y: String(linkY),
            "font-size": "12",
            fill: "rgba(255,255,255,0.6)"
        });

        linkText.textContent = links[i];
        g.appendChild(linkText);
    }
}

/**
 * Renders a page footer in sketch mode.
 *
 * @param ctx - Shape render context.
 * @returns SVG group with simplified footer outline.
 */
function renderFooterSketch(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    devMarkContainer(g);

    const frame = svgCreate("rect", {
        x: String(b.x), y: String(b.y),
        width: String(b.width), height: String(b.height)
    });

    devApplySketchStroke(frame);
    g.appendChild(frame);

    const label = svgCreate("text", {
        x: String(b.x + 10), y: String(b.y + (b.height / 2) + 4),
        "font-size": "11", fill: DEV_SKETCH_STROKE
    });

    label.textContent = "[Footer]";
    g.appendChild(label);

    return g;
}

/**
 * Renders a page footer, delegating by render style.
 *
 * @param ctx - Shape render context.
 * @returns SVG group representing the footer.
 */
function renderFooter(ctx: ShapeRenderContext): SVGElement
{
    if (devIsSketch(ctx))
    {
        return renderFooterSketch(ctx);
    }

    return renderFooterClean(ctx);
}

/**
 * Returns the content region for a footer.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single "content" region.
 */
function footerTextRegions(bounds: Rect): TextRegion[]
{
    return [
        {
            id: "content",
            bounds: {
                x: bounds.x + DEV_FOOTER_PAD,
                y: bounds.y + 2,
                width: Math.max(0, bounds.width - (2 * DEV_FOOTER_PAD)),
                height: Math.max(0, bounds.height - 4)
            }
        }
    ];
}

/**
 * Builds the footer ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for page footers.
 */
function buildFooterShape(): ShapeDefinition
{
    return {
        type: "footer",
        category: DEV_CATEGORY,
        label: "Page Footer",
        icon: "bi-layout-text-window-reverse",
        defaultSize: { w: 800, h: 100 },
        minSize: { w: 300, h: 50 },
        render: renderFooter,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => rectHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => footerTextRegions(bounds),
        getOutlinePath: (bounds: Rect) => devRectOutlinePath(bounds)
    };
}

// ============================================================================
// REGISTRATION
// ============================================================================

/**
 * Registers all twelve device frame shapes with the given shape
 * registry. Shapes include browser windows, mobile devices, tablets,
 * desktop windows, dialogs, cards, sidebars, navbars, and footers.
 *
 * @param registry - The ShapeRegistry instance to populate.
 * @returns void
 */
export function registerDeviceStencils(registry: ShapeRegistry): void
{
    registry.register(buildBrowserChromeShape());
    registry.register(buildBrowserMinimalShape());
    registry.register(buildMobileIphoneShape());
    registry.register(buildMobileAndroidShape());
    registry.register(buildTabletIpadShape());
    registry.register(buildDesktopWindowShape());
    registry.register(buildDesktopMacosShape());
    registry.register(buildDialogModalShape());
    registry.register(buildCardContainerShape());
    registry.register(buildSidebarPanelShape());
    registry.register(buildNavbarShape());
    registry.register(buildFooterShape());

    logDevInfo(`Registered ${DEV_SHAPE_COUNT} device frame shapes`);
}
