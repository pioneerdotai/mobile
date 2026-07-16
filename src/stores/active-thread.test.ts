import { beforeEach, describe, expect, it } from '@jest/globals';

import type { ClientActiveThreadSnapshot, ComposerAttachment, ComposerCapability } from '@/client';
import {
    NATIVE_COMPOSER_CAPABILITY_POLICY,
    UNSUPPORTED_CLI_COMPOSER_CAPABILITY_POLICY,
    type ComposerCapabilityPolicy,
} from '@/services/providers/cli-runtime';

import { useActiveThreadStore } from './active-thread';

const resetStore = () => {
    useActiveThreadStore.getState().resetDefaultComposerModelSelection();
    useActiveThreadStore.getState().reset();
};

const skillCapability = (sourceKind: string, slug: string): ComposerCapability => ({
    id: `skill:${sourceKind}:${slug}`,
    label: slug,
    kind: { Skill: { slug, source_kind: sourceKind } },
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
        supportsSkills,
        supportsMcpTools,
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
            ['skill:user:user-skill'],
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
        expect(useActiveThreadStore.getState().composerCapabilities).toEqual([]);
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

    it('preserves native capabilities and filters supported CLI selections atomically', () => {
        const mixed = [
            skillCapability('user', 'user-skill'),
            mcpCapability,
            skillCapability('registry', 'registry-skill'),
            skillCapability('system', 'memory'),
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

        expect(useActiveThreadStore.getState().composerCapabilities.map((item) => item.id)).toEqual(
            ['skill:user:user-skill', 'skill:registry:registry-skill'],
        );
        expect(useActiveThreadStore.getState().composerError).toBe('Capabilities removed');
        expect(useActiveThreadStore.getState().composerDrafts['thread-a']).toMatchObject({
            capabilityTarget: cliPolicy(true, false),
            capabilities: [mixed[0], mixed[2]],
        });
    });

    it('preserves whole-server and individual-tool selections for MCP-only and combined CLI', () => {
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
                cliPolicy(true, true),
                'Capabilities removed',
            );
        expect(useActiveThreadStore.getState().composerCapabilities.map((item) => item.id)).toEqual(
            [mixed[0].id, mixed[1].id, mixed[2].id, mixed[4].id],
        );

        useActiveThreadStore
            .getState()
            .setComposerModelSelectionFromUser(
                'cli_runtime:codex',
                null,
                cliPolicy(false, true),
                'Capabilities removed',
            );
        expect(useActiveThreadStore.getState().composerCapabilities).toEqual([
            mcpCapability,
            mcpToolCapability,
        ]);
        expect(useActiveThreadStore.getState().composerDrafts['thread-a']).toMatchObject({
            capabilityTarget: cliPolicy(false, true),
            capabilities: [mcpCapability, mcpToolCapability],
        });

        useActiveThreadStore.getState().activateComposerThread('thread-b');
        useActiveThreadStore.getState().activateComposerThread('thread-a');
        expect(useActiveThreadStore.getState().composerCapabilities).toEqual([
            mcpCapability,
            mcpToolCapability,
        ]);
    });

    it('removes every capability for unsupported CLI and never resurrects hidden values', () => {
        useActiveThreadStore.getState().activateComposerThread('thread-a');
        useActiveThreadStore
            .getState()
            .setComposerCapabilities([skillCapability('user', 'user-skill'), mcpCapability]);

        useActiveThreadStore
            .getState()
            .setComposerModelSelectionFromUser(
                'cli_runtime:legacy',
                null,
                UNSUPPORTED_CLI_COMPOSER_CAPABILITY_POLICY,
                'Capabilities removed',
            );
        expect(useActiveThreadStore.getState().composerCapabilities).toEqual([]);
        expect(useActiveThreadStore.getState().composerError).toBe('Capabilities removed');

        useActiveThreadStore
            .getState()
            .setComposerModelSelectionFromUser('openai', null, NATIVE_COMPOSER_CAPABILITY_POLICY);
        expect(useActiveThreadStore.getState().composerCapabilities).toEqual([]);
    });

    it('restores filtered capabilities and target from the keyed thread draft', () => {
        useActiveThreadStore.getState().activateComposerThread('thread-a');
        useActiveThreadStore
            .getState()
            .setComposerCapabilities([
                skillCapability('user', 'user-skill'),
                skillCapability('system', 'memory'),
            ]);
        useActiveThreadStore
            .getState()
            .setComposerModelSelectionFromUser(
                'cli_runtime:codex',
                'gpt-5',
                cliPolicy(true, false),
            );

        useActiveThreadStore.getState().activateComposerThread('thread-b');
        useActiveThreadStore.getState().activateComposerThread('thread-a');

        expect(useActiveThreadStore.getState().composerCapabilityTarget).toEqual(
            cliPolicy(true, false),
        );
        expect(useActiveThreadStore.getState().composerCapabilities.map((item) => item.id)).toEqual(
            ['skill:user:user-skill'],
        );
    });

    it('refreshes runtime support for a manual selection without replacing its model', () => {
        useActiveThreadStore.getState().activateComposerThread('thread-a');
        useActiveThreadStore
            .getState()
            .setComposerModelSelectionFromUser(
                'cli_runtime:codex',
                'gpt-5',
                cliPolicy(true, false),
            );
        useActiveThreadStore
            .getState()
            .setComposerCapabilities([skillCapability('user', 'user-skill')]);

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
        expect(state.composerCapabilities).toEqual([]);
        expect(state.composerError).toBe('Capabilities removed');
        expect(state.composerDrafts['thread-a']).toMatchObject({
            selectedModel: 'gpt-5',
            capabilityTarget: UNSUPPORTED_CLI_COMPOSER_CAPABILITY_POLICY,
            capabilities: [],
        });
    });

    it('does not rewrite historical snapshots or unrelated composer payload on policy change', () => {
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
        expect(state.composerCapabilities).toEqual([]);
        expect(state.composerError).toBe('Capabilities removed');
    });
});
