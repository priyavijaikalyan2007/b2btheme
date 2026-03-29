/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: UndoStack
 * PURPOSE: Command-pattern undo/redo stack with merge window support.
 *    Consecutive mergeable commands of the same type within 500 ms are
 *    collapsed into a single entry so rapid edits (e.g. typing, dragging)
 *    produce one undoable unit.
 * RELATES: [[DiagramEngine]], [[EventBus]]
 * FLOW: [Engine Actions] -> [UndoStack.push()] -> [undo()/redo()]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// TYPES
// ============================================================================

/** A reversible command stored in the undo stack. */
export interface UndoCommand
{
    /** Command category (e.g. "move", "resize", "text-edit"). */
    type: string;

    /** Human-readable description for UI display. */
    label: string;

    /** Epoch milliseconds when the command was created. */
    timestamp: number;

    /** Reverses the effect of this command. */
    undo: () => void;

    /** Re-applies the effect of this command. */
    redo: () => void;

    /** Whether this command can be merged with the next same-type command. */
    mergeable: boolean;
}

/** Log prefix for all console messages from this module. */





/** Maximum number of commands retained in the stack. */
const MAX_ENTRIES = 200;

/** Maximum elapsed time (ms) for two commands to be merge-eligible. */
const MERGE_WINDOW_MS = 500;

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Pointer-based undo/redo stack implementing the command pattern.
 *
 * The pointer always points to the index of the last executed command.
 * A value of -1 means no commands have been executed. When a new
 * command is pushed after an undo, the forward (redo) history is
 * truncated.
 */
export class UndoStack
{
    /** Ordered list of commands. */
    private stack: UndoCommand[] = [];

    /**
     * Index of the current position in the stack.
     * -1 when empty or fully undone.
     */
    private pointer: number = -1;

    /**
     * Add a command to the stack.
     *
     * If the top command is mergeable, shares the same type, and was
     * created within the merge window, the two commands are merged
     * instead of adding a new entry. Otherwise, any forward redo
     * history is truncated and the command is appended.
     *
     * @param cmd - The command to push onto the stack.
     */
    public push(cmd: UndoCommand): void
    {
        if (this.tryMerge(cmd))
        {
            return;
        }

        this.truncateRedoHistory();
        this.stack.push(cmd);
        this.pointer = this.stack.length - 1;
        this.trimFromBottom();
    }

    /**
     * Undo the current command and move the pointer back.
     *
     * @returns true if an undo was performed, false if nothing to undo.
     */
    public undo(): boolean
    {
        if (!this.canUndo())
        {
            return false;
        }

        const cmd = this.stack[this.pointer];
        this.pointer -= 1;

        this.executeUndo(cmd);

        return true;
    }

    /**
     * Redo the next command and move the pointer forward.
     *
     * @returns true if a redo was performed, false if nothing to redo.
     */
    public redo(): boolean
    {
        if (!this.canRedo())
        {
            return false;
        }

        this.pointer += 1;
        const cmd = this.stack[this.pointer];

        this.executeRedo(cmd);

        return true;
    }

    /**
     * Check whether an undo operation is available.
     *
     * @returns true if the pointer is at a valid command.
     */
    public canUndo(): boolean
    {
        return this.pointer >= 0;
    }

    /**
     * Check whether a redo operation is available.
     *
     * @returns true if there are commands ahead of the pointer.
     */
    public canRedo(): boolean
    {
        return this.pointer < (this.stack.length - 1);
    }

    /**
     * Reset the stack, discarding all commands.
     */
    public clear(): void
    {
        this.stack = [];
        this.pointer = -1;
    }

    // ========================================================================
    // PRIVATE HELPERS
    // ========================================================================

    /**
     * Attempt to merge a new command with the top of the stack.
     *
     * Merge conditions: the top command must be mergeable, share the
     * same type, and fall within the merge time window.
     *
     * @param cmd - The incoming command to potentially merge.
     * @returns true if the merge was performed.
     */
    private tryMerge(cmd: UndoCommand): boolean
    {
        if (!this.canMerge(cmd))
        {
            return false;
        }

        const top = this.stack[this.pointer];

        // Compose undos: run new undo first, then old undo
        const previousUndo = top.undo;
        const newUndo = cmd.undo;

        top.undo = (): void =>
        {
            newUndo();
            previousUndo();
        };

        // Replace redo with the latest version
        top.redo = cmd.redo;
        top.timestamp = cmd.timestamp;
        top.label = cmd.label;

        return true;
    }

    /**
     * Check whether a command is eligible for merging with the top entry.
     *
     * @param cmd - The incoming command to test.
     * @returns true if merge conditions are met.
     */
    private canMerge(cmd: UndoCommand): boolean
    {
        if (this.pointer < 0)
        {
            return false;
        }

        // Only merge when pointer is at the top of the stack
        if (this.pointer !== (this.stack.length - 1))
        {
            return false;
        }

        const top = this.stack[this.pointer];

        if (!top.mergeable)
        {
            return false;
        }

        if (top.type !== cmd.type)
        {
            return false;
        }

        const elapsed = cmd.timestamp - top.timestamp;

        return elapsed <= MERGE_WINDOW_MS;
    }

    /**
     * Remove any commands ahead of the pointer.
     * Called when a new command is pushed after an undo.
     */
    private truncateRedoHistory(): void
    {
        if (this.pointer < (this.stack.length - 1))
        {
            this.stack.splice(this.pointer + 1);
        }
    }

    /**
     * Trim the oldest entries when the stack exceeds MAX_ENTRIES.
     * Adjusts the pointer to account for removed entries.
     */
    private trimFromBottom(): void
    {
        if (this.stack.length <= MAX_ENTRIES)
        {
            return;
        }

        const excess = this.stack.length - MAX_ENTRIES;

        this.stack.splice(0, excess);
        this.pointer -= excess;
    }

    /**
     * Execute a command's undo function with error handling.
     *
     * @param cmd - The command whose undo to execute.
     */
    private executeUndo(cmd: UndoCommand): void
    {
        try
        {
            cmd.undo();
        }
        catch (error)
        {
            logError(`Undo failed for "${cmd.label}":`,
                error
            );
        }
    }

    /**
     * Execute a command's redo function with error handling.
     *
     * @param cmd - The command whose redo to execute.
     */
    private executeRedo(cmd: UndoCommand): void
    {
        try
        {
            cmd.redo();
        }
        catch (error)
        {
            logError(`Redo failed for "${cmd.label}":`,
                error
            );
        }
    }
}
