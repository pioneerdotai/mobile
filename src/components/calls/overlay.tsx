import { type ComponentType, useEffect, useLayoutEffect, useState } from 'react';
import {
    AppState,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
    useWindowDimensions,
} from 'react-native';
import { SafeAreaListener, type Metrics } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { TrackReference } from '@livekit/react-native';
import type * as CallIcons from 'lucide-react-native';
import type { Room } from 'livekit-client';
import { getCallSdk, getCallVideoRenderer } from '@/services/calls/media';
import { useGatewayStore } from '@/stores/gateway';
import {
    answerCall,
    declineCall,
    identifyCalls,
    leaveCall,
    observeCallUpdates,
    recoverCallMedia,
    renewHeldCall,
    resumeCall,
    setCallExpanded,
    setCallsForeground,
    toggleCallDevice,
    useCalls,
} from '@/services/calls/controller';
import { requestCallNames, waitCallUpdates } from '@/services/calls/gateway';
import { callGridDimensions } from './grid';
import { SpeakerGlow, SpeakerMicrophone } from './speech';

// Dark in-call colors from videocall-rs bea64063, tokens.css and components.css.
const secondaryLabel = 'rgba(235, 235, 245, 0.60)';
const separator = 'rgba(84, 84, 88, 0.50)';
const noInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const surfaceShadow = [
    { offsetX: 0, offsetY: 2, blurRadius: 6, color: '#00000066' },
    { offsetX: 0, offsetY: 8, blurRadius: 24, color: '#00000066' },
];
const buttonShadow = [
    { offsetX: 0, offsetY: 1, blurRadius: 2, color: '#00000066' },
    { offsetX: 0, offsetY: 2, blurRadius: 8, color: '#00000066' },
];

// These controls are optional on the normal thread navigation path.
const callIcons = (): typeof CallIcons => require('lucide-react-native');

function readRoomMedia(room: Room) {
    const { Track } = getCallSdk();
    const speakers = new Map(
        room.activeSpeakers.map(({ identity, audioLevel }) => [
            identity,
            Number.isFinite(audioLevel) ? Math.min(1, Math.max(0, audioLevel)) : 0,
        ]),
    );
    const peers = [room.localParticipant, ...room.remoteParticipants.values()].map(
        (participant) => {
            const publication = participant.getTrackPublication(Track.Source.Camera);
            const reference: TrackReference | null =
                publication?.track && !publication.isMuted
                    ? { participant, publication, source: Track.Source.Camera }
                    : null;
            const microphone = participant.isMicrophoneEnabled;
            return {
                participant,
                reference,
                microphone,
                camera: participant.isCameraEnabled,
                audioLevel: microphone ? (speakers.get(participant.identity) ?? 0) : 0,
            };
        },
    );
    return { room, peers, connected: room.state === 'connected' };
}

function useRoomMedia(room: Room | null) {
    const [snapshot, setSnapshot] = useState<ReturnType<typeof readRoomMedia> | null>(null);
    useEffect(() => {
        if (!room) {
            setSnapshot(null);
            return;
        }
        const { RoomEvent } = getCallSdk();
        const events = [
            RoomEvent.ParticipantConnected,
            RoomEvent.ParticipantDisconnected,
            RoomEvent.TrackPublished,
            RoomEvent.TrackSubscribed,
            RoomEvent.TrackUnsubscribed,
            RoomEvent.TrackUnpublished,
            RoomEvent.TrackMuted,
            RoomEvent.TrackUnmuted,
            RoomEvent.ActiveSpeakersChanged,
            RoomEvent.LocalTrackPublished,
            RoomEvent.LocalTrackUnpublished,
            RoomEvent.ConnectionStateChanged,
            RoomEvent.ParticipantNameChanged,
        ];
        // LiveKit mutates participant objects in place. Capture state on each event.
        const changed = () => setSnapshot(readRoomMedia(room));
        for (const event of events) room.on(event, changed);
        changed();
        return () => {
            for (const event of events) room.off(event, changed);
        };
    }, [room]);
    return snapshot?.room === room ? snapshot : null;
}

