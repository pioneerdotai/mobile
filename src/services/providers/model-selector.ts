import { pioneerClient } from '@/client';
import type {
    ProviderListModelsResponse,
    ProviderModelInfo,
    RuntimeStatus,
    RuntimeSummary,
} from '@/client';
import { cliRuntimeProviderKey, isCliRuntimeProvider } from './cli-runtime';

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

export const listProviderModels = async (
    workspaceId: string,
    provider: string,
): Promise<ProviderListModelsResponse> => {
    return pioneerClient.providerListModels({ workspace_id: workspaceId, provider });
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

        return (
            model.id.toLowerCase().includes(normalizedQuery) || modelName.includes(normalizedQuery)
        );
    });
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
