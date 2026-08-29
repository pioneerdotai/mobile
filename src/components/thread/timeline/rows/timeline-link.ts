import { Linking } from 'react-native';

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
