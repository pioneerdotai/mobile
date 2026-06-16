import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import { pioneerClient } from '@/client';
import type { ComposerAttachment, ComposerAttachmentKind } from '@/client';

type PickedAttachmentAsset = {
    uri: string;
    name?: string | null;
    kind?: ComposerAttachmentKind | null;
};

const hasMediaLibraryAccess = (permission: ImagePicker.MediaLibraryPermissionResponse): boolean => {
    return permission.granted || permission.accessPrivileges === 'limited';
};

const attachmentFromPickedAsset = (asset: PickedAttachmentAsset): ComposerAttachment => {
    return pioneerClient.composerAttachmentFromPath({
        path: asset.uri,
        file_name: asset.name ?? null,
        kind: asset.kind ?? null,
    });
};

const attachmentsFromPickedAssets = (assets: PickedAttachmentAsset[]): ComposerAttachment[] => {
    return assets.map(attachmentFromPickedAsset);
};

export const pickComposerFileAttachments = async (): Promise<ComposerAttachment[]> => {
    const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: true,
        copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets) {
        return [];
    }

    return attachmentsFromPickedAssets(
        result.assets.map((asset) => ({
            uri: asset.uri,
            name: asset.name,
            kind: null,
        })),
    );
};

export const pickComposerMediaAttachments = async (): Promise<ComposerAttachment[]> => {
    const current = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (!hasMediaLibraryAccess(current)) {
        const requested = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!hasMediaLibraryAccess(requested)) {
            throw new Error('media-library-permission-required');
        }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsMultipleSelection: true,
        quality: 1,
        exif: false,
    });

    if (result.canceled || !result.assets) {
        return [];
    }

    return attachmentsFromPickedAssets(
        result.assets.map((asset) => ({
            uri: asset.uri,
            name: asset.fileName ?? null,
            kind: asset.type === 'video' ? 'Video' : 'Image',
        })),
    );
};
