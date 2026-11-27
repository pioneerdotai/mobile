import { expect, it, jest } from '@jest/globals';
import { EventEmitter } from 'node:events';
import { AppState, Modal, StyleSheet, Text, View } from 'react-native';
import type { SafeAreaListenerProps } from 'react-native-safe-area-context';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

const local = {
    identity: 'local',
    isLocal: true,
    isCameraEnabled: false,
    isMicrophoneEnabled: true,
    audioLevel: 0,
    camera: undefined as { track: object; isMuted: boolean } | undefined,
    getTrackPublication() {
        return this.camera;
    },
};
const remote = { ...local, identity: 'remote', isLocal: false, isMicrophoneEnabled: false };
const room = Object.assign(new EventEmitter(), {
    state: 'connected',
    localParticipant: local,
    remoteParticipants: new Map([[remote.identity, remote]]),
    activeSpeakers: [] as (typeof remote)[],
});
const store = {
    active: {
        call: {
            call_id: 'call',
            workspace_id: 'workspace',
            phase: 'active',
            participants: [{ principal_id: 'peer', media_identity: 'remote' }],
        },
    },
    expanded: true,
    room,
};
function CallVideo(_props: { objectFit: string; zOrder: number; mirror?: boolean }) {
    return null;
}

function CallSafeArea({ children, style }: SafeAreaListenerProps) {
    return <View style={style}>{children}</View>;
}

const gateway = {
    sessionPrincipalId: 'me',
    sessionConnectionGeneration: 3,
    registry: { active_gateway_id: null },
};
jest.doMock('@/stores/gateway', () => ({
    useGatewayStore: (selector: (state: typeof gateway) => unknown) => selector(gateway),
}));
jest.doMock('@/services/calls/controller', () => ({
    identifyCalls: jest.fn(),
    renewHeldCall: jest.fn(),
    recoverCallMedia: jest.fn(),
    useCalls: (selector: (state: typeof store) => unknown) => selector(store),
}));
jest.doMock('@/services/calls/gateway', () => ({
    requestCallNames: async () => ({ peer: 'Alex' }),
}));
jest.doMock('@/services/calls/media', () => ({
    getCallSdk: () => ({
        RoomEvent: new Proxy({}, { get: (_target, name) => name }),
        Track: { Source: { Camera: 'camera' } },
    }),
    getCallVideoRenderer: () => CallVideo,
}));
jest.doMock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.doMock('react-native-safe-area-context', () => ({ SafeAreaListener: CallSafeArea }));
jest.doMock('react-native-reanimated', () => ({
    __esModule: true,
    default: { View },
    cubicBezier: () => 'ease',
    useReducedMotion: () => false,
}));
jest.doMock('lucide-react-native', () =>
    Object.fromEntries(
        [
            'ChevronDown',
            'Ellipsis',
            'Mic',
            'MicOff',
            'Phone',
            'PhoneOff',
            'UserRound',
            'Users',
            'Video',
            'VideoOff',
            'X',
        ].map((name) => [name, () => null]),
    ),
);

it('updates a named remote tile from mute, camera and active speaker events', async () => {
    const { ThreadCalls } = jest.requireActual<typeof import('./overlay')>('./overlay');
    const originalAppState = AppState.currentState;
    AppState.currentState = 'active';
    let view!: ReactTestRenderer;
    try {
        await act(async () => {
            view = create(<ThreadCalls />);
        });
        const label = view.root.findAllByType(Text).find(({ props }) => props.children === 'Alex');
        const microphone = (label: string) =>
            view.root.findAllByType(View).find(({ props }) => props.accessibilityLabel === label);
        const videoDisabled = () =>
            view.root
                .findAllByType(Text)
                .some(({ props }) => props.children === 'callCameraDisabled');
        const visualLayers = () =>
            view.root.findAllByType(View).map(({ props }) => StyleSheet.flatten(props.style));
        const insetVoiceGlow = () =>
            visualLayers().find(
                (style) => style?.borderWidth === 2 && Array.isArray(style.boxShadow),
            );

        expect(StyleSheet.flatten(label?.props.style)).toMatchObject({ top: 8, start: 8 });
        expect(StyleSheet.flatten(microphone('callMicrophoneOff')?.props.style)).toMatchObject({
            top: 8,
            right: 8,
        });
        expect(videoDisabled()).toBe(true);
        const layers = visualLayers();
        const dim = layers.findIndex((style) => style?.height === 128);
        const preview = layers.findIndex((style) => style?.aspectRatio === 16 / 9);
        expect(layers[dim]).toMatchObject({
            experimental_backgroundImage: 'linear-gradient(to bottom, #00000000, #00000059)',
        });
        expect(preview).toBeGreaterThan(dim);

        await act(async () => {
            remote.isMicrophoneEnabled = true;
            room.emit('TrackUnmuted');
        });
        expect(microphone('callMicrophoneOn')).toBeDefined();

        await act(async () => {
            remote.audioLevel = 0.5;
            room.activeSpeakers = [remote];
            room.emit('ActiveSpeakersChanged');
        });
        expect(microphone('callSpeaking')).toBeDefined();
        expect(insetVoiceGlow()).toMatchObject({
            boxShadow: [{ blurRadius: 22, spreadDistance: 8, inset: true }],
            transitionDuration: 120,
        });

        await act(async () => {
            remote.audioLevel = 0.25;
            room.emit('ActiveSpeakersChanged');
        });
        expect(insetVoiceGlow()).toMatchObject({
            boxShadow: [{ blurRadius: 17, spreadDistance: 6, inset: true }],
        });

        await act(async () => {
            remote.camera = { track: {}, isMuted: false };
            local.camera = { track: {}, isMuted: false };
            room.emit('TrackSubscribed');
        });
        expect(videoDisabled()).toBe(false);
        expect(
            view.root.findAllByType(CallVideo).map(({ props }) => [props.objectFit, props.zOrder]),
        ).toEqual([
            ['contain', 0],
            ['cover', 1],
        ]);

        await act(async () => {
            remote.isMicrophoneEnabled = false;
            remote.camera!.isMuted = true;
            room.emit('TrackMuted');
        });
        expect(microphone('callSpeaking')).toBeUndefined();
        expect(microphone('callMicrophoneOff')).toBeDefined();
        expect(videoDisabled()).toBe(true);
        expect(insetVoiceGlow()).toMatchObject({
            borderColor: 'rgba(48, 209, 88, 0)',
            transitionDuration: 1400,
        });
    } finally {
        await act(async () => view?.unmount());
        AppState.currentState = originalAppState;
    }
});

