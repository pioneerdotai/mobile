import { useEffect, useState } from 'react';

import { pioneerClient } from '@/client';
import { runtimeIdFromCliRuntimeProviderKey } from '@/services/providers/cli-runtime';
import {
    cachedProviderDisplayName,
    isCliRuntimeProvider,
    providerDisplayName,
} from '@/services/providers/model-selector';

type DisplayNameState = {
    key: string;
    label: string | null;
};

type DisplayNameResult = {
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
): DisplayNameResult => {
    const key = modelDisplayNameKey(workspaceId, provider, model);
    const [state, setState] = useState<DisplayNameState | null>(null);

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

const providerDisplayNameKey = (
    workspaceId: string | null | undefined,
    provider: string | null | undefined,
): string | null => {
    if (!workspaceId || !provider) {
        return null;
    }

    return JSON.stringify([workspaceId, provider]);
};

export const useProviderDisplayName = (
    workspaceId: string | null | undefined,
    provider: string | null | undefined,
): DisplayNameResult => {
    const key = providerDisplayNameKey(workspaceId, provider);
    const [state, setState] = useState<DisplayNameState | null>(null);
    const value = provider?.trim() ?? '';

    useEffect(() => {
        let cancelled = false;

        if (!key || !workspaceId || !value || !isCliRuntimeProvider(value)) {
            return () => {
                cancelled = true;
            };
        }

        const cached = cachedProviderDisplayName(workspaceId, value);
        if (cached !== undefined) {
            return () => {
                cancelled = true;
            };
        }

        void providerDisplayName(workspaceId, value)
            .then((label) => {
                if (!cancelled) {
                    setState({ key, label });
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setState({ key, label: null });
                }
            });

        return () => {
            cancelled = true;
        };
    }, [key, value, workspaceId]);

    if (!key || !value) {
        return { label: null, loading: false };
    }

    if (!isCliRuntimeProvider(value)) {
        return { label: value, loading: false };
    }

    if (state?.key === key) {
        return { label: state.label ?? cliRuntimeProviderFallbackLabel(value), loading: false };
    }

    const cached = workspaceId ? cachedProviderDisplayName(workspaceId, value) : undefined;
    if (cached !== undefined) {
        return { label: cached ?? cliRuntimeProviderFallbackLabel(value), loading: false };
    }

    return { label: cliRuntimeProviderFallbackLabel(value), loading: false };
};

const cliRuntimeProviderFallbackLabel = (provider: string): string | null => {
    const runtimeId = runtimeIdFromCliRuntimeProviderKey(provider);

    if (!runtimeId) {
        return null;
    }

    return runtimeId === 'codex' ? 'Codex CLI' : runtimeId;
};
