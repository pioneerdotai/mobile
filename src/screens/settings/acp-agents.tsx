import { useEffect, useRef, useState } from 'react';
import { Switch } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native-unistyles';
import { pioneerClient } from '@/client';
import type { CLIRuntimeProviderDraft } from '@/client/generated/cli_runtime_provider_draft';
import { useAdministrationCapabilities } from '@/hooks/use-administration-capabilities';
import { useWorkspaceStore } from '@/stores/workspace';
import { ScrollView } from '@/components/primitives/scrollview';
import { VStack } from '@/components/primitives/vstack';
import { HStack } from '@/components/primitives/hstack';
import { Input } from '@/components/primitives/input';
import { Pressable } from '@/components/primitives/pressable';
import { Text } from '@/components/primitives/text';

export default function AcpAgentsScreen() {
    const { t } = useTranslation('settings');
    const workspace = useWorkspaceStore((state) => state.activeWorkspaceId);
    const authority = useAdministrationCapabilities();
    const allowed = authority.data?.can_manage_capabilities === true;
    const [drafts, setDrafts] = useState<CLIRuntimeProviderDraft[]>([]);
    const [draft, setDraft] = useState<CLIRuntimeProviderDraft | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const generation = useRef(0);
    useEffect(() => {
        const current = ++generation.current;
        setDraft(null);
        setDrafts([]);
        if (!workspace || !allowed) return;
        setBusy(true);
        void pioneerClient
            .cliRuntimeProviderDrafts(workspace)
            .then((values) => {
                if (generation.current === current) {
                    setDrafts(values);
                    setDraft(values[0] ?? null);
                }
            })
            .catch((error) => {
                if (generation.current === current) setError(String(error));
            })
            .finally(() => {
                if (generation.current === current) setBusy(false);
            });
        return () => {
            generation.current++;
        };
    }, [workspace, allowed]);
    const save = async () => {
        if (!workspace || !draft || busy || !allowed) return;
        const current = generation.current;
        setBusy(true);
        setError(null);
        try {
            await pioneerClient.providerCommand({
                kind: 'save_runtime',
                params: { workspace_id: workspace, draft },
            });
            const values = await pioneerClient.cliRuntimeProviderDrafts(workspace);
            if (generation.current === current) {
                setDrafts(values);
                setDraft(values.find((value) => value.id === draft.id) ?? values[0] ?? null);
            }
        } catch (error) {
            if (generation.current === current) setError(String(error));
        } finally {
            if (generation.current === current) setBusy(false);
        }
    };
    const fields = [
        ['id', t('acpAgents.id')],
        ['display_name', t('acpAgents.name')],
        ['binary_path', t('acpAgents.executable')],
        ['args_json', t('acpAgents.arguments')],
        ['env_from_json', t('acpAgents.environment')],
    ] as const;
    return (
        <ScrollView contentContainerStyle={styles.content}>
            <Text>{t('acpAgents.description')}</Text>
            <HStack style={styles.choices}>
                {drafts.map((value) => (
                    <Pressable
                        key={`${typeof value.mode === 'string' ? value.mode : 'edit'}:${value.id}`}
                        accessibilityRole="button"
                        disabled={busy}
                        accessibilityState={{ selected: draft?.id === value.id, disabled: busy }}
                        onPress={() => setDraft(value)}
                        style={styles.action}
                    >
                        <Text>
                            {value.mode === 'Create' ? t('acpAgents.add') : value.display_name}
                        </Text>
                    </Pressable>
                ))}
            </HStack>
            {draft && allowed ? (
                <VStack style={styles.fields}>
                    {fields.map(([key, label]) => (
                        <VStack key={key} style={styles.field}>
                            <Text>{label}</Text>
                            <Input
                                value={draft[key]}
                                editable={!busy}
                                accessibilityLabel={label}
                                autoCapitalize="none"
                                autoCorrect={false}
                                onChangeText={(value) =>
                                    setDraft((current) =>
                                        current ? { ...current, [key]: value } : current,
                                    )
                                }
                            />
                        </VStack>
                    ))}
                    <Text>{t('acpAgents.environmentHint')}</Text>
                    <HStack>
                        <Text>{t('acpAgents.enabled')}</Text>
                        <Switch
                            value={draft.enabled}
                            disabled={busy}
                            accessibilityLabel={t('acpAgents.enabled')}
                            onValueChange={(enabled) =>
                                setDraft((current) => (current ? { ...current, enabled } : current))
                            }
                        />
                    </HStack>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t('acpAgents.save')}
                        disabled={busy}
                        onPress={() => void save()}
                        style={styles.action}
                    >
                        <Text>{t('acpAgents.save')}</Text>
                    </Pressable>
                </VStack>
            ) : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>
    );
}

const styles = StyleSheet.create((theme) => ({
    content: { padding: theme.space(4), gap: theme.space(4) },
    fields: { gap: theme.space(4) },
    field: { gap: theme.space(2) },
    choices: { gap: theme.space(2), flexWrap: 'wrap' },
    action: {
        padding: theme.space(3),
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.lg,
    },
    error: { color: theme.colors.dangerText },
}));
