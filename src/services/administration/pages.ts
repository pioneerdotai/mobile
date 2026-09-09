import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { mobileClientBinding } from '@/client/mobile-client-binding';
import type { AdministrationPagePublication } from '@/client/generated/administration_page_publication';

type Page = AdministrationPagePublication['page'];
type Intent = 'observe' | 'release' | 'refresh' | 'next';
const scopeFor = (page: Page) => ({ kind: 'administration_page' as const, page });
const read = (page: Page) =>
    (mobileClientBinding.scope(scopeFor(page)).getSnapshot()?.payload ??
        null) as AdministrationPagePublication | null;

export const dispatchAdministrationPage = (page: Page, kind: Intent): void => {
    mobileClientBinding.dispatch({
        schema_version: 1,
        intent: { kind: 'administration_page', intent: { kind, page } },
    });
    mobileClientBinding.drain(scopeFor(page));
};

export const subscribeAdministrationPage = (page: Page, listener: () => void): (() => void) => {
    const unsubscribe = mobileClientBinding.scope(scopeFor(page)).subscribe(listener);
    try {
        dispatchAdministrationPage(page, 'observe');
    } catch (error) {
        unsubscribe();
        try {
            dispatchAdministrationPage(page, 'release');
        } catch {
            /* Keep the original bridge error. */
        }
        throw error;
    }
    let active = true;
    return () => {
        if (!active) return;
        active = false;
        unsubscribe();
        dispatchAdministrationPage(page, 'release');
    };
};

/** Waits for the Client operation; it does not initiate retries or page traversal. */
export const requestAdministrationPage = (page: Page, intent: 'refresh' | 'next'): Promise<void> =>
    new Promise((resolve, reject) => {
        let sent = false;
        let unsubscribe = () => {};
        const changed = () => {
            if (!sent) return;
            const snapshot = read(page);
            if (snapshot?.request.kind === 'loading') return;
            if (
                page.kind === 'workspace_members' &&
                snapshot?.request.kind === 'ready' &&
                snapshot.next_cursor
            )
                return;
            unsubscribe();
            if (snapshot?.request.kind === 'ready') resolve();
            else reject(new Error('administration_page_unavailable'));
        };
        unsubscribe = mobileClientBinding.scope(scopeFor(page)).subscribe(changed);
        try {
            dispatchAdministrationPage(page, intent);
            sent = true;
            changed();
        } catch (error) {
            unsubscribe();
            reject(error);
        }
    });

export const useAdministrationPage = (page: Page, enabled: boolean) => {
    const key = JSON.stringify(page);
    const stablePage = useMemo(() => JSON.parse(key) as Page, [key]);
    const subscribe = useCallback(
        (listener: () => void) =>
            enabled ? subscribeAdministrationPage(stablePage, listener) : () => {},
        [stablePage, enabled],
    );
    const getSnapshot = useCallback(
        () => (enabled ? read(stablePage) : null),
        [stablePage, enabled],
    );
    const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
    const refetch = useCallback(
        () => requestAdministrationPage(stablePage, 'refresh'),
        [stablePage],
    );
    const fetchNextPage = useCallback(
        () => requestAdministrationPage(stablePage, 'next'),
        [stablePage],
    );
    return {
        snapshot,
        isPending:
            !snapshot || snapshot.request.kind === 'idle' || snapshot.request.kind === 'loading',
        isError: snapshot?.request.kind === 'failed' || snapshot?.request.kind === 'forbidden',
        isFetchingNextPage: snapshot?.request.kind === 'loading' && snapshot.request_cursor != null,
        hasNextPage: snapshot?.next_cursor != null,
        refetch,
        fetchNextPage,
    };
};

export const useAdministrationWorkspacePages = (
    workspaceIds: readonly string[],
    enabled: boolean,
) => {
    const key = JSON.stringify(workspaceIds);
    const pages = useMemo(
        () =>
            (JSON.parse(key) as string[]).map((workspace_id) => ({
                kind: 'workspace_members' as const,
                workspace_id,
            })),
        [key],
    );
    const subscribe = useCallback(
        (listener: () => void) => {
            if (!enabled) return () => {};
            const subscriptions: (() => void)[] = [];
            try {
                for (const page of pages)
                    subscriptions.push(subscribeAdministrationPage(page, listener));
            } catch (error) {
                for (const unsubscribe of subscriptions) unsubscribe();
                throw error;
            }
            return () => {
                for (const unsubscribe of subscriptions) unsubscribe();
            };
        },
        [pages, enabled],
    );
    const getRevision = useCallback(
        () => (enabled ? pages.map((page) => read(page)?.revision ?? -1).join(':') : ''),
        [pages, enabled],
    );
    const revision = useSyncExternalStore(subscribe, getRevision, getRevision);
    // The external store revision invalidates this immutable projection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const snapshots = useMemo(() => (enabled ? pages.map(read) : []), [pages, enabled, revision]);
    const refetchWorkspaceMembers = useCallback(
        () => Promise.all(pages.map((page) => requestAdministrationPage(page, 'refresh'))),
        [pages],
    );
    const membershipByPrincipal = useMemo(() => {
        const memberships = new Map<string, Set<string>>();
        for (const snapshot of snapshots) {
            if (snapshot?.page.kind !== 'workspace_members') continue;
            for (const row of snapshot.members) {
                const ids = memberships.get(row.id) ?? new Set<string>();
                ids.add(snapshot.page.workspace_id);
                memberships.set(row.id, ids);
            }
        }
        return memberships;
    }, [snapshots]);
    return {
        membershipByPrincipal,
        membershipsLoading: snapshots.some(
            (page) =>
                !page ||
                page.request.kind === 'idle' ||
                page.request.kind === 'loading' ||
                (page.request.kind === 'ready' && page.next_cursor != null),
        ),
        membershipsUnavailable: snapshots.some(
            (page) => page?.request.kind === 'failed' || page?.request.kind === 'forbidden',
        ),
        refetchWorkspaceMembers,
    };
};
