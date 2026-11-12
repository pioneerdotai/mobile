import { useEffect, useRef } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import type { Href } from 'expo-router';
import { useInboxScope } from '@/services/tasks/inbox-scope';
import ThreadStackLayout from '../thread/_layout';

export const unstable_settings = { initialRouteName: 'index' };

export default function InboxLayout() {
    const scope = useInboxScope();
    const initial = useRef(scope.key);
    const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
    useEffect(() => {
        if (!scope.enabled || initial.current !== scope.key)
            router.dismissTo((returnTo?.startsWith('/threads/') ? returnTo : '/') as Href);
    }, [scope.key, scope.enabled, returnTo]);
    if (!scope.enabled || initial.current !== scope.key) return null;
    return <ThreadStackLayout inbox />;
}
