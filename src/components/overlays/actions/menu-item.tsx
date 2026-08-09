import type { FC } from 'react';
import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, useUnistyles, type UnistylesVariants } from 'react-native-unistyles';

import { Box } from '@/components/primitives/box';
import { HStack } from '@/components/primitives/hstack';
import { Pressable } from '@/components/primitives/pressable';
import { Text } from '@/components/primitives/text';
import { VStack } from '@/components/primitives/vstack';

type MenuItemProps = {
    Icon?: LucideIcon;
    title: string;
    description?: string;
    small?: boolean;
    last?: boolean;
    disabled?: boolean;
    onPress: () => void;
} & UnistylesVariants<typeof styles>;

const MenuItem: FC<MenuItemProps> = ({
    Icon,
    title,
    description,
    small,
    last,
    variant,
    disabled,
    onPress,
}) => {
    const { theme } = useUnistyles();
    styles.useVariants({ variant });
    const iconColor = variant === 'destructive' ? theme.colors.dangerText : theme.colors.typography;

    return (
        <Pressable accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}>
            <Box style={disabled && styles.disabled}>
                <Box style={styles.container}>
                    <HStack style={styles.wrapper}>
                        {Icon ? (
                            <Box style={styles.icon}>
                                <Icon size={theme.space(5)} color={iconColor} />
                            </Box>
                        ) : null}
                        <VStack style={styles.titleContainer}>
                            <Text style={[styles.title, small && styles.titleSmall]}>{title}</Text>
                            {description ? (
                                <Text style={styles.description}>{description}</Text>
                            ) : null}
                        </VStack>
                    </HStack>
                </Box>
                {!last ? <Box style={styles.divider} /> : null}
            </Box>
        </Pressable>
    );
};

const styles = StyleSheet.create((theme) => ({
    container: {
        paddingHorizontal: theme.space(5),
        paddingVertical: theme.space(4),
    },
    disabled: {
        opacity: 0.5,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: theme.colors.border,
    },
    wrapper: {
        alignItems: 'center',
        gap: theme.space(3),
    },
    icon: {
        width: theme.space(5),
        height: theme.space(5),
        alignItems: 'center',
        justifyContent: 'center',
    },
    titleContainer: {
        flex: 1,
        gap: theme.space(1),
    },
    title: {
        fontSize: theme.fontSize.default.fontSize,
        fontWeight: theme.fontWeight.medium.fontWeight,
        variants: {
            variant: {
                default: {
                    color: theme.colors.typography,
                },
                destructive: {
                    color: theme.colors.dangerText,
                },
            },
        },
    },
    titleSmall: {
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
    },
    description: {
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
        color: theme.colors.typography,
        opacity: 0.55,
    },
}));

export { MenuItem };
