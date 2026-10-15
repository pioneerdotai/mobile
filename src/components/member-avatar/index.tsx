import { useMemo } from 'react';
import { Image } from 'expo-image';
import { StyleSheet } from 'react-native-unistyles';

import { Box } from '@/components/primitives/box';
import { Text } from '@/components/primitives/text';
import { useAuthenticatedAvatar } from '@/client/avatars';

import { avatarFallbackAppearance } from './avatar-appearance';

type MemberAvatarProps = {
    displayName: string;
    size: number;
    imageUri?: string | null;
    principalId?: string | null;
    avatarRevision?: string | null;
    fallbackBackgroundColor?: string;
};

const MemberAvatar = ({
    displayName,
    size,
    imageUri,
    principalId,
    avatarRevision,
    fallbackBackgroundColor,
}: MemberAvatarProps) => {
    const normalizedRevision = avatarRevision?.trim() || null;
    const authenticatedUri = useAuthenticatedAvatar(
        imageUri === undefined ? (principalId ?? null) : null,
        normalizedRevision,
    );
    const fallbackAppearance = useMemo(() => avatarFallbackAppearance(displayName), [displayName]);
    const resolvedUri = imageUri !== undefined ? imageUri : authenticatedUri;

    if (resolvedUri) {
        return (
            <Image accessible={false} source={{ uri: resolvedUri }} style={styles.avatar(size)} />
        );
    }

    return (
        <Box
            accessible={false}
            style={styles.fallback(
                size,
                fallbackBackgroundColor ?? fallbackAppearance.backgroundColor,
            )}
        >
            <Text style={styles.initials(size, fallbackAppearance.textColor)}>
                {fallbackAppearance.initials}
            </Text>
        </Box>
    );
};

const styles = StyleSheet.create((theme) => ({
    avatar: (size: number) => ({
        width: size,
        height: size,
        borderRadius: size / 2,
    }),
    fallback: (size: number, backgroundColor: string) => ({
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor,
    }),
    initials: (size: number, color: string) => ({
        color,
        fontSize: Math.max(10, Math.round(size * 0.36)),
        lineHeight: Math.max(12, Math.round(size * 0.44)),
        fontWeight: theme.fontWeight.medium.fontWeight,
    }),
}));

export { MemberAvatar };
export type { MemberAvatarProps };
