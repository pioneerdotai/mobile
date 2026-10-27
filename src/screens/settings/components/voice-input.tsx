import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Switch } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';

import { mobileClientBinding } from '@/client';
import { dispatchSettings, useSettingsPage } from '@/client/settings';
import type { SettingsModelPickerIntent } from '@/client/generated/client_intent';
import type { SettingsModelPickerPublication } from '@/client/generated/settings_model_picker_publication';
import { useAdministrationCapabilities } from '@/hooks/use-administration-capabilities';
import { useVoiceInputDataSourceState } from '@/services/voice-input/data-source';
import {
    isVoiceInputGatewayTargetActive,
    type VoiceInputGatewayTarget,
} from '@/services/voice-input/gateway-target';
import { Label } from '@/components/forms/label';
import Spinner from '@/components/feedback/spinner';
import { ActionsSheet } from '@/components/overlays/actions';
import { Box } from '@/components/primitives/box';
import { HStack } from '@/components/primitives/hstack';
import { Pressable } from '@/components/primitives/pressable';
import { Text } from '@/components/primitives/text';
import { VStack } from '@/components/primitives/vstack';

const pickerId = 'voice-input-model';
const pickerScope = { kind: 'settings_model_picker', picker_id: pickerId } as const;
const dispatchPicker = (intent: SettingsModelPickerIntent) => {
    const result = mobileClientBinding.dispatch({
        schema_version: 1,
        intent: { kind: 'settings_model_picker', intent },
    });
    mobileClientBinding.drain(pickerScope);
    return result;
};

