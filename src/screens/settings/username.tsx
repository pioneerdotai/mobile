import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useNavigation } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native-unistyles';

import { PioneerClientNativeError } from '@/client';
import { HeaderCheckButton } from '@/components/buttons/header-action';
import { Label } from '@/components/forms/label';
import { Box } from '@/components/primitives/box';
import { Input } from '@/components/primitives/input';
import { ScrollView } from '@/components/primitives/scrollview';
import { Text } from '@/components/primitives/text';
import { VStack } from '@/components/primitives/vstack';
import { useAdministrationPrincipal } from '@/hooks/use-administration-capabilities';
import { applyCurrentProfileUpdate, updateCurrentProfile } from '@/services/profile/update';

const isValidNickname = (value: string): boolean =>
    value.length >= 2 && value.length <= 32 && /^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(value);

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
    const valid = isValidNickname(normalized);
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
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
        >
            <VStack style={styles.field}>
                <Label style={styles.label}>{t('profile.username')}</Label>
                <Box style={styles.inputCard}>
                    <Input
                        value={nickname}
                        autoFocus
                        autoCapitalize="none"
                        autoCorrect={false}
                        spellCheck={false}
                        maxLength={32}
                        returnKeyType="done"
                        style={styles.input}
                        onChangeText={(value) => {
                            setNickname(value);
                            setError(null);
                        }}
                        onSubmitEditing={save}
                    />
                </Box>
                {error ? (
                    <Text accessibilityRole="alert" style={styles.error}>
                        {error}
                    </Text>
                ) : null}
                <Text style={styles.hint}>{t('profile.usernameHint')}</Text>
            </VStack>
            <Box>
                <Text style={styles.hint}>{t('profile.usernameRules')}</Text>
            </Box>
            {valid ? (
                <Box>
                    <Text style={styles.preview}>
                        {t('profile.usernamePreview', { username: normalized })}
                    </Text>
                </Box>
            ) : null}
        </ScrollView>
    );
};

const styles = StyleSheet.create((theme, rt) => ({
    container: {
        flex: 1,
        paddingLeft: rt.insets.left + theme.space(4),
        paddingRight: rt.insets.right + theme.space(4),
    },
    content: { ...theme.screenContentPadding('child'), gap: theme.space(6) },
    field: { gap: theme.space(1) },
    inputCard: {
        paddingHorizontal: theme.space(3),
        justifyContent: 'center',
        borderRadius: theme.radius['2xl'],
        backgroundColor: theme.colors.muted,
    },
    label: {
        paddingLeft: theme.space(3),
    },
    input: {
        minHeight: theme.space(14),
        color: theme.colors.typography,
        fontSize: theme.fontSize.lg.fontSize,
    },
    hint: {
        paddingLeft: theme.space(3),
        opacity: 0.6,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
    },
    preview: {
        paddingLeft: theme.space(3),
        color: theme.colors.blue['500'],
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
    },
    error: {
        color: theme.colors.dangerText,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
    },
}));

export default UsernameSettingsScreen;
