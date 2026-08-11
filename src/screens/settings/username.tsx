import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useNavigation } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { PioneerClientNativeError } from '@/client';
import { HeaderCheckButton } from '@/components/buttons/header-action';
import { ProfileUsernameEditor } from '@/components/forms/profile-editor';
import { useAdministrationPrincipal } from '@/hooks/use-administration-capabilities';
import {
    applyCurrentProfileUpdate,
    isValidProfileNickname,
    updateCurrentProfile,
} from '@/services/profile/update';

const UsernameSettingsScreen = () => {
    const { t } = useTranslation('settings');
    const navigation = useNavigation();
    const queryClient = useQueryClient();
    const principalQuery = useAdministrationPrincipal();
    const principal = principalQuery.data?.principal;
    const initializedPrincipal = useRef<string | null>(null);
    const [nickname, setNickname] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!principal || initializedPrincipal.current === principal.id) return;
        initializedPrincipal.current = principal.id;
        setNickname(principal.nickname);
        setError(null);
    }, [principal]);

    const normalized = nickname.trim();
    const valid = isValidProfileNickname(normalized);
    const dirty = Boolean(principal && normalized !== principal.nickname);

    const { mutate: saveProfile, isPending: isSaving } = useMutation({
        mutationFn: updateCurrentProfile,
        onSuccess: async (response) => {
            await applyCurrentProfileUpdate(queryClient, response);
            router.back();
        },
        onError: (failure) => {
            if (
                failure instanceof PioneerClientNativeError &&
                failure.code === 'nickname_unavailable'
            ) {
                setError(t('profile.errors.usernameUnavailable'));
                return;
            }
            if (failure instanceof PioneerClientNativeError && failure.code === 'invalid_profile') {
                setError(t('profile.errors.username'));
                return;
            }
            setError(t('profile.errors.save'));
        },
    });

    const save = useCallback(() => {
        if (!principal || !dirty || !valid || isSaving) return;
        setError(null);
        saveProfile({
            display_name: principal.display_name,
            nickname: normalized,
            avatar: { action: 'unchanged' },
        });
    }, [dirty, isSaving, normalized, principal, saveProfile, valid]);

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
                setNickname(value);
                setError(null);
            }}
            onSubmitEditing={save}
        />
    );
};

export default UsernameSettingsScreen;
