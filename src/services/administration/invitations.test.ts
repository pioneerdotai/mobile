import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { pioneerClient } from '@/client';

import { createInvitationPresentation, loadInvitationPage } from './invitations';

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

    it('keeps pagination cursor ownership exact', async () => {
        jest.mocked(pioneerClient.invitationList).mockResolvedValue({
            invitations: [],
            next_cursor: 'next',
        });
        await loadInvitationPage('cursor');
        expect(pioneerClient.invitationList).toHaveBeenCalledWith({ cursor: 'cursor', limit: 50 });
    });

    it('normalizes workspace selection and delegates URI parsing to native code', async () => {
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
        await createInvitationPresentation(['workspace-b', 'workspace-a', 'workspace-b']);
        expect(pioneerClient.invitationCreate).toHaveBeenCalledWith({
            workspace_ids: ['workspace-a', 'workspace-b'],
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
        expect(source).toContain('onDismiss={dismissPresentation}');
        expect(source).not.toContain('router.push');
        expect(source).not.toContain('MMKV');
        expect(source).not.toContain('console.');
        expect(source).toContain('administrationConflictRefetch');
        expect(source).toContain('invalidateAdministrationTargets');
    });
});
