import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { MobileClientBinding, type MobileClientBridge } from '@/client/mobile-client-binding';
import type { ClientEffectPlan } from '@/client/generated/client_effect_plan';
import { MobileSessionStorageAdapter } from './platform-effects';
import { readMobileGatewaySession, deleteMobileGatewaySession } from './session-storage';
import { loadGatewayRegistry, saveGatewayRegistry } from './registry';

jest.mock('./registry', () => ({ loadGatewayRegistry: jest.fn(), saveGatewayRegistry: jest.fn() }));
jest.mock('./session-grant', () => ({
    mobileAuthInstallation: (installation_id: string) => ({
        installation_id,
        display_name: 'Synthetic',
        client_kind: 'mobile',
        platform: 'ios',
        client_version: null,
    }),
}));
jest.mock('./binding-journals', () => ({
    readGatewayBindingJournals: () => [],
    removeGatewayBindingJournal: jest.fn(),
}));

jest.mock('./session-storage', () => ({
    readMobileGatewaySession: jest.fn(),
    writeMobileGatewaySession: jest.fn(),
    deleteMobileGatewaySession: jest.fn(),
    MobileGatewaySessionStorageError: class extends Error {},
}));

const plan: ClientEffectPlan = {
    operation_id: 'gateway-session-storage/1',
    generation: 1,
    effect: {
        ReadGatewaySession: {
            endpoint: {
                id: 'synthetic',
                name: 'Synthetic',
                kind: 'remote',
                gateway_base_url: 'https://gateway.invalid',
                session_ref: 'synthetic',
                service_name: null,
            },
        },
    },
};

const flush = async () => {
    for (let n = 0; n < 10; n++) {
        await Promise.resolve();
    }
};
const fixture = () => {
    const complete = jest.fn<MobileClientBridge['completeEffect']>().mockReturnValue({
        schema_version: 1,
        sequence: 1,
        outcome: 'changed',
        effects: [],
        change_sequence: 0,
        predecessor: null,
        changed_scopes: [],
    });
    const bridge: MobileClientBridge = {
        completeEffect: complete,
        cancelEffect: () =>
            complete({
                schema_version: 1,
                completion: {
                    operation_id: plan.operation_id,
                    generation: 1,
                    result: { kind: 'completed' },
                },
            }),
        dispatch: () => ({ schema_version: 1, sequence: 0, outcome: 'noop', effects: [] }),
        snapshot: () => null,
        changes: () => ({ schema_version: 1, changes: [] }),
        resnapshot: () => null,
    };
    const binding = new MobileClientBinding(bridge);
    const adapter = new MobileSessionStorageAdapter(binding);
    const deliver = (effects: ClientEffectPlan[] = [plan]) =>
        binding.applyProcessBatch({
            closed: false,
            schema_version: 1,
            sequence: 0,
            changes: [],
            resnapshot: false,
            effects,
        });
    return { complete, adapter, deliver, binding };
};

beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(readMobileGatewaySession).mockReset().mockResolvedValue(null);
    jest.mocked(loadGatewayRegistry).mockReturnValue({
        version: 3,
        installation_id: 'synthetic',
        active_gateway_id: null,
        local: null,
        remotes: [],
    });
    jest.mocked(saveGatewayRegistry).mockReset();
});

