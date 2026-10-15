import React, { StrictMode } from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import renderer, { act } from 'react-test-renderer';
import { useAdministrationAction } from './use-administration-action';

const deferred = <T,>() => {
    let resolve!: (value: T) => void;
    let reject!: (error: unknown) => void;
    const promise = new Promise<T>((yes, no) => {
        resolve = yes;
        reject = no;
    });
    return { promise, resolve, reject };
};
describe('administration action presentation lifetime', () => {
    it('discards a late activation after reset and does not replay a command under StrictMode', async () => {
        const result = deferred<string>();
        const mutationFn = jest.fn(() => result.promise);
        const onSuccess = jest.fn<() => void>();
        const onDiscard = jest.fn<() => void>();
        let action!: ReturnType<typeof useAdministrationAction<string, string>>;
        const Probe = () => {
            action = useAdministrationAction<string, string>({ mutationFn, onSuccess, onDiscard });
            return null;
        };
        let tree!: ReturnType<typeof renderer.create>;
        await act(async () => {
            tree = renderer.create(
                <StrictMode>
                    <Probe />
                </StrictMode>,
            );
        });
        await act(async () => {
            action.mutate('member-id');
        });
        expect(mutationFn).toHaveBeenCalledTimes(1);
        expect(action.isPending).toBe(true);
        await act(async () => {
            action.reset();
            result.resolve('transient-activation');
        });
        expect(onSuccess).not.toHaveBeenCalled();
        expect(onDiscard).toHaveBeenCalledWith('transient-activation', 'member-id');
        expect(action.isPending).toBe(false);
        await act(async () => tree.unmount());
    });
    it('clears a late activation on unmount and presents a synchronous error without repeating work', async () => {
        const result = deferred<string>();
        const onDiscard = jest.fn<() => void>();
        const onError = jest.fn<() => void>();
        let action!: ReturnType<typeof useAdministrationAction<string, string>>;
        let fail = true;
        const mutationFn = jest.fn(() => {
            if (fail) throw new Error('synthetic');
            return result.promise;
        });
        const Probe = () => {
            action = useAdministrationAction<string, string>({ mutationFn, onDiscard, onError });
            return null;
        };
        let tree!: ReturnType<typeof renderer.create>;
        await act(async () => {
            tree = renderer.create(<Probe />);
        });
        await act(async () => action.mutate('first'));
        expect(action.isError).toBe(true);
        expect(action.isPending).toBe(false);
        expect(onError).toHaveBeenCalledTimes(1);
        fail = false;
        await act(async () => action.mutate('second'));
        await act(async () => tree.unmount());
        await act(async () => result.resolve('transient'));
        expect(onDiscard).toHaveBeenCalledWith('transient', 'second');
        expect(mutationFn).toHaveBeenCalledTimes(2);
    });
});
