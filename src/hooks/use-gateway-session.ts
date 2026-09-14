import { turnStartupBackgrounded } from '@/services/telemetry/turn-startup';
import * as Network from 'expo-network';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { mobileClientBinding, type GatewayEndpoint } from '@/client';
import { subscribeMobileSessionDiagnostics } from '@/services/gateway/session-coordinator';
import { mobileStartup } from '@/services/telemetry/mobile-startup';

let lifecycleGeneration = 0;
/** Native observations only; Client schedules connection, refresh and recovery. */
export const useGatewaySession = (endpoint: GatewayEndpoint | null, sessionRevision: number) => {
    const endpointId = endpoint?.id ?? null;
    useEffect(() => {
        let active = true;
        let visibility = AppState.currentState;
        let networkAvailable = true;
        const publish = () => {
            if (!active || mobileClientBinding.isClosed()) return;
            mobileClientBinding.dispatch({
                schema_version: 1,
                intent: {
                    kind: 'session_demand',
                    demand: {
                        endpoint_id: endpointId,
                        visibility:
                            visibility === 'active'
                                ? 'foreground'
                                : visibility === 'background'
                                  ? 'background'
                                  : 'inactive',
                        network_available: networkAvailable,
                        generation: ++lifecycleGeneration,
                    },
                },
            });
        };
        const app = AppState.addEventListener('change', (state) => {
            if (state === 'background') turnStartupBackgrounded();
            visibility = state;
            publish();
        });
        const network = Network.addNetworkStateListener((state) => {
            networkAvailable = state.isConnected !== false;
            publish();
        });
        const release = endpointId
            ? subscribeMobileSessionDiagnostics(endpointId, (event) => {
                  if (event.timing)
                      mobileStartup.recordNativeStage(
                          event.stage,
                          event.timing,
                          event.outcome === 'failed',
                      );
                  else if (event.outcome === 'started') mobileStartup.begin(event.stage);
                  else if (event.outcome === 'succeeded') mobileStartup.succeed(event.stage);
                  else mobileStartup.fail(event.stage);
              })
            : () => {};
        publish();
        return () => {
            active = false;
            app.remove();
            network.remove();
            release();
            if (!mobileClientBinding.isClosed())
                mobileClientBinding.dispatch({
                    schema_version: 1,
                    intent: {
                        kind: 'session_demand',
                        demand: {
                            endpoint_id: null,
                            visibility: 'background',
                            network_available: false,
                            generation: ++lifecycleGeneration,
                        },
                    },
                });
        };
    }, [endpointId, sessionRevision]);
};
