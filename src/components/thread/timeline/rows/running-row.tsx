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

const DINO_DARK = require('../../../../../assets/images/dino-dark.webp');
const DINO_LIGHT = require('../../../../../assets/images/dino-light.webp');

type RunningRowProps = {
    row: Extract<TimelineRow, { type: 'running' }>;
};

type RunningActivityContentProps = {
    elapsedLabel: string | null;
};

export const RunningRow = ({ row }: RunningRowProps) => {
    return (
        <VStack style={styles.wrap}>
            <RunningActivityContent elapsedLabel={row.elapsedLabel} />
            {row.securitySummary ? <RunningSecuritySummary summary={row.securitySummary} /> : null}
        </VStack>
    );
};

export const RunningActivityContent = ({ elapsedLabel }: RunningActivityContentProps) => {
    const { t } = useTranslation('threads');
    const { rt } = useUnistyles();
    const dinoSource = rt.themeName === 'dark' ? DINO_DARK : DINO_LIGHT;

    return (
        <HStack style={styles.mainRow}>
            <HStack style={styles.labelGroup}>
                <Image contentFit="contain" source={dinoSource} style={styles.dino} autoplay />
                <Text numberOfLines={1} style={styles.title}>
                    {t('timelineRunning')}
                </Text>
            </HStack>
            {!!elapsedLabel && (
                <Text numberOfLines={1} style={styles.meta}>
                    {elapsedLabel}
                </Text>
            )}
        </HStack>
    );
};

const RunningSecuritySummary = ({ summary }: { summary: ClientTurnSecuritySummary }) => {
    const { t } = useTranslation('threads');
    const { theme } = useUnistyles();
    const translate = (key: string, options?: Record<string, unknown>) => String(t(key, options));
    const diagnostics = securityDiagnosticRows(summary, translate).slice(0, 2);
    const iconColor = securityTint(summary, theme.colors);

    return (
        <VStack style={styles.securityWrap}>
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
        paddingBottom: theme.space(2),
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
        gap: theme.space(4),
    },
    dino: {
        width: theme.space(8),
        height: theme.space(8),
    },
    title: {
        flexShrink: 1,
        fontSize: theme.fontSize.sm.fontSize,
        fontWeight: theme.fontWeight.semibold.fontWeight,
    },
    meta: {
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.sm.fontSize,
        fontWeight: theme.fontWeight.semibold.fontWeight,
    },
    securityWrap: {
        alignSelf: 'flex-start',
        maxWidth: '100%',
        gap: theme.space(1),
        paddingLeft: theme.space(12),
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
