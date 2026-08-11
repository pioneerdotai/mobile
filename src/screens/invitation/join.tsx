import { router, useNavigation } from 'expo-router';
import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import type { InvitationAcceptParams } from '@/client';
import { BackButton } from '@/components/buttons/back';
import { HeaderCheckButton } from '@/components/buttons/header-action';
import {
    ProfileAvatarField,
    ProfileIdentityGroup,
    ProfileNameFields,
    ProfileUsernameField,
} from '@/components/forms/profile-editor';
import { ScrollView } from '@/components/primitives/scrollview';
import { Text } from '@/components/primitives/text';
import { useInvitationProfile } from '@/screens/invitation/profile-context';
import { MobileInvitationJoinError } from '@/services/gateway/invitation-join';
import {
    ProfileAvatarSelectionError,
    selectProfileAvatar,
    type SelectedProfileAvatar,
} from '@/services/profile/avatar';
import {
    isValidProfileDisplayName,
    isValidProfileNickname,
    joinProfileDisplayName,
} from '@/services/profile/update';

type InvitationJoinScreenProps = {
    error?: string | null;
    onCancel: () => void;
    onSubmit: (profile: InvitationAcceptParams['profile']) => Promise<void>;
};

const InvitationJoinScreen = ({ error = null, onCancel, onSubmit }: InvitationJoinScreenProps) => {
    const { t } = useTranslation('gateway');
    const { t: settingsT } = useTranslation('settings');
    const { theme } = useUnistyles();
    const navigation = useNavigation();
    const { nickname, nicknameError, setNicknameError } = useInvitationProfile();
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [avatar, setAvatar] = useState<SelectedProfileAvatar | null>(null);
    const [nameError, setNameError] = useState<string | null>(null);
    const [avatarError, setAvatarError] = useState<string | null>(null);
    const [submitError, setSubmitError] = useState<string | null>(error);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const displayName = useMemo(
        () => joinProfileDisplayName(firstName, lastName),
        [firstName, lastName],
    );
    const normalizedNickname = nickname.trim();
    const valid =
        isValidProfileDisplayName(displayName) && isValidProfileNickname(normalizedNickname);

    const pickAvatar = useCallback(async () => {
        setAvatarError(null);
        try {
            const selected = await selectProfileAvatar();
            if (!selected) return;
            setAvatar(selected);
        } catch (failure) {
            setAvatarError(
                failure instanceof ProfileAvatarSelectionError
                    ? t('invitation.join.errors.avatar')
                    : settingsT('profile.errors.photoPicker'),
            );
        }
    }, [settingsT, t]);

    const submit = useCallback(async () => {
        if (isSubmitting) return;
        const validName = isValidProfileDisplayName(displayName);
        const validNickname = isValidProfileNickname(normalizedNickname);
        setNameError(validName ? null : t('invitation.join.errors.displayName'));
        setNicknameError(validNickname ? null : t('invitation.join.errors.nickname'));
        setSubmitError(null);
        if (!validName || !validNickname) return;

        setIsSubmitting(true);
        try {
            await onSubmit({
                display_name: displayName,
                nickname: normalizedNickname,
                avatar: avatar?.input ?? null,
            });
        } catch (submitFailure) {
            if (submitFailure instanceof MobileInvitationJoinError) {
                if (submitFailure.code === 'nickname_unavailable') {
                    setNicknameError(t('invitation.join.errors.nicknameUnavailable'));
                    return;
                }
                if (submitFailure.code === 'invalid_profile') {
                    setNameError(t('invitation.join.errors.displayName'));
                    return;
                }
                if (submitFailure.code === 'avatar_invalid') {
                    setAvatarError(t('invitation.join.errors.avatar'));
                    return;
                }
                if (submitFailure.code === 'storage_failed') {
                    setSubmitError(t('invitation.join.errors.storage'));
                    return;
                }
            }
            setSubmitError(t('invitation.join.errors.unavailable'));
        } finally {
            setIsSubmitting(false);
        }
    }, [avatar, displayName, isSubmitting, normalizedNickname, onSubmit, setNicknameError, t]);

    useLayoutEffect(() => {
        navigation.setOptions({
            headerShown: true,
            headerMode: 'screen',
            headerTitle: t('invitation.join.title'),
            headerTransparent: true,
            headerStyle: { backgroundColor: 'transparent' },
            cardStyle: { backgroundColor: theme.colors.background },
            sceneStyle: { backgroundColor: theme.colors.background },
            headerLeft: () => <BackButton onPressHandler={onCancel} />,
            headerRight: () => (
                <HeaderCheckButton
                    accessibilityLabel={t('invitation.join.accept')}
                    disabled={!valid}
                    loading={isSubmitting}
                    onPress={() => void submit()}
                />
            ),
        });
    }, [isSubmitting, navigation, onCancel, submit, t, theme.colors, valid]);

    return (
        <ScrollView
            style={styles.screen}
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
        >
            <ProfileIdentityGroup>
                <ProfileAvatarField
                    displayName={displayName || t('invitation.join.displayName')}
                    imageUri={avatar?.uri ?? null}
                    actionLabel={
                        avatar ? settingsT('profile.changePhoto') : settingsT('profile.choosePhoto')
                    }
                    error={avatarError}
                    onPress={() => void pickAvatar()}
                />
                <ProfileNameFields
                    firstName={firstName}
                    lastName={lastName}
                    firstNamePlaceholder={settingsT('profile.firstName')}
                    lastNamePlaceholder={settingsT('profile.lastName')}
                    hint={settingsT('profile.nameHint')}
                    error={nameError}
                    onFirstNameChange={(value) => {
                        setFirstName(value);
                        setNameError(null);
                        setSubmitError(null);
                    }}
                    onLastNameChange={(value) => {
                        setLastName(value);
                        setNameError(null);
                        setSubmitError(null);
                    }}
                />
            </ProfileIdentityGroup>
            <ProfileUsernameField
                label={settingsT('profile.username')}
                value={nickname}
                error={nicknameError}
                onPress={() => {
                    setSubmitError(null);
                    router.push('/invite/username');
                }}
            />
            <Text style={styles.warning}>{t('invitation.join.oneTimeWarning')}</Text>
            {submitError ? (
                <Text accessibilityRole="alert" style={styles.error}>
                    {submitError}
                </Text>
            ) : null}
        </ScrollView>
    );
};

const styles = StyleSheet.create((theme, rt) => ({
    screen: {
        flex: 1,
        paddingLeft: rt.insets.left + theme.space(4),
        paddingRight: rt.insets.right + theme.space(4),
    },
    container: {
        ...theme.screenContentPadding('child'),
        gap: theme.space(6),
        backgroundColor: theme.colors.background,
    },
    warning: {
        ...theme.fontSize.xs,
        opacity: 0.6,
        paddingHorizontal: theme.space(5),
    },
    error: {
        ...theme.fontSize.sm,
        color: theme.colors.dangerText,
        fontWeight: theme.fontWeight.medium.fontWeight,
        textAlign: 'center',
    },
}));

export default InvitationJoinScreen;
