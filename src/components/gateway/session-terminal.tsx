import { usePathname } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native-unistyles';

import { Button } from '@/components/buttons/base';
import { Text } from '@/components/primitives/text';
import { VStack } from '@/components/primitives/vstack';
import { Title } from '@/components/typography/title';
import { useGatewayStore } from '@/stores/gateway';
import { useEditor } from '@/hooks/use-editor';

export const TerminalGatewaySession = () => {
    const { t } = useTranslation('gateway');
    const pathname = usePathname();
    const reason = useGatewayStore((state) => state.sessionTerminalReason);
    const gatewayId = useGatewayStore((state) => state.registry.active_gateway_id);
    const { navigate } = useEditor();

    if (!reason || pathname === '/activate' || pathname === '/editor') {
        return null;
    }

    return (
        <VStack style={styles.backdrop}>
            <VStack style={styles.card}>
                <Title type="h2">{t(`terminal.${reason}.title`)}</Title>
                <Text style={styles.description}>{t(`terminal.${reason}.description`)}</Text>
                <Button
                    title={t('terminal.activateAction')}
                    onPress={() => {
                        if (gatewayId) {
                            navigate({
                                type: 'gateway__authenticate',
                                payload: { gatewayId },
                            });
                        } else {
                            navigate({ type: 'gateway__create' });
                        }
                    }}
                />
            </VStack>
        </VStack>
    );
};

const styles = StyleSheet.create((theme, rt) => ({
    backdrop: {
        position: 'absolute',
        inset: 0,
        zIndex: 100,
        justifyContent: 'center',
        paddingTop: rt.insets.top,
        paddingBottom: rt.insets.bottom,
        paddingHorizontal: theme.space(5),
        backgroundColor: theme.colors.background,
    },
    card: {
        gap: theme.space(4),
        padding: theme.space(5),
        borderRadius: theme.radius['3xl'],
        backgroundColor: theme.colors.muted,
    },
    description: { opacity: 0.75 },
}));

export default TerminalGatewaySession;