// Values and pending/error state belong to shared Client. This component owns only
// the lifetime of the model sheet; neither switch has a local preference override.
export const VoiceInputSettings = () => {
    const { t } = useTranslation('settings');
    const { theme } = useUnistyles();
    const page = useSettingsPage('voice');
    const source = useVoiceInputDataSourceState();
    const capabilities = useAdministrationCapabilities();
    const canManage = capabilities.capabilitySnapshot?.global.can_manage_gateway_settings === true;
    const settings = page?.value?.kind === 'voice' ? page.value.settings : null;
    const disabled =
        source.readOnly || !canManage || !settings || Boolean(page?.loading || page?.pending);
    const pickerStore = mobileClientBinding.scope(pickerScope);
    const pickerSnapshot = useSyncExternalStore(
        pickerStore.subscribe,
        pickerStore.getSnapshot,
        pickerStore.getSnapshot,
    );
    const picker = (pickerSnapshot?.payload as SettingsModelPickerPublication | null) ?? null;
    const [opened, setOpened] = useState<{ target: VoiceInputGatewayTarget; owner: number } | null>(null);
    const openedRef = useRef(opened);
    openedRef.current = opened;
    const [actionFailed, setActionFailed] = useState(false);
    const currentPicker =
        opened && picker && !picker.closed && picker.owner_generation === opened.owner &&
        picker.workspace_id === opened.target.workspaceId &&
        isVoiceInputGatewayTargetActive(opened.target) ? picker : null;

    const closePicker = useCallback(() => {
        const active = openedRef.current;
        if (active) dispatchPicker({ kind: 'close', picker_id: pickerId, expected_owner: active.owner });
        setOpened(null);
    }, []);
    useEffect(
        () => () => {
            const active = openedRef.current;
            if (active)
                dispatchPicker({ kind: 'close', picker_id: pickerId, expected_owner: active.owner });
        },
        [],
    );
    useEffect(() => {
        setActionFailed(false);
        if (opened && (!currentPicker || disabled)) closePicker();
    }, [
        source.gatewayId, source.kind,
        source.kind === 'online' ? source.target.connectionId : null,
        canManage, currentPicker?.owner_generation, disabled, closePicker, opened,
    ]);

    const update = (intent: Parameters<typeof dispatchSettings>[0]) => {
        if (disabled || source.kind !== 'online' || !isVoiceInputGatewayTargetActive(source.target)) return;
        const result = dispatchSettings(intent);
        setActionFailed(result.outcome === 'rejected' || result.outcome === 'stale');
    };
    const openPicker = useCallback(() => {
        if (disabled || source.kind !== 'online' || !source.target.workspaceId ||
            !isVoiceInputGatewayTargetActive(source.target)) return;
        // The protocol currently has one supported ASR provider (Local), as in
        // desktop's transcription selector. Catalog ordering stays in Rust.
        const result = dispatchPicker({
            kind: 'open',
            picker_id: pickerId,
            workspace_id: source.target.workspaceId,
            mode: 'Transcription',
            selection: { provider: settings?.provider ?? 'local', model: settings?.model },
        });
        const value = pickerStore.getSnapshot()?.payload as SettingsModelPickerPublication | null;
        if (result.outcome === 'changed' && value && !value.closed) {
            setActionFailed(false);
            setOpened({ target: source.target, owner: value.owner_generation });
        } else setActionFailed(true);
    }, [disabled, source, settings?.provider, settings?.model, pickerStore]);
    useEffect(() => {
        if (page?.needs_selection && !openedRef.current) openPicker();
    }, [page?.needs_selection, openPicker]);
    const selectModel = (model: string) => {
        if (disabled || !opened || !currentPicker || !isVoiceInputGatewayTargetActive(opened.target)) return;
        const result = dispatchPicker({
            kind: 'select_model', picker_id: pickerId, expected_owner: opened.owner, model,
        });
        const value = pickerStore.getSnapshot()?.payload as SettingsModelPickerPublication | null;
        if ((result.outcome === 'changed' || result.outcome === 'noop') && value && !value.closed &&
            value.owner_generation === opened.owner && value.selector.selected_model === model &&
            isVoiceInputGatewayTargetActive(opened.target)) {
            update({ kind: 'voice_model', provider: value.selector.selected_provider, model });
            closePicker();
        } else setActionFailed(true);
    };
    const selector = currentPicker?.selector;
    const phase = settings?.runtime?.phase;
    return (
        <VStack style={styles.section}>
            <Label>{t('voice.title')}</Label>
            <VStack style={styles.container}>
                <HStack style={styles.row}>
                    <Text style={styles.label}>{t('voice.enabled')}</Text>
                    {settings ? <Switch accessibilityLabel={t('voice.enabled')} disabled={disabled}
                        value={settings.enabled} onValueChange={(enabled) => update({ kind: 'voice_enabled', enabled })} /> : <Spinner />}
                </HStack>
                <Box style={styles.divider} />
                <Pressable accessibilityRole="button" accessibilityLabel={t('voice.model')}
                    accessibilityState={{ disabled }} disabled={disabled} onPress={openPicker}>
                    <HStack style={styles.row}>
                        <VStack style={styles.copy}>
                            <Text fontWeight="medium">{t('voice.model')}</Text>
                            <Text style={styles.description}>{settings?.model ?? t('voice.chooseModel')}</Text>
                        </VStack>
                        <ChevronRight size={theme.space(5)} color={theme.colors.typography} />
                    </HStack>
                </Pressable>
                <Box style={styles.divider} />
                <HStack style={styles.row}>
                    <VStack style={styles.copy}>
                        <Text fontWeight="medium">{t('voice.transcribeWhileRecording')}</Text>
                        <Text style={styles.description}>{t('voice.transcribeWhileRecordingDescription')}</Text>
                    </VStack>
                    {typeof settings?.transcribe_while_recording === 'boolean' ? (
                        <Switch accessibilityLabel={t('voice.transcribeWhileRecording')}
                            accessibilityHint={t('voice.transcribeWhileRecordingDescription')} disabled={disabled}
                            value={settings.transcribe_while_recording}
                            onValueChange={(enabled) => update({ kind: 'voice_transcribe_while_recording', enabled })} />
                    ) : <Spinner />}
                </HStack>
                {page?.pending ? <Text style={styles.description} accessibilityLiveRegion="polite">{t('voice.saving')}</Text> : null}
                {page?.error || actionFailed ? <Text accessibilityRole="alert" style={styles.error}>{t(
                    !actionFailed && !settings && page?.error === 'settings_load_failed' ? 'voice.loadFailed' : 'voice.saveFailed',
                )}</Text> : null}
                {source.readOnly ? <Text style={styles.description}>{t('voice.offline')}</Text> : !canManage ? <Text style={styles.description}>{t('voice.readOnly')}</Text> : null}
                {phase ? <Text style={styles.description} accessibilityLiveRegion="polite">{t(`voice.status.${phase}`)}</Text> : null}
                {phase === 'failed' ? <Pressable accessibilityRole="button" disabled={disabled}
                    onPress={() => update({ kind: 'voice_retry' })}><Text>{t('voice.retry')}</Text></Pressable> : null}
                {page?.error && !settings && !page.pending ? <Pressable accessibilityRole="button" disabled={source.readOnly || !canManage}
                    onPress={() => dispatchSettings({ kind: 'refresh' })}><Text>{t('voice.retry')}</Text></Pressable> : null}
            </VStack>
            <ActionsSheet open={Boolean(currentPicker)} title={t('voice.model')} onClose={closePicker} showCloseButton>
                <BottomSheetScrollView style={styles.models}>
                    {selector?.loading_models || selector?.loading_providers ? <Spinner /> : null}
                    {selector?.error ? <VStack style={styles.modelRow}>
                        <Text accessibilityRole="alert">{t('voice.modelsFailed')}</Text>
                        <Pressable accessibilityRole="button" onPress={() => {
                            if (!currentPicker) return;
                            dispatchPicker({ kind: 'retry_models', picker_id: pickerId, expected_owner: currentPicker.owner_generation });
                            dispatchPicker({ kind: 'retry_providers', picker_id: pickerId, expected_owner: currentPicker.owner_generation });
                        }}><Text>{t('voice.retry')}</Text></Pressable>
                    </VStack> : null}
                    {selector && !selector.loading_models && !selector.loading_providers && !selector.error && selector.models.length === 0 ? <Text style={styles.modelRow}>{t('voice.noModels')}</Text> : null}
                    {selector?.models.map((model) => <Pressable key={model.id} accessibilityRole="radio"
                        accessibilityLabel={model.name ?? model.id} accessibilityState={{ selected: selector.selected_model === model.id, disabled }}
                        disabled={disabled} style={styles.modelRow} onPress={() => selectModel(model.id)}>
                        <Text fontWeight={selector.selected_model === model.id ? 'semibold' : 'default'}>{model.name ?? model.id}</Text>
                    </Pressable>)}
                </BottomSheetScrollView>
            </ActionsSheet>
        </VStack>
    );
};

const styles = StyleSheet.create((theme) => ({
    section: { gap: theme.space(3) },
    container: { backgroundColor: theme.colors.muted, borderRadius: theme.radius['4xl'], padding: theme.space(3), gap: theme.space(2) },
    row: { alignItems: 'center', justifyContent: 'space-between', gap: theme.space(3), paddingVertical: theme.space(2) },
    label: { flex: 1 },
    copy: { flex: 1, gap: theme.space(1) },
    description: { ...theme.fontSize.sm, color: theme.colors.typography, opacity: 0.6 },
    error: { ...theme.fontSize.sm, color: theme.colors.dangerText },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.border },
    models: { maxHeight: theme.space(96) },
    modelRow: { paddingHorizontal: theme.space(5), paddingVertical: theme.space(3) },
}));
