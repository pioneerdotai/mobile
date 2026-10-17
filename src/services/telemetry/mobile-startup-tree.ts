import { useSyncExternalStore } from 'react';
import type { StartupTreeScope } from './mobile-startup-readiness';

// Proof of an observed refresh completion, not the existence of a retained snapshot.
let applied: { scope: StartupTreeScope; failed: boolean } | null = null;
const listeners = new Set<() => void>();
export const recordStartupTreeApplied = (scope: StartupTreeScope, failed: boolean): void => {
    applied = { scope, failed };
    for (const listener of listeners) listener();
};
export const useStartupTreeApplied = () =>
    useSyncExternalStore(
        (listener) => {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
        () => applied,
    );
