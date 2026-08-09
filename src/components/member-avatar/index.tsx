import { useEffect, useMemo, useState } from 'react';
import { Image } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Box } from '@/components/primitives/box';
import { Text } from '@/components/primitives/text';
import { stableOutlineWidth } from '@/helpers/styles';
import { resolveMemberAvatar } from '@/services/members/resolve-avatar';

import { avatarFallbackAppearance } from './avatar-appearance';

type MemberAvatarProps = {
    displayName: string;
    size: number;
    imageUri?: string | null;
    principalId?: string | null;
    avatarRevision?: string | null;
    fallbackBackgroundColor?: string;
    borderColor?: string;
    borderWidth?: number;
};

const MemberAvatar = ({
    displayName,
    size,
    imageUri,
    principalId,
    avatarRevision,
    fallbackBackgroundColor,
    borderColor,
    borderWidth = borderColor ? stableOutlineWidth : 0,
}: MemberAvatarProps) => {
    const normalizedRevision = avatarRevision?.trim() || null;
    const avatarKey =
        principalId && normalizedRevision ? `${principalId}:${normalizedRevision}` : null;
    const [resolvedAvatar, setResolvedAvatar] = useState<{
        key: string;
        uri: string | null;
    } | null>(null);
    const fallbackAppearance = useMemo(() => avatarFallbackAppearance(displayName), [displayName]);

    useEffect(() => {
        let cancelled = false;
        if (imageUri !== undefined || !avatarKey || !principalId || !normalizedRevision) {
            return;
        }

        void resolveMemberAvatar(principalId, normalizedRevision)
            .then((uri) => {
                if (!cancelled) {
                    setResolvedAvatar({ key: avatarKey, uri });
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setResolvedAvatar({ key: avatarKey, uri: null });
                }
            });

        return () => {
            cancelled = true;
        };
    }, [avatarKey, imageUri, normalizedRevision, principalId]);

    const resolvedUri =
        imageUri !== undefined
            ? imageUri
            : resolvedAvatar?.key === avatarKey
              ? resolvedAvatar.uri
              : null;

    if (resolvedUri) {
        return (
            <Image
                accessible={false}
                source={{ uri: resolvedUri }}
                style={styles.avatar(size, borderColor, borderWidth)}
            />
        );
    }

    return (
        <Box
            accessible={false}
            style={styles.fallback(
                size,
                fallbackBackgroundColor ?? fallbackAppearance.backgroundColor,
                borderColor,
                borderWidth,
            )}
        >
            <Text style={styles.initials(size, fallbackAppearance.textColor)}>
                {fallbackAppearance.initials}
            </Text>
        </Box>
    );
};

const styles = StyleSheet.create((theme) => ({
    avatar: (size: number, borderColor?: string, borderWidth = 0) => ({
        width: size,
        height: size,
        borderRadius: size / 2,
        borderColor,
        borderWidth,
    }),
    fallback: (size: number, backgroundColor: string, borderColor?: string, borderWidth = 0) => ({
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor,
        borderColor,
        borderWidth,
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
