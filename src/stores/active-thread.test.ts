import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import type {
    ClientActiveThreadSnapshot,
    ComposerAttachment,
    ComposerCapability,
    ComposerDomainAction,
    ComposerDomainDraft,
    ComposerDomainState,
} from '@/client';
import { pioneerClient } from '@/client';
import {
    UNSUPPORTED_CLI_COMPOSER_CAPABILITY_POLICY,
    type ComposerCapabilityPolicy,
} from '@/services/providers/cli-runtime';

import { useActiveThreadStore } from './active-thread';

jest.mock('@/client', () => ({
    pioneerClient: {
        composerDomainTransition: jest.fn(),
        composerDraftLifecycleTransition: jest.fn(),
    },
}));

const mockComposerDomainTransition = jest.mocked(pioneerClient.composerDomainTransition);
const mockComposerDraftLifecycleTransition = jest.mocked(
    pioneerClient.composerDraftLifecycleTransition,
);

const capabilityTargetForSelection = (
    state: ComposerDomainState,
    provider: string | null | undefined,
    requested: ComposerDomainState['capability_target'] | null | undefined,
) => {
    if (requested) {
        return requested;
    }
    if ((state.selected_provider ?? null) === (provider ?? null)) {
        return state.capability_target;
    }
    return provider?.startsWith('cli_runtime:')
        ? { kind: 'cli' as const, supports_skills: false, supports_mcp_tools: false }
        : { kind: 'native' as const, supports_skills: true, supports_mcp_tools: true };
};

const reduceDomainForStoreAdapterTest = (
    state: ComposerDomainState,
    action: ComposerDomainAction,
): ComposerDomainState => {
    if (typeof action === 'string') {
        if (action === 'ClearPayload') {
            return { ...state, attachments: [], capabilities: [] };
        }
        if (action === 'ClearReasoningEffort') {
            return { ...state, selected_reasoning_effort: null };
        }
        if (action === 'MarkAttachmentsUploading') {
            return {
                ...state,
                attachments: (state.attachments ?? []).map((attachment) =>
                    attachment.upload_state === 'Local'
                        ? { ...attachment, upload_state: 'Uploading' as const }
                        : attachment,
                ),
            };
        }
        return state;
    }
    if ('Reset' in action) {
        return action.Reset.defaults;
    }
    if ('SetAttachments' in action) {
        return { ...state, attachments: action.SetAttachments.attachments };
    }
    if ('AddAttachment' in action) {
        const attachments = state.attachments ?? [];
        return attachments.some(
            (attachment) => attachment.path === action.AddAttachment.attachment.path,
        )
            ? state
            : { ...state, attachments: [...attachments, action.AddAttachment.attachment] };
    }
    if ('RemoveAttachmentAt' in action) {
        return {
            ...state,
            attachments: (state.attachments ?? []).filter(
                (_, index) => index !== action.RemoveAttachmentAt.index,
            ),
        };
    }
    if ('MarkAttachmentsFailed' in action) {
        return {
            ...state,
            attachments: (state.attachments ?? []).map((attachment) =>
                attachment.upload_state === 'Uploading'
                    ? {
                          ...attachment,
                          upload_state: {
                              Failed: { error: action.MarkAttachmentsFailed.error },
                          },
                      }
                    : attachment,
            ),
        };
    }
    if ('ApplyUploadedAttachments' in action) {
        return {
            ...state,
            attachments: (state.attachments ?? []).map((attachment, index) => {
                const artifact = action.ApplyUploadedAttachments.artifacts[index];
                return artifact
                    ? { ...attachment, upload_state: { Uploaded: { artifact } } }
                    : attachment;
            }),
        };
    }
    if ('SetCapabilities' in action) {
        return { ...state, capabilities: action.SetCapabilities.capabilities };
    }
    if ('AddCapability' in action) {
        const capabilities = state.capabilities ?? [];
        return capabilities.some(
            (capability) => capability.id === action.AddCapability.capability.id,
        )
            ? state
            : { ...state, capabilities: [...capabilities, action.AddCapability.capability] };
    }
    if ('RemoveCapability' in action) {
        return {
            ...state,
            capabilities: (state.capabilities ?? []).filter(
                (capability) => capability.id !== action.RemoveCapability.id,
            ),
        };
    }
    if ('SetModeFromUser' in action) {
        return {
            ...state,
            selected_mode: action.SetModeFromUser.mode,
            mode_manually_selected: true,
        };
    }
    if ('SetPermissionMode' in action) {
        return { ...state, selected_permission_mode: action.SetPermissionMode.mode };
    }
    if ('SetModelSelectionFromUser' in action) {
        const provider = action.SetModelSelectionFromUser.provider ?? null;
        const model = action.SetModelSelectionFromUser.model ?? null;
        const changed =
            (state.selected_provider ?? null) !== provider ||
            (state.selected_model ?? null) !== model;
        return {
            ...state,
            selected_provider: provider,
            selected_model: model,
            selected_reasoning_effort: changed ? null : state.selected_reasoning_effort,
            capability_target: capabilityTargetForSelection(
                state,
                provider,
                action.SetModelSelectionFromUser.capability_target,
            ),
            model_manually_selected: true,
        };
    }
    if ('SetReasoningEffortFromUser' in action) {
        const effort = action.SetReasoningEffortFromUser.effort?.trim();
        return {
            ...state,
            selected_reasoning_effort: effort || null,
            model_manually_selected: true,
        };
    }
    if ('ResetModelSelection' in action || 'SyncResolvedModelSelection' in action) {
        const input =
            'ResetModelSelection' in action
                ? action.ResetModelSelection
                : action.SyncResolvedModelSelection;
        const isReset = 'ResetModelSelection' in action;
        const selection = input.selection;
        const resolvedProvider = selection?.provider ?? null;
        if (!isReset && state.model_manually_selected) {
            if (input.capability_target && (state.selected_provider ?? null) === resolvedProvider) {
                return { ...state, capability_target: input.capability_target };
            }
            return state;
        }
        return {
            ...state,
            selected_provider: resolvedProvider,
            selected_model: selection?.model ?? null,
            selected_reasoning_effort: selection?.selected_reasoning_effort ?? null,
            capability_target: capabilityTargetForSelection(
                state,
                resolvedProvider,
                input.capability_target,
            ),
            model_manually_selected: false,
        };
    }
    if ('SyncCapabilityTarget' in action) {
        return (state.selected_provider ?? null) === (action.SyncCapabilityTarget.provider ?? null)
            ? { ...state, capability_target: action.SyncCapabilityTarget.target }
            : state;
    }
    return state;
};

