import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useNavigation } from 'expo-router';
import { ChevronRight, ImagePlus, Trash2 } from 'lucide-react-native';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { PioneerClientNativeError, type AuthProfileUpdateParams } from '@/client';
import { HeaderCheckButton } from '@/components/buttons/header-action';
import { MemberAvatar } from '@/components/member-avatar';
import { MenuItem } from '@/components/overlays/actions/menu-item';
import { ActionsSheet } from '@/components/overlays/actions';
import { Box } from '@/components/primitives/box';
import { Input } from '@/components/primitives/input';
import { Pressable } from '@/components/primitives/pressable';
import { ScrollView } from '@/components/primitives/scrollview';
import { Text } from '@/components/primitives/text';
import { VStack } from '@/components/primitives/vstack';
import { useAdministrationPrincipal } from '@/hooks/use-administration-capabilities';
import {
    ProfileAvatarSelectionError,
    selectProfileAvatar,
    type SelectedProfileAvatar,
} from '@/services/profile/avatar';
import {
    applyCurrentProfileUpdate,
    joinProfileDisplayName,
    splitProfileDisplayName,
    updateCurrentProfile,
} from '@/services/profile/update';

type AvatarEdit =
    { kind: 'unchanged' } | { kind: 'remove' } | { kind: 'set'; selected: SelectedProfileAvatar };

const ProfileSettingsScreen = () => {
    const { t } = useTranslation('settings');
    const { theme } = useUnistyles();
    const navigation = useNavigation();
    const queryClient = useQueryClient();
    const principalQuery = useAdministrationPrincipal();
    const principal = principalQuery.data?.principal;
    const initializedPrincipal = useRef<string | null>(null);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [avatarEdit, setAvatarEdit] = useState<AvatarEdit>({ kind: 'unchanged' });
    const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!principal || initializedPrincipal.current === principal.id) return;
        initializedPrincipal.current = principal.id;
        const parts = splitProfileDisplayName(principal.display_name);
        setFirstName(parts.firstName);
        setLastName(parts.lastName);
        setAvatarEdit({ kind: 'unchanged' });
        setError(null);
    }, [principal]);

    const displayName = useMemo(
        () => joinProfileDisplayName(firstName, lastName),
        [firstName, lastName],
    );
    const dirty = Boolean(
        principal && (displayName !== principal.display_name || avatarEdit.kind !== 'unchanged'),
    );
    const valid = displayName.length > 0 && [...displayName].length <= 128;

    const { mutate: saveProfile, isPending: isSaving } = useMutation({
        mutationFn: updateCurrentProfile,
        onSuccess: async (response) => {
            await applyCurrentProfileUpdate(queryClient, response);
            router.back();
        },
        onError: (failure) => {
            if (failure instanceof PioneerClientNativeError) {
                if (failure.code === 'avatar_invalid') {
                    setError(t('profile.errors.avatar'));
                    return;
                }
                if (failure.code === 'invalid_profile') {
                    setError(t('profile.errors.name'));
                    return;
                }
            }
            setError(t('profile.errors.save'));
        },
    });

    const save = useCallback(() => {
        if (!principal || !dirty || !valid || isSaving) return;
        setError(null);
        const avatar: AuthProfileUpdateParams['avatar'] =
            avatarEdit.kind === 'set'
                ? { action: 'set', avatar: avatarEdit.selected.input }
                : avatarEdit.kind === 'remove'
                  ? { action: 'remove' }
                  : { action: 'unchanged' };
        saveProfile({
            display_name: displayName,
            nickname: principal.nickname,
            avatar,
        });
    }, [avatarEdit, dirty, displayName, isSaving, principal, saveProfile, valid]);

    useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <HeaderCheckButton
                    accessibilityLabel={t('profile.done')}
                    disabled={!dirty || !valid}
                    loading={isSaving}
                    onPress={save}
                />
            ),
        });
    }, [dirty, isSaving, navigation, save, t, valid]);

    const choosePhoto = useCallback(async () => {
        setAvatarMenuOpen(false);
        setError(null);
        try {
            const selected = await selectProfileAvatar();
            if (selected) setAvatarEdit({ kind: 'set', selected });
        } catch (failure) {
            setError(
                failure instanceof ProfileAvatarSelectionError
                    ? t('profile.errors.avatar')
                    : t('profile.errors.photoPicker'),
            );
        }
    }, [t]);

    const removePhoto = useCallback(() => {
        setAvatarMenuOpen(false);
        setError(null);
        setAvatarEdit(principal?.avatar_revision ? { kind: 'remove' } : { kind: 'unchanged' });
    }, [principal?.avatar_revision]);

    const previewUri =
        avatarEdit.kind === 'set'
            ? avatarEdit.selected.uri
            : avatarEdit.kind === 'remove'
              ? null
              : undefined;
    const hasPhoto =
        avatarEdit.kind === 'set' ||
        (avatarEdit.kind === 'unchanged' && Boolean(principal?.avatar_revision));

    return (
        <>
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
            >
                {principal ? (
                    <>
                        <VStack style={styles.avatarSection}>
                            <MemberAvatar
                                displayName={displayName || principal.display_name}
                                size={theme.space(24)}
                                imageUri={previewUri}
                                principalId={principal.id}
                                avatarRevision={principal.avatar_revision}
                            />
                            <Pressable
                                accessibilityRole="button"
                                onPress={() => setAvatarMenuOpen(true)}
                            >
                                <Text fontWeight="medium" style={styles.photoAction}>
                                    {t('profile.changePhoto')}
                                </Text>
                            </Pressable>
                            <VStack style={styles.nameCardContainer}>
                                <VStack style={styles.nameCard}>
                                    <Input
                                        value={firstName}
                                        placeholder={t('profile.firstName')}
                                        autoCapitalize="words"
                                        autoCorrect={false}
                                        maxLength={128}
                                        returnKeyType="next"
                                        style={styles.nameInput}
                                        onChangeText={setFirstName}
                                    />
                                    <Box style={styles.divider} />
                                    <Input
                                        value={lastName}
                                        placeholder={t('profile.lastName')}
                                        autoCapitalize="words"
                                        autoCorrect={false}
                                        maxLength={128}
                                        returnKeyType="done"
                                        style={styles.nameInput}
                                        onChangeText={setLastName}
                                    />
                                </VStack>
                                <Text style={styles.hint}>{t('profile.nameHint')}</Text>
                            </VStack>
                        </VStack>

                        <Pressable
                            accessibilityRole="button"
                            onPress={() => router.navigate({ pathname: '/settings/username' })}
                        >
                            <Box style={styles.usernameCard}>
                                <Text style={styles.usernameLabel}>{t('profile.username')}</Text>
                                <Box style={styles.usernameValue}>
                                    <Text style={styles.secondary}>@{principal.nickname}</Text>
                                    <ChevronRight
                                        size={theme.space(5)}
                                        opacity={0.6}
                                        color={theme.colors.typography}
                                    />
                                </Box>
                            </Box>
                        </Pressable>

                        {error ? (
                            <Text accessibilityRole="alert" style={styles.error}>
                                {error}
                            </Text>
                        ) : null}
                    </>
                ) : null}
            </ScrollView>

            <ActionsSheet open={avatarMenuOpen} onClose={() => setAvatarMenuOpen(false)}>
                <VStack>
                    <MenuItem
                        Icon={ImagePlus}
                        title={t('profile.choosePhoto')}
                        last={!hasPhoto}
                        onPress={() => void choosePhoto()}
                    />
                    {hasPhoto ? (
                        <MenuItem
                            Icon={Trash2}
                            title={t('profile.removePhoto')}
                            variant="destructive"
                            last
                            onPress={removePhoto}
                        />
                    ) : null}
                </VStack>
            </ActionsSheet>
        </>
    );
};

