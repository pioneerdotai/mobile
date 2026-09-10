import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { pioneerClient } from '@/client';
import { parseMobileDeviceActivationUri } from './device-activation';
jest.mock('@/client', () => ({ pioneerClient: { gatewayDeviceActivationParse: jest.fn() } }));
const parse = jest.mocked(pioneerClient.gatewayDeviceActivationParse);
describe('native activation route adapter', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    it('hands the fragment-bearing URI to Client and maps the private result', async () => {
        const presentation = {
            gateway_base_url: 'https://gateway.invalid/',
            gateway_id: 'G00000000000000000001',
            activation_code: 'K7M4P9Q2',
        };
        parse.mockResolvedValue(presentation);
        expect(await parseMobileDeviceActivationUri('pioneer-dev://activate#synthetic')).toEqual(
            presentation,
        );
        expect(parse).toHaveBeenCalledWith({ uri: 'pioneer-dev://activate#synthetic' });
    });
    it('does not expose a parser error containing the secret presentation', async () => {
        parse.mockRejectedValue(new Error('synthetic secret'));
        const failure = await parseMobileDeviceActivationUri('invalid').catch(
            (error: Error) => error,
        );
        expect(failure).toBeInstanceOf(Error);
        expect((failure as Error).message).toBe('invalid_presentation');
        expect((failure as Error).cause).toBeUndefined();
        expect(JSON.stringify(failure)).not.toContain('synthetic secret');
    });
});
