import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { mobileClientBinding } from '@/client/mobile-client-binding';
import {
    dispatchAdministrationPage,
    requestAdministrationPage,
    subscribeAdministrationPage,
} from './pages';

let mockPublication: unknown = null;
const mockListeners = new Set<() => void>();
const mockUnsubscribe = jest.fn();
jest.mock('@/client/mobile-client-binding', () => ({
    mobileClientBinding: {
        scope: jest.fn(() => ({
            getSnapshot: () => ({ payload: mockPublication }),
            subscribe: (listener: () => void) => {
                mockListeners.add(listener);
                return () => {
                    mockListeners.delete(listener);
                    mockUnsubscribe();
                };
            },
        })),
        dispatch: jest.fn(),
        drain: jest.fn(),
    },
}));
const page = { kind: 'members' as const };
const publish = (request: string) => {
    mockPublication = {
        page,
        revision: 2,
        members: [],
        invitations: [],
        next_cursor: null,
        request: { kind: request },
    };
    for (const listener of [...mockListeners]) listener();
};
describe('administration page publication adapter', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockListeners.clear();
        mockPublication = null;
    });
    it('pairs each mounted subscription with exactly one demand, including remount', () => {
        const release = subscribeAdministrationPage(page, jest.fn());
        release();
        release();
        const releaseAgain = subscribeAdministrationPage(page, jest.fn());
        releaseAgain();
        expect(jest.mocked(mobileClientBinding.dispatch).mock.calls.map(([r]) => r.intent)).toEqual(
            ['observe', 'release', 'observe', 'release'].map((kind) => ({
                kind: 'administration_page',
                intent: { kind, page },
            })),
        );
        expect(mockListeners.size).toBe(0);
    });
    it('releases the subscription and demand after a bridge start error', () => {
        jest.mocked(mobileClientBinding.dispatch).mockImplementationOnce(() => {
            throw new Error('bridge unavailable');
        });
        expect(() => subscribeAdministrationPage(page, jest.fn())).toThrow('bridge unavailable');
        expect(mockListeners.size).toBe(0);
        expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
        expect(mobileClientBinding.dispatch).toHaveBeenLastCalledWith({
            schema_version: 1,
            intent: { kind: 'administration_page', intent: { kind: 'release', page } },
        });
    });
    it('waits for Client completion and propagates failure without requesting a retry', async () => {
        publish('loading');
        const pending = requestAdministrationPage(page, 'refresh');
        publish('failed');
        await expect(pending).rejects.toThrow('administration_page_unavailable');
        expect(mobileClientBinding.dispatch).toHaveBeenCalledTimes(1);
        expect(mockListeners.size).toBe(0);
        dispatchAdministrationPage(page, 'refresh');
        expect(mobileClientBinding.dispatch).toHaveBeenCalledTimes(2);
    });
    it('releases a completion listener when the Client cancels its operation', async () => {
        publish('loading');
        const pending = requestAdministrationPage(page, 'next');
        publish('cancelled');
        await expect(pending).rejects.toThrow('administration_page_unavailable');
        expect(mockListeners.size).toBe(0);
    });
    it('does not traverse workspace cursors in JavaScript', async () => {
        const workspace = { kind: 'workspace_members' as const, workspace_id: 'workspace-a' };
        publish('loading');
        const pending = requestAdministrationPage(workspace, 'refresh');
        mockPublication = { request: { kind: 'ready' }, next_cursor: 'client-owned' };
        for (const listener of [...mockListeners]) listener();
        expect(mobileClientBinding.dispatch).toHaveBeenCalledTimes(1);
        publish('ready');
        await expect(pending).resolves.toBeUndefined();
        expect(mobileClientBinding.dispatch).toHaveBeenCalledTimes(1);
    });
});
