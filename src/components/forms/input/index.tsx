import { StyleSheet } from 'react-native-unistyles';

import {
    Input as PrimitiveInput,
    InputProps as PrimitiveInputProps,
} from '@/components/primitives/input';
import { VStack } from '@/components/primitives/vstack';
import { Text } from '@/components/primitives/text';
import { stableOutlineWidth } from '@/helpers/styles';

import { Label } from '@/components/forms/label';

export type InputProps = PrimitiveInputProps & {
    label?: string | null;
    error?: string | null;
};

export const Input = ({ label, error, style, ...inputProps }: InputProps) => {
    return (
        <VStack style={styles.container}>
            {label && <Label>{label}</Label>}
            <PrimitiveInput
                {...inputProps}
                style={[styles.input, error ? styles.inputError : null, style]}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
        </VStack>
    );
};

const styles = StyleSheet.create((theme) => ({
    container: {
        gap: theme.space(2.5),
    },
    label: {
        ...theme.fontSize.sm,
        fontWeight: theme.fontWeight.semibold.fontWeight,
        color: theme.colors.typography,
    },
    input: {
        minHeight: theme.space(14),
        borderRadius: theme.radius['2xl'],
        borderWidth: stableOutlineWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.background,
        paddingHorizontal: theme.space(4),
        color: theme.colors.typography,
        fontSize: theme.fontSize.lg.fontSize,
        fontWeight: theme.fontWeight.semibold.fontWeight,
    },
    inputError: {
        borderColor: theme.colors.dangerBorder,
    },
    error: {
        ...theme.fontSize.xs,
        color: theme.colors.dangerText,
        fontWeight: theme.fontWeight.medium.fontWeight,
    },
}));
