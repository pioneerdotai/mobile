import { describe, expect, jest, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { MemberSummary } from '@/client/generated/member_summary';
import type { ClientMemberAvatarCacheResult } from '@/client/native';

import { MobileMemberAvatarController, type MemberAvatarNativePort } from './avatar-cache';

const PRINCIPAL = 'P0000000000000000000A';

function member(revision: string | null): MemberSummary {
    return {
        principal_id: PRINCIPAL,
        kind: 'user',
        display_name: 'Member',
        nickname: 'member',
        role_key: 'member',
        status: 'active',
        ...(revision ? { avatar_revision: revision } : {}),
    };
}

function result(revision: string, source: ClientMemberAvatarCacheResult['source'] = 'downloaded') {
    return {
        cached_image_path: '/owned/cache/avatar',
        principal_id: PRINCIPAL,
        avatar_revision: revision,
        media_type: 'image/png',
        source,
    } satisfies ClientMemberAvatarCacheResult;
}

describe('MobileMemberAvatarController', () => {
    test('deduplicates native fetches and exposes only a local file URI', async () => {
        const revision = 'a'.repeat(64);
        let resolveNative!: (value: ClientMemberAvatarCacheResult) => void;
        const memberAvatarCache = jest.fn(
            () =>
                new Promise<ClientMemberAvatarCacheResult>((resolve) => {
                    resolveNative = resolve;
                }),
        );
        const controller = new MobileMemberAvatarController({ memberAvatarCache });
        controller.reconcileVisibleMembers([member(revision)]);
        const first = controller.resolveVisibleMember(PRINCIPAL);
        const duplicate = controller.resolveVisibleMember(PRINCIPAL);
        expect(memberAvatarCache).toHaveBeenCalledTimes(1);
        resolveNative(result(revision));
        await Promise.all([first, duplicate]);
        expect(controller.presentation(PRINCIPAL)).toEqual({
            principalId: PRINCIPAL,
            avatarRevision: revision,
            imageUri: 'file:///owned/cache/avatar',
            mediaType: 'image/png',
            status: 'ready',
        });
    });

    test('revision and visibility changes invalidate stale native completion', async () => {
        const oldRevision = 'a'.repeat(64);
        const nextRevision = 'b'.repeat(64);
        let resolveNative!: (value: ClientMemberAvatarCacheResult) => void;
        const native: MemberAvatarNativePort = {
            memberAvatarCache: () =>
                new Promise((resolve) => {
                    resolveNative = resolve;
                }),
        };
        const controller = new MobileMemberAvatarController(native);
        controller.reconcileVisibleMembers([member(oldRevision)]);
        const pending = controller.resolveVisibleMember(PRINCIPAL);
        controller.reconcileVisibleMembers([member(nextRevision)]);
        resolveNative(result(oldRevision));
        await pending;
        expect(controller.presentation(PRINCIPAL)?.imageUri).toBeNull();
        expect(controller.presentation(PRINCIPAL)?.avatarRevision).toBe(nextRevision);

        controller.reconcileVisibleMembers([]);
        expect(controller.presentation(PRINCIPAL)).toBeUndefined();
    });

    test('background, missing, offline and failure states remain secret-free placeholders', async () => {
        const revision = 'a'.repeat(64);
        const memberAvatarCache = jest
            .fn<() => Promise<ClientMemberAvatarCacheResult>>()
            .mockResolvedValueOnce(result(revision, 'offline_cache'))
            .mockRejectedValueOnce(new Error('hidden'));
        const controller = new MobileMemberAvatarController({ memberAvatarCache });
        controller.reconcileVisibleMembers([member(revision)]);
        controller.setBackgrounded(true);
        await controller.resolveVisibleMember(PRINCIPAL);
        expect(memberAvatarCache).not.toHaveBeenCalled();

        controller.setBackgrounded(false);
        await controller.resolveVisibleMember(PRINCIPAL);
        expect(controller.presentation(PRINCIPAL)?.status).toBe('offline');
        await controller.resolveVisibleMember(PRINCIPAL);
        expect(controller.presentation(PRINCIPAL)).toMatchObject({
            imageUri: null,
            mediaType: null,
            status: 'placeholder',
        });

        controller.reconcileVisibleMembers([member(null)]);
        await controller.resolveVisibleMember(PRINCIPAL);
        expect(controller.presentation(PRINCIPAL)?.status).toBe('placeholder');
    });

    test('source contains no JS credential, header or base64 fallback', () => {
        const source = readFileSync(join(__dirname, 'avatar-cache.ts'), 'utf8');
        for (const forbidden of [
            ['access', '_token'].join(''),
            ['Author', 'ization'].join(''),
            ['content', '_base64'].join(''),
            ['data', ':image'].join(''),
            ['memberAvatar', 'Get'].join(''),
        ]) {
            expect(source).not.toContain(forbidden);
        }
    });
});
