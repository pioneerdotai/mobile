import { pioneerClient } from '@/client';
import type { ClientEvent, ClientGatewayWsTimings, GatewayEndpoint } from '@/client';
import {
    ensureMobileGatewaySession,
    markMobileGatewayConnectionDisconnected,
    mobileSessionProjection,
    mobileSessionRefreshDelayMs,
    suspendMobileGatewaySession,
    subscribeMobileSessionProjection,
} from '@/services/gateway/session-coordinator';
import type {
    MobileGatewayConnection,
    MobileSessionProjection,
} from '@/services/gateway/session-coordinator';

export const DEFAULT_GATEWAY_WS_TIMINGS: ClientGatewayWsTimings = {
    connect_timeout_ms: 5_000,
    ping_interval_ms: 10_000,
    pong_timeout_ms: 30_000,
    reconnect_initial_ms: 500,
    reconnect_max_ms: 10_000,
    reconnect_jitter_percent: 20,
};

export const connectGatewayEndpoint = async (
    endpoint: GatewayEndpoint,
): Promise<MobileGatewayConnection> => {
    return ensureMobileGatewaySession(endpoint, DEFAULT_GATEWAY_WS_TIMINGS);
};

type GatewayEventListener = (event: ClientEvent) => void | Promise<void>;
type GatewayEventErrorListener = (error: unknown) => void;

const GATEWAY_EVENT_IDLE_POLL_MS = 250;
const gatewayEventListeners = new Map<GatewayEventListener, GatewayEventErrorListener>();
let gatewayEventPump: Promise<void> | null = null;

const wait = (timeoutMs: number): Promise<void> =>
    new Promise((resolve) => {
        setTimeout(resolve, timeoutMs);
    });

const reportGatewayEventError = (listener: GatewayEventListener, error: unknown): void => {
    gatewayEventListeners.get(listener)?.(error);
};

const runGatewayEventPump = async (): Promise<void> => {
    while (gatewayEventListeners.size > 0) {
        let events: ClientEvent[];
        try {
            events = await pioneerClient.gatewayNextEvents();
        } catch (error) {
            for (const [listener, onError] of [...gatewayEventListeners]) {
                if (gatewayEventListeners.get(listener) === onError) {
                    onError(error);
                }
            }
            await wait(GATEWAY_EVENT_IDLE_POLL_MS);
            continue;
        }

        if (events.length === 0) {
            await wait(GATEWAY_EVENT_IDLE_POLL_MS);
            continue;
        }

        for (const event of events) {
            for (const listener of [...gatewayEventListeners.keys()]) {
                if (!gatewayEventListeners.has(listener)) {
                    continue;
                }
                try {
                    await listener(event);
                } catch (error) {
                    reportGatewayEventError(listener, error);
                }
            }
        }
    }
};

const ensureGatewayEventPump = (): void => {
    if (gatewayEventPump) {
        return;
    }
    gatewayEventPump = runGatewayEventPump().finally(() => {
        gatewayEventPump = null;
        // A subscriber can be installed after the loop observes an empty map
        // but before this continuation runs. Do not strand that subscriber.
        if (gatewayEventListeners.size > 0) {
            ensureGatewayEventPump();
        }
    });
};

/**
 * Subscribe to the process-global native Gateway event receiver.
 *
 * The native client owns one active transport. Keeping exactly one pending
 * `gatewayNextEvents` call prevents an effect replacement from leaving an old
 * poll behind that can consume and discard the first event of a new session.
 */
export const subscribeGatewayEvents = (
    listener: GatewayEventListener,
    onError: GatewayEventErrorListener,
): (() => void) => {
    gatewayEventListeners.set(listener, onError);
    ensureGatewayEventPump();
    return () => {
        gatewayEventListeners.delete(listener);
    };
};

export const resetGatewayEventPumpForTests = (): void => {
    gatewayEventListeners.clear();
};

export const disconnectGateway = async (endpointId?: string): Promise<boolean> => {
    if (endpointId) {
        await suspendMobileGatewaySession(endpointId);
        return true;
    }
    return pioneerClient.gatewayDisconnect();
};

export const gatewaySessionProjection = (endpointId: string): MobileSessionProjection => {
    return mobileSessionProjection(endpointId);
};

export const gatewaySessionRefreshDelayMs = (endpointId: string): number | null => {
    return mobileSessionRefreshDelayMs(endpointId);
};

export { markMobileGatewayConnectionDisconnected, subscribeMobileSessionProjection };
