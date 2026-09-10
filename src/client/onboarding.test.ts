import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { GatewayDestinationsPublication } from './generated/gateway_destinations_publication';
import type { ClientIntentDispatchDto } from './generated/client_intent_dispatch_dto';
const mockListeners = new Set<() => void>();
let mockValue: Partial<GatewayDestinationsPublication> | null;
let mockClosed = false;
let mockRejected = false;
const mockDispatch = jest.fn((request: ClientIntentDispatchDto) => ({
    schema_version: 1,
    sequence: 1,
    outcome: mockRejected ? 'rejected' : 'changed',
    effects: [],
}));
const mockStore = {
    getSnapshot: () => (mockValue ? { payload: mockValue } : null),
    subscribe: (listener: () => void) => {
        mockListeners.add(listener);
        return () => {
            mockListeners.delete(listener);
        };
    },
};
jest.mock('./mobile-client-binding', () => ({
    mobileClientBinding: {
        scope: () => mockStore,
        dispatch: mockDispatch,
        drain: () => {},
        isClosed: () => mockClosed,
    },
}));
jest.mock('@/stores/gateway', () => ({
    useGatewayStore: { getState: () => ({ applyOnboardingProjection: () => {} }) },
}));
const { persistGatewayWorkspace, hydrateOnboarding } =
    jest.requireActual<typeof import('./onboarding')>('./onboarding');
const publish = () => {
    for (const listener of [...mockListeners]) listener();
};
beforeEach(() => {
    mockListeners.clear();
    mockDispatch.mockClear();
    mockValue = { loading: false, workspace_outcomes: [] };
    mockClosed = false;
    mockRejected = false;
});
describe('onboarding scoped native adapter', () => {
    it('consumes both retained outcomes after one batched publication and releases subscribers', async () => {
        const first = persistGatewayWorkspace('endpoint', 'one');
        const second = persistGatewayWorkspace('endpoint', 'two');
        const requests = mockDispatch.mock.calls
            .map(([request]) => request.intent)
            .filter((intent) => intent.kind === 'onboarding')
            .map((intent) => intent.intent);
        const ids = requests.map((intent) =>
            intent.kind === 'set_workspace_for_request' ? intent.request_id : '',
        );
        mockValue = {
            workspace_outcomes: ids.map((request_id) => ({
                request_id,
                endpoint_id: 'endpoint',
                succeeded: true,
            })),
        };
        publish();
        await Promise.all([first, second]);
        expect(mockListeners.size).toBe(0);
        expect(mockDispatch.mock.calls.slice(2).map(([request]) => request.intent)).toEqual(
            ids.map((request_id) => ({
                kind: 'onboarding',
                intent: { kind: 'acknowledge_workspace_outcome', request_id },
            })),
        );
    });
    it('rejects synchronous capacity failure and releases demand', async () => {
        mockRejected = true;
        await expect(persistGatewayWorkspace('endpoint', null)).rejects.toThrow(
            'gateway_workspace_request_rejected',
        );
        expect(mockListeners.size).toBe(0);
    });
    it('rejects process closure without retaining pending subscriptions', async () => {
        const pending = persistGatewayWorkspace('endpoint', null);
        const assertion = expect(pending).rejects.toThrow('client_closed');
        mockClosed = true;
        mockValue = null;
        publish();
        await assertion;
        expect(mockListeners.size).toBe(0);
    });
    it('surfaces initialization failure and permits explicit subsequent initialization', async () => {
        mockValue = { loading: true };
        const pending = hydrateOnboarding();
        const assertion = expect(pending).rejects.toThrow('gateway_environment_load_failed');
        mockValue = { loading: false, error: 'gateway_environment_load_failed' };
        publish();
        await assertion;
        expect(mockListeners.size).toBe(0);
        mockValue = { loading: true };
        const retry = hydrateOnboarding();
        mockValue = { loading: false, installation_id: 'synthetic' };
        publish();
        await retry;
        expect(mockListeners.size).toBe(0);
    });
});
