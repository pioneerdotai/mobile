import { StyleSheet } from 'react-native-unistyles';
import { Box, BoxProps } from '../box';

const styles = StyleSheet.create(() => ({
    container: {
        flexDirection: 'column',
    },
}));

export const VStack = ({ style, ...rest }: BoxProps) => {
    return <Box style={[styles.container, style]} {...rest} />;
};
