import { describe, expect, it, test } from '@jest/globals';
import type { Language } from '@workspace-sh/react-native-source-editor';
import packageJson from '../../../package.json';

import {
    LARGE_DOCUMENT_THRESHOLD_BYTES,
    shouldUseLargeDocumentMode,
    sourceLanguageForFileName,
    sourceOffsetForLineColumn,
    utf8ByteLength,
} from './source-document';

const syntaxLanguageCases: [string, Exclude<Language, 'plaintext'>][] = [
    ['README.md', 'markdown'],
    ['settings.JSON', 'json'],
    ['index.html', 'html'],
    ['theme.css', 'css'],
    ['workflow.yml', 'yaml'],
    ['main.go', 'go'],
    ['Main.java', 'java'],
    ['worker.mjs', 'javascript'],
    ['script.py', 'python'],
    ['native.c', 'c'],
    ['main.rs', 'rust'],
    ['.zshrc', 'bash'],
    ['types.ts', 'typescript'],
    ['component.tsx', 'tsx'],
    ['native.cpp', 'cpp'],
    ['App.swift', 'swift'],
    ['index.php', 'php'],
    ['Gemfile', 'ruby'],
    ['Program.cs', 'csharp'],
];

describe('source document helpers', () => {
    test.each(syntaxLanguageCases)('maps %s to %s', (fileName, expected) => {
        expect(sourceLanguageForFileName(fileName)).toBe(expected);
    });

    it('matches every language enabled by the thread markdown renderer', () => {
        const threadLanguages = packageJson['enriched-markdown'].codeHighlightLanguages.map(
            (language) => (language === 'c-sharp' ? 'csharp' : language),
        );
        const editorLanguages = syntaxLanguageCases.map(([, language]) => language);

        expect(new Set(editorLanguages)).toEqual(new Set(threadLanguages));
    });

    it('falls back to plaintext for an unsupported extension', () => {
        expect(sourceLanguageForFileName('Makefile')).toBe('plaintext');
    });

    it('counts UTF-8 bytes without relying on a browser TextEncoder', () => {
        expect(utf8ByteLength('aé🙂')).toBe(7);
    });

    it('enables large document mode only above the threshold', () => {
        expect(shouldUseLargeDocumentMode(LARGE_DOCUMENT_THRESHOLD_BYTES)).toBe(false);
        expect(shouldUseLargeDocumentMode(LARGE_DOCUMENT_THRESHOLD_BYTES + 1)).toBe(true);
    });

    it('resolves one-based line and column to a UTF-16 offset', () => {
        expect(sourceOffsetForLineColumn('one\ntwo\nthree', 2, 2)).toBe(5);
        expect(sourceOffsetForLineColumn('one\ntwo', 2, 99)).toBe(7);
        expect(sourceOffsetForLineColumn('one', 99, 1)).toBe(3);
        expect(sourceOffsetForLineColumn('one', null, null)).toBeNull();
    });
});
