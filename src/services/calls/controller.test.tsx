import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import type { CallSnapshot } from './gateway';
import { requestCall } from './gateway';
import { closeCallRoom, requestCallPermission } from './media';
import {
    answerCall,
    declineCall,
    identifyCalls,
    leaveCall,
    observeCallUpdates,
    openCall,
    recoverCallMedia,
    renewHeldCall,
    setCallExpanded,
    toggleCallDevice,
    useCalls,
} from './controller';

jest.mock('react-native', () => ({ AppState: { currentState: 'active' } }));
jest.mock('./gateway', () => ({ requestCall: jest.fn() }));
jest.mock('./media', () => ({
    closeCallRoom: jest.fn(async () => {}),
    newCallRoom: jest.fn(() => {
        const localParticipant = {
            isCameraEnabled: false,
            isMicrophoneEnabled: false,
            setCameraEnabled: jest.fn(async (enabled: boolean) => {
                localParticipant.isCameraEnabled = enabled;
            }),
            setMicrophoneEnabled: jest.fn(async (enabled: boolean) => {
                localParticipant.isMicrophoneEnabled = enabled;
            }),
        };
        return { on: jest.fn(), connect: jest.fn(async () => {}), localParticipant };
    }),
    getCallSdk: () => ({ RoomEvent: { Disconnected: 'disconnected', Reconnected: 'reconnected' } }),
    startCallAudio: jest.fn(async () => {}),
    requestCallPermission: jest.fn(async () => true),
}));

const identity = { connection: 7, principal: 'me', session: 'session', endpoint: 'gateway' };
const call = (
    id: string,
    revision: number,
    phase: CallSnapshot['phase'] = 'active',
    held = false,
): CallSnapshot => ({
    workspace_id: 'workspace',
    thread_id: id,
    call_id: id,
    revision,
    phase,
    created_at_unix: Math.floor(Date.now() / 1000),
    ring_until_unix: phase === 'ringing' ? Math.floor(Date.now() / 1000) + 45 : null,
    initiator_id: phase === 'ringing' ? 'caller' : 'me',
    invitee_id: phase === 'ringing' ? 'me' : null,
    end_reason: null,
    participants: phase === 'active' ? [{ principal_id: 'me', media_identity: 'local', held }] : [],
});

const rpc = jest.mocked(requestCall);
const useSnapshot = () => useCalls((state) => state);
let state: ReturnType<typeof useSnapshot>;
let view: ReactTestRenderer;
function Observer() {
    state = useSnapshot();
    return null;
}
const update = (...calls: CallSnapshot[]) =>
    observeCallUpdates({ connection_id: 7, sequence: 1, calls });

beforeEach(async () => {
    jest.clearAllMocks();
    await act(async () => {
        identifyCalls(identity);
        view = create(<Observer />);
    });
});
afterEach(async () => {
    await act(async () => {
        view.unmount();
        identifyCalls(null);
    });
});

