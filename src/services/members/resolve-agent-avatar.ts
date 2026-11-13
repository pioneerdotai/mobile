import { pioneerClient } from '@/client';

import { cachedAvatarPathToUri } from './resolve-avatar';

export type ResolvedAgentAvatar = {
    avatarRevision: string;
    uri: string;
};

export const OPENCODE_AGENT_AVATAR_REVISIONS = {
    light: 'bffac789518813b5862f9d0f4c239c4fdb6dd8c4027911a1d9e0c82211aa06a1',
    dark: '6fbba60dcebe87c2e0f6ff0e3634fdb918c892e9c989f0d72cff6bb806f3ef4b',
} as const;

export const AGENT_AVATAR_REVISIONS = {
    pioneer: 'af2381c7a1e995929e5d1535db5753c97859e393d21e7c660cea5a5b1fbb3f2f',
    codex: '02112fc2b69eaccf74ee92f614450f9f82ca7f7d38326660f56748e410080dea',
    claude: '84646b62063741db93e9f1bd8fd80520f8439d41a3e2e8c6a08b83469f8f16ff',
    opencode: OPENCODE_AGENT_AVATAR_REVISIONS.light,
} as const;

export type AgentAvatarKind = keyof typeof AGENT_AVATAR_REVISIONS;

export const agentAvatarRevisionForTheme = (kind: AgentAvatarKind, dark: boolean): string =>
    kind === 'opencode'
        ? OPENCODE_AGENT_AVATAR_REVISIONS[dark ? 'dark' : 'light']
        : AGENT_AVATAR_REVISIONS[kind];

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
