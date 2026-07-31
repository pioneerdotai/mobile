import React from 'react';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

const mockReact = React;
const mockSetStringAsync = jest.fn<(value: string) => Promise<void>>();
const mockCopyIcon = (props: Record<string, unknown>) => mockReact.createElement('Copy', props);
const mockCheckIcon = (props: Record<string, unknown>) => mockReact.createElement('Check', props);
const mockPressable = (props: Record<string, unknown>) =>
    mockReact.createElement('Pressable', props, props.children as React.ReactNode);

jest.setMock('expo-clipboard', {
    __esModule: true,
    setStringAsync: mockSetStringAsync,
});

jest.mock('lucide-react-native', () => ({
    Check: mockCheckIcon,
    Copy: mockCopyIcon,
}));

jest.mock('react-native-unistyles', () => {
    const theme = {
        colors: { surfaceMuted: '#eee', textMuted: '#777' },
        radius: { lg: 8 },
        space: (value: number) => value * 4,
    };
    return {
        StyleSheet: {
            create: (factory: (value: typeof theme) => Record<string, unknown>) => factory(theme),
        },
        useUnistyles: () => ({ theme }),
    };
});

jest.mock('@/components/primitives/pressable', () => ({ Pressable: mockPressable }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { CopyButton } = require('./copy') as typeof import('./copy');

describe('CopyButton', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.clearAllMocks();
        mockSetStringAsync.mockResolvedValue(undefined);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('shows a check after copying and restores the copy icon', async () => {
        let tree: ReactTestRenderer | null = null;
        await act(async () => {
            tree = renderer.create(
                <CopyButton
                    value="activation-value"
                    accessibilityLabel="Copy"
                    copiedAccessibilityLabel="Copied"
                />,
            );
        });

        expect(tree!.root.findAllByType(mockCopyIcon)).toHaveLength(1);
        expect(tree!.root.findAllByType(mockCheckIcon)).toHaveLength(0);

        await act(async () => {
            tree!.root.findByType(mockPressable).props.onPress();
            await Promise.resolve();
        });

        expect(mockSetStringAsync).toHaveBeenCalledWith('activation-value');
        expect(tree!.root.findByType(mockPressable).props.accessibilityLabel).toBe('Copied');
        expect(tree!.root.findAllByType(mockCopyIcon)).toHaveLength(0);
        expect(tree!.root.findAllByType(mockCheckIcon)).toHaveLength(1);

        act(() => {
            jest.advanceTimersByTime(1_400);
        });

        expect(tree!.root.findAllByType(mockCopyIcon)).toHaveLength(1);
        expect(tree!.root.findAllByType(mockCheckIcon)).toHaveLength(0);
    });

    it('keeps the copy icon when the clipboard write fails', async () => {
        mockSetStringAsync.mockRejectedValueOnce(new Error('clipboard unavailable'));
        let tree: ReactTestRenderer | null = null;
        await act(async () => {
            tree = renderer.create(
                <CopyButton
                    value="activation-value"
                    accessibilityLabel="Copy"
                    copiedAccessibilityLabel="Copied"
                />,
            );
        });

        await act(async () => {
            tree!.root.findByType(mockPressable).props.onPress();
            await Promise.resolve();
        });

        expect(tree!.root.findByType(mockPressable).props.accessibilityLabel).toBe('Copy');
        expect(tree!.root.findAllByType(mockCopyIcon)).toHaveLength(1);
        expect(tree!.root.findAllByType(mockCheckIcon)).toHaveLength(0);
    });
});
