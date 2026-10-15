import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { ComposerPublication } from '@/client/generated/composer_publication';
import type { ComposerDomainAction } from '@/client';
import { dispatchComposer } from '@/client/composer';
import { useActiveThreadStore } from './active-thread';

jest.mock('@/client/turn-cancellation', () => {
    let input: unknown = null;
    return {
        install: (next: unknown) => {
            input = next;
        },
        turnCancellationSnapshot: () => input,
    };
});
jest.mock('@/client/composer', () => {
    const publications = new Map<string, unknown>();
    return {
        install: (id: string, value: unknown) => publications.set(id, value),
        clear: () => publications.clear(),
        composerSnapshot: (id: string | null) => publications.get(id ?? '') ?? null,
        useComposerPublication: (id: string | null) => publications.get(id ?? '') ?? null,
        dispatchComposer: jest.fn(),
    };
});
jest.mock('@/client', () => ({ pioneerClient: {} }));
jest.mock('@/stores/thread-tree', () => ({
    useThreadTreeStore: { getState: () => ({ loading: false, snapshot: {} }) },
}));
const bridge = jest.requireMock('@/client/composer') as {
    install: (id: string, value: ComposerPublication) => void;
    clear: () => void;
};
const dispatch = jest.mocked(dispatchComposer);
const fixture = (threadId: string, draftId: number, text = ''): ComposerPublication => ({
    thread_id: threadId,
    draft_id: draftId,
    revision: 1,
    execution_capabilities_removed: false,
    selected_provider_ready: true,
    permission_options: [],
    selected_permission_mode_allowed: false,
    draft: {
        text,
        domain: {
            capability_target: { kind: 'native', supports_skills: true, supports_mcp_tools: true },
        },
    },
});
const current = () => useActiveThreadStore.getState();

beforeEach(() => {
    (
        jest.requireMock('@/client/turn-cancellation') as { install: (value: unknown) => void }
    ).install(null);
    current().reset();
    bridge.clear();
    bridge.install('a', fixture('a', 11, 'draft A'));
    bridge.install('b', fixture('b', 22, 'draft B'));
    current().activateComposerThread('a');
    dispatch.mockClear();
});

