import { ChevronDown, ChevronUp, Info, TriangleAlert } from 'lucide-react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useTranslation } from 'react-i18next';

import type { TimelineRow } from '@/services/threads/conversation/timeline';
import { HStack } from '@/components/primitives/hstack';
import { Pressable } from '@/components/primitives/pressable';
import { ScrollView } from '@/components/primitives/scrollview';
import { Text } from '@/components/primitives/text';
import { VStack } from '@/components/primitives/vstack';

type SystemEventRowProps = {
    row: Extract<TimelineRow, { type: 'system-event' }>;
    expanded: boolean;
    onToggle: () => void;
};

const MAX_DETAILS_TEXT_LENGTH = 3_000;

export const SystemEventRow = ({ row, expanded, onToggle }: SystemEventRowProps) => {
    const { theme } = useUnistyles();
    const { t } = useTranslation('threads');

    const iconColor = colorFromLevel(row.level, theme.colors);
    const Icon = row.level === 'info' ? Info : TriangleAlert;
    const detailsText = prettyDetails(row.details);
    const hasCapabilityRejections = row.capabilityRejections.length > 0;
    const hasDetails = !!row.code || !!detailsText || hasCapabilityRejections;
    const iconSize = theme.space(4);

    return (
        <VStack style={styles.container}>
            {hasDetails ? (
                <Pressable
                    accessibilityRole="button"
                    onPress={onToggle}
                    style={({ pressed }) => [styles.header, pressed && styles.pressed]}
                >
                    <HStack style={styles.messageWrap}>
                        <Icon size={iconSize} color={iconColor} />
                        <Text numberOfLines={1} style={styles.message}>
                            {presentationMessage(row, t)}
                        </Text>
                    </HStack>
                    <HStack style={styles.trailing}>
                        <Text numberOfLines={1} style={styles.label}>
                            {row.label}
                        </Text>
                        {expanded ? (
                            <ChevronUp size={iconSize} color={theme.colors.textMuted} />
                        ) : (
                            <ChevronDown size={iconSize} color={theme.colors.textMuted} />
                        )}
                    </HStack>
                </Pressable>
            ) : (
                <HStack style={styles.headerStatic}>
                    <Icon size={iconSize} color={iconColor} />
                    <Text numberOfLines={1} style={styles.message}>
                        {presentationMessage(row, t)}
                    </Text>
                </HStack>
            )}
            {hasDetails && expanded && (
                <VStack style={styles.details}>
                    {!!row.code && (
                        <HStack style={styles.codeRow}>
                            <Text style={styles.codeLabel}>{t('timelineCode')}</Text>
                            <Text selectable style={styles.codeValue}>
                                {row.code}
                            </Text>
                        </HStack>
                    )}
                    {hasCapabilityRejections && (
                        <VStack style={styles.capabilityRejections}>
                            {row.capabilityRejections.map((rejection) => (
                                <VStack key={rejection.id} style={styles.capabilityRejectionRow}>
                                    <HStack style={styles.capabilityRejectionHeader}>
                                        <Text numberOfLines={1} style={styles.capabilityLabel}>
                                            {rejection.label}
                                        </Text>
                                        <Text style={styles.capabilityKind}>{rejection.kind}</Text>
                                    </HStack>
                                    <Text style={styles.capabilityMessage}>
                                        {rejection.message}
                                    </Text>
                                </VStack>
                            ))}
                        </VStack>
                    )}
                    {!!detailsText && !hasCapabilityRejections && (
                        <ScrollView horizontal contentContainerStyle={styles.detailsBlock}>
                            <Text selectable style={styles.detailsText}>
                                {detailsText}
                            </Text>
                        </ScrollView>
                    )}
                </VStack>
            )}
        </VStack>
    );
};

const presentationMessage = (
    row: Extract<TimelineRow, { type: 'system-event' }>,
    t: (key: string, options?: Record<string, unknown>) => string,
): string => {
    switch (row.code) {
        case 'item_timeout_detected':
            return hasDetailString(row.details, 'recovery_job_id')
                ? t('timelineStepTimedOutRecoveryStarted')
                : t('timelineStepTimedOutRecoveryUnavailable');
        case 'item_recovery_opened':
            return t('timelineStartingStepRecovery');
        case 'item_recovery_attached':
            return t('timelineRecoveryAttached');
        case 'item_retry_scheduled':
            return t('timelineRecoveryRetryScheduled');
        case 'item_retry_attempt_started':
            return t('timelineRecoveryRetryStarted');
        case 'item_recovery_succeeded':
            return t('timelineRecoveryCompleted');
        case 'item_recovery_exhausted':
            return t('timelineRecoveryFailed');
        case 'item_tool_retry_scheduled':
            return t('timelineRetryingTool', {
                tool: detailString(row.details, 'tool_name') ?? t('timelineToolFallback'),
            });
        case 'item_tool_retry_resolved':
            return t('timelineToolCompletedAfterRetry', {
                tool: detailString(row.details, 'tool_name') ?? t('timelineToolFallback'),
            });
        case 'item_tool_retry_exhausted':
            return t('timelineToolFailedAfterRetries', {
                tool: detailString(row.details, 'tool_name') ?? t('timelineToolFallback'),
            });
        case 'turn_tool_loop_budget_exceeded':
            return t('timelineToolCallLimitReached');
        case 'turn_blocked_resumable':
            return row.message;
        case 'turn_failed':
            return isRecoveryFailureMessage(row.message)
                ? t('timelineRecoveryFailed')
                : row.message;
        default:
            return row.message;
    }
};

