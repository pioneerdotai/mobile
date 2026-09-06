import * as SecureStore from 'expo-secure-store';

import { pioneerClient } from '@/client';

export const MOBILE_GATEWAY_SESSION_SCHEMA_VERSION = 2 as const;
export const MOBILE_GATEWAY_SESSION_KEY_PREFIX = 'pioneer.gateway.session.v1';
const RETIRED_MOBILE_GATEWAY_SESSION_SCHEMA_VERSION = 1;
export type MobileGatewaySessionEnvelope = {
    schema_version: typeof MOBILE_GATEWAY_SESSION_SCHEMA_VERSION;
    gateway_id: string;
    principal_id: string;
    device_id: string;
    session_id: string;
    token_family_id: string;
    installation_id: string;
    refresh_generation: number;
    refresh_expires_at_unix: number;
    refresh_token: string;
    pending_refresh_request_id?: string;
};

export type MobileGatewaySecureStore = Pick<
    typeof SecureStore,
    'getItemAsync' | 'setItemAsync' | 'deleteItemAsync'
>;

export class MobileGatewaySessionStorageError extends Error {
    readonly code: 'missing' | 'corrupted' | 'read_failed' | 'write_failed' | 'delete_failed';

    constructor(code: MobileGatewaySessionStorageError['code'], cause?: unknown) {
        super(code);
        this.name = 'MobileGatewaySessionStorageError';
        this.code = code;
        this.cause = cause;
    }
}

export const mobileGatewaySessionStorageKey = (sessionRef: string): string => {
    const normalized = sessionRef.trim();
    if (!normalized || normalized.length > 255 || !/^[A-Za-z0-9_-]+$/.test(normalized)) {
        throw new MobileGatewaySessionStorageError('corrupted');
    }
    return `${MOBILE_GATEWAY_SESSION_KEY_PREFIX}.${normalized}`;
};

export const readMobileGatewaySession = async (
    sessionRef: string,
    secureStore: MobileGatewaySecureStore = SecureStore,
): Promise<MobileGatewaySessionEnvelope | null> => {
    const storageKey = mobileGatewaySessionStorageKey(sessionRef);
    let raw: string | null;
    try {
        raw = await secureStore.getItemAsync(storageKey);
    } catch (error) {
        throw new MobileGatewaySessionStorageError('read_failed', error);
    }
    if (raw === null) {
        return null;
    }
    try {
        const decoded = JSON.parse(raw) as unknown;
        if (isRetiredMobileGatewaySessionEnvelope(decoded)) {
            try {
                await secureStore.deleteItemAsync(storageKey);
            } catch (error) {
                throw new MobileGatewaySessionStorageError('delete_failed', error);
            }
            return null;
        }
        if (!(await isMobileGatewaySessionEnvelope(decoded))) {
            throw new Error('invalid mobile Gateway session envelope');
        }
        return decoded as MobileGatewaySessionEnvelope;
    } catch (error) {
        if (error instanceof MobileGatewaySessionStorageError) {
            throw error;
        }
        throw new MobileGatewaySessionStorageError('corrupted', error);
    } finally {
        raw = null;
    }
};

const isRetiredMobileGatewaySessionEnvelope = (
    value: unknown,
): value is Record<string, unknown> => {
    return (
        !!value &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        (value as Record<string, unknown>).schema_version ===
            RETIRED_MOBILE_GATEWAY_SESSION_SCHEMA_VERSION
    );
};

export const writeMobileGatewaySession = async (
    sessionRef: string,
    envelope: MobileGatewaySessionEnvelope,
    secureStore: MobileGatewaySecureStore = SecureStore,
): Promise<void> => {
    if (!(await isMobileGatewaySessionEnvelope(envelope))) {
        throw new MobileGatewaySessionStorageError('corrupted');
    }
    let serialized: string | null = JSON.stringify(envelope);
    try {
        await secureStore.setItemAsync(mobileGatewaySessionStorageKey(sessionRef), serialized);
    } catch (error) {
        throw new MobileGatewaySessionStorageError('write_failed', error);
    } finally {
        serialized = null;
    }
};

export const deleteMobileGatewaySession = async (
    sessionRef: string,
    secureStore: MobileGatewaySecureStore = SecureStore,
): Promise<void> => {
    try {
        await secureStore.deleteItemAsync(mobileGatewaySessionStorageKey(sessionRef));
    } catch (error) {
        throw new MobileGatewaySessionStorageError('delete_failed', error);
    }
};

export const isMobileGatewaySessionEnvelope = async (value: unknown): Promise<boolean> => {
    const result = await pioneerClient.gatewaySessionValidate({
        kind: 'envelope',
        envelope: value,
    });
    return result.valid;
};
