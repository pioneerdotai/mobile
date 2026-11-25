import { useEffect, useRef, useState } from 'react';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/primitives/text';
import { VStack } from '@/components/primitives/vstack';
import { Pressable } from '@/components/primitives/pressable';
import { sanitizePioneerAppUrlRoute } from '@/helpers/app-url-route';
import { relayPluginOAuthCallback } from '@/services/plugins/oauth';

export default function McpOAuthCallbackRoute() {
    const url = Linking.useLinkingURL();
    const consumed = useRef(false);
    const [accepted, setAccepted] = useState<boolean | null>(null);
    const { t } = useTranslation('settings');
    useEffect(() => {
        if (!url || consumed.current) return;
        consumed.current = true;
        setAccepted(relayPluginOAuthCallback(url));
        sanitizePioneerAppUrlRoute('state', 'code', 'iss', 'error', 'error_description');
    }, [url]);
    return (
        <VStack>
            <Text>
                {t(accepted === false ? 'plugins.callbackRejected' : 'plugins.callbackReceived')}
            </Text>
            <Pressable
                accessibilityRole="button"
                onPress={() => router.replace('/settings/plugins')}
            >
                <Text>{t('plugins.title')}</Text>
            </Pressable>
        </VStack>
    );
}
