import { pioneerClient } from '@/client';
import type {
    ProviderListModelsResponse,
    ProviderListResponse,
    ProviderModelInfo,
    ProviderSummary,
} from '@/client';

export const listProviders = async (workspaceId: string): Promise<ProviderListResponse> => {
    return pioneerClient.providerList({ workspace_id: workspaceId });
};

export const listProviderModels = async (
    workspaceId: string,
    provider: string,
): Promise<ProviderListModelsResponse> => {
    return pioneerClient.providerListModels({ workspace_id: workspaceId, provider });
};

const normalizeQuery = (query: string): string => query.trim().toLowerCase();

export const filterProviderRows = (
    providers: ProviderSummary[],
    query: string,
): ProviderSummary[] => {
    const normalizedQuery = normalizeQuery(query);

    if (!normalizedQuery) {
        return providers;
    }

    return providers.filter((provider) => provider.name.toLowerCase().includes(normalizedQuery));
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
