import { ForwardedRef, forwardRef } from 'react';
import { TextInput, type TextInputInstance, type TextInputProps } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';

export type InputProps = TextInputProps;

const Input = forwardRef<TextInputInstance, InputProps>(
    ({ ...rest }, ref: ForwardedRef<TextInputInstance>) => {
        const { theme } = useUnistyles();

        return <TextInput ref={ref} placeholderTextColor={theme.colors.neutral[400]} {...rest} />;
    },
);

Input.displayName = 'Box';

export { Input };
