import { describe, expect, it } from '@jest/globals';
import type { ComposerCapability, RuntimeSummary } from '@/client';

import {
    NATIVE_COMPOSER_CAPABILITY_POLICY,
    UNSUPPORTED_CLI_COMPOSER_CAPABILITY_POLICY,
    composerHasSendableContentForTarget,
    composerCapabilitySnapshotForTarget,
    composerCapabilityTargetForProvider,
    cliRuntimeMcpReadinessReason,
    cliRuntimeMcpReadinessReasonFromCode,
    cliRuntimeMcpReadinessTranslationKey,
    filterComposerCapabilitiesForTarget,
    filterSkillRowsForComposerTarget,
    type ComposerCapabilityPolicy,
} from './cli-runtime';

const cliPolicy = (supportsSkills: boolean, supportsMcpTools: boolean) =>
    ({
        kind: 'cli',
        supportsSkills,
        supportsMcpTools,
    }) satisfies ComposerCapabilityPolicy;

const runtime = (
    runtimeId: string,
    supportsSkills: boolean | undefined,
    supportsMcpTools: boolean | undefined,
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
        supports_mcp_tools: supportsMcpTools,
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

const capabilities: ComposerCapability[] = [
    { id: 'user', label: 'user', kind: { Skill: { slug: 'user', source_kind: 'user' } } },
    {
        id: 'server',
        label: 'docs',
        kind: { McpServer: { name: 'docs', scope_kind: 'workspace' } },
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
    {
        id: 'tool',
        label: 'docs / search',
        kind: {
            McpTool: {
                server_name: 'docs',
                raw_tool_name: 'search',
                scope_kind: 'workspace',
            },
        },
    },
];

describe('composer CLI runtime capability policy', () => {
    it('keeps API providers native', () => {
        expect(composerCapabilityTargetForProvider('openai', [])).toEqual(
            NATIVE_COMPOSER_CAPABILITY_POLICY,
        );
    });

    it('maps exact enabled ready runtimes to independent skills and MCP flags', () => {
        const runtimes = [
            runtime('skills', true, false),
            runtime('mcp', false, true),
            runtime('combined', true, true),
            runtime('neither', false, false),
        ];

        expect(composerCapabilityTargetForProvider('cli_runtime:skills', runtimes)).toEqual(
            cliPolicy(true, false),
        );
        expect(composerCapabilityTargetForProvider('cli_runtime:mcp', runtimes)).toEqual(
            cliPolicy(false, true),
        );
        expect(composerCapabilityTargetForProvider('cli_runtime:combined', runtimes)).toEqual(
            cliPolicy(true, true),
        );
        expect(composerCapabilityTargetForProvider('cli_runtime:neither', runtimes)).toEqual(
            UNSUPPORTED_CLI_COMPOSER_CAPABILITY_POLICY,
        );
    });

    it('fails closed for missing flags, disabled, unresolved, and stale status data', () => {
        expect(
            composerCapabilityTargetForProvider('cli_runtime:missing-bits', [
                runtime('missing-bits', undefined, undefined),
            ]),
        ).toEqual(UNSUPPORTED_CLI_COMPOSER_CAPABILITY_POLICY);
        expect(
            composerCapabilityTargetForProvider('cli_runtime:disabled', [
                runtime('disabled', true, true, false),
            ]),
        ).toEqual(UNSUPPORTED_CLI_COMPOSER_CAPABILITY_POLICY);
        expect(
            composerCapabilityTargetForProvider('cli_runtime:stale', [
                runtime('stale', true, true, true, 'error'),
            ]),
        ).toEqual(UNSUPPORTED_CLI_COMPOSER_CAPABILITY_POLICY);
        expect(composerCapabilityTargetForProvider('cli_runtime:missing', [])).toEqual(
            UNSUPPORTED_CLI_COMPOSER_CAPABILITY_POLICY,
        );
    });

    it('keeps native skill rows and exports only user and registry skill rows to CLI', () => {
        const rows = [
            { source_kind: 'user', slug: 'user' },
            { source_kind: 'system', slug: 'system' },
            { source_kind: 'registry', slug: 'registry' },
            { source_kind: 'future', slug: 'unknown' },
        ];

        expect(filterSkillRowsForComposerTarget(rows, NATIVE_COMPOSER_CAPABILITY_POLICY)).toEqual(
            rows,
        );
        expect(
            filterSkillRowsForComposerTarget(rows, UNSUPPORTED_CLI_COMPOSER_CAPABILITY_POLICY),
        ).toEqual([]);
        expect(filterSkillRowsForComposerTarget(rows, cliPolicy(true, true))).toEqual([
            rows[0],
            rows[2],
        ]);
    });

    it('filters whole-server and individual-tool capabilities independently from skills', () => {
        const cases: [ComposerCapabilityPolicy, string[]][] = [
            [NATIVE_COMPOSER_CAPABILITY_POLICY, ['user', 'server', 'registry', 'system', 'tool']],
            [UNSUPPORTED_CLI_COMPOSER_CAPABILITY_POLICY, []],
            [cliPolicy(true, false), ['user', 'registry']],
            [cliPolicy(false, true), ['server', 'tool']],
            [cliPolicy(true, true), ['user', 'server', 'registry', 'tool']],
        ];

        for (const [policy, expectedIds] of cases) {
            expect(
                filterComposerCapabilitiesForTarget(capabilities, policy).map(
                    (capability) => capability.id,
                ),
            ).toEqual(expectedIds);
        }
    });

    it('treats every eligible capability kind as capability-only sendable content', () => {
        expect(
            composerHasSendableContentForTarget(
                '',
                false,
                [capabilities[0]],
                cliPolicy(true, false),
            ),
        ).toBe(true);
        expect(
            composerHasSendableContentForTarget(
                '',
                false,
                [capabilities[1]],
                cliPolicy(false, true),
            ),
        ).toBe(true);
        expect(
            composerHasSendableContentForTarget(
                '',
                false,
                [capabilities[3]],
                cliPolicy(true, true),
            ),
        ).toBe(false);
    });

    it('produces identical eligible capability snapshots for text and voice paths', () => {
        const policy = cliPolicy(true, true);
        const textSnapshot = composerCapabilitySnapshotForTarget(
            'message',
            true,
            capabilities,
            policy,
        );
        const voiceSnapshot = composerCapabilitySnapshotForTarget('', true, capabilities, policy);

        expect(textSnapshot.capabilities).toEqual(voiceSnapshot.capabilities);
        expect(textSnapshot.capabilities.map((capability) => capability.id)).toEqual([
            'user',
            'server',
            'registry',
            'tool',
        ]);
        expect(textSnapshot.hasComposerPayload).toBe(true);
        expect(voiceSnapshot.hasComposerPayload).toBe(true);
    });

    it('maps every safe MCP readiness category to localized presentation semantics', () => {
        const cases = [
            ['cli_runtime.mcp.runtime_not_ready', 'runtimeNotReady'],
            ['cli_runtime.mcp.provider_probe_failed', 'unsupportedContract'],
            ['cli_runtime.mcp.strict_isolation_failed', 'strictIsolationFailed'],
            ['cli_runtime.mcp.codex_required_list_failed', 'helperSelfProbeFailed'],
            ['cli_runtime.mcp.bridge_unavailable', 'platformIpcUnavailable'],
            ['cli_runtime.mcp.claude_resume_contract_failed', 'continuityUnavailable'],
            ['cli_runtime.mcp.readiness_unavailable', 'readinessUnavailable'],
        ] as const;

        for (const [code, expected] of cases) {
            expect(cliRuntimeMcpReadinessReasonFromCode(code)).toBe(expected);
            expect(cliRuntimeMcpReadinessTranslationKey(expected)).toMatch(/^modelSelectorMcp/);
        }
    });

    it('keeps runtime readiness distinct from selected Pioneer server health', () => {
        expect(cliRuntimeMcpReadinessReasonFromCode('mcp.server.runtime_unavailable')).toBeNull();
        expect(cliRuntimeMcpReadinessReasonFromCode('mcp.server.not_ready')).toBeNull();
    });

    it('fails closed without exposing raw readiness diagnostic values', () => {
        const unavailable = runtime('codex', true, false);
        unavailable.diagnostics = [
            {
                level: 'error',
                code: 'cli_runtime.mcp.future_reason',
                message: 'config=/private/tmp/secret bootstrap=secret grant=secret',
            },
        ];

        expect(cliRuntimeMcpReadinessReason(unavailable)).toBe('readinessUnavailable');
        expect(cliRuntimeMcpReadinessTranslationKey('readinessUnavailable')).toBe(
            'modelSelectorMcpReadinessUnavailable',
        );
        expect(cliRuntimeMcpReadinessTranslationKey('readinessUnavailable')).not.toContain(
            '/private',
        );
    });
});
