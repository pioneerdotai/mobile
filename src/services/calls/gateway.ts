import type * as ClientNitro from '@pioneer/client-nitro';
import { parsePioneerClientResponse } from '@/client/response';

const nativeClient = () =>
    (require('@pioneer/client-nitro') as typeof ClientNitro).getPioneerClientNitro();

export type CallTarget = { workspace_id: string; thread_id: string; title?: string };
export type CallSnapshot = CallTarget & {
    call_id: string;
    revision: number;
    created_at_unix: number;
    phase: 'ringing' | 'active' | 'ended';
    initiator_id: string;
    invitee_id: string | null;
    ring_until_unix: number | null;
    end_reason: 'left' | 'declined' | 'missed' | 'gateway_restarted' | null;
    participants: { principal_id: string; media_identity: string; held: boolean }[];
};

type Transition = 'join' | 'decline' | 'leave' | 'hold' | 'resume';
type CallAction =
    | { kind: 'status'; call_id?: string }
    | { kind: 'start'; request_key: string }
    | { kind: 'change'; call_id: string; revision: number; transition: Transition }
    | { kind: 'keep_held' | 'connect'; call_id: string }
    | { kind: 'restore'; call_id: string; media_identity: string }
    | { kind: 'resume'; call_id: string; media_identity: string; resume_key: string }
    | { kind: 'disconnect'; call_id: string; media_identity: string; resume_key?: string };

export type CallUpdates = {
    sequence: number;
    connection_id: number | null;
    calls: CallSnapshot[];
};

type CallResponse = {
    call: CallSnapshot | null;
    credentials?: { url: string; token: string; expires_at_unix: number };
};

export const requestCall = async (connectionId: number, target: CallTarget, action: CallAction) =>
    parsePioneerClientResponse<CallResponse>(
        await nativeClient().threadCallJson(
            JSON.stringify({
                connection_id: connectionId,
                params: { thread_id: target.thread_id, workspace_id: target.workspace_id, action },
            }),
        ),
    );

export const waitCallUpdates = async (after: number) =>
    parsePioneerClientResponse<CallUpdates>(
        await nativeClient().threadCallUpdatesJson(JSON.stringify(after)),
    );

export const requestCallNames = async (connectionId: number, workspaceId: string) =>
    parsePioneerClientResponse<Record<string, string>>(
        await nativeClient().threadCallJson(
            JSON.stringify({
                connection_id: connectionId,
                names_for_workspace: workspaceId,
            }),
        ),
    );
