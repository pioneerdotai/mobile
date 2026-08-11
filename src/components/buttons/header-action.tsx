import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Check } from 'lucide-react-native';

import Spinner from '@/components/feedback/spinner';
import { Box } from '@/components/primitives/box';
import { Pressable } from '@/components/primitives/pressable';

type HeaderActionButtonProps = {
    accessibilityLabel?: string;
    disabled?: boolean;
    loading?: boolean;
    onPress: () => void;
};

const HeaderCheckButton = ({
    accessibilityLabel,
    disabled = false,
    loading = false,
    onPress,
}: HeaderActionButtonProps) => {
    const { theme } = useUnistyles();

    return (
        <Pressable
            accessibilityLabel={accessibilityLabel}
            accessibilityRole="button"
            accessibilityState={{ disabled: disabled || loading, busy: loading }}
            disabled={disabled || loading}
            onPress={onPress}
        >
            <Box style={[styles.container, (disabled || loading) && styles.disabled]}>
                {loading ? (
                    <Box style={styles.spinner}>
                        <Spinner color={theme.colors.white} size={theme.space(5)} />
                    </Box>
                ) : (
                    <Check color={theme.colors.white} size={theme.space(6)} />
                )}
            </Box>
        </Pressable>
    );
};

const styles = StyleSheet.create((theme) => ({
    container: {
        height: theme.space(11),
        width: theme.space(11),
        paddingHorizontal: theme.space(4),
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: theme.radius.full,
        backgroundColor: theme.colors.blue['500'],
    },
    disabled: { backgroundColor: theme.colors.blue['100'] },
    hidden: { opacity: 0 },
    spinner: {
        position: 'absolute',
        inset: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
}));

export { HeaderCheckButton };
