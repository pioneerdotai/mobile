import { useEffect, useState } from 'react';

import { pioneerClient } from '@/client';
import { runtimeIdFromCliRuntimeProviderKey } from '@/services/providers/cli-runtime';
import { isCliRuntimeProvider, providerDisplayName } from '@/services/providers/model-selector';
import { useGatewayStore } from '@/stores/gateway';

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
    connectionId: number | null,
    workspaceId: string | null | undefined,
    provider: string | null | undefined,
    model: string | null | undefined,
): string | null => {
    if (connectionId === null || !workspaceId || !provider || !model) {
        return null;
    }

    return JSON.stringify([connectionId, workspaceId, provider, model]);
};

export const useProviderModelDisplayName = (
    workspaceId: string | null | undefined,
    provider: string | null | undefined,
    model: string | null | undefined,
): DisplayNameResult => {
    const connectionId = useGatewayStore((state) => state.connectionId);
    const key = modelDisplayNameKey(connectionId, workspaceId, provider, model);
    const [state, setState] = useState<DisplayNameState | null>(null);

    useEffect(() => {
        let cancelled = false;

        if (!key || !workspaceId || !provider || !model) {
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
    connectionId: number | null,
    workspaceId: string | null | undefined,
    provider: string | null | undefined,
): string | null => {
    if (connectionId === null || !workspaceId || !provider) {
        return null;
    }

    return JSON.stringify([connectionId, workspaceId, provider]);
};

export const useProviderDisplayName = (
    workspaceId: string | null | undefined,
    provider: string | null | undefined,
): DisplayNameResult => {
    const connectionId = useGatewayStore((state) => state.connectionId);
    const key = providerDisplayNameKey(connectionId, workspaceId, provider);
    const [state, setState] = useState<DisplayNameState | null>(null);
    const value = provider?.trim() ?? '';

    useEffect(() => {
        let cancelled = false;

        if (!key || !workspaceId || !value || !isCliRuntimeProvider(value)) {
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

    return { label: cliRuntimeProviderFallbackLabel(value), loading: false };
};

const cliRuntimeProviderFallbackLabel = (provider: string): string | null => {
    const runtimeId = runtimeIdFromCliRuntimeProviderKey(provider);

    if (!runtimeId) {
        return null;
    }

    switch (runtimeId) {
        case 'codex':
            return 'Codex CLI';
        case 'claude':
            return 'Claude CLI';
        default:
            return runtimeId;
    }
};
