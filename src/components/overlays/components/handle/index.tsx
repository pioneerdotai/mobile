import { ReactNode } from 'react';
import { BottomSheetHandle, BottomSheetHandleProps } from '@gorhom/bottom-sheet';
import { StyleSheet } from 'react-native-unistyles';

import { HStack } from '@/components/primitives/hstack';
import { Box, BoxProps } from '@/components/primitives/box';
import { Text } from '@/components/primitives/text';
import { CloseButton } from '@/components/buttons/close';

interface HandleProps extends BottomSheetHandleProps {
    title?: string;
    compact?: boolean;
    closeButton?: boolean;
    containerStyle?: BoxProps['style'];
    leftButton?: ReactNode;
    handleClose: () => void;
}

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
}));

const Handle = ({
    title,
    compact = false,
    closeButton = true,
    handleClose,
    containerStyle,
    leftButton,
    ...props
}: HandleProps) => {
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
                        {closeButton && <CloseButton onPressHandler={handleClose} />}
                    </HStack>
                </HStack>
            )}
        </>
    );
};

export { Handle };
