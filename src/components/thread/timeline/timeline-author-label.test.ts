import { describe, expect, it } from '@jest/globals';

import { timelineAgentAuthorLabel, timelineAgentDefaultAvatar } from './timeline-author-label';

describe('timelineAuthorLabel', () => {
    it('renders the current identity presentation while retaining the exact execution snapshot', () => {
        expect(
            timelineAgentAuthorLabel({
                actor: { kind: 'agent_execution', id: 'E12345678901234567890' },
                display_name: 'Renamed Researcher',
                nickname: 'renamed-researcher',
                avatar_revision: 'avatar-8',
                agent: {
                    agent_identity_id: 'A12345678901234567890',
                    agent_execution_id: 'E12345678901234567890',
                    identity_source_kind: 'native_agent',
                    identity_source_revision: 7,
                    display_name: 'Researcher',
                    nickname: 'researcher',
                    avatar_revision: 'avatar-7',
                    role_label: 'Reviewer',
                },
            }),
        ).toBe('Renamed Researcher · @renamed-researcher');
    });

    it('uses the built-in image for exact native-agent identities', () => {
        const author = {
            actor: { kind: 'agent_execution' as const, id: 'execution-pioneer' },
            display_name: 'Pioneer',
            nickname: 'pioneer',
            agent: {
                agent_identity_id: 'identity-pioneer',
                agent_execution_id: 'execution-pioneer',
                identity_source_kind: 'native_agent' as const,
                identity_source_revision: 1,
                display_name: 'Pioneer',
                nickname: 'pioneer',
                avatar_revision: 'avatar-pioneer',
                role_label: null,
            },
        };

        expect(timelineAgentDefaultAvatar(author)).toBe('pioneer');
        expect(
            timelineAgentDefaultAvatar({
                ...author,
                actor: { kind: 'agent_execution', id: 'execution-other' },
            }),
        ).toBeNull();
        expect(
            timelineAgentDefaultAvatar({
                ...author,
                agent: { ...author.agent, nickname: 'codex' },
            }),
        ).toBe('pioneer');
        expect(
            timelineAgentDefaultAvatar({
                ...author,
                agent: {
                    ...author.agent,
                    identity_source_kind: 'cli_runtime_instance',
                    nickname: 'pioneer',
                },
            }),
        ).toBeNull();
        expect(
            timelineAgentDefaultAvatar({
                ...author,
                agent: {
                    ...author.agent,
                    identity_source_kind: 'cli_runtime_instance',
                    nickname: 'codex',
                },
            }),
        ).toBe('codex');
        expect(
            timelineAgentDefaultAvatar({
                ...author,
                agent: {
                    ...author.agent,
                    identity_source_kind: 'cli_runtime_instance',
                    nickname: 'claude',
                },
            }),
        ).toBe('claude');
    });

    it('does not invent a generic agent label or accept a different execution snapshot', () => {
        expect(timelineAgentAuthorLabel(null)).toBeNull();
        expect(
            timelineAgentAuthorLabel({
                actor: { kind: 'principal', id: 'principal-a' },
                display_name: 'Superuser',
                nickname: 'superuser',
            }),
        ).toBeNull();
        expect(
            timelineAgentAuthorLabel({
                actor: { kind: 'agent_execution', id: 'execution-a' },
                display_name: 'Codex CLI',
                nickname: 'codex',
                agent: {
                    agent_execution_id: 'execution-b',
                    agent_identity_id: 'identity-b',
                    identity_source_kind: 'cli_runtime_instance',
                    identity_source_revision: 1,
                    display_name: 'Wrong agent',
                    nickname: 'wrong',
                    role_label: 'Agent',
                },
            }),
        ).toBeNull();
    });
});
