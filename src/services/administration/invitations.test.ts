import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { pioneerClient } from '@/client';
import { prepareAdministrationCommand } from './operations';
import { createInvitationPresentation } from './invitations';
jest.mock('./operations', () => ({
    performAdministrationCommand: jest.fn(),
    prepareAdministrationCommand: jest.fn(() => 7),
}));

jest.mock('@/client', () => ({
    pioneerClient: {
        invitationCreate: jest.fn(),
        invitationPresentation: jest.fn(),
        invitationList: jest.fn(),
    },
}));

describe('mobile invitation administration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('sends selection once to Client and claims the operation for transient activation', async () => {
        jest.mocked(pioneerClient.invitationCreate).mockResolvedValue({
            invitation: {} as never,
            presentation: { deep_link: 'pioneer://invite#token=secret' } as never,
        });
        jest.mocked(pioneerClient.invitationPresentation).mockResolvedValue({
            canonical_uri: 'pioneer://invite#token=secret',
            gateway_base_url: 'https://gateway.test/',
            gateway_id: 'G00000000000000000001',
            qr_payload: 'pioneer://invite#token=secret',
            qr_width: 1,
            qr_modules: [true],
            transport_security: 'secure_wss',
        });
        await createInvitationPresentation(
            ['workspace-b', 'workspace-a', 'workspace-b'],
            'test-role',
        );
        expect(prepareAdministrationCommand).toHaveBeenCalledWith({
            kind: 'create_invitation',
            params: {
                role_key: 'test-role',
                workspace_ids: ['workspace-b', 'workspace-a', 'workspace-b'],
            },
        });
        expect(pioneerClient.invitationCreate).toHaveBeenCalledWith({
            schema_version: 1,
            generation: 7,
        });
        expect(pioneerClient.invitationPresentation).toHaveBeenCalledWith({
            uri: 'pioneer://invite#token=secret',
        });
    });

    it('keeps the secret out of navigation, durable storage and query keys', () => {
        const source = readFileSync(
            join(process.cwd(), 'src/screens/settings/invitations.tsx'),
            'utf8',
        );
        expect(source).toContain('onDismiss={dismissCreation}');
        expect(source).toContain('<WorkspaceToggleSelector');
        expect(source).toContain('<CredentialPresentation');
        expect(source).not.toContain('router.push');
        expect(source).not.toContain('MMKV');
        expect(source).not.toContain('console.');
        expect(source).not.toContain('useMutation');
        expect(source).not.toContain('useInfiniteQuery');
    });
});
