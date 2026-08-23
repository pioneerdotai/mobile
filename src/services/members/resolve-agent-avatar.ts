import { pioneerClient } from '@/client';

import { cachedAvatarPathToUri } from './resolve-avatar';

export type ResolvedAgentAvatar = {
    avatarRevision: string;
    uri: string;
};

export const AGENT_AVATAR_REVISIONS = {
    pioneer: 'af2381c7a1e995929e5d1535db5753c97859e393d21e7c660cea5a5b1fbb3f2f',
    codex: 'e43667b51ae7671a502ee4265e59e90ae2878558b3502521331500192a7807b8',
    claude: '84646b62063741db93e9f1bd8fd80520f8439d41a3e2e8c6a08b83469f8f16ff',
} as const;

export type AgentAvatarKind = keyof typeof AGENT_AVATAR_REVISIONS;

const resolveAgentAvatarRepresentation = async (
    avatarRevision: string = AGENT_AVATAR_REVISIONS.pioneer,
): Promise<ResolvedAgentAvatar | null> => {
    const result = await pioneerClient.agentAvatarCache({ avatar_revision: avatarRevision });
    if (
        !/^[a-f0-9]{64}$/u.test(result.avatar_revision) ||
        result.avatar_revision !== avatarRevision
    ) {
        return null;
    }
    const uri = cachedAvatarPathToUri(result.cached_image_path);
    return uri ? { avatarRevision: result.avatar_revision, uri } : null;
};

const resolveAgentAvatar = async (
    avatarRevision: string = AGENT_AVATAR_REVISIONS.pioneer,
): Promise<string | null> => (await resolveAgentAvatarRepresentation(avatarRevision))?.uri ?? null;

export { resolveAgentAvatar, resolveAgentAvatarRepresentation };
