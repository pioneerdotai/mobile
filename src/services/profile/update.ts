import type { QueryClient } from '@tanstack/react-query';

import {
    pioneerClient,
    type AuthMeResponse,
    type AuthProfileUpdateParams,
    type AuthProfileUpdateResponse,
} from '@/client';
import { administrationQueryKeys } from '@/services/administration/query';

export type ProfileNameParts = {
    firstName: string;
    lastName: string;
};

export const splitProfileDisplayName = (displayName: string): ProfileNameParts => {
    const normalized = displayName.trim().replace(/\s+/gu, ' ');
    const separator = normalized.indexOf(' ');
    if (separator < 0) return { firstName: normalized, lastName: '' };
    return {
        firstName: normalized.slice(0, separator),
        lastName: normalized.slice(separator + 1),
    };
};

export const joinProfileDisplayName = (firstName: string, lastName: string): string =>
    [firstName.trim(), lastName.trim()].filter(Boolean).join(' ').replace(/\s+/gu, ' ');

export const updateCurrentProfile = (
    input: AuthProfileUpdateParams,
): Promise<AuthProfileUpdateResponse> => pioneerClient.gatewayAuthProfileUpdate(input);

export const applyCurrentProfileUpdate = async (
    queryClient: QueryClient,
    response: AuthProfileUpdateResponse,
): Promise<void> => {
    queryClient.setQueryData<AuthMeResponse>(
        administrationQueryKeys.currentPrincipal(),
        (current) => (current ? { ...current, principal: response.principal } : current),
    );

    await Promise.all([
        queryClient.invalidateQueries({ queryKey: administrationQueryKeys.members() }),
        queryClient.invalidateQueries({
            predicate: (query) =>
                query.queryKey[0] === administrationQueryKeys.all[0] &&
                query.queryKey[1] === 'workspace-members',
        }),
    ]);
};
