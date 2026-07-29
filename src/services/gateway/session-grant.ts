import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

import { pioneerClient } from '@/client';
import type { AuthSessionGrant } from '@/client';
import type { MobileGatewaySessionEnvelope } from './session-storage';

export const mobileAuthInstallation = (installationId: string) => ({
    installation_id: installationId,
    display_name: Device.deviceName?.trim() || Device.modelName?.trim() || 'Pioneer App',
    client_kind: 'mobile' as const,
    platform: Platform.OS,
    client_version: Application.nativeApplicationVersion ?? null,
});

export const mobileSessionEnvelopeFromGrant = (
    grant: AuthSessionGrant,
): MobileGatewaySessionEnvelope => ({
    schema_version: 1,
    gateway_id: grant.gateway.id,
    principal_id: grant.principal.id,
    device_id: grant.device.id,
    session_id: grant.session.id,
    token_family_id: grant.session.token_family_id,
    installation_id: grant.device.installation_id,
    refresh_generation: grant.refresh_generation,
    refresh_expires_at_unix: grant.refresh_expires_at_unix,
    refresh_token: grant.refresh_token,
});

export const validateMobileSessionGrant = (
    grant: AuthSessionGrant,
    installationId: string,
    expectedGatewayId?: string | null,
): void => {
    if (
        (expectedGatewayId && grant.gateway.id !== expectedGatewayId) ||
        grant.auth_protocol_version !== 2 ||
        grant.credential_storage_order !== 'persist_refresh_before_activating_access' ||
        !/^[A-Za-z0-9]{21}$/.test(grant.gateway.id) ||
        !/^[A-Za-z0-9]{21}$/.test(grant.principal.id) ||
        !/^[A-Za-z0-9]{21}$/.test(grant.device.id) ||
        !/^[A-Za-z0-9]{21}$/.test(grant.session.id) ||
        grant.principal.kind !== 'superuser' ||
        grant.device.installation_id !== installationId ||
        grant.device.client_kind !== 'mobile' ||
        grant.device.status !== 'active' ||
        grant.session.status !== 'active' ||
        grant.session.device_id !== grant.device.id ||
        !/^[A-Za-z0-9]{21}$/.test(grant.session.token_family_id) ||
        !Number.isSafeInteger(grant.refresh_generation) ||
        grant.refresh_generation !== 0 ||
        grant.session.refresh_generation !== grant.refresh_generation ||
        grant.refresh_expires_at_unix !== grant.session.refresh_expires_at_unix ||
        !Number.isSafeInteger(grant.refresh_expires_at_unix) ||
        grant.refresh_expires_at_unix <= 0 ||
        !Number.isSafeInteger(grant.access_expires_at_unix) ||
        grant.access_expires_at_unix <= 0 ||
        !/^prf_[A-Za-z0-9_-]{43,171}$/.test(grant.refresh_token) ||
        !grant.access_token
    ) {
        throw new Error('invalid mobile Gateway session grant');
    }
};

export const cleanupIssuedMobileSession = async (
    address: string,
    grant: AuthSessionGrant,
    timeoutMs: number,
): Promise<void> => {
    await pioneerClient
        .gatewayAuthSessionCleanup({
            address,
            access_token: grant.access_token,
            session_id: grant.session.id,
            timeout_ms: timeoutMs,
        })
        .catch(() => undefined);
};

export const redactMobileSessionGrant = (grant: AuthSessionGrant | null): void => {
    if (!grant) {
        return;
    }
    grant.access_token = '';
    grant.refresh_token = '';
};
