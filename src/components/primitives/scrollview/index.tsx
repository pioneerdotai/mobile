import { ScrollView as DefaultScrollView } from 'react-native';

export type ScrollViewProps = DefaultScrollView['props'];

export const ScrollView = ({ ...rest }: ScrollViewProps) => {
    return <DefaultScrollView {...rest} />;
};
