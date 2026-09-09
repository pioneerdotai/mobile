import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

/** Owns pressed/error presentation and callback lifetime. Client owns the operation. */
export const useAdministrationAction = <Variables, Result>(options: {
    mutationFn: (variables: Variables) => Promise<Result>;
    onDiscard?: (result: Result, variables: Variables) => void | Promise<unknown>;
    onSuccess?: (result: Result, variables: Variables) => void | Promise<unknown>;
    onError?: (error: unknown, variables: Variables) => void | Promise<unknown>;
}) => {
    const optionsRef = useRef(options);
    useLayoutEffect(() => {
        optionsRef.current = options;
    }, [options]);
    const owner = useRef<object | null>({});
    const [isPending, setPressed] = useState(false);
    const [isError, setError] = useState(false);
    const [variables, setVariables] = useState<Variables>();
    useEffect(() => {
        owner.current = {};
        return () => {
            owner.current = null;
        };
    }, []);
    const reset = useCallback(() => {
        owner.current = {};
        setPressed(false);
        setError(false);
        setVariables(undefined);
    }, []);
    const mutate = useCallback((input: Variables) => {
        if (!owner.current) return;
        const presentation = {};
        owner.current = presentation;
        setPressed(true);
        setError(false);
        setVariables(input);
        const options = optionsRef.current;
        void Promise.resolve()
            .then(() => options.mutationFn(input))
            .then(async (result) => {
                if (owner.current === presentation) await options.onSuccess?.(result, input);
                else await options.onDiscard?.(result, input);
            })
            .catch(async (error: unknown) => {
                if (owner.current === presentation) {
                    setError(true);
                    try {
                        await options.onError?.(error, input);
                    } catch {
                        /* Error presentation must not leave an unhandled callback promise. */
                    }
                }
            })
            .finally(() => {
                if (owner.current === presentation) setPressed(false);
            });
    }, []);
    return { isPending, isError, variables, mutate, reset };
};
