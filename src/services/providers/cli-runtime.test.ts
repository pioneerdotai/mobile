import { describe, expect, it } from '@jest/globals';
import type { ComposerCapability, RuntimeSummary } from '@/client';

import {
    composerHasSendableContentForTarget,
    composerCapabilityTargetForProvider,
    filterComposerCapabilitiesForTarget,
    filterSkillRowsForComposerTarget,
} from './cli-runtime';

const runtime = (
    runtimeId: string,
    supportsSkills: boolean | undefined,
    enabled = true,
    state: RuntimeSummary['status']['state'] = 'ready',
): RuntimeSummary => ({
    runtime_id: runtimeId,
    kind: 'codex',
    display_name: runtimeId,
    enabled,
    status: { state } as RuntimeSummary['status'],
    capabilities: {
        supports_skills: supportsSkills,
        supports_threads: true,
        supports_resume: false,
        supports_fork: false,
        supports_steer: false,
        supports_interrupt: true,
        supports_approvals: true,
        supports_file_change_approvals: true,
        supports_command_approvals: true,
        supports_user_input_requests: false,
        supports_model_list: true,
        supports_apps: false,
        supports_review: false,
        supports_compaction: false,
        supports_goal: false,
        supports_diff_updates: false,
        supports_history_read: true,
        supports_thread_archive: false,
        supports_auth_management: false,
        supports_generated_schema_probe: false,
    },
    account: null,
    version: null,
    binary_path: null,
    home_path: null,
    shadow_home_path: null,
    proxy_url: null,
    debug_native_events_enabled: false,
    models_refreshed_at_unix_ms: null,
    diagnostics: [],
    recent_stderr: [],
});

describe('composer CLI runtime capability target', () => {
    it('keeps API providers native', () => {
        expect(composerCapabilityTargetForProvider('openai', [])).toBe('native');
    });

    it('requires an exact enabled ready runtime with explicit skill support', () => {
        const runtimes = [runtime('codex', true), runtime('claude', false)];

        expect(composerCapabilityTargetForProvider('cli_runtime:codex', runtimes)).toBe(
            'skillCapableCli',
        );
        expect(composerCapabilityTargetForProvider('cli_runtime:claude', runtimes)).toBe(
            'unsupportedCli',
        );
        expect(composerCapabilityTargetForProvider('cli_runtime:missing', runtimes)).toBe(
            'unsupportedCli',
        );
    });

    it('fails closed for missing capability, disabled, and stale status data', () => {
        expect(
            composerCapabilityTargetForProvider('cli_runtime:missing-bit', [
                runtime('missing-bit', undefined),
            ]),
        ).toBe('unsupportedCli');
        expect(
            composerCapabilityTargetForProvider('cli_runtime:disabled', [
                runtime('disabled', true, false),
            ]),
        ).toBe('unsupportedCli');
        expect(
            composerCapabilityTargetForProvider('cli_runtime:stale', [
                runtime('stale', true, true, 'error'),
            ]),
        ).toBe('unsupportedCli');
    });

    it('keeps native rows and exports only exact user and registry sources to CLI', () => {
        const rows = [
            { source_kind: 'user', slug: 'user' },
            { source_kind: 'system', slug: 'system' },
            { source_kind: 'registry', slug: 'registry' },
            { source_kind: 'future', slug: 'unknown' },
        ];

        expect(filterSkillRowsForComposerTarget(rows, 'native')).toEqual(rows);
        expect(filterSkillRowsForComposerTarget(rows, 'unsupportedCli')).toEqual([]);
        expect(filterSkillRowsForComposerTarget(rows, 'skillCapableCli')).toEqual([
            rows[0],
            rows[2],
        ]);
    });

    it('uses the same target matrix for selected capabilities', () => {
        const capabilities: ComposerCapability[] = [
            { id: 'user', label: 'user', kind: { Skill: { slug: 'user', source_kind: 'user' } } },
            {
                id: 'mcp',
                label: 'mcp',
                kind: { McpServer: { name: 'docs', scope_kind: 'workspace' as const } },
            },
            {
                id: 'registry',
                label: 'registry',
                kind: { Skill: { slug: 'registry', source_kind: 'registry' } },
            },
            {
                id: 'system',
                label: 'system',
                kind: { Skill: { slug: 'system', source_kind: 'system' } },
            },
        ];

        expect(filterComposerCapabilitiesForTarget(capabilities, 'native')).toEqual(capabilities);
        expect(filterComposerCapabilitiesForTarget(capabilities, 'unsupportedCli')).toEqual([]);
        expect(
            filterComposerCapabilitiesForTarget(capabilities, 'skillCapableCli').map(
                (capability) => capability.id,
            ),
        ).toEqual(['user', 'registry']);
    });

    it('treats only an eligible CLI Skill as capability-only sendable content', () => {
        const userSkill: ComposerCapability = {
            id: 'user',
            label: 'user',
            kind: { Skill: { slug: 'user', source_kind: 'user' } },
        };
        const systemSkill: ComposerCapability = {
            id: 'system',
            label: 'system',
            kind: { Skill: { slug: 'system', source_kind: 'system' } },
        };

        expect(composerHasSendableContentForTarget('', false, [userSkill], 'skillCapableCli')).toBe(
            true,
        );
        expect(
            composerHasSendableContentForTarget('', false, [systemSkill], 'skillCapableCli'),
        ).toBe(false);
        expect(composerHasSendableContentForTarget('', false, [userSkill], 'unsupportedCli')).toBe(
            false,
        );
    });
});