it('keeps media full-bleed and opens a responsive participants panel using the modal safe area', async () => {
    const { ThreadCalls } = jest.requireActual<typeof import('./overlay')>('./overlay');
    const originalAppState = AppState.currentState;
    AppState.currentState = 'active';
    let view!: ReactTestRenderer;
    try {
        await act(async () => {
            view = create(<ThreadCalls />);
        });
        const layout = (width: number, height: number, top: number, bottom: number) =>
            act(async () => {
                view.root.findByType(CallSafeArea).props.onChange({
                    frame: { x: 0, y: 0, width, height },
                    insets: { top, right: 0, bottom, left: 0 },
                });
            });
        const visualLayers = () =>
            view.root.findAllByType(View).map(({ props }) => StyleSheet.flatten(props.style));
        const press = (label: string) =>
            act(async () => {
                const [action] = view.root.findAll(
                    ({ props }) =>
                        (props.accessibilityLabel === label || props.label === label) &&
                        typeof props.onPress === 'function',
                    { deep: false },
                );
                expect(action).toBeDefined();
                action.props.onPress();
            });
        const participantsPanel = () =>
            view.root.findAllByType(View).find(({ props }) => props.accessibilityViewIsModal);

        await layout(390, 844, 47, 34);
        expect(view.root.findByType(Modal).props).toMatchObject({
            statusBarTranslucent: true,
            navigationBarTranslucent: true,
        });
        expect(visualLayers().find((style) => style?.height === 128)).toMatchObject({ bottom: 0 });
        expect(visualLayers().find((style) => style?.aspectRatio === 16 / 9)).toMatchObject({
            bottom: 110,
            width: 117,
        });
        expect(
            visualLayers().find((style) => style?.position === 'absolute' && style.bottom === 34),
        ).toMatchObject({ left: 0, right: 0 });
        expect(visualLayers().find((style) => style?.borderWidth === 0)).toMatchObject({
            flex: 1,
            backgroundColor: '#000000',
        });

        await press('callMore');
        expect(participantsPanel()).toBeUndefined();
        await press('callParticipants');
        expect(StyleSheet.flatten(participantsPanel()?.props.style)).toMatchObject({
            top: 0,
            bottom: 0,
            left: 0,
            width: 390,
            paddingTop: 47,
        });
        expect(
            participantsPanel()
                ?.findAllByType(Text)
                .map(({ props }) => props.children),
        ).toEqual(['callParticipants', 'callYou', 'Alex']);
        await press('dismiss');
        expect(participantsPanel()).toBeUndefined();

        await layout(800, 540, 0, 0);
        expect(visualLayers().find((style) => style?.aspectRatio === 16 / 9)).toMatchObject({
            bottom: 16,
            right: 16,
            width: 160,
        });
        await press('callMore');
        await press('callParticipants');
        expect(StyleSheet.flatten(participantsPanel()?.props.style)).toMatchObject({
            top: 0,
            bottom: 0,
            width: 400,
        });
        await act(async () => view.root.findByType(Modal).props.onRequestClose());
        expect(participantsPanel()).toBeUndefined();
    } finally {
        await act(async () => view?.unmount());
        AppState.currentState = originalAppState;
    }
});
