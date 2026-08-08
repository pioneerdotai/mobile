import { type ComponentRef, type FC, useEffect, useMemo, useRef, useState } from 'react';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { Keyboard } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { Button } from '@/components/buttons/base';
import { HStack } from '@/components/primitives/hstack';
import { stableOutlineWidth } from '@/helpers/styles';

const styles = StyleSheet.create((theme, rt) => ({
    inputContainer: {
        height: theme.space(10),
        paddingHorizontal: theme.space(4),
        alignItems: 'center',
        backgroundColor:
            rt.themeName === 'dark' ? theme.colors.neutral[900] : theme.colors.neutral[100],
        borderWidth: stableOutlineWidth,
        borderColor:
            rt.themeName === 'dark' ? theme.colors.neutral[900] : theme.colors.neutral[100],
        borderRadius: theme.radius.full,
    },
    input: {
        height: '100%',
        width: '100%',
        color: theme.colors.typography,
        fontSize: theme.fontSize.default.fontSize,
        fontWeight: theme.fontWeight.medium.fontWeight,
    },
    inputWrapper: {
        flex: 1,
    },
    row: {
        alignItems: 'center',
        gap: 0,
    },
}));

interface SearchProps {
    value: string;
    onChange: (text: string) => void;
    placeholder: string;
    dismissText: string;
}

export const Search: FC<SearchProps> = ({ value, onChange, placeholder, dismissText }) => {
    const { theme } = useUnistyles();
    const inputRef = useRef<ComponentRef<typeof BottomSheetTextInput>>(null);
    const [isFocused, setIsFocused] = useState(false);
    const [manualHide, setManualHide] = useState(false);
    const visible = useSharedValue(0);
    const btnW = useSharedValue(0);

    const animatedStyle = useAnimatedStyle(() => {
        const spacing = 8;
        const distance = (btnW.get() || 40) + spacing;
        const visibility = visible.get();

        return {
            opacity: visibility,
            transform: [
                {
                    translateX: distance * (1 - visibility),
                },
            ],
        };
    });

    const inputAnimatedStyle = useAnimatedStyle(() => {
        const spacing = 8;
        const distance = (btnW.get() || 40) + spacing;
        return {
            paddingRight: distance * visible.get(),
        };
    });

    const label = useMemo(() => dismissText, [dismissText]);
    useEffect(() => {
        const shouldShow = (isFocused || !!value) && !manualHide;
        visible.set(withTiming(shouldShow ? 1 : 0, { duration: 180 }));
    }, [isFocused, value, manualHide, visible]);

    const handleDismiss = () => {
        Keyboard.dismiss();
        inputRef.current?.blur?.();
        setManualHide(true);
    };

    const handleSubmit = () => {
        Keyboard.dismiss();
        inputRef.current?.blur?.();
        setManualHide(true);
    };

    const handleFocus = () => {
        setIsFocused(true);
        setManualHide(false);
        visible.set(withTiming(1, { duration: 180 }));
    };

    const handleBlur = () => {
        setIsFocused(false);
        visible.set(withTiming(0, { duration: 180 }));
    };

    return (
        <HStack style={styles.row}>
            <Animated.View style={[styles.inputWrapper, inputAnimatedStyle]}>
                <HStack style={styles.inputContainer}>
                    <BottomSheetTextInput
                        ref={inputRef}
                        value={value}
                        onChangeText={onChange}
                        placeholder={placeholder}
                        placeholderTextColor={theme.colors.neutral[400]}
                        style={styles.input}
                        autoCapitalize="none"
                        autoCorrect={false}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        onSubmitEditing={handleSubmit}
                    />
                </HStack>
            </Animated.View>
            <Animated.View
                style={[
                    animatedStyle,
                    {
                        position: 'absolute',
                        right: 0,
                    },
                ]}
                onLayout={(event) => {
                    btnW.set(event.nativeEvent.layout.width);
                }}
            >
                <Button type="link" title={label} onPress={handleDismiss} />
            </Animated.View>
        </HStack>
    );
};
