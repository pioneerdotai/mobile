import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
    pioneerClient,
    type ComposerCapability,
    type RuntimeSummary,
    type SelectableSkillCapability,
} from '@/client';

import {
    composerSubmissionPlanForProvider,
    composerCapabilityTargetForProvider,
    cliRuntimeMcpReadinessReason,
    cliRuntimeMcpReadinessReasonFromCode,
    cliRuntimeMcpReadinessTranslationKey,
    filterSkillRowsForComposerTarget,
    type ComposerCapabilityPolicy,
} from './cli-runtime';

const cliPolicy = (supportsSkills: boolean, supportsMcpTools: boolean) =>
    ({
        kind: 'cli',
        supports_skills: supportsSkills,
        supports_mcp_tools: supportsMcpTools,
    }) satisfies ComposerCapabilityPolicy;

jest.mock('@/client', () => ({
    pioneerClient: {
        composerCapabilityTarget: jest.fn(),
        composerCapabilityMenuVisibility: jest.fn(),
        composerSkillRowsForTarget: jest.fn(),
        composerSubmissionPlan: jest.fn(),
    },
}));

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
    {
        id: 'skill:UUUUUUUUUUUUUUUUUUUUU',
        label: 'user',
        kind: {
            Skill: {
                skill_id: 'UUUUUUUUUUUUUUUUUUUUU',
                owner: null,
                slug: 'user',
                source_kind: 'user',
            },
        },
    },
    {
        id: 'server',
        label: 'docs',
        kind: { McpServer: { name: 'docs', scope_kind: 'workspace' } },
    },
    {
        id: 'skill:RRRRRRRRRRRRRRRRRRRRR',
        label: 'registry',
        kind: {
            Skill: {
                skill_id: 'RRRRRRRRRRRRRRRRRRRRR',
                owner: null,
                slug: 'registry',
                source_kind: 'registry',
            },
        },
    },
    {
        id: 'skill:SSSSSSSSSSSSSSSSSSSSS',
        label: 'pioneer/system',
        kind: {
            Skill: {
                skill_id: 'SSSSSSSSSSSSSSSSSSSSS',
                owner: 'pioneer',
                slug: 'system',
                source_kind: 'system',
            },
        },
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
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('delegates live presentation targeting to pioneer-client', () => {
        const runtimes = [runtime('codex', true, true)];
        const target = cliPolicy(true, true);
        jest.mocked(pioneerClient.composerCapabilityTarget).mockReturnValue(target);

        expect(composerCapabilityTargetForProvider('cli_runtime:codex', runtimes)).toEqual(target);
        expect(pioneerClient.composerCapabilityTarget).toHaveBeenCalledWith({
            provider: 'cli_runtime:codex',
            runtimes,
        });
    });

    it('delegates skill-row projection to pioneer-client', () => {
        const rows: SelectableSkillCapability[] = [
            {
                description: 'user skill',
                display_name: 'User',
                key: 'skill:UUUUUUUUUUUUUUUUUUUUU',
                label: 'user',
                owner: null,
                selectable: true,
                skill_id: 'UUUUUUUUUUUUUUUUUUUUU',
                slug: 'user',
                source_kind: 'user',
                unavailable_reason: null,
            },
        ];
        const target = cliPolicy(true, true);
        jest.mocked(pioneerClient.composerSkillRowsForTarget).mockReturnValue(rows);

        expect(filterSkillRowsForComposerTarget(rows, target)).toEqual(rows);
        expect(pioneerClient.composerSkillRowsForTarget).toHaveBeenCalledWith({ rows, target });
    });

    it('uses the same pioneer-client submission contract for text and voice', () => {
        jest.mocked(pioneerClient.composerSubmissionPlan).mockImplementation((request) => {
            const requestedCapabilities = request.capabilities ?? [];
            return {
                capabilities: requestedCapabilities,
                has_composer_payload:
                    (request.text?.trim().length ?? 0) > 0 ||
                    request.has_attachments === true ||
                    requestedCapabilities.length > 0,
                removed: [],
                target: cliPolicy(true, true),
            };
        });

        const textPlan = composerSubmissionPlanForProvider(
            'cli_runtime:codex',
            'message',
            true,
            capabilities,
        );
        const voicePlan = composerSubmissionPlanForProvider(
            'cli_runtime:codex',
            '',
            true,
            capabilities,
        );

        expect(textPlan.capabilities).toEqual(voicePlan.capabilities);
        expect(textPlan.capabilities.map((capability) => capability.id)).toEqual([
            'skill:UUUUUUUUUUUUUUUUUUUUU',
            'server',
            'skill:RRRRRRRRRRRRRRRRRRRRR',
            'skill:SSSSSSSSSSSSSSSSSSSSS',
            'tool',
        ]);
        expect(textPlan.has_composer_payload).toBe(true);
        expect(voicePlan.has_composer_payload).toBe(true);
        expect(pioneerClient.composerSubmissionPlan).toHaveBeenNthCalledWith(1, {
            provider: 'cli_runtime:codex',
            text: 'message',
            has_attachments: true,
            capabilities,
        });
        expect(pioneerClient.composerSubmissionPlan).toHaveBeenNthCalledWith(2, {
            provider: 'cli_runtime:codex',
            text: '',
            has_attachments: true,
            capabilities,
        });
    });

    it('preserves exact skill identity in a rejected capability snapshot', () => {
        const rejected = capabilities[0];
        jest.mocked(pioneerClient.composerSubmissionPlan).mockReturnValue({
            capabilities: [],
            has_composer_payload: false,
            removed: [{ capability: rejected, reason: 'skill_source_not_exportable' }],
            target: cliPolicy(true, true),
        });

        const plan = composerSubmissionPlanForProvider('cli_runtime:codex', '', false, [rejected]);

        expect(plan.removed[0]?.capability).toEqual(rejected);
        expect(plan.removed[0]?.capability.id).toBe('skill:UUUUUUUUUUUUUUUUUUUUU');
        expect(plan.removed[0]?.capability.kind).toEqual({
            Skill: {
                skill_id: 'UUUUUUUUUUUUUUUUUUUUU',
                owner: null,
                slug: 'user',
                source_kind: 'user',
            },
        });
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
