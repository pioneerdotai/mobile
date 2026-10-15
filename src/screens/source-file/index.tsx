import { useCallback, useEffect, useState } from 'react';
import { StyleSheet as RNStyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { Button } from '@/components/buttons/base';
import { shouldUseLargeDocumentMode } from '@/components/editor/source-document';
import { SourceDocumentEditor } from '@/components/editor/source-document-editor';
import Spinner from '@/components/feedback/spinner';
import { Box } from '@/components/primitives/box';
import { Text } from '@/components/primitives/text';
import { VStack } from '@/components/primitives/vstack';
import {
    loadThreadFile,
    ThreadFileLoadError,
    type LoadedThreadFile,
    type ThreadFileLoadErrorCode,
} from '@/services/thread-files/loader';
import type { ThreadFileIntent } from '@/services/thread-files/intent';

type SourceFileScreenProps = {
    intentId: string;
    intent: ThreadFileIntent | null;
    onFileNameChange?: (fileName: string) => void;
};

type LoadState =
    | { intentId: string; kind: 'loading' }
    | { intentId: string; kind: 'loaded'; file: LoadedThreadFile }
    | { intentId: string; kind: 'failed'; code: ThreadFileLoadErrorCode };

const sourceFileErrorCode = (error: unknown): ThreadFileLoadErrorCode => {
    return error instanceof ThreadFileLoadError ? error.code : 'unavailable';
};

const SourceFileScreen = ({ intentId, intent, onFileNameChange }: SourceFileScreenProps) => {
    const { t } = useTranslation('editor');
    const { theme } = useUnistyles();
    const [loadGeneration, setLoadGeneration] = useState(0);
    const [state, setState] = useState<LoadState>(() =>
        intent ? { intentId, kind: 'loading' } : { intentId, kind: 'failed', code: 'unavailable' },
    );
    const visibleState: LoadState =
        state.intentId === intentId
            ? state
            : intent
              ? { intentId, kind: 'loading' }
              : { intentId, kind: 'failed', code: 'unavailable' };

    useEffect(() => {
        if (!intent) {
            return;
        }

        let cancelled = false;
        void loadThreadFile(intent)
            .then((file) => {
                if (cancelled) return;
                setState({ intentId, kind: 'loaded', file });
                onFileNameChange?.(file.fileName);
            })
            .catch((error: unknown) => {
                if (!cancelled) {
                    setState({
                        intentId,
                        kind: 'failed',
                        code: sourceFileErrorCode(error),
                    });
                }
            });

        return () => {
            cancelled = true;
        };
    }, [intentId, intent, loadGeneration, onFileNameChange]);

    const retry = useCallback(() => {
        setState({ intentId, kind: 'loading' });
        setLoadGeneration((current) => current + 1);
    }, [intentId]);

    if (visibleState.kind === 'loading') {
        return (
            <VStack style={styles.stateContainer}>
                <Spinner size={theme.space(5)} color={theme.colors.typography} />
                <Text style={styles.stateLabel}>{t('fileViewerLoading')}</Text>
            </VStack>
        );
    }

    if (visibleState.kind === 'failed') {
        return (
            <VStack style={styles.stateContainer}>
                <Text style={styles.errorTitle}>{t(`fileViewerErrors.${visibleState.code}`)}</Text>
                {intent ? (
                    <Button
                        title={t('retry', { ns: 'common' })}
                        size="sm"
                        containerStyle={styles.retryButton}
                        onPress={retry}
                    />
                ) : null}
            </VStack>
        );
    }

    const largeFileMode = shouldUseLargeDocumentMode(visibleState.file.sizeBytes);

    const contentTopInset = theme.screenContentPadding('child').paddingTop;
    const contentBottomInset = theme.screenContentPadding('child').paddingBottom;

    return (
        <Box style={styles.container}>
            {largeFileMode ? (
                <Text style={styles.largeFileNotice}>{t('fileViewerLargeFileNotice')}</Text>
            ) : null}
            <Box style={styles.editorWrap}>
                <SourceDocumentEditor
                    documentKey={intentId}
                    value={visibleState.file.content}
                    byteLength={visibleState.file.sizeBytes}
                    editable={false}
                    fileName={visibleState.file.fileName}
                    initialLine={visibleState.file.line}
                    initialColumn={visibleState.file.column}
                    lineNumbers
                    contentTopInset={contentTopInset}
                    contentBottomInse={contentBottomInset}
                />
            </Box>
        </Box>
    );
};

const styles = StyleSheet.create((theme, rt) => ({
    container: {
        flex: 1,
        minHeight: 0,
        backgroundColor: theme.colors.background,
    },
    editorWrap: {
        flex: 1,
        minHeight: 0,
    },
    stateContainer: {
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
        gap: theme.space(4),
        paddingTop: theme.screenContentPadding('child').paddingTop,
        paddingHorizontal: theme.space(4),
        backgroundColor: theme.colors.background,
    },
    stateLabel: {
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
    },
    errorTitle: {
        color: theme.colors.dangerText,
        fontSize: theme.fontSize.default.fontSize,
        lineHeight: theme.fontSize.default.lineHeight,
        fontWeight: theme.fontWeight.medium.fontWeight,
        textAlign: 'center',
    },
    retryButton: {
        alignSelf: 'center',
        minWidth: theme.space(32),
        paddingHorizontal: theme.space(5),
    },
    largeFileNotice: {
        color: theme.colors.textMuted,
        backgroundColor: theme.colors.surfaceMuted,
        borderBottomColor: theme.colors.border,
        borderBottomWidth: RNStyleSheet.hairlineWidth,
        fontSize: theme.fontSize.xs.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
        paddingHorizontal: theme.space(3),
        paddingVertical: theme.space(2),
    },
}));

export default SourceFileScreen;
