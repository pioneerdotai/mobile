import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { getPioneerClientNitro } from '@pioneer/client-nitro';

import { pioneerClient } from './index';

jest.mock('@pioneer/client-nitro', () => ({
    getPioneerClientNitro: jest.fn(),
}));

const refreshGrant = {
    access_token: 'access_direct_only',
    access_expires_at_unix: 1_800_000_000,
    refresh_token: 'prf_direct_only',
    refresh_expires_at_unix: 1_900_000_000,
    refresh_generation: 1,
    session: {
        id: 'S00000000000000000001',
        device_id: 'D00000000000000000001',
        token_family_id: 'F00000000000000000001',
        status: 'active',
        refresh_generation: 1,
        refresh_expires_at_unix: 1_900_000_000,
    },
    device: {
        id: 'D00000000000000000001',
        installation_id: 'installation-1',
        display_name: 'Phone',
        client_kind: 'mobile',
        status: 'active',
    },
    auth_protocol_version: 3,
    credential_storage_order: 'persist_refresh_before_activating_access',
};

describe('mobile Nitro auth contract', () => {
    const nitro = {
        gatewayLoadRegistryV3Json: jest.fn<(input: string) => string>(),
        gatewayValidateRemoteJson: jest.fn<(input: string) => Promise<string>>(),
        gatewayAuthRefreshJson: jest.fn<(input: string) => Promise<string>>(),
        gatewayDeviceActivationParseJson: jest.fn<(input: string) => Promise<string>>(),
        gatewayDeviceActivationPresentationJson: jest.fn<(input: string) => Promise<string>>(),
        gatewayNextEventsJson: jest.fn<() => Promise<string>>(),
    };

    beforeEach(() => {
        jest.resetAllMocks();
        jest.mocked(getPioneerClientNitro).mockReturnValue(nitro as never);
    });

    it('returns a secret-bearing refresh grant only to the direct awaiting caller', async () => {
        nitro.gatewayAuthRefreshJson.mockResolvedValue(
            JSON.stringify({ status: 'ok', value: refreshGrant }),
        );

        const result = await pioneerClient.gatewayAuthRefresh({
            gateway_base_url: 'https://gateway.example/',
            credential: 'prf_input_secret',
            params: { refresh_request_id: 'Q00000000000000000001' },
        });

        expect(result.access_token).toBe('access_direct_only');
        expect(result.refresh_token).toBe('prf_direct_only');
        expect(nitro.gatewayAuthRefreshJson).toHaveBeenCalledWith(
            expect.stringContaining('prf_input_secret'),
        );
        expect(nitro.gatewayNextEventsJson).not.toHaveBeenCalled();
    });

    it('passes canonical endpoint ownership to native without TypeScript derivation', async () => {
        const cases = [
            ['http://127.0.0.1:17878/', 'loopback_plaintext'],
            ['http://192.0.2.10:17878/', 'remote_plaintext'],
            ['https://relay.example/', 'tls'],
            ['https://example.com/pioneer/', 'tls'],
        ] as const;

        for (const [gatewayBaseUrl, transportSecurity] of cases) {
            nitro.gatewayValidateRemoteJson.mockResolvedValueOnce(
                JSON.stringify({
                    status: 'ok',
                    value: {
                        state: 'reachable',
                        gateway_base_url: gatewayBaseUrl,
                        transport_security: transportSecurity,
                    },
                }),
            );
            await expect(
                pioneerClient.gatewayValidateRemote({
                    gateway_base_url: gatewayBaseUrl,
                    timeout_ms: 2_500,
                }),
            ).resolves.toMatchObject({
                gateway_base_url: gatewayBaseUrl,
                transport_security: transportSecurity,
            });
        }

        for (const [index, [gatewayBaseUrl]] of cases.entries()) {
            expect(nitro.gatewayValidateRemoteJson).toHaveBeenNthCalledWith(
                index + 1,
                JSON.stringify({ gateway_base_url: gatewayBaseUrl, timeout_ms: 2_500 }),
            );
        }
    });

    it('does not retry an unsupported legacy WS authority in TypeScript', async () => {
        nitro.gatewayValidateRemoteJson.mockResolvedValue(
            JSON.stringify({
                status: 'error',
                code: 'invalid_gateway_base_url',
                message: 'Gateway base URL must use http or https',
            }),
        );

        await expect(
            pioneerClient.gatewayValidateRemote({
                gateway_base_url: 'wss://legacy.example/ws',
                timeout_ms: 2_500,
            }),
        ).rejects.toMatchObject({ code: 'invalid_gateway_base_url' });
        expect(nitro.gatewayValidateRemoteJson).toHaveBeenCalledTimes(1);
    });

    it('loads registry v3 synchronously through the native shared contract', () => {
        const registry = {
            version: 3,
            installation_id: 'installation-mobile-1',
            active_gateway_id: null,
            local: null,
            remotes: [],
        };
        nitro.gatewayLoadRegistryV3Json.mockReturnValue(
            JSON.stringify({ status: 'ok', value: { state: 'current', registry } }),
        );

        expect(pioneerClient.gatewayLoadRegistryV3({ document: JSON.stringify(registry) })).toEqual(
            { state: 'current', registry },
        );
    });

    it('preserves machine-readable auth error codes', async () => {
        nitro.gatewayAuthRefreshJson.mockResolvedValue(
            JSON.stringify({
                status: 'error',
                message: 'session is revoked',
                code: 'session_revoked',
            }),
        );

        await expect(
            pioneerClient.gatewayAuthRefresh({
                gateway_base_url: 'https://gateway.example/',
                credential: 'prf_input_secret',
                params: { refresh_request_id: 'Q00000000000000000001' },
            }),
        ).rejects.toMatchObject({
            code: 'session_revoked',
            message: 'session is revoked',
        });
    });

    it('keeps the event stream credential-free', async () => {
        nitro.gatewayNextEventsJson.mockResolvedValue(JSON.stringify({ status: 'ok', value: [] }));
        const events = await pioneerClient.gatewayNextEvents();
        const snapshot = JSON.stringify(events);

        expect(snapshot).not.toContain('access_direct_only');
        expect(snapshot).not.toContain('prf_direct_only');
        expect(snapshot).not.toContain('activation_code');
    });

    it('returns activation parse and QR secrets only to direct callers', async () => {
        const activationCode = 'K7M4-P9Q2';
        const deepLink = `pioneer://activate?gateway_base_url=https%3A%2F%2Fgateway.example%2F#code=${activationCode}`;
        nitro.gatewayDeviceActivationParseJson.mockResolvedValue(
            JSON.stringify({
                status: 'ok',
                value: {
                    gateway_base_url: 'https://gateway.example/',
                    gateway_id: 'G00000000000000000001',
                    activation_code: activationCode,
                },
            }),
        );
        nitro.gatewayDeviceActivationPresentationJson.mockResolvedValue(
            JSON.stringify({
                status: 'ok',
                value: {
                    device_id: 'D00000000000000000002',
                    session_id: 'S00000000000000000002',
                    gateway_id: 'G00000000000000000001',
                    gateway_base_url: 'https://gateway.example/',
                    expires_at_unix: 1_800_000_000,
                    manual_code: activationCode,
                    deep_link: deepLink,
                    qr_width: 1,
                    qr_modules: [true],
                },
            }),
        );

        const parsed = await pioneerClient.gatewayDeviceActivationParse({ uri: deepLink });
        const presented = await pioneerClient.gatewayDeviceActivationPresentation({
            gateway_base_url: parsed.gateway_base_url,
            app_url_scheme: 'pioneer-dev',
            created_device: {
                device_id: 'D00000000000000000002',
                session_id: 'S00000000000000000002',
                gateway_id: parsed.gateway_id,
                activation_code: parsed.activation_code,
                expires_at_unix: 1_800_000_000,
            },
        });

        expect(presented.manual_code).toBe(activationCode);
        expect(presented.deep_link).toBe(deepLink);
        expect(nitro.gatewayNextEventsJson).not.toHaveBeenCalled();
    });
});
