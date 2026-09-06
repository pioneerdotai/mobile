import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import wire from '@/client/fixtures/thread-presentation-wire.json';
import type { ClientScopedSnapshotDto } from '@/client/generated/client_scoped_snapshot_dto';
import type { TimelineSnapshot } from '@/client/generated/timeline_snapshot';
import { useThreadPresentation } from './use-thread-presentation';

let mockLanguage = 'en';
const mockListeners = new Set<() => void>();
let mockPublication = wire.initial as unknown as ClientScopedSnapshotDto;
const mockStore = {
    subscribe: (listener: () => void) => {
        mockListeners.add(listener);
        return () => {
            mockListeners.delete(listener);
        };
    },
    getSnapshot: () => mockPublication,
};
jest.mock('@/client/mobile-client-binding', () => ({
    mobileClientBinding: { scope: () => mockStore },
}));
jest.mock('react-i18next', () => ({
    useTranslation: () => ({ i18n: { language: mockLanguage } }),
}));
jest.mock('@/locale/i18n', () => ({ __esModule: true, default: { t: (key: string) => key } }));

describe('published timeline selector', () => {
    it('preserves snapshot and row identities across replacements, shell renders and locale changes', async () => {
        let selected!: ReturnType<typeof useThreadPresentation>;
        const Probe = ({ active = true }: { active?: boolean }) => {
            selected = useThreadPresentation('a', active);
            return null;
        };
        let tree!: ReactTestRenderer;
        await act(async () => {
            tree = renderer.create(<Probe />);
        });
        const first = selected;
        expect(first.snapshot).toBe(mockPublication.payload);
        await act(async () => {
            tree.update(<Probe />);
        });
        expect(selected.rows).toBe(first.rows);
        const previous = mockPublication.payload as TimelineSnapshot;
        const updated = wire.next.payload as unknown as TimelineSnapshot;
        mockPublication = {
            ...mockPublication,
            revisions: { ...mockPublication.revisions, scoped: 2 },
            payload: { ...updated, rows: [updated.rows[0]!, ...previous.rows.slice(1)] },
        };
        await act(async () => {
            for (const listener of mockListeners) listener();
        });
        expect(selected.rows[0]).not.toBe(first.rows[0]);
        for (let ix = 1; ix < first.rows.length; ix++)
            expect(selected.rows[ix]).toBe(first.rows[ix]);
        const replacement = selected;
        mockLanguage = 'ru';
        await act(async () => {
            tree.update(<Probe />);
        });
        expect(selected.snapshot).toBe(replacement.snapshot);
        expect(selected.rows[1]).not.toBe(replacement.rows[1]);
        mockLanguage = 'en';
        await act(async () => {
            tree.update(<Probe />);
        });
        expect(selected.rows[1]).toBe(replacement.rows[1]);
        await act(async () => {
            tree.update(<Probe active={false} />);
        });
        expect(selected.snapshot).toBeNull();
        expect(mockListeners.size).toBe(0);
        await act(async () => {
            tree.unmount();
        });
    });
});
