import { describe, expect, it } from '@jest/globals';

import {
    GATEWAY_PROTOCOL_HEADER,
    GATEWAY_PROTOCOL_VERSION,
    GATEWAY_ROUTE_FIXTURES,
    HeadlessArtifactActionFixture,
    MIXED_VERSION_FAILURES,
    TEST_ACCESS_CREDENTIAL,
    TEST_VIEW_GRANT,
    assertGatewaySnapshotRedacted,
    planHeadlessNativeTransport,
    redactGatewaySnapshot,
    resolveGatewayRelativeUrl,
} from './gateway-contract-fixtures';

describe('Gateway headless contract fixtures', () => {
    it('pins the root/header/storage contract without a compatibility route', () => {
        expect(GATEWAY_PROTOCOL_HEADER).toBe('Pioneer-Protocol-Version');
        expect(GATEWAY_PROTOCOL_VERSION).toBe('1');
        expect(GATEWAY_ROUTE_FIXTURES.websocketRoot).toBe('/');
        expect(GATEWAY_ROUTE_FIXTURES.health).toBe('/health');
        expect(GATEWAY_ROUTE_FIXTURES.readiness).toBe('/ready');
        expect(GATEWAY_ROUTE_FIXTURES.artifactContent).toContain('/storage/workspaces/');
        expect(GATEWAY_ROUTE_FIXTURES.reservedWebhook.startsWith('/webhooks/')).toBe(true);
        expect(GATEWAY_ROUTE_FIXTURES.rejectedWebSockets).toContain('/api/v1/ws');
    });

    it('records Open and Download/Share without native UI or a running app', () => {
        const fixture = new HeadlessArtifactActionFixture();
        fixture.mintView('artifact-test', 'version-test');
        fixture.openView('/storage/views/redacted');
        fixture.downloadAndShare('artifact-test', 'version-test');

        expect(fixture.snapshot()).toEqual([
            { kind: 'mint-view', artifactId: 'artifact-test', versionId: 'version-test' },
            { kind: 'open-view', relativeUrl: '/storage/views/redacted' },
            { kind: 'download-share', artifactId: 'artifact-test', versionId: 'version-test' },
        ]);
    });

    it('resolves custom-prefix relative URLs and redacts secrets', () => {
        expect(
            resolveGatewayRelativeUrl(
                'https://gateway.test/pioneer/',
                '/storage/views/redacted',
            ),
        ).toBe('https://gateway.test/pioneer/storage/views/redacted');

        const redacted = redactGatewaySnapshot(
            `Authorization: Bearer ${TEST_ACCESS_CREDENTIAL}; /storage/views/${TEST_VIEW_GRANT}`,
        );
        expect(() => assertGatewaySnapshotRedacted(redacted)).not.toThrow();
        expect(() => assertGatewaySnapshotRedacted(TEST_ACCESS_CREDENTIAL)).toThrow();
    });

    it('captures one native root/storage plan without JS credentials', () => {
        const plan = planHeadlessNativeTransport('https://gateway.test/pioneer/');
        expect(plan).toEqual({
            gatewayBaseUrl: 'https://gateway.test/pioneer/',
            websocketUrl: 'wss://gateway.test/pioneer/',
            websocketHeaders: { 'Pioneer-Protocol-Version': '1' },
            artifactUrl:
                'https://gateway.test/pioneer/storage/workspaces/W00000000000000000001/artifacts/A00000000000000000001/versions/V00000000000000000001/content',
            avatarUrl:
                'https://gateway.test/pioneer/storage/members/P00000000000000000001/avatar/avatar-revision-test',
            credentialOwner: 'native-session',
        });
        const rendered = JSON.stringify(plan).toLowerCase();
        expect(rendered).not.toContain('authorization');
        expect(rendered).not.toContain('access_token');
        expect(rendered).not.toContain('base64');
    });

    it('makes both mixed-version directions terminal without fallback traffic', () => {
        expect(MIXED_VERSION_FAILURES).toHaveLength(3);
        for (const fixture of MIXED_VERSION_FAILURES) {
            expect(fixture.outcome).not.toBe('success');
            expect(fixture.fallbackPaths).toEqual([]);
        }
        expect(MIXED_VERSION_FAILURES[0]).toMatchObject({
            requestPath: '/',
            requestHeaders: {},
            outcome: 'reject-before-upgrade',
        });
        expect(MIXED_VERSION_FAILURES[1]).toMatchObject({
            requestPath: '/api/v1/ws',
            outcome: 'not-found',
        });
    });
});
