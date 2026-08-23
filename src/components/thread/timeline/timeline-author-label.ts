import type { TurnAuthorSnapshot } from '@/client/generated/timeline_row';
import type { AgentAvatarKind } from '@/services/members/resolve-agent-avatar';

export type TimelineAgentAuthorPresentation = {
    displayName: string;
    nickname: string;
};

export const timelineAgentAuthorPresentation = (
    author: TurnAuthorSnapshot | null,
): TimelineAgentAuthorPresentation | null => {
    if (author?.actor.kind !== 'agent_execution') return null;

    const agent = author.agent?.agent_execution_id === author.actor.id ? author.agent : null;
    if (!agent) return null;
    const displayName = author.display_name.trim();
    const nickname = author.nickname.trim();

    if (!displayName && !nickname) return null;
    return { displayName, nickname };
};

export const timelineAgentAuthorLabel = (author: TurnAuthorSnapshot | null): string | null => {
    const presentation = timelineAgentAuthorPresentation(author);
    if (!presentation) return null;
    if (!presentation.displayName) return `@${presentation.nickname}`;
    if (!presentation.nickname) return presentation.displayName;
    return `${presentation.displayName} · @${presentation.nickname}`;
};

export const timelineAgentDefaultAvatar = (
    author: TurnAuthorSnapshot | null,
): AgentAvatarKind | null => {
    if (author?.actor.kind !== 'agent_execution') return null;

    const agent = author.agent?.agent_execution_id === author.actor.id ? author.agent : null;
    if (agent?.identity_source_kind === 'native_agent') return 'pioneer';
    if (agent?.identity_source_kind !== 'cli_runtime_instance') return null;

    const runtimeKind = (agent.role_label ?? agent.nickname).trim().toLowerCase();
    if (runtimeKind === 'codex') return 'codex';
    if (runtimeKind === 'claude') return 'claude';
    return null;
};
