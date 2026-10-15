import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { ComposerPublication } from './generated/composer_publication';
import {
    beginComposerOperation,
    completeComposerOperation,
    composerSnapshot,
    composerOperationPlan,
    dispatchComposer,
} from './composer';
import { mobileClientBinding } from './mobile-client-binding';

jest.mock('./mobile-client-binding', () => {
    const snapshots = new Map<string, unknown>();
    return {
        install: (id: string, payload: unknown) => snapshots.set(id, { payload }),
        mobileClientBinding: {
            scope: (scope: { thread_id?: string }) => ({
                getSnapshot: () => snapshots.get(scope.thread_id ?? '') ?? null,
            }),
            dispatch: jest.fn(() => ({
                schema_version: 1,
                sequence: 1,
                outcome: 'changed',
                effects: [],
            })),
            drain: jest.fn(),
        },
    };
});
const fixture: ComposerPublication = {
    thread_id: 'a',
    draft_id: 12,
    revision: 4,
    execution_capabilities_removed: false,
    selected_provider_ready: true,
    permission_options: [],
    selected_permission_mode_allowed: false,
    draft: {
        text: 'draft A',
        domain: {
            capability_target: { kind: 'native', supports_skills: true, supports_mcp_tools: true },
        },
    },
    operation: {
        voice_committing: false,
        identity: { thread_id: 'a', draft_id: 12, generation: 41 },
        kind: 'pick_files',
        status: { kind: 'pending' },
        plan: {
            identity: { thread_id: 'a', draft_id: 12, generation: 41 },
            kind: 'pick_files',
            draft: {
                text: 'draft A',
                domain: {
                    capability_target: {
                        kind: 'native',
                        supports_skills: true,
                        supports_mcp_tools: true,
                    },
                },
            },
        },
    },
};
const install = (
    jest.requireMock('./mobile-client-binding') as { install: (id: string, value: unknown) => void }
).install;
const dispatch = jest.mocked(mobileClientBinding.dispatch);
const drain = jest.mocked(mobileClientBinding.drain);

beforeEach(() => {
    install('a', fixture);
    install('b', {
        ...fixture,
        thread_id: 'b',
        draft_id: 20,
        draft: { ...fixture.draft, text: 'draft B' },
        operation: null,
    });
    dispatch.mockClear();
    drain.mockClear();
    dispatch.mockReturnValue({ schema_version: 1, sequence: 1, outcome: 'changed', effects: [] });
});

describe('native composer operation adapter', () => {
    it('matches the captured plan by draft and generation before native completion', () => {
        const identity = fixture.operation!.identity;
        expect(composerOperationPlan(identity)).toBe(fixture.operation!.plan);
        expect(composerOperationPlan({ ...identity, draft_id: 99 })).toBeNull();
        expect(composerOperationPlan({ ...identity, generation: 99 })).toBeNull();
        dispatchComposer({ kind: 'voice_session_started', identity, session_id: 'session' });
        expect(drain).toHaveBeenLastCalledWith({ kind: 'composer', thread_id: 'a' });
        expect(composerSnapshot('a')).toBe(fixture);
    });
    it('returns the immutable Client plan after one typed begin intent', () => {
        const plan = beginComposerOperation('a', 'pick_files');
        expect(plan).toBe(fixture.operation?.plan);
        expect(dispatch.mock.calls).toEqual([
            [
                {
                    schema_version: 1,
                    intent: {
                        kind: 'composer',
                        intent: {
                            kind: 'begin_operation',
                            thread_id: 'a',
                            draft_id: 12,
                            operation: 'pick_files',
                        },
                    },
                },
            ],
        ]);
        expect(drain).toHaveBeenCalledWith({ kind: 'composer', thread_id: 'a' });
    });
    it('does not issue a second platform plan for a duplicate or rejected begin', () => {
        dispatch.mockReturnValue({ schema_version: 1, sequence: 1, outcome: 'noop', effects: [] });
        expect(beginComposerOperation('a', 'pick_files')).toBeNull();
    });
    it('retains original draft/generation in completion after the visible thread changes', () => {
        const plan = beginComposerOperation('a', 'pick_files')!;
        const b = composerSnapshot('b');
        expect(
            completeComposerOperation(plan.identity, { kind: 'files_selected', attachments: [] }),
        ).toBe(true);
        expect(dispatch).toHaveBeenLastCalledWith({
            schema_version: 1,
            intent: {
                kind: 'composer',
                intent: {
                    kind: 'complete_operation',
                    identity: { thread_id: 'a', draft_id: 12, generation: 41 },
                    completion: { kind: 'files_selected', attachments: [] },
                },
            },
        });
        expect(drain).toHaveBeenLastCalledWith({ kind: 'composer', thread_id: 'a' });
        expect(composerSnapshot('b')).toBe(b);
    });
    it('retires readiness using the captured draft when navigation already shows another thread', () => {
        const a = composerSnapshot('a')!;
        const b = composerSnapshot('b');
        dispatchComposer({
            kind: 'set_voice_readiness_demand',
            thread_id: a.thread_id,
            draft_id: a.draft_id,
            demand: 'while_visible',
        });
        install('a', { ...a, draft_id: 99 });
        dispatchComposer({
            kind: 'set_voice_readiness_demand',
            thread_id: a.thread_id,
            draft_id: a.draft_id,
            demand: 'suspended',
        });
        expect(dispatch).toHaveBeenLastCalledWith({
            schema_version: 1,
            intent: {
                kind: 'composer',
                intent: {
                    kind: 'set_voice_readiness_demand',
                    thread_id: 'a',
                    draft_id: 12,
                    demand: 'suspended',
                },
            },
        });
        expect(composerSnapshot('a')?.draft_id).toBe(99);
        expect(composerSnapshot('b')).toBe(b);
    });
    it('reports unmatched cancellation/failure as no-op instead of mutating UI state', () => {
        dispatch.mockReturnValue({ schema_version: 1, sequence: 2, outcome: 'noop', effects: [] });
        const identity = fixture.operation!.identity;
        expect(completeComposerOperation(identity, { kind: 'cancelled' })).toBe(false);
        expect(completeComposerOperation(identity, { kind: 'failed', message: 'late error' })).toBe(
            false,
        );
        expect(composerSnapshot('a')).toBe(fixture);
    });
});
