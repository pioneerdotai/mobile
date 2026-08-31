import { Ellipsis } from 'lucide-react-native';

import { BaseIconButton, type BaseIconButtonProps } from './base-icon-button';

export type ActionsButtonProps = Omit<BaseIconButtonProps, 'Icon' | 'iconStyle'>;

const ActionsButton = (props: ActionsButtonProps) => {
    return <BaseIconButton {...props} Icon={Ellipsis} />;
};

export { ActionsButton };