beforeEach(() => {
    mockComposerDomainTransition.mockReset();
    mockComposerDomainTransition.mockImplementation(({ state, action }) => {
        const next = reduceDomainForStoreAdapterTest(state, action);
        return {
            state: next,
            changed: next !== state,
            payload_changed: false,
            model_selection_changed: false,
        };
    });
    mockComposerDraftLifecycleTransition.mockReset();
    mockComposerDraftLifecycleTransition.mockImplementation(({ state, action }) => {
        const drafts = { ...(state.drafts ?? {}) };
        let restoredDraft: ComposerDomainDraft | null = null;

        if (action === 'ClearAll') {
            return {
                state: { drafts: {} },
                restored_draft: null,
                changed: Object.keys(drafts).length > 0,
            };
        }
        if ('SwitchThread' in action) {
            const input = action.SwitchThread;
            if (input.current_thread_id && input.current_draft) {
                drafts[input.current_thread_id] = input.current_draft;
            }
            restoredDraft = drafts[input.target_thread_id] ?? input.fallback;
            drafts[input.target_thread_id] = restoredDraft;
        } else if ('RememberThread' in action) {
            drafts[action.RememberThread.thread_id] = action.RememberThread.draft;
        } else if ('ClearThread' in action) {
            delete drafts[action.ClearThread.thread_id];
        }

        return {
            state: { drafts },
            restored_draft: restoredDraft,
            changed: true,
        };
    });
});

const resetStore = () => {
    useActiveThreadStore.getState().resetDefaultComposerModelSelection();
    useActiveThreadStore.getState().reset();
};

