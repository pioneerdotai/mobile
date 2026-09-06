import { pioneerClient } from '@/client';

type ReleaseTransportLease = () => void;

const acquireTransport = async (exclusive: boolean): Promise<ReleaseTransportLease> => {
    const lease_id = pioneerClient.gatewayTransportReserve({ schema_version: 1, exclusive });
    const request = { schema_version: 1, lease_id };
    try {
        if (!(await pioneerClient.gatewayTransportWait(request))) {
            throw new Error('Gateway transport reservation was cancelled');
        }
    } catch (error) {
        pioneerClient.gatewayTransportRelease(request);
        throw error;
    }
    let released = false;
    return () => {
        if (released) {
            return;
        }
        released = true;
        pioneerClient.gatewayTransportRelease(request);
    };
};

/** Reserve the transition synchronously; Client orders it against interactive leases. */
export const runGatewayTransportTransition = async <T>(operation: () => Promise<T>): Promise<T> => {
    const release = await acquireTransport(true);
    try {
        return await operation();
    } finally {
        release();
    }
};

export const acquireGatewayTransportLease = (): Promise<ReleaseTransportLease> =>
    acquireTransport(false);

export const withGatewayTransportLease = async <T>(operation: () => Promise<T>): Promise<T> => {
    const release = await acquireGatewayTransportLease();
    try {
        return await operation();
    } finally {
        release();
    }
};
