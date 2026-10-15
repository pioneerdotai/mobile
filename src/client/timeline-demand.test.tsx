import React from 'react';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, jest } from '@jest/globals';
import { AppState, type AppStateStatus } from 'react-native';
import { mobileClientBinding } from './mobile-client-binding';
import type { TimelineSnapshot } from './generated/timeline_snapshot';
import { useTimelineDemand } from './timeline-demand';

jest.mock('./mobile-client-binding', () => ({ mobileClientBinding: { dispatch: jest.fn() } }));

describe('timeline semantic binding lifecycle', () => {
    it('delivers viewability, exits in background, reacquires and releases only its scope', async () => {
        let appStateChanged!: (state: AppStateStatus) => void;
        const remove = jest.fn();
        const subscription = jest
            .spyOn(AppState, 'addEventListener')
            .mockImplementation((_event, listener) => {
                appStateChanged = listener;
                return { remove };
            });
        Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'active' });
        let publish!: ReturnType<typeof useTimelineDemand>;
        function Probe({ thread = 'a' }: { thread?: string }) {
            publish = useTimelineDemand(
                { thread_id: thread, source_revision: 1 } as TimelineSnapshot,
                true,
            );
            return null;
        }
        let tree!: ReactTestRenderer;
        await act(async () => {
            tree = renderer.create(<Probe />);
        });
        await act(async () => {
            publish.update(['row'], 'turn', 'turn', 1);
        });
        const dispatch = jest.mocked(mobileClientBinding.dispatch);
        const latest = () => dispatch.mock.calls.at(-1)![0].intent;
        expect(latest()).toMatchObject({
            kind: 'timeline',
            intent: {
                kind: 'update',
                demand: {
                    thread_id: 'a',
                    row_ids: ['row'],
                    viewed_through_turn_id: 'turn',
                    generation: 1,
                },
            },
        });
        await act(async () => {
            appStateChanged('background');
            // A queued viewability callback may run before React commits AppState.
            publish.update(['row'], 'turn', 'turn', 2);
        });
        expect(latest()).toMatchObject({
            kind: 'timeline',
            intent: { kind: 'exit', thread_id: 'a', generation: 1 },
        });
        const count = dispatch.mock.calls.length;
        await act(async () => {
            publish.update(['row'], 'turn', 'turn', 2);
        });
        expect(dispatch.mock.calls).toHaveLength(count);
        await act(async () => {
            appStateChanged('active');
        });
        expect(latest()).toMatchObject({
            kind: 'timeline',
            intent: { kind: 'update', demand: { generation: 2 } },
        });
        await act(async () => {
            tree.update(<Probe thread="b" />);
        });
        expect(latest()).toMatchObject({
            kind: 'timeline',
            intent: { kind: 'exit', thread_id: 'a', generation: 2 },
        });
        await act(async () => {
            publish.update(['b-row'], 'b-turn', 'b-turn', 0);
        });
        expect(latest()).toMatchObject({
            kind: 'timeline',
            intent: {
                kind: 'update',
                demand: { thread_id: 'b', row_ids: ['b-row'], generation: 3 },
            },
        });
        await act(async () => {
            tree.unmount();
        });
        expect(latest()).toMatchObject({
            kind: 'timeline',
            intent: { kind: 'exit', thread_id: 'b', generation: 3 },
        });
        expect(remove).toHaveBeenCalledTimes(1);
        subscription.mockRestore();
    });
});
