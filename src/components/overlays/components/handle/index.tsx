import { BottomSheetHandle, BottomSheetHandleProps } from '@gorhom/bottom-sheet';
import { StyleSheet, useUnistyles, UnistylesVariants } from 'react-native-unistyles';
import { X } from 'lucide-react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { HStack } from '@/components/primitives/hstack';
import { Box, BoxProps } from '@/components/primitives/box';
import { Text } from '@/components/primitives/text';
import { Pressable } from '@/components/primitives/pressable';
import { ReactNode } from 'react';

interface HandlePropsBase extends BottomSheetHandleProps {
    title?: string;
    compact?: boolean;
    closeButton?: boolean;
    containerStyle?: BoxProps['style'];
    leftButton?: ReactNode;
    handleClose: () => void;
}

type HandleProps = HandlePropsBase & UnistylesVariants<typeof styles>;

const styles = StyleSheet.create((theme, rt) => ({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingHorizontal: theme.space(5),
        justifyContent: 'space-between',
        alignItems: 'center',
        height: theme.sheetHeaderHeight(),
        paddingTop: theme.space(2.5),
    },
    actionContainer: {
        flex: 1,
    },
    title: {
        color: theme.colors.typography,
    },
    leftAction: {
        justifyContent: 'flex-start',
    },
    rightAction: {
        justifyContent: 'flex-end',
    },
    iconContainer: {
        height: theme.space(11),
        width: theme.space(11),
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: theme.radius.full,
        backgroundColor: rt.themeName === 'dark' ? theme.colors.white : theme.colors.neutral[950],
        variants: {
            closeButtonType: {
                ghost: {
                    backgroundColor: 'transparent',
                },
            },
        },
    },
    closeIcon: {
        color: rt.themeName === 'dark' ? theme.colors.neutral[950] : theme.colors.white,
        variants: {
            closeButtonType: {
                ghost: {
                    color: theme.colors.typography,
                },
            },
        },
    },
}));

const Handle = ({
    title,
    compact = false,
    closeButton = true,
    closeButtonType,
    handleClose,
    containerStyle,
    leftButton,
    ...props
}: HandleProps) => {
    styles.useVariants({ closeButtonType });

    const { theme } = useUnistyles();

    return (
        <>
            <BottomSheetHandle {...props} />
            {!compact && (
                <HStack style={[styles.container, containerStyle]}>
                    <HStack style={[styles.actionContainer, styles.leftAction]}>
                        {leftButton && leftButton}
                    </HStack>
                    <Box>
                        <Text fontWeight="extrabold" style={styles.title}>
                            {title}
                        </Text>
                    </Box>
                    <HStack style={[styles.actionContainer, styles.rightAction]}>
                        {closeButton && (
                            <Box style={styles.iconContainer}>
                                <Pressable onPress={handleClose}>
                                    <X
                                        size={theme.space(7)}
                                        style={styles.closeIcon as unknown as StyleProp<ViewStyle>}
                                    />
                                </Pressable>
                            </Box>
                        )}
                    </HStack>
                </HStack>
            )}
        </>
    );
};

export { Handle };
