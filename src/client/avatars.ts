import { useEffect, useSyncExternalStore } from 'react';
import { mobileClientBinding } from './mobile-client-binding';
import type { IdentityAuthorizationPublication } from './generated/identity_authorization_publication';
import type { AvatarPublication } from './generated/avatar_publication';
import { resolveMemberAvatar } from '@/services/members/resolve-avatar';
import { resolveAgentAvatarRepresentation } from '@/services/members/resolve-agent-avatar';
import { cachedAvatarPathToUri } from '@/services/members/resolve-avatar';

/** Native decoding belongs to the mounted Image; Client owns authenticated paths. */
export const useAuthenticatedAvatar = (
    principalId: string | null,
    revision: string | null,
    agent = false,
) => {
    const identityStore = mobileClientBinding.scope({ kind: 'administration', workspace_id: null });
    const identityInput = useSyncExternalStore(
        identityStore.subscribe,
        identityStore.getSnapshot,
        identityStore.getSnapshot,
    );
    const identity = identityInput?.payload as IdentityAuthorizationPublication | null;
    const sessionGeneration = identity?.connection_generation;
    const authorizationGeneration = identity?.authorization_change_sequence;
    const authenticated = identity?.current_auth != null;
    const key = principalId && revision ? `${principalId}:${revision}` : null;
    const scope = key
        ? ({ kind: 'avatar', principal_id: key } as const)
        : ({ kind: 'navigation' } as const);
    const store = mobileClientBinding.scope(scope);
    const publication = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
    const avatar = key ? (publication?.payload as AvatarPublication | null) : null;
    useEffect(() => {
        if (!authenticated || !principalId || !revision || !key) return;
        const request = agent
            ? resolveAgentAvatarRepresentation(revision)
            : resolveMemberAvatar(principalId, revision);
        void request
            .catch(() => undefined)
            .finally(() => {
                mobileClientBinding.drain({ kind: 'avatar', principal_id: key });
            });
    }, [
        principalId,
        revision,
        key,
        agent,
        authenticated,
        sessionGeneration,
        authorizationGeneration,
    ]);
    if (
        !authenticated ||
        !avatar ||
        avatar.principal_id !== principalId ||
        avatar.avatar_revision !== revision ||
        !avatar.local_path
    )
        return null;
    return cachedAvatarPathToUri(avatar.local_path);
};
