import { useEffect, useRef, type PropsWithChildren } from 'react';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { CircleAlert, CircleCheck, Zap } from 'lucide-react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { Backdrop } from '@/components/overlays/components/backdrop';
import { Handle } from '@/components/overlays/components/handle';
import { Box } from '@/components/primitives/box';
import { Pressable } from '@/components/primitives/pressable';
import { Text } from '@/components/primitives/text';

type NotificationProps = PropsWithChildren<{
    visible: boolean;
    type: 'lightning' | 'success' | 'info';
    buttonTitle: string;
    buttonDisabled?: boolean;
    dismissible?: boolean;
    onButtonPress: () => void;
    handleClose: () => void;
}>;

const Notification = ({
    visible,
    type,
    buttonTitle,
    buttonDisabled = false,
    dismissible = true,
    onButtonPress,
    handleClose,
    children,
}: NotificationProps) => {
    const bottomSheetModalRef = useRef<BottomSheetModal>(null);
    const { theme } = useUnistyles();

    useEffect(() => {
        if (visible) {
            bottomSheetModalRef.current?.present();
        } else {
            bottomSheetModalRef.current?.close();
        }
    }, [visible]);

    const handleSheetChanges = (index: number) => {
        if (index === -1 && visible) {
            handleClose();
        }
    };

    return (
        <BottomSheetModal
            ref={bottomSheetModalRef}
            backdropComponent={Backdrop}
            backgroundStyle={styles.background}
            enablePanDownToClose={dismissible}
            handleComponent={(props) => <Handle compact handleClose={handleClose} {...props} />}
            handleIndicatorStyle={styles.handleIndicator}
            handleStyle={styles.handle}
            onChange={handleSheetChanges}
            stackBehavior="push"
        >
            <BottomSheetView style={styles.sheet}>
                <Box style={styles.iconContainer}>
                    {type === 'lightning' ? (
                        <Zap
                            color={theme.colors.dangerText}
                            size={theme.space(10)}
                            strokeWidth={1}
                        />
                    ) : null}
                    {type === 'success' ? (
                        <CircleCheck
                            color={theme.colors.successText}
                            size={theme.space(10)}
                            strokeWidth={1}
                        />
                    ) : null}
                    {type === 'info' ? (
                        <CircleAlert
                            color={theme.colors.infoText}
                            size={theme.space(10)}
                            strokeWidth={1}
                        />
                    ) : null}
                </Box>
                <Box style={styles.content}>
                    {typeof children === 'string' ? (
                        <Box style={styles.stringContent}>
                            <Text style={styles.stringText}>{children}</Text>
                        </Box>
                    ) : (
                        children
                    )}
                </Box>
                <Box style={styles.buttonContainer}>
                    <Pressable
                        accessibilityRole="button"
                        disabled={buttonDisabled}
                        onPress={onButtonPress}
                        style={({ pressed }) => [
                            styles.button,
                            pressed && styles.buttonPressed,
                            buttonDisabled && styles.buttonDisabled,
                        ]}
                    >
                        <Text style={styles.buttonText}>{buttonTitle}</Text>
                    </Pressable>
                </Box>
            </BottomSheetView>
        </BottomSheetModal>
    );
};

const styles = StyleSheet.create((theme, rt) => ({
    background: {
        backgroundColor:
            rt.themeName === 'dark' ? theme.colors.neutral[925] : theme.colors.background,
        borderTopLeftRadius: theme.radius['4xl'],
        borderTopRightRadius: theme.radius['4xl'],
    },
    handle: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        borderTopLeftRadius: theme.radius['4xl'],
        borderTopRightRadius: theme.radius['4xl'],
    },
    handleIndicator: {
        backgroundColor: theme.colors.neutral[200],
    },
    sheet: {
        paddingBottom: rt.insets.bottom + theme.space(5),
    },
    iconContainer: {
        marginTop: theme.space(10),
        alignItems: 'center',
    },
    content: {
        marginTop: theme.space(5),
        paddingHorizontal: theme.space(6),
    },
    stringContent: {
        marginBottom: theme.space(10),
    },
    stringText: {
        color: theme.colors.typography,
        fontSize: theme.fontSize.default.fontSize,
        lineHeight: theme.fontSize.default.lineHeight,
        textAlign: 'center',
    },
    buttonContainer: {
        paddingHorizontal: theme.space(6),
    },
    button: {
        width: '100%',
        height: theme.space(14),
        borderRadius: theme.radius.full,
        backgroundColor: theme.colors.foreground,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonPressed: {
        opacity: 0.82,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    buttonText: {
        color: theme.colors.background,
        fontSize: theme.fontSize.default.fontSize,
        lineHeight: theme.fontSize.default.lineHeight,
        fontWeight: theme.fontWeight.semibold.fontWeight,
    },
}));

export { Notification };
