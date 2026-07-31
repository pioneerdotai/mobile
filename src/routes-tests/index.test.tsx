import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

const mockReact = React;
const mockHomeScreen = () => mockReact.createElement('HomeScreen');

jest.setMock('@/screens/home', {
    __esModule: true,
    default: mockHomeScreen,
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const IndexRoute = require('@/routes/(tabs)/(home)')
    .default as typeof import('@/routes/(tabs)/(home)').default;

describe('IndexRoute', () => {
    it('renders the home thread list directly', async () => {
        let tree: ReactTestRenderer | null = null;

        await act(async () => {
            tree = renderer.create(<IndexRoute />);
        });

        expect(tree!.root.findByType(mockHomeScreen)).toBeDefined();
    });
});
