import React from 'react';
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

let mockNextEditorInstance = 0;
const mockSourceEditorHost = (props: Record<string, unknown>) =>
    React.createElement('MockSourceEditor', props);
const mockSourceEditor = React.forwardRef(
    (
        props: Record<string, unknown>,
        ref: React.ForwardedRef<{
            focus: () => void;
            blur: () => void;
            getSelection: () => { start: number; end: number };
            setSelection: () => void;
        }>,
    ) => {
        const instance = React.useRef(++mockNextEditorInstance).current;
        React.useImperativeHandle(ref, () => ({
            focus: jest.fn(),
            blur: jest.fn(),
            getSelection: () => ({ start: 0, end: 0 }),
            setSelection: jest.fn(),
        }));

        return React.createElement(mockSourceEditorHost, { ...props, instance });
    },
);
mockSourceEditor.displayName = 'MockSourceEditor';

jest.mock('@workspace-sh/react-native-source-editor', () => ({
    __esModule: true,
    default: mockSourceEditor,
}));

jest.mock('react-native-unistyles', () => ({
    StyleSheet: {
        create: () => ({ editor: {} }),
    },
    useUnistyles: () => ({
        rt: { themeName: 'dark' },
        theme: {
            colors: { background: '#000000' },
            fontSize: { sm: { fontSize: 14 } },
            space: (value: number) => value,
        },
    }),
}));

const { SourceDocumentEditor } = jest.requireActual<typeof import('./source-document-editor')>(
    './source-document-editor',
);

describe('SourceDocumentEditor', () => {
    let tree: ReactTestRenderer | null = null;

    afterEach(() => {
        act(() => tree?.unmount());
        tree = null;
    });

    it('recreates the editor and parser when the document identity changes', () => {
        act(() => {
            tree = renderer.create(
                <SourceDocumentEditor
                    documentKey="json-document"
                    defaultValue={'{"enabled":true}'}
                    editable={false}
                    fileName="settings.json"
                />,
            );
        });

        const jsonEditor = tree!.root.findByType(mockSourceEditorHost);
        const jsonInstance = jsonEditor.props.instance as number;
        expect(jsonEditor.props.language).toBe('json');

        act(() => {
            tree!.update(
                <SourceDocumentEditor
                    documentKey="rust-document"
                    defaultValue="fn main() {}"
                    editable={false}
                    fileName="main.rs"
                />,
            );
        });

        const rustEditor = tree!.root.findByType(mockSourceEditorHost);
        expect(rustEditor.props.language).toBe('rust');
        expect(rustEditor.props.instance).not.toBe(jsonInstance);
    });

    it('passes a screen-owned top inset into the native editor', () => {
        act(() => {
            tree = renderer.create(
                <SourceDocumentEditor
                    documentKey="source-file"
                    defaultValue="fn main() {}"
                    editable={false}
                    fileName="main.rs"
                    contentTopInset={112}
                />,
            );
        });

        const editor = tree!.root.findByType(mockSourceEditorHost);
        expect(editor.props.contentInsets).toEqual({
            top: 112,
            right: 0,
            bottom: 0,
            left: 0,
        });
    });
});