const fixtureSkillId = (sourceKind: string, slug: string): string =>
    `${sourceKind}${slug}`
        .replace(/[^A-Za-z0-9]/g, '')
        .padEnd(21, '0')
        .slice(0, 21);

const skillCapability = (
    sourceKind: string,
    slug: string,
    skillId = fixtureSkillId(sourceKind, slug),
    owner: string | null = null,
): ComposerCapability => ({
    id: `skill:${skillId}`,
    label: owner ? `${owner}/${slug}` : slug,
    kind: {
        Skill: {
            skill_id: skillId,
            owner,
            slug,
            source_kind: sourceKind,
        },
    },
});

const mcpCapability: ComposerCapability = {
    id: 'mcp-server:workspace:docs',
    label: 'docs',
    kind: { McpServer: { name: 'docs', scope_kind: 'workspace' } },
};

const mcpToolCapability: ComposerCapability = {
    id: 'mcp-tool:workspace:issues:search',
    label: 'issues / search',
    kind: {
        McpTool: {
            server_name: 'issues',
            raw_tool_name: 'search',
            scope_kind: 'workspace',
        },
    },
};

const cliPolicy = (supportsSkills: boolean, supportsMcpTools: boolean) =>
    ({
        kind: 'cli',
        supports_skills: supportsSkills,
        supports_mcp_tools: supportsMcpTools,
    }) satisfies ComposerCapabilityPolicy;

