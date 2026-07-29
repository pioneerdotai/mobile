import { useCallback, useEffect, useRef } from 'react';
import { OtpInput as NativeOtpInput, type OtpInputRef } from 'react-native-otp-entry';
import { View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { Label } from '@/components/forms/label';
import { Text } from '@/components/primitives/text';
import { VStack } from '@/components/primitives/vstack';
import { stableOutlineWidth } from '@/helpers/styles';
import { sanitizeDeviceActivationCodeInput } from '@/services/gateway/device-activation-code';

export type OtpInputProps = {
    label?: string | null;
    error?: string | null;
    value: string;
    onChangeText: (value: string) => void;
    onBlur?: () => void;
    disabled?: boolean;
    accessibilityLabel?: string;
};

export const OtpInput = ({
    label,
    error,
    value,
    onChangeText,
    onBlur,
    disabled = false,
    accessibilityLabel,
}: OtpInputProps) => {
    const { theme } = useUnistyles();
    const inputRef = useRef<OtpInputRef>(null);
    const internalValue = useRef('');
    const canonicalValue = sanitizeDeviceActivationCodeInput(value);

    useEffect(() => {
        if (internalValue.current === canonicalValue) {
            return;
        }
        if (disabled) {
            // react-native-otp-entry deliberately ignores `setValue` while
            // disabled. Its imperative `clear` still removes the rendered
            // secret, so clear immediately but defer non-empty controlled
            // updates until the widget becomes editable again.
            if (!canonicalValue) {
                internalValue.current = '';
                inputRef.current?.clear();
            }
            return;
        }
        internalValue.current = canonicalValue;
        inputRef.current?.setValue(canonicalValue);
    }, [canonicalValue, disabled]);

    const handleTextChange = useCallback(
        (nextValue: string) => {
            const canonical = sanitizeDeviceActivationCodeInput(nextValue);
            internalValue.current = canonical;
            onChangeText(canonical);
        },
        [onChangeText],
    );

    const handleRawTextChange = useCallback((nextValue: string) => {
        const canonical = sanitizeDeviceActivationCodeInput(nextValue);
        if (canonical === internalValue.current) {
            return;
        }
        inputRef.current?.setValue(canonical);
    }, []);

    return (
        <VStack style={styles.container}>
            {label ? <Label>{label}</Label> : null}
            <View style={styles.inputFrame}>
                <NativeOtpInput
                    ref={inputRef}
                    numberOfDigits={8}
                    type="alphanumeric"
                    autoFocus={false}
                    blurOnFilled={false}
                    disabled={disabled}
                    secureTextEntry={false}
                    focusColor={error ? theme.colors.dangerBorder : theme.colors.accent}
                    onTextChange={handleTextChange}
                    onBlur={onBlur}
                    textInputProps={{
                        accessibilityLabel: accessibilityLabel ?? label ?? undefined,
                        autoCapitalize: 'characters',
                        autoCorrect: false,
                        spellCheck: false,
                        maxLength: 9,
                        onChangeText: handleRawTextChange,
                    }}
                    textProps={{
                        allowFontScaling: false,
                        accessible: false,
                    }}
                    theme={{
                        containerStyle: styles.inputContainer,
                        pinCodeContainerStyle: error ? styles.cellError : styles.cell,
                        pinCodeTextStyle: styles.cellText,
                        focusedPinCodeContainerStyle: error
                            ? styles.cellFocusedError
                            : styles.cellFocused,
                        filledPinCodeContainerStyle: error ? styles.cellError : styles.cellFilled,
                        disabledPinCodeContainerStyle: styles.cellDisabled,
                        focusStickStyle: error ? styles.stickError : styles.stick,
                    }}
                />
                <Text accessible={false} pointerEvents="none" style={styles.groupSeparator}>
                    -
                </Text>
            </View>
            {error ? <Text style={styles.error}>{error}</Text> : null}
        </VStack>
    );
};

const styles = StyleSheet.create((theme) => {
    const cell = {
        // Keep enough inter-cell space for the visual 4+4 separator even on
        // the narrowest supported phone form width.
        width: theme.space(10),
        height: theme.space(14),
        minHeight: theme.space(14),
        borderRadius: theme.radius['2xl'],
        borderWidth: 0,
        backgroundColor: theme.colors.background,
    } as const;

    return {
        container: {
            gap: theme.space(2.5),
        },
        inputFrame: {
            position: 'relative',
            width: '100%',
        },
        inputContainer: {
            width: '100%',
            borderRadius: theme.radius['2xl'],
            borderWidth: stableOutlineWidth,
            borderColor: theme.colors.border,
        },
        groupSeparator: {
            position: 'absolute',
            left: '50%',
            top: theme.space(3.75),
            color: theme.colors.typography,
            fontSize: theme.fontSize.lg.fontSize,
            opacity: 0.6,
            transform: [{ translateX: -4 }],
        },
        cell,
        cellFocused: {
            borderColor: theme.colors.accent,
        },
        cellFocusedError: {
            borderColor: theme.colors.dangerBorder,
        },
        cellFilled: {
            borderColor: theme.colors.border,
        },
        cellError: {
            ...cell,
            borderColor: theme.colors.dangerBorder,
        },
        cellDisabled: {
            opacity: 0.55,
        },
        cellText: {
            color: theme.colors.typography,
            fontSize: theme.fontSize.lg.fontSize,
            fontWeight: theme.fontWeight.semibold.fontWeight,
        },
        stick: {
            backgroundColor: theme.colors.accent,
        },
        stickError: {
            backgroundColor: theme.colors.dangerText,
        },
        error: {
            ...theme.fontSize.xs,
            color: theme.colors.dangerText,
            fontWeight: theme.fontWeight.medium.fontWeight,
        },
    };
});
