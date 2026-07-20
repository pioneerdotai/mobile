import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { QueryClient } from '@tanstack/react-query';

import type { ClientEvent } from '@/client';
import { useGatewayStore } from '@/stores/gateway';
import type { VoiceInputGatewayTarget } from './gateway-target';
import {
    handleVoiceInputGatewayEvent,
    isVoiceInputStatusChangedEvent,
    refetchVoiceInputAfterResume,
} from './lifecycle';
import { voiceInputQueryKeys } from './query';

jest.mock('@/client', () => ({
    pioneerClient: {
        voiceInputSettingsPlan: jest.fn(),
    },
}));
jest.mock('@/services/gateway/registry', () => ({
    defaultGatewayRegistry: () => ({ version: 1, active_gateway_id: null, remotes: [] }),
}));

const target = (gatewayId: string, connectionId: number): VoiceInputGatewayTarget => ({
    gatewayId,
    connectionId,
    workspaceId: 'workspace-1',
});

const voiceStatusEvent = (): ClientEvent =>
    ({
        GatewayNotification: {
            kind: 'gateway_voice_input_status_changed',
            params: { settings: { enabled: true, runtime: { phase: 'downloading' } } },
        },
    }) as ClientEvent;

const unrelatedEvent = (): ClientEvent =>
    ({
        GatewayNotification: {
            kind: 'unknown',
            params: { method: 'test', params: {} },
        },
    }) as ClientEvent;

const connect = (gatewayId: string, connectionId: number) => {
    useGatewayStore.setState({
        registry: { version: 1, active_gateway_id: gatewayId, remotes: [] },
        connectionId,
        connectionGatewayId: gatewayId,
        connectionState: 'Connected',
    });
};

describe('Voice Input Gateway event lifecycle', () => {
    beforeEach(() => {
        useGatewayStore.setState({
            registry: { version: 1, active_gateway_id: null, remotes: [] },
            connectionId: null,
            connectionGatewayId: null,
            connectionState: 'Idle',
        });
    });

    it('recognizes only Voice Input status notifications', () => {
        expect(isVoiceInputStatusChangedEvent(voiceStatusEvent())).toBe(true);
        expect(isVoiceInputStatusChangedEvent(unrelatedEvent())).toBe(false);
        expect(isVoiceInputStatusChangedEvent(null)).toBe(false);
    });

    it('invalidates the authoritative settings snapshot for the matching connection', async () => {
        const queryClient = new QueryClient({
            defaultOptions: { queries: { gcTime: Number.POSITIVE_INFINITY } },
        });
        const activeTarget = target('gateway-a', 7);
        connect('gateway-a', 7);
        queryClient.setQueryData(voiceInputQueryKeys.settings(activeTarget), { value: 'old' });

        await expect(
            handleVoiceInputGatewayEvent(
                queryClient,
                activeTarget,
                { gatewayId: 'gateway-a', connectionId: 7 },
                voiceStatusEvent(),
            ),
        ).resolves.toBe(true);

        expect(
            queryClient.getQueryState(voiceInputQueryKeys.settings(activeTarget))?.isInvalidated,
        ).toBe(true);
    });

    it('ignores a late Gateway A event after Gateway B becomes active', async () => {
        const queryClient = new QueryClient({
            defaultOptions: { queries: { gcTime: Number.POSITIVE_INFINITY } },
        });
        const activeTarget = target('gateway-b', 8);
        connect('gateway-b', 8);
        queryClient.setQueryData(voiceInputQueryKeys.settings(activeTarget), { value: 'b' });

        await expect(
            handleVoiceInputGatewayEvent(
                queryClient,
                activeTarget,
                { gatewayId: 'gateway-a', connectionId: 7 },
                voiceStatusEvent(),
            ),
        ).resolves.toBe(false);

        expect(
            queryClient.getQueryState(voiceInputQueryKeys.settings(activeTarget))?.isInvalidated,
        ).toBe(false);
    });

    it('refetches only an active connected Gateway after resume', async () => {
        const queryClient = new QueryClient({
            defaultOptions: { queries: { gcTime: Number.POSITIVE_INFINITY } },
        });
        const activeTarget = target('gateway-a', 7);
        connect('gateway-a', 7);
        queryClient.setQueryData(voiceInputQueryKeys.settings(activeTarget), { value: 'old' });

        await expect(refetchVoiceInputAfterResume(queryClient, activeTarget)).resolves.toBe(true);
        expect(
            queryClient.getQueryState(voiceInputQueryKeys.settings(activeTarget))?.isInvalidated,
        ).toBe(true);

        connect('gateway-b', 8);
        await expect(refetchVoiceInputAfterResume(queryClient, activeTarget)).resolves.toBe(false);
    });
});
