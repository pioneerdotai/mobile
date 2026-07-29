export const DEVICE_SESSION_AUTH_PROTOCOL_VERSION = 3;
export const REFRESH_CREDENTIAL_PREFIX = 'prf2_';
export const REFRESH_CREDENTIAL_BODY_LENGTH = 164;

export const isRefreshCredential = (value: unknown): value is string => {
    if (typeof value !== 'string' || !value.startsWith(REFRESH_CREDENTIAL_PREFIX)) {
        return false;
    }
    const body = value.slice(REFRESH_CREDENTIAL_PREFIX.length);
    return body.length === REFRESH_CREDENTIAL_BODY_LENGTH && /^[A-Za-z0-9_-]+$/.test(body);
};
