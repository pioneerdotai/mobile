import { useCallback, useEffect, useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import Stack from 'expo-router/js-stack';
import { useTranslation } from 'react-i18next';
import { useUnistyles } from 'react-native-unistyles';

import { CollapseButton } from '@/components/buttons/collapse';
import { useScreen } from '@/hooks/use-screen';
import SourceFileScreen from '@/screens/source-file';
import { releaseThreadFileIntent, resolveThreadFileIntent } from '@/services/thread-files/intent';

const normalizeRouteParam = (value: string | string[] | undefined): string | null => {
    const raw = Array.isArray(value) ? value[0] : value;
    const normalized = raw?.trim();
    return normalized ? normalized : null;
};

const SourceFileRoute = () => {
    const { t } = useTranslation('editor');
    const params = useLocalSearchParams<{ intent?: string | string[] }>();
    const intentId = normalizeRouteParam(params.intent);
    const intent = useMemo(() => (intentId ? resolveThreadFileIntent(intentId) : null), [intentId]);
    const [fileName, setFileName] = useState<string | null>(null);
    const { options } = useScreen();
    const { theme } = useUnistyles();
    const handleFileNameChange = useCallback((nextFileName: string) => {
        setFileName(nextFileName);
    }, []);

    const close = () => {
        if (router.canGoBack()) router.back();
        else router.navigate('/');
    };

    useEffect(() => {
        return () => {
            if (intentId) releaseThreadFileIntent(intentId);
        };
    }, [intentId]);

    return (
        <>
            <Stack.Screen
                options={{
                    ...options,
                    presentation: 'card',
                    animationTypeForReplace: 'pop',
                    cardOverlayEnabled: false,
                    headerMode: 'screen' as const,
                    headerShown: true,
                    title: fileName ?? t('fileViewerTitle'),
                    headerTransparent: true,
                    animation: 'slide_from_bottom',
                    headerStyle: {
                        ...options.headerStyle,
                        backgroundColor: 'transparent',
                    },
                    headerLeft: () => <CollapseButton onPressHandler={close} />,
                    cardStyle: {
                        ...options.cardStyle,
                        backgroundColor: theme.colors.background,
                    },
                }}
            />
            <SourceFileScreen
                intentId={intentId ?? 'missing'}
                intent={intent}
                onFileNameChange={handleFileNameChange}
            />
        </>
    );
};

export default SourceFileRoute;
