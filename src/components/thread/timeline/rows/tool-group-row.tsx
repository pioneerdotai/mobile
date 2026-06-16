import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import type { TimelineRow } from '@/services/threads/conversation/timeline';
import { HStack } from '@/components/primitives/hstack';
import { Pressable } from '@/components/primitives/pressable';
import { Text } from '@/components/primitives/text';

type ToolGroupRowProps = {
    row: Extract<TimelineRow, { type: 'tool-group' }>;
    expanded: boolean;
    onToggle: () => void;
};

export const ToolGroupRow = ({ row, expanded, onToggle }: ToolGroupRowProps) => {
    const { theme } = useUnistyles();

    const iconSize = theme.space(4);

    return (
        <Pressable
            accessibilityRole="button"
            onPress={onToggle}
            style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}
        >
            <Text numberOfLines={1} style={styles.title}>
                {row.title}
            </Text>
            <HStack style={styles.trailing}>
                {expanded ? (
                    <ChevronUp size={iconSize} color={theme.colors.textMuted} />
                ) : (
                    <ChevronDown size={iconSize} color={theme.colors.textMuted} />
                )}
            </HStack>
        </Pressable>
    );
};

const styles = StyleSheet.create((theme) => ({
    wrap: {
        minHeight: theme.space(9),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme.space(3),
        paddingVertical: theme.space(2),
        opacity: 0.6,
    },
    pressed: {
        opacity: 0.85,
    },
    title: {
        flex: 1,
        minWidth: 0,
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
    },
    trailing: {
        alignItems: 'center',
    },
}));
