import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import type { SettingsModelPickerPublication } from '@/client/generated/settings_model_picker_publication';
import type { SettingsPagePublication } from '@/client/generated/settings_page_publication';

const mockReact = React;
const mockHost = (name: string) => (props: Record<string, unknown>) => mockReact.createElement(name, props, props.children as React.ReactNode);
const mockSwitch = mockHost('Switch');
const mockPressable = mockHost('Pressable');
const mockText = mockHost('Text');
let mockPage: SettingsPagePublication;
let mockActive = true;
let mockAllowed = true;
const mockDispatchSettings = jest.fn<(...args: unknown[]) => { outcome: string }>();
const mockDispatch = jest.fn();
let mockPickerSnapshot: { payload: SettingsModelPickerPublication } | null = null;
const mockStore = { subscribe: () => () => {}, getSnapshot: () => mockPickerSnapshot };

jest.mock('@/client', () => ({ mobileClientBinding: { scope: () => mockStore, dispatch: mockDispatch, drain: jest.fn() } }));
jest.mock('@/client/settings', () => ({ useSettingsPage: () => mockPage, dispatchSettings: (...args: unknown[]) => mockDispatchSettings(...args) }));
jest.mock('@/hooks/use-administration-capabilities', () => ({ useAdministrationCapabilities: () => ({ capabilitySnapshot: { global: { can_manage_gateway_settings: mockAllowed } } }) }));
jest.mock('@/services/voice-input/data-source', () => ({ useVoiceInputDataSourceState: () => ({ kind: 'online', gatewayId: 'gateway-a', readOnly: false, target: { gatewayId: 'gateway-a', connectionId: 1, workspaceId: 'workspace-a' } }) }));
jest.mock('@/services/voice-input/gateway-target', () => ({ isVoiceInputGatewayTargetActive: () => mockActive }));
jest.mock('react-native', () => ({ Switch: mockSwitch }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('react-native-unistyles', () => ({ StyleSheet: { create: () => new Proxy({}, { get: () => ({}) }), hairlineWidth: 1 }, useUnistyles: () => ({ theme: { space: (v: number) => v * 4, colors: { typography: '#000' } } }) }));
jest.mock('lucide-react-native', () => ({ ChevronRight: mockHost('ChevronRight') }));
jest.mock('@gorhom/bottom-sheet', () => ({ BottomSheetScrollView: mockHost('SheetScroll') }));
jest.mock('@/components/forms/label', () => ({ Label: mockHost('Label') }));
jest.mock('@/components/feedback/spinner', () => ({ __esModule: true, default: mockHost('Spinner') }));
jest.mock('@/components/overlays/actions', () => ({ ActionsSheet: (props: { open: boolean; children: React.ReactNode }) => props.open ? props.children : null }));
jest.mock('@/components/primitives/box', () => ({ Box: mockHost('Box') }));
jest.mock('@/components/primitives/hstack', () => ({ HStack: mockHost('HStack') }));
jest.mock('@/components/primitives/vstack', () => ({ VStack: mockHost('VStack') }));
jest.mock('@/components/primitives/pressable', () => ({ Pressable: mockPressable }));
jest.mock('@/components/primitives/text', () => ({ Text: mockText }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { VoiceInputSettings } = require('./voice-input') as typeof import('./voice-input');
const render = async () => {
    let tree: ReactTestRenderer;
    await act(async () => { tree = renderer.create(<VoiceInputSettings />); });
    return tree!;
};
const modeSwitch = (tree: ReactTestRenderer) => tree.root.findAllByType(mockSwitch).find(n => n.props.accessibilityLabel === 'voice.transcribeWhileRecording')!;

beforeEach(() => {
    mockActive = true;
    mockAllowed = true;
    mockPickerSnapshot = null;
    mockDispatchSettings.mockReset().mockReturnValue({ outcome: 'changed' });
    mockDispatch.mockReset();
    mockPage = { loading: false, pending: false, needs_selection: false, input_reset_generation: 0, value: { kind: 'voice', settings: { enabled: true, transcribe_while_recording: false, provider: 'local', model: 'moonshine-base', runtime: { phase: 'ready' } } } };
});

describe('Voice Input settings boundary', () => {
    it('places the controlled mode row immediately after the model row and waits for publication', async () => {
        const tree = await render();
        const labels = tree.root.findAllByType(mockText).map(n => n.props.children);
        expect(labels.slice(labels.indexOf('voice.model'), labels.indexOf('voice.transcribeWhileRecording') + 1)).toEqual(['voice.model', 'moonshine-base', 'voice.transcribeWhileRecording']);
        expect(modeSwitch(tree).props.value).toBe(false);
        await act(async () => { modeSwitch(tree).props.onValueChange(true); });
        expect(mockDispatchSettings).toHaveBeenCalledWith({ kind: 'voice_transcribe_while_recording', enabled: true });
        expect(modeSwitch(tree).props.value).toBe(false);
        if (mockPage.value?.kind !== 'voice') throw new Error('voice publication required');
        mockPage = { ...mockPage, value: { kind: 'voice', settings: { ...mockPage.value.settings, transcribe_while_recording: true } } };
        await act(async () => { tree.update(<VoiceInputSettings />); });
        expect(modeSwitch(tree).props.value).toBe(true);
        await act(async () => tree.unmount());
    });
    it('uses the shared transcription picker and commits only the model selection', async () => {
        mockDispatch.mockImplementation((request: unknown) => {
            const action = (request as { intent: { intent: { kind: string; model?: string } } }).intent.intent;
            if (action.kind === 'open') {
                mockPickerSnapshot = { payload: {
                    picker_id: 'voice-input-model', owner_generation: 8, workspace_id: 'workspace-a', closed: false,
                    selector: { mode: 'Transcription', models: [{ id: 'new-model', provider: 'local', capabilities: {}, limits: {} }], providers: [], cli_runtimes: [], loading_models: false, loading_providers: false, loading_cli_runtimes: false, selected_provider: 'local', selected_model: 'moonshine-base' },
                } };
            } else if (action.kind === 'select_model' && mockPickerSnapshot) {
                mockPickerSnapshot = { payload: { ...mockPickerSnapshot.payload, selector: { ...mockPickerSnapshot.payload.selector, selected_model: action.model } } };
            }
            return { outcome: 'changed' };
        });
        const tree = await render();
        await act(async () => tree.root.findAllByType(mockPressable).find(n => n.props.accessibilityLabel === 'voice.model')!.props.onPress());
        expect(mockDispatch).toHaveBeenCalledWith({ schema_version: 1, intent: { kind: 'settings_model_picker', intent: { kind: 'open', picker_id: 'voice-input-model', workspace_id: 'workspace-a', mode: 'Transcription', selection: { provider: 'local', model: 'moonshine-base' } } } });
        await act(async () => tree.root.findAllByType(mockPressable).find(n => n.props.accessibilityLabel === 'new-model')!.props.onPress());
        expect(mockDispatchSettings).toHaveBeenCalledWith({ kind: 'voice_model', provider: 'local', model: 'new-model' });
        expect(modeSwitch(tree).props.value).toBe(false);
        await act(async () => tree.unmount());
    });
    it('does not invent a mode for an outdated native publication', async () => {
        mockPage = { ...mockPage, value: { kind: 'voice', settings: { enabled: true, model: 'old-native-model' } } };
        const tree = await render();
        expect(modeSwitch(tree)).toBeUndefined();
        expect(mockDispatchSettings).not.toHaveBeenCalled();
        await act(async () => tree.unmount());
    });
    it('keeps the published value after a failed save and lets the control retry without a Refresh button', async () => {
        const tree = await render();
        await act(async () => modeSwitch(tree).props.onValueChange(true));
        expect(mockDispatchSettings).toHaveBeenCalledWith({ kind: 'voice_transcribe_while_recording', enabled: true });
        mockDispatchSettings.mockClear();
        mockPage = { ...mockPage, error: 'settings_save_failed' };
        await act(async () => tree.update(<VoiceInputSettings />));
        expect(modeSwitch(tree).props.value).toBe(false);
        expect(tree.root.findAllByType(mockText).map(n => n.props.children)).toContain('voice.saveFailed');
        expect(tree.root.findAllByType(mockText).map(n => n.props.children)).not.toContain('voice.retry');
        expect(mockDispatchSettings).not.toHaveBeenCalled();
        expect(modeSwitch(tree).props.disabled).toBe(false);
        await act(async () => modeSwitch(tree).props.onValueChange(true));
        expect(mockDispatchSettings).toHaveBeenCalledTimes(1);
        expect(mockDispatchSettings).toHaveBeenCalledWith({ kind: 'voice_transcribe_while_recording', enabled: true });
        expect(modeSwitch(tree).props.value).toBe(false);
        await act(async () => tree.unmount());
    });
    it('keeps Refresh retry for an initial load failure without authoritative settings', async () => {
        mockPage = { ...mockPage, value: null, error: 'settings_load_failed' };
        const tree = await render();
        expect(modeSwitch(tree)).toBeUndefined();
        expect(tree.root.findAllByType(mockText).map(n => n.props.children)).toContain('voice.loadFailed');
        expect(tree.root.findAllByType(mockText).map(n => n.props.children)).not.toContain('voice.saveFailed');
        const retry = tree.root.findAllByType(mockPressable).find(n =>
            n.findAllByType(mockText).some(text => text.props.children === 'voice.retry'))!;
        expect(retry.props.disabled).toBe(false);
        await act(async () => retry.props.onPress());
        expect(mockDispatchSettings).toHaveBeenCalledTimes(1);
        expect(mockDispatchSettings).toHaveBeenCalledWith({ kind: 'refresh' });
        await act(async () => tree.unmount());
    });
    it('blocks callbacks retained from a gateway that is no longer active', async () => {
        const tree = await render();
        const toggle = modeSwitch(tree).props.onValueChange;
        const choose = tree.root.findAllByType(mockPressable).find(n => n.props.accessibilityLabel === 'voice.model')!.props.onPress;
        mockActive = false;
        await act(async () => { toggle(true); choose(); });
        expect(mockDispatchSettings).not.toHaveBeenCalled();
        expect(mockDispatch).not.toHaveBeenCalled();
        await act(async () => tree.unmount());
    });
    it('disables controls during a pending update and without gateway settings permission', async () => {
        mockPage = { ...mockPage, pending: true };
        const tree = await render();
        expect(modeSwitch(tree).props.disabled).toBe(true);
        await act(async () => modeSwitch(tree).props.onValueChange(true));
        expect(mockDispatchSettings).not.toHaveBeenCalled();
        mockPage = { ...mockPage, pending: false };
        mockAllowed = false;
        await act(async () => tree.update(<VoiceInputSettings />));
        expect(modeSwitch(tree).props.disabled).toBe(true);
        await act(async () => tree.unmount());
    });
});
