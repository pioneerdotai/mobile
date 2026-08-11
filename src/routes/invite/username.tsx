import { router, useNavigation } from 'expo-router';
import { useCallback, useLayoutEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { HeaderCheckButton } from '@/components/buttons/header-action';
import { ProfileUsernameEditor } from '@/components/forms/profile-editor';
import { useInvitationProfile } from '@/screens/invitation/profile-context';
import { isValidProfileNickname } from '@/services/profile/update';

const InvitationUsernameScreen = () => {
    const { t } = useTranslation('settings');
    const navigation = useNavigation();
    const { nickname, nicknameError, setNickname, setNicknameError } = useInvitationProfile();
    const [draft, setDraft] = useState(nickname);
    const [error, setError] = useState<string | null>(nicknameError);
    const normalized = draft.trim();
    const valid = isValidProfileNickname(normalized);
    const dirty = normalized !== nickname;

    const save = useCallback(() => {
        if (!valid || !dirty) return;
        setNickname(normalized);
        setNicknameError(null);
        router.back();
    }, [dirty, normalized, setNickname, setNicknameError, valid]);

    useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <HeaderCheckButton
                    accessibilityLabel={t('profile.done')}
                    disabled={!valid || !dirty}
                    onPress={save}
                />
            ),
        });
    }, [dirty, navigation, save, t, valid]);

    return (
        <ProfileUsernameEditor
            value={draft}
            label={t('profile.username')}
            hint={t('profile.usernameHint')}
            rules={t('profile.usernameRules')}
            preview={valid ? t('profile.usernamePreview', { username: normalized }) : null}
            error={error}
            onChangeText={(value) => {
                setDraft(value);
                setError(null);
            }}
            onSubmitEditing={save}
        />
    );
};

export default InvitationUsernameScreen;
