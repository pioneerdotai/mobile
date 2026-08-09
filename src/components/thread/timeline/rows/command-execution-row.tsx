import { ChevronDown, ChevronUp, Terminal } from 'lucide-react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useTranslation } from 'react-i18next';

import type { TimelineRow } from '@/services/threads/conversation/timeline';
import { Box } from '@/components/primitives/box';
import { HStack } from '@/components/primitives/hstack';
import { Pressable } from '@/components/primitives/pressable';
import { ScrollView } from '@/components/primitives/scrollview';
import { Text } from '@/components/primitives/text';
import { VStack } from '@/components/primitives/vstack';
import Spinner from '@/components/feedback/spinner';
import { TIMELINE_TECHNICAL_ROW_VERTICAL_PADDING_UNITS } from '../timeline-grouping';

type CommandExecutionRowProps = {
    row: Extract<TimelineRow, { type: 'command-execution' }>;
    expanded: boolean;
    onToggle: () => void;
};

export const CommandExecutionRow = ({ row, expanded, onToggle }: CommandExecutionRowProps) => {
    const { theme } = useUnistyles();
    const { t } = useTranslation('threads');

    const terminalText = row.terminalText.trim() ? row.terminalText : row.outputPreview;
    const hasOutput = terminalText.trim().length > 0;
    const showTerminal = hasOutput && expanded;
    const commandTitle =
        row.command.trim().replace(/[\r\n]+/g, ' ') ||
        (row.streaming ? t('timelineRunningCommand') : t('timelineCommandCompleted'));
    const iconSize = theme.space(4);
    const iconColor = theme.colors.typography;

    return (
        <VStack style={styles.container}>
            <Pressable
                accessibilityRole="button"
                disabled={!hasOutput}
                onPress={onToggle}
                style={({ pressed }) => [
                    styles.header,
                    row.streaming && styles.activeHeader,
                    pressed && hasOutput && styles.pressed,
                ]}
            >
                <HStack style={styles.titleWrap}>
                    {row.streaming ? (
                        <Spinner size={iconSize} color={iconColor} />
                    ) : (
                        <Terminal size={iconSize} color={iconColor} />
                    )}
                    <Text
                        numberOfLines={1}
                        style={row.streaming ? styles.runningTitle : styles.title}
                    >
                        {commandTitle}
                    </Text>
                </HStack>
                <HStack style={styles.meta}>
                    {!!row.elapsedLabel && (
                        <Text numberOfLines={1} style={styles.metaText}>
                            {row.elapsedLabel}
                        </Text>
                    )}
                    {hasOutput &&
                        (expanded ? (
                            <ChevronUp size={iconSize} color={iconColor} />
                        ) : (
                            <ChevronDown size={iconSize} color={iconColor} />
                        ))}
                </HStack>
            </Pressable>
            {showTerminal && <TerminalBlock text={terminalText} />}
        </VStack>
    );
};

const TerminalBlock = ({ text }: { text: string }) => {
    return (
        <Box style={styles.terminalFrame}>
            <ScrollView
                nestedScrollEnabled
                style={styles.terminalVerticalScroller}
                contentContainerStyle={styles.terminalVerticalContent}
            >
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator
                    contentContainerStyle={styles.terminalHorizontalContent}
                >
                    <Text selectable style={styles.terminalText}>
                        {text}
                    </Text>
                </ScrollView>
            </ScrollView>
        </Box>
    );
};

const styles = StyleSheet.create((theme) => ({
    container: {
        width: '100%',
        maxWidth: '100%',
        paddingVertical: theme.space(TIMELINE_TECHNICAL_ROW_VERTICAL_PADDING_UNITS),
        gap: theme.space(2),
    },
    header: {
        minHeight: theme.space(9),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme.space(2),
        opacity: 0.6,
    },
    activeHeader: {
        opacity: 1,
    },
    pressed: {
        opacity: 0.8,
    },
    titleWrap: {
        flex: 1,
        minWidth: 0,
        alignItems: 'center',
        gap: theme.space(2),
    },
    title: {
        flex: 1,
        minWidth: 0,
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
    },
    runningTitle: {
        flex: 1,
        minWidth: 0,
        color: theme.colors.text,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
        fontWeight: theme.fontWeight.semibold.fontWeight,
    },
    meta: {
        alignItems: 'center',
        gap: theme.space(2),
    },
    terminalFrame: {
        maxHeight: theme.space(80),
        minHeight: theme.space(24),
        borderRadius: theme.radius.lg,
        backgroundColor: theme.colors.codeBackground,
        overflow: 'hidden',
    },
    terminalVerticalScroller: {
        maxHeight: theme.space(80),
    },
    terminalVerticalContent: {
        minHeight: theme.space(24),
    },
    terminalHorizontalContent: {
        paddingHorizontal: theme.space(3),
        paddingVertical: theme.space(2.5),
    },
    terminalText: {
        color: theme.colors.codeForeground,
        fontFamily: 'Menlo',
        fontSize: theme.fontSize.xs.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
    },
    metaText: {
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.xs.fontSize,
        lineHeight: theme.fontSize.xs.lineHeight,
    },
}));
