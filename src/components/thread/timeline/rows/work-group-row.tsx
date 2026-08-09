import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { ChevronDown, ChevronUp } from 'lucide-react-native';

import type { TimelineRow } from '@/services/threads/conversation/timeline';
import { HStack } from '@/components/primitives/hstack';
import { Pressable } from '@/components/primitives/pressable';
import { Text } from '@/components/primitives/text';
import { TIMELINE_TECHNICAL_ROW_VERTICAL_PADDING_UNITS } from '../timeline-grouping';

type WorkGroupRowProps = {
    row: Extract<TimelineRow, { type: 'work-group' }>;
    expanded: boolean;
    onToggle: () => void;
};

export const WorkGroupRow = ({ row, expanded, onToggle }: WorkGroupRowProps) => {
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
                {!!row.elapsedLabel && (
                    <Text numberOfLines={1} style={styles.meta}>
                        {row.elapsedLabel}
                    </Text>
                )}
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
        paddingVertical: theme.space(TIMELINE_TECHNICAL_ROW_VERTICAL_PADDING_UNITS),
        opacity: 0.65,
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
        gap: theme.space(2),
    },
    meta: {
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
    },
}));
