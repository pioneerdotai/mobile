import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import { AppState } from 'react-native';
import type { Room } from 'livekit-client';
import {
    startCallAudio,
    closeCallRoom,
    newCallRoom,
    requestCallPermission,
    getCallSdk,
} from './media';
import { type CallSnapshot, type CallTarget, type CallUpdates, requestCall } from './gateway';

type Preferences = { microphone: boolean; camera: boolean };
type Session = { call: CallSnapshot; preferences: Preferences };
type CallOwner = { endpoint: string; session: string };
type Identity = CallOwner & { connection: number; principal: string };
type CallState = {
    identity: Identity | null;
    calls: CallSnapshot[];
    active: Session | null;
    held: Session | null;
    resumeArmed: boolean;
    incoming: CallSnapshot | null;
    room: Room | null;
    expanded: boolean;
    busy: boolean;
    error: 'failed' | 'cameraPermission' | 'microphonePermission' | null;
};
const initial: CallState = {
    identity: null,
    calls: [],
    active: null,
    held: null,
    resumeArmed: false,
    incoming: null,
    room: null,
    expanded: false,
    busy: false,
    error: null,
};
const newRequestKey = () => {
    const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    return [
        hex.slice(0, 8),
        hex.slice(8, 12),
        hex.slice(12, 16),
        hex.slice(16, 20),
        hex.slice(20),
    ].join('-');
};
const defaultPreferences: Preferences = { microphone: true, camera: false };
const store = createStore(() => initial);
const seenIncoming = new Set<string>();
let owner: (CallOwner & { principal: string }) | null = null;
// Only the active and held sessions can be queued for exit.
const leaving: { call: CallSnapshot; resumeKey?: string }[] = [];
let resumeKey: string | undefined;
let recovery = 0;
let recovering = false;
let foregroundSince = 0;

export function setCallsForeground(active: boolean) {
    foregroundSince = active ? Math.floor(Date.now() / 1000) : Infinity;
}
export const useCalls = <T>(select: (state: CallState) => T) => useStore(store, select);

const sameTarget = (a: CallTarget, b: CallTarget) =>
    a.workspace_id === b.workspace_id && a.thread_id === b.thread_id;
export const latestCall = (calls: CallSnapshot[], target: CallTarget) =>
    calls.find((call) => sameTarget(call, target));

const remember = (incoming: CallSnapshot) => {
    const calls = store.getState().calls;
    const previous = calls.find((call) => call.call_id === incoming.call_id);
    if (previous && previous.revision > incoming.revision) return previous;
    if (previous && previous.revision === incoming.revision && !incoming.title) return previous;
    const call = { ...incoming, title: incoming.title ?? previous?.title };
    store.setState({
        calls: [call, ...calls.filter((call) => call.call_id !== incoming.call_id)]
            .sort(
                (a, b) =>
                    b.created_at_unix - a.created_at_unix ||
                    (a.phase === 'ended'
                        ? Number(b.phase !== 'ended')
                        : -Number(b.phase === 'ended')),
            )
            .slice(0, 128),
    });
    return call;
};

// Native audio management is process-wide. Never start another session while the
// previous room is disconnecting or while an earlier permission request is settling.
let mediaWork: Promise<void> = Promise.resolve();
let roomOpening = false;
let audioStarting: Promise<void> | null = null;

const closeMedia = () => {
    const { room } = store.getState();
    if (!room) return mediaWork;
    store.setState({ room: null });
    const pendingAudio = audioStarting;
    audioStarting = null;
    mediaWork = mediaWork.catch(() => undefined).then(() => closeCallRoom(room, pendingAudio));
    return mediaWork;
};
const assertIdentity = (identity: Identity) => {
    if (store.getState().identity !== identity) throw new Error('call identity changed');
};
const transition = async (
    identity: Identity,
    call: CallSnapshot,
    action: 'join' | 'decline' | 'leave' | 'hold' | 'resume',
) => {
    const read = await requestCall(identity.connection, call, {
        kind: 'status',
        call_id: call.call_id,
    });
    assertIdentity(identity);
    const latest = read.call ? remember(read.call) : call;
    if (latest.phase === 'ended') return latest;
    const result = await requestCall(identity.connection, latest, {
        kind: 'change',
        call_id: latest.call_id,
        revision: latest.revision,
        transition: action,
    });
    assertIdentity(identity);
    if (!result.call) throw new Error('call transition unavailable');
    return remember(result.call);
};

