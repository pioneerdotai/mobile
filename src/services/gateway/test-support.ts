export type FakeSecureStoreOperation = 'read' | 'write' | 'delete';

export const GATEWAY_AUTH_TEST_SECRETS = [
    'test_access_header.test_access_payload.test_access_signature',
    'prf_test_000000000000000000000000000000000000000000000000',
    'K7M4-P9Q2',
] as const;

export class FakeGatewaySecureStore {
    private readonly values = new Map<string, string>();
    private readonly failures = new Set<FakeSecureStoreOperation>();

    failNext(operation: FakeSecureStoreOperation): void {
        this.failures.add(operation);
    }

    async getItemAsync(key: string): Promise<string | null> {
        this.throwIfRequested('read');
        return this.values.get(key) ?? null;
    }

    async setItemAsync(key: string, value: string): Promise<void> {
        this.throwIfRequested('write');
        this.values.set(key, value);
    }

    async deleteItemAsync(key: string): Promise<void> {
        this.throwIfRequested('delete');
        this.values.delete(key);
    }

    snapshot(): Readonly<Record<string, string>> {
        return Object.fromEntries(this.values.entries());
    }

    private throwIfRequested(operation: FakeSecureStoreOperation): void {
        if (!this.failures.delete(operation)) {
            return;
        }
        throw new Error(`injected SecureStore ${operation} failure`);
    }
}

export const assertNoGatewayAuthTestSecrets = (rendered: string): void => {
    for (const secret of GATEWAY_AUTH_TEST_SECRETS) {
        if (rendered.includes(secret)) {
            throw new Error('rendered output contains a raw auth fixture');
        }
    }
};
