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
    auth_protocol_version: 2,
    credential_storage_order: 'persist_refresh_before_activating_access',
};

describe('mobile Nitro auth contract', () => {
    const nitro = {
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
            address: 'wss://gateway.example/ws',
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
                address: 'wss://gateway.example/ws',
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
        const deepLink = `pioneer://activate?gateway=wss%3A%2F%2Fgateway.example%2Fws#code=${activationCode}`;
        nitro.gatewayDeviceActivationParseJson.mockResolvedValue(
            JSON.stringify({
                status: 'ok',
                value: {
                    protected_endpoint: 'wss://gateway.example/ws',
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
                    protected_endpoint: 'wss://gateway.example/ws',
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
            protected_endpoint: parsed.protected_endpoint,
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
