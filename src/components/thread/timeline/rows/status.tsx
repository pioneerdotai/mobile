import { type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useTranslation } from 'react-i18next';

import { Box } from '@/components/primitives/box';
import { Text } from '@/components/primitives/text';
import { VStack } from '@/components/primitives/vstack';
import { TIMELINE_CARD_VERTICAL_MARGIN_UNITS } from '../timeline-grouping';

export type TimelineTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'active';

type TimelineCardProps = {
    tone?: TimelineTone;
    children: ReactNode;
    style?: StyleProp<ViewStyle>;
};

type StatusPillProps = {
    status: string;
    tone?: TimelineTone;
};

type ToneThemeColors = {
    border: string;
    surface: string;
    textMuted: string;
    infoText: string;
    infoSurface: string;
    infoBorder: string;
    successText: string;
    successSurface: string;
    successBorder: string;
    warningText: string;
    warningSurface: string;
    warningBorder: string;
    dangerText: string;
    dangerSurface: string;
    dangerBorder: string;
};

const toneColors = (colors: ToneThemeColors, tone: TimelineTone) => {
    switch (tone) {
        case 'info':
            return { border: colors.infoBorder, bg: colors.infoSurface, fg: colors.infoText };
        case 'success':
            return {
                border: colors.successBorder,
                bg: colors.successSurface,
                fg: colors.successText,
            };
        case 'warning':
            return {
                border: colors.warningBorder,
                bg: colors.warningSurface,
                fg: colors.warningText,
            };
        case 'danger':
            return { border: colors.dangerBorder, bg: colors.dangerSurface, fg: colors.dangerText };
        case 'active':
            return { border: colors.infoBorder, bg: colors.infoSurface, fg: colors.infoText };
        case 'neutral':
        default:
            return { border: colors.border, bg: colors.surface, fg: colors.textMuted };
    }
};

export const TimelineCard = ({ tone = 'neutral', children, style }: TimelineCardProps) => {
    return <VStack style={[styles.card, styles.toneCard(tone), style]}>{children}</VStack>;
};

export const StatusPill = ({ status, tone = toneFromStatus(status) }: StatusPillProps) => {
    const { t } = useTranslation('threads');

    return (
        <Box style={[styles.pill, styles.tonePill(tone)]}>
            <Text numberOfLines={1} style={[styles.pillText, styles.tonePillText(tone)]}>
                {formatStatus(status, t)}
            </Text>
        </Box>
    );
};

export const HeaderText = ({ children }: { children: ReactNode }) => {
    return (
        <Text numberOfLines={1} style={styles.headerText}>
            {children}
        </Text>
    );
};

export const BodyText = ({ children, mono = false }: { children: ReactNode; mono?: boolean }) => {
    return (
        <Text
            selectable
            numberOfLines={mono ? 6 : undefined}
            style={[styles.bodyText, mono && styles.monoText]}
        >
            {children}
        </Text>
    );
};

export const toneFromStatus = (status: string): TimelineTone => {
    const normalized = status.toLowerCase();
    if (
        normalized.includes('fail') ||
        normalized.includes('error') ||
        normalized.includes('cancel') ||
        normalized.includes('exhaust')
    ) {
        return 'danger';
    }
    if (
        normalized.includes('warn') ||
        normalized.includes('timeout') ||
        normalized.includes('retry')
    ) {
        return 'warning';
    }
    if (
        normalized.includes('running') ||
        normalized.includes('stream') ||
        normalized.includes('pending') ||
        normalized.includes('sending') ||
        normalized.includes('cancelling')
    ) {
        return 'active';
    }
    if (
        normalized.includes('complete') ||
        normalized.includes('success') ||
        normalized.includes('ready') ||
        normalized.includes('idle')
    ) {
        return 'success';
    }
    return 'neutral';
};

export const formatStatus = (status: string, t?: (key: string) => string) => {
    const normalized = status.toLowerCase();

    if (t) {
        switch (normalized) {
            case 'unsupported':
                return t('timelineUnsupported');
            case 'cancelled':
            case 'canceled':
                return t('timelineCancelled');
            case 'failed':
            case 'failure':
                return t('timelineFailed');
            case 'completed':
            case 'complete':
                return t('timelineCompleted');
            case 'running':
            case 'streaming':
            case 'pending':
                return t('timelineRunningTool');
            default:
                break;
        }
    }

    return status
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/[_-]/g, ' ')
        .trim();
};

export const useToneColor = (tone: TimelineTone) => {
    const { theme } = useUnistyles();

    return toneColors(theme.colors, tone).fg;
};

const styles = StyleSheet.create((theme) => ({
    card: {
        width: '100%',
        maxWidth: '100%',
        borderWidth: 1,
        borderRadius: theme.radius.lg,
        marginVertical: theme.space(TIMELINE_CARD_VERTICAL_MARGIN_UNITS),
        paddingHorizontal: theme.space(3),
        paddingVertical: theme.space(2.5),
        gap: theme.space(2),
    },
    toneCard: (tone: TimelineTone) => {
        const colors = toneColors(theme.colors, tone);

        return {
            borderColor: colors.border,
            backgroundColor: colors.bg,
        };
    },
    pill: {
        maxWidth: theme.space(33),
        minHeight: theme.space(6),
        justifyContent: 'center',
        borderWidth: 1,
        borderRadius: theme.radius.full,
        paddingHorizontal: theme.space(2),
    },
    tonePill: (tone: TimelineTone) => {
        const colors = toneColors(theme.colors, tone);

        return {
            backgroundColor: colors.bg,
            borderColor: colors.border,
        };
    },
    pillText: {
        fontSize: theme.fontSize.xs.fontSize,
        lineHeight: theme.fontSize.xs.lineHeight,
        fontWeight: theme.fontWeight.semibold.fontWeight,
        textTransform: 'capitalize',
    },
    tonePillText: (tone: TimelineTone) => ({
        color: toneColors(theme.colors, tone).fg,
    }),
    headerText: {
        flex: 1,
        minWidth: 0,
        color: theme.colors.text,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
        fontWeight: theme.fontWeight.semibold.fontWeight,
    },
    bodyText: {
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
    },
    monoText: {
        fontFamily: 'monospace',
        color: theme.colors.text,
    },
}));
