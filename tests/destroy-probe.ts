/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: DestroyProbe
 * PURPOSE: Count the teardown primitives a component performs, so an
 *    idempotence test can assert that a SECOND terminal call repeats
 *    none of them. Replaces `.not.toThrow()`, which answers "did it
 *    survive" and not "did it act twice" (DEBT-TEST-1b, ADR-216).
 * RELATES: [[TestAssertions]], [[AuditCounts]]
 * FLOW: [test] -> [destroyProbe()] -> [h.destroy()] -> [total()]
 * ----------------------------------------------------------------------------
 */

import { vi } from "vitest";

/**
 * A running count of the teardown primitives performed since the probe
 * was installed, and the restore that puts the originals back.
 */
export interface DestroyProbe
{
    /** Teardown primitives performed since the probe was installed. */
    total(): number;

    /** Restore every spied primitive. Call before the test ends. */
    restore(): void;
}

/**
 * Install a probe over the primitives a `destroy()` performs.
 *
 * WHY A COUNT AND NOT A SPY PER TEST. 74 blocks assert idempotency and
 * every one of them asserted it with `.not.toThrow()`, which holds for a
 * component whose guard has been deleted entirely: a second call would
 * repeat the teardown and the block could not see it (ADR-216). The
 * property under test is uniform — a second terminal call repeats no
 * side effect — so the observable should be too.
 *
 * WHICH PRIMITIVES. Measured across every `destroy(): void` in
 * `components/`: `removeChild` 54, `.remove()` 36, `removeEventListener`
 * 30, `clearTimeout` 11, `cancelAnimationFrame` 2, `clearInterval` 1.
 * Spying these covers the teardown a component can perform without the
 * test knowing its internals. `MutationObserver.disconnect` (7) is on an
 * instance rather than a reachable prototype and is left out, so a
 * component whose only teardown is a disconnect reads as zero and the
 * positive control below catches it.
 *
 * HOW A BLOCK USES IT. The first call's count is the POSITIVE CONTROL.
 * A component whose `destroy()` performs none of these would make the
 * second assertion vacuous, so the block asserts the first count is
 * above zero and the probe is the wrong instrument when it is not —
 * read that component and assert its own teardown instead.
 *
 * @returns A probe over the teardown primitives.
 */
export function destroyProbe(): DestroyProbe
{
    const spies = [
        vi.spyOn(EventTarget.prototype, "removeEventListener"),
        vi.spyOn(Node.prototype, "removeChild"),
        vi.spyOn(Element.prototype, "remove"),
        vi.spyOn(globalThis, "clearTimeout"),
        vi.spyOn(globalThis, "clearInterval"),
        vi.spyOn(globalThis, "cancelAnimationFrame"),
    ];

    return {
        total(): number
        {
            return spies.reduce((n, s) => n + s.mock.calls.length, 0);
        },
        restore(): void
        {
            for (const s of spies) { s.mockRestore(); }
        },
    };
}
