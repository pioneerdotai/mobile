import * as ImagePicker from 'expo-image-picker';

import type { AuthProfileUpdateParams } from '@/client';

const AVATAR_MAX_BYTES = 256 * 1024;
const AVATAR_MAX_DIMENSION = 1024;

type ProfileAvatarInput = Extract<
    NonNullable<AuthProfileUpdateParams['avatar']>,
    { action: 'set' }
>['avatar'];

export type SelectedProfileAvatar = {
    input: ProfileAvatarInput;
    uri: string;
    fileName: string | null;
};

export class ProfileAvatarSelectionError extends Error {
    constructor() {
        super('invalid_profile_avatar');
        this.name = 'ProfileAvatarSelectionError';
    }
}

const encodedByteLength = (base64: string): number =>
    Math.floor((base64.length * 3) / 4) -
    (base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0);

export const selectProfileAvatar = async (): Promise<SelectedProfileAvatar | null> => {
    const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: false,
        base64: true,
        quality: 0.85,
        exif: false,
    });
    const asset = result.canceled ? null : result.assets?.[0];
    if (!asset) return null;

    const mediaType: ProfileAvatarInput['media_type'] | null =
        asset.mimeType === 'image/png'
            ? 'image/png'
            : asset.mimeType === 'image/webp'
              ? 'image/webp'
              : asset.mimeType === 'image/jpeg'
                ? 'image/jpeg'
                : null;

    if (
        !asset.base64 ||
        !mediaType ||
        asset.width > AVATAR_MAX_DIMENSION ||
        asset.height > AVATAR_MAX_DIMENSION ||
        encodedByteLength(asset.base64) > AVATAR_MAX_BYTES
    ) {
        throw new ProfileAvatarSelectionError();
    }

    return {
        input: { media_type: mediaType, content_base64: asset.base64 },
        uri: asset.uri,
        fileName: asset.fileName ?? null,
    };
};
