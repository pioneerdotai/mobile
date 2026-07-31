import { useEffect } from 'react';
import { usePathname, useRouter } from 'expo-router';

import { useGatewayStore } from '@/stores/gateway';

const TERMINAL_SESSION_ROUTES = new Set([
    '/',
    '/activate',
    '/editor',
    '/settings',
    '/settings/language',
    '/settings/theme',
]);

export const TerminalGatewaySessionNavigation = () => {
    const pathname = usePathname();
    const router = useRouter();
    const reason = useGatewayStore((state) => state.sessionTerminalReason);

    useEffect(() => {
        if (!reason || TERMINAL_SESSION_ROUTES.has(pathname)) {
            return;
        }

        router.dismissTo('/');
    }, [pathname, reason, router]);

    return null;
};

export default TerminalGatewaySessionNavigation;
