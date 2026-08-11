/* eslint-disable import/first */

import { beforeEach, describe, expect, jest, test } from '@jest/globals';

jest.mock('@/client', () => ({
    pioneerClient: {
        memberAvatarCache: jest.fn(),
    },
}));

import { pioneerClient } from '@/client';

import { cachedAvatarPathToUri, resolveMemberAvatar } from './resolve-avatar';

const memberAvatarCache = jest.mocked(pioneerClient.memberAvatarCache);
const principalId = 'P0000000000000000000A';
const revision = 'a'.repeat(64);

describe('resolveMemberAvatar', () => {
    beforeEach(() => {
        memberAvatarCache.mockReset();
    });

    test('returns only the local file URI for the requested immutable revision', async () => {
        memberAvatarCache.mockResolvedValue({
            cached_image_path: '/owned/cache/member avatar.png',
            principal_id: principalId,
            avatar_revision: revision,
            media_type: 'image/png',
            source: 'downloaded',
        });

        await expect(resolveMemberAvatar(principalId, revision)).resolves.toBe(
            'file:///owned/cache/member%20avatar.png',
        );
        expect(memberAvatarCache).toHaveBeenCalledWith({
            principal_id: principalId,
            avatar_revision: revision,
        });
    });

    test('rejects mismatched native metadata and unsafe local paths', async () => {
        memberAvatarCache
            .mockResolvedValueOnce({
                cached_image_path: '/owned/cache/member.png',
                principal_id: 'P0000000000000000000B',
                avatar_revision: revision,
                media_type: 'image/png',
                source: 'revalidated',
            })
            .mockResolvedValueOnce({
                cached_image_path: '/owned/cache/member.png\nunsafe',
                principal_id: principalId,
                avatar_revision: revision,
                media_type: 'image/png',
                source: 'revalidated',
            });

        await expect(resolveMemberAvatar(principalId, revision)).resolves.toBeNull();
        await expect(resolveMemberAvatar(principalId, revision)).resolves.toBeNull();
    });

    test('normalizes an already-qualified file URI without changing it', () => {
        expect(cachedAvatarPathToUri('file:///owned/cache/avatar.png')).toBe(
            'file:///owned/cache/avatar.png',
        );
    });
});
