import React from 'react';
import { expect, it, jest } from '@jest/globals';
import renderer, { act } from 'react-test-renderer';
import { mobileClientBinding } from '@/client/mobile-client-binding';
import { useThreadOpeningRuntime } from './thread-opening-runtime';

const mockRelease = jest.fn();
const mockSnapshot = {
    payload: { workspace_id: 'workspace', revision: 1, request: { kind: 'ready' }, runtimes: [] },
};
const mockSubscribe = jest.fn((_listener: () => void) => mockRelease);
jest.mock('@/client/mobile-client-binding', () => ({
    mobileClientBinding: {
        scope: jest.fn(() => ({ subscribe: mockSubscribe, getSnapshot: () => mockSnapshot })),
        dispatch: jest.fn(),
        drain: jest.fn(),
    },
}));
const Harness = ({ measuring }: { measuring: boolean }) => {
    useThreadOpeningRuntime('workspace', measuring);
    return null;
};
it('only leases existing runtime publications and releases them when measurement ends', async () => {
    jest.clearAllMocks();
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
        tree = renderer.create(<Harness measuring />);
    });
    expect(mobileClientBinding.scope).toHaveBeenCalledWith({
        kind: 'provider_runtime',
        workspace_id: 'workspace',
    });
    expect(mockSubscribe).toHaveBeenCalledTimes(1);
    expect(mobileClientBinding.dispatch).not.toHaveBeenCalled();
    expect(mobileClientBinding.drain).not.toHaveBeenCalled();
    await act(async () => {
        tree.update(<Harness measuring={false} />);
    });
    expect(mockRelease).toHaveBeenCalledTimes(1);
    expect(mobileClientBinding.dispatch).not.toHaveBeenCalled();
    await act(async () => tree.unmount());
    expect(mockRelease).toHaveBeenCalledTimes(1);
});
