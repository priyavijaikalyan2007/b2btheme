/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: CodeEditor / CodeMirrorMock
 * 📜 PURPOSE: The smallest CodeMirror 6 that CodeEditor will mount against.
 *    ADR-200 and ADR-201.
 * 🔗 RELATES: [[CodeEditor]], [[NoFallbackCode]]
 * ----------------------------------------------------------------------------
 *
 * WHY THIS EXISTS. Until 2026-10-18 nothing in the suite had ever mounted
 * CodeEditor with CodeMirror present. Every test ran against an editor that
 * failed to detect it and is showing a missing-dependency notice, so the
 * whole mounted half of the component was unreachable, and eight tests were
 * named `_DoesNotThrow` because doing nothing was all it could do.
 *
 * WHAT IT DELIBERATELY DOES NOT PUBLISH. `undo`, `redo`, `indentSelection`
 * and `setDiagnostics`. Their absence is the condition several tests are
 * written for: an editor that mounts and looks perfect while one module is
 * missing. Pass extra names to `installCodeMirrorMock` to add them.
 *
 * ALWAYS ASSERT THAT IT MOUNTED. The LaTeX editor's MathLive mock published
 * a global no code path consulted, and four tests passed against it for the
 * life of the component. `expect(editor.getEditorInstance()).not.toBeNull()`
 * is the cheap guard against repeating that.
 */

/** The globals a bare mount asks for by name. */
const MOUNT_GLOBALS = ["EditorView", "EditorState", "keymap", "lineNumbers"] as const;

/** Names this mock installed, so afterEach can take exactly those away. */
let installed: string[] = [];

/**
 * Publish a minimal CodeMirror on `window`.
 *
 * @param extra - Further globals to publish, for tests that need a
 *   capability this mock leaves out on purpose.
 */
export function installCodeMirrorMock(extra: Record<string, unknown> = {}): void
{
    const w = window as unknown as Record<string, unknown>;

    w.EditorState = { create: (cfg: unknown) => ({ doc: cfg, cfg }) };
    w.EditorView = class
    {
        public contentDOM = document.createElement("div");
        public state: unknown;

        constructor(cfg: { state: unknown; parent: HTMLElement })
        {
            this.state = cfg.state;
            const scroller = document.createElement("div");
            scroller.className = "cm-scroller";
            cfg.parent.appendChild(scroller);
        }

        public dispatch(): void { /* this mock records no transactions */ }

        public static updateListener = { of: (fn: unknown) => ({ fn }) };
        public static theme = (spec: unknown): unknown => ({ spec });
        public static lineWrapping = { ext: "lineWrapping" };
    };
    w.keymap = { of: (maps: unknown[]) => ({ keymap: maps }) };
    w.lineNumbers = (): unknown => ({ ext: "lineNumbers" });

    for (const [name, value] of Object.entries(extra)) { w[name] = value; }

    installed = [...MOUNT_GLOBALS, ...Object.keys(extra)];
}

/** Remove exactly what the last install published. */
export function removeCodeMirrorMock(): void
{
    const w = window as unknown as Record<string, unknown>;
    for (const name of installed) { delete w[name]; }
    installed = [];
}
