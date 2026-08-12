import { router, useLocalSearchParams } from 'expo-router';
import Stack from 'expo-router/js-stack';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUnistyles } from 'react-native-unistyles';

import { BackButton } from '@/components/buttons/back';
import { CreateButton } from '@/components/buttons/create';
import { useScreen } from '@/hooks/use-screen';
import ThreadMembersScreen from '@/screens/thread-members';

const normalizeRouteParam = (value: string | string[] | undefined): string | null => {
    const raw = Array.isArray(value) ? value[0] : value;
    const normalized = raw?.trim();
    return normalized ? normalized : null;
};

const ThreadMembersRoute = () => {
    const params = useLocalSearchParams<{ threadId?: string | string[] }>();
    const threadId = normalizeRouteParam(params.threadId);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [canAddMember, setCanAddMember] = useState(false);
    const { t } = useTranslation('threads');
    const { options } = useScreen();
    const { theme } = useUnistyles();

    const close = useCallback(() => {
        if (router.canGoBack()) router.back();
        else router.navigate('/');
    }, []);
    const openPicker = useCallback(() => setPickerOpen(true), []);
    const closePicker = useCallback(() => setPickerOpen(false), []);

    return (
        <>
            <Stack.Screen
                options={{
                    ...options,
                    headerShown: true,
                    headerMode: 'screen',
                    headerTransparent: true,
                    headerTitle: () => null,
                    headerStyle: {
                        ...options.headerStyle,
                        backgroundColor: 'transparent',
                    },
                    headerLeft: () => <BackButton onPressHandler={close} />,
                    headerRight: () =>
                        threadId && canAddMember ? (
                            <CreateButton
                                accessibilityLabel={t('members.add')}
                                onPressHandler={openPicker}
                            />
                        ) : null,
                    cardStyle: {
                        ...options.cardStyle,
                        backgroundColor: theme.colors.background,
                    },
                }}
            />
            {threadId ? (
                <ThreadMembersScreen
                    threadId={threadId}
                    pickerOpen={pickerOpen}
                    onPickerClose={closePicker}
                    onCanAddMemberChange={setCanAddMember}
                />
            ) : null}
        </>
    );
};

export default ThreadMembersRoute;
