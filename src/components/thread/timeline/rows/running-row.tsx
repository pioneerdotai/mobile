import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import type { TimelineRow } from '@/services/threads/conversation/timeline';
import { HStack } from '@/components/primitives/hstack';
import { Text } from '@/components/primitives/text';

const DINO_DARK = require('../../../../../assets/images/dino-dark.webp');
const DINO_LIGHT = require('../../../../../assets/images/dino-light.webp');

type RunningRowProps = {
    row: Extract<TimelineRow, { type: 'running' }>;
};

export const RunningRow = ({ row }: RunningRowProps) => {
    const { t } = useTranslation('threads');
    const { rt } = useUnistyles();
    const dinoSource = rt.themeName === 'dark' ? DINO_DARK : DINO_LIGHT;

    return (
        <HStack style={styles.wrap}>
            <HStack style={styles.labelGroup}>
                <Image contentFit="contain" source={dinoSource} style={styles.dino} autoplay />
                <Text numberOfLines={1} style={styles.title}>
                    {t('timelineRunning')}
                </Text>
            </HStack>
            {!!row.elapsedLabel && (
                <Text numberOfLines={1} style={styles.meta}>
                    {row.elapsedLabel}
                </Text>
            )}
        </HStack>
    );
};

const styles = StyleSheet.create((theme) => ({
    wrap: {
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme.space(4),
        paddingTop: theme.space(5),
        paddingBottom: theme.space(2),
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
        fontSize: theme.fontSize.sm.fontSize,
        fontWeight: theme.fontWeight.semibold.fontWeight,
    },
}));
