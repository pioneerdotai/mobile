import {
    Pressable as DefaultPressable,
    PressableProps as DefaultPressableProps,
} from 'react-native';

export type PressableProps = DefaultPressableProps;

export const Pressable = ({ ...rest }: PressableProps) => {
    return <DefaultPressable {...rest} />;
};
