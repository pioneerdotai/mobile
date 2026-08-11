import { describe, expect, it, jest } from '@jest/globals';

import {
    isValidProfileDisplayName,
    isValidProfileNickname,
    joinProfileDisplayName,
    splitProfileDisplayName,
} from './update';

jest.mock('@/client', () => ({
    pioneerClient: { gatewayAuthProfileUpdate: jest.fn() },
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
