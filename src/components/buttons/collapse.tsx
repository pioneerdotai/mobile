import { useUnistyles, StyleSheet } from 'react-native-unistyles';
import { ChevronDown, ChevronLeft } from 'lucide-react-native';

import { Pressable } from '../primitives/pressable';
import { Box } from '../primitives/box';

interface CollapseButtonProps {
    onPressHandler: () => void;
    icon?: 'down' | 'left';
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

const CollapseButton = ({ onPressHandler, icon = 'down' }: CollapseButtonProps) => {
    const { theme, rt } = useUnistyles();
    const Icon = icon === 'left' ? ChevronLeft : ChevronDown;

    return (
        <Pressable onPress={onPressHandler}>
            <Box style={styles.container}>
                <Icon
                    style={styles.icon}
                    size={theme.space(7)}
                    color={rt.themeName === 'dark' ? theme.colors.neutral[950] : theme.colors.white}
                />
            </Box>
        </Pressable>
    );
};

export { CollapseButton };
