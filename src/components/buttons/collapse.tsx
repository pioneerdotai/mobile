import { useUnistyles, StyleSheet } from 'react-native-unistyles';
import { ChevronDown } from 'lucide-react-native';

import { Pressable } from '../primitives/pressable';
import { Box } from '../primitives/box';

interface CollapseButtonProps {
    onPressHandler: () => void;
}

const styles = StyleSheet.create((theme) => ({
    container: {
        height: theme.space(11),
        width: theme.space(11),
        backgroundColor: theme.colors.foreground,
        borderRadius: theme.radius.full,
        justifyContent: 'center',
        alignItems: 'center',
    },
    icon: {
        marginTop: theme.space(0.5),
    },
}));

const CollapseButton = ({ onPressHandler }: CollapseButtonProps) => {
    const { theme, rt } = useUnistyles();

    return (
        <Pressable onPress={onPressHandler}>
            <Box style={styles.container}>
                <ChevronDown
                    style={styles.icon}
                    size={theme.space(7)}
                    color={rt.themeName === 'dark' ? theme.colors.neutral[950] : theme.colors.white}
                />
            </Box>
        </Pressable>
    );
};

export { CollapseButton };
