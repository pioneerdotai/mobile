import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native-unistyles';

import { Box } from '@/components/primitives/box';
import { HStack } from '@/components/primitives/hstack';
import { Pressable } from '@/components/primitives/pressable';
import { Text } from '@/components/primitives/text';
import { VStack } from '@/components/primitives/vstack';

export type SettingsChoice<T extends string> = {
    value: T;
    title: string;
};

type SettingsChoiceListProps<T extends string> = {
    choices: SettingsChoice<T>[];
    value: T | null;
    onChange: (value: T) => void;
    footer?: ReactNode;
};

const styles = StyleSheet.create((theme) => ({
    choicesContainer: {
        gap: theme.space(0.5),
        backgroundColor: theme.colors.muted,
        borderRadius: theme.radius['4xl'],
        padding: theme.space(5),
    },
    choicesWrapper: {
        gap: theme.space(3),
    },
    choiceSeparator: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: theme.colors.border,
    },
    choicePressable: {
        width: '100%',
        alignSelf: 'stretch',
    },
    choiceContainer: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: theme.space(3),
    },
    iconContainer: (showTopBorder: boolean) => ({
        paddingTop: showTopBorder ? theme.space(3) : 0,
    }),
    iconWrapper: (checked: boolean) => ({
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: checked ? theme.colors.typography : theme.colors.border,
        backgroundColor: checked ? theme.colors.typography : theme.colors.muted,
        borderRadius: theme.radius.full,
        height: theme.space(6),
        width: theme.space(6),
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: theme.space(0.25),
    }),
    choiceTitleContainer: (showTopBorder: boolean) => ({
        flex: 1,
        gap: theme.space(2),
        paddingTop: showTopBorder ? theme.space(3) : 0,
    }),
    choiceTitle: {
        color: theme.colors.typography,
    },
}));

const SettingsChoiceRow = <T extends string>({
    choice,
    checked,
    showTopBorder,
    onPress,
}: {
    choice: SettingsChoice<T>;
    checked: boolean;
    showTopBorder: boolean;
    onPress: () => void;
}) => {
    return (
        <Pressable accessibilityRole="button" style={styles.choicePressable} onPress={onPress}>
            <VStack>
                {showTopBorder ? <Box style={styles.choiceSeparator} /> : null}
                <HStack style={styles.choiceContainer}>
                    <Box style={styles.iconContainer(showTopBorder)}>
                        <Box style={styles.iconWrapper(checked)} />
                    </Box>
                    <VStack style={styles.choiceTitleContainer(showTopBorder)}>
                        <Box>
                            <Text fontWeight="medium" style={styles.choiceTitle}>
                                {choice.title}
                            </Text>
                        </Box>
                    </VStack>
                </HStack>
            </VStack>
        </Pressable>
    );
};

export const SettingsChoiceList = <T extends string>({
    choices,
    value,
    onChange,
    footer,
}: SettingsChoiceListProps<T>) => {
    return (
        <VStack style={styles.choicesContainer}>
            <VStack style={styles.choicesWrapper}>
                {choices.map((choice, index) => (
                    <SettingsChoiceRow
                        key={choice.value}
                        choice={choice}
                        checked={choice.value === value}
                        showTopBorder={index > 0}
                        onPress={() => onChange(choice.value)}
                    />
                ))}
            </VStack>
            {footer}
        </VStack>
    );
};
