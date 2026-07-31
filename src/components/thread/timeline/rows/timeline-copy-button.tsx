import { useTranslation } from 'react-i18next';

import { CopyButton } from '@/components/buttons/copy';

type TimelineCopyButtonProps = {
    value: string;
    label?: string;
};

export const TimelineCopyButton = ({ value, label }: TimelineCopyButtonProps) => {
    const { t } = useTranslation('threads');

    return (
        <CopyButton
            value={value}
            accessibilityLabel={label ?? t('timelineCopy')}
            copiedAccessibilityLabel={t('timelineCopied')}
        />
    );
};
