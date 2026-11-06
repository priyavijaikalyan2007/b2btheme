/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 * File GUID: 3f0d8b52-91c4-4e7a-b6d3-2a5c8e1f7094
 * Created: 2026-11-06
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: McpDemoLoggedTransport
 * 📜 PURPOSE: A Transport that records every JSON-RPC message it sends and
 *    receives, then passes it on unchanged. The demo host wraps both legs
 *    with it: host to MCP server, and host to each view.
 * 🔗 RELATES: [[McpDemoHost]]
 * ⚡ FLOW: [Protocol] <-> [LoggedTransport -> record] <-> [inner Transport]
 * ----------------------------------------------------------------------------
 */

import type { JSONRPCMessage, MessageExtraInfo, Transport, TransportSendOptions } from "@modelcontextprotocol/client";

export type Direction = "out" | "in";
export type Recorder = (leg: string, direction: Direction, message: JSONRPCMessage) => void;

export class LoggedTransport implements Transport
{
    onmessage?: <T extends JSONRPCMessage>(message: T, extra?: MessageExtraInfo) => void;
    onclose?: () => void;
    onerror?: (error: Error) => void;

    readonly #inner: Transport;
    readonly #leg: string;
    readonly #record: Recorder;

    /**
     * @param inner The transport that carries the messages.
     * @param leg A name for the connection, shown in the log.
     * @param record Called for each message, before it is passed on.
     */
    constructor(inner: Transport, leg: string, record: Recorder)
    {
        this.#inner = inner;
        this.#leg = leg;
        this.#record = record;
    }

    get sessionId(): string | undefined
    {
        return this.#inner.sessionId;
    }

    async start(): Promise<void>
    {
        this.#inner.onmessage = (message, extra) =>
        {
            this.#record(this.#leg, "in", message);
            this.onmessage?.(message, extra);
        };
        this.#inner.onclose = () => this.onclose?.();
        this.#inner.onerror = (error) => this.onerror?.(error);
        await this.#inner.start();
    }

    async send(message: JSONRPCMessage, options?: TransportSendOptions): Promise<void>
    {
        this.#record(this.#leg, "out", message);
        await this.#inner.send(message, options);
    }

    async close(): Promise<void>
    {
        await this.#inner.close();
    }

    setProtocolVersion(version: string): void
    {
        this.#inner.setProtocolVersion?.(version);
    }
}