describe('active thread reasoning effort state', () => {
    beforeEach(() => {
        resetStore();
    });

    it('preserves effort when user keeps the same provider and model', () => {
        useActiveThreadStore.getState().setComposerModelSelectionFromUser('openai', 'gpt-5');
        useActiveThreadStore.getState().setComposerReasoningEffortFromUser('high');

        useActiveThreadStore.getState().setComposerModelSelectionFromUser('openai', 'gpt-5');

        expect(useActiveThreadStore.getState().composerSelectedReasoningEffort).toBe('high');
    });

    it('clears effort when user changes provider or model', () => {
        useActiveThreadStore.getState().setComposerModelSelectionFromUser('openai', 'gpt-5');
        useActiveThreadStore.getState().setComposerReasoningEffortFromUser('high');

        useActiveThreadStore.getState().setComposerModelSelectionFromUser('openai', 'gpt-5.5');

        expect(useActiveThreadStore.getState().composerSelectedReasoningEffort).toBeNull();

        useActiveThreadStore.getState().setComposerReasoningEffortFromUser('low');
        useActiveThreadStore
            .getState()
            .setComposerModelSelectionFromUser('anthropic', 'claude-opus-4-5');

        expect(useActiveThreadStore.getState().composerSelectedReasoningEffort).toBeNull();
    });

    it('syncs effort from the resolved default selection', () => {
        useActiveThreadStore
            .getState()
            .syncDefaultComposerModelSelection('workspace-1', 'openai', 'gpt-5', ' high ');

        expect(useActiveThreadStore.getState().composerSelectedReasoningEffort).toBe('high');
        expect(useActiveThreadStore.getState().defaultComposerReasoningEffort).toBe('high');

        useActiveThreadStore
            .getState()
            .syncDefaultComposerModelSelection('workspace-1', 'openai', 'gpt-5', null);

        expect(useActiveThreadStore.getState().composerSelectedReasoningEffort).toBeNull();

        useActiveThreadStore
            .getState()
            .syncDefaultComposerModelSelection('workspace-1', 'openai', 'gpt-5.5', 'max');

        expect(useActiveThreadStore.getState().composerSelectedReasoningEffort).toBe('max');
    });

    it('syncs the resolved CLI capability target with default and active selections', () => {
        useActiveThreadStore
            .getState()
            .setComposerCapabilities([
                skillCapability('user', 'user-skill'),
                skillCapability('system', 'memory'),
            ]);

        useActiveThreadStore
            .getState()
            .syncDefaultComposerModelSelection(
                'workspace-1',
                'cli_runtime:codex',
                'gpt-5',
                null,
                cliPolicy(true, false),
            );

        expect(useActiveThreadStore.getState().defaultComposerCapabilityTarget).toEqual(
            cliPolicy(true, false),
        );
        expect(useActiveThreadStore.getState().composerCapabilityTarget).toEqual(
            cliPolicy(true, false),
        );
        expect(useActiveThreadStore.getState().composerCapabilities.map((item) => item.id)).toEqual(
            [
                skillCapability('user', 'user-skill').id,
                skillCapability('system', 'memory').id,
            ],
        );

        useActiveThreadStore
            .getState()
            .syncComposerModelSelection(
                'cli_runtime:codex',
                'gpt-5',
                null,
                UNSUPPORTED_CLI_COMPOSER_CAPABILITY_POLICY,
            );

        expect(useActiveThreadStore.getState().composerCapabilityTarget).toEqual(
            UNSUPPORTED_CLI_COMPOSER_CAPABILITY_POLICY,
        );
        expect(useActiveThreadStore.getState().composerCapabilities.map((item) => item.id)).toEqual(
            [
                skillCapability('user', 'user-skill').id,
                skillCapability('system', 'memory').id,
            ],
        );
    });

    it('syncs effort from the active thread selection unless user selected manually', () => {
        useActiveThreadStore.getState().syncComposerModelSelection('openai', 'gpt-5', 'high');

        expect(useActiveThreadStore.getState().composerSelectedReasoningEffort).toBe('high');

        useActiveThreadStore.getState().syncComposerModelSelection('openai', 'gpt-5', null);

        expect(useActiveThreadStore.getState().composerSelectedReasoningEffort).toBeNull();

        useActiveThreadStore.getState().setComposerModelSelectionFromUser('openai', 'gpt-5');
        useActiveThreadStore.getState().setComposerReasoningEffortFromUser('low');

        useActiveThreadStore.getState().syncComposerModelSelection('openai', 'gpt-5', 'max');

        expect(useActiveThreadStore.getState().composerSelectedReasoningEffort).toBe('low');
    });

    it('treats user reasoning effort selection as a manual composer selection', () => {
        useActiveThreadStore.getState().syncComposerModelSelection('openai', 'gpt-5', 'high');

        useActiveThreadStore.getState().setComposerReasoningEffortFromUser('low');

        expect(useActiveThreadStore.getState().composerModelManuallySelected).toBe(true);

        useActiveThreadStore.getState().syncComposerModelSelection('openai', 'gpt-5', 'high');

        expect(useActiveThreadStore.getState().composerSelectedProvider).toBe('openai');
        expect(useActiveThreadStore.getState().composerSelectedModel).toBe('gpt-5');
        expect(useActiveThreadStore.getState().composerSelectedReasoningEffort).toBe('low');
    });

    it('restores default effort on reset paths', () => {
        useActiveThreadStore
            .getState()
            .syncDefaultComposerModelSelection('workspace-1', 'openai', 'gpt-5', 'high');
        useActiveThreadStore.getState().setComposerModelSelectionFromUser('openai', 'gpt-5.5');
        useActiveThreadStore.getState().setComposerReasoningEffortFromUser('low');

        useActiveThreadStore.getState().reset();

        expect(useActiveThreadStore.getState().composerSelectedProvider).toBe('openai');
        expect(useActiveThreadStore.getState().composerSelectedModel).toBe('gpt-5');
        expect(useActiveThreadStore.getState().composerSelectedReasoningEffort).toBe('high');
    });
});

describe('active thread permission mode state', () => {
    beforeEach(() => {
        resetStore();
    });

    it('defaults permission mode to full access and resets explicit selections', () => {
        expect(useActiveThreadStore.getState().composerSelectedPermissionMode).toBe('full_access');

        useActiveThreadStore.getState().setComposerPermissionMode('supervised');
        expect(useActiveThreadStore.getState().composerSelectedPermissionMode).toBe('supervised');

        useActiveThreadStore.getState().reset();
        expect(useActiveThreadStore.getState().composerSelectedPermissionMode).toBe('full_access');
    });
});

