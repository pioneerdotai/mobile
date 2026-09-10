import { router, useNavigation } from 'expo-router';
import { ImagePlus, Trash2 } from 'lucide-react-native';
import { useCallback, useLayoutEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native-unistyles';

import { dispatchProfile, useProfileEditor } from '@/client/settings';
import { HeaderCheckButton } from '@/components/buttons/header-action';
import {
    ProfileAvatarField,
    ProfileIdentityGroup,
    ProfileNameFields,
    ProfileUsernameField,
} from '@/components/forms/profile-editor';
import { MenuItem } from '@/components/overlays/actions/menu-item';
import { ActionsSheet } from '@/components/overlays/actions';
import { ScrollView } from '@/components/primitives/scrollview';
import { Text } from '@/components/primitives/text';
import { VStack } from '@/components/primitives/vstack';
import { useAdministrationPrincipal } from '@/hooks/use-administration-capabilities';
import { ProfileAvatarSelectionError, selectProfileAvatar } from '@/services/profile/avatar';
const ProfileSettingsScreen = () => {
    const { t } = useTranslation('settings');
    const navigation = useNavigation();
    const principalQuery = useAdministrationPrincipal();
    const principal = principalQuery.data?.principal;
    const profile = useProfileEditor('profile');
    const profileOwner = profile?.owner_generation;
    const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
    const firstName = profile?.first_name ?? '';
    const lastName = profile?.last_name ?? '';
    const avatarEdit = profile?.avatar ?? { kind: 'unchanged' as const };
    const displayName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');
    const dirty = profile?.dirty ?? false;
    const valid = profile?.valid ?? false;
    const isSaving = profile?.pending ?? false;
    const error = profile?.error
        ? t(
              profile.error === 'avatar_invalid'
                  ? 'profile.errors.avatar'
                  : profile.error === 'invalid_profile'
                    ? 'profile.errors.name'
                    : profile.error === 'photo_picker_failed'
                      ? 'profile.errors.photoPicker'
                      : 'profile.errors.save',
          )
        : null;
    const setFirstName = (value: string) => {
        if (profile)
            dispatchProfile({
                kind: 'edit_field',
                expected_owner: profile.owner_generation,
                field: 'first_name',
                value,
            });
    };
    const setLastName = (value: string) => {
        if (profile)
            dispatchProfile({
                kind: 'edit_field',
                expected_owner: profile.owner_generation,
                field: 'last_name',
                value,
            });
    };
    const save = useCallback(() => {
        if (profileOwner !== undefined)
            dispatchProfile({
                kind: 'save_for_owner',
                expected_owner: profileOwner,
                section: 'profile',
            });
    }, [profileOwner]);

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
        const expected_owner = profileOwner;
        if (expected_owner === undefined) return;
        try {
            const selected = await selectProfileAvatar();
            if (selected)
                dispatchProfile({
                    kind: 'select_avatar',
                    expected_owner,
                    preview: selected.uri,
                    avatar: selected.input,
                });
        } catch (failure) {
            dispatchProfile({
                kind: 'selection_failed',
                expected_owner,
                error:
                    failure instanceof ProfileAvatarSelectionError
                        ? 'avatar_invalid'
                        : 'photo_picker_failed',
            });
        }
    }, [profileOwner]);
    const removePhoto = useCallback(() => {
        setAvatarMenuOpen(false);
        if (profileOwner !== undefined)
            dispatchProfile({
                kind: 'remove_avatar_for_owner',
                expected_owner: profileOwner,
            });
    }, [profileOwner]);
    const previewUri =
        avatarEdit.kind === 'selected'
            ? avatarEdit.preview
            : avatarEdit.kind === 'remove'
              ? null
              : undefined;
    const hasPhoto =
        avatarEdit.kind === 'selected' ||
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
                        <ProfileIdentityGroup>
                            <ProfileAvatarField
                                displayName={displayName || principal.display_name}
                                imageUri={previewUri}
                                principalId={principal.id}
                                avatarRevision={principal.avatar_revision}
                                actionLabel={t('profile.changePhoto')}
                                onPress={() => setAvatarMenuOpen(true)}
                            />
                            <ProfileNameFields
                                firstName={firstName}
                                lastName={lastName}
                                firstNamePlaceholder={t('profile.firstName')}
                                lastNamePlaceholder={t('profile.lastName')}
                                hint={t('profile.nameHint')}
                                onFirstNameChange={setFirstName}
                                onLastNameChange={setLastName}
                            />
                        </ProfileIdentityGroup>
                        <ProfileUsernameField
                            label={t('profile.username')}
                            value={principal.nickname}
                            onPress={() => router.navigate({ pathname: '/settings/username' })}
                        />

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
    content: {
        ...theme.screenContentPadding('child'),
        gap: theme.space(6),
    },
    error: {
        textAlign: 'center',
        color: theme.colors.dangerText,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
    },
}));

export default ProfileSettingsScreen;
