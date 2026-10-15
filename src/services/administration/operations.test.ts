import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { mobileClientBinding } from '@/client/mobile-client-binding';
import * as Clipboard from 'expo-clipboard';
import {
    copyAdministrationActivation,
    dismissAdministrationActivation,
    performAdministrationCommand,
} from './operations';
let mockCurrent: { generation: number; request: { kind: string } } | null = null;
const mockListeners = new Set<() => void>();
jest.mock('@/client/mobile-client-binding', () => ({
    mobileClientBinding: {
        scope: () => ({
            getSnapshot: () => mockCurrent && { payload: mockCurrent },
            subscribe: (listener: () => void) => {
                mockListeners.add(listener);
                return () => mockListeners.delete(listener);
            },
        }),
        dispatch: jest.fn(),
        drain: jest.fn(),
        completeEffect: jest.fn(),
    },
}));
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(async () => {}) }));
const changed = () => {
    for (const listener of [...mockListeners]) listener();
};
describe('administration native intent and effect adapter', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockCurrent = null;
        mockListeners.clear();
    });
    it('observes one command and releases its subscription at the matching completion', async () => {
        jest.mocked(mobileClientBinding.dispatch).mockImplementation(() => {
            mockCurrent = { generation: 7, request: { kind: 'loading' } };
            return { outcome: 'changed', effects: [] } as never;
        });
        const pending = performAdministrationCommand({
            kind: 'revoke_invitation',
            params: { invitation_id: 'invitation-id' },
        });
        expect(mockListeners.size).toBe(1);
        mockCurrent = { generation: 7, request: { kind: 'ready' } };
        changed();
        await expect(pending).resolves.toBeUndefined();
        expect(mockListeners.size).toBe(0);
        expect(mobileClientBinding.dispatch).toHaveBeenCalledTimes(1);
    });
    it('rejects a superseded operation and preserves the exact activation generation for copy and dismiss', async () => {
        jest.mocked(mobileClientBinding.dispatch).mockImplementation(() => {
            mockCurrent = { generation: 8, request: { kind: 'loading' } };
            return { outcome: 'changed', effects: [] } as never;
        });
        const pending = performAdministrationCommand({
            kind: 'revoke_invitation',
            params: { invitation_id: 'invitation-id' },
        });
        mockCurrent = { generation: 9, request: { kind: 'ready' } };
        changed();
        await expect(pending).rejects.toThrow('administration_action_unavailable');
        expect(mockListeners.size).toBe(0);
        jest.mocked(mobileClientBinding.dispatch).mockReturnValue({
            outcome: 'changed',
            effects: [
                {
                    operation_id: 'administration/activation/copy',
                    generation: 4,
                    effect: { kind: 'copy_administration_activation' },
                },
            ],
        } as never);
        await copyAdministrationActivation(9, 'synthetic-activation');
        expect(Clipboard.setStringAsync).toHaveBeenCalledWith('synthetic-activation');
        expect(mobileClientBinding.completeEffect).toHaveBeenCalledWith({
            schema_version: 1,
            completion: {
                operation_id: 'administration/activation/copy',
                generation: 4,
                result: { kind: 'completed' },
            },
        });
        dismissAdministrationActivation(9);
        expect(mobileClientBinding.dispatch).toHaveBeenLastCalledWith({
            schema_version: 1,
            intent: {
                kind: 'administration_presentation',
                intent: { kind: 'dismiss_activation', generation: 9 },
            },
        });
        jest.mocked(mobileClientBinding.dispatch).mockReturnValue({
            outcome: 'rejected',
            effects: [],
        } as never);
        await expect(copyAdministrationActivation(8, 'stale')).rejects.toThrow(
            'administration_activation_unavailable',
        );
        expect(Clipboard.setStringAsync).toHaveBeenCalledTimes(1);
    });
});
