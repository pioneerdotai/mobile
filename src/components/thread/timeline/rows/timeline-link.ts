import { Linking } from 'react-native';
import { isTimelineLocalFileHref } from '@/services/thread-files/intent';

export type TimelineLinkOpener = (url: string) => Promise<unknown>;

export const normalizeTimelineExternalUrl = (value: string): string | null => {
    try {
        const url = new URL(value);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            return null;
        }
        return url.toString();
    } catch {
        return null;
    }
};

export const openTimelineExternalUrl = async (
    value: string,
    openUrl: TimelineLinkOpener = (url) => Linking.openURL(url),
): Promise<boolean> => {
    const url = normalizeTimelineExternalUrl(value);
    if (url == null) {
        return false;
    }

    try {
        await openUrl(url);
        return true;
    } catch {
        return false;
    }
};

export type TimelineLinkKind = 'external' | 'local-file' | 'unsupported';

export const timelineLinkKind = (value: string): TimelineLinkKind => {
    if (isTimelineLocalFileHref(value)) return 'local-file';
    if (normalizeTimelineExternalUrl(value)) return 'external';
    return 'unsupported';
};
