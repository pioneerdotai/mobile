import { describe, expect, it, jest } from '@jest/globals';
import { readGatewayBindingJournals, removeGatewayBindingJournal } from './binding-journals';
import { storage } from '@/storage';
jest.mock('@/storage', () => ({
    storage: { getAllKeys: jest.fn(), getString: jest.fn(), remove: jest.fn() },
}));
const prefix = 'pioneer.gateway.device-activation-commit.v1.';
describe('native binding journal input', () => {
    it('retains independent readable documents and does not implement recovery policy', () => {
        jest.mocked(storage.getAllKeys).mockReturnValue([
            `${prefix}broken`,
            `${prefix}valid`,
            'other',
        ]);
        jest.mocked(storage.getString).mockImplementation((key) => {
            if (key.endsWith('broken')) throw new Error('read failed');
            return '{"synthetic":"raw"}';
        });
        expect(readGatewayBindingJournals()).toEqual([
            { gateway_id: 'valid', document: '{"synthetic":"raw"}' },
        ]);
        expect(storage.remove).not.toHaveBeenCalled();
    });
    it('removes only the journal requested by the Client effect', () => {
        removeGatewayBindingJournal('valid');
        expect(storage.remove).toHaveBeenCalledWith(`${prefix}valid`);
    });
});
