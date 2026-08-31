import { X } from 'lucide-react-native';

import { BaseIconButton, type BaseIconButtonProps } from './base-icon-button';

export type CloseButtonProps = Omit<BaseIconButtonProps, 'Icon' | 'iconStyle'>;

const CloseButton = (props: CloseButtonProps) => {
    return <BaseIconButton {...props} Icon={X} />;
};

export { CloseButton };
