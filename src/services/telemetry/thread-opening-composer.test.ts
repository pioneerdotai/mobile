import { describe, expect, it } from '@jest/globals';
import type {
    ComposerPublication,
    ComposerPermissionModeOption,
} from '@/client/generated/composer_publication';
import type {
    ProviderRuntimePublication,
    RuntimeStatus,
} from '@/client/generated/provider_runtime_publication';
import {
    threadOpeningPolicyApplied,
    threadOpeningSelectionPending,
} from './thread-opening-composer';
import { threadOpeningRuntimeState } from './thread-opening-runtime';
import {
    threadOpeningReadinessOutcome,
    type ThreadOpeningReadiness,
} from './thread-opening-readiness';

const option: ComposerPermissionModeOption = {
    mode: 'supervised',
    label: 'Supervised',
    description: 'Ask',
};
const authorization = {
    thread_id: 'thread',
    workspace_id: 'workspace',
    snapshot: {
        workspace: {
            workspace_id: 'workspace',
            execution_draft_policy: { fingerprint: 'current-policy' },
            capabilities: { agent_permission_options: [option] },
        },
    },
};
const composer: ComposerPublication = {
    thread_id: 'thread',
    draft_id: 1,
    revision: 4,
    draft: {
        text: '',
        domain: {
            selected_mode: 'Chat',
            selected_provider: 'cli_runtime:chosen',
            selected_model: 'model',
            selected_permission_mode: 'supervised',
            capability_target: { kind: 'cli', supports_skills: false, supports_mcp_tools: false },
        },
    },
    authorization_fingerprint: 'current-policy',
    reconciliation: { changed: false, draft: { policy_fingerprint: 'current-policy' } },
    permission_options: [option],
    selected_permission_mode_allowed: true,
    selected_provider_ready: true,
    execution_capabilities_removed: false,
    runtime_selection: {
        identity: { thread_id: 'thread', draft_id: 1, generation: 3 },
        workspace_id: 'workspace',
        request: { generation: 3, state: { kind: 'ready' } },
        selected_provider: 'cli_runtime:chosen',
        selected_provider_ready: true,
    },
};
const capabilities = {
    supports_approvals: false,
    supports_apps: false,
    supports_auth_management: false,
    supports_command_approvals: false,
    supports_compaction: false,
    supports_diff_updates: false,
    supports_file_change_approvals: false,
    supports_fork: false,
    supports_generated_schema_probe: false,
    supports_goal: false,
    supports_history_read: false,
    supports_interrupt: false,
    supports_model_list: true,
    supports_resume: false,
    supports_review: false,
    supports_steer: false,
    supports_thread_archive: false,
    supports_threads: true,
    supports_user_input_requests: false,
};
const runtimes = (status: RuntimeStatus): ProviderRuntimePublication => ({
    workspace_id: 'workspace',
    revision: 9,
    request: { kind: 'ready' },
    runtimes: [
        {
            id: 'chosen',
            runtime_id: 'chosen',
            revision: 7,
            display_name: 'Chosen',
            kind: 'codex',
            enabled: true,
            status,
            capabilities,
        },
    ],
});
const screen: ThreadOpeningReadiness = {
    focused: true,
    connected: true,
    composerBusy: false,
    snapshotMatches: true,
    composerMatches: true,
    screenLoading: false,
    screenError: false,
    authorizationReady: true,
    authorizationFailed: false,
    authorizationCancelled: false,
    composerDisabled: false,
    composerPolicyApplied: true,
    messageMode: false,
    modelSelectionComplete: true,
    modelSelectionLoading: false,
    runtimeState: 'ready',
};
const outcome = (
    draft: ComposerPublication,
    publication = runtimes({ state: 'ready' }),
    overrides: Partial<ThreadOpeningReadiness> = {},
) =>
    threadOpeningReadinessOutcome({
        ...screen,
        composerPolicyApplied: threadOpeningPolicyApplied(draft, authorization, 'workspace', false),
        runtimeState: threadOpeningRuntimeState(draft, publication, 'workspace', false),
        modelSelectionLoading: threadOpeningSelectionPending(draft, true, true),
        ...overrides,
    });

