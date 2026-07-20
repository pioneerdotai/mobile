import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { QueryClient } from '@tanstack/react-query';

import { pioneerClient } from '@/client';
import { useGatewayStore } from '@/stores/gateway';
import { useWorkspaceStore } from '@/stores/workspace';
import { voiceInputDataSourceState } from './data-source';
import type { VoiceInputGatewayTarget } from './gateway-target';
import { clearVoiceInputQueries, fetchVoiceInputSettings, voiceInputQueryKeys } from './query';

jest.mock('@/client', () => ({
    pioneerClient: {
        gatewaySettingsGet: jest.fn(),
        voiceInputSettingsPlan: jest.fn(),
    },
}));
jest.mock('@/services/gateway/registry', () => ({
    defaultGatewayRegistry: () => ({ version: 1, active_gateway_id: null, remotes: [] }),
}));

const target = (
    gatewayId: string,
    connectionId: number,
    workspaceId = 'workspace-1',
): VoiceInputGatewayTarget => ({ gatewayId, connectionId, workspaceId });

const connect = (gatewayId: string, connectionId: number) => {
    useGatewayStore.setState({
        registry: { version: 1, active_gateway_id: gatewayId, remotes: [] },
        connectionId,
        connectionGatewayId: gatewayId,
        connectionState: 'Connected',
    });
    useWorkspaceStore.setState({ activeWorkspaceId: 'workspace-1' });
};

describe('active-Gateway Voice Input read model', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        useGatewayStore.setState({
            registry: { version: 1, active_gateway_id: null, remotes: [] },
            connectionId: null,
            connectionGatewayId: null,
            connectionState: 'Idle',
        });
        useWorkspaceStore.setState({ activeWorkspaceId: null });
    });

    it('keys settings and status by Gateway id', () => {
        expect(voiceInputQueryKeys.settings(target('gateway-a', 7))).not.toEqual(
            voiceInputQueryKeys.settings(target('gateway-b', 8)),
        );
        expect(voiceInputQueryKeys.status(target('gateway-a', 7))).not.toEqual(
            voiceInputQueryKeys.status(target('gateway-b', 8)),
        );
    });

    it('exposes a clear read-only state while disconnected', () => {
        expect(voiceInputDataSourceState('gateway-a', null, false, null)).toEqual({
            kind: 'offline',
            gatewayId: 'gateway-a',
            readOnly: true,
            target: null,
        });
    });

    it('loads settings only for the active Gateway connection', async () => {
        connect('gateway-a', 7);
        jest.mocked(pioneerClient.gatewaySettingsGet).mockResolvedValue({
            settings: { memory: {} },
        } as never);

        await fetchVoiceInputSettings(target('gateway-a', 7));

        expect(pioneerClient.gatewaySettingsGet).toHaveBeenCalledTimes(1);
        await expect(fetchVoiceInputSettings(target('gateway-b', 7))).rejects.toMatchObject({
            code: 'voice_input_gateway_inactive',
        });
    });

    it('rejects the transition window where registry and socket identities differ', async () => {
        connect('gateway-a', 7);
        useGatewayStore.setState({
            registry: { version: 1, active_gateway_id: 'gateway-b', remotes: [] },
        });

        await expect(fetchVoiceInputSettings(target('gateway-b', 7))).rejects.toMatchObject({
            code: 'voice_input_gateway_inactive',
        });
        expect(pioneerClient.gatewaySettingsGet).not.toHaveBeenCalled();
    });

    it('keeps a settings error on the requesting Gateway key', async () => {
        const queryClient = new QueryClient({
            defaultOptions: { queries: { retry: false, gcTime: Number.POSITIVE_INFINITY } },
        });
        connect('gateway-a', 7);
        const error = new Error('settings failed');
        jest.mocked(pioneerClient.gatewaySettingsGet).mockRejectedValue(error);

        await expect(
            queryClient.fetchQuery({
                queryKey: voiceInputQueryKeys.settings(target('gateway-a', 7)),
                queryFn: () => fetchVoiceInputSettings(target('gateway-a', 7)),
            }),
        ).rejects.toBe(error);

        expect(
            queryClient.getQueryState(voiceInputQueryKeys.settings(target('gateway-a', 7)))?.error,
        ).toBe(error);
        expect(
            queryClient.getQueryState(voiceInputQueryKeys.settings(target('gateway-b', 8))),
        ).toBeUndefined();
    });

    it('clears all Voice Input read caches on switch or disconnect', async () => {
        const queryClient = new QueryClient({
            defaultOptions: { queries: { gcTime: Number.POSITIVE_INFINITY } },
        });
        queryClient.setQueryData(voiceInputQueryKeys.settings(target('gateway-a', 7)), {
            value: 'a',
        });
        queryClient.setQueryData(voiceInputQueryKeys.settings(target('gateway-b', 8)), {
            value: 'b',
        });

        await clearVoiceInputQueries(queryClient);

        expect(queryClient.getQueriesData({ queryKey: voiceInputQueryKeys.all })).toEqual([]);
    });
});
