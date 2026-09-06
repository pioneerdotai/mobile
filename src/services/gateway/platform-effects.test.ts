import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { MobileClientBinding, type MobileClientBridge } from '@/client/mobile-client-binding';
import type { ClientEffectPlan } from '@/client/generated/client_effect_plan';
import { MobileSessionStorageAdapter } from './platform-effects';
import { readMobileGatewaySession } from './session-storage';

jest.mock('./session-storage', () => ({
    readMobileGatewaySession: jest.fn(),
    writeMobileGatewaySession: jest.fn(),
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
        dispatch: () => {
            throw new Error('unused');
        },
        snapshot: () => null,
        changes: () => ({ schema_version: 1, changes: [] }),
        resnapshot: () => null,
    };
    const binding = new MobileClientBinding(bridge);
    const adapter = new MobileSessionStorageAdapter(binding);
    const deliver = () =>
        binding.applyProcessBatch({
            closed: false,
            schema_version: 1,
            sequence: 0,
            changes: [],
            resnapshot: false,
            effects: [plan],
        });
    return { complete, adapter, deliver };
};

beforeEach(() => {
    jest.mocked(readMobileGatewaySession).mockReset().mockResolvedValue(null);
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
});
