import { ChevronDown } from 'lucide-react-native';
import { StyleSheet } from 'react-native-unistyles';

import { BaseIconButton, type BaseIconButtonProps } from './base-icon-button';

export type CollapseButtonProps = Omit<BaseIconButtonProps, 'Icon' | 'iconStyle'>;

const styles = StyleSheet.create((theme) => ({
    icon: {
        marginTop: theme.space(0.5),
    },
}));

const CollapseButton = (props: CollapseButtonProps) => {
    return <BaseIconButton {...props} Icon={ChevronDown} iconStyle={styles.icon} />;
};

export { CollapseButton };
