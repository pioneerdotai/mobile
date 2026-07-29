const DEVICE_ACTIVATION_CODE_LENGTH = 8;
const DEVICE_ACTIVATION_GROUP_LENGTH = DEVICE_ACTIVATION_CODE_LENGTH / 2;
const DEVICE_ACTIVATION_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

const canonicalSymbol = (value: string): string | null => {
    if (!/^[A-Za-z0-9]$/.test(value)) {
        return null;
    }
    const upper = value.toUpperCase();
    if (upper === 'O') {
        return '0';
    }
    if (upper === 'I' || upper === 'L') {
        return '1';
    }
    return DEVICE_ACTIVATION_ALPHABET.includes(upper) ? upper : null;
};

export const normalizeDeviceActivationCodeInput = (value: string): string | null => {
    let normalized = '';
    let sawSeparator = false;
    for (const character of value) {
        if (character === '-') {
            if (sawSeparator || normalized.length !== DEVICE_ACTIVATION_GROUP_LENGTH) {
                return null;
            }
            sawSeparator = true;
            continue;
        }
        if (normalized.length >= DEVICE_ACTIVATION_CODE_LENGTH) {
            return null;
        }
        const canonical = canonicalSymbol(character);
        if (!canonical) {
            return null;
        }
        normalized += canonical;
    }
    return normalized;
};

export const normalizeDeviceActivationCode = (value: string): string | null => {
    const normalized = normalizeDeviceActivationCodeInput(value);
    return normalized?.length === DEVICE_ACTIVATION_CODE_LENGTH ? normalized : null;
};

/**
 * Input-only sanitizer used around the third-party OTP widget.
 *
 * The service boundary remains strict; this helper merely keeps the visible
 * cells canonical while the user types or pastes a grouped Crockford code.
 */
export const sanitizeDeviceActivationCodeInput = (value: string): string => {
    let normalized = '';
    for (const character of value) {
        if (character === '-') {
            continue;
        }
        const canonical = canonicalSymbol(character);
        if (canonical) {
            normalized += canonical;
        }
        if (normalized.length === DEVICE_ACTIVATION_CODE_LENGTH) {
            break;
        }
    }
    return normalized;
};

export const formatDeviceActivationCode = (value: string): string | null => {
    const normalized = normalizeDeviceActivationCode(value);
    return normalized
        ? `${normalized.slice(0, DEVICE_ACTIVATION_GROUP_LENGTH)}-${normalized.slice(
              DEVICE_ACTIVATION_GROUP_LENGTH,
          )}`
        : null;
};
