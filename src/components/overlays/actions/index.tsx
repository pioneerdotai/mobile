import { useEffect, useRef, type PropsWithChildren } from 'react';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { Backdrop } from '@/components/overlays/components/backdrop';
import { Handle } from '@/components/overlays/components/handle';

type ActionsSheetProps = PropsWithChildren<{
    open: boolean;
    title?: string;
    showCloseButton?: boolean;
    onClose: () => void;
}>;

const ActionsSheet = ({
    open,
    title,
    showCloseButton = false,
    onClose,
    children,
}: ActionsSheetProps) => {
    const bottomSheetRef = useRef<BottomSheetModal>(null);
    const { theme, rt } = useUnistyles();

    useEffect(() => {
        if (open) {
            bottomSheetRef.current?.present();
        } else {
            bottomSheetRef.current?.close();
        }
    }, [open]);

    const handleSheetChanges = (index: number) => {
        if (index === -1 && open) {
            onClose();
        }
    };

    return (
        <BottomSheetModal
            ref={bottomSheetRef}
            backdropComponent={(props) => <Backdrop {...props} pressBehavior="close" />}
            handleComponent={(props) => (
                <Handle
                    handleClose={onClose}
                    title={title}
                    compact={!title}
                    closeButton={showCloseButton}
                    containerStyle={styles.container}
                    {...props}
                />
            )}
            onChange={handleSheetChanges}
            stackBehavior="push"
            topInset={rt.insets.top + theme.space(5)}
            backgroundStyle={styles.backgroundStyle}
            handleStyle={styles.sheetHandle}
            handleIndicatorStyle={styles.sheetHandleIndicator}
        >
            <BottomSheetView style={styles.sheetContentContainer}>{children}</BottomSheetView>
        </BottomSheetModal>
    );
};

const styles = StyleSheet.create((theme, rt) => ({
    container: {
        backgroundColor: theme.colors.background,
    },
    backgroundStyle: {
        backgroundColor:
            rt.themeName === 'dark' ? theme.colors.neutral[925] : theme.colors.background,
        borderTopRightRadius: theme.radius['4xl'],
        borderTopLeftRadius: theme.radius['4xl'],
    },
    sheetHandle: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        borderTopRightRadius: theme.radius['4xl'],
        borderTopLeftRadius: theme.radius['4xl'],
    },
    sheetHandleIndicator: {
        backgroundColor: theme.colors.typography,
        opacity: 0.2,
    },
    sheetContentContainer: {
        paddingTop: theme.space(5),
        paddingBottom: rt.insets.bottom + theme.space(5),
    },
}));

export { ActionsSheet };