const membership = (call: CallSnapshot | null, principal: string) => {
    const member =
        call?.phase !== 'ended' && call?.participants.find((p) => p.principal_id === principal);
    return member ? (member.held ? 'held' : 'active') : 'absent';
};

const readCall = async (identity: Identity, call: CallSnapshot) => {
    const response = await requestCall(identity.connection, call, {
        kind: 'status',
        call_id: call.call_id,
    });
    assertIdentity(identity);
    return response.call ? remember(response.call) : null;
};

const holdMembership = async (identity: Identity, call: CallSnapshot) => {
    const state = (snapshot: CallSnapshot | null) =>
        sameMembership(call, snapshot, identity.principal);
    const current = await readCall(identity, call);
    if (!current || state(current) === 'absent') return null;
    if (state(current) === 'held') return current;
    try {
        const result = await requestCall(identity.connection, current, {
            kind: 'change',
            call_id: current.call_id,
            revision: current.revision,
            transition: 'hold',
        });
        assertIdentity(identity);
        if (result.call) {
            const observed = remember(result.call);
            if (state(observed) === 'held') return observed;
            if (state(observed) === 'absent') return null;
        }
    } catch {
        assertIdentity(identity);
    }
    const observed = await readCall(identity, call);
    if (state(observed) === 'held') return observed;
    if (state(observed) === 'absent') return null;
    throw new Error('call transition was not confirmed');
};

const deviceWork = new WeakMap<Room, Promise<void>>();
const serialDevices = (room: Room, work: () => Promise<void>) => {
    const next = (deviceWork.get(room) ?? Promise.resolve()).catch(() => undefined).then(work);
    deviceWork.set(room, next);
    return next;
};
const ownsMedia = (identity: Identity, room: Room, callId: string) => {
    const current = store.getState();
    return (
        current.identity === identity &&
        current.room === room &&
        current.active?.call.call_id === callId
    );
};
const actualDevice = (room: Room, device: keyof Preferences) =>
    device === 'camera'
        ? room.localParticipant.isCameraEnabled
        : room.localParticipant.isMicrophoneEnabled;
const permissionError = (device: keyof Preferences) =>
    device === 'camera' ? 'cameraPermission' : 'microphonePermission';
const setDevice = async (room: Room, device: keyof Preferences, enabled: boolean) => {
    if (device === 'camera') await room.localParticipant.setCameraEnabled(enabled);
    else await room.localParticipant.setMicrophoneEnabled(enabled);
    if (!enabled && actualDevice(room, device)) {
        throw new Error('Call device is still enabled');
    }
};

const applyRoomPreferences = (identity: Identity, room: Room, callId: string) =>
    serialDevices(room, async () => {
        for (const device of ['microphone', 'camera'] as const) {
            if (!ownsMedia(identity, room, callId)) return;
            const desired = store.getState().active?.preferences[device] === true;
            if (actualDevice(room, device) === desired) continue;
            const granted = !desired || (await requestCallPermission(device));
            if (!ownsMedia(identity, room, callId)) return;
            if (store.getState().active?.preferences[device] !== desired) continue;
            if (granted) await setDevice(room, device, desired);
            else {
                const current = store.getState().active!;
                store.setState({
                    active: {
                        ...current,
                        preferences: { ...current.preferences, [device]: false },
                    },
                    error: permissionError(device),
                });
            }
        }
    });

const connect = async (
    identity: Identity,
    session: Session,
    credentials?: { url: string; token: string },
) => {
    if (roomOpening || store.getState().room) return;
    roomOpening = true;
    try {
        await mediaWork.catch(() => undefined);
        assertIdentity(identity);
        const call = session.call;
        if (store.getState().active?.call.call_id !== call.call_id) return;
        credentials ??= (
            await requestCall(identity.connection, call, {
                kind: 'connect',
                call_id: call.call_id,
            })
        ).credentials;
        assertIdentity(identity);
        if (!credentials || store.getState().active?.call.call_id !== call.call_id) return;
        const room = newCallRoom();
        store.setState({ room });
        const ownsRoom = () => ownsMedia(identity, room, call.call_id);
        const recover = () => {
            if (!ownsRoom()) return;
            store.setState({ error: 'failed' });
            void closeMedia()
                .catch(() => undefined)
                .then(recoverCallMedia);
        };
        const { Disconnected, Reconnected } = getCallSdk().RoomEvent;
        room.on(Disconnected, recover);
        room.on(Reconnected, () => {
            void applyRoomPreferences(identity, room, call.call_id).catch(recover);
        });
        try {
            audioStarting = startCallAudio();
            await audioStarting;
            if (!ownsRoom()) return;
            await room.connect(credentials.url, credentials.token);
            if (!ownsRoom()) return;
            await applyRoomPreferences(identity, room, call.call_id);
        } catch (error) {
            if (ownsRoom()) await closeMedia();
            throw error;
        }
    } finally {
        roomOpening = false;
    }
};

