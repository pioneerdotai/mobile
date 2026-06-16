import { StyleSheet } from 'react-native-unistyles';

import { Text, TextProps } from '@/components/primitives/text';

interface LabelProps {
    children: string;
    style?: TextProps['style'];
}

const styles = StyleSheet.create((theme) => ({
    label: {
        ...theme.fontSize.sm,
        fontWeight: theme.fontWeight.medium.fontWeight,
        color: theme.colors.typography,
    },
}));

export const Label = ({ children, style }: LabelProps) => (
    <Text style={[styles.label, style]}>{children}</Text>
);
