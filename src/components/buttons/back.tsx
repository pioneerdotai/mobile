import { ChevronLeft } from 'lucide-react-native';
import { StyleSheet } from 'react-native-unistyles';

import { BaseIconButton, type BaseIconButtonProps } from './base-icon-button';

export type BackButtonProps = Omit<BaseIconButtonProps, 'Icon' | 'iconStyle'>;

const styles = StyleSheet.create((theme) => ({
    icon: {
        marginLeft: -theme.space(0.5),
    },
}));

const BackButton = (props: BackButtonProps) => {
    return <BaseIconButton {...props} Icon={ChevronLeft} iconStyle={styles.icon} />;
};

export { BackButton };
