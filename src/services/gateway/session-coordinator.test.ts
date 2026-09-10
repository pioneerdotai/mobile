import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { GatewayEndpoint, GatewaySessionConnectionResult } from '@/client';
import type { ClientScope } from '@/client/generated/client_scope';
import { mobileClientBinding } from '@/client';
import {
    mobileSessionProjection,
    subscribeMobileSessionProjection,
    subscribeMobileSessionDiagnostics,
} from './session-coordinator';

let mockSessionPayload: Record<string, unknown> | null = null;
let mockIdentityPayload: Record<string, unknown> | null = null;
const mockListeners = new Set<() => void>();

jest.mock('@/client', () => ({
    PioneerClientNativeError: class extends Error {
        readonly code: string;
        constructor(message: string, code: string) {
            super(message);
            this.code = code;
        }
    },
    mobileClientBinding: {
        scope: (scope: ClientScope) => ({
            getSnapshot: () => ({
                payload: scope.kind === 'session' ? mockSessionPayload : mockIdentityPayload,
            }),
            subscribe: (listener: () => void) => {
                mockListeners.add(listener);
                return () => mockListeners.delete(listener);
            },
        }),
        synchronize: jest.fn(async () => {
            for (const listener of [...mockListeners]) {
                listener();
            }
        }),
    },
}));
jest.mock('./registry', () => ({ loadGatewayRegistry: () => ({ installation_id: 'synthetic' }) }));

const endpoint: GatewayEndpoint = {
    id: 'synthetic',
    name: 'Synthetic',
    gateway_base_url: 'https://gateway.invalid',
    kind: 'remote',
    session_ref: 'synthetic',
    service_name: null,
    server_gateway_id: 'G00000000000000000001',
};
const result: GatewaySessionConnectionResult = {
    connection_id: 17,
    connection_generation: 4,
    access_expires_at_unix: 2000,
    metadata: {
        gateway_id: 'G00000000000000000001',
        device_id: 'D00000000000000000001',
        session_id: 'S00000000000000000001',
        refresh_generation: 1,
        refresh_expires_at_unix: 4000,
    },
};

const publishConnected = () => {
    mockSessionPayload = {
        sessions: {
            synthetic: {
                kind: 'active',
                data: {
                    metadata: result.metadata,
                    connection_generation: 4,
                    access_expires_at_unix: 2000,
                },
            },
        },
        connections: { synthetic: { epoch: 1, connected: result, failure: null } },
        access_expiries: { synthetic: 2000 },
    };
    mockIdentityPayload = {
        current_auth: {
            principal: { id: 'P00000000000000000001' },
            session: { id: result.metadata.session_id },
        },
    };
};

beforeEach(() => {
    jest.clearAllMocks();
    mockSessionPayload = null;
    mockIdentityPayload = null;
    mockListeners.clear();
});
describe('Mobile immutable session presentation', () => {
    it('retains native stage durations across delayed publication and duplicate delivery', async () => {
        const listener = jest.fn();
        const unsubscribe = subscribeMobileSessionDiagnostics('synthetic', listener);
        mockSessionPayload = {
            startup: {
                session_diagnostics: {
                    refresh_request: {
                        endpoint_id: 'synthetic',
                        started_at_unix_ms: 123456,
                        duration_ms: 47,
                        state: 'succeeded',
                    },
                },
            },
        };
        await mobileClientBinding.synchronize();
        await mobileClientBinding.synchronize();
        expect(listener).toHaveBeenCalledTimes(1);
        expect(listener).toHaveBeenCalledWith({
            stage: 'authorization.refresh.request',
            outcome: 'succeeded',
            timing: { started_at_unix_ms: 123456, duration_ms: 47 },
        });
        unsubscribe();
        expect(mockListeners.size).toBe(0);
    });
    it('preserves the expired presentation for invalid refresh credentials', () => {
        mockSessionPayload = {
            sessions: {
                synthetic: { kind: 'terminal', data: { reason: 'refresh_credential_invalid' } },
            },
            connections: {},
        };
        expect(mobileSessionProjection(endpoint.id).phase).toBe('expired');
    });
    it('owns only scoped registration tokens and suppresses duplicate immutable projections', async () => {
        const seen: string[] = [];
        const unsubscribe = subscribeMobileSessionProjection(endpoint.id, (projection) =>
            seen.push(projection.phase),
        );
        publishConnected();
        await mobileClientBinding.synchronize();
        await mobileClientBinding.synchronize();
        expect(seen).toEqual(['needs_authentication', 'connected']);
        unsubscribe();
        expect(mockListeners.size).toBe(0);
    });
});
