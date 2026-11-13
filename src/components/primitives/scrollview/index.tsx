import { ScrollView as DefaultScrollView, type ScrollViewProps } from 'react-native';

export type { ScrollViewProps };

export const ScrollView = ({ ...rest }: ScrollViewProps) => {
    return <DefaultScrollView {...rest} />;
};