describe('applied composer prerequisites', () => {
    it('waits for missing/stale policy after authorization ready, then accepts applied policy', () => {
        for (const fingerprint of [null, 'old-policy']) {
            const stale = { ...composer, authorization_fingerprint: fingerprint };
            expect(outcome(stale)).toBeNull();
            // Neither missing options/false allowed flag nor old allowing options prove denial/success.
            expect(
                outcome(
                    { ...stale, permission_options: [], selected_permission_mode_allowed: false },
                    undefined,
                    { composerDisabled: true },
                ),
            ).toBeNull();
        }
        expect(outcome({ ...composer, reconciliation: null })).toBeNull();
        expect(outcome(composer)).toBe('ready');
    });
    it('waits for permission options even if the fingerprint is already current', () => {
        expect(
            outcome(
                { ...composer, permission_options: [], selected_permission_mode_allowed: false },
                undefined,
                { composerDisabled: true },
            ),
        ).toBeNull();
        expect(
            outcome({ ...composer, permission_options: [{ ...option, label: 'Old' }] }),
        ).toBeNull();
        expect(outcome(composer)).toBe('ready');
        expect(outcome(composer, undefined, { composerDisabled: true })).toBe('degraded');
    });
    it('recognizes an applied empty permission policy as a confirmed restriction', () => {
        const deniedAuthorization = {
            ...authorization,
            snapshot: {
                workspace: {
                    ...authorization.snapshot.workspace,
                    capabilities: { agent_permission_options: [] },
                },
            },
        };
        const denied = {
            ...composer,
            permission_options: [],
            selected_permission_mode_allowed: false,
        };
        expect(threadOpeningPolicyApplied(denied, deniedAuthorization, 'workspace', false)).toBe(
            true,
        );
        expect(threadOpeningReadinessOutcome({ ...screen, composerDisabled: true })).toBe(
            'degraded',
        );
    });
    it('keeps Message independent of execution policy, permission mode, model and runtime', () => {
        const message = {
            ...composer,
            authorization_fingerprint: null,
            reconciliation: null,
            permission_options: [],
            selected_permission_mode_allowed: false,
            selected_provider_ready: false,
            runtime_selection: null,
        };
        expect(threadOpeningPolicyApplied(message, authorization, 'workspace', true)).toBe(true);
        expect(threadOpeningRuntimeState(message, null, 'workspace', true)).toBe('ready');
        expect(
            threadOpeningReadinessOutcome({
                ...screen,
                messageMode: true,
                composerPolicyApplied: false,
                modelSelectionComplete: false,
                modelSelectionLoading: true,
                runtimeState: 'pending',
            }),
        ).toBe('ready');
    });
    it.each(['loading', 'failed'] as const)(
        'ignores optional model-display %s once selection is usable',
        (kind) => {
            const draft: ComposerPublication = {
                ...composer,
                model_display: {
                    identity: { thread_id: 'thread', draft_id: 1, generation: 4 },
                    key: {
                        provider: 'cli_runtime:chosen',
                        model: 'model',
                        workspace_id: 'workspace',
                    },
                    request:
                        kind === 'loading' ? { kind } : { kind, message: 'metadata unavailable' },
                },
            };
            expect(outcome(draft)).toBe('ready');
            const unresolved = {
                ...draft,
                draft: { ...draft.draft, domain: { ...draft.draft.domain, selected_model: null } },
            };
            expect(threadOpeningSelectionPending(unresolved, true, true)).toBe(true);
            expect(outcome(unresolved)).toBeNull();
        },
    );
});

describe('actual selected runtime status and applied composer input', () => {
    it('waits for Initializing despite discovery ready, then for the derived composer to catch up', () => {
        const unapplied: ComposerPublication = {
            ...composer,
            selected_provider_ready: false,
            runtime_selection: { ...composer.runtime_selection!, selected_provider_ready: false },
        };
        expect(outcome(unapplied, runtimes({ state: 'initializing' }))).toBeNull();
        expect(outcome(unapplied, runtimes({ state: 'ready' }))).toBeNull();
        expect(outcome(composer, runtimes({ state: 'ready' }))).toBe('ready');
        // An old allowing composer cannot override a newer Initializing status.
        expect(outcome(composer, runtimes({ state: 'initializing' }))).toBeNull();
    });
    it('handles absent, unavailable, failed and cancelled runtimes', () => {
        const absent = { ...runtimes({ state: 'ready' }), runtimes: [] };
        expect(outcome(composer, absent)).toBe('setup_required');
        for (const status of [
            { state: 'disabled' },
            { state: 'missing_binary' },
            { state: 'needs_auth' },
            { state: 'unsupported_version' },
        ] as RuntimeStatus[]) {
            expect(outcome(composer, runtimes(status))).toBe('setup_required');
        }
        expect(outcome(composer, runtimes({ state: 'error', message: 'failed' }))).toBe('degraded');
        expect(
            outcome(composer, { ...runtimes({ state: 'ready' }), request: { kind: 'failed' } }),
        ).toBe('degraded');
        expect(
            outcome(composer, { ...runtimes({ state: 'ready' }), request: { kind: 'cancelled' } }),
        ).toBe('cancelled');
    });
    it('uses the selected runtime only and ignores mismatched workspace/draft/provider inputs', () => {
        const other = runtimes({ state: 'ready' });
        other.runtimes[0] = { ...other.runtimes[0], runtime_id: 'other' };
        expect(outcome(composer, other)).toBe('setup_required');
        expect(
            outcome(composer, { ...runtimes({ state: 'ready' }), workspace_id: 'other' }),
        ).toBeNull();
        for (const selection of [
            { ...composer.runtime_selection!, workspace_id: 'other' },
            { ...composer.runtime_selection!, selected_provider: 'cli_runtime:other' },
            {
                ...composer.runtime_selection!,
                identity: { ...composer.runtime_selection!.identity, draft_id: 2 },
            },
        ])
            expect(outcome({ ...composer, runtime_selection: selection })).toBeNull();
    });
});
