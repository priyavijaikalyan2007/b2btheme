/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: ToolManager
 * PURPOSE: Tool interface definition and tool lifecycle manager for the
 *    DiagramEngine canvas. Only one tool is active at a time — the manager
 *    handles activation, deactivation, and input dispatch.
 * RELATES: [[DiagramEngine]], [[SelectTool]], [[PanTool]]
 * FLOW: [Canvas Events] -> [ToolManager.dispatch*()] -> [Active Tool]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// TYPES
// ============================================================================

/**
 * Interface that all canvas tools must implement.
 * Tools are state machines — only one is active at a time.
 */
export interface Tool
{
    /** Unique tool name. */
    name: string;

    /** CSS cursor when this tool is active. */
    cursor: string;

    /** Called when the tool becomes active. */
    onActivate(): void;

    /** Called when the tool is deactivated. */
    onDeactivate(): void;

    /**
     * Handle mouse down in canvas coordinates.
     *
     * @param e - The originating mouse event.
     * @param canvasPos - Mouse position in canvas coordinate space.
     */
    onMouseDown(e: MouseEvent, canvasPos: Point): void;

    /**
     * Handle mouse move in canvas coordinates.
     *
     * @param e - The originating mouse event.
     * @param canvasPos - Mouse position in canvas coordinate space.
     */
    onMouseMove(e: MouseEvent, canvasPos: Point): void;

    /**
     * Handle mouse up in canvas coordinates.
     *
     * @param e - The originating mouse event.
     * @param canvasPos - Mouse position in canvas coordinate space.
     */
    onMouseUp(e: MouseEvent, canvasPos: Point): void;

    /**
     * Handle keyboard events.
     *
     * @param e - The originating keyboard event.
     */
    onKeyDown(e: KeyboardEvent): void;
}

/** Log prefix for all console messages from this module. */





// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Manages tool registration, activation, and input dispatch.
 *
 * Tools are registered by name and only one can be active at a time.
 * All canvas input events are routed through the manager to the
 * currently active tool.
 */
export class ToolManager
{
    /** Registry of all registered tools, keyed by name. */
    private readonly tools: Map<string, Tool> = new Map();

    /** Name of the currently active tool ("" when none). */
    private activeToolName: string = "";

    /** SVG canvas element for cursor styling. */
    private svgEl: SVGElement | null = null;

    /** Set the SVG canvas element for cursor updates. */
    public setSvgElement(svg: SVGElement): void
    {
        this.svgEl = svg;
    }

    /**
     * Register a tool with the manager.
     *
     * @param tool - The tool instance to register.
     */
    public register(tool: Tool): void
    {
        if (this.tools.has(tool.name))
        {
            logWarn(`Tool "${tool.name}" is already registered; replacing.`);
        }

        this.tools.set(tool.name, tool);
    }

    /**
     * Look up a registered tool by name.
     *
     * @param name - The tool name to find.
     * @returns The tool instance, or null if not registered.
     */
    public get(name: string): Tool | null
    {
        return this.tools.get(name) ?? null;
    }

    /**
     * Switch the active tool.
     *
     * Deactivates the current tool (if any) and activates the
     * requested tool. Logs a warning if the target is not registered.
     *
     * @param name - The name of the tool to activate.
     */
    public setActive(name: string): void
    {
        const nextTool = this.tools.get(name);

        if (!nextTool)
        {
            logWarn(`Tool "${name}" not found.`);
            return;
        }

        this.deactivateCurrent();
        this.activateTool(name, nextTool);
    }

    /**
     * Return the currently active tool instance.
     *
     * @returns The active tool, or null if none is active.
     */
    public getActive(): Tool | null
    {
        if (!this.activeToolName)
        {
            return null;
        }

        return this.tools.get(this.activeToolName) ?? null;
    }

    /**
     * Return the name of the currently active tool.
     *
     * @returns The active tool name, or empty string if none.
     */
    public getActiveName(): string
    {
        return this.activeToolName;
    }

    /** Returns a tool instance by name, or null. */
    public getToolByName(name: string): Tool | null
    {
        return this.tools.get(name) ?? null;
    }

    /**
     * Forward a mousedown event to the active tool.
     *
     * @param e - The originating mouse event.
     * @param pos - Mouse position in canvas coordinate space.
     */
    public dispatchMouseDown(e: MouseEvent, pos: Point): void
    {
        this.getActive()?.onMouseDown(e, pos);
    }

    /**
     * Forward a mousemove event to the active tool.
     *
     * @param e - The originating mouse event.
     * @param pos - Mouse position in canvas coordinate space.
     */
    public dispatchMouseMove(e: MouseEvent, pos: Point): void
    {
        this.getActive()?.onMouseMove(e, pos);
    }

    /**
     * Forward a mouseup event to the active tool.
     *
     * @param e - The originating mouse event.
     * @param pos - Mouse position in canvas coordinate space.
     */
    public dispatchMouseUp(e: MouseEvent, pos: Point): void
    {
        this.getActive()?.onMouseUp(e, pos);
    }

    /**
     * Forward a keydown event to the active tool.
     *
     * @param e - The originating keyboard event.
     */
    public dispatchKeyDown(e: KeyboardEvent): void
    {
        this.getActive()?.onKeyDown(e);
    }

    // ========================================================================
    // PRIVATE HELPERS
    // ========================================================================

    /**
     * Deactivate the currently active tool, if any.
     */
    private deactivateCurrent(): void
    {
        const current = this.getActive();

        if (current)
        {
            current.onDeactivate();
        }
    }

    /**
     * Activate a tool and update the active tool name.
     *
     * @param name - The tool name being activated.
     * @param tool - The tool instance to activate.
     */
    private activateTool(name: string, tool: Tool): void
    {
        this.activeToolName = name;
        tool.onActivate();
        this.applyCursor(tool.cursor);
    }

    /** Apply the tool's cursor to the SVG canvas element. */
    private applyCursor(cursor: string): void
    {
        if (this.svgEl)
        {
            this.svgEl.style.cursor = cursor;
        }
    }
}
