import { describe, expect, it, jest } from '@jest/globals';
import { Linking } from 'react-native';

import {
    normalizeTimelineExternalUrl,
    openTimelineExternalUrl,
    timelineLinkKind,
    type TimelineLinkOpener,
} from './timeline-link';

describe('timeline external links', () => {
    it.each([
        ['https://example.com/path?q=one', 'https://example.com/path?q=one'],
        ['http://example.com', 'http://example.com/'],
        ['HTTPS://EXAMPLE.COM/path', 'https://example.com/path'],
    ])('allows HTTP(S) URL %s', (input, expected) => {
        expect(normalizeTimelineExternalUrl(input)).toBe(expected);
    });

    it.each([
        'javascript:alert(1)',
        'file:///tmp/private',
        'pioneer://activate/token',
        '/relative/path',
        'not a URL',
    ])('rejects non-web URL %s', (url) => {
        expect(normalizeTimelineExternalUrl(url)).toBeNull();
    });

    it('opens only a normalized HTTP(S) URL', async () => {
        const openUrl = jest.fn<TimelineLinkOpener>(async () => undefined);

        await expect(openTimelineExternalUrl('https://EXAMPLE.COM', openUrl)).resolves.toBe(true);
        await expect(openTimelineExternalUrl('javascript:alert(1)', openUrl)).resolves.toBe(false);

        expect(openUrl).toHaveBeenCalledTimes(1);
        expect(openUrl).toHaveBeenCalledWith('https://example.com/');
    });

    it('calls React Native Linking with its receiver intact', async () => {
        const openUrl = jest.spyOn(Linking, 'openURL').mockImplementation(function (
            this: typeof Linking,
        ) {
            expect(this).toBe(Linking);
            return Promise.resolve();
        });

        await expect(openTimelineExternalUrl('https://example.com')).resolves.toBe(true);
        expect(openUrl).toHaveBeenCalledWith('https://example.com/');

        openUrl.mockRestore();
    });

    it('contains platform failures instead of creating an unhandled rejection', async () => {
        const openUrl = jest.fn<TimelineLinkOpener>(async () => {
            throw new Error('viewer unavailable');
        });

        await expect(openTimelineExternalUrl('https://example.com', openUrl)).resolves.toBe(false);
    });

    it('classifies supported web and local file links without opening unsupported schemes', () => {
        expect(timelineLinkKind('https://example.com')).toBe('external');
        expect(timelineLinkKind('/workspace/src/main.rs:12:4')).toBe('local-file');
        expect(timelineLinkKind('file:///workspace/src/main.rs#L12C4')).toBe('local-file');
        expect(timelineLinkKind('javascript:alert(1)')).toBe('unsupported');
    });
});