describe('active thread shared composer domain adapter', () => {
    beforeEach(() => {
        resetStore();
        useActiveThreadStore.getState().activateComposerThread('thread-a');
    });

    it('routes attachment upload and capability mutations through the Rust state machine', () => {
        const attachment: ComposerAttachment = {
            path: '/tmp/release.txt',
            file_name: 'release.txt',
            kind: 'File',
            upload_state: 'Local',
        };

        useActiveThreadStore.getState().addComposerAttachment(attachment);
        expect(useActiveThreadStore.getState().markComposerAttachmentsUploading()).toEqual([
            { ...attachment, upload_state: 'Uploading' },
        ]);
        useActiveThreadStore.getState().addComposerCapability(mcpCapability);
        expect(useActiveThreadStore.getState().composerCapabilities).toEqual([mcpCapability]);
        useActiveThreadStore.getState().removeComposerCapability(mcpCapability.id);
        useActiveThreadStore.getState().removeComposerAttachmentAt(0);

        expect(useActiveThreadStore.getState().composerAttachments).toEqual([]);
        expect(useActiveThreadStore.getState().composerCapabilities).toEqual([]);
        expect(mockComposerDomainTransition).toHaveBeenCalledWith(
            expect.objectContaining({
                action: { AddCapability: { capability: mcpCapability } },
            }),
        );
    });

    it('keeps hot text input local while draft switches cross the shared lifecycle reducer', () => {
        mockComposerDomainTransition.mockClear();
        mockComposerDraftLifecycleTransition.mockClear();

        useActiveThreadStore.getState().setComposerText('typed without an FFI round-trip');

        expect(mockComposerDomainTransition).not.toHaveBeenCalled();
        expect(mockComposerDraftLifecycleTransition).not.toHaveBeenCalled();

        useActiveThreadStore.getState().activateComposerThread('thread-b');
        expect(mockComposerDraftLifecycleTransition).toHaveBeenCalledTimes(1);
    });
});

