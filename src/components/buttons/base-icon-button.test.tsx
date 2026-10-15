import React from 'react';
import type { LucideIcon } from 'lucide-react-native';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

const mockUseVariants = jest.fn();
const mockTheme = {
    colors: {
        background: '#0a0a0a',
        foreground: '#ffffff',
        muted: '#171717',
        blue: { 100: '#dbeafe', 500: '#3b82f6' },
        neutral: { 150: '#e5e5e5', 925: '#121212' },
        typography: '#ffffff',
        white: '#ffffff',
    },
    radius: { full: 999 },
    space: (value: number) => value * 4,
};
const mockIcon = (props: Record<string, unknown>) => React.createElement('Icon', props);
const mockPressable = (props: Record<string, unknown>) =>
    React.createElement('Pressable', props, props.children as React.ReactNode);
const mockBox = (props: Record<string, unknown>) =>
    React.createElement('Box', props, props.children as React.ReactNode);
const mockSpinner = (props: Record<string, unknown>) => React.createElement('Spinner', props);

jest.mock('react-native-unistyles', () => ({
    StyleSheet: {
        create: () => ({
            container: {},
            unavailable: () => ({}),
            useVariants: mockUseVariants,
        }),
    },
    useUnistyles: () => ({ theme: mockTheme }),
}));

jest.mock('@/components/primitives/pressable', () => ({ Pressable: mockPressable }));
jest.mock('@/components/primitives/box', () => ({ Box: mockBox }));
jest.mock('@/components/feedback/spinner', () => ({ __esModule: true, default: mockSpinner }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { BaseIconButton } = require('./base-icon-button') as typeof import('./base-icon-button');

describe('BaseIconButton', () => {
    let tree: ReactTestRenderer | null = null;

    beforeEach(() => {
        mockUseVariants.mockClear();
    });

    afterEach(() => {
        act(() => tree?.unmount());
        tree = null;
    });

    it('passes the themed foreground through the Lucide color prop', () => {
        act(() => {
            tree = renderer.create(
                <BaseIconButton
                    Icon={mockIcon as unknown as LucideIcon}
                    accessibilityLabel="Back"
                    onPressHandler={jest.fn()}
                    variant="secondary"
                />,
            );
        });

        expect(mockUseVariants).toHaveBeenCalledWith({ variant: 'secondary' });
        expect(tree!.root.findByType(mockIcon).props.color).toBe(mockTheme.colors.typography);
        expect(tree!.root.findByType(mockPressable).props.accessibilityLabel).toBe('Back');
    });

    it('uses the inverse themed color for the primary variant', () => {
        act(() => {
            tree = renderer.create(
                <BaseIconButton
                    Icon={mockIcon as unknown as LucideIcon}
                    onPressHandler={jest.fn()}
                    variant="primary"
                />,
            );
        });

        expect(mockUseVariants).toHaveBeenCalledWith({ variant: 'primary' });
        expect(tree!.root.findByType(mockIcon).props.color).toBe(mockTheme.colors.background);
    });

    it('owns the loading and disabled presentation for confirm actions', () => {
        act(() => {
            tree = renderer.create(
                <BaseIconButton
                    Icon={mockIcon as unknown as LucideIcon}
                    loading
                    onPressHandler={jest.fn()}
                    variant="confirm"
                />,
            );
        });

        const pressable = tree!.root.findByType(mockPressable);
        expect(pressable.props.disabled).toBe(true);
        expect(pressable.props.accessibilityState).toEqual({ disabled: true, busy: true });
        expect(tree!.root.findByType(mockSpinner).props.color).toBe(mockTheme.colors.white);
        expect(tree!.root.findAllByType(mockIcon)).toHaveLength(0);
    });
});
