import { router } from 'expo-router';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useTranslation } from 'react-i18next';

import { CollapseButton } from '@/components/buttons/collapse';
import { Text } from '@/components/primitives/text';
import { VStack } from '@/components/primitives/vstack';
import { useScreen } from '@/hooks/use-screen';

type AgentsDocHeaderState = {
    label: string;
    danger: boolean;
};

type UseAgentsDocScreenParams = {
    onClose: () => void;
    saveStatus: AgentsDocHeaderState | null;
};

const useAgentsDocScreen = ({ onClose, saveStatus }: UseAgentsDocScreenParams) => {
    const { options } = useScreen();
    const { theme } = useUnistyles();
    const { t } = useTranslation('editor');

    const close = () => {
        if (onClose) {
            onClose();
            return;
        }

        if (router.canGoBack()) router.back();
        else router.navigate('/');
    };

    const title = () => (
        <VStack style={styles.titleContainer}>
            <Text style={styles.title}>{t('agentsDoc')}</Text>
            <Text
                numberOfLines={1}
                style={[styles.status, saveStatus?.danger ? styles.statusDanger : null]}
            >
                {saveStatus?.label ?? t('clean')}
            </Text>
        </VStack>
    );

    return {
        options: {
            ...options,
            presentation: 'card' as const,
            animationTypeForReplace: 'pop' as const,
            cardOverlayEnabled: false,
            animation: 'slide_from_bottom' as const,
            headerMode: 'screen' as const,
            headerShown: true,
            headerTitle: title,
            headerTransparent: true,
            headerStyle: {
                ...options.headerStyle,
                backgroundColor: 'transparent',
            },
            headerLeft: () => <CollapseButton onPressHandler={close} />,
            cardStyle: {
                ...options.cardStyle,
                backgroundColor: theme.colors.background,
            },
        },
    };
};

const styles = StyleSheet.create((theme) => ({
    titleContainer: {
        alignItems: 'center',
        maxWidth: '100%',
        paddingTop: theme.space(1),
    },
    title: {
        fontSize: theme.fontSize.lg.fontSize,
        lineHeight: theme.fontSize.lg.fontSize,
        color: theme.colors.typography,
        fontWeight: theme.fontWeight.semibold.fontWeight,
    },
    status: {
        maxWidth: theme.space(44),
        color: theme.colors.typography,
        fontSize: theme.fontSize.xs.fontSize,
        lineHeight: theme.fontSize.xs.lineHeight,
        opacity: 0.6,
        textAlign: 'center',
    },
    statusDanger: {
        color: theme.colors.dangerText,
        opacity: 1,
    },
}));

export type { AgentsDocHeaderState };
export { useAgentsDocScreen };
