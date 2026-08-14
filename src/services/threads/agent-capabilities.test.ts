import { describe, expect, it } from '@jest/globals';

import type { AuthorizationThreadCapabilities, AuthorizationWorkspaceCapabilities } from '@/client';

import { projectAgentActionCapabilities } from './agent-capabilities';

const workspace = (overrides: Partial<AuthorizationWorkspaceCapabilities> = {}) =>
    ({
        can_create_thread: false,
        can_use_providers: false,
        can_use_cli_runtimes: false,
        ...overrides,
    }) as AuthorizationWorkspaceCapabilities;

const thread = (overrides: Partial<AuthorizationThreadCapabilities> = {}) =>
    ({
        can_write: false,
        can_start_turn: false,
        can_cancel_agent_execution: false,
        can_steer_agent_execution: false,
        can_control_cli_runtime: false,
        ...overrides,
    }) as AuthorizationThreadCapabilities;

describe('agent action capability projection', () => {
    it('does not infer start authority from message write', () => {
        expect(
            projectAgentActionCapabilities({
                isDraftThread: false,
                workspace: workspace({ can_use_providers: true }),
                thread: thread({ can_write: true }),
            }).canStart,
        ).toBe(false);
    });

    it('allows a narrow runner to start without message write', () => {
        expect(
            projectAgentActionCapabilities({
                isDraftThread: false,
                workspace: workspace({ can_use_providers: true }),
                thread: thread({ can_start_turn: true, can_write: false }),
            }).canStart,
        ).toBe(true);
    });

    it('keeps cancel and steer independent from CLI management and each other', () => {
        expect(
            projectAgentActionCapabilities({
                isDraftThread: false,
                workspace: workspace(),
                thread: thread({
                    can_cancel_agent_execution: true,
                    can_steer_agent_execution: false,
                    can_control_cli_runtime: false,
                }),
            }),
        ).toEqual({ canStart: false, canCancel: true, canSteer: false });
    });

    it('requires thread creation plus a selectable backend for a draft start', () => {
        expect(
            projectAgentActionCapabilities({
                isDraftThread: true,
                workspace: workspace({ can_create_thread: true }),
                thread: null,
            }).canStart,
        ).toBe(false);
        expect(
            projectAgentActionCapabilities({
                isDraftThread: true,
                workspace: workspace({
                    can_create_thread: true,
                    can_use_cli_runtimes: true,
                }),
                thread: null,
            }).canStart,
        ).toBe(true);
    });
});
