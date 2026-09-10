import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { getPioneerClientNitro } from '@pioneer/client-nitro';
import { pioneerClient } from './native';
import { parsePioneerClientResponse } from './response';

jest.mock('@pioneer/client-nitro', () => ({ getPioneerClientNitro: jest.fn() }));
const ok = (value: unknown) => JSON.stringify({ status: 'ok', value });
describe('versioned Mobile boundary', () => {
    const nitro = {
        initializeJson: jest.fn<() => string>(),
        clientIntentDispatchJson: jest.fn<(input: string) => string>(),
        clientScopeAcquireJson: jest.fn<(input: string) => string>(),
        clientScopeReleaseJson: jest.fn<(input: string) => string>(),
    };
    beforeEach(() => {
        jest.resetAllMocks();
        jest.mocked(getPioneerClientNitro).mockReturnValue(nitro as never);
    });
    it('rejects a stale bundled native artifact before exposing Client', () => {
        for (const version of [undefined, 1, 3]) {
            nitro.initializeJson.mockReturnValue(
                ok({ initialized: true, boundary_version: version }),
            );
            expect(() => pioneerClient.initialize()).toThrow('boundary version mismatch');
        }
        nitro.initializeJson.mockReturnValue(ok({ initialized: true, boundary_version: 2 }));
        expect(pioneerClient.initialize().initialized).toBe(true);
    });
    it('preserves every typed outcome without inventing a revision', () => {
        const request = {
            schema_version: 1,
            intent: {
                kind: 'session_demand',
                demand: {
                    endpoint_id: 'gateway',
                    generation: 8,
                    visibility: 'foreground',
                    network_available: false,
                },
            },
        } as const;
        for (const outcome of ['changed', 'noop', 'stale', 'rejected']) {
            const transition = { schema_version: 1, sequence: 7, outcome, effects: [] };
            nitro.clientIntentDispatchJson.mockReturnValue(ok(transition));
            expect(pioneerClient.clientIntentDispatch(request)).toEqual(transition);
            expect(JSON.parse(nitro.clientIntentDispatchJson.mock.calls.at(-1)![0])).toEqual(
                request,
            );
        }
    });
    it('uses exact scope leases and never adds protected payload to lifecycle requests', () => {
        nitro.clientScopeAcquireJson.mockReturnValue(ok(true));
        nitro.clientScopeReleaseJson.mockReturnValue(ok(true));
        const scope = { kind: 'thread', thread_id: 'thread' } as const;
        expect(pioneerClient.clientScopeAcquire(scope)).toBe(true);
        expect(pioneerClient.clientScopeRelease(scope)).toBe(true);
        expect(JSON.parse(nitro.clientScopeReleaseJson.mock.calls[0][0])).toEqual({
            schema_version: 1,
            scope,
        });
    });
    it('does not echo malformed native payload in the parse error', () => {
        for (const input of ['secret-payload:{', 'null', '7']) {
            expect(() => parsePioneerClientResponse(input)).toThrow();
            try {
                parsePioneerClientResponse(input);
            } catch (error) {
                expect(String(error)).not.toContain('secret-payload');
            }
        }
        expect(() =>
            parsePioneerClientResponse(
                '{"status":"error","message":"Client request failed","code":"session_revoked"}',
            ),
        ).toThrow('Client request failed');
    });
});
