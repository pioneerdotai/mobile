import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useUnistyles } from 'react-native-unistyles';

import { ActionsButton } from '@/components/buttons/actions';
import { CollapseButton } from '@/components/buttons/collapse';
import { useScreen } from '@/hooks/use-screen';

type ThreadScreenNavigation = 'modal' | 'stack';

type UseThreadScreenOptions = {
    navigation?: ThreadScreenNavigation;
    threadId?: string | null;
    onActionsPress?: () => void;
};

const useThreadScreen = ({
    navigation = 'modal',
    threadId: explicitThreadId,
    onActionsPress,
}: UseThreadScreenOptions = {}) => {
    const { options } = useScreen();
    const { theme } = useUnistyles();
    const { t } = useTranslation('threads');
    const params = useLocalSearchParams<{
        parentThreadId?: string | string[];
        threadId?: string | string[];
    }>();
    const parentThreadId = normalizeRouteParam(params.parentThreadId);
    const threadId = explicitThreadId ?? normalizeRouteParam(params.threadId);
    const isTaskChildThread = Boolean(parentThreadId);

    const handleBack = () => {
        if (router.canGoBack()) router.back();
        else router.navigate('/');
    };

    const handleTaskBack = () => {
        if (parentThreadId) {
            if (router.canGoBack()) {
                router.back();
            } else {
                router.replace({
                    pathname: '/thread/[threadId]',
                    params: { threadId: parentThreadId },
                });
            }
            return;
        }

        handleBack();
    };

    return {
        name: 'index',
        options: {
            ...options,
            presentation: 'card' as const,
            animationTypeForReplace: 'pop' as const,
            cardOverlayEnabled: false,
            headerMode: 'screen' as const,
            headerShown: true,
            headerTitle: () => null,
            headerTransparent: true,
            animation:
                navigation === 'stack'
                    ? ('slide_from_right' as const)
                    : ('slide_from_bottom' as const),
            headerStyle: {
                ...options.headerStyle,
                backgroundColor: 'transparent',
            },
            headerLeft: () =>
                isTaskChildThread ? (
                    <CollapseButton icon="left" onPressHandler={handleTaskBack} />
                ) : (
                    <CollapseButton onPressHandler={handleBack} />
                ),
            headerRight: () =>
                onActionsPress && !isTaskChildThread && threadId ? (
                    <ActionsButton
                        accessibilityLabel={t('threadActions')}
                        onPressHandler={onActionsPress}
                    />
                ) : null,
            cardStyle: {
                ...options.cardStyle,
                backgroundColor: theme.colors.background,
            },
        },
    };
};

const normalizeRouteParam = (value: string | string[] | undefined): string | null => {
    const raw = Array.isArray(value) ? value[0] : value;
    const normalized = raw?.trim();
    return normalized ? normalized : null;
};

export { useThreadScreen };
