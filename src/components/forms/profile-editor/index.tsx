import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { MemberAvatar } from '@/components/member-avatar';
import { Box } from '@/components/primitives/box';
import { Input } from '@/components/primitives/input';
import { Pressable } from '@/components/primitives/pressable';
import { Text } from '@/components/primitives/text';
import { VStack } from '@/components/primitives/vstack';

export { ProfileUsernameEditor } from './username-editor';

const ProfileIdentityGroup = ({ children }: { children: ReactNode }) => (
    <VStack style={styles.identityGroup}>{children}</VStack>
);

type ProfileAvatarFieldProps = {
    actionLabel: string;
    avatarRevision?: string | null;
    displayName: string;
    error?: string | null;
    imageUri?: string | null;
    onPress: () => void;
    principalId?: string | null;
};

const ProfileAvatarField = ({
    actionLabel,
    avatarRevision,
    displayName,
    error,
    imageUri,
    onPress,
    principalId,
}: ProfileAvatarFieldProps) => {
    const { theme } = useUnistyles();

    return (
        <VStack style={styles.avatarSection}>
            <MemberAvatar
                displayName={displayName}
                size={theme.space(24)}
                imageUri={imageUri}
                principalId={principalId}
                avatarRevision={avatarRevision}
            />
            <Pressable accessibilityRole="button" onPress={onPress}>
                <Text fontWeight="medium" style={styles.photoAction}>
                    {actionLabel}
                </Text>
            </Pressable>
            {error ? (
                <Text accessibilityRole="alert" style={styles.error}>
                    {error}
                </Text>
            ) : null}
        </VStack>
    );
};

type ProfileNameFieldsProps = {
    error?: string | null;
    firstName: string;
    firstNamePlaceholder: string;
    hint: string;
    lastName: string;
    lastNamePlaceholder: string;
    onFirstNameChange: (value: string) => void;
    onLastNameChange: (value: string) => void;
};

const ProfileNameFields = ({
    error,
    firstName,
    firstNamePlaceholder,
    hint,
    lastName,
    lastNamePlaceholder,
    onFirstNameChange,
    onLastNameChange,
}: ProfileNameFieldsProps) => (
    <VStack style={styles.fieldContainer}>
        <VStack style={styles.nameCard}>
            <Input
                value={firstName}
                placeholder={firstNamePlaceholder}
                autoCapitalize="words"
                autoCorrect={false}
                maxLength={128}
                returnKeyType="next"
                style={styles.nameInput}
                onChangeText={onFirstNameChange}
            />
            <Box style={styles.divider} />
            <Input
                value={lastName}
                placeholder={lastNamePlaceholder}
                autoCapitalize="words"
                autoCorrect={false}
                maxLength={128}
                returnKeyType="done"
                style={styles.nameInput}
                onChangeText={onLastNameChange}
            />
        </VStack>
        <Text style={styles.hint}>{hint}</Text>
        {error ? (
            <Text accessibilityRole="alert" style={styles.fieldError}>
                {error}
            </Text>
        ) : null}
    </VStack>
);

type ProfileUsernameFieldProps = {
    error?: string | null;
    label: string;
    onPress: () => void;
    value: string;
};

const ProfileUsernameField = ({ error, label, onPress, value }: ProfileUsernameFieldProps) => {
    const { theme } = useUnistyles();

    return (
        <VStack style={styles.fieldContainer}>
            <Pressable accessibilityRole="button" onPress={onPress}>
                <Box style={styles.usernameCard}>
                    <Text>{label}</Text>
                    <Box style={styles.usernameValue}>
                        {value ? <Text style={styles.secondary}>@{value}</Text> : null}
                        <ChevronRight
                            size={theme.space(5)}
                            opacity={0.6}
                            color={theme.colors.typography}
                        />
                    </Box>
                </Box>
            </Pressable>
            {error ? (
                <Text accessibilityRole="alert" style={styles.fieldError}>
                    {error}
                </Text>
            ) : null}
        </VStack>
    );
};

const styles = StyleSheet.create((theme) => ({
    identityGroup: {
        width: '100%',
        gap: theme.space(2),
    },
    avatarSection: {
        alignItems: 'center',
        gap: theme.space(2),
    },
    photoAction: {
        color: theme.colors.blue['500'],
        paddingBottom: theme.space(1),
    },
    fieldContainer: {
        width: '100%',
        gap: theme.space(1.5),
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
    usernameValue: {
        minWidth: 0,
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: theme.space(1),
    },
    secondary: { opacity: 0.6 },
    error: {
        color: theme.colors.dangerText,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
        textAlign: 'center',
    },
    fieldError: {
        paddingHorizontal: theme.space(5),
        color: theme.colors.dangerText,
        fontSize: theme.fontSize.xs.fontSize,
        lineHeight: theme.fontSize.xs.lineHeight,
    },
}));

export { ProfileAvatarField, ProfileIdentityGroup, ProfileNameFields, ProfileUsernameField };
