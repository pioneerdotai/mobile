import { pioneerClient } from '@/client';

import { cachedAvatarPathToUri } from './resolve-avatar';

const resolveAgentAvatar = async (): Promise<string | null> => {
    const result = await pioneerClient.agentAvatarCache({});
    if (!/^[a-f0-9]{64}$/u.test(result.avatar_revision)) {
        return null;
    }
    return cachedAvatarPathToUri(result.cached_image_path);
};

export { resolveAgentAvatar };
