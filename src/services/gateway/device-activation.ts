import { pioneerClient } from '@/client';
export type MobileDeviceActivationErrorCode =
    'invalid_presentation' | 'gateway_mismatch' | 'activation_failed' | 'storage_failed';

export class MobileDeviceActivationError extends Error {
    readonly code: MobileDeviceActivationErrorCode;

    constructor(code: MobileDeviceActivationErrorCode, cause?: unknown) {
        super(code);
        this.name = 'MobileDeviceActivationError';
        this.code = code;
        this.cause = cause;
    }
}

export type MobileDeviceActivationInput = {
    gateway_base_url: string;
    activation_code: string;
    gateway_id?: string | null;
};

/** Secret-bearing route input crosses directly to the shared parser. */
export const parseMobileDeviceActivationUri = async (
    uri: string,
): Promise<MobileDeviceActivationInput> => {
    try {
        const parsed = await pioneerClient.gatewayDeviceActivationParse({ uri });
        return {
            gateway_base_url: parsed.gateway_base_url,
            gateway_id: parsed.gateway_id,
            activation_code: parsed.activation_code,
        };
    } catch {
        throw new MobileDeviceActivationError('invalid_presentation');
    }
};
