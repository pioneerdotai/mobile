import { describe, expect, it } from '@jest/globals';
import {
    formatDeviceActivationCode,
    normalizeDeviceActivationCode,
    normalizeDeviceActivationCodeInput,
    sanitizeDeviceActivationCodeInput,
} from './device-activation-code';

describe('device activation OTP', () => {
    it('normalizes grouped, ungrouped, lowercase and Crockford alias input', () => {
        expect(normalizeDeviceActivationCode('K7M4-P9Q2')).toBe('K7M4P9Q2');
        expect(normalizeDeviceActivationCode('k7m4p9q2')).toBe('K7M4P9Q2');
        expect(normalizeDeviceActivationCode('OIL4-P9Q2')).toBe('0114P9Q2');
    });

    it('accepts partial values only at valid group boundaries', () => {
        expect(normalizeDeviceActivationCodeInput('K7M4-')).toBe('K7M4');
        expect(normalizeDeviceActivationCodeInput('K7-M4')).toBeNull();
        expect(normalizeDeviceActivationCodeInput('K7M4--P9Q2')).toBeNull();
        expect(normalizeDeviceActivationCodeInput('K7M4P9Q2-')).toBeNull();
    });

    it('rejects incomplete, oversized and non-Crockford codes at the service boundary', () => {
        expect(normalizeDeviceActivationCode('123456')).toBeNull();
        expect(normalizeDeviceActivationCode('K7M4-P9Q2A')).toBeNull();
        expect(normalizeDeviceActivationCode('K7U4-P9Q2')).toBeNull();
        expect(normalizeDeviceActivationCode('K7M4 P9Q2')).toBeNull();
    });

    it('sanitizes widget input without weakening strict service validation', () => {
        expect(sanitizeDeviceActivationCodeInput(' k7m4-p9q2 extra ')).toBe('K7M4P9Q2');
        expect(normalizeDeviceActivationCode(' k7m4-p9q2 extra ')).toBeNull();
    });

    it('formats canonical values for human-readable presentation', () => {
        expect(formatDeviceActivationCode('k7m4p9q2')).toBe('K7M4-P9Q2');
        expect(formatDeviceActivationCode('123456')).toBeNull();
    });

    it('does not expand Unicode glyphs into multiple Crockford symbols', () => {
        expect(normalizeDeviceActivationCodeInput('K7M4-ﬆQ2')).toBeNull();
        expect(sanitizeDeviceActivationCodeInput('K7M4ﬆQ2')).toBe('K7M4Q2');
    });
});
