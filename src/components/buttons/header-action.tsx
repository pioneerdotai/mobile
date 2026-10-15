import { Check } from 'lucide-react-native';
import { useUnistyles } from 'react-native-unistyles';

import { BaseIconButton } from './base-icon-button';

type HeaderActionButtonProps = {
    accessibilityLabel?: string;
    disabled?: boolean;
    loading?: boolean;
    onPress: () => void;
};

const HeaderCheckButton = ({
    accessibilityLabel,
    disabled = false,
    loading = false,
    onPress,
}: HeaderActionButtonProps) => {
    const { theme } = useUnistyles();

    return (
        <BaseIconButton
            Icon={Check}
            accessibilityLabel={accessibilityLabel}
            disabled={disabled}
            iconSize={theme.space(6)}
            loading={loading}
            loadingSize={theme.space(5)}
            onPressHandler={onPress}
            variant="confirm"
        />
    );
};

export { HeaderCheckButton };
