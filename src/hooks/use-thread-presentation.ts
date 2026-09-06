import { useMemo, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { mobileClientBinding } from '@/client/mobile-client-binding';
import type { TimelineSnapshot, TimelineRowSnapshot } from '@/client/generated/timeline_snapshot';
import type { TimelineRow } from '@/services/threads/conversation/timeline';
import { localizeTimelineRow } from '@/services/threads/conversation/localization';

const localizedRows = new WeakMap<TimelineRowSnapshot, Map<string, TimelineRow>>();
const emptyRows: TimelineRow[] = [];
const emptyStore = { subscribe: (_listener: () => void) => () => {}, getSnapshot: () => null };

export const useThreadPresentation = (threadId: string | null | undefined, active = true) => {
    const { i18n } = useTranslation('threads');
    const store = useMemo(
        () =>
            threadId && active
                ? mobileClientBinding.scope({ kind: 'timeline', thread_id: threadId })
                : emptyStore,
        [threadId, active],
    );
    const publication = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
    const snapshot = publication?.payload as TimelineSnapshot | null | undefined;
    const language = i18n.resolvedLanguage ?? i18n.language;
    const rows = useMemo(() => {
        if (!snapshot) return emptyRows;
        return snapshot.rows.map((row) => {
            let localized = localizedRows.get(row);
            if (!localized) {
                localized = new Map();
                localizedRows.set(row, localized);
            }
            let result = localized.get(language);
            if (!result) {
                result = { ...localizeTimelineRow(row), presentationLocale: language };
                localized.set(language, result);
            }
            return result;
        });
    }, [snapshot, language]);
    return { snapshot: snapshot ?? null, rows };
};
