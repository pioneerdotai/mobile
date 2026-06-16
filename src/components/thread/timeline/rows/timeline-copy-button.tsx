import { useCallback, useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useTranslation } from 'react-i18next';

import { Pressable } from '@/components/primitives/pressable';

type TimelineCopyButtonProps = {
    value: string;
    label?: string;
};

const COPIED_RESET_MS = 1_400;

export const TimelineCopyButton = ({ value, label }: TimelineCopyButtonProps) => {
    const { theme } = useUnistyles();
    const { t } = useTranslation('threads');
    const [copied, setCopied] = useState(false);

    const accessibilityLabel = label ?? t('timelineCopy');
    const disabled = value.trim().length === 0;
    const iconSize = theme.space(3.25);
    const iconColor = theme.colors.textMuted;

    useEffect(() => {
        if (!copied) {
            return;
        }

        const timer = setTimeout(() => {
            setCopied(false);
        }, COPIED_RESET_MS);

        return () => {
            clearTimeout(timer);
        };
    }, [copied]);

    const copy = useCallback(async () => {
        if (disabled) {
            return;
        }

        await Clipboard.setStringAsync(value);
        setCopied(true);
    }, [disabled, value]);

    return (
        <Pressable
            accessibilityLabel={copied ? t('timelineCopied') : accessibilityLabel}
            accessibilityRole="button"
            disabled={disabled}
            onPress={() => void copy()}
            style={({ pressed }) => [
                styles.button,
                disabled && styles.disabled,
                pressed && !disabled && styles.pressed,
            ]}
        >
            {copied ? (
                <Check size={iconSize} color={iconColor} />
            ) : (
                <Copy size={iconSize} color={iconColor} />
            )}
        </Pressable>
    );
};

const styles = StyleSheet.create((theme) => ({
    button: {
        minHeight: theme.space(7),
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.space(1.25),
        borderRadius: theme.radius.lg,
        paddingHorizontal: theme.space(2),
    },
    pressed: {
        backgroundColor: theme.colors.surfaceMuted,
    },
    disabled: {
        opacity: 0.4,
    },
}));