const run = async (work: (identity: Identity) => Promise<void>) => {
    const { identity, busy } = store.getState();
    if (!identity || busy) return;
    store.setState({ busy: true, error: null });
    try {
        await work(identity);
    } catch {
        if (store.getState().identity === identity) store.setState({ error: 'failed' });
    } finally {
        if (store.getState().identity === identity) {
            store.setState({ busy: false });
            maybeResume();
        }
    }
};

export const identifyCalls = (identity: Identity | null, selected: CallOwner | null = identity) => {
    const previous = store.getState().identity;
    const sameOwner = Boolean(
        selected &&
        owner &&
        owner.endpoint === selected.endpoint &&
        owner.session === selected.session &&
        (!identity || identity.principal === owner.principal),
    );
    if (sameOwner && identity?.connection === previous?.connection) return;
    recovery++;
    recovering = false;
    void closeMedia().catch(() => undefined);
    if (!sameOwner) {
        leaving.length = 0;
        resumeKey = undefined;
        seenIncoming.clear();
        store.setState({ ...initial, identity });
    } else {
        store.setState({ identity, calls: [], incoming: null, busy: false, error: null });
    }
    owner = identity ?? (sameOwner ? owner : null);
    void recoverCallMedia();
};

const mediaIdentity = (call: CallSnapshot, principal: string) =>
    call.participants.find((member) => member.principal_id === principal)?.media_identity;

const sameMembership = (previous: CallSnapshot, current: CallSnapshot | null, principal: string) =>
    current?.call_id === previous.call_id &&
    mediaIdentity(previous, principal) === mediaIdentity(current, principal)
        ? membership(current, principal)
        : 'absent';

export const setCallExpanded = (expanded: boolean) => {
    if (expanded || !store.getState().incoming) store.setState({ expanded });
};

export const observeCallUpdates = ({ calls, connection_id }: CallUpdates) => {
    const { identity } = store.getState();
    if (!identity || identity.connection !== connection_id) return;
    for (const snapshot of calls) {
        const call = remember(snapshot);
        const { active, held, incoming } = store.getState();
        if (active?.call.call_id === call.call_id && active.call.revision <= call.revision) {
            const state = sameMembership(active.call, call, identity.principal);
            if (state === 'active') {
                store.setState({ active: { ...active, call } });
            } else {
                store.setState({ active: null });
                if (state === 'held')
                    store.setState({ held: { ...active, call }, resumeArmed: true });
                void closeMedia().catch(() => undefined);
            }
        }
        if (held?.call.call_id === call.call_id && held.call.revision <= call.revision) {
            const state = sameMembership(held.call, call, identity.principal);
            if (state === 'absent' && !resumeKey && !store.getState().busy) {
                store.setState({ held: null, resumeArmed: false });
            } else if (state === 'held') {
                store.setState({ held: { ...held, call } });
            }
        }
        if (incoming?.call_id === call.call_id && call.phase !== 'ringing') {
            store.setState({ incoming: null });
        }
        if (
            !seenIncoming.has(call.call_id) &&
            call.phase === 'ringing' &&
            call.invitee_id === identity.principal &&
            call.ring_until_unix !== null &&
            call.ring_until_unix > Date.now() / 1000 &&
            AppState.currentState === 'active' &&
            call.created_at_unix >= foregroundSince
        ) {
            if (seenIncoming.size === 128) {
                const oldest = seenIncoming.values().next().value;
                if (oldest) seenIncoming.delete(oldest);
            }
            seenIncoming.add(call.call_id);
            store.setState({ incoming: call, expanded: true });
        }
    }
    maybeResume();
};

