import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import type { AuthMeResponse, AuthorizationCapabilitySnapshot } from '@/client';

const mockGatewayAuthMe = jest.fn<() => Promise<AuthMeResponse>>();
const mockGatewayAuthorizationCapabilities =
    jest.fn<(workspaceId: string | null) => Promise<AuthorizationCapabilitySnapshot>>();
const mockPrincipalPresentationCapabilities = jest.fn();
const mockCurrentPrincipalPresentation = jest.fn();
const mockGatewayState = {
    connectionGatewayId: 'gateway-a',
    connectionId: 7,
    connectionState: 'Connected',
};
const mockWorkspaceState = { activeWorkspaceId: 'workspace-a' };

jest.mock('@/client', () => ({
    pioneerClient: {
        gatewayAuthMe: mockGatewayAuthMe,
        gatewayAuthorizationCapabilities: ({ workspace_id }: { workspace_id: string | null }) =>
            mockGatewayAuthorizationCapabilities(workspace_id),
        principalPresentationCapabilities: mockPrincipalPresentationCapabilities,
        currentPrincipalPresentation: mockCurrentPrincipalPresentation,
    },
}));
jest.mock('@/stores/gateway', () => ({
    useGatewayStore: (selector: (state: typeof mockGatewayState) => unknown) =>
        selector(mockGatewayState),
}));
jest.mock('@/stores/workspace', () => ({
    useWorkspaceStore: (selector: (state: typeof mockWorkspaceState) => unknown) =>
        selector(mockWorkspaceState),
}));

const { useAdministrationCapabilities, useCurrentPrincipalPresentation } =
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('./use-administration-capabilities') as typeof import('./use-administration-capabilities');
const { administrationQueryKeys } =
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@/services/administration/query') as typeof import('@/services/administration/query');

const flushQueryNotifications = async () => {
    await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
        await new Promise((resolve) => setTimeout(resolve, 0));
    });
};

const auth = {
    principal: {
        id: 'P00000000000000000001',
        display_name: 'Ada Lovelace',
    },
} as AuthMeResponse;
const capabilitySnapshot = {
    schema_version: 1,
    authorization_revision: 9,
    principal_id: 'P00000000000000000001',
    role_key: 'member',
    global: {},
    workspace: null,
    thread: null,
} as AuthorizationCapabilitySnapshot;
const capabilityPresentation = { can_create_workspace: false };
const principalPresentation = {
    principal_id: 'P00000000000000000001',
    display_name: 'Ada Lovelace',
};

type RenderedState = {
    capabilityData: unknown;
    principalData: unknown;
};

describe('mobile administration capability lifecycle', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGatewayAuthMe.mockResolvedValue(auth);
        mockGatewayAuthorizationCapabilities.mockResolvedValue(capabilitySnapshot);
        mockPrincipalPresentationCapabilities.mockReturnValue(capabilityPresentation);
        mockCurrentPrincipalPresentation.mockReturnValue(principalPresentation);
    });

    it('shares one capability request between capability and principal presentation consumers', async () => {
        const queryClient = new QueryClient({
            defaultOptions: { queries: { gcTime: Infinity } },
        });
        const renders: RenderedState[] = [];
        let tree: ReactTestRenderer | null = null;

        const Probe = () => {
            const capabilities = useAdministrationCapabilities();
            const principal = useCurrentPrincipalPresentation();
            renders.push({
                capabilityData: capabilities.data,
                principalData: principal.data,
            });
            return null;
        };

        await act(async () => {
            tree = renderer.create(
                <QueryClientProvider client={queryClient}>
                    <Probe />
                </QueryClientProvider>,
            );
        });
        await flushQueryNotifications();

        expect(mockGatewayAuthorizationCapabilities).toHaveBeenCalledTimes(1);
        expect(mockGatewayAuthMe).toHaveBeenCalledTimes(1);
        expect(renders.at(-1)).toEqual({
            capabilityData: capabilityPresentation,
            principalData: principalPresentation,
        });

        await act(async () => tree!.unmount());
        queryClient.clear();
    });

    it('keeps the last confirmed presentation when a background capability refresh fails', async () => {
        const queryClient = new QueryClient({
            defaultOptions: { queries: { gcTime: Infinity } },
        });
        const renders: RenderedState[] = [];
        let tree: ReactTestRenderer | null = null;

        const Probe = () => {
            const capabilities = useAdministrationCapabilities();
            const principal = useCurrentPrincipalPresentation();
            renders.push({
                capabilityData: capabilities.data,
                principalData: principal.data,
            });
            return null;
        };

        await act(async () => {
            tree = renderer.create(
                <QueryClientProvider client={queryClient}>
                    <Probe />
                </QueryClientProvider>,
            );
        });
        await flushQueryNotifications();

        mockGatewayAuthorizationCapabilities.mockRejectedValue(
            new Error('incompatible_authorization_capability_snapshot'),
        );
        const queryKey = administrationQueryKeys.capabilities(
            { gatewayId: 'gateway-a', connectionId: 7 },
            'workspace-a',
        );
        await act(async () => {
            await queryClient.invalidateQueries({ queryKey });
        });
        await flushQueryNotifications();

        expect(queryClient.getQueryState(queryKey)?.status).toBe('error');
        expect(renders.at(-1)).toEqual({
            capabilityData: capabilityPresentation,
            principalData: principalPresentation,
        });

        await act(async () => tree!.unmount());
        queryClient.clear();
    });
});
