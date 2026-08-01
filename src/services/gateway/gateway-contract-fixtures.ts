export const GATEWAY_PROTOCOL_HEADER = 'Pioneer-Protocol-Version' as const;
export const GATEWAY_PROTOCOL_VERSION = '1' as const;
export const TEST_ACCESS_CREDENTIAL =
    'test_access_header.test_access_payload.test_access_signature';
export const TEST_VIEW_GRANT =
    'pvg1_test-only-opaque-grant-that-must-never-appear-in-snapshots';

export const GATEWAY_ROUTE_FIXTURES = {
    websocketRoot: '/',
    artifactContent:
        '/storage/workspaces/W00000000000000000001/artifacts/A00000000000000000001/versions/V00000000000000000001/content',
    artifactProjection:
        '/storage/workspaces/W00000000000000000001/artifacts/A00000000000000000001/versions/V00000000000000000001/projections/thumbnail',
    view: `/storage/views/${TEST_VIEW_GRANT}`,
    avatar: '/storage/members/P00000000000000000001/avatar/avatar-revision-test',
    health: '/health',
    readiness: '/ready',
    reservedWebhook: '/webhooks/future-only',
    rejectedWebSockets: ['/ws', '/socket', '/api/v1/ws', '/custom-path'],
} as const;

export type HeadlessArtifactAction =
    | { kind: 'mint-view'; artifactId: string; versionId: string }
    | { kind: 'open-view'; relativeUrl: string }
    | { kind: 'download-share'; artifactId: string; versionId: string };

export type HeadlessNativeTransportPlan = Readonly<{
    gatewayBaseUrl: string;
    websocketUrl: string;
    websocketHeaders: Readonly<Record<typeof GATEWAY_PROTOCOL_HEADER, '1'>>;
    artifactUrl: string;
    avatarUrl: string;
    credentialOwner: 'native-session';
}>;

export const planHeadlessNativeTransport = (
    gatewayBaseUrl: string,
): HeadlessNativeTransportPlan => {
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
        artifactUrl: new URL(
            'storage/workspaces/W00000000000000000001/artifacts/A00000000000000000001/versions/V00000000000000000001/content',
            base,
        ).toString(),
        avatarUrl: new URL(
            'storage/members/P00000000000000000001/avatar/avatar-revision-test',
            base,
        ).toString(),
        credentialOwner: 'native-session',
    };
};

export const MIXED_VERSION_FAILURES = [
    {
        name: 'old-root-client-missing-version-header',
        requestPath: '/',
        requestHeaders: {},
        fallbackPaths: [],
        outcome: 'reject-before-upgrade',
    },
    {
        name: 'legacy-api-path-client',
        requestPath: '/api/v1/ws',
        requestHeaders: {},
        fallbackPaths: [],
        outcome: 'not-found',
    },
    {
        name: 'updated-client-to-old-gateway',
        requestPath: '/',
        requestHeaders: { [GATEWAY_PROTOCOL_HEADER]: GATEWAY_PROTOCOL_VERSION },
        fallbackPaths: [],
        outcome: 'unsupported-no-fallback',
    },
] as const;

export class HeadlessArtifactActionFixture {
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

export const resolveGatewayRelativeUrl = (
    gatewayBaseUrl: string,
    relativeUrl: string,
): string => {
    const base = gatewayBaseUrl.endsWith('/') ? gatewayBaseUrl : `${gatewayBaseUrl}/`;
    return new URL(relativeUrl.replace(/^\/+/, ''), base).toString();
};

export const redactGatewaySnapshot = (rendered: string): string =>
    rendered
        .replaceAll(TEST_ACCESS_CREDENTIAL, '[redacted-authorization]')
        .replaceAll(TEST_VIEW_GRANT, '[redacted-view-grant]');

export const assertGatewaySnapshotRedacted = (rendered: string): void => {
    if (
        rendered.includes(TEST_ACCESS_CREDENTIAL) ||
        rendered.includes(TEST_VIEW_GRANT) ||
        rendered.includes('test_access_payload')
    ) {
        throw new Error('Gateway snapshot contains a raw credential or view grant');
    }
};
