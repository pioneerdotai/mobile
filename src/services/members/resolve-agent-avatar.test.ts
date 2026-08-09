/* eslint-disable import/first */

import { beforeEach, describe, expect, jest, test } from '@jest/globals';

jest.mock('@/client', () => ({
    pioneerClient: {
        agentAvatarCache: jest.fn(),
    },
}));

import { pioneerClient } from '@/client';

import { resolveAgentAvatar } from './resolve-agent-avatar';

const agentAvatarCache = jest.mocked(pioneerClient.agentAvatarCache);

describe('resolveAgentAvatar', () => {
    beforeEach(() => {
        agentAvatarCache.mockReset();
    });

    test('returns only a local file URI from the authenticated native cache', async () => {
        agentAvatarCache.mockResolvedValue({
            cached_image_path: '/owned/cache/agent avatar.jpeg',
            avatar_revision: 'a'.repeat(64),
            media_type: 'image/jpeg',
            source: 'downloaded',
        });

        await expect(resolveAgentAvatar()).resolves.toBe('file:///owned/cache/agent%20avatar.jpeg');
        expect(agentAvatarCache).toHaveBeenCalledWith({});
    });

    test('rejects malformed native metadata and unsafe paths', async () => {
        agentAvatarCache
            .mockResolvedValueOnce({
                cached_image_path: '/owned/cache/agent.jpeg',
                avatar_revision: 'invalid',
                media_type: 'image/jpeg',
                source: 'downloaded',
            })
            .mockResolvedValueOnce({
                cached_image_path: '/owned/cache/agent.jpeg\nunsafe',
                avatar_revision: 'a'.repeat(64),
                media_type: 'image/jpeg',
                source: 'revalidated',
            });

        await expect(resolveAgentAvatar()).resolves.toBeNull();
        await expect(resolveAgentAvatar()).resolves.toBeNull();
    });
});
