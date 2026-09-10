import React from 'react';
import { expect, it, jest } from '@jest/globals';
import renderer, { act } from 'react-test-renderer';
import { useThreadTimelineBlocksQuery } from './use-thread-timeline-blocks-query';
import { useThreadPresentation } from './use-thread-presentation';
import { useTimelineDemand } from '@/client/timeline-demand';
import { mobileClientBinding as mockBinding } from '@/client/mobile-client-binding';
import { AppState } from 'react-native';

const mockIntents: unknown[] = [];
const mockReleases: unknown[] = [];
jest.mock('react-i18next', () => ({ useTranslation: () => ({ i18n: { language: 'en' } }) }));
jest.mock('@/locale/i18n', () => ({ t: (key: string) => key }));
jest.mock('@/client/mobile-client-binding', () => {
    const actual = jest.requireActual<typeof import('@/client/mobile-client-binding')>(
        '@/client/mobile-client-binding',
    );
    const read = (scope: import('@/client/generated/client_scope').ClientScope) => ({
        schema_version: 1,
        scope,
        sequence: 1,
        revisions: { domain: 1, presentation: 1, content: 1, scoped: 1 },
        payload: {
            thread_id: 'parent',
            rows: [],
            status: 'Ready',
            has_loaded_page: true,
            source_revision: 1,
        },
    });
    return {
        ...actual,
        mobileClientBinding: new actual.MobileClientBinding({
            snapshot: read,
            resnapshot: read,
            changes: () => ({ schema_version: 1, changes: [] }),
            dispatch: (request) => {
                mockIntents.push(request.intent);
                return { schema_version: 1, sequence: 1, outcome: 'changed', effects: [] };
            },
            releaseScope: (scope) => {
                mockReleases.push(scope);
            },
            completeEffect: () => {
                throw new Error('unused');
            },
            cancelEffect: () => {
                throw new Error('unused');
            },
        }),
    };
});
it('retains the mounted timeline across focus changes while viewport work stops, then frees it on route removal', async () => {
    Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'active' });
    let query!: ReturnType<typeof useThreadTimelineBlocksQuery>;
    const Probe = ({ focused }: { focused: boolean }) => {
        query = useThreadTimelineBlocksQuery({ threadId: 'parent', enabled: focused });
        const { snapshot } = useThreadPresentation('parent');
        useTimelineDemand(snapshot, focused);
        return null;
    };
    let root!: renderer.ReactTestRenderer;
    await act(async () => {
        root = renderer.create(<Probe focused />);
    });
    const store = mockBinding.scope({ kind: 'timeline', thread_id: 'parent' });
    const before = store.getSnapshot();
    try {
        for (let i = 0; i < 4; i++) {
            await act(async () => {
                root.update(<Probe focused={false} />);
            });
            expect(query.hasLoadedPage).toBe(true);
            expect(store.getSnapshot()).toBe(before);
            expect(mockIntents.at(-1)).toMatchObject({
                kind: 'timeline',
                intent: { kind: 'exit' },
            });
            await act(async () => {
                root.update(<Probe focused />);
            });
            expect(query.hasLoadedPage).toBe(true);
        }
        expect(mockIntents).not.toContainEqual(
            expect.objectContaining({ kind: 'refresh_timeline' }),
        );
        expect(mockReleases).toEqual([]);
    } finally {
        await act(async () => root.unmount());
    }
    expect(mockReleases).toEqual([{ kind: 'timeline', thread_id: 'parent' }]);
    expect(store.getSnapshot()).toBeNull();
});
