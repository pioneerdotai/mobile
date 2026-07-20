import {
    pioneerClient,
    type ComposerCapability,
    type ComposerCapabilityMenuVisibility,
    type ComposerCapabilityTarget,
    type ComposerSubmissionPlan,
    type RuntimeSummary,
    type SelectableSkillCapability,
} from '@/client';

export const CLI_RUNTIME_PROVIDER_PREFIX = 'cli_runtime:';

export type ComposerCapabilityPolicy = ComposerCapabilityTarget;

export const NATIVE_COMPOSER_CAPABILITY_POLICY: ComposerCapabilityTarget = Object.freeze({
    kind: 'native',
    supports_skills: true,
    supports_mcp_tools: true,
});

export const UNSUPPORTED_CLI_COMPOSER_CAPABILITY_POLICY: ComposerCapabilityTarget = Object.freeze({
    kind: 'cli',
    supports_skills: false,
    supports_mcp_tools: false,
});

export type CliRuntimeMcpReadinessReason =
    | 'runtimeNotReady'
    | 'unsupportedContract'
    | 'strictIsolationFailed'
    | 'helperSelfProbeFailed'
    | 'platformIpcUnavailable'
    | 'continuityUnavailable'
    | 'readinessUnavailable';

export const cliRuntimeMcpReadinessReasonFromCode = (
    code: string,
): CliRuntimeMcpReadinessReason | null => {
    switch (code.trim()) {
        case 'cli_runtime.mcp.ready':
            return null;
        case 'cli_runtime.mcp.runtime_not_ready':
            return 'runtimeNotReady';
        case 'cli_runtime.mcp.strict_isolation_failed':
        case 'cli_runtime.mcp.codex_overlay_isolation_failed':
        case 'cli_runtime.mcp.claude_artifact_hygiene_failed':
        case 'cli_runtime.mcp.claude_safe_mode_contract_failed':
            return 'strictIsolationFailed';
        case 'cli_runtime.mcp.codex_required_list_failed':
        case 'cli_runtime.mcp.codex_unknown_request_failed':
        case 'cli_runtime.mcp.codex_decoder_fixture_failed':
        case 'cli_runtime.mcp.claude_decoder_fixture_failed':
            return 'helperSelfProbeFailed';
        case 'cli_runtime.mcp.bridge_unavailable':
            return 'platformIpcUnavailable';
        case 'cli_runtime.mcp.codex_continuity_prerequisite_failed':
        case 'cli_runtime.mcp.claude_resume_contract_failed':
            return 'continuityUnavailable';
        case 'cli_runtime.mcp.provider_probe_failed':
        case 'cli_runtime.mcp.codex_raw_tool_filter_failed':
        case 'cli_runtime.mcp.claude_flag_contract_failed':
            return 'unsupportedContract';
        case 'cli_runtime.mcp.readiness_unavailable':
            return 'readinessUnavailable';
        default:
            return code.startsWith('cli_runtime.mcp.') ? 'readinessUnavailable' : null;
    }
};

export const cliRuntimeMcpReadinessReason = (
    runtime: RuntimeSummary,
): CliRuntimeMcpReadinessReason | null => {
    if (runtime.capabilities.supports_mcp_tools === true) {
        return null;
    }

    return (
        runtime.diagnostics
            ?.map((diagnostic) => cliRuntimeMcpReadinessReasonFromCode(diagnostic.code))
            .find((reason): reason is CliRuntimeMcpReadinessReason => reason !== null) ??
        'readinessUnavailable'
    );
};

export const cliRuntimeMcpReadinessTranslationKey = (
    reason: CliRuntimeMcpReadinessReason,
): `modelSelectorMcp${string}` => {
    const keys: Record<CliRuntimeMcpReadinessReason, `modelSelectorMcp${string}`> = {
        runtimeNotReady: 'modelSelectorMcpRuntimeNotReady',
        unsupportedContract: 'modelSelectorMcpUnsupportedContract',
        strictIsolationFailed: 'modelSelectorMcpStrictIsolationFailed',
        helperSelfProbeFailed: 'modelSelectorMcpHelperSelfProbeFailed',
        platformIpcUnavailable: 'modelSelectorMcpPlatformIpcUnavailable',
        continuityUnavailable: 'modelSelectorMcpContinuityUnavailable',
        readinessUnavailable: 'modelSelectorMcpReadinessUnavailable',
    };

    return keys[reason];
};

export const cliRuntimeProviderKey = (runtimeId: string): string =>
    `${CLI_RUNTIME_PROVIDER_PREFIX}${runtimeId}`;

export const runtimeIdFromCliRuntimeProviderKey = (provider: string | null | undefined) => {
    const value = provider?.trim();

    if (!value?.startsWith(CLI_RUNTIME_PROVIDER_PREFIX)) {
        return null;
    }

    const runtimeId = value.slice(CLI_RUNTIME_PROVIDER_PREFIX.length).trim();

    return runtimeId.length > 0 ? runtimeId : null;
};

export const isCliRuntimeProvider = (provider: string | null | undefined): boolean =>
    runtimeIdFromCliRuntimeProviderKey(provider) !== null;

export const composerCapabilityTargetForProvider = (
    provider: string | null | undefined,
    runtimes: readonly RuntimeSummary[],
): ComposerCapabilityTarget =>
    pioneerClient.composerCapabilityTarget({
        provider,
        runtimes: [...runtimes],
    });

export const composerCapabilityMenuVisibility = (
    target: ComposerCapabilityTarget,
): ComposerCapabilityMenuVisibility => pioneerClient.composerCapabilityMenuVisibility({ target });

export const filterSkillRowsForComposerTarget = (
    rows: readonly SelectableSkillCapability[],
    target: ComposerCapabilityTarget,
): SelectableSkillCapability[] =>
    pioneerClient.composerSkillRowsForTarget({ rows: [...rows], target });

export const composerSubmissionPlanForProvider = (
    provider: string | null | undefined,
    text: string,
    hasAttachments: boolean,
    capabilities: readonly ComposerCapability[],
): ComposerSubmissionPlan =>
    pioneerClient.composerSubmissionPlan({
        provider,
        text,
        has_attachments: hasAttachments,
        capabilities: [...capabilities],
    });
