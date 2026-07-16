import { pioneerClient } from '@/client';
import type {
    ProviderListModelsResponse,
    ProviderModelInfo,
    ReasoningEffortRow,
    RuntimeStatus,
    RuntimeSummary,
} from '@/client';
import {
    NATIVE_COMPOSER_CAPABILITY_POLICY,
    cliRuntimeMcpReadinessReason,
    cliRuntimeProviderKey,
    composerCapabilityTargetForProvider,
    isCliRuntimeProvider,
    type ComposerCapabilityPolicy,
    type CliRuntimeMcpReadinessReason,
} from './cli-runtime';
import { refreshCliRuntimeSummaries } from './cli-runtime-live';

export type ModelSelectorProvider = {
    id: string;
    label: string;
    kind: 'api' | 'cliRuntime';
    capabilityTarget: ComposerCapabilityPolicy;
    mcpReadinessReason: CliRuntimeMcpReadinessReason | null;
};

export const listProviders = async (workspaceId: string): Promise<ModelSelectorProvider[]> => {
    const [apiProviders, cliRuntimes] = await Promise.allSettled([
        pioneerClient.providerList({ workspace_id: workspaceId }),
        refreshCliRuntimeSummaries(workspaceId),
    ]);

    const rows: ModelSelectorProvider[] =
        apiProviders.status === 'fulfilled'
            ? apiProviders.value.providers.map((provider) => ({
                  id: provider.name,
                  label: provider.name,
                  kind: 'api',
                  capabilityTarget: NATIVE_COMPOSER_CAPABILITY_POLICY,
                  mcpReadinessReason: null,
              }))
            : [];

    if (cliRuntimes.status === 'fulfilled') {
        rows.push(
            ...cliRuntimes.value.filter(cliRuntimeVisibleInModelSelector).map((runtime) => ({
                id: cliRuntimeProviderKey(runtime.runtime_id),
                label: runtime.display_name,
                kind: 'cliRuntime' as const,
                capabilityTarget: composerCapabilityTargetForProvider(
                    cliRuntimeProviderKey(runtime.runtime_id),
                    cliRuntimes.value,
                ),
                mcpReadinessReason: cliRuntimeMcpReadinessReason(runtime),
            })),
        );
    }

    if (apiProviders.status === 'rejected' && cliRuntimes.status === 'rejected') {
        throw apiProviders.reason;
    }

    return rows;
};

export const providerDisplayName = async (
    workspaceId: string,
    providerId: string,
): Promise<string | null> => {
    const rows = await listProviders(workspaceId);
    return rows.find((provider) => provider.id === providerId)?.label ?? null;
};

export const listProviderModels = async (
    workspaceId: string,
    provider: string,
): Promise<ProviderListModelsResponse> => {
    return pioneerClient.providerListModels({ workspace_id: workspaceId, provider });
};

export const resolveSelectedProviderModel = (
    models: ProviderModelInfo[],
    provider: string | null,
    model: string | null,
): ProviderModelInfo | null => {
    if (!provider || !model) {
        return null;
    }

    return models.find((row) => row.provider === provider && row.id === model) ?? null;
};

export const reasoningEffortRowsForModel = (
    model: ProviderModelInfo | null | undefined,
    selectedEffort: string | null,
): ReasoningEffortRow[] => {
    if (!model) {
        return [];
    }

    return pioneerClient.reasoningEffortRows({
        model,
        selected_effort: selectedEffort,
    }).rows;
};

export const reasoningEffortDisplayLabelForModel = (
    model: ProviderModelInfo | null | undefined,
    selectedEffort: string | null,
): string | null => {
    if (!selectedEffort?.trim()) {
        return null;
    }

    return (
        reasoningEffortRowsForModel(model, selectedEffort).find((row) => row.selected)?.label ??
        null
    );
};

const normalizeQuery = (query: string): string => query.trim().toLowerCase();

export const filterProviderRows = (
    providers: ModelSelectorProvider[],
    query: string,
): ModelSelectorProvider[] => {
    const normalizedQuery = normalizeQuery(query);

    if (!normalizedQuery) {
        return providers;
    }

    return providers.filter((provider) => provider.label.toLowerCase().includes(normalizedQuery));
};

export const filterModelRows = (
    models: ProviderModelInfo[],
    query: string,
): ProviderModelInfo[] => {
    const normalizedQuery = normalizeQuery(query);

    if (!normalizedQuery) {
        return models;
    }

    return models.filter((model) => {
        const modelName = model.name?.toLowerCase() ?? '';
        const modelDescription = model.description?.toLowerCase() ?? '';

        return (
            model.id.toLowerCase().includes(normalizedQuery) ||
            modelName.includes(normalizedQuery) ||
            modelDescription.includes(normalizedQuery)
        );
    });
};

export const modelRowDisplayName = (model: ProviderModelInfo): string => {
    return nonEmptyTrimmed(model.name) ?? model.id;
};

export const modelRowSecondaryText = (model: ProviderModelInfo): string | null => {
    const description = nonEmptyTrimmed(model.description);

    if (description) {
        return description;
    }

    const id = nonEmptyTrimmed(model.id);
    const displayName = modelRowDisplayName(model).trim();

    if (id && id.toLowerCase() !== displayName.toLowerCase()) {
        return id;
    }

    return null;
};

const nonEmptyTrimmed = (value: string | null | undefined): string | null => {
    const trimmed = value?.trim() ?? '';

    return trimmed ? trimmed : null;
};

const cliRuntimeVisibleInModelSelector = (runtime: RuntimeSummary): boolean => {
    return (
        runtime.enabled &&
        runtime.capabilities.supports_threads &&
        runtime.capabilities.supports_model_list &&
        runtimeReadyForModelSelector(runtime.status)
    );
};

const runtimeReadyForModelSelector = (status: RuntimeStatus): boolean => {
    return status.state === 'ready' || status.state === 'degraded';
};

export { isCliRuntimeProvider };
