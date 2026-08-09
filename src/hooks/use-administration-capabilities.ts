import { useQuery } from '@tanstack/react-query';

import { pioneerClient } from '@/client';
import { loadCurrentAdministrationPrincipal } from '@/services/administration/invitations';
import { administrationQueryKeys } from '@/services/administration/query';
import { useGatewayStore } from '@/stores/gateway';

export const useAdministrationCapabilities = () => {
    const connected = useGatewayStore((state) => state.connectionState === 'Connected');
    return useQuery({
        queryKey: administrationQueryKeys.currentPrincipal(),
        queryFn: loadCurrentAdministrationPrincipal,
        enabled: connected,
        staleTime: 30_000,
        select: (auth) => pioneerClient.principalPresentationCapabilities(auth),
    });
};

export const useAdministrationPrincipal = () => {
    const connected = useGatewayStore((state) => state.connectionState === 'Connected');
    return useQuery({
        queryKey: administrationQueryKeys.currentPrincipal(),
        queryFn: loadCurrentAdministrationPrincipal,
        enabled: connected,
        staleTime: 30_000,
    });
};

export const useCurrentPrincipalPresentation = () => {
    const connected = useGatewayStore((state) => state.connectionState === 'Connected');
    return useQuery({
        queryKey: administrationQueryKeys.currentPrincipal(),
        queryFn: loadCurrentAdministrationPrincipal,
        enabled: connected,
        staleTime: 30_000,
        select: (auth) => pioneerClient.currentPrincipalPresentation({ auth }),
    });
};
