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
const mockAuthorizationProjectionAccept = jest.fn<
    (request: { snapshot: AuthorizationCapabilitySnapshot }) => {
        acceptance: 'accepted';
        snapshot: AuthorizationCapabilitySnapshot;
    }
>();
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
        authorizationProjectionAccept: mockAuthorizationProjectionAccept,
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
        // The capability query is intentionally dependent on auth/me. Give
        // both React Query notification batches time to settle even when the
        // full suite is sharing the scheduler.
        for (let index = 0; index < 5; index += 1) {
            await new Promise((resolve) => setTimeout(resolve, 0));
        }
    });
};

const auth = {
    principal: {
        id: 'P00000000000000000001',
        display_name: 'Ada Lovelace',
    },
} as AuthMeResponse;
const capabilitySnapshot = {
    schema_version: 5,
    authorization_revision: 9,
    principal_id: 'P00000000000000000001',
    role_key: 'member',
    role: {
        key: 'member',
        display_name: 'Member',
        description: 'Workspace collaborator',
        built_in: true,
    },
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
        mockAuthorizationProjectionAccept.mockImplementation(
            ({ snapshot }: { snapshot: AuthorizationCapabilitySnapshot }) => ({
                acceptance: 'accepted',
                snapshot,
            }),
        );
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
        expect(mockAuthorizationProjectionAccept).toHaveBeenCalledWith(
            expect.objectContaining({
                gateway_id: 'gateway-a',
                connection_id: 7,
                expected_principal_id: auth.principal.id,
                workspace_id: 'workspace-a',
            }),
        );
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
