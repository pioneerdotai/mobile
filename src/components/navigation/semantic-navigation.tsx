import { useEffect } from 'react';
import { usePathname } from 'expo-router';
import { dispatchNavigation } from '@/client/navigation';
import type { SemanticDestination } from '@/client/generated/client_navigation_state';

export const destinationForPath = (path: string): SemanticDestination | null => {
    if (path === '/' || path.startsWith('/thread/') || path.startsWith('/threads/'))
        return { kind: 'threads' };
    if (path === '/agents-doc') return { kind: 'agents_document' };
    if (path === '/settings/members') return { kind: 'administration', route: 'Members' };
    if (path === '/settings/invitations') return { kind: 'administration', route: 'Invitations' };
    if (path === '/settings' || path.startsWith('/settings/'))
        return { kind: 'settings', route: 'Account' };
    // Editor, picker and modal paths retain their originating semantic destination.
    return null;
};

export const SemanticNavigationController = () => {
    const path = usePathname();
    useEffect(() => {
        const destination = destinationForPath(path);
        if (destination) dispatchNavigation({ kind: 'navigate', destination });
    }, [path]);
    return null;
};
