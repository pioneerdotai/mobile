import { describe, expect, it } from '@jest/globals';

const GATEWAY_PROTOCOL_HEADER = 'Pioneer-Protocol-Version' as const;
const GATEWAY_PROTOCOL_VERSION = '1' as const;
const TEST_ACCESS_CREDENTIAL = 'test_access_header.test_access_payload.test_access_signature';
const TEST_VIEW_GRANT = 'A'.repeat(43);

const GATEWAY_ROUTE_FIXTURES = {
    websocketRoot: '/',
    artifactContent:
        '/storage/workspaces/W00000000000000000001/artifacts/A00000000000000000001/versions/V00000000000000000001/content',
    artifactProjection:
        '/storage/workspaces/W00000000000000000001/artifacts/A00000000000000000001/versions/V00000000000000000001/projections/thumbnail',
    view: `/storage/views/${TEST_VIEW_GRANT}`,
    avatar: '/storage/members/P00000000000000000001/avatar/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    health: '/health',
    readiness: '/ready',
    reservedWebhook: '/webhooks/future-only',
    rejectedWebSockets: ['/ws', '/socket', '/api/v1/ws', '/custom-path'],
} as const;

type HeadlessArtifactAction =
    | { kind: 'mint-view'; artifactId: string; versionId: string }
    | { kind: 'open-view'; relativeUrl: string }
    | { kind: 'download-share'; artifactId: string; versionId: string };

class HeadlessArtifactActionFixture {
    private readonly actions: HeadlessArtifactAction[] = [];

    mintView(artifactId: string, versionId: string): void {
        this.actions.push({ kind: 'mint-view', artifactId, versionId });
    }

    openView(relativeUrl: string): void {
        if (!relativeUrl.startsWith('/storage/views/')) {
            throw new Error('headless viewer accepts only scoped relative view URLs');
        }
        this.actions.push({ kind: 'open-view', relativeUrl });
    }

    downloadAndShare(artifactId: string, versionId: string): void {
        this.actions.push({ kind: 'download-share', artifactId, versionId });
    }

    snapshot(): readonly HeadlessArtifactAction[] {
        return [...this.actions];
    }
}

const planHeadlessNativeTransport = (gatewayBaseUrl: string) => {
    const base = new URL(gatewayBaseUrl.endsWith('/') ? gatewayBaseUrl : `${gatewayBaseUrl}/`);
    if (base.protocol !== 'http:' && base.protocol !== 'https:') {
        throw new Error('gateway_base_url must use http or https');
    }
    const websocket = new URL(base);
    websocket.protocol = base.protocol === 'https:' ? 'wss:' : 'ws:';
    return {
        gatewayBaseUrl: base.toString(),
        websocketUrl: websocket.toString(),
        websocketHeaders: { [GATEWAY_PROTOCOL_HEADER]: GATEWAY_PROTOCOL_VERSION },
        artifactUrl: new URL(GATEWAY_ROUTE_FIXTURES.artifactContent.slice(1), base).toString(),
        avatarUrl: new URL(GATEWAY_ROUTE_FIXTURES.avatar.slice(1), base).toString(),
        credentialOwner: 'native-session' as const,
    };
};

const MIXED_VERSION_FAILURES = [
    {
        requestPath: '/',
        requestHeaders: {},
        fallbackPaths: [],
        outcome: 'reject-before-upgrade',
    },
    {
        requestPath: '/api/v1/ws',
        requestHeaders: {},
        fallbackPaths: [],
        outcome: 'not-found',
    },
    {
        requestPath: '/',
        requestHeaders: { [GATEWAY_PROTOCOL_HEADER]: GATEWAY_PROTOCOL_VERSION },
        fallbackPaths: [],
        outcome: 'unsupported-no-fallback',
    },
] as const;

const resolveGatewayRelativeUrl = (gatewayBaseUrl: string, relativeUrl: string): string => {
    const base = gatewayBaseUrl.endsWith('/') ? gatewayBaseUrl : `${gatewayBaseUrl}/`;
    return new URL(relativeUrl.replace(/^\/+/, ''), base).toString();
};

const redactGatewaySnapshot = (rendered: string): string =>
    rendered
        .replaceAll(TEST_ACCESS_CREDENTIAL, '[redacted-authorization]')
        .replaceAll(TEST_VIEW_GRANT, '[redacted-view-grant]');

const assertGatewaySnapshotRedacted = (rendered: string): void => {
    if (
        rendered.includes(TEST_ACCESS_CREDENTIAL) ||
        rendered.includes(TEST_VIEW_GRANT) ||
        rendered.includes('test_access_payload')
    ) {
        throw new Error('Gateway snapshot contains a raw credential or view grant');
    }
};

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
            resolveGatewayRelativeUrl('https://gateway.test/pioneer/', '/storage/views/redacted'),
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
                'https://gateway.test/pioneer/storage/members/P00000000000000000001/avatar/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
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
