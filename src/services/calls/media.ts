import type * as LiveKitNative from '@livekit/react-native';
import type * as LiveKit from 'livekit-client';
import { Platform } from 'react-native';
import type * as NativePermissions from 'react-native-permissions';

let registered = false;
export const getCallSdk = (): typeof LiveKit => require('livekit-client');
const nativeMedia = (): typeof LiveKitNative => require('@livekit/react-native');
export const getCallVideoRenderer = () => nativeMedia().VideoTrack;

export const startCallAudio = () => nativeMedia().AudioSession.startAudioSession();

export const newCallRoom = () => {
    if (!registered) {
        nativeMedia().registerGlobals();
        registered = true;
    }
    return new (getCallSdk().Room)();
};

export const requestCallPermission = async (device: 'microphone' | 'camera') => {
    const {
        PERMISSIONS,
        request,
        RESULTS,
    }: typeof NativePermissions = require('react-native-permissions');
    const permissions =
        Platform.OS === 'ios'
            ? { microphone: PERMISSIONS.IOS.MICROPHONE, camera: PERMISSIONS.IOS.CAMERA }
            : { microphone: PERMISSIONS.ANDROID.RECORD_AUDIO, camera: PERMISSIONS.ANDROID.CAMERA };
    return (await request(permissions[device])) === RESULTS.GRANTED;
};

export async function closeCallRoom(room: LiveKit.Room, audioStarting: Promise<void> | null) {
    try {
        // Release capture before disconnect can wait on signaling.
        for (const publication of room.localParticipant.trackPublications.values()) {
            publication.track?.stop();
        }
    } finally {
        try {
            await room.disconnect(true);
        } finally {
            await audioStarting?.catch(() => undefined);
            await nativeMedia().AudioSession.stopAudioSession();
        }
    }
}
