import { useEffect, useState } from 'react';

import { pioneerClient } from '@/client';

type ModelDisplayNameState = {
    key: string;
    label: string | null;
};

type ProviderModelDisplayNameResult = {
    label: string | null;
    loading: boolean;
};

const displayNameCache = new Map<string, string | null>();

const modelDisplayNameKey = (
    workspaceId: string | null | undefined,
    provider: string | null | undefined,
    model: string | null | undefined,
): string | null => {
    if (!workspaceId || !provider || !model) {
        return null;
    }

    return JSON.stringify([workspaceId, provider, model]);
};

export const useProviderModelDisplayName = (
    workspaceId: string | null | undefined,
    provider: string | null | undefined,
    model: string | null | undefined,
): ProviderModelDisplayNameResult => {
    const key = modelDisplayNameKey(workspaceId, provider, model);
    const [state, setState] = useState<ModelDisplayNameState | null>(null);

    useEffect(() => {
        let cancelled = false;

        if (!key || !workspaceId || !provider || !model || displayNameCache.has(key)) {
            return () => {
                cancelled = true;
            };
        }

        void pioneerClient
            .providerModelDisplay({
                workspace_id: workspaceId,
                provider,
                model,
            })
            .then((response) => {
                if (cancelled) {
                    return;
                }

                const label = response.label ?? null;

                displayNameCache.set(key, label);
                setState({ key, label });
            })
            .catch(() => {
                if (!cancelled) {
                    displayNameCache.set(key, null);
                    setState({ key, label: null });
                }
            });

        return () => {
            cancelled = true;
        };
    }, [key, model, provider, workspaceId]);

    if (!key) {
        return { label: null, loading: false };
    }

    if (state?.key === key) {
        return { label: state.label, loading: false };
    }

    if (displayNameCache.has(key)) {
        return { label: displayNameCache.get(key) ?? null, loading: false };
    }

    return { label: null, loading: true };
};
