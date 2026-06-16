import type { PropsWithChildren } from 'react';
import {
    KeyboardAvoidingView as KeyboardControllerAvoidingView,
    type KeyboardAvoidingViewProps,
} from 'react-native-keyboard-controller';

export type { KeyboardAvoidingViewProps };

export const KeyboardAvoidingView = (props: PropsWithChildren<KeyboardAvoidingViewProps>) => {
    return <KeyboardControllerAvoidingView {...props} />;
};
