import { describe, expect, it, jest } from '@jest/globals';

import { loadThreadFile, MAX_THREAD_FILE_BYTES } from './loader';

jest.mock('@/client', () => ({ pioneerClient: {} }));

const intent = {
    threadId: 'thread',
    turnId: 'turn',
    itemId: 'item',
    href: '/workspace/main.ts:2:3',
};

const viewUrl = `https://gateway.test/storage/views/${'a'.repeat(43)}`;

const response = (
    body: BodyInit,
    status = 200,
    contentType = 'text/plain; charset=utf-8',
): Response =>
    new Response(body, {
        status,
        headers: {
            'content-length': String(
                typeof body === 'string'
                    ? new TextEncoder().encode(body).byteLength
                    : (body as Uint8Array).byteLength,
            ),
            'content-type': contentType,
        },
    });

const ports = (body = 'const value = 1;', contentType = 'text/plain; charset=utf-8') => ({
    open: jest.fn(async () => ({
        view_url: viewUrl,
        expires_at: 200,
        file_name: 'main.ts',
        content_type: contentType,
        size_bytes: new TextEncoder().encode(body).byteLength,
        line: 2,
        column: 3,
    })),
    fetch: jest.fn(async () => response(body, 200, contentType)),
    nowUnixSeconds: () => 100,
});

describe('thread file loader', () => {
    it('mints one grant and returns only validated text content', async () => {
        const fakePorts = ports();
        await expect(loadThreadFile(intent, fakePorts)).resolves.toEqual({
            content: 'const value = 1;',
            contentType: 'text/plain; charset=utf-8',
            fileName: 'main.ts',
            sizeBytes: 16,
            line: 2,
            column: 3,
        });
        expect(fakePorts.open).toHaveBeenCalledTimes(1);
        expect(fakePorts.open).toHaveBeenCalledWith({
            thread_id: 'thread',
            turn_id: 'turn',
            item_id: 'item',
            href: '/workspace/main.ts:2:3',
        });
    });

    it('accepts explicitly UTF-8 application media types used by source files', async () => {
        const fakePorts = ports('{"enabled":true}', 'application/json; charset=utf-8');

        await expect(loadThreadFile(intent, fakePorts)).resolves.toMatchObject({
            content: '{"enabled":true}',
            contentType: 'application/json; charset=utf-8',
        });
    });

    it('rejects grants larger than the exact 10 MiB limit without fetching', async () => {
        const fakePorts = ports();
        fakePorts.open.mockResolvedValueOnce({
            view_url: viewUrl,
            expires_at: 200,
            file_name: 'large.txt',
            content_type: 'text/plain; charset=utf-8',
            size_bytes: MAX_THREAD_FILE_BYTES + 1,
            line: 1,
            column: 1,
        });

        await expect(loadThreadFile(intent, fakePorts)).rejects.toMatchObject({
            code: 'too_large',
        });
        expect(fakePorts.fetch).not.toHaveBeenCalled();
    });

    it('preserves the gateway too-large classification when grant creation rejects', async () => {
        const fakePorts = ports();
        fakePorts.open.mockRejectedValueOnce(
            Object.assign(new Error('workspace file view is unavailable'), {
                code: 'thread_file_too_large',
            }),
        );

        await expect(loadThreadFile(intent, fakePorts)).rejects.toMatchObject({
            code: 'too_large',
        });
        expect(fakePorts.fetch).not.toHaveBeenCalled();
    });

    it('rejects expired and malformed grants', async () => {
        const expiredPorts = ports();
        expiredPorts.open.mockResolvedValueOnce({
            view_url: viewUrl,
            expires_at: 100,
            file_name: 'main.ts',
            content_type: 'text/plain',
            size_bytes: 1,
            line: 1,
            column: 1,
        });
        await expect(loadThreadFile(intent, expiredPorts)).rejects.toMatchObject({
            code: 'expired',
        });

        const invalidPorts = ports();
        invalidPorts.open.mockResolvedValueOnce({
            view_url: 'file:///private/workspace/main.ts',
            expires_at: 200,
            file_name: 'main.ts',
            content_type: 'text/plain',
            size_bytes: 1,
            line: 1,
            column: 1,
        });
        await expect(loadThreadFile(intent, invalidPorts)).rejects.toMatchObject({
            code: 'invalid_content',
        });
    });

    it('rejects malformed UTF-8 and response metadata mismatches', async () => {
        const invalidUtf8Ports = ports('x');
        invalidUtf8Ports.fetch.mockResolvedValueOnce(
            response(new Uint8Array([0xff]), 200, 'text/plain; charset=utf-8'),
        );
        await expect(loadThreadFile(intent, invalidUtf8Ports)).rejects.toMatchObject({
            code: 'invalid_content',
        });

        const mismatchedTypePorts = ports('x');
        mismatchedTypePorts.fetch.mockResolvedValueOnce(
            response('x', 200, 'application/json; charset=utf-8'),
        );
        await expect(loadThreadFile(intent, mismatchedTypePorts)).rejects.toMatchObject({
            code: 'invalid_content',
        });
    });

    it('rejects grant URLs with a query or a malformed opaque token', async () => {
        for (const invalidUrl of [
            `${viewUrl}?leak=1`,
            'https://gateway.test/storage/views/short',
        ]) {
            const fakePorts = ports();
            fakePorts.open.mockResolvedValueOnce({
                view_url: invalidUrl,
                expires_at: 200,
                file_name: 'main.ts',
                content_type: 'text/plain; charset=utf-8',
                size_bytes: 16,
                line: 1,
                column: 1,
            });

            await expect(loadThreadFile(intent, fakePorts)).rejects.toMatchObject({
                code: 'invalid_content',
            });
            expect(fakePorts.fetch).not.toHaveBeenCalled();
        }
    });
});