export const refreshCall = async (target: CallTarget) => {
    const { identity } = store.getState();
    if (!identity) return;
    const { call } = await requestCall(identity.connection, target, { kind: 'status' });
    if (call && store.getState().identity === identity) remember({ ...call, title: target.title });
};

export const openCall = (target: CallTarget) =>
    run(async (identity) => {
        if (leaving.length) return;
        const { active, held } = store.getState();
        if (active || held) {
            setCallExpanded(true);
            return;
        }
        const status = await requestCall(identity.connection, target, { kind: 'status' });
        assertIdentity(identity);
        const previous = status.call && remember({ ...status.call, title: target.title });
        if (previous?.phase === 'ringing' && previous.invitee_id === identity.principal) {
            store.setState({ incoming: previous, expanded: true });
            return;
        }
        const call =
            previous && previous.phase !== 'ended'
                ? previous.participants.some((member) => member.principal_id === identity.principal)
                    ? previous
                    : await transition(identity, previous, 'join')
                : (
                      await requestCall(identity.connection, target, {
                          kind: 'start',
                          request_key: newRequestKey(),
                      })
                  ).call;
        assertIdentity(identity);
        if (!call || call.phase === 'ended') return;
        const session = {
            call: remember({ ...call, title: target.title }),
            preferences: defaultPreferences,
        };
        store.setState({ active: session, expanded: true });
        await connect(identity, session);
    });

export const answerCall = () =>
    run(async (identity) => {
        const { incoming, active, held } = store.getState();
        if (leaving.length || resumeKey || !incoming || (active && held)) return;
        if (active) {
            await closeMedia();
            assertIdentity(identity);
            try {
                const call = await holdMembership(identity, active.call);
                assertIdentity(identity);
                const held =
                    call && membership(call, identity.principal) === 'held'
                        ? { ...active, call }
                        : null;
                store.setState({ active: null, held, resumeArmed: Boolean(held) });
            } catch (error) {
                if (store.getState().active?.call.call_id === active.call.call_id) {
                    const current = await readCall(identity, active.call).catch(() => null);
                    if (current && membership(current, identity.principal) === 'active')
                        await connect(identity, { ...active, call: current });
                }
                throw error;
            }
        }
        const call = await transition(identity, incoming, 'join');
        store.setState({ incoming: null });
        if (call.phase === 'ended') return;
        const session = { call, preferences: defaultPreferences };
        store.setState({ active: session, expanded: true });
        await connect(identity, session);
    });

export const declineCall = () =>
    run(async (identity) => {
        const { incoming } = store.getState();
        if (!incoming) return;
        await transition(identity, incoming, 'decline');
        store.setState({ incoming: null });
    });

const maybeResume = () => {
    const { active, held, incoming, busy, resumeArmed } = store.getState();
    if (!leaving.length && resumeArmed && held && !active && !incoming && !busy) void resumeCall();
};

export const resumeCall = () =>
    run(async (identity) => {
        const { held, active, incoming } = store.getState();
        if (leaving.length || !held || active || (incoming && !resumeKey)) return;
        const media = mediaIdentity(held.call, identity.principal);
        if (!media) return;
        const key = (resumeKey ??= newRequestKey());
        store.setState({ resumeArmed: false });
        const { call } = await requestCall(identity.connection, held.call, {
            kind: 'resume',
            call_id: held.call.call_id,
            media_identity: media,
            resume_key: key,
        });
        assertIdentity(identity);
        if (resumeKey !== key) return;
        resumeKey = undefined;
        const confirmed = call ? remember({ ...call, title: held.call.title }) : null;
        if (
            sameMembership(call ?? held.call, confirmed, identity.principal) !== 'active' ||
            !confirmed
        ) {
            store.setState({ held: null });
            return;
        }
        const session = { ...held, call: confirmed };
        store.setState({ held: null, active: session });
        await connect(identity, session);
    });

export const leaveCall = async () => {
    const { active, held, busy } = store.getState();
    const session = active ?? held;
    if (busy || !session) return;
    leaving.push({ call: session.call, resumeKey: active ? undefined : resumeKey });
    if (!active) resumeKey = undefined;
    recovery++;
    recovering = false;
    store.setState(
        active
            ? { active: null, error: null }
            : {
                  held: null,
                  resumeArmed: false,
                  error: null,
              },
    );
    await closeMedia().catch(() => undefined);
    await recoverCallMedia();
};

