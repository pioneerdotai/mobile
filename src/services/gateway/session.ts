import { pioneerClient } from '@/client';
import type {
    ClientEvent,
    ClientGatewayConnectResult,
    ClientGatewayWsTimings,
    GatewayEndpoint,
} from '@/client';
import { captureClientDiagnosticsOnError } from '@/services/client-diagnostics';
import { getGatewayAuthToken } from '@/services/gateway/registry';

const DEFAULT_GATEWAY_WS_TIMINGS: ClientGatewayWsTimings = {
    connect_timeout_ms: 5_000,
    ping_interval_ms: 10_000,
    pong_timeout_ms: 30_000,
    reconnect_initial_ms: 500,
    reconnect_max_ms: 10_000,
    reconnect_jitter_percent: 20,
};

export const connectGatewayEndpoint = async (
    endpoint: GatewayEndpoint,
): Promise<ClientGatewayConnectResult> => {
    const authToken = endpoint.auth_token_ref
        ? await getGatewayAuthToken(endpoint.auth_token_ref)
        : null;

    return captureClientDiagnosticsOnError('gateway_connect', () =>
        pioneerClient.gatewayConnect({
            endpoint,
            auth_token: authToken,
            timings: DEFAULT_GATEWAY_WS_TIMINGS,
        }),
    );
};

export const nextGatewayEvents = async (): Promise<ClientEvent[]> => {
    return pioneerClient.gatewayNextEvents();
};

export const disconnectGateway = async (): Promise<boolean> => {
    return pioneerClient.gatewayDisconnect();
};
