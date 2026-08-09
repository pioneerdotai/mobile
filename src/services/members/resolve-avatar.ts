import { pioneerClient } from '@/client';

const cachedAvatarPathToUri = (cachedImagePath: string): string | null => {
    const path = cachedImagePath.trim();
    if (!path || /[\r\n]/u.test(path)) {
        return null;
    }
    return path.startsWith('file://') ? path : `file://${encodeURI(path)}`;
};

const resolveMemberAvatar = async (
    principalId: string,
    avatarRevision: string,
): Promise<string | null> => {
    const result = await pioneerClient.memberAvatarCache({
        principal_id: principalId,
        avatar_revision: avatarRevision,
    });
    if (result.principal_id !== principalId || result.avatar_revision !== avatarRevision) {
        return null;
    }
    return cachedAvatarPathToUri(result.cached_image_path);
};

export { cachedAvatarPathToUri, resolveMemberAvatar };
