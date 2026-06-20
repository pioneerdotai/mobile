import { create } from 'zustand';

import type { ClientEvent, CLIRuntimePendingRequest } from '@/client';

export type CLIRuntimePendingRequestEntry = {
    workspace_id: string;
    runtime_id: string;
    request_id: string;
    thread_id: string | null;
    turn_id: string | null;
    item_id: string | null;
    request: CLIRuntimePendingRequest;
};

type CLIRuntimeStoreState = {
    pendingRequests: CLIRuntimePendingRequestEntry[];
    applyGatewayEvent: (event: ClientEvent) => void;
    removePendingRequest: (requestId: string) => void;
    clearPendingRequests: () => void;
};

export const useCliRuntimeStore = create<CLIRuntimeStoreState>((set) => ({
    pendingRequests: [],

    applyGatewayEvent: (event) => {
        if ('GatewayConnectionChanged' in event) {
            if (event.GatewayConnectionChanged.connection_state !== 'Connected') {
                set({ pendingRequests: [] });
            }
            return;
        }

        if (!('GatewayNotification' in event)) {
            return;
        }

        const notification = event.GatewayNotification;

        switch (notification.kind) {
            case 'cli_runtime_request_opened': {
                const params = notification.params;
                const entry: CLIRuntimePendingRequestEntry = {
                    workspace_id: params.workspace_id,
                    runtime_id: params.runtime_id,
                    request_id: params.request_id,
                    thread_id: params.thread_id ?? null,
                    turn_id: params.turn_id ?? null,
                    item_id: params.item_id ?? null,
                    request: params.request,
                };

                set((state) => {
                    const existingIndex = state.pendingRequests.findIndex(
                        (request) => request.request_id === entry.request_id,
                    );

                    if (existingIndex === -1) {
                        return { pendingRequests: [...state.pendingRequests, entry] };
                    }

                    const pendingRequests = [...state.pendingRequests];
                    pendingRequests[existingIndex] = entry;

                    return { pendingRequests };
                });
                return;
            }
            case 'cli_runtime_request_resolved': {
                const requestId = notification.params.request_id;
                set((state) => ({
                    pendingRequests: state.pendingRequests.filter(
                        (request) => request.request_id !== requestId,
                    ),
                }));
                return;
            }
            case 'turn_completed':
            case 'turn_failed':
            case 'turn_blocked': {
                const params = notification.params;
                set((state) => ({
                    pendingRequests: state.pendingRequests.filter(
                        (request) =>
                            !(
                                request.workspace_id === params.workspace_id &&
                                request.thread_id === params.thread_id &&
                                request.turn_id === params.turn.id
                            ),
                    ),
                }));
                return;
            }
            case 'thread_closed': {
                const params = notification.params;
                set((state) => ({
                    pendingRequests: state.pendingRequests.filter(
                        (request) =>
                            !(
                                request.workspace_id === params.workspaceId &&
                                request.thread_id === params.threadId
                            ),
                    ),
                }));
                return;
            }
        }
    },

    removePendingRequest: (requestId) => {
        set((state) => ({
            pendingRequests: state.pendingRequests.filter(
                (request) => request.request_id !== requestId,
            ),
        }));
    },

    clearPendingRequests: () => {
        set({ pendingRequests: [] });
    },
}));
