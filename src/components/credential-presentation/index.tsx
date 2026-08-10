import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { CopyButton } from '@/components/buttons/copy';
import { DeviceActivationQr } from '@/components/gateway/device-activation-qr';
import { Box } from '@/components/primitives/box';
import { Text } from '@/components/primitives/text';
import { VStack } from '@/components/primitives/vstack';

type CredentialValue = {
    value: string;
    label: string;
    copyAccessibilityLabel: string;
    copiedAccessibilityLabel: string;
    kind: 'code' | 'link';
};

type CredentialPresentationProps = {
    qrModules: boolean[];
    qrWidth: number;
    qrAccessibilityLabel: string;
    description?: string;
    code?: CredentialValue;
    link: CredentialValue;
};

const CredentialPresentation = ({
    qrModules,
    qrWidth,
    qrAccessibilityLabel,
    description,
    code,
    link,
}: CredentialPresentationProps) => (
    <VStack style={styles.container}>
        {description ? <Text style={styles.description}>{description}</Text> : null}
        <DeviceActivationQr
            modules={qrModules}
            width={qrWidth}
            accessibilityLabel={qrAccessibilityLabel}
        />
        {code ? <CredentialPresentationValue {...code} /> : null}
        <CredentialPresentationValue {...link} />
    </VStack>
);

const CredentialPresentationValue = ({
    value,
    label,
    copyAccessibilityLabel,
    copiedAccessibilityLabel,
    kind,
}: CredentialValue) => {
    const { theme } = useUnistyles();

    return (
        <VStack style={styles.field}>
            <Text style={styles.label}>{label}</Text>
            <Box style={styles.valueCard}>
                <Text
                    selectable
                    fontWeight={kind === 'code' ? 'semibold' : 'medium'}
                    style={kind === 'code' ? styles.code : styles.link}
                >
                    {value}
                </Text>
                <Box style={styles.copyButtonContainer}>
                    <CopyButton
                        value={value}
                        accessibilityLabel={copyAccessibilityLabel}
                        copiedAccessibilityLabel={copiedAccessibilityLabel}
                        iconSize={theme.space(4)}
                    />
                </Box>
            </Box>
        </VStack>
    );
};

const styles = StyleSheet.create((theme) => ({
    container: {
        width: '100%',
        alignItems: 'center',
        gap: theme.space(5),
    },
    description: {
        ...theme.fontSize.sm,
        textAlign: 'center',
        opacity: 0.6,
    },
    field: {
        width: '100%',
        alignItems: 'center',
        gap: theme.space(1),
    },
    label: {
        ...theme.fontSize.sm,
        opacity: 0.6,
    },
    valueCard: {
        position: 'relative',
        width: '100%',
        minHeight: theme.space(16),
        padding: theme.space(4),
        paddingHorizontal: theme.space(12),
        borderRadius: theme.radius['2xl'],
        backgroundColor: theme.colors.muted,
        alignItems: 'center',
        justifyContent: 'center',
    },
    code: {
        ...theme.fontSize.xl,
        textAlign: 'center',
    },
    link: {
        ...theme.fontSize.sm,
        textAlign: 'center',
    },
    copyButtonContainer: {
        position: 'absolute',
        top: theme.space(1.5),
        right: theme.space(1.5),
        width: theme.space(9),
        height: theme.space(9),
        alignItems: 'center',
        justifyContent: 'center',
    },
}));

export { CredentialPresentation };
export type { CredentialPresentationProps, CredentialValue };
