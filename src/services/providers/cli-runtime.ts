import type { ComposerCapability, RuntimeSummary } from '@/client';

export const CLI_RUNTIME_PROVIDER_PREFIX = 'cli_runtime:';

export type ComposerCapabilityPolicy = Readonly<{
    kind: 'native' | 'cli';
    supportsSkills: boolean;
    supportsMcpTools: boolean;
}>;

export const NATIVE_COMPOSER_CAPABILITY_POLICY: ComposerCapabilityPolicy = Object.freeze({
    kind: 'native',
    supportsSkills: true,
    supportsMcpTools: true,
});

export const UNSUPPORTED_CLI_COMPOSER_CAPABILITY_POLICY: ComposerCapabilityPolicy = Object.freeze({
    kind: 'cli',
    supportsSkills: false,
    supportsMcpTools: false,
});

export const COMPOSER_CAPABILITY_POLICY_MATRIX = Object.freeze([
    Object.freeze({ id: 'native', policy: NATIVE_COMPOSER_CAPABILITY_POLICY }),
    Object.freeze({ id: 'cli_neither', policy: UNSUPPORTED_CLI_COMPOSER_CAPABILITY_POLICY }),
    Object.freeze({
        id: 'cli_skills_only',
        policy: Object.freeze({
            kind: 'cli',
            supportsSkills: true,
            supportsMcpTools: false,
        }) satisfies ComposerCapabilityPolicy,
    }),
    Object.freeze({
        id: 'cli_mcp_only',
        policy: Object.freeze({
            kind: 'cli',
            supportsSkills: false,
            supportsMcpTools: true,
        }) satisfies ComposerCapabilityPolicy,
    }),
    Object.freeze({
        id: 'cli_both',
        policy: Object.freeze({
            kind: 'cli',
            supportsSkills: true,
            supportsMcpTools: true,
        }) satisfies ComposerCapabilityPolicy,
    }),
] as const);

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
): ComposerCapabilityPolicy => {
    const runtimeId = runtimeIdFromCliRuntimeProviderKey(provider);

    if (!runtimeId) {
        return NATIVE_COMPOSER_CAPABILITY_POLICY;
    }

    const runtime = runtimes.find((candidate) => candidate.runtime_id === runtimeId);

    if (
        !runtime?.enabled ||
        (runtime.status.state !== 'ready' && runtime.status.state !== 'degraded')
    ) {
        return UNSUPPORTED_CLI_COMPOSER_CAPABILITY_POLICY;
    }

    return {
        kind: 'cli',
        supportsSkills: runtime.capabilities.supports_skills === true,
        supportsMcpTools: runtime.capabilities.supports_mcp_tools === true,
    };
};

export const composerCapabilityPolicySupportsMcpTools = (
    policy: ComposerCapabilityPolicy,
): boolean => policy.supportsMcpTools;

export type ComposerCapabilityMenuVisibility = Readonly<{
    skills: boolean;
    mcp: boolean;
    any: boolean;
}>;

export const composerCapabilityMenuVisibility = (
    policy: ComposerCapabilityPolicy,
): ComposerCapabilityMenuVisibility => ({
    skills: policy.supportsSkills,
    mcp: policy.supportsMcpTools,
    any: policy.supportsSkills || policy.supportsMcpTools,
});

export const filterSkillRowsForComposerTarget = <Row extends { source_kind: string }>(
    rows: readonly Row[],
    target: ComposerCapabilityPolicy,
): Row[] => {
    if (!target.supportsSkills) {
        return [];
    }

    if (target.kind === 'native') {
        return [...rows];
    }

    return rows.filter((row) => row.source_kind === 'user' || row.source_kind === 'registry');
};

export const filterComposerCapabilitiesForTarget = (
    capabilities: readonly ComposerCapability[],
    target: ComposerCapabilityPolicy,
): ComposerCapability[] => {
    return capabilities.filter((capability) => {
        if ('Skill' in capability.kind) {
            if (!target.supportsSkills) {
                return false;
            }
            if (target.kind === 'native') {
                return true;
            }

            const source = capability.kind.Skill.source_kind;
            return source === 'user' || source === 'registry';
        }

        return target.supportsMcpTools;
    });
};

export type ComposerCapabilitySnapshot = Readonly<{
    capabilities: ComposerCapability[];
    hasComposerPayload: boolean;
}>;

export const composerCapabilitySnapshotForTarget = (
    text: string,
    hasAttachments: boolean,
    capabilities: readonly ComposerCapability[],
    target: ComposerCapabilityPolicy,
): ComposerCapabilitySnapshot => {
    const effectiveCapabilities = filterComposerCapabilitiesForTarget(capabilities, target);

    return {
        capabilities: effectiveCapabilities,
        hasComposerPayload:
            text.trim().length > 0 || hasAttachments || effectiveCapabilities.length > 0,
    };
};

export const composerHasSendableContentForTarget = (
    text: string,
    hasAttachments: boolean,
    capabilities: readonly ComposerCapability[],
    target: ComposerCapabilityPolicy,
): boolean =>
    composerCapabilitySnapshotForTarget(text, hasAttachments, capabilities, target)
        .hasComposerPayload;
