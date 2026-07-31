import * as Clipboard from 'expo-clipboard';
import { Check, Copy } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { Pressable } from '@/components/primitives/pressable';

type CopyButtonProps = {
    value: string;
    accessibilityLabel: string;
    copiedAccessibilityLabel: string;
    iconSize?: number;
    iconColor?: string;
};

const COPIED_RESET_MS = 1_400;

export const CopyButton = ({
    value,
    accessibilityLabel,
    copiedAccessibilityLabel,
    iconSize,
    iconColor,
}: CopyButtonProps) => {
    const { theme } = useUnistyles();
    const [copied, setCopied] = useState(false);
    const disabled = value.trim().length === 0;
    const resolvedIconSize = iconSize ?? theme.space(3.25);
    const resolvedIconColor = iconColor ?? theme.colors.textMuted;

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

        try {
            await Clipboard.setStringAsync(value);
            setCopied(true);
        } catch {
            // Keep the copy icon when the platform clipboard rejects the write.
        }
    }, [disabled, value]);

    return (
        <Pressable
            accessibilityLabel={copied ? copiedAccessibilityLabel : accessibilityLabel}
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
                <Check size={resolvedIconSize} color={resolvedIconColor} />
            ) : (
                <Copy size={resolvedIconSize} color={resolvedIconColor} />
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
    pressed: {},
    disabled: {
        opacity: 0.4,
    },
}));
