import { useMemo } from 'react';
import type { LucideIcon, LucideProps } from 'lucide-react-native';
import { StyleSheet, type UnistylesVariants, useUnistyles } from 'react-native-unistyles';

import Spinner from '../feedback/spinner';
import { Box } from '../primitives/box';
import { Pressable } from '../primitives/pressable';

type BaseIconButtonProps = {
    Icon: LucideIcon;
    accessibilityLabel?: string;
    disabled?: boolean;
    iconStyle?: LucideProps['style'];
    iconSize?: number;
    loading?: boolean;
    loadingSize?: number;
    onPressHandler: () => void;
} & UnistylesVariants<typeof styles>;

type BaseIconButtonVariant = 'default' | NonNullable<BaseIconButtonProps['variant']>;

const styles = StyleSheet.create((theme, rt) => ({
    container: {
        height: theme.space(11),
        width: theme.space(11),
        borderRadius: theme.radius.full,
        justifyContent: 'center',
        alignItems: 'center',
        variants: {
            variant: {
                default: {
                    backgroundColor: theme.colors.muted,
                },
                primary: {
                    backgroundColor: theme.colors.foreground,
                },
                secondary: {
                    backgroundColor:
                        rt.themeName === 'dark'
                            ? theme.colors.neutral[925]
                            : theme.colors.neutral[150],
                },
                confirm: {
                    backgroundColor: theme.colors.blue[500],
                },
            },
        },
    },
    unavailable: (confirm: boolean) =>
        confirm ? { backgroundColor: theme.colors.blue[100] } : { opacity: 0.5 },
}));

const BaseIconButton = ({
    Icon,
    accessibilityLabel,
    disabled = false,
    iconStyle,
    iconSize,
    loading = false,
    loadingSize,
    onPressHandler,
    variant,
}: BaseIconButtonProps) => {
    styles.useVariants({ variant });

    const { theme } = useUnistyles();

    const unavailable = disabled || loading;

    const iconColors = useMemo<Record<BaseIconButtonVariant, string>>(
        () => ({
            default: theme.colors.typography,
            primary: theme.colors.background,
            secondary: theme.colors.typography,
            confirm: theme.colors.white,
        }),
        [theme.colors.background, theme.colors.typography, theme.colors.white],
    );

    const iconColor = iconColors[variant ?? 'default'];

    return (
        <Pressable
            accessibilityLabel={accessibilityLabel}
            accessibilityRole="button"
            accessibilityState={{ disabled: unavailable, busy: loading }}
            disabled={unavailable}
            onPress={onPressHandler}
        >
            <Box
                style={[styles.container, unavailable && styles.unavailable(variant === 'confirm')]}
            >
                {loading ? (
                    <Spinner color={iconColor} size={loadingSize ?? theme.space(5)} />
                ) : (
                    <Icon color={iconColor} size={iconSize ?? theme.space(7)} style={iconStyle} />
                )}
            </Box>
        </Pressable>
    );
};

export type { BaseIconButtonProps };
export { BaseIconButton };
