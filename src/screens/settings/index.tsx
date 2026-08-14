import { router } from 'expo-router';
import { ChevronRight, Globe, MailPlus, Smartphone, Sun, Users } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { Box } from '@/components/primitives/box';
import { Label } from '@/components/forms/label';
import { HStack } from '@/components/primitives/hstack';
import { MemberAvatar } from '@/components/member-avatar';
import { Pressable } from '@/components/primitives/pressable';
import { ScrollView } from '@/components/primitives/scrollview';
import { Text } from '@/components/primitives/text';
import { VStack } from '@/components/primitives/vstack';
import {
    useAdministrationCapabilities,
    useCurrentPrincipalPresentation,
} from '@/hooks/use-administration-capabilities';
import { useGatewayStore } from '@/stores/gateway';

const styles = StyleSheet.create((theme, rt) => ({
    container: {
        flex: 1,
        paddingHorizontal: rt.insets.left + theme.space(4),
        paddingRight: rt.insets.right + theme.space(4),
    },
    content: {
        ...theme.screenContentPadding('root'),
        gap: theme.space(6),
    },
    settingsContainer: {
        flex: 1,
        backgroundColor: theme.colors.muted,
        borderRadius: theme.radius['4xl'],
        padding: theme.space(3),
    },
    settingsContainerGeneral: {
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
        paddingTop: 0,
    },
    settingsWrapper: {
        flex: 1,
    },
    settingContainer: {
        height: theme.space(8),
        alignItems: 'center',
        gap: theme.space(3),
    },
    iconContainer: {
        height: theme.space(8),
        width: theme.space(8),
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.muted,
        borderRadius: theme.radius.lg,
    },
    settingContentContainer: {
        flex: 1,
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: theme.space(3),
    },
    settingTitleContainer: {
        gap: theme.space(2),
    },
    settingTitle: {
        color: theme.colors.typography,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: theme.colors.border,
        marginLeft: theme.space(11),
        marginVertical: theme.space(2),
    },
    dividerWide: {
        marginLeft: 0,
    },
    profileCard: {
        alignItems: 'center',
        gap: theme.space(3),
        backgroundColor: theme.colors.muted,
        borderTopLeftRadius: theme.radius['4xl'],
        borderTopRightRadius: theme.radius['4xl'],
        paddingHorizontal: theme.space(3),
        paddingTop: theme.space(3),
        paddingBottom: theme.space(2),
    },
    profileText: { flex: 1 },
    secondary: { opacity: 0.6, ...theme.fontSize.xs },
    fieldContainer: {
        gap: theme.space(3),
    },
}));

