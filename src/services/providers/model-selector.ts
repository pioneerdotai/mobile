import type { ProviderModelInfo } from '@/client';
import type { ComposerCapabilityPolicy, CliRuntimeMcpReadinessReason } from './cli-runtime';

export type ModelSelectorProvider = {
    id: string;
    label: string;
    kind: 'api' | 'cliRuntime';
    capabilityTarget: ComposerCapabilityPolicy;
    mcpReadinessReason: CliRuntimeMcpReadinessReason | null;
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
