/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f
 *
 * ⚓ TESTS: FileExplorer
 * Vitest unit tests for the FileExplorer component.
 * Covers: factory, DOM structure, show, destroy.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import
{
    FileExplorer,
    createFileExplorer,
} from "./fileexplorer";
import type { FileExplorerOptions, FileNode } from "./fileexplorer";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLElement;

function makeFileTree(): FileNode[]
{
    return [
        {
            id: "root",
            name: "Documents",
            type: "folder",
            children: [
                { id: "f1", name: "readme.md", type: "file" },
                { id: "f2", name: "report.pdf", type: "file" },
            ],
        },
    ];
}

function makeOptions(
    overrides?: Partial<FileExplorerOptions>
): FileExplorerOptions
{
    return {
        roots: makeFileTree(),
        ...overrides,
    };
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    container = document.createElement("div");
    container.id = "fe-test-container";
    document.body.appendChild(container);
});

afterEach(() =>
{
    container.remove();
});

// ============================================================================
// FACTORY
// ============================================================================

describe("FileExplorer factory", () =>
{
    test("Constructor_ValidOptions_CreatesInstance", () =>
    {
        const fe = new FileExplorer(makeOptions());
        expect(fe).toBeDefined();
        expect(fe.getElement()).toBeInstanceOf(HTMLElement);
        fe.destroy();
    });

    test("createFileExplorer_WithContainerId_MountsInContainer", () =>
    {
        const fe = createFileExplorer(
            "fe-test-container", makeOptions()
        );
        expect(
            container.querySelector(".fileexplorer")
        ).not.toBeNull();
        fe.destroy();
    });
});

// ============================================================================
// DOM STRUCTURE
// ============================================================================

describe("FileExplorer DOM", () =>
{
    test("RootElement_HasFileExplorerClass", () =>
    {
        const fe = new FileExplorer(makeOptions());
        fe.show("fe-test-container");
        expect(
            fe.getElement()?.classList.contains("fileexplorer")
        ).toBe(true);
        fe.destroy();
    });

    test("Show_RendersContentInContainer", () =>
    {
        const fe = new FileExplorer(makeOptions());
        fe.show("fe-test-container");
        expect(container.children.length).toBeGreaterThan(0);
        fe.destroy();
    });
});

// ============================================================================
// DESTROY
// ============================================================================

describe("FileExplorer destroy", () =>
{
    test("Destroy_RemovesFromContainer", () =>
    {
        const fe = new FileExplorer(makeOptions());
        fe.show("fe-test-container");
        fe.destroy();
        expect(
            container.querySelector(".fileexplorer")
        ).toBeNull();
    });

    test("Destroy_CalledTwice_IsIdempotent", () =>
    {
        const fe = new FileExplorer(makeOptions());
        fe.show("fe-test-container");
        fe.destroy();
        expect(() => fe.destroy()).not.toThrow();
    });
});