describe('active thread keyed composer drafts', () => {
    beforeEach(() => {
        resetStore();
    });

    it('restores composer text and selections by thread id', () => {
        useActiveThreadStore
            .getState()
            .syncDefaultComposerModelSelection('workspace-1', 'openai', 'gpt-5', 'high');
        useActiveThreadStore.getState().activateComposerThread('thread-a');
        useActiveThreadStore.getState().setComposerText('draft a');
        useActiveThreadStore.getState().setComposerPermissionMode('supervised');

        useActiveThreadStore.getState().activateComposerThread('thread-b');
        useActiveThreadStore.getState().setComposerText('draft b');
        useActiveThreadStore.getState().setComposerModelSelectionFromUser('anthropic', 'claude');

        useActiveThreadStore.getState().activateComposerThread('thread-a');

        expect(useActiveThreadStore.getState().composerText).toBe('draft a');
        expect(useActiveThreadStore.getState().composerSelectedProvider).toBe('openai');
        expect(useActiveThreadStore.getState().composerSelectedModel).toBe('gpt-5');
        expect(useActiveThreadStore.getState().composerSelectedReasoningEffort).toBe('high');
        expect(useActiveThreadStore.getState().composerSelectedPermissionMode).toBe('supervised');
        expect(useActiveThreadStore.getState().composerModelManuallySelected).toBe(false);

        useActiveThreadStore.getState().activateComposerThread('thread-b');

        expect(useActiveThreadStore.getState().composerText).toBe('draft b');
        expect(useActiveThreadStore.getState().composerSelectedProvider).toBe('anthropic');
        expect(useActiveThreadStore.getState().composerSelectedModel).toBe('claude');
        expect(useActiveThreadStore.getState().composerModelManuallySelected).toBe(true);
    });

    it('restores duplicate skill labels by their exact IDs', () => {
        const first = skillCapability(
            'user',
            'humanizer',
            'AAAAAAAAAAAAAAAAAAAAA',
            'alex',
        );
        const second = skillCapability(
            'user',
            'humanizer',
            'BBBBBBBBBBBBBBBBBBBBB',
            'alex',
        );
        expect(first.label).toBe(second.label);

        useActiveThreadStore.getState().activateComposerThread('thread-a');
        useActiveThreadStore.getState().setComposerCapabilities([first, second]);
        useActiveThreadStore.getState().activateComposerThread('thread-b');
        useActiveThreadStore.getState().activateComposerThread('thread-a');

        expect(useActiveThreadStore.getState().composerCapabilities).toEqual([first, second]);
        expect(
            useActiveThreadStore.getState().composerCapabilities.map((capability) => capability.id),
        ).toEqual(['skill:AAAAAAAAAAAAAAAAAAAAA', 'skill:BBBBBBBBBBBBBBBBBBBBB']);
    });

    it('clears only the active thread payload after send', () => {
        useActiveThreadStore.getState().activateComposerThread('thread-a');
        useActiveThreadStore.getState().setComposerText('draft a');
        useActiveThreadStore.getState().activateComposerThread('thread-b');
        useActiveThreadStore.getState().setComposerText('draft b');

        useActiveThreadStore.getState().clearComposerPayload();

        expect(useActiveThreadStore.getState().composerText).toBe('');

        useActiveThreadStore.getState().activateComposerThread('thread-a');

        expect(useActiveThreadStore.getState().composerText).toBe('draft a');
    });

    it('applies resolved default selection to an already active live draft', () => {
        useActiveThreadStore.getState().activateComposerThread('draft-a');

        expect(useActiveThreadStore.getState().composerSelectedProvider).toBeNull();
        expect(useActiveThreadStore.getState().composerSelectedModel).toBeNull();

        useActiveThreadStore
            .getState()
            .syncDefaultComposerModelSelection('workspace-1', 'openai', 'gpt-5', 'high');

        expect(useActiveThreadStore.getState().composerSelectedProvider).toBe('openai');
        expect(useActiveThreadStore.getState().composerSelectedModel).toBe('gpt-5');
        expect(useActiveThreadStore.getState().composerSelectedReasoningEffort).toBe('high');
        expect(useActiveThreadStore.getState().composerDrafts['draft-a']).toMatchObject({
            selectedProvider: 'openai',
            selectedModel: 'gpt-5',
            selectedReasoningEffort: 'high',
            modelManuallySelected: false,
        });
    });

    it('does not derive composer mode from the opened thread snapshot', () => {
        useActiveThreadStore.getState().activateComposerThread('thread-a');

        useActiveThreadStore.getState().setSnapshot({
            thread_id: 'thread-a',
            thread: {
                id: 'thread-a',
                mode: 'Chat',
            },
        } as unknown as ClientActiveThreadSnapshot);

        expect(useActiveThreadStore.getState().composerSelectedMode).toBe('Agent');
        expect(useActiveThreadStore.getState().composerModeManuallySelected).toBe(false);
    });
});

