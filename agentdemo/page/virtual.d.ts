/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: A2uiPlayground / Virtual modules
 * 📜 PURPOSE: The generated schema-layer validator, which agentdemo/build.mjs
 *    aliases to agentdemo/.out/gen/message-validator.mjs (#30 spec §3.3).
 * 🔗 RELATES: [[AgentUiMessageValidator]]
 * ----------------------------------------------------------------------------
 */

declare module "virtual:a2ui-message-validator"
{
    import type { MessageValidators } from "../../scripts/agentui/a2ui-check.mjs";

    export const messageValidators: MessageValidators;
}
