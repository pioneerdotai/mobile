import { router, useNavigation } from 'expo-router';
import { useCallback, useLayoutEffect, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { HeaderCheckButton } from '@/components/buttons/header-action';
import { ProfileUsernameEditor } from '@/components/forms/profile-editor';
import { dispatchInvitation, useInvitation } from '@/client/onboarding';

const InvitationUsernameScreen = () => {
    const { t } = useTranslation('settings');
    const navigation = useNavigation();
    const value = useInvitation();
    const owner = useRef(value?.owner_generation);
    const normalized = value?.nickname.trim() ?? '';
    const valid = value?.nickname_valid ?? false;
    const dirty = value?.username_editing ?? false;
    const draft = value?.nickname ?? '';
    const error = value?.nickname_error ? t('profile.errors.username') : null;
    useEffect(
        () => () => {
            if (owner.current !== undefined)
                dispatchInvitation({
                    kind: 'cancel_username_for_owner',
                    expected_owner: owner.current,
                });
        },
        [],
    );
    const save = useCallback(() => {
        if (
            !valid ||
            !dirty ||
            value?.owner_generation !== owner.current ||
            owner.current === undefined
        )
            return;
        dispatchInvitation({ kind: 'accept_username_for_owner', expected_owner: owner.current });
        router.back();
    }, [dirty, valid, value?.owner_generation]);

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
            onChangeText={(text) => {
                if (owner.current !== undefined && value?.owner_generation === owner.current)
                    dispatchInvitation({
                        kind: 'edit_field',
                        expected_owner: owner.current,
                        field: 'nickname',
                        value: text,
                    });
            }}
            onSubmitEditing={save}
        />
    );
};

export default InvitationUsernameScreen;
