import { Image } from 'expo-image';
import { ShieldAlert, ShieldCheck, ShieldX } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import type { ClientTurnSecuritySummary } from '@/client/generated/client_turn_security_summary';
import type { TimelineRow } from '@/services/threads/conversation/timeline';
import {
    securityDiagnosticRows,
    securitySummaryLabel,
} from '@/services/threads/conversation/security';
import { HStack } from '@/components/primitives/hstack';
import { Text } from '@/components/primitives/text';
import { VStack } from '@/components/primitives/vstack';
import { TIMELINE_RUNNING_ROW_BOTTOM_PADDING_UNITS } from '../timeline-grouping';

const DINO_DARK = require('../../../../../assets/images/dino-dark.webp');
const DINO_LIGHT = require('../../../../../assets/images/dino-light.webp');

type RunningRowProps = {
    row: Extract<TimelineRow, { type: 'running' }>;
    showDino?: boolean;
};

type RunningActivityContentProps = {
    elapsedLabel: string | null;
    showDino?: boolean;
};

export const RunningRow = ({ row, showDino = true }: RunningRowProps) => {
    return (
        <VStack style={styles.wrap}>
            <RunningActivityContent elapsedLabel={row.elapsedLabel} showDino={showDino} />
            {row.securitySummary ? (
                <RunningSecuritySummary summary={row.securitySummary} indent={showDino} />
            ) : null}
        </VStack>
    );
};

export const RunningActivityContent = ({
    elapsedLabel,
    showDino = true,
}: RunningActivityContentProps) => {
    const { t } = useTranslation('threads');
    const { rt } = useUnistyles();
    const dinoSource = rt.themeName === 'dark' ? DINO_DARK : DINO_LIGHT;

    return (
        <HStack style={styles.mainRow}>
            <HStack style={styles.labelGroup}>
                {showDino ? (
                    <Image contentFit="contain" source={dinoSource} style={styles.dino} autoplay />
                ) : null}
                <Text numberOfLines={1} style={styles.title(showDino)}>
                    {t('timelineRunning')}
                </Text>
            </HStack>
            {!!elapsedLabel && (
                <Text numberOfLines={1} style={styles.meta(showDino)}>
                    {elapsedLabel}
                </Text>
            )}
        </HStack>
    );
};

const RunningSecuritySummary = ({
    summary,
    indent,
}: {
    summary: ClientTurnSecuritySummary;
    indent: boolean;
}) => {
    const { t } = useTranslation('threads');
    const { theme } = useUnistyles();
    const translate = (key: string, options?: Record<string, unknown>) => String(t(key, options));
    const diagnostics = securityDiagnosticRows(summary, translate).slice(0, 2);
    const iconColor = securityTint(summary, theme.colors);

    return (
        <VStack style={[styles.securityWrap, !indent && styles.securityWrapWithoutDino]}>
            <HStack style={[styles.securityBadge, styles.securityTone(summary.enforcement)]}>
                <SecurityIcon summary={summary} size={theme.space(3.5)} color={iconColor} />
                <Text numberOfLines={1} style={[styles.securityText, { color: iconColor }]}>
                    {securitySummaryLabel(summary, translate)}
                </Text>
            </HStack>
            {diagnostics.map((diagnostic) => (
                <Text
                    key={`${diagnostic.capability}:${diagnostic.message}`}
                    numberOfLines={1}
                    style={styles.securityDiagnostic}
                >
                    {diagnostic.label}: {diagnostic.message}
                </Text>
            ))}
        </VStack>
    );
};

const SecurityIcon = ({
    color,
    size,
    summary,
}: {
    color: string;
    size: number;
    summary: ClientTurnSecuritySummary;
}) => {
    switch (summary.enforcement) {
        case 'unavailable':
            return <ShieldX size={size} color={color} />;
        case 'degraded':
            return <ShieldAlert size={size} color={color} />;
        case 'active':
            switch (summary.filesystem_access) {
                case 'unrestricted':
                    return <ShieldCheck size={size} color={color} />;
                case 'read_only':
                    return <ShieldX size={size} color={color} />;
                case 'workspace_write':
                    return <ShieldAlert size={size} color={color} />;
            }
    }
};

const securityTint = (
    summary: ClientTurnSecuritySummary,
    colors: {
        dangerText: string;
        successText: string;
        textMuted: string;
        warningText: string;
    },
) => {
    if (summary.enforcement === 'unavailable') {
        return colors.dangerText;
    }
    if (summary.enforcement === 'degraded' || summary.filesystem_access === 'workspace_write') {
        return colors.warningText;
    }
    if (summary.filesystem_access === 'unrestricted') {
        return colors.successText;
    }
    return colors.textMuted;
};

const styles = StyleSheet.create((theme) => ({
    wrap: {
        gap: theme.space(2),
        paddingTop: theme.space(5),
        paddingBottom: theme.space(TIMELINE_RUNNING_ROW_BOTTOM_PADDING_UNITS),
    },
    mainRow: {
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme.space(4),
    },
    labelGroup: {
        flex: 1,
        minWidth: 0,
        alignItems: 'center',
        gap: theme.space(3),
    },
    dino: {
        width: theme.space(8),
        height: theme.space(8),
    },
    title: (showDino) => ({
        flexShrink: 1,
        fontSize: theme.fontSize.sm.fontSize,
        fontWeight: theme.fontWeight.semibold.fontWeight,
        marginBottom: !showDino ? theme.space(0.5) : 0,
        paddingLeft: !showDino ? theme.space(1.5) : 0,
    }),
    meta: (showDino) => ({
        color: theme.colors.typography,
        fontSize: theme.fontSize.sm.fontSize,
        fontWeight: theme.fontWeight.semibold.fontWeight,
        marginBottom: !showDino ? theme.space(0.5) : 0,
    }),
    securityWrap: {
        alignSelf: 'flex-start',
        maxWidth: '100%',
        gap: theme.space(1),
        paddingLeft: theme.space(12),
    },
    securityWrapWithoutDino: {
        paddingLeft: 0,
    },
    securityBadge: {
        alignItems: 'center',
        alignSelf: 'flex-start',
        maxWidth: '100%',
        gap: theme.space(1.5),
        borderRadius: theme.radius.full,
        paddingHorizontal: theme.space(2),
        paddingVertical: theme.space(1),
    },
    securityTone: (status: ClientTurnSecuritySummary['enforcement']) => ({
        backgroundColor:
            status === 'unavailable'
                ? theme.colors.dangerSurface
                : status === 'degraded'
                  ? theme.colors.warningSurface
                  : theme.colors.surfaceMuted,
    }),
    securityText: {
        flexShrink: 1,
        fontSize: theme.fontSize.xs.fontSize,
        fontWeight: theme.fontWeight.medium.fontWeight,
        lineHeight: theme.fontSize.xs.lineHeight,
    },
    securityDiagnostic: {
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.xs.fontSize,
        lineHeight: theme.fontSize.xs.lineHeight,
    },
}));
