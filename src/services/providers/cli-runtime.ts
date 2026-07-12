import type { ComposerCapability, RuntimeSummary } from '@/client';

export const CLI_RUNTIME_PROVIDER_PREFIX = 'cli_runtime:';

export type ComposerCapabilityTarget = 'native' | 'unsupportedCli' | 'skillCapableCli';

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
): ComposerCapabilityTarget => {
    const runtimeId = runtimeIdFromCliRuntimeProviderKey(provider);

    if (!runtimeId) {
        return 'native';
    }

    const runtime = runtimes.find((candidate) => candidate.runtime_id === runtimeId);

    if (
        !runtime?.enabled ||
        (runtime.status.state !== 'ready' && runtime.status.state !== 'degraded') ||
        runtime.capabilities.supports_skills !== true
    ) {
        return 'unsupportedCli';
    }

    return 'skillCapableCli';
};

export const filterSkillRowsForComposerTarget = <Row extends { source_kind: string }>(
    rows: readonly Row[],
    target: ComposerCapabilityTarget,
): Row[] => {
    if (target === 'native') {
        return [...rows];
    }

    if (target === 'unsupportedCli') {
        return [];
    }

    return rows.filter((row) => row.source_kind === 'user' || row.source_kind === 'registry');
};

export const filterComposerCapabilitiesForTarget = (
    capabilities: readonly ComposerCapability[],
    target: ComposerCapabilityTarget,
): ComposerCapability[] => {
    if (target === 'native') {
        return [...capabilities];
    }

    if (target === 'unsupportedCli') {
        return [];
    }

    return capabilities.filter((capability) => {
        if (!('Skill' in capability.kind)) {
            return false;
        }

        const source = capability.kind.Skill.source_kind;
        return source === 'user' || source === 'registry';
    });
};

export const composerHasSendableContentForTarget = (
    text: string,
    hasAttachments: boolean,
    capabilities: readonly ComposerCapability[],
    target: ComposerCapabilityTarget,
): boolean =>
    text.trim().length > 0 ||
    hasAttachments ||
    filterComposerCapabilitiesForTarget(capabilities, target).length > 0;