const colorFromLevel = (
    level: Extract<TimelineRow, { type: 'system-event' }>['level'],
    colors: {
        textMuted: string;
        warningText: string;
        dangerText: string;
    },
): string => {
    switch (level) {
        case 'warning':
            return colors.warningText;
        case 'error':
            return colors.dangerText;
        case 'info':
        default:
            return colors.textMuted;
    }
};

const styles = StyleSheet.create((theme) => ({
    container: {
        width: '100%',
        maxWidth: '100%',
        paddingVertical: theme.space(2),
        gap: theme.space(2),
    },
    header: {
        minHeight: theme.space(9),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme.space(3),
        opacity: 0.75,
    },
    headerStatic: {
        minHeight: theme.space(9),
        alignItems: 'center',
        gap: theme.space(2),
        opacity: 0.75,
    },
    pressed: {
        opacity: 0.95,
    },
    messageWrap: {
        flex: 1,
        minWidth: 0,
        alignItems: 'center',
        gap: theme.space(2),
    },
    message: {
        flex: 1,
        minWidth: 0,
        color: theme.colors.text,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
    },
    trailing: {
        maxWidth: '46%',
        alignItems: 'center',
        gap: theme.space(2),
        opacity: 0.8,
    },
    label: {
        flexShrink: 1,
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
    },
    details: {
        gap: theme.space(2),
        paddingTop: theme.space(0.5),
    },
    codeRow: {
        alignItems: 'center',
        gap: theme.space(2),
    },
    codeLabel: {
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
    },
    codeValue: {
        color: theme.colors.text,
        fontFamily: 'Menlo',
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
    },
    detailsBlock: {
        borderRadius: theme.radius.lg,
        backgroundColor: theme.colors.surfaceMuted,
        paddingHorizontal: theme.space(2.5),
        paddingVertical: theme.space(2),
    },
    detailsText: {
        color: theme.colors.text,
        fontFamily: 'Menlo',
        fontSize: theme.fontSize.xs.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
    },
    capabilityRejections: {
        gap: theme.space(2),
    },
    capabilityRejectionRow: {
        gap: theme.space(1.25),
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.lg,
        paddingHorizontal: theme.space(2.5),
        paddingVertical: theme.space(2),
    },
    capabilityRejectionHeader: {
        alignItems: 'center',
        gap: theme.space(2),
    },
    capabilityLabel: {
        flex: 1,
        minWidth: 0,
        color: theme.colors.text,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
        fontWeight: theme.fontWeight.extrabold.fontWeight,
    },
    capabilityKind: {
        color: theme.colors.warningText,
        borderRadius: theme.radius.lg,
        backgroundColor: theme.colors.warningSurface,
        paddingHorizontal: theme.space(1.5),
        paddingVertical: theme.space(0.5),
        fontSize: theme.fontSize['2xs'].fontSize,
        lineHeight: theme.fontSize['2xs'].lineHeight,
        fontWeight: theme.fontWeight.extrabold.fontWeight,
    },
    capabilityMessage: {
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.xs.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
    },
}));

const prettyDetails = (value: unknown): string | null => {
    if (value === null || value === undefined) {
        return null;
    }

    const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);

    const trimmed = text.trim();
    if (!trimmed || trimmed === 'null') {
        return null;
    }

    if (trimmed.length <= MAX_DETAILS_TEXT_LENGTH) {
        return trimmed;
    }

    return `${trimmed.slice(0, MAX_DETAILS_TEXT_LENGTH)}\n... [truncated]`;
};

const hasDetailString = (value: unknown, key: string): boolean => {
    return !!detailString(value, key);
};

const isRecoveryFailureMessage = (message: string): boolean => {
    return message.startsWith('recovery failed for item `');
};

const detailString = (value: unknown, key: string): string | null => {
    const field = asRecord(value)[key];
    return typeof field === 'string' && field.trim() ? field : null;
};

const asRecord = (value: unknown): Record<string, unknown> => {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : {};
};
