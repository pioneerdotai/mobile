import type { ReactNode } from 'react';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import type { ComposerCapability } from '@/client';
import Spinner from '@/components/feedback/spinner';
import { Box } from '@/components/primitives/box';
import { HStack } from '@/components/primitives/hstack';
import { Input } from '@/components/primitives/input';
import { Text } from '@/components/primitives/text';
import { VStack } from '@/components/primitives/vstack';
import { stableOutlineWidth } from '@/helpers/styles';

export type LoadState = {
    loading: boolean;
    error: string | null;
};

export const selectedCapabilityKeys = (capabilities: ComposerCapability[]): string[] => {
    return capabilities.map((capability) => capability.id);
};

export const isMcpComposerCapability = (capability: ComposerCapability): boolean => {
    return 'McpServer' in capability.kind || 'McpTool' in capability.kind;
};

export const ListHeader = ({
    value,
    placeholder,
    onChangeText,
}: {
    value: string;
    placeholder: string;
    onChangeText: (value: string) => void;
}) => {
    const { theme } = useUnistyles();

    return (
        <VStack style={styles.listHeader}>
            <Input
                value={value}
                placeholder={placeholder}
                placeholderTextColor={theme.colors.textMuted}
                onChangeText={onChangeText}
                autoCorrect={false}
                autoCapitalize="none"
                style={styles.searchInput}
            />
        </VStack>
    );
};

export const ListState = ({
    loading,
    loadingLabel,
    error,
    empty,
    emptyLabel,
}: {
    loading: boolean;
    loadingLabel: string;
    error: string | null;
    empty: boolean;
    emptyLabel: string;
}) => {
    const { theme } = useUnistyles();

    if (loading) {
        return (
            <HStack style={styles.listState}>
                <Spinner size={theme.space(4)} color={theme.colors.typography} />
                <Text style={styles.listStateText}>{loadingLabel}</Text>
            </HStack>
        );
    }

    if (error) {
        return <Text style={styles.errorText}>{error}</Text>;
    }

    if (empty) {
        return <Text style={styles.listStateText}>{emptyLabel}</Text>;
    }

    return null;
};

export const SectionHeader = ({ first, title }: { first: boolean; title: string }) => {
    return (
        <Text style={[styles.sectionLabel, first ? styles.sectionLabelFirst : null]}>{title}</Text>
    );
};

export const CapabilityCard = ({
    children,
    first,
    last,
    separator,
}: {
    children: ReactNode;
    first: boolean;
    last: boolean;
    separator: boolean;
}) => {
    return (
        <Box
            style={[
                styles.listRowCard,
                first ? styles.listRowCardFirst : null,
                last ? styles.listRowCardLast : null,
            ]}
        >
            {children}
            {separator ? <Box style={styles.listRowSeparator} /> : null}
        </Box>
    );
};

export const Check = () => <Box style={styles.checkContainer}></Box>;

export const styles = StyleSheet.create((theme, rt) => ({
    screen: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    listContent: {
        paddingHorizontal: rt.insets.left + theme.space(4),
        paddingTop: theme.screenContentPadding('editor').paddingTop,
        paddingRight: rt.insets.right + theme.space(4),
        paddingBottom: rt.insets.bottom + theme.space(5),
    },
    listHeader: {
        paddingBottom: theme.space(4),
    },
    searchInput: {
        minHeight: theme.space(12),
        borderRadius: theme.radius['2xl'],
        backgroundColor: theme.colors.muted,
        color: theme.colors.typography,
        paddingHorizontal: theme.space(4),
        fontSize: theme.fontSize.default.fontSize,
    },
    listState: {
        minHeight: theme.space(12),
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.space(2),
    },
    listStateText: {
        color: theme.colors.textMuted,
        textAlign: 'center',
        fontSize: theme.fontSize.default.fontSize,
        lineHeight: theme.fontSize.default.lineHeight,
    },
    errorText: {
        color: theme.colors.dangerText,
        textAlign: 'center',
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
        fontWeight: theme.fontWeight.medium.fontWeight,
    },
    sectionLabel: {
        paddingHorizontal: theme.space(1),
        paddingTop: theme.space(4),
        paddingBottom: theme.space(1),
        color: theme.colors.typography,
        opacity: 0.6,
        fontSize: theme.fontSize.xs.fontSize,
        lineHeight: theme.fontSize.xs.lineHeight,
        fontWeight: theme.fontWeight.medium.fontWeight,
    },
    sectionLabelFirst: {
        paddingTop: 0,
    },
    listRowCard: {
        backgroundColor: theme.colors.muted,
    },
    listRowCardFirst: {
        borderTopLeftRadius: theme.radius['3xl'],
        borderTopRightRadius: theme.radius['3xl'],
        overflow: 'hidden',
    },
    listRowCardLast: {
        borderBottomLeftRadius: theme.radius['3xl'],
        borderBottomRightRadius: theme.radius['3xl'],
        overflow: 'hidden',
    },
    listRowSeparator: {
        height: stableOutlineWidth,
        marginHorizontal: theme.space(4),
        backgroundColor: theme.colors.border,
    },
    listRow: {
        minHeight: theme.space(14),
        paddingHorizontal: theme.space(4),
        paddingVertical: theme.space(2.5),
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme.space(3),
    },
    rowMainButton: {
        flex: 1,
        minWidth: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.space(3),
    },
    toolRow: {
        paddingLeft: theme.space(4),
    },
    disabledRow: {
        opacity: 0.45,
    },
    rowIcon: {
        width: theme.space(8),
        height: theme.space(8),
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: theme.radius.full,
        backgroundColor: theme.colors.background,
        flexShrink: 0,
    },
    rowTextWrap: {
        flex: 1,
        minWidth: 0,
        gap: theme.space(0.5),
    },
    listRowTitle: {
        flexShrink: 1,
        color: theme.colors.typography,
        fontSize: theme.fontSize.default.fontSize,
        lineHeight: theme.fontSize.default.lineHeight,
        fontWeight: theme.fontWeight.medium.fontWeight,
    },
    listRowDescription: {
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
    },
    selectButton: {
        width: theme.space(8),
        height: theme.space(8),
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: theme.radius.full,
        borderWidth: stableOutlineWidth,
        borderColor: theme.colors.border,
        flexShrink: 0,
    },
    selectButtonSelected: {
        borderColor: 'transparent',
    },
    toolsButton: {
        width: theme.space(8),
        height: theme.space(8),
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: theme.radius.full,
        marginRight: -theme.space(1.5),
    },
    checkContainer: {
        height: theme.space(5),
        width: theme.space(5),
        borderRadius: theme.radius.full,
        backgroundColor: theme.colors.foreground,
    },
}));
