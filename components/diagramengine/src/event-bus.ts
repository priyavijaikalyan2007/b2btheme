/*
 * ----------------------------------------------------------------------------
 * COMPONENT: EventBus
 * PURPOSE: Publish/subscribe event system for internal DiagramEngine
 *    communication. Handlers are isolated — one failing handler does not
 *    block others.
 * RELATES: [[DiagramEngine]], [[UndoStack]]
 * FLOW: [Engine Subsystems] -> [EventBus.emit()] -> [Registered Handlers]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// TYPES
// ============================================================================

/** Callback signature for event handlers. */
export type EventHandler = (...args: unknown[]) => void;

/** Log prefix for all console messages from this module. */
const LOG_PREFIX = "[DiagramEngine]";

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * A lightweight publish/subscribe event bus.
 *
 * Handlers are stored in a Map of Sets, keyed by event name.
 * Each handler invocation is wrapped in try/catch so that a
 * failing subscriber does not prevent other subscribers from
 * receiving the event.
 */
export class EventBus
{
    /** Registry of event names to their handler sets. */
    private readonly handlers: Map<string, Set<EventHandler>> = new Map();

    /**
     * Register a handler for the given event.
     *
     * @param event - The event name to subscribe to.
     * @param handler - The callback to invoke when the event fires.
     */
    public on(event: string, handler: EventHandler): void
    {
        if (!this.handlers.has(event))
        {
            this.handlers.set(event, new Set());
        }

        this.handlers.get(event)!.add(handler);
    }

    /**
     * Remove a previously registered handler for the given event.
     *
     * @param event - The event name to unsubscribe from.
     * @param handler - The callback to remove.
     */
    public off(event: string, handler: EventHandler): void
    {
        const set = this.handlers.get(event);

        if (!set)
        {
            return;
        }

        set.delete(handler);

        if (set.size === 0)
        {
            this.handlers.delete(event);
        }
    }

    /**
     * Fire all handlers registered for the given event.
     *
     * Each handler is called inside a try/catch so that one
     * failing handler does not prevent the remaining handlers
     * from executing.
     *
     * @param event - The event name to emit.
     * @param args - Arguments forwarded to every handler.
     */
    public emit(event: string, ...args: unknown[]): void
    {
        const set = this.handlers.get(event);

        if (!set)
        {
            return;
        }

        for (const handler of set)
        {
            this.invokeHandler(event, handler, args);
        }
    }

    // ========================================================================
    // PRIVATE HELPERS
    // ========================================================================

    /**
     * Invoke a single handler inside a try/catch guard.
     *
     * @param event - Event name, used only for error logging.
     * @param handler - The callback to invoke.
     * @param args - Arguments to pass to the handler.
     */
    private invokeHandler(
        event: string,
        handler: EventHandler,
        args: unknown[]): void
    {
        try
        {
            handler(...args);
        }
        catch (error)
        {
            console.error(
                `${LOG_PREFIX} Handler for "${event}" threw an error:`,
                error
            );
        }
    }
}
