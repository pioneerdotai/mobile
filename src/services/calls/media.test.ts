import { expect, it, jest } from '@jest/globals';
import { closeCallRoom } from './media';

jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
jest.mock('@livekit/react-native', () => ({
    AudioSession: { stopAudioSession: jest.fn(async () => undefined) },
}));

it('stops both local sources before the room awaits signaling', async () => {
    const microphone = { stop: jest.fn() };
    const camera = { stop: jest.fn() };
    const disconnect = jest.fn(async (stopTracks: boolean) => {
        expect(stopTracks).toBe(true);
        expect(microphone.stop).toHaveBeenCalledTimes(1);
        expect(camera.stop).toHaveBeenCalledTimes(1);
        throw new Error('signaling unavailable');
    });
    const room = {
        localParticipant: {
            trackPublications: new Map([
                ['microphone', { track: microphone }],
                ['camera', { track: camera }],
            ]),
        },
        disconnect,
    } as unknown as Parameters<typeof closeCallRoom>[0];
    await expect(closeCallRoom(room, null)).rejects.toThrow('signaling unavailable');
    expect(disconnect).toHaveBeenCalledWith(true);
});
