type ReleaseTransportLease = () => void;

let transitionTail: Promise<void> = Promise.resolve();
let activeLeaseCount = 0;
let idleWaiters: (() => void)[] = [];

const waitForActiveLeases = (): Promise<void> => {
    if (activeLeaseCount === 0) {
        return Promise.resolve();
    }

    return new Promise((resolve) => {
        idleWaiters.push(resolve);
    });
};

const releaseActiveLease = (): void => {
    activeLeaseCount -= 1;
    if (activeLeaseCount !== 0) {
        return;
    }

    const waiters = idleWaiters;
    idleWaiters = [];
    for (const resolve of waiters) {
        resolve();
    }
};

/**
 * Serialize a connection- or Workspace-scoped transport transition.
 * Registration is synchronous, so new composer/Voice leases wait immediately;
 * already running interactions finish before the transition starts.
 */
export const runGatewayTransportTransition = async <T>(operation: () => Promise<T>): Promise<T> => {
    const predecessor = transitionTail;
    let completeTransition!: () => void;
    const completion = new Promise<void>((resolve) => {
        completeTransition = resolve;
    });
    transitionTail = predecessor.catch(() => undefined).then(() => completion);

    await predecessor.catch(() => undefined);
    await waitForActiveLeases();

    try {
        return await operation();
    } finally {
        completeTransition();
    }
};

/** Acquire a stable transport for an interactive operation. */
export const acquireGatewayTransportLease = async (): Promise<ReleaseTransportLease> => {
    while (true) {
        const observedTransition = transitionTail;
        await observedTransition.catch(() => undefined);
        if (observedTransition !== transitionTail) {
            continue;
        }

        activeLeaseCount += 1;
        if (observedTransition !== transitionTail) {
            releaseActiveLease();
            continue;
        }

        let released = false;
        return () => {
            if (released) {
                return;
            }
            released = true;
            releaseActiveLease();
        };
    }
};

export const withGatewayTransportLease = async <T>(operation: () => Promise<T>): Promise<T> => {
    const release = await acquireGatewayTransportLease();
    try {
        return await operation();
    } finally {
        release();
    }
};
