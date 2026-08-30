import { useEffect, useMemo, useRef } from 'react';
import { Platform } from 'react-native';
import SourceEditor from '@workspace-sh/react-native-source-editor';
import type { Language, SourceEditorRef } from '@workspace-sh/react-native-source-editor';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import {
    shouldUseLargeDocumentMode,
    sourceLanguageForFileName,
    sourceOffsetForLineColumn,
    utf8ByteLength,
} from './source-document';

type SourceDocumentEditorProps = {
    documentKey: string;
    value?: string;
    defaultValue?: string;
    byteLength?: number;
    editable: boolean;
    fileName?: string;
    language?: Language;
    lineNumbers?: boolean;
    initialLine?: number | null;
    initialColumn?: number | null;
    contentTopInset?: number;
    contentBottomInse?: number;
    onChangeText?: (value: string) => void;
};

export const SourceDocumentEditor = ({
    documentKey,
    value,
    defaultValue,
    byteLength,
    editable,
    fileName = '',
    language,
    lineNumbers = true,
    initialLine,
    initialColumn,
    contentTopInset,
    contentBottomInse,
    onChangeText,
}: SourceDocumentEditorProps) => {
    const editorRef = useRef<SourceEditorRef>(null);
    const { rt, theme } = useUnistyles();
    const content = value ?? defaultValue ?? '';
    const resolvedByteLength = byteLength ?? utf8ByteLength(content);
    const largeFileMode = shouldUseLargeDocumentMode(resolvedByteLength);
    const resolvedLanguage = largeFileMode
        ? 'plaintext'
        : (language ?? sourceLanguageForFileName(fileName));
    const sourceTheme = rt.themeName === 'dark' ? 'dark' : 'light';
    const font = useMemo(
        () => ({
            family: Platform.select({ ios: 'Menlo', android: 'monospace' }),
            size: theme.fontSize.sm.fontSize,
        }),
        [theme.fontSize.sm.fontSize],
    );

    useEffect(() => {
        const offset = sourceOffsetForLineColumn(content, initialLine, initialColumn);
        if (offset === null) {
            return;
        }

        const frame = requestAnimationFrame(() => {
            editorRef.current?.setSelection({ start: offset, end: offset });
        });

        return () => cancelAnimationFrame(frame);
    }, [content, documentKey, initialColumn, initialLine]);

    return (
        <SourceEditor
            key={documentKey}
            ref={editorRef}
            value={value}
            defaultValue={defaultValue}
            editable={editable}
            font={font}
            theme={sourceTheme}
            language={resolvedLanguage}
            lineNumbers={lineNumbers}
            largeFileMode={largeFileMode}
            contentInsets={{
                top: contentTopInset ?? theme.space(0),
                right: theme.space(0),
                bottom: contentBottomInse ?? theme.space(0),
                left: theme.space(0),
            }}
            onChangeText={onChangeText}
            style={styles.editor}
        />
    );
};

const styles = StyleSheet.create((theme) => ({
    editor: {
        flex: 1,
        minHeight: 0,
        backgroundColor: theme.colors.background,
    },
}));
