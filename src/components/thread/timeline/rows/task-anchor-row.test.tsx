import React from 'react';
import renderer, {
    act,
    type ReactTestRenderer,
    type ReactTestRendererJSON,
} from 'react-test-renderer';
import { describe, expect, it, jest } from '@jest/globals';

import type { TimelineRow } from '@/services/threads/conversation/timeline';
import { RunningActivityContent } from './running-row';
import { TaskAnchorRow } from './task-anchor-row';

jest.mock('expo-image', () => ({ Image: 'Image' }));
jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('react-native-unistyles', () => {
    const theme = {
        colors: {
            background: '#fff',
            border: '#ddd',
            surfaceMuted: '#eee',
            text: '#111',
            textMuted: '#777',
        },
        fontSize: {
            sm: { fontSize: 14, lineHeight: 18 },
            xs: { fontSize: 12, lineHeight: 16 },
        },
        fontWeight: {
            medium: { fontWeight: '500' },
            semibold: { fontWeight: '600' },
        },
        radius: {
            '2xl': 16,
            full: 999,
            md: 8,
        },
        space: (value: number) => value * 4,
    };

    return {
        StyleSheet: {
            create: (styles: unknown) => (typeof styles === 'function' ? styles(theme) : styles),
        },
        useUnistyles: () => ({
            theme,
            rt: { themeName: 'light' },
        }),
    };
});
jest.mock('lucide-react-native', () => ({
    ChevronRight: () => 'ChevronRight',
    Info: () => null,
    ShieldAlert: () => null,
    ShieldCheck: () => null,
    ShieldX: () => null,
}));
jest.mock('@/components/primitives/hstack', () => ({ HStack: 'HStack' }));
jest.mock('@/components/primitives/pressable', () => ({ Pressable: 'Pressable' }));
jest.mock('@/components/primitives/text', () => ({ Text: 'Text' }));
jest.mock('@/components/primitives/vstack', () => ({ VStack: 'VStack' }));

describe('mobile detached Task card', () => {
    it('embeds the running image, label, and elapsed timer while the child is active', async () => {
        const row: Extract<TimelineRow, { type: 'task-anchor' }> = {
            type: 'task-anchor',
            key: 'task-anchor:run',
            itemId: 'task-anchor-run',
            turnId: 'task-turn',
            taskId: 'task',
            runId: 'run',
            childThreadId: 'child-thread',
            childTurnId: 'child-turn',
            agentRole: null,
            depth: 0,
            maxDepth: 3,
            title: 'Research',
            status: 'running',
            startedAtUnixMs: 1_000,
            elapsedLabel: '12 sec',
            progressPreview: 'Collecting sources',
            resultPreview: null,
            errorPreview: null,
        };
        let tree: ReactTestRenderer;

        await act(async () => {
            tree = renderer.create(<TaskAnchorRow row={row} />);
        });

        const output = JSON.stringify(tree!.toJSON());
        expect(output).toContain('Research');
        expect(output).toContain('timelineRunning');
        expect(output).toContain('12 sec');
        expect(output).toContain('Collecting sources');
        expect(output).toContain('"type":"Image"');
    });

    it('keeps the same card shell before and after the child binding appears', async () => {
        const queued: Extract<TimelineRow, { type: 'task-anchor' }> = {
            type: 'task-anchor',
            key: 'task-anchor:queued',
            itemId: 'task-anchor-queued',
            turnId: 'task-turn',
            taskId: 'task',
            runId: 'run',
            childThreadId: null,
            childTurnId: null,
            agentRole: null,
            depth: 0,
            maxDepth: 3,
            title: 'Research',
            status: 'queued',
            startedAtUnixMs: 1_000,
            elapsedLabel: null,
            progressPreview: null,
            resultPreview: null,
            errorPreview: null,
        };
        const completed: Extract<TimelineRow, { type: 'task-anchor' }> = {
            ...queued,
            key: 'task-anchor:completed',
            itemId: 'task-anchor-completed',
            childThreadId: 'child-thread',
            childTurnId: 'child-turn',
            status: 'completed',
        };
        const onOpenTaskThread = jest.fn();
        let queuedTree: ReactTestRenderer;
        let completedTree: ReactTestRenderer;

        await act(async () => {
            queuedTree = renderer.create(
                <TaskAnchorRow row={queued} onOpenTaskThread={onOpenTaskThread} />,
            );
            completedTree = renderer.create(
                <TaskAnchorRow row={completed} onOpenTaskThread={onOpenTaskThread} />,
            );
        });

        const queuedJson = queuedTree!.toJSON() as ReactTestRendererJSON;
        const completedJson = completedTree!.toJSON() as ReactTestRendererJSON;
        expect(queuedJson.type).toBe('Pressable');
        expect(completedJson.type).toBe('Pressable');
        expect(queuedJson.props.disabled).toBe(true);
        expect(completedJson.props.disabled).toBe(false);
        expect(cardStructure(queuedJson)).toEqual(cardStructure(completedJson));
    });
});

describe('mobile running activity', () => {
    it('can hide the inline Dino when the Avatar Rail owns the animation', async () => {
        let tree: ReactTestRenderer;

        await act(async () => {
            tree = renderer.create(
                <RunningActivityContent elapsedLabel="12 sec" showDino={false} />,
            );
        });

        const output = JSON.stringify(tree!.toJSON());
        expect(output).toContain('timelineRunning');
        expect(output).toContain('12 sec');
        expect(output).not.toContain('"type":"Image"');
    });
});

const cardStructure = (value: ReactTestRendererJSON) =>
    JSON.parse(
        JSON.stringify(value, (key, nestedValue) => {
            if (key === 'props') {
                return {};
            }
            if (key !== 'type' && typeof nestedValue === 'string') {
                return '<text>';
            }
            return nestedValue;
        }),
    );