export const recoverCallMedia = async () => {
    const { identity, active, held, room, busy } = store.getState();
    if (!identity || busy || recovering) return;
    const leave = leaving[0];
    if (!leave && resumeKey && held && !active) {
        await resumeCall();
        return;
    }
    const call = leave?.call ?? active?.call;
    if (!call || (!leave && (room || roomOpening))) return;
    const media = mediaIdentity(call, identity.principal);
    if (!media) return;
    const generation = recovery;
    recovering = true;
    let disconnected = false;
    try {
        const result = await requestCall(
            identity.connection,
            call,
            leave
                ? {
                      kind: 'disconnect',
                      call_id: call.call_id,
                      media_identity: media,
                      ...(leave.resumeKey ? { resume_key: leave.resumeKey } : {}),
                  }
                : { kind: 'restore', call_id: call.call_id, media_identity: media },
        );
        if (generation !== recovery || store.getState().identity !== identity) return;
        if (leave) {
            leaving.shift();
            disconnected = true;
            if (result.call) remember(result.call);
            return;
        }
        const current = store.getState().active;
        if (current?.call.call_id !== call.call_id) return;
        const confirmed = result.call
            ? remember({ ...result.call, title: current.call.title })
            : null;
        const state = sameMembership(current.call, confirmed, identity.principal);
        if (state === 'active' && confirmed && result.credentials) {
            store.setState({ active: { ...current, call: confirmed }, error: null });
            await connect(identity, current, result.credentials);
        } else if (state === 'held' && confirmed) {
            store.setState({
                active: null,
                held: { ...current, call: confirmed },
                resumeArmed: true,
            });
        } else if (state === 'absent') {
            store.setState({ active: null, error: null });
        }
    } catch {
        if (generation === recovery && store.getState().identity === identity && !leave) {
            store.setState({ error: 'failed' });
        }
    } finally {
        if (generation === recovery) {
            recovering = false;
            if (disconnected && leaving.length) void recoverCallMedia();
            else maybeResume();
        }
    }
};

let heldRenewal: CallSnapshot | null = null;
export const renewHeldCall = () => {
    const { identity, held, busy } = store.getState();
    if (!identity || !held || busy || resumeKey || heldRenewal === held.call) return;
    const media = mediaIdentity(held.call, identity.principal);
    if (!media || membership(held.call, identity.principal) !== 'held') return;
    heldRenewal = held.call;
    void requestCall(identity.connection, held.call, {
        kind: 'restore',
        call_id: held.call.call_id,
        media_identity: media,
    })
        .then(({ call }) => {
            const current = store.getState();
            if (
                current.identity !== identity ||
                current.busy ||
                resumeKey ||
                current.held?.call !== held.call
            )
                return;
            if (sameMembership(held.call, call, identity.principal) === 'absent') {
                store.setState({ held: null, resumeArmed: false });
            }
        })
        .catch(() => undefined)
        .finally(() => {
            if (heldRenewal === held.call) heldRenewal = null;
        });
};

export const toggleCallDevice = (device: keyof Preferences) =>
    run(async (identity) => {
        const { room, active } = store.getState();
        if (!room || !active) return;
        const callId = active.call.call_id;
        const enabled = !active.preferences[device] && !actualDevice(room, device);
        // A deliberate off takes precedence over any permission request or
        // republish already in flight for this room.
        if (!enabled) {
            store.setState({
                active: { ...active, preferences: { ...active.preferences, [device]: false } },
            });
        }
        await serialDevices(room, async () => {
            if (!ownsMedia(identity, room, callId)) return;
            if (enabled && !(await requestCallPermission(device))) {
                if (ownsMedia(identity, room, callId))
                    store.setState({ error: permissionError(device) });
                return;
            }
            if (!ownsMedia(identity, room, callId)) return;
            try {
                await setDevice(room, device, enabled);
            } catch (error) {
                if (!enabled && ownsMedia(identity, room, callId)) {
                    await closeMedia();
                }
                throw error;
            }
            const current = store.getState().active;
            if (current && ownsMedia(identity, room, callId)) {
                store.setState({
                    active: {
                        ...current,
                        preferences: { ...current.preferences, [device]: enabled },
                    },
                });
            }
        });
    });
