import type {
    AgentMessagePhase,
    ArtifactRef,
    MarkdownDocument,
} from '@/client/generated/client_active_thread_snapshot';
import type { ClientTurnSecuritySummary } from '@/client/generated/client_turn_security_summary';
import type { PendingRequest } from '@/client/generated/pending_request';
import type { TurnWorkState } from '@/client/generated/turn_work_state';

export type TimelineUserAttachment = {
    id: string;
    label: string;
    kind: 'artifact' | 'file' | 'image' | 'audio' | 'video' | 'skill' | 'mcp';
    artifact: ArtifactRef | null;
};

export type TimelineCapabilityRejection = {
    id: string;
    label: string;
    kind: string;
    message: string;
};

export type TimelinePendingRequest = {
    thread_id: string | null;
    turn_id: string | null;
    request: PendingRequest;
};

export type TimelineRowMeta = {
    semanticWorkItem?: boolean;
};

export type TimelineRow = TimelineRowMeta &
    (
        | {
              type: 'user-message';
              key: string;
              itemId: string;
              turnId: string;
              text: string;
              attachments: TimelineUserAttachment[];
              timestampLabel: string;
          }
        | {
              type: 'assistant-message';
              key: string;
              itemId: string;
              turnId: string;
              text: string;
              markdown: MarkdownDocument | null;
              phase: AgentMessagePhase;
              streaming: boolean;
              taskTimeline: boolean;
              elapsedLabel: string | null;
              timestampLabel: string;
          }
        | {
              type: 'reasoning';
              key: string;
              itemId: string;
              turnId: string;
              text: string;
              markdown: MarkdownDocument | null;
              collapsed: boolean;
              streaming: boolean;
              elapsedLabel: string | null;
          }
        | {
              type: 'system-event';
              key: string;
              itemId: string;
              turnId: string;
              level: 'info' | 'warning' | 'error';
              message: string;
              code: string | null;
              details: unknown;
              label: string;
              capabilityRejections: TimelineCapabilityRejection[];
          }
        | {
              type: 'command-execution';
              key: string;
              itemId: string;
              turnId: string;
              status: string;
              command: string;
              cwd: string | null;
              durationMs: number | null;
              exitCode: number | null;
              outputPreview: string;
              terminalText: string;
              timedOut: boolean | null;
              truncated: boolean | null;
              streaming: boolean;
              elapsedLabel: string | null;
          }
        | {
              type: 'file-change';
              key: string;
              itemId: string;
              turnId: string;
              status: string;
              path: string;
              paths: string[];
              summary: string;
              finalStatus: string;
              successful: boolean;
              elapsedLabel: string | null;
              exitCode: number | null;
              output: string;
          }
        | {
              type: 'tool-call';
              key: string;
              itemId: string;
              turnId: string;
              status: string;
              toolKind: 'webSearch' | 'webFetch' | 'download' | 'dynamicToolCall';
              title: string;
              detail: string;
              finalStatus: string;
              successful: boolean;
              elapsedLabel: string | null;
              argumentsText: string | null;
              resultText: string | null;
              url: string | null;
              host: string | null;
              statusCode: number | null;
              resultCount: number | null;
              results: TimelineWebResult[];
              bytes: number | null;
              path: string | null;
              contentType: string | null;
              mcpServerId: string | null;
              mcpServerName: string | null;
              mcpRawToolName: string | null;
              mcpDetails: string | null;
          }
        | {
              type: 'task-anchor';
              key: string;
              itemId: string;
              turnId: string;
              taskId: string;
              runId: string | null;
              childThreadId: string | null;
              childTurnId: string | null;
              agentRole: string | null;
              depth: number;
              maxDepth: number;
              title: string;
              status: string;
              progressPreview: string | null;
              resultPreview: string | null;
              errorPreview: string | null;
          }
        | {
              type: 'work-group';
              key: string;
              turnId: string;
              anchorItemId: string;
              anchorEntryId: string;
              title: string;
              elapsedMs: number | null;
              elapsedLabel: string | null;
              expanded: boolean;
          }
        | {
              type: 'tool-group';
              key: string;
              turnId: string;
              kind: 'completedTaskTools' | 'repeatedTaskWait';
              title: string;
              count: number;
              status: 'completed';
              expanded: boolean;
              items: TimelineToolGroupItem[];
          }
        | {
              type: 'running';
              key: string;
              turnId: string;
              startedAtUnixMs: number | null;
              elapsedLabel: string | null;
              state: TurnWorkState | null;
              message: string | null;
              securitySummary: ClientTurnSecuritySummary | null;
          }
        | {
              type: 'pending-request';
              key: string;
              turnId: string | null;
              entry: TimelinePendingRequest;
          }
        | {
              type: 'artifact';
              key: string;
              artifactId: string;
              displayName: string;
              status: string;
          }
        | {
              type: 'unknown';
              key: string;
              itemId?: string;
              turnId?: string;
              label: string;
          }
    );

export type TimelineWebResult = {
    title: string;
    url: string;
    source: string;
    snippet: string;
};

export type TimelineToolGroupItem = {
    itemId: string;
    title: string;
    status: string;
    detail: string;
};
