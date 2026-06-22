import {
    Check,
    ChevronDown,
    ChevronUp,
    Download,
    Globe2,
    Search,
    Terminal,
    TriangleAlert,
} from 'lucide-react-native';
import { Linking } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useTranslation } from 'react-i18next';

import type { TimelineRow } from '@/services/threads/conversation/timeline';
import { McpIcon } from '@/components/icons/mcp-icon';
import { HStack } from '@/components/primitives/hstack';
import { Pressable } from '@/components/primitives/pressable';
import { Text } from '@/components/primitives/text';
import { VStack } from '@/components/primitives/vstack';
import Spinner from '@/components/feedback/spinner';

import { BodyText } from './status';

type ToolCallRowProps = {
    row: Extract<TimelineRow, { type: 'tool-call' }>;
    expanded: boolean;
    mcpServerIdByName: Readonly<Record<string, string>>;
    onOpenMcpServer?: (serverId: string) => void;
    onToggle: () => void;
};

export const ToolCallRow = ({
    row,
    expanded,
    mcpServerIdByName,
    onOpenMcpServer,
    onToggle,
}: ToolCallRowProps) => {
    const { theme } = useUnistyles();
    const { t } = useTranslation('threads');

    const iconColor = theme.colors.typography;
    const isRunning = isRunningStatus(row.status);
    const hasDetail = !isRunning;
    const mcpServerIdToOpen =
        row.mcpServerId ??
        (row.mcpServerName ? (mcpServerIdByName[row.mcpServerName] ?? null) : null);
    const canOpenMcpServer =
        row.toolKind === 'dynamicToolCall' && !!mcpServerIdToOpen && !!onOpenMcpServer;
    const StatusIcon = row.successful ? Check : TriangleAlert;

    const openMcpServer = () => {
        if (mcpServerIdToOpen) {
            onOpenMcpServer?.(mcpServerIdToOpen);
        }
    };

    const iconSize = theme.space(4);
    const smallIconSize = theme.space(3.5);
    const mcpButtonIconSize = theme.space(3.75);

    if (isRunning) {
        return (
            <VStack style={styles.container}>
                <HStack style={styles.headerStatic}>
                    <ToolTitle
                        row={row}
                        iconColor={iconColor}
                        iconSize={iconSize}
                        running={isRunning}
                    />
                </HStack>
                <HStack style={styles.runningRow}>
                    <HStack style={styles.runningLabel}>
                        <Spinner size={theme.space(4)} color={iconColor} />
                        <Text numberOfLines={1} style={styles.runningText}>
                            {row.finalStatus}
                        </Text>
                    </HStack>
                    {!!row.elapsedLabel && (
                        <Text numberOfLines={1} style={styles.metaText}>
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
                <ToolTitle row={row} iconColor={iconColor} iconSize={iconSize} running={false} />
                <HStack style={styles.meta}>
                    {row.toolKind === 'webSearch' ? (
                        <Text numberOfLines={1} style={styles.metaText}>
                            {t('timelineResults', {
                                count: row.resultCount ?? row.results.length,
                            })}
                        </Text>
                    ) : row.toolKind === 'dynamicToolCall' ? (
                        <>
                            <StatusIcon size={smallIconSize} color={iconColor} />
                            <Text numberOfLines={1} style={styles.metaText}>
                                {row.finalStatus}
                            </Text>
                        </>
                    ) : null}
                    {!!row.elapsedLabel && (
                        <Text numberOfLines={1} style={styles.metaText}>
                            {row.elapsedLabel}
                        </Text>
                    )}
                    {expanded ? (
                        <ChevronUp size={iconSize} color={iconColor} />
                    ) : (
                        <ChevronDown size={iconSize} color={iconColor} />
                    )}
                </HStack>
            </Pressable>
            {hasDetail && expanded && (
                <VStack style={styles.details}>
                    {(row.toolKind === 'webFetch' || row.toolKind === 'download') && row.url ? (
                        <Pressable onPress={() => void Linking.openURL(row.url!)}>
                            <Text numberOfLines={2} style={styles.linkText}>
                                {row.url}
                            </Text>
                        </Pressable>
                    ) : row.toolKind === 'webFetch' || row.toolKind === 'download' ? (
                        <BodyText>{t('timelineNoUrlProvided')}</BodyText>
                    ) : null}
                    {(row.toolKind === 'webFetch' || row.toolKind === 'download') && (
                        <HStack style={styles.statusRow}>
                            <StatusIcon size={smallIconSize} color={iconColor} />
                            <Text style={styles.metaText}>{row.finalStatus}</Text>
                        </HStack>
                    )}
                    {row.toolKind === 'download' && row.bytes !== null && (
                        <Text style={styles.metaText}>
                            {t('timelineSize', { size: formatBytes(row.bytes) })}
                        </Text>
                    )}
                    {row.mcpDetails ? <DetailBlock title="MCP" text={row.mcpDetails} /> : null}
                    {row.argumentsText ? (
                        <DetailBlock title={t('timelineArguments')} text={row.argumentsText} mono />
                    ) : null}
                    {row.resultText ? (
                        <DetailBlock title={t('timelineResult')} text={row.resultText} />
                    ) : null}
                    {row.toolKind === 'dynamicToolCall' &&
                        !row.mcpDetails &&
                        !row.argumentsText &&
                        !row.resultText && <BodyText>{t('timelineNoDetails')}</BodyText>}
                    {canOpenMcpServer ? (
                        <Pressable
                            accessibilityRole="button"
                            onPress={openMcpServer}
                            style={({ pressed }) => [styles.mcpButton, pressed && styles.pressed]}
                        >
                            <McpIcon
                                size={mcpButtonIconSize}
                                color={theme.colors.text}
                                strokeWidth={2.3}
                            />
                            <Text style={styles.mcpButtonText}>{t('timelineOpenMcpServer')}</Text>
                        </Pressable>
                    ) : null}
                    {row.toolKind === 'webSearch' && row.results.length === 0 && (
                        <BodyText>{t('timelineNoSearchResults')}</BodyText>
                    )}
                    {row.toolKind === 'webSearch' && row.results.length > 0 && (
                        <VStack style={styles.resultList}>
                            {row.results.map((result, index) => (
                                <Pressable
                                    key={`${result.url}:${result.title}:${index}`}
                                    onPress={() => void Linking.openURL(result.url)}
                                    style={({ pressed }) => [
                                        styles.resultRow,
                                        pressed && styles.pressed,
                                    ]}
                                >
                                    <Text numberOfLines={1} style={styles.resultTitle}>
                                        {result.title}
                                    </Text>
                                    <Text numberOfLines={1} style={styles.resultSource}>
                                        {resultHostLabel(result.url)}
                                    </Text>
                                </Pressable>
                            ))}
                        </VStack>
                    )}
                </VStack>
            )}
        </VStack>
    );
};

const ToolTitle = ({
    row,
    iconColor,
    iconSize,
    running,
}: {
    row: Extract<TimelineRow, { type: 'tool-call' }>;
    iconColor: string;
    iconSize: number;
    running: boolean;
}) => {
    const { theme } = useUnistyles();
    const { t } = useTranslation('threads');

    return (
        <HStack style={styles.titleWrap}>
            {running && row.toolKind === 'dynamicToolCall' ? (
                <Spinner size={theme.space(4)} color={iconColor} />
            ) : (
                renderToolIcon(row.toolKind, iconColor, iconSize)
            )}
            <Text numberOfLines={1} style={styles.title}>
                {titleForTool(row, t)}
            </Text>
        </HStack>
    );
};

const DetailBlock = ({
    title,
    text,
    mono = false,
}: {
    title: string;
    text: string;
    mono?: boolean;
}) => {
    return (
        <VStack style={styles.detailBlock}>
            <Text style={styles.detailTitle}>{title}</Text>
            <Text selectable style={[styles.detailText, mono && styles.detailMono]}>
                {text}
            </Text>
        </VStack>
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
    headerStatic: {
        minHeight: theme.space(9),
        alignItems: 'center',
        gap: theme.space(2),
    },
    pressed: {
        opacity: 0.9,
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
        maxWidth: '56%',
        alignItems: 'center',
        gap: theme.space(2),
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
    details: {
        gap: theme.space(2),
    },
    statusRow: {
        alignItems: 'center',
        gap: theme.space(2),
    },
    linkText: {
        color: theme.colors.infoText,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
        textDecorationLine: 'underline',
    },
    metaRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.space(2),
    },
    metaText: {
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
    },
    detailBlock: {
        gap: theme.space(1.5),
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.lg,
        paddingHorizontal: theme.space(2.5),
        paddingVertical: theme.space(2),
    },
    detailTitle: {
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.xs.fontSize,
        lineHeight: theme.fontSize.xs.lineHeight,
        fontWeight: theme.fontWeight.bold.fontWeight,
    },
    detailText: {
        color: theme.colors.text,
        fontSize: theme.fontSize.xs.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
    },
    detailMono: {
        fontFamily: 'Menlo',
    },
    resultList: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.lg,
        backgroundColor: theme.colors.surface,
        overflow: 'hidden',
    },
    resultRow: {
        gap: theme.space(0.75),
        paddingHorizontal: theme.space(2.5),
        paddingVertical: theme.space(2),
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.surfaceMuted,
    },
    resultTitle: {
        color: theme.colors.text,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
        fontWeight: theme.fontWeight.bold.fontWeight,
    },
    resultSource: {
        color: theme.colors.infoText,
        fontSize: theme.fontSize.xs.fontSize,
        lineHeight: theme.fontSize.xs.lineHeight,
    },
    mcpButton: {
        alignSelf: 'flex-start',
        minHeight: theme.space(8.5),
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.background,
        paddingHorizontal: theme.space(2.5),
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.space(1.75),
    },
    mcpButtonText: {
        color: theme.colors.text,
        fontSize: theme.fontSize.sm.fontSize,
        fontWeight: theme.fontWeight.extrabold.fontWeight,
    },
}));

const renderToolIcon = (
    toolKind: Extract<TimelineRow, { type: 'tool-call' }>['toolKind'],
    color: string,
    size: number,
) => {
    switch (toolKind) {
        case 'webSearch':
            return <Search size={size} color={color} />;
        case 'webFetch':
            return <Globe2 size={size} color={color} />;
        case 'download':
            return <Download size={size} color={color} />;
        default:
            return <Terminal size={size} color={color} />;
    }
};

const titleForTool = (
    row: Extract<TimelineRow, { type: 'tool-call' }>,
    t: (key: string) => string,
) => {
    switch (row.toolKind) {
        case 'webSearch':
            return row.detail || t('timelineWebSearchTitle');
        case 'webFetch':
        case 'download':
            return row.host || row.title || t('timelineWebTitle');
        default:
            return row.title || t('timelineToolTitle');
    }
};

const formatBytes = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let value = bytes;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit += 1;
    }

    if (unit === 0) {
        return `${bytes} ${units[unit]}`;
    }

    return value % 1 < 0.05
        ? `${value.toFixed(0)} ${units[unit]}`
        : `${value.toFixed(1)} ${units[unit]}`;
};

const isRunningStatus = (status: string) => {
    return (
        status === 'in_progress' ||
        status === 'running' ||
        status === 'streaming' ||
        status === 'pending'
    );
};

const hostFromUrl = (value: string): string | null => {
    return parseHostFromUrl(value) ?? parseHostFromUrl(`https://${value}`);
};

const parseHostFromUrl = (value: string): string | null => {
    try {
        return new URL(value).host || null;
    } catch {
        return null;
    }
};

const resultHostLabel = (url: string) => {
    return hostFromUrl(url) ?? url;
};