export function ThreadCalls() {
    const { t } = useTranslation('threads');
    const { connectionId, principal, endpoint, session, terminal } = useGatewayStore((state) => ({
        connectionId: state.sessionConnectionGeneration,
        principal: state.sessionPrincipalId,
        endpoint: state.registry.active_gateway_id,
        session: state.sessionId,
        terminal: state.sessionTerminalReason,
    }));
    const active = useCalls((state) => state.active);
    const held = useCalls((state) => state.held);
    const incoming = useCalls((state) => state.incoming);
    const expanded = useCalls((state) => state.expanded);
    const room = useCalls((state) => state.room);
    const error = useCalls((state) => state.error);
    const busy = useCalls((state) => state.busy);
    const media = useRoomMedia(room);
    const peers = media?.peers ?? [];
    const VideoTrack = room ? getCallVideoRenderer() : null;

    useLayoutEffect(() => {
        const selected = endpoint && session && !terminal ? { endpoint, session } : null;
        identifyCalls(
            selected && connectionId != null && principal
                ? { ...selected, connection: connectionId, principal }
                : null,
            selected,
        );
        renewHeldCall();
    }, [connectionId, principal, endpoint, session, terminal]);

    useEffect(() => {
        if (connectionId == null || !principal || !session) return;
        let alive = true;
        let retry: ReturnType<typeof setTimeout> | undefined;
        let sequence = -1;
        const next = async () => {
            try {
                const updates = await waitCallUpdates(Math.max(sequence, 0));
                if (!alive) return;
                if (updates.sequence !== sequence) {
                    sequence = updates.sequence;
                    observeCallUpdates(updates);
                }
                void next();
            } catch {
                if (alive) retry = setTimeout(() => void next(), 1000);
            }
        };
        void next();
        return () => {
            alive = false;
            if (retry) clearTimeout(retry);
        };
    }, [connectionId, principal, endpoint, session]);

    useEffect(() => {
        if (!held) return;
        const timer = setInterval(renewHeldCall, 12_000);
        return () => clearInterval(timer);
    }, [held?.call.call_id]);

    useEffect(() => {
        const timer = setInterval(() => void recoverCallMedia(), 2_000);
        return () => clearInterval(timer);
    }, []);

    const [foreground, setForeground] = useState(AppState.currentState === 'active');
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (state) => {
            if (state !== 'inactive') setCallsForeground(state === 'active');
            setForeground(state === 'active');
        });
        return () => subscription.remove();
    }, []);

    const workspace = (active?.call ?? incoming ?? held?.call)?.workspace_id;
    const callId = (active?.call ?? incoming ?? held?.call)?.call_id;
    const [directory, setDirectory] = useState<{
        workspace: string;
        connection: number;
        principal: string;
        names: Record<string, string>;
    } | null>(null);
    const [panel, setPanel] = useState<'more' | 'participants' | null>(null);
    useEffect(() => {
        setPanel(null);
    }, [callId, expanded, incoming?.call_id]);
    useEffect(() => {
        if (!workspace || connectionId == null || !principal) return;
        let current = true;
        void requestCallNames(connectionId, workspace)
            .then((names) => {
                if (current)
                    setDirectory({ workspace, connection: connectionId, principal, names });
            })
            .catch(() => undefined);
        return () => {
            current = false;
        };
    }, [workspace, connectionId, principal]);

    const names =
        directory?.workspace === workspace &&
        directory?.connection === connectionId &&
        directory?.principal === principal
            ? directory?.names
            : undefined;
    const window = useWindowDimensions();
    const [viewport, setViewport] = useState<Metrics | null>(null);
    const width = viewport?.frame.width || window.width;
    const height = viewport?.frame.height || window.height;
    const insets = viewport?.insets ?? noInsets;
    const compact = width < 600;
    const gridMargin = compact ? 8 : 16;
    const gridPadding = {
        top: Math.max(gridMargin, insets.top),
        right: Math.max(gridMargin, insets.right),
        bottom: Math.max(gridMargin, insets.bottom),
        left: Math.max(gridMargin, insets.left),
    };
    const barBottom = Math.max(16, insets.bottom);
    const controlSize = width < 640 ? 44 : 48;
    const barWidth = 4 * controlSize + 3 * 12 + 2 * 8 + 2;
    const menuWidth = Math.min(320, width / 2 + barWidth / 2 - 16);
    const previewPosition = compact
        ? { width: width * 0.3, right: Math.max(8, insets.right), bottom: barBottom + 76 }
        : {
              width: Math.max(160, Math.min(240, width * 0.18)),
              right: Math.max(16, insets.right),
              bottom: barBottom,
          };
    const visible = expanded && Boolean(active || incoming || held) && foreground;
    if (!visible) return null;
    const {
        ChevronDown,
        Ellipsis,
        Mic,
        MicOff,
        Phone,
        PhoneOff,
        UserRound,
        Users,
        Video,
        VideoOff,
        X,
    } = callIcons();
    const waiting = active?.call.phase === 'ringing';
    const connected = media?.connected ?? false;
    const local = peers.find(({ participant }) => participant.isLocal);
    const microphone = local?.microphone ?? false;
    const camera = local?.camera ?? false;
    const help =
        error &&
        t(
            error === 'failed'
                ? 'callFailed'
                : error === 'cameraPermission'
                  ? 'callCameraPermission'
                  : 'callMicrophonePermission',
        );
    const status = incoming
        ? t(active ? 'callIncomingWhileBusy' : 'callIncoming')
        : held && !active
          ? t('callHeld')
          : waiting
            ? t('callRinging')
            : connected
              ? t('callActive')
              : t('callConnecting');
    const byMediaIdentity = new Map(
        active?.call.participants.map((member) => [member.media_identity, member.principal_id]),
    );
    const displayName = (mediaIdentity: string, local = false) => {
        const principalId = byMediaIdentity.get(mediaIdentity);
        return (principalId && names?.[principalId]) || t(local ? 'callYou' : 'callParticipant');
    };
    const remote = peers.filter(({ participant }) => !participant.isLocal);
    const fullBleed = remote.length === 1;
    const { columns, rows: rowCount } = callGridDimensions(
        remote.length,
        width,
        height,
        gridPadding,
    );
    const rows = Array.from({ length: remote.length > 0 ? rowCount : 0 }, (_, row) =>
        remote.slice(row * columns, (row + 1) * columns),
    );
    const incomingName = incoming && (names?.[incoming.initiator_id] || incoming.title);
    const showActiveBar = Boolean(active && !incoming);
    const needsRecovery = Boolean(active && error === 'failed' && !room && !incoming);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="fullScreen"
            statusBarTranslucent
            navigationBarTranslucent
            onRequestClose={() => {
                if (panel) setPanel(null);
                else setCallExpanded(false);
            }}
        >
            <SafeAreaListener onChange={setViewport} style={styles.stage}>
                <View
                    style={[
                        styles.tiles,
                        !fullBleed && {
                            paddingTop: gridPadding.top,
                            paddingRight: gridPadding.right,
                            paddingBottom: gridPadding.bottom,
                            paddingLeft: gridPadding.left,
                        },
                    ]}
                >
                    {rows.map((row, index) => (
                        <View key={index} style={styles.row}>
                            {row.map(({ participant, reference, microphone, audioLevel }) => {
                                const name = displayName(participant.identity);
                                const Microphone = microphone ? Mic : MicOff;
                                return (
                                    <View key={participant.identity} style={styles.cell}>
                                        <View style={[styles.tile, fullBleed && styles.fullBleed]}>
                                            {reference && VideoTrack ? (
                                                <VideoTrack
                                                    objectFit="contain"
                                                    zOrder={0}
                                                    trackRef={reference}
                                                    style={StyleSheet.absoluteFill}
                                                />
                                            ) : (
                                                <View style={styles.placeholder}>
                                                    <UserRound color={secondaryLabel} fill={secondaryLabel} size={60} />
                                                    <Text style={styles.placeholderText}>
                                                        {t('callCameraDisabled')}
                                                    </Text>
                                                </View>
                                            )}
                                            <SpeakerGlow
                                                level={audioLevel}
                                                radius={fullBleed ? 0 : 14}
                                            />
                                            <Text
                                                numberOfLines={1}
                                                style={[
                                                    styles.name,
                                                    fullBleed && {
                                                        top: Math.max(8, insets.top),
                                                        start: Math.max(8, insets.left),
                                                    },
                                                ]}
                                            >
                                                {name}
                                            </Text>
                                            <View
                                                accessible
                                                accessibilityLabel={t(
                                                    audioLevel > 0
                                                        ? 'callSpeaking'
                                                        : microphone
                                                          ? 'callMicrophoneOn'
                                                          : 'callMicrophoneOff',
                                                )}
                                                style={[
                                                    styles.microphone,
                                                    fullBleed && {
                                                        top: Math.max(8, insets.top),
                                                        right: Math.max(8, insets.right),
                                                    },
                                                ]}
                                            >
                                                <SpeakerMicrophone
                                                    icon={Microphone}
                                                    enabled={microphone}
                                                    level={audioLevel}
                                                />
                                            </View>
                                        </View>
                                    </View>
                                );
                            })}
                            {row.length < columns &&
                                Array.from({ length: columns - row.length }, (_, i) => (
                                    <View key={i} style={styles.cell} />
                                ))}
                        </View>
                    ))}
                </View>
                {showActiveBar && (
                    <>
                        <View pointerEvents="none" style={styles.dim} />
                        <View style={[styles.selfView, previewPosition]}>
                            {local?.reference && VideoTrack ? (
                                <VideoTrack
                                    mirror
                                    objectFit="cover"
                                    zOrder={1}
                                    trackRef={local.reference}
                                    style={StyleSheet.absoluteFill}
                                />
                            ) : (
                                <View style={[styles.placeholder, styles.previewPlaceholder]}>
                                    {camera ? (
                                        <Video color={secondaryLabel} size={24} />
                                    ) : (
                                        <VideoOff color={secondaryLabel} size={24} />
                                    )}
                                    <Text style={styles.selfPlaceholder}>
                                        {t(camera ? 'callConnecting' : 'callCameraDisabled')}
                                    </Text>
                                </View>
                            )}
                            {local?.reference && (
                                <SpeakerGlow level={local.audioLevel} radius={14} />
                            )}
                        </View>
                        {panel === 'more' && (
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={t('callCloseMenu')}
                                onPress={() => setPanel(null)}
                                style={StyleSheet.absoluteFill}
                            />
                        )}
                        <View
                            pointerEvents="box-none"
                            style={[styles.barPosition, { bottom: barBottom }]}
                        >
                            <View style={styles.barAnchor}>
                                <View style={styles.controls}>
                                    <Control
                                        size={controlSize}
                                        icon={microphone ? Mic : MicOff}
                                        label={t('callMicrophone')}
                                        pressed={microphone}
                                        onPress={() => void toggleCallDevice('microphone')}
                                        disabled={busy || !connected}
                                    />
                                    <Control
                                        size={controlSize}
                                        icon={camera ? Video : VideoOff}
                                        label={t('callCamera')}
                                        pressed={camera}
                                        onPress={() => void toggleCallDevice('camera')}
                                        disabled={busy || !connected}
                                    />
                                    <Control
                                        size={controlSize}
                                        icon={Ellipsis}
                                        label={t('callMore')}
                                        expanded={panel !== null}
                                        onPress={() => setPanel(panel ? null : 'more')}
                                    />
                                    <Control
                                        size={controlSize}
                                        icon={HangUpIcon}
                                        label={t('callLeave')}
                                        color="#ff4245"
                                        onPress={() => void leaveCall()}
                                        disabled={busy}
                                    />
                                </View>
                                {panel === 'more' && (
                                    <View style={[styles.menu, { maxWidth: menuWidth }]}>
                                        <Pressable
                                            accessibilityRole="button"
                                            accessibilityLabel={t('callParticipants')}
                                            style={styles.menuRow}
                                            onPress={() => setPanel('participants')}
                                        >
                                            <Users color="white" size={19} />
                                            <Text style={styles.menuText}>
                                                {t('callParticipants')}
                                            </Text>
                                        </Pressable>
                                        <Pressable
                                            accessibilityRole="button"
                                            style={styles.menuRow}
                                            onPress={() => setCallExpanded(false)}
                                        >
                                            <ChevronDown color="white" size={19} />
                                            <Text style={styles.menuText}>{t('callMinimize')}</Text>
                                        </Pressable>
                                    </View>
                                )}
                            </View>
                        </View>
                    </>
                )}
                {(incoming || !active || ((!connected || waiting) && !panel)) && (
                    <View
                        pointerEvents={incoming ? 'auto' : 'box-none'}
                        style={[
                            styles.center,
                            incoming && styles.scrim,
                            {
                                paddingTop: Math.max(16, insets.top),
                                paddingRight: Math.max(16, insets.right),
                                paddingBottom: Math.max(16, insets.bottom),
                                paddingLeft: Math.max(16, insets.left),
                            },
                        ]}
                    >
                        <View style={styles.card}>
                            {incomingName && <Text style={styles.heading}>{incomingName}</Text>}
                            <Text style={incoming ? styles.status : styles.heading}>{status}</Text>
                            {help && (
                                <Text accessibilityRole="alert" style={styles.error}>
                                    {help}
                                </Text>
                            )}
                            {incoming && (
                                <View style={styles.cardActions}>
                                    <Control
                                        icon={PhoneOff}
                                        label={t('callDecline')}
                                        color="#ff453a"
                                        disabled={busy}
                                        onPress={() => void declineCall()}
                                    />
                                    <Control
                                        icon={Phone}
                                        label={t(active ? 'callHoldAnswer' : 'callAnswer')}
                                        color="#269955"
                                        disabled={busy || Boolean(active && held)}
                                        onPress={() => void answerCall()}
                                    />
                                </View>
                            )}
                            {!active && held && !incoming && (
                                <View style={styles.cardActions}>
                                    <Recovery
                                        label={t('callResume')}
                                        onPress={resumeCall}
                                        disabled={busy}
                                    />
                                    <Recovery
                                        label={t('callLeave')}
                                        onPress={leaveCall}
                                        disabled={busy}
                                    />
                                </View>
                            )}
                            {needsRecovery && (
                                <Recovery
                                    label={t('callRecover')}
                                    onPress={recoverCallMedia}
                                    disabled={busy}
                                />
                            )}
                        </View>
                    </View>
                )}
                {showActiveBar && connected && !panel && (help || held) && (
                    <View
                        pointerEvents="none"
                        style={[
                            styles.notice,
                            {
                                top: Math.max(8, insets.top),
                                left: Math.max(16, insets.left),
                                right: Math.max(16, insets.right),
                            },
                        ]}
                    >
                        <Text accessibilityRole="alert" style={help ? styles.error : styles.status}>
                            {help || t('callHeld')}
                        </Text>
                    </View>
                )}
                {showActiveBar && panel === 'participants' && (
                    <>
                        {width > 600 && (
                            <Pressable
                                accessible={false}
                                importantForAccessibility="no"
                                onPress={() => setPanel(null)}
                                style={StyleSheet.absoluteFill}
                            />
                        )}
                        <View
                            accessibilityViewIsModal
                            style={[
                                styles.participants,
                                { width: width <= 600 ? width : 400, paddingTop: insets.top },
                                width > 600 && styles.participantsBorder,
                            ]}
                        >
                            <View
                                style={[
                                    styles.participantsHeader,
                                    {
                                        paddingLeft: Math.max(16, insets.left),
                                        paddingRight: Math.max(16, insets.right),
                                    },
                                ]}
                            >
                                <Text accessibilityRole="header" style={styles.participantsTitle}>
                                    {t('callParticipants')}
                                </Text>
                                <Pressable
                                    accessibilityRole="button"
                                    accessibilityLabel={t('dismiss')}
                                    style={styles.participantsClose}
                                    onPress={() => setPanel(null)}
                                >
                                    <X size={20} color="#ffffff" />
                                </Pressable>
                            </View>
                            <ScrollView
                                style={styles.participantsScroll}
                                contentContainerStyle={{
                                    paddingTop: 8,
                                    paddingRight: Math.max(16, insets.right),
                                    paddingBottom: 16 + insets.bottom,
                                    paddingLeft: Math.max(16, insets.left),
                                }}
                            >
                                <View style={styles.participantsList}>
                                    {peers.map(({ participant, microphone, audioLevel }) => {
                                        const Microphone = microphone ? Mic : MicOff;
                                        return (
                                            <View
                                                key={participant.identity}
                                                style={styles.participant}
                                            >
                                                <UserRound size={24} color={secondaryLabel} />
                                                <Text
                                                    numberOfLines={1}
                                                    style={styles.participantName}
                                                >
                                                    {displayName(
                                                        participant.identity,
                                                        participant.isLocal,
                                                    )}
                                                </Text>
                                                <Microphone
                                                    size={18}
                                                    color={
                                                        audioLevel > 0 ? '#30d158' : secondaryLabel
                                                    }
                                                />
                                            </View>
                                        );
                                    })}
                                </View>
                            </ScrollView>
                        </View>
                    </>
                )}
            </SafeAreaListener>
        </Modal>
    );
}