const SettingsScreen = () => {
    const { t } = useTranslation('settings');
    const { theme } = useUnistyles();
    const canManageDevices = useGatewayStore(
        (gatewayState) =>
            gatewayState.sessionTerminalReason === null &&
            (gatewayState.registry.remotes ?? []).some(
                (gateway) => gateway.id === gatewayState.registry.active_gateway_id,
            ),
    );
    const capabilities = useAdministrationCapabilities();
    const principal = useCurrentPrincipalPresentation();

    const general = [
        ...(canManageDevices
            ? [
                  {
                      icon: Smartphone,
                      title: t('devices.eyebrow'),
                      onPress: () => router.navigate({ pathname: '/settings/devices' }),
                  },
              ]
            : []),
    ];

    const settings = [
        {
            icon: Globe,
            title: t('language.eyebrow'),
            onPress: () => router.navigate({ pathname: '/settings/language' }),
        },
        {
            icon: Sun,
            title: t('theme.eyebrow'),
            onPress: () => router.navigate({ pathname: '/settings/theme' }),
        },
    ];
    const memberSettings = [
        ...(capabilities.data?.can_view_member_directory
            ? [
                  {
                      icon: Users,
                      title: t('members.eyebrow'),
                      onPress: () => router.navigate({ pathname: '/settings/members' }),
                  },
              ]
            : []),
        ...(capabilities.data?.can_view_invitations
            ? [
                  {
                      icon: MailPlus,
                      title: t('invitations.eyebrow'),
                      onPress: () => router.navigate({ pathname: '/settings/invitations' }),
                  },
              ]
            : []),
    ];

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            {principal.data ? (
                <VStack>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${principal.data.display_name}, ${principal.data.role.display_name}`}
                        onPress={() => router.navigate({ pathname: '/settings/profile' })}
                    >
                        <HStack style={styles.profileCard}>
                            <MemberAvatar
                                displayName={principal.data.display_name}
                                size={theme.space(12)}
                                principalId={principal.data.principal_id}
                                avatarRevision={principal.data.avatar_revision}
                            />
                            <VStack style={styles.profileText}>
                                <Text fontWeight="semibold">{principal.data.display_name}</Text>
                                <Text style={styles.secondary}>@{principal.data.nickname}</Text>
                                <Text style={styles.secondary}>
                                    {principal.data.role.display_name}
                                </Text>
                            </VStack>
                            <ChevronRight
                                size={theme.space(5)}
                                opacity={0.8}
                                color={theme.colors.typography}
                            />
                        </HStack>
                    </Pressable>
                    <VStack style={[styles.settingsContainer, styles.settingsContainerGeneral]}>
                        <VStack style={styles.settingsWrapper}>
                            <Box style={[styles.divider, styles.dividerWide]} />
                            {general.map((setting, index) => (
                                <VStack key={setting.title}>
                                    <Pressable accessibilityRole="button" onPress={setting.onPress}>
                                        <HStack style={styles.settingContainer}>
                                            <Box style={styles.iconContainer}>
                                                <setting.icon
                                                    size={theme.space(5)}
                                                    strokeWidth={theme.space(0.375)}
                                                    opacity={0.8}
                                                    color={theme.colors.typography}
                                                />
                                            </Box>
                                            <HStack style={styles.settingContentContainer}>
                                                <VStack style={styles.settingTitleContainer}>
                                                    <Box>
                                                        <Text
                                                            fontWeight="medium"
                                                            style={styles.settingTitle}
                                                        >
                                                            {setting.title}
                                                        </Text>
                                                    </Box>
                                                </VStack>
                                                <Box>
                                                    <ChevronRight
                                                        size={theme.space(5)}
                                                        opacity={0.8}
                                                        color={theme.colors.typography}
                                                    />
                                                </Box>
                                            </HStack>
                                        </HStack>
                                    </Pressable>
                                    {index < general.length - 1 ? (
                                        <Box style={styles.divider} />
                                    ) : null}
                                </VStack>
                            ))}
                        </VStack>
                    </VStack>
                </VStack>
            ) : null}
            {memberSettings.length > 0 ? (
                <VStack style={styles.fieldContainer}>
                    <Label>{t('members.eyebrow')}</Label>
                    <VStack style={styles.settingsContainer}>
                        <VStack style={styles.settingsWrapper}>
                            {memberSettings.map((setting, index) => (
                                <VStack key={setting.title}>
                                    <Pressable accessibilityRole="button" onPress={setting.onPress}>
                                        <HStack style={styles.settingContainer}>
                                            <Box style={styles.iconContainer}>
                                                <setting.icon
                                                    size={theme.space(5)}
                                                    strokeWidth={theme.space(0.375)}
                                                    opacity={0.8}
                                                    color={theme.colors.typography}
                                                />
                                            </Box>
                                            <HStack style={styles.settingContentContainer}>
                                                <VStack style={styles.settingTitleContainer}>
                                                    <Box>
                                                        <Text
                                                            fontWeight="medium"
                                                            style={styles.settingTitle}
                                                        >
                                                            {setting.title}
                                                        </Text>
                                                    </Box>
                                                </VStack>
                                                <Box>
                                                    <ChevronRight
                                                        size={theme.space(5)}
                                                        opacity={0.8}
                                                        color={theme.colors.typography}
                                                    />
                                                </Box>
                                            </HStack>
                                        </HStack>
                                    </Pressable>
                                    {index < memberSettings.length - 1 ? (
                                        <Box style={styles.divider} />
                                    ) : null}
                                </VStack>
                            ))}
                        </VStack>
                    </VStack>
                </VStack>
            ) : null}
            <VStack style={styles.fieldContainer}>
                <Label>{t('title')}</Label>
                <VStack style={styles.settingsContainer}>
                    <VStack style={styles.settingsWrapper}>
                        {settings.map((setting, index) => (
                            <VStack key={setting.title}>
                                <Pressable accessibilityRole="button" onPress={setting.onPress}>
                                    <HStack style={styles.settingContainer}>
                                        <Box style={styles.iconContainer}>
                                            <setting.icon
                                                size={theme.space(5)}
                                                strokeWidth={theme.space(0.375)}
                                                opacity={0.8}
                                                color={theme.colors.typography}
                                            />
                                        </Box>
                                        <HStack style={styles.settingContentContainer}>
                                            <VStack style={styles.settingTitleContainer}>
                                                <Box>
                                                    <Text
                                                        fontWeight="medium"
                                                        style={styles.settingTitle}
                                                    >
                                                        {setting.title}
                                                    </Text>
                                                </Box>
                                            </VStack>
                                            <Box>
                                                <ChevronRight
                                                    size={theme.space(5)}
                                                    opacity={0.8}
                                                    color={theme.colors.typography}
                                                />
                                            </Box>
                                        </HStack>
                                    </HStack>
                                </Pressable>
                                {index < settings.length - 1 ? (
                                    <Box style={styles.divider} />
                                ) : null}
                            </VStack>
                        ))}
                    </VStack>
                </VStack>
            </VStack>
        </ScrollView>
    );
};

export default SettingsScreen;
