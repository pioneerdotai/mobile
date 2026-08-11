import { describe, expect, it, jest } from '@jest/globals';

import { joinProfileDisplayName, splitProfileDisplayName } from './update';

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
});
