import React from 'react';
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

const mockBaseIconButton = (props: Record<string, unknown>) =>
    React.createElement('BaseIconButton', props);
const mockCheck = (props: Record<string, unknown>) => React.createElement('Check', props);

jest.mock('./base-icon-button', () => ({ BaseIconButton: mockBaseIconButton }));
jest.mock('lucide-react-native', () => ({ Check: mockCheck }));
jest.mock('react-native-unistyles', () => ({
    useUnistyles: () => ({
        theme: { space: (value: number) => value * 4 },
    }),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { HeaderCheckButton } = require('./header-action') as typeof import('./header-action');

describe('HeaderCheckButton', () => {
    let tree: ReactTestRenderer | null = null;

    afterEach(() => {
        act(() => tree?.unmount());
        tree = null;
    });

    it('delegates its confirm and loading state to BaseIconButton', () => {
        const onPress = jest.fn();
        act(() => {
            tree = renderer.create(
                <HeaderCheckButton accessibilityLabel="Save" disabled loading onPress={onPress} />,
            );
        });

        const button = tree!.root.findByType(mockBaseIconButton);
        expect(button.props).toMatchObject({
            Icon: mockCheck,
            accessibilityLabel: 'Save',
            disabled: true,
            iconSize: 24,
            loading: true,
            loadingSize: 20,
            onPressHandler: onPress,
            variant: 'confirm',
        });
    });
});
