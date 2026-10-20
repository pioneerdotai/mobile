import { ForwardedRef, forwardRef } from 'react';
import { View, type ViewInstance, type ViewProps } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

export type BoxProps = ViewProps;

const styles = StyleSheet.create((theme) => ({
    container: {
        backgroundColor: 'transparent',
    },
}));

const Box = forwardRef<ViewInstance, BoxProps>(
    ({ style, ...rest }, ref: ForwardedRef<ViewInstance>) => {
        return <View ref={ref} style={[styles.container, style]} {...rest} />;
    },
);

Box.displayName = 'Box';

export { Box };
