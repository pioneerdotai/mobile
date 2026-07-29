import { describe, expect, it } from '@jest/globals';
import {
    FakeGatewaySecureStore,
    GATEWAY_AUTH_TEST_SECRETS,
    assertNoGatewayAuthTestSecrets,
} from './test-support';

describe('gateway auth test support', () => {
    it('supports missing, success and one-shot SecureStore failures', async () => {
        const store = new FakeGatewaySecureStore();

        await expect(store.getItemAsync('session')).resolves.toBeNull();
        store.failNext('write');
        await expect(store.setItemAsync('session', 'secret')).rejects.toThrow('write failure');
        await store.setItemAsync('session', 'secret');
        store.failNext('read');
        await expect(store.getItemAsync('session')).rejects.toThrow('read failure');
        await expect(store.getItemAsync('session')).resolves.toBe('secret');
        store.failNext('delete');
        await expect(store.deleteItemAsync('session')).rejects.toThrow('delete failure');
        await store.deleteItemAsync('session');
        expect(store.snapshot()).toEqual({});
    });

    it('detects every seeded credential in rendered output', () => {
        expect(() => assertNoGatewayAuthTestSecrets('credential=[redacted]')).not.toThrow();

        for (const secret of GATEWAY_AUTH_TEST_SECRETS) {
            expect(() => assertNoGatewayAuthTestSecrets(secret)).toThrow(
                'rendered output contains a raw auth fixture',
            );
        }
    });
});
