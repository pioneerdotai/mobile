import React, { forwardRef, useImperativeHandle } from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

const mockReact = React;
const mockClear = jest.fn();
const mockSetValue = jest.fn();
const mockNativeOtpInput = forwardRef(
    (
        props: {
            onTextChange?: (value: string) => void;
            textInputProps?: { onChangeText?: (value: string) => void };
        },
        ref,
    ) => {
        useImperativeHandle(ref, () => ({
            blur: jest.fn(),
            clear: mockClear,
            focus: jest.fn(),
            setValue: (value: string) => {
                mockSetValue(value);
                props.onTextChange?.(value);
            },
        }));
        return mockReact.createElement('NativeOtpInput', {
            ...props,
            testID: 'native-otp-input',
        });
    },
);
mockNativeOtpInput.displayName = 'MockNativeOtpInput';

jest.setMock('react-native-otp-entry', {
    __esModule: true,
    OtpInput: mockNativeOtpInput,
});

jest.mock('react-native-unistyles', () => {
    const theme = {
        colors: {
            accent: '#00f',
            background: '#fff',
            border: '#ccc',
            dangerBorder: '#f00',
            dangerText: '#d00',
            typography: '#111',
        },
        fontSize: {
            lg: { fontSize: 18 },
            xs: { fontSize: 12 },
        },
        fontWeight: {
            medium: { fontWeight: '500' },
            semibold: { fontWeight: '600' },
        },
        radius: { '2xl': 16 },
        space: (value: number) => value * 4,
    };
    return {
        StyleSheet: {
            create: (factory: (value: typeof theme) => unknown) => factory(theme),
        },
        useUnistyles: () => ({ theme }),
    };
});

jest.mock('@/components/forms/label', () => ({
    Label: (props: Record<string, unknown>) => mockReact.createElement('Label', props),
}));
jest.mock('@/components/primitives/text', () => ({
    Text: (props: Record<string, unknown>) => mockReact.createElement('Text', props),
}));
jest.mock('@/components/primitives/vstack', () => ({
    VStack: (props: Record<string, unknown>) => mockReact.createElement('VStack', props),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const OtpInput = require('.').OtpInput as typeof import('.').OtpInput;

const findNativeOtpInput = (tree: ReactTestRenderer) =>
    tree.root.findByProps({ testID: 'native-otp-input' });

describe('OtpInput', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('configures the native OTP component for eight visible alphanumeric cells', async () => {
        let tree: ReactTestRenderer | null = null;

        await act(async () => {
            tree = renderer.create(
                <OtpInput
                    label="Activation code"
                    value=""
                    onChangeText={jest.fn()}
                    accessibilityLabel="Activation code"
                />,
            );
        });

        expect(findNativeOtpInput(tree!).props).toMatchObject({
            numberOfDigits: 8,
            type: 'alphanumeric',
            secureTextEntry: false,
            blurOnFilled: false,
            disabled: false,
        });
    });

    it('canonicalizes grouped paste before updating the controlled value', async () => {
        const onChangeText = jest.fn();
        let tree: ReactTestRenderer | null = null;

        await act(async () => {
            tree = renderer.create(<OtpInput value="" onChangeText={onChangeText} />);
        });

        await act(async () => {
            findNativeOtpInput(tree!).props.textInputProps.onChangeText('k7m4-p9q2');
        });

        expect(mockSetValue).toHaveBeenLastCalledWith('K7M4P9Q2');
        expect(onChangeText).toHaveBeenLastCalledWith('K7M4P9Q2');
    });

    it('keeps filled cells in the error state', async () => {
        let tree: ReactTestRenderer | null = null;

        await act(async () => {
            tree = renderer.create(
                <OtpInput value="K7M4P9Q2" error="Invalid code" onChangeText={jest.fn()} />,
            );
        });

        expect(findNativeOtpInput(tree!).props.theme.filledPinCodeContainerStyle.borderColor).toBe(
            '#f00',
        );
    });

    it('clears the rendered secret even when the native widget is disabled', async () => {
        let tree: ReactTestRenderer | null = null;

        await act(async () => {
            tree = renderer.create(
                <OtpInput value="K7M4P9Q2" disabled={false} onChangeText={jest.fn()} />,
            );
        });

        await act(async () => {
            tree!.update(<OtpInput value="" disabled onChangeText={jest.fn()} />);
        });

        expect(mockClear).toHaveBeenCalledTimes(1);
    });
});