function HangUpIcon({ size, color }: { size: number; color: string }) {
    const { default: Svg, Path } = require('react-native-svg') as typeof import('react-native-svg');
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
            <Path
                fill={color}
                d="M12 7c-3.8 0-7 1.2-9.2 3.5a2 2 0 0 0 0 2.9l1.7 1.7a1.4 1.4 0 0 0 2 0l2.3-2.3c.3-.3.5-.7.5-1.1v-1.6a12 12 0 0 1 5.4 0v1.6c0 .4.2.8.5 1.1l2.3 2.3a1.4 1.4 0 0 0 2 0l1.7-1.7a2 2 0 0 0 0-2.9C19 8.2 15.8 7 12 7Z"
            />
        </Svg>
    );
}

function Control({
    icon: Icon,
    label,
    onPress,
    color,
    pressed,
    expanded,
    size = 44,
    disabled = false,
}: {
    icon: ComponentType<{ size: number; color: string }>;
    label: string;
    onPress: () => void;
    color?: string;
    pressed?: boolean;
    expanded?: boolean;
    size?: number;
    disabled?: boolean;
}) {
    const highlighted = pressed || expanded;
    return (
        <Pressable
            accessibilityRole={pressed === undefined ? 'button' : 'togglebutton'}
            accessibilityLabel={label}
            accessibilityState={{ disabled, checked: pressed, expanded }}
            disabled={disabled}
            onPress={onPress}
            style={({ pressed: down }) => [
                styles.control,
                {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor:
                        color ?? (highlighted ? '#ffffff' : 'rgba(120, 120, 128, 0.32)'),
                    boxShadow: highlighted || color ? buttonShadow : undefined,
                    opacity: disabled ? 0.4 : 1,
                    transform: [{ scale: down ? 0.97 : 1 }],
                },
            ]}
        >
            <Icon size={24} color={highlighted && !color ? '#000000' : '#ffffff'} />
        </Pressable>
    );
}