const styles = StyleSheet.create((theme, rt) => ({
    container: {
        flex: 1,
        paddingLeft: rt.insets.left + theme.space(4),
        paddingRight: rt.insets.right + theme.space(4),
    },
    usernameLabel: {
        opacity: 1,
    },
    usernameValue: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.space(2),
    },
    content: {
        ...theme.screenContentPadding('child'),
        gap: theme.space(6),
    },
    avatarSection: {
        alignItems: 'center',
        gap: theme.space(2),
    },
    photoAction: { color: theme.colors.blue['500'], paddingBottom: theme.space(1) },
    nameCardContainer: {
        width: '100%',
        gap: theme.space(2),
    },
    nameCard: {
        paddingHorizontal: theme.space(5),
        paddingVertical: theme.space(3),
        borderRadius: theme.radius['4xl'],
        backgroundColor: theme.colors.muted,
    },
    nameInput: {
        paddingVertical: theme.space(3),
        color: theme.colors.typography,
        fontSize: theme.fontSize.default.fontSize,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: theme.colors.border,
    },
    hint: {
        paddingLeft: theme.space(5),
        opacity: 0.6,
        fontSize: theme.fontSize.xs.fontSize,
        lineHeight: theme.fontSize.xs.lineHeight,
    },
    usernameCard: {
        padding: theme.space(5),
        borderRadius: theme.radius['4xl'],
        backgroundColor: theme.colors.muted,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme.space(3),
    },
    secondary: { opacity: 0.6 },
    error: {
        textAlign: 'center',
        color: theme.colors.dangerText,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
    },
}));

export default ProfileSettingsScreen;