describe('call controls under ambiguous Gateway replies', () => {
    it('replays the exact committed Resume after its reply is lost on connection rotation', async () => {
        const statuses = new Map<string, CallSnapshot | null>();
        let resumeAttempts = 0;
        let resumeKey: string | undefined;
        const order: string[] = [];
        const close = jest.mocked(closeCallRoom);
        close.mockImplementation(async () => {
            order.push('disconnect');
        });
        rpc.mockImplementation(async (_connection, target, action) => {
            const id = target.thread_id;
            if (action.kind === 'status') return { call: statuses.get(id) ?? null };
            if (action.kind === 'start') {
                statuses.set(id, call(id, 1));
                return { call: statuses.get(id)! };
            }
            if (action.kind === 'connect') {
                order.push(`connect ${id}`);
                return {
                    call: statuses.get(id)!,
                    credentials: { url: 'wss://gateway/call', token: 'token', expires_at_unix: 0 },
                };
            }
            if (action.kind === 'restore') {
                order.push(`renew ${id}`);
                const snapshot = statuses.get(id)!;
                return snapshot.participants[0]?.held
                    ? { call: snapshot }
                    : {
                          call: snapshot,
                          credentials: {
                              url: 'wss://gateway/call',
                              token: 'token',
                              expires_at_unix: 0,
                          },
                      };
            }
            if (action.kind === 'disconnect') {
                statuses.set(id, null);
                return { call: null };
            }
            if (action.kind === 'resume') {
                expect(action.media_identity).toBe('local');
                if (++resumeAttempts === 1) {
                    resumeKey = action.resume_key;
                    const resumed = call(id, 4);
                    resumed.participants[0].media_identity = 'resumed-epoch';
                    statuses.set(id, resumed);
                    identifyCalls(null, identity);
                    throw new Error('Resume committed, reply lost');
                }
                expect(action.resume_key).toBe(resumeKey);
                return { call: statuses.get(id)! };
            }
            if (action.kind !== 'change') throw new Error('unexpected call action');
            order.push(action.transition);
            if (action.transition === 'hold') statuses.set(id, call(id, 2, 'active', true));
            if (action.transition === 'join') statuses.set(id, call(id, 2));
            return { call: statuses.get(id)! };
        });
        await act(async () => {
            await openCall(call('first', 1));
            await toggleCallDevice('camera');
            const invite = call('second', 1, 'ringing');
            statuses.set('second', invite);
            update(invite);
            await answerCall();
        });
        expect(order.slice(0, 5)).toEqual([
            'connect first',
            'disconnect',
            'hold',
            'join',
            'connect second',
        ]);
        await act(async () => identifyCalls(null, identity));
        expect(state.room).toBeNull();
        expect(state.held?.preferences.camera).toBe(true);
        await act(async () => {
            identifyCalls({ ...identity, connection: 8 });
            renewHeldCall();
        });
        expect(state.active?.call.call_id).toBe('second');
        expect(state.held?.call.call_id).toBe('first');
        expect(order.filter((event) => event === 'connect first')).toHaveLength(1);
        expect(order).toContain('renew first');
        await act(async () => {
            await leaveCall();
        });
        expect(resumeAttempts).toBe(1);
        expect(state.held?.call.call_id).toBe('first');
        expect(state.held?.preferences).toEqual({ microphone: true, camera: true });
        await act(async () => {
            identifyCalls({ ...identity, connection: 9 });
            const resumed = statuses.get('first');
            if (!resumed) throw new Error('Expected committed Resume');
            observeCallUpdates({ connection_id: 9, sequence: 2, calls: [resumed] });
            renewHeldCall();
        });
        expect(resumeAttempts).toBe(2);
        expect(state.held).toBeNull();
        expect(state.active?.call.revision).toBe(4);
        expect(state.room?.localParticipant.setCameraEnabled).toHaveBeenCalledWith(true);
    });

    it('stops both calls offline and drains both exact exits without resuming the first', async () => {
        const statuses = new Map<string, CallSnapshot>();
        const credentials = { url: 'wss://gateway/call', token: 'token', expires_at_unix: 0 };
        rpc.mockImplementation(async (_connection, target, action) => {
            const id = target.thread_id;
            if (action.kind === 'status') return { call: statuses.get(id) ?? null };
            if (action.kind === 'start') statuses.set(id, call(id, 1));
            if (action.kind === 'change' && action.transition === 'hold') {
                statuses.set(id, call(id, 2, 'active', true));
            }
            if (action.kind === 'change' && action.transition === 'join') {
                statuses.set(id, call(id, 2));
            }
            if (action.kind === 'connect') return { call: statuses.get(id)!, credentials };
            if (action.kind === 'disconnect') statuses.delete(id);
            return { call: statuses.get(id) ?? null };
        });
        await act(async () => {
            await openCall(call('first', 1));
            const invite = call('second', 1, 'ringing');
            statuses.set('second', invite);
            update(invite);
            await answerCall();
            identifyCalls(null, identity);
            await leaveCall();
        });
        expect(state.active).toBeNull();
        expect(state.held?.call.call_id).toBe('first');
        await act(async () => leaveCall());
        expect(state.held).toBeNull();
        await act(async () => identifyCalls({ ...identity, connection: 8 }));
        expect(
            rpc.mock.calls.filter(([connection]) => connection === 8).map(([, , action]) => action),
        ).toEqual([
            { kind: 'disconnect', call_id: 'second', media_identity: 'local' },
            { kind: 'disconnect', call_id: 'first', media_identity: 'local' },
        ]);
        expect(state.room).toBeNull();
    });

    it('repairs only selected publications on SDK Reconnected in the same room', async () => {
        const snapshot = call('first', 1);
        const credentials = { url: 'wss://gateway/call', token: 'token', expires_at_unix: 0 };
        rpc.mockImplementation(async (_connection, _target, action) => ({
            call: action.kind === 'status' ? null : snapshot,
            ...(action.kind === 'connect' ? { credentials } : {}),
        }));
        await act(async () => {
            await openCall(snapshot);
            await toggleCallDevice('camera');
            await toggleCallDevice('microphone');
        });
        const room = state.room!;
        const local = room.localParticipant;
        const camera = jest.mocked(local.setCameraEnabled);
        const microphone = jest.mocked(local.setMicrophoneEnabled);
        const reconnect = jest
            .mocked(room.on)
            .mock.calls.find(([event]) => event === 'reconnected')?.[1] as () => void;
        camera.mockClear();
        microphone.mockClear();
        Object.assign(local, { isCameraEnabled: false, isMicrophoneEnabled: false });
        await act(async () => reconnect());
        expect(state.room).toBe(room);
        expect(camera).toHaveBeenCalledTimes(1);
        expect(camera).toHaveBeenCalledWith(true);
        expect(microphone).not.toHaveBeenCalled();

        camera.mockClear();
        Object.assign(local, { isCameraEnabled: false });
        jest.mocked(requestCallPermission).mockResolvedValueOnce(false);
        await act(async () => reconnect());
        expect(state.error).toBe('cameraPermission');
        expect(state.active?.preferences.camera).toBe(false);
        expect(camera).not.toHaveBeenCalled();

        await act(async () => {
            identifyCalls(null, identity);
            reconnect();
        });
        expect(camera).not.toHaveBeenCalled();
        expect(state.room).toBeNull();
    });

    it.each([
        ['camera', 'reject'],
        ['microphone', 'reject'],
        ['camera', 'unchanged'],
        ['microphone', 'unchanged'],
    ] as const)(
        'recreates media with %s off after a disable result of %s',
        async (device, failure) => {
            const snapshot = call('first', 1);
            const credentials = { url: 'wss://gateway/call', token: 'token', expires_at_unix: 0 };
            rpc.mockImplementation(async (_connection, _target, action) => ({
                call: action.kind === 'status' ? null : snapshot,
                ...(action.kind === 'connect' || action.kind === 'restore' ? { credentials } : {}),
            }));
            await act(async () => {
                await openCall(snapshot);
                await toggleCallDevice('camera');
            });
            const previous = state.room!;
            const method = device === 'camera' ? 'setCameraEnabled' : 'setMicrophoneEnabled';
            const otherMethod = device === 'camera' ? 'setMicrophoneEnabled' : 'setCameraEnabled';
            const enabled = device === 'camera' ? 'isCameraEnabled' : 'isMicrophoneEnabled';
            const disable = jest.mocked(previous.localParticipant[method]);
            expect(previous.localParticipant[enabled]).toBe(true);
            if (failure === 'reject')
                disable.mockRejectedValueOnce(new Error('SDK refused to mute'));
            else disable.mockResolvedValueOnce(undefined);
            jest.mocked(closeCallRoom).mockClear();

            await act(async () => toggleCallDevice(device));
            expect(disable).toHaveBeenLastCalledWith(false);
            expect(state.active?.preferences[device]).toBe(false);
            expect(state.room).toBeNull();
            expect(closeCallRoom).toHaveBeenCalledWith(previous, expect.any(Promise));

            await act(async () => recoverCallMedia());
            expect(state.active?.call.call_id).toBe('first');
            expect(state.room).not.toBe(previous);
            expect(state.room?.localParticipant[enabled]).toBe(false);
            expect(state.room?.localParticipant[method]).not.toHaveBeenCalled();
            expect(state.room?.localParticipant[otherMethod]).toHaveBeenCalledWith(true);

            await act(async () => toggleCallDevice(device));
            expect(state.room?.localParticipant[method]).toHaveBeenCalledWith(true);
        },
    );

    it.each(['camera', 'microphone'] as const)(
        'keeps %s off when the connection changes before the disable reply',
        async (device) => {
            const snapshot = call('first', 1);
            const credentials = { url: 'wss://gateway/call', token: 'token', expires_at_unix: 0 };
            rpc.mockImplementation(async (_connection, _target, action) => ({
                call: action.kind === 'status' ? null : snapshot,
                ...(action.kind === 'connect' || action.kind === 'restore' ? { credentials } : {}),
            }));
            await act(async () => {
                await openCall(snapshot);
                await toggleCallDevice('camera');
            });
            const method = device === 'camera' ? 'setCameraEnabled' : 'setMicrophoneEnabled';
            const previous = state.room!;
            let complete!: () => void;
            jest.mocked(previous.localParticipant[method]).mockImplementationOnce(
                () =>
                    new Promise((resolve) => {
                        complete = () => resolve(undefined);
                    }),
            );
            let toggle!: Promise<void>;
            await act(async () => {
                toggle = toggleCallDevice(device);
            });
            expect(state.active?.preferences[device]).toBe(false);
            await act(async () => identifyCalls(null, identity));
            await act(async () => identifyCalls({ ...identity, connection: 8 }));
            await act(async () => {
                complete();
                await toggle;
            });
            expect(state.room).not.toBe(previous);
            expect(state.room?.localParticipant[method]).not.toHaveBeenCalled();
            expect(state.active?.preferences[device]).toBe(false);
        },
    );

    it('restores the exact membership and device preferences after connection rotation', async () => {
        const snapshot = call('first', 1);
        const credentials = { url: 'wss://gateway/call', token: 'token', expires_at_unix: 0 };
        rpc.mockImplementation(async (_connection, _target, action) => {
            if (action.kind === 'status') return { call: null };
            if (action.kind === 'start') return { call: snapshot };
            if (action.kind === 'connect' || action.kind === 'restore')
                return { call: snapshot, credentials };
            throw new Error('unexpected call action');
        });
        await act(async () => {
            await openCall(call('first', 1));
            await toggleCallDevice('camera');
            identifyCalls(null, identity);
        });
        expect(state.room).toBeNull();
        expect(state.active?.call.call_id).toBe('first');

        await act(async () => identifyCalls({ ...identity, connection: 8 }));
        expect(rpc).toHaveBeenCalledWith(8, expect.objectContaining({ thread_id: 'first' }), {
            kind: 'restore',
            call_id: 'first',
            media_identity: 'local',
        });
        expect(state.room?.localParticipant.setCameraEnabled).toHaveBeenCalledWith(true);

        await act(async () => {
            identifyCalls(null, identity);
            identifyCalls({ ...identity, endpoint: 'another-gateway', connection: 9 });
        });
        expect(state.active).toBeNull();
        expect(state.room).toBeNull();
        expect(rpc.mock.calls.filter(([connection]) => connection === 9)).toEqual([]);
    });

    it('discards a rejected membership and ignores a later participation in the same call', async () => {
        const snapshot = call('first', 1);
        const newer = call('first', 2);
        newer.participants[0].media_identity = 'another-participation';
        const credentials = { url: 'wss://gateway/call', token: 'token', expires_at_unix: 0 };
        rpc.mockImplementation(async (_connection, _target, action) => {
            if (action.kind === 'status') return { call: null };
            if (action.kind === 'start') return { call: snapshot };
            if (action.kind === 'connect') return { call: snapshot, credentials };
            if (action.kind === 'restore') return { call: null };
            throw new Error('unexpected call action');
        });
        await act(async () => {
            await openCall(snapshot);
            identifyCalls(null, identity);
        });
        await act(async () => identifyCalls({ ...identity, connection: 8 }));
        await act(async () => {
            observeCallUpdates({ connection_id: 8, sequence: 2, calls: [newer] });
            await recoverCallMedia();
        });
        expect(state.active).toBeNull();
        expect(state.room).toBeNull();
        expect(
            rpc.mock.calls
                .filter(([connection]) => connection === 8)
                .map(([, , action]) => action.kind),
        ).toEqual(['restore']);
    });

    it('leaves during an outage and retries only the exact disconnect after auth returns', async () => {
        const snapshot = call('first', 1);
        const credentials = { url: 'wss://gateway/call', token: 'token', expires_at_unix: 0 };
        let leaves = 0;
        rpc.mockImplementation(async (_connection, _target, action) => {
            if (action.kind === 'status') return { call: null };
            if (action.kind === 'start') return { call: snapshot };
            if (action.kind === 'connect') return { call: snapshot, credentials };
            if (action.kind === 'disconnect') {
                expect(action.media_identity).toBe('local');
                if (++leaves === 1) throw new Error('unconfirmed leave');
                return { call: null };
            }
            throw new Error('unexpected call action');
        });
        await act(async () => {
            await openCall(snapshot);
            identifyCalls(null, identity);
            await leaveCall();
        });
        expect(state.active).toBeNull();
        expect(state.room).toBeNull();
        await act(async () => identifyCalls({ ...identity, connection: 8 }));
        await act(async () => recoverCallMedia());
        expect(leaves).toBe(2);
        expect(state.room).toBeNull();
        expect(
            rpc.mock.calls
                .filter(([connection]) => connection === 8)
                .map(([, , action]) => action.kind),
        ).toEqual(['disconnect', 'disconnect']);
    });

    it('keeps the incoming overlay open when Android Back requests collapse', async () => {
        const incoming = call('second', 1, 'ringing');
        rpc.mockImplementation(async (_connection, _target, action) => ({
            call: action.kind === 'status' ? incoming : call('second', 2, 'ended'),
        }));
        await act(async () => {
            update(incoming);
            setCallExpanded(false);
        });
        expect(state.expanded).toBe(true);
        expect(state.incoming?.call_id).toBe('second');
        await act(async () => {
            await declineCall();
        });
        expect(state.incoming).toBeNull();
    });
});
