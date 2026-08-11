import { StyleSheet } from 'react-native-unistyles';

import { Label } from '@/components/forms/label';
import { Box } from '@/components/primitives/box';
import { Input } from '@/components/primitives/input';
import { ScrollView } from '@/components/primitives/scrollview';
import { Text } from '@/components/primitives/text';
import { VStack } from '@/components/primitives/vstack';

type ProfileUsernameEditorProps = {
    error?: string | null;
    hint: string;
    label: string;
    onChangeText: (value: string) => void;
    onSubmitEditing: () => void;
    preview?: string | null;
    rules: string;
    value: string;
};

const ProfileUsernameEditor = ({
    error,
    hint,
    label,
    onChangeText,
    onSubmitEditing,
    preview,
    rules,
    value,
}: ProfileUsernameEditorProps) => (
    <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
    >
        <VStack style={styles.field}>
            <Label style={styles.label}>{label}</Label>
            <Box style={styles.inputCard}>
                <Input
                    value={value}
                    autoFocus
                    autoCapitalize="none"
                    autoCorrect={false}
                    spellCheck={false}
                    maxLength={32}
                    returnKeyType="done"
                    style={styles.input}
                    onChangeText={onChangeText}
                    onSubmitEditing={onSubmitEditing}
                />
            </Box>
            {error ? (
                <Text accessibilityRole="alert" style={styles.error}>
                    {error}
                </Text>
            ) : null}
            <Text style={styles.hint}>{hint}</Text>
        </VStack>
        <Box>
            <Text style={styles.hint}>{rules}</Text>
        </Box>
        {preview ? (
            <Box>
                <Text style={styles.preview}>{preview}</Text>
            </Box>
        ) : null}
    </ScrollView>
);

const styles = StyleSheet.create((theme, rt) => ({
    container: {
        flex: 1,
        paddingLeft: rt.insets.left + theme.space(4),
        paddingRight: rt.insets.right + theme.space(4),
    },
    content: { ...theme.screenContentPadding('child'), gap: theme.space(6) },
    field: { gap: theme.space(1.5) },
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
        paddingLeft: theme.space(3),
        color: theme.colors.dangerText,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
    },
}));

export { ProfileUsernameEditor };
export type { ProfileUsernameEditorProps };
