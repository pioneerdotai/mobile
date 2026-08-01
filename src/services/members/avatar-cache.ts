import type {
    ClientMemberAvatarCacheRequest,
    ClientMemberAvatarCacheResult,
} from '@/client/native';
import type { MemberSummary } from '@/client/generated/member_summary';

export type MobileMemberAvatarStatus = 'placeholder' | 'loading' | 'ready' | 'offline';

export interface MobileMemberAvatarPresentation {
    principalId: string;
    avatarRevision: string | null;
    imageUri: string | null;
    mediaType: 'image/png' | 'image/jpeg' | 'image/webp' | null;
    status: MobileMemberAvatarStatus;
}

export interface MemberAvatarNativePort {
    memberAvatarCache(
        request: ClientMemberAvatarCacheRequest,
    ): Promise<ClientMemberAvatarCacheResult>;
}

export class MobileMemberAvatarController {
    private readonly visible = new Map<string, MobileMemberAvatarPresentation>();
    private readonly inFlight = new Map<string, Promise<void>>();
    private backgrounded = false;

    constructor(private readonly native: MemberAvatarNativePort) {}

    reconcileVisibleMembers(members: readonly MemberSummary[]): void {
        const visibleIds = new Set(members.map((member) => member.principal_id));
        for (const principalId of this.visible.keys()) {
            if (!visibleIds.has(principalId)) {
                this.visible.delete(principalId);
            }
        }
        for (const member of members) {
            const revision = member.avatar_revision ?? null;
            const current = this.visible.get(member.principal_id);
            if (revision === null) {
                this.visible.set(member.principal_id, placeholder(member.principal_id));
                continue;
            }
            if (current?.avatarRevision === revision) {
                continue;
            }
            this.visible.set(member.principal_id, {
                principalId: member.principal_id,
                avatarRevision: revision,
                imageUri: null,
                mediaType: null,
                status: 'loading',
            });
        }
    }

    async resolveVisibleMember(principalId: string): Promise<void> {
        const presentation = this.visible.get(principalId);
        if (this.backgrounded || !presentation?.avatarRevision) {
            return;
        }
        const revision = presentation.avatarRevision;
        const key = `${principalId}:${revision}`;
        const existing = this.inFlight.get(key);
        if (existing) {
            return existing;
        }
        if (!presentation.imageUri) {
            presentation.status = 'loading';
        }
        const operation = this.resolve(key, principalId, revision);
        this.inFlight.set(key, operation);
        try {
            await operation;
        } finally {
            this.inFlight.delete(key);
        }
    }

    setBackgrounded(backgrounded: boolean): void {
        this.backgrounded = backgrounded;
    }

    presentation(principalId: string): MobileMemberAvatarPresentation | undefined {
        const value = this.visible.get(principalId);
        return value ? { ...value } : undefined;
    }

    private async resolve(key: string, principalId: string, revision: string): Promise<void> {
        try {
            const result = await this.native.memberAvatarCache({
                principal_id: principalId,
                avatar_revision: revision,
            });
            const current = this.visible.get(principalId);
            if (
                !current ||
                current.avatarRevision !== revision ||
                `${principalId}:${revision}` !== key
            ) {
                return;
            }
            current.imageUri = localFileUrl(result.cached_image_path);
            current.mediaType = result.media_type;
            current.status = result.source === 'offline_cache' ? 'offline' : 'ready';
        } catch {
            const current = this.visible.get(principalId);
            if (!current || current.avatarRevision !== revision) {
                return;
            }
            current.imageUri = null;
            current.mediaType = null;
            current.status = 'placeholder';
        }
    }
}

function placeholder(principalId: string): MobileMemberAvatarPresentation {
    return {
        principalId,
        avatarRevision: null,
        imageUri: null,
        mediaType: null,
        status: 'placeholder',
    };
}

function localFileUrl(path: string): string {
    const trimmed = path.trim();
    if (!trimmed || /[\r\n]/u.test(trimmed)) {
        throw new Error('invalid native avatar cache path');
    }
    if (trimmed.startsWith('file://')) {
        return trimmed;
    }
    return `file://${encodeURI(trimmed)}`;
}
