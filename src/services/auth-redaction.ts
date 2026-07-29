const SECRET_FIELDS = new Set([
    'authorization',
    'token',
    'authtoken',
    'bearertoken',
    'accesstoken',
    'refreshtoken',
    'deviceactivationcode',
    'activationcode',
    'refreshcredential',
    'deviceactivationcredential',
    'activationcredential',
    'credential',
    'credentials',
    'sessionsecret',
]);

const isSecretField = (value: string): boolean => {
    return SECRET_FIELDS.has(value.replace(/[_-]/g, '').toLowerCase());
};

export const redactAuthText = (value: string): string => {
    return value
        .replace(/pioneer:\/\/activate[^\s"']*/gi, 'pioneer://activate?[redacted]')
        .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [redacted]')
        .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[redacted-jwt]')
        .replace(/\b(?:prf_|device_)[A-Za-z0-9._~+/=-]{20,}/g, '[redacted-credential]')
        .replace(/\b(key|password|token|credential)=([^&\s]+)/gi, '$1=[redacted]');
};

export const redactAuthValue = (value: unknown): unknown => {
    return redactValue(value, new WeakSet<object>(), 0);
};

const redactValue = (value: unknown, seen: WeakSet<object>, depth: number): unknown => {
    if (typeof value === 'string') {
        return redactAuthText(value);
    }
    if (value === null || typeof value !== 'object') {
        return value;
    }
    if (depth >= 8) {
        return '[redacted-depth]';
    }
    if (seen.has(value)) {
        return '[circular]';
    }
    seen.add(value);
    if (value instanceof Error) {
        const redacted = new Error(redactAuthText(value.message));
        redacted.name = value.name;
        return redacted;
    }
    if (Array.isArray(value)) {
        return value.map((item) => redactValue(item, seen, depth + 1));
    }
    return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [
            key,
            isSecretField(key) ? '[redacted]' : redactValue(item, seen, depth + 1),
        ]),
    );
};
