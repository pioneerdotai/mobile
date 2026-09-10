import { useNavigation } from 'expo-router';
import { useCallback, useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { dispatchProfile, useProfileEditor } from '@/client/settings';
import { HeaderCheckButton } from '@/components/buttons/header-action';
import { ProfileUsernameEditor } from '@/components/forms/profile-editor';
const UsernameSettingsScreen = () => {
    const { t } = useTranslation('settings');
    const navigation = useNavigation();
    const profile = useProfileEditor('username');
    const profileOwner = profile?.owner_generation;
    const nickname = profile?.nickname ?? '';
    const normalized = nickname.trim();
    const valid = profile?.valid ?? false;
    const dirty = profile?.dirty ?? false;
    const isSaving = profile?.pending ?? false;
    const error = profile?.error
        ? t(
              profile.error === 'nickname_unavailable'
                  ? 'profile.errors.usernameUnavailable'
                  : profile.error === 'invalid_profile'
                    ? 'profile.errors.username'
                    : 'profile.errors.save',
          )
        : null;
    const save = useCallback(() => {
        if (profileOwner !== undefined)
            dispatchProfile({
                kind: 'save_for_owner',
                expected_owner: profileOwner,
                section: 'username',
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

    return (
        <ProfileUsernameEditor
            value={nickname}
            label={t('profile.username')}
            hint={t('profile.usernameHint')}
            rules={t('profile.usernameRules')}
            preview={valid ? t('profile.usernamePreview', { username: normalized }) : null}
            error={error}
            onChangeText={(value) => {
                if (profile)
                    dispatchProfile({
                        kind: 'edit_field',
                        expected_owner: profile.owner_generation,
                        field: 'nickname',
                        value,
                    });
            }}
            onSubmitEditing={save}
        />
    );
};

export default UsernameSettingsScreen;
