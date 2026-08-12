import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, jest } from '@jest/globals';

import type { AuthMeResponse, AuthProfileUpdateResponse } from '@/client';
import { administrationQueryKeys } from '@/services/administration/query';

import {
    applyCurrentProfileUpdate,
    isValidProfileDisplayName,
    isValidProfileNickname,
    joinProfileDisplayName,
    splitProfileDisplayName,
} from './update';

jest.mock('@/client', () => ({
    pioneerClient: {
        administrationConflictRefetch: jest.fn(),
        gatewayAuthProfileUpdate: jest.fn(),
    },
}));

describe('profile display name helpers', () => {
    it('splits the persisted display name into first and remaining names', () => {
        expect(splitProfileDisplayName('  Alexander   Oskin Junior  ')).toEqual({
            firstName: 'Alexander',
            lastName: 'Oskin Junior',
        });
    });

    it('joins and normalizes editable name parts', () => {
        expect(joinProfileDisplayName(' Alexander ', ' Oskin   Junior ')).toBe(
            'Alexander Oskin Junior',
        );
    });

    it('uses the same display-name validation for account editing and invitation acceptance', () => {
        expect(isValidProfileDisplayName('Alexander Oskin')).toBe(true);
        expect(isValidProfileDisplayName('')).toBe(false);
        expect(isValidProfileDisplayName(`Alexander\u0000Oskin`)).toBe(false);
        expect(isValidProfileDisplayName('a'.repeat(129))).toBe(false);
    });

    it('uses the same username validation for account editing and invitation acceptance', () => {
        expect(isValidProfileNickname('superoskin')).toBe(true);
        expect(isValidProfileNickname('')).toBe(false);
        expect(isValidProfileNickname('_superoskin')).toBe(false);
        expect(isValidProfileNickname('a'.repeat(33))).toBe(false);
    });
});

describe('current profile cache update', () => {
    it('patches the auth/me snapshot for the active authorization epoch', async () => {
        const queryClient = new QueryClient();
        const queryKey = administrationQueryKeys.currentPrincipalForEpoch({
            gatewayId: 'gateway-a',
            connectionId: 7,
        });
        queryClient.setQueryData<AuthMeResponse>(queryKey, {
            principal: {
                id: 'P00000000000000000001',
                display_name: 'Before',
            },
        } as AuthMeResponse);

        await applyCurrentProfileUpdate(queryClient, {
            principal: {
                id: 'P00000000000000000001',
                display_name: 'After',
            },
        } as AuthProfileUpdateResponse);

        expect(queryClient.getQueryData<AuthMeResponse>(queryKey)?.principal.display_name).toBe(
            'After',
        );
        queryClient.clear();
    });
});
