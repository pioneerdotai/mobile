import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type * as CallIcons from 'lucide-react-native';
import {
    latestCall,
    openCall,
    refreshCall,
    setCallExpanded,
    useCalls,
} from '@/services/calls/controller';
import type { CallTarget } from '@/services/calls/gateway';

export const CALL_BANNER_HEIGHT = 28;

// These controls are optional on the normal thread navigation path.
const callIcons = (): typeof CallIcons => require('lucide-react-native');

export function ThreadCallButton({ target }: { target: CallTarget }) {
    const { t } = useTranslation('threads');
    const connected = useCalls((state) => state.identity !== null);
    const busy = useCalls((state) => state.busy);
    const call = useCalls((state) => latestCall(state.calls, target));
    const error = useCalls((state) => state.error && !state.active && !state.incoming);
    const missed = call?.end_reason === 'missed';
    useEffect(() => {
        if (connected) void refreshCall(target).catch(() => undefined);
    }, [connected, target]);
    const label = t(missed ? 'callAgain' : call?.phase === 'active' ? 'callJoin' : 'callStart');
    if (!connected) return null;
    const { Phone } = callIcons();
    return (
        <View style={styles.threadButtonGroup}>
            {missed && <Text style={styles.missed}>{t('callMissed')}</Text>}
            {error && (
                <Text accessibilityRole="alert" style={styles.missed}>
                    {t('callFailed')}
                </Text>
            )}
            <Pressable
                accessibilityRole="button"
                accessibilityLabel={label}
                disabled={busy}
                onPress={() => void openCall(target)}
                style={styles.threadButton}
            >
                <Phone size={19} color="#3478f6" />
                {(missed || call?.phase === 'active') && (
                    <Text style={styles.threadButtonText}>{label}</Text>
                )}
            </Pressable>
        </View>
    );
}

export function useCallBanner() {
    return useCalls((state) => Boolean((state.active || state.held) && !state.expanded));
}

export function CallBanner() {
    const { t } = useTranslation('threads');
    const title = useCalls((state) => state.active?.call.title ?? state.held?.call.title);
    const { Phone } = callIcons();
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('callReturn')}
            style={styles.banner}
            onPress={() => setCallExpanded(true)}
        >
            <Phone size={14} color="white" />
            <Text numberOfLines={1} style={styles.bannerText}>
                {title || t('callReturn')}
            </Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    banner: {
        height: CALL_BANNER_HEIGHT,
        backgroundColor: '#292d37',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingHorizontal: 16,
    },
    bannerText: { color: 'white', fontWeight: '600' },
    threadButtonGroup: { flexDirection: 'row', alignItems: 'center' },
    missed: { fontSize: 11, color: '#bd334e', maxWidth: 110 },
    threadButton: { flexDirection: 'row', alignItems: 'center', padding: 8, gap: 5 },
    threadButtonText: { color: '#3478f6', fontWeight: '600' },
});
