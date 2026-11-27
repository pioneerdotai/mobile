import { dispatchNavigation, navigationSnapshot } from '@/client/navigation';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useUnistyles } from 'react-native-unistyles';

import { ActionsButton } from '@/components/buttons/actions';
import { CollapseButton } from '@/components/buttons/collapse';
import { BackButton } from '@/components/buttons/back';
import { View } from 'react-native';
import {
    CallBanner,
    CALL_BANNER_HEIGHT,
    ThreadCallButton,
    useCallBanner,
} from '@/components/calls';
import type { CallTarget } from '@/services/calls/gateway';
import { useScreen } from '@/hooks/use-screen';

type ThreadScreenNavigation = 'modal' | 'stack';

type UseThreadScreenOptions = {
    navigation?: ThreadScreenNavigation;
    threadId?: string | null;
    backToInbox?: boolean;
    onActionsPress?: () => void;
    callTarget?: CallTarget | null;
};

const useThreadScreen = ({
    navigation = 'modal',
    backToInbox = false,
    threadId: explicitThreadId,
    onActionsPress,
    callTarget,
}: UseThreadScreenOptions = {}) => {
    const { options } = useScreen();
    const { theme, rt } = useUnistyles();
    const { t } = useTranslation('threads');
    const params = useLocalSearchParams<{
        parentThreadId?: string | string[];
        threadId?: string | string[];
    }>();
    const parentThreadId = normalizeRouteParam(params.parentThreadId);
    const threadId = explicitThreadId ?? normalizeRouteParam(params.threadId);
    const isTaskChildThread = Boolean(parentThreadId);
    const showCallBanner = useCallBanner();
    const top = rt?.insets.top ?? 0;

    const handleBack = () => {
        if (router.canGoBack()) router.back();
        else router.navigate('/');
    };

    const handleTaskBack = () => {
        const parent = navigationSnapshot()?.lineage.at(-1)?.parent_thread_id ?? parentThreadId;
        dispatchNavigation({ kind: 'pop_task_thread' });
        if (parent) {
            if (router.canGoBack()) {
                router.back();
            } else {
                router.replace({
                    pathname: '/thread/[threadId]',
                    params: { threadId: parent },
                });
            }
            return;
        }

        handleBack();
    };

    const headerLeft = () =>
        isTaskChildThread ? (
            <BackButton variant="secondary" onPressHandler={handleTaskBack} />
        ) : backToInbox ? (
            <BackButton variant="secondary" onPressHandler={handleBack} />
        ) : (
            <CollapseButton variant="secondary" onPressHandler={handleBack} />
        );
    const headerRight = () => (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {callTarget && <ThreadCallButton target={callTarget} />}
            {onActionsPress && !isTaskChildThread && threadId && (
                <ActionsButton
                    accessibilityLabel={t('threadActions')}
                    onPressHandler={onActionsPress}
                    variant="secondary"
                />
            )}
        </View>
    );

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
            headerStyle: showCallBanner
                ? { height: theme.screenHeaderHeight() + CALL_BANNER_HEIGHT }
                : { ...options.headerStyle, backgroundColor: 'transparent' },
            headerLeft,
            headerRight,
            header: showCallBanner
                ? () => (
                      <View style={{ paddingTop: top, backgroundColor: theme.colors.background }}>
                          <CallBanner />
                          <View
                              style={{
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  paddingHorizontal: 16,
                                  height: Math.max(44, theme.screenHeaderHeight() - top),
                              }}
                          >
                              {headerLeft()}
                              {headerRight()}
                          </View>
                      </View>
                  )
                : undefined,
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
