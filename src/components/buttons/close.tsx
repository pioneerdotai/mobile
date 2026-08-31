import { X } from 'lucide-react-native';
import { StyleSheet } from 'react-native-unistyles';

import { BaseIconButton, type BaseIconButtonProps } from './base-icon-button';

export type CloseButtonProps = Omit<BaseIconButtonProps, 'Icon' | 'iconStyle'>;

const styles = StyleSheet.create((theme) => ({
    icon: {
        marginLeft: -theme.space(0.5),
    },
}));

const CloseButton = (props: CloseButtonProps) => {
    return <BaseIconButton {...props} Icon={X} iconStyle={styles.icon} />;
};

export { CloseButton };
