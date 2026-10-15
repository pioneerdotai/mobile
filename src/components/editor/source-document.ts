import type { Language } from '@workspace-sh/react-native-source-editor';

export const LARGE_DOCUMENT_THRESHOLD_BYTES = 1024 * 1024;

const baseNameOf = (fileName: string): string => {
    const cleanName = fileName.split(/[?#]/, 1)[0] ?? '';
    return cleanName.split(/[\\/]/).pop() ?? '';
};

const extensionOf = (fileName: string): string => {
    const baseName = baseNameOf(fileName);
    const extensionIndex = baseName.lastIndexOf('.');

    if (extensionIndex <= 0 || extensionIndex === baseName.length - 1) {
        return '';
    }

    return baseName.slice(extensionIndex + 1).toLowerCase();
};

export const sourceLanguageForFileName = (fileName: string): Language => {
    switch (baseNameOf(fileName).toLowerCase()) {
        case '.bashrc':
        case '.bash_profile':
        case '.profile':
        case '.zshrc':
            return 'bash';
        case 'gemfile':
        case 'rakefile':
            return 'ruby';
    }

    switch (extensionOf(fileName)) {
        case 'md':
        case 'markdown':
        case 'mdx':
            return 'markdown';
        case 'json':
        case 'jsonc':
            return 'json';
        case 'html':
        case 'htm':
            return 'html';
        case 'css':
            return 'css';
        case 'yaml':
        case 'yml':
            return 'yaml';
        case 'go':
            return 'go';
        case 'java':
            return 'java';
        case 'js':
        case 'jsx':
        case 'mjs':
        case 'cjs':
            return 'javascript';
        case 'py':
        case 'pyw':
            return 'python';
        case 'c':
        case 'h':
            return 'c';
        case 'rs':
            return 'rust';
        case 'bash':
        case 'sh':
        case 'zsh':
            return 'bash';
        case 'ts':
        case 'mts':
        case 'cts':
            return 'typescript';
        case 'tsx':
            return 'tsx';
        case 'cc':
        case 'cpp':
        case 'cxx':
        case 'hh':
        case 'hpp':
        case 'hxx':
            return 'cpp';
        case 'swift':
            return 'swift';
        case 'php':
        case 'php3':
        case 'php4':
        case 'php5':
        case 'phtml':
            return 'php';
        case 'rb':
        case 'rake':
            return 'ruby';
        case 'cs':
            return 'csharp';
        default:
            return 'plaintext';
    }
};

export const utf8ByteLength = (value: string): number => {
    let bytes = 0;

    for (let index = 0; index < value.length; index += 1) {
        const codeUnit = value.charCodeAt(index);
        if (codeUnit <= 0x7f) {
            bytes += 1;
        } else if (codeUnit <= 0x7ff) {
            bytes += 2;
        } else if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
            const nextCodeUnit = value.charCodeAt(index + 1);
            if (nextCodeUnit >= 0xdc00 && nextCodeUnit <= 0xdfff) {
                bytes += 4;
                index += 1;
            } else {
                bytes += 3;
            }
        } else {
            bytes += 3;
        }
    }

    return bytes;
};

export const shouldUseLargeDocumentMode = (byteLength: number): boolean => {
    return byteLength > LARGE_DOCUMENT_THRESHOLD_BYTES;
};

export const sourceOffsetForLineColumn = (
    value: string,
    line: number | null | undefined,
    column: number | null | undefined,
): number | null => {
    if (!line || !Number.isFinite(line) || line < 1) {
        return null;
    }

    let lineStart = 0;
    let currentLine = 1;
    while (currentLine < Math.trunc(line)) {
        const nextLineBreak = value.indexOf('\n', lineStart);
        if (nextLineBreak < 0) {
            return value.length;
        }
        lineStart = nextLineBreak + 1;
        currentLine += 1;
    }

    const lineEnd = value.indexOf('\n', lineStart);
    const boundedLineEnd = lineEnd < 0 ? value.length : lineEnd;
    const zeroBasedColumn = column && Number.isFinite(column) ? Math.max(0, column - 1) : 0;

    return Math.min(lineStart + Math.trunc(zeroBasedColumn), boundedLineEnd);
};
