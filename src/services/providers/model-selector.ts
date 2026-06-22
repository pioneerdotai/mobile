import { pioneerClient } from '@/client';
import type {
    ProviderListModelsResponse,
    ProviderModelInfo,
    RuntimeModelInfo,
    RuntimeStatus,
    RuntimeSummary,
} from '@/client';
import {
    cliRuntimeProviderKey,
    isCliRuntimeProvider,
    runtimeIdFromCliRuntimeProviderKey,
} from './cli-runtime';

export type ModelSelectorProvider = {
    id: string;
    label: string;
    kind: 'api' | 'cliRuntime';
};

export const listProviders = async (workspaceId: string): Promise<ModelSelectorProvider[]> => {
    const [apiProviders, cliRuntimes] = await Promise.allSettled([
        pioneerClient.providerList({ workspace_id: workspaceId }),
        pioneerClient.cliRuntimeList({ workspace_id: workspaceId }),
    ]);

    const rows: ModelSelectorProvider[] =
        apiProviders.status === 'fulfilled'
            ? apiProviders.value.providers.map((provider) => ({
                  id: provider.name,
                  label: provider.name,
                  kind: 'api',
              }))
            : [];

    if (cliRuntimes.status === 'fulfilled') {
        rows.push(
            ...cliRuntimes.value.runtimes
                .filter(cliRuntimeVisibleInModelSelector)
                .map((runtime) => ({
                    id: cliRuntimeProviderKey(runtime.runtime_id),
                    label: runtime.display_name,
                    kind: 'cliRuntime' as const,
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
    const runtimeId = runtimeIdFromCliRuntimeProviderKey(provider);

    if (runtimeId) {
        const response = await pioneerClient.cliRuntimeListModels({
            workspace_id: workspaceId,
            runtime_id: runtimeId,
        });

        return {
            provider,
            models: response.models.map((model) => providerModelFromRuntimeModel(provider, model)),
        };
    }

    return pioneerClient.providerListModels({ workspace_id: workspaceId, provider });
};

const providerModelFromRuntimeModel = (
    provider: string,
    model: RuntimeModelInfo,
): ProviderModelInfo => {
    const inputModalities = model.input_modalities?.filter(Boolean) ?? [];
    const outputModalities = model.output_modalities?.filter(Boolean) ?? [];

    return {
        id: model.id,
        name: model.name ?? null,
        description: model.description ?? null,
        created: null,
        provider,
        owned_by: null,
        limits: {
            max_input_tokens: model.max_input_tokens ?? null,
            max_output_tokens: model.max_output_tokens ?? null,
            context_window: model.max_input_tokens ?? null,
        },
        capabilities: {
            vision: model.supports_vision ?? null,
            tool_calling: null,
            json_output: null,
            streaming: true,
            thinking: model.supports_reasoning ?? null,
            fine_tuning: null,
            input_modalities: inputModalities.length > 0 ? inputModalities : null,
            output_modalities: outputModalities.length > 0 ? outputModalities : null,
        },
        pricing: null,
        active: model.active ?? true,
        family: model.family ?? null,
        lifecycle_status: null,
    };
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
