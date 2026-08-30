import {
    pioneerClient,
    type ClientThreadFileViewOpenRequest,
    type ClientThreadFileViewOpenResult,
} from '@/client';
import { utf8ByteLength } from '@/components/editor/source-document';

import type { ThreadFileIntent } from './intent';

export const MAX_THREAD_FILE_BYTES = 10 * 1024 * 1024;

export type ThreadFileLoadErrorCode = 'expired' | 'invalid_content' | 'too_large' | 'unavailable';

export type LoadedThreadFile = Readonly<{
    content: string;
    contentType: string;
    fileName: string;
    sizeBytes: number;
    line: number | null;
    column: number | null;
}>;

export type ThreadFileLoaderPorts = Readonly<{
    open(request: ClientThreadFileViewOpenRequest): Promise<ClientThreadFileViewOpenResult>;
    fetch(url: string): Promise<Response>;
    nowUnixSeconds(): number;
}>;

export class ThreadFileLoadError extends Error {
    readonly code: ThreadFileLoadErrorCode;

    constructor(code: ThreadFileLoadErrorCode) {
        super(code);
        this.name = 'ThreadFileLoadError';
        this.code = code;
    }
}

const defaultPorts: ThreadFileLoaderPorts = {
    open: (request) => pioneerClient.threadFileViewOpen(request),
    fetch: (url) =>
        fetch(url, {
            method: 'GET',
            credentials: 'omit',
        }),
    nowUnixSeconds: () => Math.floor(Date.now() / 1000),
};

const TEXTUAL_APPLICATION_TYPES = new Set([
    'application/json',
    'application/toml',
    'application/xml',
    'application/yaml',
]);

const validSize = (value: number): boolean => {
    return Number.isSafeInteger(value) && value >= 0 && value <= MAX_THREAD_FILE_BYTES;
};

const validGrantUrl = (value: unknown): value is string => {
    if (typeof value !== 'string') return false;
    try {
        const url = new URL(value);
        return (
            (url.protocol === 'https:' || url.protocol === 'http:') &&
            !url.username &&
            !url.password &&
            !url.search &&
            !url.hash &&
            /^\/storage\/views\/[A-Za-z0-9_-]{43}$/u.test(url.pathname)
        );
    } catch {
        return false;
    }
};

const normalizedTextContentType = (value: unknown): string | null => {
    if (typeof value !== 'string' || /[\0\r\n]/u.test(value)) return null;
    const [rawMediaType, ...parameters] = value.split(';');
    const mediaType = rawMediaType?.trim().toLowerCase() ?? '';
    if (!mediaType.startsWith('text/') && !TEXTUAL_APPLICATION_TYPES.has(mediaType)) {
        return null;
    }

    const charsets = parameters
        .map((parameter) => parameter.trim().toLowerCase())
        .filter((parameter) => parameter.startsWith('charset='));
    if (charsets.length !== 1 || charsets[0] !== 'charset=utf-8') {
        return null;
    }
    return mediaType;
};

const validFileName = (value: unknown): value is string => {
    return (
        typeof value === 'string' &&
        value.length > 0 &&
        value.length <= 255 &&
        value !== '.' &&
        value !== '..' &&
        !/[\\/\0\r\n]/u.test(value)
    );
};

const validPosition = (value: unknown): value is number | null | undefined => {
    return value == null || (Number.isSafeInteger(value) && Number(value) > 0);
};

const errorCode = (error: unknown): string | null => {
    if (typeof error !== 'object' || error === null || !('code' in error)) return null;
    return typeof error.code === 'string' ? error.code : null;
};

const parseContentLength = (response: Response): number | null => {
    const raw = response.headers.get('content-length');
    if (raw === null) return null;
    if (!/^\d+$/u.test(raw)) throw new ThreadFileLoadError('invalid_content');
    const value = Number(raw);
    if (!Number.isSafeInteger(value)) throw new ThreadFileLoadError('invalid_content');
    return value;
};

export const loadThreadFile = async (
    intent: ThreadFileIntent,
    ports: ThreadFileLoaderPorts = defaultPorts,
): Promise<LoadedThreadFile> => {
    let grant: ClientThreadFileViewOpenResult;
    try {
        grant = await ports.open({
            thread_id: intent.threadId,
            turn_id: intent.turnId,
            item_id: intent.itemId,
            href: intent.href,
        });
    } catch (error) {
        if (errorCode(error) === 'thread_file_too_large') {
            throw new ThreadFileLoadError('too_large');
        }
        throw new ThreadFileLoadError('unavailable');
    }

    if (!Number.isSafeInteger(grant.expires_at) || grant.expires_at <= ports.nowUnixSeconds()) {
        throw new ThreadFileLoadError('expired');
    }
    if (!validSize(grant.size_bytes)) {
        throw new ThreadFileLoadError(
            Number.isSafeInteger(grant.size_bytes) && grant.size_bytes > MAX_THREAD_FILE_BYTES
                ? 'too_large'
                : 'invalid_content',
        );
    }
    if (
        !validGrantUrl(grant.view_url) ||
        !validFileName(grant.file_name) ||
        !normalizedTextContentType(grant.content_type) ||
        !validPosition(grant.line) ||
        !validPosition(grant.column)
    ) {
        throw new ThreadFileLoadError('invalid_content');
    }

    let response: Response;
    try {
        response = await ports.fetch(grant.view_url);
    } catch {
        throw new ThreadFileLoadError('unavailable');
    }
    if (!response.ok) {
        throw new ThreadFileLoadError(
            response.status === 401 || response.status === 410 ? 'expired' : 'unavailable',
        );
    }

    const responseContentType = response.headers.get('content-type');
    if (
        !responseContentType ||
        normalizedTextContentType(responseContentType) !==
            normalizedTextContentType(grant.content_type)
    ) {
        throw new ThreadFileLoadError('invalid_content');
    }

    const contentLength = parseContentLength(response);
    if (contentLength !== null && contentLength !== grant.size_bytes) {
        throw new ThreadFileLoadError(
            contentLength > MAX_THREAD_FILE_BYTES ? 'too_large' : 'invalid_content',
        );
    }

    let bytes: Uint8Array;
    try {
        bytes = new Uint8Array(await response.arrayBuffer());
    } catch {
        throw new ThreadFileLoadError('unavailable');
    }
    if (bytes.byteLength > MAX_THREAD_FILE_BYTES) {
        throw new ThreadFileLoadError('too_large');
    }
    if (bytes.byteLength !== grant.size_bytes) {
        throw new ThreadFileLoadError('invalid_content');
    }

    let content: string;
    try {
        content = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
        throw new ThreadFileLoadError('invalid_content');
    }
    if (utf8ByteLength(content) !== bytes.byteLength) {
        throw new ThreadFileLoadError('invalid_content');
    }

    return {
        content,
        contentType: grant.content_type,
        fileName: grant.file_name,
        sizeBytes: grant.size_bytes,
        line: grant.line ?? null,
        column: grant.column ?? null,
    };
};