function Recovery({
    label,
    onPress,
    disabled,
}: {
    label: string;
    onPress: () => void;
    disabled: boolean;
}) {
    return (
        <Pressable
            disabled={disabled}
            accessibilityRole="button"
            style={styles.menuRow}
            onPress={onPress}
        >
            <Text style={styles.menuText}>{label}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    stage: { flex: 1, position: 'relative', backgroundColor: '#000000' },
    tiles: { flex: 1, gap: 8 },
    row: { flex: 1, flexDirection: 'row', gap: 8 },
    cell: { flex: 1, minWidth: 0 },
    tile: {
        flex: 1,
        backgroundColor: '#1c1c1e',
        borderWidth: 1,
        borderColor: separator,
        overflow: 'hidden',
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    fullBleed: { borderWidth: 0, borderRadius: 0, backgroundColor: '#000000' },
    placeholder: { alignItems: 'center', gap: 12 },
    placeholderText: { fontSize: 16, color: secondaryLabel, textAlign: 'center' },
    name: {
        position: 'absolute',
        top: 8,
        start: 8,
        maxWidth: '55%',
        color: 'white',
        backgroundColor: '#0000008a',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        fontSize: 13,
        fontWeight: '600',
    },
    microphone: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#00000059',
        alignItems: 'center',
        justifyContent: 'center',
    },
    dim: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 128,
        experimental_backgroundImage: 'linear-gradient(to bottom, #00000000, #00000059)',
    },
    selfView: {
        position: 'absolute',
        aspectRatio: 16 / 9,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: separator,
        backgroundColor: '#1c1c1e',
        boxShadow: surfaceShadow,
    },
    previewPlaceholder: { gap: 4, paddingHorizontal: 8 },
    selfPlaceholder: { color: secondaryLabel, fontSize: 13, textAlign: 'center' },
    barPosition: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
    barAnchor: { position: 'relative' },
    controls: {
        flexDirection: 'row',
        gap: 12,
        padding: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.14)',
        backgroundColor: 'rgba(28, 28, 30, 0.86)',
        boxShadow: [{ offsetX: 0, offsetY: 1, color: '#ffffff1a', inset: true }, ...surfaceShadow],
    },
    control: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    menu: {
        position: 'absolute',
        bottom: '100%',
        marginBottom: 8,
        right: 0,
        minWidth: 190,
        padding: 6,
        borderRadius: 14,
        borderColor: '#3d3d3f',
        borderWidth: 1,
        backgroundColor: '#242426',
    },
    menuRow: {
        minHeight: 44,
        paddingHorizontal: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    menuText: { color: 'white' },
    participants: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        backgroundColor: '#242426',
    },
    participantsBorder: { borderRightWidth: 1, borderRightColor: separator },
    participantsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: separator,
    },
    participantsTitle: { color: 'white', fontSize: 18, fontWeight: '600' },
    participantsClose: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    participantsScroll: { flex: 1, minHeight: 0 },
    participantsList: { borderRadius: 14, overflow: 'hidden', backgroundColor: '#2c2c2e' },
    participant: {
        minHeight: 44,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderBottomWidth: 1,
        borderBottomColor: separator,
    },
    participantName: { flex: 1, minWidth: 0, color: 'white' },
    center: {
        ...StyleSheet.absoluteFill,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrim: { backgroundColor: '#00000071' },
    card: {
        padding: 18,
        borderRadius: 14,
        gap: 8,
        alignItems: 'center',
        backgroundColor: '#242426',
    },
    cardActions: { flexDirection: 'row', gap: 12, justifyContent: 'center' },
    heading: { color: 'white', fontSize: 18, fontWeight: '600', textAlign: 'center' },
    status: { color: '#bdbdc2', textAlign: 'center' },
    error: { color: '#ffafba', textAlign: 'center' },
    notice: { position: 'absolute', alignItems: 'center' },
});
