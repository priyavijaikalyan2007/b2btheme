/**
 * DOM test utilities for component testing.
 */

/** Create a test container div and append to body. */
export function createTestContainer(id = "test-container"): HTMLElement
{
    const el = document.createElement("div");
    el.id = id;
    el.setAttribute("data-testid", id);
    document.body.appendChild(el);
    return el;
}

/** Remove all test containers from the DOM. */
export function removeTestContainers(): void
{
    document.querySelectorAll("[data-testid]").forEach((el) => el.remove());
}

/** Query an element by CSS class within a root. */
export function queryByClass(
    root: HTMLElement,
    className: string
): HTMLElement | null
{
    return root.querySelector(`.${className}`) as HTMLElement | null;
}

/** Query all elements by CSS class within a root. */
export function queryAllByClass(
    root: HTMLElement,
    className: string
): HTMLElement[]
{
    return Array.from(root.querySelectorAll(`.${className}`)) as HTMLElement[];
}

/** Get an ARIA attribute value from an element. */
export function getAriaAttr(el: HTMLElement, name: string): string | null
{
    return el.getAttribute(`aria-${name}`);
}

/** Simulate a keyboard event on an element. */
export function simulateKey(
    el: HTMLElement,
    type: "keydown" | "keyup" | "keypress",
    key: string,
    modifiers: { ctrl?: boolean; shift?: boolean; alt?: boolean; meta?: boolean } = {}
): void
{
    el.dispatchEvent(new KeyboardEvent(type, {
        key,
        code: key,
        ctrlKey: modifiers.ctrl ?? false,
        shiftKey: modifiers.shift ?? false,
        altKey: modifiers.alt ?? false,
        metaKey: modifiers.meta ?? false,
        bubbles: true,
        cancelable: true,
    }));
}

/** Simulate a click event on an element. */
export function simulateClick(el: HTMLElement): void
{
    el.dispatchEvent(new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
    }));
}

/** Wait for pending microtasks (Promise resolution). */
export async function flushMicrotasks(): Promise<void>
{
    await new Promise((resolve) => setTimeout(resolve, 0));
}
