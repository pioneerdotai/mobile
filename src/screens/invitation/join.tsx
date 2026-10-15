import { router, useNavigation } from 'expo-router';
import { useCallback, useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { dispatchInvitation, useInvitation } from '@/client/onboarding';
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
import { selectProfileAvatar } from '@/services/profile/avatar';

const InvitationJoinScreen = ({ onCancel }: { onCancel: () => void }) => {
    const { t } = useTranslation('gateway');
    const { t: settingsT } = useTranslation('settings');
    const { theme } = useUnistyles();
    const navigation = useNavigation();
    const value = useInvitation();
    const owner = value?.owner_generation;
    const displayName = [value?.first_name, value?.last_name].filter(Boolean).join(' ');
    const valid = Boolean(value?.name_valid && value?.nickname_valid);
    const isSubmitting = value?.submitting ?? false;
    const nameError = value?.name_error ? t('invitation.join.errors.displayName') : null;
    const nicknameError = value?.nickname_error
        ? t(
              value.nickname_error === 'nickname_unavailable'
                  ? 'invitation.join.errors.nicknameUnavailable'
                  : 'invitation.join.errors.nickname',
          )
        : null;
    const avatarError = value?.avatar_error ? t('invitation.join.errors.avatar') : null;
    const submitError = value?.error
        ? t(
              value.error.includes('storage') || value.error.includes('registry')
                  ? 'invitation.join.errors.storage'
                  : 'invitation.join.errors.unavailable',
          )
        : null;
    const pickAvatar = useCallback(async () => {
        if (owner === undefined || isSubmitting) return;
        try {
            const selected = await selectProfileAvatar();
            if (selected)
                dispatchInvitation({
                    kind: 'select_avatar',
                    expected_owner: owner,
                    preview: selected.uri,
                    avatar: selected.input,
                });
        } catch {
            dispatchInvitation({ kind: 'avatar_failed', expected_owner: owner });
        }
    }, [owner, isSubmitting]);
    const submit = useCallback(() => {
        if (owner !== undefined)
            dispatchInvitation({ kind: 'submit_for_owner', expected_owner: owner });
    }, [owner]);

    useLayoutEffect(() => {
        navigation.setOptions({
            headerShown: true,
            headerMode: 'screen',
            headerTitle: t('invitation.join.title'),
            headerTransparent: true,
            headerStyle: { backgroundColor: 'transparent' },
            cardStyle: { backgroundColor: theme.colors.background },
            sceneStyle: { backgroundColor: theme.colors.background },
            headerLeft: () => (
                <BackButton disabled={value?.can_cancel === false} onPressHandler={onCancel} />
            ),
            headerRight: () => (
                <HeaderCheckButton
                    accessibilityLabel={t('invitation.join.accept')}
                    disabled={!valid}
                    loading={isSubmitting}
                    onPress={() => void submit()}
                />
            ),
        });
    }, [isSubmitting, navigation, onCancel, submit, t, theme.colors, valid, value?.can_cancel]);

    return (
        <ScrollView
            style={styles.screen}
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
        >
            <ProfileIdentityGroup>
                <ProfileAvatarField
                    displayName={displayName || t('invitation.join.displayName')}
                    imageUri={value?.avatar_preview ?? null}
                    actionLabel={
                        value?.avatar_preview
                            ? settingsT('profile.changePhoto')
                            : settingsT('profile.choosePhoto')
                    }
                    error={avatarError}
                    onPress={() => void pickAvatar()}
                />
                <ProfileNameFields
                    firstName={value?.first_name ?? ''}
                    lastName={value?.last_name ?? ''}
                    firstNamePlaceholder={settingsT('profile.firstName')}
                    lastNamePlaceholder={settingsT('profile.lastName')}
                    hint={settingsT('profile.nameHint')}
                    error={nameError}
                    onFirstNameChange={(text) => {
                        if (owner !== undefined)
                            dispatchInvitation({
                                kind: 'edit_field',
                                expected_owner: owner,
                                field: 'first_name',
                                value: text,
                            });
                    }}
                    onLastNameChange={(text) => {
                        if (owner !== undefined)
                            dispatchInvitation({
                                kind: 'edit_field',
                                expected_owner: owner,
                                field: 'last_name',
                                value: text,
                            });
                    }}
                />
            </ProfileIdentityGroup>
            <ProfileUsernameField
                label={settingsT('profile.username')}
                value={value?.nickname ?? ''}
                error={nicknameError}
                onPress={() => {
                    if (owner === undefined) return;
                    dispatchInvitation({ kind: 'open_username_for_owner', expected_owner: owner });
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