describe('active thread CLI capability drafts', () => {
    beforeEach(() => {
        resetStore();
    });

    it('preserves explicit selections when live presentation readiness changes', () => {
        const mixed = [
            skillCapability('user', 'user-skill'),
            mcpCapability,
            skillCapability('registry', 'registry-skill'),
            skillCapability('system', 'memory'),
            mcpToolCapability,
        ];
        useActiveThreadStore.getState().activateComposerThread('thread-a');
        useActiveThreadStore.getState().setComposerCapabilities(mixed);

        useActiveThreadStore
            .getState()
            .setComposerModelSelectionFromUser(
                'cli_runtime:codex',
                null,
                cliPolicy(true, false),
                'Capabilities removed',
            );

        expect(useActiveThreadStore.getState().composerCapabilities).toEqual(mixed);
        expect(useActiveThreadStore.getState().composerError).toBeNull();
        expect(useActiveThreadStore.getState().composerDrafts['thread-a']).toMatchObject({
            capabilityTarget: cliPolicy(true, false),
            capabilities: mixed,
        });

        useActiveThreadStore
            .getState()
            .syncComposerModelSelection(
                'cli_runtime:codex',
                'ignored-active-thread-model',
                null,
                UNSUPPORTED_CLI_COMPOSER_CAPABILITY_POLICY,
                'Capabilities removed',
            );
        expect(useActiveThreadStore.getState().composerCapabilityTarget).toEqual(
            UNSUPPORTED_CLI_COMPOSER_CAPABILITY_POLICY,
        );
        expect(useActiveThreadStore.getState().composerCapabilities).toEqual(mixed);
        expect(useActiveThreadStore.getState().composerError).toBeNull();
    });

    it('restores raw MCP selections and presentation target from a keyed draft', () => {
        const selected = [mcpCapability, mcpToolCapability];
        useActiveThreadStore.getState().activateComposerThread('thread-a');
        useActiveThreadStore.getState().setComposerCapabilities(selected);
        useActiveThreadStore
            .getState()
            .setComposerModelSelectionFromUser(
                'cli_runtime:codex',
                'gpt-5',
                UNSUPPORTED_CLI_COMPOSER_CAPABILITY_POLICY,
            );

        useActiveThreadStore.getState().activateComposerThread('thread-b');
        useActiveThreadStore.getState().activateComposerThread('thread-a');

        expect(useActiveThreadStore.getState().composerCapabilityTarget).toEqual(
            UNSUPPORTED_CLI_COMPOSER_CAPABILITY_POLICY,
        );
        expect(useActiveThreadStore.getState().composerCapabilities).toEqual(selected);
    });

    it('refreshes live support for a manual selection without replacing model or payload', () => {
        const selected = [skillCapability('user', 'user-skill'), mcpCapability];
        useActiveThreadStore.getState().activateComposerThread('thread-a');
        useActiveThreadStore
            .getState()
            .setComposerModelSelectionFromUser(
                'cli_runtime:codex',
                'gpt-5',
                cliPolicy(true, false),
            );
        useActiveThreadStore.getState().setComposerCapabilities(selected);

        useActiveThreadStore
            .getState()
            .syncComposerModelSelection(
                'cli_runtime:codex',
                'ignored-active-thread-model',
                null,
                UNSUPPORTED_CLI_COMPOSER_CAPABILITY_POLICY,
                'Capabilities removed',
            );

        const state = useActiveThreadStore.getState();
        expect(state.composerSelectedModel).toBe('gpt-5');
        expect(state.composerCapabilityTarget).toEqual(UNSUPPORTED_CLI_COMPOSER_CAPABILITY_POLICY);
        expect(state.composerCapabilities).toEqual(selected);
        expect(state.composerError).toBeNull();
        expect(state.composerDrafts['thread-a']).toMatchObject({
            selectedModel: 'gpt-5',
            capabilityTarget: UNSUPPORTED_CLI_COMPOSER_CAPABILITY_POLICY,
            capabilities: selected,
        });
    });

    it('does not rewrite historical snapshots or composer payload on presentation change', () => {
        const historicalSnapshot = {
            thread_id: 'thread-a',
            projection: {
                historical_user_message_attachments: [mcpCapability, mcpToolCapability],
            },
        } as unknown as ClientActiveThreadSnapshot;
        const attachment = { path: '/tmp/example.txt' } as unknown as ComposerAttachment;

        useActiveThreadStore.getState().activateComposerThread('thread-a');
        useActiveThreadStore.getState().setSnapshot(historicalSnapshot);
        useActiveThreadStore.getState().setComposerText('draft text');
        useActiveThreadStore.getState().setComposerAttachments([attachment]);
        useActiveThreadStore.getState().setComposerCapabilities([mcpCapability, mcpToolCapability]);

        useActiveThreadStore
            .getState()
            .setComposerModelSelectionFromUser(
                'cli_runtime:legacy',
                null,
                UNSUPPORTED_CLI_COMPOSER_CAPABILITY_POLICY,
                'Capabilities removed',
            );

        const state = useActiveThreadStore.getState();
        expect(state.snapshot).toBe(historicalSnapshot);
        expect(state.composerText).toBe('draft text');
        expect(state.composerAttachments).toEqual([attachment]);
        expect(state.composerCapabilities).toEqual([mcpCapability, mcpToolCapability]);
        expect(state.composerError).toBeNull();
    });
});