describe('composer publication adapter', () => {
    it('closes composer overlays when the mounted thread changes', () => {
        current().setComposerAttachmentMenuOpen(true);
        current().setComposerModeSwitcherOpen(true);
        current().setComposerPermissionModeSwitcherOpen(true);
        current().activateComposerThread('b');
        expect(current().showComposerAttachmentMenu).toBe(false);
        expect(current().showComposerModeSwitcher).toBe(false);
        expect(current().showComposerPermissionModeSwitcher).toBe(false);
    });

    it('acknowledges only the displayed turn-cancellation failure generation', () => {
        const bridge = jest.requireMock('@/client/turn-cancellation') as {
            install: (value: unknown) => void;
        };
        const failure = {
            identity: { thread_id: 'a', turn_id: 'turn', generation: 61 },
            revision: 1,
            state: { kind: 'failed', message: 'failed' },
        };
        bridge.install(failure);
        current().setComposerError(null);
        expect(current().dismissedTurnCancellationGeneration).toBe(61);
        expect(failure.state.kind).toBe('failed');
        expect(dispatch).not.toHaveBeenCalled();
        bridge.install({ ...failure, identity: { ...failure.identity, generation: 62 } });
        expect(current().dismissedTurnCancellationGeneration).not.toBe(62);
        current().activateComposerThread('b');
        expect(current().dismissedTurnCancellationGeneration).toBeNull();
    });

    it('dismisses only the presented voice error without mutating the Client result', () => {
        const failed: ComposerPublication = {
            ...fixture('a', 11),
            operation: {
                identity: { thread_id: 'a', draft_id: 11, generation: 41 },
                kind: 'voice',
                status: { kind: 'failed', message: 'no speech' },
                voice_committing: false,
                voice_result: {
                    session_id: 'session',
                    outcome: 'no_speech',
                    action: 'show_no_speech_error',
                },
            },
        };
        bridge.install('a', failed);
        current().removeComposerAttachment('/synthetic/target');
        expect(current().dismissedVoiceErrorGeneration).toBe(41);
        expect(failed.operation?.voice_result?.action).toBe('show_no_speech_error');
        expect(dispatch).toHaveBeenCalledTimes(1);
        const pending: ComposerPublication = {
            ...failed,
            operation: {
                ...failed.operation!,
                identity: { thread_id: 'a', draft_id: 11, generation: 42 },
                status: { kind: 'pending' },
                voice_result: null,
            },
        };
        bridge.install('a', pending);
        current().setComposerError(null);
        expect(current().dismissedVoiceErrorGeneration).toBe(41);
        bridge.install('a', {
            ...pending,
            operation: {
                ...pending.operation!,
                status: failed.operation!.status,
                voice_result: failed.operation!.voice_result,
            },
        });
        expect(current().dismissedVoiceErrorGeneration).not.toBe(42);
        current().activateComposerThread('b');
        expect(current().dismissedVoiceErrorGeneration).toBeNull();
    });

    it('dismisses only the presented steer error without clearing the Client draft', () => {
        const publication = {
            ...fixture('a', 11, 'draft A'),
            operation: {
                kind: 'steer' as const,
                identity: { thread_id: 'a', draft_id: 11, generation: 51 },
                voice_committing: false,
                status: { kind: 'failed' as const, message: 'synthetic error' },
            },
        };
        bridge.install('a', publication);
        current().setComposerError(null);
        expect(current().dismissedSteerErrorGeneration).toBe(51);
        expect(current().composerText).toBe('draft A');
        expect(dispatch).not.toHaveBeenCalled();
        bridge.install('a', {
            ...publication,
            operation: {
                ...publication.operation,
                identity: { ...publication.operation.identity, generation: 52 },
                status: { kind: 'preparing' },
            },
        });
        current().setComposerError(null);
        expect(current().dismissedSteerErrorGeneration).toBe(51);
        current().activateComposerThread('b');
        expect(current().dismissedSteerErrorGeneration).toBeNull();
    });

    it('does not echo an equal controlled value', () => {
        current().setComposerText('draft A');
        expect(dispatch).not.toHaveBeenCalled();
    });
    it('sends exactly one text intent and waits for Client output', () => {
        current().setComposerText('edited');
        expect(dispatch.mock.calls).toEqual([
            [{ kind: 'edit_text', thread_id: 'a', draft_id: 11, text: 'edited' }],
        ]);
        expect(current().composerText).toBe('draft A');
        bridge.install('a', { ...fixture('a', 11, 'edited'), revision: 2 });
        expect(current().composerText).toBe('edited');
        current().setComposerText('edited');
        expect(dispatch).toHaveBeenCalledTimes(1);
    });
    it('selects a Client draft without sending the old draft back', () => {
        current().activateComposerThread('b');
        expect(current().composerText).toBe('draft B');
        expect(dispatch).toHaveBeenCalledTimes(1);
        expect(dispatch.mock.calls[0][0]).toEqual({ kind: 'activate', thread_id: 'b' });
        bridge.install('a', { ...fixture('a', 11, 'late A'), revision: 2 });
        expect(current().composerText).toBe('draft B');
        current().activateComposerThread('a');
        expect(current().composerText).toBe('late A');
    });
    it('uses stable domain identity for attachment and capability removal', () => {
        current().removeComposerAttachment('/synthetic/target');
        current().removeComposerCapability('target');
        expect(dispatch.mock.calls.map(([intent]) => intent)).toEqual([
            {
                kind: 'domain',
                thread_id: 'a',
                draft_id: 11,
                action: { RemoveAttachment: { path: '/synthetic/target' } },
            },
            {
                kind: 'domain',
                thread_id: 'a',
                draft_id: 11,
                action: { RemoveCapability: { id: 'target' } },
            },
        ]);
    });
    it.each<[string, () => void, ComposerDomainAction]>([
        [
            'permission',
            () => current().setComposerPermissionMode('full_access'),
            { SetPermissionMode: { mode: 'full_access' } },
        ],
        ['reply', () => current().clearComposerReplyTarget(), 'ClearReplyTarget'],
        [
            'skills',
            () => current().setComposerSkillSelections([]),
            { SetSkillSelections: { selections: [] } },
        ],
        [
            'reasoning',
            () => current().setComposerReasoningEffortFromUser('high'),
            { SetReasoningEffortFromUser: { effort: 'high' } },
        ],
    ])('routes %s directly to the selected Client draft', (_name, action, expected) => {
        action();
        expect(dispatch.mock.calls).toEqual([
            [{ kind: 'domain', thread_id: 'a', draft_id: 11, action: expected }],
        ]);
        expect(current().composerText).toBe('draft A');
    });
    it('clears a specific draft through Client and keeps UI open state local', () => {
        current().setComposerAttachmentMenuOpen(true);
        expect(dispatch).not.toHaveBeenCalled();
        current().clearComposerPayload();
        expect(dispatch.mock.calls).toEqual([[{ kind: 'clear', thread_id: 'a', draft_id: 11 }]]);
        expect(current().showComposerAttachmentMenu).toBe(true);
    });
    it('reset asks Client to clear all drafts and releases the selected publication', () => {
        current().reset();
        expect(dispatch.mock.calls).toEqual([[{ kind: 'clear_all' }]]);
        expect(current().activeComposerThreadId).toBeNull();
        expect(current().composerText).toBe('');
        expect('composerDrafts' in current()).toBe(false);
        expect('composerAuthorizationFingerprints' in current()).toBe(false);
    });
});