describe('native session storage effects', () => {
    it('coalesces pending and completed replays without a scope publication', async () => {
        const { complete, adapter, deliver } = fixture();
        deliver();
        deliver();
        await flush();
        deliver();
        await flush();
        expect(readMobileGatewaySession).toHaveBeenCalledTimes(1);
        expect(complete).toHaveBeenCalledTimes(1);
        expect(complete.mock.calls[0][0].completion.result).toEqual({
            kind: 'gateway_session_envelope_loaded',
            envelope: null,
        });
        await adapter.close();
    });

    it('retries a failed completion without repeating native storage work', async () => {
        const { complete, adapter, deliver } = fixture();
        complete.mockImplementationOnce(() => {
            throw new Error('bridge unavailable');
        });
        deliver();
        await flush();
        deliver();
        await flush();
        expect(readMobileGatewaySession).toHaveBeenCalledTimes(1);
        expect(complete).toHaveBeenCalledTimes(2);
        await adapter.close();
    });
    it('loads native onboarding inputs without starting unsupported local effects', async () => {
        const { complete, adapter, deliver } = fixture();
        deliver([
            { operation_id: 'onboarding/1', generation: 1, effect: 'LoadGatewayEnvironment' },
        ]);
        await flush();
        expect(complete.mock.calls[0][0].completion.result).toMatchObject({
            kind: 'gateway_environment_loaded',
            environment: {
                installation: { installation_id: 'synthetic', client_kind: 'mobile' },
                registry: { installation_id: 'synthetic' },
                binding_journals: [],
            },
        });
        expect(saveGatewayRegistry).not.toHaveBeenCalled();
        await adapter.close();
    });
    it('reports registry and credential deletion failures without successful completion', async () => {
        const { complete, adapter, deliver } = fixture();
        jest.mocked(saveGatewayRegistry).mockImplementation(() => {
            throw new Error('synthetic failure');
        });
        jest.mocked(deleteMobileGatewaySession).mockRejectedValue(
            new Error('synthetic deletion failure'),
        );
        deliver([
            {
                operation_id: 'registry/1',
                generation: 1,
                effect: {
                    PersistGatewayRegistry: {
                        registry: {
                            version: 3,
                            installation_id: 'synthetic',
                            active_gateway_id: null,
                            local: null,
                            remotes: [],
                        },
                    },
                },
            },
            {
                operation_id: 'delete/1',
                generation: 2,
                effect: {
                    DeleteGatewaySession: {
                        endpoint: {
                            id: 'synthetic',
                            name: 'Synthetic',
                            kind: 'remote',
                            gateway_base_url: 'https://gateway.invalid/',
                            session_ref: 'synthetic',
                        },
                    },
                },
            },
        ]);
        await flush();
        expect(complete.mock.calls.map(([request]) => request.completion.result.kind)).toEqual([
            'failed',
            'failed',
        ]);
        await adapter.close();
    });
    it('closes the native adapter with the process and rejects later effect delivery', async () => {
        const { complete, adapter, deliver, binding } = fixture();
        binding.applyProcessBatch({
            schema_version: 1,
            closed: true,
            sequence: 1,
            resnapshot: false,
            changes: [],
            effects: [],
        });
        expect(binding.isClosed()).toBe(true);
        deliver();
        await flush();
        expect(readMobileGatewaySession).not.toHaveBeenCalled();
        expect(complete).not.toHaveBeenCalled();
        await adapter.close();
    });
});

it('bounds slow native effects, retains deferred plans and cancels once after detach', async () => {
    const resolvers: (() => void)[] = [];
    jest.mocked(readMobileGatewaySession).mockImplementation(
        () => new Promise((resolve) => resolvers.push(() => resolve(null))),
    );
    const { complete, adapter, deliver } = fixture();
    const plans = Array.from({ length: 70 }, (_, i) => ({ ...plan, operation_id: `storage/${i}` }));
    deliver(plans);
    expect(readMobileGatewaySession).toHaveBeenCalledTimes(64);
    deliver(plans);
    expect(readMobileGatewaySession).toHaveBeenCalledTimes(64);
    resolvers.splice(0).forEach((resolve) => resolve());
    await flush();
    deliver(plans);
    expect(readMobileGatewaySession).toHaveBeenCalledTimes(70);
    const closing = adapter.close();
    void adapter.close();
    resolvers.splice(0).forEach((resolve) => resolve());
    await closing;
    expect(complete).toHaveBeenCalledTimes(70);
    deliver(plans);
    expect(readMobileGatewaySession).toHaveBeenCalledTimes(70);
});

it('completes unsupported provider effects explicitly while preserving the administration clipboard adapter', async () => {
    const { complete, adapter, deliver } = fixture();
    deliver([
        {
            operation_id: 'provider/open',
            generation: 1,
            effect: { kind: 'open_provider_path', path: '/synthetic/provider' },
        },
        {
            operation_id: 'provider/copy',
            generation: 1,
            effect: { kind: 'copy_provider_diagnostics', value: 'synthetic' },
        },
        {
            operation_id: 'administration/copy',
            generation: 1,
            effect: { kind: 'copy_administration_activation' },
        },
    ]);
    await flush();
    expect(complete.mock.calls.map(([request]) => request.completion)).toEqual([
        {
            operation_id: 'provider/open',
            generation: 1,
            result: { kind: 'failed', code: 'unsupported_native_effect' },
        },
        {
            operation_id: 'provider/copy',
            generation: 1,
            result: { kind: 'failed', code: 'unsupported_native_effect' },
        },
    ]);
    expect(readMobileGatewaySession).not.toHaveBeenCalled();
    await adapter.close();
});
