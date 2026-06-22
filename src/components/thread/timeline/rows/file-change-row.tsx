import { Check, ChevronDown, ChevronUp, FileCode, TriangleAlert } from 'lucide-react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useTranslation } from 'react-i18next';

import type { TimelineRow } from '@/services/threads/conversation/timeline';
import { HStack } from '@/components/primitives/hstack';
import { Pressable } from '@/components/primitives/pressable';
import { ScrollView } from '@/components/primitives/scrollview';
import { Text } from '@/components/primitives/text';
import { VStack } from '@/components/primitives/vstack';
import Spinner from '@/components/feedback/spinner';

import { BodyText } from './status';

type FileChangeRowProps = {
    row: Extract<TimelineRow, { type: 'file-change' }>;
    expanded: boolean;
    onToggle: () => void;
};

export const FileChangeRow = ({ row, expanded, onToggle }: FileChangeRowProps) => {
    const { theme } = useUnistyles();
    const { t } = useTranslation('threads');

    const isRunning = isRunningStatus(row.status);
    const hasDetails = !isRunning;
    const StatusIcon = row.successful ? Check : TriangleAlert;
    const iconSize = theme.space(4);
    const smallIconSize = theme.space(3.5);
    const pathIconSize = theme.space(3);
    const iconColor = theme.colors.typography;

    if (isRunning) {
        return (
            <VStack style={styles.container}>
                <FileChangeSummary row={row} iconColor={iconColor} iconSize={iconSize} />
                <HStack style={styles.runningRow}>
                    <HStack style={styles.runningLabel}>
                        <Spinner size={theme.space(4)} color={iconColor} />
                        <Text numberOfLines={1} style={styles.runningText}>
                            {row.finalStatus}
                        </Text>
                    </HStack>
                    {!!row.elapsedLabel && (
                        <Text numberOfLines={1} style={styles.statusText}>
                            {row.elapsedLabel}
                        </Text>
                    )}
                </HStack>
            </VStack>
        );
    }

    return (
        <VStack style={styles.container}>
            <Pressable
                accessibilityRole="button"
                onPress={onToggle}
                style={({ pressed }) => [styles.header, pressed && styles.pressed]}
            >
                <FileChangeSummary row={row} iconColor={iconColor} iconSize={iconSize} />
                <HStack style={styles.meta}>
                    <StatusIcon size={smallIconSize} color={iconColor} />
                    <Text numberOfLines={1} style={styles.statusText}>
                        {row.finalStatus}
                    </Text>
                    {!!row.elapsedLabel && (
                        <Text numberOfLines={1} style={styles.statusText}>
                            {row.elapsedLabel}
                        </Text>
                    )}
                    {hasDetails &&
                        (expanded ? (
                            <ChevronUp size={iconSize} color={iconColor} />
                        ) : (
                            <ChevronDown size={iconSize} color={iconColor} />
                        ))}
                </HStack>
            </Pressable>
            {hasDetails && expanded && (
                <VStack style={styles.details}>
                    {row.exitCode !== null && (
                        <BodyText>{t('timelineExitCode', { code: row.exitCode })}</BodyText>
                    )}
                    {row.paths.length > 0 && (
                        <VStack style={styles.pathList}>
                            {row.paths.slice(0, 40).map((path) => (
                                <HStack key={path} style={styles.pathRow}>
                                    <FileCode size={pathIconSize} color={iconColor} />
                                    <Text numberOfLines={1} style={styles.pathText}>
                                        {path}
                                    </Text>
                                </HStack>
                            ))}
                            {row.paths.length > 40 && (
                                <Text style={styles.pathMore}>
                                    {t('timelineAndMore', { count: row.paths.length - 40 })}
                                </Text>
                            )}
                        </VStack>
                    )}
                    {!!row.output.trim() && (
                        <VStack style={styles.outputFrame}>
                            <Text style={styles.outputLabel}>{t('timelineOutput')}</Text>
                            <ScrollView horizontal contentContainerStyle={styles.outputBlock}>
                                <Text selectable style={styles.outputText}>
                                    {row.output}
                                </Text>
                            </ScrollView>
                        </VStack>
                    )}
                    {row.exitCode === null && row.paths.length === 0 && !row.output.trim() && (
                        <BodyText>{t('timelineNoDetails')}</BodyText>
                    )}
                </VStack>
            )}
        </VStack>
    );
};

const FileChangeSummary = ({
    row,
    iconColor,
    iconSize,
}: {
    row: Extract<TimelineRow, { type: 'file-change' }>;
    iconColor: string;
    iconSize: number;
}) => {
    const { t } = useTranslation('threads');

    return (
        <HStack style={styles.titleWrap}>
            <FileCode size={iconSize} color={iconColor} />
            <Text numberOfLines={1} style={styles.title}>
                {row.summary || row.path || t('timelineFileChanges')}
            </Text>
        </HStack>
    );
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
        gap: theme.space(2),
        opacity: 0.7,
    },
    pressed: {
        opacity: 0.9,
    },
    runningRow: {
        minHeight: theme.space(7),
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme.space(3),
    },
    runningLabel: {
        flex: 1,
        minWidth: 0,
        alignItems: 'center',
        gap: theme.space(2),
    },
    runningText: {
        flex: 1,
        minWidth: 0,
        color: theme.colors.text,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
        fontWeight: theme.fontWeight.semibold.fontWeight,
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
        color: theme.colors.text,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
    },
    meta: {
        alignItems: 'center',
        gap: theme.space(2),
        maxWidth: '54%',
    },
    statusText: {
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
    },
    details: {
        gap: theme.space(2),
    },
    pathList: {
        gap: theme.space(1),
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.lg,
        backgroundColor: theme.colors.surface,
        paddingVertical: theme.space(1),
    },
    pathRow: {
        alignItems: 'center',
        gap: theme.space(2),
        paddingHorizontal: theme.space(2.5),
        paddingVertical: theme.space(0.75),
    },
    pathText: {
        flex: 1,
        minWidth: 0,
        color: theme.colors.text,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
    },
    pathMore: {
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.xs.fontSize,
        lineHeight: theme.fontSize.xs.lineHeight,
        paddingHorizontal: theme.space(2.5),
        paddingVertical: theme.space(0.75),
    },
    outputFrame: {
        gap: theme.space(2),
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.lg,
        paddingHorizontal: theme.space(2.5),
        paddingVertical: theme.space(2),
    },
    outputLabel: {
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.xs.fontSize,
        lineHeight: theme.fontSize.xs.lineHeight,
    },
    outputBlock: {
        paddingBottom: theme.space(0.5),
    },
    outputText: {
        color: theme.colors.text,
        fontFamily: 'Menlo',
        fontSize: theme.fontSize.xs.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
    },
}));

const isRunningStatus = (status: string) => {
    return (
        status === 'in_progress' ||
        status === 'running' ||
        status === 'streaming' ||
        status === 'pending'
    );
};
