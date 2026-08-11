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

const utf8ByteLength = (value: string): number =>
    [...value].reduce((total, character) => {
        const codePoint = character.codePointAt(0) ?? 0;
        return (
            total + (codePoint <= 0x7f ? 1 : codePoint <= 0x7ff ? 2 : codePoint <= 0xffff ? 3 : 4)
        );
    }, 0);

export const isValidProfileDisplayName = (value: string): boolean => {
    const normalized = value.trim();
    return (
        normalized.length > 0 &&
        [...normalized].length <= 128 &&
        utf8ByteLength(normalized) <= 512 &&
        !/[\u0000-\u001f\u007f]/u.test(normalized)
    );
};

export const isValidProfileNickname = (value: string): boolean =>
    value.length >= 2 && value.length <= 32 && /^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(value);

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
