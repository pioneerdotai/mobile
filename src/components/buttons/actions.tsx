import { useUnistyles, StyleSheet } from 'react-native-unistyles';
import { Ellipsis } from 'lucide-react-native';

import { Pressable } from '../primitives/pressable';
import { Box } from '../primitives/box';

interface BackButtonProps {
    accessibilityLabel?: string;
    backgroundColor?: string;
    onPressHandler: () => void;
}

const styles = StyleSheet.create((theme) => ({
    container: (backgroundColor?: string) => ({
        height: theme.space(11),
        width: theme.space(11),
        backgroundColor: backgroundColor || theme.colors.foreground,
        borderRadius: theme.radius.full,
        justifyContent: 'center',
        alignItems: 'center',
    }),
}));

const ActionsButton = ({
    accessibilityLabel,
    backgroundColor,
    onPressHandler,
}: BackButtonProps) => {
    const { theme, rt } = useUnistyles();

    return (
        <Pressable
            accessibilityLabel={accessibilityLabel}
            accessibilityRole="button"
            onPress={onPressHandler}
        >
            <Box style={styles.container(backgroundColor)}>
                <Ellipsis
                    size={theme.space(7)}
                    color={rt.themeName === 'dark' ? theme.colors.neutral[950] : theme.colors.white}
                />
            </Box>
        </Pressable>
    );
};

export { ActionsButton };
