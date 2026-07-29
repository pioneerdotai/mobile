import { describe, expect, it } from '@jest/globals';
import {
    deleteMobileGatewaySession,
    MOBILE_GATEWAY_SESSION_SCHEMA_VERSION,
    mobileGatewaySessionStorageKey,
    readMobileGatewaySession,
    writeMobileGatewaySession,
} from './session-storage';
import type { MobileGatewaySessionEnvelope } from './session-storage';
import { FakeGatewaySecureStore } from './test-support';

const envelope = (): MobileGatewaySessionEnvelope => ({
    schema_version: MOBILE_GATEWAY_SESSION_SCHEMA_VERSION,
    gateway_id: 'G00000000000000000001',
    principal_id: 'P00000000000000000001',
    device_id: 'D00000000000000000001',
    session_id: 'S00000000000000000001',
    token_family_id: 'F00000000000000000001',
    installation_id: 'installation-mobile-1',
    refresh_generation: 3,
    refresh_expires_at_unix: 1_900_000_000,
    refresh_token: `prf2_${'r'.repeat(164)}`,
});

const storageFailureCases: [operation: 'read' | 'write' | 'delete', expectedCode: string][] = [
    ['read', 'read_failed'],
    ['write', 'write_failed'],
    ['delete', 'delete_failed'],
];

describe('mobile Gateway session SecureStore adapter', () => {
    it('round-trips and deletes the versioned refresh envelope', async () => {
        const secureStore = new FakeGatewaySecureStore();

        await writeMobileGatewaySession('remote-1', envelope(), secureStore);
        await expect(readMobileGatewaySession('remote-1', secureStore)).resolves.toEqual(
            envelope(),
        );
        await deleteMobileGatewaySession('remote-1', secureStore);
        await expect(readMobileGatewaySession('remote-1', secureStore)).resolves.toBeNull();
    });

    it('deletes a retired v1 session envelope and requires authentication again', async () => {
        const secureStore = new FakeGatewaySecureStore();
        const key = mobileGatewaySessionStorageKey('remote-1');
        await secureStore.setItemAsync(
            key,
            JSON.stringify({
                ...envelope(),
                schema_version: 1,
                refresh_token: `prf_${'r'.repeat(43)}`,
            }),
        );

        await expect(readMobileGatewaySession('remote-1', secureStore)).resolves.toBeNull();
        await expect(secureStore.getItemAsync(key)).resolves.toBeNull();
    });

    it('reports failure to delete a retired v1 session envelope', async () => {
        const secureStore = new FakeGatewaySecureStore();
        const key = mobileGatewaySessionStorageKey('remote-1');
        await secureStore.setItemAsync(
            key,
            JSON.stringify({
                ...envelope(),
                schema_version: 1,
            }),
        );
        secureStore.failNext('delete');

        await expect(readMobileGatewaySession('remote-1', secureStore)).rejects.toMatchObject({
            code: 'delete_failed',
        });
    });

    it.each(storageFailureCases)(
        'maps a SecureStore %s failure to %s',
        async (operation, expectedCode) => {
            const secureStore = new FakeGatewaySecureStore();
            secureStore.failNext(operation);

            const action =
                operation === 'read'
                    ? readMobileGatewaySession('remote-1', secureStore)
                    : operation === 'write'
                      ? writeMobileGatewaySession('remote-1', envelope(), secureStore)
                      : deleteMobileGatewaySession('remote-1', secureStore);

            await expect(action).rejects.toMatchObject({ code: expectedCode });
        },
    );

    it('rejects an unbounded or non-canonical session reference', () => {
        expect(() => mobileGatewaySessionStorageKey('x'.repeat(256))).toThrow('corrupted');
        expect(() => mobileGatewaySessionStorageKey('remote/1')).toThrow('corrupted');
    });

    it('rejects an envelope without durable installation and token-family binding', async () => {
        const secureStore = new FakeGatewaySecureStore();
        const {
            installation_id: _installationId,
            token_family_id: _tokenFamilyId,
            ...incomplete
        } = envelope();
        await secureStore.setItemAsync(
            mobileGatewaySessionStorageKey('remote-1'),
            JSON.stringify(incomplete),
        );

        await expect(readMobileGatewaySession('remote-1', secureStore)).rejects.toMatchObject({
            code: 'corrupted',
        });
    });

    it('rejects unknown credential fields in a SecureStore envelope', async () => {
        const secureStore = new FakeGatewaySecureStore();
        await secureStore.setItemAsync(
            mobileGatewaySessionStorageKey('remote-1'),
            JSON.stringify({
                ...envelope(),
                access_token: 'must-not-be-persisted',
            }),
        );

        await expect(readMobileGatewaySession('remote-1', secureStore)).rejects.toMatchObject({
            code: 'corrupted',
        });
    });
});
