import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

const mockHideAsync = jest.fn<() => Promise<void>>().mockResolvedValue();

jest.setMock('expo-splash-screen', {
    __esModule: true,
    hideAsync: mockHideAsync,
    preventAutoHideAsync: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { useHideAppSplash } = require('./app-splash') as typeof import('./app-splash');

const VisibleScreen = () => {
    useHideAppSplash();
    return null;
};

describe('useHideAppSplash', () => {
    it('hides the native splash as soon as the screen mounts', async () => {
        let tree: ReactTestRenderer | null = null;

        await act(async () => {
            tree = renderer.create(<VisibleScreen />);
        });

        expect(mockHideAsync).toHaveBeenCalledTimes(1);

        await act(async () => {
            tree!.update(<VisibleScreen />);
        });

        expect(mockHideAsync).toHaveBeenCalledTimes(1);
    });
});
