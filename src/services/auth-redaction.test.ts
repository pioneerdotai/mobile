import { describe, expect, it } from '@jest/globals';
import { redactAuthText, redactAuthValue } from './auth-redaction';

const secrets = {
    access_token: 'eyJheader.payload.signature',
    refresh_token: `prf_${'r'.repeat(48)}`,
    activation_code: 'K7M4-P9Q2',
    authorization: 'Bearer top.secret.value',
};

describe('auth telemetry redaction', () => {
    it('redacts credentials and complete activation links from text', () => {
        const rendered = redactAuthText(
            `Bearer top.secret.value ${secrets.refresh_token} pioneer://activate?gateway=x#code=${secrets.activation_code}`,
        );
        for (const secret of Object.values(secrets)) {
            expect(rendered).not.toContain(secret);
        }
        expect(rendered).not.toContain('#code=');
    });

    it('redacts secret-named fields recursively before telemetry', () => {
        const redacted = JSON.stringify(
            redactAuthValue({
                request: secrets,
                token: 'opaque-token-without-a-known-prefix',
                auth_token: 'unstructured-secret-without-a-known-prefix',
                nested: [{ message: `failed for ${secrets.refresh_token}` }],
            }),
        );
        for (const secret of Object.values(secrets)) {
            expect(redacted).not.toContain(secret);
        }
        expect(redacted).not.toContain('opaque-token-without-a-known-prefix');
        expect(redacted).not.toContain('unstructured-secret-without-a-known-prefix');
    });
});
