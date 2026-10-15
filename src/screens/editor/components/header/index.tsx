import { FC, ReactNode } from 'react';
import { StyleSheet } from 'react-native-unistyles';

import { HStack } from '@/components/primitives/hstack';
import { VStack } from '@/components/primitives/vstack';
import { Title } from '@/components/typography/title';
import { Box } from '@/components/primitives/box';
import { Text } from '@/components/primitives/text';
import { CloseButton } from '@/components/buttons/close';

interface HeaderProps {
    title?: string | null;
    description?: string | null;
    handleClose?: (() => void) | null;
    closeDisabled?: boolean;
    actions?: ReactNode;
}

const styles = StyleSheet.create((theme) => ({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        justifyContent: 'flex-end',
        height: theme.screenHeaderHeight(),
        paddingHorizontal: theme.space(4),
    },
    titleContainer: {
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    actionsContainer: {
        gap: theme.space(2),
    },
    closeContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    description: {
        color: theme.colors.neutral[600],
    },
}));

const Header: FC<HeaderProps> = ({
    title,
    description,
    handleClose,
    actions,
    closeDisabled = false,
}) => {
    const handleClosePress = () => {
        if (!closeDisabled && handleClose) handleClose();
    };

    return (
        <VStack style={styles.container}>
            <HStack style={styles.titleContainer}>
                <Box>{title && <Title type="h2">{title}</Title>}</Box>
                <HStack style={styles.actionsContainer}>
                    {actions && actions}
                    {handleClose && (
                        <Box style={styles.closeContainer}>
                            <CloseButton onPressHandler={handleClosePress} />
                        </Box>
                    )}
                </HStack>
            </HStack>
            {description && (
                <Box>
                    <Text fontSize="lg" fontWeight="medium" style={styles.description}>
                        {description}
                    </Text>
                </Box>
            )}
        </VStack>
    );
};

export { Header };
