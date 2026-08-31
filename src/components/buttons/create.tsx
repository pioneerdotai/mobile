import { Plus } from 'lucide-react-native';

import { BaseIconButton, type BaseIconButtonProps } from './base-icon-button';

export type CreateButtonProps = Omit<BaseIconButtonProps, 'Icon' | 'iconStyle'>;

const CreateButton = (props: CreateButtonProps) => {
    return <BaseIconButton {...props} Icon={Plus} />;
};

export { CreateButton };
